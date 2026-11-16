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
  //      precio_noche?, detalle?, limpieza?, total?, total_tarjeta?, pago?, horario?, nombre? }
  function mensajeReserva(d) {
    // Sin emojis: el enlace de WhatsApp en iPhone los muestra como un signo de reemplazo.
    const l = [`Hola ${d.marca}, quiero reservar:`, '', `*${d.titulo}*`, `${d.tipo} en ${d.comuna}, ${d.region}`, ''];
    if (d.llegada && d.salida) {
      l.push(`*Llegada:* ${fmtFecha(d.llegada)}`, `*Salida:* ${fmtFecha(d.salida)}`);
      if (d.noches) l.push(`*Noches:* ${d.noches}`);
      if (d.huespedes) l.push(`*Huéspedes:* ${d.huespedes}`);
      if (d.horario) l.push(`*Horario:* ${d.horario}`);
    } else {
      l.push('*Fechas:* por definir');
      if (d.huespedes) l.push(`*Huéspedes:* ${d.huespedes}`);
    }
    if (d.total) {
      l.push('', '*Resumen del precio*');
      if (d.detalle && d.detalle.length) {
        // Desglose por tipo de noche (temporada, fin de semana, normal)
        const varios = d.detalle.length > 1 || d.detalle[0].etiqueta !== 'Normal';
        for (const g of d.detalle) {
          l.push(`${clp.format(g.precio)} × ${plural(g.noches, 'noche', 'noches')}${varios ? ` (${g.etiqueta.toLowerCase()})` : ''} = ${clp.format(g.precio * g.noches)}`);
        }
      } else if (d.precio_noche && d.noches) {
        l.push(`${clp.format(d.precio_noche)} × ${plural(d.noches, 'noche', 'noches')} = ${clp.format(d.precio_noche * d.noches)}`);
      }
      if (d.limpieza) l.push(`Limpieza: ${clp.format(d.limpieza)}`);
      if (d.total_tarjeta) {
        l.push(`*Total con transferencia: ${clp.format(d.total)} CLP*`, `*Total con tarjeta: ${clp.format(d.total_tarjeta)} CLP*`);
      } else {
        l.push(`*Total: ${clp.format(d.total)} CLP*`);
      }
    }
    if (d.pago) l.push('', `*Forma de pago:* ${d.pago}`);
    if (d.nombre) l.push('', `*Mi nombre:* ${d.nombre}`);
    l.push('', `Ver propiedad: ${d.url}`, '', '¿Está disponible?');
    return l.join('\n');
  }

  // Mensaje de un dueño que quiere publicar su propiedad.
  // d: { marca, nombre, tipo, ubicacion, capacidad?, precio?, comentarios? }
  function mensajePublicar(d) {
    const l = [`Hola ${d.marca}, quiero publicar mi propiedad:`, ''];
    if (d.nombre) l.push(`*Nombre:* ${d.nombre}`);
    if (d.tipo) l.push(`*Tipo:* ${d.tipo}`);
    if (d.ubicacion) l.push(`*Ubicación:* ${d.ubicacion}`);
    if (d.capacidad) l.push(`*Capacidad:* ${d.capacidad} ${d.capacidad === 1 ? 'persona' : 'personas'}`);
    if (d.precio) l.push(`*Precio por noche que espero:* ${clp.format(d.precio)}`);
    if (d.comentarios) l.push(`*Lo que ofrece:* ${d.comentarios}`);
    l.push('', '¿Cómo seguimos?');
    return l.join('\n');
  }

  function waUrl(numero, texto) {
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  return { mensajeReserva, mensajePublicar, waUrl };
});
