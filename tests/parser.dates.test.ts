import { describe, expect, it } from 'vitest'
import { parseQuickInput } from '../src/core/parser'

// Giovedì 24 settembre 2026, 10:00 a Roma (CEST, UTC+2)
const THU = new Date('2026-09-24T08:00:00Z')
// Venerdì 25 settembre 2026, 10:00
const FRI = new Date('2026-09-25T08:00:00Z')
// Domenica 27 settembre 2026, 10:00
const SUN = new Date('2026-09-27T08:00:00Z')
// Giovedì 31 dicembre 2026, 10:00 (CET, UTC+1)
const NYE = new Date('2026-12-31T09:00:00Z')

function due(text: string, now = THU) {
  return parseQuickInput(text, { now }).due
}

function date(text: string, now = THU) {
  return due(text, now)?.date ?? null
}

describe('date relative (oggi = gio 24/09/2026)', () => {
  it.each([
    ['oggi', '2026-09-24'],
    ['domani', '2026-09-25'],
    ['Domani', '2026-09-25'],
    ['dopodomani', '2026-09-26']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))
})

describe('giorni della settimana: prossima occorrenza, oggi escluso', () => {
  it.each([
    ['lunedì', '2026-09-28'],
    ['martedi', '2026-09-29'],
    ['mercoledì', '2026-09-30'],
    ['giovedì', '2026-10-01'],
    ['venerdì', '2026-09-25'],
    ['VENERDI', '2026-09-25'],
    ['sabato', '2026-09-26'],
    ['domenica', '2026-09-27'],
    ['venerdì prossimo', '2026-09-25'],
    ['prossimo venerdì', '2026-09-25'],
    ['prossima domenica', '2026-09-27']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))

  it('"venerdì" detto di venerdì è il venerdì successivo', () => {
    expect(date('venerdì', FRI)).toBe('2026-10-02')
    expect(date('sabato', FRI)).toBe('2026-09-26')
    expect(date('giovedì', FRI)).toBe('2026-10-01')
  })

  it('di domenica', () => {
    expect(date('domenica', SUN)).toBe('2026-10-04')
    expect(date('lunedì', SUN)).toBe('2026-09-28')
  })
})

describe('tra N', () => {
  it.each([
    ['tra 3 giorni', '2026-09-27'],
    ['fra 1 giorno', '2026-09-25'],
    ['tra dieci giorni', '2026-10-04'],
    ['fra una settimana', '2026-10-01'],
    ['tra 2 settimane', '2026-10-08'],
    ['tra un mese', '2026-10-24'],
    ['tra 2 mesi', '2026-11-24'],
    ['tra 1 anno', '2027-09-24'],
    ['tra 5 gg', '2026-09-29']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))

  it('"tra 0 giorni" e "tra giorni" non sono date', () => {
    expect(date('tra 0 giorni')).toBeNull()
    expect(date('tra giorni')).toBeNull()
  })
})

describe('periodi', () => {
  it.each([
    ['settimana prossima', '2026-09-28'],
    ['prossima settimana', '2026-09-28'],
    ['fine settimana', '2026-09-26'],
    ['weekend', '2026-09-26'],
    ['week-end', '2026-09-26'],
    ['fine settimana prossima', '2026-10-03'],
    ['weekend prossimo', '2026-10-03'],
    ['fine mese', '2026-09-30'],
    ['fine del mese', '2026-09-30'],
    ['fine mese prossimo', '2026-10-31'],
    ['mese prossimo', '2026-10-01'],
    ['prossimo mese', '2026-10-01'],
    ['fine anno', '2026-12-31'],
    ["fine dell'anno", '2026-12-31']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))

  it('weekend detto di sabato è oggi, di domenica è il sabato dopo', () => {
    expect(date('weekend', new Date('2026-09-26T08:00:00Z'))).toBe('2026-09-26')
    expect(date('weekend', SUN)).toBe('2026-10-03')
  })

  it('settimana prossima detto di domenica è il giorno dopo', () => {
    expect(date('settimana prossima', SUN)).toBe('2026-09-28')
  })
})

describe('date esplicite', () => {
  it.each([
    ['15/10', '2026-10-15'],
    ['24/09', '2026-09-24'],
    ['23/09', '2027-09-23'],
    ['15/01', '2027-01-15'],
    ['1/2', '2027-02-01'],
    ['15/10/2027', '2027-10-15'],
    ['15/10/27', '2027-10-15'],
    ['2026-12-01', '2026-12-01'],
    ['15 ottobre', '2026-10-15'],
    ['15 Ottobre', '2026-10-15'],
    ['15 ott', '2026-10-15'],
    ['1° dicembre', '2026-12-01'],
    ['3 marzo', '2027-03-03'],
    ['3 mar', '2027-03-03'],
    ['20 settembre', '2027-09-20'],
    ['15 ottobre 2027', '2027-10-15']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))

  it('29/02 senza anno va al prossimo anno bisestile', () => {
    expect(date('29/02')).toBe('2028-02-29')
    expect(date('29 febbraio')).toBe('2028-02-29')
  })

  it('date impossibili non vengono interpretate', () => {
    for (const text of ['31/02', '30/02', '29/02/2027', '31/04', '32 ottobre', '0/10', '15/13']) {
      expect(date(text), text).toBeNull()
    }
  })

  it('data esplicita passata con anno: accettata con avviso', () => {
    const r = parseQuickInput('Rinnovo 15/10/2025', { now: THU })
    expect(r.due?.date).toBe('2025-10-15')
    expect(r.warnings).toContain('Data nel passato: 15/10/2025')
  })
})

describe('giorno del mese', () => {
  it.each([
    ['il 15', '2026-10-15'],
    ['il 24', '2026-09-24'],
    ['il 30', '2026-09-30'],
    ['il 31', '2026-10-31'],
    ["l'11", '2026-10-11']
  ])('%s → %s', (text, expected) => expect(date(text)).toBe(expected))

  it('salta i mesi che non hanno quel giorno', () => {
    expect(date('il 30', new Date('2027-01-31T09:00:00Z'))).toBe('2027-03-30')
  })
})

describe('preposizioni assorbite', () => {
  it.each([
    ['entro venerdì', '2026-09-25'],
    ['per domani', '2026-09-25'],
    ['entro il 15', '2026-10-15'],
    ['entro fine mese', '2026-09-30'],
    ['per il 15 ottobre', '2026-10-15'],
    ['di lunedì', '2026-09-28'],
    ["entro l'11 ottobre", '2026-10-11']
  ])('%s → %s', (text, expected) => {
    const r = parseQuickInput(`Task ${text}`, { now: THU })
    expect(r.due?.date).toBe(expected)
    expect(r.title).toBe('Task')
  })
})

describe('orari', () => {
  it.each([
    ['alle 15', '2026-09-24', '15:00'],
    ['alle 9:30', '2026-09-25', '09:30'],
    ['alle 10', '2026-09-25', '10:00'],
    ['alle 3', '2026-09-24', '15:00'],
    ['alle 7', '2026-09-24', '19:00'],
    ['alle 8', '2026-09-25', '08:00'],
    ['alle 0', '2026-09-25', '00:00'],
    ['ore 15.30', '2026-09-24', '15:30'],
    ['alle ore 18', '2026-09-24', '18:00'],
    ['15:30', '2026-09-24', '15:30'],
    ['9:15', '2026-09-25', '09:15'],
    ['a mezzogiorno', '2026-09-24', '12:00'],
    ['domani alle 9', '2026-09-25', '09:00'],
    ['venerdì alle 12', '2026-09-25', '12:00'],
    ['alle 12 venerdì', '2026-09-25', '12:00'],
    ['oggi alle 8', '2026-09-24', '08:00']
  ])('%s → %s %s', (text, expectedDate, expectedTime) => {
    expect(due(text)).toEqual({ date: expectedDate, time: expectedTime })
  })

  it('senza orario il campo time è null', () => {
    expect(due('domani')).toEqual({ date: '2026-09-25', time: null })
  })

  it('orari non validi restano nel titolo', () => {
    const r = parseQuickInput('Chiamare alle 25', { now: THU })
    expect(r.due).toBeNull()
    expect(r.title).toBe('Chiamare alle 25')
    expect(r.warnings).toContain('Orario non valido: alle 25')
  })
})

describe("a cavallo d'anno (oggi = gio 31/12/2026)", () => {
  it.each([
    ['domani', '2027-01-01'],
    ['venerdì', '2027-01-01'],
    ['giovedì', '2027-01-07'],
    ['settimana prossima', '2027-01-04'],
    ['tra 2 giorni', '2027-01-02'],
    ['tra un mese', '2027-01-31'],
    ['fine mese', '2026-12-31'],
    ['fine mese prossimo', '2027-01-31'],
    ['mese prossimo', '2027-01-01'],
    ['fine anno', '2026-12-31'],
    ['15/01', '2027-01-15'],
    ['31/12', '2026-12-31'],
    ['il 5', '2027-01-05'],
    ['6 gennaio', '2027-01-06']
  ])('%s → %s', (text, expected) => expect(date(text, NYE)).toBe(expected))
})

describe('fine mese e anni bisestili', () => {
  it('tra un mese dal 31 gennaio si ferma all\'ultimo giorno di febbraio', () => {
    expect(date('tra un mese', new Date('2027-01-31T09:00:00Z'))).toBe('2027-02-28')
    expect(date('tra un mese', new Date('2028-01-31T09:00:00Z'))).toBe('2028-02-29')
    expect(date('fine mese prossimo', new Date('2027-01-31T09:00:00Z'))).toBe('2027-02-28')
  })
})

describe('fuso orario Europe/Rome', () => {
  it('dopo mezzanotte a Roma è già il giorno dopo, anche se in UTC no', () => {
    const late = new Date('2026-09-24T22:30:00Z') // 00:30 del 25 a Roma
    expect(date('oggi', late)).toBe('2026-09-25')
    expect(date('domani', late)).toBe('2026-09-26')
  })

  it("con l'ora solare il riferimento resta l'ora di Roma", () => {
    const winter = new Date('2026-12-01T22:30:00Z') // 23:30 del 1/12 a Roma
    expect(date('oggi', winter)).toBe('2026-12-01')
    expect(due('alle 23', winter)).toEqual({ date: '2026-12-02', time: '23:00' })
  })
})
