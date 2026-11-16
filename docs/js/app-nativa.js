// Funciones propias de la app (Android/iOS con Capacitor). En el navegador casi todo queda inactivo,
// salvo "Mis solicitudes" y el aviso sin conexión, que también sirven en la web.
(function () {
  'use strict';
  const cap = window.Capacitor;
  const esApp = Boolean(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugin = (nombre) => {
    if (!esApp) return null;
    if (cap.Plugins && cap.Plugins[nombre]) return cap.Plugins[nombre];
    try { return cap.isPluginAvailable(nombre) ? cap.registerPlugin(nombre) : null; } catch (_) { return null; }
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---- Vibración suave ----
  function vibrar(fuerza = 'LIGHT') {
    const h = plugin('Haptics');
    if (h) h.impact({ style: fuerza }).catch(() => {});
  }

  // ---- Compartir con el menú nativo ----
  async function compartir({ title, text, url }) {
    const s = plugin('Share');
    if (!s) return false;
    try { await s.share({ title, text, url, dialogTitle: 'Compartir' }); } catch (_) { /* cancelado */ }
    return true;
  }

  // ---- Mis solicitudes (guardadas en este teléfono) ----
  const CLAVE = 'aecl-solicitudes';
  function solicitudes() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch (_) { return []; }
  }
  function guardarSolicitud(s) {
    const lista = solicitudes().filter((x) => !(x.propId === s.propId && x.llegada === s.llegada && x.salida === s.salida));
    lista.unshift({ ...s, id: Date.now(), enviada: new Date().toISOString() });
    try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, 50))); } catch (_) { /* sin almacenamiento */ }
    return lista[0];
  }
  function borrarSolicitud(id) {
    try { localStorage.setItem(CLAVE, JSON.stringify(solicitudes().filter((x) => x.id !== id))); } catch (_) { /* */ }
  }

  // ---- Recordatorio con notificación local el día antes de la llegada, a las 10:00 ----
  async function recordar(s) {
    const n = plugin('LocalNotifications');
    if (!n || !s.llegada) return 'no';
    try {
      let p = await n.checkPermissions();
      if (p.display !== 'granted') p = await n.requestPermissions();
      if (p.display !== 'granted') return 'sin-permiso';
      const [a, m, d] = s.llegada.split('-').map(Number);
      let cuando = new Date(a, m - 1, d - 1, 10, 0, 0);
      if (cuando <= new Date()) cuando = new Date(Date.now() + 60 * 60 * 1000);
      await n.schedule({ notifications: [{
        id: Math.floor(s.id % 2147483647),
        title: s.evento ? '¡Mañana es tu evento!' : '¡Mañana llegas!',
        body: `${s.titulo}. Si necesitas algo, escríbenos por WhatsApp.`,
        schedule: { at: cuando },
      }] });
      return 'ok';
    } catch (_) { return 'error'; }
  }

  // ---- Avisos breves en pantalla ----
  function aviso(html, acciones = []) {
    document.querySelector('.aviso-app')?.remove();
    const el = document.createElement('div');
    el.className = 'aviso-app';
    el.setAttribute('role', 'status');
    el.innerHTML = `<p>${html}</p>${acciones.length ? `<div>${acciones.map((a, i) => `<button type="button" class="${i ? 'link' : 'btn sm'}" data-i="${i}">${esc(a.texto)}</button>`).join('')}</div>` : ''}`;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const a = acciones[Number(b.dataset.i)];
      el.remove();
      if (a && a.hacer) a.hacer();
    });
    document.body.appendChild(el);
    if (!acciones.length) setTimeout(() => el.remove(), 3500);
  }

  // Al enviar una reserva por WhatsApp: guardarla y, en la app, ofrecer el recordatorio.
  function reservaEnviada(s) {
    const guardada = guardarSolicitud(s);
    vibrar('MEDIUM');
    if (esApp && s.llegada) {
      setTimeout(() => aviso('Guardamos tu solicitud en <strong>Mis solicitudes</strong>. ¿Te recordamos el día antes?', [
        { texto: 'Recordarme', hacer: async () => {
          const r = await recordar(guardada);
          aviso(r === 'ok' ? 'Listo, te avisaremos el día antes.' : 'No pudimos activar el recordatorio. Revisa los permisos de notificaciones.');
        } },
        { texto: 'Ahora no' },
      ]), 1200);
    }
  }

  // ---- Sin conexión ----
  function estadoConexion(enLinea) {
    let b = document.getElementById('sin-conexion');
    if (enLinea) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.id = 'sin-conexion';
      b.className = 'sin-conexion';
      b.textContent = 'Sin conexión a internet. Puedes seguir viendo las propiedades; para reservar necesitas conexión.';
      document.body.prepend(b);
    }
  }
  window.addEventListener('online', () => estadoConexion(true));
  window.addEventListener('offline', () => estadoConexion(false));
  const red = plugin('Network');
  if (red) {
    red.getStatus().then((s) => estadoConexion(s.connected)).catch(() => {});
    red.addListener('networkStatusChange', (s) => estadoConexion(s.connected));
  } else if (navigator.onLine === false) {
    estadoConexion(false);
  }

  // ---- Barra de navegación inferior (solo en la app) ----
  function barraApp() {
    const CFG = window.CONFIG || {};
    const wa = CFG.whatsapp ? `https://wa.me/${CFG.whatsapp}?text=${encodeURIComponent(`Hola ${CFG.marca || ''}, necesito ayuda.`)}` : '#';
    const pagina = location.pathname.split('/').pop() || 'index.html';
    const enGuardados = new URLSearchParams(location.search).get('cat') === 'guardados';
    const I = (window.UI && window.UI.ICONOS_MARCA) || {};
    const icono = (k) => I[k] || '';
    const items = [
      { href: './', texto: 'Explorar', icono: icono('casa'), activo: (pagina === 'index.html' || pagina === '') && !enGuardados },
      { href: './?cat=guardados', texto: 'Guardados', icono: icono('corazon'), activo: enGuardados },
      { href: 'solicitudes.html', texto: 'Solicitudes', icono: icono('calendario'), activo: pagina === 'solicitudes.html' },
      { href: wa, texto: 'Ayuda', icono: icono('chat'), externo: true },
    ];
    const nav = document.createElement('nav');
    nav.className = 'barra-app';
    nav.setAttribute('aria-label', 'Navegación de la app');
    nav.innerHTML = items.map((x) => `<a href="${esc(x.href)}"${x.externo ? ' target="_blank" rel="noopener"' : ''} class="${x.activo ? 'on' : ''}"${x.activo ? ' aria-current="page"' : ''}>${x.icono}<span>${esc(x.texto)}</span></a>`).join('');
    document.body.appendChild(nav);
  }

  if (esApp) {
    document.documentElement.classList.add('en-app');
    const sb = plugin('StatusBar');
    if (sb) sb.setStyle({ style: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'DARK' : 'LIGHT' }).catch(() => {});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', barraApp); else barraApp();
  }

  window.Nativo = { esApp, vibrar, compartir, solicitudes, borrarSolicitud, reservaEnviada, recordar, aviso };
})();
