'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openDb } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'arriendos.db');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const PROD = process.env.NODE_ENV === 'production';

let secret = process.env.SESSION_SECRET;
if (!secret) {
  if (PROD) throw new Error('Define SESSION_SECRET en producción.');
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET no definido: usando uno temporal (las sesiones se pierden al reiniciar).');
}

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = openDb(DB_FILE);
const app = createApp({ db, uploadsDir: UPLOADS_DIR, sessionSecret: secret, secureCookies: PROD });

app.listen(PORT, () => console.log(`Arriendo en CL escuchando en http://localhost:${PORT}`));
