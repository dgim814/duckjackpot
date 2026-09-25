import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { sceneArt } from '/src/heist/economy/art/painting.tsx'
import { MAT, U, SUB, box, cyl, canvas } from '../dsl.js'

/**
 * A framed painting hung on a dark museum wall under a brass picture light.
 * Public-domain works use the real image; the rest are the lot's own
 * composition re-painted with brush strokes so it reads as oil on canvas.
 */
const PD = new Set([
  'art_vangogh_starry', 'art_vinci_mona', 'art_vinci_supper', 'art_munch_scream', 'art_monet_impression', 'art_monet_lilies',
  'art_vermeer_pearl', 'art_botticelli_venus', 'art_michelangelo_adam', 'art_caravaggio_matthew', 'art_rembrandt_watch',
  'art_klimt_kiss', 'art_malevich_square', 'art_kandinsky_viii', 'art_seurat_grande_jatte', 'art_hokusai_wave',
  'art_vangogh_sunflowers', 'art_turner_temeraire', 'art_bruegel_hunters', 'art_sketch',
])

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = rej
    im.src = src
  })
}

async function paintedComposition(v, W, H) {
  const svg = renderToStaticMarkup(
    createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H }, sceneArt(v.scene, { x: 0, y: 0, w: W, h: H })),
  )
  const im = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
  const src = canvas(W, H, (c) => c.drawImage(im, 0, 0, W, H))
  const data = src.getContext('2d').getImageData(0, 0, W, H).data
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return canvas(W, H, (c) => {
    c.filter = 'blur(3px)'
    c.drawImage(src, 0, 0)
    c.filter = 'none'
    c.lineCap = 'round'
    // three passes of strokes, from broad to fine, following a soft flow field
    for (const [n, len, wid] of [
      [7000, 34, 12],
      [16000, 18, 6],
      [14000, 9, 3],
    ]) {
      for (let i = 0; i < n; i++) {
        const x = rnd() * W, y = rnd() * H
        const k = (Math.floor(y) * W + Math.floor(x)) * 4
        const jitter = (rnd() - 0.5) * 44
        c.strokeStyle = `rgba(${Math.max(0, Math.min(255, data[k] + jitter))},${Math.max(0, Math.min(255, data[k + 1] + jitter))},${Math.max(0, Math.min(255, data[k + 2] + jitter))},0.75)`
        c.lineWidth = wid * (0.6 + rnd() * 0.8)
        const a = Math.sin(x * 0.013) * 1.2 + Math.cos(y * 0.011) * 1.2 + (rnd() - 0.5) * 0.6
        c.beginPath()
        c.moveTo(x - (Math.cos(a) * len) / 2, y - (Math.sin(a) * len) / 2)
        c.lineTo(x + (Math.cos(a) * len) / 2, y + (Math.sin(a) * len) / 2)
        c.stroke()
      }
    }
    // varnish: warm, darker edges, soft light fall-off
    const vg = c.createRadialGradient(W * 0.45, H * 0.4, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75)
    vg.addColorStop(0, 'rgba(255,230,180,0.05)')
    vg.addColorStop(1, 'rgba(40,20,5,0.45)')
    c.fillStyle = vg
    c.fillRect(0, 0, W, H)
    // canvas weave
    c.globalAlpha = 0.07
    for (let y = 0; y < H; y += 3) {
      c.fillStyle = y % 6 ? '#000' : '#fff'
      c.fillRect(0, y, W, 1)
    }
    for (let x = 0; x < W; x += 3) {
      c.fillStyle = x % 6 ? '#000' : '#fff'
      c.fillRect(x, 0, 1, H)
    }
    c.globalAlpha = 1
  })
}

async function artworkCanvas(id, v) {
  if (PD.has(id)) {
    const src = id === 'art_sketch' ? '/tools/lot-renderer/sources/art_sketch.png' : `/tools/lot-renderer/sources/${id}.webp`
    const im = await loadImage(src)
    const s = Math.min(1, 1000 / Math.max(im.width, im.height))
    return canvas(Math.round(im.width * s), Math.round(im.height * s), (c, w, h) => c.drawImage(im, 0, 0, w, h))
  }
  return paintedComposition(v, v.portrait ? 640 : 960, v.portrait ? 880 : 640)
}

export async function buildPainting(v, id, tier) {
  const art = await artworkCanvas(id, v)
  const aspect = art.width / art.height
  const maxW = 2.7, maxH = 2.0
  let w = maxW, h = maxW / aspect
  if (h > maxH) {
    h = maxH
    w = maxH * aspect
  }
  const cy = 1.65
  const frame = v.frame
  const fw = frame === 'ornate' ? 0.26 : frame === 'mat' ? 0.1 : frame === 'fresco' ? 0.2 : frame === 'gold' ? 0.18 : 0.12
  const mat = frame === 'black' ? MAT.blackLacquer : frame === 'wood' ? MAT.wood('#5a3a20', 5) : frame === 'fresco' ? MAT.matte('#bfae8e') : frame === 'mat' ? MAT.wood('#2a1c12', 5) : { ...MAT.gold, rough: 0.28, proc: 'hammered', pscale: frame === 'ornate' ? 22 : 10, bump: frame === 'ornate' ? 1.4 : 0.5 }
  const kids = []
  const matBoard = frame === 'mat' ? 0.22 : 0
  const ow = w / 2 + matBoard + fw, oh = h / 2 + matBoard + fw
  // frame: outer moulding minus the sight opening, plus an inner gilded slip
  kids.push(SUB(box([ow, oh, 0.09], { r: frame === 'black' ? 0.02 : 0.06, mat }), box([ow - fw, oh - fw, 0.3])))
  if (frame === 'ornate' || frame === 'gold') {
    kids.push(SUB(box([ow - fw * 0.55, oh - fw * 0.55, 0.11], { r: 0.03, mat: { ...MAT.gold, rough: 0.18 } }), box([ow - fw * 0.75, oh - fw * 0.75, 0.3])))
    kids.push(SUB(box([ow - fw * 0.1, oh - fw * 0.1, 0.12], { r: 0.05, mat: { ...MAT.gold, rough: 0.14 } }), box([ow - fw * 0.25, oh - fw * 0.25, 0.3])))
  }
  if (matBoard) kids.push(SUB(box([w / 2 + matBoard, h / 2 + matBoard, 0.03], { pos: [0, 0, 0.0], mat: MAT.paper('#efe8d8') }), box([w / 2 + 0.01, h / 2 + 0.01, 0.3])))
  // the canvas itself
  kids.push(box([w / 2, h / 2, 0.03], { pos: [0, 0, -0.02], mat: MAT.matte('#886644'), decal: { canvas: art, proj: 'z', w, h, bump: PD.has(id) ? 0.15 : 0.5 } }))
  const hung = U(kids, { pos: [0, cy, -0.02] })
  const wall = box([6, 4, 0.1], { pos: [0, 2, -0.2], mat: { type: 'dielectric', color: tier === 'MASTERPIECE' ? '#2a1d18' : '#1f1a16', rough: 0.9, proc: 'paper', pscale: 3, bump: 0.3, spec: 0.1 } })
  const light = tier === 'MASTERPIECE' || frame === 'ornate'
    ? U([
        box([Math.min(0.9, w * 0.35), 0.035, 0.035], { pos: [0, cy + oh + 0.35, 0.28], r: 0.015, mat: MAT.brass }),
        cyl(0.05, 0.2, { pos: [0, cy + oh + 0.2, 0.12], rot: [55, 0, 0], mat: MAT.brass }),
        box([Math.min(0.9, w * 0.35), 0.01, 0.03], { pos: [0, cy + oh + 0.31, 0.28], mat: MAT.lamp('#fff2d0') }),
      ])
    : null
  return {
    root: U([hung, wall, light]),
    camera: { pos: [0.5, cy + 0.12, 5.2], target: [0, cy + 0.08, 0], fov: 0.54 },
    wall: '#1a1410',
    halo: tier === 'MASTERPIECE' ? '#5a4128' : '#3c2c1e',
    spot: [0, 1.4, 0],
    floorY: -5,
    floorGloss: 0,
  }
}
