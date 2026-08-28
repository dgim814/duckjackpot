import { createHash } from 'node:crypto'

export type FairSeed = {
  seed: string
  source: 'ton_masterchain' | 'timestamp'
  at: number
  blockSeqno?: number
  blockHash?: string
  timestamp?: string
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function seededShuffle<T>(items: T[], seed: string) {
  const next = [...items]
  let counter = 0
  const rand = () => {
    const digest = createHash('sha256').update(`${seed}:${counter}`).digest()
    counter += 1
    return digest.readUInt32BE(0) / 0x1_0000_0000
  }
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

export async function fetchFairSeed(): Promise<FairSeed> {
  const at = Date.now()
  try {
    const res = await fetch('https://toncenter.com/api/v2/getMasterchainInfo', {
      signal: AbortSignal.timeout(8000),
    })
    const data = (await res.json()) as {
      result?: { last?: { seqno?: number; root_hash?: string; file_hash?: string } }
    }
    const last = data.result?.last
    if (last?.root_hash) {
      const material = `${last.seqno}:${last.root_hash}:${last.file_hash ?? ''}`
      return {
        seed: sha256(material),
        source: 'ton_masterchain',
        at,
        blockSeqno: last.seqno,
        blockHash: last.root_hash,
      }
    }
  } catch (err) {
    console.error('[fair-seed] TON masterchain failed', err)
  }
  const timestamp = new Date(at).toISOString()
  return {
    seed: sha256(`duckjackpot:${timestamp}`),
    source: 'timestamp',
    at,
    timestamp,
  }
}
