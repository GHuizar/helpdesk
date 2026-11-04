import api from './axios';

// Capa de acceso a los endpoints de tickets (autenticados).
export const ticketsApi = {
  tipos: () => api.get('/ticket-tipos'),
  departamentos: () => api.get('/departamentos'),
  misTickets: () => api.get('/me/tickets'),
  crear: (payload) => api.post('/tickets', payload),
  listar: (params = {}) => api.get('/tickets', { params }),
  reportes: () => api.get('/reportes'),
  misStats: () => api.get('/me/stats'),

  // Detalle + chat + timeline + acciones de estado
  detalle: (id) => api.get(`/tickets/${id}`),
  actualizarDatos: (id, payload) => api.put(`/tickets/${id}/datos`, payload),
  actualizarRustdesk: (id, payload) => api.put(`/tickets/${id}/rustdesk`, payload),
  mensajes: (id) => api.get(`/tickets/${id}/mensajes`),
  // payload puede ser JSON ({cuerpo,...}) o FormData (cuando lleva imagen adjunta).
  enviarMensaje: (id, payload) => {
    const esForm = typeof FormData !== 'undefined' && payload instanceof FormData;
    return api.post(`/tickets/${id}/mensajes`, payload, esForm ? { headers: { 'Content-Type': undefined } } : undefined);
  },
  imagenMensaje: (id, mensajeId) => api.get(`/tickets/${id}/mensajes/${mensajeId}/imagen`, { responseType: 'blob' }),
  cambiarEstado: (id, payload) => api.post(`/tickets/${id}/estado`, payload),
  validar: (id) => api.post(`/tickets/${id}/validar`),
  reabrir: (id, payload = {}) => api.post(`/tickets/${id}/reabrir`, payload),

  // Adjuntos
  subirArchivo: (id, formData) =>
    api.post(`/tickets/${id}/archivos`, formData, { headers: { 'Content-Type': undefined } }),
  archivos: (id) => api.get(`/tickets/${id}/archivos`),
  descargarArchivo: (id, archivoId) =>
    api.get(`/tickets/${id}/archivos/${archivoId}`, { responseType: 'blob' }),

  // Asignacion de responsable
  operadores: () => api.get('/staff'),
  reasignar: (id, payload) => api.post(`/tickets/${id}/responsable`, payload),
};

export default ticketsApi;
