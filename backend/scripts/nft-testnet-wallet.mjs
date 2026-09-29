// Creates a NEW TON TESTNET wallet (v4) for the NFT Sale: the MINTER (collection owner / testnet
// merchant) or a separate TEST BUYER. The mnemonic is written ONLY to a private file outside the repo
// (mode 0600). This script prints the address and public key — never the mnemonic.
// Usage: npm run nft:testnet-wallet            (minter)
//        npm run nft:testnet-wallet -- --buyer (test buyer)
import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto'
import { WalletContractV4 } from '@ton/ton'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const role = process.argv.includes('--buyer') ? 'buyer' : 'minter'
const dir = join(homedir(), '.duckjackpot')
const file = join(dir, `nft-testnet-${role}-mnemonic.txt`)
if (existsSync(file)) {
  console.error(`Refusing to overwrite ${file} (delete it first if you really want a new ${role} wallet).`)
  process.exit(1)
}
const words = await mnemonicNew(24)
const { publicKey } = await mnemonicToPrivateKey(words)
const address = WalletContractV4.create({ workchain: 0, publicKey }).address.toString({ testOnly: true, bounceable: false })
mkdirSync(dir, { recursive: true, mode: 0o700 })
writeFileSync(file, words.join(' ') + '\n', { mode: 0o600 })
console.log(`TON TESTNET ${role} wallet (v4)`)
console.log('address:   ', address)
console.log('public key:', publicKey.toString('hex'))
console.log('mnemonic:   saved (not printed) to', file)
if (role === 'minter') console.log('Next: fund it with testnet TON (@testgiver_ton_bot). Railway: copy the file into the secret NFT_TESTNET_MINTER_MNEMONIC. Local: NFT_TESTNET_MINTER_MNEMONIC_FILE=' + file)
