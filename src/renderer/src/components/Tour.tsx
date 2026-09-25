import { getLanguage, t } from '@core/i18n'
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Sun, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib/ui'
import { useStore, type MainView } from '../store'

type Placement = 'right' | 'bottom' | 'inside' | 'center'

interface Step {
  /** Valore dell'attributo data-tour dell'elemento da evidenziare. */
  target?: string
  placement: Placement
  title: string
  body: ReactNode
  example?: string
  view?: MainView
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-surface-3 px-1 py-0.5 text-[12px] text-fg">{children}</code>
}

function Syntax({ items }: { items: Array<[ReactNode, string]> }) {
  return (
    <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
      {items.map(([code, text], i) => (
        <div key={i} className="contents">
          <span className="whitespace-nowrap">{code}</span>
          <span className="text-muted">{text}</span>
        </div>
      ))}
    </div>
  )
}

const STEPS_IT: Step[] = [
  {
    target: 'quick',
    placement: 'bottom',
    title: 'Scrivi come parli',
    body: (
      <>
        Scrivi il task in modo naturale e premi <Code>Invio</Code>. Sotto il campo vedi subito come viene capito: titolo,
        data, priorità, area, persone. Quello che non viene riconosciuto resta nel titolo ed è evidenziato.
      </>
    ),
    example: 'Mandare preventivo @Marco venerdì alle 12 !alta ~1h'
  },
  {
    target: 'quick',
    placement: 'bottom',
    title: 'La sintassi in breve',
    body: (
      <Syntax
        items={[
          [<><Code>domani</Code> <Code>venerdì</Code> <Code>15/10</Code></>, 'scadenza'],
          [<><Code>alle 15</Code> <Code>9:30</Code></>, 'orario'],
          [<><Code>!alta</Code> <Code>!!!</Code></>, 'priorità'],
          [<Code>#casa</Code>, 'area (senza # va in lavoro)'],
          [<><Code>@Marco</Code> <Code>+tag</Code></>, 'persone e tag'],
          [<Code>~30m</Code>, 'stima del tempo'],
          [<Code>ogni lunedì</Code>, 'ripetizione'],
          [<Code>da lunedì</Code>, 'nascosto fino a quel giorno'],
          [<Code>+attesa</Code>, 'delegato, in attesa di altri']
        ]}
      />
    ),
    example: 'Revisione KPI @Marco ogni lunedì alle 9 ~1h'
  },
  {
    target: 'nav-views',
    placement: 'right',
    view: 'list',
    title: 'Le viste',
    body: (
      <>
        I task sono raggruppati per scadenza. <strong>Oggi</strong> comprende anche gli scaduti. Trascina un task su{' '}
        <strong>Oggi</strong> o <strong>Domani</strong> per spostarlo. <strong>In attesa</strong> raccoglie le cose
        delegate, <strong>Programmati</strong> quelle nascoste fino a una data.
      </>
    )
  },
  {
    target: 'nav-myday',
    placement: 'right',
    view: 'myDay',
    title: 'Il mio giorno',
    body: (
      <>
        Ogni mattina scegli su cosa lavorare: premi <Sun size={13} className="inline text-warning" /> su un task, trascinalo
        qui o prendilo dai suggerimenti. La barra confronta le stime con le ore disponibili. La lista si svuota da sola ogni
        giorno e la notifica del mattino apre questa vista.
      </>
    )
  },
  {
    target: 'main',
    placement: 'inside',
    view: 'list',
    title: 'Ogni task',
    body: (
      <>
        Clicca un task per aprire il dettaglio: note, ripetizione, "visibile dal", stima, persone. Passando con il mouse
        compaiono le azioni rapide: il mio giorno, rimanda a domani o alla settimana prossima, priorità, elimina (con
        annulla). Da tastiera: <Code>↑</Code> <Code>↓</Code> per muoverti, <Code>Spazio</Code> per completare,{' '}
        <Code>Canc</Code> per eliminare.
      </>
    )
  },
  {
    target: 'nav-update',
    placement: 'right',
    view: 'update',
    title: 'Update',
    body: (
      <>
        Il punto della situazione: scaduti, oggi, prossimi 7 giorni, in attesa, fermi da più di 14 giorni e un suggerimento
        su cosa affrontare per primo. Con <strong>Copia</strong> lo incolli in Teams o in una mail. Scorciatoia:{' '}
        <Code>Ctrl+U</Code>.
      </>
    )
  },
  {
    target: 'nav-areas',
    placement: 'right',
    view: 'list',
    title: 'Aree e persone',
    body: (
      <>
        Clicca un'area per filtrare la lista. Quando scrivi <Code>@Nome</Code> la persona compare qui sotto: cliccandola vedi
        tutto quello che la riguarda, le cose che aspetti da lei e un riepilogo da copiare per il 1:1.
      </>
    )
  },
  {
    target: 'nav-settings',
    placement: 'right',
    view: 'list',
    title: 'Impostazioni e backup',
    body: (
      <>
        Lingua, avvio con Windows, tema, scorciatoia globale, notifiche e area predefinita. Ogni giorno viene fatto un backup
        automatico in <Code>Documenti\Plainlist Backup</Code>: puoi scegliere un'altra cartella, per esempio dentro OneDrive.
      </>
    )
  },
  {
    placement: 'center',
    view: 'list',
    title: 'Sempre a portata di mano',
    body: (
      <>
        Chiudendo la finestra con la X, Plainlist resta nell'area di notifica vicino all'orologio. Da qualunque programma,{' '}
        <Code>Ctrl+Alt+Spazio</Code> apre l'aggiunta rapida (la combinazione si cambia in Impostazioni). Tutto funziona
        offline e i dati restano su questo PC.
      </>
    )
  }
]

const STEPS_EN: Step[] = [
  {
    target: 'quick',
    placement: 'bottom',
    title: 'Type the way you talk',
    body: (
      <>
        Type the task in plain words and press <Code>Enter</Code>. Right below the box you see how it was understood:
        title, date, priority, area, people. Anything that isn't recognised stays in the title and is highlighted.
      </>
    ),
    example: 'Send quote to @Marco friday at 12 !high ~1h'
  },
  {
    target: 'quick',
    placement: 'bottom',
    title: 'The syntax in short',
    body: (
      <Syntax
        items={[
          [<><Code>tomorrow</Code> <Code>friday</Code> <Code>15/10</Code></>, 'due date'],
          [<><Code>at 3pm</Code> <Code>9:30</Code></>, 'time'],
          [<><Code>!high</Code> <Code>!!!</Code></>, 'priority'],
          [<Code>#home</Code>, 'area (without # it goes to the default area)'],
          [<><Code>@Marco</Code> <Code>+tag</Code></>, 'people and tags'],
          [<Code>~30m</Code>, 'time estimate'],
          [<Code>every monday</Code>, 'repeat'],
          [<Code>starting monday</Code>, 'hidden until that day'],
          [<Code>+waiting</Code>, 'delegated, waiting on others']
        ]}
      />
    ),
    example: 'KPI review @Marco every monday at 9 ~1h'
  },
  {
    target: 'nav-views',
    placement: 'right',
    view: 'list',
    title: 'Views',
    body: (
      <>
        Tasks are grouped by due date. <strong>Today</strong> also includes overdue tasks. Drag a task onto{' '}
        <strong>Today</strong> or <strong>Tomorrow</strong> to move it. <strong>Waiting</strong> collects what you
        delegated, <strong>Scheduled</strong> what's hidden until a date.
      </>
    )
  },
  {
    target: 'nav-myday',
    placement: 'right',
    view: 'myDay',
    title: 'My Day',
    body: (
      <>
        Every morning, pick what to work on: press <Sun size={13} className="inline text-warning" /> on a task, drag it
        here or take it from the suggestions. The bar compares your estimates with the hours you have. The list empties
        itself every day, and the morning notification opens this view.
      </>
    )
  },
  {
    target: 'main',
    placement: 'inside',
    view: 'list',
    title: 'Every task',
    body: (
      <>
        Click a task to open its details: notes, repeat, "visible from", estimate, people. Hovering shows quick actions:
        My Day, move to tomorrow or next week, priority, delete (with undo). With the keyboard: <Code>↑</Code>{' '}
        <Code>↓</Code> to move, <Code>Space</Code> to complete, <Code>Del</Code> to delete.
      </>
    )
  },
  {
    target: 'nav-update',
    placement: 'right',
    view: 'update',
    title: 'Update',
    body: (
      <>
        Where things stand: overdue, today, the next 7 days, waiting, stalled for more than 14 days, and a suggestion on
        what to tackle first. <strong>Copy</strong> it and paste it into Teams or an email. Shortcut:{' '}
        <Code>Ctrl+U</Code>.
      </>
    )
  },
  {
    target: 'nav-areas',
    placement: 'right',
    view: 'list',
    title: 'Areas and people',
    body: (
      <>
        Click an area to filter the list. When you type <Code>@Name</Code>, the person shows up below: click them to see
        everything about them, what you're waiting on from them, and a summary to copy for your 1:1.
      </>
    )
  },
  {
    target: 'nav-settings',
    placement: 'right',
    view: 'list',
    title: 'Settings and backup',
    body: (
      <>
        Language, start with Windows, theme, global shortcut, notifications and default area. Every day an automatic
        backup goes to <Code>Documents\Plainlist Backup</Code>: you can pick another folder, for example inside OneDrive.
      </>
    )
  },
  {
    placement: 'center',
    view: 'list',
    title: 'Always within reach',
    body: (
      <>
        When you close the window with the X, Plainlist stays in the notification area next to the clock. From any
        program, <Code>Ctrl+Alt+Space</Code> opens quick add (you can change the keys in Settings). Everything works
        offline and your data stays on this PC.
      </>
    )
  }
]

function steps(): Step[] {
  return getLanguage() === 'en' ? STEPS_EN : STEPS_IT
}

const CARD_WIDTH = 380
const GAP = 14
const MARGIN = 16

function useTargetRect(target: string | undefined, key: number): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    let observer: ResizeObserver | null = null
    const find = (): Element | null => (target ? document.querySelector(`[data-tour="${target}"]`) : null)
    const measure = (): void => {
      const el = find()
      setRect(el ? el.getBoundingClientRect() : null)
    }
    const timer = setTimeout(() => {
      measure()
      const el = find()
      if (el) {
        observer = new ResizeObserver(measure)
        observer.observe(el)
      }
    }, 60)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(timer)
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [target, key])
  return rect
}

function cardPosition(
  placement: Placement,
  rect: DOMRect | null,
  height: number
): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const clampX = (x: number): number => Math.min(Math.max(x, MARGIN), vw - CARD_WIDTH - MARGIN)
  const clampY = (y: number): number => Math.min(Math.max(y, MARGIN), vh - height - MARGIN)
  if (!rect || placement === 'center') return { left: clampX((vw - CARD_WIDTH) / 2), top: clampY((vh - height) / 2) }
  if (placement === 'right') return { left: clampX(rect.right + GAP), top: clampY(rect.top) }
  if (placement === 'bottom') return { left: clampX(rect.left + 24), top: clampY(rect.bottom + GAP) }
  return { left: clampX(rect.left + (rect.width - CARD_WIDTH) / 2), top: clampY(rect.top + (rect.height - height) / 2) }
}

function Welcome() {
  const setTour = useStore((s) => s.setTour)
  const endTour = useStore((s) => s.endTour)
  const m = t().tour
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" data-modal>
      <div role="dialog" aria-label={m.welcome} className="w-[460px] rounded-2xl border border-line bg-surface p-6 shadow-pop">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Sparkles size={22} />
        </div>
        <h2 className="text-lg font-semibold">{m.welcomeTitle}</h2>
        <p className="mt-2 text-sm text-muted">{m.welcomeBody}</p>
        <div className="mt-6 flex items-center gap-2">
          <span className="text-xs text-subtle">{m.welcomeLater}</span>
          <button className="btn ml-auto" onClick={endTour}>
            {m.skip}
          </button>
          <button className="btn-primary" autoFocus onClick={() => setTour(0)}>
            {m.start} <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function TourStep({ index }: { index: number }) {
  const setTour = useStore((s) => s.setTour)
  const endTour = useStore((s) => s.endTour)
  const setMainView = useStore((s) => s.setMainView)
  const closeDetail = useStore((s) => s.closeDetail)
  const m = t().tour
  const STEPS = steps()
  const step = STEPS[index]
  const last = index === STEPS.length - 1
  const rect = useTargetRect(step.target, index)
  const cardRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(220)

  useEffect(() => {
    closeDetail()
    if (step.view) setMainView(step.view)
  }, [step, setMainView, closeDetail])

  useLayoutEffect(() => {
    if (cardRef.current) setHeight(cardRef.current.offsetHeight)
  }, [index, rect])

  const go = useCallback(
    (next: number) => {
      if (next < 0) return
      if (next >= steps().length) endTour()
      else setTour(next)
    },
    [endTour, setTour]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') endTour()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [index, go, endTour])

  const pos = cardPosition(step.placement, rect, height)
  const spotlight = rect && step.placement !== 'center'

  return (
    <div className="fixed inset-0 z-[60]" data-modal>
      {spotlight ? (
        <div
          className="pointer-events-none fixed rounded-lg ring-2 ring-accent transition-all duration-200"
          style={{
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.45)'
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/45" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-label={step.title}
        className="fixed rounded-xl border border-line bg-surface p-5 shadow-pop transition-[left,top] duration-200"
        style={{ width: CARD_WIDTH, left: pos.left, top: pos.top }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-accent">
            {m.stepOf(index + 1, STEPS.length)}
          </span>
          <button className="icon-btn ml-auto h-6 w-6" onClick={endTour} title={m.close}>
            <X size={14} />
          </button>
        </div>
        <h3 className="text-base font-semibold">{step.title}</h3>
        <div className="mt-1.5 text-sm leading-relaxed text-fg/90">{step.body}</div>

        {step.example && (
          <button
            className="mt-3 block w-full rounded-md border border-dashed border-accent/50 px-3 py-2 text-left hover:bg-accent-soft"
            onClick={() => window.dispatchEvent(new CustomEvent('plainlist:fill-quick', { detail: step.example }))}
            title={m.tryExampleHint}
          >
            <span className="block text-xs font-medium text-accent">{m.tryExample}</span>
            <span className="mt-0.5 block font-mono text-xs text-fg">{step.example}</span>
          </button>
        )}

        <div className="mt-4 flex items-center gap-2">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i === index ? 'bg-accent' : 'bg-surface-3')} />
            ))}
          </div>
          {!last && (
            <button className="btn-ghost ml-auto text-xs" onClick={endTour}>
              {m.skip}
            </button>
          )}
          <button className={cn('btn px-2', last && 'ml-auto')} disabled={index === 0} onClick={() => go(index - 1)} title={m.back}>
            <ChevronLeft size={15} />
          </button>
          <button className="btn-primary" autoFocus onClick={() => go(index + 1)} title={m.nextHint}>
            {last ? (
              <>
                <CheckCircle2 size={15} /> {m.finish}
              </>
            ) : (
              <>
                {m.next} <ChevronRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Tour() {
  const tour = useStore((s) => s.tour)
  if (tour === null) return null
  if (tour === 'welcome') return <Welcome />
  return <TourStep index={tour} />
}

