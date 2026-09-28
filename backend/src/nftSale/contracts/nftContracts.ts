import { Address, beginCell, Cell, contractAddress, type ContractProvider, type StateInit } from '@ton/core'
import { NFT_COLLECTION_CODE_BOC, NFT_ITEM_CODE_BOC } from './referenceCode.js'

/**
 * TypeScript around the UNMODIFIED TEP-62 reference contracts (ton-blockchain/token-contract/nft).
 * Storage layouts and message formats follow nft-collection.fc / nft-item.fc exactly.
 */

export const collectionCode = () => Cell.fromBase64(NFT_COLLECTION_CODE_BOC)
export const itemCode = () => Cell.fromBase64(NFT_ITEM_CODE_BOC)

/** TEP-64 off-chain content: 0x01 tag + URL (snake string). */
function offchainContent(url: string) {
  return beginCell().storeUint(1, 8).storeStringTail(url).endCell()
}

export type CollectionConfig = {
  owner: Address
  /** URL of the collection's TEP-64 JSON. */
  collectionContentUrl: string
  /** Common prefix of item JSONs; the item stores only its suffix ("137.json"). */
  commonContentUrl: string
  /**
   * The reference collection only deploys `item_index <= next_item_index`. Starting at the fixed
   * supply lets the server mint editions in ANY order (a reservation may expire while a later one
   * is paid) without modifying the contract. Indexes 0..supply-1 are the editions #1..#supply.
   */
  nextItemIndex: bigint
  royalty: { factor: number; base: number; address: Address }
}

/** storage#_ owner_address next_item_index:uint64 ^[collection_content common_content] nft_item_code ^RoyaltyParams */
export function collectionData(c: CollectionConfig) {
  const content = beginCell()
    .storeRef(offchainContent(c.collectionContentUrl))
    .storeRef(beginCell().storeStringTail(c.commonContentUrl).endCell())
    .endCell()
  const royalty = beginCell().storeUint(c.royalty.factor, 16).storeUint(c.royalty.base, 16).storeAddress(c.royalty.address).endCell()
  return beginCell().storeAddress(c.owner).storeUint(c.nextItemIndex, 64).storeRef(content).storeRef(itemCode()).storeRef(royalty).endCell()
}

export function collectionStateInit(c: CollectionConfig): StateInit {
  return { code: collectionCode(), data: collectionData(c) }
}

export function collectionAddress(c: CollectionConfig, workchain = 0) {
  return contractAddress(workchain, collectionStateInit(c))
}

/** calculate_nft_item_state_init: data = index:uint64 + collection address. */
export function itemAddress(collection: Address, index: bigint) {
  const data = beginCell().storeUint(index, 64).storeAddress(collection).endCell()
  return contractAddress(collection.workChain, { code: itemCode(), data })
}

/** op 1 "deploy new nft": item_index, amount forwarded to the item, ^[owner ^individual_content]. */
export function mintBody(opts: { index: bigint; owner: Address; itemContentSuffix: string; itemValue: bigint; queryId?: bigint }) {
  const content = beginCell().storeAddress(opts.owner).storeRef(beginCell().storeStringTail(opts.itemContentSuffix).endCell()).endCell()
  return beginCell()
    .storeUint(1, 32)
    .storeUint(opts.queryId ?? 0n, 64)
    .storeUint(opts.index, 64)
    .storeCoins(opts.itemValue)
    .storeRef(content)
    .endCell()
}

/** TEP-62 transfer (op 0x5fcc3d14) — used only if the minter itself ever holds an item. */
export function transferBody(opts: { newOwner: Address; responseTo: Address; queryId?: bigint }) {
  return beginCell()
    .storeUint(0x5fcc3d14, 32)
    .storeUint(opts.queryId ?? 0n, 64)
    .storeAddress(opts.newOwner)
    .storeAddress(opts.responseTo)
    .storeBit(false) // no custom_payload
    .storeCoins(0n) // forward_amount
    .storeBit(false) // empty forward_payload (in place)
    .endCell()
}

export async function getCollectionData(provider: ContractProvider) {
  const { stack } = await provider.get('get_collection_data', [])
  const nextItemIndex = stack.readBigNumber()
  stack.readCell() // collection content
  const owner = stack.readAddress()
  return { nextItemIndex, owner }
}

export async function getNftAddressByIndex(provider: ContractProvider, index: bigint) {
  const { stack } = await provider.get('get_nft_address_by_index', [{ type: 'int', value: index }])
  return stack.readAddress()
}

export async function getNftData(provider: ContractProvider) {
  const { stack } = await provider.get('get_nft_data', [])
  const init = stack.readBigNumber() !== 0n
  const index = stack.readBigNumber()
  const collection = stack.readAddress()
  const owner = stack.readAddressOpt()
  return { init, index, collection, owner }
}
