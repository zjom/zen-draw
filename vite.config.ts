import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  // Desktop app: one big chunk loaded from disk is fine.
  build: { chunkSizeWarningLimit: 4096 },
  // Its `?url` imports break the dev-server dependency pre-bundler.
  optimizeDeps: { exclude: ['@tldraw/assets'] },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
