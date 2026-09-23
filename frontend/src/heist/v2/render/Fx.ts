import Phaser from 'phaser'
import { DEPTH } from './Props'

type Floater = { text: Phaser.GameObjects.Text; age: number; life: number; x: number; y: number; active: boolean }
type Spark = { img: Phaser.GameObjects.Image; x: number; y: number; vx: number; vy: number; age: number; life: number; active: boolean }

const FLOATERS = 10
const SPARKS = 48

/** Pooled pickup numbers and sparks; nothing is allocated during play. */
export class FxLayer {
  private floaters: Floater[] = []
  private sparks: Spark[] = []

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < FLOATERS; i += 1) {
      const text = scene.add
        .text(0, 0, '', {
          fontFamily: 'Unbounded, system-ui, sans-serif',
          fontSize: '30px',
          color: '#ffe08a',
          stroke: '#1a1006',
          strokeThickness: 7,
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.fx + 1)
        .setVisible(false)
      this.floaters.push({ text, age: 0, life: 0.9, x: 0, y: 0, active: false })
    }
    for (let i = 0; i < SPARKS; i += 1) {
      const img = scene.add.image(0, 0, 'v2_spark').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.fx).setVisible(false)
      this.sparks.push({ img, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0.5, active: false })
    }
  }

  float(x: number, y: number, label: string, tone: 'small' | 'mid' | 'big' | 'loss' | 'info') {
    const f = this.floaters.find((o) => !o.active) ?? this.floaters.reduce((a, b) => (a.age > b.age ? a : b))
    f.active = true
    f.age = 0
    f.life = tone === 'big' ? 1.2 : 0.9
    f.x = x
    f.y = y
    const color = tone === 'loss' ? '#ffb070' : tone === 'big' ? '#fff6d0' : tone === 'mid' ? '#ffe08a' : tone === 'info' ? '#c8ffd8' : '#f6d56a'
    const size = tone === 'big' ? 46 : tone === 'mid' ? 38 : tone === 'info' ? 26 : 30
    f.text.setText(label).setColor(color).setFontSize(size).setVisible(true).setAlpha(1).setScale(0.6)
  }

  burst(x: number, y: number, n: number, speed = 220) {
    let made = 0
    for (const s of this.sparks) {
      if (s.active) continue
      const a = Math.random() * Math.PI * 2
      const v = speed * (0.4 + Math.random() * 0.6)
      s.active = true
      s.x = x
      s.y = y
      s.vx = Math.cos(a) * v
      s.vy = Math.sin(a) * v - speed * 0.3
      s.age = 0
      s.life = 0.35 + Math.random() * 0.3
      s.img.setVisible(true).setPosition(x, y).setScale(1.4)
      made += 1
      if (made >= n) break
    }
  }

  update(dt: number) {
    for (const f of this.floaters) {
      if (!f.active) continue
      f.age += dt
      const t = f.age / f.life
      if (t >= 1) {
        f.active = false
        f.text.setVisible(false)
        continue
      }
      const pop = t < 0.15 ? 0.6 + (t / 0.15) * 0.55 : 1.15 - Math.min(0.15, (t - 0.15) * 0.4)
      f.text.setPosition(f.x, f.y - 70 * (1 - (1 - t) ** 2)).setScale(pop).setAlpha(t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1)
    }
    for (const s of this.sparks) {
      if (!s.active) continue
      s.age += dt
      if (s.age >= s.life) {
        s.active = false
        s.img.setVisible(false)
        continue
      }
      s.vy += 520 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      const k = 1 - s.age / s.life
      s.img.setPosition(s.x, s.y).setAlpha(k).setScale(0.6 + k)
    }
  }
}
