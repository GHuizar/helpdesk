import { useNavigate } from 'react-router-dom';

// Header compartido de las paginas publicas (sin sesion).
const PublicHeader = () => {
  const navigate = useNavigate();
  return (
    <header className="bg-mist-800 text-white">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => navigate('/invitado')} className="flex items-center cursor-pointer transition-transform duration-150 ease-salida active:scale-[0.97]">
          <img src="/logo-wordmark-light.svg" alt="HelpDesk" className="h-9 w-auto object-contain transition-transform hover:scale-105" />
        </button>
        <button
          onClick={() => navigate('/login')}
          className="cursor-pointer text-xs font-bold uppercase tracking-widest text-mist-100 hover:text-white hover:font-extrabold transition-colors"
        >
          Iniciar sesion
        </button>
      </div>
    </header>
  );
};

export default PublicHeader;
