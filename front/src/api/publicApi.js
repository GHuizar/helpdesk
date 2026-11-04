import api from './axios';

// Endpoints PUBLICOS (sin login). Viven bajo /api/p/...
// El interceptor de axios no afecta: estos endpoints no devuelven 401.
export const publicApi = {
  captcha: () => api.get('/p/captcha'),
  tipos: () => api.get('/p/ticket-tipos'),
  departamentos: () => api.get('/p/departamentos'),
  crear: (payload) => api.post('/p/tickets', payload),
  seguimiento: (folio) => api.get(`/p/tickets/${encodeURIComponent(folio)}`),
  responder: (folio, payload) => api.post(`/p/tickets/${encodeURIComponent(folio)}/mensajes`, payload),
};

export default publicApi;
