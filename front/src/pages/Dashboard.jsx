import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ticketsApi } from '../api/ticketsApi';
import Spinner from '../components/ui/Spinner';
import NuevoTicketModal from '../components/forms/NuevoTicketModal';
import { estadoLabel, estadoBadge, fmtFechaHora } from '../utils/estados';

const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" /></svg>
);
const IconTicket = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
);
// Burbuja de chat (badge de mensajes nuevos del operador en el listado).
const IconMsg = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M4 3h16a1 1 0 011 1v12a1 1 0 01-1 1h-8l-5 4v-4H4a1 1 0 01-1-1V4a1 1 0 011-1z" /></svg>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nombre = user?.name || 'Usuario';

  const [openNuevo, setOpenNuevo] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    ticketsApi
      .misTickets()
      .then(({ data }) => setTickets(data.data || []))
      .catch(() => { if (!silent) setTickets([]); })
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(() => cargar(true), 30000); // refresco silencioso cada 30s
    return () => clearInterval(intervalo);
  }, [cargar]);

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">

      {/* Encabezado */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink-900">Hola, {nombre}</h1>
        <p className="text-ink-500 font-medium mt-2 max-w-2xl">
          Levanta un ticket de soporte y da seguimiento.
        </p>
      </motion.div>

      {/* ZONA 1: Crear ticket (CTA, color solido sin degradado) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        <div className="dash-cta rounded-2xl bg-mist-500 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white tracking-tight">Crear un nuevo ticket</h2>
            <p className="text-mist-100 text-sm font-medium mt-1 max-w-lg">
              Describe tu problema y lo asignaremos al area correspondiente.
            </p>
          </div>
          <button
            onClick={() => setOpenNuevo(true)}
            className="btn-claro-dark cursor-pointer shrink-0 inline-flex items-center justify-center gap-2 bg-white text-mist-700 font-bold text-sm px-5 py-3 min-h-11 rounded-xl hover:bg-mist-50 transition-[background-color,scale] duration-150 ease-salida active:scale-[0.96] active:duration-100"
          >
            <IconPlus />
            Crear ticket
          </button>
        </div>
      </motion.div>

      {/* ZONA 2: Mis tickets (estilo lista) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mist-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">Mis tickets</h2>
          </div>
          <span className="text-xs font-medium text-ink-400 tabular-nums">{tickets.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-mist-600">
              <IconTicket />
            </div>
            <p className="text-sm font-semibold text-ink-900">Aun no tienes tickets</p>
            <p className="text-xs text-ink-400 font-medium mt-1">Crea tu primer ticket con el boton de arriba.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {tickets.map((tk) => (
              <li
                key={tk.id}
                onClick={() => navigate(`/tickets/${tk.id}`)}
                className="dash-ticket cursor-pointer bg-white border border-stone-200 rounded-xl px-4 py-3.5 flex items-center gap-4 hover:border-mist-300 hover:shadow-sm transition-[border-color,box-shadow,background-color,scale] duration-150 ease-salida active:scale-[0.99] active:duration-100"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-stone-100 text-mist-600">
                  <IconTicket />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink-900">{tk.folio || `Ticket #${tk.id}`}</p>
                    <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2 py-0.5 ${estadoBadge(tk.estado)}`}>
                      {estadoLabel(tk.estado)}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 truncate mt-0.5">
                    {tk.tipo_nombre || 'Sin tipo'} · {tk.problema}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-ink-400 font-medium hidden sm:block tabular-nums">{fmtFechaHora(tk.created_at)}</span>
                  {/* Mensajes NUEVOS del operador sin ver */}
                  {Number(tk.nuevos_para_usuario || 0) > 0 && (
                    <span
                      title={`${Number(tk.nuevos_para_usuario)} mensaje${Number(tk.nuevos_para_usuario) === 1 ? '' : 's'} nuevo${Number(tk.nuevos_para_usuario) === 1 ? '' : 's'} de soporte`}
                      className="inline-flex items-center gap-0.5 text-[11px] font-bold rounded-full px-1.5 py-0.5 border bg-amber-100 text-amber-700 border-amber-300 tabular-nums"
                    >
                      <IconMsg />{Number(tk.nuevos_para_usuario)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <NuevoTicketModal open={openNuevo} onClose={() => setOpenNuevo(false)} modo="usuario" onCreated={cargar} />
    </div>
  );
};

export default Dashboard;
