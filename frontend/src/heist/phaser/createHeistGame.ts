import Phaser from 'phaser'
import { HeistScene } from './HeistScene'
import type { HeistEnd } from '../types'

export function createHeistGame(parent: HTMLElement, onDone: (end: HeistEnd) => void) {
  const scene = new HeistScene(onDone)
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
