import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import Input from '../components/ui/Input';
import AsyncButton from '../components/ui/AsyncButton';
import { useAlert } from '../context/useAlert';
import { publicApi } from '../api/publicApi';
import Recaptcha from '../components/forms/Recaptcha';

const PublicNuevo = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const [tipos, setTipos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [form, setForm] = useState({ nombre: '', correo: '', nomina: '', puesto: '', departamento: '', tipo_id: '', problema: '' });
  const [folio, setFolio] = useState(null);
  const [siteKey, setSiteKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    publicApi.tipos().then(({ data }) => {
      const vistos = new Set();
      setTipos((data.data || []).filter((t) => (vistos.has(t.nombre) ? false : vistos.add(t.nombre))));
    }).catch(() => setTipos([]));
    publicApi.departamentos().then(({ data }) => setDepartamentos(data.data || [])).catch(() => setDepartamentos([]));
    publicApi.captcha().then(({ data }) => setSiteKey(data.site_key || '')).catch(() => setSiteKey(''));
  }, []);

  const enviar = async () => {
    if (!form.nombre.trim() || !form.correo.trim() || !form.tipo_id || !form.problema.trim()) {
      showAlert('Completa nombre, correo, tipo y problema.', 'error');
      return;
    }
    if (siteKey && !captchaToken) {
      showAlert('Confirma que no eres un robot.', 'error');
      return;
    }
    try {
      const { data } = await publicApi.crear({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        nomina: form.nomina === '' ? null : Number(form.nomina),
        puesto: form.puesto.trim() || null,
        departamento: form.departamento,
        tipo_id: Number(form.tipo_id),
        problema: form.problema.trim(),
        recaptcha_token: captchaToken,
      });
      setFolio(data.folio);
    } catch (err) {
      // El token de reCAPTCHA v2 es de un solo uso: reiniciar el widget tras un fallo.
      setCaptchaToken(null);
      setCaptchaReset((n) => n + 1);
      showAlert(err.response?.data?.message || 'No se pudo crear el ticket.', 'error');
      throw err;
    }
  };

  if (folio) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col">
        <PublicHeader />
        <main className="flex-1 max-w-md w-full mx-auto px-6 py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
          </div>
          <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">Ticket creado</h1>
          <p className="text-ink-500 font-medium mt-2">Guarda este folio para dar seguimiento:</p>
          <p className="text-3xl font-extrabold text-mist-700 tracking-tight my-4">{folio}</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => navigate(`/invitado/seguimiento?folio=${encodeURIComponent(folio)}`)} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-mist-600 text-white hover:bg-mist-700 transition-colors">
              Ver seguimiento
            </button>
            <button onClick={() => { setFolio(null); setForm({ nombre: '', correo: '', nomina: '', puesto: '', departamento: '', tipo_id: '', problema: '' }); }} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-white border border-cloud-300 text-ink-700 hover:bg-stone-100 transition-colors">
              Crear otro
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-xl w-full mx-auto px-6 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 mb-1">Crear un ticket</h1>
        <p className="text-ink-500 font-medium mb-6">Como invitado. No podras adjuntar archivos; si eres empleado, inicia sesion para hacerlo.</p>

        <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} placeholder="Tu nombre completo" />
            <Input label="Correo *" value={form.correo} onChange={set('correo')} type="email" placeholder="correo@ejemplo.com" />
            <Input label="Nomina" value={form.nomina} onChange={set('nomina')} type="number" placeholder="Opcional (acepta negativos)" />
            <div>
              <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">Departamento</label>
              <select value={form.departamento} onChange={set('departamento')} className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500">
                <option value="">Selecciona...</option>
                {departamentos.map((d) => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
              </select>
            </div>
            <Input label="Puesto" value={form.puesto} onChange={set('puesto')} placeholder="Opcional" className="sm:col-span-2" />
          </div>

          <div>
            <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1.5">Tipo de ticket *</label>
            <select value={form.tipo_id} onChange={set('tipo_id')} className="w-full bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500">
              <option value="">Selecciona...</option>
              {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>

          <Input as="textarea" label="Describe el problema *" value={form.problema} onChange={set('problema')} rows={5} placeholder="Cuentanos que sucede..." />

          {siteKey && (
            <div className="flex justify-center pt-1">
              <Recaptcha siteKey={siteKey} onChange={setCaptchaToken} resetSignal={captchaReset} />
            </div>
          )}

          <div className="pt-1">
            <AsyncButton onClick={enviar} loadingText="Enviando..." className="w-full bg-mist-600 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-mist-700 transition-colors">
              Enviar ticket
            </AsyncButton>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicNuevo;
