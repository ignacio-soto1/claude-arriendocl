'use strict';

// Tests del sitio estático de GitHub Pages (carpeta docs/).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../docs/js/catalogo');

const DOCS = path.join(__dirname, '..', 'docs');
function cargarGlobal(archivo, nombre) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(DOCS, archivo), 'utf8'), ctx);
  return JSON.parse(JSON.stringify(ctx.window[nombre])); // pasar al contexto principal
}
const PROPS = cargarGlobal('data/propiedades.js', 'PROPIEDADES');
const CONFIG = cargarGlobal('config.js', 'CONFIG');

test('cada propiedad del catálogo tiene datos válidos', () => {
  const ids = new Set();
  for (const p of PROPS) {
    const ctx = `propiedad ${p.id}`;
    assert.match(p.id, /^[a-z0-9-]+$/, ctx);
    assert.ok(!ids.has(p.id), `id repetido: ${p.id}`); ids.add(p.id);
    assert.ok(C.TIPOS[p.tipo], `${ctx}: tipo inválido`);
    assert.ok(p.titulo && p.descripcion && p.region && p.comuna, `${ctx}: faltan textos`);
    // Chile continental + insular aproximado
    assert.ok(p.lat < -17 && p.lat > -56 && p.lng < -66 && p.lng > -110, `${ctx}: coordenadas fuera de Chile`);
    assert.ok(!p.modalidad || C.MODALIDADES[p.modalidad], `${ctx}: modalidad inválida`);
    const precios = C.esDia(p) ? ['precio_dia'] : ['precio_noche'];
    if (C.esDia(p)) assert.ok(p.horario_dia && p.horario_dia.desde && p.horario_dia.hasta, `${ctx}: falta horario_dia`);
    for (const k of [...precios, 'capacidad', 'dormitorios', 'banos', 'min_noches']) {
      assert.ok(Number.isInteger(p[k]) && p[k] >= 0, `${ctx}: ${k} inválido`);
    }
    for (const a of p.amenities || []) assert.ok(C.COMODIDADES[a], `${ctx}: comodidad desconocida "${a}"`);
    for (const o of p.ocupado || []) assert.ok(C.esFecha(o.desde) && C.esFecha(o.hasta) && o.desde < o.hasta, `${ctx}: fechas ocupadas inválidas`);
    for (const f of p.fotos || []) assert.ok(fs.existsSync(path.join(DOCS, f)), `${ctx}: no existe la foto ${f}`);
  }
});

test('config.js tiene marca y un WhatsApp vacío o válido', () => {
  assert.ok(CONFIG.marca);
  assert.ok(CONFIG.whatsapp === '' || /^569\d{8}$/.test(CONFIG.whatsapp), 'whatsapp debe ser 569XXXXXXXX o vacío');
});

test('el generador de mensajes de WhatsApp es el mismo en el sitio y la app', () => {
  assert.equal(fs.readFileSync(path.join(DOCS, 'js/whatsapp.js'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '..', 'public/whatsapp.js'), 'utf8'));
});

const base = { id: 'x', tipo: 'parcela', region: 'La Araucanía', comuna: 'Pucón', lat: -39.2, lng: -71.9, titulo: 'Parcela con tinaja',
  descripcion: 'Quincho y río', precio_noche: 100000, tarifa_limpieza: 20000, capacidad: 4, min_noches: 2, amenities: ['tinaja'],
  ocupado: [{ desde: '2027-01-10', hasta: '2027-01-15' }] };

test('validarReserva: total, choque de fechas, mínimo de noches y capacidad', () => {
  const hoy = '2026-11-15';
  assert.deepEqual(C.validarReserva(base, { llegada: '2027-01-05', salida: '2027-01-08', huespedes: 2 }, hoy),
    { ok: true, cotizacion: { noches: 3, subtotal: 300000, limpieza: 20000, total: 320000,
      detalle: [{ etiqueta: 'Normal', precio: 100000, noches: 3 }] } });
  assert.match(C.validarReserva(base, { llegada: '2027-01-08', salida: '2027-01-11' }, hoy).error, /ya están reservadas/);
  assert.equal(C.validarReserva(base, { llegada: '2027-01-15', salida: '2027-01-17' }, hoy).ok, true); // llega el día que salen
  assert.match(C.validarReserva(base, { llegada: '2027-02-01', salida: '2027-02-02' }, hoy).error, /mínimo de 2/);
  assert.match(C.validarReserva(base, { llegada: '2027-02-01', salida: '2027-02-04', huespedes: 9 }, hoy).error, /Capacidad máxima: 4/);
  assert.match(C.validarReserva(base, { llegada: '2026-11-01', salida: '2026-11-04' }, hoy).error, /pasado/);
  assert.equal(C.validarReserva(base, {}, hoy).ok, false);
});

test('filtrar por región, tipo, huéspedes, precio, texto sin tildes y fechas', () => {
  const todas = PROPS;
  assert.equal(C.filtrar(todas, {}).length, todas.length);
  assert.ok(C.filtrar(todas, { tipo: 'parcela' }).every((p) => p.tipo === 'parcela'));
  assert.ok(C.filtrar(todas, { region: 'Coquimbo' }).every((p) => p.region === 'Coquimbo'));
  assert.ok(C.filtrar(todas, { huespedes: 8 }).every((p) => p.capacidad >= 8));
  assert.ok(C.filtrar(todas, { precio_max: 50000 }).every((p) => C.precioBase(p) <= 50000));
  assert.ok(C.filtrar(todas, { modo: 'dia' }).length >= 2 && C.filtrar(todas, { modo: 'dia' }).every(C.esDia));
  assert.ok(C.filtrar(todas, { modo: 'noche' }).every((p) => !C.esDia(p)));
  assert.ok(C.filtrar(todas, { texto: 'pucon' }).some((p) => p.comuna === 'Pucón'), 'buscar sin tilde');
  assert.ok(C.filtrar(todas, { texto: 'tinaja' }).length >= 2);
  const pucon = todas.find((p) => p.comuna === 'Pucón');
  const o = pucon.ocupado[0];
  assert.ok(!C.filtrar(todas, { llegada: o.desde, salida: C.sumarDias(o.desde, 3) }).includes(pucon));
  const precios = C.filtrar(todas, { orden: 'precio_asc' }).map(C.precioBase);
  assert.deepEqual(precios, [...precios].sort((a, b) => a - b));
  const lats = C.filtrar(todas, { orden: 'norte_sur' }).map((p) => p.lat);
  assert.deepEqual(lats, [...lats].sort((a, b) => b - a));
});

test('regiones ordenadas de norte a sur, sin repetir', () => {
  const r = C.regiones(PROPS);
  assert.equal(r[0].region, 'Antofagasta');
  assert.equal(r[r.length - 1].region, 'Magallanes');
  assert.equal(new Set(r.map((x) => x.region)).size, r.length);
});

test('precios por temporada y fin de semana, noche a noche', () => {
  const p = { ...base, ocupado: [], precio_fin_semana: 120000,
    temporadas: [{ nombre: 'Verano', desde: '12-26', hasta: '02-28', precio_noche: 150000 }] };
  // jue 10 jun 2027 a lun 14 jun: jue normal, vie y sáb fin de semana, dom normal
  const q = C.cotizar(p, '2027-06-10', '2027-06-14');
  assert.equal(q.subtotal, 100000 + 120000 + 120000 + 100000);
  assert.deepEqual(q.detalle.map((g) => [g.etiqueta, g.noches]), [['Normal', 1], ['Fin de semana', 2], ['Normal', 1]].reduce((acc, [e, n]) => {
    const g = acc.find((x) => x[0] === e); if (g) g[1] += n; else acc.push([e, n]); return acc; }, []));
  // la temporada cruza el año y gana al fin de semana
  assert.equal(C.precioNoche(p, '2027-01-01').etiqueta, 'Verano');
  assert.equal(C.precioNoche(p, '2026-12-23').precio, 100000); // miércoles, fuera de temporada
  assert.ok(C.enTemporada('2027-02-28', p.temporadas[0]) && !C.enTemporada('2027-03-01', p.temporadas[0]));
});

test('condiciones: generales + propiedad, con regla de mascotas', () => {
  const c = C.condiciones({ amenities: ['mascotas'], condiciones: { llegada: '16:00' } }, { llegada: '15:00', salida: '12:00', reglas: ['Sin fiestas'] });
  assert.equal(c.llegada, '16:00');
  assert.equal(c.salida, '12:00');
  assert.deepEqual(c.reglas, ['Se aceptan mascotas (avísanos al reservar).', 'Sin fiestas']);
  assert.match(C.condiciones({ amenities: [] }, {}).reglas[0], /No se aceptan mascotas/);
});

test('eventos de día: precio por día, fin de semana, personas adicionales y disponibilidad', () => {
  const p = { modalidad: 'dia', precio_dia: 200000, precio_dia_fin_semana: 260000, tarifa_limpieza: 30000, capacidad: 60,
    por_persona: { incluidas: 40, extra: 5000 }, ocupado: [{ desde: '2026-12-05', hasta: '2026-12-06' }] };
  const q = C.cotizarDia(p, '2026-12-12', 50); // sábado
  assert.deepEqual([q.precio, q.etiqueta, q.adicionales, q.extra, q.total], [260000, 'Fin de semana', 10, 50000, 340000]);
  assert.equal(C.cotizarDia(p, '2026-12-09', 30).total, 230000); // miércoles, sin adicionales
  assert.match(C.validarDia(p, { fecha: '2026-12-05' }, '2026-11-15').error, /ya está reservado/);
  assert.match(C.validarDia(p, { fecha: '2026-12-12', asistentes: 70 }, '2026-11-15').error, /Capacidad máxima: 60/);
  assert.equal(C.validarDia(p, { fecha: '2026-12-12', asistentes: 50 }, '2026-11-15').ok, true);
  assert.equal(C.condiciones(p, { alojamiento: { llegada: '15:00' }, eventos: { garantia: 'G' } }).garantia, 'G');
});

test('total con tarjeta: 7% sobre transferencia, redondeado a la luca', () => {
  assert.equal(C.totalTarjeta(215000, 0.07), 230000);
  assert.equal(C.totalTarjeta(100000, 0.07), 107000);
  assert.equal(C.totalTarjeta(215000, 0), 215000);
  assert.equal(C.totalTarjeta(5000, 0.07), 5400); // montos chicos: a la centena
  // Desglose a precio normal: cada línea con recargo y el total es la suma exacta
  const cot = C.cotizar({ precio_noche: 72000, tarifa_limpieza: 15000, ocupado: [] }, '2026-12-01', '2026-12-04');
  const ct = C.cotizacionTarjeta(cot, 0.07);
  assert.deepEqual([ct.lineas[0].precio, ct.limpieza, ct.total], [77000, 16100, 77000 * 3 + 16100]);
  const dia = C.cotizarDia({ precio_dia: 150000, tarifa_limpieza: 25000, por_persona: { incluidas: 25, extra: 4000 } }, '2026-12-02', 30);
  assert.equal(C.cotizacionTarjeta(dia, 0.07).total, 161000 + 5 * 4300 + 27000);
});

test('formatos chilenos', () => {
  assert.equal(C.superficie(5000), '5.000 m²');
  assert.equal(C.superficie(20000), '2 ha');
  assert.equal(C.precioCorto(95000), '$95 mil');
  assert.equal(C.formatCLP(338500).replace(/\s/g, ''), '$338.500');
  assert.equal(C.hoyChile(new Date('2026-01-01T02:00:00Z')), '2025-12-31');
});

test('las páginas de vista previa (docs/p/) están al día con propiedades.js', () => {
  const { pagina, cargar } = require('../scripts/generar-paginas');
  const cfg = cargar('config.js', 'CONFIG');
  for (const p of cargar('data/propiedades.js', 'PROPIEDADES')) {
    const archivo = path.join(DOCS, 'p', `${p.id}.html`);
    assert.ok(fs.existsSync(archivo), `falta docs/p/${p.id}.html: corre "npm run paginas"`);
    assert.equal(fs.readFileSync(archivo, 'utf8'), pagina(p, cfg), `docs/p/${p.id}.html desactualizada: corre "npm run paginas"`);
  }
});
