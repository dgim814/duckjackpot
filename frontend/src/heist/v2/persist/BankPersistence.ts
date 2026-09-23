import { loadProgress, persistBankWorld } from '../../progress'

export type BankWorldSave = {
  lootTaken: Set<string>
  openedSafes: Set<string>
  openedDoors: Set<string>
  depth: number
  reachedFinal: boolean
  complete: boolean
}

/**
 * V2 reads and writes the same `duckjackpot.heist.progress.v1` fields as V1
 * through progress.ts, so no data migration is needed and nothing is lost.
 *
 * Rules:
 *  - opened doors and depth are world progress: saved the moment they happen;
 *  - coins and safes count only when carried out: saved on a successful EXIT.
 *    A caught raid returns its coins and closed safes to the building.
 */
export const BankPersistence = {
  load(): BankWorldSave {
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

  saveEscape(p: { lootTaken: string[]; openedSafes: string[]; depth: number; reachedFinal: boolean; complete: boolean }) {
    persistBankWorld({
      lootTaken: p.lootTaken,
      openedSafes: p.openedSafes,
      depth: p.depth,
      reachedFinal: p.reachedFinal,
      complete: p.complete,
    })
  },
}
