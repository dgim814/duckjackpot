import { History, Home, Layers, ScrollText, User } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/LanguageProvider'
import type { MessageKey } from '../i18n/messages'

const tabs: { to: string; labelKey: MessageKey; icon: typeof Home; end: boolean }[] = [
  { to: '/', labelKey: 'navHome', icon: Home, end: true },
  { to: '/cards', labelKey: 'navCards', icon: Layers, end: false },
  { to: '/terms', labelKey: 'navTerms', icon: ScrollText, end: false },
  { to: '/history', labelKey: 'navHistory', icon: History, end: false },
  { to: '/profile', labelKey: 'navProfile', icon: User, end: false },
]

export function BottomNav() {
  const { t } = useI18n()
  const location = useLocation()
  const legalActive = location.pathname === '/terms' || location.pathname.startsWith('/legal')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#0d0b10]/95 backdrop-blur-xl">
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
        {tabs.map(({ to, labelKey, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => {
                const active = to === '/terms' ? legalActive : isActive
                return [
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center transition-colors',
                  active ? 'text-amber-300' : 'text-zinc-500',
                ].join(' ')
              }}
            >
              {({ isActive }) => {
                const active = to === '/terms' ? legalActive : isActive
                return (
                  <>
                    <Icon
                      size={20}
                      strokeWidth={active ? 2.4 : 1.8}
                      className={active ? 'drop-shadow-[0_0_8px_rgba(255,193,7,0.55)]' : ''}
                    />
                    <span className="max-w-full text-[10px] font-semibold leading-tight tracking-wide">
                      {t(labelKey)}
                    </span>
                  </>
                )
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
