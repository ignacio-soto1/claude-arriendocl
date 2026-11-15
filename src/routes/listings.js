'use strict';

const express = require('express');
const { toInt } = require('../http');
const { TIPOS, regionPorNombre, hoyChile } = require('../chile');
const { parseFecha } = require('../pricing');

const ORDENES = {
  recientes: 'l.created_at DESC, l.id DESC',
  precio_asc: 'l.precio_noche ASC',
  precio_desc: 'l.precio_noche DESC',
  valoracion: 'rating_prom IS NULL, rating_prom DESC',
};

const LISTING_COLUMNS = `l.*,
  (SELECT filename FROM photos p WHERE p.listing_id = l.id ORDER BY orden, id LIMIT 1) AS foto,
  (SELECT ROUND(AVG(rating), 1) FROM reviews rv WHERE rv.listing_id = l.id) AS rating_prom,
  (SELECT COUNT(*) FROM reviews rv WHERE rv.listing_id = l.id) AS n_resenas`;

function buscar(db, q) {
  const where = ['l.activo = 1'];
  const params = [];
  const filtros = {
    region: regionPorNombre(q.region) ? q.region : '',
    comuna: '',
    tipo: TIPOS[q.tipo] ? q.tipo : '',
    llegada: '', salida: '',
    huespedes: toInt(q.huespedes, { min: 1, max: 50 }),
    precio_max: toInt(q.precio_max, { min: 1 }),
    orden: ORDENES[q.orden] ? q.orden : 'recientes',
    texto: String(q.texto || '').trim().slice(0, 80),
  };
  if (filtros.region) {
    where.push('l.region = ?'); params.push(filtros.region);
    if (regionPorNombre(filtros.region).comunas.includes(q.comuna)) {
      filtros.comuna = q.comuna;
      where.push('l.comuna = ?'); params.push(filtros.comuna);
    }
  }
  if (filtros.tipo) { where.push('l.tipo = ?'); params.push(filtros.tipo); }
  if (filtros.huespedes) { where.push('l.capacidad >= ?'); params.push(filtros.huespedes); }
  if (filtros.precio_max) { where.push('l.precio_noche <= ?'); params.push(filtros.precio_max); }
  if (filtros.texto) {
    where.push("(l.titulo LIKE ? ESCAPE '\\' OR l.descripcion LIKE ? ESCAPE '\\' OR l.comuna LIKE ? ESCAPE '\\')");
    const like = `%${filtros.texto.replace(/[\\%_]/g, '\\$&')}%`;
    params.push(like, like, like);
  }
  if (parseFecha(q.llegada) && parseFecha(q.salida) && q.llegada < q.salida) {
    filtros.llegada = q.llegada; filtros.salida = q.salida;
    where.push(`NOT EXISTS (SELECT 1 FROM bookings b WHERE b.listing_id = l.id
      AND b.estado IN ('pendiente','confirmada') AND b.check_in < ? AND ? < b.check_out)`);
    params.push(filtros.salida, filtros.llegada);
    where.push('l.min_noches <= julianday(?) - julianday(?)');
    params.push(filtros.salida, filtros.llegada);
  }
  const sql = `SELECT ${LISTING_COLUMNS} FROM listings l WHERE ${where.join(' AND ')}
    ORDER BY ${ORDENES[filtros.orden]} LIMIT 60`;
  return { filtros, resultados: db.prepare(sql).all(...params) };
}

module.exports = ({ db, HttpError }) => {
  const r = express.Router();

  r.get('/', (req, res) => {
    const { filtros, resultados } = buscar(db, req.query);
    const hayFiltros = Object.keys(req.query).length > 0;
    res.render('buscar', { title: null, filtros, resultados, hayFiltros });
  });

  r.get('/propiedades/:id', (req, res) => {
    const id = toInt(req.params.id, { min: 1 });
    const listing = id && db.prepare(`SELECT ${LISTING_COLUMNS}, u.nombre AS host_nombre, u.created_at AS host_desde
      FROM listings l JOIN users u ON u.id = l.host_id WHERE l.id = ?`).get(id);
    if (!listing || (!listing.activo && (!req.user || req.user.id !== listing.host_id))) {
      throw new HttpError(404, 'Esta propiedad no existe o ya no está publicada.');
    }
    listing.amenities = JSON.parse(listing.amenities);
    const fotos = db.prepare('SELECT filename FROM photos WHERE listing_id = ? ORDER BY orden, id').all(id);
    const ocupado = db.prepare(`SELECT check_in, check_out FROM bookings
      WHERE listing_id = ? AND estado IN ('pendiente','confirmada') AND check_out > ? ORDER BY check_in`).all(id, hoyChile());
    const resenas = db.prepare(`SELECT rv.rating, rv.comentario, rv.created_at, u.nombre FROM reviews rv
      JOIN users u ON u.id = rv.guest_id WHERE rv.listing_id = ? ORDER BY rv.created_at DESC`).all(id);

    const llegada = parseFecha(req.query.llegada) ? req.query.llegada : '';
    const salida = parseFecha(req.query.salida) ? req.query.salida : '';
    res.render('propiedad', {
      title: listing.titulo, listing, fotos, ocupado, resenas,
      reserva: { llegada, salida, huespedes: toInt(req.query.huespedes, { min: 1 }) || 1 },
      error: null,
    });
  });

  return r;
};

module.exports.buscar = buscar;
module.exports.LISTING_COLUMNS = LISTING_COLUMNS;
