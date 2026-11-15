'use strict';

const path = require('node:path');
const express = require('express');
const cookieSession = require('cookie-session');
const chile = require('./chile');
const pricing = require('./pricing');
const { HttpError } = require('./http');

function createApp({ db, uploadsDir, sessionSecret, secureCookies = false }) {
  if (!sessionSecret) throw new Error('sessionSecret es obligatorio');
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/fotos', express.static(uploadsDir, { maxAge: '7d' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieSession({
    name: 'ruka_sesion',
    keys: [sessionSecret],
    maxAge: 30 * 24 * 3600 * 1000,
    httpOnly: true,
    sameSite: 'lax', // bloquea POST cross-site con la cookie de sesión
    secure: secureCookies,
  }));

  // Usuario actual, flash y helpers para las vistas.
  app.use((req, res, next) => {
    req.user = null;
    if (req.session && req.session.userId) {
      req.user = db.prepare('SELECT id, nombre, email, rut, telefono, es_anfitrion FROM users WHERE id = ?')
        .get(req.session.userId) || null;
    }
    req.flash = (type, msg) => { req.session.flash = { type, msg }; };
    res.locals.flash = req.session.flash || null;
    if (req.session.flash) delete req.session.flash;
    Object.assign(res.locals, {
      user: req.user,
      formatCLP: chile.formatCLP,
      formatFecha: chile.formatFecha,
      TIPOS: chile.TIPOS,
      AMENITIES: chile.AMENITIES,
      REGIONES: chile.REGIONES,
      TASA_SERVICIO: pricing.TASA_SERVICIO,
      hoy: chile.hoyChile(),
      path: req.path,
    });
    next();
  });

  const ctx = { db, uploadsDir, HttpError };
  app.use(require('./routes/auth')(ctx));
  app.use(require('./routes/listings')(ctx));
  app.use(require('./routes/bookings')(ctx));
  app.use('/anfitrion', require('./routes/host')(ctx));

  app.use((req, res) => {
    res.status(404).render('error', { title: 'No encontrado', status: 404, message: 'La página que buscas no existe.' });
  });

  app.use((err, req, res, _next) => {
    let status = err.status || 500;
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') { status = 400; message = 'Cada foto puede pesar como máximo 5 MB.'; }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') { status = 400; message = 'Puedes subir hasta 10 fotos a la vez.'; }
    if (status >= 500) {
      console.error(err);
      message = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    }
    res.status(status).render('error', { title: 'Error', status, message });
  });

  return app;
}

module.exports = { createApp };
