import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { STORAGE_KEYS } from '../constants'

type AgreementContextValue = {
  accepted: boolean
  accept: () => void
  reset: () => void
}

const AgreementContext = createContext<AgreementContextValue | null>(null)

function readAccepted() {
  try {
    return localStorage.getItem(STORAGE_KEYS.agreement) === '1'
  } catch {
    return false
  }
}

export function AgreementProvider({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState(readAccepted)

  const value = useMemo<AgreementContextValue>(
    () => ({
      accepted,
      accept: () => {
        try {
          localStorage.setItem(STORAGE_KEYS.agreement, '1')
        } catch {
          /* ignore */
        }
        setAccepted(true)
      },
      reset: () => {
        try {
          localStorage.removeItem(STORAGE_KEYS.agreement)
        } catch {
          /* ignore */
        }
        setAccepted(false)
      },
    }),
    [accepted],
  )

  return <AgreementContext.Provider value={value}>{children}</AgreementContext.Provider>
}

export function useAgreement() {
  const ctx = useContext(AgreementContext)
  if (!ctx) throw new Error('useAgreement must be used within AgreementProvider')
  return ctx
}

export function RequireAgreement({ children }: { children: ReactNode }) {
  const { accepted } = useAgreement()
  const location = useLocation()

  if (!accepted) {
    return <Navigate to="/agreement" replace state={{ from: location }} />
  }

  return children
}
