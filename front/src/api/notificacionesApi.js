import api from './axios';

// Notificaciones in-app del usuario autenticado (campanita).
export const notificacionesApi = {
  listar: () => api.get('/me/notificaciones'),
  marcarLeidas: () => api.post('/me/notificaciones/leer'),
  marcarUna: (id) => api.post(`/me/notificaciones/${id}/leer`),
};

export default notificacionesApi;
