# Arriendo en CL · Arriendo de parcelas y departamentos en Chile

Sitio web de [@arriendoencl](https://www.instagram.com/arriendoencl/): plataforma tipo Airbnb enfocada solo en Chile: parcelas, departamentos, casas y cabañas por noche, de Arica a Magallanes.

## Sitio estático en GitHub Pages (carpeta `docs/`)

Versión catálogo del sitio, sin servidor: lista de propiedades con filtros, **mapa con todas las ubicaciones**, ficha de cada propiedad con mapa y cálculo del total, y botón **Reservar por WhatsApp** con el pedido ya escrito.

**Publicarlo (una vez):**
1. En GitHub, el repo debe ser **público** (o tener GitHub Pro para Pages en repos privados).
2. Repo → **Settings** → **Pages** → *Build and deployment*: Source **Deploy from a branch**, Branch **main**, carpeta **/docs** → **Save**.
3. En 1–2 minutos queda en `https://ignacio-soto1.github.io/claude-arriendocl/`.

**Editarlo** (desde la web de GitHub con el lápiz ✏️, sin instalar nada):
- `docs/config.js` → tu número de WhatsApp (`'56912345678'`) y la marca.
- `docs/data/propiedades.js` → propiedades: textos, precios, coordenadas para el mapa y fechas ya reservadas.
- `docs/img/` → sube las fotos y agrégalas en `fotos: ['img/archivo.jpg']`.

Cada commit a `main` se publica solo. Para probarlo en tu computador: `cd docs && python3 -m http.server` y abre http://localhost:8000.

Identidad visual: logo recreado del Instagram (íconos llave · piscina · casa, ARRIENDO en Playfair Display, EN CL en Montserrat), paleta azul piscina / turquesa / dorado / celeste, y foto de portada `docs/img/hero-piscina.jpg` (cámbiala por otra foto horizontal con el mismo nombre).

El mapa usa [Leaflet](https://leafletjs.com) (incluido en `docs/vendor/`) con mapas de [OpenStreetMap](https://www.openstreetmap.org): gratis y sin clave.

### Qué se edita y dónde

| Quiero… | Archivo | Campo |
|---|---|---|
| Cambiar el WhatsApp de reservas | `docs/config.js` | `whatsapp` |
| Ajustar el % extra con tarjeta | `docs/config.js` | `recargoTarjeta` (0 lo desactiva) |
| Cambiar horarios, cancelación, garantía y reglas | `docs/config.js` | `condiciones` (y `condiciones` en una propiedad para excepciones) |
| Precio de fin de semana o por temporada | `docs/data/propiedades.js` | `precio_fin_semana`, `temporadas` |
| Publicar una parcela para eventos de día | `docs/data/propiedades.js` | `modalidad: 'dia'`, `precio_dia`, `precio_dia_fin_semana`, `horario_dia`, `por_persona` |
| Marcar fechas reservadas | `docs/data/propiedades.js` | `ocupado` |
| Agregar opiniones reales de huéspedes | `docs/data/propiedades.js` | `resenas` |

**Después de agregar o cambiar propiedades**, corre `npm run paginas`. Esto regenera `docs/p/`: una página por propiedad que da la vista previa con foto, título y precio cuando el enlace se comparte en WhatsApp o Instagram. Hay un test que avisa si quedaron desactualizadas.

### Estadísticas (opcional, gratis)

1. Crea una cuenta en [goatcounter.com](https://www.goatcounter.com) (sin publicidad ni cookies) y elige un código, por ejemplo `arriendoencl`.
2. Escríbelo en `docs/config.js` → `goatcounter: 'arriendoencl'`.
3. Verás visitas por página y los clics en *Reservar por WhatsApp*, *Compartir*, *Enviar a un amigo* y *Publica con nosotros*, por propiedad.

### Dominio propio (ej. arriendoencl.cl)

1. Compra el dominio en [nic.cl](https://www.nic.cl).
2. En la configuración DNS del dominio crea 4 registros **A** apuntando a `185.199.108.153`, `185.199.109.153`, `185.199.110.153` y `185.199.111.153`, y un **CNAME** `www` → `ignacio-soto1.github.io`.
3. En GitHub → Settings → Pages → **Custom domain**, escribe el dominio y activa **Enforce HTTPS**.
4. Cambia `urlSitio` en `docs/config.js` por la dirección nueva y corre `npm run paginas`.

## App completa con servidor (Node.js)

La versión con cuentas, reservas en el sitio y panel de anfitrión sigue en `src/` (requiere un servidor, no corre en Pages).

### Cómo correrla

Requiere Node.js 22.13 o superior (usa el SQLite que trae Node, sin dependencias nativas).

```bash
git clone https://github.com/ignacio-soto1/claude-arriendocl && cd claude-arriendocl
npm install
npm run seed      # crea data/arriendos.db con 12 propiedades de ejemplo
WHATSAPP_RESERVAS="+56 9 1234 5678" npm start   # http://localhost:3000
npm test          # 35 tests (app + sitio estático) (unitarios + flujo completo HTTP)
```

Usuarios de demo (contraseña `demo1234`):

| Correo | Rol |
|---|---|
| `huesped@demo.cl` | Huésped con reservas pasadas y futuras |
| `anfitrion@demo.cl` | Anfitriona con propiedades y solicitudes pendientes |
| `rodrigo@demo.cl` | Segundo anfitrión |

Variables de entorno: `WHATSAPP_RESERVAS` (celular que recibe las reservas, ej. `+56 9 1234 5678`), `PORT`, `DB_FILE`, `UPLOADS_DIR`, `SESSION_SECRET` (obligatoria con `NODE_ENV=production`).

## Qué incluye

**Reserva por WhatsApp**
- Botón "Reservar por WhatsApp" en cada propiedad que abre el chat con el pedido ya escrito: propiedad, comuna, fechas, noches, huéspedes, total estimado, nombre del cliente (si ingresó) y enlace.
- El mensaje se actualiza en vivo al cambiar fechas o huéspedes. Se edita en `public/whatsapp.js`.
- Si `WHATSAPP_RESERVAS` no está definido, el botón no aparece y queda solo la reserva en el sitio.

**Huéspedes**
- Búsqueda por región → comuna (16 regiones), tipo, fechas, nº de huéspedes, precio máximo y texto libre; orden por precio, novedad o valoración.
- La búsqueda por fechas excluye propiedades ya ocupadas y las que exigen más noches mínimas.
- Ficha con galería, comodidades (tinaja, quincho, leña, acceso a lago…), superficie en m²/ha, fechas ocupadas y reseñas.
- Cotización en vivo en CLP: noches × precio + limpieza + 10 % de tarifa de servicio.
- Solicitud de reserva → el anfitrión acepta o rechaza. Cancelación antes del check-in.
- Datos de contacto del anfitrión visibles solo con la reserva confirmada.
- Reseña (1–5 ★) solo después de la estadía y una vez por reserva.

**Anfitriones**
- Panel con ingresos confirmados, solicitudes por responder y todas las reservas.
- Publicar, editar o pausar propiedades; subir fotos (JPG/PNG/WebP, 5 MB) y borrarlas.

**Detalles para Chile**
- Registro con **RUT validado** (dígito verificador) y normalizado `12.345.678-5`; un RUT por cuenta.
- Celular en formato `+56 9 …`, montos en pesos chilenos (`$95.000`), fechas en `es-CL`.
- La fecha de "hoy" se calcula en hora de Santiago (no del servidor).

**Seguridad básica**
- Contraseñas con scrypt y sal, cookie de sesión firmada `httpOnly` + `SameSite=Lax`.
- Consultas parametrizadas, HTML escapado, sin redirecciones a dominios externos.
- Reservas creadas dentro de una transacción para que dos huéspedes no tomen las mismas fechas.

## Estructura

```
src/
  server.js          arranque
  app.js             Express, sesión, manejo de errores
  db.js              esquema SQLite, transacciones, hash de contraseñas
  chile.js           regiones/comunas, RUT, CLP, fecha Chile
  pricing.js         noches, cotización, solapamiento de fechas
  routes/            auth, listings (búsqueda/ficha), bookings, host
  seed.js            datos de demo
views/               plantillas EJS
public/              CSS y JS del cliente
test/                tests con node:test
```

## Próximos pasos para salir a producción

1. **Pagos**: integrar Webpay Plus (Transbank), Flow o Mercado Pago. Cobrar al aceptar y liberar el pago al anfitrión después del check-in.
2. **Boletas/facturas**: emisión electrónica ante el SII por la tarifa de servicio (por ejemplo vía OpenFactura o Bsale).
3. **Comunas completas**: cargar las 346 comunas oficiales (hoy hay ~150 de las más turísticas).
4. **Correos y notificaciones**: confirmar reservas y avisar de nuevas solicitudes (Resend, SES…). Expirar solicitudes no respondidas en 24 h.
5. **Mensajería** huésped–anfitrión y **calendario** con bloqueo manual de fechas y precios por temporada (verano, fiestas patrias).
6. **Verificación de identidad** del anfitrión (carnet + selfie) y recuperación de contraseña.
7. **Mapa** (Google Maps/Mapbox) y fotos en almacenamiento externo (S3/R2) con CDN.
8. **Base de datos**: migrar a PostgreSQL al pasar a varias instancias; añadir token CSRF explícito y rate limiting en login.
9. **Legal**: términos y condiciones, política de privacidad (Ley 19.628 y la nueva Ley 21.719 de datos personales) y Ley del Consumidor.
