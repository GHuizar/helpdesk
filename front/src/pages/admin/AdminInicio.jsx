import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ticketsApi } from '../../api/ticketsApi';
import NuevoTicketModal from '../../components/forms/NuevoTicketModal';
import Spinner from '../../components/ui/Spinner';
import { estadoLabel, estadoBadge, fmtMin, fmtAntiguedad } from '../../utils/estados';

// Tonos por tipo de metrica (franja de color + valor).
const TONOS = {
  mist: { barra: 'bg-mist-500', texto: 'texto-acento' },
  amber: { barra: 'bg-amber-500', texto: 'text-amber-600' },
  emerald: { barra: 'bg-emerald-500', texto: 'text-emerald-600' },
  red: { barra: 'bg-red-500', texto: 'text-red-600' },
  ink: { barra: 'bg-ink-400', texto: 'text-ink-700' },
  gold: { barra: 'bg-yellow-400', texto: 'text-yellow-500' },
};

// Tarjeta de metrica: franja de color a la izquierda + sombra (glow del acento en oscuro).
const Stat = ({ label, value, hint, tono = 'ink' }) => {
  const c = TONOS[tono] || TONOS.ink;
  return (
    <div className="glow-card bg-white border border-cloud-200 rounded-xl p-5 shadow-sm">
      <p className="flex items-center gap-2 text-[11px] font-bold text-ink-400 uppercase tracking-widest">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.barra}`} />
        {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-extrabold mt-1.5 leading-none tabular-nums ${c.texto}`}>{value}</p>
      {hint && <p className="text-xs text-ink-400 font-medium mt-1.5">{hint}</p>}
    </div>
  );
};

// Tarjeta con encabezado de color (toma el acento del menu) + triada hoy / semana / mes.
const Trio = ({ titulo, hoy, semana, mes }) => (
  <div className="glow-card bg-white border border-cloud-200 rounded-2xl overflow-hidden shadow-sm">
    <div className="bg-mist-600 px-5 py-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white">{titulo}</h2>
    </div>
    <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center p-4 sm:p-5">
      {[['Hoy', hoy], ['Semana', semana], ['Mes', mes]].map(([l, v]) => (
        <div key={l}>
          <p className="text-xl sm:text-2xl font-extrabold text-ink-900 leading-none tabular-nums">{v}</p>
          <p className="text-[11px] sm:text-[11px] font-bold text-ink-400 uppercase tracking-widest mt-1.5">{l}</p>
        </div>
      ))}
    </div>
  </div>
);

const AdminInicio = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const nombre = user?.name || 'Operador';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openManual, setOpenManual] = useState(false);

  const cargar = useCallback(() => {
    ticketsApi.misStats()
      .then(({ data }) => setStats(data.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const e = stats?.estados || {};
  const prom = stats?.promedios || {};
  const horas = stats?.horas || {};
  const res = stats?.resueltos || {};
  const longevos = stats?.longevos || [];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-ink-900">Hola, {nombre}</h1>
          <p className="text-ink-500 font-medium mt-2 max-w-2xl text-sm sm:text-base">
            Tu resumen de {isAdmin ? 'administracion' : 'operacion'}: lo que tienes asignado, lo que has
            resuelto y tus tiempos de atencion.
          </p>
        </div>
        <button
          onClick={() => setOpenManual(true)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 bg-ink-800 text-white font-bold text-sm px-4 py-2.5 min-h-10 rounded-lg shadow-sm shadow-ink-900/10 hover:bg-ink-900 transition-[background-color,scale] duration-150 ease-salida active:scale-[0.96] active:duration-100 self-start shrink-0"
        >
          + Crear ticket manual
        </button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner className="h-7 w-7" /></div>
      ) : (
        <>
          {/* Mis tickets asignados */}
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-3">Mis tickets asignados</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <Stat label="Sin tomar" value={e.abierto ?? 0} hint="Esperan que los tomes" tono="red" />
            <Stat label="En curso" value={e.en_curso ?? 0} hint="En atencion ahora" tono="amber" />
            <Stat label="Por validar" value={e.finalizado ?? 0} hint="Esperan al usuario" tono="gold" />
            <Stat label="Total asignados" value={stats?.asignados_total ?? 0} hint="Historico a tu cargo" tono="ink" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5">
            <Trio titulo="Tickets que resolviste" hoy={res.dia ?? 0} semana={res.semana ?? 0} mes={res.mes ?? 0} />
            <Trio titulo="Horas invertidas (en curso)" hoy={fmtMin(horas.dia_min)} semana={fmtMin(horas.semana_min)} mes={fmtMin(horas.mes_min)} />
          </div>

          {/* Mis tiempos promedio */}
          <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-3">Mis tiempos promedio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
            <Stat label="Primera atencion" value={fmtMin(prom.primera_atencion_min)} hint="Desde que entra hasta que lo tomas" tono="mist" />
            <Stat label="Primer contacto" value={fmtMin(prom.primera_respuesta_min)} hint="Hasta tu primer mensaje" tono="mist" />
            <Stat label="Resolucion total" value={fmtMin(prom.resolucion_min)} hint="Desde que entra hasta validarse" tono="emerald" />
          </div>

          {/* Mis pendientes mas antiguos */}
          <div className="glow-card bg-white border border-cloud-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-cloud-200">
              <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">Tus pendientes mas antiguos</h2>
            </div>
            {longevos.length === 0 ? (
              <p className="text-sm text-ink-400 p-6 text-center">No tienes tickets pendientes. Buen trabajo.</p>
            ) : (
              <ul className="divide-y divide-cloud-100">
                {longevos.map((t) => (
                  <li key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className="glow-hover cursor-pointer px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 hover:bg-cloud-50 transition-colors">
                    <div className="shrink-0 w-16 sm:w-24 text-center">
                      <p className="text-xs sm:text-sm font-extrabold text-ink-900 leading-tight tabular-nums">{fmtAntiguedad(t.created_at)}</p>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400">abierto hace</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-900">{t.folio || `#${t.id}`}</p>
                      <p className="text-xs text-ink-500 truncate">{t.tipo_nombre || 'Sin tipo'} · {t.departamento || 'Sin depto'} · {t.nombre || ''}</p>
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 shrink-0 ${estadoBadge(t.estado)}`}>
                      {estadoLabel(t.estado)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <NuevoTicketModal open={openManual} onClose={() => setOpenManual(false)} modo="operador" onCreated={cargar} />
    </div>
  );
};

export default AdminInicio;
