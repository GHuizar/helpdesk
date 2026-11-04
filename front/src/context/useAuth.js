import { useContext } from 'react';
import AuthContext from './AuthContext';

// El hook vive en su propio archivo: si se exporta junto al provider, el archivo
// deja de exportar solo componentes y Fast Refresh remonta el arbol entero en
// cada edicion en vez de refrescar el componente tocado.
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
};

export default useAuth;
