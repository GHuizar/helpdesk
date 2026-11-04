import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';

// Modal con overlay + animación. Tokens neutros.
// Se renderiza en un portal (document.body) para flotar por encima de todo, sin quedar
// atrapado en stacking contexts (p. ej. el header con backdrop-blur).
// El contenido scrollea en el contenedor: si cabe se centra, si es más alto que la
// ventana se puede desplazar sin que se corte el encabezado (ventanas/pantallas bajas).
//
// Movimiento: entra con curva de salida fuerte (respuesta inmediata) y sale más rápido
// y más corto que como entró; el modal escala desde su centro porque no cuelga de ningún
// disparador. Con "movimiento reducido" solo cambia la opacidad.
const EASE = [0.23, 1, 0.32, 1];

export default function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  const sinMovimiento = useReducedMotion();

  // Escape cierra el modal (esperado en cualquier diálogo).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const panel = sinMovimiento
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
      initial: { opacity: 0, scale: 0.96, y: 8 },
      animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
      exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.12, ease: EASE } },
    };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: EASE }}
        >
          {/* Fondo oscuro (solo visual) */}
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />

          {/* Capa scrolleable + click-fuera para cerrar */}
          <div className="absolute inset-0 overflow-y-auto" onClick={onClose}>
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                {...panel}
                className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-xl shadow-ink-900/15 border border-cloud-200`}
              >
                {title && (
                  <div className="flex items-center justify-between px-6 py-4 border-b border-cloud-200">
                    <h3 className="font-bold text-ink-900">{title}</h3>
                    <button
                      onClick={onClose}
                      aria-label="Cerrar"
                      className="-mr-2 w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-ink-400 hover:text-ink-800 hover:bg-cloud-100 transition-colors duration-150"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="px-6 py-5">{children}</div>

                {footer && (
                  <div className="flex justify-end gap-2 px-6 py-4 border-t border-cloud-200 bg-cloud-50 rounded-b-2xl">
                    {footer}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
