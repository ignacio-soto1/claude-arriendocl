'use strict';

// Comisión de servicio que paga el huésped (sobre el subtotal de noches).
const TASA_SERVICIO = 0.10;
const MAX_NOCHES = 90;
const DIA_MS = 86_400_000;

function parseFecha(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return d;
}

function noches(checkIn, checkOut) {
  const a = parseFecha(checkIn);
  const b = parseFecha(checkOut);
  if (!a || !b) return null;
  return Math.round((b - a) / DIA_MS);
}

function cotizar(listing, checkIn, checkOut) {
  const n = noches(checkIn, checkOut);
  if (n === null || n <= 0) return null;
  const subtotal = listing.precio_noche * n;
  const limpieza = listing.tarifa_limpieza || 0;
  const servicio = Math.round(subtotal * TASA_SERVICIO);
  return { noches: n, subtotal, limpieza, servicio, total: subtotal + limpieza + servicio };
}

// Rangos semiabiertos [in, out): una salida y una llegada el mismo día no chocan.
function seSolapan(aIn, aOut, bIn, bOut) {
  return aIn < bOut && bIn < aOut;
}

module.exports = { TASA_SERVICIO, MAX_NOCHES, parseFecha, noches, cotizar, seSolapan };
