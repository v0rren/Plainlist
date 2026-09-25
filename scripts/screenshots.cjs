// Genera gli screenshot del README: avvia l'app già compilata (`npm run build`) con una cartella dati
// temporanea, la riempie con task di esempio e salva le immagini in docs/screenshots (docs/screenshots/it
// per l'italiano).
// Uso: npx electron scripts/screenshots.cjs [en|it]
const { app, BrowserWindow, Notification } = require('electron')
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')

const LANGUAGE = process.argv.includes('it') ? 'it' : 'en'
const OUT = join(__dirname, '..', 'docs', 'screenshots', ...(LANGUAGE === 'it' ? ['it'] : []))
const DATA = mkdtempSync(join(tmpdir(), 'plainlist-shots-'))

// Dati separati da quelli veri e nessuna notifica di Windows durante gli scatti.
app.setPath('userData', DATA)
app.setPath('documents', DATA)
Notification.prototype.show = function () {}

require('../out/main/index.js')
// Il profilo temporaneo partirebbe con la lingua di Windows: i campi data devono seguire quella degli scatti.
app.commandLine.appendSwitch('lang', LANGUAGE === 'it' ? 'it-IT' : 'en-GB')

const DEMO = {
  it: {
    areas: ['lavoro', 'casa', 'personale'],
    tasks: [
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
    ],
    overdue: 'Inviare report settimanale #lavoro !alta ~45m',
    done: ['Rinnovare assicurazione auto #casa', 'Call con @Marco sul preventivo #lavoro', 'Ordinare toner stampante #lavoro'],
    example: 'Mandare preventivo @Marco venerdì alle 12 #lavoro !alta',
    nav: { all: 'Tutti', myDay: 'Il mio giorno', update: 'Update' }
  },
  en: {
    areas: ['work', 'home', 'personal'],
    tasks: [
      'Send quote to @Marco friday at 12 #work !high ~30m',
      'Prepare board slides today at 3pm #work !high ~2h',
      'Reply to @Luca about the contract today #work ~20m',
      'KPI review @Marco every monday at 9 ~1h !high',
      'Q4 budget from @Anna +waiting by wednesday #work',
      'Pay the bills by end of month #home !!!',
      'Call the plumber tomorrow at 10am #home ~15m',
      'Book the vet next week #home',
      'Gym every monday and thursday at 7pm #personal',
      'Lunch with @Anna and @Luca thursday at 1pm #personal',
      'Budget review starting monday by 15/10 #work ~3h',
      'Read "Deep Work" #personal ~1h',
      'Update CV #personal !low',
      'Supplier contract signed @Luca +waiting #work'
    ],
    overdue: 'Send weekly report #work !high ~45m',
    done: ['Renew car insurance #home', 'Call with @Marco about the quote #work', 'Order printer toner #work'],
    example: 'Send quote to @Marco friday at 12 #work !high',
    nav: { all: 'All', myDay: 'My Day', update: 'Update' }
  }
}[LANGUAGE]

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
    const demo = ${JSON.stringify(DEMO)}
    await api.invoke('settings:set', { tourCompleted: true, theme: 'light', language: ${JSON.stringify(LANGUAGE)} })
    // Le aree di esempio con i nomi della lingua scelta, qualunque sia la lingua di Windows.
    const areas = await api.invoke('areas:list')
    for (const [i, area] of areas.slice(0, 3).entries()) await api.invoke('areas:upsert', { id: area.id, name: demo.areas[i] })
    const ids = []
    for (const text of demo.tasks) ids.push((await api.invoke('tasks:quickAdd', { text })).id)
    const overdue = await api.invoke('tasks:quickAdd', { text: demo.overdue })
    const today = (await api.invoke('app:init')).today
    const [y, m, d] = today.split('-').map(Number)
    const past = new Date(Date.UTC(y, m - 1, d - 2)).toISOString().slice(0, 10)
    await api.invoke('tasks:update', { id: overdue.id, patch: { dueDate: past } })
    for (const text of demo.done) {
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
    console.log('salvato', join(OUT, `${name}.png`))
  }
  const click = (label) =>
    js(`[...document.querySelectorAll('aside button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(label)}))?.click()`)

  await click(DEMO.nav.all)
  await shot('list')

  await js(`window.dispatchEvent(new CustomEvent('plainlist:fill-quick', { detail: ${JSON.stringify(DEMO.example)} }))`)
  await shot('quick-add')
  await js(`window.dispatchEvent(new CustomEvent('plainlist:fill-quick', { detail: '' }))`)

  await click(DEMO.nav.myDay)
  await shot('my-day')

  await click('Marco')
  await shot('person')

  await click(DEMO.nav.update)
  await shot('update')

  await click(DEMO.nav.all)
  win.webContents.send('nav:openTask', { id: 4 })
  await shot('detail')

  await js(`await window.api.invoke('settings:set', { theme: 'dark' })`)
  await click(DEMO.nav.all)
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
