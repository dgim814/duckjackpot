import { COLLECTION_NAME, metadataBaseUrl, NFT_SUPPLY } from './config.js'

/**
 * TEP-64 off-chain metadata (testnet). The collection points to `${base}/api/nft-sale/metadata/`;
 * each item stores only "<n>.json". The image is a labelled TESTNET PLACEHOLDER — the final HEIST
 * art is required (and must be on immutable hosting) before any mainnet collection.
 */
export const PLACEHOLDER_IMAGE_PATH = '/api/nft-sale/art/heist-testnet-placeholder.png'

export function collectionMetadata() {
  const base = metadataBaseUrl()
  return {
    name: `${COLLECTION_NAME} (TESTNET)`,
    description: `${COLLECTION_NAME}: ${NFT_SUPPLY} numbered digital collectibles. TESTNET — no value, placeholder art. Not a game item: no DUCK COIN, no Stars, no gameplay effect.`,
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
    description: `DuckJackpot HEIST NFT #${n} of ${NFT_SUPPLY}. TESTNET collectible with placeholder art.`,
    image: `${base}${PLACEHOLDER_IMAGE_PATH}`,
    attributes: [
      { trait_type: 'Collection', value: 'HEIST' },
      { trait_type: 'Edition', value: `${n}/${NFT_SUPPLY}` },
      { trait_type: 'Network', value: 'Testnet' },
    ],
  }
}

/** "137.json" → 137, anything else → null. */
export function parseItemFile(file: string) {
  const m = /^(\d{1,4})\.json$/.exec(file)
  if (!m) return null
  const n = Number(m[1])
  return n >= 1 && n <= NFT_SUPPLY ? n : null
}
