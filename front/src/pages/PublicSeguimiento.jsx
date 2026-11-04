import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import AsyncButton from '../components/ui/AsyncButton';
import Spinner from '../components/ui/Spinner';
import { useAlert } from '../context/useAlert';
import { publicApi } from '../api/publicApi';
import { estadoLabel, estadoBadge, fmtFechaHora } from '../utils/estados';

const PublicSeguimiento = () => {
  const [params] = useSearchParams();
  const { showAlert } = useAlert();

  const [folio, setFolio] = useState(params.get('folio') || '');
  const [data, setData] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [respuesta, setRespuesta] = useState('');

  const buscar = useCallback(async (f) => {
    const target = (f ?? folio).trim();
    if (!target) return;
    setLoading(true);
    try {
      const { data: res } = await publicApi.seguimiento(target);
      setData(res.data);
      setMensajes(res.mensajes || []);
    } catch (err) {
      setData(null);
      showAlert(err.response?.data?.message || 'No encontramos ese folio.', 'error');
    } finally {
      setLoading(false);
    }
  }, [folio, showAlert]);

  // Auto-buscar si viene ?folio= en la URL
  useEffect(() => {
    const f = params.get('folio');
    if (f) buscar(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const responder = async () => {
    if (!respuesta.trim()) return;
    try {
      const { data: res } = await publicApi.responder(data.folio, { cuerpo: respuesta.trim() });
      setMensajes(res.mensajes || []);
      setRespuesta('');
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo enviar tu respuesta.', 'error'); }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <PublicHeader />
      <main className="flex-1 max-w-xl w-full mx-auto px-6 py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 mb-1">Seguimiento</h1>
        <p className="text-ink-500 font-medium mb-6">Ingresa el folio que recibiste al crear tu ticket.</p>

        <div className="flex items-center gap-2 mb-6">
          <input
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
            placeholder="Ej. TK-000001"
            className="flex-1 bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3.5 py-2.5 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500"
          />
          <AsyncButton onClick={() => buscar()} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-mist-600 text-white hover:bg-mist-700">
            Buscar
          </AsyncButton>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
        ) : data ? (
          <div className="space-y-5">
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold tracking-tight text-ink-900">{data.folio}</h2>
                <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${estadoBadge(data.estado)}`}>
                  {estadoLabel(data.estado)}
                </span>
              </div>
              <p className="text-sm text-ink-500 font-medium mt-1">{data.tipo_nombre || 'Sin tipo'} · creado {fmtFechaHora(data.created_at)}</p>
              <p className="text-sm text-ink-800 mt-3 whitespace-pre-wrap">{data.problema}</p>
            </div>

            <div className="bg-white border border-stone-200 rounded-2xl flex flex-col">
              <div className="px-5 py-3.5 border-b border-stone-200">
                <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">Conversacion</h2>
              </div>
              <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar">
                {mensajes.length === 0 ? (
                  <p className="text-sm text-ink-400 text-center py-6">Aun no hay mensajes.</p>
                ) : (
                  mensajes.map((m) => (
                    <div key={m.id} className={`flex ${m.es_staff ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[80%]">
                        <p className={`text-[11px] font-semibold text-ink-400 mb-0.5 ${m.es_staff ? '' : 'text-right'}`}>
                          {m.es_staff ? 'Soporte' : (m.autor_nombre || 'Tu')}
                        </p>
                        <div className={`rounded-2xl px-3 py-2 ${m.es_staff ? 'bg-cloud-100 text-ink-800 rounded-tl-sm' : 'bg-mist-600 text-white rounded-tr-sm'}`}>
                          <p className="text-sm whitespace-pre-wrap">{m.cuerpo}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-stone-200 p-3 flex items-end gap-2">
                <textarea
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); responder(); } }}
                  rows={2}
                  placeholder="Escribe una respuesta... (Enter envia, Shift+Enter salto de linea)"
                  className="flex-1 resize-none border border-cloud-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500"
                />
                <AsyncButton onClick={responder} disabled={!respuesta.trim()} className="px-4 py-2.5 rounded-lg text-sm font-bold bg-mist-600 text-white hover:bg-mist-700 shrink-0">
                  Enviar
                </AsyncButton>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default PublicSeguimiento;
