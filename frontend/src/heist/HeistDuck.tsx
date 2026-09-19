import { useEffect, useRef, useState } from 'react'
import { cropOpaque, punchBackdrop } from './sprite'

const SPRITE = '/heist/duck.png'

/**
 * Draws the duck at its natural aspect ratio. Size lives in React style so CSS
 * never falls back to the canvas default 300×150 box.
 */
export function HeistDuck({
  className,
  size = 220,
  fit = 'contain',
}: {
  className?: string
  size?: number
  fit?: 'contain' | 'height'
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ok, setOk] = useState(false)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const img = new Image()
    const paint = () => {
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      if (iw <= 0 || ih <= 0) return
      const punched = punchBackdrop(img)
      const src = cropOpaque(punched instanceof HTMLCanvasElement ? punched : img)
      const sw = src.width
      const sh = src.height
      if (sw <= 0 || sh <= 0) return
      const k = fit === 'height' ? size / sh : size / Math.max(sw, sh)
      const w = Math.max(1, Math.round(sw * k))
      const h = Math.max(1, Math.round(sh * k))
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(src, 0, 0, w, h)
      setBox({ w, h })
      setOk(true)
    }
    img.onload = paint
    img.src = SPRITE
    if (img.complete) paint()
  }, [size, fit])

  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        display: 'block',
        visibility: ok ? 'visible' : 'hidden',
        width: box.w ? `${box.w}px` : undefined,
        height: box.h ? `${box.h}px` : undefined,
      }}
    />
  )
}
