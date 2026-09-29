import { Address, beginCell, Cell, external, internal, SendMode, toNano, type ContractProvider, type StateInit, type Transaction } from '@ton/core'
import { WalletContractV4 } from '@ton/ton'
import { METADATA_PATH, NFT_SUPPLY, TESTNET_EXPLORER, MINT_ITEM_VALUE_TON, MINT_MESSAGE_VALUE_TON } from './config.js'
import {
  collectionAddress,
  collectionStateInit,
  getCollectionData,
  getNftData,
  collectionCode,
  itemCode,
  itemAddress,
  mintBody,
  transferBody,
  type CollectionConfig,
} from './contracts/nftContracts.js'

/**
 * Blockchain abstraction for the NFT Sale. Everything goes through a TON `ContractProvider`,
 * so the SAME code runs on the TON testnet (TON Center) and on the official TVM sandbox
 * (@ton/sandbox, dev/test only). "Submitted" is never "delivered": the item must exist
 * on-chain and its owner (get_nft_data) must be the buyer's wallet.
 */
export interface ChainBackend {
  readonly kind: 'toncenter' | 'sandbox'
  provider(address: Address, init?: StateInit | null): ContractProvider
  explorerUrl(address: string): string | null
}

export type MinterKeys = { publicKey: Buffer; secretKey: Buffer }

export type NftOnChain = {
  index: number
  edition: number
  address: string
  exists: boolean
  owner: string | null
  /** hash of the item account's last transaction (the mint, as long as nothing else happened) */
  txHash: string | null
}

export const editionToIndex = (edition: number) => BigInt(edition - 1)

export class NftBlockchain {
  readonly wallet: WalletContractV4

  constructor(
    readonly backend: ChainBackend,
    private readonly keys: MinterKeys,
    private collection: Address | null,
  ) {
    this.wallet = WalletContractV4.create({ workchain: 0, publicKey: keys.publicKey })
  }

  get minterAddress() {
    return this.wallet.address
  }
  get collectionAddress() {
    return this.collection
  }

  private walletProvider() {
    return this.backend.provider(this.wallet.address, this.wallet.init)
  }

  async minterState() {
    const state = await this.walletProvider().getState()
    const seqno = state.state.type === 'active' ? await this.wallet.getSeqno(this.walletProvider()) : 0
    return { address: this.wallet.address.toString({ testOnly: true, bounceable: false }), balance: state.balance, deployed: state.state.type === 'active', seqno }
  }

  collectionConfig(metadataBase: string): CollectionConfig {
    return {
      owner: this.wallet.address,
      collectionContentUrl: `${metadataBase}${METADATA_PATH}collection.json`,
      commonContentUrl: `${metadataBase}${METADATA_PATH}`,
      nextItemIndex: BigInt(NFT_SUPPLY),
      royalty: { factor: 0, base: 1000, address: this.wallet.address },
    }
  }

  /** Deploys the reference collection owned by the minter (idempotent: an active one is kept). */
  async deployCollection(metadataBase: string, timeoutMs = 90_000) {
    const cfg = this.collectionConfig(metadataBase)
    const address = collectionAddress(cfg)
    const state = await this.backend.provider(address).getState()
    if (state.state.type !== 'active') {
      const seqno = (await this.minterState()).seqno
      await this.wallet.sendTransfer(this.walletProvider(), {
        seqno,
        secretKey: this.keys.secretKey,
        sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        messages: [internal({ to: address, value: toNano('0.05'), bounce: false, init: collectionStateInit(cfg) })],
      })
      const until = Date.now() + timeoutMs
      while ((await this.backend.provider(address).getState()).state.type !== 'active') {
        if (Date.now() > until) throw new Error('collection_deploy_not_confirmed')
        await sleep(1500)
      }
    }
    this.collection = address
    return address
  }

  async getCollection() {
    if (!this.collection) return null
    const state = await this.backend.provider(this.collection).getState()
    if (state.state.type !== 'active') return { address: this.collection, deployed: false as const }
    const data = await getCollectionData(this.backend.provider(this.collection))
    return { address: this.collection, deployed: true as const, nextItemIndex: data.nextItemIndex, owner: data.owner }
  }

  private requireCollection() {
    if (!this.collection) throw new Error('collection_not_deployed')
    return this.collection
  }

  itemAddress(edition: number) {
    return itemAddress(this.requireCollection(), editionToIndex(edition))
  }

  /** On-chain truth about edition #n: exists? owner? */
  async getNFT(edition: number): Promise<NftOnChain> {
    const address = this.itemAddress(edition)
    const provider = this.backend.provider(address)
    const state = await provider.getState()
    const base = { index: edition - 1, edition, address: address.toString({ testOnly: true }), txHash: state.last ? Buffer.from(state.last.hash).toString('hex') : null }
    if (state.state.type !== 'active') return { ...base, exists: false, owner: null }
    const data = await getNftData(provider)
    if (!data.init || !data.collection.equals(this.requireCollection()) || data.index !== editionToIndex(edition)) return { ...base, exists: false, owner: null }
    return { ...base, exists: true, owner: data.owner ? data.owner.toRawString() : null }
  }

  async verifyOwnership(edition: number, owner: Address) {
    const nft = await this.getNFT(edition)
    return nft.exists && nft.owner === owner.toRawString()
  }

  /** Last transaction of an account (TON transaction hash, hex). */
  async getTransaction(address: Address) {
    const state = await this.backend.provider(address).getState()
    return state.last ? { lt: state.last.lt.toString(), hash: Buffer.from(state.last.hash).toString('hex') } : null
  }

  /**
   * Sends ONE mint (op 1) from the minter wallet. The caller must have checked on-chain that the
   * item does not exist. Returns the wallet seqno used: the message can land at most once, and
   * never after `validUntil` (wallet v4 replay protection).
   */
  async mintNFT(edition: number, owner: Address) {
    if (!Number.isInteger(edition) || edition < 1 || edition > NFT_SUPPLY) throw new Error('bad_edition')
    const collection = this.requireCollection()
    const { seqno } = await this.minterState()
    const validUntil = Math.floor(Date.now() / 1000) + 60
    await this.wallet.sendTransfer(this.walletProvider(), {
      seqno,
      secretKey: this.keys.secretKey,
      timeout: validUntil,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [
        internal({
          to: collection,
          value: toNano(MINT_MESSAGE_VALUE_TON),
          bounce: true,
          body: mintBody({ index: editionToIndex(edition), owner, itemContentSuffix: String(edition), itemValue: toNano(MINT_ITEM_VALUE_TON), queryId: BigInt(Date.now()) }),
        }),
      ],
    })
    return { seqno, validUntil, submittedAt: Date.now() }
  }

  /** TEP-62 transfer of an item the MINTER owns (not used by lazy mint; kept for admin recovery). */
  async transferNFT(edition: number, to: Address) {
    const nft = await this.getNFT(edition)
    if (!nft.exists || nft.owner !== this.wallet.address.toRawString()) throw new Error('minter_is_not_owner')
    const { seqno } = await this.minterState()
    await this.wallet.sendTransfer(this.walletProvider(), {
      seqno,
      secretKey: this.keys.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [internal({ to: this.itemAddress(edition), value: toNano('0.05'), bounce: true, body: transferBody({ newOwner: to, responseTo: this.wallet.address }) })],
    })
    return { seqno }
  }

  /** Latest transactions of an account, newest first (works on TON Center and the sandbox). */
  async transactions(address: Address, limit = 30): Promise<Transaction[]> {
    const p = this.backend.provider(address)
    const state = await p.getState()
    if (!state.last) return []
    return p.getTransactions(address, state.last.lt, Buffer.from(state.last.hash), limit)
  }

  /** The minter-wallet transaction that sent the mint of edition #n (external in → op 1 to the collection). */
  async findMintTx(edition: number) {
    const collection = this.requireCollection()
    for (const tx of await this.transactions(this.wallet.address, 40)) {
      if (tx.inMessage?.info.type !== 'external-in') continue
      for (const out of tx.outMessages.values()) {
        if (out.info.type !== 'internal' || !out.info.dest.equals(collection)) continue
        try {
          const b = out.body.beginParse()
          if (b.loadUint(32) === 1) {
            b.loadUintBig(64)
            if (b.loadUintBig(64) === editionToIndex(edition)) return { hash: tx.hash().toString('hex'), lt: tx.lt.toString(), at: tx.now }
          }
        } catch {
          /* not a mint */
        }
      }
    }
    return null
  }

  /** The item's first transaction: its deployment by the collection, which sets the buyer as owner. */
  async itemDeployTx(edition: number) {
    const txs = await this.transactions(this.itemAddress(edition), 20)
    const first = txs[txs.length - 1]
    return first ? { hash: first.hash().toString('hex'), lt: first.lt.toString(), at: first.now } : null
  }

  /** On-chain collection content URL (TEP-64 off-chain: 0x01 + URL). */
  async collectionContentUrl() {
    const { stack } = await this.backend.provider(this.requireCollection()).get('get_collection_data', [])
    stack.readBigNumber()
    const cs = stack.readCell().beginParse()
    if (cs.loadUint(8) !== 1) return null
    return cs.loadStringTail()
  }

  /** Full metadata URL of edition #n as the chain composes it (get_nft_content of the collection). */
  async itemContentUrl(edition: number) {
    const item = this.backend.provider(this.itemAddress(edition))
    const { stack } = await item.get('get_nft_data', [])
    stack.readBigNumber()
    stack.readBigNumber()
    stack.readAddress()
    stack.readAddressOpt()
    const individual = stack.readCell()
    const r = await this.backend.provider(this.requireCollection()).get('get_nft_content', [
      { type: 'int', value: editionToIndex(edition) },
      { type: 'cell', cell: individual },
    ])
    const cs = r.stack.readCell().beginParse()
    if (cs.loadUint(8) !== 1) return null
    return cs.loadStringTail()
  }

  /** Code hashes deployed on-chain (to prove they are the reference contracts). */
  async codeHash(address: Address) {
    const st = await this.backend.provider(address).getState()
    return st.state.type === 'active' && st.state.code ? Cell.fromBoc(st.state.code)[0].hash().toString('hex') : null
  }

  referenceHashes() {
    return { collection: collectionCode().hash().toString('hex'), item: itemCode().hash().toString('hex') }
  }

  /** Plain TON transfer with a text comment from the minter wallet (testnet refunds). */
  async sendTon(to: Address, amountNano: bigint, comment: string) {
    const { seqno } = await this.minterState()
    await this.wallet.sendTransfer(this.walletProvider(), {
      seqno,
      secretKey: this.keys.secretKey,
      sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
      messages: [internal({ to, value: amountNano, bounce: false, body: beginCell().storeUint(0, 32).storeStringTail(comment).endCell() })],
    })
    return { seqno }
  }

  txExplorerUrl(hash: string) {
    return this.backend.kind === 'toncenter' ? `${TESTNET_EXPLORER}/transaction/${hash}` : null
  }

  /** Waits until the wallet has processed the message with `seqno` (so the next one may be sent). */
  async waitForSeqnoAbove(seqno: number, timeoutMs: number) {
    const until = Date.now() + timeoutMs
    for (;;) {
      if ((await this.minterState()).seqno > seqno) return true
      if (Date.now() > until) return false
      await sleep(1500)
    }
  }

  /** SUBMITTED → CONFIRMED → OWNER VERIFIED, or null on timeout. */
  async waitForConfirmation(edition: number, owner: Address, timeoutMs: number) {
    const until = Date.now() + timeoutMs
    for (;;) {
      const nft = await this.getNFT(edition)
      if (nft.exists) return nft.owner === owner.toRawString() ? nft : { ...nft, ownerMismatch: true as const }
      if (Date.now() > until) return null
      await sleep(1500)
    }
  }

  explorerUrl(address: string) {
    return this.backend.explorerUrl(address)
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------- backends ----------

/**
 * TON Center rate limits (1 request/s without a key, ~10/s with one): every call goes through one
 * spaced queue and a 429 is retried with backoff instead of failing the delivery pass.
 */
function rateLimited(minGapMs: number) {
  let tail: Promise<unknown> = Promise.resolve()
  let last = 0
  return function run<T>(fn: () => Promise<T>): Promise<T> {
    const job = tail.then(async () => {
      for (let attempt = 1; ; attempt++) {
        const wait = last + minGapMs - Date.now()
        if (wait > 0) await sleep(wait)
        last = Date.now()
        try {
          return await fn()
        } catch (err) {
          const e = err as { status?: number; response?: { status?: number } }
          const status = e?.status ?? e?.response?.status
          if (status !== 429 || attempt >= 6) throw err
          await sleep(minGapMs * attempt)
        }
      }
    })
    tail = job.catch(() => undefined)
    return job
  }
}

export async function toncenterBackend(endpoint: string, apiKey?: string): Promise<ChainBackend> {
  const { TonClient } = await import('@ton/ton')
  const client = new TonClient({ endpoint, apiKey })
  const run = rateLimited(apiKey ? 120 : 1100)
  return {
    kind: 'toncenter',
    provider(address, init) {
      const p = client.provider(address, init ?? null)
      return {
        getState: () => run(() => p.getState()),
        get: (name, args) => run(() => p.get(name, args)),
        external: (message) => run(() => p.external(message)),
        internal: (via, args) => p.internal(via, args),
        open: (contract) => p.open(contract),
        getTransactions: (a, lt, hash, limit) => run(() => p.getTransactions(a, lt, hash, limit)),
      }
    },
    explorerUrl: (address) => `${TESTNET_EXPLORER}/${address}`,
  }
}

/**
 * The official TON sandbox (real TVM, in memory) — dev/test only, never production.
 * External messages are processed after `delayMs`, like a real network, so the service has to
 * wait for confirmation instead of assuming it.
 */
export async function sandboxBackend(delayMs: number) {
  const { Blockchain } = await import('@ton/sandbox')
  const chain = await Blockchain.create()
  const backend: ChainBackend & { fund(address: Address, ton: string): Promise<void>; chain: typeof chain } = {
    kind: 'sandbox',
    chain,
    provider(address, init) {
      const p = chain.provider(address, init ?? null)
      return new Proxy(p, {
        get(target, prop, receiver) {
          if (prop === 'external') {
            return async (body: Parameters<ContractProvider['external']>[0]) => {
              const state = await target.getState()
              const needInit = state.state.type !== 'active' && init ? init : undefined
              setTimeout(() => {
                chain.sendMessage(external({ to: address, init: needInit, body })).catch((err: unknown) => {
                  // like a real node dropping an invalid external message
                  console.warn('[nft-sale] sandbox dropped an external message:', err instanceof Error ? err.message.split('\n')[0] : err)
                })
              }, delayMs)
            }
          }
          if (prop === 'getTransactions') {
            // @ton/sandbox 0.45 compares tx hashes with === (Buffers) and so never finds lt+hash:
            // list the account's transactions and page by lt ourselves (newest first, like TON Center)
            return async (a: Address, lt: bigint, _hash: Buffer, limit?: number) => {
              const all = await chain.getTransactions(a)
              return [...all]
                .filter((t) => t.lt <= lt)
                .sort((x, y) => (x.lt < y.lt ? 1 : x.lt > y.lt ? -1 : 0))
                .slice(0, limit ?? 20)
            }
          }
          const v = Reflect.get(target, prop, receiver)
          return typeof v === 'function' ? v.bind(target) : v
        },
      })
    },
    explorerUrl: () => null,
    async fund(address, ton) {
      const treasury = await chain.treasury('nft-sale-faucet')
      await treasury.send({ to: address, value: toNano(ton), bounce: false })
    },
  }
  return backend
}
