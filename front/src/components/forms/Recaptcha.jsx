import { useEffect, useRef } from 'react';

// Carga el script de reCAPTCHA v2 una sola vez (render explicito).
let promesaScript = null;
const cargarScript = () => {
  if (window.grecaptcha && window.grecaptcha.render) return Promise.resolve();
  if (promesaScript) return promesaScript;
  promesaScript = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      const esperar = () => (window.grecaptcha && window.grecaptcha.render ? resolve() : setTimeout(esperar, 50));
      esperar();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return promesaScript;
};

/**
 * Widget reCAPTCHA v2 ("No soy un robot"). Llama onChange(token|null).
 * Incrementa `resetSignal` para limpiar el widget (el token es de un solo uso).
 */
export default function Recaptcha({ siteKey, onChange, resetSignal = 0 }) {
  const ref = useRef(null);
  const widgetId = useRef(null);
  const cb = useRef(onChange);
  // La referencia al callback se actualiza DESPUES del render; el widget solo la
  // lee dentro de sus propios callbacks, asi que siempre ve el ultimo onChange.
  useEffect(() => { cb.current = onChange; }, [onChange]);

  useEffect(() => {
    let activo = true;
    if (!siteKey) return undefined;
    cargarScript()
      .then(() => {
        if (!activo || !ref.current || widgetId.current !== null) return;
        widgetId.current = window.grecaptcha.render(ref.current, {
          sitekey: siteKey,
          callback: (t) => cb.current?.(t),
          'expired-callback': () => cb.current?.(null),
          'error-callback': () => cb.current?.(null),
        });
      })
      .catch(() => {});
    return () => { activo = false; };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetId.current !== null && window.grecaptcha) {
      try { window.grecaptcha.reset(widgetId.current); cb.current?.(null); } catch { /* noop */ }
    }
  }, [resetSignal]);

  return <div ref={ref} />;
}
