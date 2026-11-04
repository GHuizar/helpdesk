import api from './axios';

// Bitacora global (solo administrador).
export const logsApi = {
  listar: (params = {}) => api.get('/logs', { params }),
};

export default logsApi;
