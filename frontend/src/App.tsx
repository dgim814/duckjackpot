import { TonConnectUIProvider } from '@tonconnect/ui-react'
import WebApp from '@twa-dev/sdk'
import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AdminProvider } from './admin/AdminProvider'
import { FxProvider } from './fx/FxProvider'
import { AdminGate, AdminLayout } from './admin/AdminLayout'
import { AdminDashboardPage } from './admin/pages/AdminDashboardPage'
import { RafflesAdminPage } from './admin/pages/RafflesAdminPage'
import { NftUploadPage } from './admin/pages/NftUploadPage'
import { IssuedCardsPage } from './admin/pages/IssuedCardsPage'
import { PaymentsPage } from './admin/pages/PaymentsPage'
import { PayoutsPage } from './admin/pages/PayoutsPage'
import { BonusAdminPage } from './admin/pages/BonusAdminPage'
import { AdminSettingsPage } from './admin/pages/AdminSettingsPage'
import { CardsProvider } from './cards/CardsProvider'
import { consumePendingGameplayReset } from './heist/consumeGameplayReset'
import { captureTelegramUser } from './telegram/user'
import { AgreementProvider, RequireAgreement } from './i18n/AgreementProvider'
import { LanguageProvider } from './i18n/LanguageProvider'
import { AppLayout } from './layout/AppLayout'
import { AgreementPage } from './pages/AgreementPage'
import { GameHomePage } from './pages/GameHomePage'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { HeistPage } from './pages/HeistPage'
import { BlackMarketPage } from './pages/BlackMarketPage'
import { CollectionPage } from './pages/CollectionPage'
import { HuntPage } from './pages/HuntPage'
import { LegalDocPage } from './pages/LegalDocPage'
import { MyCardsPage } from './pages/MyCardsPage'
import { PreAmlPage } from './pages/PreAmlPage'
import { ProfilePage } from './pages/ProfilePage'
import { TermsPage } from './pages/TermsPage'

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`

function TelegramBoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
    WebApp.setHeaderColor('#09080c')
    WebApp.setBackgroundColor('#09080c')
    captureTelegramUser()
    void consumePendingGameplayReset()
  }, [])
  return children
}

function StartParamGate() {
  const navigate = useNavigate()
  useEffect(() => {
    const param = (WebApp.initDataUnsafe.start_param ?? '').toLowerCase()
    if (param === 'heist') navigate('/heist', { replace: true })
  }, [navigate])
  return null
}

export default function App() {
  return (
    <AdminProvider>
    <FxProvider>
    <LanguageProvider>
      <TelegramBoot>
      <TonConnectUIProvider manifestUrl={manifestUrl}>
        <HashRouter>
          <StartParamGate />
          <AgreementProvider>
            <CardsProvider>
            <Routes>
              <Route path="/admin" element={<AdminGate />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="raffles" element={<RafflesAdminPage />} />
                  <Route path="nft" element={<NftUploadPage />} />
                  <Route path="cards" element={<IssuedCardsPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="payouts" element={<PayoutsPage />} />
                  <Route path="bonus" element={<BonusAdminPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>
              </Route>
              <Route path="/agreement" element={<AgreementPage />} />
              <Route
                element={
                  <RequireAgreement>
                    <AppLayout />
                  </RequireAgreement>
                }
              >
                <Route path="/" element={<GameHomePage />} />
                <Route path="/drop" element={<HomePage />} />
                <Route path="/nft" element={<Navigate to="/drop" replace />} />
                <Route path="/heist" element={<HeistPage />} />
                <Route path="/market" element={<BlackMarketPage />} />
                <Route path="/collection" element={<CollectionPage />} />
                <Route path="/hunt" element={<HuntPage />} />
                <Route path="/cards" element={<MyCardsPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/legal/pre-aml" element={<PreAmlPage />} />
                <Route path="/legal/:docId" element={<LegalDocPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            </CardsProvider>
          </AgreementProvider>
        </HashRouter>
      </TonConnectUIProvider>
      </TelegramBoot>
    </LanguageProvider>
    </FxProvider>
    </AdminProvider>
  )
}
