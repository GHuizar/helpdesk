import api from './axios';

// Capa de acceso a los endpoints de autenticación.
// Login por CORREO (la nómina es la clave relacional interna, no la entrada).
export const authApi = {
  login: (email, password) => api.post('/login', { email, password }),
  logout: () => api.post('/logout'),
  me: () => api.get('/me'),
};

export default authApi;
