import { VISUALS } from '/src/heist/economy/art/visuals.ts'
import { buildWatch } from './builders/watch.js'
import { buildJewel } from './builders/jewel.js'
import { buildPainting } from './builders/painting.js'
import { buildCar } from './builders/car.js'
import { buildObject } from './builders/objects.js'
import { CATALOG } from '/src/heist/economy/catalog.ts'
import { U, rng } from './dsl.js'

/** id → scene description for the engine. */
export async function buildScene(id) {
  const scene = await buildBase(id)
  const item = CATALOG.find((i) => i.id === id)
  // deterministic per-lot pose, like a real catalogue where no two shots are identical
  const v = VISUALS[id]
  if (v && v.k !== 'paint') {
    const r = rng(id)
    const span = v.k === 'car' ? 34 : v.k === 'watch' ? 30 : 22
    const a = (r() * 2 - 1) * span
    scene.root = U([scene.root], { rot: [0, a, 0] })
  }
  // MASTERPIECE: the same studio, lit a touch stronger and warmer
  if (item?.tier === 'MASTERPIECE') {
    scene.exposure = (scene.exposure ?? 1) * 1.08
    scene.halo = '#6a4a26'
  }
  return scene
}

async function buildBase(id) {
  const item = CATALOG.find((i) => i.id === id)
  if (id === 'art_sketch') return buildPainting({ k: 'paint', scene: 'landscape', frame: 'ornate' }, id, item?.tier)
  const v = VISUALS[id]
  if (!v) throw new Error('no recipe for ' + id)
  if (v.k === 'watch') return buildWatch(v, id)
  if (v.k === 'jewel') return buildJewel(v, id)
  if (v.k === 'paint') return buildPainting(v, id, item?.tier)
  if (v.k === 'car') return buildCar(v, id)
  if (v.k === 'obj') return buildObject(v, id)
  throw new Error('no builder for ' + v.k)
}
