import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'

export function AppLayout() {
  const location = useLocation()
  const hunt = location.pathname === '/hunt' || location.pathname === '/heist'

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <div className={hunt ? '' : 'pb-[calc(4.75rem+env(safe-area-inset-bottom))]'}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
