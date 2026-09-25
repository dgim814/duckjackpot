/** Dev-only QA page: the real Black Market page with a demo save, opened on ?section=. */
import '/src/index.css'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminProvider } from '/src/admin/AdminProvider'
import { FxProvider } from '/src/fx/FxProvider'
import { LanguageProvider } from '/src/i18n/LanguageProvider'
import { BlackMarketPage } from '/src/pages/BlackMarketPage'

const q = new URLSearchParams(location.search)
const KEY = 'duckjackpot.heist.progress.v1'
if (q.get('seed') !== '0') {
  const cur = JSON.parse(localStorage.getItem(KEY) || '{}')
  localStorage.setItem(KEY, JSON.stringify({ ...cur, bankedDuckCoin: 8394, bankComplete: true, onboardingSeen: true, myGoalId: 'art_sketch', ownedArt: { watch_breguet_classique: 1 } }))
}
document.documentElement.style.setProperty('--tg-content-safe-area-inset-top', '47px')
createRoot(document.getElementById('qa')!).render(
  <AdminProvider>
    <FxProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/market']}>
          <Routes>
            <Route path="/market" element={<BlackMarketPage />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </FxProvider>
  </AdminProvider>,
)
const section = q.get('section')
const names: Record<string, string> = { WATCHES: 'WATCHES', JEWELRY: 'JEWELRY', ART: 'ART', ANTIQUES: 'ANTIQUES', COLLECTIBLES: 'COLLECTIBLES', CARS: 'CARS', RARE: 'RARE', MASTERPIECES: 'ЗАЛ ШЕДЕВРОВ' }
let stable = 0
const tick = setInterval(() => {
  const head = document.querySelector('.bm-sec-head') as HTMLElement | null
  if (!head) return
  if (section && !head.textContent?.toUpperCase().includes(names[section])) {
    document.getElementById('bm-sec-' + section)?.click()
    stable = 0
    return
  }
  const sort = q.get('sort')
  if (sort && !document.body.dataset.sorted) {
    ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === sort)?.click()
    document.body.dataset.sorted = '1'
    stable = 0
    return
  }
  if (section) window.scrollTo(0, head.getBoundingClientRect().top + window.scrollY - 8)
  if (q.get('open') && stable === 2 && !document.querySelector('.bm-sheet-layer')) {
    const cards = [...document.querySelectorAll('.bm-card')]
    const card = cards.find((c) => c.textContent?.includes(q.get('open')!)) ?? cards[0]
    ;(card?.querySelector('button') as HTMLButtonElement | null)?.click()
  }
  if (++stable >= 4) {
    document.body.dataset.ready = '1'
    clearInterval(tick)
  }
}, 300)
