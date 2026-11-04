// Estilos de botón centralizados. Variantes pensadas para ambas vistas:
//  - primary: acento azul (mist) -> vista usuario / acciones principales
//  - dark:    neutro oscuro (ink) -> vista administración
//  - neutral: borde gris claro    -> secundario en cualquier vista
//  - danger / ghost
// `min-h-*` garantiza un area de toque usable: 44px en lg, 40px en md y 36px en sm
// (sm solo se usa en barras densas de escritorio, nunca como accion principal).
const SIZES = {
  sm: 'text-xs px-3 py-1.5 min-h-9 rounded-lg',
  md: 'text-sm px-4 py-2.5 min-h-10 rounded-lg',
  lg: 'text-sm px-5 py-3 min-h-11 rounded-lg',
};

const VARIANTS = {
  primary: 'bg-mist-600 text-white hover:bg-mist-700 font-semibold shadow-sm shadow-ink-900/10',
  dark: 'bg-ink-800 text-white hover:bg-ink-900 font-semibold shadow-sm shadow-ink-900/10',
  neutral: 'bg-white border border-cloud-300 text-ink-700 hover:bg-cloud-100 font-semibold',
  danger: 'bg-red-600 text-white hover:bg-red-700 font-semibold shadow-sm shadow-red-900/15',
  ghost: 'text-ink-600 hover:bg-cloud-100 font-semibold',
};

// Transicion acotada a las propiedades que realmente cambian (nunca `all`: evita
// animar sin querer layout/filtros) y escala al presionar para dar respuesta tactil.
const BASE = 'cursor-pointer inline-flex items-center justify-center gap-1.5 '
  + 'transition-[background-color,border-color,color,box-shadow,scale] duration-150 ease-salida '
  + 'active:scale-[0.96] active:duration-100 '
  + 'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

export function btn(variant = 'primary', size = 'md') {
  return `${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md}`;
}

export default btn;
