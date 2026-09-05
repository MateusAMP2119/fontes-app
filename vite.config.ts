import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Story data comes from Cloudflare; authentication stays on the local origin
// so OAuth callbacks receive the same cookies as the sign-in request. The auth
// Worker lives in the fontes-auth repo and runs on 8787 via its `npm run dev`;
// this repo's Pages Functions run on 8789 via `npm run dev:functions`.
const AUTH_ORIGIN = 'https://builder.fonteslabs.com'
const authProxy = { target: 'http://localhost:8787', changeOrigin: true }
const functionsProxy = { target: 'http://localhost:8789', changeOrigin: true }

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
      '/api/projects': functionsProxy,
    },
  },
})
