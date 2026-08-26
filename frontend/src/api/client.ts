import axios from 'axios'

const PROD_API = 'https://duckjackpot-production.up.railway.app'
const DEV_API = 'http://localhost:3001'

function apiRoot() {
  const fromEnv = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return import.meta.env.DEV ? DEV_API : PROD_API
}

export const API_ORIGIN = apiRoot()

export const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 15_000,
})
