import { heistSfx } from '../../heistSfx'
import type { RaidEvent } from '../sim/events'
import type { Raid } from '../sim/Raid'

/**
 * Maps simulation events onto the existing sound library. Swapping audio later
 * means replacing this file only; gameplay never calls sound directly.
 */
export class AudioBridge {
  handle(e: RaidEvent) {
    switch (e.t) {
      case 'pickup':
        heistSfx.pickup()
        break
      case 'drop':
        heistSfx.safeClick()
        break
      case 'dash':
        heistSfx.dash()
        break
      case 'sneakStart':
        heistSfx.sneak()
        break
      case 'step':
        heistSfx.step(e.sneak)
        break
      case 'crackStart':
        if (e.kind === 'door') heistSfx.doorHack()
        else heistSfx.safeStart()
        break
      case 'crackHit':
        heistSfx.safeClick()
        break
      case 'crackMiss':
        heistSfx.safeFail()
        break
      case 'doorOpened':
        heistSfx.doorUnlock()
        break
      case 'safeOpened':
        heistSfx.safeUnlock()
        break
      case 'lift':
        heistSfx.elevator()
        break
      case 'escalator':
        heistSfx.escalator()
        break
      case 'laserTrip':
        heistSfx.laser()
        break
      case 'panelOff':
        heistSfx.panel()
        break
      case 'valuable':
        heistSfx.rareLoot()
        break
      case 'siren':
        heistSfx.siren()
        break
      case 'cameraAlert':
        heistSfx.cameraAlert()
        break
      case 'investigate':
        heistSfx.investigateStart()
        break
      case 'chaseStart':
        heistSfx.chaseStart()
        break
      case 'chaseStop':
        heistSfx.chaseStop()
        break
      case 'ended':
        if (e.verdict === 'escaped') heistSfx.exit()
        else if (e.verdict === 'caught') heistSfx.caught()
        break
      default:
        break
    }
  }

  sync(raid: Raid) {
    heistSfx.sync({
      alert: raid.alert.value,
      cameraHot: raid.cams.sees,
      investigating: raid.guards.anyInvestigating(),
      chasing: raid.guards.anyChase(),
      cracking: raid.crack !== null,
      paused: raid.paused,
      ended: raid.ended,
    })
  }

  pause() {
    heistSfx.pause()
  }
}
