import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { DataWriteError, enqueueDataOp, writeJsonAtomic } from './dataQueue.js'
import { randomInt, randomUUID } from 'node:crypto'
import { getRaffleRound } from './raffleStore.js'
import { RAFFLE_TOTALS } from './prizes.js'

const FILE = join(DATA_DIR, 'cards.json')

export type StoredCard = {
  id: string
  raffleId: string
  serial: number
  paidWith: string
  purchasedAt: number
  status: string
  payCode: string
  usdtExact?: number
  telegramId?: number
  telegramUsername?: string
  round?: number
  /** Who made the card active: 'admin' (confirmed claim) or 'ton_chain' (server-verified TON transfer). */
  verifiedBy?: 'admin' | 'ton_chain'
  verifiedAt?: number
  txHash?: string
}

type Store = Record<string, { cards: StoredCard[]; updatedAt: number }>

function readStore(strict = false): Store {
  try {
    if (!existsSync(FILE)) return {}
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Store
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      if (strict) throw new DataWriteError()
      return {}
    }
    return parsed
  } catch (err) {
    if (!strict) return {}
    if (err instanceof DataWriteError) throw err
    throw new DataWriteError()
  }
}

function writeStore(store: Store) {
  writeJsonAtomic(FILE, store)
}

function stampCard(telegramId: number, card: StoredCard): StoredCard {
  return {
    ...card,
    telegramId,
    round: card.round ?? (card.status === 'past' ? 1 : getRaffleRound(card.raffleId)),
  }
}

function saveUserCardsSync(telegramId: number, cards: StoredCard[]) {
  const store = readStore(true)
  store[String(telegramId)] = {
    cards: cards.map((card) => ({ ...card, telegramId })),
    updatedAt: Date.now(),
  }
  writeStore(store)
}

function getUserCardsSync(telegramId: number, strict = false): StoredCard[] {
  return readStore(strict)[String(telegramId)]?.cards ?? []
}

/**
 * A card coming from the client is only ever a request: a new one is stored as `pending`,
 * an existing one keeps its server status, serial, raffle and round. Only the server
 * (admin confirmation or a verified TON payment) makes a card `active`.
 */
function fromClient(existing: StoredCard | undefined, incoming: StoredCard): StoredCard {
  if (existing) return { ...existing, telegramUsername: incoming.telegramUsername ?? existing.telegramUsername }
  return { ...incoming, status: 'pending', verifiedBy: undefined, verifiedAt: undefined }
}

function upsertUserCardSync(telegramId: number, card: StoredCard) {
  const cards = getUserCardsSync(telegramId, true)
  const index = cards.findIndex((item) => item.id === card.id)
  const nextCard = stampCard(telegramId, fromClient(index >= 0 ? cards[index] : undefined, card))
  if (index >= 0) cards[index] = nextCard
  else cards.unshift(nextCard)
  saveUserCardsSync(telegramId, cards)
  return cards[index >= 0 ? index : 0]
}

function setUserCardStatusSync(telegramId: number, cardId: string, status: string) {
  const cards = getUserCardsSync(telegramId, true)
  const index = cards.findIndex((item) => item.id === cardId)
  if (index < 0) return null
  if (cards[index].status === 'past') return cards[index]
  cards[index] = { ...cards[index], status, telegramId }
  saveUserCardsSync(telegramId, cards)
  return cards[index]
}

function mergeUserCardsSync(telegramId: number, incoming: StoredCard[]) {
  let cards = getUserCardsSync(telegramId, true)
  const rejected: string[] = []
  for (const card of incoming) {
    const index = cards.findIndex((item) => item.id === card.id)
    if (index >= 0) {
      cards[index] = stampCard(telegramId, fromClient(cards[index], card))
      continue
    }
    // A number already sold in this round cannot be claimed again.
    const round = getRaffleRound(card.raffleId)
    if (activeSerialsSync(card.raffleId, round).has(card.serial)) {
      rejected.push(card.id)
      continue
    }
    cards = [stampCard(telegramId, fromClient(undefined, card)), ...cards]
  }
  saveUserCardsSync(telegramId, cards)
  return Object.assign(cards, { rejected })
}

/** Serials of active cards in a raffle round (the numbers that are sold). */
function activeSerialsSync(raffleId: string, round: number, exceptId?: string) {
  const taken = new Set<number>()
  for (const entry of Object.values(readStore(true))) {
    for (const c of entry.cards) {
      if (c.raffleId === raffleId && c.status === 'active' && (c.round ?? 1) === round && c.id !== exceptId) taken.add(c.serial)
    }
  }
  return taken
}

/** The card issued for a verified on-chain payment (by tx hash), if any. */
export function findCardByTx(txHash: string): StoredCard | null {
  for (const entry of Object.values(readStore(false))) for (const c of entry.cards) if (c.txHash === txHash) return c
  return null
}

export function isSerialSold(raffleId: string, serial: number) {
  return activeSerialsSync(raffleId, getRaffleRound(raffleId)).has(serial)
}

function freeSerial(raffleId: string, taken: Set<number>) {
  const total = RAFFLE_TOTALS[raffleId] ?? 0
  if (taken.size >= total) throw new Error('sold_out')
  for (let i = 0; i < total * 2; i += 1) {
    const n = randomInt(1, total + 1)
    if (!taken.has(n)) return n
  }
  for (let n = 1; n <= total; n += 1) if (!taken.has(n)) return n
  throw new Error('sold_out')
}

/**
 * Server-only: make a pending card active. Its serial must be free in the round;
 * a taken or invalid one is replaced by a free serial chosen by the server.
 */
export function activateCard(cardId: string, verifiedBy: 'admin' | 'ton_chain') {
  return enqueueDataOp('issueCard', cardId, () => {
    const store = readStore(true)
    for (const key of Object.keys(store)) {
      const entry = store[key]
      const index = entry.cards.findIndex((c) => c.id === cardId || c.payCode === cardId)
      if (index < 0) continue
      const card = entry.cards[index]
      if (card.status === 'past' || card.status === 'active') return card
      const round = getRaffleRound(card.raffleId)
      const taken = activeSerialsSync(card.raffleId, round, card.id)
      const total = RAFFLE_TOTALS[card.raffleId] ?? 0
      const serial = card.serial >= 1 && card.serial <= total && !taken.has(card.serial) ? card.serial : freeSerial(card.raffleId, taken)
      entry.cards[index] = { ...card, serial, round, status: 'active', verifiedBy, verifiedAt: Date.now() }
      store[key] = { ...entry, updatedAt: Date.now() }
      writeStore(store)
      return entry.cards[index]
    }
    return null
  })
}

/** Server-only: a new active card for a verified on-chain payment (serial chosen by the server). */
export function issueVerifiedCard(input: { telegramId: number; telegramUsername?: string; raffleId: string; paidWith: string; txHash: string; payCode: string }) {
  return enqueueDataOp('issueCard', input.txHash, () => {
    const round = getRaffleRound(input.raffleId)
    const serial = freeSerial(input.raffleId, activeSerialsSync(input.raffleId, round))
    const now = Date.now()
    const card: StoredCard = {
      id: randomUUID(),
      raffleId: input.raffleId,
      serial,
      paidWith: input.paidWith,
      purchasedAt: now,
      status: 'active',
      payCode: input.payCode,
      telegramId: input.telegramId,
      telegramUsername: input.telegramUsername,
      round,
      verifiedBy: 'ton_chain',
      verifiedAt: now,
      txHash: input.txHash,
    }
    const cards = getUserCardsSync(input.telegramId, true)
    saveUserCardsSync(input.telegramId, [card, ...cards])
    return card
  })
}

function setCardStatusByIdSync(cardId: string, status: string): StoredCard | null {
  const id = cardId.trim()
  const store = readStore(true)
  for (const key of Object.keys(store)) {
    const entry = store[key]
    const index = entry.cards.findIndex((item) => item.id === id || item.payCode === id)
    if (index < 0) continue
    if (entry.cards[index].status === 'past') return entry.cards[index]
    entry.cards[index] = { ...entry.cards[index], status }
    store[key] = { ...entry, updatedAt: Date.now() }
    writeStore(store)
    return entry.cards[index]
  }
  return null
}

function archiveRaffleCardsSync(raffleId: string) {
  const store = readStore(true)
  let changed = false
  for (const key of Object.keys(store)) {
    const entry = store[key]
    let dirty = false
    const cards = entry.cards.map((card) => {
      if (card.raffleId !== raffleId || card.status === 'past') return card
      dirty = true
      return { ...card, status: 'past' }
    })
    if (!dirty) continue
    store[key] = { ...entry, cards, updatedAt: Date.now() }
    changed = true
  }
  if (changed) writeStore(store)
}

export function saveUserCards(telegramId: number, cards: StoredCard[]) {
  return enqueueDataOp('issueCard', cards[0]?.id, () => saveUserCardsSync(telegramId, cards))
}

export function getUserCards(telegramId: number): StoredCard[] {
  return getUserCardsSync(telegramId, false)
}

export function upsertUserCard(telegramId: number, card: StoredCard) {
  return enqueueDataOp('issueCard', card.id, () => upsertUserCardSync(telegramId, card))
}

export function setUserCardStatus(telegramId: number, cardId: string, status: string) {
  return enqueueDataOp('issueCard', cardId, () => setUserCardStatusSync(telegramId, cardId, status))
}

export function mergeUserCards(telegramId: number, incoming: StoredCard[]) {
  return enqueueDataOp('issueCard', incoming[0]?.id, () => mergeUserCardsSync(telegramId, incoming))
}

export function getActiveCardsForRaffle(raffleId: string): StoredCard[] {
  const round = getRaffleRound(raffleId)
  const store = readStore(false)
  const cards: StoredCard[] = []
  for (const entry of Object.values(store)) {
    for (const card of entry.cards) {
      if (card.raffleId !== raffleId || card.status !== 'active' || typeof card.telegramId !== 'number') continue
      if ((card.round ?? 1) !== round) continue
      cards.push(card)
    }
  }
  return cards
}

export function archiveRaffleCards(raffleId: string) {
  return enqueueDataOp('issueCard', raffleId, () => archiveRaffleCardsSync(raffleId))
}

export function listAllCards(): StoredCard[] {
  const store = readStore(false)
  const cards: StoredCard[] = []
  for (const entry of Object.values(store)) {
    cards.push(...entry.cards)
  }
  return cards.sort((a, b) => b.purchasedAt - a.purchasedAt)
}

export function findCardById(cardId: string): StoredCard | null {
  const id = cardId.trim()
  if (!id) return null
  const matches: StoredCard[] = []
  for (const entry of Object.values(readStore(false))) {
    for (const card of entry.cards) {
      if (card.id === id || card.payCode === id) matches.push(card)
    }
  }
  if (!matches.length) return null
  const current = matches.find((card) => card.status !== 'past')
  return current ?? matches.sort((a, b) => b.purchasedAt - a.purchasedAt)[0]
}

export function setCardStatusById(cardId: string, status: string): Promise<StoredCard | null> {
  return enqueueDataOp('issueCard', cardId, () => setCardStatusByIdSync(cardId, status))
}
