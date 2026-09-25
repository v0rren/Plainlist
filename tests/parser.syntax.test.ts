import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, defineRule, parseQuickInput, wordAt, type ParseOptions } from '../src/core/parser'

const NOW = new Date('2026-09-24T08:00:00Z')
const KNOWN: ParseOptions = { now: NOW, knownAreas: ['lavoro', 'casa', 'personale'], knownPeople: ['Marco', 'Anna Bianchi'] }

const parse = (text: string, options: ParseOptions = KNOWN) => parseQuickInput(text, options)

describe('esempio completo', () => {
  it('Mandare preventivo @Marco venerdì alle 12 #lavoro !alta', () => {
    const r = parse('Mandare preventivo @Marco venerdì alle 12 #lavoro !alta')
    expect(r).toMatchObject({
      title: 'Mandare preventivo',
      due: { date: '2026-09-25', time: '12:00' },
      priority: 3,
      area: { name: 'lavoro', isNew: false },
      people: [{ name: 'Marco', isNew: false }],
      tags: [],
      warnings: []
    })
    expect(r.spans.map((s) => [s.kind, s.text, s.status])).toEqual([
      ['person', '@Marco', 'ok'],
      ['date', 'venerdì', 'ok'],
      ['time', 'alle 12', 'ok'],
      ['area', '#lavoro', 'ok'],
      ['priority', '!alta', 'ok']
    ])
  })

  it('gli span puntano al testo originale', () => {
    const text = 'Pagare bollette entro fine mese #casa'
    const r = parse(text)
    const dateSpan = r.spans.find((s) => s.kind === 'date')!
    expect(text.slice(dateSpan.start, dateSpan.end)).toBe('entro fine mese')
  })
})

describe('priorità', () => {
  it.each([
    ['X !alta', 3],
    ['X !Alta', 3],
    ['X !media', 2],
    ['X !bassa', 1],
    ['X !!!', 3],
    ['X !!', 2],
    ['X !', 1],
    ['X', null]
  ])('%s → %s', (text, expected) => expect(parse(text).priority).toBe(expected))

  it('un punto esclamativo attaccato a una parola resta nel titolo', () => {
    const r = parse('Chiamare Marco!')
    expect(r.priority).toBeNull()
    expect(r.title).toBe('Chiamare Marco!')
  })

  it('la seconda priorità è segnalata e resta nel titolo', () => {
    const r = parse('X !alta !bassa')
    expect(r.priority).toBe(3)
    expect(r.title).toBe('X !bassa')
    expect(r.spans.find((s) => s.text === '!bassa')?.status).toBe('ambiguous')
    expect(r.warnings).toContain('Più di una priorità, ignorata: !bassa')
  })
})

describe('area', () => {
  it('usa il nome esistente senza distinguere maiuscole', () => {
    expect(parse('X #Lavoro').area).toEqual({ name: 'lavoro', isNew: false })
  })

  it('segnala le aree nuove', () => {
    expect(parse('X #ProgettoX').area).toEqual({ name: 'ProgettoX', isNew: true })
  })

  it('#123 non è un\'area', () => {
    const r = parse('Fix bug #123')
    expect(r.area).toBeNull()
    expect(r.title).toBe('Fix bug #123')
  })

  it('la seconda area resta nel titolo', () => {
    const r = parse('X #lavoro #casa')
    expect(r.area?.name).toBe('lavoro')
    expect(r.title).toBe('X #casa')
  })
})

describe('persone', () => {
  it('riconosce persone note e nuove', () => {
    expect(parse('X @marco @luca').people).toEqual([
      { name: 'Marco', isNew: false },
      { name: 'Luca', isNew: true }
    ])
  })

  it('underscore diventa spazio', () => {
    expect(parse('X @anna_bianchi @mario_rossi').people).toEqual([
      { name: 'Anna Bianchi', isNew: false },
      { name: 'Mario Rossi', isNew: true }
    ])
  })

  it('niente duplicati e punteggiatura finale ignorata', () => {
    expect(parse('Chiamare @Anna, poi @anna.').people.map((p) => p.name)).toEqual(['Anna'])
  })

  it("apostrofi nei nomi", () => {
    expect(parse("Pranzo con @D'Angelo").people[0].name).toBe("D'Angelo")
  })

  it('dopo una preposizione il nome resta nel titolo', () => {
    expect(parse('Budget Q4 da @marco +attesa').title).toBe('Budget Q4 da Marco')
    expect(parse('Scrivere a @luca_verdi domani').title).toBe('Scrivere a Luca Verdi')
    expect(parse('Pranzo con @Anna_Bianchi').title).toBe('Pranzo con Anna Bianchi')
    const r = parse('Chiamare @Marco e @Anna per il budget')
    expect(r.title).toBe('Chiamare per il budget')
    expect(r.people.map((p) => p.name)).toEqual(['Marco', 'Anna'])
    expect(parse('Pranzo con @Marco e @Anna_Bianchi').title).toBe('Pranzo con Marco e Anna Bianchi')
  })

  it('un indirizzo email non è una persona', () => {
    const r = parse('Scrivere a mario@example.com')
    expect(r.people).toEqual([])
    expect(r.title).toBe('Scrivere a mario@example.com')
  })
})

describe('tag', () => {
  it('+tag in minuscolo, senza duplicati', () => {
    expect(parse('X +Urgente +casa +urgente').tags).toEqual(['urgente', 'casa'])
  })

  it('+39 non è un tag', () => {
    expect(parse('Chiamare +39 333').tags).toEqual([])
  })
})

describe('titolo', () => {
  it('i numeri da soli non sono date', () => {
    const r = parse('Comprare 3 mele domani')
    expect(r.title).toBe('Comprare 3 mele')
    expect(r.due?.date).toBe('2026-09-25')
  })

  it('il testo tra virgolette non viene interpretato', () => {
    const r = parse('Leggere "fine mese" di Rossi')
    expect(r.due).toBeNull()
    expect(r.title).toBe('Leggere "fine mese" di Rossi')
  })

  it('virgolette non chiuse proteggono fino alla fine', () => {
    const r = parse('Rivedere "domani alle 15')
    expect(r.due).toBeNull()
  })

  it('la punteggiatura dopo un token riconosciuto resta ben formattata', () => {
    expect(parse('Chiamare Marco domani, poi scrivere').title).toBe('Chiamare Marco, poi scrivere')
  })

  it('prima lettera maiuscola, spazi compattati', () => {
    expect(parse('  comprare   latte  ').title).toBe('Comprare latte')
  })

  it('titolo vuoto se c\'è solo sintassi', () => {
    expect(parse('domani !alta').title).toBe('')
  })

  it('una preposizione senza data resta nel titolo', () => {
    expect(parse('Finire entro').title).toBe('Finire entro')
    expect(parse('Regali di Natale 20 dicembre').title).toBe('Regali di Natale')
  })

  it('parole come "ore" o "alle" senza orario restano', () => {
    const r = parse('Lavorare 8 ore di fila alle poste')
    expect(r.due).toBeNull()
    expect(r.title).toBe('Lavorare 8 ore di fila alle poste')
  })

  it('le elisioni nel titolo restano intatte', () => {
    expect(parse("Bilancio dell'azienda").title).toBe("Bilancio dell'azienda")
  })
})

describe('date non valide o ambigue', () => {
  it('data non valida: resta nel titolo ed è evidenziata', () => {
    const r = parse('Pagare fattura 31/02')
    expect(r.due).toBeNull()
    expect(r.title).toBe('Pagare fattura 31/02')
    expect(r.spans).toEqual([expect.objectContaining({ text: '31/02', kind: 'date', status: 'invalid' })])
    expect(r.warnings).toEqual(['Data non valida: 31/02'])
  })

  it('seconda data: usa la prima e segnala la seconda', () => {
    const r = parse('Riunione lunedì martedì')
    expect(r.due?.date).toBe('2026-09-28')
    expect(r.title).toBe('Riunione martedì')
    expect(r.spans.find((s) => s.text === 'martedì')?.status).toBe('ambiguous')
    expect(r.warnings).toEqual(['Più di una data, ignorata: martedì'])
  })

  it('secondo orario segnalato', () => {
    const r = parse('Call alle 10 alle 11 domani')
    expect(r.due).toEqual({ date: '2026-09-25', time: '10:00' })
    expect(r.title).toBe('Call alle 11')
  })
})

describe('estendibilità', () => {
  it('si può aggiungere una regola senza toccare il parser', () => {
    const stasera = defineRule({
      id: 'stasera',
      kind: 'date',
      match: (tokens, i, ctx) => (wordAt(tokens, i) === 'stasera' ? { length: 1, status: 'ok', value: ctx.today } : null)
    })
    const r = parseQuickInput('Palestra stasera', { now: NOW, rules: [...DEFAULT_RULES, stasera] })
    expect(r.due?.date).toBe('2026-09-24')
    expect(r.title).toBe('Palestra')
    expect(parseQuickInput('Palestra stasera', { now: NOW }).due).toBeNull()
  })
})
