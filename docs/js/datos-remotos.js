// Solo en la app: muestra siempre las propiedades y precios publicados en el sitio, sin esperar una
// versión nueva en las tiendas. Al abrirse usa la última copia guardada; en segundo plano descarga
// docs/data/catalogo.json y, si cambió, actualiza. Sin internet usa lo guardado o la copia de la app.
// Se carga justo después de config.js y data/propiedades.js, antes que el resto.
(function () {
  'use strict';
  const cap = window.Capacitor;
  if (!(cap && cap.isNativePlatform && cap.isNativePlatform())) return;
  const CFG = window.CONFIG;
  if (!CFG || !CFG.urlSitio || !Array.isArray(window.PROPIEDADES)) return;
  const CLAVE = 'aecl-catalogo';
  const inicio = Date.now();
  let tocado = false;
  ['pointerdown', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, () => { tocado = true; }, { once: true, passive: true }));

  // Las fotos de propiedades nuevas no vienen en la app: se cargan desde el sitio.
  const absoluta = (f) => (/^https?:/.test(f) ? f : CFG.urlSitio + f.replace(/^\.?\//, ''));
  function aplicar(datos) {
    if (!datos || !datos.config || !Array.isArray(datos.propiedades)) return false;
    const { urlSitio, ...config } = datos.config;
    Object.assign(CFG, config);
    const props = datos.propiedades.map((p) => ({ ...p, fotos: (p.fotos || []).map(absoluta) }));
    window.PROPIEDADES.splice(0, window.PROPIEDADES.length, ...props);
    return true;
  }

  let guardado = null;
  try { guardado = localStorage.getItem(CLAVE); } catch (_) { /* sin almacenamiento */ }
  if (guardado) { try { aplicar(JSON.parse(guardado)); } catch (_) { /* copia dañada: se ignora */ } }

  fetch(`${CFG.urlSitio}data/catalogo.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
    .then((texto) => {
      const datos = JSON.parse(texto);
      if (texto === guardado || !datos.propiedades) return;
      try { localStorage.setItem(CLAVE, texto); } catch (_) { /* */ }
      // Si la persona aún no empieza a usar la pantalla, se recarga con lo nuevo; si no, se le avisa.
      if (!tocado && Date.now() - inicio < 2500) { location.reload(); return; }
      const avisar = () => window.Nativo && window.Nativo.aviso('Hay propiedades y precios actualizados.', [
        { texto: 'Actualizar', hacer: () => location.reload() }, { texto: 'Más tarde' },
      ]);
      if (document.readyState === 'complete') avisar(); else addEventListener('load', avisar);
    })
    .catch(() => { /* sin internet o sitio caído: sigue con lo que hay */ });
})();
