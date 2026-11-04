import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import { dashboardApi } from '../../api/dashboardApi';
import { estadoLabel } from '../../utils/estados';
import logoMarca from '../../components/brand/logo-mark.svg';

const DONUT = ['#3a5667', '#4a6c7e', '#668a9b', '#8fadbb', '#0ea5e9', '#b6cad4'];

const fmtMin = (m) => {
  const v = Number(m) || 0;
  if (v <= 0) return '0m';
  const h = Math.floor(v / 60);
  return h ? `${h}h ${v % 60}m` : `${v}m`;
};
const trunc = (s, n = 16) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : (s || '-'));
// Nombre con formato de titulo: primera letra de cada palabra en mayuscula, el resto en minuscula.
const titulo = (s) => String(s || '').toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());

// Tiempo transcurrido desde una fecha (UTC) CON segundero. ahora es un Date.
const fmtTranscurrido = (s, ahora) => {
  try {
    const ms = ahora.getTime() - new Date(String(s).replace(' ', 'T') + 'Z').getTime();
    if (ms < 0 || Number.isNaN(ms)) return '0s';
    const tot = Math.floor(ms / 1000);
    const d = Math.floor(tot / 86400);
    const h = Math.floor((tot % 86400) / 3600);
    const m = Math.floor((tot % 3600) / 60);
    const sec = tot % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(' ');
  } catch { return ''; }
};

// Variants de animacion
const gridV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const itemV = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } } };

// Reloj de bloques con animacion de "roll" (rebote) al cambiar cada digito.
// Modo claro: blanco/negro. Modo oscuro: cian neon con glow.
// Cada bloque se re-monta (key = su digito) para relanzar la animacion SOLO cuando su valor cambia.
// Tick propio (no re-renderiza las graficas del panel).
const dosDig = (n) => (n < 10 ? `0${n}` : `${n}`);
const horaEnBloques = () => {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ap = h < 12 ? 'AM' : 'PM';
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return [dosDig(h), dosDig(m), dosDig(s), ap];
};

const BloqueReloj = ({ a, b, small }) => (
  <div className={`rlj__block${small ? ' rlj__block--sm' : ''}`}>
    <div className="rlj__group">
      <span className="rlj__digits">{a}</span>
      <span className="rlj__digits">{b}</span>
    </div>
  </div>
);

const CSS_RELOJ = `
.rlj{display:flex;align-items:center;gap:.3rem}
.rlj__block{position:relative;width:1.9rem;height:1.9rem;border-radius:.45rem;overflow:hidden;background:#fff;color:#6E7178;box-shadow:0 3px 8px rgba(15,23,42,.16)}
.rlj__block--sm{width:1.55rem;height:1.55rem;border-radius:.35rem}
.rlj__group{display:flex;flex-direction:column-reverse;height:200%;animation:rlj-roll .42s cubic-bezier(0.23,1,0.32,1) forwards}
.rlj__digits{height:50%;display:flex;align-items:center;justify-content:center;font-size:.95rem;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.rlj__block--sm .rlj__digits{font-size:.55rem;letter-spacing:.02em}
.rlj__colon{font-size:.95rem;font-weight:800;color:#0f172a;opacity:.5}
.rlj--dark .rlj__block{background:#1e293b;color:#e5e7eb;box-shadow:0 0 8px rgba(229,231,235,.28),0 0 2px rgba(229,231,235,.55),0 3px 10px rgba(0,0,0,.5)}
.rlj--dark .rlj__digits{text-shadow:0 0 6px rgba(229,231,235,.7),0 0 12px rgba(229,231,235,.35)}
.rlj--dark .rlj__colon{color:#e5e7eb;opacity:.85;text-shadow:0 0 6px rgba(229,231,235,.7)}
@keyframes rlj-roll{from{transform:translateY(-50%)}to{transform:translateY(0)}}
`;

const RelojBloques = ({ dark }) => {
  // [anterior, actual]: cada bloque anima del digito viejo al nuevo, asi que los
  // dos valores tienen que vivir en el estado. Antes el anterior estaba en un ref
  // que se leia durante el render, algo que React no garantiza estable.
  const [[p, t], setReloj] = useState(() => {
    const ahora = horaEnBloques();
    return [ahora, ahora];
  });
  useEffect(() => {
    let id;
    const tick = () => {
      setReloj(([, actual]) => [actual, horaEnBloques()]);
      id = setTimeout(tick, 1000 - (Date.now() % 1000)); // alinea al segundo real
    };
    id = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(id);
  }, []);
  return (
    <>
      <style>{CSS_RELOJ}</style>
      <div className={`rlj${dark ? ' rlj--dark' : ''}`}>
        <BloqueReloj key={`h${t[0]}`} a={p[0]} b={t[0]} />
        <span className="rlj__colon">:</span>
        <BloqueReloj key={`m${t[1]}`} a={p[1]} b={t[1]} />
        <span className="rlj__colon">:</span>
        <BloqueReloj key={`s${t[2]}`} a={p[2]} b={t[2]} />
        <BloqueReloj key={`p${t[3]}`} a={p[3]} b={t[3]} small />
      </div>
    </>
  );
};

// Medidor de tiempo transcurrido con segundero (tick propio).
const Transcurrido = ({ desde }) => {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{fmtTranscurrido(desde, ahora)}</span>;
};

// Marquesina vertical continua (circular infinita): los nombres bajan y reaparecen por arriba, sin fin.
// - Lista BASE: se repiten los registros hasta tener al menos MIN_MARQ (15). Con 1 registro -> 15 copias.
// - Esa base se REPITE tantas veces (reps) como haga falta para superar la altura visible, de modo que
//   nunca se vea el vacio tras la ultima fila (ese era el "corte al final").
// - El desplazamiento se lleva en un ref y se aplica con requestAnimationFrame directo al DOM, FUERA del
//   render de React: la recarga de datos (30s) solo cambia el texto y NUNCA reinicia el movimiento.
// - El wrap resta EXACTAMENTE el periodo (altura de una base), asi el bucle es imperceptible.
const MIN_MARQ = 15;
const MarquesinaSolicitantes = ({ items }) => {
  const wrapRef = useRef(null);
  const contentRef = useRef(null);
  const pos = useRef(0);
  const repsRef = useRef(2);
  const [reps, setReps] = useState(2);

  const base = useMemo(() => {
    if (!items || items.length === 0) return [];
    const reales = items.map((s) => ({ vacio: false, nombre: s.nombre, nomina: s.nomina, total: s.total }));
    // Completar hasta MIN_MARQ con filas EN BLANCO (no repetimos nombres): el/los que existen
    // siguen desplazandose, con espacios en blanco entre cada vuelta en lugar de nombres duplicados.
    const faltan = Math.max(0, MIN_MARQ - reales.length);
    return [...reales, ...Array.from({ length: faltan }, () => ({ vacio: true }))];
  }, [items]);
  // Se sincroniza en un efecto (no durante el render) para que el efecto de abajo
  // lea siempre el valor ya confirmado.
  useEffect(() => { repsRef.current = reps; }, [reps]);

  // Ajusta cuantas copias de la base se pintan para que el contenido supere la altura visible.
  useEffect(() => {
    const wrap = wrapRef.current;
    const content = contentRef.current;
    if (!wrap || !content || base.length === 0) return;
    const alturaBase = content.scrollHeight / reps;
    if (alturaBase <= 0) return;
    const necesarias = Math.max(2, Math.ceil(wrap.clientHeight / alturaBase) + 1);
    if (necesarias !== reps) setReps(necesarias);
  }, [base, reps]);

  // Bucle de desplazamiento: se monta una sola vez, inmune a los re-render de datos.
  useEffect(() => {
    let raf;
    let ultimo = 0;
    const VEL = 16; // px por segundo
    const paso = (t) => {
      if (!ultimo) ultimo = t;
      const dt = (t - ultimo) / 1000;
      ultimo = t;
      const content = contentRef.current;
      if (content) {
        const periodo = content.scrollHeight / repsRef.current; // altura de una base
        if (periodo > 0) {
          pos.current += VEL * dt;                         // baja
          while (pos.current >= 0) pos.current -= periodo; // wrap exacto (circular)
          content.style.transform = `translateY(${pos.current}px)`;
        }
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, []);

  const loop = [];
  for (let r = 0; r < reps; r++) loop.push(...base);

  return (
    <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden">
      <div ref={contentRef} className="flex flex-col will-change-transform">
        {loop.map((row, i) => (
          <div
            key={i}
            aria-hidden={row.vacio ? 'true' : undefined}
            className={`flex items-center justify-between gap-2 px-1 py-1.5 border-b ${row.vacio ? 'border-transparent' : 'border-cloud-50'}`}
          >
            <span className="flex-1 min-w-0 text-[11px] text-ink-700 truncate">{row.vacio ? ' ' : (titulo(row.nombre) || `Nomina ${row.nomina}`)}</span>
            <span className="text-sm font-extrabold texto-acento shrink-0 tabular-nums">{row.vacio ? ' ' : row.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pequeño indicador "i" que aparece junto a un titulo con tooltip (title nativo al pasar el mouse).
const Info = () => <span className="ml-0.5 text-ink-300 font-bold align-super text-[7px]">ⓘ</span>;

const ContadorMini = ({ label, count, color, info }) => (
  <div title={info} className={`rounded-lg ${color}  py-2 text-center text-white ${info ? 'cursor-help' : ''}`}>
    <p className="text-xl font-extrabold leading-none">{count}</p>
    <p className="text-[8px] font-bold uppercase tracking-wide mt-1 leading-tight">{label}</p>
  </div>
);

const Panel = ({ title, info, children, className = '' }) => (
  <motion.div variants={itemV} className={`bg-white border border-cloud-200 rounded-xl p-2.5 flex flex-col min-h-0 overflow-hidden ${className}`}>
    <h2 title={info} className={`text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-1.5 shrink-0 ${info ? 'cursor-help' : ''}`}>{title}{info && <Info />}</h2>
    <div className="flex-1 min-h-0">{children}</div>
  </motion.div>
);

const Metric = ({ value, label, color, small, info }) => (
  <div title={info} className={`text-center ${info ? 'cursor-help' : ''}`}>
    <p className={`${small ? 'text-base' : 'text-2xl'} font-extrabold leading-none ${color}`}>{value}</p>
    <p className="text-[11px] font-bold uppercase tracking-widest text-ink-400 mt-1">{label}{info && <Info />}</p>
  </div>
);

const IconSol = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="w-3.5 h-3.5">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const IconLuna = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </svg>
);

const Monitor = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [, setActualizado] = useState(null); // solo se usa para forzar el re-render del tick
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('monitorTema') === 'oscuro'; } catch { return false; }
  });
  const toggleDark = () => setDark((d) => {
    const nuevo = !d;
    try { localStorage.setItem('monitorTema', nuevo ? 'oscuro' : 'claro'); } catch { /* noop */ }
    return nuevo;
  });
  const temaClase = dark ? 'tema-oscuro' : 'tema-claro';

  const cargar = useCallback(() => {
    setError(null);
    dashboardApi.data()
      .then(({ data }) => {
        if (data && data.data) { setData(data.data); setActualizado(new Date()); }
        else { setError('El servidor respondio en un formato inesperado.'); }
      })
      .catch((err) => {
        setError(err.response?.status ? `Error ${err.response.status} al cargar el panel.` : 'No se pudo conectar con el servidor.');
      });
  }, []);

  // Datos (tickets y personas) cada 30s.
  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 30000);
    return () => clearInterval(t);
  }, [cargar]);

  if (!data) {
    return (
      <div className={`${temaClase} h-screen bg-cloud-100 flex flex-col items-center justify-center gap-4 p-6 text-center`}>
        {error ? (
          <>
            <p className="text-sm font-semibold text-ink-700 max-w-sm">{error}</p>
            <div className="flex gap-2">
              <button onClick={cargar} className="text-sm font-bold px-4 py-2 rounded-lg bg-mist-600 text-white hover:bg-mist-700">Reintentar</button>
              <button onClick={() => navigate('/')} className="text-sm font-bold px-4 py-2 rounded-lg bg-white border border-cloud-300 text-ink-700 hover:bg-cloud-100">Salir</button>
            </div>
          </>
        ) : (
          <span className="spinner-rapido h-8 w-8 border-4 border-mist-500 border-t-transparent rounded-full" />
        )}
      </div>
    );
  }

  const e = data.estados || {};
  const hoy = data.hoy || {};
  const u30 = data.ultimos30 || {};
  const p = data.promedios || {};
  const serie = data.serie || [];
  const depts = (data.departamentos || []).map((d) => ({ name: d.departamento, value: Number(d.total) }));

  const contadores = [
    { label: 'Abiertos', count: e.abierto ?? 0, color: 'bg-mist-700', info: 'Tickets sin tomar: nadie los ha atendido todavía.' },
    { label: 'Nuevos hoy', count: hoy.nuevos_hoy ?? 0, color: 'bg-sky-600', info: 'Tickets creados hoy.' },
    { label: 'Cerrados hoy', count: hoy.cerrados_hoy ?? 0, color: 'bg-emerald-600', info: 'Tickets validados (finalizados) hoy.' },
  ];
  const estadosActivos = [
    { label: 'Abiertos', value: e.abierto ?? 0, dot: 'bg-red-500' },
    { label: 'En curso', value: e.en_curso ?? 0, dot: 'bg-orange-500' },
    { label: 'Por validar', value: e.finalizado ?? 0, dot: 'bg-amber-500' },
    { label: 'Finalizados', value: e.validado ?? 0, dot: 'bg-emerald-500' },
    { label: 'Cancelados', value: e.cancelado ?? 0, dot: 'bg-stone-400' },
  ];

  return (
    <div className={`${temaClase} relative h-screen bg-cloud-100 text-ink-700 p-2.5 flex flex-col overflow-hidden`}>
      {/* Blobs decorativos animados (movimiento de fondo) */}
      <motion.div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-mist-400/20 blur-3xl" animate={{ x: [0, 30, 0], y: [0, 24, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="pointer-events-none absolute -bottom-24 right-1/4 w-80 h-80 rounded-full bg-sky-400/15 blur-3xl" animate={{ x: [0, -28, 0], y: [0, -18, 0] }} transition={{ duration: 23, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="pointer-events-none absolute top-1/3 -right-20 w-72 h-72 rounded-full bg-emerald-400/12 blur-3xl" animate={{ x: [0, -20, 0], y: [0, 26, 0] }} transition={{ duration: 27, repeat: Infinity, ease: 'easeInOut' }} />

      {/* Encabezado con reloj en vivo */}
      <div className="relative flex items-center justify-between gap-3 shrink-0 mb-2">
        <div className="flex items-center gap-2.5">
          <img src={dark ? '/logo-mark-light.svg' : logoMarca} alt="HelpDesk" className={dark ? "w-7 h-7 object-contain" : "w-7 h-7 object-contain opacity-60"} />
          <div>
            <h1 className="text-m font-extrabold tracking-tight leading-none text-ink-600">Panel de atencion a tickets</h1>
          </div>
        </div>
        {/* Reloj centrado en el encabezado */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <RelojBloques dark={dark} />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleDark}
            role="switch"
            aria-checked={dark}
            aria-label="Cambiar tema claro u oscuro"
            className={`relative inline-flex items-center w-10 h-6 rounded-full shrink-0 transition-colors duration-300 ${dark ? 'bg-slate-700' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-.5 left-1 w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ${dark ? 'translate-x-4 text-slate-700' : 'translate-x-0 text-amber-500'}`}>
              {dark ? <IconLuna /> : <IconSol />}
            </span>
          </button>
          <button onClick={() => navigate('/')} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-cloud-300 text-ink-600 hover:bg-cloud-100">Salir</button>
        </div>
      </div>

      {/* 12 cols x 3 filas, sin scroll */}
      <motion.div variants={gridV} initial="hidden" animate="show" className="relative flex-1 min-h-0 grid grid-cols-12 grid-rows-3 gap-1">

        {/* Columna izquierda: contadores compactos arriba + "quien mas solicita" en grande */}
        <motion.div variants={itemV} className="col-span-2 row-span-3 flex flex-col gap-2 min-h-0">
          <div className="shrink-0 grid grid-cols-3 gap-0.5">
            {contadores.map((c) => <ContadorMini key={c.label} label={c.label} count={c.count} color={c.color} info={c.info} />)}
          </div>
          <div className="flex-1 min-h-0 bg-white border border-cloud-200 rounded-xl p-2.5 flex flex-col overflow-hidden">
            <h2 title="Personas que más tickets han levantado (histórico). Se desplaza automáticamente." className="text-[11px] font-bold uppercase tracking-widest text-ink-500 mb-1.5 shrink-0 cursor-help">El que más solicita<Info /></h2>
            {(data.solicitantes || []).length === 0 ? (
              <p className="text-[11px] text-ink-400">Sin datos.</p>
            ) : (
              <MarquesinaSolicitantes items={data.solicitantes} />
            )}
          </div>
        </motion.div>

        {/* R1: grafica creados vs cerrados (7) */}
        <Panel title="Creados vs cerrados (14 dias)" info="Tickets creados (barras) vs. cerrados/validados (línea) por día, en los últimos 14 días." className="col-span-7">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eef2f5" />
              <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} allowDecimals={false} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', padding: '4px 8px' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
              <Bar dataKey="creados" name="Creados" fill="#4a6c7e" radius={[3, 3, 0, 0]} barSize={9} />
              <Line dataKey="cerrados" name="Cerrados" stroke="#10b981" strokeWidth={2} dot={{ r: 1.5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Panel>

        {/* R1: ultimos 30 dias + promedios (3) */}
        <Panel title="Ultimos 30 dias" info="Resumen de los últimos 30 días. Los tiempos promedio se cuentan en horario hábil (L-V 8:00–18:30, sin comida 13:30–15:00)." className="col-span-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 h-full content-center">
            <Metric value={u30.total ?? 0} label="Creados" color="text-ink-700" info="Tickets creados en los últimos 30 días." />
            <Metric value={`${u30.pct ?? 0}%`} label="Resueltos" color="text-emerald-600" info="Porcentaje de esos tickets que ya se resolvieron (validados)." />
            <Metric value={fmtMin(p.primera_respuesta_min)} label="1a respuesta" color="texto-acento" small info="Promedio desde que se crea el ticket hasta el PRIMER MENSAJE de soporte al usuario. En horario hábil." />
            <Metric value={fmtMin(p.resolucion_min)} label="Resolucion" color="text-emerald-600" small info="Promedio desde la creación hasta el cierre validado. En horario hábil." />
          </div>
        </Panel>

        {/* R2: por tipo (2) */}
        <Panel title="Por tipo" info="Cantidad de tickets por tipo (categoría)." className="col-span-2">
          <ul className="h-full flex flex-col justify-around">
            {(data.tipos || []).length === 0 ? <li className="text-[11px] text-ink-400">Sin datos.</li> : data.tipos.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-ink-700 truncate flex-1">{t.tipo}</span>
                <span className="shrink-0 texto-acento text-[11px] font-bold border-b-2 border-mist-400 leading-none pb-0.5 px-0.5">{t.total}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* R2: dona por departamento (3) */}
        <Panel title="Por departamento" info="Distribución de tickets por departamento del solicitante." className="col-span-3">
          {depts.length === 0 ? <p className="text-[11px] text-ink-400">Sin datos.</p> : (
            <div className="flex h-full gap-1.5">
              <div className="w-1/2 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={depts} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="88%" paddingAngle={2} stroke="none">
                      {depts.map((d, i) => <Cell key={i} fill={DONUT[i % DONUT.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', padding: '4px 8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-1/2 flex flex-col justify-center gap-0.5 overflow-hidden">
                {depts.map((d, i) => (
                  <li key={i} className="flex items-center gap-1 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DONUT[i % DONUT.length] }} />
                    <span className="text-ink-600 truncate flex-1">{trunc(d.name, 12)}</span>
                    <span className="font-bold text-ink-800">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        {/* R2: estados activos (2) */}
        <Panel title="Estados" info="Cantidad de tickets en cada estado. 'Por validar' = el operador ya lo resolvió y espera confirmación del usuario; 'Finalizados' = ya validados." className="col-span-2">
          <ul className="h-full flex flex-col justify-around">
            {estadosActivos.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 min-w-0"><span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} /><span className="text-[11px] text-ink-600 truncate">{s.label}</span></span>
                <span className="text-xs font-bold text-ink-700 shrink-0">{s.value}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* R2: horas por operador (3) */}
        <Panel title="Horas hoy por operador" info="Tiempo que cada persona ha trabajado tickets HOY (mientras estuvieron 'en curso'), contado en horario hábil (L-V 8:00–18:30, sin comida). En otras palabras: quién está atendiendo tickets hoy y cuánto." className="col-span-3">
          <ul className="h-full flex flex-col justify-around">
            {(data.horas_operador || []).length === 0 ? <li className="text-[11px] text-ink-400">Sin actividad hoy.</li> : data.horas_operador.slice(0, 5).map((o) => (
              <li key={o.nomina} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-700 truncate flex-1">{trunc(titulo(o.nombre), 20)}</span>
                <span className="text-[11px] font-bold text-amber-600 shrink-0">{fmtMin(o.minutos)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* R3: quien mas resuelve (debajo de Por tipo) (2) */}
        <Panel title="El que más resuelve" info="Operadores con más tickets resueltos (por validar + finalizados), histórico." className="col-span-2">
          <ul className="h-full flex flex-col justify-around">
            {(data.resolutores || []).length === 0 ? <li className="text-[11px] text-ink-400">Sin datos.</li> : data.resolutores.slice(0, 8).map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-.5">
                <span className="text-[8px] text-ink-700 truncate flex-1">{trunc(titulo(r.nombre) || `#${r.nomina}`, 18)}</span>
                <span className="text-[11px] font-bold text-emerald-600 shrink-0">{r.total}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* R3: recientes (4) - con tiempo transcurrido (segundero) */}
        <Panel title="Mas recientes" info="Últimos tickets creados, con el tiempo transcurrido (en vivo) desde que se levantaron." className="col-span-4">
          <ul className="h-full flex flex-col justify-around">
            {(data.recientes || []).length === 0 ? <li className="text-[11px] text-ink-400">Sin tickets.</li> : data.recientes.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-800 truncate"><b>{t.folio || '#' + t.id}</b> · {trunc(titulo(t.nombre), 32)}</p>
                  <p className="text-[11px] text-ink-400 truncate">{t.tipo_nombre || 'Sin tipo'} · {estadoLabel(t.estado)}</p>
                </div>
                <span className="text-[11px] text-ink-400 shrink-0">hace <Transcurrido desde={t.created_at} /></span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* R3: longevos (4) - con antiguedad (segundero) */}
        <Panel title="Mas antiguos" info="Tickets abiertos más antiguos (mayor tiempo sin cerrarse). El tiempo corre en vivo." className="col-span-4">
          <ul className="h-full flex flex-col justify-around">
            {(data.longevos || []).length === 0 ? <li className="text-[11px] text-ink-400">Sin abiertos.</li> : data.longevos.slice(0, 4).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-800 truncate"><b>{t.folio || '#' + t.id}</b> · {trunc(titulo(t.nombre), 32)}</p>
                  <p className="text-[11px] text-ink-400 truncate">{t.tipo_nombre || 'Sin tipo'} · {estadoLabel(t.estado)}</p>
                </div>
                <span className="text-[11px] font-bold texto-acento shrink-0"><Transcurrido desde={t.created_at} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      </motion.div>
    </div>
  );
};

export default Monitor;
