import { createHash } from 'node:crypto'
import { beginCell, storeStateInit, type Address, type StateInit } from '@ton/core'
import { keyPairFromSeed, mnemonicNew, mnemonicToPrivateKey, sign } from '@ton/crypto'
import { randomBytes } from 'node:crypto'
import { WalletContractV4, WalletContractV5R1 } from '@ton/ton'

/**
 * A test wallet that answers TON Connect's ton_proof like a real wallet does.
 * The signing construction is written here independently from src/nftSale/walletProof.ts
 * (straight from the TON Connect spec), so the verifier is checked against the spec, not itself.
 */
export type TestWallet = { address: Address; stateInit: string; publicKey: Buffer; secretKey: Buffer }

export async function makeWallet(kind: 'v4' | 'v5r1' = 'v4'): Promise<TestWallet> {
  const keys = kind === 'v4' ? await mnemonicToPrivateKey(await mnemonicNew(24)) : keyPairFromSeed(randomBytes(32))
  const w = kind === 'v4' ? WalletContractV4.create({ workchain: 0, publicKey: keys.publicKey }) : WalletContractV5R1.create({ workchain: 0, publicKey: keys.publicKey })
  return { address: w.address, stateInit: stateInitBoc(w.init), publicKey: keys.publicKey, secretKey: keys.secretKey }
}

export function stateInitBoc(init: StateInit) {
  return beginCell().store(storeStateInit(init)).endCell().toBoc().toString('base64')
}

export function signProof(w: TestWallet, opts: { payload: string; domain?: string; timestamp?: number; address?: Address }) {
  const domain = opts.domain ?? 'duckjackpot.vercel.app'
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000)
  const addr = opts.address ?? w.address
  const wc = Buffer.alloc(4)
  wc.writeInt32BE(addr.workChain)
  const len = Buffer.alloc(4)
  len.writeUInt32LE(Buffer.from(domain).length)
  const ts = Buffer.alloc(8)
  ts.writeBigUInt64LE(BigInt(timestamp))
  const message = Buffer.concat([Buffer.from('ton-proof-item-v2/', 'utf8'), wc, addr.hash, len, Buffer.from(domain, 'utf8'), ts, Buffer.from(opts.payload, 'utf8')])
  const inner = createHash('sha256').update(message).digest()
  const full = createHash('sha256')
    .update(Buffer.concat([Buffer.from('ffff', 'hex'), Buffer.from('ton-connect', 'utf8'), inner]))
    .digest()
  return { timestamp, domain: { lengthBytes: Buffer.from(domain).length, value: domain }, payload: opts.payload, signature: sign(full, w.secretKey).toString('base64') }
}

/** A TON Connect `account` for a wallet on testnet ("-3"). */
export function account(w: TestWallet, chain = '-3') {
  return { address: w.address.toRawString(), chain, publicKey: w.publicKey.toString('hex'), walletStateInit: w.stateInit }
}
