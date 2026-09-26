/* Plainlist trailer, versione in stile Apple: sfondo chiaro, titoli grandi, movimenti calmi. drawScene(ctx, t). */
;(function () {
  const W = 1920
  const H = 1080
  const DURATION = 30
  const FONT = '"Segoe UI Variable Display", "Segoe UI", sans-serif'

  const C = {
    paper: '#fbfbfd',
    ink: '#1d1d1f',
    gray: '#86868b',
    gray2: '#6e6e73',
    line: '#e4e6eb',
    // Colori dell'app, tema chiaro.
    surface: '#ffffff',
    surface2: '#f1f2f5',
    sidebar: '#f6f7f9',
    fg: '#1b1d22',
    muted: '#5c626d',
    subtle: '#8b919c',
    accent: '#2563eb',
    accentSoft: '#e9f0ff',
    accentLight: '#8fb4ff',
    danger: '#d92d20',
    success: '#15803d',
    successBright: '#22c55e',
    person: '#7c3aed',
    area: '#16a34a',
    sun: '#d97706'
  }

  const PATHS = Object.fromEntries(Object.entries(window.ICONS).map(([k, ds]) => [k, ds.map((d) => new Path2D(d))]))

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))
  const lerp = (a, b, t) => a + (b - a) * t
  const P = (t, a, b) => clamp((t - a) / (b - a))
  const E = {
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    inCubic: (x) => x * x * x,
    outBack: (x, s = 1.4) => (x >= 1 ? 1 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2))
  }
  const tw = (t, a, b, e = E.outQuint) => e(P(t, a, b))

  function rng(seed) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const rgba = (hex, a) => `rgba(${rgb(hex).join(',')},${a})`
  function mix(a, b, t) {
    const x = rgb(a)
    const y = rgb(b)
    return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',')})`
  }

  // ---------- drawing ----------
  const font = (size, weight = 600) => `${weight} ${size}px ${FONT}`
  /** Tracking stretto sui titoli grandi, come nei testi Apple. */
  const tracking = (size) => (size >= 60 ? -size * 0.018 : size >= 36 ? -size * 0.01 : 0)

  // Il canvas aggancia i glifi al pixel: con zoom e salite lente il testo "trema" di un pixel
  // a scatti. Ogni scritta viene quindi disegnata una volta sola, al doppio della risoluzione,
  // in un'immagine che poi si sposta e si scala in modo continuo.
  const SPRITE_SCALE = 2
  const sprites = new Map()

  function sprite(str, size, weight, color, ls) {
    const key = `${str}|${size}|${weight}|${color}|${ls}`
    let s = sprites.get(key)
    if (s) return s
    if (sprites.size > 3000) sprites.clear()
    const c = document.createElement('canvas')
    let g = c.getContext('2d')
    g.font = font(size, weight)
    g.letterSpacing = `${ls}px`
    const width = g.measureText(str).width
    const pad = Math.ceil(size * 0.35)
    const baseline = pad + Math.ceil(size * 1.05)
    const w = Math.ceil(width) + pad * 2
    const h = baseline + Math.ceil(size * 0.35) + pad
    c.width = w * SPRITE_SCALE
    c.height = h * SPRITE_SCALE
    g = c.getContext('2d')
    g.scale(SPRITE_SCALE, SPRITE_SCALE)
    g.font = font(size, weight)
    g.letterSpacing = `${ls}px`
    g.fillStyle = color
    g.fillText(str, pad, baseline)
    s = { c, w, h, pad, baseline, width }
    sprites.set(key, s)
    return s
  }

  function text(ctx, str, x, y, { size = 40, weight = 600, color = C.ink, align = 'left', alpha = 1, ls } = {}) {
    if (alpha <= 0.002 || !str) return
    const s = sprite(str, size, weight, color, ls ?? tracking(size))
    const left = align === 'center' ? x - s.width / 2 : align === 'right' ? x - s.width : x
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(s.c, left - s.pad, y - s.baseline, s.w, s.h)
    ctx.restore()
  }

  function measure(ctx, str, size, weight = 600, ls) {
    ctx.save()
    ctx.font = font(size, weight)
    ctx.letterSpacing = `${ls ?? tracking(size)}px`
    const w = ctx.measureText(str).width
    ctx.restore()
    return w
  }

  function icon(ctx, name, cx, cy, size, color, { lw = 2, alpha = 1, rot = 0 } = {}) {
    if (alpha <= 0.002) return
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.scale(size / 24, size / 24)
    ctx.translate(-12, -12)
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const p of PATHS[name]) ctx.stroke(p)
    ctx.restore()
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, h / 2, w / 2)))
  }

  /** Superficie bianca con ombra morbida e bordo sottile. */
  function panel(ctx, x, y, w, h, r, { fill = C.surface, shadow = 1, border = 'rgba(0,0,0,0.06)' } = {}) {
    ctx.save()
    if (shadow > 0) {
      ctx.shadowColor = `rgba(15,23,42,${0.1 * shadow})`
      ctx.shadowBlur = 60
      ctx.shadowOffsetY = 24
    }
    rr(ctx, x, y, w, h, r)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.restore()
    if (border) {
      rr(ctx, x, y, w, h, r)
      ctx.strokeStyle = border
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  /** Riga di testo che sale e appare; poi svanisce salendo appena. */
  function fadeUp(ctx, str, x, y, t, tIn, tOut, opts = {}) {
    const a = tw(t, tIn, tIn + (opts.dur ?? 1.0))
    const o = tw(t, tOut, tOut + 0.5, E.inOutSine)
    if (a <= 0 || o >= 1) return
    text(ctx, str, x, y + (1 - a) * (opts.rise ?? 30) - o * 12, { ...opts, alpha: (opts.alpha ?? 1) * a * (1 - o) })
  }

  /** Visibilità di una scena: entra e poi esce con una dissolvenza. */
  function scene(t, t0, t1, fadeIn = 0.6, fadeOut = 0.5) {
    const a = tw(t, t0, t0 + fadeIn, E.inOutSine)
    const o = tw(t, t1 - fadeOut, t1, E.inOutSine)
    return { alpha: a * (1 - o), inP: a, outP: o, on: t >= t0 && t <= t1 }
  }

  function withScene(ctx, s, cx, cy, scale, fn) {
    if (!s.on || s.alpha <= 0.002) return
    ctx.save()
    ctx.globalAlpha *= s.alpha
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)
    fn()
    ctx.restore()
  }

  function appIcon(ctx, cx, cy, size, draw = 1) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.save()
    ctx.shadowColor = 'rgba(37,99,235,0.35)'
    ctx.shadowBlur = size * 0.35
    ctx.shadowOffsetY = size * 0.1
    rr(ctx, -size / 2, -size / 2, size, size, size * 0.225)
    const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2)
    g.addColorStop(0, '#3b82f6')
    g.addColorStop(1, '#1d4ed8')
    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()
    const k = size / 512
    ctx.beginPath()
    ctx.moveTo((145 - 256) * k, (265 - 256) * k)
    ctx.lineTo((225 - 256) * k, (340 - 256) * k)
    ctx.lineTo((372 - 256) * k, (182 - 256) * k)
    if (draw < 1) ctx.setLineDash([340 * k * draw, 1000])
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 48 * k
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (draw > 0) ctx.stroke()
    ctx.restore()
  }

  function checkbox(ctx, cx, cy, r, done, drawn) {
    ctx.save()
    ctx.translate(cx, cy)
    const pop = 1 + 0.12 * Math.sin(Math.PI * clamp(done))
    ctx.scale(pop, pop)
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    if (done > 0) {
      ctx.fillStyle = rgba(C.successBright, done)
      ctx.fill()
    }
    ctx.strokeStyle = done > 0 ? C.successBright : '#c5c9d2'
    ctx.lineWidth = 1.8
    ctx.stroke()
    if (drawn > 0) {
      ctx.beginPath()
      ctx.moveTo(-r * 0.45, 0)
      ctx.lineTo(-r * 0.1, r * 0.35)
      ctx.lineTo(r * 0.5, -r * 0.35)
      ctx.setLineDash([r * 2 * drawn, 100])
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2.6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()
    }
    ctx.restore()
  }

  // ---------- 1. Apertura: "Meet Plainlist." ----------
  function opening(ctx, t) {
    const s = scene(t, 0, 2.9, 0.01, 0.6)
    withScene(ctx, s, 960, 540, lerp(1, 1.03, E.inOutSine(P(t, 0, 2.9))), () => {
      const a = tw(t, 0.25, 1.25)
      ctx.save()
      ctx.globalAlpha *= a
      appIcon(ctx, 960, 400 + (1 - a) * 30, lerp(100, 132, E.outCubic(a)))
      ctx.restore()
      fadeUp(ctx, 'Meet Plainlist.', 960, 640, t, 0.6, 99, { size: 112, weight: 700, align: 'center' })
    })
  }

  // ---------- 2. Inserimento rapido ----------
  const TYPED = 'Send quote to @Marco friday at 3pm #work !high'
  const TYPE = { size: 44, weight: 500 }
  const BAR = { x: 340, y: 474, w: 1240, h: 112, r: 30 }
  const TEXT_X = BAR.x + 96
  const BASE_Y = BAR.y + BAR.h / 2 + 15
  const TOKENS = [
    { raw: '@Marco', kind: 'person', color: C.person, icon: 'at-sign', label: 'Marco', order: 3 },
    { raw: 'friday at 3pm', kind: 'date', color: C.accent, icon: 'calendar-days', label: 'Fri 2 Oct · 15:00', order: 0 },
    { raw: '#work', kind: 'area', color: C.area, icon: 'hash', label: 'work', order: 2 },
    { raw: '!high', kind: 'prio', color: C.danger, icon: 'flag', label: 'High', order: 1 }
  ].map((tok, i) => ({ ...tok, start: TYPED.indexOf(tok.raw), end: TYPED.indexOf(tok.raw) + tok.raw.length, index: i }))

  const TYPE_START = 3.9
  const TYPE_END = 6.1
  const CHAR_TIMES = (() => {
    const r = rng(7)
    const raw = [0]
    for (let i = 1; i < TYPED.length; i++) raw.push(raw[i - 1] + 1 + (TYPED[i - 1] === ' ' ? 0.8 : 0) + (r() - 0.5) * 0.6)
    return raw.map((v) => TYPE_START + (v / raw.at(-1)) * (TYPE_END - TYPE_START))
  })()
  const ENTER = 6.55
  const CHIP = { size: 28, pad: 22, icon: 24, gap: 10, h: 58, y: 660, spacing: 16 }

  let chipLayout = null
  function chips(ctx) {
    if (chipLayout) return chipLayout
    const list = [...TOKENS].sort((a, b) => a.order - b.order)
    for (const c of list) {
      c.textW = measure(ctx, c.label, CHIP.size, 500)
      c.contentW = CHIP.icon + CHIP.gap + c.textW
      c.w = c.contentW + CHIP.pad * 2
      c.srcX = TEXT_X + measure(ctx, TYPED.slice(0, c.start), TYPE.size, TYPE.weight)
    }
    const total = list.reduce((a, c) => a + c.w, 0) + CHIP.spacing * (list.length - 1)
    let x = 960 - total / 2
    for (const c of list) {
      c.x = x
      x += c.w + CHIP.spacing
    }
    chipLayout = list
    return list
  }

  function quickEntry(ctx, t) {
    const s = scene(t, 2.8, 9.7, 0.7, 0.6)
    const scale = lerp(0.98, 1, E.outCubic(s.inP)) * lerp(1, 0.985, s.outP)
    withScene(ctx, s, 960, 540, scale, () => {
      fadeUp(ctx, "Type it like you'd say it.", 960, 262, t, 3.0, 99, { size: 72, weight: 700, align: 'center' })
      fadeUp(ctx, 'Plainlist does the rest.', 960, 350, t, ENTER + 0.35, 99, { size: 72, weight: 700, align: 'center', color: C.gray })

      const barIn = tw(t, 3.2, 4.1)
      ctx.save()
      ctx.globalAlpha *= barIn
      ctx.translate(0, (1 - barIn) * 24)
      panel(ctx, BAR.x, BAR.y, BAR.w, BAR.h, BAR.r)
      // "+" della barra.
      ctx.strokeStyle = C.accent
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      const px = BAR.x + 52
      const py = BAR.y + BAR.h / 2
      ctx.beginPath()
      ctx.moveTo(px - 12, py)
      ctx.lineTo(px + 12, py)
      ctx.moveTo(px, py - 12)
      ctx.lineTo(px, py + 12)
      ctx.stroke()

      const count = CHAR_TIMES.filter((ct) => ct <= t).length
      if (t < ENTER) {
        // Battitura: le parti riconosciute prendono colore appena complete.
        let x = TEXT_X
        let i = 0
        const segments = []
        for (const tok of [...TOKENS].sort((a, b) => a.start - b.start)) {
          if (tok.start > i) segments.push({ str: TYPED.slice(i, tok.start), start: i })
          segments.push({ str: tok.raw, start: tok.start, tok })
          i = tok.end
        }
        for (const seg of segments) {
          const visible = seg.str.slice(0, Math.max(0, count - seg.start))
          if (!visible) break
          const w = measure(ctx, visible, TYPE.size, TYPE.weight)
          let color = C.ink
          if (seg.tok && count >= seg.tok.end) {
            const h = tw(t, CHAR_TIMES[seg.tok.end - 1], CHAR_TIMES[seg.tok.end - 1] + 0.4)
            color = mix(C.ink, seg.tok.color, h)
            rr(ctx, x - 7, BASE_Y - 38, w + 14, 52, 12)
            ctx.fillStyle = rgba(seg.tok.color, 0.09 * h)
            ctx.fill()
          }
          text(ctx, visible, x, BASE_Y, { ...TYPE, color })
          x += w
        }
        if (t > 3.6 && (t < TYPE_END + 0.1 || Math.floor(t * 2) % 2 === 0)) {
          ctx.fillStyle = C.accent
          ctx.fillRect(TEXT_X + measure(ctx, TYPED.slice(0, count), TYPE.size, TYPE.weight) + 3, BASE_Y - 36, 2.5, 46)
        }
      } else {
        // Dopo l'Invio: il titolo si ricompone, le parti riconosciute diventano etichette.
        const reflow = tw(t, ENTER + 0.15, ENTER + 1.0, E.inOutCubic)
        const person = TOKENS[0]
        const atW = measure(ctx, '@', TYPE.size, TYPE.weight)
        const marcoFrom = TEXT_X + measure(ctx, TYPED.slice(0, person.start), TYPE.size, TYPE.weight) + atW
        const marcoTo = TEXT_X + measure(ctx, 'Send quote to ', TYPE.size, TYPE.weight)
        text(ctx, 'Send quote to', TEXT_X, BASE_Y, TYPE)
        text(ctx, '@', marcoFrom - atW, BASE_Y, { ...TYPE, color: person.color, alpha: 1 - tw(t, ENTER, ENTER + 0.3) })
        text(ctx, 'Marco', lerp(marcoFrom, marcoTo, reflow), BASE_Y, { ...TYPE, color: mix(person.color, C.ink, tw(t, ENTER, ENTER + 0.6)) })
        for (const c of chips(ctx)) {
          if (c.kind === 'person') continue
          const out = tw(t, ENTER, ENTER + 0.35, E.inOutSine)
          text(ctx, c.raw, c.srcX, BASE_Y - out * 10, { ...TYPE, color: c.color, alpha: 1 - out })
        }
      }
      ctx.restore()

      for (const c of chips(ctx)) {
        const s0 = ENTER + 0.25 + c.order * 0.12
        const a = tw(t, s0, s0 + 0.9)
        if (a <= 0) continue
        ctx.save()
        ctx.globalAlpha *= a
        ctx.translate(0, (1 - a) * 22)
        rr(ctx, c.x, CHIP.y - CHIP.h / 2, c.w, CHIP.h, CHIP.h / 2)
        ctx.fillStyle = rgba(c.color, 0.07)
        ctx.fill()
        ctx.strokeStyle = rgba(c.color, 0.22)
        ctx.lineWidth = 1.2
        ctx.stroke()
        icon(ctx, c.icon, c.x + CHIP.pad + CHIP.icon / 2, CHIP.y, CHIP.icon, c.color, { lw: 2.1 })
        text(ctx, c.label, c.x + CHIP.pad + CHIP.icon + CHIP.gap, CHIP.y + 10, { size: CHIP.size, weight: 500, color: C.ink })
        ctx.restore()
      }
    })
  }

  // ---------- 3. La finestra dell'app ----------
  const WIN = { x: 250, y: 318, w: 1420, h: 860, r: 22 }
  const SIDEBAR = 270
  const ROW_H = 66
  const GROUPS = [
    { label: 'OVERDUE', color: C.danger, rows: [{ title: 'Send weekly report', meta: [['', 'Thu 24 Sep', C.danger], ['', '~45m'], ['hash', 'work']], prio: true }] },
    {
      label: 'TODAY',
      color: C.accent,
      rows: [
        { title: 'Prepare board slides', meta: [['', 'today 15:00', C.accent], ['', '~2h'], ['hash', 'work']], prio: true, check: true },
        { title: 'Reply to Luca about the contract', meta: [['', 'today', C.accent], ['', '~20m'], ['at-sign', 'Luca']] }
      ]
    },
    {
      label: 'NEXT 7 DAYS',
      color: C.subtle,
      rows: [
        { title: 'Send quote to Marco', meta: [['calendar-days', 'Fri 2 Oct 15:00'], ['hash', 'work'], ['at-sign', 'Marco']], prio: true, hero: true },
        { title: 'KPI review', meta: [['', 'Mon 28 Sep 09:00'], ['repeat', ''], ['', '~1h'], ['hash', 'work']], prio: true },
        { title: 'Pay the bills', meta: [['', 'Wed 30 Sep'], ['hash', 'home']] }
      ]
    }
  ]
  const CHECK_T = 12.7

  function meta(ctx, items, x, y, alpha) {
    let mx = x
    for (const [ic, label, color] of items) {
      if (ic) {
        icon(ctx, ic, mx + 8, y - 6, 15, color ?? C.subtle, { alpha, lw: 2.2 })
        mx += 21
      }
      if (label) {
        text(ctx, label, mx, y, { size: 17, weight: 500, color: color ?? C.muted, alpha })
        mx += measure(ctx, label, 17, 500)
      }
      mx += 20
    }
  }

  function appWindow(ctx, t) {
    const s = scene(t, 9.6, 14.9, 0.8, 0.6)
    const push = lerp(1, 1.035, E.inOutSine(P(t, 9.6, 14.9)))
    withScene(ctx, s, 960, 620, push * lerp(0.98, 1, E.outCubic(s.inP)), () => {
      fadeUp(ctx, 'Everything in its place.', 960, 152, t, 9.8, 99, { size: 72, weight: 700, align: 'center' })
      fadeUp(ctx, 'Sorted by date, automatically.', 960, 240, t, 10.3, 99, { size: 72, weight: 700, align: 'center', color: C.gray })

      const wIn = tw(t, 10.0, 11.0)
      ctx.save()
      ctx.globalAlpha *= wIn
      ctx.translate(0, (1 - wIn) * 40)
      const { x, y, w, h } = WIN
      panel(ctx, x, y, w, h, WIN.r, { shadow: 1.6 })
      ctx.save()
      rr(ctx, x, y, w, h, WIN.r)
      ctx.clip()
      // Barra del titolo.
      ctx.fillStyle = C.surface2
      ctx.fillRect(x, y, w, 44)
      ctx.fillStyle = C.line
      ctx.fillRect(x, y + 44, w, 1)
      appIcon(ctx, x + 26, y + 22, 18)
      text(ctx, 'Plainlist', x + 44, y + 28, { size: 15, weight: 500, color: C.muted })
      ctx.strokeStyle = C.muted
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(x + w - 142, y + 22)
      ctx.lineTo(x + w - 130, y + 22)
      ctx.rect(x + w - 88, y + 16, 12, 12)
      ctx.moveTo(x + w - 40, y + 16)
      ctx.lineTo(x + w - 28, y + 28)
      ctx.moveTo(x + w - 28, y + 16)
      ctx.lineTo(x + w - 40, y + 28)
      ctx.stroke()
      // Campo rapido.
      rr(ctx, x + 20, y + 60, w - 40, 50, 12)
      ctx.fillStyle = C.surface
      ctx.fill()
      ctx.strokeStyle = C.line
      ctx.stroke()
      ctx.strokeStyle = C.accent
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x + 40, y + 85)
      ctx.lineTo(x + 54, y + 85)
      ctx.moveTo(x + 47, y + 78)
      ctx.lineTo(x + 47, y + 92)
      ctx.stroke()
      text(ctx, 'What do you need to do? e.g. Send quote to @Marco friday at 12 #work !high', x + 70, y + 91, { size: 17, weight: 400, color: C.subtle })
      ctx.fillStyle = C.line
      ctx.fillRect(x, y + 126, w, 1)
      // Barra laterale.
      const top = y + 127
      ctx.fillStyle = C.sidebar
      ctx.fillRect(x, top, SIDEBAR, h)
      ctx.fillStyle = C.line
      ctx.fillRect(x + SIDEBAR, top, 1, h)
      const nav = [
        ['sun', 'My Day', '4'],
        ['layers', 'All', '14', true],
        ['calendar-check', 'Today', '3'],
        ['sunrise', 'Tomorrow', '1'],
        ['calendar-days', 'Next 7 days', '8'],
        ['inbox', 'No due date', '3'],
        ['hourglass', 'Waiting', '2']
      ]
      nav.forEach(([ic, label, count, active], i) => {
        const ny = top + 22 + i * 44
        if (active) {
          rr(ctx, x + 12, ny, SIDEBAR - 24, 38, 9)
          ctx.fillStyle = C.accentSoft
          ctx.fill()
        }
        icon(ctx, ic, x + 36, ny + 19, 17, active ? C.accent : C.muted, { lw: 2 })
        text(ctx, label, x + 58, ny + 25, { size: 17, weight: active ? 600 : 400, color: active ? C.accent : C.fg })
        text(ctx, count, x + SIDEBAR - 28, ny + 25, { size: 14, weight: 400, color: C.subtle, align: 'right' })
      })
      text(ctx, 'AREAS', x + 26, top + 360, { size: 13, weight: 600, color: C.subtle, ls: 1.5 })
      ;[['work', '#2563eb'], ['home', '#16a34a'], ['personal', '#d97706']].forEach(([label, color], i) => {
        const ay = top + 386 + i * 40
        ctx.beginPath()
        ctx.arc(x + 36, ay + 12, 5.5, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        text(ctx, label, x + 58, ay + 18, { size: 17, weight: 400, color: C.fg })
      })
      // Lista.
      const mx = x + SIDEBAR + 44
      const mw = w - SIDEBAR - 88
      text(ctx, 'All tasks', mx, top + 62, { size: 30, weight: 700, color: C.fg, ls: -0.4 })
      let yy = top + 96
      let n = 0
      for (const g of GROUPS) {
        const ga = tw(t, 10.6 + n * 0.09, 11.4 + n * 0.09)
        text(ctx, g.label, mx + 4, yy + 20, { size: 14, weight: 700, color: g.color, ls: 1.8, alpha: ga })
        n++
        yy += 32
        for (const row of g.rows) {
          const ra = tw(t, 10.6 + n * 0.09, 11.4 + n * 0.09)
          n++
          ctx.save()
          ctx.globalAlpha *= ra
          ctx.translate(0, (1 - ra) * 16)
          const done = row.check ? tw(t, CHECK_T, CHECK_T + 0.35, E.outCubic) : 0
          const heroGlow = row.hero ? Math.sin(Math.PI * P(t, 11.6, 12.6)) : 0
          rr(ctx, mx, yy, mw, ROW_H, 12)
          ctx.fillStyle = row.hero ? mix('#ffffff', C.accentSoft, heroGlow) : '#ffffff'
          ctx.fill()
          ctx.strokeStyle = row.hero && heroGlow > 0 ? rgba(C.accent, 0.15 + 0.35 * heroGlow) : C.line
          ctx.lineWidth = 1
          ctx.stroke()
          if (row.prio) {
            rr(ctx, mx + 8, yy + 13, 3.5, ROW_H - 26, 2)
            ctx.fillStyle = rgba(C.danger, 1 - done * 0.7)
            ctx.fill()
          }
          checkbox(ctx, mx + 38, yy + ROW_H / 2, 11, done, tw(t, CHECK_T + 0.1, CHECK_T + 0.45, E.outCubic))
          const titleColor = row.check ? mix(C.fg, C.subtle, tw(t, CHECK_T + 0.2, CHECK_T + 0.7)) : C.fg
          text(ctx, row.title, mx + 64, yy + 29, { size: 20, weight: 500, color: titleColor })
          if (row.check) {
            const strike = tw(t, CHECK_T + 0.2, CHECK_T + 0.7, E.inOutCubic)
            if (strike > 0) {
              ctx.fillStyle = C.subtle
              ctx.fillRect(mx + 62, yy + 22, (measure(ctx, row.title, 20, 500) + 4) * strike, 1.8)
            }
          }
          meta(ctx, row.meta, mx + 64, yy + 52, 1 - done * 0.4)
          ctx.restore()
          yy += ROW_H + 8
        }
        yy += 14
      }
      ctx.restore()
      ctx.restore()
    })
  }

  // ---------- 4. Griglia delle funzioni ----------
  const TILES = [
    { title: 'My Day', sub: 'Plan today in one place.', icon: 'sun', color: C.sun },
    { title: 'Repeats', sub: 'Every Monday, handled.', icon: 'repeat', color: C.accent },
    { title: 'People', sub: 'Ready for your next 1:1.', icon: 'user', color: C.person },
    { title: 'Update', sub: 'Your status, in one copy.', icon: 'zap', color: C.area }
  ]
  const GRID = { x: 250, y: 268, w: 700, h: 360, gap: 20 }
  const TILE_T = 15.7

  function features(ctx, t) {
    const s = scene(t, 14.8, 20.7, 0.6, 0.6)
    withScene(ctx, s, 960, 600, lerp(1, 1.02, E.inOutSine(P(t, 14.8, 20.7))), () => {
      fadeUp(ctx, 'Made for how you work.', 960, 172, t, 15.0, 99, { size: 72, weight: 700, align: 'center' })
      TILES.forEach((tile, i) => {
        const tx = GRID.x + (i % 2) * (GRID.w + GRID.gap)
        const ty = GRID.y + Math.floor(i / 2) * (GRID.h + GRID.gap)
        const t0 = TILE_T + i * 0.18
        const a = tw(t, t0, t0 + 1.0)
        if (a <= 0) return
        ctx.save()
        ctx.globalAlpha *= a
        ctx.translate(tx, ty + (1 - a) * 30)
        panel(ctx, 0, 0, GRID.w, GRID.h, 28, { shadow: 0.9 })
        ctx.beginPath()
        ctx.arc(76, 76, 30, 0, Math.PI * 2)
        ctx.fillStyle = rgba(tile.color, 0.1)
        ctx.fill()
        icon(ctx, tile.icon, 76, 76, 30, tile.color, { lw: 2, rot: tile.icon === 'sun' ? t * 0.4 : 0 })
        text(ctx, tile.title, 46, 190, { size: 44, weight: 700, color: C.ink })
        text(ctx, tile.sub, 46, 234, { size: 23, weight: 400, color: C.gray2 })
        ctx.save()
        ctx.translate(360, 0)
        tileUi[i](ctx, t - t0 - 0.35, tile)
        ctx.restore()
        ctx.restore()
      })
    })
  }

  const tileUi = [
    function myDay(ctx, lt, tile) {
      text(ctx, '~3h20 of 8h', 0, 78, { size: 22, weight: 600, color: C.fg, alpha: tw(lt, 0, 0.6) })
      rr(ctx, 0, 96, 290, 10, 5)
      ctx.fillStyle = C.surface2
      ctx.fill()
      const f = 290 * 0.42 * tw(lt, 0.1, 1.2)
      if (f > 1) {
        rr(ctx, 0, 96, f, 10, 5)
        ctx.fillStyle = C.accent
        ctx.fill()
      }
      ;['Send weekly report', 'Prepare board slides', 'Call the plumber'].forEach((title, k) => {
        const a = tw(lt, 0.15 + k * 0.12, 0.9 + k * 0.12)
        const y = 134 + k * 56
        ctx.save()
        ctx.globalAlpha *= a
        ctx.translate(0, (1 - a) * 10)
        rr(ctx, 0, y, 290, 44, 10)
        ctx.fillStyle = C.sidebar
        ctx.fill()
        icon(ctx, 'sun', 22, y + 22, 15, tile.color)
        text(ctx, title, 42, y + 28, { size: 16, weight: 500, color: C.fg })
        ctx.restore()
      })
    },
    function repeats(ctx, lt, tile) {
      ;['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, k) => text(ctx, d, 18 + k * 40, 76, { size: 15, weight: 600, color: k === 0 ? tile.color : C.subtle, align: 'center', alpha: tw(lt, 0, 0.5) }))
      for (let row = 0; row < 4; row++) {
        for (let k = 0; k < 7; k++) {
          const lit = k === 0 ? tw(lt, 0.25 + row * 0.18, 0.75 + row * 0.18) : 0
          ctx.save()
          ctx.globalAlpha *= tw(lt, 0, 0.6)
          rr(ctx, k * 40, 94 + row * 54, 36, 44, 9)
          ctx.fillStyle = k === 0 ? mix(C.sidebar, tile.color, lit) : C.sidebar
          ctx.fill()
          if (lit > 0) text(ctx, '9', 18, 94 + row * 54 + 28, { size: 16, weight: 700, color: '#ffffff', align: 'center', alpha: lit })
          ctx.restore()
        }
      }
    },
    function people(ctx, lt, tile) {
      const a = tw(lt, 0, 0.6)
      ctx.beginPath()
      ctx.arc(34, 80, 32, 0, Math.PI * 2)
      ctx.fillStyle = rgba(tile.color, 0.12 * a)
      ctx.fill()
      text(ctx, 'M', 34, 91, { size: 28, weight: 700, color: tile.color, align: 'center', alpha: a })
      text(ctx, 'Marco', 80, 76, { size: 24, weight: 700, color: C.fg, alpha: a })
      text(ctx, '2 open · 1 waiting', 80, 102, { size: 16, weight: 400, color: C.muted, alpha: a })
      const press = 1 - 0.05 * Math.sin(Math.PI * P(lt, 0.9, 1.1))
      ctx.save()
      ctx.globalAlpha *= tw(lt, 0.2, 0.8)
      ctx.translate(95, 170)
      ctx.scale(press, press)
      rr(ctx, -95, -24, 190, 48, 12)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = C.line
      ctx.lineWidth = 1
      ctx.stroke()
      icon(ctx, 'copy', -62, 0, 17, C.fg)
      text(ctx, 'Copy for 1:1', -44, 6, { size: 17, weight: 500, color: C.fg })
      ctx.restore()
      const toast = tw(lt, 1.1, 1.8)
      ctx.save()
      ctx.globalAlpha *= toast
      ctx.translate(0, (1 - toast) * 12)
      rr(ctx, 0, 226, 250, 46, 12)
      ctx.fillStyle = '#ecfdf3'
      ctx.fill()
      icon(ctx, 'check', 24, 249, 17, C.success, { lw: 2.6 })
      text(ctx, 'Copied to clipboard', 44, 255, { size: 16, weight: 500, color: C.success })
      ctx.restore()
    },
    function update(ctx, lt) {
      ;[
        [1, 'overdue', C.danger],
        [2, 'today', C.accent],
        [5, 'next days', C.subtle]
      ].forEach(([n, label, color], k) => {
        const a = tw(lt, k * 0.12, 0.6 + k * 0.12)
        const shown = Math.round(n * tw(lt, 0.1 + k * 0.12, 0.9 + k * 0.12, E.outCubic))
        text(ctx, String(shown), k * 100, 124, { size: 64, weight: 700, color, alpha: a })
        text(ctx, label, k * 100 + 2, 152, { size: 15, weight: 500, color: C.muted, alpha: a })
      })
      const s = tw(lt, 0.7, 1.4)
      ctx.save()
      ctx.globalAlpha *= s
      ctx.translate(0, (1 - s) * 12)
      rr(ctx, 0, 190, 290, 76, 14)
      ctx.fillStyle = C.accentSoft
      ctx.fill()
      icon(ctx, 'sparkles', 26, 218, 16, C.accent)
      text(ctx, 'Start with', 44, 224, { size: 15, weight: 600, color: C.accent })
      text(ctx, 'Send weekly report', 18, 252, { size: 18, weight: 600, color: C.fg })
      ctx.restore()
    }
  ]

  // ---------- 5. Lingua ----------
  const SWAP = 22.4

  function language(ctx, t) {
    const s = scene(t, 20.6, 24.3, 0.6, 0.6)
    withScene(ctx, s, 960, 540, lerp(1, 1.025, E.inOutSine(P(t, 20.6, 24.3))), () => {
      const swap = P(t, SWAP, SWAP + 0.9)
      const outOld = E.inOutCubic(clamp(swap * 1.6))
      const inNew = E.outQuint(clamp(swap * 1.6 - 0.45))
      const label = (str, a, dy) => text(ctx, str, 960, 400 + dy, { size: 34, weight: 600, color: C.gray, align: 'center', alpha: a, ls: 1 })
      const labelIn = tw(t, 20.8, 21.8)
      label('English', labelIn * (1 - outOld), (1 - labelIn) * 20 - outOld * 16)
      label('Italiano', inNew, (1 - inNew) * 16)
      const wordIn = tw(t, 21.0, 22.0)
      text(ctx, 'tomorrow', 960, 610 + (1 - wordIn) * 30 - outOld * 40, { size: 200, weight: 700, align: 'center', alpha: wordIn * (1 - outOld) })
      text(ctx, 'domani', 960, 610 + (1 - inNew) * 40, { size: 200, weight: 700, align: 'center', alpha: inNew })
      fadeUp(ctx, 'Quick entry speaks both.', 960, 760, t, 21.6, 99, { size: 44, weight: 600, align: 'center', color: C.gray2 })
    })
  }

  // ---------- 6. Privacy, su nero ----------
  function privacy(ctx, t) {
    const s = scene(t, 24.3, 27.0, 0.5, 0.5)
    withScene(ctx, s, 960, 540, lerp(1, 1.03, E.inOutSine(P(t, 24.3, 27.0))), () => {
      fadeUp(ctx, 'No account.', 960, 430, t, 24.55, 99, { size: 104, weight: 700, align: 'center', color: '#6e6e73' })
      fadeUp(ctx, 'No cloud.', 960, 552, t, 24.85, 99, { size: 104, weight: 700, align: 'center', color: '#6e6e73' })
      fadeUp(ctx, 'Just your PC.', 960, 674, t, 25.2, 99, { size: 104, weight: 700, align: 'center', color: '#f5f5f7' })
    })
  }

  // ---------- 7. Chiusura ----------
  function endCard(ctx, t) {
    const s = scene(t, 27.0, 30, 0.01, 0.5)
    withScene(ctx, s, 960, 540, lerp(1, 1.02, E.inOutSine(P(t, 27.0, 30))), () => {
      const a = tw(t, 27.1, 28.1)
      ctx.save()
      ctx.globalAlpha *= a
      appIcon(ctx, 960, 400 + (1 - a) * 24, lerp(150, 176, E.outCubic(a)), tw(t, 27.35, 28.0, E.inOutCubic))
      ctx.restore()
      fadeUp(ctx, 'Plainlist', 960, 620, t, 27.45, 99, { size: 110, weight: 700, align: 'center', color: '#f5f5f7' })
      fadeUp(ctx, 'To-dos, plainly.', 960, 690, t, 27.8, 99, { size: 40, weight: 500, align: 'center', color: '#86868b' })
      fadeUp(ctx, 'Free for Windows', 960, 884, t, 28.2, 99, { size: 26, weight: 500, align: 'center', color: '#86868b' })
      fadeUp(ctx, 'github.com/v0rren/Plainlist', 960, 928, t, 28.35, 99, { size: 28, weight: 600, align: 'center', color: C.accentLight })
    })
  }

  // ---------- composizione ----------
  function background(ctx, t) {
    const dark = tw(t, 24.1, 24.55, E.inOutSine)
    ctx.fillStyle = mix(C.paper, '#000000', dark)
    ctx.fillRect(0, 0, W, H)
  }

  function drawScene(ctx, t) {
    ctx.save()
    background(ctx, t)
    opening(ctx, t)
    quickEntry(ctx, t)
    appWindow(ctx, t)
    features(ctx, t)
    language(ctx, t)
    privacy(ctx, t)
    endCard(ctx, t)
    ctx.restore()
  }

  const CUES = {
    chars: CHAR_TIMES,
    open: 0.25,
    typeStart: TYPE_START,
    enter: ENTER,
    chips: [...TOKENS].sort((a, b) => a.order - b.order).map((c) => ENTER + 0.25 + c.order * 0.12),
    window: 10.0,
    check: CHECK_T,
    tiles: TILES.map((_, i) => TILE_T + i * 0.18),
    press: TILE_T + 2 * 0.18 + 0.35 + 1.0,
    swap: SWAP,
    dark: 24.1,
    privacy: [24.55, 24.85, 25.2],
    logo: 27.1,
    wordmark: 27.45,
    link: 28.35,
    sections: [0, 2.8, 9.6, 14.8, 20.6, 24.3, 27.0, 30]
  }

  window.TRAILER = { W, H, DURATION, drawScene, CUES, POST: false }
})()
