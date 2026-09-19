/** Tight crop around opaque pixels so padding never flattens the duck. */
export function cropOpaque(src: HTMLCanvasElement | HTMLImageElement, pad = 8) {
  const w = 'naturalWidth' in src ? src.naturalWidth : src.width
  const h = 'naturalHeight' in src ? src.naturalHeight : src.height
  const probe = document.createElement('canvas')
  probe.width = w
  probe.height = h
  const px = probe.getContext('2d')
  if (!px) return src instanceof HTMLCanvasElement ? src : probe
  px.drawImage(src, 0, 0)
  const data = px.getImageData(0, 0, w, h).data
  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] < 12) continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX <= minX || maxY <= minY) return src instanceof HTMLCanvasElement ? src : probe
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)
  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  const ox = out.getContext('2d')
  if (!ox) return src instanceof HTMLCanvasElement ? src : probe
  ox.drawImage(probe, minX, minY, cw, ch, 0, 0, cw, ch)
  return out
}

export function punchBackdrop(img: HTMLImageElement) {
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const x = c.getContext('2d')
  if (!x) return img
  x.drawImage(img, 0, 0)
  const data = x.getImageData(0, 0, c.width, c.height)
  const d = data.data
  const w = c.width
  const h = c.height
  const isBackdrop = (i: number) => {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    const a = d[i + 3]
    if (a < 18) return true
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const sat = max === 0 ? 0 : (max - min) / max
    const lum = (r + g + b) / 3
    if (lum > 178 && sat < 0.14) return true
    if (r > 228 && g > 228 && b > 228) return true
    return false
  }
  const seen = new Uint8Array(w * h)
  const stack: number[] = []
  const push = (px: number, py: number) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return
    stack.push(py * w + px)
  }
  for (let i = 0; i < w; i += 1) {
    push(i, 0)
    push(i, h - 1)
  }
  for (let j = 0; j < h; j += 1) {
    push(0, j)
    push(w - 1, j)
  }
  while (stack.length) {
    const p = stack.pop()
    if (p === undefined || seen[p]) continue
    seen[p] = 1
    const i = p * 4
    if (!isBackdrop(i)) continue
    d[i + 3] = 0
    const px = p % w
    const py = (p / w) | 0
    push(px + 1, py)
    push(px - 1, py)
    push(px, py + 1)
    push(px, py - 1)
  }
  x.putImageData(data, 0, 0)
  return c
}
