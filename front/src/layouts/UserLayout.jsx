import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { perfilApi } from '../api/perfilApi';
import { IconHome } from '../components/navIcons';

// Vista USUARIO (clara, cálida). Menu horizontal superior + contenido.
// Soporta modo oscuro por usuario (toggle en el menu del chip).
const ITEMS = [
  { label: 'Inicio', path: '/', Icon: IconHome },
];

const UserLayout = () => {
  const [tema, setTema] = useState('claro');

  useEffect(() => {
    perfilApi.tema().then(({ data }) => setTema(data.data?.tema || 'claro')).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('tema-oscuro', tema === 'oscuro');
    return () => document.documentElement.classList.remove('tema-oscuro');
  }, [tema]);

  const toggleTema = useCallback(() => {
    setTema((prev) => {
      const nuevo = prev === 'oscuro' ? 'claro' : 'oscuro';
      perfilApi.setTema(nuevo).catch(() => {});
      return nuevo;
    });
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${tema === 'oscuro' ? 'bg-cloud-100' : 'bg-stone-100'}`}>
      <TopNav variant="user" items={ITEMS} brand="HelpDesk" tema={tema} onToggleTema={toggleTema} />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;
