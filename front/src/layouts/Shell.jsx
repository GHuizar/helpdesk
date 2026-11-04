import { useAuth } from '../context/useAuth';
import UserLayout from './UserLayout';
import AdminLayout from './AdminLayout';

// Elige el layout (y por tanto la paleta + menu) segun el rol:
//   admin / operador -> AdminLayout (oscuro/neutro)
//   usuario          -> UserLayout (claro)
const Shell = () => {
  const { isStaff } = useAuth();
  return isStaff ? <AdminLayout /> : <UserLayout />;
};

export default Shell;
