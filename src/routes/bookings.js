'use strict';

const express = require('express');
const { transaction } = require('../db');
const { requireAuth, toInt } = require('../http');
const { hoyChile } = require('../chile');
const { parseFecha, cotizar, MAX_NOCHES } = require('../pricing');

class ReservaInvalida extends Error {}

module.exports = ({ db, HttpError }) => {
  const r = express.Router();

  r.post('/propiedades/:id/reservar', requireAuth, (req, res) => {
    const id = toInt(req.params.id, { min: 1 });
    const { llegada = '', salida = '' } = req.body;
    const huespedes = toInt(req.body.huespedes, { min: 1, max: 50 });
    const volver = `/propiedades/${id}?${new URLSearchParams({ llegada, salida, huespedes: huespedes || 1 })}`;

    try {
      const bookingId = transaction(db, () => {
        const listing = id && db.prepare('SELECT * FROM listings WHERE id = ? AND activo = 1').get(id);
        if (!listing) throw new HttpError(404, 'Esta propiedad no existe o ya no está publicada.');
        if (listing.host_id === req.user.id) throw new ReservaInvalida('No puedes reservar tu propia propiedad.');
        if (!parseFecha(llegada) || !parseFecha(salida)) throw new ReservaInvalida('Elige fechas de llegada y salida.');
        if (llegada < hoyChile()) throw new ReservaInvalida('La fecha de llegada no puede estar en el pasado.');
        const q = cotizar(listing, llegada, salida);
        if (!q) throw new ReservaInvalida('La salida debe ser posterior a la llegada.');
        if (q.noches < listing.min_noches) throw new ReservaInvalida(`Esta propiedad tiene un mínimo de ${listing.min_noches} noches.`);
        if (q.noches > MAX_NOCHES) throw new ReservaInvalida(`El máximo por reserva es de ${MAX_NOCHES} noches.`);
        if (!huespedes || huespedes > listing.capacidad) throw new ReservaInvalida(`Capacidad máxima: ${listing.capacidad} personas.`);

        const choque = db.prepare(`SELECT 1 FROM bookings WHERE listing_id = ?
          AND estado IN ('pendiente','confirmada') AND check_in < ? AND ? < check_out LIMIT 1`).get(id, salida, llegada);
        if (choque) throw new ReservaInvalida('Esas fechas ya no están disponibles. Prueba con otras.');

        const info = db.prepare(`INSERT INTO bookings
          (listing_id, guest_id, check_in, check_out, huespedes, noches, subtotal, limpieza, servicio, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(id, req.user.id, llegada, salida, huespedes, q.noches, q.subtotal, q.limpieza, q.servicio, q.total);
        return Number(info.lastInsertRowid);
      });
      req.flash('ok', `Solicitud de reserva #${bookingId} enviada. El anfitrión tiene 24 horas para confirmarla.`);
      res.redirect('/mis-reservas');
    } catch (err) {
      if (!(err instanceof ReservaInvalida)) throw err;
      req.flash('error', err.message);
      res.redirect(volver);
    }
  });

  r.get('/mis-reservas', requireAuth, (req, res) => {
    const reservas = db.prepare(`SELECT b.*, l.titulo, l.comuna, l.region, l.tipo,
        (SELECT filename FROM photos p WHERE p.listing_id = l.id ORDER BY orden, id LIMIT 1) AS foto,
        u.nombre AS host_nombre, u.telefono AS host_telefono, u.email AS host_email,
        rv.rating AS mi_rating
      FROM bookings b JOIN listings l ON l.id = b.listing_id JOIN users u ON u.id = l.host_id
      LEFT JOIN reviews rv ON rv.booking_id = b.id
      WHERE b.guest_id = ? ORDER BY b.check_in DESC`).all(req.user.id);
    res.render('mis-reservas', { title: 'Mis reservas', reservas });
  });

  r.post('/reservas/:id/cancelar', requireAuth, (req, res) => {
    const b = db.prepare('SELECT * FROM bookings WHERE id = ? AND guest_id = ?').get(toInt(req.params.id, { min: 1 }), req.user.id);
    if (!b) throw new HttpError(404, 'Reserva no encontrada.');
    if (!['pendiente', 'confirmada'].includes(b.estado) || b.check_in <= hoyChile()) {
      req.flash('error', 'Esta reserva ya no se puede cancelar.');
    } else {
      db.prepare("UPDATE bookings SET estado = 'cancelada' WHERE id = ?").run(b.id);
      req.flash('ok', 'Reserva cancelada.');
    }
    res.redirect('/mis-reservas');
  });

  r.post('/reservas/:id/resena', requireAuth, (req, res) => {
    const b = db.prepare('SELECT * FROM bookings WHERE id = ? AND guest_id = ?').get(toInt(req.params.id, { min: 1 }), req.user.id);
    if (!b) throw new HttpError(404, 'Reserva no encontrada.');
    const rating = toInt(req.body.rating, { min: 1, max: 5 });
    const comentario = String(req.body.comentario || '').trim().slice(0, 1000);
    const yaExiste = db.prepare('SELECT 1 FROM reviews WHERE booking_id = ?').get(b.id);
    if (b.estado !== 'confirmada' || b.check_out > hoyChile()) req.flash('error', 'Podrás dejar tu reseña después de tu estadía.');
    else if (yaExiste) req.flash('error', 'Ya dejaste una reseña para esta reserva.');
    else if (!rating) req.flash('error', 'Elige una nota de 1 a 5.');
    else {
      db.prepare('INSERT INTO reviews (booking_id, listing_id, guest_id, rating, comentario) VALUES (?, ?, ?, ?, ?)')
        .run(b.id, b.listing_id, req.user.id, rating, comentario || null);
      req.flash('ok', '¡Gracias por tu reseña!');
    }
    res.redirect('/mis-reservas');
  });

  return r;
};
