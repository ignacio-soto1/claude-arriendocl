'use strict';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    req.flash('info', 'Ingresa a tu cuenta para continuar.');
    return res.redirect(`/ingresar?volver=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

function requireHost(req, res, next) {
  if (!req.user) return requireAuth(req, res, next);
  if (!req.user.es_anfitrion) return res.redirect('/anfitrion/activar');
  next();
}

// Convierte a entero acotado (acepta "45.000"); devuelve null si no es válido.
function toInt(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const n = Number(String(value).trim().replace(/\./g, ''));
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

module.exports = { HttpError, requireAuth, requireHost, toInt };
