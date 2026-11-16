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
  function filtrosActuales() {
    const f = Object.fromEntries(CAMPOS.map((k) => [k, form[k].value.trim()]));
    f.huespedes = Number(f.huespedes) || null;
    f.precio_max = Number(f.precio_max) || null;
    return f;
  }
  function escribirURL() {
    const q = new URLSearchParams();
    for (const k of CAMPOS) { const v = form[k].value.trim(); if (v && !(k === 'orden' && v === 'recomendadas')) q.set(k, v); }
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
      <div class="card-img">${foto(p)}<span class="tag">${esc(C.TIPOS[p.tipo])}</span>${dia ? '<span class="tag tag-dia">Eventos de día</span>' : ''}</div>
      <div class="card-body">
        <div><strong>${esc(p.comuna)}</strong> <span class="muted small">· ${esc(p.region)}</span></div>
        <div class="muted small titulo">${esc(p.titulo)}</div>
        <div class="muted small">${dia ? `Hasta ${p.capacidad} personas · ${esc(p.horario_dia.desde)} a ${esc(p.horario_dia.hasta)}` : `${p.capacidad} huéspedes · ${p.dormitorios} dorm.`}${p.tipo === 'parcela' && p.superficie_m2 ? ' · ' + esc(C.superficie(p.superficie_m2)) : ''}</div>
        <div><strong>${esc(C.formatCLP(C.precioBase(p)))}</strong> <span class="muted">${C.unidad(p)}</span>${q ? ` <span class="muted small">· ${esc(C.formatCLP(q.total))} total</span>` : ''}</div>
      </div></a>`;
  }

  function popup(p, f) {
    return `<a class="popup" href="${esc(enlace(p, f))}">
      <div class="popup-img">${foto(p)}</div>
      <strong>${esc(p.titulo)}</strong>
      <span>${esc(C.TIPOS[p.tipo])} · ${esc(p.comuna)}</span>
      <span><b>${esc(C.formatCLP(C.precioBase(p)))}</b> ${C.unidad(p)}</span></a>`;
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
    conteo.textContent = `${res.length} ${res.length === 1 ? 'propiedad' : 'propiedades'}${lugar ? ` en ${lugar}` : ''}` +
      (f.modo === 'dia' && f.llegada ? ` disponibles el ${C.formatFecha(f.llegada)}`
        : f.llegada && f.salida ? ` disponibles del ${C.formatFecha(f.llegada)} al ${C.formatFecha(f.salida)}` : '');
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
  form.addEventListener('reset', () => setTimeout(() => { llenarComunas('', ''); form.orden.value = 'recomendadas'; ajustarModo(); render(); }));

  // "Más filtros" en pantallas angostas (se abre solo si ya hay filtros secundarios activos)
  const btnMas = form.querySelector('.mas-filtros');
  const abrirMas = (abrir) => { form.classList.toggle('abierto', abrir); btnMas.setAttribute('aria-expanded', abrir); btnMas.textContent = abrir ? 'Menos filtros' : 'Más filtros'; };
  btnMas.addEventListener('click', () => abrirMas(!form.classList.contains('abierto')));

  // Lista ⇄ mapa en pantallas angostas
  const explorar = document.getElementById('explorar');
  const toggle = document.getElementById('toggle-mapa');
  toggle.addEventListener('click', () => {
    const verMapa = explorar.classList.toggle('ver-mapa');
    toggle.textContent = verMapa ? '📋 Ver lista' : '🗺️ Ver mapa';
    if (verMapa) setTimeout(() => { mapa.invalidateSize(); encuadrar(false); }, 0);
    explorar.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('resize', () => mapa.invalidateSize());
  // El botón flotante no tapa el formulario de "Publica con nosotros".
  const seccionPub = document.getElementById('publica');
  if (seccionPub && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => toggle.classList.toggle('oculto', e.isIntersecting)).observe(seccionPub);
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
      formPub.querySelector('[data-pub="btn"]').textContent = falta ? 'Completa nombre, tipo y comuna' : 'Enviar por WhatsApp';
      formPub.querySelector('[data-pub="ayuda"]').textContent = falta
        ? 'Con esos tres datos te armamos el mensaje.'
        : 'Se abre WhatsApp con tus datos ya escritos: solo tienes que enviarlo.';
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

  leerURL();
  // Al llegar con #publica, baja a la sección cuando la lista ya está dibujada.
  if (location.hash === '#publica') setTimeout(() => document.getElementById('publica')?.scrollIntoView(), 0);
  abrirMas(['huespedes', 'precio_max', 'texto'].some((k) => form[k].value) || (form.orden.value !== 'recomendadas'));
  render();
})();
