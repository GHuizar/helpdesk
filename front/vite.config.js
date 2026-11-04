import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // el SW se actualiza solo cuando hay nueva version
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo-mark-light.svg', 'logo-wordmark-light.svg'],
      manifest: {
        name: 'HelpDesk',
        short_name: 'HelpDesk',
        description: 'Sistema de tickets de soporte de HelpDesk.',
        lang: 'es',
        theme_color: '#2f4654',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // SPA: las rutas del cliente caen a index.html, PERO nunca las del backend.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/storage/, /^\/sanctum/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: { enabled: false }, // no registrar el SW en `npm run dev`
    }),
  ],
})
