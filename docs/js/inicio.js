// Portada: filtros, lista de propiedades y mapa sincronizados.
(function () {
  'use strict';
  const C = window.Catalogo;
  const { esc, foto } = window.UI;
  const TODAS = window.PROPIEDADES;
  UI.montarMarco();
  document.getElementById('hero-logo').innerHTML = UI.logo('grande');
  document.querySelectorAll('[data-icono]').forEach((el) => { el.innerHTML = UI.ICONOS_MARCA[el.dataset.icono]; });

  const form = document.getElementById('filtros');
  const lista = document.getElementById('lista');
  const conteo = document.getElementById('conteo');
  const regionesData = C.regiones(TODAS);
  const hoy = C.hoyChile();

  // Opciones de los selects a partir de los datos
  regionesData.forEach((r) => form.region.add(new Option(r.region, r.region)));
  Object.entries(C.TIPOS).forEach(([k, v]) => { if (TODAS.some((p) => p.tipo === k)) form.tipo.add(new Option(v, k)); });
  Object.entries(C.ORDENES).forEach(([k, v]) => form.orden.add(new Option(v, k)));
  form.llegada.min = hoy;
  form.salida.min = C.sumarDias(hoy, 1);

  function llenarComunas(region, actual) {
    form.comuna.replaceChildren(new Option('Todas', ''));
    const r = regionesData.find((x) => x.region === region);
    if (r) r.comunas.forEach((c) => form.comuna.add(new Option(c, c)));
    form.comuna.disabled = !r;
    form.comuna.value = r && r.comunas.includes(actual) ? actual : '';
  }

  // Estado ⇄ URL (para compartir una búsqueda)
  const CAMPOS = ['modo', 'region', 'comuna', 'tipo', 'llegada', 'salida', 'huespedes', 'precio_max', 'texto', 'orden'];

  // En "Eventos de día" se busca un solo día y por cantidad de personas.
  function ajustarModo() {
    const dia = form.modo.value === 'dia';
    form.querySelector('[data-etq="llegada"]').textContent = dia ? 'Fecha' : 'Llegada';
    form.querySelector('[data-etq="huespedes"]').textContent = dia ? 'Personas' : 'Huéspedes';
    form.querySelector('[data-campo="salida"]').hidden = dia;
    if (dia) form.salida.value = '';
  }
  function leerURL() {
    const q = new URLSearchParams(location.search);
    form.region.value = q.get('region') || '';
    llenarComunas(form.region.value, q.get('comuna'));
    form.modo.value = C.MODALIDADES[q.get('modo')] ? q.get('modo') : '';
    ajustarModo();
    for (const k of ['tipo', 'llegada', 'salida', 'huespedes', 'precio_max', 'texto', 'orden']) {
      if (q.has(k)) form[k].value = q.get(k);
    }
    if (!form.orden.value) form.orden.value = 'recomendadas';
  }
  // Fila de categorías (incluye "Guardados" si hay favoritos). Una a la vez; tocarla de nuevo la quita.
  let categoria = new URLSearchParams(location.search).get('cat') || '';
  const filaCat = document.getElementById('categorias');
  function dibujarCategorias() {
    const items = [...(UI.favoritos().length ? [['guardados', 'Guardados', 'corazon']] : []),
      ...Object.entries(C.CATEGORIAS).map(([id, c]) => [id, c.nombre, id])];
    if (categoria === 'guardados' && !UI.favoritos().length) categoria = '';
    filaCat.innerHTML = items.map(([id, nombre, icono]) => `<button type="button" class="cat ${categoria === id ? 'on' : ''}" data-cat="${id}" aria-pressed="${categoria === id}">
      ${UI.ICONOS_MARCA[icono] || ''}<span>${esc(nombre)}</span></button>`).join('');
  }
  filaCat.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    categoria = categoria === b.dataset.cat ? '' : b.dataset.cat;
    dibujarCategorias();
    render();
  });
  document.addEventListener('favoritos', () => { dibujarCategorias(); if (categoria === 'guardados' || !UI.favoritos().length) render(); });

  function filtrosActuales() {
    const f = Object.fromEntries(CAMPOS.map((k) => [k, form[k].value.trim()]));
    if (categoria === 'guardados') f.ids = UI.favoritos(); else if (categoria) f.cat = categoria;
    f.huespedes = Number(f.huespedes) || null;
    f.precio_max = Number(f.precio_max) || null;
    return f;
  }
  function escribirURL() {
    const q = new URLSearchParams();
    for (const k of CAMPOS) { const v = form[k].value.trim(); if (v && !(k === 'orden' && v === 'recomendadas')) q.set(k, v); }
    if (categoria) q.set('cat', categoria);
    if (!window.CONFIG.unaPagina) history.replaceState(null, '', (q.toString() ? `?${q}` : location.pathname) + location.hash);
  }

  // Mapa
  const mapa = L.map('mapa', { scrollWheelZoom: false, zoomControl: true });
  UI.capaBase(mapa).addTo(mapa);
  mapa.on('focus click', () => mapa.scrollWheelZoom.enable());
  const capa = L.layerGroup().addTo(mapa);
  const marcadores = new Map();

  const enlace = UI.enlaceFicha;

  function tarjeta(p, f) {
    const dia = C.esDia(p);
    const q = dia ? (f.llegada ? C.cotizarDia(p, f.llegada, f.huespedes) : null)
      : (f.llegada && f.salida ? C.cotizar(p, f.llegada, f.salida) : null);
    return `<a class="card" href="${esc(enlace(p, f))}" data-id="${esc(p.id)}">
      <div class="card-img">${foto(p)}${UI.botonFavorito(p.id)}${dia ? '<span class="tag tag-dia">Eventos de día</span>' : ''}</div>
      <div class="card-body">
        <div class="card-lugar">${esc(p.comuna)}, ${esc(p.region)}</div>
        <div class="muted">${esc(C.TIPOS[p.tipo])} · ${dia ? `hasta ${p.capacidad} personas` : `${p.capacidad} huéspedes`}</div>
        <div class="card-precio">${UI.conTarjeta(C.precioBase(p)) ? `<s>${esc(C.formatCLP(UI.conTarjeta(C.precioBase(p))))}</s> ` : ''}<strong>${esc(C.formatCLP(C.precioBase(p)))}</strong> ${C.unidad(p)}${UI.conTarjeta(C.precioBase(p)) ? ' <span class="transf">con transferencia</span>' : ''}</div>
        ${q ? `<div class="muted small">Total: ${UI.conTarjeta(q.total) ? `<s>${esc(C.formatCLP(C.cotizacionTarjeta(q, window.CONFIG.recargoTarjeta).total))}</s> ` : ''}${esc(C.formatCLP(q.total))}${UI.conTarjeta(q.total) ? ' con transferencia' : ''}</div>` : ''}
      </div></a>`;
  }

  function popup(p, f) {
    return `<a class="popup" href="${esc(enlace(p, f))}">
      <div class="popup-img">${foto(p)}</div>
      <strong>${esc(p.titulo)}</strong>
      <span>${esc(C.TIPOS[p.tipo])} · ${esc(p.comuna)}</span>
      <span class="popup-precio">${UI.precios(C.precioBase(p), C.unidad(p))}</span></a>`;
  }

  let primeraVez = true;
  let ultimosLimites = null;
  function encuadrar(animar) {
    if (!ultimosLimites) return;
    mapa.fitBounds(ultimosLimites, { padding: [40, 40], maxZoom: 11, animate: animar });
  }
  function render() {
    const f = filtrosActuales();
    const res = C.filtrar(TODAS, f);
    const lugar = f.comuna || f.region;
    const nombreCat = categoria === 'guardados' ? 'guardadas' : categoria ? `con ${C.CATEGORIAS[categoria].nombre.toLowerCase()}` : '';
    conteo.textContent = `${res.length} ${res.length === 1 ? 'propiedad' : 'propiedades'}${nombreCat ? ` ${nombreCat}` : ''}${lugar ? ` en ${lugar}` : ''}` +
      (f.modo === 'dia' && f.llegada ? ` disponibles el ${C.formatFecha(f.llegada)}`
        : f.llegada && f.salida ? ` disponibles del ${C.formatFecha(f.llegada)} al ${C.formatFecha(f.salida)}` : '');
    const ff = (x) => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(x + 'T00:00:00Z'));
    document.querySelector('[data-p="donde"]').textContent = f.comuna || f.region || 'Todo Chile';
    document.querySelector('[data-p="cuando"]').textContent = f.modo === 'dia' && f.llegada ? ff(f.llegada)
      : f.llegada && f.salida ? `${ff(f.llegada)} – ${ff(f.salida)}` : 'Cualquier fecha';
    document.querySelector('[data-p="quien"]').textContent = f.huespedes ? `${f.huespedes} ${f.huespedes === 1 ? 'persona' : 'personas'}` : '¿Cuántos?';
    document.querySelector('[data-mostrar]').textContent = `Mostrar ${res.length} ${res.length === 1 ? 'propiedad' : 'propiedades'}`;
    lista.innerHTML = res.length ? res.map((p) => tarjeta(p, f)).join('')
      : '<p class="empty">No encontramos propiedades con esos filtros. Prueba con otras fechas o amplía la zona.</p>';

    capa.clearLayers();
    marcadores.clear();
    for (const p of res) {
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: 'pin', html: `<span>${esc(C.precioCorto(C.precioBase(p)))}</span>`, iconSize: null }),
        title: p.titulo, riseOnHover: true,
      }).bindPopup(popup(p, f), { maxWidth: 240, minWidth: 220 });
      m.addTo(capa);
      marcadores.set(p.id, m);
    }
    const puntos = res.length ? res : TODAS;
    ultimosLimites = L.latLngBounds(puntos.map((p) => [p.lat, p.lng]));
    encuadrar(!primeraVez);
    primeraVez = false;
    escribirURL();
  }

  // Resaltar el pin al pasar sobre una tarjeta
  lista.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.card');
    marcadores.forEach((m, id) => m.getElement()?.classList.toggle('activo', card && id === card.dataset.id));
  });
  lista.addEventListener('mouseleave', () => marcadores.forEach((m) => m.getElement()?.classList.remove('activo')));

  form.region.addEventListener('change', () => llenarComunas(form.region.value, ''));
  form.querySelectorAll('input[name="modo"]').forEach((r) => r.addEventListener('change', ajustarModo));
  form.llegada.addEventListener('change', () => {
    if (!form.llegada.value) return;
    form.salida.min = C.sumarDias(form.llegada.value, 1);
    if (form.modo.value !== 'dia' && (!form.salida.value || form.salida.value <= form.llegada.value)) form.salida.value = C.sumarDias(form.llegada.value, 2);
  });
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('reset', () => setTimeout(() => { llenarComunas('', ''); form.orden.value = 'recomendadas'; ajustarModo(); categoria = ''; dibujarCategorias(); render(); }));

  // Buscador en píldora: abre los filtros en una ventana
  const dlg = document.getElementById('dlg-filtros');
  document.getElementById('pildora').addEventListener('click', () => { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-cerrar]') || e.target === dlg) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  });

  // Lista ⇄ mapa en pantallas angostas
  const explorar = document.getElementById('explorar');
  const toggle = document.getElementById('toggle-mapa');
  toggle.addEventListener('click', () => {
    const verMapa = explorar.classList.toggle('ver-mapa');
    toggle.firstChild.textContent = verMapa ? 'Mostrar lista ' : 'Mostrar mapa ';
    if (verMapa) setTimeout(() => { mapa.invalidateSize(); encuadrar(false); }, 0);
    explorar.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('resize', () => mapa.invalidateSize());
  // El botón flotante no tapa el formulario de "Publica con nosotros".
  const seccionPub = document.getElementById('publica');
  if (seccionPub && 'IntersectionObserver' in window) {
    // Solo cuando la sección llega a la franja inferior de la pantalla, donde está el botón
    new IntersectionObserver(([e]) => toggle.classList.toggle('oculto', e.isIntersecting), { rootMargin: '-82% 0px 0px 0px' }).observe(seccionPub);
  }

  // "Publica con nosotros": arma el WhatsApp del dueño con los datos del formulario.
  const formPub = document.getElementById('form-publica');
  if (formPub) {
    const btnPub = document.getElementById('btn-publica');
    formPub.querySelector('[data-wa-icono]').outerHTML = UI.WA_ICON;
    const campo = (k) => formPub.elements[k].value.trim();
    const actualizarPub = () => {
      const datos = {
        marca: window.CONFIG.marca, nombre: campo('nombre'), tipo: campo('tipo'), uso: campo('uso'), ubicacion: campo('ubicacion'),
        capacidad: Number(campo('capacidad')) || null,
        precio: Number(campo('precio').replace(/\D/g, '')) || null,
        comentarios: campo('comentarios'),
      };
      const falta = !datos.nombre || !datos.tipo || !datos.ubicacion;
      btnPub.href = UI.waUrl(window.WhatsApp.mensajePublicar(datos));
      btnPub.classList.toggle('pendiente', falta);
      formPub.querySelector('[data-pub="btn"]').textContent = falta ? 'Completa nombre, tipo y comuna' : 'Enviar datos';
      formPub.querySelector('[data-pub="ayuda"]').textContent = falta
        ? 'Con esos tres datos podemos empezar a revisar tu propiedad.'
        : 'Tus datos se envían por WhatsApp. Nuestro equipo te contactará.';
    };
    btnPub.addEventListener('click', (e) => {
      if (!btnPub.classList.contains('pendiente')) { UI.contar('publicar-whatsapp'); return; }
      e.preventDefault();
      const vacio = ['nombre', 'tipo', 'ubicacion'].map((k) => formPub.elements[k]).find((el) => !el.value.trim());
      if (vacio) vacio.focus();
    });
    formPub.addEventListener('input', actualizarPub);
    formPub.addEventListener('change', actualizarPub);
    formPub.addEventListener('submit', (e) => e.preventDefault());
    actualizarPub();
  }

  // Para el modo de una sola página: filtros actuales y reajuste del mapa al volver.
  window.Inicio = { filtros: filtrosActuales, alVolver: () => { mapa.invalidateSize(); encuadrar(false); } };

  dibujarCategorias();
  leerURL();
  // Al llegar con #publica, baja a la sección cuando la lista ya está dibujada.
  if (location.hash === '#publica') setTimeout(() => document.getElementById('publica')?.scrollIntoView(), 0);
  render();
})();
