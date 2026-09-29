# NFT SALE — TON TESTNET runbook (Phase 2)

Separate system from the NFT Drop. **TON TESTNET only** — testnet TON has no value, no real money is
involved, mainnet is refused by the code. Production keeps `NFT_SALE_ENABLED=false`.

> **Never send a mnemonic to anyone** — not in a chat (ChatGPT, Claude, Telegram), not in GitHub, not in
> an issue or a screenshot. It lives only in a private file on your computer and, for a deployed
> backend, in a Railway **secret** variable.

## 1. Create the testnet wallets (on your computer)

```bash
cd backend
npm run nft:testnet-wallet            # MINTER: owns the collection, mints, receives testnet payments
npm run nft:testnet-wallet -- --buyer # TEST BUYER: a separate wallet that buys the test NFT
```

Each command prints the wallet **address** and **public key** only. The mnemonic is written to
`~/.duckjackpot/nft-testnet-<role>-mnemonic.txt` (mode 0600) and is never printed or logged.

## 2. Get testnet TON (official faucet)

Open the official TON testnet faucet bot **@testgiver_ton_bot** in Telegram and request testnet TON for
the **minter address** (≈ 2 TON is plenty). The buyer can be funded by the faucet too, or with a small
testnet transfer from the minter.

Check the balance: `https://testnet.tonviewer.com/<address>`.

## 3. Secrets

| Variable | Where | Secret? |
|---|---|---|
| `NFT_TESTNET_MINTER_MNEMONIC` | Railway variables (deployed backend) | **yes** |
| `NFT_TESTNET_MINTER_MNEMONIC_FILE` | local runs only: path to the 0600 file (ignored in production) | path only |
| `NFT_COLLECTION_ADDRESS` | after deployment | no |
| `NFT_METADATA_BASE_URL` | `https://duckjackpot-production.up.railway.app` (stable, public) | no |
| `TONCENTER_TESTNET_API_KEY` | optional (without it: 1 request/s) | yes |
| `NFT_SALE_ENABLED` | **false in production**; `true` only in a local/testnet environment | no |
| `NFT_NETWORK` | `testnet` (the only accepted value) | no |

## 4. Deploy the testnet collection (once)

```bash
cd backend
NFT_TESTNET_MINTER_MNEMONIC_FILE=~/.duckjackpot/nft-testnet-minter-mnemonic.txt \
NFT_METADATA_BASE_URL=https://duckjackpot-production.up.railway.app \
DATA_DIR=./data-testnet npm run nft:testnet-deploy-collection          # dry run: shows the plan
# same command + ' -- --yes' to deploy
```

The dry run shows NETWORK, MINTER ADDRESS (+ balance), COLLECTION NAME, SUPPLY, METADATA BASE URL and
the planned address. It **stops** if the network is not testnet, the minter is missing or unfunded, or a
different collection is already known; an already deployed collection is reused, never duplicated.
The address is saved in `DATA_DIR/nft-sale/state.json`; set it as `NFT_COLLECTION_ADDRESS` too.

Admin panel: `/admin/nftsale` → **VERIFY TESTNET COLLECTION** reads the chain (code = official TEP-62
reference, owner = minter, content URL) and fetches the metadata over HTTP.

## 5. Metadata (stable URLs)

- Collection: `https://duckjackpot-production.up.railway.app/api/nft-sale/testnet/metadata/collection.json`
- Edition n: `https://duckjackpot-production.up.railway.app/api/nft-sale/testnet/metadata/<n>`
- Art: a labelled **TESTNET PLACEHOLDER — NOT FINAL ART** image.

These are served even while the sale is disabled (read-only, public).

## 6. Purchase flow (what the server verifies)

connect wallet → ton_proof (nonce, signature, domain, timestamp, testnet) → order + reservation (15 min)
→ server instructions (recipient, 0.05 testnet TON, comment `DJH-…`) → the wallet signs and sends →
the server reads the merchant wallet's transactions itself and credits a transfer only if: sender =
proven wallet, recipient = merchant, amount ≥ price, comment = order, transaction successful, inside the
reservation, hash never used before → PAID → mint (lazy mint to the buyer) → confirmed on-chain →
owner read from `get_nft_data` → OWNER_VERIFIED → DELIVERED.

## 7. Safety gates

- `NFT_NETWORK` other than `testnet` → refused everywhere (Phase 2 has no mainnet code path).
- `NODE_ENV=production` + `NFT_NETWORK=mainnet` without `NFT_MAINNET_APPROVED=true` → the NFT Sale
  subsystem refuses to start (all its endpoints answer 503).
- Test payment providers (`ton_testnet`, `test`) and the sandbox chain are refused in production.
- `NFT_SALE_ENABLED=false` → user endpoints 404, HUB card and profile section hidden.
