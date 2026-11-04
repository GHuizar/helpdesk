import { useRef, useState } from 'react';

const fmtSize = (b) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const claveArchivo = (f) => `${f.name}|${f.size}|${f.lastModified}`;

/**
 * Selector de archivos multiple (controlado): acumula las selecciones (no las reemplaza),
 * permite quitar archivos individuales y soporta arrastrar y soltar.
 * Props: files (array), onChange(nuevoArray), hint, accept.
 */
export default function SelectorArchivos({ files = [], onChange, hint = 'PDF, imagenes y archivos. Max 10MB c/u.', accept }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const agregar = (lista) => {
    const arr = Array.from(lista || []);
    if (!arr.length) return;
    const vistos = new Set(files.map(claveArchivo));
    const nuevos = arr.filter((f) => !vistos.has(claveArchivo(f)));
    if (nuevos.length) onChange([...files, ...nuevos]);
  };

  const quitar = (idx) => onChange(files.filter((_, i) => i !== idx));

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); agregar(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${drag ? 'border-mist-500 bg-mist-50' : 'border-cloud-300 hover:border-mist-400 hover:bg-cloud-50'}`}
      >
        <p className="text-sm font-semibold text-ink-700">Arrastra archivos aqui o haz clic para seleccionar</p>
        <p className="text-[11px] text-ink-400 mt-1">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => { agregar(e.target.files); e.target.value = ''; }}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-2 bg-cloud-50 border border-cloud-200 rounded-lg pl-3 pr-2 py-2">
              <span className="text-xs font-medium text-ink-700 truncate flex-1">{f.name}</span>
              <span className="text-[11px] text-ink-400 shrink-0">{fmtSize(f.size)}</span>
              <button
                type="button"
                onClick={() => quitar(i)}
                title="Quitar"
                className="shrink-0 p-1 rounded-md text-ink-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
              </button>
            </li>
          ))}
          <li className="text-[11px] text-ink-400 pt-0.5">{files.length} archivo(s) seleccionado(s).</li>
        </ul>
      )}
    </div>
  );
}
