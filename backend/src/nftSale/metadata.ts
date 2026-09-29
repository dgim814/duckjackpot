import { COLLECTION_NAME, COLLECTION_SYMBOL, METADATA_PATH, metadataBaseUrl, NFT_SUPPLY, PLACEHOLDER_NOTICE } from './config.js'

/**
 * TEP-64 off-chain metadata (TON TESTNET). On-chain the collection stores
 *   collection content = `${base}${METADATA_PATH}collection.json`
 *   common item prefix = `${base}${METADATA_PATH}` and each item only its number ("137"),
 * so every edition has its own stable URL: `${base}/api/nft-sale/testnet/metadata/137`.
 * The image is a labelled TESTNET PLACEHOLDER — never the final HEIST art.
 */
export const PLACEHOLDER_IMAGE_PATH = '/api/nft-sale/art/heist-testnet-placeholder.png'

export const collectionMetadataUrl = () => `${metadataBaseUrl()}${METADATA_PATH}collection.json`
export const itemMetadataUrl = (n: number) => `${metadataBaseUrl()}${METADATA_PATH}${n}`

export function collectionMetadata() {
  const base = metadataBaseUrl()
  return {
    name: COLLECTION_NAME,
    symbol: COLLECTION_SYMBOL,
    description: `Official DuckJackpot HEIST NFT collection.\nTESTNET COLLECTION — NOT MAINNET.\n${PLACEHOLDER_NOTICE}`,
    image: `${base}${PLACEHOLDER_IMAGE_PATH}`,
    cover_image: `${base}${PLACEHOLDER_IMAGE_PATH}`,
    external_link: 'https://t.me/DuckJackpotBot',
    social_links: ['https://t.me/DuckJackpot'],
  }
}

export function itemMetadata(n: number) {
  const base = metadataBaseUrl()
  return {
    name: `DuckJackpot HEIST #${n}`,
    description: `${PLACEHOLDER_NOTICE}. DuckJackpot HEIST #${n} of ${NFT_SUPPLY} — TON TESTNET collectible, no value.`,
    image: `${base}${PLACEHOLDER_IMAGE_PATH}`,
    attributes: [
      { trait_type: 'Collection', value: 'HEIST' },
      { trait_type: 'Edition', value: `${n} of ${NFT_SUPPLY}` },
      { trait_type: 'Network', value: 'TON TESTNET' },
      { trait_type: 'Art', value: PLACEHOLDER_NOTICE },
    ],
  }
}

/** "137", "137.json" → 137; anything else → null. */
export function parseItemFile(file: string) {
  const m = /^(\d{1,4})(\.json)?$/.exec(file)
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= NFT_SUPPLY ? n : null
}
