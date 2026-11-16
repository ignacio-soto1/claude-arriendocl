'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const chile = require('../src/chile');
const pricing = require('../src/pricing');
const { toInt } = require('../src/http');
const { validarListing } = require('../src/routes/host');

test('validarRut acepta RUTs válidos en distintos formatos', () => {
  for (const rut of ['12.345.678-5', '123456785', '12345678-5', '11.111.111-1', '7.654.321-6', '10.000.013-K', '10000013k']) {
    assert.ok(chile.validarRut(rut), rut);
  }
});

test('validarRut rechaza dígito verificador incorrecto o formato inválido', () => {
  for (const rut of ['12.345.678-9', '', 'abc', '1-9', '12.345.678', '123456789012-3']) {
    assert.equal(chile.validarRut(rut), false, rut);
  }
});

test('formatearRut normaliza con puntos y guión', () => {
  assert.equal(chile.formatearRut('123456785'), '12.345.678-5');
  assert.equal(chile.formatearRut('7654321-6'), '7.654.321-6');
  assert.equal(chile.formatearRut('10000013k'), '10.000.013-K');
});

test('formatCLP usa separador de miles chileno', () => {
  assert.equal(chile.formatCLP(1234567).replace(/\s/g, ''), '$1.234.567');
  assert.equal(chile.formatCLP(0).replace(/\s/g, ''), '$0');
});

test('comunaValida verifica que la comuna pertenezca a la región', () => {
  assert.ok(chile.comunaValida('La Araucanía', 'Pucón'));
  assert.equal(chile.comunaValida('Valparaíso', 'Pucón'), false);
  assert.equal(chile.comunaValida('Inventada', 'Pucón'), false);
});

test('hoyChile usa la zona horaria de Santiago', () => {
  // 02:00 UTC del 1 de enero = 23:00 del 31 de diciembre en Chile (UTC-3 en verano)
  assert.equal(chile.hoyChile(new Date('2026-01-01T02:00:00Z')), '2025-12-31');
});

test('noches y cotizar calculan totales en CLP', () => {
  assert.equal(pricing.noches('2026-12-30', '2027-01-02'), 3);
  assert.equal(pricing.noches('2026-02-30', '2026-03-02'), null);
  const q = pricing.cotizar({ precio_noche: 50000, tarifa_limpieza: 15000 }, '2026-12-01', '2026-12-04');
  assert.deepEqual(q, { noches: 3, subtotal: 150000, limpieza: 15000, servicio: 15000, total: 180000 });
  assert.equal(pricing.cotizar({ precio_noche: 1 }, '2026-12-04', '2026-12-04'), null);
});

test('seSolapan trata los rangos como [llegada, salida)', () => {
  assert.ok(pricing.seSolapan('2026-12-01', '2026-12-05', '2026-12-04', '2026-12-08'));
  assert.ok(pricing.seSolapan('2026-12-01', '2026-12-10', '2026-12-03', '2026-12-04'));
  assert.equal(pricing.seSolapan('2026-12-01', '2026-12-05', '2026-12-05', '2026-12-08'), false);
});

test('toInt acepta miles con punto y rechaza basura', () => {
  assert.equal(toInt('45.000'), 45000);
  assert.equal(toInt('12abc'), null);
  assert.equal(toInt('5', { min: 6 }), null);
  assert.equal(toInt(''), null);
});

test('validarListing detecta errores y normaliza amenities', () => {
  const { errores } = validarListing({});
  assert.ok(errores.length >= 5);
  const { datos, errores: e2 } = validarListing({
    titulo: 'Parcela linda en Pucón', descripcion: 'x'.repeat(40), tipo: 'parcela', region: 'La Araucanía',
    comuna: 'Pucón', precio_noche: '80.000', capacidad: '4', dormitorios: '2', banos: '1',
    amenities: ['tinaja', 'hackeo'], activo: ['0', '1'],
  });
  assert.deepEqual(e2, []);
  assert.equal(datos.precio_noche, 80000);
  assert.deepEqual(datos.amenities, ['tinaja']);
  assert.equal(datos.activo, 1);
  assert.equal(validarListing({ activo: '0' }).datos.activo, 0);
});

test('mensaje de WhatsApp incluye propiedad, fechas, huéspedes y total', () => {
  const { mensajeReserva, waUrl } = require('../public/whatsapp');
  const base = { marca: 'Arriendo en CL', titulo: 'Parcela en Pucón', tipo: 'Parcela', comuna: 'Pucón',
    region: 'La Araucanía', url: 'https://ejemplo.cl/propiedades/1' };
  const m = mensajeReserva({ ...base, llegada: '2027-01-14', salida: '2027-01-17', noches: 3, huespedes: 4, total: 338500, nombre: 'Javiera' });
  assert.match(m, /^Hola Arriendo en CL/);
  assert.match(m, /\*Parcela en Pucón\*/);
  assert.match(m, /\*Llegada:\* .*14.*ene.*2027\n\*Salida:\* .*17.*ene.*2027\n\*Noches:\* 3\n\*Huéspedes:\* 4/);
  // Solo caracteres del plano básico: WhatsApp en iPhone rompe los emojis del enlace
  assert.ok([...m].every((c) => c.codePointAt(0) < 0x2000 || '×·¿'.includes(c)), 'el mensaje no debe tener emojis');
  assert.match(m, /\*Total: \$\s?338\.500 CLP\*/);
  const conDesglose = mensajeReserva({ ...base, llegada: '2027-01-14', salida: '2027-01-17', noches: 3, precio_noche: 95000, limpieza: 25000, total: 310000 });
  const conPago = mensajeReserva({ ...base, llegada: '2027-01-14', salida: '2027-01-17', noches: 2, precio_noche: 95000, limpieza: 25000,
    total: 215000, total_tarjeta: 230000, pago: 'Transferencia bancaria' });
  assert.match(conPago, /\*Precio total: \$\s?230\.000 CLP\*\n\*Con descuento por transferencia: \$\s?215\.000 CLP\*\n\n\*Forma de pago:\* Transferencia bancaria/);
  const conTarjetaMsg = mensajeReserva({ ...base, llegada: '2027-01-14', salida: '2027-01-17', noches: 3, detalle: [{ etiqueta: 'Normal', precio: 77000, noches: 3 }],
    limpieza: 16100, total: 231000, total_tarjeta: 247100, por_tarjeta: true, pago: 'Tarjeta de crédito o débito (link de pago)' });
  assert.match(conTarjetaMsg, /\$\s?77\.000 × 3 noches = \$\s?231\.000\nLimpieza: \$\s?16\.100\n\*Total: \$\s?247\.100 CLP\*\n\(Con transferencia sería \$\s?231\.000\)/);
  assert.match(conDesglose, /\$\s?95\.000 × 3 noches = \$\s?285\.000\nLimpieza: \$\s?25\.000\n\*Total: \$\s?310\.000 CLP\*/);
  assert.match(m, /\*Mi nombre:\* Javiera/);
  assert.match(m, /https:\/\/ejemplo\.cl\/propiedades\/1/);
  assert.match(mensajeReserva(base), /\*Fechas:\* por definir/);
  const url = waUrl('56912345678', m);
  assert.ok(url.startsWith('https://wa.me/56912345678?text='));
  assert.equal(decodeURIComponent(url.split('text=')[1]), m);
});

test('mensaje para publicar una propiedad', () => {
  const { mensajePublicar } = require('../public/whatsapp');
  const m = mensajePublicar({ marca: 'Arriendo en CL', nombre: 'Carolina', tipo: 'Parcela', ubicacion: 'Peñaflor',
    capacidad: 10, precio: 120000, comentarios: 'Piscina y quincho' });
  assert.match(m, /^Hola Arriendo en CL, me gustaría publicar mi propiedad con ustedes:/);
  assert.match(m, /\*Tipo:\* Parcela\n\*Ubicación:\* Peñaflor\n\*Capacidad:\* 10 personas/);
  assert.match(m, /\*Precio que espero:\* \$\s?120\.000/);
  assert.doesNotMatch(mensajePublicar({ marca: 'X', nombre: 'A', tipo: 'Casa', ubicacion: 'B' }), /Precio|Capacidad/);
});

test('normalizarWhatsapp acepta celulares chilenos', () => {
  const { normalizarWhatsapp } = require('../src/marca');
  assert.equal(normalizarWhatsapp('+56 9 1234 5678'), '56912345678');
  assert.equal(normalizarWhatsapp('912345678'), '56912345678');
  assert.equal(normalizarWhatsapp('22 123 4567'), null);
});
