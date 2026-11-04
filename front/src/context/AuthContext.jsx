import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { authApi } from '../api/authApi';

// Auth basado en ROL (admin | operador | usuario). El rol viene del backend
// (tabla ticket_user_roles en helpdesk; default 'usuario').
const AuthContext = createContext(null);

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readJSON('user', null));
  const [role, setRole] = useState(() => localStorage.getItem('role') || null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((newToken, newUser, newRole) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('role', newRole || 'usuario');
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(newUser);
    setRole(newRole || 'usuario');
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setRole(null);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login(email, password);
    if (data.status === 'success') {
      persistSession(data.token, data.user, data.role);
      return data;
    }
    throw new Error(data.message || 'No fue posible iniciar sesión');
  }, [persistSession]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort: aunque falle en el server, limpiamos local.
    }
    clearSession();
  }, [clearSession]);

  // Al cargar la app: si hay token, lo validamos contra /me y refrescamos datos + rol.
  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      const stored = localStorage.getItem('token');
      if (!stored) {
        setLoading(false);
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
      try {
        const { data } = await authApi.me();
        if (active && data.status === 'success') {
          persistSession(stored, data.user, data.role);
        }
      } catch {
        if (active) clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      active = false;
    };
  }, [persistSession, clearSession]);

  // El interceptor de axios dispara este evento cuando un 401 invalida el token.
  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [clearSession]);

  const hasRole = useCallback(
    (...roles) => roles.flat().includes(role),
    [role]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      loading,
      isAuthenticated: !!token && !!user,
      isAdmin: role === 'admin',
      isOperador: role === 'operador',
      isStaff: role === 'admin' || role === 'operador',
      login,
      logout,
      hasRole,
    }),
    [user, token, role, loading, login, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
