import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Shell from './layouts/Shell';
import Login from './pages/Login';
import PublicLanding from './pages/PublicLanding';
import PublicNuevo from './pages/PublicNuevo';
import PublicSeguimiento from './pages/PublicSeguimiento';
import Home from './pages/Home';
import Tickets from './pages/admin/Tickets';
import TicketDetalle from './pages/TicketDetalle';
import Reportes from './pages/admin/Reportes';
import Usuarios from './pages/admin/Usuarios';
import Logs from './pages/admin/Logs';
import Monitor from './pages/admin/Monitor';

const App = () => (
  <Routes>
    {/* Publicas (sin sesion) */}
    <Route path="/login" element={<Login />} />
    <Route path="/invitado" element={<PublicLanding />} />
    <Route path="/invitado/nuevo" element={<PublicNuevo />} />
    <Route path="/invitado/seguimiento" element={<PublicSeguimiento />} />

    {/* Protegidas: requieren sesion. El Shell elige layout/paleta segun el rol. */}
    <Route element={<ProtectedRoute />}>
      {/* Monitor: pantalla completa, sin layout/topnav (operador y admin) */}
      <Route element={<ProtectedRoute roles={['admin', 'operador']} />}>
        <Route path="/monitor" element={<Monitor />} />
      </Route>

      <Route element={<Shell />}>
        {/* Inicio: Dashboard de usuario o panel de administracion segun rol */}
        <Route path="/" element={<Home />} />

        {/* Detalle de ticket: accesible a cualquier autenticado; el backend valida dueno o staff */}
        <Route path="/tickets/:id" element={<TicketDetalle />} />

        {/* Solo staff (admin / operador) */}
        <Route element={<ProtectedRoute roles={['admin', 'operador']} />}>
          <Route path="/tickets" element={<Tickets />} />
        </Route>

        {/* Solo administrador */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/logs" element={<Logs />} />
        </Route>
      </Route>
    </Route>

    {/* Cualquier otra ruta vuelve al inicio (que exige sesion). */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
