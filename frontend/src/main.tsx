import './polyfill'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { bindHeistAudioUnlock } from './heist/heistSfx'
import './index.css'

bindHeistAudioUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
