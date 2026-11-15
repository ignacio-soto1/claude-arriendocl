// Utilidades de interfaz compartidas por las páginas.
(function () {
  'use strict';
  const C = window.Catalogo;
  const CFG = window.CONFIG;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function foto(p, clase = '') {
    if (p.fotos && p.fotos.length) return `<img class="${clase}" src="${esc(p.fotos[0])}" alt="${esc(p.titulo)}" loading="lazy">`;
    return `<div class="ph ph-${esc(p.tipo)} ${clase}" role="img" aria-label="${esc(p.titulo)}"><span>${C.ICONOS[p.tipo] || ''}</span></div>`;
  }

  function waUrl(texto) {
    return CFG.whatsapp ? window.WhatsApp.waUrl(CFG.whatsapp, texto) : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  const WA_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>';
  const IG_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM21.9 7.1c-.1-1.6-.4-3-1.6-4.2S17.7 1.3 16.1 1.2C14.4 1.1 9.6 1.1 7.9 1.2 6.3 1.3 4.9 1.6 3.7 2.8S2.1 5.5 2 7.1c-.1 1.7-.1 6.5 0 8.2.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.7.1 6.5.1 8.2 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.7.1-6.5 0-8.2Zm-2.2 10a3.3 3.3 0 0 1-1.9 1.9c-1.3.5-4.4.4-5.8.4s-4.5.1-5.8-.4a3.3 3.3 0 0 1-1.9-1.9c-.5-1.3-.4-4.4-.4-5.8s-.1-4.5.4-5.8a3.3 3.3 0 0 1 1.9-1.9c1.3-.5 4.4-.4 5.8-.4s4.5-.1 5.8.4a3.3 3.3 0 0 1 1.9 1.9c.5 1.3.4 4.4.4 5.8s.1 4.5-.4 5.8Z"/></svg>';

  // Íconos de línea de la marca (mismo estilo que el logo de Instagram).
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONOS_MARCA = {
    llave: svg('<circle cx="16" cy="7.5" r="4.2"/><circle cx="16" cy="7.5" r="1.3"/><path d="M13 10.5 3.5 20l2 2M6.5 17l2 2M9 14.5l1.8 1.8"/>'),
    piscina: svg('<path d="M7 15.5V5.6a2.6 2.6 0 0 1 5.2 0M14 15.5V5.6a2.6 2.6 0 0 1 5.2 0M7 8.5h7M7 12h7"/><path d="M2.5 18.2c1.6 0 1.6-1.1 3.2-1.1s1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1M2.5 21.5c1.6 0 1.6-1.1 3.2-1.1s1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1 1.6-1.1 3.2-1.1 1.6 1.1 3.2 1.1"/>'),
    casa: svg('<path d="M2.5 11.5 12 3l9.5 8.5M5 9.3V21h14V9.3M9.8 21v-6.2h4.4V21"/>'),
    quincho: svg('<path d="M3.5 10.5h17a8.5 8.5 0 0 1-17 0Z"/><path d="M8 18l-2 4M16 18l2 4M12 19v3M8.5 2.5c-1 1.4 1 2.3 0 4.2M12 2.5c-1 1.4 1 2.3 0 4.2M15.5 2.5c-1 1.4 1 2.3 0 4.2"/>'),
    arbol: svg('<path d="M12 22v-8.5M12 15.5l-3-2.8M12 17.5l3.2-3"/><path d="M12 2a5.6 5.6 0 0 0-5.3 7.4A4.6 4.6 0 0 0 9 18h6a4.6 4.6 0 0 0 2.3-8.6A5.6 5.6 0 0 0 12 2Z"/>'),
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

  function montarMarco() {
    const ig = `https://www.instagram.com/${CFG.instagram}/`;
    const wa = waUrl(`Hola ${CFG.marca} 👋 Tengo una consulta sobre arriendos.`);
    document.querySelector('header.top').innerHTML = `
      <a class="logo-link" href="${CFG.unaPagina ? '#inicio' : './'}" aria-label="${esc(CFG.marca)}, inicio">${logo('chico')}</a>
      <nav>
        <a href="${esc(ig)}" target="_blank" rel="noopener" class="icon-link">${IG_ICON}<span>@${esc(CFG.instagram)}</span></a>
        <a href="${esc(wa)}" target="_blank" rel="noopener" class="btn sm wa">${WA_ICON}<span>WhatsApp</span></a>
      </nav>`;
    document.querySelector('footer.bottom').innerHTML = `
      <p>${esc(CFG.marca)} · Arriendos por noche de Arica a Magallanes. Precios en pesos chilenos (CLP).</p>
      <p><a href="${esc(ig)}" target="_blank" rel="noopener">Instagram @${esc(CFG.instagram)}</a> ·
         <a href="${esc(wa)}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a></p>`;
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
    if (f.llegada && f.salida) { q.set('llegada', f.llegada); q.set('salida', f.salida); }
    if (f.huespedes) q.set('huespedes', f.huespedes);
    return `propiedad.html?${q}`;
  }

  window.UI = { esc, foto, waUrl, WA_ICON, ICONOS_MARCA, logo, montarMarco, capaBase, enlaceFicha };
})();
