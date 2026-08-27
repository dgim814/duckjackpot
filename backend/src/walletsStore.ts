import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DATA_DIR } from './config.js'

export type PayWallets = {
  tonAddress: string
  usdtTrc20Address: string
}

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const WALLETS_DIR = existsSync('/data') ? '/data' : DATA_DIR
const FILE = join(WALLETS_DIR, 'wallets.json')
const LEGACY_FILE = join(backendRoot, 'data', 'wallets.json')

let cache: PayWallets | null = null

export function isTronPayAddress(value: string) {
  const address = value.trim()
  return address.startsWith('T') && address.length === 34
}

export function isTonPayAddress(value: string) {
  const address = value.trim()
  if (address.startsWith('EQ') || address.startsWith('UQ')) return address.length === 48
  return /^-?\d+:[0-9a-fA-F]{64}$/.test(address)
}

function asAddress(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function empty(): PayWallets {
  return { tonAddress: '', usdtTrc20Address: '' }
}

function parseWallets(raw: string): PayWallets {
  const parsed = JSON.parse(raw) as Record<string, unknown>
  return {
    tonAddress: asAddress(parsed.tonAddress) || asAddress(parsed.merchantWallet),
    usdtTrc20Address: asAddress(parsed.usdtTrc20Address),
  }
}

function readDisk(path: string): PayWallets | null {
  try {
    if (!existsSync(path)) return null
    return parseWallets(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function migrateIfNeeded() {
  if (existsSync(FILE)) return
  const legacy = readDisk(LEGACY_FILE)
  if (!legacy || (!legacy.tonAddress && !legacy.usdtTrc20Address)) return
  if (LEGACY_FILE === FILE) return
  mkdirSync(dirname(FILE), { recursive: true })
  copyFileSync(LEGACY_FILE, FILE)
}

export function walletsFilePath() {
  return FILE
}

export function loadWalletsFromDisk(): PayWallets {
  mkdirSync(WALLETS_DIR, { recursive: true })
  migrateIfNeeded()
  cache = readDisk(FILE) ?? empty()
  console.log(`[wallets] ${FILE}`, {
    ton: cache.tonAddress ? `${cache.tonAddress.slice(0, 6)}…${cache.tonAddress.slice(-4)}` : '(empty)',
    usdt: cache.usdtTrc20Address ? `${cache.usdtTrc20Address.slice(0, 6)}…${cache.usdtTrc20Address.slice(-4)}` : '(empty)',
  })
  return cache
}

loadWalletsFromDisk()

export function getPayWallets(): PayWallets {
  const fromDisk = readDisk(FILE)
  if (fromDisk) {
    cache = fromDisk
    return fromDisk
  }
  if (!cache) cache = empty()
  return cache
}

export function savePayWallets(patch: Partial<PayWallets>): PayWallets {
  const current = getPayWallets()
  const next: PayWallets = {
    tonAddress: typeof patch.tonAddress === 'string' ? patch.tonAddress.trim() : current.tonAddress,
    usdtTrc20Address:
      typeof patch.usdtTrc20Address === 'string' ? patch.usdtTrc20Address.trim() : current.usdtTrc20Address,
  }
  mkdirSync(dirname(FILE), { recursive: true })
  const json = JSON.stringify(next, null, 2)
  writeFileSync(FILE, json, 'utf8')
  const verified = readDisk(FILE)
  if (!verified || verified.tonAddress !== next.tonAddress || verified.usdtTrc20Address !== next.usdtTrc20Address) {
    throw new Error(`wallets_write_failed:${FILE}`)
  }
  cache = verified
  console.log(`[wallets] saved ${FILE}`)
  return cache
}
