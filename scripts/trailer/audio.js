/* Colonna sonora calma: pianoforte sintetico, tappeto morbido e pulsazione leggera. */
;(function () {
  const SR = 48000
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12)

  function rng(seed) {
    return () => {
      seed |= 0
      seed = (seed + 0x6d2b79f5) | 0
      let r = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296
    }
  }

  window.buildAudio = async function (duration) {
    const ac = new OfflineAudioContext(2, Math.ceil(SR * duration), SR)
    const r = rng(2024)
    const cue = window.TRAILER.CUES

    const master = ac.createGain()
    master.gain.setValueAtTime(0.9, 0)
    master.gain.setValueAtTime(0.9, duration - 1.6)
    master.gain.linearRampToValueAtTime(0.0001, duration - 0.05)
    const comp = ac.createDynamicsCompressor()
    comp.threshold.value = -20
    comp.ratio.value = 2.5
    comp.attack.value = 0.01
    comp.release.value = 0.3
    master.connect(comp)
    comp.connect(ac.destination)

    const verb = ac.createConvolver()
    const irLen = Math.floor(SR * 3.2)
    const ir = ac.createBuffer(2, irLen, SR)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      for (let i = 0; i < irLen; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / irLen, 3.5)
    }
    verb.buffer = ir
    const verbOut = ac.createGain()
    verbOut.gain.value = 0.42
    verb.connect(verbOut)
    verbOut.connect(master)

    const noise = ac.createBuffer(1, SR * 2, SR)
    const nd = noise.getChannelData(0)
    for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1

    function out(node, { pan = 0, send = 0 } = {}) {
      const p = ac.createStereoPanner()
      p.pan.value = pan
      node.connect(p)
      p.connect(master)
      if (send > 0) {
        const s = ac.createGain()
        s.gain.value = send
        p.connect(s)
        s.connect(verb)
      }
    }

    function env(t, attack, peak, decay) {
      const g = ac.createGain()
      g.gain.setValueAtTime(0.0001, 0)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(peak, t + attack)
      g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
      return g
    }

    /** Pianoforte additivo: armoniche che si spengono prima delle fondamentali, filtrate. */
    function piano(t, midi, { v = 0.12, dur = 2.6, pan = 0, send = 0.35 } = {}) {
      const f0 = hz(midi)
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.setValueAtTime(Math.min(9000, f0 * 9), t)
      lp.frequency.exponentialRampToValueAtTime(Math.max(600, f0 * 2), t + dur)
      const g = env(t, 0.004, v, dur)
      lp.connect(g)
      out(g, { pan, send })
      const partials = [1, 2, 3, 4, 5, 6]
      partials.forEach((k) => {
        const o = ac.createOscillator()
        o.frequency.value = f0 * k * (1 + 0.0004 * k * k)
        const pg = ac.createGain()
        pg.gain.setValueAtTime(0.0001, 0)
        pg.gain.setValueAtTime(0.0001, t)
        pg.gain.exponentialRampToValueAtTime(0.9 / Math.pow(k, 1.6), t + 0.003)
        pg.gain.exponentialRampToValueAtTime(0.0001, t + dur / (0.6 + k * 0.5))
        o.connect(pg)
        pg.connect(lp)
        o.start(t)
        o.stop(t + dur + 0.05)
      })
    }

    function pad(t0, t1, notes, { v = 0.022, cutoff = 1100, attack = 1.2, release = 1.2 } = {}) {
      const g = ac.createGain()
      g.gain.setValueAtTime(0.0001, 0)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(v, t0 + attack)
      g.gain.setValueAtTime(v, Math.max(t0 + attack, t1))
      g.gain.linearRampToValueAtTime(0.0001, t1 + release)
      const f = ac.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = cutoff
      f.Q.value = 0.3
      f.connect(g)
      out(g, { send: 0.6 })
      for (const n of notes) {
        for (const det of [-6, 6]) {
          const o = ac.createOscillator()
          o.type = 'triangle'
          o.frequency.value = hz(n)
          o.detune.value = det
          o.connect(f)
          o.start(t0)
          o.stop(t1 + release + 0.1)
        }
      }
    }

    function pulse(t, v = 0.28) {
      const o = ac.createOscillator()
      o.frequency.setValueAtTime(110, t)
      o.frequency.exponentialRampToValueAtTime(48, t + 0.12)
      const g = env(t, 0.006, v, 0.32)
      o.connect(g)
      out(g)
      o.start(t)
      o.stop(t + 0.4)
    }

    function tick(t, { v = 0.035, freq = 5200, dur = 0.02, pan = 0 } = {}) {
      const src = ac.createBufferSource()
      src.buffer = noise
      const f = ac.createBiquadFilter()
      f.type = 'bandpass'
      f.frequency.value = freq
      f.Q.value = 2.5
      const g = env(t, 0.001, v, dur)
      src.connect(f)
      f.connect(g)
      out(g, { pan })
      src.start(t, r())
      src.stop(t + dur + 0.03)
    }

    function bell(t, midi, { v = 0.05, dur = 2.4, pan = 0 } = {}) {
      const f = hz(midi)
      const car = ac.createOscillator()
      car.frequency.value = f
      const mod = ac.createOscillator()
      mod.frequency.value = f * 3.5
      const mg = ac.createGain()
      mg.gain.setValueAtTime(f * 1.4, t)
      mg.gain.exponentialRampToValueAtTime(f * 0.03, t + dur * 0.4)
      mod.connect(mg)
      mg.connect(car.frequency)
      const g = env(t, 0.003, v, dur)
      car.connect(g)
      out(g, { pan, send: 0.6 })
      car.start(t)
      mod.start(t)
      car.stop(t + dur + 0.1)
      mod.stop(t + dur + 0.1)
    }

    function swell(t0, t1, v = 0.06) {
      const src = ac.createBufferSource()
      src.buffer = noise
      src.loop = true
      const f = ac.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.setValueAtTime(300, t0)
      f.frequency.exponentialRampToValueAtTime(3500, t1)
      const g = ac.createGain()
      g.gain.setValueAtTime(0.0001, 0)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(v, t1 - 0.05)
      g.gain.linearRampToValueAtTime(0.0001, t1 + 0.15)
      src.connect(f)
      f.connect(g)
      out(g, { send: 0.3 })
      src.start(t0)
      src.stop(t1 + 0.2)
    }

    // D maggiore, luminoso: D - Bm - G - A, due battute ciascuno a 96 BPM.
    const BEAT = 60 / 96
    const CHORDS = [
      { bass: 38, tones: [62, 66, 69, 73, 76] }, // Dmaj9
      { bass: 35, tones: [62, 66, 69, 71, 74] }, // Bm7
      { bass: 31, tones: [62, 66, 67, 71, 74] }, // Gmaj7
      { bass: 33, tones: [61, 64, 69, 71, 76] } // A6/9
    ]
    const sec = cue.sections
    const grooveStart = sec[1]
    const grooveEnd = sec[5]

    // Apertura: una sola nota con l'icona, poi il tappeto.
    piano(cue.open, 74, { v: 0.1, dur: 3.2 })
    piano(cue.open + 0.02, 62, { v: 0.07, dur: 3.2 })
    pad(0.2, grooveStart, [50, 57, 62, 64], { v: 0.018, attack: 1.8 })

    // Corpo: accordo al piano a ogni battuta, arpeggio leggero, pulsazione morbida.
    for (let i = 0, t0 = grooveStart; t0 < grooveEnd - 0.1; i++, t0 += BEAT * 8) {
      const c = CHORDS[i % CHORDS.length]
      const t1 = Math.min(t0 + BEAT * 8, grooveEnd)
      pad(t0, t1, [c.bass + 12, ...c.tones.slice(0, 3)], { v: 0.018, attack: 0.6, release: 0.8 })
      for (let b = 0; b < 8 && t0 + b * BEAT < t1 - 0.05; b++) {
        const t = t0 + b * BEAT
        if (b % 4 === 0) {
          piano(t, c.bass + 12, { v: 0.09, dur: 3 })
          c.tones.slice(0, 3).forEach((n, k) => piano(t + k * 0.012, n, { v: 0.05, dur: 2.6, pan: (k - 1) * 0.2 }))
        }
        piano(t + BEAT / 2, c.tones[(b * 2 + 3) % c.tones.length] + 12, { v: 0.035, dur: 1.4, pan: b % 2 ? 0.3 : -0.3 })
        if (t >= cue.typeStart && t < sec[4]) pulse(t, b % 4 === 0 ? 0.3 : 0.2)
      }
    }

    // Suoni legati all'immagine.
    cue.chars.forEach((t, i) => tick(t, { v: 0.03, freq: 4200 + (i % 4) * 400, pan: ((i % 3) - 1) * 0.15 }))
    bell(cue.enter, 86, { v: 0.045 })
    cue.chips.forEach((t, i) => bell(t + 0.1, [74, 78, 81, 86][i], { v: 0.035, dur: 1.8, pan: (i - 1.5) * 0.25 }))
    swell(cue.window - 0.6, cue.window + 0.1, 0.04)
    bell(cue.check, 81, { v: 0.05 })
    bell(cue.check + 0.1, 88, { v: 0.03 })
    swell(sec[3] - 0.5, sec[3] + 0.2, 0.04)
    cue.tiles.forEach((t, i) => bell(t + 0.1, [74, 76, 78, 81][i], { v: 0.03, dur: 1.6, pan: (i % 2 ? 0.3 : -0.3) }))
    tick(cue.press, { v: 0.05, freq: 2600, dur: 0.03 })
    swell(cue.swap - 0.5, cue.swap + 0.15, 0.035)
    bell(cue.swap + 0.25, 81, { v: 0.04 })

    // Nero: resta solo il tappeto, tre note gravi, poi la risalita.
    pad(grooveEnd, cue.logo, [50, 57, 59, 64], { v: 0.02, attack: 0.3, release: 0.4 })
    cue.privacy.forEach((t, i) => piano(t, [50, 52, 54][i], { v: 0.1, dur: 2.2, send: 0.5 }))
    swell(cue.logo - 1.4, cue.logo, 0.05)

    // Logo: accordo pieno.
    ;[38, 50, 57, 62, 66, 69, 73, 76].forEach((n, k) => piano(cue.logo + k * 0.015, n, { v: k < 2 ? 0.1 : 0.06, dur: 4.5, pan: (k - 3.5) * 0.08, send: 0.5 }))
    pad(cue.logo, duration - 0.5, [50, 57, 62, 66, 69], { v: 0.022, attack: 0.6, release: 1.0 })
    bell(cue.wordmark, 86, { v: 0.035 })
    bell(cue.link, 90, { v: 0.025, dur: 3 })

    const buffer = await ac.startRendering()
    let peak = 0
    for (let ch = 0; ch < 2; ch++) for (const s of buffer.getChannelData(ch)) peak = Math.max(peak, Math.abs(s))
    const gain = peak > 0 ? 0.89 / peak : 1
    for (let ch = 0; ch < 2; ch++) {
      const d = buffer.getChannelData(ch)
      for (let i = 0; i < d.length; i++) d[i] *= gain
    }
    return { buffer, peak }
  }
})()
