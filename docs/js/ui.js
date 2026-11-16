// Utilidades de interfaz compartidas por las páginas.
(function () {
  'use strict';
  const C = window.Catalogo;
  const CFG = window.CONFIG;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function foto(p, clase = '') {
    if (p.fotos && p.fotos.length) return `<img class="${clase}" src="${esc(p.fotos[0])}" alt="${esc(p.titulo)}" loading="lazy">${p.credito_foto ? '<span class="referencial">Foto referencial</span>' : ''}`;
    return `<div class="ph ph-${esc(p.tipo)} ${clase}" role="img" aria-label="${esc(p.titulo)}"><span>${C.ICONOS[p.tipo] || ''}</span></div>`;
  }

  function waUrl(texto) {
    return CFG.whatsapp ? window.WhatsApp.waUrl(CFG.whatsapp, texto) : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  const WA_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';
  const TT_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M16.6 2h-3.3v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.3 6.3 0 1 0 5.3 6.2V8.6a7.9 7.9 0 0 0 4.4 1.4V6.7a4.6 4.6 0 0 1-4.4-4.7Z"/></svg>';
  const IG_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM21.9 7.1c-.1-1.6-.4-3-1.6-4.2S17.7 1.3 16.1 1.2C14.4 1.1 9.6 1.1 7.9 1.2 6.3 1.3 4.9 1.6 3.7 2.8S2.1 5.5 2 7.1c-.1 1.7-.1 6.5 0 8.2.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.7.1 6.5.1 8.2 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.7.1-6.5 0-8.2Zm-2.2 10a3.3 3.3 0 0 1-1.9 1.9c-1.3.5-4.4.4-5.8.4s-4.5.1-5.8-.4a3.3 3.3 0 0 1-1.9-1.9c-.5-1.3-.4-4.4-.4-5.8s-.1-4.5.4-5.8a3.3 3.3 0 0 1 1.9-1.9c1.3-.5 4.4-.4 5.8-.4s4.5-.1 5.8.4a3.3 3.3 0 0 1 1.9 1.9c.5 1.3.4 4.4.4 5.8s.1 4.5-.4 5.8Z"/></svg>';

  // Íconos de línea de la marca (mismo estilo que el logo de Instagram).
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONOS_MARCA = {
    llave: svg('<circle cx="16" cy="7.5" r="4.2"/><circle cx="16" cy="7.5" r="1.3"/><path d="M13 10.5 3.5 20l2 2M6.5 17l2 2M9 14.5l1.8 1.8"/>'),
    piscina: svg('<path d="M7 15.5V5.6a2.6 2.6 0 0 1 5.2 0M14 15.5V5.6a2.6 2.6 0 0 1 5.2 0M7 8.5h7M7 12h7"/><path d="M2.5 18.2c1.6 0 1.6-1.1 3.2-1.1s1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1M2.5 21.5c1.6 0 1.6-1.1 3.2-1.1s1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1"/>'),
    casa: svg('<path d="M2.5 11.5 12 3l9.5 8.5M5 9.3V21h14V9.3M9.8 21v-6.2h4.4V21"/>'),
    quincho: svg('<path d="M3.5 10.5h17a8.5 8.5 0 0 1-17 0Z"/><path d="M8 18l-2 4M16 18l2 4M12 19v3M8.5 2.5c-1 1.4 1 2.3 0 4.2M12 2.5c-1 1.4 1 2.3 0 4.2M15.5 2.5c-1 1.4 1 2.3 0 4.2"/>'),
    arbol: svg('<path d="M12 22v-8.5M12 15.5l-3-2.8M12 17.5l3.2-3"/><path d="M12 2a5.6 5.6 0 0 0-5.3 7.4A4.6 4.6 0 0 0 9 18h6a4.6 4.6 0 0 0 2.3-8.6A5.6 5.6 0 0 0 12 2Z"/>'),
    publicar: svg('<path d="M2.5 11.5 12 3l9.5 8.5M5 9.3V21h8M19 9.3V13"/><path d="M18 15.5v6M15 18.5h6"/>'),
    chat: svg('<path d="M4 18.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H8.5L4 19.5Z"/><path d="M8 9h8M8 12.5h5"/>'),
    tarjeta: svg('<rect x="2.5" y="5.5" width="19" height="13" rx="2.2"/><path d="M2.5 9.5h19M6 14.5h4M14.5 14.5h3"/>'),
    calendario: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="m8.5 14.5 2.3 2.3 4.7-4.6"/>'),
    casaEvento: svg('<path d="M2.5 12 10 5.5l7.5 6.5M4.5 10.3V20h11v-9.7M8.3 20v-4.6h3.4V20"/><path d="M19.5 3v3M18 4.5h3M20.5 9.5v2M19.5 10.5h2"/>'),
    tinaja: svg('<path d="M3 11.5h18v2.5a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6Z"/><path d="M8 8c-.8-1.2.8-2 0-3.5M12 8c-.8-1.2.8-2 0-3.5M16 8c-.8-1.2.8-2 0-3.5M7 20l-1 1.5M17 20l1 1.5"/>'),
    lago: svg('<path d="M2.5 14 8 7l3.5 4.5L14 8.5l7.5 5.5"/><path d="M2.5 17.5c1.6 0 1.6-1 3.2-1s1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1M2.5 21c1.6 0 1.6-1 3.2-1s1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1"/>'),
    playa: svg('<circle cx="17" cy="6.5" r="2.8"/><path d="M17 1.8v.9M21.7 6.5h-.9M20.3 3.2l-.6.6M13.7 3.2l.6.6"/><path d="M2.5 16c1.6 0 1.6-1 3.2-1s1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1M2.5 20c1.6 0 1.6-1 3.2-1s1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1M4 12.5c2-3.5 5-5 8.5-4.5"/>'),
    eventos: svg('<path d="M8 4.5a4 4 0 0 1 8 0c0 3-4 6-4 6s-4-3-4-6Z"/><path d="M12 10.5c0 2-1.5 2.5-1.5 4.5s1.5 2.5 1.5 4.5M5 8l1.5 1M3.5 13h2M19 8l-1.5 1M20.5 13h-2"/>'),
    mascotas: svg('<circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="5.8" r="1.8"/><circle cx="14" cy="5.8" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><path d="M12 11.5c-2.6 0-5.5 3.6-5.5 6a2.5 2.5 0 0 0 3.2 2.4c.8-.2 1.5-.5 2.3-.5s1.5.3 2.3.5a2.5 2.5 0 0 0 3.2-2.4c0-2.4-2.9-6-5.5-6Z"/>'),
    corazon: svg('<path d="M12 20.5s-8-4.8-8-10.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8 2.5c0 5.8-8 10.6-8 10.6Z"/>'),
    compartir: svg('<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12"/>'),
    personas: svg('<circle cx="12" cy="7" r="3"/><circle cx="5" cy="9.2" r="2.3"/><circle cx="19" cy="9.2" r="2.3"/><path d="M6.5 20.5v-2a5.5 5.5 0 0 1 11 0v2M1.5 19.5v-1A3.5 3.5 0 0 1 6 15M22.5 19.5v-1A3.5 3.5 0 0 0 18 15"/>'),
  };

  // Logo: llave | piscina | casa  +  ARRIENDO  +  — EN CL —
  function logo(clase = '') {
    return `<span class="logo ${clase}">
      <span class="logo-iconos"><span class="i-llave">${ICONOS_MARCA.llave}</span><i></i><span class="i-piscina">${ICONOS_MARCA.piscina}</span><i></i><span class="i-casa">${ICONOS_MARCA.casa}</span></span>
      <span class="logo-texto">Arriendo</span>
      <span class="logo-sub">en CL</span>
    </span>`;
  }

  // Enlace a la sección "Publica con nosotros" de la portada.
  function enlacePublica() {
    return CFG.unaPagina || document.getElementById('publica') ? '#publica' : './#publica';
  }

  // Estadísticas (GoatCounter): carga el script si CONFIG.goatcounter tiene un código.
  function iniciarEstadisticas() {
    if (!CFG.goatcounter || document.querySelector('script[data-goatcounter]')) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.dataset.goatcounter = `https://${encodeURIComponent(CFG.goatcounter)}.goatcounter.com/count`;
    document.head.appendChild(s);
  }
  // Cuenta un evento (ej. 'reservar-whatsapp' de una propiedad). No hace nada si no hay estadísticas.
  function contar(evento, detalle = '') {
    try { window.goatcounter?.count?.({ path: `${evento}/${detalle}`, title: evento, event: true }); } catch (_) { /* sin estadísticas */ }
  }

  function montarMarco() {
    iniciarEstadisticas();
    const ig = `https://www.instagram.com/${CFG.instagram}/`;
    const publica = enlacePublica();
    const wa = waUrl(`Hola ${CFG.marca}, tengo una consulta sobre arriendos.`);
    document.querySelector('header.top').innerHTML = `
      <a class="logo-link" href="${CFG.unaPagina ? '#inicio' : './'}" aria-label="${esc(CFG.marca)}, inicio">${logo('chico')}</a>
      <nav>
        <a href="${publica}" class="btn sm publica">${ICONOS_MARCA.publicar}<span class="largo">Publica con nosotros</span><span class="corto">Publica</span></a>
        <a href="${esc(ig)}" target="_blank" rel="noopener" class="icon-link" aria-label="Instagram @${esc(CFG.instagram)}">${IG_ICON}</a>
        ${CFG.tiktok ? `<a href="https://www.tiktok.com/@${esc(CFG.tiktok)}" target="_blank" rel="noopener" class="icon-link" aria-label="TikTok @${esc(CFG.tiktok)}">${TT_ICON}</a>` : ''}
      </nav>`;
    document.querySelector('footer.bottom').innerHTML = `
      <p>${esc(CFG.marca)} · Alojamiento y parcelas para eventos de día, de Arica a Magallanes. Precios en pesos chilenos (CLP).</p>
      <p><a href="${esc(ig)}" target="_blank" rel="noopener">Instagram @${esc(CFG.instagram)}</a> ·
         ${CFG.tiktok ? `<a href="https://www.tiktok.com/@${esc(CFG.tiktok)}" target="_blank" rel="noopener">TikTok @${esc(CFG.tiktok)}</a> ·` : ''}
         <a href="${esc(wa)}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a> ·
         <a href="${publica}">Publica tu propiedad con nosotros</a></p>`;
  }

  // Capa de mapa base: OpenStreetMap, o el contorno de Chile (data/contorno.js) si CONFIG.mapaBase = 'contorno'.
  function capaBase(mapa) {
    if (CFG.mapaBase === 'contorno' && window.CONTORNO_GEO) {
      if (mapa) mapa.getContainer().classList.add('mapa-contorno');
      return L.geoJSON(window.CONTORNO_GEO, {
        interactive: false,
        style: (f) => (f.properties.chile
          ? { color: '#2a8f87', weight: 1.2, fillColor: '#f4f1e6', fillOpacity: 1 }
          : { color: '#b9c4c9', weight: 1, fillColor: '#e7ebe8', fillOpacity: 1 }),
        attribution: 'Contornos: Natural Earth',
      });
    }
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
  }

  // Enlace a la ficha. En modo de una sola página (CONFIG.unaPagina) usa #p-<id>.
  function enlaceFicha(p, f = {}) {
    if (CFG.unaPagina) return `#p-${p.id}`;
    const q = new URLSearchParams({ id: p.id });
    if (p.modalidad === 'dia' && f.llegada) q.set('fecha', f.llegada);
    else if (f.llegada && f.salida) { q.set('llegada', f.llegada); q.set('salida', f.salida); }
    if (f.huespedes) q.set('huespedes', f.huespedes);
    return `propiedad.html?${q}`;
  }

  // Favoritos guardados en el navegador del visitante (no se comparten ni se envían a ningún lado).
  const CLAVE_FAV = 'aecl-favoritos';
  function favoritos() {
    try { return JSON.parse(localStorage.getItem(CLAVE_FAV) || '[]'); } catch (_) { return []; }
  }
  function esFavorito(id) { return favoritos().includes(id); }
  function alternarFavorito(id) {
    const f = favoritos();
    const i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    try { localStorage.setItem(CLAVE_FAV, JSON.stringify(f)); } catch (_) { /* sin almacenamiento */ }
    return i < 0;
  }
  function botonFavorito(id, clase = '') {
    const on = esFavorito(id);
    return `<button type="button" class="fav ${clase} ${on ? 'on' : ''}" data-fav="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Quitar de guardados' : 'Guardar'}">${ICONOS_MARCA.corazon}</button>`;
  }
  // Un solo manejador para todos los corazones de la página.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const on = alternarFavorito(b.dataset.fav);
    document.querySelectorAll(`[data-fav="${CSS.escape(b.dataset.fav)}"]`).forEach((x) => {
      x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); x.setAttribute('aria-label', on ? 'Quitar de guardados' : 'Guardar');
    });
    contar(on ? 'guardar' : 'quitar-guardado', b.dataset.fav);
    document.dispatchEvent(new CustomEvent('favoritos'));
  }, true);

  // Precio con tarjeta (CONFIG.recargoTarjeta, redondeado a la luca). Sin recargo devuelve null.
  const conTarjeta = (n) => (Number(CFG.recargoTarjeta) > 0 ? window.Catalogo.totalTarjeta(n, CFG.recargoTarjeta) : null);
  // HTML de precio: el precio normal (tarjeta) tachado y el precio con descuento por transferencia destacado.
  function precios(n, unidad = '') {
    const fmt = window.Catalogo.formatCLP;
    const t = conTarjeta(n);
    const u = unidad ? ` <span class="muted">${unidad}</span>` : '';
    if (!t) return `<strong>${esc(fmt(n))}</strong>${u}`;
    return `<span class="precios"><span><s class="precio-lista">${esc(fmt(t))}</s> <strong>${esc(fmt(n))}</strong>${u}</span>`
      + `<span class="descuento">Descuento pagando con transferencia</span></span>`;
  }

  // Prueba social en la portada: "+46 mil personas ya son parte de nuestra comunidad. ¡Súmate!" (con ícono de TikTok)
  function pruebaSocial(el) {
    if (!el || !CFG.tiktok || !CFG.seguidoresTiktok) { if (el) el.hidden = true; return; }
    el.innerHTML = `<a href="https://www.tiktok.com/@${esc(CFG.tiktok)}" target="_blank" rel="noopener" aria-label="Síguenos en TikTok: +${esc(CFG.seguidoresTiktok)} personas ya son parte de nuestra comunidad">${TT_ICON}<span><strong>+${esc(CFG.seguidoresTiktok)}</strong> personas ya son parte de nuestra comunidad. ¡Súmate!</span></a>`;
  }

  window.UI = { esc, foto, waUrl, WA_ICON, ICONOS_MARCA, logo, montarMarco, capaBase, enlaceFicha, contar, precios, conTarjeta, favoritos, botonFavorito, pruebaSocial };
})();
