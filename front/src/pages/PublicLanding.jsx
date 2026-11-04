import { useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';

// Portal PUBLICO (invitado, sin sesion): crear ticket o dar seguimiento por folio.
const PublicCard = ({ title, desc, cta, onClick }) => (
  <button
    onClick={onClick}
    className="group cursor-pointer text-left bg-white border border-stone-200 rounded-2xl p-6 shadow-sm shadow-ink-900/5 hover:border-mist-300 hover:shadow-md hover:shadow-ink-900/10 transition-[border-color,box-shadow,scale] duration-150 ease-salida active:scale-[0.98] active:duration-100"
  >
    <h2 className="text-base font-bold text-ink-900">{title}</h2>
    <p className="text-sm text-ink-500 font-medium mt-1">{desc}</p>
    <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-mist-700">
      {cta}
      <span aria-hidden="true" className="transition-transform duration-150 ease-salida group-hover:translate-x-0.5">&rarr;</span>
    </span>
  </button>
);

const IconInfo = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 11-2 0 1 1 0 012 0zm-1 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 10z" clipRule="evenodd" />
  </svg>
);

const PublicLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Hola, bienvenido</h1>
          <p className="text-ink-500 font-medium mt-2 max-w-xl">
            Levanta un ticket y da seguimiento a su estado con tu folio.
          </p>
          {/* Nota en la paleta del proyecto: antes usaba variantes `dark:` (que este
              proyecto no compila, el modo oscuro va por la clase .tema-oscuro), la clase
              inexistente `text-m` y una franja azul gruesa al costado. */}
          <p className="mt-5 flex items-start gap-2.5 rounded-xl border border-mist-200 bg-mist-50 px-4 py-3 text-sm font-medium leading-relaxed text-mist-800">
            <IconInfo />
            <span>Guarda tu folio: es la única forma de consultar tu solicitud después.</span>
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <PublicCard
            title="Crear un ticket"
            desc="Reporta tu problema sin cuenta. Te pediremos un correo para darte seguimiento."
            cta="Crear ticket"
            onClick={() => navigate('/invitado/nuevo')}
          />
          <PublicCard
            title="Seguimiento por folio"
            desc="Consulta el estado de un ticket que ya levantaste usando su folio."
            cta="Dar seguimiento"
            onClick={() => navigate('/invitado/seguimiento')}
          />
        </div>

        <p className="text-xs text-ink-400 font-medium mt-8">
          Si eres empleado con cuenta, <button onClick={() => navigate('/login')} className="text-mist-700 font-bold hover:underline underline-offset-2 cursor-pointer">inicia sesion</button> para adjuntar evidencia y ver tu historial.
        </p>
      </main>
    </div>
  );
};

export default PublicLanding;
