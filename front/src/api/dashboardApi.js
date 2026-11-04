import api from './axios';

// Datos del dashboard/monitor (operador y admin).
export const dashboardApi = {
  data: () => api.get('/dashboard'),
};

export default dashboardApi;
