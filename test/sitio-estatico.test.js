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
    for (const k of ['precio_noche', 'capacidad', 'dormitorios', 'banos', 'min_noches']) {
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
    { ok: true, cotizacion: { noches: 3, subtotal: 300000, limpieza: 20000, total: 320000 } });
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
  assert.ok(C.filtrar(todas, { precio_max: 50000 }).every((p) => p.precio_noche <= 50000));
  assert.ok(C.filtrar(todas, { texto: 'pucon' }).some((p) => p.comuna === 'Pucón'), 'buscar sin tilde');
  assert.ok(C.filtrar(todas, { texto: 'tinaja' }).length >= 2);
  const pucon = todas.find((p) => p.comuna === 'Pucón');
  const o = pucon.ocupado[0];
  assert.ok(!C.filtrar(todas, { llegada: o.desde, salida: C.sumarDias(o.desde, 3) }).includes(pucon));
  const precios = C.filtrar(todas, { orden: 'precio_asc' }).map((p) => p.precio_noche);
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

test('formatos chilenos', () => {
  assert.equal(C.superficie(5000), '5.000 m²');
  assert.equal(C.superficie(20000), '2 ha');
  assert.equal(C.precioCorto(95000), '$95 mil');
  assert.equal(C.formatCLP(338500).replace(/\s/g, ''), '$338.500');
  assert.equal(C.hoyChile(new Date('2026-01-01T02:00:00Z')), '2025-12-31');
});
