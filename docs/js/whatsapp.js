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

  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  // d: { marca, titulo, tipo, comuna, region, url, llegada?, salida?, noches?, huespedes?,
  //      precio_noche?, limpieza?, total?, nombre? }
  function mensajeReserva(d) {
    const l = [`Hola ${d.marca} 👋 Quiero reservar:`, '', `🏡 *${d.titulo}*`, `📍 ${d.tipo} en ${d.comuna}, ${d.region}`, ''];
    if (d.llegada && d.salida) {
      l.push(`📅 Llegada: ${fmtFecha(d.llegada)}`, `📅 Salida: ${fmtFecha(d.salida)}`);
      const extra = [d.noches && `🌙 ${plural(d.noches, 'noche', 'noches')}`, d.huespedes && `👥 ${plural(d.huespedes, 'huésped', 'huéspedes')}`].filter(Boolean);
      if (extra.length) l.push(extra.join(' · '));
    } else {
      l.push('📅 Fechas: por definir');
      if (d.huespedes) l.push(`👥 ${plural(d.huespedes, 'huésped', 'huéspedes')}`);
    }
    if (d.total) {
      l.push('', '💰 *Resumen del precio*');
      if (d.precio_noche && d.noches) l.push(`${clp.format(d.precio_noche)} × ${plural(d.noches, 'noche', 'noches')} = ${clp.format(d.precio_noche * d.noches)}`);
      if (d.limpieza) l.push(`Limpieza: ${clp.format(d.limpieza)}`);
      l.push(`*Total: ${clp.format(d.total)} CLP*`);
    }
    if (d.nombre) l.push('', `🙋 Mi nombre: ${d.nombre}`);
    l.push('', `🔗 ${d.url}`, '', '¿Está disponible?');
    return l.join('\n');
  }

  function waUrl(numero, texto) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  return { mensajeReserva, waUrl };
});
