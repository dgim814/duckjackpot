import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_DIR } from './config.js'
import { DataWriteError, enqueueDataOp, writeJsonAtomic } from './dataQueue.js'

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

export type Payment = {
  id: string
  payCode: string
  usdtExact?: number
  raffleId: string
  serial: number
  telegramId?: number
  telegramUsername?: string
  createdAt: number
  claimedAt: number
  resolvedAt?: number
  status: PaymentStatus
  paidWith: string
  notifyStatus?: string
}

const FILE = join(DATA_DIR, 'payments.json')

function readAll(strict = false): Payment[] {
  try {
    if (!existsSync(FILE)) return []
    const parsed = JSON.parse(readFileSync(FILE, 'utf8')) as Payment[]
    if (!Array.isArray(parsed)) {
      if (strict) throw new DataWriteError()
      return []
    }
    return parsed
  } catch (err) {
    if (!strict) return []
    if (err instanceof DataWriteError) throw err
    throw new DataWriteError()
  }
}

function writeAll(payments: Payment[]) {
  writeJsonAtomic(FILE, payments)
}

function upsertClaimSync(input: Omit<Payment, 'status' | 'claimedAt' | 'resolvedAt'> & { status?: PaymentStatus }) {
  const payments = readAll(true)
  const now = Date.now()
  const index = payments.findIndex((item) => item.id === input.id)
  if (index >= 0) {
    const current = payments[index]
    if (current.status !== 'pending') return current
    const updated: Payment = {
      ...current,
      ...input,
      status: 'pending',
      claimedAt: now,
      createdAt: current.createdAt,
    }
    payments[index] = updated
    writeAll(payments)
    return updated
  }
  const created: Payment = {
    ...input,
    status: 'pending',
    createdAt: input.createdAt || now,
    claimedAt: now,
  }
  payments.unshift(created)
  writeAll(payments)
  return created
}

function setPaymentStatusSync(id: string, status: 'confirmed' | 'rejected') {
  const payments = readAll(true)
  const index = payments.findIndex((item) => item.id === id)
  if (index < 0) return null
  const current = payments[index]
  if (current.status !== 'pending') return current
  const updated: Payment = {
    ...current,
    status,
    resolvedAt: Date.now(),
  }
  payments[index] = updated
  writeAll(payments)
  return updated
}

export function listPayments(filter?: { status?: string; raffleId?: string }) {
  let items = readAll()
  if (filter?.status && filter.status !== 'all') {
    items = items.filter((item) => item.status === filter.status)
  }
  if (filter?.raffleId && filter.raffleId !== 'all') {
    items = items.filter((item) => item.raffleId === filter.raffleId)
  }
  return items.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    return b.claimedAt - a.claimedAt
  })
}

export function getPayment(id: string) {
  const raw = decodeURIComponent(String(id ?? '')).trim()
  if (!raw) return undefined
  return readAll().find((item) => item.id === raw || item.payCode === raw)
}

export function createPayment(input: Omit<Payment, 'status' | 'claimedAt' | 'resolvedAt'> & { status?: PaymentStatus }) {
  return enqueueDataOp('createPayment', input.id, () => upsertClaimSync(input))
}

export const upsertClaim = createPayment

export function setPaymentStatus(id: string, status: 'confirmed' | 'rejected') {
  const op = status === 'confirmed' ? 'confirm' : 'reject'
  return enqueueDataOp(op, id, () => setPaymentStatusSync(id, status))
}

export function setPaymentNotify(id: string, notifyStatus: string) {
  return enqueueDataOp('notify', id, () => {
    const payments = readAll(true)
    const index = payments.findIndex((item) => item.id === id)
    if (index < 0) return
    payments[index] = { ...payments[index], notifyStatus }
    writeAll(payments)
  })
}
