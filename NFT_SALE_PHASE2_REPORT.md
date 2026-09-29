# DuckJackpot — NFT SALE Phase 2: реальный mint в TON TESTNET

**Статус: Phase 2 завершена.** Одна настоящая покупка NFT #1 в **TON TESTNET** прошла end-to-end через
Mini App. Mainnet не использовался, реальных денег нет (testnet GRAM без ценности), production
NFT Sale выключен (`/api/nft-sale/config` → `{"enabled":false}`).

Дата прогона: 29.09.2026, 16:35 (UTC+5). Код: коммит `c6bb152` (feat: nft sale phase 2 real ton testnet mint).

## 1. Что сделано

- Аудит Phase 1 → добавлено поверх существующей архитектуры (без переписывания):
  - провайдер `ton_testnet`: реальный перевод testnet TON, проверяемый сервером в блокчейне;
  - статус `OWNER_VERIFIED`; безопасный таймаут минта (промежуточный статус, не FAILED вслепую);
  - запись хэшей оплаты / минта / передачи владельцу и ссылки на testnet explorer;
  - стабильные URL метаданных по номеру; скрипт контролируемого деплоя коллекции;
  - hard guard: production + mainnet без `NFT_MAINNET_APPROVED=true` → подсистема не стартует;
  - админка: VERIFY TESTNET COLLECTION, VERIFY TEST NFT, последний минт, ссылки;
  - UI: BUY TEST NFT, оплата кошельком (TON Connect, network `-3`), NFT DELIVERED, VIEW NFT, OPEN ON EXPLORER;
  - аналитика `nft_sale_testnet_*` (11 событий), runbook `docs/NFT_SALE_TESTNET.md`.
- Реальный прогон: минтер пополнен из официального faucet (@testgiver_ton_bot, +2 GRAM ×2) →
  0.4 GRAM на TEST BUYER → деплой коллекции (один раз) → покупка NFT #1 в Mini App → DELIVERED.

## 2–5. Адреса

| | Адрес (testnet, user-friendly) | raw |
|---|---|---|
| Коллекция DUCKJACKPOT HEIST | `kQADGjlWwQrCw90PlqZnat9zNqZGuSAtdeH25cmhQoEuBYmy` | `0:031a3956c10ac2c3dd0f96a6676adf7336a646b9202d75e1f6e5c9a142812e05` |
| Testnet minter (владелец коллекции, testnet-мерчант) | `0QBGT48LabB4y6EReGHSqdjNdCV55-2Y_5JjvJGIwaKyQl7n` | `0:464f8f0b69b078cba1117861d2a9d8cd742579e7ed98ff9263bc9188c1a2b242` |
| TEST BUYER (отдельный тестовый кошелёк) | `0QCiEVgYhI9AA5RMv-VCN0_1UhODzGHumSJcUT8T_oERmuuK` | `0:a2115818848f4003944cbfe542374ff5521383cc61ee99225c513f13fe81119a` |
| NFT #1 (item index 0) | `kQA5rKt2VcVSAn5khQvHtvVXq_Rbeo3F7wxhYsV1gndl-Rtb` | `0:39acab7655c552027e64850bc7b6f557abf45b7a8dc5ef0c6162c575827765f9` |

Контракты — официальные эталонные TEP-62 (ton-blockchain/token-contract, commit `21e7844f`), без
изменений: code hash коллекции и item в сети = эталонным (проверено VERIFY-кнопками).

## 6–8. Транзакции

| | Хэш | Что внутри (проверено TON Center v3 + tonviewer) |
|---|---|---|
| 6. Оплата | `3ee75a8ad281782c60b8eff6071f9e336ad07dc2860c3bfde41f4d61b7331472` | TEST BUYER → minter, 0.05 GRAM, комментарий `DJH-eb676250a5c7a41d`, compute success, не aborted, не bounced |
| 7. Минт | `03a510b2a0e4d554ce050de149c8d88f6ecb6d037890b5725ecbc8bfc50ce3d9` | external-in кошелька минтера → op 1 (deploy NFT, index 0) в коллекцию |
| 8. Передача владельцу | `6b083fee3ca46932585a5edcc29043a493c3adc3cfbeb69aecb190682fa8453f` | коллекция → новый item (0.06 GRAM), item инициализирован с owner = TEST BUYER |

**Про «NFT transfer».** В архитектуре Phase 1 выбран lazy mint: NFT создаётся сразу на кошелёк
покупателя. Отдельной TEP-62 операции transfer (`0x5fcc3d14`) нет — «передача» это транзакция
развёртывания item, в которой владельцем записывается покупатель (строка 8). Отдельный transfer был
бы нужен только при pre-mint на кошелёк проекта (не выбран: непроданный инвентарь не лежит на горячем
ключе).

## 9. Проверка владельца

- Сервер сам вызвал `get_nft_data` у item (не данные клиента): `init = true`, `index = 0`,
  `collection = kQADGjlW…`, `owner = 0:a2115818…119a` = TEST BUYER → `OWNER_VERIFIED`.
- Независимо: TonAPI testnet `/v2/nfts/kQA5rKt2…` → owner `0:a2115818…119a`, collection
  `DUCKJACKPOT HEIST`, index 0, метаданные подтянуты.
- tonviewer (built-in browser): «DuckJackpot HEIST #1», тип `nft_item`, владелец `0QCiEVgY…_oERmuuK`.

## 10. Метаданные (реальный HTTP)

- Коллекция: https://duckjackpot-production.up.railway.app/api/nft-sale/testnet/metadata/collection.json
  → `DUCKJACKPOT HEIST`, symbol `HEIST`, «TESTNET COLLECTION — NOT MAINNET», «TESTNET PLACEHOLDER — NOT FINAL ART».
- NFT #1: https://duckjackpot-production.up.railway.app/api/nft-sale/testnet/metadata/1
  → «DuckJackpot HEIST #1», описание «TESTNET PLACEHOLDER — NOT FINAL ART…», атрибуты Collection HEIST,
  Edition «1 of 2000», Network «TON TESTNET», Art «TESTNET PLACEHOLDER — NOT FINAL ART».
- URL, который собирает сама коллекция (`get_nft_content`), совпадает с этим адресом (проверено on-chain).
- Картинка: заглушка с красной плашкой TESTNET PLACEHOLDER (финальный арт не использован).

## 11. Ссылки (TON TESTNET explorer, все открываются, HTTP 200)

- Коллекция: https://testnet.tonviewer.com/kQADGjlWwQrCw90PlqZnat9zNqZGuSAtdeH25cmhQoEuBYmy
- NFT #1: https://testnet.tonviewer.com/kQA5rKt2VcVSAn5khQvHtvVXq_Rbeo3F7wxhYsV1gndl-Rtb
- Оплата: https://testnet.tonviewer.com/transaction/3ee75a8ad281782c60b8eff6071f9e336ad07dc2860c3bfde41f4d61b7331472
- Минт: https://testnet.tonviewer.com/transaction/03a510b2a0e4d554ce050de149c8d88f6ecb6d037890b5725ecbc8bfc50ce3d9
- Передача владельцу: https://testnet.tonviewer.com/transaction/6b083fee3ca46932585a5edcc29043a493c3adc3cfbeb69aecb190682fa8453f
- Minter: https://testnet.tonviewer.com/0QBGT48LabB4y6EReGHSqdjNdCV55-2Y_5JjvJGIwaKyQl7n
- TEST BUYER: https://testnet.tonviewer.com/0QCiEVgYhI9AA5RMv-VCN0_1UhODzGHumSJcUT8T_oERmuuK

Mainnet-ссылок нет нигде.

## 12–14. Заказ и инвентарь

- Order ID: `eb676250a5c7a41dceb2f951` (payment `tt_b40c3f376098648876b2`)
- Финальный статус: **DELIVERED**. История:
  `PENDING → RESERVED → PAYMENT_PENDING → PAID → MINTING → DELIVERING → OWNER_VERIFIED → DELIVERED`
  (27 с от отправки оплаты до DELIVERED).
- Payment: CONFIRMED (PAID, отправитель = TEST BUYER). Mint: CONFIRMED. Owner: VERIFIED.
- Inventory: #1 → **DELIVERED**; 1999 AVAILABLE, 0 RESERVED / MINTING / FAILED. Orders: 1.
- Повтор доставки после успеха → отказ `not_failed`, seqno минтера не изменился (второго минта нет).
- Состояние прогона (заказ, инвентарь, адрес коллекции) хранится в локальной non-production среде
  прогона; production-данные не менялись.

## 15. Какие тесты прошли

| Набор | Результат |
|---|---|
| NFT Sale (node:test): ton_proof 9, chain 9, sale 16, payment (on-chain) 15, HTTP 16 | **65/65** |
| Сценарии A–M (duplicate payment, reused tx, wrong comment, insufficient amount, wrong recipient, wrong network, fake tx hash, client NFT number / owner / PAID / DELIVERED, retry after delivery, retry after timeout) + wrong sender, expired reservation, refund | все прошли |
| ton_proof: expired, invalid signature, wrong domain, wrong network, wrong wallet, reused nonce | все отклоняются |
| UI E2E на sandbox (реальные подписанные переводы) | 18/18 |
| **Реальный E2E в TON TESTNET** | 18/19 + админ-проверка 4/4 (см. п. 16) |
| Независимая проверка: TON Center v3 (3 хэша), TonAPI testnet (NFT + коллекция), tonviewer (7 ссылок) | всё подтверждено |
| Регрессия: Stars 35, Supporter 30 (+UI 16), рефералы 53 (+UI 36), выплаты 42, миссия 28, уведомления 11, Daily Reward 29, аналитика 23, NFT Drop UI 6, P0-безопасность 23 (эксплойт → 401), HUB 34, лобби 3, Stars UI 11, игра: raid 26 (BANK/MANSION), grand raid 37, levels 32 (L3–L5), dash 9, features 48, goal 19 (Black Market), tutorial, nocars | зелёные |
| Сборка frontend/backend, typecheck (src + tests), сверка контрактов с исходниками | OK |

## 16. Какие тесты не прошли

- Реальный E2E, 1 проверка «admin UI»: скрипт нажал VERIFY TEST NFT раньше, чем страница админки
  загрузилась (обзор идёт через TON Center с лимитом 1 запрос/с). Это ошибка тайминга теста, не
  продукта: отдельная read-only проверка той же админки на реальном состоянии — 4/4 (VERIFY TEST NFT
  и VERIFY TESTNET COLLECTION `ok: true`). Скрипт исправлен (ждёт загрузку). Покупку не повторял.
- Известные baseline (падают так же на старых коммитах): `qa_stars_queue` 4 (проверяет старую модель
  ⭐10/⭐5), `qa_tg` 6 (во временной обёртке нет маршрутов `/market`, `/nft`).

## 17. Нумерация и `next_item_index` (зафиксировано, решение не принималось)

- Отображение: NFT #N = item index N−1 (#1 → index 0 … #2000 → index 1999). Имя, атрибут Edition и
  URL метаданных используют N.
- Коллекция развёрнута с `next_item_index = 2000`, чтобы эталонный контракт позволял минтить номера в
  любом порядке (резерв может истечь, пока более поздний номер уже оплачен).
- **Explorer уже показывает «2000 штук» у коллекции до фактического минта** (tonviewer: «kQAD…BYmy ·
  2000 штук»; TonAPI `next_item_index: 2000`), хотя существует 1 NFT.
- Последствия для Mainnet: покупатели и маркетплейсы увидят «2000 предметов» при реальных N
  проданных; некоторые индексаторы перебирают 0…next−1 и найдут несуществующие адреса; контракт
  технически принял бы и index 2000 (сервер его никогда не отправляет).
- Варианты перед Mainnet: (а) оставить так и объяснить; (б) коллекция non-sequential (TEP-62
  допускает `next_item_index = −1`) — это изменение контракта, нужен аудит; (в) строго
  последовательный минт с назначением номера в момент оплаты; (г) pre-mint. **Нужно ваше решение.**

## 18. Что осталось до Mainnet

Отдельный этап только с вашим разрешением: реальный платёжный провайдер/мерчант, mainnet-коллекция с
финальным артом и неизменяемыми метаданными, хранение ключей, юридический пакет, мониторинг, затем
малый пилот.

## 19. Оставшиеся security risks

- Ключ минтера — «горячий» (в памяти процесса / Railway secret). Для mainnet: отдельный кошелёк с
  малым балансом, пополнение по мере продаж, 2-человеческий контроль, ротация.
- Метаданные на Railway изменяемы (владелец сервера может поменять JSON). Для mainnet — IPFS или
  другой неизменяемый хостинг.
- Проверка оплаты читает последние 50 транзакций мерчанта; при большом потоке нужен индексатор/
  вебхуки (TonAPI) и курсор по lt.
- Бесплатный TON Center: 1 запрос/с — нужен API-ключ (TON Center или TonAPI).
- Нет лимитов на число заказов/нонсов на пользователя и анти-бот защиты.
- ton_proof берёт публичный ключ из state init (v1–v4, W5). Для экзотических кошельков стоит добавить
  `get_public_key` из сети.
- Возврат в testnet — перевод с минтера; для mainnet нужна политика возвратов и отдельный кошелёк.
- Коллекция «НЕПРОВЕРЕНО» в tonviewer/Getgems — для mainnet нужна верификация коллекции.

## 20. Что нужно решить перед Mainnet

| Вопрос | Статус |
|---|---|
| Final artwork (HEIST) | нужен — сейчас заглушка TESTNET PLACEHOLDER |
| Immutable metadata (IPFS / content-hash) | решить |
| Numbering / `next_item_index` (п. 17) | решить |
| Royalties (TEP-66), % и адрес | решить (сейчас 0) |
| Minter key custody | решить (HSM/2 человека/малый баланс) |
| Payment provider (TonRamp / on-chain USDT / другой) | решить, KYB у провайдера |
| Merchant wallet (отдельно от минтера) | решить |
| Refunds (кто, как, сроки) | решить |
| Terms of Sale / NFT terms (что получает покупатель, не игровой предмет) | нужны |
| Privacy (связь Telegram ↔ кошелёк) | обновить политику |
| Legal / KYC / KYB / AML / санкции / налоги | юрист |
| NFT delivery policy (сроки, что если кошелёк недоступен) | решить |
| Failed mint policy (повтор/возврат, SLA) | решить |
| Support / admin recovery (runbook, алерты, доступы) | решить |

## Безопасность прогона

- Мнемоники только в `~/.duckjackpot/` (0600): не выводились, не логировались, не в git и не в чате;
  проверка серверных логов: 0 слов мнемоники.
- Production: `NFT_SALE_ENABLED=false`, пользовательские эндпоинты 404, dev-эндпоинты sandbox 404,
  тестовые платёжные провайдеры в production отклоняются.
- NFT Drop, gameplay, Stars, Supporter, рефералы, Affiliate не менялись.
