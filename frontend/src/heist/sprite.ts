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
