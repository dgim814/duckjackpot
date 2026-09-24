import { loadProgress, persistBankWorld, persistMansionWorld } from '../../progress'
import type { HeistLevelId } from '../../heistLevel'

export type BankWorldSave = {
  lootTaken: Set<string>
  openedSafes: Set<string>
  openedDoors: Set<string>
  depth: number
  reachedFinal: boolean
  complete: boolean
}

export type WorldPersistence = {
  load(): BankWorldSave
  saveDoor(id: string): void
  saveDepth(depth: number, reachedFinal: boolean): void
  saveEscape(p: { lootTaken: string[]; openedSafes: string[]; depth: number; reachedFinal: boolean; complete: boolean }): void
}

/**
 * V2 reads and writes `duckjackpot.heist.progress.v1` through progress.ts, so
 * no data migration is needed and nothing is lost.
 *
 * Rules (same for BANK and MANSION):
 *  - opened doors and depth are world progress: saved the moment they happen;
 *  - coins and safes count only when carried out: saved on a successful EXIT.
 *    A caught raid returns its coins and closed safes to the building.
 */
export const BankPersistence: WorldPersistence = {
  load() {
    const p = loadProgress()
    return {
      lootTaken: new Set(p.bankLootTaken ?? []),
      openedSafes: new Set(p.bankOpenedSafes ?? []),
      openedDoors: new Set(p.bankOpenedDoors ?? []),
      depth: Math.max(0, Math.floor(p.bankDepth ?? 0)),
      reachedFinal: Boolean(p.bankReachedFinal),
      complete: Boolean(p.bankComplete),
    }
  },

  saveDoor(id: string) {
    persistBankWorld({ openedDoors: [id] })
  },

  saveDepth(depth: number, reachedFinal: boolean) {
    persistBankWorld({ depth, reachedFinal })
  },

  saveEscape(p) {
    persistBankWorld({
      lootTaken: p.lootTaken,
      openedSafes: p.openedSafes,
      depth: p.depth,
      reachedFinal: p.reachedFinal,
      complete: p.complete,
    })
  },
}

export const MansionPersistence: WorldPersistence = {
  load() {
    const p = loadProgress()
    return {
      lootTaken: new Set(p.mansionLootTaken ?? []),
      openedSafes: new Set(p.mansionOpenedSafes ?? []),
      openedDoors: new Set(p.mansionOpenedDoors ?? []),
      depth: Math.max(0, Math.floor(p.mansionDepth ?? 0)),
      reachedFinal: Boolean(p.mansionReachedFinal),
      complete: Boolean(p.mansionComplete),
    }
  },

  saveDoor(id: string) {
    persistMansionWorld({ openedDoors: [id] })
  },

  saveDepth(depth: number, reachedFinal: boolean) {
    persistMansionWorld({ depth, reachedFinal })
  },

  saveEscape(p) {
    persistMansionWorld({
      lootTaken: p.lootTaken,
      openedSafes: p.openedSafes,
      depth: p.depth,
      reachedFinal: p.reachedFinal,
      complete: p.complete,
    })
  },
}

export function persistenceFor(level: HeistLevelId): WorldPersistence {
  return level === 'mansion' ? MansionPersistence : BankPersistence
}
