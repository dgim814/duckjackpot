import { MAT, METAL_OF, U, SUB, INT, annulus, box, canvas, circle, cyl, extrude, ngon, poly, rrect, sphere, torus } from '../dsl.js'

/**
 * A watch standing on a display, dial to camera, strap looping back.
 * Case, bezel, crystal, dial (painted decal with applied indices), hands,
 * crown, pushers, lugs and a strap built link by link.
 */
const Z = 0 // dial plane reference

function caseShape(kind, s = 1) {
  switch (kind) {
    case 'cushion':
      return rrect(0.98 * s, 0.98 * s, 0.34 * s)
    case 'octagon':
      return ngon(1.02 * s, 8, Math.PI / 8)
    case 'porthole':
      return rrect(0.96 * s, 0.94 * s, 0.42 * s)
    case 'square':
      return rrect(0.92 * s, 0.92 * s, 0.14 * s)
    case 'rect':
      return rrect(0.66 * s, 1.0 * s, 0.1 * s)
    case 'tonneau':
      return poly(
        Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2
          const x = Math.cos(a), y = Math.sin(a)
          return [Math.sign(x) * Math.pow(Math.abs(x), 0.6) * 0.8 * s * (1 - 0.08 * y * y), Math.sign(y) * Math.pow(Math.abs(y), 0.75) * 1.05 * s]
        }),
      )
    case 'digital':
      return rrect(0.98 * s, 0.82 * s, 0.26 * s)
    case 'shield':
      return poly([
        [-1.02 * s, 0.72 * s],
        [-0.6 * s, 0.92 * s],
        [0.6 * s, 0.92 * s],
        [1.02 * s, 0.72 * s],
        [0.16 * s, -0.98 * s],
        [-0.16 * s, -0.98 * s],
      ])
    case 'big':
    case 'pocket':
      return circle(1.08 * s)
    default:
      return circle(0.94 * s)
  }
}

function dialCanvas(v, id) {
  return canvas(768, 768, (c, W) => {
    const R = W / 2
    c.translate(R, R)
    // dial base with a subtle sunburst / grain
    const g = c.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.05, 0, 0, R)
    g.addColorStop(0, shade(v.dial, 0.18))
    g.addColorStop(1, shade(v.dial, -0.18))
    c.fillStyle = g
    c.fillRect(-R, -R, W, W)
    c.globalAlpha = 0.07
    for (let i = 0; i < 360; i++) {
      c.rotate((Math.PI * 2) / 360)
      c.fillStyle = i % 2 ? '#ffffff' : '#000000'
      c.fillRect(0, -1, R, 2)
    }
    c.globalAlpha = 1
    if (v.extra === 'guilloche') {
      c.strokeStyle = 'rgba(0,0,0,0.18)'
      for (let i = 0; i < 70; i++) {
        c.beginPath()
        c.arc(Math.cos(i) * 6, Math.sin(i) * 6, R * 0.1 + i * R * 0.012, 0, Math.PI * 2)
        c.stroke()
      }
    }
    if (v.extra === 'waves') {
      c.strokeStyle = 'rgba(255,255,255,0.12)'
      c.lineWidth = 8
      for (let yy = -R; yy < R; yy += 28) {
        c.beginPath()
        for (let xx = -R; xx <= R; xx += 8) c.lineTo(xx, yy + Math.sin(xx / 40) * 9)
        c.stroke()
      }
    }
    if (v.extra === 'stripes' || v.extra === 'tapisserie') {
      c.strokeStyle = 'rgba(0,0,0,0.35)'
      c.lineWidth = v.extra === 'stripes' ? 6 : 3
      for (let yy = -R; yy < R; yy += v.extra === 'stripes' ? 22 : 18) {
        c.beginPath()
        c.moveTo(-R, yy)
        c.lineTo(R, yy)
        c.stroke()
        if (v.extra === 'tapisserie') {
          c.beginPath()
          c.moveTo(yy, -R)
          c.lineTo(yy, R)
          c.stroke()
        }
      }
    }
    if (v.extra === 'texture') {
      for (let i = 0; i < 2500; i++) {
        c.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`
        c.fillRect((Math.random() - 0.5) * W, (Math.random() - 0.5) * W, 3, 3)
      }
    }
    if (v.extra === 'skeleton') {
      c.fillStyle = 'rgba(0,0,0,0.55)'
      c.fillRect(-R, -R, W, W)
      c.strokeStyle = '#b8bec6'
      c.lineWidth = 10
      for (const [x, y, r] of [
        [-80, -90, 90],
        [95, 70, 110],
        [-70, 140, 55],
        [120, -120, 45],
      ]) {
        c.beginPath()
        c.arc(x, y, r, 0, Math.PI * 2)
        c.stroke()
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2
          c.fillStyle = '#9aa2aa'
          c.fillRect(x + Math.cos(a) * r - 4, y + Math.sin(a) * r - 4, 8, 8)
        }
      }
      c.lineWidth = 22
      c.beginPath()
      c.moveTo(-R, -R * 0.8)
      c.lineTo(R, R * 0.8)
      c.stroke()
    }
    const hands = v.hands || '#f3efe6'
    const rim = R * 0.86
    // minute track
    c.strokeStyle = hands
    c.globalAlpha = 0.55
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(Math.sin(a) * rim, -Math.cos(a) * rim)
      c.lineTo(Math.sin(a) * (rim - 16), -Math.cos(a) * (rim - 16))
      c.stroke()
    }
    c.globalAlpha = 1
    const n = v.numerals || 'baton'
    if (v.case === 'digital') {
      c.fillStyle = '#8f9c83'
      rr(c, -R * 0.62, -R * 0.38, R * 1.24, R * 0.62, 20)
      c.fill()
      c.fillStyle = '#1d2418'
      c.font = `bold ${R * 0.36}px monospace`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('10:10', 0, -R * 0.06)
      c.font = `bold ${R * 0.09}px sans-serif`
      c.fillStyle = '#e8e8e8'
      c.fillText('ALARM CHRONOGRAPH', 0, -R * 0.52)
      c.fillText('WATER RESIST', 0, R * 0.42)
      return
    }
    // applied indices (metal look)
    const metal = v.metal === 'gold' || v.metal === 'rose' ? ['#fff0c0', '#c89a3a'] : ['#ffffff', '#8a9098']
    if (n === 'baton' || n === 'dots') {
      for (let i = 0; i < 12; i++) {
        c.save()
        c.rotate((i / 12) * Math.PI * 2)
        const big = i % 3 === 0
        const lg = c.createLinearGradient(-12, 0, 12, 0)
        lg.addColorStop(0, metal[0])
        lg.addColorStop(1, metal[1])
        c.fillStyle = lg
        if (n === 'dots' && !big) {
          c.beginPath()
          c.arc(0, -rim * 0.82, 17, 0, Math.PI * 2)
          c.fill()
          c.fillStyle = '#f4f1e2'
          c.beginPath()
          c.arc(0, -rim * 0.82, 12, 0, Math.PI * 2)
          c.fill()
        } else if (n === 'dots' && i === 0) {
          c.beginPath()
          c.moveTo(0, -rim * 0.66)
          c.lineTo(-26, -rim * 0.95)
          c.lineTo(26, -rim * 0.95)
          c.fill()
        } else {
          const w = big ? 24 : 14
          c.fillRect(-w / 2, -rim * 0.95, w, big ? 78 : 60)
          c.fillStyle = 'rgba(255,255,255,0.5)'
          c.fillRect(-w / 2, -rim * 0.95, w / 3, big ? 78 : 60)
        }
        c.restore()
      }
    } else if (n !== 'none') {
      const labels = n === 'roman' ? ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'] : ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
      c.fillStyle = hands
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      const fs = n === 'big' ? R * 0.2 : n === 'roman' ? R * 0.11 : R * 0.13
      c.font = `${n === 'roman' ? '' : 'bold '}${fs}px ${n === 'roman' ? 'Georgia, serif' : 'Helvetica, Arial, sans-serif'}`
      for (let i = 0; i < 12; i++) {
        if ((n === 'arabic' || n === 'big') && i % 3) {
          c.save()
          c.rotate((i / 12) * Math.PI * 2)
          c.fillRect(-5, -rim * 0.95, 10, 40)
          c.restore()
          continue
        }
        const a = (i / 12) * Math.PI * 2
        const rr2 = rim * (n === 'roman' ? 0.8 : 0.74)
        c.save()
        c.translate(Math.sin(a) * rr2, -Math.cos(a) * rr2)
        if (n === 'roman') c.rotate(a)
        c.fillText(labels[i], 0, 0)
        c.restore()
      }
    }
    if (v.extra === 'triangle') {
      c.fillStyle = hands
      c.beginPath()
      c.moveTo(0, -rim * 0.62)
      c.lineTo(-30, -rim * 0.95)
      c.lineTo(30, -rim * 0.95)
      c.fill()
      c.fillStyle = '#111'
      c.beginPath()
      c.arc(-18, -rim * 0.9, 6, 0, 7)
      c.arc(18, -rim * 0.9, 6, 0, 7)
      c.fill()
    }
    if (v.extra === 'star') {
      c.fillStyle = '#c92a2a'
      star(c, 0, -R * 0.3, 44)
    }
    // sub-dials
    const subs = v.sub === 3 ? [[-0.42, 0], [0.42, 0], [0, 0.42]] : v.sub === 2 ? (v.case === 'big' ? [[0, -0.36], [0, 0.4]] : [[-0.4, 0], [0.4, 0]]) : []
    for (const [dx, dy] of subs) {
      const x = dx * R, y = dy * R
      c.fillStyle = v.subColor || shade(v.dial, -0.2)
      c.beginPath()
      c.arc(x, y, R * 0.2, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = 'rgba(255,255,255,0.18)'
      for (let k = 0; k < 6; k++) {
        c.beginPath()
        c.arc(x, y, R * 0.2 - k * 5, 0, Math.PI * 2)
        c.stroke()
      }
      c.strokeStyle = hands
      c.lineWidth = 3
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2
        c.beginPath()
        c.moveTo(x + Math.sin(a) * R * 0.2, y - Math.cos(a) * R * 0.2)
        c.lineTo(x + Math.sin(a) * R * 0.16, y - Math.cos(a) * R * 0.16)
        c.stroke()
      }
      c.lineWidth = 6
      c.beginPath()
      c.moveTo(x, y)
      c.lineTo(x + R * 0.1, y - R * 0.1)
      c.stroke()
    }
    if (v.extra === 'moon') {
      c.fillStyle = '#10214a'
      c.beginPath()
      c.arc(0, R * 0.48, R * 0.2, Math.PI, 0)
      c.fill()
      for (let k = 0; k < 14; k++) {
        c.fillStyle = '#f3e3a0'
        c.fillRect(-R * 0.16 + ((k * 37) % 60) * 5, R * 0.34 + ((k * 13) % 9) * 3, 4, 4)
      }
      c.fillStyle = '#f2d98a'
      c.beginPath()
      c.arc(R * 0.06, R * 0.4, R * 0.08, 0, Math.PI * 2)
      c.fill()
    }
    if (v.extra === 'tourbillon') {
      c.fillStyle = '#000'
      c.beginPath()
      c.arc(0, R * 0.42, R * 0.22, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = '#d7dbe0'
      c.lineWidth = 8
      c.beginPath()
      c.arc(0, R * 0.42, R * 0.17, 0, Math.PI * 2)
      c.moveTo(-R * 0.17, R * 0.42)
      c.lineTo(R * 0.17, R * 0.42)
      c.moveTo(0, R * 0.25)
      c.lineTo(0, R * 0.59)
      c.stroke()
    }
    if (v.extra === 'bigdate') {
      c.fillStyle = '#fff'
      c.fillRect(R * 0.08, -R * 0.52, R * 0.18, R * 0.24)
      c.fillRect(R * 0.28, -R * 0.52, R * 0.18, R * 0.24)
      c.fillStyle = '#111'
      c.font = `bold ${R * 0.2}px Helvetica`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('2', R * 0.17, -R * 0.4)
      c.fillText('5', R * 0.37, -R * 0.4)
    }
    if (v.date) {
      c.fillStyle = '#fbfaf5'
      c.fillRect(R * 0.5, -R * 0.08, R * 0.2, R * 0.16)
      c.fillStyle = '#111'
      c.font = `bold ${R * 0.12}px Helvetica`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('24', R * 0.6, 0)
    }
    if (v.day) {
      c.fillStyle = '#fbfaf5'
      c.fillRect(-R * 0.28, -R * 0.62, R * 0.56, R * 0.16)
      c.fillStyle = '#111'
      c.font = `bold ${R * 0.1}px Helvetica`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('SATURDAY', 0, -R * 0.54)
    }
    // small printed text lines (generic, no brand names)
    c.fillStyle = hands
    c.globalAlpha = 0.85
    c.textAlign = 'center'
    c.font = `600 ${R * 0.055}px Helvetica`
    if (!v.day && v.extra !== 'bigdate') c.fillText(v.case === 'pocket' ? 'CHRONOMÈTRE' : 'AUTOMATIC', 0, -R * 0.34)
    if (!subs.length && v.extra !== 'moon' && v.extra !== 'tourbillon') c.fillText('SWISS', 0, R * 0.62)
    c.globalAlpha = 1
    void id
  })
}

function insertCanvas(v) {
  const [c1, c2] = v.insert || ['#111']
  return canvas(768, 768, (c, W) => {
    const R = W / 2
    c.translate(R, R)
    c.fillStyle = c1
    c.beginPath()
    c.arc(0, 0, R, 0, Math.PI * 2)
    c.fill()
    if (v.bezel === 'gmt' && c2) {
      c.fillStyle = c2
      c.beginPath()
      c.moveTo(0, 0)
      c.arc(0, 0, R, Math.PI / 2 - Math.PI, Math.PI / 2)
      c.fill()
      c.rotate(0)
    }
    c.fillStyle = '#f2eee2'
    c.strokeStyle = '#f2eee2'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const n = v.bezel === 'tachy' ? 60 : v.bezel === 'hour' ? 24 : 60
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      c.save()
      c.rotate(a)
      if (v.bezel === 'diver' && i % 10 === 0 && i) {
        c.font = `bold ${R * 0.12}px Helvetica`
        c.fillText(String(i), 0, -R * 0.9)
      } else if (v.bezel === 'gmt' || v.bezel === 'h24') {
        if (i % 5 === 0) {
          c.font = `bold ${R * 0.1}px Helvetica`
          c.fillText(String((i / 5) * 2 || 24), 0, -R * 0.9)
        }
      } else if (v.bezel === 'tachy' && i % 5 === 0) {
        c.font = `bold ${R * 0.08}px Helvetica`
        c.fillText(String(Math.round(3600 / (i + 7))), 0, -R * 0.9)
      } else if (v.bezel === 'hour' && i % 2 === 0) {
        c.font = `bold ${R * 0.09}px Helvetica`
        c.fillText(String(i / 2 || 12), 0, -R * 0.9)
      } else {
        c.lineWidth = i % 5 ? 3 : 6
        c.beginPath()
        c.moveTo(0, -R * 0.97)
        c.lineTo(0, -R * (i % 5 ? 0.9 : 0.84))
        c.stroke()
      }
      c.restore()
    }
    if (v.bezel === 'diver') {
      c.fillStyle = '#f5e6b0'
      c.beginPath()
      c.moveTo(0, -R * 0.8)
      c.lineTo(-R * 0.07, -R * 0.97)
      c.lineTo(R * 0.07, -R * 0.97)
      c.fill()
    }
  })
}

function rr(c, x, y, w, h, r) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}
function star(c, x, y, r) {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr2 = i % 2 ? r * 0.42 : r
    c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2)
  }
  c.fill()
}
export function shade(hex, k) {
  const n = parseInt(hex.replace('#', ''), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.round(k > 0 ? x + (255 - x) * k : x * (1 + k)))
  return `rgb(${ch.join(',')})`
}

function strap(v, metal, top, bottom, width) {
  // one link, arc-repeated around the loop from the top lug, over the back, to the bottom lug
  const cy = (top + bottom) / 2
  const half = (top - bottom) / 2
  const back = 0.78
  const R = Math.hypot(half, back)
  const kind = v.strap
  const n = kind === 'president' ? 44 : kind === 'jubilee' ? 46 : kind === 'mesh' ? 90 : kind === 'oyster' || kind === 'integrated' ? 30 : 60
  // angle measured from +z towards +y around the loop centre
  const aTop = Math.atan2(top - cy, back)
  const aBottom = Math.atan2(bottom - cy, back)
  const sweep = 2 * Math.PI - (aTop - aBottom)
  const da = sweep / n
  const seg = da * R
  const group = (kids) => U(kids, { pos: [0, cy, -back], arcX: { a0: aTop, da, n } })
  if (kind === 'leather' || kind === 'rubber' || kind === 'resin' || kind === 'nato') {
    const natoCols = kind === 'nato' ? (v.strapColor || '#2b3a55,#8a1f2a').split(',') : null
    const mat = kind === 'leather' ? MAT.leather(v.strapColor || '#3a2416') : natoCols ? MAT.fabric(natoCols[0]) : MAT.plastic(v.strapColor || '#18181a', 0.5)
    const kids = [box([width * (kind === 'resin' ? 0.46 : 0.5), seg * 0.52, 0.05], { pos: [0, 0, R], r: 0.03, mat })]
    if (natoCols && natoCols[1]) kids.push(box([width * 0.14, seg * 0.53, 0.052], { pos: [0, 0, R], r: 0.01, mat: MAT.fabric(natoCols[1]) }))
    return [group(kids)]
  }
  const cols = kind === 'jubilee' ? 5 : kind === 'president' ? 3 : kind === 'mesh' ? 1 : 3
  const cw = width / cols
  const polishedMetal = { ...metal, rough: 0.06, proc: undefined }
  const brushed = { ...metal, rough: Math.max(0.24, metal.rough || 0.2) }
  const kids = []
  for (let k = 0; k < cols; k++) {
    const x = -width / 2 + cw * (k + 0.5)
    const centre = k === Math.floor(cols / 2)
    const mat = kind === 'mesh' ? { ...metal, proc: 'tweed', pscale: 140, bump: 0.6 } : centre ? polishedMetal : kind === 'jubilee' && k % 2 === 0 ? brushed : centre ? polishedMetal : brushed
    kids.push(box([cw * 0.485, seg * 0.49, kind === 'mesh' ? 0.028 : 0.06], { pos: [x, 0, R], r: kind === 'mesh' ? 0.01 : 0.03, mat }))
  }
  return [group(kids)]
}

export function buildWatch(v, id) {
  const metal = METAL_OF[v.metal] || MAT.steel
  const kind = v.case
  const pocket = kind === 'pocket'
  const scale = pocket ? 0.95 : 1
  const T = pocket ? 0.3 : 0.26 // half thickness
  const parts = []
  const shape = caseShape(kind)
  const dialShape = caseShape(kind, kind === 'rect' || kind === 'shield' || kind === 'tonneau' ? 0.84 : 0.8)
  const crystalShape = caseShape(kind, 0.86)
  // case middle + back
  parts.push(extrude(shape, T, { rr: 0.1, mat: metal, pos: [0, 0, -0.1] }))
  // polished bevel ring on the front
  parts.push(SUB(extrude(caseShape(kind, 0.97), 0.05, { rr: 0.04, mat: { ...metal, rough: 0.05, proc: undefined }, pos: [0, 0, T - 0.08] }), extrude(caseShape(kind, 0.84), 0.2, { pos: [0, 0, T] })))
  // bezel / insert
  const round = ['round', 'big', 'pocket'].includes(kind)
  const bez = v.bezel && v.bezel !== 'plain'
  if (bez && round && v.bezel !== 'screws' && v.bezel !== 'notched') {
    const insert = ['diver', 'gmt', 'tachy', 'hour', 'h24'].includes(v.bezel)
    if (v.bezel === 'fluted') {
      const R0 = kind === 'big' ? 1.0 : 0.875
      parts.push(extrude(annulus(R0 + 0.05, R0 - 0.07), 0.02, { rr: 0.01, pos: [0, 0, T - 0.02], mat: { ...metal, rough: 0.06, proc: undefined } }))
      parts.push(U([box([0.05, 0.016, 0.03], { pos: [R0, 0, 0], r: 0.014, mat: { ...metal, rough: 0.03, proc: undefined } })], { pos: [0, 0, T], polar: 60 }))
    } else if (insert) {
      const Ro = kind === 'big' ? 1.04 : 0.92, Ri = Ro - 0.2
      parts.push(extrude(annulus(Ro, Ri), 0.035, { rr: 0.015, pos: [0, 0, T - 0.01], mat: { type: 'dielectric', color: v.insert?.[0] || '#111', rough: 0.12 }, decal: { canvas: insertCanvas(v), proj: 'z', w: Ro * 2, h: Ro * 2 } }))
      parts.push(extrude(annulus(Ro + 0.06, Ro - 0.005), 0.05, { rr: 0.02, pos: [0, 0, T - 0.02], mat: { ...metal, proc: 'knurl', pscale: 1, bump: 0.3 } }))
    }
  }
  if (v.bezel === 'screws') {
    const n = kind === 'octagon' ? 8 : kind === 'square' ? 8 : 6
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (kind === 'octagon' ? Math.PI / 8 : kind === 'square' ? Math.PI / 4 : Math.PI / n)
      const r0 = kind === 'square' ? 1.02 : kind === 'tonneau' ? 0.85 : 0.86
      const x = Math.cos(a) * r0 * (kind === 'tonneau' ? 0.8 : 1), y = Math.sin(a) * r0 * (kind === 'tonneau' ? 1.2 : 1)
      parts.push(cyl(0.05, 0.03, { axis: 'z', pos: [x, y, T - 0.02], rr: 0.01, mat: MAT.polished }))
      parts.push(box([0.035, 0.008, 0.02], { pos: [x, y, T + 0.012], rot: [0, 0, i * 37], mat: MAT.blackMetal }))
    }
  }
  if (v.bezel === 'notched') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      parts.push(box([0.07, 0.035, 0.04], { pos: [Math.cos(a) * 0.9, Math.sin(a) * 0.9, T], rot: [0, 0, (a * 180) / Math.PI], r: 0.015, mat: { ...metal, rough: 0.05, proc: undefined } }))
    }
  }
  // dial
  parts.push(extrude(dialShape, 0.02, { pos: [0, 0, T - 0.08], mat: MAT.matte(v.dial), decal: { canvas: dialCanvas(v, id), proj: 'z', w: 2.16 * (kind === 'rect' ? 0.84 : kind === 'shield' || kind === 'tonneau' ? 0.84 : 0.8) * (kind === 'big' || kind === 'pocket' ? 1.08 : kind === 'digital' ? 1.05 : 1), h: 2.16 * 0.8 * (kind === 'big' || kind === 'pocket' ? 1.08 : kind === 'rect' ? 1.16 : kind === 'digital' ? 1.05 : 1), bump: 0.4 } }))
  // hands (not for digital)
  const handMat = v.hands && v.hands.startsWith('#1f3f9a') ? { type: 'metal', color: '#3a5ab8', rough: 0.1 } : v.hands && ['#222', '#111', '#2a2a2a', '#333', '#5a4212', '#6a4a12', '#7e4834'].includes(v.hands) ? { type: 'metal', color: v.hands === '#5a4212' || v.hands === '#6a4a12' ? '#d8b060' : '#3a3a3c', rough: 0.12 } : MAT.polished
  const zH = T - 0.05
  const dR = kind === 'big' || kind === 'pocket' ? 0.86 : kind === 'rect' ? 0.62 : 0.74
  if (kind !== 'digital') {
    const hand = (len, w, ang, z, mat) => box([w, len / 2, 0.008], { pos: [Math.sin(ang) * len * 0.42, Math.cos(ang) * len * 0.42, z], rot: [0, 0, (-ang * 180) / Math.PI], r: 0.004, mat })
    parts.push(hand(dR * 0.62, 0.035, (-2 * Math.PI) / 12 - 0.1, zH, handMat)) // hour ~10
    parts.push(hand(dR * 0.95, 0.024, (2 * Math.PI) / 12 * 2, zH + 0.012, handMat)) // minute ~10
    parts.push(hand(dR * 1.02, 0.008, Math.PI * 1.05, zH + 0.024, v.accent ? MAT.enamel(v.accent) : handMat))
    parts.push(cyl(0.04, 0.02, { axis: 'z', pos: [0, 0, zH + 0.03], mat: handMat }))
  }
  // crystal
  parts.push(INT(extrude(crystalShape, 0.2, { pos: [0, 0, T - 0.1], mat: MAT.glass }), sphere(3.2, { pos: [0, 0, T - 3.08], mat: MAT.glass })))
  // crown & pushers
  const cx = kind === 'rect' ? 0.72 : kind === 'shield' ? 0.95 : kind === 'big' || kind === 'pocket' ? 1.1 : kind === 'octagon' ? 1.02 : 0.98
  if (pocket) {
    parts.push(cyl(0.1, 0.1, { pos: [0, 1.2, 0], rr: 0.02, mat: { ...metal, proc: 'knurl', pscale: 1, bump: 0.5 } }))
    parts.push(torus(0.22, 0.045, { axis: 'z', pos: [0, 1.46, 0], mat: metal }))
    // chain links
    for (let i = 0; i < 14; i++) {
      const t = i / 13
      const x = -0.2 - t * 1.9
      const y = 1.66 - Math.sin(t * Math.PI) * 0.5 - t * 1.66
      parts.push(torus(0.075, 0.018, { axis: i % 2 ? 'x' : 'z', pos: [x, Math.max(0.03, y), 0.2 - t * 0.4], rot: [0, 0, -30 + t * 60], mat: metal }))
    }
  } else if (kind !== 'digital') {
    parts.push(cyl(0.085, 0.07, { axis: 'x', pos: [cx + 0.06, 0, -0.05], rr: 0.02, mat: { ...metal, proc: 'knurl', pscale: 1, bump: 0.6 }, rot: [0, 0, 0] }))
    if (v.extra === 'crownguard') parts.push(box([0.07, 0.22, 0.12], { pos: [cx + 0.04, 0, -0.05], r: 0.05, mat: metal }))
    if (v.sub === 3 || v.sub === 2) {
      for (const s of [1, -1]) parts.push(cyl(0.05, 0.06, { axis: 'x', pos: [cx * Math.cos(0.7) + 0.04, s * cx * Math.sin(0.7), -0.05], rot: [0, 0, s * 40], rr: 0.015, mat: metal }))
    }
  } else {
    for (const s of [1, -1]) for (const yy of [0.4, -0.4]) parts.push(cyl(0.05, 0.05, { axis: 'x', pos: [s * 1.02, yy, -0.05], rr: 0.015, mat: MAT.polished }))
  }
  // lugs + strap
  const top = kind === 'rect' ? 1.0 : kind === 'digital' ? 0.82 : kind === 'shield' ? 0.92 : 0.88
  const width = kind === 'rect' || kind === 'shield' ? 0.6 : kind === 'big' || kind === 'octagon' || kind === 'porthole' ? 0.84 : 0.72
  const strapTop = top + 0.25, strapBottom = -(kind === 'shield' ? 0.98 : top) - 0.25
  if (!pocket) {
    if (v.strap !== 'integrated' && kind !== 'digital') {
      for (const sy of [1, -1]) for (const sx of [1, -1]) parts.push(box([0.07, 0.18, 0.1], { pos: [sx * (width / 2 + 0.02), sy * (top + 0.1) + (sy < 0 && kind === 'shield' ? -0.06 : 0), -0.08], rot: [sy * 12, 0, 0], r: 0.04, mat: metal }))
    }
    parts.push(...strap(v, metal, strapTop, strapBottom, width))
  }
  const cyc = pocket ? 1.14 : Math.hypot((strapTop - strapBottom) / 2, 0.78) + 0.07
  const watch = U(parts, { pos: [0, cyc * scale, 0], scale })
  const stand = pocket ? null : null
  return {
    root: U([watch, stand]),
    camera: pocket ? { pos: [2.1, 2.6, 6.2], target: [-0.35, 1.05, -0.2], fov: 0.5 } : { pos: [2.0, cyc + 0.95, 6.3], target: [0.08, cyc - 0.05, -0.35], fov: 0.5 },
    spot: [0, 1.5, -0.4],
    wall: '#18130e',
    halo: '#3a2c1c',
  }
}
