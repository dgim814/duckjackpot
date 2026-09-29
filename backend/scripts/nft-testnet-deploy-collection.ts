// Controlled deployment of the DUCKJACKPOT HEIST collection on TON TESTNET (Phase 2).
// Shows the plan first; sends only with --yes. STOPS on: network ≠ testnet, no minter wallet,
// unfunded minter, a different already-known collection. Never deploys a second collection.
// Usage (local, key from the private file):
//   NFT_TESTNET_MINTER_MNEMONIC_FILE=~/.duckjackpot/nft-testnet-minter-mnemonic.txt \
//   NFT_METADATA_BASE_URL=https://duckjackpot-production.up.railway.app \
//   DATA_DIR=./data npm run nft:testnet-deploy-collection -- [--yes]
process.env.NFT_CHAIN ||= 'toncenter'
const { collectionDeployPlan, deployTestnetCollection } = await import('../src/nftSale/chainService.js')
const { isProduction, subsystemRefusal } = await import('../src/nftSale/config.js')

if (subsystemRefusal()) {
  console.error('STOP:', subsystemRefusal())
  process.exit(1)
}
let plan
try {
  plan = await collectionDeployPlan()
} catch (err) {
  console.error('STOP:', err instanceof Error ? err.message : err) // mainnet_blocked_phase1 / minter_not_configured / …
  process.exit(1)
}
console.log('NETWORK          ', plan.network.toUpperCase(), isProduction() ? '(production environment)' : '')
console.log('MINTER ADDRESS   ', plan.minterAddress, `(${plan.minterBalanceTon} TON testnet)`)
console.log('COLLECTION NAME  ', plan.collectionName)
console.log('SUPPLY           ', plan.supply)
console.log('METADATA BASE URL', plan.metadataBaseUrl)
console.log('CONTENT URL      ', plan.collectionContentUrl)
console.log('ADDRESS (planned)', plan.computedAddress)
if (plan.existingAddress) console.log('KNOWN COLLECTION ', plan.existingAddress)
if (!process.argv.includes('--yes')) {
  console.log('\nDry run. Re-run with --yes to deploy.')
  process.exit(0)
}
try {
  const r = await deployTestnetCollection()
  console.log(r.created ? 'DEPLOYED' : 'ALREADY DEPLOYED (reused, nothing sent)', r.address.toString({ testOnly: true }))
  console.log('Set on Railway (not secret): NFT_COLLECTION_ADDRESS=' + r.address.toString({ testOnly: true }))
  process.exit(0)
} catch (err) {
  console.error('STOP:', err instanceof Error ? err.message : err)
  process.exit(1)
}
