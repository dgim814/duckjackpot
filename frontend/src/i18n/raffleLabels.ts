import type { RaffleId } from '../constants'
import type { MessageKey } from './messages'

export const RAFFLE_TITLE_KEY: Record<RaffleId, MessageKey> = {
  classic: 'raffleClassic',
  fast200: 'raffleFast200',
  fast100: 'raffleFast100',
}

export const RAFFLE_HINT_KEY: Record<RaffleId, MessageKey> = {
  classic: 'raffleClassicHint',
  fast200: 'raffleFast200Hint',
  fast100: 'raffleFast100Hint',
}
