import { api } from '../api/client'
import type { OwnedCard } from '../cards/CardsProvider'
import { telegramInitData } from './user'

export function syncCardsToBot(cards: OwnedCard[]) {
  const initData = telegramInitData()
  if (!initData) return
  void api
    .post('/me/cards', {
      initData,
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
      })),
    })
    .catch(() => {
      /* bot not running or opened outside Telegram */
    })
}
