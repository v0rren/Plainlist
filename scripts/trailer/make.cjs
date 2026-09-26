// Trailer del README. Uso, dalla radice del progetto:
//   npx electron scripts/trailer/make.cjs --mode=video                    → docs/trailer/plainlist-trailer.mp4
//   npx electron scripts/trailer/make.cjs --mode=preview --times=3.4,13.4 → out/trailer-preview/*.png
// Le impostazioni predefinite tengono il video sotto i 10 MB (limite di GitHub per i video).
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const arg = (name, fallback) => (process.argv.find((a) => a.startsWith(`--${name}=`)) ?? `=${fallback}`).split('=')[1]
const root = path.join(__dirname, '..', '..')
const mode = arg('mode', 'preview')
const query = {
  mode,
  times: arg('times', '1'),
  samples: arg('samples', '4'),
  bitrate: arg('bitrate', '3600000'),
  bmode: arg('bmode', 'constant'),
  abitrate: arg('abitrate', '128000'),
  name: arg('name', 'plainlist-trailer.mp4'),
  out: mode === 'preview' ? path.join(root, 'out', 'trailer-preview') : path.join(root, 'docs', 'trailer')
}
fs.mkdirSync(query.out, { recursive: true })

app.commandLine.appendSwitch('force-device-scale-factor', '1')
app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    width: 1920,
    height: 1080,
    // Pagina locale usata solo per il rendering: può scrivere il file con Node.
    webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false }
  })
  win.webContents.on('console-message', (e, ...rest) => {
    const message = e.message ?? rest[1]
    if (!/Electron Security Warning/.test(message)) console.log(message)
  })
  ipcMain.on('done', (_e, code) => app.exit(code))
  win.loadFile(path.join(__dirname, 'render.html'), { query })
})
