import api from './axios';

// Respuestas rapidas / predeterminadas del operador (para el chat). Cada quien las suyas.
export const respuestasApi = {
  listar: () => api.get('/me/respuestas'),
  crear: (payload) => api.post('/me/respuestas', payload),
  actualizar: (id, payload) => api.put(`/me/respuestas/${id}`, payload),
  eliminar: (id) => api.delete(`/me/respuestas/${id}`),
};

export default respuestasApi;
