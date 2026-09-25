// Genera gli screenshot del README: avvia l'app già compilata (`npm run build`) con una cartella dati
// temporanea, la riempie con task di esempio e salva le immagini in docs/screenshots.
// Uso: npx electron scripts/screenshots.cjs
const { app, BrowserWindow, Notification } = require('electron')
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const OUT = join(__dirname, '..', 'docs', 'screenshots')
const DATA = mkdtempSync(join(tmpdir(), 'plainlist-shots-'))

// Dati separati da quelli veri e nessuna notifica di Windows durante gli scatti.
app.setPath('userData', DATA)
app.setPath('documents', DATA)
Notification.prototype.show = function () {}

require('../out/main/index.js')

const EXAMPLES = [
  'Mandare preventivo @Marco venerdì alle 12 #lavoro !alta ~30m',
  'Preparare slide per il board oggi alle 15 #lavoro !alta ~2h',
  'Rispondere a @Luca sul contratto oggi #lavoro ~20m',
  'Revisione KPI @Marco ogni lunedì alle 9 ~1h !alta',
  'Budget Q4 da @Anna +attesa entro mercoledì #lavoro',
  'Pagare bollette entro fine mese #casa !!!',
  'Chiamare idraulico domani alle 10 #casa ~15m',
  'Prenotare veterinario settimana prossima #casa',
  'Palestra ogni lunedì e giovedì alle 19 #personale',
  'Pranzo con @Anna e @Luca giovedì alle 13 #personale',
  'Bilancio da lunedì entro 15/10 #lavoro ~3h',
  'Leggere "Deep Work" #personale ~1h',
  'Aggiornare CV #personale !bassa',
  'Contratto fornitore firmato @Luca +attesa #lavoro'
]

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function mainWindow() {
  for (;;) {
    const win = BrowserWindow.getAllWindows().find((w) => w.getBounds().width >= 1000)
    if (win && !win.webContents.isLoading()) return win
    await wait(200)
  }
}

async function run() {
  await app.whenReady()
  const win = await mainWindow()
  const js = (code) => win.webContents.executeJavaScript(`(async () => { ${code} })()`)
  await wait(800)

  await js(`
    const api = window.api
    await api.invoke('settings:set', { tourCompleted: true, theme: 'light' })
    const ids = []
    for (const text of ${JSON.stringify(EXAMPLES)}) ids.push((await api.invoke('tasks:quickAdd', { text })).id)
    const overdue = await api.invoke('tasks:quickAdd', { text: 'Inviare report settimanale #lavoro !alta ~45m' })
    const today = (await api.invoke('app:init')).today
    const [y, m, d] = today.split('-').map(Number)
    const past = new Date(Date.UTC(y, m - 1, d - 2)).toISOString().slice(0, 10)
    await api.invoke('tasks:update', { id: overdue.id, patch: { dueDate: past } })
    for (const text of ['Rinnovare assicurazione auto #casa', 'Call con @Marco sul preventivo #lavoro', 'Ordinare toner stampante #lavoro']) {
      const t = await api.invoke('tasks:quickAdd', { text })
      await api.invoke('tasks:complete', { id: t.id, done: true })
    }
    for (const id of [overdue.id, ids[1], ids[2], ids[6]]) await api.invoke('tasks:setMyDay', { id, on: true })
  `)
  win.setSize(1280, 820)
  win.center()
  win.webContents.reload()
  await wait(1500)

  mkdirSync(OUT, { recursive: true })
  const shot = async (name) => {
    await wait(700)
    const image = await win.webContents.capturePage()
    writeFileSync(join(OUT, `${name}.png`), image.toPNG())
    console.log('salvato', name)
  }
  const click = (label) =>
    js(`[...document.querySelectorAll('aside button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(label)}))?.click()`)

  await click('Tutti')
  await shot('list')

  await js(`window.dispatchEvent(new CustomEvent('plainlist:fill-quick', { detail: 'Mandare preventivo @Marco venerdì alle 12 #lavoro !alta' }))`)
  await shot('quick-add')
  await js(`window.dispatchEvent(new CustomEvent('plainlist:fill-quick', { detail: '' }))`)

  await click('Il mio giorno')
  await shot('my-day')

  await click('Marco')
  await shot('person')

  await click('Update')
  await shot('update')

  await click('Tutti')
  win.webContents.send('nav:openTask', { id: 4 })
  await shot('detail')

  await js(`await window.api.invoke('settings:set', { theme: 'dark' })`)
  await click('Tutti')
  await js(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await shot('dark')
}

run()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => {
    // Il database può essere ancora aperto: se la cartella non si cancella, resta nei file temporanei.
    try {
      rmSync(DATA, { recursive: true, force: true })
    } catch {}
    app.exit()
  })
