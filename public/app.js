'use strict';
(function () {
  const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

  // Selects dependientes región → comuna
  document.querySelectorAll('select[data-region]').forEach((regionSel) => {
    const comunaSel = regionSel.form.querySelector('select[data-comuna]');
    if (!comunaSel) return;
    const placeholder = comunaSel.options[0].textContent;
    regionSel.addEventListener('change', () => {
      const r = (window.REGIONES || []).find((x) => x.nombre === regionSel.value);
      comunaSel.replaceChildren(new Option(placeholder, ''));
      if (r) r.comunas.forEach((c) => comunaSel.add(new Option(c, c)));
    });
  });

  // La salida no puede ser antes de la llegada
  document.querySelectorAll('input[data-llegada]').forEach((llegada) => {
    const salida = llegada.form.querySelector('input[data-salida]');
    if (!salida) return;
    const sync = () => {
      if (!llegada.value) return;
      const d = new Date(llegada.value + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      salida.min = d.toISOString().slice(0, 10);
      if (salida.value && salida.value < salida.min) salida.value = salida.min;
    };
    llegada.addEventListener('change', sync);
    sync();
  });

  // Confirmaciones
  document.querySelectorAll('form[data-confirm]').forEach((f) => {
    f.addEventListener('submit', (e) => { if (!confirm(f.dataset.confirm)) e.preventDefault(); });
  });

  // Formato de RUT al salir del campo
  document.querySelectorAll('input[data-rut]').forEach((inp) => {
    inp.addEventListener('blur', () => {
      const v = inp.value.replace(/[^0-9kK]/g, '').toUpperCase();
      if (v.length < 2) return;
      inp.value = v.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + v.slice(-1);
    });
  });

  // Cotización en vivo en la ficha de propiedad
  const form = document.getElementById('form-reserva');
  if (form) {
    const precio = Number(form.dataset.precio);
    const limpieza = Number(form.dataset.limpieza);
    const tasa = Number(form.dataset.tasa);
    const min = Number(form.dataset.min);
    const ocupado = JSON.parse(form.dataset.ocupado || '[]');
    const box = form.querySelector('.cotizacion');
    const aviso = form.querySelector('[data-q="aviso"]');
    const q = (k) => form.querySelector(`[data-q="${k}"]`);
    const update = () => {
      const a = form.llegada.value, b = form.salida.value;
      box.hidden = true; aviso.hidden = true;
      if (!a || !b || a >= b) return;
      const n = Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);
      if (ocupado.some((o) => a < o.check_out && o.check_in < b)) {
        aviso.textContent = 'Esas fechas chocan con otra reserva.'; aviso.hidden = false; return;
      }
      if (n < min) { aviso.textContent = `Mínimo ${min} noches.`; aviso.hidden = false; return; }
      const sub = precio * n, serv = Math.round(sub * tasa);
      q('detalle').textContent = `${clp.format(precio)} × ${n} ${n === 1 ? 'noche' : 'noches'}`;
      q('subtotal').textContent = clp.format(sub);
      q('servicio').textContent = clp.format(serv);
      q('total').textContent = clp.format(sub + limpieza + serv);
      box.hidden = false;
    };
    form.addEventListener('change', update);
    update();
  }
})();
