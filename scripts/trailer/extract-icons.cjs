// Estrae le icone Lucide usate dall'app e le converte in stringhe SVG path per Path2D.
const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, '..', '..', 'node_modules', 'lucide-react', 'dist', 'esm', 'icons') + path.sep
const names = ['calendar-days', 'flag', 'hash', 'at-sign', 'sun', 'repeat', 'user', 'check', 'cloud-off', 'hourglass',
  'sparkles', 'zap', 'languages', 'copy', 'timer', 'lock', 'wifi-off', 'layers', 'calendar-check', 'sunrise', 'inbox']
const out = {}
for (const name of names) {
  const src = fs.readFileSync(dir + name + '.mjs', 'utf8')
  const node = Function('return ' + /const __iconData = (\{[\s\S]*?\r?\n\});/.exec(src)[1])().node
  out[name] = node.map(([tag, a]) => {
    const n = (k) => Number(a[k])
    switch (tag) {
      case 'path': return a.d
      case 'circle': return `M${n('cx') - n('r')} ${n('cy')}a${n('r')} ${n('r')} 0 1 0 ${2 * n('r')} 0a${n('r')} ${n('r')} 0 1 0 ${-2 * n('r')} 0`
      case 'line': return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`
      case 'polyline': return 'M' + a.points.trim().split(/\s+/).join('L')
      case 'rect': {
        const [x, y, w, h, r] = [n('x'), n('y'), n('width'), n('height'), Number(a.rx ?? 0)]
        return `M${x + r} ${y}H${x + w - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${x + r}a${r} ${r} 0 0 1 ${-r} ${-r}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}z`
      }
      default: throw new Error(name + ': ' + tag)
    }
  })
}
fs.writeFileSync(path.join(__dirname, 'icons.js'), 'window.ICONS = ' + JSON.stringify(out, null, 1) + '\n')
console.log(Object.keys(out).length, 'icons')
