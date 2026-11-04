import { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import AsyncButton from './ui/AsyncButton';
import { useAlert } from '../context/useAlert';
import { perfilApi } from '../api/perfilApi';
import { respuestasApi } from '../api/respuestasApi';

// Colores de tema (oscuros, legibles con texto blanco en el topbar).
const PRESETS = [
  { label: 'Grafito', hex: '#111827' },
  { label: 'Acero', hex: '#2f4654' },
  { label: 'Azul', hex: '#1e3a8a' },
  { label: 'Teal', hex: '#0f766e' },
  { label: 'Verde', hex: '#065f46' },
  { label: 'Vino', hex: '#7f1d1d' },
  { label: 'Violeta', hex: '#4c1d95' },
  { label: 'Ambar', hex: '#92400e' },
];

// Luminancia perceptual [0..1] de un hex #rrggbb (para el preview de contraste).
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const OPCIONES_TEXTO = [['auto', 'Auto'], ['light', 'Texto claro'], ['dark', 'Texto oscuro']];

const PerfilModal = ({ open, onClose, onSaved }) => {
  const { showAlert } = useAlert();
  const [accent, setAccent] = useState('');
  const [barText, setBarText] = useState('auto');
  const [tema, setTema] = useState('claro');
  const [tieneFondo, setTieneFondo] = useState(false);
  const [file, setFile] = useState(null);

  // Respuestas predeterminadas del operador
  const [resp, setResp] = useState([]);
  const [rTitulo, setRTitulo] = useState('');
  const [rTexto, setRTexto] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setRTitulo(''); setRTexto(''); setEditId(null);
    perfilApi.show()
      .then(({ data }) => {
        setAccent(data.data?.accent || '');
        setBarText(data.data?.bar_text || 'auto');
        setTema(data.data?.tema || 'claro');
        setTieneFondo(!!data.data?.tiene_fondo);
      })
      .catch(() => {});
    respuestasApi.listar().then(({ data }) => setResp(data.data || [])).catch(() => setResp([]));
  }, [open]);

  const resetRespForm = () => { setRTitulo(''); setRTexto(''); setEditId(null); };
  const guardarResp = async () => {
    if (!rTexto.trim()) return;
    const payload = { titulo: rTitulo.trim() || null, texto: rTexto.trim() };
    try {
      const { data } = editId ? await respuestasApi.actualizar(editId, payload) : await respuestasApi.crear(payload);
      setResp(data.data || []);
      resetRespForm();
      showAlert('Respuesta guardada.', 'success');
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo guardar la respuesta.', 'error'); throw err; }
  };
  const editarResp = (r) => { setEditId(r.id); setRTitulo(r.titulo || ''); setRTexto(r.texto || ''); };
  const eliminarResp = async (id) => {
    try {
      const { data } = await respuestasApi.eliminar(id);
      setResp(data.data || []);
      if (editId === id) resetRespForm();
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo eliminar la respuesta.', 'error'); }
  };

  const guardar = async () => {
    try {
      await perfilApi.update({ accent: accent || null, bar_text: barText, tema });
      if (file) {
        const fd = new FormData();
        fd.append('imagen', file);
        await perfilApi.subirFondo(fd);
      }
      showAlert('Perfil actualizado.', 'success');
      onSaved?.();
      onClose?.();
    } catch (err) {
      showAlert(err.response?.data?.message || 'No se pudo guardar el perfil.', 'error');
      throw err;
    }
  };

  const quitarFondo = async () => {
    try {
      await perfilApi.quitarFondo();
      setTieneFondo(false);
      setFile(null);
      showAlert('Fondo eliminado.', 'info');
      onSaved?.();
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo quitar el fondo.', 'error'); }
  };

  const accentHex = accent || '#2f4654';
  const claro = barText === 'light' ? true : barText === 'dark' ? false : lum(accentHex) < 0.58;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurar perfil"
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-ink-600 hover:bg-cloud-100 transition-colors">Cancelar</button>
          <AsyncButton onClick={guardar} loadingText="Guardando..." className="bg-mist-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-mist-700">Guardar</AsyncButton>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-ink-400 font-medium">Personaliza tu vista de administracion. Solo aplica para ti.</p>

        {/* Modo oscuro */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block">Modo oscuro</label>
            <p className="text-[11px] text-ink-400 mt-0.5">Tarjetas, textos y fondos oscuros en tu vista (se aplica al guardar).</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={tema === 'oscuro'}
            onClick={() => setTema((v) => (v === 'oscuro' ? 'claro' : 'oscuro'))}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${tema === 'oscuro' ? 'bg-mist-600' : 'bg-cloud-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${tema === 'oscuro' ? 'translate-x-5' : ''}`} style={{ backgroundColor: '#fff' }} />
          </button>
        </div>

        {/* Color principal (re-tematiza toda la vista admin) */}
        <div>
          <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-2">Color principal</label>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                onClick={() => setAccent(c.hex)}
                className={`w-8 h-8 rounded-full border-2 transition-transform active:scale-[0.96] ${accent?.toLowerCase() === c.hex ? 'border-ink-700 scale-110' : 'border-cloud-200'}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <label className="w-8 h-8 rounded-full border-2 border-dashed border-cloud-300 flex items-center justify-center cursor-pointer text-ink-400 text-xs" title="Color personalizado">
              +
              <input type="color" value={accent || '#2f4654'} onChange={(e) => setAccent(e.target.value)} className="sr-only" />
            </label>
            <button type="button" onClick={() => setAccent('')} className="text-[11px] font-bold text-ink-500 hover:text-ink-800 ml-1">Predeterminado</button>
          </div>
          <p className="text-[11px] text-ink-400 mt-1.5">Pinta la barra superior, botones, badges y acentos de toda tu vista de administracion.</p>
          {/* Vista previa: barra con items + boton + etiqueta */}
          <div className="mt-2 rounded-lg overflow-hidden border border-cloud-200">
            <div className="h-11 flex items-center gap-2.5 px-3" style={{ backgroundColor: accentHex }}>
              <span className={`text-xs font-bold ${claro ? 'text-white' : 'text-ink-900'}`}>HelpDesk</span>
              <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${claro ? 'bg-white/20 text-white' : 'bg-black/10 text-ink-900'}`}>Inicio</span>
              <span className={`text-[11px] font-semibold ${claro ? 'text-white/75' : 'text-ink-900/60'}`}>Tickets</span>
              <span className={`text-[11px] font-semibold ${claro ? 'text-white/75' : 'text-ink-900/60'}`}>Monitor</span>
            </div>
            <div className="bg-white p-3 flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-white text-xs font-bold" style={{ backgroundColor: accentHex }}>Boton</span>
              <span className="px-2 py-1 rounded-md text-xs font-bold bg-cloud-100" style={{ color: accentHex }}>Etiqueta</span>
            </div>
          </div>
        </div>

        {/* Contraste del texto de la barra */}
        <div>
          <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-2">Texto de la barra</label>
          <div className="inline-flex rounded-lg border border-cloud-200 p-0.5 bg-cloud-50">
            {OPCIONES_TEXTO.map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setBarText(val)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${barText === val ? 'bg-mist-600 text-white' : 'text-ink-500 hover:text-ink-800'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-400 mt-1.5">Si los nombres del menu no contrastan con el color, ajustalo aqui. "Auto" lo decide segun el color elegido.</p>
        </div>

        {/* Imagen de fondo */}
        <div>
          <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-2">Imagen de fondo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-ink-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-mist-600 file:text-white hover:file:bg-mist-700 file:cursor-pointer"
          />
          <div className="flex items-center gap-3 mt-2">
            {file && <span className="text-xs text-ink-500 truncate">{file.name}</span>}
            {tieneFondo && !file && (
              <>
                <span className="text-xs text-ink-500">Tienes un fondo activo.</span>
                <button type="button" onClick={quitarFondo} className="text-[11px] font-bold text-red-600 hover:text-red-700">Quitar fondo</button>
              </>
            )}
          </div>
          <p className="text-[11px] text-ink-400 mt-1">Imagen (JPG/PNG), max 8MB. Se mostrara atenuada detras del contenido.</p>
        </div>

        {/* Respuestas predeterminadas (para el chat de tickets) */}
        <div className="pt-5 border-t border-cloud-200">
          <label className="text-[11px] font-bold text-ink-500 uppercase tracking-widest block mb-1">Respuestas predeterminadas</label>
          <p className="text-[11px] text-ink-400 mb-2">Guarda respuestas frecuentes y en el chat de un ticket podras insertarlas con un botón.</p>

          {resp.length > 0 && (
            <ul className="space-y-1.5 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
              {resp.map((r) => (
                <li key={r.id} className={`flex items-start gap-2 border rounded-lg px-3 py-2 ${editId === r.id ? 'border-mist-400 bg-mist-50' : 'border-cloud-200 bg-cloud-50'}`}>
                  <div className="min-w-0 flex-1">
                    {r.titulo && <p className="text-xs font-bold text-ink-800 truncate">{r.titulo}</p>}
                    <p className="text-xs text-ink-600 line-clamp-2 whitespace-pre-wrap break-words">{r.texto}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => editarResp(r)} className="text-[11px] font-bold texto-acento">Editar</button>
                    <button type="button" onClick={() => eliminarResp(r.id)} className="text-[11px] font-bold text-red-600 hover:text-red-700">Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <input
            value={rTitulo}
            onChange={(e) => setRTitulo(e.target.value)}
            maxLength={80}
            placeholder="Título corto (opcional)"
            className="w-full mb-2 bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500"
          />
          <textarea
            value={rTexto}
            onChange={(e) => setRTexto(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Texto de la respuesta..."
            className="w-full resize-y bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500"
          />
          <div className="flex items-center gap-2 mt-2">
            <AsyncButton onClick={guardarResp} disabled={!rTexto.trim()} className="bg-mist-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-mist-700 disabled:opacity-40">
              {editId ? 'Guardar cambios' : 'Agregar respuesta'}
            </AsyncButton>
            {editId && <button type="button" onClick={resetRespForm} className="text-xs font-semibold text-ink-500 hover:text-ink-800">Cancelar edición</button>}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PerfilModal;
