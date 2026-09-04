import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // functions/api/* and the auth Worker only run on Cloudflare; dev reads the deployed copies.
    // Without the auth proxy the SPA fallback answers get-session with index.html and the header
    // shows a phantom account. The Origin rewrite passes Better Auth's CSRF check for sign-in POSTs.
    proxy: {
      '/api/stories': { target: 'https://builder.fonteslabs.com', changeOrigin: true },
      '/api/favicon': { target: 'https://builder.fonteslabs.com', changeOrigin: true },
      '/api/auth': { target: 'https://builder.fonteslabs.com', changeOrigin: true, headers: { origin: 'https://builder.fonteslabs.com' } },
    },
  },
})
