import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/useAuth';
import { useAlert } from '../../context/useAlert';
import { usuariosApi } from '../../api/usuariosApi';
import Spinner from '../../components/ui/Spinner';

const ROL_BADGE = {
  admin: 'bg-ink-800 text-white',
  operador: 'bg-mist-600 text-white',
  usuario: 'bg-cloud-200 text-ink-700',
};

// Selector de rol reutilizable
const RolSelect = ({ rol, disabled, onChange }) => (
  <select
    value={rol}
    disabled={disabled}
    onChange={(e) => onChange(e.target.value)}
    className="bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500 disabled:opacity-50 shrink-0"
  >
    <option value="usuario">Usuario</option>
    <option value="operador">Operador</option>
    <option value="admin">Administrador</option>
  </select>
);

// Editor inline del RustDesk (numerico) de un usuario, por nomina.
const RustdeskEditor = ({ u, onSaved }) => {
  const { showAlert } = useAlert();
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState('');
  const [saving, setSaving] = useState(false);

  const abrir = () => { setVal(u.rustdesk != null ? String(u.rustdesk) : ''); setEdit(true); };
  const guardar = async () => {
    setSaving(true);
    try {
      const { data } = await usuariosApi.setRustdesk(u.nomina, val === '' ? null : Number(val));
      onSaved(u.nomina, data.rustdesk ?? null);
      setEdit(false);
      showAlert('RustDesk actualizado.', 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || 'No se pudo guardar el RustDesk.', 'error');
    } finally { setSaving(false); }
  };

  if (edit) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <input
          value={val}
          inputMode="numeric"
          autoFocus
          onChange={(e) => setVal(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEdit(false); }}
          placeholder="RustDesk"
          className="w-28 text-sm border border-mist-400 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-mist-500"
        />
        <button onClick={guardar} disabled={saving} title="Guardar" className="text-emerald-600 hover:text-emerald-700 font-bold px-1 disabled:opacity-40">✓</button>
        <button onClick={() => setEdit(false)} title="Cancelar" className="text-ink-400 hover:text-ink-700 font-bold px-1">✕</button>
      </div>
    );
  }
  return (
    <button onClick={abrir} title="Editar RustDesk" className="shrink-0 text-right hover:opacity-80">
      <span className="block text-[11px] font-bold text-ink-400 uppercase tracking-widest">RustDesk</span>
      <span className="text-sm font-semibold text-ink-800">{u.rustdesk != null ? u.rustdesk : '—'}<span className="text-ink-300 text-xs ml-1">✎</span></span>
    </button>
  );
};

/**
 * Tarjeta de un grupo del equipo (administradores u operadores). Vive FUERA de
 * Usuarios: definirlo dentro lo recreaba en cada render y remontaba la lista.
 * Encabezado con el color del menu (acento) + glow en modo oscuro.
 */
const GrupoStaff = ({ titulo, gente, miNomina, guardando, onCambiarRol }) => (
  <div className="glow-card bg-white border border-cloud-200 rounded-2xl overflow-hidden shadow-sm">
    <div className="bg-mist-600 px-4 sm:px-5 py-3 flex items-center justify-between">
      <h2 className="text-sm font-bold uppercase tracking-widest text-white">{titulo}</h2>
      <span className="text-xs font-bold text-white/80 tabular-nums">{gente.length}</span>
    </div>
    {gente.length === 0 ? (
      <p className="text-xs text-ink-400 p-5">Nadie con este rol todavia. Busca abajo y asignalo.</p>
    ) : (
      <ul className="divide-y divide-cloud-100">
        {gente.map((p) => (
          <li key={p.nomina} className="px-4 sm:px-5 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cloud-100 text-ink-700 flex items-center justify-center text-sm font-bold shrink-0">
              {(p.nombre || 'U').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900 truncate">{p.nombre || `Nomina ${p.nomina}`}</p>
              <p className="text-[11px] text-ink-400 truncate">Nomina: {p.nomina}{p.nomina === miNomina ? ' · tu' : ''}</p>
            </div>
            <RolSelect rol={p.rol} disabled={guardando === p.nomina} onChange={(rol) => onCambiarRol(p.nomina, rol)} />
          </li>
        ))}
      </ul>
    )}
  </div>
);

const Usuarios = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [guardando, setGuardando] = useState(null);

  const cargarStaff = useCallback(() => {
    setLoadingStaff(true);
    usuariosApi.staff()
      .then(({ data }) => setStaff(data.data || []))
      .catch(() => setStaff([]))
      .finally(() => setLoadingStaff(false));
  }, []);

  const cargarBusqueda = useCallback(() => {
    setLoading(true);
    usuariosApi.listar({ search: search || undefined })
      .then(({ data }) => setUsuarios(data.data || []))
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { cargarStaff(); }, [cargarStaff]);
  useEffect(() => {
    const t = setTimeout(cargarBusqueda, 250);
    return () => clearTimeout(t);
  }, [cargarBusqueda]);

  const cambiarRol = async (nomina, rol) => {
    setGuardando(nomina);
    try {
      await usuariosApi.setRol(nomina, rol);
      setUsuarios((prev) => prev.map((u) => (u.nomina === nomina ? { ...u, rol } : u)));
      showAlert('Rol actualizado.', 'success');
      cargarStaff(); // el equipo de soporte cambia
    } catch (err) {
      showAlert(err.response?.data?.message || 'No se pudo cambiar el rol.', 'error');
    } finally {
      setGuardando(null);
    }
  };

  const onRustdeskSaved = (nomina, rustdesk) => setUsuarios((prev) => prev.map((x) => (x.nomina === nomina ? { ...x, rustdesk } : x)));

  const admins = staff.filter((s) => s.rol === 'admin');
  const operadores = staff.filter((s) => s.rol === 'operador');

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">Usuarios</h1>
        <p className="text-ink-500 font-medium mt-1 text-sm sm:text-base">Equipo de soporte y asignacion de roles.</p>
      </motion.div>

      {/* Apartado: equipo de soporte (admins + operadores) */}
      {loadingStaff ? (
        <div className="flex justify-center py-10"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <GrupoStaff titulo="Administradores" gente={admins} miNomina={Number(user?.nomina)} guardando={guardando} onCambiarRol={cambiarRol} />
          <GrupoStaff titulo="Operadores" gente={operadores} miNomina={Number(user?.nomina)} guardando={guardando} onCambiarRol={cambiarRol} />
        </div>
      )}

      {/* Buscar y asignar */}
      <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700 mb-3">Buscar y asignar rol</h2>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, nomina o correo..."
        className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500 transition-[border-color,box-shadow] duration-150 ease-salida mb-4"
      />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
      ) : usuarios.length === 0 ? (
        <div className="bg-white border border-cloud-200 rounded-xl py-12 text-center">
          <p className="text-sm font-semibold text-ink-900">Sin resultados</p>
          <p className="text-xs text-ink-400 font-medium mt-1">Busca un usuario por nombre, nomina o correo.</p>
        </div>
      ) : (
        <div className="glow-card bg-white border border-cloud-200 rounded-xl overflow-hidden shadow-sm">
          <ul className="divide-y divide-cloud-100">
            {usuarios.map((u) => (
              <li key={u.nomina} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink-900 truncate">{u.nombre || `Nomina ${u.nomina}`}</p>
                    <span className={`text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${ROL_BADGE[u.rol] || ROL_BADGE.usuario}`}>
                      {u.rol}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-400 truncate">Nomina: {u.nomina} · {u.email || 'sin correo'}</p>
                </div>
                <RustdeskEditor u={u} onSaved={onRustdeskSaved} />
                <RolSelect rol={u.rol} disabled={guardando === u.nomina} onChange={(rol) => cambiarRol(u.nomina, rol)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
