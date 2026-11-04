import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Spinner from './ui/Spinner';
import { ticketsApi } from '../api/ticketsApi';

// Visor de adjuntos: previsualiza imagenes y PDFs en un modal; para otros tipos
// ofrece descarga. Obtiene el archivo como blob (con el token) y lo muestra.

// El mime guardado a veces es generico (application/octet-stream) o vacio; por eso
// inferimos el tipo por la EXTENSION del nombre, mas confiable para previsualizar.
const EXT_MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
  pdf: 'application/pdf',
  txt: 'text/plain', csv: 'text/csv', log: 'text/plain',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg',
  mov: 'video/quicktime', mkv: 'video/x-matroska', avi: 'video/x-msvideo', '3gp': 'video/3gpp',
};
const extDe = (nombre) => (nombre || '').split('.').pop().toLowerCase();
const tipoEfectivo = (archivo) => {
  const mime = archivo?.mime || '';
  if (mime && mime !== 'application/octet-stream') return mime;
  return EXT_MIME[extDe(archivo?.nombre_original)] || '';
};

const IconClose = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
);

const VisorArchivo = ({ open, ticketId, archivo, onClose }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(1);      // zoom de imagen (1 a 5)
  const [pan, setPan] = useState({ x: 0, y: 0 }); // desplazamiento al arrastrar con zoom
  const dragRef = useRef(null);
  const cuerpoRef = useRef(null);

  useEffect(() => {
    if (!open || !archivo) return;
    let revoked = null;
    setLoading(true); setError(false); setUrl(null); setScale(1); setPan({ x: 0, y: 0 });
    ticketsApi.descargarArchivo(ticketId, archivo.id)
      .then((res) => {
        // Forzamos el tipo correcto en el blob para que <img>/<iframe> lo rendericen.
        const tipo = tipoEfectivo(archivo) || res.data.type || 'application/octet-stream';
        const blob = new Blob([res.data], { type: tipo });
        revoked = URL.createObjectURL(blob);
        setUrl(revoked);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => { if (revoked) URL.revokeObjectURL(revoked); };
  }, [open, archivo, ticketId]);

  const descargar = () => {
    if (!url || !archivo) return;
    const link = document.createElement('a');
    link.href = url; link.download = archivo.nombre_original; link.click();
  };

  // Zoom de imagen: botones, rueda del mouse y doble clic; arrastre para desplazar cuando esta ampliada.
  const aplicarZoom = (delta) => setScale((s) => {
    const ns = Math.min(5, Math.max(1, +(s + delta).toFixed(2)));
    if (ns === 1) setPan({ x: 0, y: 0 });
    return ns;
  });
  const onImgDown = (e) => { if (scale <= 1) return; e.preventDefault(); dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y }; };
  const onImgMove = (e) => {
    if (!dragRef.current) return;
    setPan({ x: dragRef.current.ox + (e.clientX - dragRef.current.sx), y: dragRef.current.oy + (e.clientY - dragRef.current.sy) });
  };
  const onImgUp = () => { dragRef.current = null; };

  const tipo = tipoEfectivo(archivo);
  const esImagen = tipo.startsWith('image/');
  const esPdf = tipo === 'application/pdf';
  const esTexto = tipo.startsWith('text/');
  const esVideo = tipo.startsWith('video/');
  const previsualizable = esImagen || esPdf || esTexto || esVideo;

  // Bloquea el scroll del fondo mientras el visor esta abierto (la pagina no se mueve detras).
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Zoom con la rueda: listener NO pasivo para poder cancelar el scroll de la pagina.
  useEffect(() => {
    const el = cuerpoRef.current;
    if (!el || !open || !esImagen) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.25;
      setScale((s) => {
        const ns = Math.min(5, Math.max(1, +(s + delta).toFixed(2)));
        if (ns === 1) setPan({ x: 0, y: 0 });
        return ns;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, esImagen, url]);

  return (
    <AnimatePresence>
      {open && archivo && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-[96vw] max-w-[1800px] h-[94vh] bg-white rounded-2xl shadow-xl border border-cloud-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-cloud-200 shrink-0">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-bold text-ink-900 truncate">{archivo.nombre_original}</p>
                {archivo.subido_por_nombre?.trim() && (
                  <p className="text-[11px] text-ink-400 truncate">Subido por {archivo.subido_por_nombre.trim()}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {esImagen && url && !loading && !error && (
                  <div className="flex items-center gap-0.5 mr-1 border border-cloud-200 rounded-lg p-0.5">
                    <button onClick={() => aplicarZoom(-0.25)} disabled={scale <= 1} className="w-7 h-7 flex items-center justify-center rounded text-ink-600 hover:bg-cloud-100 disabled:opacity-30 text-lg leading-none" title="Alejar">−</button>
                    <span className="text-[11px] font-semibold text-ink-500 w-11 text-center tabular-nums">{Math.round(scale * 100)}%</span>
                    <button onClick={() => aplicarZoom(0.25)} disabled={scale >= 5} className="w-7 h-7 flex items-center justify-center rounded text-ink-600 hover:bg-cloud-100 disabled:opacity-30 text-lg leading-none" title="Acercar">+</button>
                  </div>
                )}
                <button onClick={descargar} disabled={!url} className="text-xs font-bold texto-acento disabled:opacity-40">
                  Descargar
                </button>
                <button onClick={onClose} className="text-ink-400 hover:text-ink-800 p-1"><IconClose /></button>
              </div>
            </div>

            {/* Cuerpo */}
            <div ref={cuerpoRef} className={`flex-1 bg-cloud-50 custom-scrollbar flex items-center justify-center ${esImagen ? 'overflow-hidden' : 'overflow-auto'}`}>
              {loading ? (
                <Spinner className="h-7 w-7" />
              ) : error ? (
                <p className="text-sm text-ink-500 p-8 text-center">No se pudo cargar el archivo.</p>
              ) : !previsualizable ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-ink-800">Vista previa no disponible</p>
                  <p className="text-xs text-ink-500 mt-1">Este tipo de archivo no se puede previsualizar. Descargalo para abrirlo.</p>
                  <button onClick={descargar} className="mt-4 px-4 py-2 rounded-lg text-sm font-bold bg-mist-600 text-white hover:bg-mist-700">Descargar</button>
                </div>
              ) : esVideo ? (
                <video src={url} controls className="max-w-full max-h-full bg-black" />
              ) : esImagen ? (
                <img
                  src={url}
                  alt={archivo.nombre_original}
                  onMouseDown={onImgDown}
                  onMouseMove={onImgMove}
                  onMouseUp={onImgUp}
                  onMouseLeave={onImgUp}
                  onDoubleClick={() => { setScale((s) => (s === 1 ? 2 : 1)); setPan({ x: 0, y: 0 }); }}
                  draggable={false}
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'zoom-in' }}
                  className="max-w-full max-h-full object-contain select-none transition-transform duration-75"
                />
              ) : esPdf ? (
                <object data={url} type="application/pdf" className="w-full h-full">
                  <iframe src={url} title={archivo.nombre_original} className="w-full h-full bg-white" />
                </object>
              ) : (
                <iframe src={url} title={archivo.nombre_original} className="w-full h-full bg-white" />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VisorArchivo;
