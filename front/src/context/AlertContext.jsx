import { createContext, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

// Sistema de alertas/toasts con la paleta mist del proyecto.
const AlertContext = createContext();

// El color del tipo vive en el punto y en un halo tenue del mismo tono: la franja
// gruesa al costado (border-l-4) se eliminó porque es el tic más reconocible de una
// interfaz generada en serie y no aporta información que el punto no dé ya.
const ACCENT = {
  error: { dot: 'bg-red-500', halo: 'ring-red-500/20' },
  success: { dot: 'bg-green-600', halo: 'ring-green-600/20' },
  info: { dot: 'bg-mist-500', halo: 'ring-mist-500/20' },
};

const EASE = [0.23, 1, 0.32, 1];

const AlertCard = ({ alert, initial, sinMovimiento }) => {
  const a = ACCENT[alert.type] || ACCENT.info;
  return (
    <motion.div
      role="status"
      initial={sinMovimiento ? { opacity: 0 } : initial}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1, transition: { duration: 0.22, ease: EASE } }}
      exit={{ opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: EASE } }}
      className={`min-w-[280px] max-w-sm bg-white border border-cloud-200 ring-1 ${a.halo} rounded-xl shadow-lg shadow-ink-900/10 px-4 py-3 flex items-center gap-3 pointer-events-auto`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
      <span className="text-sm font-medium text-ink-800">{alert.message}</span>
    </motion.div>
  );
};

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const sinMovimiento = useReducedMotion();

  // Memoizado para referencia estable (evita invalidar useCallback/useEffect consumidores).
  const showAlert = useCallback((message, type = 'info', position = 'bottom-right') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    setAlerts((prev) => [...prev, { id, message, type, position }]);
    setTimeout(() => setAlerts((prev) => prev.filter((a) => a.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  const bottomAlerts = alerts.filter((a) => a.position === 'bottom-right');
  const topAlerts = alerts.filter((a) => a.position === 'top-center');

  return (
    <AlertContext.Provider value={value}>
      {children}

      {/* BOTTOM-RIGHT */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2 pointer-events-none flex flex-col items-end">
        <AnimatePresence>
          {bottomAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} sinMovimiento={sinMovimiento} initial={{ opacity: 0, x: 24, scale: 0.97 }} />
          ))}
        </AnimatePresence>
      </div>

      {/* TOP-CENTER */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] space-y-2 pointer-events-none flex flex-col items-center">
        <AnimatePresence>
          {topAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} sinMovimiento={sinMovimiento} initial={{ opacity: 0, y: -16, scale: 0.97 }} />
          ))}
        </AnimatePresence>
      </div>
    </AlertContext.Provider>
  );
};

export default AlertContext;
