# DuckJackpot heist — levels 6–8, economy and systems

Development notes for the stage that added LEVEL 6–8, the DUCK COIN / ⭐ Stars
economy, gear upgrades, the Black Market fence and the in-raid NFT Drop offer.
Every number below lives in code config — **`src/heist/economy/balance.ts`**
(economy) and **`src/heist/v2/level/grandLevels.ts`** (levels). Change them
there; nothing is hard-coded in pages.

## Level ladder

| # | Level | Zones | Floors | Guards | Cams | Safes | Special loot | Mechanic | Supply (DC) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | BANK | 20 | — | 13 | 16 | 2 | — | tutorial | ≈ 6.5k |
| 2 | MANSION | 40 | 4 | 20 | 24 | 9 | — | NFT vault | ≈ 18k |
| 3 | PRIVATE BANK | 50 | 5 | 27 | 38 | 12 | — | — | ≈ 32k |
| 4 | BLACK MARKET | 60 | 6 | 36 | 50 | 15 | — | — | ≈ 47k |
| 5 | GRAND VAULT | 70 | 7 | 43 | 62 | 18 | — | — | ≈ 66k |
| 6 | SKYLINE TOWER | 80 | 8 | 50 | 67 | 16 | 12 pcs / 8.1k | **lifts** | ≈ 88k |
| 7 | UNDERGROUND CITY | 90 | 9 | 58 | 75 | 17 | 14 pcs / 11.2k | **escalators** | ≈ 106k |
| 8 | GRAND COLLECTION | 100 | 10 | 65 | 85 | 18 | 15 pcs / 13.9k | **lasers + panels** | ≈ 127k |

All tower levels (3–8) share one data-driven generator (`grand.ts`): 5 bands
per floor = 10 zones, a central door column, side rooms off it, two locked
doors between floors, one EXIT at the entrance, no EXIT near the final vault.
Each level adds its own look (floor material, wall palette, route runner) and
its own mechanic; L1–L5 geometry is unchanged.

Completion is the same rule everywhere: reach the last zone, carry its loot out,
leave through EXIT. Each level unlocks the next.

### L6 SKYLINE TOWER — lifts
- A lift cabin in every floor's entrance hall.
- **Free:** one floor up/down, only to floors already reached.
- **⭐ Elevator Pass (15⭐, one raid):** lobby ↔ any floor already reached.
- A floor never reached is never offered. Walking the stairs is always free.

### L7 UNDERGROUND CITY — escalators
- Free down-escalators in the side arches: an alternative, faster way back towards EXIT.
- Walking up one gets nowhere (the belt beats the run speed).
- **⭐ Escalator Pass (10⭐, one raid):** opens the express gates between floors
  (only from above, only on floors reached, only for that raid — never saved).

### L8 GRAND COLLECTION — lasers
- Timed beams across the corridor of every floor (1.5 s on / 1.5 s off, visible when off).
- Deeper floors get a second beam half a cycle apart.
- Tripping a live beam raises the alarm to DANGER and lures guards. It is never an instant CAUGHT.
- A wall panel on each floor switches that floor's beams off for 20 s.
- Laser vault rooms hold special loot behind two vertical beams (no panel).

## Two currencies

| | DUCK COIN 💰 | Stars ⭐ |
|---|---|---|
| Earned by | carrying loot out of a raid; selling special loot to the fence | Telegram Stars (purchase seam still unavailable — no fake payments) |
| Buys | Black Market lots, gear (the long way) | gear (the fast way), one-raid boosts, passes, continue, preview |
| Never buys | NFTs | NFTs, Black Market lots, level unlocks |

### Income model
A raid banks what fits in the bag, so income is set by the bag, not the level:

| Bag | 100 | 250 | 500 | 1000 |
|---|---|---|---|---|
| DC per successful raid | ≈ 140 | ≈ 290 | ≈ 520 | ≈ 990 |

- "≈ N raids" hints assume 30 % of raids end CAUGHT.
- Deeper levels fill a big bag faster (C50/C100 coins, big safes).
- L6–L8 special loot pays on top of the bag.

### Gear (tiers 1–3)

| Track | Effect (tier 0 → 3) | DUCK COIN | ⭐ |
|---|---|---|---|
| Bag | 100 → 250 → 500 → 1000 | 500 / 1 600 / 4 200 | 50 / 150 / 400 |
| Disguise | sight/detection ×1 → 0.75 → 0.6 → 0.45 | 750 / 1 800 / 3 600 | 75 / 200 / 450 |
| Shoes | step noise ×1 → 0.65 → 0.5 → 0.38 (tiers 2–3 keep their old speed bonus) | 1 000 / 2 200 / 4 500 | 80 / 220 / 500 |
| Dash | cooldown ×1 → 0.88 → 0.78 → 0.7, distance +0/4/8/12 % | 600 / 1 800 / 4 000 | 60 / 180 / 420 |
| Lockpick | timing window ×1 → 1.15 → 1.3 → 1.45 | 500 / 1 500 / 3 500 | 50 / 150 / 380 |
| Magnet | pickup radius +0 / 12 / 24 / 36 px | 400 / 1 200 / 3 000 | 40 / 120 / 300 |
| Night vision | planned for future dark zones | — | — |

On the free path, Bag 250 takes about 4 raids and Bag 500 about 6 more. Stars shorten that; they never skip a level.

### ⭐ one-offs
- Continue after CAUGHT 25⭐ (once per raid; keeps half the bag, 3 s grace).
- Elevator Pass 15⭐, Escalator Pass 10⭐.
- Preview of the next locked level 30⭐ (first floor only, never completes it).
- One-raid boosts: speed +8 % 15⭐, stealth 15⭐, bag ×1.5 20⭐, quiet step 10⭐.
- There is no "extra attempt": raids don't cost energy yet, so it would sell nothing.

## Black Market
Five display tiers, mapped from the existing lot rarities (ids unchanged, owned items unaffected).

| Tier | Price band | Typical bag | ≈ successful raids |
|---|---|---|---|
| COMMON | 40–280 | 100 | 1–3 |
| RARE | 300–1 400 | 250 | 2–7 |
| EPIC | 1 500–5 800 | 500 | 5–16 |
| LEGENDARY | 6 000–24 000 | 1000 | 9–35 |
| MASTERPIECE | 25 000–150 000 | 1000 | 37–217 |

- Each lot keeps its place inside its tier: prices are mapped log-linearly into the band.
- **Renoir — «Bal du moulin de la Galette»: 50 000 DC** (MASTERPIECE, `RENOIR` in `balance.ts`):
  ≈ 73 successful raids on the 1000 bag, ≈ 138 on the 500 bag. A main long-term goal.
- New lots (`lots/accessible.ts`, `lots/rareObjects.ts`) have fixed prices (`fixedPrice`), so
  existing lot prices are not re-mapped. Rare Objects are fictional DuckJackpot lore and are
  labelled as such in the card.
- The **fence** buys special loot for its full value.

### Black Market 2.0 — MY GOAL
- The whole catalog is browsable (no daily rotation), so a chosen goal can always be bought.
- 236 lots in 8 sections (Black Market 2.1): WATCHES 40, JEWELRY 27, ART 30, ANTIQUES 42,
  COLLECTIBLES 40, CARS 45, RARE OBJECTS 12; MASTERPIECES (29) collects every MASTERPIECE-tier lot.
- Cheapest 120 DC, median ≈ 2 900 DC, most expensive 150 000 DC.
- The goal is chosen **only by the player** (`myGoalId` in the save, `null` for old saves).
  It can be changed or cleared at any time with no penalty; buying the goal item clears it.
- The goal card shows in the HUB, on every successful raid result (+gained, left, ≈ raids)
  and at the top of the Black Market.
- Lot cards: name, art, price/tier, blurb, «ЗНАЕШЬ ЛИ ТЫ?», «ПОЧЕМУ ЭТО ЦЕННО», «ИСТОРИЯ»
  (`lots/history.ts`, verified facts only; no invented auction records), progress, goal/buy.
- Filters ALL / AFFORDABLE / MY GOAL / OWNED; sort by price ↑↓ and rarity; 12 per page.

Loot is persistent per level: the whole game holds ≈ 492k DC, so
masterpieces are real long-term goals, not a treadmill.

## NFT Drop offer
- After 6 minutes of active play in a raid, at most once per 24 h (`nftCtaAt` in the save), the raid pauses and shows:
  «ХОЧЕШЬ НАСТОЯЩИЙ ВЫИГРЫШ? / Загляни в NFT Drop →».
- It quotes the real top prize of the existing draw, says entry is by buying an NFT, and that winning is not guaranteed.
- «ПРОДОЛЖИТЬ ИГРУ» returns to the same raid. «ОТКРЫТЬ NFT DROP» warns first, then opens `/drop`.

## Pause → HUB → continue
PAUSE → «В ХАБ · ПРОДОЛЖИТЬ ПОЗЖЕ» parks the running raid (the same `Raid`
object, in memory for this session). The HUB shows «ПРОДОЛЖИТЬ РЕЙД» and the
raid resumes exactly where it was. Starting another raid drops the parked
one. EXIT banking and CAUGHT loss are unchanged.

## Save (`duckjackpot.heist.progress.v1`, backward compatible)
New fields, all defaulted for old saves:
- `myGoalId` (null)
- `worlds.level6..8`
- `starItems`
- `valuables`
- `nftCtaAt`
- `onboardingSeen`
- `dashLevel` / `lockpickLevel` / `magnetLevel` (now tiers 0–3)

## Notifications
`src/heist/notify.ts` defines the kinds (raid waits, NFT Drop, upgrade,
reward, referral), RU/EN texts and a `NotificationSink` interface. Today
they show in-app (HUB); a Telegram bot sink can be added without touching the rules.

### Black Market 2.1 — full collection
- 34 new lots (`lots/expansion.ts`, fixed prices, all 202 older prices unchanged):
  entry watches (Casio F-91W 150, trench 240, railroad 280 … Seiko Astron 2 600),
  earrings / bracelets / loose stones, coins (Morgan, denarius, Athenian owl), toys, the T206
  Wagner card, affordable classic cars (2CV 220, Fiat 500 260, Mini 280, Beetle 420, Model T 1 100),
  public-domain art (Hokusai, Van Gogh «Sunflowers», Turner, Bruegel) and two lore objects.
- Every lot has «📖 ИСТОРИЯ» (`lots/history.ts`, `historyMore.ts`, `historyMore2.ts`); RU and EN.
- Every lot has its own vector illustration (`economy/art/`): a recipe per lot in `visuals.ts`
  (watch case/bezel/dial/strap, stone/cut/setting, painting composition + frame, car body + livery,
  object form). No two lots share a picture; no network images except Renoir.
- UI: swipeable categories with counts, per-category header («N предметов», description,
  «собрано X из N»), «ПОКАЗАТЬ ЕЩЁ · 12 из 40» with a peek of the next lots,
  «✓ ВСЕ ПРЕДМЕТЫ ПОКАЗАНЫ», VIP «ЗАЛ ШЕДЕВРОВ» for MASTERPIECES, 🎭 badge for fictional lots,
  «🏆 КОЛЛЕКЦИЯ n / total» in the market and on the HUB goal card.

### Black Market 2.2 — lot images
- Every lot has a baked studio render (`tools/lot-renderer`): 288×228 card thumbnail (~5 KB) and
  800×500 detail (~14 KB), lazy-loaded WebP, ≈4.5 MB for all 236. 19 famous paintings use their real
  public-domain images; the vector illustrations remain only as a fallback.
