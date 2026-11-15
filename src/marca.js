'use strict';

// Normaliza un celular chileno a formato internacional sin "+" (569XXXXXXXX), o null si no es válido.
function normalizarWhatsapp(valor) {
  let d = String(valor || '').replace(/\D/g, '');
  if (/^9\d{8}$/.test(d)) d = `56${d}`;
  return /^569\d{8}$/.test(d) ? d : null;
}

// WhatsApp que recibe las reservas: variable de entorno WHATSAPP_RESERVAS (ej: "+56 9 1234 5678").
const whatsappEnv = process.env.WHATSAPP_RESERVAS;
const whatsapp = whatsappEnv ? normalizarWhatsapp(whatsappEnv) : null;
if (whatsappEnv && !whatsapp) {
  throw new Error(`WHATSAPP_RESERVAS no es un celular chileno válido: "${whatsappEnv}" (usa +56 9 XXXX XXXX)`);
}

// Datos de marca en un solo lugar.
module.exports = {
  nombre: 'Arriendo en CL',
  instagram: 'arriendoencl',
  instagramUrl: 'https://www.instagram.com/arriendoencl/',
  whatsapp,
  normalizarWhatsapp,
};
