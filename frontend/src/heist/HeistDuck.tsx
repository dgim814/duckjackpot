import { useEffect, useRef, useState } from 'react'
import { punchBackdrop } from './sprite'

const SPRITE = '/heist/duck.png'

export function HeistDuck({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const img = new Image()
    const paint = () => {
      if (img.naturalWidth <= 0) return
      const punched = punchBackdrop(img)
      const w = 220
      const h = 220
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(punched, 10, 10, 200, 200)
      setOk(true)
    }
    img.onload = paint
    img.src = SPRITE
    if (img.complete) paint()
  }, [])

  return <canvas ref={ref} className={className} style={{ visibility: ok ? 'visible' : 'hidden' }} />
}
