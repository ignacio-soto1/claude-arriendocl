# App de Arriendo en CL (Android y iOS)

La app es el mismo sitio de `docs/` empaquetado con [Capacitor](https://capacitorjs.com).
Cada vez que cambias el sitio, GitHub compila la app de Android sola.

**Las propiedades se actualizan solas:** al abrirse, la app descarga `docs/data/catalogo.json` del sitio
publicado (propiedades, precios, fechas ocupadas, WhatsApp y condiciones). Si no hay internet usa lo último
guardado. Por eso, cambiar propiedades **no** requiere publicar una versión nueva en las tiendas; solo los
cambios de diseño o funciones. `catalogo.json` se regenera solo en GitHub al editar `propiedades.js` o `config.js`.

## Probar la app en Android (sin publicarla)

1. En GitHub: pestaña **Actions** → **App Android** → la última ejecución con ✓ verde.
2. Abajo, en **Artifacts**, descarga **app-prueba-…** (es un .zip con `app-debug.apk`).
3. Pasa el `.apk` a un teléfono Android y ábrelo (el teléfono pedirá permitir "instalar apps desconocidas").

## Publicar en Google Play

1. Crea una cuenta de desarrollador en <https://play.google.com/console> (US$25, una vez).
2. Crea la **llave de firma** una sola vez, en un computador con Java:
   ```bash
   keytool -genkey -v -keystore arriendoencl.keystore -alias arriendoencl -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 arriendoencl.keystore > keystore.txt   # en Mac: base64 -i arriendoencl.keystore -o keystore.txt
   ```
   ⚠️ Guarda el archivo `.keystore` y sus claves en un lugar seguro: sin ellos no se puede actualizar la app.
3. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**, crea:
   - `ANDROID_KEYSTORE_BASE64`: el contenido de `keystore.txt`
   - `ANDROID_KEYSTORE_PASSWORD`: la clave del keystore
   - `ANDROID_KEY_ALIAS`: `arriendoencl`
   - `ANDROID_KEY_PASSWORD`: la clave de la llave
4. Desde ahí, cada compilación genera también **app-google-play-…** (archivo `.aab`), que se sube en Play Console.

Para la ficha de Play Console necesitarás: ícono 512×512 (`../docs/img/app/icono-512.png`), al menos 2 capturas de pantalla,
descripción corta y larga, y una **política de privacidad** publicada.

## Publicar en la App Store (iPhone) — sin necesidad de Mac

La app de iPhone se compila en un Mac de GitHub (`.github/workflows/app-ios.yml`) con la última versión de Xcode.
Sin configurar nada, cada cambio la compila para verificar que funcione.

Para que además se **firme y suba sola a TestFlight**:

1. Inscríbete en **Apple Developer** (<https://developer.apple.com/programs/>, US$99/año).
2. En **App Store Connect** (<https://appstoreconnect.apple.com>) → **Apps → +** → nueva app iOS con el identificador
   `cl.arriendoencl.app` (si no aparece, regístralo antes en developer.apple.com → Identifiers).
3. En App Store Connect → **Usuarios y acceso → Integraciones → App Store Connect API** → genera una clave con rol
   **Admin**. Descarga el archivo `.p8` (solo se puede descargar una vez) y anota el **Key ID** y el **Issuer ID**.
4. Tu **Team ID** está en developer.apple.com → Account → Membership details.
5. En GitHub: **Settings → Secrets and variables → Actions → New repository secret**, crea:
   - `APPSTORE_KEY_P8`: el contenido completo del archivo `.p8` (ábrelo con un editor de texto y copia todo)
   - `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPLE_TEAM_ID`
6. Desde ahí, cada cambio sube una versión nueva a **TestFlight**. Instala la app **TestFlight** en tu iPhone para probarla,
   y cuando esté lista, envíala a revisión desde App Store Connect.

Apple revisa que la app aporte más que el sitio web: por eso la app trae navegación propia, notificaciones,
"Mis solicitudes", vibración y compartir nativo.

## Datos de la app

- Nombre: **Arriendo en CL** · Identificador: `cl.arriendoencl.app`
- Íconos y pantalla de inicio: se generan desde `assets/` con `npm run iconos`.
