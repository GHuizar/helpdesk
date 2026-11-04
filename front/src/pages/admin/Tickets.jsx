import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ticketsApi } from '../../api/ticketsApi';
import Spinner from '../../components/ui/Spinner';
import NuevoTicketModal from '../../components/forms/NuevoTicketModal';
import { estadoLabel, estadoBadge, estadoDesc, fmtFechaHora, fmtAntiguedad, fechaMX, hoyMX, ESTADO_LABEL } from '../../utils/estados';

// Estado persistido en localStorage (sobrevive recargas y re-entradas a la pantalla).
const useLocalState = (key, initial) => {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* almacenamiento no disponible */ } }, [key, v]);
  return [v, setV];
};

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" /></svg>
);
// Burbuja de chat (para el badge de mensajes nuevos del listado).
const IconMsg = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M4 3h16a1 1 0 011 1v12a1 1 0 01-1 1h-8l-5 4v-4H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
  </svg>
);
const IconChevron = ({ abierto }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${abierto ? '' : '-rotate-90'}`}><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
);

// Pestañas de estado. "Activos" = abierto/en curso/por validar; "Finalizados" = validado.
const GRUPO_TAB = {
  todos: null,
  activos: ['abierto', 'en_curso', 'finalizado'],
  finalizados: ['validado'],
};
const TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Activos' },
  { key: 'finalizados', label: 'Finalizados' },
];

// Una fila del listado. Es un enlace real (<a href="/tickets/:id">) para permitir abrir en
// otra pestaña con clic central / clic derecho / Ctrl+clic, ademas del clic normal.
const FilaTicket = ({ tk }) => {
  const responsable = tk.responsable_nombre?.trim() || (tk.responsable_nomina != null ? `Nomina ${tk.responsable_nomina}` : 'Sin asignar');
  const nuevos = Number(tk.nuevos_para_staff || 0); // mensajes nuevos del usuario sin responder
  const contactado = Number(tk.mensajes_staff || 0) > 0; // el operador ya escribio
  return (
    <li>
      <Link
        to={`/tickets/${tk.id}`}
        className="relative block cursor-pointer px-4 py-3 hover:bg-cloud-50 transition-colors md:grid md:grid-cols-12 md:gap-3 md:items-center"
      >
        {/* Doblez de hoja (esquina superior derecha): ya se envio mensaje de un operador */}
        {contactado && (
          <span
            title="Ya se envió mensaje de un operador a este ticket"
            className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-l-[16px] border-t-mist-500 border-l-transparent"
          />
        )}
        <div className="md:col-span-1 flex items-center gap-2">
          <span className="font-bold text-ink-900 text-sm">{tk.folio || `#${tk.id}`}</span>
          <span className={`md:hidden ml-auto text-[11px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 shrink-0 ${estadoBadge(tk.estado)}`}>
            {estadoLabel(tk.estado)}
          </span>
        </div>
        {/* Descripcion del estado (movil) */}
        <p className="md:hidden text-[11px] text-ink-400 mt-1">{estadoDesc(tk.estado)}</p>
        <div className="md:col-span-3 min-w-0 mt-1 md:mt-0">
          <p className="text-sm text-ink-800 truncate">{tk.nombre}</p>
          <p className="text-[11px] text-ink-400">Nomina: {tk.nomina ?? 'Invitado'}</p>
        </div>
        <div className="md:col-span-3 min-w-0 text-sm text-ink-600 truncate mt-0.5 md:mt-0">
          <span className="md:hidden text-[11px] font-bold text-ink-400 uppercase tracking-widest">Resp.: </span>{responsable}
        </div>
        <div className="md:col-span-1 text-sm text-ink-600 truncate mt-0.5 md:mt-0">
          <span className="md:hidden text-[11px] font-bold text-ink-400 uppercase tracking-widest">Tipo: </span>{tk.tipo_nombre || '-'}
        </div>
        {/* Estado + descripcion (desktop) */}
        <div className="hidden md:block md:col-span-2">
          <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${estadoBadge(tk.estado)}`}>
            {estadoLabel(tk.estado)}
          </span>
          <p className="text-[11px] text-ink-400 mt-1 leading-tight">{estadoDesc(tk.estado)}</p>
        </div>
        <div className="md:col-span-1 flex items-center gap-2 justify-center text-xs text-ink-500 font-medium mt-1 md:mt-0">
          <span title={fmtFechaHora(tk.created_at)}>
            <span className="md:hidden text-[11px] font-bold text-ink-400 uppercase tracking-widest">Hace: </span><span className="tabular-nums">{fmtAntiguedad(tk.created_at)}</span>
          </span>
        </div>
        <div className="md:col-span-1 text-sm text-ink-600 truncate mt-0.5 md:mt-0 px-0 mx-0 flex items-center justify-center gap-1">
          {nuevos > 0 && (
            <span
              title={`${nuevos} mensaje${nuevos === 1 ? '' : 's'} nuevo${nuevos === 1 ? '' : 's'} del usuario sin responder`}
              className="inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-1.5 py-0.5 shrink-0 border bg-amber-100 text-amber-700 border-amber-300 tabular-nums"
            >
              <IconMsg />{nuevos}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
};

// Tabla de tickets: encabezado (desktop) + filas.
const TablaTickets = ({ items }) => (
  <div className="bg-white border border-cloud-200 rounded-xl overflow-hidden">
    <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-cloud-200 bg-cloud-50 text-[11px] font-bold uppercase tracking-widest text-ink-400">
      <div className="col-span-1">Folio</div>
      <div className="col-span-3">Solicitante</div>
      <div className="col-span-3">Responsable</div>
      <div className="col-span-1">Tipo</div>
      <div className="col-span-2">Estado</div>
      <div className="col-span-1 text-center">Tiempo</div>
      <div className="col-span-1"></div>
    </div>
    <ul className="divide-y divide-cloud-100">
      {items.map((tk) => <FilaTicket key={tk.id} tk={tk} />)}
    </ul>
  </div>
);

const SeccionVacia = ({ texto }) => (
  <div className="bg-white border border-cloud-200 rounded-xl py-8 text-center">
    <p className="text-xs text-ink-400 font-medium">{texto}</p>
  </div>
);

const SEL_CLS = 'bg-white border border-cloud-300 text-ink-700 text-xs rounded-lg px-2.5 py-1.5 min-h-9 outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500 transition-[border-color,box-shadow] duration-150';

// Seccion con su titulo, pestañas (Todos / Activos / Finalizados) y filtros. El filtrado es local
// (los tickets ya vienen cargados) y las preferencias se guardan por seccion (storeKey) en localStorage.
//  - conFiltros: agrega filtros por responsable, tipo y solicitante (Tickets generales).
//  - colapsable: permite ocultar/mostrar toda la seccion (Mis tickets).
//  - permiteResueltosHoy: agrega el filtro "Resueltos hoy" (Mis tickets).
const SeccionTickets = ({ titulo, items, vacio, storeKey, conFiltros = false, colapsable = false, permiteResueltosHoy = false }) => {
  const [pref, setPref] = useLocalState(`tk.sec.${storeKey}`, {
    tab: 'todos', estado: '', fResp: '', fTipo: '', fSol: '', collapsed: false, hoy: false,
  });
  const set = (patch) => setPref((p) => ({ ...p, ...patch }));

  // Opciones para los selects de responsable / tipo (derivadas de los tickets de la seccion).
  const { responsables, tipos } = useMemo(() => {
    const r = new Map();
    const t = new Set();
    for (const tk of items) {
      if (tk.responsable_nomina != null) r.set(String(tk.responsable_nomina), tk.responsable_nombre?.trim() || `Nomina ${tk.responsable_nomina}`);
      if (tk.tipo_nombre) t.add(tk.tipo_nombre);
    }
    return { responsables: [...r.entries()].sort((a, b) => a[1].localeCompare(b[1])), tipos: [...t].sort() };
  }, [items]);

  const hoyActivo = permiteResueltosHoy && pref.hoy;
  const grupo = GRUPO_TAB[pref.tab];
  const filtrados = useMemo(() => {
    let arr;
    if (hoyActivo) {
      // "Resueltos hoy": lo que el operador finalizo hoy (por validar + finalizados), ignora las pestañas.
      const hoy = hoyMX();
      arr = items.filter((t) => t.finalizado_at && fechaMX(t.finalizado_at) === hoy);
    } else {
      arr = grupo ? items.filter((t) => grupo.includes(t.estado)) : items;
      if (pref.estado) arr = arr.filter((t) => t.estado === pref.estado);
    }
    if (conFiltros) {
      if (pref.fResp === '__sin__') arr = arr.filter((t) => t.responsable_nomina == null);
      else if (pref.fResp) arr = arr.filter((t) => String(t.responsable_nomina ?? '') === pref.fResp);
      if (pref.fTipo) arr = arr.filter((t) => (t.tipo_nombre || '') === pref.fTipo);
      if (pref.fSol.trim()) {
        const q = pref.fSol.trim().toLowerCase();
        arr = arr.filter((t) => (t.nombre || '').toLowerCase().includes(q) || String(t.nomina ?? '').includes(q));
      }
    }
    return arr;
  }, [items, grupo, hoyActivo, pref, conFiltros]);

  const countTab = (k) => {
    const g = GRUPO_TAB[k];
    return g ? items.filter((t) => g.includes(t.estado)).length : items.length;
  };
  const countHoy = useMemo(() => {
    if (!permiteResueltosHoy) return 0;
    const hoy = hoyMX();
    return items.filter((t) => t.finalizado_at && fechaMX(t.finalizado_at) === hoy).length;
  }, [items, permiteResueltosHoy]);

  const estadosSelect = pref.tab === 'activos' ? GRUPO_TAB.activos : Object.keys(ESTADO_LABEL);
  const cambiarTab = (k) => set({ tab: k, estado: '', hoy: false });

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-3 flex items-center gap-2">
        {colapsable ? (
          <button onClick={() => set({ collapsed: !pref.collapsed })} className="inline-flex items-center gap-1.5 text-ink-700 hover:text-ink-900 transition-colors" title={pref.collapsed ? 'Mostrar' : 'Ocultar'}>
            <IconChevron abierto={!pref.collapsed} />{titulo}
          </button>
        ) : titulo}
        <span className="text-xs font-medium text-ink-400 tabular-nums">{items.length}</span>
        {colapsable && pref.collapsed && <span className="text-[11px] font-medium text-ink-400 normal-case tracking-normal">(oculto)</span>}
      </h2>

      {!(colapsable && pref.collapsed) && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {TABS.map((tt) => (
              <button
                key={tt.key}
                onClick={() => cambiarTab(tt.key)}
                className={`text-xs font-bold px-3.5 py-1.5 min-h-9 inline-flex items-center rounded-full border transition-[background-color,border-color,color,scale] duration-150 ease-salida active:scale-[0.96] active:duration-100 ${pref.tab === tt.key && !hoyActivo ? 'bg-ink-800 text-white border-ink-800' : 'bg-white text-ink-600 border-cloud-300 hover:bg-cloud-100'}`}
              >
                {tt.label}
                <span className={`ml-1.5 tabular-nums ${pref.tab === tt.key && !hoyActivo ? 'text-cloud-300' : 'text-ink-400'}`}>{countTab(tt.key)}</span>
              </button>
            ))}
            {/* Resueltos hoy (solo Mis tickets) */}
            {permiteResueltosHoy && (
              <button
                onClick={() => set({ hoy: !pref.hoy })}
                className={`text-xs font-bold px-3.5 py-1.5 min-h-9 inline-flex items-center rounded-full border transition-[background-color,border-color,color,scale] duration-150 ease-salida active:scale-[0.96] active:duration-100 ${hoyActivo ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'}`}
                title="Lo que resolviste hoy (por validar + finalizados)"
              >
                Resueltos hoy
                <span className={`ml-1.5 tabular-nums ${hoyActivo ? 'text-emerald-100' : 'text-emerald-500'}`}>{countHoy}</span>
              </button>
            )}
            {/* Filtro por estado (solo en Todos y Activos, y sin "resueltos hoy") */}
            {!hoyActivo && pref.tab !== 'finalizados' && (
              <select value={pref.estado} onChange={(e) => set({ estado: e.target.value })} className={`ml-auto ${SEL_CLS}`}>
                <option value="">Todos los estados</option>
                {estadosSelect.map((k) => <option key={k} value={k}>{ESTADO_LABEL[k]}</option>)}
              </select>
            )}
          </div>

          {/* Filtros extra (solo Tickets generales): responsable, tipo, solicitante */}
          {conFiltros && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <select value={pref.fResp} onChange={(e) => set({ fResp: e.target.value })} className={SEL_CLS}>
                <option value="">Todos los responsables</option>
                <option value="__sin__">Sin asignar</option>
                {responsables.map(([nom, nombre]) => <option key={nom} value={nom}>{nombre}</option>)}
              </select>
              <select value={pref.fTipo} onChange={(e) => set({ fTipo: e.target.value })} className={SEL_CLS}>
                <option value="">Todos los tipos</option>
                {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={pref.fSol} onChange={(e) => set({ fSol: e.target.value })} placeholder="Filtrar por solicitante..." className={`${SEL_CLS} min-w-[10rem]`} />
              {(pref.fResp || pref.fTipo || pref.fSol) && (
                <button onClick={() => set({ fResp: '', fTipo: '', fSol: '' })} className="text-[11px] font-bold text-ink-400 hover:text-ink-700">Limpiar</button>
              )}
            </div>
          )}

          {filtrados.length ? <TablaTickets items={filtrados} /> : <SeccionVacia texto={vacio || 'Sin tickets en este filtro.'} />}
        </>
      )}
    </section>
  );
};

const Tickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useLocalState('tk.search', '');
  const [openManual, setOpenManual] = useState(false);

  const cargar = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    ticketsApi
      .listar({ search: search || undefined }) // el filtro por estado es local (pestañas)
      .then(({ data }) => setTickets(data.data || []))
      .catch(() => { if (!silent) setTickets([]); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => cargar(), 250); // carga inicial (debounce del search)
    const intervalo = setInterval(() => cargar(true), 30000); // refresco silencioso cada 30s
    return () => { clearTimeout(t); clearInterval(intervalo); };
  }, [cargar]);

  // Divide entre los que tengo asignados (soy el responsable) y los demas.
  const { mios, otros } = useMemo(() => {
    const n = user?.nomina;
    const a = [];
    const b = [];
    for (const t of tickets) {
      if (n != null && t.responsable_nomina != null && Number(t.responsable_nomina) === Number(n)) a.push(t);
      else b.push(t);
    }
    return { mios: a, otros: b };
  }, [tickets, user]);

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink-900">Tickets</h1>
          <p className="text-ink-500 font-medium mt-1">Visualización de tickets.</p>
        </div>
        <button
          onClick={() => setOpenManual(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 bg-ink-800 text-white font-bold text-sm px-4 py-2.5 min-h-10 rounded-lg shadow-sm shadow-ink-900/10 hover:bg-ink-900 transition-[background-color,scale] duration-150 ease-salida active:scale-[0.96] active:duration-100 self-start"
        >
          <IconPlus />
          Crear ticket manual
        </button>
      </motion.div>

      {/* Buscador (el estado se filtra por pestañas dentro de cada seccion) */}
      <div className="mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por folio, nombre, nomina o problema..."
          className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 min-h-10 outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500 transition-[border-color,box-shadow] duration-150"
        />
      </div>

      {/* Lista dividida: mis tickets / tickets generales */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : tickets.length === 0 ? (
        <div className="bg-white border border-cloud-200 rounded-xl py-16 text-center">
          <p className="text-sm font-semibold text-ink-900">Sin tickets</p>
          <p className="text-xs text-ink-400 font-medium mt-1">No hay tickets que coincidan con la busqueda.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <SeccionTickets titulo="Mis tickets" items={mios} storeKey="mios" vacio="No tienes tickets asignados a tu nombre." colapsable permiteResueltosHoy />
          <SeccionTickets titulo="Tickets generales" items={otros} storeKey="otros" vacio="No hay otros tickets." conFiltros />
        </div>
      )}

      <NuevoTicketModal open={openManual} onClose={() => setOpenManual(false)} modo="operador" onCreated={cargar} />
    </div>
  );
};

export default Tickets;
