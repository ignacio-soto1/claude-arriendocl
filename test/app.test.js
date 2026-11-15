'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDb } = require('../src/db');
const { createApp } = require('../src/app');
const { seed, addDays } = require('../src/seed');
const { hoyChile } = require('../src/chile');

let server;
let base;
let db;
const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aecl-uploads-'));

test.before(async () => {
  db = openDb(':memory:');
  seed(db);
  const app = createApp({ db, uploadsDir, sessionSecret: 'test-secret' });
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.close(); fs.rmSync(uploadsDir, { recursive: true, force: true }); });

// Cliente mínimo con cookies.
function client() {
  let cookies = {};
  const req = async (method, url, form) => {
    const headers = { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ') };
    let body;
    if (form instanceof FormData) body = form;
    else if (form) { body = new URLSearchParams(form); headers['content-type'] = 'application/x-www-form-urlencoded'; }
    const res = await fetch(base + url, { method, headers, body, redirect: 'manual' });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      cookies[kv.slice(0, i)] = kv.slice(i + 1);
    }
    return { status: res.status, location: res.headers.get('location'), text: await res.text() };
  };
  return {
    get: (u) => req('GET', u),
    post: (u, f) => req('POST', u, f),
    async follow(u) { return req('GET', u); },
    reset() { cookies = {}; },
  };
}

async function login(c, email) {
  const r = await c.post('/ingresar', { email, password: 'demo1234' });
  assert.equal(r.status, 302, 'login debería redirigir');
}

test('la portada lista propiedades y filtra por región y tipo', async () => {
  const c = client();
  const home = await c.get('/');
  assert.equal(home.status, 200);
  assert.match(home.text, /12 propiedades/);
  const r = await c.get('/?region=Metropolitana+de+Santiago&tipo=parcela');
  assert.match(r.text, /1 propiedad en Metropolitana de Santiago/);
  assert.match(r.text, /Pirque/);
  const t = await c.get('/?texto=tinaja');
  assert.match(t.text, /Pucón/);
  assert.doesNotMatch(t.text, /Studio moderno/);
});

test('la búsqueda por fechas excluye propiedades ocupadas', async () => {
  const c = client();
  const llegada = addDays(hoyChile(), 15);
  const salida = addDays(hoyChile(), 17);
  const r = await c.get(`/?region=La+Araucan%C3%ADa&llegada=${llegada}&salida=${salida}`);
  assert.match(r.text, /0 propiedades/);
});

test('el registro valida el RUT y rechaza duplicados', async () => {
  const c = client();
  const malo = await c.post('/registro', { nombre: 'Ana', email: 'ana@x.cl', rut: '12.345.678-9', password: 'secreto123' });
  assert.equal(malo.status, 400);
  assert.match(malo.text, /RUT no es válido/);
  const dup = await c.post('/registro', { nombre: 'Ana', email: 'ana@x.cl', rut: '123456785', password: 'secreto123' });
  assert.match(dup.text, /Ya existe una cuenta con ese RUT/);
  const ok = await c.post('/registro', { nombre: 'Ana Rojas', email: 'ana@x.cl', rut: '7654321-6', password: 'secreto123' });
  assert.equal(ok.status, 302);
  assert.equal(db.prepare("SELECT rut FROM users WHERE email = 'ana@x.cl'").get().rut, '7.654.321-6');
});

test('ingresar no redirige a dominios externos', async () => {
  const c = client();
  const r = await c.post('/ingresar', { email: 'huesped@demo.cl', password: 'demo1234', volver: '//evil.com' });
  assert.equal(r.location, '/');
  const bad = await c.post('/ingresar', { email: 'huesped@demo.cl', password: 'mala' });
  assert.equal(bad.status, 401);
});

test('flujo completo: reservar, choque de fechas, aceptar, cancelar', async () => {
  const guest = client();
  const host = client();
  const listingId = db.prepare("SELECT id FROM listings WHERE comuna = 'Providencia'").get().id;

  const anon = await guest.post(`/propiedades/${listingId}/reservar`, {});
  assert.match(anon.location, /^\/ingresar\?volver=/);

  await login(guest, 'huesped@demo.cl');
  const llegada = addDays(hoyChile(), 40);
  const salida = addDays(hoyChile(), 43);
  const r = await guest.post(`/propiedades/${listingId}/reservar`, { llegada, salida, huespedes: '2' });
  assert.equal(r.location, '/mis-reservas');
  const b = db.prepare('SELECT * FROM bookings WHERE listing_id = ? ORDER BY id DESC').get(listingId);
  assert.equal(b.estado, 'pendiente');
  assert.equal(b.noches, 3);
  assert.equal(b.total, 42000 * 3 + 10000 + 12600);

  // Mismo rango solapado → rechazado
  const choque = await guest.post(`/propiedades/${listingId}/reservar`, { llegada: addDays(llegada, 1), salida: addDays(salida, 2), huespedes: '1' });
  assert.match(choque.location, /^\/propiedades\//);
  const ficha = await guest.follow(choque.location);
  assert.match(ficha.text, /ya no están disponibles/);

  // Capacidad excedida
  await guest.post(`/propiedades/${listingId}/reservar`, { llegada: addDays(salida, 5), salida: addDays(salida, 7), huespedes: '9' });
  assert.match((await guest.get(`/propiedades/${listingId}`)).text, /Capacidad máxima: 2/);

  // Fechas pasadas
  await guest.post(`/propiedades/${listingId}/reservar`, { llegada: addDays(hoyChile(), -2), salida: hoyChile(), huespedes: '1' });
  assert.match((await guest.get(`/propiedades/${listingId}`)).text, /no puede estar en el pasado/);

  // Otro anfitrión no puede aceptar
  await login(host, 'rodrigo@demo.cl');
  const ajena = await host.post(`/anfitrion/reservas/${b.id}/aceptar`);
  assert.equal(ajena.status, 404);

  host.reset();
  await login(host, 'anfitrion@demo.cl');
  const panel = await host.get('/anfitrion');
  assert.match(panel.text, new RegExp(`Javiera Soto`));
  await host.post(`/anfitrion/reservas/${b.id}/aceptar`);
  assert.equal(db.prepare('SELECT estado FROM bookings WHERE id = ?').get(b.id).estado, 'confirmada');

  const mis = await guest.get('/mis-reservas');
  assert.match(mis.text, /anfitrion@demo\.cl/); // contacto visible tras confirmar

  await guest.post(`/reservas/${b.id}/cancelar`);
  assert.equal(db.prepare('SELECT estado FROM bookings WHERE id = ?').get(b.id).estado, 'cancelada');
});

test('el anfitrión no puede reservar su propia propiedad', async () => {
  const c = client();
  await login(c, 'anfitrion@demo.cl');
  const id = db.prepare("SELECT id FROM listings WHERE comuna = 'Pucón'").get().id;
  await c.post(`/propiedades/${id}/reservar`, { llegada: addDays(hoyChile(), 50), salida: addDays(hoyChile(), 53), huespedes: '2' });
  const ficha = await c.get(`/propiedades/${id}`);
  assert.match(ficha.text, /No puedes reservar tu propia propiedad/);
  assert.match(ficha.text, /Esta es tu propiedad/);
});

test('reseñas: solo después de la estadía y una vez por reserva', async () => {
  const c = client();
  await login(c, 'huesped@demo.cl');
  const futura = db.prepare("SELECT id FROM bookings WHERE estado = 'confirmada' AND check_in > ?").get(hoyChile());
  await c.post(`/reservas/${futura.id}/resena`, { rating: '5' });
  assert.match((await c.get('/mis-reservas')).text, /después de tu estadía/);
  const conResena = db.prepare('SELECT booking_id FROM reviews LIMIT 1').get();
  await c.post(`/reservas/${conResena.booking_id}/resena`, { rating: '3' });
  assert.match((await c.get('/mis-reservas')).text, /Ya dejaste una reseña/);
});

test('publicar propiedad con foto, editarla y pausarla', async () => {
  const c = client();
  await login(c, 'huesped@demo.cl');
  assert.equal((await c.get('/anfitrion')).location, '/anfitrion/activar');
  await c.post('/anfitrion/activar');

  const invalida = await c.post('/anfitrion/propiedades/nueva', { titulo: 'corto' });
  assert.equal(invalida.status, 400);

  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
  const fd = new FormData();
  for (const [k, v] of Object.entries({
    titulo: 'Departamento con vista en Valdivia', tipo: 'departamento', region: 'Los Ríos', comuna: 'Valdivia',
    descripcion: 'Departamento luminoso frente al río Calle-Calle, cerca de la costanera.', precio_noche: '55.000',
    capacidad: '3', dormitorios: '1', banos: '1', activo: '1',
  })) fd.append(k, v);
  fd.append('amenities', 'wifi');
  fd.append('amenities', 'lago_rio');
  fd.append('fotos', new Blob([png], { type: 'image/png' }), 'foto.png');
  const r = await c.post('/anfitrion/propiedades/nueva', fd);
  assert.equal(r.status, 302);
  const id = Number(r.location.split('/').pop());
  const l = db.prepare('SELECT * FROM listings WHERE id = ?').get(id);
  assert.equal(l.precio_noche, 55000);
  assert.deepEqual(JSON.parse(l.amenities), ['wifi', 'lago_rio']);
  const foto = db.prepare('SELECT filename FROM photos WHERE listing_id = ?').get(id);
  assert.ok(fs.existsSync(path.join(uploadsDir, foto.filename)));
  assert.equal((await c.get(`/fotos/${foto.filename}`)).status, 200);

  // Editar: pausar y borrar la foto
  const fotoId = db.prepare('SELECT id FROM photos WHERE listing_id = ?').get(id).id;
  const ed = await c.post(`/anfitrion/propiedades/${id}/editar`, {
    titulo: 'Departamento con vista en Valdivia', tipo: 'departamento', region: 'Los Ríos', comuna: 'Valdivia',
    descripcion: l.descripcion, precio_noche: '60000', capacidad: '3', dormitorios: '1', banos: '1',
    activo: '0', eliminar_fotos: String(fotoId),
  });
  assert.equal(ed.status, 302);
  assert.equal(db.prepare('SELECT activo, precio_noche FROM listings WHERE id = ?').get(id).activo, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM photos WHERE listing_id = ?').get(id).n, 0);

  // Pausada: invisible para otros, visible para el dueño
  const anon = client();
  assert.equal((await anon.get(`/propiedades/${id}`)).status, 404);
  assert.equal((await c.get(`/propiedades/${id}`)).status, 200);

  // Otro usuario no puede editarla
  const otro = client();
  await login(otro, 'rodrigo@demo.cl');
  assert.equal((await otro.get(`/anfitrion/propiedades/${id}/editar`)).status, 404);
});

test('las vistas escapan HTML ingresado por usuarios', async () => {
  const c = client();
  await login(c, 'rodrigo@demo.cl');
  const r = await c.post('/anfitrion/propiedades/nueva', {
    titulo: '<script>alert(1)</script> casa', tipo: 'casa', region: 'Maule', comuna: 'Talca',
    descripcion: 'Una descripción suficientemente larga para pasar la validación.', precio_noche: '30000',
    capacidad: '2', dormitorios: '1', banos: '1',
  });
  const ficha = await c.get(r.location);
  assert.doesNotMatch(ficha.text, /<script>alert/);
  assert.match(ficha.text, /&lt;script&gt;/);
});
