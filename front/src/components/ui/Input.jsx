// Campo de formulario reutilizable. Soporta input y textarea (prop `as`).
// La transicion se limita a borde y anillo de foco (nunca `all`: con `all` tambien se
// animan propiedades de layout y el campo "salta" al cambiar de tamano o de error).
export default function Input({ label, error, as = 'input', className = '', id, ...props }) {
  const Comp = as;
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">
          {label}
        </label>
      )}
      <Comp
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={`w-full bg-white border ${error ? 'border-red-400' : 'border-cloud-300'} text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500 transition-[border-color,box-shadow] duration-150 ease-salida ${as === 'textarea' ? 'resize-y min-h-[80px]' : 'min-h-10'}`}
        {...props}
      />
      {error && <p id={errorId} className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
    </div>
  );
}
