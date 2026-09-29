import express from 'express'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chainMode, isProduction, proofDomains, saleEnabled, subsystemRefusal, testPaymentsAllowed } from './config.js'
import { collectionMetadata, itemMetadata, parseItemFile } from './metadata.js'
import { deployTestnetCollection, getChain } from './chainService.js'
import { PaymentProviderError } from './payments/provider.js'
import { adminOverview, adminRefund, adminRetry, adminVerifyCollection, adminVerifyNft, createOrder, handlePaymentUpdate, myNftSale, publicConfig, SaleError, simulateTestPayment, userCheckPayment, userOrderView } from './sale.js'
import { getOrder, removeWallet, setWallet } from './store.js'
import { consumeNonce, issueNonce, verifyTonProof, type ProofInput } from './walletProof.js'
import { recordEvents } from '../analyticsStore.js'

type Deps = {
  /** verified Telegram user from signed initData only (never a client-sent id) */
  telegramUser(body: { initData?: unknown }): { telegramId?: number }
  requireAdmin(req: express.Request, res: express.Response): boolean
}

const ART_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '../../assets/nft-sale')
const TESTNET_CHAIN_ID = '-3'

function sendError(res: express.Response, err: unknown) {
  if (err instanceof SaleError) return res.status(err.http).json({ error: err.code })
  if (err instanceof PaymentProviderError) return res.status(409).json({ error: err.code })
  console.error('[nft-sale] request failed', err instanceof Error ? err.message : err)
  return res.status(503).json({ error: 'nft_sale_unavailable' })
}

/**
 * 🖼 NFT SALE endpoints (separate from the NFT Drop's /api/me/cards, /api/payments/*).
 * User endpoints: 404 while NFT_SALE_ENABLED is off; 401 without valid Telegram initData.
 * The client never sends: status, nftId, price, payment result, delivery, wallet ownership.
 */
export function nftSaleRouter(deps: Deps) {
  const r = express.Router()

  // Hard guard: production + mainnet without NFT_MAINNET_APPROVED=true → the subsystem does not start.
  const refusal = subsystemRefusal()
  if (refusal) {
    console.error(`[nft-sale] REFUSING TO START: ${refusal}`)
    r.all(/^\/api\/(admin\/)?nft-sale(\/|$)/, (_req, res) => {
      res.status(503).json({ error: refusal })
    })
    return r
  }

  /** user guard: sale on + verified Telegram user */
  const user = (req: express.Request, res: express.Response) => {
    if (!saleEnabled()) {
      res.status(404).json({ error: 'nft_sale_disabled' })
      return null
    }
    const id = deps.telegramUser(req.body ?? {}).telegramId
    if (!id) {
      res.status(401).json({ error: 'invalid_init_data' })
      return null
    }
    return id
  }

  r.get('/api/nft-sale/config', async (_req, res) => {
    try {
      res.json(await publicConfig())
    } catch (err) {
      sendError(res, err)
    }
  })

  // ---- TEP-64 metadata + placeholder art (public, read-only) ----
  // Phase 2: the stable per-edition URLs the testnet collection points to
  r.get('/api/nft-sale/testnet/metadata/collection.json', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json(collectionMetadata())
  })
  r.get('/api/nft-sale/testnet/metadata/:file', (req, res) => {
    const n = parseItemFile(String(req.params.file))
    if (!n) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.json(itemMetadata(n))
  })
  r.get('/api/nft-sale/metadata/collection.json', (_req, res) => {
    res.json(collectionMetadata())
  })
  r.get('/api/nft-sale/metadata/:file', (req, res) => {
    const n = parseItemFile(String(req.params.file))
    if (!n) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.json(itemMetadata(n))
  })
  r.get('/api/nft-sale/art/heist-testnet-placeholder.png', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.sendFile(join(ART_DIR, 'heist-testnet-placeholder.png'))
  })

  r.post('/api/nft-sale/me', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    try {
      res.json(await myNftSale(id))
    } catch (err) {
      sendError(res, err)
    }
  })

  // ---- wallet: ton_proof ----
  r.post('/api/nft-sale/wallet/nonce', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    try {
      res.json(await issueNonce(id))
    } catch (err) {
      sendError(res, err)
    }
  })

  r.post('/api/nft-sale/wallet/verify', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    const body = (req.body ?? {}) as { account?: { address?: string; chain?: string; publicKey?: string; walletStateInit?: string }; proof?: ProofInput['proof']; walletApp?: string }
    const payload = typeof body.proof?.payload === 'string' ? body.proof.payload : ''
    if (!payload || !body.account?.address || !body.account.walletStateInit) {
      res.status(400).json({ error: 'bad_proof' })
      return
    }
    try {
      const nonce = await consumeNonce(payload, id)
      if (nonce !== 'ok') {
        res.status(401).json({ error: nonce })
        return
      }
      const v = verifyTonProof(
        { address: body.account.address, network: String(body.account.chain ?? ''), publicKey: body.account.publicKey, walletStateInit: body.account.walletStateInit, proof: body.proof! },
        { domains: proofDomains(), expectedNetwork: TESTNET_CHAIN_ID },
      )
      if (!v.ok) {
        res.status(401).json({ error: v.reason })
        return
      }
      const link = await setWallet(id, {
        address: v.address.toRawString(),
        friendly: v.address.toString({ testOnly: true, bounceable: false }),
        publicKey: v.publicKey,
        network: 'testnet',
        walletApp: typeof body.walletApp === 'string' ? body.walletApp.slice(0, 40) : undefined,
        verifiedAt: Date.now(),
      })
      try {
        recordEvents(`tg:${id}`, undefined, [
          { name: 'nft_sale_testnet_proof_verified', props: { kind: v.wallet } },
          { name: 'nft_sale_testnet_wallet_connected', props: { kind: v.wallet } },
        ])
      } catch {
        /* analytics never breaks the flow */
      }
      res.json({ wallet: { address: link.friendly, network: link.network, verifiedAt: link.verifiedAt } })
    } catch (err) {
      sendError(res, err)
    }
  })

  r.post('/api/nft-sale/wallet/disconnect', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    try {
      await removeWallet(id)
      res.json({ ok: true })
    } catch (err) {
      sendError(res, err)
    }
  })

  // ---- orders ----
  r.post('/api/nft-sale/orders', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    try {
      const { order, existing } = await createOrder(id)
      res.json({ order: await userOrderView(order), existing })
    } catch (err) {
      sendError(res, err)
    }
  })

  r.post('/api/nft-sale/orders/status', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    const o = getOrder(String(req.body?.orderId ?? ''))
    if (!o || o.telegramUserId !== id) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.json({ order: await userOrderView(o) })
  })

  /** "I sent the testnet payment": the SERVER checks the chain. Body tx hash / status are ignored. */
  r.post('/api/nft-sale/orders/check-payment', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    try {
      const o = await userCheckPayment(id, String(req.body?.orderId ?? ''))
      res.json({ order: await userOrderView(o) })
    } catch (err) {
      sendError(res, err)
    }
  })

  /** TEST PAYMENT — dev/test environments only; refused in production. */
  r.post('/api/nft-sale/orders/test-pay', async (req, res) => {
    const id = user(req, res)
    if (!id) return
    if (!testPaymentsAllowed()) {
      res.status(403).json({ error: 'test_provider_disabled_in_production' })
      return
    }
    const outcome = req.body?.outcome === 'FAILED' ? 'FAILED' : 'PAID'
    try {
      const o = await simulateTestPayment(id, String(req.body?.orderId ?? ''), outcome)
      res.json({ order: await userOrderView(o) })
    } catch (err) {
      sendError(res, err)
    }
  })

  /**
   * Provider webhook. Only a trigger: the server re-reads the payment from the provider. The test
   * provider's webhook exists outside production only; real providers get signed webhooks later.
   */
  r.post('/api/nft-sale/payments/:provider/webhook', async (req, res) => {
    const provider = String(req.params.provider)
    if (provider !== 'test' || !testPaymentsAllowed()) {
      res.status(404).json({ error: 'unknown_provider' })
      return
    }
    const ref = String(req.body?.providerOrderId ?? '')
    try {
      const r2 = await handlePaymentUpdate(provider, ref)
      res.status(r2.ok ? 200 : 404).json(r2)
    } catch (err) {
      sendError(res, err)
    }
  })

  // ---- admin ----
  r.get('/api/admin/nft-sale/overview', async (req, res) => {
    if (!deps.requireAdmin(req, res)) return
    try {
      res.json(await adminOverview(typeof req.query.status === 'string' ? req.query.status : undefined))
    } catch (err) {
      sendError(res, err)
    }
  })
  r.post('/api/admin/nft-sale/collection/deploy', async (req, res) => {
    if (!deps.requireAdmin(req, res)) return
    try {
      const { address, created } = await deployTestnetCollection()
      res.json({ ok: true, created, collection: address.toString({ testOnly: true }) })
    } catch (err) {
      sendError(res, err)
    }
  })
  r.post('/api/admin/nft-sale/verify/collection', async (req, res) => {
    if (!deps.requireAdmin(req, res)) return
    try {
      res.json(await adminVerifyCollection())
    } catch (err) {
      sendError(res, err)
    }
  })
  r.post('/api/admin/nft-sale/verify/nft', async (req, res) => {
    if (!deps.requireAdmin(req, res)) return
    try {
      res.json(await adminVerifyNft(typeof req.body?.orderId === 'string' && req.body.orderId ? req.body.orderId : undefined))
    } catch (err) {
      sendError(res, err)
    }
  })
  r.post('/api/admin/nft-sale/orders/:id/retry', async (req, res) => {
    if (!deps.requireAdmin(req, res)) return
    try {
      res.json({ order: await adminRetry(String(req.params.id)) })
    } catch (err) {
      sendError(res, err)
    }
  })
  r.post('/api/admin/nft-sale/orders/:id/refund', async (req, res) => {
    if (!deps.requireAdmin(req, res)) return
    try {
      res.json({ order: await adminRefund(String(req.params.id)) })
    } catch (err) {
      sendError(res, err)
    }
  })

  // ---- dev only: the in-memory sandbox chain (NFT_CHAIN=sandbox, never production) ----
  // Lets a local UI E2E fund a test wallet and broadcast that wallet's OWN signed message,
  // exactly what a wallet app does on the real network. No keys ever reach the server.
  const sandboxOnly = (res: express.Response) => {
    let ok = false
    try {
      ok = !isProduction() && chainMode() === 'sandbox'
    } catch {
      ok = false
    }
    if (!ok) res.status(404).json({ error: 'not_found' })
    return ok
  }
  r.post('/api/nft-sale/dev/sandbox/fund', async (req, res) => {
    if (!sandboxOnly(res)) return
    const chain = await getChain()
    const backend = chain.backend as unknown as { fund?: (a: import('@ton/core').Address, ton: string) => Promise<void> }
    const { Address } = await import('@ton/core')
    await backend.fund?.(Address.parse(String(req.body?.address)), String(req.body?.ton ?? '5'))
    res.json({ ok: true })
  })
  r.post('/api/nft-sale/dev/sandbox/seqno', async (req, res) => {
    if (!sandboxOnly(res)) return
    const chain = await getChain()
    const { Address } = await import('@ton/core')
    const p = chain.backend.provider(Address.parse(String(req.body?.address)))
    const st = await p.getState()
    if (st.state.type !== 'active') {
      res.json({ seqno: 0, deployed: false })
      return
    }
    const { stack } = await p.get('seqno', [])
    res.json({ seqno: stack.readNumber(), deployed: true })
  })
  r.post('/api/nft-sale/dev/sandbox/external', async (req, res) => {
    if (!sandboxOnly(res)) return
    const chain = await getChain()
    const { Address, Cell, loadStateInit } = await import('@ton/core')
    const init = req.body?.stateInit ? loadStateInit(Cell.fromBase64(String(req.body.stateInit)).beginParse()) : null
    await chain.backend.provider(Address.parse(String(req.body?.address)), init).external(Cell.fromBase64(String(req.body?.body)))
    res.json({ ok: true })
  })

  return r
}

