export type HeistSfxMood = {
  alert: number
  cameraHot: boolean
  investigating: boolean
  chasing: boolean
  cracking: boolean
  paused: boolean
  ended: boolean
}

const CHASE_FADE = 1.0
const CHASE_FADE_IN = 0.8
const CHASE_VOL = 0.4
const TENSION_CAM = 0.22
const TENSION_INV = 0.34
const FILES = {
  chase: '/audio/heist/chase.mp3',
  camera: '/audio/heist/camera-alert.mp3',
  investigate: '/audio/heist/investigate.mp3',
} as const
const FALLBACK: Partial<Record<keyof typeof FILES, string[]>> = {
  chase: ['/heist/chase.mp3'],
}

type Clip = keyof typeof FILES

let ctx: AudioContext | null = null
let unlocked = false
let graph = false
let bound = false
let noiseBuf: AudioBuffer | null = null
let loading = false

let master: GainNode | null = null
let shotGain: GainNode | null = null
let safeGain: GainNode | null = null
let chaseGain: GainNode | null = null
let tensionGain: GainNode | null = null
let ambientGain: GainNode | null = null

const buffers: Partial<Record<Clip, AudioBuffer>> = {}
let chaseSrc: AudioBufferSourceNode | null = null
let tensionSrc: AudioBufferSourceNode | null = null
let chaseWanted = false
let chaseOn = false
let chasePreview = false
let chaseDucked = false
let lastSafeTickAt = 0
let lastStepAt = 0

function ctor() {
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
}

function dropGraph() {
  graph = false
  master = shotGain = safeGain = chaseGain = tensionGain = ambientGain = null
  chaseSrc = tensionSrc = null
  chaseOn = false
  noiseBuf = null
  for (const id of Object.keys(buffers) as Clip[]) delete buffers[id]
}

function resetIfClosed() {
  if (ctx && ctx.state === 'closed') {
    ctx = null
    dropGraph()
  }
}

function primeOutput(ac: AudioContext) {
  try {
    const buf = ac.createBuffer(1, 1, ac.sampleRate)
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(ac.destination)
    src.start(0)
  } catch {
    /* iOS may reject a second prime */
  }
}

function wakeContext(ac: AudioContext) {
  if (ac.state === 'suspended' || (ac.state as string) === 'interrupted') void ac.resume()
}

/** iPhone only starts Web Audio after a real tap. Bind once from main.tsx. */
export function bindHeistAudioUnlock() {
  if (bound || typeof window === 'undefined') return
  bound = true
  const fire = () => unlockHeistSfx()
  const opts: AddEventListenerOptions = { capture: true, passive: true }
  for (const ev of ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown'] as const) {
    window.addEventListener(ev, fire, opts)
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') unlockHeistSfx()
  })
}

export function unlockHeistSfx() {
  unlocked = true
  resetIfClosed()
  const Ctor = ctor()
  if (!Ctor) return
  if (!ctx) ctx = new Ctor()
  wakeContext(ctx)
  ensureGraph()
  primeOutput(ctx)
  void loadClips()
}

function audio() {
  if (!unlocked) return null
  resetIfClosed()
  const Ctor = ctor()
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  wakeContext(ctx)
  ensureGraph()
  return ctx
}

function ensureGraph() {
  if (!ctx || graph) return
  graph = true
  master = ctx.createGain()
  master.gain.value = 1
  master.connect(ctx.destination)

  shotGain = ctx.createGain()
  shotGain.gain.value = 1
  shotGain.connect(master)

  chaseGain = ctx.createGain()
  chaseGain.gain.value = 0
  chaseGain.connect(master)

  tensionGain = ctx.createGain()
  tensionGain.gain.value = 0
  tensionGain.connect(master)

  safeGain = ctx.createGain()
  safeGain.gain.value = 0
  safeGain.connect(master)

  ambientGain = ctx.createGain()
  ambientGain.gain.value = 0.028
  ambientGain.connect(master)

  noiseBuf = makeNoise(ctx)
  startNoise(ctx, safeGain, 0.16, 280, 0.35)
  startDrone(ctx, safeGain, 92, 'sine', 0.2)
  startNoise(ctx, ambientGain, 0.45, 380, 0.35)
  startDrone(ctx, ambientGain, 46, 'sine', 0.28)
}

async function loadClips() {
  const ac = audio()
  if (!ac || loading) return
  loading = true
  await Promise.all((Object.keys(FILES) as Clip[]).map((id) => loadOne(ac, id)))
  loading = false
  if (chaseWanted) startChaseNow()
}

async function loadOne(ac: AudioContext, id: Clip) {
  if (buffers[id]) return
  const urls = [FILES[id], ...(FALLBACK[id] ?? [])]
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const raw = await res.arrayBuffer()
      buffers[id] = await ac.decodeAudioData(raw.slice(0))
      return
    } catch {
      /* try next */
    }
  }
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
  const cur = Math.max(0, node.gain.value)
  node.gain.cancelScheduledValues(t)
  node.gain.setValueAtTime(cur, t)
  node.gain.linearRampToValueAtTime(Math.max(0, value), t + Math.max(0.02, seconds))
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

function fireShot(id: Clip, vol = 0.7) {
  const ac = audio()
  const buf = buffers[id]
  if (!ac || !buf || !shotGain) return
  const src = ac.createBufferSource()
  src.buffer = buf
  const g = ac.createGain()
  g.gain.value = vol
  src.connect(g)
  g.connect(shotGain)
  src.start()
}

function muteTension(seconds: number) {
  ramp(tensionGain, 0, seconds)
}

function startTensionLoop() {
  const ac = audio()
  const buf = buffers.investigate
  if (!ac || !buf || !tensionGain) return
  if (tensionSrc) return
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  src.connect(tensionGain)
  src.start()
  tensionSrc = src
  src.onended = () => {
    if (tensionSrc === src) tensionSrc = null
  }
}

function stopTension(seconds: number) {
  muteTension(seconds)
  const src = tensionSrc
  if (!src || !ctx) return
  try {
    src.stop(ctx.currentTime + seconds + 0.05)
  } catch {
    /* already stopped */
  }
}

function startChaseNow() {
  const ac = audio()
  if (!ac || !chaseGain) return
  const buf = buffers.chase
  if (!buf) {
    chaseWanted = true
    void loadClips()
    return
  }
  muteTension(0.08)
  stopTension(0.12)
  if (chaseOn && chaseSrc) {
    chaseWanted = true
    chaseDucked = false
    return
  }
  stopChaseSource(0.02)
  const src = ac.createBufferSource()
  src.buffer = buf
  src.loop = true
  src.connect(chaseGain)
  const t = ac.currentTime
  chaseGain.gain.cancelScheduledValues(t)
  chaseGain.gain.setValueAtTime(0.0001, t)
  chaseGain.gain.linearRampToValueAtTime(CHASE_VOL, t + CHASE_FADE_IN)
  src.start()
  chaseSrc = src
  chaseOn = true
  chaseWanted = true
  chaseDucked = false
  src.onended = () => {
    if (chaseSrc === src) chaseSrc = null
  }
}

function stopChaseSource(fade: number) {
  const ac = ctx
  const src = chaseSrc
  chaseSrc = null
  chaseOn = false
  if (!ac || !chaseGain) return
  ramp(chaseGain, 0, fade)
  if (!src) return
  try {
    src.stop(ac.currentTime + fade + 0.06)
  } catch {
    /* already stopped */
  }
}

export function haltHeistSfx() {
  chaseWanted = false
  chasePreview = false
  stopChaseSource(0.2)
  stopTension(0.2)
  ramp(safeGain, 0, 0.12)
  ramp(ambientGain, 0, 0.18)
}

export const heistSfx = {
  pickup() {
    const ac = audio()
    if (!ac) return
    pickupTone(ac, 784, 0.1, 'triangle', 0.16)
    pickupTone(ac, 1176, 0.12, 'sine', 0.1, 0.022)
    pickupTone(ac, 1568, 0.1, 'sine', 0.055, 0.045)
  },

  dash() {
    const ac = audio()
    if (!ac) return
    noiseBurst(ac, shotGain ?? ac.destination, 0.055, 0.1, 900, 0, 0.8)
    pickupTone(ac, 220, 0.09, 'sine', 0.05)
  },

  sneak() {
    const ac = audio()
    if (!ac) return
    noiseBurst(ac, shotGain ?? ac.destination, 0.028, 0.08, 280, 0, 1.4)
    pickupTone(ac, 180, 0.07, 'sine', 0.03)
  },

  step(sneak: boolean) {
    const ac = audio()
    if (!ac) return
    const now = ac.currentTime
    if (now - lastStepAt < (sneak ? 0.42 : 0.28)) return
    lastStepAt = now
    noiseBurst(ac, shotGain ?? ac.destination, sneak ? 0.01 : 0.02, 0.04, sneak ? 420 : 680, 0, 1.1)
  },

  doorHack() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    noiseBurst(ac, dest, 0.04, 0.05, 1800, 0, 3)
    pickupTone(ac, 540, 0.07, 'square', 0.03)
  },

  doorUnlock() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    const t = ac.currentTime
    noiseBurst(ac, dest, 0.05, 0.1, 1200, 0, 1.4)
    const g = env(ac, dest, t, 0.05, 0.01, 0.22)
    osc(ac, g, 180, 'triangle', t, t + 0.24)
  },

  uiTap() {
    const ac = audio()
    if (!ac) return
    pickupTone(ac, 660, 0.05, 'sine', 0.035)
  },

  cameraAlert() {
    const ac = audio()
    if (!ac) return
    void loadClips()
    if (chaseWanted || chaseOn) return
    if (buffers.camera) fireShot('camera', 0.72)
    else {
      pickupTone(ac, 880, 0.08, 'square', 0.05)
      pickupTone(ac, 1320, 0.1, 'sine', 0.04, 0.05)
    }
    startTensionLoop()
    ramp(tensionGain, TENSION_CAM, 0.2)
  },

  investigateStart() {
    const ac = audio()
    if (!ac) return
    void loadClips()
    if (chaseWanted || chaseOn) return
    if (buffers.investigate) {
      startTensionLoop()
    } else {
      pickupTone(ac, 240, 0.12, 'triangle', 0.04)
    }
    startTensionLoop()
    ramp(tensionGain, TENSION_INV, 0.16)
  },

  chaseStart() {
    const ac = audio()
    if (!ac) return
    chaseWanted = true
    startChaseNow()
  },

  chaseStop() {
    chaseWanted = false
    chasePreview = false
    stopChaseSource(CHASE_FADE)
  },

  toggleChasePreview() {
    const ac = audio()
    if (!ac) return
    if (chaseOn && !chasePreview) return
    if (chasePreview || chaseOn || chaseWanted) {
      chasePreview = false
      chaseWanted = false
      stopChaseSource(CHASE_FADE)
      return
    }
    chasePreview = true
    chaseWanted = true
    startChaseNow()
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

  siren() {
    const ac = audio()
    if (!ac) return
    const dest = shotGain ?? ac.destination
    const t = ac.currentTime
    noiseBurst(ac, dest, 0.05, 0.1, 1400, 0, 1.2)
    for (let i = 0; i < 3; i += 1) {
      const at = t + i * 0.4
      const g = env(ac, dest, at, 0.07, 0.03, 0.34)
      const o = osc(ac, g, 520, 'sawtooth', at, at + 0.38)
      o.frequency.exponentialRampToValueAtTime(920, at + 0.2)
      o.frequency.exponentialRampToValueAtTime(520, at + 0.36)
    }
  },

  exit() {
    const ac = audio()
    if (!ac) return
    haltHeistSfx()
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
    haltHeistSfx()
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
    if (!ac || !safeGain || !chaseGain || !tensionGain) return

    if (mood.ended || mood.paused) {
      const fade = mood.ended ? 0.35 : 0.16
      if (mood.ended) {
        chaseWanted = false
        chasePreview = false
        stopChaseSource(fade)
        stopTension(fade)
      } else {
        chaseDucked = true
        ramp(chaseGain, 0, fade)
        ramp(tensionGain, 0, fade)
      }
      ramp(safeGain, 0, 0.12)
      ramp(ambientGain, mood.ended ? 0 : 0.012, 0.2)
      return
    }

    ramp(ambientGain, mood.chasing ? 0.01 : 0.028, 0.4)

    if (mood.chasing) {
      chasePreview = false
      if (!chaseOn) startChaseNow()
      else if (chaseDucked) {
        chaseDucked = false
        ramp(chaseGain, CHASE_VOL, CHASE_FADE_IN)
      }
    } else if (chasePreview) {
      if (!chaseOn) startChaseNow()
      else if (chaseDucked) {
        chaseDucked = false
        ramp(chaseGain, CHASE_VOL, CHASE_FADE_IN)
      }
    } else if (chaseOn || chaseWanted) {
      chaseWanted = false
      stopChaseSource(CHASE_FADE)
    }

    if (!mood.chasing) {
      if (mood.cameraHot || mood.investigating) {
        startTensionLoop()
        ramp(tensionGain, mood.investigating ? TENSION_INV : TENSION_CAM, 0.2)
      } else {
        ramp(tensionGain, 0, 1.1)
      }
    }

    ramp(safeGain, mood.cracking ? 0.03 : 0, 0.16)
    const now = ac.currentTime
    if (mood.cracking && now - lastSafeTickAt >= 0.32) {
      lastSafeTickAt = now
      const dest = shotGain ?? ac.destination
      const g = env(ac, dest, now, 0.014, 0.003, 0.04)
      osc(ac, g, 1240, 'sine', now, now + 0.045)
    }
  },
}
