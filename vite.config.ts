import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), VitePWA({
    // Let the next version activate after all app windows close.
    registerType: 'prompt',
    injectRegister: 'script',
    includeAssets: ['mark.png', 'mark-favicon-b31fccab.png', 'apple-touch-icon.png'],
    manifest: {
      id: '/',
      name: 'Fontes',
      short_name: 'Fontes',
      description: 'O teu espaço para acompanhar e explorar as notícias.',
      lang: 'pt-PT',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,woff2,png,jpg,svg}'],
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/\.well-known\//],
      // Only packaged static assets are cached; API/session responses stay online.
      cleanupOutdatedCaches: true,
    },
  })],
  server: { port: 5173, strictPort: true },
})
