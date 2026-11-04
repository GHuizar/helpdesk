import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useAlert } from '../context/useAlert';
import { ticketsApi } from '../api/ticketsApi';
import { respuestasApi } from '../api/respuestasApi';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import AsyncButton from '../components/ui/AsyncButton';
import VisorArchivo from '../components/VisorArchivo';
import NominaInput from '../components/forms/NominaInput';
import { estadoLabel, estadoBadge, estadoDesc, fmtFechaHora, fmtHora, fmtAntiguedad } from '../utils/estados';

const ACCIONES_STAFF = {
  abierto: [
    { e: 'en_curso', label: 'Tomar / En curso', tone: 'primary' },
    { e: 'cancelado', label: 'Cancelar', tone: 'danger', justif: true },
  ],
  en_curso: [
    { e: 'finalizado', label: 'Solicitar cierre', tone: 'primary' },
    { e: 'cancelado', label: 'Cancelar', tone: 'danger', justif: true },
  ],
};

const TONE = {
  primary: 'bg-mist-600 text-white hover:bg-mist-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  neutral: 'bg-white border border-cloud-300 text-ink-700 hover:bg-cloud-100',
};

const CERRADOS = ['validado', 'cancelado'];

const fmtTamano = (b) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

// Clave de autor para agrupar mensajes consecutivos del mismo remitente (chat estilo mensajeria).
const claveAutor = (m) => `${m.autor_nomina ?? m.autor_nombre ?? ''}|${m.es_staff ? 's' : 'u'}`;
const iniciales = (nombre) => (nombre || 'U').trim().split(/\s+/).slice(0, 2).map((s) => s[0] || '').join('').toUpperCase() || 'U';
// Color estable por autor (mismo autor -> mismo color siempre) para diferenciar participantes del chat.
const PALETA_AUTOR = ['#e11d48', '#d97706', '#059669', '#7c3aed', '#0d9488', '#ea580c', '#c026d3', '#0891b2', '#65a30d', '#4f46e5'];
const hashCad = (s) => { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const colorAutor = (m) => PALETA_AUTOR[hashCad(claveAutor(m)) % PALETA_AUTOR.length];

const IconBack = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
);
const IconClip = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M368 224v-52.9a32 32 0 00-9.37-22.63L269.54 43.37A32 32 0 00246.91 34H88a40 40 0 00-40 40v364a40 40 0 0040 40h192" />
    <path d="M240 44v92a32 32 0 0032 32h92" />
    <path d="M448 344.46V424a40.11 40.11 0 01-40 40 40.11 40.11 0 01-40-40V280a24 24 0 0124-24 24 24 0 0124 24v150" />
  </svg>
);
const IconImagen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" /></svg>
);
const IconCerrar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
);
const IconEmoji = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" /></svg>
);
// Rayo: atajo de respuestas predeterminadas.
const IconRayo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
);
// Atajo de emojis frecuentes para el chat.
const EMOJIS = ['😀', '😁', '😂', '🤣', '🙂', '😊', '😉', '😍', '😎', '🤔', '😐', '😕', '😢', '😭', '😡', '😴', '👍', '👎', '👌', '🙏', '👏', '💪', '🙌', '🤝', '✅', '❌', '⚠️', '❓', '❗', '🔥', '⭐', '💯', '🎉', '❤️', '💻', '🖥️', '📱', '📎', '📷', '🔒', '⏰', '✉️', '📞', '🚀', '🛠️', '🔧'];

// Imagen adjunta de un mensaje del chat: se descarga como blob (con token) y se muestra inline.
// Al hacer clic se amplia (onAmpliar). Reutiliza el mismo objectURL en el visor grande.
const ChatImagen = ({ ticketId, mensajeId, mio, onAmpliar }) => {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let obj = null; let cancel = false;
    ticketsApi.imagenMensaje(ticketId, mensajeId)
      .then((res) => { if (cancel) return; obj = URL.createObjectURL(res.data); setUrl(obj); })
      .catch(() => { if (!cancel) setError(true); });
    return () => { cancel = true; if (obj) URL.revokeObjectURL(obj); };
  }, [ticketId, mensajeId]);

  if (error) return <p className={`text-xs ${mio ? 'text-mist-100' : 'text-ink-400'}`}>No se pudo cargar la imagen.</p>;
  if (!url) return <div className={`w-40 h-28 rounded-lg animate-pulse ${mio ? 'bg-mist-500' : 'bg-cloud-200'}`} />;
  return (
    <button type="button" onClick={() => onAmpliar({ url })} className="block">
      <img src={url} alt="Imagen del chat" className="max-h-52 max-w-full rounded-lg cursor-zoom-in" />
    </button>
  );
};

// Lightbox con zoom para la imagen ampliada del chat: rueda, botones, doble clic y arrastre para desplazar.
const LightboxImagen = ({ url, onClose }) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const contRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  useEffect(() => {
    const el = contRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.3;
      setScale((s) => {
        const ns = Math.min(6, Math.max(1, +(s + delta).toFixed(2)));
        if (ns === 1) setPan({ x: 0, y: 0 });
        return ns;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const zoom = (delta) => setScale((s) => {
    const ns = Math.min(6, Math.max(1, +(s + delta).toFixed(2)));
    if (ns === 1) setPan({ x: 0, y: 0 });
    return ns;
  });
  const onDown = (e) => { if (scale <= 1) return; e.preventDefault(); dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y }; };
  const onMove = (e) => { if (!dragRef.current) return; setPan({ x: dragRef.current.ox + (e.clientX - dragRef.current.sx), y: dragRef.current.oy + (e.clientY - dragRef.current.sy) }); };
  const onUp = () => { dragRef.current = null; };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center" onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <div className="absolute inset-0 bg-ink-900/80 backdrop-blur-sm" />
      <div ref={contRef} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <img
          src={url}
          alt="Imagen del chat"
          onMouseDown={onDown}
          onDoubleClick={() => { setScale((s) => (s === 1 ? 2.5 : 1)); setPan({ x: 0, y: 0 }); }}
          draggable={false}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'zoom-in' }}
          className="max-w-[92vw] max-h-[92vh] object-contain rounded-lg shadow-2xl select-none transition-transform duration-75"
        />
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
          <button onClick={() => zoom(-0.3)} disabled={scale <= 1} className="w-8 h-8 flex items-center justify-center rounded text-white/90 hover:bg-white/20 disabled:opacity-30 text-xl leading-none">−</button>
          <span className="text-xs font-semibold text-white/90 w-11 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoom(0.3)} disabled={scale >= 6} className="w-8 h-8 flex items-center justify-center rounded text-white/90 hover:bg-white/20 disabled:opacity-30 text-xl leading-none">+</button>
        </div>
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-white/90 hover:bg-white/20" title="Cerrar (Esc)"><IconCerrar /></button>
      </div>
    </div>
  );
};

const IconLapiz = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
);

const Dato = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-semibold text-ink-900 truncate">{value ?? '-'}</p>
  </div>
);

const TicketDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { showAlert } = useAlert();

  const [ticket, setTicket] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [puedeStaff, setPuedeStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  const [nuevoMsg, setNuevoMsg] = useState('');
  const [nuevaNota, setNuevaNota] = useState('');
  const [accion, setAccion] = useState(null);
  const [justif, setJustif] = useState('');
  const [operadores, setOperadores] = useState([]);
  const [reasignNomina, setReasignNomina] = useState('');
  const [visor, setVisor] = useState(null);
  const [datosOpen, setDatosOpen] = useState(false);
  const [datosForm, setDatosForm] = useState({ nombre: '', nomina: '', puesto: '', departamento: '', correo: '', rustdesk: '' });
  const [rustdeskEdit, setRustdeskEdit] = useState(false); // edicion inline del RustDesk
  const [rustdeskVal, setRustdeskVal] = useState('');
  const [imgChat, setImgChat] = useState(null);     // imagen (File) a enviar en el chat
  const [imgPreview, setImgPreview] = useState(null); // objectURL para la vista previa
  const [lightbox, setLightbox] = useState(null);   // { url } imagen del chat ampliada
  const [emojiOpen, setEmojiOpen] = useState(false); // panel de emojis del chat
  const [respuestas, setRespuestas] = useState([]);  // respuestas predeterminadas del operador
  const [respOpen, setRespOpen] = useState(false);   // panel de respuestas predeterminadas

  const chatInputRef = useRef(null);
  const timelineRef = useRef(null);
  const enviandoRef = useRef(false); // bloqueo anti-duplicados (Enter rapido)

  // Vista previa de la imagen del chat: crea/revoca el objectURL segun la imagen elegida.
  useEffect(() => {
    if (!imgChat) { setImgPreview(null); return undefined; }
    const url = URL.createObjectURL(imgChat);
    setImgPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imgChat]);

  // Auto-crece el textarea del chat segun el contenido, con tope en donde termina la linea de
  // tiempo (o el borde inferior de la ventana). Solo crece si el texto se desborda y hay espacio abajo.
  const ajustarAltoChat = useCallback(() => {
    const ta = chatInputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const top = ta.getBoundingClientRect().top;
    const finTimeline = timelineRef.current?.getBoundingClientRect().bottom ?? window.innerHeight;
    const limite = Math.min(finTimeline, window.innerHeight - 16);
    const maxH = Math.max(56, limite - top - 8);
    // Mantiene un minimo de ~2 lineas y crece con el contenido hasta el tope del timeline.
    ta.style.height = `${Math.min(Math.max(ta.scrollHeight, 56), maxH)}px`;
  }, []);

  useEffect(() => { ajustarAltoChat(); }, [nuevoMsg, imgPreview, ajustarAltoChat]);
  useEffect(() => {
    window.addEventListener('resize', ajustarAltoChat);
    return () => window.removeEventListener('resize', ajustarAltoChat);
  }, [ajustarAltoChat]);

  const cargar = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([ticketsApi.detalle(id), ticketsApi.mensajes(id)])
      .then(([det, msg]) => {
        setTicket(det.data.data);
        setEventos(det.data.eventos || []);
        setArchivos(det.data.archivos || []);
        setPuedeStaff(!!det.data.puede_staff);
        setMensajes(msg.data.data || []);
        setReasignNomina(det.data.data?.responsable_nomina ?? '');
      })
      .catch((err) => {
        if (!silent) {
          showAlert(err.response?.data?.message || 'No se pudo cargar el ticket.', 'error');
          navigate(-1);
        }
      })
      .finally(() => { if (!silent) setLoading(false); });
  }, [id, navigate, showAlert]);

  useEffect(() => {
    cargar();
    const intervalo = setInterval(() => cargar(true), 30000); // refresca ticket + mensajes cada 30s (silencioso)
    return () => clearInterval(intervalo);
  }, [cargar]);

  // Catalogo de operadores (solo admin, para reasignar)
  useEffect(() => {
    if (isAdmin) ticketsApi.operadores().then(({ data }) => setOperadores(data.data || [])).catch(() => {});
  }, [isAdmin]);

  // Respuestas predeterminadas del operador (para insertar en el chat)
  useEffect(() => {
    if (puedeStaff) respuestasApi.listar().then(({ data }) => setRespuestas(data.data || [])).catch(() => {});
  }, [puedeStaff]);

  const esMio = ticket && ticket.nomina != null && Number(ticket.nomina) === Number(user?.nomina);
  const chatMsgs = useMemo(() => mensajes.filter((m) => !m.es_interno), [mensajes]);
  const notas = useMemo(() => mensajes.filter((m) => m.es_interno), [mensajes]);

  const recargarMensajes = () => ticketsApi.mensajes(id).then(({ data }) => setMensajes(data.data || []));

  const enviarChat = async () => {
    if (enviandoRef.current) return;           // ya hay un envio en curso: ignora (evita duplicados)
    if (!nuevoMsg.trim() && !imgChat) return;
    enviandoRef.current = true;
    try {
      if (imgChat) {
        const fd = new FormData();
        if (nuevoMsg.trim()) fd.append('cuerpo', nuevoMsg.trim());
        fd.append('imagen', imgChat);
        fd.append('es_interno', '0');
        await ticketsApi.enviarMensaje(id, fd);
      } else {
        await ticketsApi.enviarMensaje(id, { cuerpo: nuevoMsg.trim(), es_interno: false });
      }
      setNuevoMsg('');
      setImgChat(null);
      cargar(true); // recarga silenciosa: refleja el posible cambio a "en curso"
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo enviar el mensaje.', 'error'); }
    finally { enviandoRef.current = false; }
  };

  // Selecciona una imagen para el chat (valida tipo y tamano).
  const elegirImgChat = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showAlert('Solo se permiten imagenes.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showAlert('La imagen supera el limite de 10 MB.', 'error'); return; }
    setImgChat(file);
  };
  const quitarImgChat = () => setImgChat(null);

  // Pegar imagen del portapapeles (Ctrl+V) directo en el chat: capturas o imagenes copiadas.
  const pegarImagen = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (!file) continue;
        if (file.size > 10 * 1024 * 1024) { showAlert('La imagen supera el limite de 10 MB.', 'error'); return; }
        e.preventDefault(); // no pegar la imagen como texto/basura
        setImgChat(file);
        showAlert('Imagen pegada. Revisa la vista previa y envía.', 'info');
        return;
      }
    }
  };

  // Inserta texto (emoji o respuesta predeterminada) en la posicion del cursor del textarea.
  const insertarEmoji = (texto) => {
    const ta = chatInputRef.current;
    if (!ta) { setNuevoMsg((t) => t + texto); return; }
    const start = ta.selectionStart ?? nuevoMsg.length;
    const end = ta.selectionEnd ?? nuevoMsg.length;
    setNuevoMsg(nuevoMsg.slice(0, start) + texto + nuevoMsg.slice(end));
    requestAnimationFrame(() => { ta.focus(); const pos = start + texto.length; ta.setSelectionRange(pos, pos); });
  };
  const insertarRespuesta = (texto) => { insertarEmoji(texto); setRespOpen(false); };

  // Enter envia, Shift+Enter inserta salto de linea.
  const onChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarChat();
    }
  };

  const abrirEditarDatos = () => {
    setDatosForm({
      nombre: ticket.nombre || '',
      nomina: ticket.nomina ?? '',
      puesto: ticket.puesto || '',
      departamento: ticket.departamento || '',
      correo: ticket.correo || '',
      rustdesk: ticket.rustdesk || '',
    });
    setDatosOpen(true);
  };

  const guardarDatos = async () => {
    if (!datosForm.nombre.trim()) { showAlert('El nombre es obligatorio.', 'error'); return; }
    try {
      await ticketsApi.actualizarDatos(id, {
        nombre: datosForm.nombre.trim(),
        nomina: datosForm.nomina === '' ? null : Number(datosForm.nomina),
        puesto: datosForm.puesto.trim() || null,
        departamento: datosForm.departamento.trim() || null,
        correo: datosForm.correo.trim() || null,
      });
      // RustDesk es por nomina: se guarda aparte, solo si el solicitante tiene nomina.
      if (datosForm.nomina !== '' && datosForm.nomina != null) {
        await ticketsApi.actualizarRustdesk(id, { rustdesk: datosForm.rustdesk ? Number(datosForm.rustdesk) : null });
      }
      showAlert('Datos actualizados.', 'success');
      setDatosOpen(false);
      cargar(true);
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo actualizar.', 'error'); }
  };

  const abrirRustdesk = () => { setRustdeskVal(ticket?.rustdesk || ''); setRustdeskEdit(true); };
  const guardarRustdesk = async () => {
    try {
      const { data } = await ticketsApi.actualizarRustdesk(id, { rustdesk: rustdeskVal ? Number(rustdeskVal) : null });
      setTicket(data.data);
      setRustdeskEdit(false);
      showAlert('RustDesk actualizado.', 'success');
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo guardar el RustDesk.', 'error'); }
  };

  const agregarNota = async () => {
    if (!nuevaNota.trim()) return;
    try {
      await ticketsApi.enviarMensaje(id, { cuerpo: nuevaNota.trim(), es_interno: true });
      setNuevaNota('');
      await recargarMensajes();
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo guardar la nota.', 'error'); }
  };

  const ejecutarEstado = async (estado, justificacion = '') => {
    try {
      await ticketsApi.cambiarEstado(id, { estado, justificacion });
      showAlert('Estado actualizado.', 'success');
      setAccion(null); setJustif('');
      cargar();
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo cambiar el estado.', 'error'); }
  };

  const onAccionStaff = (a) => (a.justif ? (setAccion(a), setJustif('')) : ejecutarEstado(a.e));

  const validar = async () => {
    try { await ticketsApi.validar(id); showAlert('Cierre validado. Gracias.', 'success'); cargar(); }
    catch (err) { showAlert(err.response?.data?.message || 'No se pudo validar.', 'error'); }
  };
  const reabrir = async () => {
    try { await ticketsApi.reabrir(id); showAlert('El ticket se reabrio.', 'info'); cargar(); }
    catch (err) { showAlert(err.response?.data?.message || 'No se pudo reabrir.', 'error'); }
  };

  const subirArchivo = async (e) => {
    const lista = Array.from(e.target.files || []);
    if (!lista.length) return;
    try {
      let data;
      for (const file of lista) {
        const fd = new FormData();
        fd.append('archivo', file);
        ({ data } = await ticketsApi.subirArchivo(id, fd));
      }
      setArchivos(data?.data || []);
      showAlert(lista.length > 1 ? `${lista.length} archivos adjuntados.` : 'Archivo adjuntado.', 'success');
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo subir el archivo.', 'error'); }
    finally { e.target.value = ''; }
  };

  const reasignar = async () => {
    try {
      await ticketsApi.reasignar(id, { responsable_nomina: reasignNomina === '' ? null : Number(reasignNomina) });
      showAlert('Responsable actualizado.', 'success');
      cargar();
    } catch (err) { showAlert(err.response?.data?.message || 'No se pudo reasignar.', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner className="h-7 w-7" /></div>;
  if (!ticket) return null;

  const accionesStaff = puedeStaff ? (ACCIONES_STAFF[ticket.estado] || []) : [];
  const ownerDecide = esMio && ticket.estado === 'finalizado';
  const cerrado = CERRADOS.includes(ticket.estado);

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800 transition-colors mb-4">
        <IconBack /> Volver
      </button>

      {/* Cabecera */}
      <div className="bg-white border border-cloud-200 rounded-2xl p-5 sm:p-6 mb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{ticket.folio || `Ticket #${ticket.id}`}</h1>
            <span className={`text-[11px] font-bold uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${estadoBadge(ticket.estado)}`}>
              {estadoLabel(ticket.estado)}
            </span>
            {!!ticket.es_invitado && (
              <span className="text-[11px] font-bold uppercase tracking-wide border border-stone-300 bg-stone-100 text-ink-600 rounded-full px-2.5 py-0.5">Invitado</span>
            )}
          </div>
          {puedeStaff && (isAdmin || !!ticket.es_invitado) && (
            <button onClick={abrirEditarDatos} className="shrink-0 inline-flex items-center text-xs font-bold texto-acento border border-cloud-300 rounded-lg px-3 py-1.5 min-h-9 transition-colors duration-150">
              Editar datos
            </button>
          )}
        </div>
        <p className="text-sm text-ink-600 mt-2">{estadoDesc(ticket.estado)}</p>
        <p className="text-sm text-ink-500 font-medium mt-1">
          {ticket.tipo_nombre || 'Sin tipo'} · creado <span className="tabular-nums">{fmtFechaHora(ticket.created_at)}</span>
          {!CERRADOS.includes(ticket.estado) && ` · abierto hace ${fmtAntiguedad(ticket.created_at)}`}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-5 pt-5 border-t border-cloud-100">
          <Dato label="Solicitante" value={ticket.nombre} />
          <Dato label="Nomina" value={ticket.nomina ?? 'Invitado'} />
          <Dato label="Departamento" value={ticket.departamento} />
          <Dato label="Puesto" value={ticket.puesto} />
          <Dato label="Correo" value={ticket.correo} />
          {/* RustDesk: dato por usuario (por nomina), editable por cualquier staff con acceso */}
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest">RustDesk</p>
            {rustdeskEdit ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  value={rustdeskVal}
                  inputMode="numeric"
                  onChange={(e) => setRustdeskVal(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') guardarRustdesk(); if (e.key === 'Escape') setRustdeskEdit(false); }}
                  maxLength={12}
                  autoFocus
                  placeholder="ID"
                  className="w-full min-w-0 text-sm border border-mist-400 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-mist-500"
                />
                <button onClick={guardarRustdesk} title="Guardar" className="shrink-0 text-emerald-600 hover:text-emerald-700 font-bold">✓</button>
                <button onClick={() => setRustdeskEdit(false)} title="Cancelar" className="shrink-0 text-ink-400 hover:text-ink-700 font-bold">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-ink-900 truncate">{ticket.rustdesk || '-'}</p>
                {puedeStaff && ticket.nomina != null && (
                  <button onClick={abrirRustdesk} title="Editar RustDesk" className="shrink-0 text-ink-400 hover:text-mist-700"><IconLapiz /></button>
                )}
              </div>
            )}
          </div>
          <Dato label="Responsable" value={ticket.responsable_nombre?.trim() || (ticket.responsable_nomina != null ? `Nomina ${ticket.responsable_nomina}` : 'Sin asignar')} />
          {ticket.finalizado_at && <Dato label="Por validar desde" value={fmtFechaHora(ticket.finalizado_at)} />}
          {ticket.validado_at && <Dato label="Finalizado" value={fmtFechaHora(ticket.validado_at)} />}
        </div>

        <div className="mt-5 pt-5 border-t border-cloud-100">
          <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-1">Problema</p>
          <p className="text-sm text-ink-800 whitespace-pre-wrap">{ticket.problema}</p>
        </div>

        {/* Acciones de estado (staff) */}
        {accionesStaff.length > 0 && (
          <div className="mt-5 pt-5 border-t border-cloud-100 flex flex-wrap gap-2">
            {accionesStaff.map((a) => (
              <AsyncButton key={a.e} onClick={() => onAccionStaff(a)} className={`px-4 py-2 rounded-lg text-sm font-bold ${TONE[a.tone]}`}>
                {a.label}
              </AsyncButton>
            ))}
          </div>
        )}
        {puedeStaff && ticket.estado === 'finalizado' && (
          <p className="mt-4 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Esperando que el usuario valide el cierre.
          </p>
        )}

        {/* Reasignar responsable (solo admin) */}
        {isAdmin && (
          <div className="mt-5 pt-5 border-t border-cloud-100">
            <p className="text-[11px] font-bold text-ink-400 uppercase tracking-widest mb-2">Asignar responsable</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={reasignNomina}
                onChange={(e) => setReasignNomina(e.target.value)}
                className="bg-white border border-cloud-300 text-ink-900 text-sm rounded-lg px-3 py-2 outline-none focus:border-ink-500 focus:ring-1 focus:ring-ink-500"
              >
                <option value="">Sin asignar</option>
                {operadores.map((o) => (
                  <option key={o.nomina} value={o.nomina}>{o.nombre} ({o.rol})</option>
                ))}
              </select>
              <AsyncButton onClick={reasignar} className="px-4 py-2 min-h-10 rounded-lg text-sm font-bold bg-ink-800 text-white hover:bg-ink-900 shadow-sm shadow-ink-900/10">
                Guardar
              </AsyncButton>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Chat (solo mensajes publicos) */}
        <div className="lg:col-span-2 bg-white border border-cloud-200 rounded-2xl flex flex-col">
          <div className="px-5 py-3.5 border-b border-cloud-200">
            <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">Conversacion</h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar max-h-[460px] min-h-[200px]">
            {chatMsgs.length === 0 ? (
              <p className="text-sm text-ink-400 text-center py-8">Aun no hay mensajes.</p>
            ) : (
              chatMsgs.map((m, i) => {
                const next = chatMsgs[i + 1];
                const mio = m.autor_nomina != null && Number(m.autor_nomina) === Number(user?.nomina);
                const finGrupo = !next || claveAutor(next) !== claveAutor(m);
                return (
                  <div key={m.id} className={finGrupo ? 'mb-3' : 'mb-1'}>
                    <Burbuja m={m} mio={mio} finGrupo={finGrupo} ticketId={id} onAmpliar={setLightbox} />
                  </div>
                );
              })
            )}
          </div>

          {/* Pie del chat: validar/reabrir (dueno, finalizado), cerrado, o composer */}
          <div className="border-t border-cloud-200 p-3">
            {ownerDecide ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-ink-800 mb-2">El operador marco este ticket como resuelto. Valida el cierre o reabrelo.</p>
                <div className="flex justify-center gap-2">
                  <AsyncButton onClick={validar} className="px-4 py-2 min-h-10 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-900/15">
                    Validar cierre
                  </AsyncButton>
                  <AsyncButton onClick={reabrir} className="px-4 py-2 min-h-10 rounded-lg text-sm font-bold bg-white border border-cloud-300 text-ink-700 hover:bg-cloud-100">
                    No resuelto
                  </AsyncButton>
                </div>
                <p className="text-[11px] text-ink-400 mt-2">No puedes enviar mensajes hasta validar o reabrir.</p>
              </div>
            ) : cerrado ? (
              <p className="text-sm text-ink-400 text-center py-2">Este ticket esta cerrado ({estadoLabel(ticket.estado)}). La conversacion quedo archivada.</p>
            ) : (
              <div>
                {/* Vista previa de la imagen a enviar */}
                {imgPreview && (
                  <div className="mb-2 relative inline-block">
                    <img src={imgPreview} alt="Vista previa" className="max-h-28 rounded-lg border border-cloud-300" />
                    <button
                      type="button"
                      onClick={quitarImgChat}
                      title="Quitar imagen"
                      className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-ink-800 text-white flex items-center justify-center hover:bg-ink-900 shadow-md shadow-ink-900/25 transition-[background-color,scale] duration-150 ease-salida active:scale-[0.9]"
                    >
                      <span className="text-xs leading-none">✕</span>
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <label className="cursor-pointer shrink-0 p-2.5 rounded-lg border border-cloud-300 text-ink-500 hover:text-mist-700 hover:border-mist-400 transition-colors" title="Adjuntar imagen">
                    <IconImagen />
                    <input type="file" accept="image/*" className="hidden" onChange={elegirImgChat} />
                  </label>
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((o) => !o)}
                      title="Emojis"
                      className="p-2.5 rounded-lg border border-cloud-300 text-ink-500 hover:text-mist-700 hover:border-mist-400 transition-colors"
                    >
                      <IconEmoji />
                    </button>
                    {emojiOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setEmojiOpen(false)} />
                        <div className="absolute bottom-full mb-2 left-0 z-20 w-64 bg-white border border-cloud-200 rounded-xl shadow-lg p-2 grid grid-cols-8 gap-0.5">
                          {EMOJIS.map((e) => (
                            <button key={e} type="button" onClick={() => insertarEmoji(e)} className="w-8 h-8 flex items-center justify-center text-lg leading-none rounded-lg hover:bg-cloud-100 transition-colors duration-150">
                              {e}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Respuestas predeterminadas (solo staff) */}
                  {puedeStaff && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setRespOpen((o) => !o)}
                        title="Respuestas predeterminadas"
                        className="p-2.5 rounded-lg border border-cloud-300 text-ink-500 hover:text-mist-700 hover:border-mist-400 transition-colors"
                      >
                        <IconRayo />
                      </button>
                      {respOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setRespOpen(false)} />
                          <div className="absolute bottom-full mb-2 left-0 z-20 w-72 max-h-72 overflow-y-auto custom-scrollbar bg-white border border-cloud-200 rounded-xl shadow-lg p-1.5">
                            {respuestas.length === 0 ? (
                              <p className="text-xs text-ink-400 p-3 text-center">Aún no tienes respuestas. Créalas en tu perfil (menú superior).</p>
                            ) : (
                              respuestas.map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => insertarRespuesta(r.texto)}
                                  className="w-full text-left rounded-lg px-2.5 py-2 hover:bg-cloud-100 transition-colors"
                                >
                                  {r.titulo && <span className="block text-xs font-bold text-ink-800 truncate">{r.titulo}</span>}
                                  <span className="block text-xs text-ink-500 line-clamp-2 whitespace-pre-wrap break-words">{r.texto}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <textarea
                    ref={chatInputRef}
                    value={nuevoMsg}
                    onChange={(e) => setNuevoMsg(e.target.value)}
                    onKeyDown={onChatKeyDown}
                    onPaste={pegarImagen}
                    rows={2}
                    placeholder="Escribe un mensaje... (Enter envía, Shift+Enter salto de línea, Ctrl+V pega imagen)"
                    className="flex-1 min-w-0 resize-none overflow-y-auto custom-scrollbar border border-cloud-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500 transition-colors"
                  />
                  <AsyncButton onClick={enviarChat} disabled={!nuevoMsg.trim() && !imgChat} className="px-4 py-2.5 min-h-10 rounded-lg text-sm font-bold bg-mist-600 text-white hover:bg-mist-700 shadow-sm shadow-ink-900/10 shrink-0">
                    Enviar
                  </AsyncButton>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: adjuntos, notas internas (staff), timeline */}
        <div className="space-y-5">
          {/* Adjuntos */}
          <div className="bg-white border border-cloud-200 rounded-2xl">
            <div className="px-5 py-3.5 border-b border-cloud-200 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">Evidencia</h2>
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold texto-acento">
                <IconClip /> Adjuntar
                <input type="file" multiple className="hidden" onChange={subirArchivo} />
              </label>
            </div>
            <div className="p-4">
              {archivos.length === 0 ? (
                <p className="text-xs text-ink-400">Sin archivos adjuntos.</p>
              ) : (
                <ul className="space-y-1.5">
                  {archivos.map((a) => (
                    <li key={a.id}>
                      <button onClick={() => setVisor(a)} className="w-full text-left flex items-center gap-2 text-sm text-ink-700 hover:text-mist-700 group" title={`Subido por ${a.subido_por_nombre?.trim() || (a.subido_por_nomina != null ? 'nomina ' + a.subido_por_nomina : 'sistema')} · ${fmtFechaHora(a.created_at)}`}>
                        <IconClip />
                        <span className="truncate flex-1">{a.nombre_original}</span>
                        <span className="text-[11px] text-ink-400 shrink-0">{fmtTamano(a.tamano)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Notas internas (solo staff) - generales del ticket, fuera de la conversacion */}
          {puedeStaff && (
            <div className="nota-box bg-white border border-amber-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-amber-200 bg-amber-50/60">
                <h2 className="text-sm font-bold uppercase tracking-widest text-amber-800">Notas internas</h2>
                <p className="text-[11px] text-amber-700 font-medium">Solo visibles para soporte. El usuario no las ve.</p>
              </div>
              <div className="p-4 space-y-3">
                {notas.length === 0 ? (
                  <p className="text-xs text-ink-400">Sin notas internas.</p>
                ) : (
                  <ul className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                    {notas.map((n) => (
                      <li key={n.id} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <p className="text-sm text-ink-800 whitespace-pre-wrap">{n.cuerpo}</p>
                        <p className="text-[11px] text-ink-400 mt-1"><span>{n.autor_nombre || 'Staff'}</span> · <span className="tabular-nums">{fmtFechaHora(n.created_at)}</span></p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-end gap-2">
                  <textarea
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    rows={2}
                    placeholder="Agregar nota interna..."
                    className="flex-1 min-w-0 resize-none border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                  <AsyncButton onClick={agregarNota} disabled={!nuevaNota.trim()} className="px-3 py-2.5 min-h-10 rounded-lg text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-900/15 shrink-0">
                    Guardar
                  </AsyncButton>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div ref={timelineRef} className="bg-white border border-cloud-200 rounded-2xl">
            <div className="px-5 py-3.5 border-b border-cloud-200">
              <h2 className="text-sm font-bold uppercase tracking-widest text-ink-700">Linea de tiempo</h2>
            </div>
            <ul className="p-4 space-y-4 max-h-[360px] overflow-y-auto custom-scrollbar">
              {eventos.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-mist-500 mt-1.5" />
                    <span className="w-px flex-1 bg-cloud-200 my-1" />
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-sm font-semibold text-ink-800">
                      {ev.tipo === 'estado' ? `Estado: ${estadoLabel(ev.estado_nuevo)}`
                        : ev.tipo === 'creado' ? 'Ticket creado'
                        : ev.tipo === 'contacto' ? 'Contacto'
                        : ev.tipo === 'asignacion' ? 'Asignacion'
                        : ev.tipo === 'datos' ? 'Datos actualizados'
                        : ev.tipo}
                    </p>
                    {/* La descripcion (puede nombrar al staff) y el actor solo se muestran a staff.
                        El usuario ve unicamente la accion + la fecha. */}
                    {puedeStaff && ev.descripcion && <p className="text-xs text-ink-500 mt-0.5">{ev.descripcion}</p>}
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      {puedeStaff ? `${ev.actor_nombre || 'Sistema'} · ` : ''}{fmtFechaHora(ev.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de justificacion (cancelar) */}
      <Modal
        open={!!accion}
        onClose={() => setAccion(null)}
        title={accion ? `${accion.label}: indica el motivo` : ''}
        maxWidth="max-w-md"
        footer={
          <>
            <button onClick={() => setAccion(null)} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-ink-600 hover:bg-cloud-100 transition-colors">
              Cancelar
            </button>
            <AsyncButton onClick={() => ejecutarEstado(accion.e, justif)} disabled={!justif.trim()} className="bg-mist-600 text-white px-5 py-2.5 min-h-10 rounded-lg text-sm font-bold hover:bg-mist-700 shadow-sm shadow-ink-900/10">
              Confirmar
            </AsyncButton>
          </>
        }
      >
        <textarea
          value={justif}
          onChange={(e) => setJustif(e.target.value)}
          rows={4}
          placeholder="Justificacion (obligatoria)..."
          className="w-full resize-y border border-cloud-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-mist-500 focus:ring-1 focus:ring-mist-500"
        />
      </Modal>

      {/* Modal: editar datos del solicitante (staff, ticket de invitado) */}
      <Modal
        open={datosOpen}
        onClose={() => setDatosOpen(false)}
        title="Editar datos del solicitante"
        maxWidth="max-w-lg"
        footer={
          <>
            <button onClick={() => setDatosOpen(false)} className="px-4 py-2.5 min-h-10 rounded-lg text-sm font-semibold text-ink-600 hover:bg-cloud-100 transition-colors duration-150">Cancelar</button>
            <AsyncButton onClick={guardarDatos} className="bg-mist-600 text-white px-5 py-2.5 min-h-10 rounded-lg text-sm font-bold hover:bg-mist-700 shadow-sm shadow-ink-900/10">Guardar</AsyncButton>
          </>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Nombre *" value={datosForm.nombre} onChange={(e) => setDatosForm((f) => ({ ...f, nombre: e.target.value }))} className="sm:col-span-2" />
          <Input label="RustDesk" value={datosForm.rustdesk} inputMode="numeric" maxLength={12} onChange={(e) => setDatosForm((f) => ({ ...f, rustdesk: e.target.value.replace(/\D/g, '') }))} placeholder="ID de RustDesk" />
          <NominaInput value={datosForm.nomina} onChange={(e) => setDatosForm((f) => ({ ...f, nomina: e.target.value }))} onResolved={(u) => setDatosForm((f) => ({ ...f, nombre: u.nombre?.trim() || '', correo: u.email || '', puesto: u.puesto || '', departamento: u.departamento || '', rustdesk: u.rustdesk || '' }))} />
          <Input label="Puesto" value={datosForm.puesto} onChange={(e) => setDatosForm((f) => ({ ...f, puesto: e.target.value }))} />
          <Input label="Departamento" value={datosForm.departamento} onChange={(e) => setDatosForm((f) => ({ ...f, departamento: e.target.value }))} />
          <Input label="Correo" type="email" value={datosForm.correo} onChange={(e) => setDatosForm((f) => ({ ...f, correo: e.target.value }))} className="sm:col-span-2" />
        </div>
      </Modal>

      <VisorArchivo open={!!visor} ticketId={id} archivo={visor} onClose={() => setVisor(null)} />

      {/* Lightbox con zoom: imagen del chat ampliada */}
      {lightbox && <LightboxImagen url={lightbox.url} onClose={() => setLightbox(null)} />}
    </div>
  );
};

// Mensaje estilo mensajeria: avatar con iniciales + nombre solo en el ULTIMO del grupo
// (mensajes consecutivos del mismo autor). La hora va al lado de cada mensaje.
const Burbuja = ({ m, mio, finGrupo, ticketId, onAmpliar }) => (
  <div className={`flex items-end gap-2 ${mio ? 'flex-row-reverse' : ''}`}>
    <div className="w-7 shrink-0">
      {finGrupo && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: colorAutor(m) }}>
          {iniciales(m.autor_nombre)}
        </div>
      )}
    </div>
    <div className={`max-w-[78%] min-w-0 flex flex-col ${mio ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-end gap-1.5 min-w-0 max-w-full ${mio ? 'flex-row-reverse' : ''}`}>
        <div className={`min-w-0 rounded-2xl px-3 py-2 ${mio ? 'bg-mist-600 text-white' : 'bg-cloud-100 text-ink-800'}`}>
          {m.imagen && <ChatImagen ticketId={ticketId} mensajeId={m.id} mio={mio} onAmpliar={onAmpliar} />}
          {m.cuerpo && m.cuerpo.trim() !== '' && (
            <p className={`text-sm whitespace-pre-wrap [overflow-wrap:anywhere] ${m.imagen ? 'mt-1.5' : ''}`}>{m.cuerpo}</p>
          )}
        </div>
        <span className="text-[11px] text-ink-400 shrink-0 mb-0.5 tabular-nums">{fmtHora(m.created_at)}</span>
      </div>
      {finGrupo && (
        <p className="text-[11px] font-semibold mt-1 px-1" style={{ color: colorAutor(m) }}>
          {m.autor_nombre || 'Usuario'}{m.es_staff ? ' · Soporte' : ''}
        </p>
      )}
    </div>
  </div>
);

export default TicketDetalle;
