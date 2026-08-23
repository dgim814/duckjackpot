import { Outlet } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'

export function AppLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
