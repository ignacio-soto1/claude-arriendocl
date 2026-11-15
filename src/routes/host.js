'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const { transaction } = require('../db');
const { requireAuth, requireHost, toInt } = require('../http');
const { TIPOS, AMENITIES, comunaValida } = require('../chile');

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_FOTOS = 20;

function validarListing(body) {
  const amenities = [].concat(body.amenities || []).filter((a) => AMENITIES[a]);
  const datos = {
    titulo: String(body.titulo || '').trim().slice(0, 120),
    descripcion: String(body.descripcion || '').trim().slice(0, 5000),
    tipo: body.tipo,
    region: body.region,
    comuna: body.comuna,
    direccion: String(body.direccion || '').trim().slice(0, 200),
    superficie_m2: toInt(body.superficie_m2, { min: 1, max: 10_000_000 }),
    precio_noche: toInt(body.precio_noche, { min: 1000, max: 50_000_000 }),
    tarifa_limpieza: toInt(body.tarifa_limpieza, { min: 0, max: 5_000_000 }) ?? 0,
    capacidad: toInt(body.capacidad, { min: 1, max: 50 }),
    dormitorios: toInt(body.dormitorios, { min: 0, max: 50 }),
    banos: toInt(body.banos, { min: 0, max: 50 }),
    min_noches: toInt(body.min_noches, { min: 1, max: 90 }) ?? 1,
    amenities,
    activo: [].concat(body.activo ?? '1').includes('1') ? 1 : 0, // hidden "0" + checkbox "1"
  };
  const errores = [];
  if (datos.titulo.length < 10) errores.push('El título debe tener al menos 10 caracteres.');
  if (datos.descripcion.length < 30) errores.push('Describe la propiedad con al menos 30 caracteres.');
  if (!TIPOS[datos.tipo]) errores.push('Elige un tipo de propiedad.');
  if (!comunaValida(datos.region, datos.comuna)) errores.push('Elige una región y comuna válidas.');
  if (!datos.precio_noche) errores.push('El precio por noche debe ser de al menos $1.000.');
  if (!datos.capacidad) errores.push('Indica la capacidad (1 a 50 personas).');
  if (datos.dormitorios === null) errores.push('Indica el número de dormitorios.');
  if (datos.banos === null) errores.push('Indica el número de baños.');
  return { datos, errores };
}

module.exports = ({ db, uploadsDir, HttpError }) => {
  const r = express.Router();

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (req, file, cb) => cb(null, crypto.randomUUID() + MIME_EXT[file.mimetype]),
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) => cb(null, Boolean(MIME_EXT[file.mimetype])),
  });

  const borrarArchivos = (files) => {
    for (const f of files || []) fs.rm(f.path, { force: true }, () => {});
  };

  const propiaOr404 = (req) => {
    const l = db.prepare('SELECT * FROM listings WHERE id = ? AND host_id = ?').get(toInt(req.params.id, { min: 1 }), req.user.id);
    if (!l) throw new HttpError(404, 'Propiedad no encontrada.');
    l.amenities = JSON.parse(l.amenities);
    return l;
  };

  r.get('/activar', requireAuth, (req, res) => {
    if (req.user.es_anfitrion) return res.redirect('/anfitrion');
    res.render('anfitrion-activar', { title: 'Publica tu propiedad' });
  });

  r.post('/activar', requireAuth, (req, res) => {
    db.prepare('UPDATE users SET es_anfitrion = 1 WHERE id = ?').run(req.user.id);
    req.flash('ok', 'Tu cuenta de anfitrión está activa. ¡Publica tu primera propiedad!');
    res.redirect('/anfitrion/propiedades/nueva');
  });

  r.get('/', requireHost, (req, res) => {
    const propiedades = db.prepare(`SELECT l.*,
        (SELECT filename FROM photos p WHERE p.listing_id = l.id ORDER BY orden, id LIMIT 1) AS foto,
        (SELECT COUNT(*) FROM bookings b WHERE b.listing_id = l.id AND b.estado = 'pendiente') AS pendientes
      FROM listings l WHERE l.host_id = ? ORDER BY l.created_at DESC`).all(req.user.id);
    const reservas = db.prepare(`SELECT b.*, l.titulo, u.nombre AS huesped_nombre, u.email AS huesped_email,
        u.telefono AS huesped_telefono
      FROM bookings b JOIN listings l ON l.id = b.listing_id JOIN users u ON u.id = b.guest_id
      WHERE l.host_id = ? ORDER BY CASE b.estado WHEN 'pendiente' THEN 0 ELSE 1 END, b.check_in DESC
      LIMIT 100`).all(req.user.id);
    const stats = db.prepare(`SELECT
        COALESCE(SUM(CASE WHEN b.estado = 'confirmada' THEN b.subtotal + b.limpieza END), 0) AS ingresos,
        COUNT(CASE WHEN b.estado = 'confirmada' THEN 1 END) AS confirmadas,
        COUNT(CASE WHEN b.estado = 'pendiente' THEN 1 END) AS pendientes
      FROM bookings b JOIN listings l ON l.id = b.listing_id WHERE l.host_id = ?`).get(req.user.id);
    res.render('anfitrion', { title: 'Panel de anfitrión', propiedades, reservas, stats });
  });

  r.get('/propiedades/nueva', requireHost, (req, res) => {
    res.render('propiedad-form', { title: 'Nueva propiedad', listing: { amenities: [], activo: 1, min_noches: 1, tarifa_limpieza: 0 }, fotos: [], errores: [] });
  });

  r.post('/propiedades/nueva', requireHost, upload.array('fotos', 10), (req, res) => {
    const { datos, errores } = validarListing(req.body);
    if (errores.length) {
      borrarArchivos(req.files);
      return res.status(400).render('propiedad-form', { title: 'Nueva propiedad', listing: datos, fotos: [], errores });
    }
    const id = transaction(db, () => {
      const info = db.prepare(`INSERT INTO listings (host_id, titulo, descripcion, tipo, region, comuna, direccion,
          superficie_m2, precio_noche, tarifa_limpieza, capacidad, dormitorios, banos, min_noches, amenities, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.user.id, datos.titulo, datos.descripcion, datos.tipo, datos.region, datos.comuna, datos.direccion || null,
          datos.superficie_m2, datos.precio_noche, datos.tarifa_limpieza, datos.capacidad, datos.dormitorios,
          datos.banos, datos.min_noches, JSON.stringify(datos.amenities), datos.activo);
      const lid = Number(info.lastInsertRowid);
      const ins = db.prepare('INSERT INTO photos (listing_id, filename, orden) VALUES (?, ?, ?)');
      (req.files || []).forEach((f, i) => ins.run(lid, f.filename, i));
      return lid;
    });
    req.flash('ok', 'Propiedad publicada.');
    res.redirect(`/propiedades/${id}`);
  });

  r.get('/propiedades/:id/editar', requireHost, (req, res) => {
    const listing = propiaOr404(req);
    const fotos = db.prepare('SELECT id, filename FROM photos WHERE listing_id = ? ORDER BY orden, id').all(listing.id);
    res.render('propiedad-form', { title: 'Editar propiedad', listing, fotos, errores: [] });
  });

  r.post('/propiedades/:id/editar', requireHost, upload.array('fotos', 10), (req, res) => {
    let listing;
    try { listing = propiaOr404(req); } catch (e) { borrarArchivos(req.files); throw e; }
    const { datos, errores } = validarListing(req.body);
    const fotosActuales = db.prepare('SELECT id, filename FROM photos WHERE listing_id = ? ORDER BY orden, id').all(listing.id);
    const eliminar = new Set([].concat(req.body.eliminar_fotos || []).map(Number));
    const quedan = fotosActuales.filter((f) => !eliminar.has(f.id)).length + (req.files || []).length;
    if (quedan > MAX_FOTOS) errores.push(`Máximo ${MAX_FOTOS} fotos por propiedad.`);
    if (errores.length) {
      borrarArchivos(req.files);
      return res.status(400).render('propiedad-form', { title: 'Editar propiedad', listing: { ...datos, id: listing.id }, fotos: fotosActuales, errores });
    }
    const borradas = transaction(db, () => {
      db.prepare(`UPDATE listings SET titulo=?, descripcion=?, tipo=?, region=?, comuna=?, direccion=?, superficie_m2=?,
          precio_noche=?, tarifa_limpieza=?, capacidad=?, dormitorios=?, banos=?, min_noches=?, amenities=?, activo=?
        WHERE id = ?`)
        .run(datos.titulo, datos.descripcion, datos.tipo, datos.region, datos.comuna, datos.direccion || null,
          datos.superficie_m2, datos.precio_noche, datos.tarifa_limpieza, datos.capacidad, datos.dormitorios,
          datos.banos, datos.min_noches, JSON.stringify(datos.amenities), datos.activo, listing.id);
      const out = fotosActuales.filter((f) => eliminar.has(f.id));
      const del = db.prepare('DELETE FROM photos WHERE id = ? AND listing_id = ?');
      out.forEach((f) => del.run(f.id, listing.id));
      const base = fotosActuales.length;
      const ins = db.prepare('INSERT INTO photos (listing_id, filename, orden) VALUES (?, ?, ?)');
      (req.files || []).forEach((f, i) => ins.run(listing.id, f.filename, base + i));
      return out;
    });
    for (const f of borradas) fs.rm(path.join(uploadsDir, path.basename(f.filename)), { force: true }, () => {});
    req.flash('ok', 'Cambios guardados.');
    res.redirect(`/propiedades/${listing.id}`);
  });

  r.post('/reservas/:id/:accion', requireHost, (req, res) => {
    const nuevoEstado = { aceptar: 'confirmada', rechazar: 'rechazada' }[req.params.accion];
    if (!nuevoEstado) throw new HttpError(404, 'Acción no válida.');
    const b = db.prepare(`SELECT b.id, b.estado FROM bookings b JOIN listings l ON l.id = b.listing_id
      WHERE b.id = ? AND l.host_id = ?`).get(toInt(req.params.id, { min: 1 }), req.user.id);
    if (!b) throw new HttpError(404, 'Reserva no encontrada.');
    if (b.estado !== 'pendiente') {
      req.flash('error', 'Esta reserva ya fue respondida.');
    } else {
      db.prepare('UPDATE bookings SET estado = ? WHERE id = ?').run(nuevoEstado, b.id);
      req.flash('ok', nuevoEstado === 'confirmada' ? `Reserva #${b.id} confirmada.` : `Reserva #${b.id} rechazada; las fechas quedan libres.`);
    }
    res.redirect('/anfitrion');
  });

  return r;
};

module.exports.validarListing = validarListing;
