import { useAuth } from '../context/useAuth';
import Dashboard from './Dashboard';
import AdminInicio from './admin/AdminInicio';

// La ruta "/" muestra el panel adecuado segun el rol.
const Home = () => {
  const { isStaff } = useAuth();
  return isStaff ? <AdminInicio /> : <Dashboard />;
};

export default Home;
