export type HeistSfxMood = {
  alert: number
  cameraHot: boolean
  investigating: boolean
  chasing: boolean
  cracking: boolean
  paused: boolean
  ended: boolean
}

let ctx: AudioContext | null = null
let unlocked = false
let graph = false
let noiseBuf: AudioBuffer | null = null

let master: GainNode | null = null
let shotGain: GainNode | null = null
let ambientGain: GainNode | null = null
let tensionGain: GainNode | null = null
let cameraGain: GainNode | null = null
let investigateGain: GainNode | null = null
let chaseGain: GainNode | null = null
let safeGain: GainNode | null = null
let chaseFilter: BiquadFilterNode | null = null

let lastPulseAt = 0
let lastCamTickAt = 0
let lastInvHitAt = 0
let lastChaseTickAt = 0
let lastSafeTickAt = 0
let lastStingAt = 0
let lastStingPri = 0
let prevChase = false

function ctor() {
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

export function unlockHeistSfx() {
  unlocked = true
  const Ctor = ctor()
  if (!Ctor) return
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  ensureGraph()
}

function audio() {
  if (!unlocked) return null
  const Ctor = ctor()
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  ensureGraph()
  return ctx
}

function ensureGraph() {
  if (!ctx || graph) return
  graph = true
  master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)

  shotGain = ctx.createGain()
  shotGain.gain.value = 1
  shotGain.connect(master)

  ambientGain = ctx.createGain()
  ambientGain.gain.value = 0
  ambientGain.connect(master)

  tensionGain = ctx.createGain()
  tensionGain.gain.value = 0
  tensionGain.connect(master)

  cameraGain = ctx.createGain()
  cameraGain.gain.value = 0
  cameraGain.connect(master)

  investigateGain = ctx.createGain()
  investigateGain.gain.value = 0
  investigateGain.connect(master)

  chaseGain = ctx.createGain()
  chaseGain.gain.value = 0
  chaseFilter = ctx.createBiquadFilter()
  chaseFilter.type = 'lowpass'
  chaseFilter.frequency.value = 140
  chaseFilter.Q.value = 0.7
  chaseFilter.connect(chaseGain)
  chaseGain.connect(master)

  safeGain = ctx.createGain()
  safeGain.gain.value = 0
  safeGain.connect(master)

  noiseBuf = makeNoise(ctx)

  startDrone(ctx, ambientGain, 38, 'sine', 0.35)
  startNoise(ctx, ambientGain, 0.22, 90, 0.4)
  startDrone(ctx, tensionGain, 52, 'sine', 0.55)
  startDrone(ctx, cameraGain, 64, 'sine', 0.4)
  startNoise(ctx, cameraGain, 0.12, 420, 0.55)
  startDrone(ctx, investigateGain, 46, 'triangle', 0.45)
  startDrone(ctx, investigateGain, 29, 'sine', 0.55)
  startDrone(ctx, chaseFilter, 44, 'sawtooth', 0.22)
  startDrone(ctx, chaseFilter, 62, 'sine', 0.35)
  startNoise(ctx, chaseFilter, 0.18, 180, 0.7)
  startNoise(ctx, safeGain, 0.16, 280, 0.35)
  startDrone(ctx, safeGain, 92, 'sine', 0.2)
}

function makeNoise(ac: AudioContext) {
  const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
  const data = buf.getChannelData(0)
  let v = 0
  for (let i = 0; i < data.length; i++) {
    v = v * 0.985 + (Math.random() * 2 - 1) * 0.15
    data[i] = v
  }
  return buf
}

function startDrone(ac: AudioContext, dest: AudioNode, freq: number, type: OscillatorType, level: number) {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.value = level
  osc.connect(g)
  g.connect(dest)
  osc.start()
}

function startNoise(ac: AudioContext, dest: AudioNode, level: number, cutoff: number, q: number) {
  if (!noiseBuf) return
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  src.loop = true
  const f = ac.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  f.Q.value = q
  const g = ac.createGain()
  g.gain.value = level
  src.connect(f)
  f.connect(g)
  g.connect(dest)
  src.start()
}

function ramp(node: GainNode | null, value: number, seconds: number) {
  if (!node || !ctx) return
  const t = ctx.currentTime
  const cur = node.gain.value
  node.gain.cancelScheduledValues(t)
  node.gain.setValueAtTime(cur, t)
  node.gain.linearRampToValueAtTime(Math.max(0, value), t + Math.max(0.04, seconds))
}

function env(ac: AudioContext, dest: AudioNode, start: number, peak: number, attack: number, dur: number) {
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  g.connect(dest)
  return g
}

function osc(ac: AudioContext, dest: AudioNode, freq: number, type: OscillatorType, start: number, stop: number) {
  const o = ac.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, start)
  o.connect(dest)
  o.start(start)
  o.stop(stop)
  return o
}

function noiseBurst(ac: AudioContext, dest: AudioNode, peak: number, dur: number, cutoff: number, at = 0, q = 1.2) {
  if (!noiseBuf) return
  const t = ac.currentTime + at
  const src = ac.createBufferSource()
  src.buffer = noiseBuf
  const f = ac.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = cutoff
  f.Q.value = q
  const g = env(ac, dest, t, peak, 0.008, dur)
  src.connect(f)
  f.connect(g)
  src.start(t)
  src.stop(t + dur + 0.04)
}

function pickupTone(ac: AudioContext, freq: number, duration: number, type: OscillatorType, gain: number, at = 0) {
  const dest = shotGain ?? ac.destination
  const t = ac.currentTime + at
  const o = ac.createOscillator()
  const node = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  node.gain.setValueAtTime(0.0001, t)
  node.gain.exponentialRampToValueAtTime(gain, t + 0.012)
  node.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  o.connect(node)
  node.connect(dest)
  o.start(t)
  o.stop(t + duration + 0.02)
}

function heartbeat(ac: AudioContext, intensity: number, chase: boolean) {
  const dest = shotGain ?? ac.destination
  const t = ac.currentTime
  const g1 = env(ac, dest, t, (chase ? 0.05 : 0.034) * intensity, 0.012, chase ? 0.09 : 0.13)
  osc(ac, g1, chase ? 68 : 54, 'sine', t, t + 0.16)
  const t2 = t + (chase ? 0.09 : 0.13)
  const g2 = env(ac, dest, t2, (chase ? 0.038 : 0.026) * intensity, 0.01, chase ? 0.11 : 0.16)
  osc(ac, g2, chase ? 46 : 36, 'sine', t2, t2 + 0.2)
}

function alarmTick(ac: AudioContext, peak: number) {
  noiseBurst(ac, shotGain ?? ac.destination, peak, 0.045, 1750, 0, 3.2)
  const t = ac.currentTime
  const g = env(ac, shotGain ?? ac.destination, t, peak * 0.55, 0.004, 0.05)
  osc(ac, g, 880, 'sine', t, t + 0.06)
}

function canSting(pri: number) {
  if (!ctx) return false
  if (ctx.currentTime - lastStingAt < 0.12 && pri < lastStingPri) return false
  lastStingAt = ctx.currentTime
  lastStingPri = pri
  return true
}

function fadeDanger(seconds: number) {
  ramp(cameraGain, 0, seconds)
  ramp(investigateGain, 0, seconds)
  ramp(chaseGain, 0, seconds)
  ramp(tensionGain, 0.006, seconds)
}

export function haltHeistSfx() {
  fadeDanger(0.25)
  ramp(ambientGain, 0, 0.25)
  ramp(safeGain, 0, 0.15)
  ramp(tensionGain, 0, 0.25)
}

export const heistSfx = {
  pickup() {
    const ac = audio()
    if (!ac) return
    pickupTone(ac, 880, 0.06, 'triangle', 0.045)
    pickupTone(ac, 1320, 0.07, 'sine', 0.03, 0.03)
  },

  cameraAlert() {
    const ac = audio()
    if (!ac || !canSting(2)) return
    const dest = shotGain ?? ac.destination
    noiseBurst(ac, dest, 0.045, 0.07, 2100, 0, 2.4)
    const t = ac.currentTime
    const g1 = env(ac, dest, t, 0.038, 0.006, 0.09)
    const o1 = osc(ac, g1, 920, 'sine', t, t + 0.1)
    o1.frequency.exponentialRampToValueAtTime(640, t + 0.09)
    const t2 = t + 0.1
    const g2 = env(ac, dest, t2, 0.03, 0.006, 0.11)
    const o2 = osc(ac, g2, 720, 'sine', t2, t2 + 0.12)
    o2.frequency.exponentialRampToValueAtTime(480, t2 + 0.11)
  },

  investigateStart() {
    const ac = audio()
    if (!ac || !canSting(3)) return
    const dest = shotGain ?? ac.destination
    noiseBurst(ac, dest, 0.04, 0.16, 240, 0, 0.8)
    const t = ac.currentTime
    const g = env(ac, dest, t, 0.048, 0.02, 0.32)
    const o = osc(ac, g, 118, 'sine', t, t + 0.34)
    o.frequency.exponentialRampToValueAtTime(52, t + 0.3)
  },

  chaseStart() {
    const ac = audio()
    if (!ac || !canSting(5)) return
    const dest = shotGain ?? ac.destination
    noiseBurst(ac, dest, 0.055, 0.12, 380, 0, 0.9)
    const t = ac.currentTime
    const g = env(ac, dest, t, 0.07, 0.008, 0.28)
    const o = osc(ac, g, 92, 'triangle', t, t + 0.3)
    o.frequency.exponentialRampToValueAtTime(48, t + 0.26)
    const g2 = env(ac, dest, t + 0.04, 0.04, 0.01, 0.22)
    osc(ac, g2, 36, 'sine', t + 0.04, t + 0.28)
  },

  safeStart() {
    const ac = audio()
    if (!ac) return
    noiseBurst(ac, shotGain ?? ac.destination, 0.028, 0.08, 900, 0, 2)
  },

  safeClick() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    const t = ac.currentTime
    noiseBurst(ac, dest, 0.03, 0.03, 2400, 0, 4)
    const g = env(ac, dest, t, 0.04, 0.003, 0.05)
    osc(ac, g, 1680, 'sine', t, t + 0.055)
    const g2 = env(ac, dest, t + 0.02, 0.022, 0.004, 0.06)
    osc(ac, g2, 840, 'triangle', t + 0.02, t + 0.08)
  },

  safeFail() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    noiseBurst(ac, dest, 0.05, 0.12, 180, 0, 0.7)
    const t = ac.currentTime
    const g = env(ac, dest, t, 0.055, 0.008, 0.2)
    const o = osc(ac, g, 86, 'sine', t, t + 0.22)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.18)
  },

  safeUnlock() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    const t = ac.currentTime
    noiseBurst(ac, dest, 0.04, 0.08, 1600, 0, 1.6)
    const g = env(ac, dest, t, 0.05, 0.01, 0.28)
    const o = osc(ac, g, 220, 'triangle', t, t + 0.3)
    o.frequency.exponentialRampToValueAtTime(410, t + 0.26)
    const g2 = env(ac, dest, t + 0.16, 0.038, 0.008, 0.22)
    osc(ac, g2, 620, 'sine', t + 0.16, t + 0.4)
    const g3 = env(ac, dest, t + 0.28, 0.03, 0.01, 0.2)
    osc(ac, g3, 930, 'sine', t + 0.28, t + 0.5)
  },

  exit() {
    const ac = audio()
    if (!ac) return
    fadeDanger(0.35)
    ramp(safeGain, 0, 0.2)
    const dest = shotGain ?? ac.destination
    const t = ac.currentTime
    const notes = [392, 523, 659]
    notes.forEach((freq, i) => {
      const at = t + i * 0.09
      const g = env(ac, dest, at, 0.04, 0.012, 0.18)
      osc(ac, g, freq, 'sine', at, at + 0.2)
    })
  },

  caught() {
    const ac = audio()
    if (!ac) return
    fadeDanger(0.2)
    ramp(safeGain, 0, 0.12)
    ramp(ambientGain, 0, 0.4)
    const dest = shotGain ?? ac.destination
    noiseBurst(ac, dest, 0.08, 0.14, 220, 0, 0.6)
    const t = ac.currentTime
    const g = env(ac, dest, t, 0.09, 0.006, 0.32)
    const o = osc(ac, g, 78, 'sine', t, t + 0.34)
    o.frequency.exponentialRampToValueAtTime(32, t + 0.3)
    const g2 = env(ac, dest, t + 0.08, 0.06, 0.01, 0.42)
    osc(ac, g2, 24, 'sine', t + 0.08, t + 0.52)
  },

  pause() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    const t = ac.currentTime
    const g = env(ac, dest, t, 0.028, 0.008, 0.08)
    osc(ac, g, 440, 'sine', t, t + 0.09)
  },

  purchase() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    const t = ac.currentTime
    const g = env(ac, dest, t, 0.04, 0.008, 0.08)
    osc(ac, g, 587, 'triangle', t, t + 0.09)
    const g2 = env(ac, dest, t + 0.06, 0.035, 0.01, 0.12)
    osc(ac, g2, 784, 'sine', t + 0.06, t + 0.2)
  },

  sync(mood: HeistSfxMood) {
    const ac = audio()
    if (!ac || !ambientGain || !tensionGain || !cameraGain || !investigateGain || !chaseGain || !safeGain) return

    if (mood.ended || mood.paused) {
      const fade = mood.ended ? 0.4 : 0.18
      ramp(ambientGain, 0, fade)
      ramp(tensionGain, 0, fade)
      ramp(cameraGain, 0, fade)
      ramp(investigateGain, 0, fade)
      ramp(chaseGain, 0, fade)
      ramp(safeGain, 0, 0.12)
      prevChase = mood.chasing
      return
    }

    const a = Math.max(0, Math.min(1, mood.alert))
    let ambient = 0.01
    let tension = 0
    if (a < 0.3) {
      ambient = 0.01 + a * 0.02
      tension = a * 0.012
    } else if (a < 0.7) {
      ambient = 0.016
      tension = 0.014 + (a - 0.3) * 0.05
    } else {
      ambient = 0.012
      tension = 0.034 + (a - 0.7) * 0.06
    }

    const chase = mood.chasing
    const inv = mood.investigating && !chase
    const cam = mood.cameraHot && !chase
    if (chase) {
      ambient = 0.006
      tension = 0.01
    } else if (inv) {
      tension = Math.max(tension, 0.028)
    } else if (cam) {
      tension = Math.max(tension, 0.018)
    }

    const leavingChase = prevChase && !chase
    prevChase = chase

    ramp(ambientGain, ambient, 0.4)
    ramp(tensionGain, tension, leavingChase || (!inv && !cam && a < 0.55) ? 1.45 : 0.28)
    ramp(cameraGain, cam ? 0.028 : 0, cam ? 0.18 : 1.4)
    ramp(investigateGain, inv ? 0.04 : 0, inv ? 0.2 : 1.4)
    ramp(chaseGain, chase ? 0.055 : 0, chase ? 0.16 : 1.55)
    if (chaseFilter) {
      const t = ac.currentTime
      chaseFilter.frequency.cancelScheduledValues(t)
      chaseFilter.frequency.setValueAtTime(chaseFilter.frequency.value, t)
      chaseFilter.frequency.linearRampToValueAtTime(chase ? 190 : 120, t + 0.2)
    }
    ramp(safeGain, mood.cracking ? 0.03 : 0, 0.16)

    const now = ac.currentTime
    if (mood.cracking && now - lastSafeTickAt >= 0.32) {
      lastSafeTickAt = now
      const dest = shotGain ?? ac.destination
      const t = now
      const g = env(ac, dest, t, 0.014, 0.003, 0.04)
      osc(ac, g, 1240, 'sine', t, t + 0.045)
    }

    if (chase) {
      if (now - lastPulseAt >= 0.27) {
        lastPulseAt = now
        heartbeat(ac, 1, true)
      }
      if (now - lastChaseTickAt >= 0.135) {
        lastChaseTickAt = now
        noiseBurst(ac, shotGain ?? ac.destination, 0.022, 0.028, 1900, 0, 2.8)
      }
      return
    }

    if (inv) {
      if (now - lastPulseAt >= 0.68) {
        lastPulseAt = now
        heartbeat(ac, 0.85, false)
      }
      if (now - lastInvHitAt >= 1.85) {
        lastInvHitAt = now
        alarmTick(ac, 0.024)
      }
      return
    }

    if (cam) {
      if (now - lastPulseAt >= 1.05) {
        lastPulseAt = now
        heartbeat(ac, 0.55, false)
      }
      if (now - lastCamTickAt >= 1.45) {
        lastCamTickAt = now
        alarmTick(ac, 0.018)
      }
      return
    }

    if (a >= 0.7) {
      if (now - lastPulseAt >= 0.82) {
        lastPulseAt = now
        heartbeat(ac, 0.45 + (a - 0.7), false)
      }
    } else if (a >= 0.3) {
      if (now - lastPulseAt >= 1.2) {
        lastPulseAt = now
        heartbeat(ac, 0.28 + (a - 0.3) * 0.4, false)
      }
    }
  },
}
