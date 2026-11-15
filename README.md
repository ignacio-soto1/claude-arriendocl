# Arriendo en CL · Arriendo de parcelas y departamentos en Chile

Sitio web de [@arriendoencl](https://www.instagram.com/arriendoencl/): plataforma tipo Airbnb enfocada solo en Chile: parcelas, departamentos, casas y cabañas por noche, de Arica a Magallanes.

## Cómo correrlo

Requiere Node.js 22.13 o superior (usa el SQLite que trae Node, sin dependencias nativas).

```bash
cd arriendos-chile
npm install
npm run seed      # crea data/arriendos.db con 12 propiedades de ejemplo
npm start         # http://localhost:3000
npm test          # 19 tests (unitarios + flujo completo HTTP)
```

Usuarios de demo (contraseña `demo1234`):

| Correo | Rol |
|---|---|
| `huesped@demo.cl` | Huésped con reservas pasadas y futuras |
| `anfitrion@demo.cl` | Anfitriona con propiedades y solicitudes pendientes |
| `rodrigo@demo.cl` | Segundo anfitrión |

Variables de entorno: `PORT`, `DB_FILE`, `UPLOADS_DIR`, `SESSION_SECRET` (obligatoria con `NODE_ENV=production`).

## Qué incluye

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
