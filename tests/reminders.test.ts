import { beforeEach, describe, expect, it } from 'vitest'
import { openDatabase } from '../src/main/data'
import { TaskService } from '../src/main/services/taskService'
import { ReminderScheduler, digestText, trayTooltip } from '../src/main/system/reminders'
import type { Task } from '../src/core/types'

let now: Date
let service: TaskService
let sent: string[]
let scheduler: ReminderScheduler

const minutes = (n: number): void => {
  now = new Date(now.getTime() + n * 60_000)
}

beforeEach(() => {
  now = new Date('2026-09-24T08:00:00Z') // 10:00 a Roma
  service = new TaskService(openDatabase(':memory:').db, () => now)
  sent = []
  scheduler = new ReminderScheduler(
    service.tasks,
    () => service.settings.getAll(),
    {
      due: (t: Task) => sent.push(`due:${t.title}`),
      dueSoon: (t: Task, m: number) => sent.push(`soon:${t.title}:${m}`)
    },
    () => now
  )
})

describe('avvisi all\'orario', () => {
  it('notifica una sola volta quando arriva l\'orario', () => {
    service.quickAdd('Chiamata alle 10:30')
    scheduler.tick()
    expect(sent).toEqual([])
    minutes(30)
    scheduler.tick()
    scheduler.tick()
    expect(sent).toEqual(['due:Chiamata'])
  })

  it('i task completati o senza orario non vengono notificati', () => {
    const t = service.quickAdd('Fatto alle 10:30')
    service.tasks.complete(t.id)
    service.quickAdd('Senza orario oggi')
    minutes(60)
    scheduler.tick()
    expect(sent).toEqual([])
  })

  it('spostare l\'orario riattiva la notifica', () => {
    const t = service.quickAdd('Chiamata alle 10:30')
    minutes(30)
    scheduler.tick()
    service.tasks.update(t.id, { dueTime: '11:00' })
    minutes(30)
    scheduler.tick()
    expect(sent).toEqual(['due:Chiamata', 'due:Chiamata'])
  })

  it('gli avvisi troppo in ritardo (sospensione) non vengono mostrati ma segnati', () => {
    service.quickAdd('Vecchio alle 10:30')
    service.quickAdd('Recente alle 12:30')
    minutes(180)
    scheduler.tick()
    expect(sent).toEqual(['due:Recente'])
    minutes(1)
    scheduler.tick()
    expect(sent).toHaveLength(1)
  })

  it('catchUp all\'avvio segna gli orari già passati senza notificare', () => {
    service.quickAdd('Passato oggi alle 9')
    scheduler.catchUp()
    scheduler.tick()
    expect(sent).toEqual([])
  })

  it('con le notifiche disattivate non invia nulla e non accumula arretrati', () => {
    service.settings.set({ notifications: { ...service.settings.getAll().notifications, enabled: false } })
    service.quickAdd('Chiamata alle 10:30')
    minutes(30)
    scheduler.tick()
    service.settings.set({ notifications: { ...service.settings.getAll().notifications, enabled: true } })
    scheduler.tick()
    expect(sent).toEqual([])
  })
})

describe('preavviso', () => {
  beforeEach(() => {
    service.settings.set({ notifications: { ...service.settings.getAll().notifications, remindBeforeMin: 15 } })
  })

  it('preavvisa X minuti prima e poi notifica all\'orario', () => {
    service.quickAdd('Riunione alle 11')
    minutes(40)
    scheduler.tick()
    expect(sent).toEqual([])
    minutes(6)
    scheduler.tick()
    scheduler.tick()
    expect(sent).toEqual(['soon:Riunione:14'])
    minutes(14)
    scheduler.tick()
    expect(sent).toEqual(['soon:Riunione:14', 'due:Riunione'])
  })

  it('senza preavviso impostato non preavvisa', () => {
    service.settings.set({ notifications: { ...service.settings.getAll().notifications, remindBeforeMin: null } })
    service.quickAdd('Riunione alle 10:10')
    scheduler.tick()
    expect(sent).toEqual([])
  })
})

describe('testi', () => {
  it('riepilogo giornaliero', () => {
    service.quickAdd('Scaduto 20/09/2026 !alta')
    service.quickAdd('Oggi oggi')
    service.quickAdd('Oggi 2 oggi')
    expect(digestText(service.summary({}))).toEqual({
      title: 'Il punto di oggi',
      body: '1 task scaduto e 2 in scadenza oggi.\nInizia da: Scaduto'
    })
    expect(trayTooltip(service.summary({}))).toBe('Plainlist · 1 scaduto, 2 oggi')
  })

  it('niente in scadenza', () => {
    expect(digestText(service.summary({}))).toEqual({
      title: 'Tutto in ordine',
      body: 'Nessun task scaduto o in scadenza oggi.'
    })
    expect(trayTooltip(service.summary({}))).toBe('Plainlist')
  })
})
