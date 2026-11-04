import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/useAuth';
import { perfilApi } from '../api/perfilApi';
import { IconHome, IconTickets, IconReportes, IconUsuarios, IconLogs, IconMonitor } from '../components/navIcons';

// Vista ADMINISTRACION / OPERATIVA. Menu horizontal superior + contenido.
// Personalizable por usuario (color principal + imagen de fondo) via perfil.
const ITEMS = [
  { label: 'Inicio', path: '/', Icon: IconHome },
  { label: 'Tickets', path: '/tickets', Icon: IconTickets },
  { label: 'Monitor', path: '/monitor', Icon: IconMonitor },
  { label: 'Reportes', path: '/reportes', Icon: IconReportes, adminOnly: true },
  { label: 'Usuarios', path: '/usuarios', Icon: IconUsuarios, adminOnly: true },
  { label: 'Logs', path: '/logs', Icon: IconLogs, adminOnly: true },
];

// --- Re-tematizado: deriva la escala mist-* (50-800) a partir del color elegido (~ tono 600).
// En Tailwind v4 las clases bg-mist-600 compilan a var(--color-mist-600); sobreescribir esas
// variables en el contenedor admin re-pinta todo el acento sin tocar componentes.
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hx = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (hex, t, p) => { const [r, g, b] = hexRgb(hex); return hx(r + (t[0] - r) * p, g + (t[1] - g) * p, b + (t[2] - b) * p); };
const W = [255, 255, 255];
const K = [0, 0, 0];
const MIST_KEYS = ['--color-mist-50', '--color-mist-100', '--color-mist-200', '--color-mist-300', '--color-mist-400', '--color-mist-500', '--color-mist-600', '--color-mist-700', '--color-mist-800'];
const escalaAccent = (a) => ({
  '--color-mist-50': mix(a, W, 0.92),
  '--color-mist-100': mix(a, W, 0.85),
  '--color-mist-200': mix(a, W, 0.72),
  '--color-mist-300': mix(a, W, 0.55),
  '--color-mist-400': mix(a, W, 0.30),
  '--color-mist-500': mix(a, W, 0.12),
  '--color-mist-600': a,
  '--color-mist-700': mix(a, K, 0.18),
  '--color-mist-800': mix(a, K, 0.34),
});

const AdminLayout = () => {
  const { isAdmin } = useAuth();
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin);

  const [accent, setAccent] = useState(null);
  const [barText, setBarText] = useState('auto');
  const [tema, setTema] = useState('claro');
  const [bgUrl, setBgUrl] = useState(null);

  const accentVars = useMemo(
    () => (accent && /^#[0-9a-fA-F]{6}$/.test(accent) ? escalaAccent(accent) : undefined),
    [accent],
  );

  // Aplica el acento a :root (no a un div) para que también lo hereden los modales
  // renderizados en portal (document.body). Se limpia al salir de la vista admin.
  useEffect(() => {
    const root = document.documentElement;
    if (accentVars) {
      Object.entries(accentVars).forEach(([k, v]) => root.style.setProperty(k, v));
    } else {
      MIST_KEYS.forEach((k) => root.style.removeProperty(k));
    }
    return () => MIST_KEYS.forEach((k) => root.style.removeProperty(k));
  }, [accentVars]);

  // Modo oscuro: clase en <html> (cubre tambien los modales en portal). Se limpia al salir.
  useEffect(() => {
    document.documentElement.classList.toggle('tema-oscuro', tema === 'oscuro');
    return () => document.documentElement.classList.remove('tema-oscuro');
  }, [tema]);

  const cargarPrefs = useCallback(() => {
    perfilApi.show()
      .then(({ data }) => {
        setAccent(data.data?.accent || null);
        setBarText(data.data?.bar_text || 'auto');
        setTema(data.data?.tema || 'claro');
        if (data.data?.tiene_fondo) {
          perfilApi.fondo()
            .then((res) => setBgUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(res.data); }))
            .catch(() => {});
        } else {
          setBgUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { cargarPrefs(); }, [cargarPrefs]);

  return (
    <div className={`min-h-screen flex flex-col relative ${bgUrl ? '' : 'bg-cloud-100'}`}>
      {bgUrl && <img src={bgUrl} alt="" className="fixed inset-0 w-full h-full object-cover -z-10" />}
      {bgUrl && <div className="fixed inset-0 -z-10 bg-cloud-100/80" />}
      <TopNav variant="admin" items={items} brand="HelpDesk · Admin" accent={accent} barText={barText} onPrefsSaved={cargarPrefs} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
