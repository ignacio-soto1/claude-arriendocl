'use strict';
// Genera docs/p/<id>.html: una página por propiedad con vista previa (foto, título y precio) para
// cuando se comparte el enlace en WhatsApp, Instagram o Facebook. Cada página lleva a la ficha.
// Uso: npm run paginas   (correrlo después de editar docs/data/propiedades.js o docs/config.js)
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const DOCS = path.join(__dirname, '..', 'docs');
const cargar = (archivo, nombre) => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(DOCS, archivo), 'utf8'), ctx);
  return ctx.window[nombre];
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const TIPOS = { parcela: 'Parcela', departamento: 'Departamento', casa: 'Casa', cabana: 'Cabaña' };

function conTarjeta(n, cfg) {
  const r = Number(cfg.recargoTarjeta) || 0;
  return r ? clp.format(Math.round((n * (1 + r)) / 1000) * 1000) : '';
}

// "$102.000 la noche, $95.000 con transferencia" (o solo el precio si no hay recargo con tarjeta)
function precioTexto(n, unidad, cfg) {
  const t = conTarjeta(n, cfg);
  return t ? `${t} ${unidad}, ${clp.format(n)} con transferencia` : `${clp.format(n)} ${unidad}`;
}

function pagina(p, cfg) {
  const base = cfg.urlSitio;
  const imagen = base + (p.fotos && p.fotos[0] ? p.fotos[0] : 'img/hero-piscina.jpg');
  const titulo = `${p.titulo} · ${cfg.marca}`;
  const noche = p.modalidad === 'evento_noche';
  const dia = p.modalidad === 'dia' || noche;
  const desc = dia
    ? `${TIPOS[p.tipo]} para eventos${noche ? ' de noche' : ''} en ${p.comuna}, ${p.region} · hasta ${p.capacidad} personas · desde ${precioTexto(p.precio_dia, noche ? 'por evento' : 'el día', cfg)}. Reserva por WhatsApp.`
    : `${TIPOS[p.tipo]} en ${p.comuna}, ${p.region} · ${p.capacidad} huéspedes · desde ${precioTexto(p.precio_noche, 'la noche', cfg)}. Reserva por WhatsApp.`;
  const destino = `../propiedad.html?id=${encodeURIComponent(p.id)}`;
  return `<!doctype html>
<html lang="es-CL">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(cfg.marca)}">
  <meta property="og:locale" content="es_CL">
  <meta property="og:title" content="${esc(p.titulo)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(imagen)}">
  <meta property="og:url" content="${esc(`${base}p/${p.id}.html`)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${esc(base + destino.slice(3))}">
  <!-- Archivo generado por scripts/generar-paginas.js: no editar a mano. -->
  <script>location.replace(${JSON.stringify(destino)} + location.search.replace(/^\\?/, '&') + location.hash);</script>
</head>
<body>
  <p><a href="${esc(destino)}">Ver ${esc(p.titulo)}</a></p>
</body>
</html>
`;
}

function generar() {
  const cfg = cargar('config.js', 'CONFIG');
  const props = cargar('data/propiedades.js', 'PROPIEDADES');
  if (!cfg.urlSitio) throw new Error('Falta urlSitio en docs/config.js');
  const dir = path.join(DOCS, 'p');
  fs.mkdirSync(dir, { recursive: true });
  const esperados = new Set();
  for (const p of props) {
    const archivo = `${p.id}.html`;
    esperados.add(archivo);
    fs.writeFileSync(path.join(dir, archivo), pagina(p, cfg));
  }
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.html') && !esperados.has(f)) fs.rmSync(path.join(dir, f));
  return [...esperados];
}

if (require.main === module) console.log(`Generadas ${generar().length} páginas en docs/p/`);
module.exports = { pagina, cargar };
