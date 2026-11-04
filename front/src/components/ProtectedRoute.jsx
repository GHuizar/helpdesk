import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-100">
    <span className="spinner-rapido h-8 w-8 border-4 border-mist-500 border-t-transparent rounded-full" />
  </div>
);

/**
 * Protege rutas de React Router.
 * - Si la sesión aún se está validando: muestra loader.
 * - Si no hay sesión: redirige a /login (recordando a dónde quería ir).
 * - Si se pasa `roles` (string o array) y el rol del usuario no está: redirige al inicio.
 *
 * Uso:  <Route element={<ProtectedRoute />}> ... </Route>
 *       <Route element={<ProtectedRoute roles={['admin','operador']} />}> ... </Route>
 */
const ProtectedRoute = ({ roles, children }) => {
  const { isAuthenticated, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !hasRole(roles)) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
