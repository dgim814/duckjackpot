import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAdmin } from './AdminProvider'
import { useI18n } from '../i18n/LanguageProvider'
import {
  ArrowLeft,
  Banknote,
  Flag,
  Gift,
  Image,
  LayoutDashboard,
  List,
  LogOut,
  Sparkles,
  Settings,
} from 'lucide-react'

const NAV = [
  { to: '/admin', labelKey: 'adminNavDash' as const, icon: LayoutDashboard, end: true },
  { to: '/admin/raffles', labelKey: 'adminNavRaffles' as const, icon: Flag, end: false },
  { to: '/admin/nft', labelKey: 'adminNavNft' as const, icon: Image, end: false },
  { to: '/admin/payments', labelKey: 'adminNavPayments' as const, icon: Banknote, end: false },
  { to: '/admin/cards', labelKey: 'adminNavCards' as const, icon: List, end: false },
  { to: '/admin/payouts', labelKey: 'adminNavPayouts' as const, icon: Gift, end: false },
  { to: '/admin/bonus', labelKey: 'adminNavBonus' as const, icon: Sparkles, end: false },
  { to: '/admin/settings', labelKey: 'adminNavSettings' as const, icon: Settings, end: false },
]

export function AdminGate() {
  const { authed, login } = useAdmin()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const key = params.get('key')
    if (key && !authed) login(key)
  }, [authed, location.search, login])

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <p className="text-[10px] font-extrabold tracking-[0.2em] text-zinc-500">ADMIN</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-zinc-100">{t('adminLoginTitle')}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t('adminLoginHint')}</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError(!login(password))
          }}
        >
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            placeholder={t('adminPassword')}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(false)
            }}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-amber-400/50"
          />
          {error ? <p className="text-xs text-orange-400">{t('adminLoginError')}</p> : null}
          <button type="submit" className="w-full rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-950">
            {t('adminEnter')}
          </button>
        </form>
        <Link to="/" className="mt-6 text-center text-xs text-zinc-600">
          {t('adminBackApp')}
        </Link>
      </div>
    )
  }

  return <Outlet />
}

export function AdminLayout() {
  const { t } = useI18n()
  const { logout } = useAdmin()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-10 pt-[max(12px,env(safe-area-inset-top))]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.2em] text-zinc-500">DUCKJACKPOT</p>
          <h1 className="font-display text-xl font-bold text-zinc-100">{t('adminTitle')}</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-white/10 p-2 text-zinc-400"
            aria-label={t('adminBackApp')}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/admin')
            }}
            className="rounded-lg border border-white/10 p-2 text-zinc-400"
            aria-label={t('adminLogout')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <nav className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {NAV.map(({ to, labelKey, icon: Icon, end }) => {
          const active = end ? location.pathname === to : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={[
                'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold',
                active ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900 text-zinc-400',
              ].join(' ')}
            >
              <Icon size={14} />
              {t(labelKey)}
            </Link>
          )
        })}
      </nav>

      <Outlet />
    </div>
  )
}
