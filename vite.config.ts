import { cpSync, createReadStream, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST

// Resolves to dist/prod/index.js; the package doesn't export its package.json.
const excalidrawDist = dirname(createRequire(import.meta.url).resolve('@excalidraw/excalidraw'))

/** Serves Excalidraw's fonts at `/fonts` so the app works offline (see main.tsx). */
function excalidrawFonts(): Plugin {
  const src = join(excalidrawDist, 'fonts')
  let outDir = 'dist'
  return {
    name: 'excalidraw-fonts',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use('/fonts', (req, res, next) => {
        const file = join(src, decodeURIComponent(req.url!.split('?')[0]))
        if (!file.startsWith(src + '/') || !existsSync(file)) return next()
        res.setHeader('Content-Type', 'font/woff2')
        createReadStream(file).pipe(res)
      })
    },
    writeBundle() {
      cpSync(src, join(outDir, 'fonts'), { recursive: true })
    },
  }
}

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react(), excalidrawFonts()],
  clearScreen: false,
  // Desktop app: one big chunk loaded from disk is fine.
  build: { chunkSizeWarningLimit: 4096 },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
