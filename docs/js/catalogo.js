// Lógica del catálogo (sin DOM): filtros, disponibilidad, cotización y formatos.
// Funciona en el navegador (window.Catalogo) y en Node (require) para los tests.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Catalogo = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TIPOS = { parcela: 'Parcela', departamento: 'Departamento', casa: 'Casa', cabana: 'Cabaña' };
  const ICONOS = { parcela: '🌳', departamento: '🏢', casa: '🏡', cabana: '🛖' };
  const COMODIDADES = {
    wifi: 'Wi-Fi', estacionamiento: 'Estacionamiento', piscina: 'Piscina', quincho: 'Quincho / parrilla',
    tinaja: 'Tinaja / hot tub', lena: 'Estufa o chimenea a leña', calefaccion: 'Calefacción',
    aire: 'Aire acondicionado', cocina: 'Cocina equipada', lavadora: 'Lavadora', mascotas: 'Acepta mascotas',
    vista_mar: 'Vista al mar', lago_rio: 'Acceso a lago o río', terraza: 'Terraza / balcón',
    agua_potable: 'Agua potable', conserje: 'Conserjería 24/7',
  };
  const ORDENES = { recomendadas: 'Recomendadas', precio_asc: 'Menor precio', precio_desc: 'Mayor precio', norte_sur: 'De norte a sur' };

  const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const hoyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' });

  const formatCLP = (n) => clp.format(Math.round(Number(n) || 0));
  const formatFecha = (iso) => fechaCorta.format(new Date(iso + 'T00:00:00Z'));
  const hoyChile = (now = new Date()) => hoyFmt.format(now);

  function esFecha(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  function noches(llegada, salida) {
    if (!esFecha(llegada) || !esFecha(salida)) return null;
    return Math.round((new Date(salida + 'T00:00:00Z') - new Date(llegada + 'T00:00:00Z')) / 86400000);
  }

  // Rangos [llegada, salida): salir y llegar el mismo día no choca.
  const seSolapan = (aIn, aOut, bIn, bOut) => aIn < bOut && bIn < aOut;

  function disponible(p, llegada, salida) {
    return !(p.ocupado || []).some((o) => seSolapan(llegada, salida, o.desde, o.hasta));
  }

  // ¿La fecha (AAAA-MM-DD) cae en la temporada {desde: 'MM-DD', hasta: 'MM-DD'}? Ambos días incluidos;
  // si desde > hasta, la temporada cruza el año (ej. 12-20 a 02-28).
  function enTemporada(fecha, t) {
    const md = fecha.slice(5);
    return t.desde <= t.hasta ? md >= t.desde && md <= t.hasta : md >= t.desde || md <= t.hasta;
  }

  // Precio de una noche: temporada > fin de semana (noches de viernes y sábado) > precio normal.
  function precioNoche(p, fecha) {
    const t = (p.temporadas || []).find((x) => x.precio_noche && enTemporada(fecha, x));
    if (t) return { precio: t.precio_noche, etiqueta: t.nombre };
    const dia = new Date(fecha + 'T00:00:00Z').getUTCDay();
    if (p.precio_fin_semana && (dia === 5 || dia === 6)) return { precio: p.precio_fin_semana, etiqueta: 'Fin de semana' };
    return { precio: p.precio_noche, etiqueta: 'Normal' };
  }

  // ---- Arriendo por día (eventos) ----
  const MODALIDADES = { noche: 'Alojamiento', dia: 'Eventos de día' };
  const esDia = (p) => p.modalidad === 'dia';
  const precioBase = (p) => (esDia(p) ? p.precio_dia : p.precio_noche); // precio "desde" que se muestra
  const unidad = (p) => (esDia(p) ? 'día' : 'noche');

  // Precio del arriendo de un día: temporada > fin de semana (sábado y domingo) > normal.
  function precioDia(p, fecha) {
    const t = (p.temporadas || []).find((x) => x.precio_dia && enTemporada(fecha, x));
    if (t) return { precio: t.precio_dia, etiqueta: t.nombre };
    const dia = new Date(fecha + 'T00:00:00Z').getUTCDay();
    if (p.precio_dia_fin_semana && (dia === 0 || dia === 6)) return { precio: p.precio_dia_fin_semana, etiqueta: 'Fin de semana' };
    return { precio: p.precio_dia, etiqueta: 'Normal' };
  }

  // Cotización de un evento de día. por_persona (opcional): { incluidas, extra } cobra cada asistente sobre "incluidas".
  function cotizarDia(p, fecha, asistentes) {
    if (!esFecha(fecha)) return null;
    const { precio, etiqueta } = precioDia(p, fecha);
    const pp = p.por_persona;
    const adicionales = pp && asistentes ? Math.max(0, asistentes - pp.incluidas) : 0;
    const extra = adicionales * (pp ? pp.extra : 0);
    const limpieza = p.tarifa_limpieza || 0;
    return { dias: 1, precio, etiqueta, adicionales, extra, extraPersona: pp ? pp.extra : 0, limpieza, subtotal: precio + extra, total: precio + extra + limpieza };
  }

  function validarDia(p, { fecha, asistentes }, hoy = hoyChile()) {
    if (!fecha) return { ok: false };
    if (!esFecha(fecha)) return { ok: false, error: 'Fecha no válida.' };
    if (fecha < hoy) return { ok: false, error: 'La fecha no puede ser en el pasado.' };
    const q = cotizarDia(p, fecha, asistentes);
    if (!disponible(p, fecha, sumarDias(fecha, 1))) return { ok: false, error: 'Ese día ya está reservado. Prueba con otro o pregúntanos por WhatsApp.', cotizacion: q };
    if (asistentes && asistentes > p.capacidad) return { ok: false, error: `Capacidad máxima: ${p.capacidad} personas.`, cotizacion: q };
    return { ok: true, cotizacion: q };
  }

  // Cotización noche a noche. detalle agrupa las noches por precio: [{ etiqueta, precio, noches }].
  function cotizar(p, llegada, salida) {
    const n = noches(llegada, salida);
    if (!n || n <= 0) return null;
    const detalle = [];
    let subtotal = 0;
    for (let i = 0; i < n; i++) {
      const { precio, etiqueta } = precioNoche(p, sumarDias(llegada, i));
      subtotal += precio;
      const g = detalle.find((x) => x.etiqueta === etiqueta && x.precio === precio);
      if (g) g.noches++; else detalle.push({ etiqueta, precio, noches: 1 });
    }
    const limpieza = p.tarifa_limpieza || 0;
    return { noches: n, subtotal, limpieza, total: subtotal + limpieza, detalle };
  }

  // Condiciones de la propiedad: las generales de CONFIG con lo propio de cada propiedad encima.
  // generales puede traer { alojamiento: {...}, eventos: {...} } o un solo objeto (compatibilidad).
  function condiciones(p, generales = {}) {
    const base = generales.alojamiento || generales.eventos ? (esDia(p) ? generales.eventos : generales.alojamiento) || {} : generales;
    const c = Object.assign({}, base, p.condiciones || {});
    const reglas = [...(c.reglas || [])];
    reglas.unshift((p.amenities || []).includes('mascotas') ? 'Se aceptan mascotas (avísanos al reservar).' : 'No se aceptan mascotas.');
    return { ...c, reglas };
  }

  // Revisa una solicitud y devuelve { ok, error?, cotizacion? }.
  function validarReserva(p, { llegada, salida, huespedes }, hoy = hoyChile()) {
    if (!llegada || !salida) return { ok: false };
    if (!esFecha(llegada) || !esFecha(salida)) return { ok: false, error: 'Fechas no válidas.' };
    if (llegada < hoy) return { ok: false, error: 'La llegada no puede ser en el pasado.' };
    const q = cotizar(p, llegada, salida);
    if (!q) return { ok: false, error: 'La salida debe ser después de la llegada.' };
    if (!disponible(p, llegada, salida)) return { ok: false, error: 'Esas fechas ya están reservadas. Prueba con otras o pregúntanos por WhatsApp.', cotizacion: q };
    if (q.noches < p.min_noches) return { ok: false, error: `Esta propiedad tiene un mínimo de ${p.min_noches} noches.`, cotizacion: q };
    if (huespedes && huespedes > p.capacidad) return { ok: false, error: `Capacidad máxima: ${p.capacidad} personas.`, cotizacion: q };
    return { ok: true, cotizacion: q };
  }

  function normalizar(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // f: { region, comuna, tipo, huespedes, precio_max, texto, llegada, salida, orden }
  function filtrar(lista, f = {}) {
    const texto = normalizar(f.texto);
    const conFechas = esFecha(f.llegada) && esFecha(f.salida) && f.llegada < f.salida;
    const n = conFechas ? noches(f.llegada, f.salida) : null;
    const out = lista.filter((p) => {
      if (f.modo && (p.modalidad || 'noche') !== f.modo) return false;
      if (f.region && p.region !== f.region) return false;
      if (f.comuna && p.comuna !== f.comuna) return false;
      if (f.tipo && p.tipo !== f.tipo) return false;
      if (f.huespedes && p.capacidad < f.huespedes) return false;
      if (f.precio_max && precioBase(p) > f.precio_max) return false;
      if (esDia(p)) {
        // Evento de día: basta con que el día de llegada esté libre
        if (esFecha(f.llegada) && !disponible(p, f.llegada, sumarDias(f.llegada, 1))) return false;
      } else if (conFechas && (!disponible(p, f.llegada, f.salida) || p.min_noches > n)) return false;
      if (texto) {
        const hay = normalizar([p.titulo, p.descripcion, p.comuna, p.region, TIPOS[p.tipo], MODALIDADES[p.modalidad || 'noche'],
          ...(p.amenities || []).map((a) => COMODIDADES[a])].join(' '));
        if (!texto.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    const orden = {
      precio_asc: (a, b) => precioBase(a) - precioBase(b),
      precio_desc: (a, b) => precioBase(b) - precioBase(a),
      norte_sur: (a, b) => b.lat - a.lat,
    }[f.orden];
    return orden ? out.sort(orden) : out;
  }

  // Regiones con propiedades, ordenadas de norte a sur, con sus comunas.
  function regiones(lista) {
    const m = new Map();
    for (const p of lista) {
      if (!m.has(p.region)) m.set(p.region, { region: p.region, lat: [], comunas: new Set() });
      const r = m.get(p.region);
      r.lat.push(p.lat);
      r.comunas.add(p.comuna);
    }
    return [...m.values()]
      .map((r) => ({ region: r.region, lat: r.lat.reduce((a, b) => a + b, 0) / r.lat.length, comunas: [...r.comunas].sort((a, b) => a.localeCompare(b, 'es')) }))
      .sort((a, b) => b.lat - a.lat)
      .map(({ region, comunas }) => ({ region, comunas }));
  }

  function superficie(m2) {
    if (!m2) return '';
    return m2 >= 10000
      ? `${(m2 / 10000).toLocaleString('es-CL', { maximumFractionDigits: 1 })} ha`
      : `${m2.toLocaleString('es-CL')} m²`;
  }

  // Precio corto para los pines del mapa: $95 mil, $1,2 M
  function precioCorto(n) {
    if (n >= 1e6) return `$${(n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`;
    return `$${Math.round(n / 1000)} mil`;
  }

  // Total con tarjeta: total con transferencia + recargo, redondeado a la luca (o al múltiplo indicado).
  // Precio con tarjeta de un monto: + recargo, redondeado a la luca (a la centena si es menor a $20.000).
  function totalTarjeta(total, recargo, redondeo = total >= 20000 ? 1000 : 100) {
    if (!recargo) return total;
    return Math.round((total * (1 + recargo)) / redondeo) * redondeo;
  }

  // Cotización a precio normal (tarjeta), línea por línea, para que el desglose sume exacto.
  // Devuelve { lineas: [{ texto, etiqueta?, monto }], limpieza, total }.
  function cotizacionTarjeta(cot, recargo) {
    const t = (n) => totalTarjeta(n, recargo);
    const lineas = cot.detalle
      ? cot.detalle.map((g) => ({ precio: t(g.precio), noches: g.noches, etiqueta: g.etiqueta, monto: t(g.precio) * g.noches }))
      : [{ precio: t(cot.precio), etiqueta: cot.etiqueta, monto: t(cot.precio) },
        ...(cot.adicionales ? [{ adicionales: cot.adicionales, precio: t(cot.extraPersona), monto: t(cot.extraPersona) * cot.adicionales }] : [])];
    const limpieza = cot.limpieza ? t(cot.limpieza) : 0;
    return { lineas, limpieza, total: lineas.reduce((a, l) => a + l.monto, 0) + limpieza };
  }

  function sumarDias(iso, d) {
    const x = new Date(iso + 'T00:00:00Z');
    x.setUTCDate(x.getUTCDate() + d);
    return x.toISOString().slice(0, 10);
  }

  return {
    TIPOS, ICONOS, COMODIDADES, ORDENES, MODALIDADES, esDia, precioBase, unidad, precioDia, cotizarDia, validarDia,
    formatCLP, formatFecha, hoyChile, esFecha, noches, seSolapan, disponible, cotizar, validarReserva,
    filtrar, regiones, superficie, precioCorto, sumarDias, normalizar, totalTarjeta, cotizacionTarjeta, precioNoche, enTemporada, condiciones,
  };
});
