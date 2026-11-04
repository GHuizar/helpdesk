// Tarjeta neutra. Usa tokens neutros (cloud/ink) que funcionan en ambas vistas.
export default function Card({ className = '', children }) {
  return (
    <div className={`bg-white border border-cloud-200 rounded-xl shadow-sm shadow-ink-900/5 ${className}`}>
      {children}
    </div>
  );
}
