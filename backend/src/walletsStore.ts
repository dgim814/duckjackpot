import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export type PayWallets = {
  tonAddress: string
  usdtTrc20Address: string
}

const FILE = join(DATA_DIR, 'wallets.json')

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

function readFile(): PayWallets {
  try {
    if (!existsSync(FILE)) return { tonAddress: '', usdtTrc20Address: '' }
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, unknown>
    return {
      tonAddress: asAddress(parsed.tonAddress) || asAddress(parsed.merchantWallet),
      usdtTrc20Address: asAddress(parsed.usdtTrc20Address),
    }
  } catch {
    return { tonAddress: '', usdtTrc20Address: '' }
  }
}

export function getPayWallets(): PayWallets {
  return readFile()
}

export function savePayWallets(patch: Partial<PayWallets>): PayWallets {
  const current = readFile()
  const next: PayWallets = {
    tonAddress: typeof patch.tonAddress === 'string' ? patch.tonAddress.trim() : current.tonAddress,
    usdtTrc20Address:
      typeof patch.usdtTrc20Address === 'string' ? patch.usdtTrc20Address.trim() : current.usdtTrc20Address,
  }
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(next, null, 2))
  return next
}
