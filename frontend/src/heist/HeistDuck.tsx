import { useEffect, useRef, useState } from 'react'
import { punchBackdrop } from './sprite'

const SPRITE = '/heist/duck.png'

/**
 * Draws the duck at its natural aspect ratio. The canvas box is sized from the
 * source image, so CSS never squashes the character.
 */
export function HeistDuck({ className, size = 220 }: { className?: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const img = new Image()
    const paint = () => {
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      if (iw <= 0 || ih <= 0) return
      const punched = punchBackdrop(img)
      const k = size / Math.max(iw, ih)
      const w = Math.round(iw * k)
      const h = Math.round(ih * k)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(punched, 0, 0, w, h)
      setOk(true)
    }
    img.onload = paint
    img.src = SPRITE
    if (img.complete) paint()
  }, [size])

  return <canvas ref={ref} className={className} style={{ visibility: ok ? 'visible' : 'hidden' }} />
}
