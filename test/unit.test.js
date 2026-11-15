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
