type HeistSfxId =
  | 'pickup'
  | 'safeSuccess'
  | 'safeFail'
  | 'alert'
  | 'detected'
  | 'chase'
  | 'exit'
  | 'caught'
  | 'pause'
  | 'purchase'

const PRIORITY: Record<HeistSfxId, number> = {
  pickup: 1,
  pause: 2,
  purchase: 2,
  safeSuccess: 3,
  safeFail: 3,
  detected: 4,
  alert: 5,
  chase: 6,
  exit: 7,
  caught: 8,
}

let ctx: AudioContext | null = null
let unlocked = false
let busyUntil = 0
let busyPriority = 0
let lastOsc: OscillatorNode | null = null

function ctor() {
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

export function unlockHeistSfx() {
  unlocked = true
  const Ctor = ctor()
  if (!Ctor) return
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
}

function audio() {
  if (!unlocked) return null
  const Ctor = ctor()
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(ac: AudioContext, freq: number, duration: number, type: OscillatorType, gain: number, at = 0) {
  const osc = ac.createOscillator()
  const node = ac.createGain()
  const t = ac.currentTime + at
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  node.gain.setValueAtTime(0.0001, t)
  node.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  node.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(node)
  node.connect(ac.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
  lastOsc = osc
}

function play(id: HeistSfxId, duration: number, run: (ac: AudioContext) => void) {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  const pri = PRIORITY[id]
  if (now < busyUntil && pri < busyPriority) return
  try {
    lastOsc?.stop()
  } catch {
    /* already stopped */
  }
  lastOsc = null
  run(ac)
  busyUntil = now + duration
  busyPriority = pri
}

export const heistSfx = {
  pickup() {
    play('pickup', 0.09, (ac) => {
      tone(ac, 880, 0.06, 'triangle', 0.045)
      tone(ac, 1320, 0.07, 'sine', 0.03, 0.03)
    })
  },
  safeSuccess() {
    play('safeSuccess', 0.12, (ac) => {
      tone(ac, 660, 0.08, 'triangle', 0.05)
      tone(ac, 990, 0.09, 'sine', 0.035, 0.04)
    })
  },
  safeFail() {
    play('safeFail', 0.12, (ac) => tone(ac, 160, 0.11, 'square', 0.035))
  },
  alert() {
    play('alert', 0.16, (ac) => {
      tone(ac, 520, 0.07, 'square', 0.04)
      tone(ac, 390, 0.1, 'square', 0.035, 0.07)
    })
  },
  detected() {
    play('detected', 0.14, (ac) => tone(ac, 310, 0.12, 'sawtooth', 0.03))
  },
  chase() {
    play('chase', 0.2, (ac) => {
      tone(ac, 240, 0.1, 'sawtooth', 0.04)
      tone(ac, 180, 0.14, 'square', 0.035, 0.08)
    })
  },
  exit() {
    play('exit', 0.22, (ac) => {
      tone(ac, 523, 0.08, 'triangle', 0.045)
      tone(ac, 659, 0.08, 'triangle', 0.04, 0.07)
      tone(ac, 784, 0.12, 'sine', 0.04, 0.13)
    })
  },
  caught() {
    play('caught', 0.28, (ac) => {
      tone(ac, 200, 0.12, 'sawtooth', 0.045)
      tone(ac, 110, 0.2, 'square', 0.04, 0.1)
    })
  },
  pause() {
    play('pause', 0.08, (ac) => tone(ac, 440, 0.07, 'sine', 0.03))
  },
  purchase() {
    play('purchase', 0.16, (ac) => {
      tone(ac, 587, 0.07, 'triangle', 0.04)
      tone(ac, 784, 0.1, 'sine', 0.035, 0.06)
    })
  },
}
