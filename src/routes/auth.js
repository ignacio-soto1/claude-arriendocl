'use strict';

const express = require('express');
const { hashPassword, verifyPassword } = require('../db');
const { validarRut, formatearRut } = require('../chile');

// Solo redirige a rutas internas para evitar open redirects.
function destinoSeguro(volver) {
  return typeof volver === 'string' && /^\/(?!\/)/.test(volver) ? volver : '/';
}

module.exports = ({ db }) => {
  const r = express.Router();

  r.get('/registro', (req, res) => {
    res.render('registro', { title: 'Crear cuenta', errores: [], datos: {}, volver: req.query.volver || '' });
  });

  r.post('/registro', (req, res) => {
    const datos = {
      nombre: (req.body.nombre || '').trim(),
      email: (req.body.email || '').trim().toLowerCase(),
      rut: (req.body.rut || '').trim(),
      telefono: (req.body.telefono || '').trim(),
      es_anfitrion: req.body.es_anfitrion === '1',
    };
    const password = req.body.password || '';
    const errores = [];
    if (datos.nombre.length < 2) errores.push('Ingresa tu nombre.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) errores.push('El correo no es válido.');
    if (!validarRut(datos.rut)) errores.push('El RUT no es válido (ej: 12.345.678-5).');
    if (datos.telefono && !/^\+?56?\s?9\s?\d{4}\s?\d{4}$/.test(datos.telefono)) errores.push('El celular debe tener formato +56 9 1234 5678.');
    if (password.length < 8) errores.push('La contraseña debe tener al menos 8 caracteres.');

    if (!errores.length) {
      const rut = formatearRut(datos.rut);
      const existe = db.prepare('SELECT email, rut FROM users WHERE email = ? OR rut = ?').get(datos.email, rut);
      if (existe) errores.push(existe.rut === rut ? 'Ya existe una cuenta con ese RUT.' : 'Ya existe una cuenta con ese correo.');
      else {
        const info = db.prepare(`INSERT INTO users (nombre, email, rut, telefono, password_hash, es_anfitrion)
          VALUES (?, ?, ?, ?, ?, ?)`).run(datos.nombre, datos.email, rut, datos.telefono || null,
          hashPassword(password), datos.es_anfitrion ? 1 : 0);
        req.session.userId = Number(info.lastInsertRowid);
        req.flash('ok', `¡Bienvenido/a a Ruka, ${datos.nombre.split(' ')[0]}!`);
        return res.redirect(datos.es_anfitrion ? '/anfitrion' : destinoSeguro(req.body.volver));
      }
    }
    res.status(400).render('registro', { title: 'Crear cuenta', errores, datos, volver: req.body.volver || '' });
  });

  r.get('/ingresar', (req, res) => {
    res.render('ingresar', { title: 'Ingresar', error: null, email: '', volver: req.query.volver || '' });
  });

  r.post('/ingresar', (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const u = db.prepare('SELECT id, nombre, password_hash FROM users WHERE email = ?').get(email);
    if (!u || !verifyPassword(req.body.password || '', u.password_hash)) {
      return res.status(401).render('ingresar', { title: 'Ingresar', error: 'Correo o contraseña incorrectos.', email, volver: req.body.volver || '' });
    }
    req.session.userId = u.id;
    req.flash('ok', `Hola de nuevo, ${u.nombre.split(' ')[0]}.`);
    res.redirect(destinoSeguro(req.body.volver));
  });

  r.post('/salir', (req, res) => {
    req.session = null;
    res.redirect('/');
  });

  return r;
};
