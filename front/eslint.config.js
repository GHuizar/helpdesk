import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      /*
       * set-state-in-effect: aviso, no error.
       *
       * Marca el patron de carga de datos que usa todo el proyecto:
       *
       *   useEffect(() => {
       *     setLoading(true);
       *     api.loQueSea().then(...).finally(() => setLoading(false));
       *   }, [deps]);
       *
       * La regla no dice que esto este roto: dice que el render que se gana al
       * encender el spinner se podria evitar obteniendo los datos con `use()` o
       * con una libreria de data fetching (TanStack Query y similares). Mientras
       * el proyecto no adopte una, la alternativa seria repartir banderas de
       * carga a mano por cada pantalla, que es mas codigo y mas facil de romper.
       *
       * Se deja en 'warn' para que siga siendo visible en `npm run lint` y no
       * se olvide, pero sin tumbar el CI por una decision deliberada. Al migrar
       * a una libreria de data fetching, subirla de nuevo a 'error'.
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
