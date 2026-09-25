import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { groupTasks } from '../src/core/grouping'
import { getLanguage, languageFromLocale, localeTag, setLanguage, t } from '../src/core/i18n'
import { en } from '../src/core/i18n/en'
import { it as itMessages } from '../src/core/i18n/it'
import { describeRecurrence } from '../src/core/recurrence'
import { buildSummary, suggestionReason } from '../src/core/summary'
import { summaryToText } from '../src/core/text'
import { formatDateLong, formatDateShort, formatDue } from '../src/core/time'
import { SettingsRepo, ValidationError, openDatabase, peekSetting } from '../src/main/data'
import { TaskService } from '../src/main/services/taskService'
import { digestText, trayTooltip } from '../src/main/system/reminders'
import { makeTask } from './helpers'

const NOW = new Date('2026-09-24T08:00:00Z')
const TODAY = '2026-09-24'

afterEach(() => setLanguage('it'))

/** Chiavi annidate di un catalogo, per confrontare le due lingue. */
function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix]
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
}

describe('cataloghi', () => {
  it('italiano e inglese hanno le stesse chiavi', () => {
    expect(keys(en).sort()).toEqual(keys(itMessages).sort())
  })

  it('nessun testo inglese è vuoto', () => {
    const empty = keys(en).filter((k) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], en) === '')
    expect(empty).toEqual([])
  })

  it('la lingua predefinita è l\'italiano', () => {
    expect(getLanguage()).toBe('it')
    expect(t().common.cancel).toBe('Annulla')
  })

  it.each([
    ['it-IT', 'it'],
    ['it', 'it'],
    ['en-US', 'en'],
    ['de-DE', 'en'],
    [undefined, 'en']
  ])('lingua di sistema %s → %s', (locale, expected) => expect(languageFromLocale(locale)).toBe(expected))

  it('formato regionale: inglese britannico per giorno/mese e 24 ore', () => {
    expect(localeTag('it')).toBe('it-IT')
    expect(localeTag('en')).toBe('en-GB')
  })
})

describe('testi in inglese', () => {
  it('date', () => {
    setLanguage('en')
    expect(formatDateShort('2026-09-25', TODAY)).toBe('Fri 25 Sep')
    expect(formatDateLong('2026-09-25')).toBe('Friday 25 September')
    expect(formatDue('2026-09-25', '12:00', TODAY)).toBe('tomorrow 12:00')
    expect(formatDue('2026-09-23', null, TODAY)).toBe('yesterday')
    expect(formatDue('2026-10-02', null, TODAY)).toBe('Fri 2 Oct')
  })

  it.each([
    [{ freq: 'daily', interval: 1, anchor: 'schedule' }, 'every day'],
    [{ freq: 'daily', interval: 1, byWeekday: [1, 2, 3, 4, 5], anchor: 'schedule' }, 'every weekday'],
    [{ freq: 'weekly', interval: 1, byWeekday: [1, 4], anchor: 'schedule' }, 'every Monday and Thursday'],
    [{ freq: 'weekly', interval: 2, anchor: 'schedule' }, 'every 2 weeks'],
    [{ freq: 'monthly', interval: 1, byMonthDay: 1, anchor: 'schedule' }, 'every month on the 1st'],
    [{ freq: 'monthly', interval: 1, byMonthDay: 22, anchor: 'schedule' }, 'every month on the 22nd'],
    [{ freq: 'monthly', interval: 1, byMonthDay: 13, anchor: 'schedule' }, 'every month on the 13th'],
    [{ freq: 'monthly', interval: 1, byMonthDay: -1, anchor: 'schedule' }, 'every month on the last day'],
    [{ freq: 'daily', interval: 7, anchor: 'completion' }, 'every 7 days after completion']
  ] as const)('ripetizione → %s', (r, expected) => {
    setLanguage('en')
    expect(describeRecurrence({ ...r, byWeekday: 'byWeekday' in r ? [...r.byWeekday] : undefined })).toBe(expected)
  })

  it('gruppi e motivo del suggerimento', () => {
    setLanguage('en')
    const groups = groupTasks([makeTask({ dueDate: '2026-09-20' })], TODAY)
    expect(groups.map((g) => g.label)).toEqual(['Overdue', 'Today', 'Next 7 days', 'Later', 'No due date', 'Completed'])
    expect(suggestionReason(makeTask({ dueDate: '2026-09-20', priority: 3 }), TODAY)).toBe('overdue by 4 days, high priority')
    expect(suggestionReason(makeTask({ dueDate: TODAY, dueTime: '15:00' }), TODAY)).toBe('due today at 15:00, medium priority')
  })

  it('riepilogo copiabile, notifica e tooltip', () => {
    setLanguage('en')
    const summary = buildSummary(
      [makeTask({ title: 'Report', dueDate: '2026-09-22', priority: 3 }), makeTask({ title: 'Call', dueDate: TODAY })],
      { now: NOW }
    )
    const text = summaryToText(summary)
    expect(text).toContain('Update · Thursday 24 September')
    expect(text).toContain('OVERDUE (1)')
    expect(text).toContain('Start with: Report (overdue by 2 days, high priority).')
    expect(digestText(summary)).toEqual({
      title: 'Your day at a glance',
      body: '1 overdue task and 1 due today.\nStart with: Report'
    })
    expect(trayTooltip(summary)).toBe('Plainlist · 1 overdue, 1 today')
  })
})

describe('impostazione della lingua', () => {
  it('l\'inserimento rapido usa la lingua salvata', () => {
    const service = new TaskService(openDatabase(':memory:').db, () => NOW)
    service.settings.set({ language: 'en' })
    const task = service.quickAdd('Send quote @Marco tomorrow at 3pm !high')
    expect(task).toMatchObject({ title: 'Send quote', dueDate: '2026-09-25', dueTime: '15:00', priority: 3 })
  })

  it('i messaggi di errore seguono la lingua corrente', () => {
    const service = new TaskService(openDatabase(':memory:').db, () => NOW)
    setLanguage('en')
    service.settings.set({ language: 'en' })
    expect(() => service.quickAdd('tomorrow !high')).toThrow(new ValidationError('A title is required'))
  })

  it('senza impostazione salvata la lingua resta italiana', () => {
    expect(new SettingsRepo(openDatabase(':memory:').db).getAll().language).toBe('it')
  })

  it('peekSetting legge il file prima dell\'avvio', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plainlist-peek-'))
    const file = join(dir, 'tasks.db')
    try {
      expect(peekSetting(file, 'language')).toBeNull()
      const { db } = openDatabase(file)
      expect(peekSetting(file, 'language')).toBe('it')
      new SettingsRepo(db).set({ language: 'en' })
      expect(peekSetting(file, 'language')).toBe('en')
      db.close()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
