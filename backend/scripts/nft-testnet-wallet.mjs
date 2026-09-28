// Creates a NEW wallet for the NFT Sale TESTNET minter (Phase 1).
// The mnemonic is written ONLY to a private file outside the repo (mode 0600) and is never printed.
// Copy it from that file into the Railway variable NFT_TESTNET_MINTER_MNEMONIC, then fund the printed
// address with free testnet TON (Telegram: @testgiver_ton_bot). Usage: node scripts/nft-testnet-wallet.mjs
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const dir = join(homedir(), '.duckjackpot')
const file = join(dir, 'nft-testnet-minter-mnemonic.txt')
if (existsSync(file)) {
  console.error(`Refusing to overwrite ${file} (delete it first if you really want a new wallet).`)
  process.exit(1)
}
const words = await mnemonicNew(24)
const { publicKey } = await mnemonicToPrivateKey(words)
const address = WalletContractV4.create({ workchain: 0, publicKey }).address.toString({ testOnly: true, bounceable: false })
mkdirSync(dir, { recursive: true, mode: 0o700 })
writeFileSync(file, words.join(' ') + '\n', { mode: 0o600 })
console.log('TESTNET minter wallet (v4) address:', address)
console.log('Mnemonic saved (not printed) to:', file)
console.log('Next: fund it with testnet TON, set NFT_TESTNET_MINTER_MNEMONIC on Railway from that file, then delete the file.')
