import './polyfill'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bindHeistAudioUnlock } from './heist/heistSfx'
import './index.css'
import { trackAppOpen } from './analytics/track'

bindHeistAudioUnlock()
trackAppOpen()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
