import { useState, useRef, useEffect } from 'react';
import Input from '../ui/Input';
import { usuariosApi } from '../../api/usuariosApi';
import { useAlert } from '../../context/useAlert';

/**
 * Campo de nomina con autollenado (solo staff). Dos formas de identificar al empleado:
 *  1) Escribir la NOMINA y presionar Enter / salir del campo.
 *  2) Usar el buscador por NOMBRE (o nomina): muestra opciones y, al elegir una, coloca la
 *     nomina y autollena los datos.
 * En ambos casos entrega los datos via onResolved({ nomina, nombre, email, puesto, departamento }).
 * No usar para invitados (no tienen nomina en la BD central).
 */
export default function NominaInput({
  value,
  onChange,
  onResolved,
  label = 'Nomina (autollena los demas datos)',
  placeholder = 'Escribe la nomina y presiona Enter',
  disabled = false,
  className = '',
}) {
  const { showAlert } = useAlert();
  const [buscando, setBuscando] = useState(false);

  // Buscador por nombre
  const [q, setQ] = useState('');
  const [opciones, setOpciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const boxRef = useRef(null);

  const resolverNomina = async (n) => {
    const nom = String(n ?? '').trim();
    if (nom === '' || disabled) return;
    setBuscando(true);
    try {
      const { data } = await usuariosApi.buscarPorNomina(nom);
      onResolved?.(data.data);
      showAlert('Datos del empleado cargados.', 'success');
    } catch {
      showAlert('No se encontro esa nomina; captura los datos manualmente.', 'info');
    } finally {
      setBuscando(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); resolverNomina(value); }
  };

  // Busqueda por nombre/nomina con debounce (a partir de 2 caracteres).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setOpciones([]); return undefined; }
    setCargando(true);
    const t = setTimeout(() => {
      usuariosApi.buscar(term)
        .then(({ data }) => { setOpciones(data.data || []); setAbierto(true); })
        .catch(() => setOpciones([]))
        .finally(() => setCargando(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  // Cerrar el dropdown al hacer clic fuera.
  useEffect(() => {
    const h = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const elegir = async (opcion) => {
    setAbierto(false);
    setQ('');
    setOpciones([]);
    onChange?.({ target: { value: String(opcion.nomina) } }); // coloca la nomina en el campo
    await resolverNomina(opcion.nomina); // autollena con los datos completos (depto/puesto)
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <Input
        label={buscando ? 'Buscando empleado...' : label}
        type="number"
        value={value}
        onChange={onChange}
        onBlur={() => resolverNomina(value)}
        onKeyDown={onKeyDown}
        disabled={disabled || buscando}
        placeholder={placeholder}
      />

      {/* Buscador por nombre */}
      <div className="relative mt-1.5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => opciones.length > 0 && setAbierto(true)}
          disabled={disabled}
          placeholder="Buscar nomina por nombre..."
          className="w-full bg-white border border-cloud-300 text-ink-900 text-xs rounded-lg px-3 py-2 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500 disabled:opacity-50"
        />
        {abierto && (cargando || opciones.length > 0) && (
          <ul className="absolute z-40 left-0 right-0 mt-1 bg-white border border-cloud-200 rounded-lg shadow-lg max-h-56 overflow-auto">
            {cargando && <li className="px-3 py-2 text-xs text-ink-400">Buscando...</li>}
            {!cargando && opciones.length === 0 && <li className="px-3 py-2 text-xs text-ink-400">Sin resultados.</li>}
            {opciones.map((o) => (
              <li key={o.nomina} className="border-b border-cloud-100 last:border-0">
                <button
                  type="button"
                  onClick={() => elegir(o)}
                  className="w-full text-left px-3 py-2 hover:bg-cloud-50 transition-colors"
                >
                  <p className="text-sm text-ink-800 truncate">{o.nombre}</p>
                  <p className="text-[11px] text-ink-400 truncate">Nomina {o.nomina}{o.email ? ` · ${o.email}` : ''}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
