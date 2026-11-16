// Calendario de disponibilidad: muestra noches reservadas y permite elegir llegada y salida con dos toques.
(function () {
  'use strict';
  const C = window.Catalogo;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];

  // el: contenedor; op: { hoy, ocupado: [{desde, hasta}], meses, alElegir(llegada, salida), alAvisar(texto) }
  function montar(el, op) {
    const ocupada = (f) => op.ocupado.some((o) => o.desde <= f && f < o.hasta); // la noche de f está reservada
    const libre = (a, b) => { for (let f = a; f < b; f = C.sumarDias(f, 1)) if (ocupada(f)) return false; return true; };
    let llegada = '', salida = '';
    let inicio = op.hoy.slice(0, 7); // AAAA-MM del primer mes visible

    const sumarMes = (am, n) => {
      const [a, m] = am.split('-').map(Number);
      const d = new Date(Date.UTC(a, m - 1 + n, 1));
      return d.toISOString().slice(0, 7);
    };

    function mes(am) {
      const [a, m] = am.split('-').map(Number);
      const primero = `${am}-01`;
      const offset = (new Date(primero + 'T00:00:00Z').getUTCDay() + 6) % 7; // lunes = 0
      const dias = new Date(Date.UTC(a, m, 0)).getUTCDate();
      let celdas = '<span class="vacio"></span>'.repeat(offset);
      for (let d = 1; d <= dias; d++) {
        const f = `${am}-${String(d).padStart(2, '0')}`;
        const clases = [];
        if (f < op.hoy) clases.push('pasado');
        else if (ocupada(f)) clases.push('ocupado');
        if (f === op.hoy) clases.push('hoy');
        if (f === llegada) clases.push('sel', 'inicio');
        if (f === salida && !op.unDia) clases.push('sel', 'fin');
        if (llegada && salida && f > llegada && f < salida) clases.push('rango');
        const etiqueta = `${d} de ${MESES[m - 1]}${clases.includes('ocupado') ? ', reservado' : ''}`;
        celdas += `<button type="button" class="${clases.join(' ')}" data-f="${f}" aria-label="${etiqueta}"${f < op.hoy ? ' disabled' : ''}>${d}</button>`;
      }
      return `<div class="cal-mes"><p class="cal-titulo">${MESES[m - 1]} ${a}</p>
        <div class="cal-grid">${DIAS.map((x) => `<span class="cal-dia">${x}</span>`).join('')}${celdas}</div></div>`;
    }

    function dibujar() {
      const meses = Array.from({ length: op.meses || 2 }, (_, i) => mes(sumarMes(inicio, i))).join('');
      const puedeAtras = inicio > op.hoy.slice(0, 7);
      el.innerHTML = `<div class="cal-nav">
          <button type="button" data-nav="-1" aria-label="Mes anterior"${puedeAtras ? '' : ' disabled'}>‹</button>
          <span class="cal-ayuda">${op.unDia ? 'Toca el día de tu evento' : !llegada || salida ? 'Toca el día de llegada' : 'Ahora toca el día de salida'}</span>
          <button type="button" data-nav="1" aria-label="Mes siguiente">›</button>
        </div>
        <div class="cal-meses">${meses}</div>
        <p class="cal-leyenda"><span class="muestra ocupado"></span> Reservado <span class="muestra sel"></span> ${op.unDia ? 'Tu fecha' : 'Tu estadía'}</p>`;
    }

    el.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) { inicio = sumarMes(inicio, Number(nav.dataset.nav)); dibujar(); return; }
      const b = e.target.closest('button[data-f]');
      if (!b || b.disabled) return;
      const f = b.dataset.f;
      if (op.unDia) {
        if (ocupada(f)) { op.alAvisar('Ese día ya está reservado. Elige otro.'); return; }
        llegada = f; salida = C.sumarDias(f, 1);
        op.alElegir(llegada, salida);
      } else if (!llegada || salida || f <= llegada) {
        if (ocupada(f)) { op.alAvisar('Ese día ya está reservado. Elige otro día de llegada.'); return; }
        llegada = f; salida = '';
        op.alElegir(llegada, '');
      } else if (!libre(llegada, f)) {
        op.alAvisar('Hay noches reservadas entre esas fechas. Elige otra salida.');
        return;
      } else {
        salida = f;
        op.alElegir(llegada, salida);
      }
      dibujar();
    });

    dibujar();
    return {
      // Sincroniza desde los campos de fecha
      marcar(a, b) {
        llegada = a || ''; salida = b || '';
        // Si la llegada no está entre los meses visibles, abre el calendario en ese mes
        const visibles = Array.from({ length: op.meses || 2 }, (_, i) => sumarMes(inicio, i));
        if (llegada && !visibles.includes(llegada.slice(0, 7))) inicio = llegada.slice(0, 7);
        dibujar();
      },
    };
  }

  window.Calendario = { montar };
})();
