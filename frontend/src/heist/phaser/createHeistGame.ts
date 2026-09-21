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
    render: {
      roundPixels: true,
      antialias: false,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: {
      activePointers: 3,
    },
    scene,
    audio: { noAudio: true },
  })
  return game
}
