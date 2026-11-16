// Ficha de una propiedad: detalle, disponibilidad, precios, condiciones, mapa y reserva por WhatsApp.
(function () {
  'use strict';
  const C = window.Catalogo;
  const CFG = window.CONFIG;
  const { esc, foto } = window.UI;
  const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const diaMes = (md) => `${Number(md.slice(3))} ${MESES_CORTOS[Number(md.slice(0, 2)) - 1]}`; // '12-26' → '26 dic'
  const estrellas = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

  // Enlace público de la propiedad: la página con vista previa (p/<id>.html) si hay urlSitio.
  function enlacePublico(p) {
    if (CFG.urlSitio) return `${CFG.urlSitio}p/${encodeURIComponent(p.id)}.html`;
    return `${location.origin}${location.pathname.replace(/[^/]*$/, '')}propiedad.html?id=${encodeURIComponent(p.id)}`;
  }

  // Celdas de una fila de precios: transferencia y tarjeta.
  const celdas = (n) => (UI.conTarjeta(n)
    ? `<td class="col-tarjeta"><s>${esc(C.formatCLP(UI.conTarjeta(n)))}</s></td><td class="col-desc">${esc(C.formatCLP(n))}</td>`
    : `<td>${esc(C.formatCLP(n))}</td>`);
  const encabezado = () => (UI.conTarjeta(1000) ? '<tr><th></th><th class="col-tarjeta">Precio</th><th class="col-desc">Con transferencia</th></tr>' : '');

  function seccionPreciosDia(p) {
    const filas = [`<tr><td>${p.modalidad === 'evento_noche' ? 'Arriendo del evento' : 'Arriendo del día'}</td>${celdas(p.precio_dia)}</tr>`];
    if (p.precio_dia_fin_semana) filas.push(`<tr><td>Sábado y domingo</td>${celdas(p.precio_dia_fin_semana)}</tr>`);
    for (const t of p.temporadas || []) {
      if (t.precio_dia) filas.push(`<tr><td>${esc(t.nombre)} <small>(${esc(diaMes(t.desde))} al ${esc(diaMes(t.hasta))})</small></td>${celdas(t.precio_dia)}</tr>`);
    }
    const pp = p.por_persona;
    return `<section><h2>Precios</h2><table class="tabla-precios">${encabezado()}${filas.join('')}</table>
      <p class="muted small">Horario de ${esc(p.horario_dia.desde)} a ${esc(p.horario_dia.hasta)}.${pp ? ` Incluye hasta ${pp.incluidas} personas; cada persona adicional, ${esc(C.formatCLP(pp.extra))}.` : ''}</p></section>`;
  }

  function seccionPrecios(p) {
    const filas = [`<tr><td>Normal</td>${celdas(p.precio_noche)}</tr>`];
    if (p.precio_fin_semana) filas.push(`<tr><td>Fin de semana <small>(noches de viernes y sábado)</small></td>${celdas(p.precio_fin_semana)}</tr>`);
    for (const t of p.temporadas || []) {
      if (t.precio_noche) filas.push(`<tr><td>${esc(t.nombre)} <small>(${esc(diaMes(t.desde))} al ${esc(diaMes(t.hasta))})</small></td>${celdas(t.precio_noche)}</tr>`);
    }
    if (filas.length === 1) return '';
    return `<section><h2>Precios por noche</h2><table class="tabla-precios">${encabezado()}${filas.join('')}</table>
      <p class="muted small">El total se calcula noche a noche según las fechas que elijas.</p></section>`;
  }

  function seccionCondiciones(cond) {
    const items = [];
    if (cond.llegada || cond.salida) {
      items.push(`<li><strong>Horario:</strong> ${[cond.llegada && `llegada desde las ${esc(cond.llegada)}`, cond.salida && `salida hasta las ${esc(cond.salida)}`].filter(Boolean).join(', ')}.</li>`);
    }
    if (cond.horarioDia) items.push(`<li><strong>Horario:</strong> ${esc(cond.horarioDia)}.</li>`);
    if (cond.cancelacion) items.push(`<li><strong>Cancelación:</strong> ${esc(cond.cancelacion)}</li>`);
    if (cond.garantia) items.push(`<li><strong>Garantía:</strong> ${esc(cond.garantia)}</li>`);
    for (const r of cond.reglas || []) items.push(`<li>${esc(r)}</li>`);
    return items.length ? `<section><h2>Antes de reservar</h2><ul class="condiciones">${items.join('')}</ul></section>` : '';
  }

  function seccionResenas(p) {
    const r = p.resenas || [];
    if (!r.length) return '';
    return `<section><h2>Lo que dicen los huéspedes</h2><div class="resenas">${r.map((x) => `
      <blockquote class="resena">
        ${x.estrellas ? `<p class="estrellas" aria-label="${x.estrellas} de 5 estrellas">${estrellas(x.estrellas)}</p>` : ''}
        <p>${esc(x.texto)}</p><footer>${esc(x.nombre)}${x.fecha ? ` · ${esc(x.fecha)}` : ''}</footer>
      </blockquote>`).join('')}</div></section>`;
  }

  // main: contenedor; q: URLSearchParams con id, llegada, salida, huespedes.
  function montar(main, q) {
    const p = window.PROPIEDADES.find((x) => x.id === q.get('id'));
    if (!p) {
      document.title = `No encontrada · ${CFG.marca}`;
      main.innerHTML = `<div class="narrow center"><h1>No encontramos esta propiedad</h1><p>Puede que ya no esté disponible.</p><p><a class="btn" href="${CFG.unaPagina ? '#inicio' : './'}">Ver todas las propiedades</a></p></div>`;
      return null;
    }

    const hoy = C.hoyChile();
    document.title = `${p.titulo} · ${CFG.marca}`;
    const conTarjeta = Number(CFG.recargoTarjeta) > 0;
    const dia = C.esDia(p);
    const cond = C.condiciones(p, CFG.condiciones);
    if (dia) { cond.llegada = ''; cond.salida = ''; cond.horarioDia = `de ${p.horario_dia.desde} a ${p.horario_dia.hasta}`; }
    const variable = Boolean(dia ? p.precio_dia_fin_semana || (p.temporadas || []).some((t) => t.precio_dia)
      : p.precio_fin_semana || (p.temporadas || []).some((t) => t.precio_noche));
    const ocupado = (p.ocupado || []).filter((o) => o.hasta > hoy);
    const fotos = p.fotos || [];
    const galeria = fotos.length
      ? fotos.slice(0, 5).map((f, i) => `<img src="${esc(f)}" alt="Foto ${i + 1} de ${esc(p.titulo)}"${i ? ' loading="lazy"' : ''}>`).join('')
      : foto(p);
    const url = enlacePublico(p);

    main.innerHTML = `
    <article class="detalle">
      <p class="crumbs">${CFG.unaPagina
        ? `<a href="#inicio">← Volver a todas las propiedades</a>`
        : `<a href="./">Inicio</a> › <a href="./?region=${encodeURIComponent(p.region)}">${esc(p.region)}</a> ›
        <a href="./?region=${encodeURIComponent(p.region)}&comuna=${encodeURIComponent(p.comuna)}">${esc(p.comuna)}</a>`}</p>
      <div class="titulo-fila">
        <div>
          <h1>${esc(p.titulo)}</h1>
          <p class="muted"><span class="pill-modo tag-${esc(p.modalidad || 'noche')}">${esc(C.etiquetaModalidad(p))}</span> ${esc(C.TIPOS[p.tipo])} en ${esc(p.comuna)}, ${esc(p.region)}</p>
        </div>
        <div class="compartir">
          ${UI.botonFavorito(p.id, 'en-ficha')}
          <button type="button" class="btn ghost sm" id="btn-compartir">${UI.ICONOS_MARCA.compartir} <span>Compartir</span></button>
          <a class="btn ghost sm" id="btn-amigo" target="_blank" rel="noopener">${UI.WA_ICON} <span>Enviar a un amigo</span></a>
          <span class="muted small" id="compartir-aviso" role="status"></span>
        </div>
      </div>
      <div class="galeria ${fotos.length > 1 ? 'multi' : ''}">${galeria}</div>
      ${p.credito_foto ? `<p class="credito">Foto referencial del destino: <a href="${esc(p.credito_foto.enlace)}" target="_blank" rel="noopener">${esc(p.credito_foto.autor)}</a>, ${esc(p.credito_foto.licencia)}, vía Wikimedia Commons.</p>` : ''}
      <div class="detalle-cols">
        <div>
          <section class="facts">${dia ? `
            <span>Hasta <strong>${p.capacidad}</strong> personas</span>
            <span>Horario <strong>${esc(p.horario_dia.desde)} a ${esc(p.horario_dia.hasta)}</strong></span>
            <span><strong>${p.banos}</strong> ${p.banos === 1 ? 'baño' : 'baños'}</span>` : `
            <span><strong>${p.capacidad}</strong> huéspedes</span>
            <span><strong>${p.dormitorios}</strong> ${p.dormitorios === 1 ? 'dormitorio' : 'dormitorios'}</span>
            <span><strong>${p.banos}</strong> ${p.banos === 1 ? 'baño' : 'baños'}</span>`}
            ${p.superficie_m2 ? `<span><strong>${esc(C.superficie(p.superficie_m2))}</strong> ${p.tipo === 'parcela' ? 'de terreno' : 'construidos'}</span>` : ''}
            ${dia ? '' : `<span>Mínimo <strong>${p.min_noches}</strong> ${p.min_noches === 1 ? 'noche' : 'noches'}</span>`}
          </section>
          <section><h2>Sobre este lugar</h2><p class="desc">${esc(p.descripcion)}</p></section>
          ${(p.amenities || []).length ? `<section><h2>Lo que ofrece</h2><ul class="amenities">${p.amenities.map((a) => `<li>${esc(C.COMODIDADES[a] || a)}</li>`).join('')}</ul></section>` : ''}
          ${dia ? seccionPreciosDia(p) : seccionPrecios(p)}
          ${seccionCondiciones(cond)}
          ${seccionResenas(p)}
          <section>
            <h2>Ubicación</h2>
            <div id="mapa-ficha" class="mapa-ficha" aria-label="Mapa con la ubicación aproximada"></div>
            <p class="muted small">Ubicación aproximada en ${esc(p.comuna)}. La dirección exacta se envía al confirmar la reserva.</p>
          </section>
        </div>

        <aside class="reserva-box">
          <form id="form-reserva">
            <p class="caja-titulo">${dia ? (p.modalidad === 'evento_noche' ? 'Elige la fecha de tu evento' : 'Elige el día de tu evento') : 'Elige tus fechas'}</p>
            <div class="calendario" id="calendario" aria-label="Calendario de disponibilidad"></div>
            <input type="hidden" name="llegada"><input type="hidden" name="salida">
            <div class="fechas-elegidas" data-q="fechas" hidden></div>
            <p class="precio-caja"><span data-c="cabecera">${UI.precios(C.precioBase(p), `/ ${C.unidad(p)}`)}</span>
            ${variable ? `<span class="muted small">Varía según ${dia ? 'fin de semana y temporada' : 'temporada y fin de semana'}</span>` : ''}</p>${dia ? `
            <div class="row2">
              <label>Asistentes <input type="number" name="huespedes" min="1" max="${p.capacidad}" value="${p.por_persona ? p.por_persona.incluidas : 10}"></label>
              <label>Tipo de evento <input name="evento" maxlength="60" placeholder="Opcional"></label>
            </div>` : `
            <label>Huéspedes <input type="number" name="huespedes" min="1" max="${p.capacidad}" value="1"></label>`}
            ${conTarjeta ? `
            <fieldset class="pago">
              <legend>¿Cómo quieres pagar?</legend>
              <label class="opcion"><input type="radio" name="pago" value="tarjeta" checked>
                <span><strong>Tarjeta de crédito o débito</strong><small>Precio normal. Te enviamos un link de pago por WhatsApp; puedes pagar en cuotas.</small></span></label>
              <label class="opcion"><input type="radio" name="pago" value="transferencia">
                <span><strong>Transferencia bancaria</strong><small>Con descuento. Te enviamos los datos por WhatsApp.</small></span></label>
            </fieldset>` : ''}
            <div class="cotizacion" hidden>
              <div data-q="filas"></div>
              ${p.tarifa_limpieza ? `<div class="row between"><span>Limpieza</span><span data-q="limpieza"></span></div>` : ''}
              <div data-q="totales"></div>
            </div>
            <p class="aviso" data-q="aviso" hidden></p>
            <a class="btn block wa" id="btn-whatsapp" target="_blank" rel="noopener">${UI.WA_ICON} <span data-q="btn">Reservar por WhatsApp</span></a>
            <p class="muted small center" data-q="ayuda"></p>
            ${dia ? `<p class="muted small center">Horario ${esc(cond.horarioDia)}</p>` : ''}
            ${cond.llegada || cond.salida ? `<p class="muted small center">Llegada desde ${esc(cond.llegada || '—')} · Salida hasta ${esc(cond.salida || '—')}</p>` : ''}
          </form>
        </aside>
      </div>
    </article>
    <div class="barra-reserva" id="barra-reserva">
      <div class="barra-precio" data-b="precio"></div>
      <button type="button" class="btn" data-b="ir">Reservar</button>
    </div>`;

    // Mapa de la ficha con un círculo de ubicación aproximada
    const mapa = L.map('mapa-ficha', { scrollWheelZoom: false }).setView([p.lat, p.lng], 12);
    UI.capaBase(mapa).addTo(mapa);
    L.circle([p.lat, p.lng], { radius: 1200, color: '#0e6ba8', fillColor: '#4cc9c0', fillOpacity: 0.18, weight: 2 }).addTo(mapa);
    mapa.on('click', () => mapa.scrollWheelZoom.enable());

    // Compartir
    const textoCompartir = `${p.titulo} en ${p.comuna}, desde ${C.formatCLP(C.precioBase(p))} ${dia ? 'el día' : 'la noche'}`;
    const avisoCompartir = document.getElementById('compartir-aviso');
    document.getElementById('btn-amigo').href = `https://wa.me/?text=${encodeURIComponent(`Mira esta ${C.TIPOS[p.tipo].toLowerCase()}: ${textoCompartir}\n${url}`)}`;
    document.getElementById('btn-amigo').addEventListener('click', () => UI.contar('compartir-whatsapp', p.id));
    document.getElementById('btn-compartir').addEventListener('click', async () => {
      UI.contar('compartir', p.id);
      if (window.Nativo && window.Nativo.esApp && await window.Nativo.compartir({ title: p.titulo, text: textoCompartir, url })) return;
      if (navigator.share) {
        try { await navigator.share({ title: p.titulo, text: textoCompartir, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      try {
        await navigator.clipboard.writeText(url);
        avisoCompartir.textContent = 'Enlace copiado';
      } catch (_) {
        avisoCompartir.textContent = url;
      }
      setTimeout(() => { avisoCompartir.textContent = ''; }, 4000);
    });

    // Reserva
    const form = document.getElementById('form-reserva');
    const box = form.querySelector('.cotizacion');
    const aviso = form.querySelector('[data-q="aviso"]');
    const btn = document.getElementById('btn-whatsapp');
    const $ = (k) => form.querySelector(`[data-q="${k}"]`);
    let avisoCalendario = '';

    if (dia && C.esFecha(q.get('fecha')) && q.get('fecha') >= hoy) { form.llegada.value = q.get('fecha'); form.salida.value = C.sumarDias(q.get('fecha'), 1); }
    if (!dia && C.esFecha(q.get('llegada')) && q.get('llegada') >= hoy) form.llegada.value = q.get('llegada');
    if (!dia && C.esFecha(q.get('salida'))) form.salida.value = q.get('salida');
    if (Number(q.get('huespedes'))) form.huespedes.value = Math.min(Number(q.get('huespedes')), p.capacidad);

    const calendario = window.Calendario.montar(document.getElementById('calendario'), {
      hoy, ocupado, unDia: dia, meses: 1,
      alElegir(llegada, salida) {
        avisoCalendario = '';
        form.llegada.value = llegada;
        form.salida.value = salida;
        actualizar(false);
      },
      alAvisar(texto) { avisoCalendario = texto; actualizar(false); },
    });

    // Muestra las fechas elegidas bajo el calendario, con opción de borrarlas.
    const resumen = $('fechas');
    function mostrarFechas(llegada, salida) {
      resumen.hidden = !llegada;
      if (!llegada) { resumen.innerHTML = ''; return; }
      const f = (x) => esc(window.WhatsApp ? new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(x + 'T00:00:00Z')) : x);
      const texto = dia ? `<strong>${f(llegada)}</strong>`
        : salida ? `<strong>${f(llegada)}</strong> → <strong>${f(salida)}</strong> · ${C.noches(llegada, salida)} ${C.noches(llegada, salida) === 1 ? 'noche' : 'noches'}`
          : `Llegada <strong>${f(llegada)}</strong> · ahora elige la salida`;
      resumen.innerHTML = `<span>${texto}</span><button type="button" class="link" data-borrar>Borrar</button>`;
    }
    resumen.addEventListener('click', (e) => {
      if (!e.target.closest('[data-borrar]')) return;
      form.llegada.value = ''; form.salida.value = ''; avisoCalendario = '';
      actualizar();
    });

    let ultimaSolicitud = null;
    function actualizar(sincronizar = true) {
      const pago = conTarjeta ? (form.querySelector('input[name="pago"]:checked') || {}).value : null;
      const llegada = form.llegada.value;
      const salida = form.salida.value;
      const huespedes = Number(form.huespedes.value) || null;
      if (dia) form.salida.value = llegada ? C.sumarDias(llegada, 1) : '';
      const r = dia ? C.validarDia(p, { fecha: llegada, asistentes: huespedes }, hoy) : C.validarReserva(p, { llegada, salida, huespedes }, hoy);
      const cot = r.cotizacion;
      if (sincronizar) calendario.marcar(llegada, salida);
      mostrarFechas(llegada, salida);

      // Precios según la forma de pago: tarjeta = precio normal; transferencia = con descuento.
      const fmt = C.formatCLP;
      const porTarjeta = conTarjeta && pago === 'tarjeta';
      const base = C.precioBase(p);
      const lista = UI.conTarjeta(base);
      document.querySelector('[data-c="cabecera"]').innerHTML = !conTarjeta ? UI.precios(base, `/ ${C.unidad(p)}`)
        : porTarjeta
          ? `<span class="precios"><span><span class="precio">${esc(fmt(lista))}</span> <span class="muted">/ ${C.unidad(p)}</span></span><span class="descuento">o ${esc(fmt(base))} pagando con transferencia</span></span>`
          : UI.precios(base, `/ ${C.unidad(p)}`);

      box.hidden = !r.ok;
      if (r.ok) {
        const ct = conTarjeta ? C.cotizacionTarjeta(cot, CFG.recargoTarjeta) : null;
        const etq = (e) => (e && e !== 'Normal' ? ` <small>(${esc(e.toLowerCase())})</small>` : '');
        if (dia) {
          const precioDia = porTarjeta ? ct.lineas[0].precio : cot.precio;
          const extraP = porTarjeta && cot.adicionales ? ct.lineas[1].precio : cot.extraPersona;
          $('filas').innerHTML = `<div class="row between"><span>${p.modalidad === 'evento_noche' ? 'Arriendo del evento' : 'Arriendo del día'}${etq(cot.etiqueta)}</span><span>${esc(fmt(precioDia))}</span></div>`
            + (cot.adicionales ? `<div class="row between"><span>${cot.adicionales} ${cot.adicionales === 1 ? 'persona adicional' : 'personas adicionales'} × ${esc(fmt(extraP))}</span><span>${esc(fmt(extraP * cot.adicionales))}</span></div>` : '');
        } else {
          const varios = cot.detalle.length > 1 || cot.detalle[0].etiqueta !== 'Normal';
          const filas = porTarjeta ? ct.lineas : cot.detalle.map((g) => ({ ...g, monto: g.precio * g.noches }));
          $('filas').innerHTML = filas.map((g) => `<div class="row between"><span>${esc(fmt(g.precio))} × ${g.noches} ${g.noches === 1 ? 'noche' : 'noches'}${varios ? etq(g.etiqueta) || ' <small>(normal)</small>' : ''}</span><span>${esc(fmt(g.monto))}</span></div>`).join('');
        }
        if ($('limpieza')) $('limpieza').textContent = fmt(porTarjeta ? ct.limpieza : cot.limpieza);
        $('totales').innerHTML = !conTarjeta
          ? `<div class="row between total"><span>Total</span><span>${esc(fmt(cot.total))}</span></div>`
          : porTarjeta
            ? `<div class="row between total"><span>Total</span><span>${esc(fmt(ct.total))}</span></div>
               <div class="row between descuento-nota"><span>Con transferencia pagarías</span><span>${esc(fmt(cot.total))}</span></div>`
            : `<div class="row between"><span>Precio total</span><s>${esc(fmt(ct.total))}</s></div>
               <div class="row between total ahorro"><span>Total con transferencia</span><span>${esc(fmt(cot.total))}</span></div>
               <div class="row between"><span class="muted small">Ahorras</span><span class="muted small">${esc(fmt(ct.total - cot.total))}</span></div>`;
      }
      const error = avisoCalendario || r.error;
      aviso.hidden = !error;
      aviso.textContent = error || '';

      const datos = {
        marca: CFG.marca, titulo: p.titulo, tipo: C.TIPOS[p.tipo], comuna: p.comuna, region: p.region, url, huespedes,
      };
      // Incluye las fechas aunque no calcen (así pueden preguntar), y el total solo si es válido.
      if (dia) {
        Object.assign(datos, { modalidad: p.modalidad, fecha: llegada, asistentes: huespedes, evento: (form.evento.value || '').trim(), horario: cond.horarioDia });
        if (r.ok) Object.assign(datos, { precio_dia: cot.precio, etiqueta: cot.etiqueta, adicionales: cot.adicionales, extra_persona: p.por_persona ? p.por_persona.extra : 0 });
      } else if (cot) Object.assign(datos, { llegada, salida, noches: cot.noches });
      if (!dia && cot && (cond.llegada || cond.salida)) {
        datos.horario = [cond.llegada && `llegada desde ${cond.llegada}`, cond.salida && `salida hasta ${cond.salida}`].filter(Boolean).join(', ');
      }
      if (r.ok) Object.assign(datos, { detalle: dia ? null : cot.detalle, limpieza: cot.limpieza, total: cot.total });
      if (r.ok && conTarjeta) {
        const ct = C.cotizacionTarjeta(cot, CFG.recargoTarjeta);
        datos.total_tarjeta = ct.total;
        if (porTarjeta) {
          // Con tarjeta, el desglose del mensaje va a precio normal y el total es el de tarjeta.
          datos.por_tarjeta = true;
          datos.limpieza = ct.limpieza;
          if (dia) {
            datos.precio_dia = ct.lineas[0].precio;
            if (cot.adicionales) datos.extra_persona = ct.lineas[1].precio;
          } else {
            datos.detalle = ct.lineas.map((l) => ({ etiqueta: l.etiqueta, precio: l.precio, noches: l.noches }));
          }
        }
      }
      if (pago) datos.pago = pago === 'tarjeta' ? 'Tarjeta de crédito o débito (link de pago)' : 'Transferencia bancaria';
      btn.href = UI.waUrl(window.WhatsApp.mensajeReserva(datos));
      // Datos para "Mis solicitudes" (se guardan al tocar el botón)
      ultimaSolicitud = {
        propId: p.id, titulo: p.titulo, evento: dia, llegada, salida: dia ? '' : salida, personas: huespedes,
        total: r.ok ? (porTarjeta ? C.cotizacionTarjeta(cot, CFG.recargoTarjeta).total : cot.total) : null,
        pago: datos.pago ? (porTarjeta ? 'tarjeta' : 'transferencia') : '', whatsapp: btn.href,
      };

      // Sin fechas, el botón lleva al calendario en vez de abrir WhatsApp.
      // Barra fija del celular: precio (o total) y fechas elegidas
      const barraPrecio = document.querySelector('[data-b="precio"]');
      const fFecha = (x) => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(x + 'T00:00:00Z'));
      const textoFechas = !llegada ? (dia ? 'Elige tu fecha' : 'Elige tus fechas') : dia ? fFecha(llegada) : salida ? `${fFecha(llegada)} – ${fFecha(salida)}` : `Desde ${fFecha(llegada)}`;
      if (r.ok && conTarjeta) {
        const tot = C.cotizacionTarjeta(cot, CFG.recargoTarjeta).total;
        barraPrecio.innerHTML = porTarjeta
          ? `<span><strong>${esc(fmt(tot))}</strong> <span class="muted">total</span></span><small>${esc(textoFechas)}</small>`
          : `<span><s>${esc(fmt(tot))}</s> <strong>${esc(fmt(cot.total))}</strong> <span class="muted">total</span></span><small>${esc(textoFechas)}</small>`;
      } else {
        barraPrecio.innerHTML = porTarjeta
          ? `<span><strong>${esc(fmt(lista))}</strong> <span class="muted">${C.unidad(p)}</span></span><small>${esc(textoFechas)}</small>`
          : `<span>${conTarjeta ? `<s>${esc(fmt(lista))}</s> ` : ''}<strong>${esc(fmt(base))}</strong> <span class="muted">${C.unidad(p)}</span></span><small>${esc(textoFechas)}</small>`;
      }

      const faltanFechas = !llegada || (!dia && !salida);
      btn.classList.toggle('pendiente', faltanFechas);
      $('btn').textContent = faltanFechas ? (dia ? 'Elige la fecha de tu evento' : 'Elige tus fechas para reservar') : (r.ok ? 'Reservar por WhatsApp' : 'Consultar por WhatsApp');
      $('ayuda').textContent = faltanFechas
        ? (dia ? 'Toca el día en el calendario: te armamos el mensaje con la fecha y el precio.' : 'Toca la llegada y la salida en el calendario: te armamos el mensaje con las fechas y el precio.')
        : 'Se abre WhatsApp con tu reserva ya escrita. Te responde una persona de nuestro equipo para confirmar disponibilidad y resolver tus dudas.';
    }

    // Barra fija: "Reservar" lleva al cuadro de reserva; se oculta cuando el cuadro ya está en pantalla.
    const barra = document.getElementById('barra-reserva');
    barra.querySelector('[data-b="ir"]').addEventListener('click', () => {
      const destino = form.llegada.value && (dia || form.salida.value) ? btn : document.getElementById('calendario');
      destino.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => barra.classList.toggle('oculta', e.isIntersecting), { threshold: 0.15 })
        .observe(document.querySelector('.reserva-box'));
    }

    btn.addEventListener('click', (e) => {
      if (!btn.classList.contains('pendiente')) {
        UI.contar('reservar-whatsapp', p.id);
        if (window.Nativo && ultimaSolicitud) window.Nativo.reservaEnviada(ultimaSolicitud);
        return;
      }
      e.preventDefault();
      document.getElementById('calendario').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    form.addEventListener('input', () => { avisoCalendario = ''; actualizar(); });
    form.addEventListener('change', () => { avisoCalendario = ''; actualizar(); });
    actualizar();
    return mapa;
  }

  window.Ficha = { montar, enlacePublico };
  if (!CFG.unaPagina) {
    UI.montarMarco();
    montar(document.getElementById('ficha'), new URLSearchParams(location.search));
  }
})();
