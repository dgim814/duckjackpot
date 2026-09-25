import { canvas, rng } from '../dsl.js'

/** Painted surface details for object decals. */

export function hex(c, k = 0) {
  const n = parseInt(c.replace('#', ''), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.max(0, Math.min(255, Math.round(k > 0 ? x + (255 - x) * k : x * (1 + k)))))
  return `rgb(${ch.join(',')})`
}

// coarse continents (lon, lat) for vintage globes and maps
const LAND = [
  [[-168, 65], [-140, 70], [-95, 72], [-60, 60], [-55, 48], [-80, 30], [-82, 10], [-98, 18], [-118, 32], [-125, 48], [-150, 60]],
  [[-80, 10], [-60, 8], [-35, -7], [-40, -22], [-58, -38], [-70, -55], [-75, -40], [-72, -15], [-81, -5]],
  [[-10, 36], [0, 43], [-8, 44], [-2, 49], [8, 55], [20, 60], [30, 70], [60, 70], [100, 76], [140, 70], [180, 67], [160, 60], [140, 50], [122, 40], [120, 25], [106, 10], [90, 22], [78, 8], [70, 22], [58, 25], [48, 30], [36, 36], [28, 41], [12, 38]],
  [[-17, 21], [-5, 36], [10, 37], [32, 31], [43, 12], [51, 11], [40, -15], [32, -28], [20, -35], [12, -18], [9, 4], [-8, 5]],
  [[113, -22], [130, -12], [143, -11], [153, -27], [146, -39], [135, -35], [115, -34]],
  [[-50, 60], [-30, 70], [-22, 82], [-60, 82], [-70, 76]],
  [[46, -25], [50, -15], [49, -12], [44, -20]],
  [[130, 33], [140, 36], [142, 44], [136, 36]],
  [[-6, 50], [2, 51], [0, 58], [-5, 58]],
]

export function mapCanvas({ celestial = false, sea = '#c9b27a', land = '#8a6a3a', ink = '#4a3018', W = 1024 } = {}) {
  return canvas(W, W / 2, (c, w, h) => {
    const X = (lon) => ((lon + 180) / 360) * w
    const Y = (lat) => ((90 - lat) / 180) * h
    if (celestial) {
      const g = c.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#0e1a3a')
      g.addColorStop(1, '#16244e')
      c.fillStyle = g
      c.fillRect(0, 0, w, h)
      const r = rng('stars')
      for (let i = 0; i < 700; i++) {
        c.fillStyle = `rgba(243,217,138,${0.4 + r() * 0.6})`
        const s = r() < 0.08 ? 4 : r() < 0.3 ? 2.5 : 1.5
        c.beginPath()
        c.arc(r() * w, r() * h, s, 0, 7)
        c.fill()
      }
      c.strokeStyle = 'rgba(243,217,138,0.55)'
      c.lineWidth = 1.5
      for (let k = 0; k < 28; k++) {
        c.beginPath()
        let x = r() * w, y = r() * h
        c.moveTo(x, y)
        for (let j = 0; j < 4; j++) {
          x += (r() - 0.5) * 90
          y += (r() - 0.5) * 60
          c.lineTo(x, y)
        }
        c.stroke()
      }
      c.strokeStyle = 'rgba(243,217,138,0.25)'
    } else {
      c.fillStyle = sea
      c.fillRect(0, 0, w, h)
      const r = rng('sea')
      for (let i = 0; i < 4000; i++) {
        c.fillStyle = `rgba(90,60,20,${r() * 0.06})`
        c.fillRect(r() * w, r() * h, 3, 3)
      }
      for (const poly of LAND) {
        c.beginPath()
        poly.forEach(([lo, la], i) => (i ? c.lineTo(X(lo), Y(la)) : c.moveTo(X(lo), Y(la))))
        c.closePath()
        c.fillStyle = land
        c.fill()
        c.strokeStyle = ink
        c.lineWidth = 2
        c.stroke()
        c.strokeStyle = 'rgba(74,48,24,0.35)'
        c.lineWidth = 6
        c.stroke()
      }
      c.strokeStyle = 'rgba(74,48,24,0.35)'
    }
    c.lineWidth = 1
    for (let lo = -180; lo <= 180; lo += 30) {
      c.beginPath()
      c.moveTo(X(lo), 0)
      c.lineTo(X(lo), h)
      c.stroke()
    }
    for (let la = -60; la <= 60; la += 30) {
      c.beginPath()
      c.moveTo(0, Y(la))
      c.lineTo(w, Y(la))
      c.stroke()
    }
    if (!celestial) {
      c.fillStyle = ink
      c.font = `italic ${h * 0.03}px Georgia`
      c.fillText('MARE PACIFICUM', X(-160), Y(5))
      c.fillText('OCEANUS ATLANTICUS', X(-45), Y(15))
      c.fillText('MARE INDICUM', X(70), Y(-20))
      // compass rose
      rose(c, X(-30), Y(-40), h * 0.07, ink)
    }
  })
}

export function rose(c, x, y, r, ink) {
  c.save()
  c.translate(x, y)
  c.strokeStyle = ink
  c.fillStyle = ink
  c.beginPath()
  c.arc(0, 0, r, 0, 7)
  c.stroke()
  for (let i = 0; i < 16; i++) {
    c.rotate(Math.PI / 8)
    c.beginPath()
    c.moveTo(0, -r * (i % 2 ? 0.6 : 1))
    c.lineTo(r * 0.08, 0)
    c.lineTo(-r * 0.08, 0)
    c.closePath()
    i % 2 ? c.stroke() : c.fill()
  }
  c.restore()
}

export function compassCard(W = 512, { bg = '#efe6cf', ink = '#2a1c10', red = '#9a1a1a' } = {}) {
  return canvas(W, W, (c) => {
    const R = W / 2
    c.fillStyle = bg
    c.fillRect(0, 0, W, W)
    c.translate(R, R)
    c.strokeStyle = ink
    for (let i = 0; i < 360; i += 2) {
      const a = (i * Math.PI) / 180
      c.lineWidth = i % 10 ? 1 : 2.5
      c.beginPath()
      c.moveTo(Math.sin(a) * R * 0.94, -Math.cos(a) * R * 0.94)
      c.lineTo(Math.sin(a) * R * (i % 10 ? 0.9 : 0.85), -Math.cos(a) * R * (i % 10 ? 0.9 : 0.85))
      c.stroke()
    }
    c.fillStyle = ink
    c.font = `bold ${R * 0.14}px Georgia`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    ;['N', 'E', 'S', 'W'].forEach((t, i) => {
      const a = (i * Math.PI) / 2
      c.fillText(t, Math.sin(a) * R * 0.72, -Math.cos(a) * R * 0.72)
    })
    for (let i = 0; i < 8; i++) {
      c.save()
      c.rotate((i * Math.PI) / 4)
      c.fillStyle = i === 0 ? red : i % 2 ? '#8a6a3a' : ink
      c.beginPath()
      c.moveTo(0, -R * (i % 2 ? 0.42 : 0.62))
      c.lineTo(R * 0.07, 0)
      c.lineTo(-R * 0.07, 0)
      c.closePath()
      c.fill()
      c.restore()
    }
  })
}

export function textLines(W, H, { bg = '#f2e8cf', ink = '#3a2c1c', cols = 2, initial = '#9a1a1a', seed = 'page' } = {}) {
  return canvas(W, H, (c) => {
    c.fillStyle = bg
    c.fillRect(0, 0, W, H)
    const r = rng(seed)
    for (let i = 0; i < 2000; i++) {
      c.fillStyle = `rgba(120,90,40,${r() * 0.05})`
      c.fillRect(r() * W, r() * H, 4, 4)
    }
    const cw = (W - 80) / cols
    for (let k = 0; k < cols; k++) {
      const x0 = 40 + k * cw + 10
      for (let y = 50; y < H - 40; y += 16) {
        let x = x0
        while (x < x0 + cw - 30) {
          const w = 10 + r() * 34
          c.fillStyle = ink
          c.globalAlpha = 0.75
          c.fillRect(x, y, Math.min(w, x0 + cw - 30 - x), 7)
          x += w + 6
        }
      }
      c.globalAlpha = 1
      c.fillStyle = initial
      c.fillRect(x0, 50, 34, 40)
    }
  })
}

/** Blue-and-white or gilded ceramic band decoration, wrapped cylindrically. */
export function ceramicCanvas(kind = 'ming') {
  return canvas(1024, 512, (c, W, H) => {
    const r = rng(kind)
    c.fillStyle = kind === 'ming' ? '#f4f6f8' : kind === 'raku' ? '#2a1c16' : '#f7f3ea'
    c.fillRect(0, 0, W, H)
    if (kind === 'raku') {
      for (let i = 0; i < 60; i++) {
        const x = r() * W
        const g = c.createLinearGradient(x, 0, x, H * (0.3 + r() * 0.5))
        g.addColorStop(0, 'rgba(140,110,80,0.7)')
        g.addColorStop(1, 'rgba(140,110,80,0)')
        c.fillStyle = g
        c.fillRect(x, 0, 10 + r() * 40, H)
      }
      c.strokeStyle = '#e0b04a'
      c.lineWidth = 6
      for (let k = 0; k < 3; k++) {
        c.beginPath()
        let x = r() * W, y = H * 0.1
        c.moveTo(x, y)
        while (y < H * 0.9) {
          x += (r() - 0.5) * 60
          y += 20 + r() * 30
          c.lineTo(x, y)
        }
        c.stroke()
      }
      return
    }
    const blue = kind === 'ming' ? '#1f3f9a' : '#b8892a'
    c.strokeStyle = blue
    c.fillStyle = blue
    // bands
    for (const y of [H * 0.08, H * 0.2, H * 0.78, H * 0.9]) {
      c.lineWidth = 6
      c.beginPath()
      c.moveTo(0, y)
      c.lineTo(W, y)
      c.stroke()
    }
    // lotus petals top & bottom
    for (let x = 0; x < W; x += 64) {
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(x, H * 0.2)
      c.quadraticCurveTo(x + 32, H * 0.08, x + 64, H * 0.2)
      c.stroke()
      c.beginPath()
      c.moveTo(x, H * 0.78)
      c.quadraticCurveTo(x + 32, H * 0.9, x + 64, H * 0.78)
      c.stroke()
    }
    // main scroll: flowers and tendrils
    c.lineWidth = 4
    for (let x = 0; x < W; x += 170) {
      c.beginPath()
      for (let t = 0; t < 1; t += 0.02) c.lineTo(x + t * 170, H * 0.5 + Math.sin(t * Math.PI * 2) * H * 0.14)
      c.stroke()
      for (const [fx, fy] of [[x + 40, H * 0.4], [x + 125, H * 0.6]]) {
        for (let p = 0; p < 8; p++) {
          const a = (p / 8) * Math.PI * 2
          c.beginPath()
          c.ellipse(fx + Math.cos(a) * 20, fy + Math.sin(a) * 20, 16, 8, a, 0, 7)
          kind === 'ming' ? c.fill() : c.stroke()
        }
        c.fillStyle = kind === 'ming' ? '#0f2a6a' : '#d4af58'
        c.beginPath()
        c.arc(fx, fy, 9, 0, 7)
        c.fill()
        c.fillStyle = blue
      }
    }
  })
}

export function labelCanvas(W, H, lines, { bg = '#f2e6c8', ink = '#111', font = 'Helvetica', border = true } = {}) {
  return canvas(W, H, (c) => {
    c.fillStyle = bg
    c.fillRect(0, 0, W, H)
    if (border) {
      c.strokeStyle = ink
      c.lineWidth = Math.max(2, W / 120)
      c.strokeRect(W * 0.04, H * 0.08, W * 0.92, H * 0.84)
    }
    c.fillStyle = ink
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    lines.forEach(([t, size, weight], i) => {
      c.font = `${weight || 700} ${size * H}px ${font}`
      c.fillText(t, W / 2, (H * (i + 1)) / (lines.length + 1))
    })
  })
}

/** Coin face: height map (white = raised) coloured as metal by the material. */
export function coinFace(kind) {
  return canvas(512, 512, (c, W) => {
    const R = W / 2
    c.fillStyle = 'rgba(0,0,0,0)'
    c.clearRect(0, 0, W, W)
    c.translate(R, R)
    c.fillStyle = '#9a9a9a'
    c.beginPath()
    c.arc(0, 0, R, 0, 7)
    c.fill()
    c.strokeStyle = '#ffffff'
    c.lineWidth = 12
    c.beginPath()
    c.arc(0, 0, R * 0.9, 0, 7)
    c.stroke()
    c.fillStyle = '#ffffff'
    if (kind === 'owl') {
      c.beginPath()
      c.ellipse(0, R * 0.12, R * 0.34, R * 0.46, 0, 0, 7)
      c.fill()
      c.fillStyle = '#6a6a6a'
      for (const x of [-0.14, 0.14]) {
        c.beginPath()
        c.arc(x * R, -R * 0.14, R * 0.12, 0, 7)
        c.fill()
      }
      c.fillStyle = '#fff'
      c.font = `bold ${R * 0.2}px Georgia`
      c.textAlign = 'center'
      c.fillText('ΑΘΕ', R * 0.52, -R * 0.1)
      c.strokeStyle = '#fff'
      c.lineWidth = 10
      c.beginPath()
      c.moveTo(-R * 0.62, -R * 0.55)
      c.quadraticCurveTo(-R * 0.75, 0, -R * 0.5, R * 0.3)
      c.stroke()
    } else if (kind === 'duck') {
      c.beginPath()
      c.ellipse(-R * 0.05, R * 0.15, R * 0.42, R * 0.26, 0, 0, 7)
      c.fill()
      c.beginPath()
      c.arc(R * 0.26, -R * 0.2, R * 0.2, 0, 7)
      c.fill()
      c.beginPath()
      c.moveTo(R * 0.42, -R * 0.2)
      c.lineTo(R * 0.64, -R * 0.14)
      c.lineTo(R * 0.42, -R * 0.08)
      c.fill()
      c.font = `bold ${R * 0.16}px Georgia`
      c.textAlign = 'center'
      c.fillText('DUCK · COIN', 0, R * 0.64)
      c.fillText('N° 1', 0, -R * 0.6)
    } else {
      // profile head (denarius / liberty)
      c.beginPath()
      c.moveTo(-R * 0.3, R * 0.5)
      c.bezierCurveTo(-R * 0.45, R * 0.05, -R * 0.35, -R * 0.45, R * 0.05, -R * 0.5)
      c.bezierCurveTo(R * 0.35, -R * 0.45, R * 0.4, -R * 0.1, R * 0.32, R * 0.02)
      c.lineTo(R * 0.4, R * 0.1)
      c.lineTo(R * 0.3, R * 0.16)
      c.bezierCurveTo(R * 0.28, R * 0.32, R * 0.12, R * 0.35, R * 0.1, R * 0.5)
      c.closePath()
      c.fill()
      c.fillStyle = '#bdbdbd'
      for (let i = 0; i < 9; i++) {
        c.beginPath()
        c.arc(-R * 0.2 + (i % 3) * R * 0.14, -R * 0.35 + Math.floor(i / 3) * R * 0.12, R * 0.06, 0, 7)
        c.fill()
      }
      c.fillStyle = '#fff'
      c.font = `bold ${R * 0.13}px Georgia`
      c.textAlign = 'center'
      if (kind === 'liberty') {
        for (let i = 0; i < 13; i++) {
          const a = Math.PI * 0.7 + (i / 12) * Math.PI * 1.6
          c.beginPath()
          c.arc(Math.cos(a) * R * 0.76, Math.sin(a) * R * 0.76, R * 0.04, 0, 7)
          c.fill()
        }
        c.fillText('E·PLURIBUS·UNUM', 0, -R * 0.72)
        c.fillText('1921', 0, R * 0.74)
      } else {
        c.fillText('IMP·CAESAR·AVG', 0, -R * 0.72)
      }
    }
  })
}
