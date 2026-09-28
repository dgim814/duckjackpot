import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto'
import { NftBlockchain, sandboxBackend } from '../../src/nftSale/nftBlockchain.js'
import { collectionCode, getNftAddressByIndex, itemCode } from '../../src/nftSale/contracts/nftContracts.js'
import { NFT_COLLECTION_CODE_HASH, NFT_ITEM_CODE_HASH } from '../../src/nftSale/contracts/referenceCode.js'
import { Cell } from '@ton/core'
import { makeWallet } from './helpers.js'

/** The UNMODIFIED TEP-62 reference contracts running on the official TVM sandbox. */
const backend = await sandboxBackend(150)
const keys = await mnemonicToPrivateKey(await mnemonicNew(24))
const chain = new NftBlockchain(backend, keys, null)
await backend.fund(chain.minterAddress, '50')
const collection = await chain.deployCollection('https://meta.test')
const buyer = (await makeWallet()).address
const stranger = (await makeWallet()).address

test('committed code BOCs hash to the pinned reference hashes', () => {
  assert.equal(collectionCode().hash().toString('hex'), NFT_COLLECTION_CODE_HASH)
  assert.equal(itemCode().hash().toString('hex'), NFT_ITEM_CODE_HASH)
})

test('collection deployed, owned by the minter, fixed supply 2000 as next_item_index', async () => {
  const c = await chain.getCollection()
  assert.ok(c?.deployed)
  assert.ok(c.owner.equals(chain.minterAddress))
  assert.equal(c.nextItemIndex, 2000n)
  const state = await backend.provider(collection).getState()
  assert.equal(state.state.type === 'active' && Cell.fromBoc(state.state.code!)[0].hash().toString('hex'), NFT_COLLECTION_CODE_HASH)
})

test('item addresses computed locally = get_nft_address_by_index', async () => {
  for (const n of [1, 137, 2000]) assert.ok((await getNftAddressByIndex(backend.provider(collection), BigInt(n - 1))).equals(chain.itemAddress(n)))
})

test('mint: submitted is NOT delivered; confirmation → owner verified', async () => {
  const sub = await chain.mintNFT(137, buyer)
  assert.equal((await chain.getNFT(137)).exists, false, 'right after submit the item does not exist yet')
  const nft = await chain.waitForConfirmation(137, buyer, 15_000)
  assert.ok(nft && !('ownerMismatch' in nft))
  assert.equal(nft.owner, buyer.toRawString())
  assert.match(nft.txHash ?? '', /^[0-9a-f]{64}$/)
  assert.equal(await chain.verifyOwnership(137, buyer), true)
  assert.equal(await chain.verifyOwnership(137, stranger), false)
  assert.ok(await chain.waitForSeqnoAbove(sub.seqno, 10_000))
  const tx = await chain.getTransaction(chain.itemAddress(137))
  assert.equal(tx?.hash, nft.txHash)
})

test('editions can be minted in any order (#1 after #137)', async () => {
  const s = await chain.mintNFT(1, buyer)
  await chain.waitForSeqnoAbove(s.seqno, 10_000)
  assert.ok(await chain.waitForConfirmation(1, buyer, 15_000))
})

test('duplicate mint is rejected by the contract itself: owner never changes', async () => {
  const s = await chain.mintNFT(137, stranger)
  await chain.waitForSeqnoAbove(s.seqno, 10_000)
  await new Promise((r) => setTimeout(r, 500))
  assert.equal(await chain.verifyOwnership(137, buyer), true)
  assert.equal(await chain.verifyOwnership(137, stranger), false)
})

test('edition outside 1..2000 is refused before sending', async () => {
  await assert.rejects(chain.mintNFT(0, buyer), /bad_edition/)
  await assert.rejects(chain.mintNFT(2001, buyer), /bad_edition/)
})

test('transferNFT refuses an item the minter does not own', async () => {
  await assert.rejects(chain.transferNFT(137, stranger), /minter_is_not_owner/)
})

test('item code on chain is the reference item code', async () => {
  const state = await backend.provider(chain.itemAddress(137)).getState()
  assert.equal(state.state.type === 'active' && Cell.fromBoc(state.state.code!)[0].hash().toString('hex'), NFT_ITEM_CODE_HASH)
})
