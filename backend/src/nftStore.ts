import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export const NFT_RAFFLE_IDS = ['classic', 'fast200', 'fast100'] as const
export type NftRaffleId = (typeof NFT_RAFFLE_IDS)[number]

const NFT_DIR = join(DATA_DIR, 'nft')
const INDEX_FILE = join(NFT_DIR, 'index.json')

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

type Index = Partial<Record<NftRaffleId, { file: string; mime: string; updatedAt: number }>>

export function isNftRaffleId(value: string): value is NftRaffleId {
  return (NFT_RAFFLE_IDS as readonly string[]).includes(value)
}

function readIndex(): Index {
  try {
    if (!existsSync(INDEX_FILE)) return {}
    const parsed = JSON.parse(readFileSync(INDEX_FILE, 'utf8')) as Index
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeIndex(index: Index) {
  mkdirSync(NFT_DIR, { recursive: true })
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2))
}

export function listNftMeta() {
  const index = readIndex()
  const result: Record<NftRaffleId, { updatedAt: number } | null> = {
    classic: null,
    fast200: null,
    fast100: null,
  }
  for (const id of NFT_RAFFLE_IDS) {
    const entry = index[id]
    if (!entry) continue
    const path = join(NFT_DIR, entry.file)
    if (existsSync(path)) result[id] = { updatedAt: entry.updatedAt }
  }
  return result
}

export function getNftFile(raffleId: NftRaffleId) {
  const entry = readIndex()[raffleId]
  if (!entry) return null
  const path = join(NFT_DIR, entry.file)
  if (!existsSync(path)) return null
  return { path, mime: entry.mime }
}

export function saveNftFile(raffleId: NftRaffleId, mime: string, buffer: Buffer) {
  const ext = MIME_EXT[mime]
  if (!ext) throw new Error('unsupported_type')
  if (buffer.length < 32) throw new Error('empty_file')
  if (buffer.length > 6 * 1024 * 1024) throw new Error('too_large')
  mkdirSync(NFT_DIR, { recursive: true })
  const index = readIndex()
  const prev = index[raffleId]
  if (prev) {
    const prevPath = join(NFT_DIR, prev.file)
    if (existsSync(prevPath)) unlinkSync(prevPath)
  }
  const file = `${raffleId}.${ext}`
  const updatedAt = Date.now()
  writeFileSync(join(NFT_DIR, file), buffer)
  index[raffleId] = { file, mime, updatedAt }
  writeIndex(index)
  return { updatedAt }
}

export function deleteNftFile(raffleId: NftRaffleId) {
  const index = readIndex()
  const prev = index[raffleId]
  if (prev) {
    const prevPath = join(NFT_DIR, prev.file)
    if (existsSync(prevPath)) unlinkSync(prevPath)
    delete index[raffleId]
    writeIndex(index)
  }
}
