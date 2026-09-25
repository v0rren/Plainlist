import type { AreaUpsert, BackupStatus } from '@shared/ipc'
import type { Area, Settings } from '@shared/types'
import { Archive, ArchiveRestore, Download, FolderOpen, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '../components/Modal'
import { api, cn, errorMessage, formatDateTime } from '../lib/ui'
import { useStore } from '../store'

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown'
}

/** Converte un evento di tastiera in un accelerator di Electron ("Control+Alt+Space"). */
export function toAccelerator(e: KeyboardEvent | React.KeyboardEvent): string | null {
  if (['Control', 'Alt', 'Shift', 'Meta', 'AltGraph'].includes(e.key)) return null
  let key = KEY_NAMES[e.key] ?? null
  if (!key && /^F\d{1,2}$/.test(e.key)) key = e.key
  if (!key && e.code.startsWith('Key')) key = e.code.slice(3)
  if (!key && e.code.startsWith('Digit')) key = e.code.slice(5)
  if (!key) return null
  const mods = [e.ctrlKey && 'Control', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super'].filter(Boolean)
  if (!e.ctrlKey && !e.altKey && !e.metaKey && !/^F\d/.test(key)) return null
  return [...mods, key].join('+')
}

export function describeAccelerator(acc: string): string {
  return acc
    .split('+')
    .map((p) => ({ Control: 'Ctrl', Space: 'Spazio', Super: 'Win', Up: '↑', Down: '↓', Left: '←', Right: '→' })[p] ?? p)
    .join('+')
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-2.5 text-sm font-semibold">{title}</h2>
      <div className="divide-y divide-line">{children}</div>
    </section>
  )
}

function Item({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="flex-1">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-xs text-subtle">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange(v: boolean): void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-5 w-9 rounded-full transition-colors disabled:opacity-40',
        checked ? 'bg-accent' : 'bg-surface-3'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-4'
        )}
      />
    </button>
  )
}

function HotkeyRecorder({ value, onChange }: { value: string; onChange(v: string): void }) {
  const [recording, setRecording] = useState(false)
  return (
    <button
      className={cn('btn min-w-44 justify-center font-mono text-xs', recording && 'border-accent text-accent')}
      onClick={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(e) => {
        if (!recording) return
        e.preventDefault()
        e.stopPropagation()
        if (e.key === 'Escape') {
          setRecording(false)
          return
        }
        const acc = toAccelerator(e)
        if (acc) {
          setRecording(false)
          onChange(acc)
        }
      }}
    >
      {recording ? 'Premi la combinazione…' : describeAccelerator(value)}
    </button>
  )
}

function NumberField({ value, min, max, onChange }: { value: number; min: number; max: number; onChange(v: number): void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const n = Math.round(Number(text))
        if (Number.isFinite(n) && n >= min && n <= max) onChange(n)
        else setText(String(value))
      }}
      className="field w-20 text-right"
    />
  )
}

function BackupSection({ settings, update }: { settings: Settings; update(patch: Partial<Settings>): Promise<void> }) {
  const toast = useStore((s) => s.toast)
  const [status, setStatus] = useState<BackupStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const b = settings.autoBackup

  useEffect(() => {
    void api.invoke('backup:status').then(setStatus)
  }, [settings.autoBackup])

  const act = async (fn: () => Promise<BackupStatus | { cancelled: true }>): Promise<void> => {
    setBusy(true)
    try {
      const res = await fn()
      if (!('cancelled' in res)) {
        setStatus(res)
        if (res.lastError) toast({ kind: 'error', message: res.lastError })
        else toast({ kind: 'info', message: `Backup salvato in ${res.lastPath}` })
      }
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Backup automatico">
      <Item label="Backup giornaliero" hint="Una volta al giorno salva tutti i dati in JSON (lo stesso formato di Esporta)">
        <Toggle checked={b.enabled} onChange={(v) => void update({ autoBackup: { ...b, enabled: v } })} />
      </Item>
      <Item
        label="Cartella"
        hint={
          status?.folder ??
          'Documenti\\Plainlist Backup. Se scegli una cartella dentro OneDrive, i backup vengono sincronizzati da OneDrive.'
        }
      >
        <div className="flex gap-2">
          <button className="btn" disabled={busy} onClick={() => void act(() => api.invoke('backup:chooseFolder'))}>
            <FolderOpen size={14} /> Scegli…
          </button>
          <button className="btn" onClick={() => void api.invoke('backup:openFolder')}>
            Apri
          </button>
        </div>
      </Item>
      <Item label="Backup da conservare" hint="I più vecchi vengono eliminati">
        <NumberField value={b.keep} min={1} max={365} onChange={(v) => void update({ autoBackup: { ...b, keep: v } })} />
      </Item>
      <Item
        label="Ultimo backup"
        hint={
          status?.lastError ??
          (status?.lastAt ? `${formatDateTime(status.lastAt)} · ${status.lastPath}` : 'Non ancora eseguito')
        }
      >
        <button className="btn" disabled={busy} onClick={() => void act(() => api.invoke('backup:runNow'))}>
          <RefreshCw size={14} /> Esegui ora
        </button>
      </Item>
    </Section>
  )
}

function AreasEditor() {
  const toast = useStore((s) => s.toast)
  const [areas, setAreas] = useState<Area[]>([])
  const [newName, setNewName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Area | null>(null)

  const load = async (): Promise<void> => setAreas(await api.invoke('areas:list'))
  useEffect(() => {
    void load()
    return window.api.on('tasks:changed', () => void load())
  }, [])

  const upsert = async (input: AreaUpsert): Promise<void> => {
    try {
      await api.invoke('areas:upsert', input)
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
      void load()
    }
  }

  return (
    <>
      {areas.map((a) => (
        <div key={a.id} className={cn('flex items-center gap-2 px-4 py-2', a.archived && 'opacity-50')}>
          <input
            type="color"
            value={a.color ?? '#888888'}
            onChange={(e) => void upsert({ id: a.id, name: a.name, color: e.target.value })}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
            title="Colore"
          />
          <input
            defaultValue={a.name}
            onBlur={(e) => e.target.value.trim() !== a.name && void upsert({ id: a.id, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="field flex-1 py-1"
          />
          <button
            className="icon-btn"
            title={a.archived ? 'Ripristina' : 'Archivia (nasconde l\'area senza toccare i task)'}
            onClick={() => void upsert({ id: a.id, name: a.name, archived: !a.archived })}
          >
            {a.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
          </button>
          <button className="icon-btn hover:text-danger" title="Elimina" onClick={() => setConfirmDelete(a)}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <form
        className="flex items-center gap-2 px-4 py-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!newName.trim()) return
          void upsert({ name: newName }).then(() => setNewName(''))
        }}
      >
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuova area" className="field flex-1 py-1" />
        <button className="btn" type="submit" disabled={!newName.trim()}>
          <Plus size={14} /> Aggiungi
        </button>
      </form>
      {confirmDelete && (
        <ConfirmDialog
          title="Eliminare l'area?"
          message={
            <>
              L'area <strong>{confirmDelete.name}</strong> verrà eliminata. I suoi task restano, ma senza area. Se vuoi
              solo nasconderla, usa "Archivia".
            </>
          }
          confirmLabel="Elimina"
          danger
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            const id = confirmDelete.id
            setConfirmDelete(null)
            void api.invoke('areas:delete', { id }).catch((err) => toast({ kind: 'error', message: errorMessage(err) }))
          }}
        />
      )}
    </>
  )
}

export function SettingsView() {
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const facets = useStore((s) => s.facets)
  const version = useStore((s) => s.version)
  const toast = useStore((s) => s.toast)
  const [confirmImport, setConfirmImport] = useState(false)

  if (!settings) return null

  async function update(patch: Partial<Settings>): Promise<void> {
    try {
      const res = await api.invoke('settings:set', patch)
      setSettings(res.settings)
      if (res.error) toast({ kind: 'error', message: res.error })
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    }
  }
  const notify = (patch: Partial<Settings['notifications']>): Promise<void> =>
    update({ notifications: { ...settings.notifications, ...patch } })

  async function exportData(): Promise<void> {
    try {
      const res = await api.invoke('data:export')
      if (!('cancelled' in res)) toast({ kind: 'info', message: `Backup salvato in ${res.path}` })
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    }
  }

  async function importData(): Promise<void> {
    setConfirmImport(false)
    try {
      const res = await api.invoke('data:import')
      if (!('cancelled' in res)) {
        toast({ kind: 'info', message: `Importati ${res.tasks} task e ${res.areas} aree. Copia dei dati precedenti: ${res.backupPath}`, timeoutMs: 9000 })
      }
    } catch (err) {
      toast({ kind: 'error', message: errorMessage(err) })
    }
  }

  const n = settings.notifications

  return (
    <div className="max-w-3xl space-y-4 px-6 py-5">
      <h1 className="text-xl font-semibold">Impostazioni</h1>

      <Section title="Generale">
        <Item label="Avvia con Windows" hint="All'accesso l'app parte ridotta nell'area di notifica">
          <Toggle checked={settings.autostart} onChange={(v) => void update({ autostart: v })} />
        </Item>
        <Item label="Tema">
          <select
            value={settings.theme}
            onChange={(e) => void update({ theme: e.target.value as Settings['theme'] })}
            className="field w-auto"
          >
            <option value="system">Come Windows</option>
            <option value="light">Chiaro</option>
            <option value="dark">Scuro</option>
          </select>
        </Item>
        <Item label="Area predefinita" hint="Usata dall'inserimento rapido quando non scrivi #area">
          <select
            value={settings.defaultAreaId ?? ''}
            onChange={(e) => void update({ defaultAreaId: e.target.value ? Number(e.target.value) : null })}
            className="field w-auto"
          >
            <option value="">Nessuna</option>
            {facets?.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Item>
        <Item label="Tour di benvenuto" hint="Un giro veloce delle funzioni principali">
          <button className="btn" onClick={() => useStore.getState().setTour(0)}>
            Rivedi il tour
          </button>
        </Item>
        <Item label="Scorciatoia globale" hint="Apre l'aggiunta rapida da qualunque programma. Clicca e premi i tasti.">
          <HotkeyRecorder value={settings.globalHotkey} onChange={(v) => void update({ globalHotkey: v })} />
        </Item>
      </Section>

      <Section title="Notifiche">
        <Item label="Notifiche attive">
          <Toggle checked={n.enabled} onChange={(v) => void notify({ enabled: v })} />
        </Item>
        <Item label="Riepilogo all'avvio" hint="Numero di task scaduti e in scadenza oggi">
          <Toggle checked={n.startupDigest} disabled={!n.enabled} onChange={(v) => void notify({ startupDigest: v })} />
        </Item>
        <Item label="Riepilogo al primo sblocco del giorno">
          <Toggle
            checked={n.dailyDigestOnUnlock}
            disabled={!n.enabled}
            onChange={(v) => void notify({ dailyDigestOnUnlock: v })}
          />
        </Item>
        <Item label="Avviso all'orario del task">
          <Toggle checked={n.dueAlerts} disabled={!n.enabled} onChange={(v) => void notify({ dueAlerts: v })} />
        </Item>
        <Item label="Preavviso">
          <select
            value={n.remindBeforeMin ?? ''}
            disabled={!n.enabled || !n.dueAlerts}
            onChange={(e) => void notify({ remindBeforeMin: e.target.value ? Number(e.target.value) : null })}
            className="field w-auto disabled:opacity-40"
          >
            <option value="">Nessuno</option>
            {[5, 10, 15, 30, 60].map((m) => (
              <option key={m} value={m}>
                {m} minuti prima
              </option>
            ))}
          </select>
        </Item>
      </Section>

      <Section title="Elenco e riepilogo">
        <Item label="Giorni in &quot;Prossimi giorni&quot;">
          <NumberField value={settings.upcomingDays} min={1} max={31} onChange={(v) => void update({ upcomingDays: v })} />
        </Item>
        <Item label="Task fermi dopo (giorni)">
          <NumberField value={settings.staleDays} min={1} max={365} onChange={(v) => void update({ staleDays: v })} />
        </Item>
        <Item label="Ore di lavoro al giorno" hint="Per il carico di Il mio giorno">
          <NumberField
            value={Math.round(settings.workdayMinutes / 60)}
            min={1}
            max={16}
            onChange={(v) => void update({ workdayMinutes: v * 60 })}
          />
        </Item>
        <Item label="Tempo per annullare un'eliminazione (secondi)">
          <NumberField value={settings.undoSeconds} min={2} max={30} onChange={(v) => void update({ undoSeconds: v })} />
        </Item>
      </Section>

      <Section title="Aree">
        <AreasEditor />
      </Section>

      <BackupSection settings={settings} update={update} />

      <Section title="Dati">
        <Item label="Esporta" hint="Salva tutti i task, le aree e le impostazioni in un file JSON">
          <button className="btn" onClick={() => void exportData()}>
            <Download size={14} /> Esporta JSON
          </button>
        </Item>
        <Item label="Importa" hint="Sostituisce tutti i dati attuali con quelli del file (prima ne salva una copia)">
          <button className="btn" onClick={() => setConfirmImport(true)}>
            <Upload size={14} /> Importa JSON
          </button>
        </Item>
        <Item label="Cartella dei dati">
          <button className="btn" onClick={() => void api.invoke('app:openDataFolder')}>
            <FolderOpen size={14} /> Apri
          </button>
        </Item>
      </Section>

      <p className="pb-4 text-center text-xs text-subtle">Plainlist {version} · funziona offline, i dati restano su questo PC</p>

      {confirmImport && (
        <ConfirmDialog
          title="Importare un backup?"
          message="Tutti i task, le aree e le impostazioni attuali verranno sostituiti con quelli del file. Prima dell'import viene salvata automaticamente una copia dei dati attuali."
          confirmLabel="Scegli il file…"
          onCancel={() => setConfirmImport(false)}
          onConfirm={() => void importData()}
        />
      )}
    </div>
  )
}
