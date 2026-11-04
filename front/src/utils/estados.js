// Etiquetas y estilos de badge por estado de ticket (reutilizable user/admin).
// OJO: solo cambian los NOMBRES visibles, no los valores internos:
//   estado 'finalizado' (interno) se muestra como "Por validar"
//   estado 'validado'   (interno) se muestra como "Finalizado"
export const ESTADO_LABEL = {
  abierto: 'Abierto',
  en_curso: 'En curso',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
  finalizado: 'Por validar',
  validado: 'Finalizado',
};

export const ESTADO_BADGE = {
  abierto: 'bg-red-50 text-red-700 border-red-200',       // "Sin tomar" -> rojo
  en_curso: 'bg-mist-100 text-mist-700 border-mist-300',  // azul (en proceso)
  pausado: 'bg-stone-200 text-stone-600 border-stone-300',
  cancelado: 'bg-stone-200 text-stone-600 border-stone-300', // gris (cerrado/inactivo)
  finalizado: 'bg-amber-50 text-amber-700 border-amber-200', // "Por validar" -> amarillo
  validado: 'bg-emerald-100 text-emerald-800 border-emerald-300', // "Finalizado" -> verde
};

// Descripcion corta de cada estado (se muestra bajo el folio/estado en el listado y el detalle).
export const ESTADO_DESC = {
  abierto: 'El ticket está en espera de resolución.',
  en_curso: 'El ticket está siendo atendido por un operador.',
  pausado: 'El ticket está en pausa temporalmente.',
  finalizado: 'En espera de validación por parte del usuario.',
  validado: 'El ticket ha sido resuelto y validado.',
  cancelado: 'El ticket ha sido cancelado por un operador.',
};

export const estadoLabel = (e) => ESTADO_LABEL[e] || e || '-';
export const estadoBadge = (e) => ESTADO_BADGE[e] || 'bg-cloud-100 text-ink-600 border-cloud-200';
export const estadoDesc = (e) => ESTADO_DESC[e] || '';

// La BD guarda en UTC; interpretamos el string como UTC y mostramos en hora del centro
// de Mexico (GMT-6) sin importar la zona del navegador.
const TZ = 'America/Mexico_City';
const parseUTC = (s) => new Date(String(s).replace(' ', 'T') + 'Z');

// Fecha ISO (YYYY-MM-DD) en hora de Mexico, para comparar si dos instantes caen el mismo dia local.
export const fechaMX = (s) => {
  if (!s) return '';
  try {
    return parseUTC(s).toLocaleDateString('en-CA', { timeZone: TZ });
  } catch {
    return '';
  }
};
export const hoyMX = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });

export const fmtFecha = (s) => {
  if (!s) return '';
  try {
    return parseUTC(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });
  } catch {
    return s;
  }
};

export const fmtFechaHora = (s) => {
  if (!s) return '';
  try {
    return parseUTC(s).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
  } catch {
    return s;
  }
};

// Solo la hora (HH:MM) en GMT-6. Para el chat estilo mensajeria.
export const fmtHora = (s) => {
  if (!s) return '';
  try {
    return parseUTC(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
  } catch {
    return '';
  }
};

// Formatea una duracion dada en MINUTOS a algo legible: "5d 3h", "5h 43m" o "14m".
export const fmtMin = (min) => {
  const t = Math.max(0, Math.round(Number(min) || 0));
  const d = Math.floor(t / 1440);
  const h = Math.floor((t % 1440) / 60);
  const m = t % 60;
  if (d) return h ? `${d}d ${h}h` : `${d}d`;
  if (h) return m ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
};

// Antiguedad/duracion desde una fecha hasta ahora, en dias + horas + minutos (ej. "3d 5h 12m").
export const fmtAntiguedad = (s) => {
  if (!s) return '';
  try {
    const ms = Date.now() - parseUTC(s).getTime();
    if (ms < 0 || Number.isNaN(ms)) return '0m';
    const totalMin = Math.floor(ms / 60000);
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  } catch {
    return '';
  }
};
