import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import PerfilModal from './PerfilModal';
import NotificacionesBell from './NotificacionesBell';
import logoCuadrado from './brand/logo-mark.svg'; // version a color (vista usuario)

/**
 * Menu horizontal superior. Dos temas segun la vista:
 *   - variant 'user'  -> claro (paleta mist/stone)
 *   - variant 'admin' -> color de barra personalizable; el contraste del texto se calcula
 *                        (claro/oscuro) por `barText` ('auto' | 'light' | 'dark').
 * Props: variant, items, brand, accent (hex, opcional, solo admin), barText, onPrefsSaved.
 */

const THEME_USER = {
  bar: 'bg-white/95 border-stone-200',
  brand: 'text-ink-900',
  itemIdle: 'text-ink-500 hover:bg-stone-100 hover:text-ink-800',
  itemActive: 'bg-mist-500/15 text-mist-700',
  itemActiveBar: 'bg-mist-500',
  itemIconActive: 'text-mist-600',
  itemIconIdle: 'text-ink-400 group-hover:text-ink-600',
  chipAvatar: 'bg-mist-500 text-white',
  chipName: 'text-ink-900',
  chipSub: 'text-ink-400',
  chipHover: 'hover:bg-stone-100',
  hamburger: 'text-ink-700 bg-stone-100 border-stone-200 hover:bg-stone-200',
  sheet: 'bg-white border-stone-200',
};

// Tema admin: la barra toma su color del acento (style inline); aqui solo decidimos el
// contraste del texto/iconos. claro=true -> texto blanco (fondo oscuro); claro=false -> texto negro.
const adminTheme = (claro, accent) => ({
  bar: `${accent ? '' : 'bg-ink-900/95'} ${claro ? 'border-white/10' : 'border-black/10'}`,
  brand: claro ? 'text-white' : 'text-ink-900',
  itemIdle: claro ? 'text-white/75 hover:bg-white/10 hover:text-white' : 'text-ink-900/60 hover:bg-black/10 hover:text-ink-900',
  itemActive: claro ? 'bg-white/20 text-white' : 'bg-black/10 text-ink-900',
  itemActiveBar: claro ? 'bg-white' : 'bg-ink-900',
  itemIconActive: claro ? 'text-white' : 'text-ink-900',
  itemIconIdle: claro ? 'text-white/65 group-hover:text-white' : 'text-ink-900/50 group-hover:text-ink-900',
  chipAvatar: claro ? 'bg-white/20 text-white' : 'bg-black/15 text-ink-900',
  chipName: claro ? 'text-white' : 'text-ink-900',
  chipSub: claro ? 'text-white/70' : 'text-ink-900/60',
  chipHover: claro ? 'hover:bg-white/10' : 'hover:bg-black/10',
  hamburger: claro ? 'text-white bg-white/10 border-white/20 hover:bg-white/20' : 'text-ink-900 bg-black/10 border-black/15 hover:bg-black/20',
  sheet: `${accent ? '' : 'bg-ink-900'} ${claro ? 'border-white/10' : 'border-black/10'}`,
});

// Luminancia perceptual [0..1] de un hex #rrggbb.
const luminancia = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
);
const IconLogout = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
);
const IconCog = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.53 1.53 0 01-2.29.95c-1.37-.84-2.95.75-2.11 2.11.6.98.07 2.26-1.06 2.53-1.56.38-1.56 2.6 0 2.98a1.53 1.53 0 01.95 2.29c-.84 1.37.75 2.95 2.11 2.11a1.53 1.53 0 012.29.95c.38 1.56 2.6 1.56 2.98 0a1.53 1.53 0 012.29-.95c1.37.84 2.95-.75 2.11-2.11a1.53 1.53 0 01.95-2.29c1.56-.38 1.56-2.6 0-2.98a1.53 1.53 0 01-.95-2.29c.84-1.37-.75-2.95-2.11-2.11a1.53 1.53 0 01-2.29-.95zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
);
const IconChevron = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
);
const IconTema = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0"><path d="M9.353 1.5A7.5 7.5 0 0017.5 12.147 6 6 0 119.353 1.5z" /></svg>
);

const ROLE_LABEL = { admin: 'Administrador', operador: 'Operador', usuario: 'Usuario' };

/**
 * Opciones del menu de usuario (popover de escritorio y hoja movil). Vive FUERA
 * de TopNav: definirlo dentro lo recreaba en cada render, lo que remonta el
 * subarbol y pierde su estado en cada pasada.
 */
const MenuOpciones = ({ dark, isStaff, tema, onPerfil, onToggleTema, onLogout }) => (
  <>
    {isStaff && (
      <button onClick={onPerfil} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${dark ? 'text-white hover:bg-white/10' : 'text-ink-700 hover:bg-cloud-100'}`}>
        <IconCog /> Configurar perfil
      </button>
    )}
    {onToggleTema && (
      <button onClick={onToggleTema} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${dark ? 'text-white hover:bg-white/10' : 'text-ink-700 hover:bg-cloud-100'}`}>
        <IconTema /> {tema === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}
      </button>
    )}
    <button onClick={onLogout} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${dark ? 'text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}>
      <IconLogout /> Cerrar sesion
    </button>
  </>
);


const TopNav = ({ variant = 'user', items = [], brand = 'HelpDesk', accent = null, barText = 'auto', onPrefsSaved, tema, onToggleTema }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, logout, isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const chipRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  const accentOk = variant === 'admin' && accent && /^#[0-9a-fA-F]{6}$/.test(accent);
  const esDark = tema === 'oscuro';
  // Contraste del texto de la barra. light=texto claro, dark=texto oscuro, auto=por luminancia.
  let claro;
  if (barText === 'light') claro = true;
  else if (barText === 'dark') claro = false;
  else claro = accentOk ? luminancia(accent) < 0.58 : true;

  // Admin: barra con su acento. Usuario: clara, pero con el color de marca (mist) en modo oscuro.
  const USER_DARK_BAR = '#2f4654'; // mist-700 (mismo tono del panel admin)
  const t = variant === 'admin'
    ? adminTheme(claro, accentOk ? accent : null)
    : (esDark ? adminTheme(true, USER_DARK_BAR) : THEME_USER);
  // Logo claro sobre barra oscura (admin siempre; usuario solo en modo oscuro).
  const logoSrc = (variant === 'admin' || (variant === 'user' && esDark)) ? '/logo-mark-light.svg' : logoCuadrado;
  const barStyle = accentOk
    ? { backgroundColor: accent }
    : (variant === 'user' && esDark ? { backgroundColor: USER_DARK_BAR } : undefined);

  // El popover del chip se renderiza en un portal (document.body) para que flote por
  // encima de todo y no quede atrapado en el stacking context del header (backdrop-blur).
  useLayoutEffect(() => {
    if (!menu) return undefined;
    const calc = () => {
      const r = chipRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc, true);
    };
  }, [menu]);

  const isActive = (path) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path));
  const go = (path) => { navigate(path); setOpen(false); };
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };
  const userName = user ? `${user.name ?? ''} ${user.apellidopaterno ?? ''}`.trim() : 'Usuario';

  // Handlers que el menu necesita (cierran los desplegables antes de actuar).
  const cerrarMenus = () => { setMenu(false); setOpen(false); };
  const abrirPerfil = () => { cerrarMenus(); setPerfilOpen(true); };
  const cambiarTema = onToggleTema ? () => { cerrarMenus(); onToggleTema(); } : null;

  return (
    <header className={`${variant === 'admin' || esDark ? 'tema-claro' : ''} sticky top-0 z-40 w-full border-b backdrop-blur-md ${t.bar}`} style={barStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* Marca */}
        <button onClick={() => go('/')} className="flex items-center gap-2.5 shrink-0 cursor-pointer transition-transform duration-150 ease-salida active:scale-[0.97]">
          <img src={logoSrc} alt="HelpDesk" className="w-9 h-9 object-contain" />
          <span className={`font-bold tracking-tight text-lg hidden sm:block ${t.brand}`}>{brand}</span>
        </button>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {items.map((item) => {
            const active = isActive(item.path);
            return (
              <button key={item.path} onClick={() => go(item.path)} className={`group relative flex items-center gap-2 h-10 px-3.5 rounded-xl font-semibold text-sm transition-[background-color,color,scale] duration-150 ease-salida active:scale-[0.96] active:duration-100 ${active ? t.itemActive : t.itemIdle}`}>
                {active && <span className={`absolute left-2 right-2 -bottom-px h-0.5 rounded-full ${t.itemActiveBar}`} />}
                {item.Icon && <span className={`shrink-0 transition-colors ${active ? t.itemIconActive : t.itemIconIdle}`}><item.Icon /></span>}
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Derecha: campanita + chip de usuario (desktop). El popover va en un portal -> ver abajo. */}
        <div className="ml-auto hidden md:flex items-center gap-1">
          <NotificacionesBell buttonClass={`${t.brand} ${t.chipHover}`} />
          <button ref={chipRef} onClick={() => setMenu((m) => !m)} className={`flex items-center gap-2.5 pr-2 pl-1 py-1 min-h-11 rounded-xl transition-colors duration-150 ${t.chipHover}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${t.chipAvatar}`}>{userName?.charAt(0) || 'U'}</div>
            <div className="flex flex-col leading-tight min-w-0 text-left">
              <span className={`text-xs font-bold truncate max-w-[140px] ${t.chipName}`}>{userName}</span>
              <span className={`text-[11px] font-bold uppercase tracking-widest truncate max-w-[160px] ${t.chipSub}`}>{ROLE_LABEL[role] || 'Usuario'} · {user?.nomina ?? 'N/D'}</span>
            </div>
            <span className={t.chipSub}><IconChevron /></span>
          </button>
        </div>

        {/* Campanita + hamburguesa (mobile) */}
        <div className="ml-auto md:hidden flex items-center gap-1">
          <NotificacionesBell buttonClass={`${t.brand} ${t.chipHover}`} />
          <button onClick={() => setOpen((o) => !o)} className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors duration-150 ${t.hamburger}`}>
            <IconMenu />
          </button>
        </div>
      </div>

      {/* Sheet mobile */}
      {open && (
        <div className={`md:hidden border-t ${t.sheet}`} style={barStyle}>
          <nav className="px-4 py-3 space-y-1">
            {items.map((item) => {
              const active = isActive(item.path);
              return (
                <button key={item.path} onClick={() => go(item.path)} className={`group w-full flex items-center gap-3 h-11 px-3 rounded-xl font-semibold text-sm transition-[background-color,color,scale] duration-150 ease-salida active:scale-[0.98] active:duration-100 ${active ? t.itemActive : t.itemIdle}`}>
                  {item.Icon && <span className={`shrink-0 ${active ? t.itemIconActive : t.itemIconIdle}`}><item.Icon /></span>}
                  <span>{item.label}</span>
                </button>
              );
            })}
            <div className="pt-2 mt-2 border-t border-current/10">
              <div className="flex items-center gap-2.5 min-w-0 px-1 mb-1">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${t.chipAvatar}`}>{userName?.charAt(0) || 'U'}</div>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className={`text-xs font-bold truncate ${t.chipName}`}>{userName}</span>
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${t.chipSub}`}>{ROLE_LABEL[role] || 'Usuario'}</span>
                </div>
              </div>
              <MenuOpciones
                dark={variant === 'admin' ? claro : false}
                isStaff={isStaff}
                tema={tema}
                onPerfil={abrirPerfil}
                onToggleTema={cambiarTema}
                onLogout={handleLogout}
              />
            </div>
          </nav>
        </div>
      )}

      {/* Popover del chip (desktop) en portal: flota por encima de todo */}
      {menu && createPortal(
        <div className="fixed inset-0 z-[190]" onClick={() => setMenu(false)}>
          {/* Escala desde el chip que lo abrio (origin-top-right), no desde su centro:
              el popover "sale" del disparador en vez de aparecer de la nada. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            className="absolute w-52 origin-top-right bg-white border border-cloud-200 rounded-xl shadow-xl shadow-ink-900/15 p-1.5"
            style={{ top: pos.top, right: pos.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuOpciones
                dark={false}
                isStaff={isStaff}
                tema={tema}
                onPerfil={abrirPerfil}
                onToggleTema={cambiarTema}
                onLogout={handleLogout}
              />
          </motion.div>
        </div>,
        document.body,
      )}

      <PerfilModal open={perfilOpen} onClose={() => setPerfilOpen(false)} onSaved={onPrefsSaved} />
    </header>
  );
};

export default TopNav;
