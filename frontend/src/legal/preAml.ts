import { STORAGE_KEYS } from '../constants'

export type PreAmlRecord = {
  acceptedAt: number
  age18: boolean
  ownBehalf: boolean
  notSanctioned: boolean
  lawfulSource: boolean
}

function isRecord(value: unknown): value is PreAmlRecord {
  if (!value || typeof value !== 'object') return false
  const rec = value as PreAmlRecord
  return (
    typeof rec.acceptedAt === 'number' &&
    rec.age18 === true &&
    rec.ownBehalf === true &&
    rec.notSanctioned === true &&
    rec.lawfulSource === true
  )
}

export function readPreAml(): PreAmlRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.preAml)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function writePreAml(record: PreAmlRecord) {
  localStorage.setItem(STORAGE_KEYS.preAml, JSON.stringify(record))
}

export function hasCompletedPreAml() {
  return readPreAml() !== null
}
