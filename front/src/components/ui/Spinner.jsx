// Gira mas rapido que el `animate-spin` por defecto (1s): con la misma espera real,
// un spinner mas vivo hace que la carga se perciba mas corta.
export default function Spinner({ className = 'h-5 w-5' }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`spinner-rapido ${className} border-2 border-mist-500 border-t-transparent rounded-full inline-block`}
    />
  );
}
