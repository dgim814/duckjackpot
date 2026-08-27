import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'

export type PayWallets = {
  merchantWallet: string
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

function readFile(): PayWallets {
  try {
    if (!existsSync(FILE)) return { merchantWallet: '', usdtTrc20Address: '' }
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Partial<PayWallets>
    return {
      merchantWallet: typeof parsed.merchantWallet === 'string' ? parsed.merchantWallet.trim() : '',
      usdtTrc20Address: typeof parsed.usdtTrc20Address === 'string' ? parsed.usdtTrc20Address.trim() : '',
    }
  } catch {
    return { merchantWallet: '', usdtTrc20Address: '' }
  }
}

export function getPayWallets(): PayWallets {
  return readFile()
}

export function savePayWallets(patch: Partial<PayWallets>): PayWallets {
  const current = readFile()
  const next: PayWallets = {
    merchantWallet:
      typeof patch.merchantWallet === 'string' ? patch.merchantWallet.trim() : current.merchantWallet,
    usdtTrc20Address:
      typeof patch.usdtTrc20Address === 'string' ? patch.usdtTrc20Address.trim() : current.usdtTrc20Address,
  }
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(next, null, 2))
  return next
}
