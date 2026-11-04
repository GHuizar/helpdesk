import api from './axios';

// Gestion de usuarios y roles (solo administrador).
export const usuariosApi = {
  listar: (params = {}) => api.get('/usuarios', { params }),
  setRol: (nomina, rol) => api.put(`/usuarios/${nomina}/rol`, { rol }),
  setRustdesk: (nomina, rustdesk) => api.put(`/usuarios/${nomina}/rustdesk`, { rustdesk }),
  // Datos de un usuario por nomina (autollenado al identificar a un invitado).
  buscarPorNomina: (nomina) => api.get(`/usuarios/${nomina}`),
  // Autocompletar de empleados por nombre o nomina (para el buscador de nomina; staff).
  buscar: (q) => api.get('/empleados/buscar', { params: { q } }),
  // Equipo de soporte actual (admins + operadores).
  staff: () => api.get('/staff'),
};

export default usuariosApi;
