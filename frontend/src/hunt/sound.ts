const STORAGE_KEY = 'duckjackpot.hunt.sound'

let ctx: AudioContext | null = null

export function huntSoundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function setHuntSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function beep(freq: number, duration: number, type: OscillatorType, gain = 0.08) {
  if (!huntSoundEnabled()) return
  const ac = audio()
  if (!ac) return
  const osc = ac.createOscillator()
  const node = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  node.gain.setValueAtTime(gain, ac.currentTime)
  node.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  osc.connect(node)
  node.connect(ac.destination)
  osc.start()
  osc.stop(ac.currentTime + duration)
}

export function huntShotSound() {
  beep(180, 0.07, 'square', 0.05)
}

export function huntHitSound() {
  beep(620, 0.12, 'triangle', 0.09)
}

export function huntMissSound() {
  beep(140, 0.16, 'sawtooth', 0.04)
}

export function huntWinSound() {
  beep(523, 0.12, 'triangle', 0.08)
  window.setTimeout(() => beep(659, 0.12, 'triangle', 0.08), 90)
  window.setTimeout(() => beep(784, 0.18, 'triangle', 0.09), 180)
}

export function huntFailSound() {
  beep(220, 0.18, 'sawtooth', 0.06)
  window.setTimeout(() => beep(110, 0.28, 'sawtooth', 0.05), 140)
}
