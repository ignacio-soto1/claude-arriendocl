// ⚙️ Configuración del sitio. Edita estos valores y haz commit: GitHub Pages publica el cambio solo.
window.CONFIG = {
  marca: 'Arriendo en CL',
  instagram: 'arriendoencl',
  // Celular que recibe las reservas, solo dígitos con 56 adelante (ej: '56912345678').
  // Si queda vacío, el botón abre WhatsApp para que el cliente elija a quién enviar el mensaje.
  whatsapp: '56988971675',
  // Pago con tarjeta: recargo sobre el total con transferencia (0.07 = 7%), redondeado a la luca.
  // El sitio lo muestra como "descuento por transferencia". Pon 0 para no mostrar la opción.
  recargoTarjeta: 0.07,
  // Mapa base: 'osm' (OpenStreetMap) o 'contorno' (dibujo de Chile incluido en el sitio, sin conexión externa).
  mapaBase: 'osm',
};
