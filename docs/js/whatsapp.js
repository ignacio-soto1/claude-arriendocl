// Mensaje predeterminado de reserva por WhatsApp.
// Se usa en el navegador (window.WhatsApp) y en el servidor (require) para que el texto sea idéntico.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WhatsApp = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const fecha = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const fmtFecha = (iso) => fecha.format(new Date(iso + 'T00:00:00Z'));

  // d: { marca, titulo, tipo, comuna, region, url, llegada?, salida?, noches?, huespedes?, total?, nombre? }
  function mensajeReserva(d) {
    const l = [`Hola ${d.marca} 👋 Quiero reservar:`, '', `🏡 *${d.titulo}*`, `📍 ${d.tipo} en ${d.comuna}, ${d.region}`];
    if (d.llegada && d.salida) {
      l.push(`📅 Llegada: ${fmtFecha(d.llegada)} · Salida: ${fmtFecha(d.salida)}` +
        (d.noches ? ` (${d.noches} ${d.noches === 1 ? 'noche' : 'noches'})` : ''));
    } else {
      l.push('📅 Fechas: por definir');
    }
    if (d.huespedes) l.push(`👥 Huéspedes: ${d.huespedes}`);
    if (d.total) l.push(`💰 Total estimado: ${clp.format(d.total)}`);
    if (d.nombre) l.push(`🙋 Mi nombre: ${d.nombre}`);
    l.push(`🔗 ${d.url}`, '', '¿Está disponible?');
    return l.join('\n');
  }

  function waUrl(numero, texto) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  return { mensajeReserva, waUrl };
});
