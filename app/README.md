# App de Arriendo en CL (Android y iOS)

La app es el mismo sitio de `docs/` empaquetado con [Capacitor](https://capacitorjs.com).
Cada vez que cambias el sitio, GitHub compila la app de Android sola.

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

## Publicar en la App Store (iPhone)

Requiere una cuenta de Apple Developer (US$99/año) y compilar en un **Mac con Xcode** (o un servicio en la nube como Codemagic):

```bash
cd app && npm ci && npm run sync
npx cap open ios   # abre Xcode: elige tu equipo de firma y usa Product → Archive
```

Apple revisa que la app aporte más que el sitio web; conviene sumar funciones propias de app (por ejemplo notificaciones) antes de enviarla.

## Datos de la app

- Nombre: **Arriendo en CL** · Identificador: `cl.arriendoencl.app`
- Íconos y pantalla de inicio: se generan desde `assets/` con `npm run iconos`.
