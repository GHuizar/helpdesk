import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useAlert } from '../context/useAlert';
import AsyncButton from '../components/ui/AsyncButton';
import bgLogin from '../components/brand/login-bg.svg';
import logoWordmark from '../components/brand/logo-wordmark.svg';

// Login por correo + contrasena contra la BD de usuarios centralizada.
// Enter en cualquier campo envia el formulario; el ojo alterna la visibilidad de la contrasena.
//
// El alto esta ajustado para caber SIN SCROLL en una pantalla de portatil (~600 px de
// area util): el ritmo vertical es compacto y el panel usa padding vertical corto. Si
// cambias margenes aqui, vuelve a medirlo antes de subirlo.
const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const from = location.state?.from?.pathname || '/';

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    try {
      await login(formData.email, formData.password);
      showAlert?.('Sesion iniciada', 'success');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error de conexion con el servidor';
      setError(msg);
      throw err;
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">

      {/* PANEL IZQUIERDO: branding con imagen de fondo + overlay solido (sin degradados) */}
      <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden">
        <img src={bgLogin} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-ink-900/55" />
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-12 text-white w-full">
          <img src="/logo-wordmark-light.svg" alt="HelpDesk" className="h-10 w-auto object-contain self-start" />
          <div>
            <div className="w-12 h-1.5 bg-mist-300 rounded-full mb-5" />
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
              Sistema de<br />Tickets
            </h2>
          </div>
          <p className="text-[11px] text-white/70 font-bold uppercase tracking-widest">Mesa de ayuda interna</p>
        </div>
      </div>

      {/* PANEL DERECHO: formulario */}
      <div className="flex w-full lg:w-1/2 items-center justify-center px-6 sm:px-12 lg:px-16 py-6">
        <div className="w-full max-w-sm">

          <div className="mb-6 lg:hidden">
            <img src={logoWordmark} alt="HelpDesk" className="h-9 w-auto object-contain" />
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-black text-ink-900 tracking-tight">Acceso al Sistema</h1>
            <p className="text-ink-500 text-sm mt-1.5 font-medium">Ingresa con tu correo y contraseña de la empresa</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Boton submit invisible: Enter en cualquier campo dispara onSubmit. */}
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />

            {error && (
              <div role="alert" className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg text-xs font-bold flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">Correo</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-4 py-2.5 min-h-11 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500 transition-[border-color,box-shadow] duration-150 ease-salida font-medium"
                placeholder="tucorreo@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">Contrasena</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-4 py-2.5 pr-12 min-h-11 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500 transition-[border-color,box-shadow] duration-150 ease-salida font-medium tracking-widest"
                  placeholder="****************"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-ink-400 hover:text-ink-800 transition-colors duration-150"
                >
                  {mostrarPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <AsyncButton
                onClick={handleSubmit}
                loadingText="Verificando..."
                className="w-full bg-mist-600 text-white py-3 min-h-11 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm shadow-ink-900/10 hover:bg-mist-700 transition-[background-color,scale] duration-150 ease-salida active:scale-[0.98] active:duration-100"
              >
                Iniciar Sesion
              </AsyncButton>
            </div>
          </form>

          {/* Acceso sin cuenta (portal publico de invitado). El aviso explica hasta donde
              llega ese acceso para que nadie lo confunda con una sesion normal. */}
          <div className="mt-6 pt-5 border-t border-cloud-200">
            <p className="text-xs text-ink-500 font-medium leading-relaxed">
              <span className="font-bold text-ink-700">¿No tienes cuenta?</span>{' '}
              Puedes entrar sin iniciar sesion: levanta un ticket y dale seguimiento con tu folio.
              Para adjuntar evidencia y ver tu historial sí necesitas cuenta.
            </p>
            <button
              type="button"
              onClick={() => navigate('/invitado')}
              className="mt-3 w-full border border-cloud-300 text-ink-700 py-2.5 min-h-11 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-stone-100 hover:border-cloud-400 transition-[background-color,border-color,scale] duration-150 ease-salida active:scale-[0.98] active:duration-100"
            >
              Entrar sin cuenta
            </button>
          </div>

          <p className="mt-6 text-[11px] text-ink-400 font-bold uppercase tracking-widest">v0.1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
