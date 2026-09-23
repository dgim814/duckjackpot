import Phaser from 'phaser'
import { HeistScene } from './HeistScene'
import type { HeistEnd } from '../types'
import type { HeistRunMods } from '../progress'
import type { HeistLevelId } from '../heistLevel'

export function createHeistGame(
  parent: HTMLElement,
  onDone: (end: HeistEnd) => void,
  mods: HeistRunMods,
  levelId: HeistLevelId = 'bank',
  novice = false,
) {
  const scene = new HeistScene(onDone, mods, levelId, novice)
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#14100e',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || 390,
      height: parent.clientHeight || 640,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Motion is rendered at subpixel precision: snapping a 1× canvas to whole
    // pixels at zoom 0.5 made the world scroll in uneven 1/1/2 px steps.
    render: {
      roundPixels: false,
      antialias: true,
    },
    // Hitches longer than 50 ms reuse the last sane delta, so a variable
    // physics step never moves a dash far enough to cross a wall.
    fps: {
      min: 20,
    },
    physics: {
      default: 'arcade',
      // One physics step per rendered frame. A fixed 60 Hz step without
      // interpolation freezes every other frame at 120 Hz and doubles steps
      // under load, which reads as judder / ghosting on iPhone.
      arcade: { debug: false, fixedStep: false },
    },
    input: {
      activePointers: 3,
    },
    scene,
    audio: { noAudio: true },
  })
  return game
}
