import { STORAGE_KEYS } from '../constants'

const SESSION_PASSWORD = 'duckjackpot.admin.session'

export function getAdminPassword() {
  try {
    return (sessionStorage.getItem(SESSION_PASSWORD) ?? '').trim()
  } catch {
    return ''
  }
}

export function isAdminSession() {
  try {
    return sessionStorage.getItem(STORAGE_KEYS.adminAuth) === '1' && Boolean(getAdminPassword())
  } catch {
    return false
  }
}

export function setAdminSession(password: string) {
  const trimmed = password.trim()
  try {
    sessionStorage.setItem(STORAGE_KEYS.adminAuth, '1')
    sessionStorage.setItem(SESSION_PASSWORD, trimmed)
  } catch {
    /* ignore */
  }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.adminAuth)
    sessionStorage.removeItem(SESSION_PASSWORD)
  } catch {
    /* ignore */
  }
}

export const adminHeaders = {
  get 'x-admin-password'() {
    return getAdminPassword()
  },
}
