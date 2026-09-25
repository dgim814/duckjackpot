import { Renderer } from './engine.js'
import { buildScene } from './scenes.js'

const log = (m) => (document.getElementById('log').textContent += m + '\n')
const canvas = document.getElementById('out')
const renderer = new Renderer(canvas)
window.__renderer = renderer

/** Render one lot; returns the canvas (W×H). */
export async function renderLot(id, W = 1600, H = 1000) {
  const scene = await buildScene(id)
  const t0 = performance.now()
  renderer.render(scene, W, H)
  return { ms: Math.round(performance.now() - t0) }
}

/** Save the current canvas as PNG through the local save server. */
export async function saveCurrent(name) {
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
  const res = await fetch(`http://127.0.0.1:5199/save/${name}.png`, { method: 'POST', body: blob })
  if (!res.ok) throw new Error('save failed ' + res.status)
}

/** Render into the preview grid as a small image. */
export async function preview(ids, W = 800, H = 500) {
  const grid = document.getElementById('grid')
  grid.innerHTML = ''
  for (const id of ids) {
    try {
      const { ms } = await renderLot(id, W, H)
      const img = document.createElement('img')
      img.src = canvas.toDataURL('image/jpeg', 0.85)
      const fig = document.createElement('figure')
      fig.append(img, Object.assign(document.createElement('figcaption'), { textContent: `${id} ${ms}ms` }))
      grid.append(fig)
    } catch (e) {
      log(`${id}: ${e.message}`)
    }
    await new Promise((r) => setTimeout(r, 0))
  }
}

window.__lot = { renderLot, saveCurrent, preview, log }
log('ready')

/** Debug: render one lot at preview size, optionally overriding the camera. */
window.__show = async (id, cam, W = 800, H = 500) => {
  const scene = await buildScene(id)
  if (cam) scene.camera = { ...scene.camera, ...cam }
  const t = performance.now()
  renderer.render(scene, W, H)
  return Math.round(performance.now() - t)
}

/** Review: render lots into one contact-sheet PNG saved as review_<name>.png. */
window.__sheet = async (name, ids, cols = 4, W = 400, H = 250) => {
  const rows = Math.ceil(ids.length / cols)
  const sheet = document.createElement('canvas')
  sheet.width = cols * W
  sheet.height = rows * (H + 22)
  const c = sheet.getContext('2d')
  c.fillStyle = '#111'
  c.fillRect(0, 0, sheet.width, sheet.height)
  const errors = []
  for (let i = 0; i < ids.length; i++) {
    const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 22)
    try {
      const scene = await buildScene(ids[i])
      renderer.render(scene, W * 2, H * 2)
      c.drawImage(canvas, x, y, W, H)
    } catch (e) {
      errors.push(ids[i] + ': ' + e.message.slice(0, 200))
    }
    c.fillStyle = '#ddd'
    c.font = '14px sans-serif'
    c.fillText(ids[i], x + 4, y + H + 16)
    await new Promise((r) => setTimeout(r, 0))
  }
  const blob = await new Promise((r) => sheet.toBlob(r, 'image/png'))
  await fetch(`http://127.0.0.1:5199/save/review_${name}.png`, { method: 'POST', body: blob })
  return errors
}

/** Bake: render every id at 1600×1000 and save <id>.png via the save server. */
window.__bake = async (ids) => {
  const done = [], errors = []
  for (const id of ids) {
    try {
      await renderLot(id, 1600, 1000)
      await saveCurrent(id)
      done.push(id)
    } catch (e) {
      errors.push(id + ': ' + e.message.slice(0, 160))
    }
    await new Promise((r) => setTimeout(r, 0))
  }
  return { done: done.length, errors }
}

/** Before/after sheet: old vector illustration vs the new baked render. */
window.__compare = async (name, ids, W = 300, H = 190) => {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { LotVisual } = await import('/src/heist/economy/art/LotVisual.tsx')
  const { VISUALS } = await import('/src/heist/economy/art/visuals.ts')
  const sheet = document.createElement('canvas')
  sheet.width = W * 2 + 30
  sheet.height = ids.length * (H + 10) + 40
  const c = sheet.getContext('2d')
  c.fillStyle = '#111'
  c.fillRect(0, 0, sheet.width, sheet.height)
  c.fillStyle = '#ddd'
  c.font = 'bold 18px sans-serif'
  c.fillText('BEFORE · vector icon', 10, 26)
  c.fillText('AFTER · studio render', W + 30, 26)
  const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src })
  for (let i = 0; i < ids.length; i++) {
    const y = 40 + i * (H + 10)
    const v = VISUALS[ids[i]]
    if (v) {
      const svg = renderToStaticMarkup(React.createElement(LotVisual, { v })).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" `)
      const im = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))
      if (im) c.drawImage(im, 0, y, W, H)
    }
    const after = await load(`/heist/lots/${ids[i]}.webp?t=${Date.now()}`)
    if (after) c.drawImage(after, W + 30, y, W, H)
  }
  const blob = await new Promise((r) => sheet.toBlob(r, 'image/png'))
  await fetch(`http://127.0.0.1:5199/save/review_${name}.png`, { method: 'POST', body: blob })
  return 'ok'
}
