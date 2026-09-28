import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { account, makeWallet, signProof } from './helpers.js'

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'nft-proof-'))
const { verifyTonProof, issueNonce, consumeNonce } = await import('../../src/nftSale/walletProof.js')

const OPTS = { domains: ['duckjackpot.vercel.app'], expectedNetwork: '-3' }
const input = (w: Awaited<ReturnType<typeof makeWallet>>, proof: ReturnType<typeof signProof>, chain = '-3') => {
  const a = account(w, chain)
  return { address: a.address, network: a.chain, publicKey: a.publicKey, walletStateInit: a.walletStateInit, proof }
}

test('valid ton_proof — wallet v4', async () => {
  const w = await makeWallet('v4')
  const r = verifyTonProof(input(w, signProof(w, { payload: 'abc123' })), OPTS)
  assert.equal(r.ok, true)
  assert.ok(r.ok && r.address.equals(w.address))
})

test('valid ton_proof — wallet v5r1 (W5, Tonkeeper default)', async () => {
  const w = await makeWallet('v5r1')
  assert.equal(verifyTonProof(input(w, signProof(w, { payload: 'p-w5' })), OPTS).ok, true)
})

test('invalid proof: tampered payload / signature by another key', async () => {
  const w = await makeWallet()
  const p = signProof(w, { payload: 'nonce-1' })
  assert.deepEqual(verifyTonProof(input(w, { ...p, payload: 'nonce-2' }), OPTS), { ok: false, reason: 'bad_signature' })
  const thief = await makeWallet()
  const forged = signProof(thief, { payload: 'nonce-1', address: w.address })
  assert.deepEqual(verifyTonProof(input(w, forged), OPTS), { ok: false, reason: 'bad_signature' })
})

test('fake wallet: someone else\'s address with the attacker\'s own state init → address_mismatch', async () => {
  const victim = await makeWallet()
  const attacker = await makeWallet()
  const p = signProof(attacker, { payload: 'x', address: victim.address })
  const r = verifyTonProof({ ...input(attacker, p), address: victim.address.toRawString() }, OPTS)
  assert.deepEqual(r, { ok: false, reason: 'address_mismatch' })
})

test('public key in the request must match the state init', async () => {
  const w = await makeWallet()
  const other = await makeWallet()
  const r = verifyTonProof({ ...input(w, signProof(w, { payload: 'k' })), publicKey: other.publicKey.toString('hex') }, OPTS)
  assert.deepEqual(r, { ok: false, reason: 'public_key_mismatch' })
})

test('expired proof (older than 15 min) and proof from the future', async () => {
  const w = await makeWallet()
  const old = signProof(w, { payload: 'e', timestamp: Math.floor(Date.now() / 1000) - 16 * 60 })
  assert.deepEqual(verifyTonProof(input(w, old), OPTS), { ok: false, reason: 'proof_expired' })
  const future = signProof(w, { payload: 'f', timestamp: Math.floor(Date.now() / 1000) + 5 * 60 })
  assert.deepEqual(verifyTonProof(input(w, future), OPTS), { ok: false, reason: 'proof_from_future' })
})

test('wrong domain', async () => {
  const w = await makeWallet()
  const p = signProof(w, { payload: 'd', domain: 'evil.example' })
  assert.deepEqual(verifyTonProof(input(w, p), OPTS), { ok: false, reason: 'wrong_domain' })
  const lying = { ...signProof(w, { payload: 'd' }), domain: { lengthBytes: 3, value: 'duckjackpot.vercel.app' } }
  assert.deepEqual(verifyTonProof(input(w, lying), OPTS), { ok: false, reason: 'wrong_domain' })
})

test('mainnet wallet is refused in Phase 1 (testnet only)', async () => {
  const w = await makeWallet()
  assert.deepEqual(verifyTonProof(input(w, signProof(w, { payload: 'm' }), '-239'), OPTS), { ok: false, reason: 'wrong_network' })
})

test('nonce: single use, bound to the Telegram user, expires', async () => {
  const a = await issueNonce(111)
  assert.equal(await consumeNonce(a.payload, 111), 'ok')
  assert.equal(await consumeNonce(a.payload, 111), 'nonce_reused')
  const b = await issueNonce(111)
  assert.equal(await consumeNonce(b.payload, 222), 'nonce_other_user')
  assert.equal(await consumeNonce(b.payload, 111), 'nonce_reused', 'a nonce is burned even by a failed attempt')
  const c = await issueNonce(111, Date.now() - 20 * 60_000)
  assert.equal(await consumeNonce(c.payload, 111), 'nonce_expired')
  assert.equal(await consumeNonce('f'.repeat(64), 111), 'unknown_nonce')
})
