// Genera resources/icon.ico e resources/icon.png senza dipendenze esterne.
// Uso: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'resources')

const TOP = [59, 130, 246]
const BOTTOM = [29, 78, 216]
const CHECK = [[0.29, 0.52], [0.44, 0.66], [0.72, 0.36]]
const STROKE = 0.085
const RADIUS = 0.22
const SAMPLES = 4

function insideRoundedRect(x, y, margin) {
  const r = RADIUS
  const cx = Math.min(Math.max(x, margin + r), 1 - margin - r)
  const cy = Math.min(Math.max(y, margin + r), 1 - margin - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= margin && x <= 1 - margin && y >= margin && y <= 1 - margin
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function onCheck(x, y) {
  for (let i = 0; i < CHECK.length - 1; i++) if (distToSegment(x, y, CHECK[i], CHECK[i + 1]) <= STROKE / 2) return true
  return false
}

function render(size) {
  const margin = size <= 24 ? 0.02 : 0.06
  const px = Buffer.alloc(size * size * 4)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let bg = 0
      let fg = 0
      for (let sj = 0; sj < SAMPLES; sj++) {
        for (let si = 0; si < SAMPLES; si++) {
          const x = (i + (si + 0.5) / SAMPLES) / size
          const y = (j + (sj + 0.5) / SAMPLES) / size
          if (insideRoundedRect(x, y, margin)) {
            bg++
            if (onCheck(x, y)) fg++
          }
        }
      }
      const n = SAMPLES * SAMPLES
      const t = j / size
      const base = TOP.map((c, k) => c + (BOTTOM[k] - c) * t)
      const mix = fg / Math.max(bg, 1)
      const o = (j * size + i) * 4
      for (let k = 0; k < 3; k++) px[o + k] = Math.round(base[k] * (1 - mix) + 255 * mix)
      px[o + 3] = Math.round((bg / n) * 255)
    }
  }
  return px
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size) {
  const rgba = render(size)
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let j = 0; j < size; j++) rgba.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function ico(sizes) {
  const images = sizes.map((s) => png(s))
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = 6 + 16 * sizes.length
  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(s >= 256 ? 0 : s, 0)
    e.writeUInt8(s >= 256 ? 0 : s, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(images[i].length, 8)
    e.writeUInt32LE(offset, 12)
    offset += images[i].length
    return e
  })
  return Buffer.concat([header, ...entries, ...images])
}

mkdirSync(out, { recursive: true })
writeFileSync(join(out, 'icon.ico'), ico([16, 20, 24, 32, 40, 48, 64, 128, 256]))
writeFileSync(join(out, 'icon.png'), png(512))
console.log('Icone generate in', out)
