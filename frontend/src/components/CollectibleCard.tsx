import { getRaffle, type RaffleId } from '../constants'
import { formatSerial, type OwnedCard } from '../cards/CardsProvider'
import { useAdmin } from '../admin/AdminProvider'
import { useI18n } from '../i18n/LanguageProvider'
import { RAFFLE_TITLE_KEY } from '../i18n/raffleLabels'

type CollectibleCardProps = {
  card?: OwnedCard
  raffleId?: RaffleId
  compact?: boolean
}

export function CollectibleCard({ card, raffleId, compact = false }: CollectibleCardProps) {
  const { t } = useI18n()
  const { cardArt } = useAdmin()
  const raffle = getRaffle(card?.raffleId ?? raffleId ?? 'classic')
  const serial = card ? formatSerial(card.serial, raffle.total) : '????'
  const art = cardArt(raffle.id)

  return (
    <article
      className={[
        'card-foil relative overflow-hidden border border-amber-400/35 bg-black',
        compact
          ? 'mx-auto w-[62%] max-w-[220px] rounded-2xl shadow-[0_10px_28px_rgba(255,107,0,0.18)]'
          : 'rounded-[28px] shadow-[0_20px_50px_rgba(255,107,0,0.22)]',
      ].join(' ')}
    >
      <div className="pointer-events-none absolute inset-0 z-10 card-shine" />
      <div
        className={[
          'absolute inset-x-0 top-0 z-20 flex items-center justify-between',
          compact ? 'px-2.5 py-1.5' : 'px-4 py-3',
        ].join(' ')}
      >
        <span className="rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-extrabold tracking-[0.12em] text-amber-300 backdrop-blur-sm">
          {t(RAFFLE_TITLE_KEY[raffle.id])}
        </span>
        <span className="rounded-full bg-black/55 px-2 py-0.5 font-display text-[10px] font-bold text-amber-200 backdrop-blur-sm">
          #{serial}
        </span>
      </div>

      <div className="aspect-[4/5]">
        <img
          src={art}
          alt={t('duckCardAlt')}
          className="h-full w-full object-cover object-[center_42%]"
        />
      </div>

      <div
        className={[
          'absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent',
          compact ? 'px-2.5 pb-2.5 pt-8' : 'px-4 pb-4 pt-16',
        ].join(' ')}
      >
        <p
          className={[
            'font-display font-extrabold tracking-wide text-amber-200',
            compact ? 'text-sm' : 'text-lg',
          ].join(' ')}
        >
          DUCK JACKPOT
        </p>
        {compact ? null : (
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300/90">
            {t('cardTraits')}
          </p>
        )}
        <div className={['flex items-center justify-between text-zinc-300', compact ? 'mt-1 text-[10px]' : 'mt-2 text-xs'].join(' ')}>
          <span>{t('cardSerial', { serial, total: raffle.total })}</span>
          {card ? (
            <span className="font-bold text-amber-300">
              {card.paidWith === 'USDT' ? 'USDT' : 'TON / GRAM'}
            </span>
          ) : (
            <span className="text-zinc-500">{t('cardUnclaimed')}</span>
          )}
        </div>
        {card?.payCode ? (
          <p className="mt-1 font-mono text-[11px] font-bold tracking-wide text-amber-200">{card.payCode}</p>
        ) : null}
        {compact ? null : (
          <p className="mt-2 text-[11px] leading-snug text-amber-100/80">{t('cardRaffleNote')}</p>
        )}
      </div>
    </article>
  )
}
