import { api } from '../api/client'
import type { OwnedCard } from '../cards/CardsProvider'
import { captureTelegramUser, telegramInitData } from './user'

function authBody() {
  const buyer = captureTelegramUser()
  return {
    initData: telegramInitData(),
    telegramId: buyer?.telegramId,
    telegramUsername: buyer?.telegramUsername,
  }
}

export async function claimUsdtPayment(card: OwnedCard) {
  const { data } = await api.post('/payments/claim', {
    ...authBody(),
    card: {
      id: card.id,
      raffleId: card.raffleId,
      serial: card.serial,
      paidWith: card.paidWith,
      purchasedAt: card.purchasedAt,
      status: 'pending',
      payCode: card.payCode,
      usdtExact: card.usdtExact,
      telegramId: card.telegramId,
      telegramUsername: card.telegramUsername,
    },
  })
  return data
}

export async function fetchMyServerCards(): Promise<OwnedCard[]> {
  const body = authBody()
  if (!body.initData && !body.telegramId) return []
  const { data } = await api.post<{ cards?: OwnedCard[] }>('/me/cards/fetch', body)
  return Array.isArray(data.cards) ? data.cards : []
}

export function syncCardsToBot(cards: OwnedCard[]) {
  const body = authBody()
  if (!body.initData && !body.telegramId) return
  void api
    .post('/me/cards', {
      ...body,
      cards: cards.map((card) => ({
        id: card.id,
        raffleId: card.raffleId,
        serial: card.serial,
        paidWith: card.paidWith,
        purchasedAt: card.purchasedAt,
        status: card.status,
        payCode: card.payCode,
        usdtExact: card.usdtExact,
        telegramId: card.telegramId,
        telegramUsername: card.telegramUsername,
      })),
    })
    .catch(() => {
      /* backend unavailable */
    })
}
