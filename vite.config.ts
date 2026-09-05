import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Story data comes from Cloudflare; authentication stays on the local origin
// so OAuth callbacks receive the same cookies as the sign-in request. The auth
// Worker lives in the fontes-api repo and runs on 8787 via its `npm run dev`.
const AUTH_ORIGIN = 'https://builder.fonteslabs.com'
const authProxy = { target: 'http://localhost:8787', changeOrigin: true }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/stories': { target: AUTH_ORIGIN, changeOrigin: true },
      '/api/favicon': { target: AUTH_ORIGIN, changeOrigin: true },
      '/api/auth': authProxy,
      '/api/projects': authProxy,
    },
  },
})
