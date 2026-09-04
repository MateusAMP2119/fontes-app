import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // functions/api/stories only runs on Cloudflare Pages; dev reads the deployed copy. Auth stays local.
    proxy: {
      '/api/stories': { target: 'https://builder.fonteslabs.com', changeOrigin: true },
      '/api/favicon': { target: 'https://builder.fonteslabs.com', changeOrigin: true },
    },
  },
})
