import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
].join('; ')

/** La CSP va solo nella build: in sviluppo bloccherebbe l'HMR di Vite. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'plainlist-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
  }
}

export default defineConfig({
  main: {
    build: { rollupOptions: { input: { index: resolve('src/main/index.ts') } } }
  },
  preload: {
    build: { rollupOptions: { input: { index: resolve('src/preload/index.ts') } } }
  },
  renderer: {
    root: resolve('src/renderer'),
    resolve: {
      alias: { '@core': resolve('src/core'), '@shared': resolve('src/shared') }
    },
    plugins: [react(), tailwindcss(), contentSecurityPolicy()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          quick: resolve('src/renderer/quick-add.html')
        }
      }
    }
  }
})
