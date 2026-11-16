// "Mis solicitudes": reservas que se enviaron por WhatsApp desde este teléfono.
(function () {
  'use strict';
  const C = window.Catalogo;
  const { esc } = window.UI;
  UI.montarMarco();
  const main = document.getElementById('solicitudes');
  const fmt = (x) => new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(x + 'T00:00:00Z'));

  function dibujar() {
    const lista = window.Nativo.solicitudes();
    main.innerHTML = `<h1>Mis solicitudes</h1>
      <p class="muted">Las reservas que enviaste por WhatsApp desde este teléfono. Nuestro equipo te confirma la disponibilidad por el mismo chat.</p>
      ${lista.length ? `<div class="lista-solicitudes">${lista.map((s) => {
        const p = window.PROPIEDADES.find((x) => x.id === s.propId);
        const fechas = s.evento ? fmt(s.llegada) : s.salida ? `${fmt(s.llegada)} → ${fmt(s.salida)}` : 'Fechas por definir';
        return `<article class="solicitud">
          <a class="solicitud-img" href="propiedad.html?id=${encodeURIComponent(s.propId)}">${p ? UI.foto(p) : ''}</a>
          <div class="solicitud-info">
            <a href="propiedad.html?id=${encodeURIComponent(s.propId)}"><strong>${esc(s.titulo)}</strong></a>
            <span>${esc(fechas)}${s.personas ? ` · ${s.personas} ${s.evento ? (s.personas === 1 ? 'asistente' : 'asistentes') : (s.personas === 1 ? 'huésped' : 'huéspedes')}` : ''}</span>
            ${s.total ? `<span>Total: <strong>${esc(C.formatCLP(s.total))}</strong>${s.pago ? ` · ${esc(s.pago)}` : ''}</span>` : ''}
            <span class="muted small">Enviada el ${esc(new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' }).format(new Date(s.enviada)))}</span>
            <div class="solicitud-acciones">
              ${s.whatsapp ? `<a class="btn sm wa" href="${esc(s.whatsapp)}" target="_blank" rel="noopener">${UI.WA_ICON} Volver a enviar</a>` : ''}
              ${window.Nativo.esApp && s.llegada ? `<button type="button" class="btn ghost sm" data-recordar="${s.id}">Recordarme</button>` : ''}
              <button type="button" class="link" data-borrar="${s.id}">Quitar</button>
            </div>
          </div>
        </article>`;
      }).join('')}</div>`
      : `<div class="empty"><p>Todavía no envías solicitudes.</p><p><a class="btn" href="./">Explorar propiedades</a></p></div>`}`;
  }

  main.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-borrar]');
    if (b) { window.Nativo.borrarSolicitud(Number(b.dataset.borrar)); dibujar(); return; }
    const r = e.target.closest('[data-recordar]');
    if (r) {
      const s = window.Nativo.solicitudes().find((x) => x.id === Number(r.dataset.recordar));
      const res = s ? await window.Nativo.recordar(s) : 'error';
      window.Nativo.aviso(res === 'ok' ? 'Listo, te avisaremos el día antes.' : 'No pudimos activar el recordatorio. Revisa los permisos de notificaciones.');
    }
  });
  dibujar();
})();
