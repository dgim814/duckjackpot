import type { HeistEnd } from '../../types'
import { raidObjectiveBonus, type HeistRunMods } from '../../progress'
import { heistLevelObjectives, type HeistLevelId } from '../../heistLevel'
import { resolveTuning } from '../../debugConfig'
import type { HeistTuning } from '../../tuning'
import type { DuckCoinKind } from '../../coinAssets'
import { levelDef, zoneAt, type DoorDef, type LevelDef, type Rect, type SafeDef } from '../level/LevelDef'
import { persistenceFor, type BankWorldSave, type WorldPersistence } from '../persist/BankPersistence'
import { Alert } from './Alert'
import { SolidGrid, distToRect, pointInRect, type Solid } from './Collision'
import { CrackGame, DOOR_HITS, SAFE_HITS } from './Crack'
import type { RaidEvent, RaidPhase } from './events'
import { GuardSystem, type GuardWorld } from './Guards'
import type { InputSample } from './Input'
import { LootField } from './Loot'
import { Nav } from './Nav'
import { Player } from './Player'
import { CamSystem } from './SecurityCams'

export const SIM_DT = 1 / 60
const DOOR_RANGE = 80
const SAFE_RANGE = 90
const EXIT_HOLD = 0.6
const INTRO_S = 3.4
const NAV_CELL = 24
const NAV_PAD = 16

export type DoorState = 'CLOSED' | 'HACKING' | 'OPEN'
export type Door = DoorDef & { state: DoorState; solid: Solid; openedAt: number }
export type Safe = SafeDef & { opened: boolean; openedAt: number }
type Carried = { kind: DuckCoinKind; value: number; weight: number; persistId?: string }
export type Prompt = { kind: 'door' | 'safe' | 'nft'; x: number; y: number } | null

export class Raid {
  readonly level: LevelDef
  readonly cfg: HeistTuning
  readonly solids: SolidGrid
  readonly nav: Nav
  readonly player: Player
  readonly guards: GuardSystem
  readonly cams: CamSystem
  readonly loot: LootField
  readonly doors: Door[]
  readonly safes: Safe[]
  readonly alert: Alert
  readonly events: RaidEvent[] = []
  readonly objLoot: number
  readonly objTimeS: number

  time = 0
  paused = false
  crack: CrackGame | null = null
  bag = 0
  carried: Carried[] = []
  hidden = false
  exitHold = 0
  sirenOn = false
  escapeUntil = -1
  hitStopUntil = -1
  stealthBroken = false
  zoneNow = 0
  zoneMax = 0
  depthBest = 0
  reachedFinal = false
  introUntil = -1
  firstLootAt = -1
  lastDoorOpenedAt = -1
  lastSafe: { reward: number; at: number } | null = null
  bagFullAt = -1
  dropReadyAt = 0
  prompt: Prompt = null
  verdict: HeistEnd['verdict'] | null = null
  result: HeistEnd | null = null

  private save: BankWorldSave | null
  private store: WorldPersistence
  private runLootIds: string[] = []
  private runSafes: string[] = []
  private caughtFlag = false

  constructor(
    readonly levelId: HeistLevelId,
    readonly mods: HeistRunMods,
    readonly novice: boolean,
  ) {
    this.level = levelDef(levelId)
    this.cfg = resolveTuning(levelId)
    // BANK and MANSION persist the same way, each in its own fields.
    this.store = persistenceFor(levelId)
    this.save = this.store.load()
    const obj = heistLevelObjectives(levelId)
    this.objLoot = Math.min(obj.loot, mods.bagCap)
    this.objTimeS = obj.timeS

    const L = this.level
    this.solids = new SolidGrid(L.w, L.h)
    for (const s of L.solids) this.solids.add(s)
    this.doors = L.doors.map((d) => {
      const solid = this.solids.add(d)
      const open = Boolean(this.save?.openedDoors.has(d.id))
      solid.active = !open
      return { ...d, state: open ? 'OPEN' : 'CLOSED', solid, openedAt: -1 } as Door
    })
    this.nav = new Nav(this.solids, NAV_CELL, NAV_PAD)

    this.player = new Player(L.spawn.x, L.spawn.y)
    this.guards = new GuardSystem(this.guardRoutes(), this.nav, { antiStuck: levelId === 'mansion' })
    this.cams = new CamSystem(this.cfg.counts.cams == null ? L.cams : L.cams.slice(0, this.cfg.counts.cams))
    this.alert = new Alert(this.cfg.alert)

    this.loot = new LootField(Math.ceil(L.w / 256))
    const taken = this.save?.lootTaken
    for (const c of L.loot) {
      if (c.persistent && taken?.has(c.id)) continue
      this.loot.spawn(c.x, c.y, c.kind, { persistId: c.persistent ? c.id : undefined, weight: this.itemWeight(c.kind) })
    }
    this.safes = L.safes.map((s) => ({ ...s, opened: Boolean(this.save?.openedSafes.has(s.id)), openedAt: -1 }))
    for (const s of this.safes) {
      if (!s.opened || !s.extra || taken?.has(s.extra.id)) continue
      this.loot.spawn(s.extra.x, s.extra.y, s.extra.kind, { persistId: s.extra.id, weight: this.itemWeight(s.extra.kind) })
    }

    this.depthBest = this.save?.depth ?? 0
    this.reachedFinal = this.save?.reachedFinal ?? false
    if (novice && levelId === 'bank') this.introUntil = INTRO_S
  }

  private guardRoutes() {
    const routes = this.level.guardRoutes
    const n = this.cfg.counts.guards
    return n == null ? routes : routes.slice(0, n)
  }

  // ---------- derived state ----------

  get ended() {
    return this.verdict !== null
  }

  weightOn() {
    return this.cfg.weight.enabled
  }

  weightCap() {
    const caps = this.cfg.weight.caps
    return caps[Math.max(0, Math.min(caps.length - 1, this.mods.bagLevel))] ?? 0
  }

  carriedWeight() {
    let w = 0
    for (const c of this.carried) w += c.weight
    return w
  }

  itemWeight(kind: DuckCoinKind) {
    return this.cfg.weight.item[kind] ?? 1
  }

  /** 0 below the penalty start, 1 at a full load. */
  weightOver() {
    if (!this.weightOn()) return 0
    const cap = this.weightCap()
    const w = this.carriedWeight()
    if (cap <= 0 || w <= 0) return 0
    const load = Math.min(1, w / cap)
    const start = Math.min(0.99, this.cfg.weight.penaltyStart)
    return Math.max(0, Math.min(1, (load - start) / (1 - start)))
  }

  canDrop() {
    const w = this.cfg.weight
    if (!w.enabled || !w.dropEnabled || this.carried.length === 0 || this.crack) return false
    if (this.levelId === 'bank' && this.carried.length < 2 && this.weightOver() <= 0) return false
    return true
  }

  phase(): RaidPhase {
    return this.alert.phase
  }

  // ---------- commands ----------

  setPaused(on: boolean) {
    if (this.ended) return
    this.paused = on
  }

  abort() {
    if (this.ended) return
    this.finish('aborted')
  }

  // ---------- simulation ----------

  step(input: InputSample) {
    if (this.paused || this.ended) return
    const dt = SIM_DT
    this.time += dt
    const frozen = this.time < this.hitStopUntil
    const ev = this.events

    this.hidden = this.level.hides.some((h) => pointInRect(this.player.x, this.player.y, h))

    if (this.crack) {
      this.crack.step(dt)
      if (input.action) this.tapCrack()
    } else if (input.action) {
      this.tryAction()
    }
    if (input.drop) this.tryDrop()

    const over = this.weightOver()
    if (!frozen) {
      this.player.step(dt, input, {
        cfg: this.cfg.player,
        speedMul: this.mods.speedMul,
        weightMul: 1 - this.cfg.weight.maxSpeedPenalty * over,
        noiseMul: 1 + this.cfg.weight.maxNoiseBonus * over,
        silentShoes: this.mods.silentShoes,
        walkCut: this.levelId === 'bank' ? 0.28 : 0.55,
        hidden: this.hidden,
        locked: this.crack !== null,
        time: this.time,
        solids: this.solids,
      })
      if (this.player.dashed) ev.push({ t: 'dash' })
      if (this.player.sneakStarted) ev.push({ t: 'sneakStart' })
      if (this.player.stepped) ev.push({ t: 'step', sneak: this.player.anim === 'sneak' })
    }

    if (!this.crack) {
      this.collectLoot()
      this.updateExit(dt)
      if (this.ended) return
    }
    this.updatePrompt()
    this.updateZone()

    this.cams.step(dt, this.cfg, this.player, this.hidden, this.mods.disguiseMul, this.alert.camSpeedMul(), this.solids)
    if (this.cams.newlyHot) ev.push({ t: 'cameraAlert' })
    if (this.cams.sees) {
      this.alert.add(dt * this.cfg.alert.cam * this.mods.disguiseMul)
      this.guards.alertAll(this.guardWorld(), this.alert.value >= 1)
    }

    if (!frozen) this.guards.step(dt, this.guardWorld())
    if (this.caughtFlag) {
      this.finish('caught')
      return
    }

    const gw = this.guardWorld()
    this.alert.step(dt, {
      chasing: this.guards.anyChase(),
      sightDetect: this.guards.maxSightDetect(),
      anySight: this.guards.anySees(),
      camSees: this.cams.sees,
      heard: this.guards.anyHears(gw),
      hidden: this.hidden,
      disguiseMul: this.mods.disguiseMul,
    })
    if (this.alert.changed) {
      ev.push({ t: 'phase', ...this.alert.changed })
      if (this.alert.changed.rising && this.alert.changed.phase === 'DANGER') {
        this.guards.lure(this.player.x, this.player.y, this.cfg.alert.sweepRadius, gw, false)
      }
    }
    if (this.alert.value >= this.cfg.alert.bandDanger || this.guards.anyChase()) this.stealthBroken = true

    if (this.escapeUntil > 0 && this.time >= this.escapeUntil) this.finish('caught')
  }

  private guardWorld(): GuardWorld {
    return {
      cfg: this.cfg,
      nav: this.nav,
      solids: this.solids,
      time: this.time,
      player: this.player.box,
      playerHidden: this.hidden,
      playerNoise: this.player.noise,
      disguiseMul: this.mods.disguiseMul,
      speedMul: this.alert.guardSpeedMul(),
      alertValue: this.alert.value,
      events: this.events,
      onCaught: () => {
        this.caughtFlag = true
      },
    }
  }

  private collectLoot() {
    const room = this.mods.bagCap - this.bag
    const coin = this.loot.nearestPickable(this.player.x, this.player.y, this.time)
    if (!coin) return
    if (room <= 0) {
      if (this.time - this.bagFullAt > 1.2) {
        this.bagFullAt = this.time
        this.events.push({ t: 'bagFull' })
      }
      return
    }
    const gained = Math.min(coin.value, room)
    this.loot.take(coin)
    this.bag += gained
    this.carried.push({ kind: coin.kind, value: gained, weight: coin.weight, persistId: coin.persistId })
    if (coin.persistId && !this.runLootIds.includes(coin.persistId)) this.runLootIds.push(coin.persistId)
    this.events.push({ t: 'pickup', x: coin.x, y: coin.y, value: gained, kind: coin.kind })
    if (this.firstLootAt < 0) {
      this.firstLootAt = this.time
      this.events.push({ t: 'firstLoot' })
    }
    if (this.bag >= this.mods.bagCap) {
      this.bagFullAt = this.time
      this.events.push({ t: 'bagFull' })
    }
  }

  private tryDrop() {
    if (!this.canDrop() || this.time < this.dropReadyAt) return
    const w = this.cfg.weight
    let idx = 0
    for (let i = 1; i < this.carried.length; i += 1) if (this.carried[i].weight > this.carried[idx].weight) idx = i
    const item = this.carried.splice(idx, 1)[0]
    this.dropReadyAt = this.time + w.dropCooldownMs / 1000
    this.bag = Math.max(0, this.bag - item.value)
    if (item.persistId) this.runLootIds = this.runLootIds.filter((id) => id !== item.persistId)
    let x = this.player.x - this.player.facingX * 40
    let y = this.player.y - this.player.facingY * 40
    if (this.solids.pointBlocked(x, y)) {
      x = this.player.x
      y = this.player.y
    }
    this.loot.spawn(x, y, item.kind, {
      persistId: item.persistId,
      value: item.value,
      weight: item.weight,
      lockedUntil: this.time + w.dropRepickupMs / 1000,
    })
    this.guards.lure(x, y, w.dropLureRadius, this.guardWorld(), w.dropDistractsChase)
    this.events.push({ t: 'drop', x, y, value: item.value })
  }

  private nearestDoor(): Door | null {
    let best: Door | null = null
    let bestD = DOOR_RANGE
    for (const d of this.doors) {
      if (d.state !== 'CLOSED') continue
      const dist = distToRect(this.player.x, this.player.y, d)
      if (dist <= bestD) {
        bestD = dist
        best = d
      }
    }
    return best
  }

  private nearestSafe(): Safe | null {
    let best: Safe | null = null
    let bestD = SAFE_RANGE
    for (const s of this.safes) {
      if (s.opened) continue
      const d = Math.hypot(this.player.x - s.x, this.player.y - s.y)
      if (d <= bestD) {
        bestD = d
        best = s
      }
    }
    return best
  }

  private updatePrompt() {
    if (this.crack) {
      this.prompt = null
      return
    }
    const door = this.nearestDoor()
    if (door) {
      this.prompt = { kind: 'door', x: door.x + door.w / 2, y: door.y + door.h / 2 }
      return
    }
    const safe = this.nearestSafe()
    if (safe) {
      this.prompt = { kind: 'safe', x: safe.x, y: safe.y }
      return
    }
    const vault = this.level.nftVault
    this.prompt = vault && pointInRect(this.player.x, this.player.y, vault.view) ? { kind: 'nft', x: this.player.x, y: vault.grille.y } : null
  }

  private tryAction() {
    if (this.crack) return
    if (this.prompt?.kind === 'nft') {
      // Looking through the bars: nothing is taken, the bag is untouched.
      this.events.push({ t: 'nftView' })
      return
    }
    const door = this.nearestDoor()
    if (door) {
      door.state = 'HACKING'
      this.crack = new CrackGame('door', door.id, DOOR_HITS)
      this.events.push({ t: 'crackStart', kind: 'door' })
      return
    }
    const safe = this.nearestSafe()
    if (safe) {
      this.crack = new CrackGame('safe', safe.id, SAFE_HITS)
      this.events.push({ t: 'crackStart', kind: 'safe' })
    }
  }

  cancelCrack() {
    if (!this.crack) return
    if (this.crack.kind === 'door') {
      const door = this.doors.find((d) => d.id === this.crack?.targetId)
      if (door && door.state === 'HACKING') door.state = 'CLOSED'
    }
    this.crack = null
  }

  private tapCrack() {
    const crack = this.crack
    if (!crack) return
    const res = crack.tap(this.time)
    if (res === null) return
    if (res === 'miss') {
      this.alert.add(this.cfg.alert.safeMiss)
      this.events.push({ t: 'crackMiss' })
      return
    }
    this.events.push({ t: 'crackHit', hits: crack.hits, need: crack.need })
    if (res !== 'done') return
    this.crack = null
    if (crack.kind === 'door') this.openDoor(crack.targetId)
    else this.openSafe(crack.targetId)
  }

  /** The single place a door changes to OPEN: solid off, nav patched, progress saved. */
  private openDoor(id: string) {
    const door = this.doors.find((d) => d.id === id)
    if (!door || door.state === 'OPEN') return
    door.state = 'OPEN'
    door.openedAt = this.time
    door.solid.active = false
    this.nav.rebuildArea(door)
    this.guards.invalidatePaths()
    this.lastDoorOpenedAt = this.time
    this.store.saveDoor(id)
    this.events.push({ t: 'doorOpened', id })
  }

  private openSafe(id: string) {
    const safe = this.safes.find((s) => s.id === id)
    if (!safe || safe.opened) return
    safe.opened = true
    safe.openedAt = this.time
    if (!this.runSafes.includes(id)) this.runSafes.push(id)
    const room = Math.max(0, this.mods.bagCap - this.bag)
    const gained = Math.min(safe.reward, room)
    if (gained > 0) {
      this.bag += gained
      this.carried.push({ kind: 'C100', value: gained, weight: this.cfg.weight.prize })
    }
    // What does not fit spills next to the safe: drop something heavy and come back for it.
    let left = safe.reward - gained
    let n = 0
    while (left >= 5) {
      const kind: DuckCoinKind = left >= 100 ? 'C100' : left >= 50 ? 'C50' : left >= 10 ? 'C10' : 'C5'
      const value = kind === 'C100' ? 100 : kind === 'C50' ? 50 : kind === 'C10' ? 10 : 5
      const a = -Math.PI / 2 + (n - 1) * 0.8
      let x = safe.x + Math.cos(a) * 70
      let y = safe.y + 80 + Math.sin(a) * 20
      if (this.solids.pointBlocked(x, y)) {
        x = safe.x
        y = safe.y + 80
      }
      this.loot.spawn(x, y, kind, { weight: this.itemWeight(kind) })
      left -= value
      n += 1
    }
    if (gained < safe.reward) {
      this.bagFullAt = this.time
      this.events.push({ t: 'bagFull' })
    }
    if (safe.extra) {
      this.loot.spawn(safe.extra.x, safe.extra.y, safe.extra.kind, {
        persistId: safe.extra.id,
        weight: this.itemWeight(safe.extra.kind),
      })
    }
    this.lastSafe = { reward: gained, at: this.time }
    this.events.push({ t: 'safeOpened', id, reward: gained, x: safe.x, y: safe.y })
    this.triggerSiren()
  }

  private triggerSiren() {
    const ec = this.cfg.escape
    if (!ec.enabled || this.sirenOn) return
    this.sirenOn = true
    this.hitStopUntil = this.time + ec.hitStopMs / 1000
    this.escapeUntil = this.time + ec.timerS
    this.alert.raiseTo(Math.max(this.cfg.alert.bandDanger, ec.sirenAlert))
    this.alert.updatePhase(this.guards.anyChase())
    this.events.push({ t: 'siren' })
  }

  private updateExit(dt: number) {
    const inside = pointInRect(this.player.x, this.player.y, this.level.exit)
    if (!inside) {
      if (this.exitHold > 0) this.events.push({ t: 'exitHold', progress: 0 })
      this.exitHold = 0
      return
    }
    this.exitHold += dt
    this.events.push({ t: 'exitHold', progress: Math.min(1, this.exitHold / EXIT_HOLD) })
    if (this.exitHold >= EXIT_HOLD) this.finish('escaped')
  }

  private updateZone() {
    const z = zoneAt(this.level, this.player.x, this.player.y)
    if (z.i === this.zoneNow) return
    this.zoneNow = z.i
    const deeper = z.i > this.zoneMax
    this.zoneMax = Math.max(this.zoneMax, z.i)
    this.events.push({ t: 'zone', i: z.i, deeper })
    const final = z.i >= this.level.finalZone
    if (z.i > this.depthBest || (final && !this.reachedFinal)) {
      this.depthBest = Math.max(this.depthBest, z.i)
      this.reachedFinal = this.reachedFinal || final
      this.store.saveDepth(this.depthBest, this.reachedFinal)
    }
  }

  exitRect(): Rect {
    return this.level.exit
  }

  private finish(verdict: HeistEnd['verdict']) {
    if (this.ended) return
    this.verdict = verdict
    this.crack = null
    let levelCompleted = false
    if (verdict === 'escaped') {
      // BANK is complete only when THIS raid reached the final zone, carried loot
      // out of it (or it was already emptied) and left through EXIT.
      const finalIds = this.level.loot.filter((c) => zoneAt(this.level, c.x, c.y).i >= this.level.finalZone).map((c) => c.id)
      const taken = this.save?.lootTaken ?? new Set<string>()
      const tookFinal =
        finalIds.some((id) => this.runLootIds.includes(id)) || finalIds.every((id) => taken.has(id) || this.runLootIds.includes(id))
      const complete = this.zoneMax >= this.level.finalZone && tookFinal
      levelCompleted = complete && !this.save?.complete
      this.store.saveEscape({
        lootTaken: this.runLootIds,
        openedSafes: this.runSafes,
        depth: this.depthBest,
        reachedFinal: this.reachedFinal,
        complete,
      })
    }
    const coins = verdict === 'aborted' ? 0 : this.bag
    const timeMs = Math.round(this.time * 1000)
    const bonus =
      verdict === 'escaped' && this.alert.value < this.cfg.alert.bandSuspicious && coins > 0 ? Math.max(5, Math.floor(coins * 0.1)) : 0
    const objectives = {
      loot: coins >= this.objLoot,
      stealth: !this.stealthBroken,
      speed: timeMs < this.objTimeS * 1000,
    }
    this.result = {
      verdict,
      coins,
      bonus,
      objBonus: raidObjectiveBonus(verdict === 'escaped', objectives.loot, objectives.stealth, objectives.speed),
      objectives,
      lootGoal: this.objLoot,
      speedGoalS: this.objTimeS,
      banked: 0,
      timeMs,
      alert: this.alert.value,
      bankCompleted: this.levelId === 'bank' && levelCompleted,
      mansionCompleted: this.levelId === 'mansion' && levelCompleted,
    }
    this.events.push({ t: 'ended', verdict })
  }
}

