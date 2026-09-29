import { Address } from '@ton/core'
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto'
import { chainMode, COLLECTION_NAME, collectionAddressOverride, metadataBaseUrl, minterMnemonic, NFT_SUPPLY, nftNetwork, toncenterApiKey, TONCENTER_TESTNET_ENDPOINT } from './config.js'
import { collectionAddress } from './contracts/nftContracts.js'
import { NftBlockchain, sandboxBackend, toncenterBackend } from './nftBlockchain.js'
import { getChainState, setChainState } from './store.js'

/**
 * The one NftBlockchain instance of this process.
 * - toncenter (default): TON testnet; the minter key comes ONLY from NFT_TESTNET_MINTER_MNEMONIC
 *   (Railway secret). The collection address is NFT_COLLECTION_ADDRESS or the one the admin deployed.
 * - sandbox (dev/test only): the official TVM emulator in memory, a throw-away minter key generated
 *   in memory, funded by the sandbox and the collection deployed automatically.
 * The key is never logged, stored on disk by this code, or returned by any endpoint.
 */
let chainP: Promise<NftBlockchain> | null = null

export type ChainStatus = { ready: boolean; mode: string; network: 'testnet'; reason?: string }

export function getChain(): Promise<NftBlockchain> {
  if (!chainP) {
    chainP = build().catch((err) => {
      chainP = null
      throw err
    })
  }
  return chainP
}

async function build() {
  nftNetwork() // throws for anything but testnet
  const mode = chainMode()
  if (mode === 'sandbox') {
    const backend = await sandboxBackend(Number(process.env.NFT_SANDBOX_DELAY_MS ?? 1500))
    const keys = await mnemonicToPrivateKey(minterMnemonic() ?? (await mnemonicNew(24)))
    const chain = new NftBlockchain(backend, keys, null)
    await backend.fund(chain.minterAddress, '1000')
    const address = await chain.deployCollection(metadataBaseUrl())
    console.log('[nft-sale] sandbox chain ready, collection', address.toString({ testOnly: true }))
    return chain
  }
  const words = minterMnemonic()
  if (!words) throw new Error('minter_not_configured')
  const keys = await mnemonicToPrivateKey(words)
  const stored = collectionAddressOverride() ?? getChainState().collectionAddress ?? null
  const chain = new NftBlockchain(await toncenterBackend(TONCENTER_TESTNET_ENDPOINT, toncenterApiKey()), keys, stored ? Address.parse(stored) : null)
  return chain
}

/** Whether new orders can be taken: chain reachable in config terms and a collection known. */
export async function chainStatus(): Promise<ChainStatus> {
  try {
    const mode = chainMode()
    nftNetwork()
    const chain = await getChain()
    if (!chain.collectionAddress) return { ready: false, mode, network: 'testnet', reason: 'collection_not_deployed' }
    return { ready: true, mode, network: 'testnet' }
  } catch (err) {
    return { ready: false, mode: process.env.NFT_CHAIN || 'toncenter', network: 'testnet', reason: err instanceof Error ? err.message : 'chain_error' }
  }
}

/** What a deployment would do — shown before anything is sent. */
export async function collectionDeployPlan() {
  const network = nftNetwork() // STOP unless testnet
  const chain = await getChain() // STOP without a minter wallet (toncenter mode)
  const cfg = chain.collectionConfig(metadataBaseUrl())
  const computed = collectionAddress(cfg)
  const existing = collectionAddressOverride() ?? getChainState().collectionAddress ?? null
  const minter = await chain.minterState()
  return {
    network,
    chain: chain.backend.kind,
    minterAddress: minter.address,
    minterBalanceTon: Number(minter.balance) / 1e9,
    collectionName: COLLECTION_NAME,
    supply: NFT_SUPPLY,
    metadataBaseUrl: metadataBaseUrl(),
    collectionContentUrl: cfg.collectionContentUrl,
    computedAddress: computed.toString({ testOnly: true }),
    existingAddress: existing,
  }
}

/**
 * Admin / script: deploy the testnet collection once and remember its address.
 * Never creates a second collection: a known address (NFT_COLLECTION_ADDRESS or the saved one) that
 * is already active is reused; a known address that differs from this configuration is refused.
 */
export async function deployTestnetCollection() {
  const plan = await collectionDeployPlan()
  const chain = await getChain()
  if (plan.existingAddress) {
    const known = Address.parse(plan.existingAddress)
    const st = await chain.backend.provider(known).getState()
    if (st.state.type === 'active') return { address: known, created: false }
    if (!known.equals(Address.parse(plan.computedAddress))) throw new Error('collection_address_mismatch')
  }
  if (chain.backend.kind === 'toncenter' && plan.minterBalanceTon < 0.2) throw new Error('minter_not_funded')
  const before = (await chain.backend.provider(Address.parse(plan.computedAddress)).getState()).state.type === 'active'
  const address = await chain.deployCollection(metadataBaseUrl())
  if (chain.backend.kind === 'toncenter') await setChainState({ collectionAddress: address.toString({ testOnly: true }), deployedAt: Date.now() })
  return { address, created: !before }
}

/** Tests only: forget the instance (a new sandbox chain on next use). */
export function resetChainForTests() {
  chainP = null
}
