import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { notificacionesApi } from '../api/notificacionesApi';
import { fmtFechaHora } from '../utils/estados';

const IconBell = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

// Color del punto segun el tipo de notificacion.
const TIPO_COLOR = {
  mensaje: 'bg-mist-500',
  validar: 'bg-amber-500',
  asignado: 'bg-mist-600',
  reabierto: 'bg-red-500',
  cancelado: 'bg-ink-400',
};

/**
 * Campanita de notificaciones in-app. Hace polling cada 30s, muestra el conteo de
 * no leidas y un popover (portal) con la lista. Al hacer clic en una, navega al ticket.
 * Props: buttonClass (color del icono + hover, segun el tema de la barra).
 */
const NotificacionesBell = ({ buttonClass = '' }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const marcados = useRef(new Set()); // ids ya marcados (evita llamadas repetidas en hover)

  const cargar = useCallback(() => {
    notificacionesApi.listar()
      .then(({ data }) => { setItems(data.data || []); setNoLeidas(data.no_leidas || 0); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    const calc = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => { window.removeEventListener('resize', calc); window.removeEventListener('scroll', calc, true); };
  }, [open]);

  const toggle = () => { if (!open) cargar(); setOpen((o) => !o); };

  // Marca una notificacion como vista (al pasar el mouse por encima o al abrirla).
  const marcarVista = async (n) => {
    if (n.leida || marcados.current.has(n.id)) return;
    marcados.current.add(n.id);
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, leida: 1 } : i)));
    setNoLeidas((x) => Math.max(0, x - 1));
    try { await notificacionesApi.marcarUna(n.id); } catch { marcados.current.delete(n.id); }
  };

  const irA = (n) => {
    setOpen(false);
    marcarVista(n);
    if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
  };

  const marcarTodas = async () => {
    try { await notificacionesApi.marcarLeidas(); } catch { /* noop */ }
    setItems((prev) => prev.map((i) => ({ ...i, leida: 1 })));
    setNoLeidas(0);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle} title="Notificaciones" className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors duration-150 ${buttonClass}`}>
        <IconBell />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold tabular-nums flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[190]" onClick={() => setOpen(false)}>
          {/* Igual que el menu del chip: escala desde la campana, no desde el centro. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className="absolute w-80 max-w-[calc(100vw-1rem)] origin-top-right bg-white border border-cloud-200 rounded-xl shadow-xl shadow-ink-900/15 overflow-hidden"
            style={{ top: pos.top, right: pos.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-cloud-200">
              <span className="text-sm font-bold text-ink-900">Notificaciones</span>
              {noLeidas > 0 && (
                <button onClick={marcarTodas} className="text-[11px] font-bold texto-acento transition-colors duration-150">Marcar todas</button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {items.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-10">No tienes notificaciones.</p>
              ) : (
                <ul className="divide-y divide-cloud-100">
                  {items.map((n) => (
                    <li key={n.id}>
                      <button onMouseEnter={() => marcarVista(n)} onClick={() => irA(n)} className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-cloud-50 transition-colors ${n.leida ? '' : 'bg-mist-50/60'}`}>
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${TIPO_COLOR[n.tipo] || 'bg-ink-400'}`} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm leading-snug ${n.leida ? 'text-ink-700 font-medium' : 'text-ink-900 font-bold'}`}>{n.titulo}</span>
                          {n.cuerpo && <span className="block text-xs text-ink-500 truncate mt-0.5">{n.cuerpo}</span>}
                          <span className="block text-[11px] text-ink-400 mt-0.5 tabular-nums">{fmtFechaHora(n.created_at)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default NotificacionesBell;
