'use strict';

// Regiones de Chile (norte a sur) con una selección de comunas relevantes para arriendo.
// Para producción conviene cargar las 346 comunas oficiales (SUBDERE) desde un archivo de datos.
const REGIONES = [
  { codigo: 'XV', nombre: 'Arica y Parinacota', comunas: ['Arica', 'Putre', 'Camarones'] },
  { codigo: 'I', nombre: 'Tarapacá', comunas: ['Iquique', 'Alto Hospicio', 'Pica', 'Pozo Almonte'] },
  { codigo: 'II', nombre: 'Antofagasta', comunas: ['Antofagasta', 'Calama', 'San Pedro de Atacama', 'Mejillones', 'Taltal', 'Tocopilla'] },
  { codigo: 'III', nombre: 'Atacama', comunas: ['Copiapó', 'Caldera', 'Chañaral', 'Vallenar', 'Huasco'] },
  { codigo: 'IV', nombre: 'Coquimbo', comunas: ['La Serena', 'Coquimbo', 'Vicuña', 'Paihuano', 'Ovalle', 'Los Vilos', 'Tongoy'] },
  { codigo: 'V', nombre: 'Valparaíso', comunas: ['Valparaíso', 'Viña del Mar', 'Concón', 'Quintero', 'Zapallar', 'Papudo', 'Algarrobo', 'El Quisco', 'El Tabo', 'Cartagena', 'Casablanca', 'Los Andes', 'San Felipe', 'Olmué', 'Limache', 'Quilpué', 'Villa Alemana', 'Isla de Pascua'] },
  { codigo: 'RM', nombre: 'Metropolitana de Santiago', comunas: ['Santiago', 'Providencia', 'Las Condes', 'Vitacura', 'Ñuñoa', 'Lo Barnechea', 'La Reina', 'Macul', 'San Miguel', 'Estación Central', 'Pirque', 'San José de Maipo', 'Colina', 'Lampa', 'Calera de Tango', 'Paine', 'Buin', 'Talagante', 'Peñaflor', 'Melipilla', 'Curacaví'] },
  { codigo: 'VI', nombre: "Libertador General Bernardo O'Higgins", comunas: ['Rancagua', 'Machalí', 'Pichilemu', 'Navidad', 'Santa Cruz', 'San Fernando', 'Rengo', 'Litueche'] },
  { codigo: 'VII', nombre: 'Maule', comunas: ['Talca', 'Curicó', 'Linares', 'Constitución', 'Pelluhue', 'Vichuquén', 'Licantén'] },
  { codigo: 'XVI', nombre: 'Ñuble', comunas: ['Chillán', 'Chillán Viejo', 'Pinto', 'Cobquecura', 'San Carlos'] },
  { codigo: 'VIII', nombre: 'Biobío', comunas: ['Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Chiguayante', 'Tomé', 'Penco', 'Los Ángeles', 'Antuco', 'Santa Juana'] },
  { codigo: 'IX', nombre: 'La Araucanía', comunas: ['Temuco', 'Pucón', 'Villarrica', 'Curarrehue', 'Lonquimay', 'Melipeuco', 'Curacautín', 'Angol'] },
  { codigo: 'XIV', nombre: 'Los Ríos', comunas: ['Valdivia', 'Panguipulli', 'Lago Ranco', 'Futrono', 'Los Lagos', 'Corral'] },
  { codigo: 'X', nombre: 'Los Lagos', comunas: ['Puerto Montt', 'Puerto Varas', 'Frutillar', 'Llanquihue', 'Osorno', 'Puyehue', 'Castro', 'Ancud', 'Dalcahue', 'Chonchi', 'Quellón', 'Chaitén', 'Cochamó'] },
  { codigo: 'XI', nombre: 'Aysén del General Carlos Ibáñez del Campo', comunas: ['Coyhaique', 'Puerto Aysén', 'Chile Chico', 'Cochrane', 'Río Ibáñez', 'Puerto Cisnes'] },
  { codigo: 'XII', nombre: 'Magallanes y de la Antártica Chilena', comunas: ['Punta Arenas', 'Puerto Natales', 'Torres del Paine', 'Porvenir', 'Cabo de Hornos'] },
];

const TIPOS = {
  parcela: 'Parcela',
  departamento: 'Departamento',
  casa: 'Casa',
  cabana: 'Cabaña',
};

const AMENITIES = {
  wifi: 'Wi-Fi',
  estacionamiento: 'Estacionamiento',
  piscina: 'Piscina',
  quincho: 'Quincho / parrilla',
  tinaja: 'Tinaja / hot tub',
  lena: 'Estufa o chimenea a leña',
  calefaccion: 'Calefacción',
  aire: 'Aire acondicionado',
  cocina: 'Cocina equipada',
  lavadora: 'Lavadora',
  mascotas: 'Acepta mascotas',
  vista_mar: 'Vista al mar',
  lago_rio: 'Acceso a lago o río',
  terraza: 'Terraza / balcón',
  agua_potable: 'Agua potable',
  conserje: 'Conserjería 24/7',
};

function regionPorNombre(nombre) {
  return REGIONES.find((r) => r.nombre === nombre) || null;
}

function comunaValida(region, comuna) {
  const r = regionPorNombre(region);
  return Boolean(r && r.comunas.includes(comuna));
}

// ---- RUT ----

function limpiarRut(rut) {
  return String(rut || '').replace(/[.\s-]/g, '').toUpperCase();
}

function calcularDv(cuerpo) {
  let suma = 0;
  let multiplo = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

function validarRut(rut) {
  const limpio = limpiarRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  return calcularDv(limpio.slice(0, -1)) === limpio.slice(-1);
}

// Formato normalizado: 12.345.678-5
function formatearRut(rut) {
  const limpio = limpiarRut(rut);
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cuerpo}-${limpio.slice(-1)}`;
}

// ---- Moneda y fechas ----

const clpFormatter = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function formatCLP(monto) {
  return clpFormatter.format(Math.round(Number(monto) || 0));
}

const santiagoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' });
// Fecha de hoy (YYYY-MM-DD) en hora de Chile continental.
function hoyChile(now = new Date()) {
  return santiagoDate.format(now);
}

const fechaLarga = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
function formatFecha(iso) {
  return fechaLarga.format(new Date(`${iso}T00:00:00Z`));
}

module.exports = {
  REGIONES, TIPOS, AMENITIES,
  regionPorNombre, comunaValida,
  limpiarRut, calcularDv, validarRut, formatearRut,
  formatCLP, hoyChile, formatFecha,
};
