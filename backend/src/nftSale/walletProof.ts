import { createHash, randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Address, Cell, contractAddress, loadStateInit, type StateInit } from '@ton/core'
import { signVerify } from '@ton/crypto'
import {
  WalletContractV1R1,
  WalletContractV1R2,
  WalletContractV1R3,
  WalletContractV2R1,
  WalletContractV2R2,
  WalletContractV3R1,
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5R1,
} from '@ton/ton'
import { enqueueDataOp, writeJsonAtomic } from '../dataQueue.js'
import { NFT_SALE_DIR } from './store.js'
import { PROOF_FUTURE_SKEW_S, PROOF_TTL_S } from './config.js'

/**
 * TON Connect `ton_proof` (https://docs.ton.org/develop/dapps/ton-connect/sign):
 * the server issues a single-use nonce (payload) for a Telegram user; the wallet signs
 *   sha256(0xffff ‖ "ton-connect" ‖ sha256("ton-proof-item-v2/" ‖ wc ‖ addr ‖ domainLen ‖ domain ‖ ts ‖ payload))
 * and the server checks: nonce (issued to this user, unused, fresh), domain, timestamp,
 * address = contractAddress(walletStateInit), public key from that state init, Ed25519 signature.
 */
const NONCES_FILE = join(NFT_SALE_DIR, 'proof-nonces.json')
type Nonce = { telegramUserId: number; createdAt: number; expiresAt: number; usedAt?: number }

function readNonces(): Record<string, Nonce> {
  if (!existsSync(NONCES_FILE)) return {}
  try {
    return JSON.parse(readFileSync(NONCES_FILE, 'utf8')) as Record<string, Nonce>
  } catch {
    throw new Error('nft_store_unreadable')
  }
}
function writeNonces(all: Record<string, Nonce>) {
  mkdirSync(NFT_SALE_DIR, { recursive: true })
  const cutoff = Date.now() - 24 * 3600_000
  for (const [k, v] of Object.entries(all)) if (v.expiresAt < cutoff) delete all[k]
  writeJsonAtomic(NONCES_FILE, all)
}

export function issueNonce(telegramUserId: number, now = Date.now()) {
  return enqueueDataOp('nft:nonce', undefined, () => {
    const all = readNonces()
    const payload = randomBytes(32).toString('hex')
    all[payload] = { telegramUserId, createdAt: now, expiresAt: now + PROOF_TTL_S * 1000 }
    writeNonces(all)
    return { payload, expiresAt: all[payload].expiresAt }
  })
}

/** Burns the nonce on first use — valid or not — so it can never be replayed or brute-forced. */
export function consumeNonce(payload: string, telegramUserId: number, now = Date.now()) {
  return enqueueDataOp('nft:nonce-use', undefined, () => {
    const all = readNonces()
    const n = all[payload]
    if (!n) return 'unknown_nonce' as const
    if (n.usedAt) return 'nonce_reused' as const
    n.usedAt = now
    writeNonces(all)
    if (n.telegramUserId !== telegramUserId) return 'nonce_other_user' as const
    if (n.expiresAt < now) return 'nonce_expired' as const
    return 'ok' as const
  })
}

// ---------- signature ----------

export type ProofInput = {
  address: string
  network: string
  publicKey?: string
  walletStateInit: string
  proof: { timestamp: number; domain: { lengthBytes: number; value: string }; payload: string; signature: string }
}

const sha256 = (b: Buffer) => createHash('sha256').update(b).digest()

export function proofMessageHash(address: Address, domain: string, timestamp: number, payload: string) {
  const wc = Buffer.alloc(4)
  wc.writeInt32BE(address.workChain)
  const dl = Buffer.alloc(4)
  dl.writeUInt32LE(Buffer.byteLength(domain))
  const ts = Buffer.alloc(8)
  ts.writeBigUInt64LE(BigInt(timestamp))
  const msg = Buffer.concat([Buffer.from('ton-proof-item-v2/'), wc, address.hash, dl, Buffer.from(domain), ts, Buffer.from(payload)])
  return sha256(Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from('ton-connect'), sha256(msg)]))
}

/** Known standard wallets: code hash → where the public key sits in the data cell. */
const zero = Buffer.alloc(32)
const WALLETS: { name: string; codeHash: string; readKey: (data: Cell) => Buffer }[] = [
  ...[WalletContractV1R1, WalletContractV1R2, WalletContractV1R3, WalletContractV2R1, WalletContractV2R2].map((W) => ({
    name: W.name,
    codeHash: W.create({ workchain: 0, publicKey: zero }).init.code.hash().toString('hex'),
    readKey: (d: Cell) => {
      const s = d.beginParse()
      s.skip(32)
      return s.loadBuffer(32)
    },
  })),
  ...[WalletContractV3R1, WalletContractV3R2, WalletContractV4].map((W) => ({
    name: W.name,
    codeHash: W.create({ workchain: 0, publicKey: zero }).init.code.hash().toString('hex'),
    readKey: (d: Cell) => {
      const s = d.beginParse()
      s.skip(64)
      return s.loadBuffer(32)
    },
  })),
  {
    name: 'WalletContractV5R1',
    codeHash: WalletContractV5R1.create({ workchain: 0, publicKey: zero }).init.code.hash().toString('hex'),
    readKey: (d: Cell) => {
      const s = d.beginParse()
      s.skip(1 + 32 + 32)
      return s.loadBuffer(32)
    },
  },
]

export function publicKeyFromStateInit(init: StateInit) {
  if (!init.code || !init.data) return null
  const w = WALLETS.find((x) => x.codeHash === init.code!.hash().toString('hex'))
  if (!w) return null
  try {
    return { key: w.readKey(init.data), wallet: w.name }
  } catch {
    return null
  }
}

export type ProofResult =
  | { ok: true; address: Address; publicKey: string; wallet: string }
  | { ok: false; reason: string }

/**
 * Pure check of a proof (the nonce is consumed separately). `network` must be the TON testnet
 * ("-3") in Phase 1; `domains` are the allowed manifest hosts.
 */
export function verifyTonProof(input: ProofInput, opts: { domains: string[]; now?: number; expectedNetwork: string }): ProofResult {
  const now = Math.floor((opts.now ?? Date.now()) / 1000)
  const p = input?.proof
  if (!p || typeof p.payload !== 'string' || typeof p.signature !== 'string' || typeof p.timestamp !== 'number' || !p.domain) return { ok: false, reason: 'bad_proof' }
  if (String(input.network) !== opts.expectedNetwork) return { ok: false, reason: 'wrong_network' }
  let address: Address
  try {
    address = Address.parse(input.address)
  } catch {
    return { ok: false, reason: 'bad_address' }
  }
  const domain = String(p.domain.value ?? '').toLowerCase()
  if (!opts.domains.includes(domain) || p.domain.lengthBytes !== Buffer.byteLength(String(p.domain.value))) return { ok: false, reason: 'wrong_domain' }
  if (now - p.timestamp > PROOF_TTL_S) return { ok: false, reason: 'proof_expired' }
  if (p.timestamp - now > PROOF_FUTURE_SKEW_S) return { ok: false, reason: 'proof_from_future' }
  let init: StateInit
  try {
    init = loadStateInit(Cell.fromBase64(input.walletStateInit).beginParse())
  } catch {
    return { ok: false, reason: 'bad_state_init' }
  }
  // the state init must be THIS address's: then the key inside it is the address's key
  if (!contractAddress(address.workChain, init).equals(address)) return { ok: false, reason: 'address_mismatch' }
  const pk = publicKeyFromStateInit(init)
  if (!pk) return { ok: false, reason: 'unsupported_wallet' }
  if (input.publicKey && input.publicKey.toLowerCase() !== pk.key.toString('hex')) return { ok: false, reason: 'public_key_mismatch' }
  let signature: Buffer
  try {
    signature = Buffer.from(p.signature, 'base64')
  } catch {
    return { ok: false, reason: 'bad_signature' }
  }
  if (signature.length !== 64) return { ok: false, reason: 'bad_signature' }
  if (!signVerify(proofMessageHash(address, String(p.domain.value), p.timestamp, p.payload), signature, pk.key)) return { ok: false, reason: 'bad_signature' }
  return { ok: true, address, publicKey: pk.key.toString('hex'), wallet: pk.wallet }
}
