'use strict';

// Carga datos de demostración. Uso: npm run seed  (borra la base existente)
const fs = require('node:fs');
const path = require('node:path');
const { openDb, hashPassword } = require('./db');
const { hoyChile } = require('./chile');
const { cotizar } = require('./pricing');

const PROPIEDADES = [
  ['Parcela con tinaja y vista al volcán Villarrica', 'parcela', 'La Araucanía', 'Pucón', 5000, 95000, 25000, 6, 3, 2, 2, ['wifi', 'estacionamiento', 'tinaja', 'quincho', 'lena', 'cocina', 'mascotas'],
    'Parcela de media hectárea a 10 minutos del centro de Pucón, camino a Caburgua. Casa de madera nativa con estufa a leña, tinaja de ciprés para 6 personas y quincho techado. Ideal para familias y grupos de amigos.\n\nA 5 minutos del río Trancura (rafting) y a 30 del centro de ski.'],
  ['Depto frente al mar en Viña con estacionamiento', 'departamento', 'Valparaíso', 'Viña del Mar', 68, 72000, 15000, 4, 2, 1, 2, ['wifi', 'estacionamiento', 'vista_mar', 'terraza', 'cocina', 'lavadora', 'conserje', 'piscina'],
    'Departamento piso 14 en Av. San Martín con vista panorámica al mar. Edificio con piscina y conserjería 24/7. A pasos de la playa Acapulco, restaurantes y el Casino.'],
  ['Cabaña de alerce a orillas del lago Llanquihue', 'cabana', 'Los Lagos', 'Puerto Varas', 80, 110000, 30000, 5, 2, 2, 2, ['wifi', 'estacionamiento', 'lago_rio', 'lena', 'cocina', 'terraza', 'tinaja'],
    'Cabaña de alerce con acceso privado al lago y vista a los volcanes Osorno y Calbuco. Muelle propio, kayaks disponibles. A 8 km del centro de Puerto Varas.'],
  ['Studio moderno en Providencia, metro Los Leones', 'departamento', 'Metropolitana de Santiago', 'Providencia', 38, 42000, 10000, 2, 1, 1, 1, ['wifi', 'aire', 'calefaccion', 'cocina', 'lavadora', 'conserje'],
    'Studio equipado a 2 cuadras del metro Los Leones. Perfecto para viajes de trabajo: escritorio, Wi-Fi de fibra 600 Mbps y check-in autónomo.'],
  ['Parcela de agrado en Pirque con piscina y quincho', 'parcela', 'Metropolitana de Santiago', 'Pirque', 10000, 180000, 40000, 12, 5, 3, 2, ['wifi', 'estacionamiento', 'piscina', 'quincho', 'mascotas', 'agua_potable', 'terraza'],
    'Una hectárea a 40 minutos de Santiago, junto a la Viña Concha y Toro. Casa patronal con piscina, gran quincho para eventos familiares y canchas de pasto. Perfecta para celebraciones y fines de semana largos.'],
  ['Casa familiar a pasos de la playa en La Serena', 'casa', 'Coquimbo', 'La Serena', 140, 85000, 20000, 8, 4, 2, 3, ['wifi', 'estacionamiento', 'quincho', 'cocina', 'lavadora', 'terraza'],
    'Casa de dos pisos en sector Avenida del Mar, a 200 metros de la playa. Patio con quincho, estacionamiento para 2 autos. Excelente base para recorrer el Valle de Elqui.'],
  ['Domo astronómico en el Valle de Elqui', 'cabana', 'Coquimbo', 'Paihuano', 30, 78000, 15000, 2, 1, 1, 2, ['estacionamiento', 'tinaja', 'terraza', 'agua_potable'],
    'Domo con techo transparente para dormir bajo uno de los cielos más limpios del planeta. Tinaja privada, desayuno opcional y tours astronómicos con telescopio a coordinar.'],
  ['Casa de adobe en San Pedro de Atacama', 'casa', 'Antofagasta', 'San Pedro de Atacama', 90, 95000, 20000, 4, 2, 1, 2, ['wifi', 'estacionamiento', 'cocina', 'terraza', 'calefaccion'],
    'Casa tradicional de adobe a 10 minutos caminando de la calle Caracoles. Patio con vista al volcán Licancabur. Ideal para visitar Valle de la Luna, géiseres del Tatio y lagunas altiplánicas.'],
  ['Depto nuevo en Concepción centro', 'departamento', 'Biobío', 'Concepción', 52, 45000, 10000, 3, 1, 1, 1, ['wifi', 'estacionamiento', 'calefaccion', 'cocina', 'conserje'],
    'Departamento a 3 cuadras de la Plaza de la Independencia y cerca de la Universidad de Concepción. Edificio nuevo con estacionamiento subterráneo.'],
  ['Parcela patagónica cerca de Torres del Paine', 'parcela', 'Magallanes y de la Antártica Chilena', 'Puerto Natales', 20000, 150000, 35000, 6, 3, 2, 3, ['wifi', 'estacionamiento', 'lena', 'cocina', 'calefaccion', 'agua_potable'],
    'Dos hectáreas en las afueras de Puerto Natales con vista al seno Última Esperanza. Casa con calefacción central y estufa a leña. Punto de partida perfecto hacia el Parque Nacional Torres del Paine.'],
  ['Cabaña en Chiloé con vista a los palafitos', 'cabana', 'Los Lagos', 'Castro', 55, 62000, 15000, 4, 2, 1, 2, ['wifi', 'estacionamiento', 'lena', 'cocina', 'vista_mar'],
    'Cabaña de tejuela chilota con vista al fiordo y los palafitos de Gamboa. A 5 minutos de la Iglesia de San Francisco, patrimonio de la humanidad.'],
  ['Casa de surf en Pichilemu, Punta de Lobos', 'casa', "Libertador General Bernardo O'Higgins", 'Pichilemu', 110, 90000, 20000, 6, 3, 2, 2, ['wifi', 'estacionamiento', 'vista_mar', 'quincho', 'terraza', 'mascotas'],
    'Casa a 400 metros de Punta de Lobos, una de las mejores olas de Sudamérica. Ducha exterior, guardatablas y quincho con vista al mar.'],
];

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function seed(db) {
  const insUser = db.prepare('INSERT INTO users (nombre, email, rut, telefono, password_hash, es_anfitrion) VALUES (?, ?, ?, ?, ?, ?)');
  const pw = hashPassword('demo1234');
  const host1 = Number(insUser.run('Carolina Muñoz', 'anfitrion@demo.cl', '11.111.111-1', '+56 9 8765 4321', pw, 1).lastInsertRowid);
  const host2 = Number(insUser.run('Rodrigo Pérez', 'rodrigo@demo.cl', '22.222.222-2', '+56 9 1111 2222', pw, 1).lastInsertRowid);
  const guest = Number(insUser.run('Javiera Soto', 'huesped@demo.cl', '12.345.678-5', '+56 9 5555 6666', pw, 0).lastInsertRowid);

  const insListing = db.prepare(`INSERT INTO listings (host_id, titulo, tipo, region, comuna, superficie_m2, precio_noche,
    tarifa_limpieza, capacidad, dormitorios, banos, min_noches, amenities, descripcion, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`);
  const ids = PROPIEDADES.map((p, i) => Number(insListing.run(
    i % 3 === 2 ? host2 : host1, ...p.slice(0, 11), JSON.stringify(p[11]), p[12], `-${i} hours`,
  ).lastInsertRowid));

  const hoy = hoyChile();
  const insBooking = db.prepare(`INSERT INTO bookings (listing_id, guest_id, check_in, check_out, huespedes, noches,
    subtotal, limpieza, servicio, total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const getListing = db.prepare('SELECT * FROM listings WHERE id = ?');
  const reservar = (lid, desde, n, estado) => {
    const l = getListing.get(lid);
    const q = cotizar(l, addDays(hoy, desde), addDays(hoy, desde + n));
    return Number(insBooking.run(lid, guest, addDays(hoy, desde), addDays(hoy, desde + n), 2, q.noches,
      q.subtotal, q.limpieza, q.servicio, q.total, estado).lastInsertRowid);
  };
  const pasada1 = reservar(ids[0], -30, 3, 'confirmada');
  const pasada2 = reservar(ids[2], -60, 2, 'confirmada');
  reservar(ids[0], 14, 4, 'confirmada');
  reservar(ids[1], 7, 3, 'pendiente');
  reservar(ids[4], 21, 2, 'pendiente');

  const insReview = db.prepare('INSERT INTO reviews (booking_id, listing_id, guest_id, rating, comentario) VALUES (?, ?, ?, ?, ?)');
  insReview.run(pasada1, ids[0], guest, 5, 'La tinaja de noche con el volcán al frente es increíble. Carolina súper atenta.');
  insReview.run(pasada2, ids[2], guest, 4, 'Lugar precioso, el muelle es lo mejor. El camino de acceso es de ripio.');
}

if (require.main === module) {
  const file = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'arriendos.db');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
  const db = openDb(file);
  seed(db);
  db.close();
  console.log(`Base de demo creada en ${file}`);
  console.log('Usuarios (clave demo1234): anfitrion@demo.cl · rodrigo@demo.cl · huesped@demo.cl');
}

module.exports = { seed, addDays };
