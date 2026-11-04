import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import NominaInput from './NominaInput';
import SelectorArchivos from './SelectorArchivos';
import AsyncButton from '../ui/AsyncButton';
import { useAuth } from '../../context/useAuth';
import { useAlert } from '../../context/useAlert';
import { ticketsApi } from '../../api/ticketsApi';

// Modal de creacion de ticket.
//  - modo "usuario": identidad PRELLENADA del usuario pero editable (puede completar
//    puesto/departamento). La nomina queda anclada a su sesion (solo lectura).
//  - modo "operador": alta manual; el operador captura toda la identidad.
// onCreated(ticket) se llama tras crear para refrescar listas.
const NuevoTicketModal = ({ open, onClose, modo = 'usuario', onCreated }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const esManual = modo === 'operador';

  const [tipos, setTipos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [tipoId, setTipoId] = useState('');
  const [problema, setProblema] = useState('');
  const [nombre, setNombre] = useState('');
  const [nomina, setNomina] = useState('');
  const [puesto, setPuesto] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [correo, setCorreo] = useState('');
  const [rustdesk, setRustdesk] = useState(''); // dato por usuario (solo alta manual)
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!open) return;
    ticketsApi.tipos()
      .then(({ data }) => {
        const vistos = new Set();
        setTipos((data.data || []).filter((t) => (vistos.has(t.nombre) ? false : vistos.add(t.nombre))));
      })
      .catch(() => setTipos([]));
    ticketsApi.departamentos()
      .then(({ data }) => setDepartamentos(data.data || []))
      .catch(() => setDepartamentos([]));

    // Prellenado de identidad (incluye puesto y departamento resueltos desde la BD central)
    if (!esManual && user) {
      const full = `${user.name ?? ''} ${user.apellidopaterno ?? ''} ${user.apellidomaterno ?? ''}`.trim();
      setNombre(full);
      setNomina(user.nomina ?? '');
      setCorreo(user.email ?? '');
      setPuesto(user.puesto ?? '');
      setDepartamento(user.departamento ?? '');
    } else {
      setNombre(''); setNomina(''); setCorreo(''); setPuesto(''); setDepartamento('');
    }
    setRustdesk('');
    setTipoId(''); setProblema(''); setFiles([]);
  }, [open, esManual, user]);

  const handleEnviar = async () => {
    if (!tipoId || !problema.trim()) {
      showAlert('Selecciona un tipo y describe el problema.', 'error');
      return;
    }
    if (!nombre.trim()) {
      showAlert('El nombre es obligatorio.', 'error');
      return;
    }
    if (!esManual && !departamento.trim()) {
      showAlert('Selecciona tu departamento.', 'error');
      return;
    }

    const payload = esManual
      ? {
          manual: true,
          tipo_id: Number(tipoId),
          problema: problema.trim(),
          nombre: nombre.trim(),
          nomina: nomina === '' ? null : Number(nomina),
          puesto: puesto.trim() || null,
          departamento: departamento.trim() || null,
          correo: correo.trim() || null,
          rustdesk: rustdesk ? Number(rustdesk) : null,
        }
      : {
          // self: la nomina la pone el backend (sesion); lo demas es editable.
          tipo_id: Number(tipoId),
          problema: problema.trim(),
          nombre: nombre.trim(),
          puesto: puesto.trim() || null,
          departamento: departamento.trim() || null,
          correo: correo.trim() || null,
        };

    try {
      const { data } = await ticketsApi.crear(payload);
      const ticket = data.data;
      // Sube la evidencia adjuntada al ticket recien creado (si hay).
      const fallidos = [];
      if (ticket?.id && files.length) {
        for (const f of files) {
          const fd = new FormData();
          fd.append('archivo', f);
          try { await ticketsApi.subirArchivo(ticket.id, fd); } catch { fallidos.push(f.name); }
        }
      }
      if (fallidos.length) {
        showAlert(`Ticket creado, pero no se pudo subir: ${fallidos.join(', ')}. Revisa el tamaño (los videos suelen ser muy grandes).`, 'error');
      } else {
        showAlert(`Ticket ${ticket?.folio || ''} creado.`, 'success');
      }
      onCreated?.(ticket);
      onClose?.();
    } catch (err) {
      showAlert(err.response?.data?.message || 'No se pudo crear el ticket.', 'error');
      throw err;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esManual ? 'Nuevo ticket (alta manual)' : 'Nuevo ticket'}
      maxWidth="max-w-xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-ink-600 hover:bg-cloud-100 transition-colors">
            Cancelar
          </button>
          <AsyncButton
            onClick={handleEnviar}
            loadingText="Enviando..."
            className="bg-mist-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-mist-700 transition-colors"
          >
            Enviar ticket
          </AsyncButton>
        </>
      }
    >
      <div className="space-y-5">
        {/* Identidad (editable) */}
        <div className={`rounded-xl p-4 border ${esManual ? 'bg-cloud-50 border-cloud-200' : 'bg-stone-100 border-stone-200'}`}>
          <p className="text-[11px] font-bold text-ink-500 uppercase tracking-widest mb-3">
            {esManual ? 'Datos del solicitante' : 'Tus datos (puedes editarlos y completar lo que falte)'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" className={esManual ? 'sm:col-span-2' : ''} />
            {esManual ? (
              <>
                <Input label="RustDesk" value={rustdesk} inputMode="numeric" maxLength={12} onChange={(e) => setRustdesk(e.target.value.replace(/\D/g, ''))} placeholder="ID de RustDesk" />
                <NominaInput
                  value={nomina}
                  onChange={(e) => setNomina(e.target.value)}
                  onResolved={(u) => {
                    // Reemplaza por completo lo que hubiera antes (no conservar datos previos).
                    setNombre(u.nombre?.trim() || '');
                    setCorreo(u.email || '');
                    setPuesto(u.puesto || '');
                    setDepartamento(u.departamento || '');
                    setRustdesk(u.rustdesk || '');
                  }}
                />
              </>
            ) : (
              <Input label="Nomina (fija)" value={nomina} readOnly className="opacity-70" />
            )}
            <Input label="Puesto" value={puesto} onChange={(e) => setPuesto(e.target.value)} placeholder="Tu puesto" />
            <div>
              <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">
                Departamento{!esManual ? ' *' : ''}
              </label>
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500"
              >
                <option value="">Selecciona...</option>
                {departamentos.map((d) => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
              </select>
            </div>
            <Input label="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} type="email" placeholder="correo@example.com" className="sm:col-span-2" />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">Tipo de ticket</label>
          <select
            value={tipoId}
            onChange={(e) => setTipoId(e.target.value)}
            className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500 transition-[border-color,box-shadow] duration-150 ease-salida"
          >
            <option value="">Selecciona un tipo...</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>

        <Input
          as="textarea"
          label="Describe el problema"
          value={problema}
          onChange={(e) => setProblema(e.target.value)}
          placeholder="Cuentanos que sucede con el mayor detalle posible..."
          rows={5}
        />

        {/* Evidencia (opcional) - disponible para usuarios con sesion */}
        <div>
          <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">Evidencia (opcional)</label>
          <SelectorArchivos files={files} onChange={setFiles} />
        </div>
      </div>
    </Modal>
  );
};

export default NuevoTicketModal;
