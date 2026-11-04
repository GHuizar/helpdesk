// Pagina temporal para secciones aun no construidas (admin).
const Placeholder = ({ title = 'Proximamente', message = 'Esta seccion se construira en un siguiente incremento.' }) => (
  <div className="p-6 sm:p-10 max-w-5xl mx-auto">
    <div className="border border-dashed border-cloud-300 rounded-2xl bg-white/60 p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-cloud-100 border border-cloud-200 flex items-center justify-center text-ink-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
      </div>
      <h1 className="text-xl font-black text-ink-900 tracking-tight">{title}</h1>
      <p className="text-sm text-ink-500 font-medium mt-2 max-w-md mx-auto">{message}</p>
    </div>
  </div>
);

export default Placeholder;
