import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { DATA_DIR } from './config.js'

export const WRITE_RETRY_MESSAGE = 'Повторите через несколько секунд'

export class DataWriteError extends Error {
  readonly code = 'write_failed'

  constructor() {
    super(WRITE_RETRY_MESSAGE)
    this.name = 'DataWriteError'
  }
}

export function isDataWriteError(err: unknown): err is DataWriteError {
  return err instanceof DataWriteError
}

let tail: Promise<void> = Promise.resolve()
let length = 0

export function enqueueDataOp<T>(op: string, paymentId: string | undefined, task: () => T): Promise<T> {
  length += 1
  const payment = paymentId?.trim() || ''
  console.log('[data-queue]', { length, paymentId: payment, op })
  const run = tail.then(() => task())
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run.finally(() => {
    length -= 1
  })
}

export function writeJsonAtomic(filePath: string, value: unknown) {
  mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${filePath}.${process.pid}.tmp`
  try {
    writeFileSync(tmp, JSON.stringify(value, null, 2))
    renameSync(tmp, filePath)
  } catch (err) {
    try {
      unlinkSync(tmp)
    } catch {
      /* ignore */
    }
    console.error('[data-queue] write failed', { filePath, err })
    throw new DataWriteError()
  }
}
