import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'bookscroll' below with your actual GitHub repo name
const REPO_NAME = 'bookscroll'

export default defineConfig({
  plugins: [react()],

  // GitHub Pages serves from /<repo-name>/ so we set base accordingly.
  // For a custom domain (e.g. username.github.io) set base: '/'
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',

  server: {
    // In dev mode, proxy /api calls to the Cloudflare Worker (or any backend).
    // This keeps your API key out of the browser in local development.
    // Set VITE_PROXY_TARGET in a .env.local file:
    //   VITE_PROXY_TARGET=https://your-worker.workers.dev
    proxy: process.env.VITE_PROXY_TARGET
      ? {
          '/api': {
            target: process.env.VITE_PROXY_TARGET,
            changeOrigin: true,
          },
        }
      : undefined,
  },
})
