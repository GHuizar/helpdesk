import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { logsApi } from '../../api/logsApi';
import { ticketsApi } from '../../api/ticketsApi';
import Spinner from '../../components/ui/Spinner';
import VisorArchivo from '../../components/VisorArchivo';
import { fmtFechaHora } from '../../utils/estados';

// Etiqueta + color por tipo de accion (badge dentro de cada seccion).
const ACCION = {
  ticket_creado: { label: 'Ticket creado', badge: 'bg-mist-100 text-mist-700 border-mist-300' },
  estado: { label: 'Cambio de estado', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  responsable: { label: 'Responsable', badge: 'bg-cloud-100 text-ink-700 border-cloud-300' },
  datos: { label: 'Datos editados', badge: 'bg-cloud-100 text-ink-700 border-cloud-300' },
  mensaje: { label: 'Mensaje', badge: 'bg-cloud-100 text-ink-600 border-cloud-200' },
  nota: { label: 'Nota interna', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  archivo: { label: 'Adjunto', badge: 'bg-mist-50 text-mist-700 border-mist-200' },
  rol: { label: 'Rol', badge: 'bg-ink-800 text-white border-ink-800' },
};

// Secciones: cada una agrupa varias acciones relacionadas.
const SECCIONES = [
  { key: 'tickets', titulo: 'Tickets', desc: 'Creacion, estado, responsable y datos', acciones: ['ticket_creado', 'estado', 'responsable', 'datos'] },
  { key: 'conversacion', titulo: 'Mensajes y notas', desc: 'Chat y notas internas', acciones: ['mensaje', 'nota'] },
  { key: 'adjuntos', titulo: 'Adjuntos', desc: 'Evidencia subida', acciones: ['archivo'] },
  { key: 'usuarios', titulo: 'Usuarios y roles', desc: 'Cambios de rol', acciones: ['rol'] },
];
const ACCIONES_CONOCIDAS = SECCIONES.flatMap((s) => s.acciones);

// id de ticket asociado al log (numerico). ticket_creado guarda el FOLIO (no numerico) -> no navega.
const idTicket = (l) => {
  const n = Number(l.entidad_id);
  return l.entidad === 'ticket' && Number.isInteger(n) && n > 0 ? n : null;
};

const IconChevron = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
);

const LogItem = ({ l, onAbrir }) => {
  const a = ACCION[l.accion] || { label: l.accion, badge: 'bg-cloud-100 text-ink-600 border-cloud-200' };
  const clickable = idTicket(l) !== null;
  const accionTxt = l.accion === 'archivo' ? 'Ver adjunto' : 'Ver ticket';
  return (
    <li
      onClick={clickable ? () => onAbrir(l) : undefined}
      className={`px-4 py-3 flex items-start gap-3 ${clickable ? 'cursor-pointer hover:bg-cloud-50 transition-colors' : ''}`}
    >
      <span className={`mt-0.5 text-[11px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 shrink-0 ${a.badge}`}>
        {a.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-800 break-words">
          {l.detalle || '-'}
          {l.entidad_id && <span className="text-ink-400"> · {l.entidad === 'usuario' ? 'nomina' : 'ticket'} {l.entidad_id}</span>}
        </p>
        <p className="text-[11px] text-ink-400 mt-0.5">
          {l.actor_nombre || 'Sistema'}{l.actor_nomina != null ? ` (${l.actor_nomina})` : ''} · {fmtFechaHora(l.created_at)}
        </p>
      </div>
      {clickable && (
        <span className="shrink-0 self-center text-[11px] font-bold text-mist-600 flex items-center gap-0.5">
          {accionTxt}<IconChevron />
        </span>
      )}
    </li>
  );
};

const Seccion = ({ titulo, desc, items, onAbrir }) => (
  <div className="bg-white border border-cloud-200 rounded-2xl overflow-hidden">
    <div className="px-5 py-3.5 border-b border-cloud-200 bg-cloud-50 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">{titulo}</h2>
        <p className="text-[11px] text-ink-400 font-medium">{desc}</p>
      </div>
      <span className="text-xs font-bold text-ink-500 shrink-0">{items.length}</span>
    </div>
    {items.length === 0 ? (
      <p className="text-xs text-ink-400 px-5 py-4">Sin registros.</p>
    ) : (
      <ul className="divide-y divide-cloud-100">
        {items.map((l) => <LogItem key={l.id} l={l} onAbrir={onAbrir} />)}
      </ul>
    )}
  </div>
);

const Logs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('todos');
  const [visor, setVisor] = useState({ open: false, ticketId: null, archivo: null });

  const cargar = useCallback(() => {
    setLoading(true);
    logsApi.listar({ search: search || undefined })
      .then(({ data }) => setLogs(data.data || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(cargar, 250);
    return () => clearTimeout(t);
  }, [cargar]);

  // Click en un log: los de adjunto abren el visor con ESE archivo; el resto (mensaje,
  // nota, estado, responsable, datos) navegan al ticket correspondiente.
  const abrirLog = useCallback(async (l) => {
    const idT = idTicket(l);
    if (!idT) return;
    if (l.accion === 'archivo') {
      try {
        const { data } = await ticketsApi.archivos(idT);
        const lista = data.data || [];
        const nombre = (l.detalle || '').replace(/^Adjunto:\s*/i, '').trim();
        const arch = lista.find((x) => x.nombre_original === nombre) || lista[0];
        if (arch) { setVisor({ open: true, ticketId: idT, archivo: arch }); return; }
      } catch { /* si falla, al menos abre el ticket */ }
    }
    navigate(`/tickets/${idT}`);
  }, [navigate]);

  // Agrupa los logs por seccion (+ "Otros" para acciones no catalogadas).
  const grupos = useMemo(() => {
    const base = SECCIONES.map((s) => ({ ...s, items: logs.filter((l) => s.acciones.includes(l.accion)) }));
    const otros = logs.filter((l) => !ACCIONES_CONOCIDAS.includes(l.accion));
    if (otros.length) base.push({ key: 'otros', titulo: 'Otros', desc: 'Otras acciones', items: otros });
    return base.filter((s) => s.items.length > 0);
  }, [logs]);

  // Pestañas del submenu (con conteo). "Todos" es la opcion por defecto.
  const tabs = useMemo(() => {
    const arr = [{ key: 'todos', titulo: 'Todos', count: logs.length }];
    for (const s of SECCIONES) {
      arr.push({ key: s.key, titulo: s.titulo, count: logs.filter((l) => s.acciones.includes(l.accion)).length });
    }
    const otros = logs.filter((l) => !ACCIONES_CONOCIDAS.includes(l.accion)).length;
    if (otros) arr.push({ key: 'otros', titulo: 'Otros', count: otros });
    return arr;
  }, [logs]);

  // Contenido segun la pestaña activa.
  const seccionDef = SECCIONES.find((s) => s.key === tab)
    || (tab === 'otros' ? { key: 'otros', titulo: 'Otros', desc: 'Otras acciones', acciones: null } : null);
  const itemsTab = tab === 'todos'
    ? null
    : (seccionDef?.acciones ? logs.filter((l) => seccionDef.acciones.includes(l.accion)) : logs.filter((l) => !ACCIONES_CONOCIDAS.includes(l.accion)));

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Logs</h1>
        <p className="text-ink-500 font-medium mt-1">Historico global. Da clic en un registro para ver el adjunto o abrir su ticket.</p>
      </motion.div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por actor, detalle o folio/nomina..."
        className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500 mb-3"
      />

      {/* Submenu de tipos de log (Todos por defecto) */}
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((tt) => (
          <button
            key={tt.key}
            onClick={() => setTab(tt.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${tab === tt.key ? 'bg-ink-800 text-white border-ink-800' : 'bg-white text-ink-600 border-cloud-300 hover:bg-cloud-100'}`}
          >
            {tt.titulo}
            <span className={`ml-1.5 ${tab === tt.key ? 'text-cloud-300' : 'text-ink-400'}`}>{tt.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : tab === 'todos' ? (
        grupos.length === 0 ? (
          <div className="bg-white border border-cloud-200 rounded-xl py-16 text-center">
            <p className="text-sm font-semibold text-ink-900">Sin registros</p>
            <p className="text-xs text-ink-400 font-medium mt-1">No hay acciones que coincidan con la busqueda.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {grupos.map((g) => <Seccion key={g.key} titulo={g.titulo} desc={g.desc} items={g.items} onAbrir={abrirLog} />)}
          </div>
        )
      ) : (
        <Seccion titulo={seccionDef?.titulo || 'Seccion'} desc={seccionDef?.desc || ''} items={itemsTab || []} onAbrir={abrirLog} />
      )}

      <VisorArchivo
        open={visor.open}
        ticketId={visor.ticketId}
        archivo={visor.archivo}
        onClose={() => setVisor({ open: false, ticketId: null, archivo: null })}
      />
    </div>
  );
};

export default Logs;
