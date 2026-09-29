/** 🖼 NFT SALE (TON testnet only) — a separate module next to the NFT Drop. */
import { subsystemRefusal } from './config.js'
import { startNftSaleWorker as startWorker } from './sale.js'
export { nftSaleRouter } from './routes.js'

/** Starts the background worker unless the production mainnet guard refuses the subsystem. */
export function startNftSaleWorker() {
  if (subsystemRefusal()) return
  startWorker()
}
