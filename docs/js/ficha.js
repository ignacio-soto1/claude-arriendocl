// Ficha de una propiedad: detalle, mapa, cotización y reserva por WhatsApp.
(function () {
  'use strict';
  const C = window.Catalogo;
  const CFG = window.CONFIG;
  const { esc, foto } = window.UI;
  UI.montarMarco();

  const main = document.getElementById('ficha');
  const q = new URLSearchParams(location.search);
  const p = window.PROPIEDADES.find((x) => x.id === q.get('id'));
  if (!p) {
    document.title = `No encontrada · ${CFG.marca}`;
    main.innerHTML = '<div class="narrow center"><h1>No encontramos esta propiedad</h1><p>Puede que ya no esté disponible.</p><p><a class="btn" href="./">Ver todas las propiedades</a></p></div>';
    return;
  }

  const hoy = C.hoyChile();
  document.title = `${p.titulo} · ${CFG.marca}`;
  const ocupado = (p.ocupado || []).filter((o) => o.hasta > hoy).sort((a, b) => a.desde.localeCompare(b.desde));
  const fotos = p.fotos || [];
  const galeria = fotos.length
    ? fotos.slice(0, 5).map((f, i) => `<img src="${esc(f)}" alt="Foto ${i + 1} de ${esc(p.titulo)}"${i ? ' loading="lazy"' : ''}>`).join('')
    : foto(p);

  main.innerHTML = `
  <article class="detalle">
    <p class="crumbs"><a href="./">Inicio</a> › <a href="./?region=${encodeURIComponent(p.region)}">${esc(p.region)}</a> ›
      <a href="./?region=${encodeURIComponent(p.region)}&comuna=${encodeURIComponent(p.comuna)}">${esc(p.comuna)}</a></p>
    <h1>${esc(p.titulo)}</h1>
    <p class="muted">${esc(C.TIPOS[p.tipo])} en ${esc(p.comuna)}, ${esc(p.region)}</p>
    <div class="galeria ${fotos.length > 1 ? 'multi' : ''}">${galeria}</div>
    <div class="detalle-cols">
      <div>
        <section class="facts">
          <span><strong>${p.capacidad}</strong> huéspedes</span>
          <span><strong>${p.dormitorios}</strong> ${p.dormitorios === 1 ? 'dormitorio' : 'dormitorios'}</span>
          <span><strong>${p.banos}</strong> ${p.banos === 1 ? 'baño' : 'baños'}</span>
          ${p.superficie_m2 ? `<span><strong>${esc(C.superficie(p.superficie_m2))}</strong> ${p.tipo === 'parcela' ? 'de terreno' : 'construidos'}</span>` : ''}
          <span>Mínimo <strong>${p.min_noches}</strong> ${p.min_noches === 1 ? 'noche' : 'noches'}</span>
        </section>
        <section><h2>Sobre este lugar</h2><p class="desc">${esc(p.descripcion)}</p></section>
        ${(p.amenities || []).length ? `<section><h2>Lo que ofrece</h2><ul class="amenities">${p.amenities.map((a) => `<li>${esc(C.COMODIDADES[a] || a)}</li>`).join('')}</ul></section>` : ''}
        <section>
          <h2>Ubicación</h2>
          <div id="mapa-ficha" class="mapa-ficha" aria-label="Mapa con la ubicación aproximada"></div>
          <p class="muted small">Ubicación aproximada en ${esc(p.comuna)}. La dirección exacta se envía al confirmar la reserva.</p>
        </section>
        ${ocupado.length ? `<section><h2>Fechas ya reservadas</h2><ul class="ocupado">${ocupado.map((o) => `<li>${esc(C.formatFecha(o.desde))} → ${esc(C.formatFecha(o.hasta))}</li>`).join('')}</ul></section>` : ''}
      </div>

      <aside class="reserva-box">
        <p><strong class="precio">${esc(C.formatCLP(p.precio_noche))}</strong> <span class="muted">/ noche</span></p>
        <form id="form-reserva">
          <div class="row2">
            <label>Llegada <input type="date" name="llegada" min="${hoy}"></label>
            <label>Salida <input type="date" name="salida" min="${C.sumarDias(hoy, 1)}"></label>
          </div>
          <label>Huéspedes <input type="number" name="huespedes" min="1" max="${p.capacidad}" value="1"></label>
          <div class="cotizacion" hidden>
            <div class="row between"><span data-q="detalle"></span><span data-q="subtotal"></span></div>
            ${p.tarifa_limpieza ? `<div class="row between"><span>Limpieza</span><span>${esc(C.formatCLP(p.tarifa_limpieza))}</span></div>` : ''}
            <div class="row between total"><span>Total</span><span data-q="total"></span></div>
          </div>
          <p class="aviso" data-q="aviso" hidden></p>
          <a class="btn block wa" id="btn-whatsapp" target="_blank" rel="noopener">${UI.WA_ICON} Reservar por WhatsApp</a>
          <p class="muted small center">Se abre WhatsApp con tu pedido ya escrito; solo tienes que enviarlo.</p>
        </form>
      </aside>
    </div>
  </article>`;

  // Mapa de la ficha con un círculo de ubicación aproximada
  const mapa = L.map('mapa-ficha', { scrollWheelZoom: false }).setView([p.lat, p.lng], 12);
  UI.capaBase().addTo(mapa);
  L.circle([p.lat, p.lng], { radius: 1200, color: '#1d6b52', fillColor: '#1d6b52', fillOpacity: 0.18, weight: 2 }).addTo(mapa);
  mapa.on('click', () => mapa.scrollWheelZoom.enable());

  // Reserva
  const form = document.getElementById('form-reserva');
  const box = form.querySelector('.cotizacion');
  const aviso = form.querySelector('[data-q="aviso"]');
  const btn = document.getElementById('btn-whatsapp');
  const $ = (k) => form.querySelector(`[data-q="${k}"]`);
  const urlFicha = `${location.origin}${location.pathname}?id=${encodeURIComponent(p.id)}`;

  if (C.esFecha(q.get('llegada')) && q.get('llegada') >= hoy) form.llegada.value = q.get('llegada');
  if (C.esFecha(q.get('salida'))) form.salida.value = q.get('salida');
  if (Number(q.get('huespedes'))) form.huespedes.value = Math.min(Number(q.get('huespedes')), p.capacidad);

  function actualizar() {
    const llegada = form.llegada.value;
    const salida = form.salida.value;
    const huespedes = Number(form.huespedes.value) || null;
    const r = C.validarReserva(p, { llegada, salida, huespedes }, hoy);
    const cot = r.cotizacion;

    box.hidden = !r.ok;
    if (r.ok) {
      $('detalle').textContent = `${C.formatCLP(p.precio_noche)} × ${cot.noches} ${cot.noches === 1 ? 'noche' : 'noches'}`;
      $('subtotal').textContent = C.formatCLP(cot.subtotal);
      $('total').textContent = C.formatCLP(cot.total);
    }
    aviso.hidden = !r.error;
    aviso.textContent = r.error || '';

    const datos = {
      marca: CFG.marca, titulo: p.titulo, tipo: C.TIPOS[p.tipo], comuna: p.comuna, region: p.region, url: urlFicha,
      huespedes,
    };
    // Incluye las fechas aunque no calcen (así pueden preguntar), y el total solo si es válido.
    if (cot) Object.assign(datos, { llegada, salida, noches: cot.noches });
    if (r.ok) datos.total = cot.total;
    btn.href = UI.waUrl(window.WhatsApp.mensajeReserva(datos));
  }

  form.llegada.addEventListener('change', () => {
    if (!form.llegada.value) return;
    form.salida.min = C.sumarDias(form.llegada.value, 1);
    if (!form.salida.value || form.salida.value <= form.llegada.value) {
      form.salida.value = C.sumarDias(form.llegada.value, Math.max(p.min_noches, 1));
    }
  });
  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  actualizar();
})();
