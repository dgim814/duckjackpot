import type { HeistTuning } from '../../tuning'
import type { Vec } from '../level/LevelDef'
import type { Box, SolidGrid } from './Collision'
import type { RaidEvent } from './events'
import type { Nav } from './Nav'

export type GuardState = 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'SEARCH' | 'RETURN'

export const GUARD_HW = 10
export const GUARD_HH = 7
const ARRIVE = 16
const SEARCH_TIME = 5.2
const CHASE_REPATH = 0.3
/** Beyond this distance a guard cannot perceive the player at all; skip the maths. */
const PERCEPTION_RANGE = 700
/** A full alarm pulls in guards within this radius; farther ones investigate or hold their post. */
const ALARM_CHASE_R = 1100
const ALARM_LOOK_R = 2000
/** A* searches allowed per simulation step across all guards. */
const PATH_BUDGET = 2
const NO_PATH_RETRY = 0.8

export type Guard = {
  id: number
  box: Box
  prevX: number
  prevY: number
  facing: number
  state: GuardState
  route: Vec[]
  wi: number
  path: Vec[]
  pathI: number
  pathDest: Vec
  repathAt: number
  stuckT: number
  stuckTries: number
  detect: number
  sees: boolean
  lastSeen: Vec
  searchT: number
  searchPts: Vec[]
  searchI: number
  moving: boolean
  nextPathAt: number
}

export type GuardWorld = {
  cfg: HeistTuning
  nav: Nav
  solids: SolidGrid
  time: number
  player: Vec
  playerHidden: boolean
  playerNoise: number
  disguiseMul: number
  speedMul: number
  alertValue: number
  events: RaidEvent[]
  onCaught: () => void
}

export class GuardSystem {
  readonly guards: Guard[]
  private wasChasing = false
  private pathBudget = PATH_BUDGET

  constructor(routes: Vec[][], private nav: Nav) {
    this.guards = routes.map((route, id) => {
      const start = nav.nearestWalkable(route[0].x, route[0].y)
      return {
        id,
        box: { x: start.x, y: start.y, hw: GUARD_HW, hh: GUARD_HH },
        prevX: start.x,
        prevY: start.y,
        facing: 0,
        state: 'PATROL' as GuardState,
        route: route.map((p) => ({ ...p })),
        wi: route.length > 1 ? 1 : 0,
        path: [],
        pathI: 0,
        pathDest: { x: -1e9, y: -1e9 },
        repathAt: 0,
        stuckT: 0,
        stuckTries: 0,
        detect: 0,
        sees: false,
        lastSeen: { x: start.x, y: start.y },
        searchT: 0,
        searchPts: [],
        searchI: 0,
        moving: false,
        nextPathAt: 0,
      }
    })
  }

  anyChase() {
    return this.guards.some((g) => g.state === 'CHASE')
  }

  anyInvestigating() {
    return this.guards.some((g) => g.state === 'INVESTIGATE' || g.state === 'SEARCH')
  }

  /** Guards invalidate cached paths when the map changes (a door opened). */
  invalidatePaths() {
    for (const g of this.guards) {
      g.path = []
      g.pathI = 0
      g.pathDest = { x: -1e9, y: -1e9 }
    }
  }

  /** Send guards near a point to look at it (dropped loot, alarm sweep). */
  lure(x: number, y: number, radius: number, world: GuardWorld, includeChase: boolean) {
    for (const g of this.guards) {
      if (Math.hypot(g.box.x - x, g.box.y - y) > radius) continue
      if (g.state === 'CHASE' && (!includeChase || g.sees)) continue
      g.lastSeen = { x, y }
      this.setState(g, 'INVESTIGATE', world)
    }
  }

  /** Cameras and full alarms call guards by distance: near ones chase, mid ones look, far ones hold. */
  alertAll(world: GuardWorld, chase: boolean) {
    for (const g of this.guards) {
      const d = Math.hypot(g.box.x - world.player.x, g.box.y - world.player.y)
      if (d > ALARM_LOOK_R) continue
      g.lastSeen = { x: world.player.x, y: world.player.y }
      if (chase && d <= ALARM_CHASE_R) {
        if (g.state !== 'CHASE') this.setState(g, 'CHASE', world)
      } else if (g.state === 'PATROL' || g.state === 'RETURN') {
        this.setState(g, 'INVESTIGATE', world)
      }
    }
  }

  step(dt: number, world: GuardWorld) {
    this.pathBudget = PATH_BUDGET
    for (const g of this.guards) this.stepGuard(g, dt, world)
    const chasing = this.anyChase()
    if (chasing && !this.wasChasing) world.events.push({ t: 'chaseStart' })
    else if (!chasing && this.wasChasing) world.events.push({ t: 'chaseStop' })
    this.wasChasing = chasing
  }

  maxSightDetect() {
    let m = 0
    for (const g of this.guards) if (g.sees) m = Math.max(m, g.detect)
    return m
  }

  anySees() {
    return this.guards.some((g) => g.sees)
  }

  hears(g: Guard, world: GuardWorld) {
    const r = world.playerNoise * 2.15
    if (r <= 8) return false
    return Math.hypot(g.box.x - world.player.x, g.box.y - world.player.y) < r + 36
  }

  anyHears(world: GuardWorld) {
    return this.guards.some((g) => this.hears(g, world))
  }

  private sees(g: Guard, world: GuardWorld) {
    const v = world.cfg.vision
    const dist = v.guardDist * world.disguiseMul
    const dx = world.player.x - g.box.x
    const dy = world.player.y - g.box.y
    const d = Math.hypot(dx, dy)
    if (d < 12) return true
    if (d > dist) return false
    const diff = Math.abs(wrapAngle(Math.atan2(dy, dx) - g.facing))
    if (diff > (v.guardFovDeg * Math.PI) / 360) return false
    return world.solids.segmentClear(g.box.x, g.box.y, world.player.x, world.player.y)
  }

  private setState(g: Guard, s: GuardState, world: GuardWorld) {
    if (g.state === s) return
    const prev = g.state
    g.state = s
    g.path = []
    g.pathI = 0
    g.repathAt = 0
    g.stuckTries = 0
    if (s === 'INVESTIGATE' && (prev === 'PATROL' || prev === 'RETURN')) world.events.push({ t: 'investigate' })
    if (s === 'SEARCH') {
      g.searchT = SEARCH_TIME
      g.searchI = 0
      g.searchPts = this.searchPoints(g.lastSeen)
    }
  }

  private searchPoints(o: Vec): Vec[] {
    const offs = [
      [0, 0],
      [80, 0],
      [0, 80],
      [-80, 0],
      [0, -80],
      [56, 56],
      [-56, -56],
    ]
    const pts: Vec[] = []
    for (const [dx, dy] of offs) {
      const q = this.nav.nearestWalkable(o.x + dx, o.y + dy)
      if (Math.hypot(q.x - o.x, q.y - o.y) > 120) continue
      if (pts.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < 30)) continue
      pts.push(q)
    }
    return pts.length ? pts : [{ ...o }]
  }

  private stepGuard(g: Guard, dt: number, world: GuardWorld) {
    g.prevX = g.box.x
    g.prevY = g.box.y
    const gc = world.cfg.guard
    const near = Math.abs(g.box.x - world.player.x) < PERCEPTION_RANGE && Math.abs(g.box.y - world.player.y) < PERCEPTION_RANGE

    g.sees = near && this.sees(g, world)
    if (g.sees) {
      g.lastSeen = { x: world.player.x, y: world.player.y }
      const hideMul = world.playerHidden ? 0.22 : 1
      g.detect = Math.min(1, g.detect + dt * (1.05 + world.playerNoise / 90) * hideMul * world.disguiseMul)
      if (g.detect >= 1 || g.state === 'SEARCH' || g.state === 'CHASE') this.setState(g, 'CHASE', world)
      else if (g.state === 'PATROL' || g.state === 'RETURN') this.setState(g, 'INVESTIGATE', world)
    } else if (g.state !== 'CHASE') {
      g.detect = Math.max(0, g.detect - dt * 0.32)
    }
    if (near && !g.sees && g.state !== 'CHASE' && this.hears(g, world)) {
      g.lastSeen = { x: world.player.x, y: world.player.y }
      this.setState(g, 'INVESTIGATE', world)
    }
    if (world.alertValue >= 1 && g.state !== 'CHASE') {
      const d = Math.hypot(g.box.x - world.player.x, g.box.y - world.player.y)
      if (d <= ALARM_CHASE_R) {
        g.lastSeen = { x: world.player.x, y: world.player.y }
        this.setState(g, 'CHASE', world)
      }
    }

    const pm = world.speedMul
    switch (g.state) {
      case 'PATROL': {
        const wp = g.route[g.wi]
        if (this.followTo(g, wp, gc.patrol * pm, dt, world) < ARRIVE || g.stuckTries >= 4) {
          g.wi = (g.wi + 1) % g.route.length
          g.path = []
          g.stuckTries = 0
        }
        break
      }
      case 'INVESTIGATE': {
        if (this.followTo(g, g.lastSeen, gc.investigate * pm, dt, world) < ARRIVE || g.stuckTries >= 4) {
          this.setState(g, 'SEARCH', world)
        }
        break
      }
      case 'CHASE': {
        const target = g.sees ? world.player : g.lastSeen
        this.followTo(g, target, gc.chase, dt, world)
        const d = Math.hypot(g.box.x - world.player.x, g.box.y - world.player.y)
        if (d < gc.catchDist) world.onCaught()
        else if (!g.sees && Math.hypot(g.box.x - g.lastSeen.x, g.box.y - g.lastSeen.y) < ARRIVE + 6) {
          this.setState(g, 'SEARCH', world)
        } else if (g.stuckTries >= 6) {
          this.setState(g, 'SEARCH', world)
        }
        break
      }
      case 'SEARCH': {
        g.searchT -= dt
        const pt = g.searchPts[g.searchI] ?? g.lastSeen
        if (this.followTo(g, pt, gc.search * pm, dt, world) < ARRIVE || g.stuckTries >= 4) {
          g.searchI = (g.searchI + 1) % Math.max(1, g.searchPts.length)
          g.path = []
          g.stuckTries = 0
        }
        if (g.searchT <= 0) {
          g.wi = this.nearestWaypoint(g)
          this.setState(g, 'RETURN', world)
        }
        break
      }
      case 'RETURN': {
        const wp = g.route[g.wi]
        if (this.followTo(g, wp, gc.returning * pm, dt, world) < ARRIVE || g.stuckTries >= 4) {
          g.wi = (g.wi + 1) % g.route.length
          this.setState(g, 'PATROL', world)
        }
        break
      }
    }
    g.moving = Math.hypot(g.box.x - g.prevX, g.box.y - g.prevY) > 0.2 * dt * 60
  }

  private nearestWaypoint(g: Guard) {
    let best = 0
    let bestD = Number.POSITIVE_INFINITY
    g.route.forEach((wp, i) => {
      const d = Math.hypot(g.box.x - wp.x, g.box.y - wp.y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    return best
  }

  /** Walks along a cached A* path; repaths when the goal moves, on a chase timer or when stuck. */
  private followTo(g: Guard, target: Vec, speed: number, dt: number, world: GuardWorld) {
    const distGoal = Math.hypot(target.x - g.box.x, target.y - g.box.y)
    if (distGoal < ARRIVE) {
      g.stuckT = 0
      return distGoal
    }
    const chase = g.state === 'CHASE'
    const destMoved = Math.hypot(g.pathDest.x - target.x, g.pathDest.y - target.y) > 40
    const due =
      g.pathI >= g.path.length || (destMoved && (!chase || world.time >= g.repathAt)) || g.stuckT > 0.6
    if (due && world.time >= g.nextPathAt && this.pathBudget > 0) {
      this.pathBudget -= 1
      let from = { x: g.box.x, y: g.box.y }
      if (g.stuckT > 0.6) {
        g.stuckTries += 1
        from = this.nav.nearestWalkable(g.box.x, g.box.y)
      }
      const path = this.nav.findPath(from.x, from.y, target.x, target.y)
      g.path = path ?? []
      g.pathI = 0
      g.pathDest = { x: target.x, y: target.y }
      g.repathAt = world.time + CHASE_REPATH
      g.stuckT = 0
      if (!path) {
        g.stuckTries += 2
        g.nextPathAt = world.time + NO_PATH_RETRY
      }
    }
    let next = g.path[g.pathI] ?? target
    while (g.pathI < g.path.length && Math.hypot(next.x - g.box.x, next.y - g.box.y) < 10) {
      g.pathI += 1
      next = g.path[g.pathI] ?? target
    }
    const dx = next.x - g.box.x
    const dy = next.y - g.box.y
    const d = Math.max(0.001, Math.hypot(dx, dy))
    const stepLen = Math.min(d, speed * dt)
    const turn = Math.atan2(dy, dx)
    g.facing = approachAngle(g.facing, turn, dt * 9)
    const res = world.solids.move(g.box, (dx / d) * stepLen, (dy / d) * stepLen)
    const moved = Math.hypot(res.dx, res.dy)
    if (moved < stepLen * 0.3) g.stuckT += dt
    else if (g.stuckT > 0) g.stuckT = Math.max(0, g.stuckT - dt)
    if (moved > stepLen * 0.8) g.stuckTries = 0
    return distGoal
  }
}

export function wrapAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function approachAngle(from: number, to: number, maxStep: number) {
  const diff = wrapAngle(to - from)
  if (Math.abs(diff) <= maxStep) return to
  return from + Math.sign(diff) * maxStep
}
