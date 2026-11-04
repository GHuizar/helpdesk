import api from './axios';

// Preferencias de perfil (solo staff). Color del tema + imagen de fondo.
export const perfilApi = {
  show: () => api.get('/me/perfil'),
  update: (payload) => api.put('/me/perfil', payload),
  subirFondo: (formData) => api.post('/me/perfil/fondo', formData, { headers: { 'Content-Type': undefined } }),
  fondo: () => api.get('/me/perfil/fondo', { responseType: 'blob' }),
  quitarFondo: () => api.delete('/me/perfil/fondo'),
  // Tema claro/oscuro (cualquier usuario, no solo staff).
  tema: () => api.get('/me/tema'),
  setTema: (tema) => api.put('/me/tema', { tema }),
};

export default perfilApi;
