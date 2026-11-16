// ⚙️ Configuración del sitio. Edita estos valores y haz commit: GitHub Pages publica el cambio solo.
window.CONFIG = {
  marca: 'Arriendo en CL',
  instagram: 'arriendoencl',
  tiktok: 'arriendoencl',
  // Seguidores en TikTok que se muestran en la portada (actualízalo de vez en cuando). Vacío para no mostrarlo.
  seguidoresTiktok: '46 mil',
  // Celular que recibe las reservas, solo dígitos con 56 adelante (ej: '56912345678').
  // Si queda vacío, el botón abre WhatsApp para que el cliente elija a quién enviar el mensaje.
  whatsapp: '56988971675',
  // Pago con tarjeta: recargo sobre el total con transferencia (0.07 = 7%), redondeado a la luca.
  // El sitio lo muestra como "descuento por transferencia". Pon 0 para no mostrar la opción.
  recargoTarjeta: 0.07,
  // Dirección pública del sitio (para enlaces y vistas previas al compartir). Termina en "/".
  urlSitio: 'https://ignacio-soto1.github.io/claude-arriendocl/docs/',
  // Estadísticas (GoatCounter, gratis): crea una cuenta en goatcounter.com y pon aquí tu código, ej. 'arriendoencl'.
  goatcounter: '',
  // Condiciones generales de reserva (cada propiedad puede cambiar alguna en su campo "condiciones").
  // ⚠️ Revisa y ajusta estos textos: son las reglas que verán tus huéspedes.
  condiciones: {
    // Alojamiento (arriendo por noche)
    alojamiento: {
      llegada: '15:00',
      salida: '12:00',
      cancelacion: 'Cancelación sin costo hasta 7 días antes de la llegada. Después, se retiene el 50% del total.',
      garantia: 'Puede pedirse una garantía reembolsable al llegar, que se devuelve al revisar la propiedad.',
      reglas: ['No se permiten fiestas ni eventos sin autorización.', 'Silencio desde las 23:00.', 'No fumar dentro de la propiedad.'],
    },
    // Eventos de día (el horario sale de horario_dia de cada propiedad)
    eventos: {
      cancelacion: 'Cancelación sin costo hasta 14 días antes del evento. Después, se retiene el 50% del total.',
      garantia: 'Se pide una garantía reembolsable para cubrir daños, que se devuelve después de revisar el lugar.',
      reglas: ['Música hasta el término del horario contratado.', 'Uso de piscina bajo responsabilidad de los adultos a cargo.', 'Retirar la basura y dejar el quincho limpio al terminar.'],
    },
  },
  // Mapa base: 'osm' (OpenStreetMap) o 'contorno' (dibujo de Chile incluido en el sitio, sin conexión externa).
  mapaBase: 'osm',
};
