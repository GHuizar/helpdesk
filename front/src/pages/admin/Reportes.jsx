import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ticketsApi } from '../../api/ticketsApi';
import Spinner from '../../components/ui/Spinner';
import { estadoLabel, estadoBadge, fmtFecha, fmtAntiguedad, fmtMin } from '../../utils/estados';

// Barras horizontales (items: [{label, total}]).
const Barras = ({ items, color = 'bg-ink-700' }) => {
  const max = Math.max(1, ...items.map((i) => Number(i.total)));
  return (
    <div className="space-y-2.5">
      {items.length === 0 ? (
        <p className="text-xs text-ink-400">Sin datos.</p>
      ) : (
        items.map((it, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-ink-700 truncate pr-2">{it.label || '-'}</span>
              <span className="text-xs font-bold text-ink-900 shrink-0">{it.total}</span>
            </div>
            <div className="h-2 rounded-full bg-cloud-100 overflow-hidden">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${(Number(it.total) / max) * 100}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const Stat = ({ label, value, hint, accent = 'text-ink-900' }) => (
  <div className="glow-card bg-white border border-cloud-200 rounded-xl p-4 shadow-sm">
    <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest">{label}</p>
    <p className={`text-2xl font-extrabold mt-1 leading-none ${accent}`}>{value}</p>
    {hint && <p className="text-[11px] text-ink-400 font-medium mt-1.5 leading-tight">{hint}</p>}
  </div>
);

const Trio = ({ titulo, hoy, semana, mes }) => (
  <div className="glow-card bg-white border border-cloud-200 rounded-2xl p-5 shadow-sm">
    <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-4">{titulo}</h2>
    <div className="grid grid-cols-3 gap-3 text-center">
      {[['Hoy', hoy], ['Semana', semana], ['Mes', mes]].map(([l, v]) => (
        <div key={l}>
          <p className="text-2xl font-extrabold text-ink-900 leading-none">{v}</p>
          <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mt-1.5">{l}</p>
        </div>
      ))}
    </div>
  </div>
);

const Panel = ({ titulo, children }) => (
  <div className="glow-card bg-white border border-cloud-200 rounded-2xl p-5 shadow-sm">
    <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-4">{titulo}</h2>
    {children}
  </div>
);

const Reportes = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsApi.reportes()
      .then(({ data }) => setData(data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-7 w-7" /></div>;
  if (!data) return <div className="p-8 text-center text-ink-500">No se pudieron cargar los reportes.</div>;

  const r = data.resumen || {};
  const sup = data.supervision || {};
  const prom = data.promedios || {};
  const horas = data.horas || {};
  const res = data.resueltos || {};
  const lista = (arr, campo) => (arr || []).map((x) => ({ label: x[campo] ?? '-', total: x.total }));
  const personas = (arr) => (arr || []).map((x) => ({ label: x.nombre || `Nomina ${x.nomina}`, total: x.total }));

  return (
    <div className="p-5 sm:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Reportes</h1>
        <p className="text-ink-500 font-medium mt-1">Indicadores del area para supervision y mejora.</p>
      </motion.div>

      {/* Indicadores clave para supervision */}
      <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-3">Indicadores clave</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Total tickets" value={data.total ?? 0} hint="Historico" />
        <Stat label="Tasa de resolucion" value={`${sup.tasa_resolucion ?? 0}%`} hint="Finalizados / total" accent="text-emerald-600" />
        <Stat label="Pendientes (backlog)" value={sup.backlog ?? 0} hint="Abiertos + en curso" accent="text-amber-600" />
        <Stat label="Sin atender +3d" value={sup.sin_atender_3d ?? 0} hint="Abiertos olvidados" accent={sup.sin_atender_3d ? 'text-red-600' : 'text-ink-900'} />
      </div>

      {/* Tiempos promedio */}
      <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-3">Tiempos promedio</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Primera atencion" value={fmtMin(prom.primera_atencion_min)} hint="Desde que entra hasta que se toma" />
        <Stat label="Primer contacto" value={fmtMin(prom.primera_respuesta_min)} hint="Hasta el primer mensaje al usuario" />
        <Stat label="Resolucion total" value={fmtMin(prom.resolucion_min)} hint="Desde que entra hasta validarse" />
      </div>

      {/* Horas invertidas + resueltos por rango */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        <Trio titulo="Horas invertidas (en curso)" hoy={fmtMin(horas.dia_min)} semana={fmtMin(horas.semana_min)} mes={fmtMin(horas.mes_min)} />
        <Trio titulo="Tickets resueltos" hoy={res.dia ?? 0} semana={res.semana ?? 0} mes={res.mes ?? 0} />
      </div>

      {/* Tendencia */}
      <Panel titulo="Tendencia (ultimos 14 dias)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.serie || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gCre" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#64748b" stopOpacity={0.35} /><stop offset="100%" stopColor="#64748b" stopOpacity={0} /></linearGradient>
                <linearGradient id="gCer" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9aa3ad' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9aa3ad' }} tickLine={false} axisLine={false} width={28} />
              <Tooltip />
              <Area type="monotone" dataKey="creados" name="Creados" stroke="#64748b" strokeWidth={2} fill="url(#gCre)" />
              <Area type="monotone" dataKey="cerrados" name="Cerrados" stroke="#10b981" strokeWidth={2} fill="url(#gCer)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px] font-semibold text-ink-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-slate-500" /> Creados</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-emerald-500" /> Cerrados</span>
        </div>
      </Panel>

      {/* Personas */}
      <div className="grid lg:grid-cols-2 gap-5 my-5">
        <Panel titulo="Personas que mas solicitan"><Barras items={personas(data.solicitantes)} color="bg-mist-600" /></Panel>
        <Panel titulo="Personas que mas resuelven"><Barras items={personas(data.resolutores)} color="bg-emerald-600" /></Panel>
      </div>

      {/* Carga + areas + tipos */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <Panel titulo="Carga activa por operador"><Barras items={personas(sup.carga_operador)} color="bg-amber-500" /></Panel>
        <Panel titulo="Areas que mas piden"><Barras items={lista(data.por_departamento, 'departamento').slice(0, 8)} /></Panel>
        <Panel titulo="Por tipo de ticket"><Barras items={lista(data.por_tipo, 'tipo').slice(0, 8)} color="bg-mist-500" /></Panel>
      </div>

      {/* Estados + longevos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Abiertos" value={r.abierto ?? 0} accent="texto-acento" />
        <Stat label="En curso" value={r.en_curso ?? 0} accent="text-amber-600" />
        <Stat label="Por validar" value={r.finalizado ?? 0} accent="text-amber-600" />
        <Stat label="Finalizados" value={r.validado ?? 0} accent="text-emerald-700" />
      </div>

      <div className="glow-card bg-white border border-cloud-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-cloud-200">
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">Tickets mas longevos (sin cerrar)</h2>
        </div>
        {(data.longevos || []).length === 0 ? (
          <p className="text-sm text-ink-400 p-6 text-center">No hay tickets pendientes.</p>
        ) : (
          <ul className="divide-y divide-cloud-100">
            {data.longevos.map((t) => (
              <li key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className="cursor-pointer px-5 py-3 flex items-center gap-4 hover:bg-cloud-50 transition-colors">
                <div className="shrink-0 w-24 text-center">
                  <p className="text-sm font-extrabold text-ink-900 leading-tight">{fmtAntiguedad(t.created_at)}</p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">abierto hace</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink-900">{t.folio || `#${t.id}`}</p>
                  <p className="text-xs text-ink-500 truncate">{t.tipo_nombre || 'Sin tipo'} · {t.departamento || 'Sin depto'} · desde {fmtFecha(t.created_at)}</p>
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 shrink-0 ${estadoBadge(t.estado)}`}>
                  {estadoLabel(t.estado)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Reportes;
