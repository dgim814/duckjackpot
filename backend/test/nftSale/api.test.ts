import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { account, makeWallet, signProof } from './helpers.js'

/** HTTP-level: the real server (sandbox chain), a client that tries to cheat at every step. */
const BACKEND = join(fileURLToPath(new URL('.', import.meta.url)), '../..')
const TOKEN = '7000009:TEST-nft-sale-token'
const ADMIN = 'nft-admin-test'
const servers: ChildProcess[] = []

async function startServer(port: number, env: Record<string, string>) {
  const child = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: BACKEND,
    env: {
      ...process.env,
      NODE_ENV: '',
      TELEGRAM_BOT_TOKEN: TOKEN,
      TELEGRAM_API_BASE: 'http://127.0.0.1:9',
      SUPPORT_BOT_TOKEN: '',
      ADMIN_PASSWORD: ADMIN,
      DATA_DIR: mkdtempSync(join(tmpdir(), 'nft-api-')),
      PORT: String(port),
      NFT_SANDBOX_DELAY_MS: '150',
      NFT_WORKER_INTERVAL_MS: '400',
      ...env,
    },
    stdio: 'ignore',
  })
  servers.push(child)
  const base = `http://127.0.0.1:${port}`
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) return base
    } catch {
      /* booting */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('server did not start')
}
after(() => servers.forEach((s) => s.kill()))

function initData(id: number, token = TOKEN) {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), query_id: `Q${id}`, user: JSON.stringify({ id, first_name: `U${id}`, username: `u${id}` }) })
  const dcs = [...p.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n')
  p.set('hash', createHmac('sha256', createHmac('sha256', 'WebAppData').update(token).digest()).update(dcs).digest('hex'))
  return p.toString()
}
const call = async (base: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const r = await fetch(`${base}${path}`, body === undefined ? { headers } : { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
  return { status: r.status, body: (await r.json().catch(() => ({}))) as Record<string, any> }
}
async function linkWallet(base: string, uid: number) {
  const w = await makeWallet()
  const { body } = await call(base, '/api/nft-sale/wallet/nonce', { initData: initData(uid) })
  const r = await call(base, '/api/nft-sale/wallet/verify', { initData: initData(uid), account: account(w), proof: signProof(w, { payload: body.payload }) })
  assert.equal(r.status, 200, JSON.stringify(r.body))
  return w
}
async function until<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 30_000) {
  const end = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (ok(v) || Date.now() > end) return v
    await new Promise((r) => setTimeout(r, 400))
  }
}

const USER_ENDPOINTS: [string, Record<string, unknown>][] = [
  ['/api/nft-sale/me', {}],
  ['/api/nft-sale/wallet/nonce', {}],
  ['/api/nft-sale/wallet/verify', {}],
  ['/api/nft-sale/wallet/disconnect', {}],
  ['/api/nft-sale/orders', {}],
  ['/api/nft-sale/orders/status', { orderId: 'x' }],
  ['/api/nft-sale/orders/test-pay', { orderId: 'x' }],
]

describe('sale ON (testnet sandbox)', () => {
  let base = ''
  before(async () => {
    base = await startServer(3411, { NFT_SALE_ENABLED: 'true', NFT_CHAIN: 'sandbox' })
    await until(() => call(base, '/api/nft-sale/config'), (r) => r.body.chainReady === true)
  })

  test('config: testnet, 2000, TESTNET ONLY, next #1, no real price', async () => {
    const { body } = await call(base, '/api/nft-sale/config')
    assert.equal(body.enabled, true)
    assert.equal(body.network, 'testnet')
    assert.equal(body.supply, 2000)
    assert.equal(body.nextNumber, 1)
    assert.equal(body.priceLabel, 'TESTNET ONLY')
    assert.equal(body.testPayments, true)
  })

  test('security: no initData / fake Telegram ID / forged / other bot → 401 on every user endpoint', async () => {
    for (const [path, body] of USER_ENDPOINTS) {
      assert.equal((await call(base, path, body)).status, 401, path)
      assert.equal((await call(base, path, { ...body, telegramId: 5, telegramUserId: 5 })).status, 401, path)
      const forged = initData(6).replace(encodeURIComponent('"id":6'), encodeURIComponent('"id":7'))
      assert.equal((await call(base, path, { ...body, initData: forged })).status, 401, path)
      assert.equal((await call(base, path, { ...body, initData: initData(8, '1:OTHER') })).status, 401, path)
    }
  })

  test('wallet: valid ton_proof links the wallet; replay, wrong domain, fake wallet, other user\'s nonce fail', async () => {
    const w = await makeWallet()
    const n1 = (await call(base, '/api/nft-sale/wallet/nonce', { initData: initData(21) })).body.payload
    const proof = signProof(w, { payload: n1 })
    const ok = await call(base, '/api/nft-sale/wallet/verify', { initData: initData(21), account: account(w), proof })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.wallet.network, 'testnet')
    const replay = await call(base, '/api/nft-sale/wallet/verify', { initData: initData(21), account: account(w), proof })
    assert.deepEqual([replay.status, replay.body.error], [401, 'nonce_reused'])

    const n2 = (await call(base, '/api/nft-sale/wallet/nonce', { initData: initData(21) })).body.payload
    const bad = await call(base, '/api/nft-sale/wallet/verify', { initData: initData(21), account: account(w), proof: signProof(w, { payload: n2, domain: 'evil.example' }) })
    assert.deepEqual([bad.status, bad.body.error], [401, 'wrong_domain'])

    const victim = await makeWallet()
    const n3 = (await call(base, '/api/nft-sale/wallet/nonce', { initData: initData(22) })).body.payload
    const fake = await call(base, '/api/nft-sale/wallet/verify', { initData: initData(22), account: { ...account(w), address: victim.address.toRawString() }, proof: signProof(w, { payload: n3, address: victim.address }) })
    assert.deepEqual([fake.status, fake.body.error], [401, 'address_mismatch'])

    const n4 = (await call(base, '/api/nft-sale/wallet/nonce', { initData: initData(23) })).body.payload
    const stolen = await call(base, '/api/nft-sale/wallet/verify', { initData: initData(24), account: account(w), proof: signProof(w, { payload: n4 }) })
    assert.deepEqual([stolen.status, stolen.body.error], [401, 'nonce_other_user'])

    const me = await call(base, '/api/nft-sale/me', { initData: initData(22) })
    assert.equal(me.body.wallet, null, 'failed proofs link nothing')
  })

  test('order without a verified wallet → 403', async () => {
    const r = await call(base, '/api/nft-sale/orders', { initData: initData(31) })
    assert.deepEqual([r.status, r.body.error], [403, 'wallet_not_verified'])
  })

  test('fake NFT ID / status / price / wallet / payment / delivered in the body are ignored', async () => {
    const w = await linkWallet(base, 41)
    const attacker = await makeWallet()
    const r = await call(base, '/api/nft-sale/orders', {
      initData: initData(41),
      nftId: 1999,
      edition: 1999,
      status: 'DELIVERED',
      price: 0.000001,
      currency: 'TON',
      walletAddress: attacker.address.toRawString(),
      paymentConfirmed: true,
      delivered: true,
    })
    assert.equal(r.status, 200)
    assert.notEqual(r.body.order.nftId, 1999)
    assert.equal(r.body.order.status, 'PAYMENT_PENDING')
    assert.equal(r.body.order.wallet, w.address.toString({ testOnly: true, bounceable: false }))
    // a webhook claiming PAID changes nothing: the server asks the provider, which says PENDING
    const orders = (await call(base, '/api/admin/nft-sale/overview', undefined, { 'x-admin-password': ADMIN })).body.list
    const ref = orders.find((o: any) => o.id === r.body.order.id).providerOrderId
    await call(base, '/api/nft-sale/payments/test/webhook', { providerOrderId: ref, status: 'PAID', paid: true })
    const st = await call(base, '/api/nft-sale/orders/status', { initData: initData(41), orderId: r.body.order.id })
    assert.equal(st.body.order.status, 'PAYMENT_PENDING')
    // another user cannot read, pay or confirm it
    await linkWallet(base, 42)
    assert.equal((await call(base, '/api/nft-sale/orders/status', { initData: initData(42), orderId: r.body.order.id })).status, 404)
    assert.equal((await call(base, '/api/nft-sale/orders/test-pay', { initData: initData(42), orderId: r.body.order.id })).status, 404)
    const me = await call(base, '/api/nft-sale/me', { initData: initData(41) })
    assert.equal(me.body.nfts.length, 0, 'nothing delivered without payment + mint')
  })

  test('full flow: BUY → TEST PAYMENT → mint → owner verified → DELIVERED; duplicate webhooks mint once', async () => {
    const w = await linkWallet(base, 51)
    const { body } = await call(base, '/api/nft-sale/orders', { initData: initData(51) })
    const order = body.order
    const seq0 = (await call(base, '/api/admin/nft-sale/overview', undefined, { 'x-admin-password': ADMIN })).body.minter.seqno
    const paid = await call(base, '/api/nft-sale/orders/test-pay', { initData: initData(51), orderId: order.id, outcome: 'PAID' })
    assert.equal(paid.status, 200)
    const ref = (await call(base, '/api/admin/nft-sale/overview', undefined, { 'x-admin-password': ADMIN })).body.list.find((o: any) => o.id === order.id).providerOrderId
    await Promise.all([1, 2, 3].map(() => call(base, '/api/nft-sale/payments/test/webhook', { providerOrderId: ref })))
    const done = await until(
      () => call(base, '/api/nft-sale/orders/status', { initData: initData(51), orderId: order.id }),
      (r) => r.body.order.status === 'DELIVERED' || r.body.order.status === 'FAILED',
    )
    assert.equal(done.body.order.status, 'DELIVERED')
    assert.match(done.body.order.txHash, /^[0-9a-f]{64}$/)
    const me = await call(base, '/api/nft-sale/me', { initData: initData(51) })
    assert.equal(me.body.nfts.length, 1)
    assert.equal(me.body.nfts[0].nftId, order.nftId)
    assert.equal(me.body.nfts[0].wallet, w.address.toString({ testOnly: true, bounceable: false }))
    const ov = (await call(base, '/api/admin/nft-sale/overview', undefined, { 'x-admin-password': ADMIN })).body
    assert.equal(ov.minter.seqno - seq0, 1, 'one mint for one paid order')
    assert.equal(ov.inventory.delivered, 1)
    assert.equal(ov.revenue.real, 0)
    assert.ok(ov.funnel.nft_delivery_success >= 1)
    const meta = await call(base, `/api/nft-sale/metadata/${order.nftId}.json`)
    assert.equal(meta.body.name, `DuckJackpot HEIST #${order.nftId}`)
    assert.deepEqual(meta.body.attributes.slice(0, 2), [{ trait_type: 'Collection', value: 'HEIST' }, { trait_type: 'Edition', value: `${order.nftId}/2000` }])
  })

  test('admin endpoints need the password; retry of a non-failed order is refused', async () => {
    assert.equal((await call(base, '/api/admin/nft-sale/overview')).status, 401)
    assert.equal((await call(base, '/api/admin/nft-sale/orders/x/retry', {})).status, 401)
    const list = (await call(base, '/api/admin/nft-sale/overview', undefined, { 'x-admin-password': ADMIN })).body.list
    const delivered = list.find((o: any) => o.status === 'DELIVERED')
    const r = await call(base, `/api/admin/nft-sale/orders/${delivered.id}/retry`, {}, { 'x-admin-password': ADMIN })
    assert.deepEqual([r.status, r.body.error], [409, 'not_failed'])
  })

  test('client-only analytics cannot fake server events', async () => {
    const r = await call(base, '/api/analytics/events', { initData: initData(51), events: [{ name: 'nft_delivery_success' }, { name: 'nft_payment_confirmed' }, { name: 'nft_sale_open' }] })
    assert.equal(r.body.stored, 1)
  })
})

describe('sale OFF (default)', () => {
  let base = ''
  before(async () => {
    base = await startServer(3412, { NFT_SALE_ENABLED: '' })
  })
  test('config says disabled; user endpoints 404; metadata still served', async () => {
    assert.deepEqual((await call(base, '/api/nft-sale/config')).body, { enabled: false })
    for (const [path, body] of USER_ENDPOINTS) assert.equal((await call(base, path, { ...body, initData: initData(61) })).status, 404, path)
    assert.equal((await call(base, '/api/nft-sale/metadata/collection.json')).status, 200)
  })
})

describe('production environment', () => {
  let base = ''
  before(async () => {
    base = await startServer(3413, { NODE_ENV: 'production', NFT_SALE_ENABLED: 'true', NFT_CHAIN: 'sandbox' })
  })
  test('test payments, test webhook and the sandbox chain are refused', async () => {
    const cfg = (await call(base, '/api/nft-sale/config')).body
    assert.equal(cfg.testPayments, false)
    assert.equal(cfg.chainReady, false)
    const w = await makeWallet()
    const n = (await call(base, '/api/nft-sale/wallet/nonce', { initData: initData(71) })).body.payload
    assert.equal((await call(base, '/api/nft-sale/wallet/verify', { initData: initData(71), account: account(w), proof: signProof(w, { payload: n }) })).status, 200)
    const o = await call(base, '/api/nft-sale/orders', { initData: initData(71) })
    assert.deepEqual([o.status, o.body.error], [503, 'test_provider_disabled_in_production'])
    assert.equal((await call(base, '/api/nft-sale/orders/test-pay', { initData: initData(71), orderId: 'x' })).status, 403)
    assert.equal((await call(base, '/api/nft-sale/payments/test/webhook', { providerOrderId: 'x' })).status, 404)
  })
})

describe('mainnet requested', () => {
  let base = ''
  before(async () => {
    base = await startServer(3414, { NFT_SALE_ENABLED: 'true', NFT_CHAIN: 'sandbox', NFT_NETWORK: 'mainnet' })
  })
  test('mainnet is blocked in Phase 1: no chain, no orders', async () => {
    assert.equal((await call(base, '/api/nft-sale/config')).body.chainReady, false)
    const ov = (await call(base, '/api/admin/nft-sale/overview', undefined, { 'x-admin-password': ADMIN })).body
    assert.equal(ov.chain.reason, 'mainnet_blocked_phase1')
    await linkWallet(base, 81)
    const o = await call(base, '/api/nft-sale/orders', { initData: initData(81) })
    assert.deepEqual([o.status, o.body.error], [503, 'chain_not_ready'])
  })
})
