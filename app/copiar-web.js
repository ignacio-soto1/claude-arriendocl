'use strict';
// Copia el sitio (../docs) a www/, que es lo que la app lleva dentro.
// Las páginas de vista previa para compartir (docs/p/) no hacen falta en la app.
const fs = require('node:fs');
const path = require('node:path');

const origen = path.join(__dirname, '..', 'docs');
const destino = path.join(__dirname, 'www');
fs.rmSync(destino, { recursive: true, force: true });
fs.cpSync(origen, destino, {
  recursive: true,
  filter: (src) => !src.startsWith(path.join(origen, 'p')) && !src.endsWith('.nojekyll'),
});
console.log('Sitio copiado a app/www');
