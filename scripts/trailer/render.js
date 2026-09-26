/* Rende i fotogrammi (con motion blur), codifica H.264 + AAC con WebCodecs e scrive l'MP4. */
;(async function () {
  const fs = require('fs')
  const path = require('path')
  const { ipcRenderer } = require('electron')
  const params = new URLSearchParams(location.search)
  const mode = params.get('mode') ?? 'video'
  const outDir = params.get('out')
  const FPS = Number(params.get('fps') ?? 60)
  const SAMPLES = Number(params.get('samples') ?? 6)
  const { W, H, DURATION, drawScene } = window.TRAILER
  const log = (...a) => console.log(a.join(' '))

  try {
    for (const w of [500, 600, 700, 750, 800]) await document.fonts.load(`${w} 40px "Segoe UI Variable Display"`)
    await document.fonts.ready
    log('font ok:', document.fonts.check('700 40px "Segoe UI Variable Display"'))

    const canvas = document.getElementById('c')
    const ctx = canvas.getContext('2d', { alpha: false })
    const sub = document.createElement('canvas')
    sub.width = W
    sub.height = H
    const sctx = sub.getContext('2d', { alpha: false })

    // Grana da pellicola: tessera di rumore, spostata a ogni fotogramma.
    const grain = document.createElement('canvas')
    grain.width = grain.height = 256
    const gctx = grain.getContext('2d')
    const img = gctx.createImageData(256, 256)
    let seed = 99
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      const v = seed >>> 24
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    gctx.putImageData(img, 0, 0)
    const grainPattern = ctx.createPattern(grain, 'repeat')

    function post(t, frame) {
      if (window.TRAILER.POST === false) return
      const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,0.55)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.globalAlpha = 0.035
      ctx.globalCompositeOperation = 'overlay'
      ctx.translate((frame * 73) % 256, (frame * 151) % 256)
      ctx.fillStyle = grainPattern
      ctx.fillRect(-256, -256, W + 512, H + 512)
      ctx.restore()
    }

    function renderFrame(frame) {
      const t = frame / FPS
      const shutter = 0.5 / FPS
      if (SAMPLES <= 1) drawScene(ctx, t)
      else {
        for (let s = 0; s < SAMPLES; s++) {
          const ts = t + (s / (SAMPLES - 1) - 0.5) * shutter
          sctx.setTransform(1, 0, 0, 1, 0, 0)
          sctx.globalAlpha = 1
          drawScene(sctx, Math.max(0, ts))
          ctx.globalAlpha = 1 / (s + 1)
          ctx.drawImage(sub, 0, 0)
        }
        ctx.globalAlpha = 1
      }
      post(t, frame)
    }

    if (mode === 'preview') {
      const times = (params.get('times') ?? '1').split(',').map(Number)
      for (const t of times) {
        renderFrame(Math.round(t * FPS))
        const data = canvas.toDataURL('image/png').split(',')[1]
        const file = path.join(outDir, `f-${t.toFixed(2).padStart(5, '0')}.png`)
        fs.writeFileSync(file, Buffer.from(data, 'base64'))
      }
      log('preview', times.length, 'frames')
      ipcRenderer.send('done', 0)
      return
    }

    // Audio.
    const started = performance.now()
    const { buffer, peak } = await window.buildAudio(DURATION)
    log('audio rendered, raw peak', peak.toFixed(3))

    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer
    const target = new ArrayBufferTarget()
    const muxer = new Muxer({
      target,
      video: { codec: 'avc', width: W, height: H, frameRate: FPS },
      audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset'
    })

    const aenc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => { throw e } })
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: Number(params.get('abitrate') ?? 192000) })
    const L = buffer.getChannelData(0)
    const R = buffer.getChannelData(1)
    const CH = 1024
    for (let i = 0; i < buffer.length; i += CH) {
      const n = Math.min(CH, buffer.length - i)
      const data = new Float32Array(n * 2)
      data.set(L.subarray(i, i + n), 0)
      data.set(R.subarray(i, i + n), n)
      const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / 48000) * 1e6), data })
      aenc.encode(ad)
      ad.close()
    }
    await aenc.flush()

    const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { throw e } })
    venc.configure({
      codec: 'avc1.640033',
      width: W,
      height: H,
      bitrate: Number(params.get('bitrate') ?? 16e6),
      bitrateMode: params.get('bmode') ?? 'variable',
      framerate: FPS,
      latencyMode: 'quality',
      avc: { format: 'avc' }
    })
    const total = Math.round(DURATION * FPS)
    for (let f = 0; f < total; f++) {
      renderFrame(f)
      const vf = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
      venc.encode(vf, { keyFrame: f % (FPS * 5) === 0 })
      vf.close()
      while (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 2))
      if (f % FPS === 0) log(`frame ${f}/${total}  ${((performance.now() - started) / 1000).toFixed(1)}s`)
    }
    await venc.flush()
    muxer.finalize()
    const file = path.join(outDir, params.get('name') ?? 'plainlist-trailer.mp4')
    fs.writeFileSync(file, Buffer.from(target.buffer))
    log('written', file, (target.buffer.byteLength / 1e6).toFixed(1), 'MB in', ((performance.now() - started) / 1000).toFixed(1), 's')
    ipcRenderer.send('done', 0)
  } catch (err) {
    log('FAILED', err && err.stack ? err.stack : String(err))
    ipcRenderer.send('done', 1)
  }
})()
