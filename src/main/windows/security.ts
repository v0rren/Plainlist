import { app, session, type WebContents } from 'electron'

function devServerOrigin(): string | null {
  const url = process.env.ELECTRON_RENDERER_URL
  if (app.isPackaged || !url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export function isTrustedUrl(url: string): boolean {
  if (url.startsWith('file://')) return true
  const dev = devServerOrigin()
  if (!dev) return false
  try {
    return new URL(url).origin === dev
  } catch {
    return false
  }
}

/** L'app è offline: ogni richiesta di rete è bloccata, tranne il dev server in sviluppo. */
export function blockNetwork(): void {
  const dev = devServerOrigin()
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (details, callback) => {
      const allowed = dev !== null && details.url.replace(/^ws/, 'http').startsWith(dev)
      callback({ cancel: !allowed })
    }
  )
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'notifications' || permission === 'clipboard-sanitized-write')
  })
}

export function hardenWebContents(contents: WebContents): void {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-navigate', (event, url) => {
    if (url !== contents.getURL()) event.preventDefault()
  })
}
