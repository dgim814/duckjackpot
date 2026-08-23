import type { ReactNode } from 'react'
import { BetaBadge } from './BetaBadge'
import { LangSwitch } from './LangSwitch'

export function ScreenHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string
  title: string
  subtitle?: ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="min-w-0 pr-2">
        {kicker ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400/80">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-display mt-1 text-[1.45rem] font-extrabold leading-tight gold-text sm:text-2xl">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-zinc-400">{subtitle}</div> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <BetaBadge />
        <LangSwitch />
      </div>
    </header>
  )
}
