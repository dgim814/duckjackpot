import axios, { isAxiosError } from 'axios'

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

export function formatApiError(err: unknown) {
  if (!isAxiosError(err)) return err instanceof Error ? err.message : String(err)
  const method = (err.config?.method ?? 'GET').toUpperCase()
  const base = (err.config?.baseURL ?? '').replace(/\/$/, '')
  const path = err.config?.url ?? ''
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
  if (!err.response) {
    return `${method} ${url || API_ORIGIN} · сеть (${err.code ?? err.message})`
  }
  const status = err.response.status
  const body = err.response.data
  const server =
    body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : ''
  return server ? `${method} ${url} · HTTP ${status} · ${server}` : `${method} ${url} · HTTP ${status}`
}
