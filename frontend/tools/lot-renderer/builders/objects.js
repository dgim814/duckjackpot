import { MAT, METAL_OF, U, SU, SUB, INT, arc, beads, box, canvas, capsule, cone, cyl, ell, extrude, gem, lathe, ngon, poly, rng, rrect, sphere, torus, tube } from '../dsl.js'
import { ceramicCanvas, coinFace, compassCard, hex, labelCanvas, mapCanvas, textLines } from './textures.js'

/**
 * Antiques, collectibles and DuckJackpot lore objects — each modelled from its
 * real construction and photographed on the same dark studio set.
 */
const WOOD = { walnut: '#4a2e1a', mahogany: '#5a2415', oak: '#8a6236', ebony: '#1a1210', box: '#d8b27a' }
const plinth = (w = 1.2, h = 0.14, mat = MAT.blackLacquer) => box([w, h / 2, w * 0.7], { pos: [0, h / 2, 0], r: 0.03, mat })

/** Radially symmetric profile helper: pts are [r, y] from bottom to top along the outside. */
function turned(outline) {
  return [[0, outline[0][1]], ...outline, [0, outline[outline.length - 1][1]]]
}

function metalOf(v, fallback = MAT.brass) {
  return METAL_OF[v.metal] || fallback
}

const cam = (y = 0.9, dist = 5.0, fov = 0.5, side = 1.4, up = 1.1) => ({ pos: [side, y + up, dist], target: [0, y, 0], fov })

export function buildObject(v, id) {
  const m = metalOf(v)
  const c1 = v.c1
  const c2 = v.c2 || '#e8dcc0'
  let kids = []
  let camera = cam()
  switch (v.form) {
    // ------------------------------------------------------------ ceramics & tableware
    case 'vase': {
      const ming = id === 'antique_ming_vase'
      const outline = ming
        ? [[0.3, 0], [0.34, 0.06], [0.5, 0.35], [0.62, 0.8], [0.58, 1.15], [0.36, 1.45], [0.2, 1.6], [0.22, 1.78], [0.26, 1.85]]
        : [[0.28, 0], [0.3, 0.05], [0.42, 0.3], [0.55, 0.7], [0.5, 1.05], [0.28, 1.35], [0.22, 1.55], [0.3, 1.7]]
      kids.push(SUB(lathe(turned(outline), { mat: MAT.ceramic(ming ? '#f4f6f8' : '#f7f3ea'), decal: { canvas: ceramicCanvas(ming ? 'ming' : 'gilt'), proj: 'cyl', h: 1.9, oy: 0.9 } }), cyl(0.18, 0.4, { pos: [0, outline[outline.length - 1][1], 0] })))
      if (!ming) kids.push(torus(0.3, 0.025, { pos: [0, 1.7, 0], mat: MAT.gold }), torus(0.28, 0.02, { pos: [0, 0.03, 0], mat: MAT.gold }))
      kids.push(cyl(0.55, 0.06, { pos: [0, -0.06, 0], rr: 0.03, mat: MAT.wood(WOOD.ebony) }))
      kids = [U(kids, { pos: [0, 0.12, 0] })]
      camera = cam(1.0, 5.2, 0.5, 1.2, 0.6)
      break
    }
    case 'bowl': {
      kids.push(SUB(lathe(turned([[0.22, 0], [0.3, 0.06], [0.52, 0.25], [0.66, 0.55], [0.7, 0.72]]), { mat: MAT.ceramic('#3a2a24'), decal: { canvas: ceramicCanvas('raku'), proj: 'cyl', h: 0.8, oy: 0.36 } }), lathe(turned([[0, 0.12], [0.45, 0.2], [0.6, 0.5], [0.64, 0.8]]), {})))
      kids.push(box([1.2, 0.03, 0.8], { pos: [0, -0.03, 0], r: 0.02, mat: MAT.wood(WOOD.oak, 4) }))
      camera = cam(0.35, 4.2, 0.46, 1.0, 1.4)
      break
    }
    case 'candlestick': {
      const cs = [[0.4, 0], [0.42, 0.05], [0.3, 0.1], [0.12, 0.2], [0.1, 0.5], [0.16, 0.6], [0.08, 0.75], [0.08, 1.2], [0.14, 1.3], [0.18, 1.36]]
      for (const x of [-0.45, 0.45]) {
        kids.push(lathe(turned(cs), { pos: [x, 0, 0], mat: { ...MAT.gold, rough: 0.2, proc: 'hammered', pscale: 20, bump: 0.4 } }))
        kids.push(cyl(0.07, 0.3, { pos: [x, 1.66, 0], mat: MAT.matte('#f1e8d2') }))
        kids.push(ell([0.035, 0.08, 0.035], { pos: [x, 2.04, 0], mat: MAT.lamp('#ffcf66') }))
      }
      camera = cam(1.0, 5.0, 0.5, 1.0, 0.6)
      break
    }
    case 'cup': {
      const cup = SUB(lathe(turned([[0.2, 0.08], [0.24, 0.1], [0.4, 0.3], [0.5, 0.62]]), { mat: MAT.ceramic('#f7f7f9'), decal: { canvas: netCanvas(), proj: 'cyl', h: 0.6, oy: 0.36 } }), lathe(turned([[0, 0.16], [0.38, 0.3], [0.46, 0.66]]), {}))
      kids.push(cup)
      kids.push(torus(0.47, 0.018, { pos: [0, 0.62, 0], mat: MAT.gold }))
      kids.push(SUB(torus(0.16, 0.04, { axis: 'z', pos: [0.54, 0.38, 0], mat: MAT.ceramic('#f7f7f9') }), box([0.2, 0.3, 0.2], { pos: [0.36, 0.38, 0] })))
      kids.push(lathe(turned([[0.7, 0], [0.72, 0.02], [0.4, 0.06], [0.3, 0.08]]), { mat: MAT.ceramic('#f7f7f9'), decal: { canvas: netCanvas(), proj: 'y', w: 1.5, h: 1.5 } }))
      camera = cam(0.35, 3.6, 0.46, 1.0, 1.1)
      break
    }
    case 'teaset': {
      const silver = MAT.silver
      kids.push(lathe(turned([[0.3, 0], [0.4, 0.1], [0.52, 0.4], [0.46, 0.72], [0.28, 0.85]]), { pos: [-0.2, 0.06, 0], mat: silver }))
      kids.push(SU(0.05, [lathe(turned([[0.14, 0.85], [0.2, 0.9], [0.05, 1.02]]), { pos: [-0.2, 0.06, 0], mat: silver }), sphere(0.06, { pos: [-0.2, 1.1, 0], mat: MAT.wood(WOOD.ebony) })]))
      kids.push(tube([[0.25, 0.4, 0], [0.5, 0.55, 0], [0.62, 0.8, 0], [0.72, 0.88, 0]], 0.045, { mat: silver }))
      kids.push(SUB(torus(0.24, 0.035, { axis: 'z', pos: [-0.72, 0.5, 0], mat: MAT.wood(WOOD.ebony) }), box([0.2, 0.4, 0.2], { pos: [-0.5, 0.5, 0] })))
      kids.push(lathe(turned([[0.14, 0], [0.24, 0.08], [0.28, 0.3], [0.26, 0.42]]), { pos: [0.75, 0.06, 0.45], mat: silver }))
      kids.push(cyl(1.2, 0.03, { pos: [0, 0.03, 0.1], rr: 0.015, mat: { ...silver, rough: 0.12 } }))
      camera = cam(0.55, 4.8, 0.5, 1.2, 1.2)
      break
    }
    case 'samovar': {
      const cu = MAT.copper
      kids.push(lathe(turned([[0.35, 0], [0.4, 0.05], [0.22, 0.2], [0.25, 0.35], [0.55, 0.45], [0.62, 0.8], [0.55, 1.2], [0.3, 1.32], [0.15, 1.4], [0.12, 1.75], [0.2, 1.8]]), { mat: { ...cu, proc: undefined, rough: 0.12 } }))
      kids.push(torus(0.6, 0.03, { pos: [0, 0.85, 0], mat: MAT.brass }))
      for (const s of [-1, 1]) kids.push(SUB(torus(0.16, 0.035, { axis: 'z', pos: [s * 0.65, 1.1, 0], mat: MAT.wood(WOOD.ebony) }), box([0.2, 0.3, 0.2], { pos: [s * 0.52, 1.1, 0] })))
      kids.push(U([cyl(0.04, 0.16, { axis: 'z', pos: [0, 0.55, 0.62], mat: MAT.brass }), cyl(0.06, 0.03, { pos: [0, 0.52, 0.78], mat: MAT.brass }), capsule([0, 0.5, 0.78], [0, 0.4, 0.8], 0.025, { mat: MAT.brass })]))
      for (let i = 0; i < 4; i++) kids.push(cyl(0.07, 0.01, { axis: 'z', pos: [-0.3 + i * 0.2, 1.0, 0.56 - Math.abs(i - 1.5) * 0.03], rot: [0, (-0.3 + i * 0.2) * 40, 0], mat: MAT.gold }))
      kids.push(lathe(turned([[0.18, 1.8], [0.22, 1.9], [0.2, 2.1], [0.08, 2.18]]), { mat: MAT.ceramic('#f4f1ea'), decal: { canvas: ceramicCanvas('gilt'), proj: 'cyl', h: 0.4, oy: 1.98 } }))
      camera = cam(1.05, 5.4, 0.5, 1.2, 0.6)
      break
    }
    // ------------------------------------------------------------ boxes & cases
    case 'casket': {
      const lac = id === 'antique_samurai_box'
      const body = lac ? MAT.blackLacquer : MAT.wood(WOOD.mahogany, 5)
      const deco = lac ? makiE() : marquetry()
      kids.push(box([0.8, 0.26, 0.5], { pos: [0, 0.26, 0], r: 0.03, mat: body, decal: { canvas: deco, proj: 'z', w: 1.6, h: 0.52, side: 1 } }))
      kids.push(INT(box([0.82, 0.2, 0.52], { pos: [0, 0.6, 0], r: 0.03, mat: body, decal: { canvas: deco, proj: 'y', w: 1.64, h: 1.04 } }), cyl(0.9, 1, { axis: 'x', pos: [0, -0.1, 0] })))
      const trim = lac ? MAT.gold : MAT.brass
      for (const x of [-0.8, 0.8]) for (const z of [-0.5, 0.5]) kids.push(box([0.06, 0.26, 0.06], { pos: [x, 0.26, z], r: 0.02, mat: trim }))
      kids.push(box([0.1, 0.12, 0.02], { pos: [0, 0.45, 0.52], r: 0.02, mat: trim }))
      kids.push(cyl(0.02, 0.02, { axis: 'z', pos: [0, 0.43, 0.55], mat: MAT.blackMetal }))
      camera = cam(0.45, 4.3, 0.5, 1.3, 1.1)
      break
    }
    case 'mantelclock': {
      const body = { ...MAT.blackLacquer, rough: 0.06 }
      const chrome = MAT.chrome
      kids.push(box([0.75, 0.05, 0.28], { pos: [0, 0.05, 0], r: 0.02, mat: chrome }))
      kids.push(box([0.62, 0.12, 0.24], { pos: [0, 0.22, 0], r: 0.02, mat: body }))
      kids.push(box([0.42, 0.34, 0.22], { pos: [0, 0.62, 0], r: 0.03, mat: body }))
      for (const x of [-0.5, 0.5]) kids.push(box([0.08, 0.2 + Math.abs(x) * 0.2, 0.2], { pos: [x, 0.42, 0], r: 0.02, mat: chrome }))
      kids.push(SUB(cyl(0.3, 0.04, { axis: 'z', pos: [0, 0.66, 0.22], rr: 0.02, mat: chrome }), cyl(0.25, 0.1, { axis: 'z', pos: [0, 0.66, 0.28] })))
      kids.push(cyl(0.26, 0.005, { axis: 'z', pos: [0, 0.66, 0.21], mat: MAT.enamel('#f4efe2'), decal: { canvas: decoDial(), proj: 'z', w: 0.52, h: 0.52 } }))
      kids.push(INT(cyl(0.26, 0.05, { axis: 'z', pos: [0, 0.66, 0.22], mat: MAT.glass }), sphere(1.0, { pos: [0, 0.66, -0.73], mat: MAT.glass })))
      for (const x of [-0.25, -0.12, 0, 0.12, 0.25]) kids.push(box([0.02, 0.1, 0.01], { pos: [x, 0.22, 0.245], mat: chrome }))
      camera = cam(0.55, 4.2, 0.5, 1.2, 0.8)
      break
    }
    case 'snuffbox': {
      kids.push(box([0.6, 0.12, 0.4], { pos: [0, 0.14, 0], r: 0.1, mat: { ...MAT.silver, proc: 'brushed', pscale: 80 }, decal: { canvas: guilloche(), proj: 'y', w: 1.2, h: 0.8, bump: 1.2, under: 1 } }))
      kids.push(ell([0.26, 0.03, 0.17], { pos: [0, 0.26, 0], mat: MAT.enamel(c1) }))
      kids.push(torus(0.2, 0.012, { pos: [0, 0.265, 0], scale: 1, mat: MAT.gold }))
      camera = cam(0.2, 3.2, 0.46, 0.8, 1.4)
      break
    }
    case 'musicbox': {
      const w = MAT.wood(WOOD.walnut, 5)
      kids.push(SUB(box([0.8, 0.28, 0.45], { pos: [0, 0.28, 0], r: 0.02, mat: w }), box([0.74, 0.3, 0.39], { pos: [0, 0.6, 0] })))
      kids.push(box([0.8, 0.03, 0.45], { pos: [0, 0.82, -0.62], rot: [-75, 0, 0], r: 0.02, mat: w, decal: { canvas: marquetry(), proj: 'y', w: 1.6, h: 0.9 } }))
      kids.push(cyl(0.12, 0.5, { axis: 'x', pos: [0, 0.4, -0.05], mat: { ...MAT.brass, proc: 'knurl', pscale: 3, bump: 1 } }))
      kids.push(box([0.5, 0.02, 0.12], { pos: [0, 0.36, 0.15], mat: MAT.steel }))
      kids.push(box([0.72, 0.01, 0.37], { pos: [0, 0.2, 0], mat: MAT.velvet('#5a1a22') }))
      camera = cam(0.45, 4.2, 0.5, 1.2, 1.3)
      break
    }
    case 'chronometer': {
      const w = MAT.wood(WOOD.mahogany, 5)
      kids.push(SUB(box([0.6, 0.3, 0.6], { pos: [0, 0.3, 0], r: 0.02, mat: w }), box([0.52, 0.3, 0.52], { pos: [0, 0.62, 0] })))
      kids.push(box([0.6, 0.02, 0.6], { pos: [0, 1.02, -0.6], rot: [-80, 0, 0], r: 0.02, mat: w }))
      kids.push(torus(0.44, 0.03, { pos: [0, 0.56, 0], mat: MAT.brass }))
      kids.push(cyl(0.4, 0.06, { pos: [0, 0.54, 0], mat: MAT.brass }))
      kids.push(cyl(0.36, 0.01, { pos: [0, 0.61, 0], mat: MAT.enamel('#f4efe2'), decal: { canvas: chronoDial(), proj: 'y', w: 0.72, h: 0.72 } }))
      kids.push(INT(cyl(0.36, 0.2, { pos: [0, 0.62, 0], mat: MAT.glass }), sphere(1.4, { pos: [0, -0.72, 0], mat: MAT.glass })))
      camera = cam(0.5, 4.0, 0.5, 1.0, 1.4)
      break
    }
    case 'medkit': {
      const w = MAT.wood(WOOD.walnut, 5)
      kids.push(SUB(box([0.9, 0.14, 0.55], { pos: [0, 0.14, 0], r: 0.02, mat: w }), box([0.84, 0.2, 0.49], { pos: [0, 0.3, 0] })))
      kids.push(box([0.84, 0.01, 0.49], { pos: [0, 0.18, 0], mat: MAT.velvet(c2) }))
      kids.push(box([0.9, 0.03, 0.55], { pos: [0, 0.5, -0.6], rot: [-72, 0, 0], r: 0.02, mat: w }))
      const tools = [[-0.6, 0.9], [-0.35, 1.0], [-0.1, 0.85], [0.15, 0.95], [0.4, 0.8], [0.62, 0.7]]
      tools.forEach(([x, l], i) => {
        kids.push(capsule([x, 0.22, -0.3], [x, 0.22, -0.3 + l * 0.4], 0.035, { mat: i % 2 ? MAT.ceramic('#e8e2d2') : MAT.wood(WOOD.ebony) }))
        kids.push(capsule([x, 0.21, -0.3 + l * 0.4], [x, 0.21, -0.3 + l * 0.62], i === 2 ? 0.02 : 0.012, { mat: MAT.chrome }))
      })
      camera = cam(0.25, 3.8, 0.5, 0.8, 1.8)
      break
    }
    case 'watchbox': {
      kids.push(SUB(box([0.6, 0.18, 0.45], { pos: [0, 0.18, 0], r: 0.06, mat: MAT.leather(c1) }), box([0.54, 0.2, 0.39], { pos: [0, 0.38, 0] })))
      kids.push(box([0.6, 0.04, 0.45], { pos: [0, 0.58, -0.45], rot: [-75, 0, 0], r: 0.04, mat: MAT.leather(c1) }))
      kids.push(box([0.54, 0.01, 0.39], { pos: [0, 0.6, -0.42], rot: [-75, 0, 0], mat: MAT.velvet(c2) }))
      kids.push(cyl(0.16, 0.24, { axis: 'x', pos: [0, 0.32, 0], rr: 0.1, mat: MAT.velvet(c2) }))
      kids.push(box([0.12, 0.05, 0.01], { pos: [0, 0.24, 0.46], mat: MAT.gold }))
      camera = cam(0.35, 3.6, 0.48, 1.0, 1.2)
      break
    }
    // ------------------------------------------------------------ globes & instruments
    case 'globe':
    case 'celestial': {
      const cel = v.form === 'celestial'
      kids.push(sphere(0.62, { pos: [0, 1.25, 0], rot: [0, 0, 23], mat: { type: 'dielectric', color: '#c9b27a', rough: 0.25 }, decal: { canvas: mapCanvas({ celestial: cel }), proj: 'sph', spin: 0.15 } }))
      kids.push(SUB(torus(0.68, 0.035, { axis: 'z', pos: [0, 1.25, 0], rot: [0, 0, 23], mat: MAT.brass }), box([1, 0.6, 1], { pos: [0, 0.35, 0], rot: [0, 0, 23] })))
      kids.push(torus(0.7, 0.04, { pos: [0, 1.25, 0], mat: MAT.wood(WOOD.walnut) }))
      kids.push(lathe(turned([[0.45, 0], [0.48, 0.06], [0.2, 0.15], [0.07, 0.4], [0.1, 0.5], [0.05, 0.62]]), { mat: MAT.wood(WOOD.walnut, 5) }))
      camera = cam(1.05, 5.0, 0.5, 1.0, 0.6)
      break
    }
    case 'armillary': {
      const g = { ...MAT.gold, rough: 0.2 }
      const y = 1.25
      kids.push(torus(0.7, 0.03, { axis: 'z', pos: [0, y, 0], mat: g }))
      kids.push(torus(0.7, 0.03, { pos: [0, y, 0], mat: g }))
      kids.push(torus(0.7, 0.028, { pos: [0, y, 0], rot: [23, 0, 0], mat: g }))
      kids.push(torus(0.68, 0.025, { axis: 'x', pos: [0, y, 0], mat: g }))
      kids.push(torus(0.7, 0.025, { axis: 'z', pos: [0, y, 0], rot: [0, 45, 0], mat: g }))
      kids.push(sphere(0.14, { pos: [0, y, 0], mat: MAT.enamel(c1) }))
      kids.push(capsule([0, y - 0.75, 0], [0, y + 0.8, 0], 0.02, { mat: g }))
      kids.push(lathe(turned([[0.4, 0], [0.42, 0.05], [0.15, 0.2], [0.06, 0.5]]), { mat: MAT.wood(WOOD.ebony) }))
      camera = cam(1.05, 5.0, 0.5, 1.2, 0.8)
      break
    }
    case 'telescope': {
      const b = { ...MAT.brass, proc: undefined, rough: 0.12 }
      const tube = U([cyl(0.12, 0.7, { axis: 'x', pos: [0.3, 0, 0], mat: b }), cyl(0.09, 0.35, { axis: 'x', pos: [-0.65, 0, 0], mat: b }), cyl(0.07, 0.2, { axis: 'x', pos: [-1.1, 0, 0], mat: b }), cyl(0.14, 0.05, { axis: 'x', pos: [1.02, 0, 0], mat: b }), torus(0.125, 0.015, { axis: 'x', pos: [0, 0, 0], mat: b }), cyl(0.12, 0.005, { axis: 'x', pos: [1.07, 0, 0], mat: MAT.glass })], { pos: [0, 1.5, 0], rot: [0, -25, 22], scale: 1.25 })
      kids.push(tube)
      for (const a of [0, 120, 240]) kids.push(capsule([0, 1.4, 0], [Math.cos((a * Math.PI) / 180) * 0.7, 0, Math.sin((a * Math.PI) / 180) * 0.7], 0.035, { mat: MAT.wood(WOOD.walnut) }))
      kids.push(cyl(0.08, 0.1, { pos: [0, 1.42, 0], mat: b }))
      camera = cam(1.0, 5.4, 0.55, 1.0, 0.7)
      break
    }
    case 'compass':
    case 'binnacle': {
      const bin = v.form === 'binnacle'
      const y = bin ? 1.35 : 0.12
      if (bin) kids.push(lathe(turned([[0.5, 0], [0.52, 0.06], [0.32, 0.2], [0.25, 0.9], [0.4, 1.2]]), { mat: MAT.wood(WOOD.mahogany, 5) }))
      kids.push(SUB(cyl(0.45, 0.09, { pos: [0, y, 0], rr: 0.04, mat: { ...MAT.brass, proc: undefined, rough: 0.14 } }), cyl(0.38, 0.1, { pos: [0, y + 0.08, 0] })))
      kids.push(cyl(0.38, 0.01, { pos: [0, y + 0.02, 0], mat: MAT.matte('#efe6cf'), decal: { canvas: compassCard(), proj: 'y', w: 0.76, h: 0.76 } }))
      kids.push(U([capsule([0, 0, 0.28], [0, 0, -0.28], 0.018, { mat: MAT.blackMetal }), capsule([0, 0.002, 0.28], [0, 0.002, 0.02], 0.02, { mat: MAT.enamel('#9a1a1a') }), cyl(0.03, 0.02, { mat: MAT.brass })], { pos: [0, y + 0.05, 0], rot: [0, 18, 0] }))
      kids.push(INT(cyl(0.39, 0.2, { pos: [0, y + 0.06, 0], mat: MAT.glass }), sphere(1.2, { pos: [0, y - 1.08, 0], mat: MAT.glass })))
      if (!bin) {
        kids.push(SUB(cyl(0.45, 0.04, { pos: [0, 0.2, -0.47], rot: [-78, 0, 0], rr: 0.03, mat: { ...MAT.brass, proc: undefined, rough: 0.14 }, decal: { canvas: guilloche(), proj: 'y', w: 0.9, h: 0.9, bump: 1, under: 1 } })))
        kids.push(torus(0.07, 0.02, { axis: 'z', pos: [0, 0.14, 0.53], mat: MAT.brass }))
      }
      if (bin) {
        kids.push(SUB(sphere(0.55, { pos: [0, y + 0.1, 0], mat: { ...MAT.brass, proc: undefined, rough: 0.15 } }), sphere(0.52, { pos: [0, y + 0.1, 0] }), box([1, 0.6, 0.5], { pos: [0, y + 0.1, 0.55] }), box([1, 0.6, 1], { pos: [0, y - 0.5, 0] })))
        for (const x of [-0.62, 0.62]) {
          kids.push(sphere(0.16, { pos: [x, y - 0.05, 0], mat: MAT.enamel(x < 0 ? '#9a1a1a' : '#1a6a3a') }))
          kids.push(capsule([x * 0.8, y - 0.05, 0], [x, y - 0.05, 0], 0.03, { mat: MAT.brass }))
        }
      }
      camera = bin ? cam(1.2, 5.0, 0.5, 1.0, 1.0) : cam(0.2, 3.4, 0.5, 0.8, 1.6)
      break
    }
    case 'microscope': {
      const b = { ...MAT.brass, proc: undefined, rough: 0.12 }
      kids.push(extrude(poly([[-0.4, -0.3], [0.4, -0.3], [0.45, 0.1], [0.15, 0.35], [-0.15, 0.35], [-0.45, 0.1]]), 0.04, { axis: 'y', pos: [0, 0.04, 0], rr: 0.02, mat: MAT.blackLacquer }))
      kids.push(cyl(0.06, 0.45, { pos: [0, 0.5, -0.15], mat: b }))
      kids.push(box([0.28, 0.02, 0.26], { pos: [0, 0.62, 0.05], r: 0.01, mat: MAT.blackLacquer }))
      kids.push(arc(0.45, 0.05, -0.2, 1.4, { axis: 'x', pos: [0, 0.95, -0.15], mat: b }))
      kids.push(U([cyl(0.08, 0.45, { mat: b }), cyl(0.05, 0.12, { pos: [0, -0.52, 0], mat: b }), cyl(0.055, 0.08, { pos: [0, 0.52, 0], mat: b }), cyl(0.05, 0.005, { pos: [0, 0.6, 0], mat: MAT.glass })], { pos: [0, 1.3, 0.1], rot: [-10, 0, 0] }))
      kids.push(cyl(0.1, 0.03, { axis: 'x', pos: [0.12, 1.05, -0.05], mat: { ...b, proc: 'knurl', pscale: 3, bump: 0.8 } }))
      kids.push(cyl(0.12, 0.01, { pos: [0, 0.3, 0.1], rot: [30, 0, 0], mat: MAT.chrome }))
      camera = cam(0.95, 4.6, 0.5, 1.1, 0.8)
      break
    }
    case 'theodolite': {
      const b = { ...MAT.brass, proc: undefined, rough: 0.14 }
      for (const a of [0, 120, 240]) kids.push(capsule([0, 1.3, 0], [Math.cos((a * Math.PI) / 180) * 0.75, 0, Math.sin((a * Math.PI) / 180) * 0.75], 0.04, { mat: MAT.wood(WOOD.oak) }))
      kids.push(cyl(0.3, 0.04, { pos: [0, 1.36, 0], mat: b }))
      kids.push(cyl(0.2, 0.08, { pos: [0, 1.46, 0], mat: b, decal: { canvas: scaleRing(), proj: 'cyl', h: 0.16, oy: 1.46 } }))
      kids.push(U([box([0.03, 0.2, 0.03], { pos: [-0.15, 0.2, 0], mat: b }), box([0.03, 0.2, 0.03], { pos: [0.15, 0.2, 0], mat: b }), cyl(0.07, 0.35, { axis: 'z', pos: [0, 0.38, 0], rot: [0, 0, 0], mat: b }), cyl(0.12, 0.02, { axis: 'x', pos: [0.17, 0.38, 0], mat: b })], { pos: [0, 1.5, 0], rot: [0, 30, 0] }))
      camera = cam(1.2, 5.0, 0.55, 1.2, 0.5)
      break
    }
    case 'sextant': {
      const b = { ...MAT.brass, proc: undefined, rough: 0.12 }
      const frame = U([
        arc(0.85, 0.035, Math.PI * 0.35, Math.PI * 0.65, { axis: 'z', mat: b, decal: { canvas: scaleRing(), proj: 'z', w: 1.8, h: 1.8 } }),
        capsule([0, 0, 0], [Math.cos(Math.PI * 0.35) * 0.85, Math.sin(Math.PI * 0.35) * 0.85, 0], 0.025, { mat: b }),
        capsule([0, 0, 0], [Math.cos(Math.PI * 0.65) * 0.85, Math.sin(Math.PI * 0.65) * 0.85, 0], 0.025, { mat: b }),
        capsule([0, 0, 0], [0.05, 0.84, 0], 0.02, { mat: b }),
        box([0.06, 0.08, 0.01], { pos: [0, 0.02, 0.03], mat: MAT.chrome }),
        cyl(0.05, 0.22, { axis: 'x', pos: [0.05, 0.45, 0.08], mat: MAT.blackMetal }),
        box([0.03, 0.14, 0.04], { pos: [0.1, 0.7, -0.08], r: 0.015, mat: MAT.wood(WOOD.ebony) }),
      ])
      kids.push(U([frame], { pos: [0, 0.2, 0.1], rot: [-72, 20, 180], scale: 1.6 }))
      kids.push(box([1.4, 0.01, 1], { pos: [0, 0.01, 0], mat: MAT.paper('#d8c9a0'), decal: { canvas: mapCanvas({ W: 1024 }), proj: 'y', w: 2.8, h: 2 } }))
      camera = cam(0.3, 3.8, 0.5, 0.6, 1.9)
      break
    }
    case 'helmet': {
      const cu = { ...MAT.copper, rough: 0.2, bump: 0.25 }
      kids.push(lathe(turned([[0.75, 0], [0.8, 0.06], [0.72, 0.3], [0.5, 0.45]]), { mat: { ...MAT.brass, proc: undefined, rough: 0.2 } }))
      kids.push(sphere(0.6, { pos: [0, 1.0, 0], mat: cu }))
      kids.push(U([cyl(0.04, 0.02, { axis: 'z', pos: [0.76, 0, 0], mat: MAT.brass })], { pos: [0, 0.08, 0], polarY: 12 }))
      for (const [x, y, z, r] of [[0, 1.05, 0.56, 0.2], [0.5, 1.0, 0.25, 0.13], [-0.5, 1.0, 0.25, 0.13], [0, 1.45, 0.3, 0.1]]) {
        const n = [x, y - 1.0, z]
        const l = Math.hypot(...n)
        const dir = n.map((k) => k / l)
        const rx = (-Math.asin(dir[1]) * 180) / Math.PI
        const ry = (Math.atan2(dir[0], dir[2]) * 180) / Math.PI
        kids.push(U([cyl(r + 0.04, 0.05, { axis: 'z', mat: MAT.brass }), cyl(r, 0.06, { axis: 'z', mat: MAT.glass }), U([box([0.01, r, 0.02], { mat: MAT.brass })], { polar: 3 })], { pos: [x * 1.02, y, z * 1.02], rot: [rx, ry, 0] }))
      }
      camera = cam(0.85, 4.6, 0.5, 1.4, 0.8)
      break
    }
    case 'flasks': {
      const liq = MAT.enamel(c1)
      kids.push(lathe(turned([[0.35, 0], [0.38, 0.05], [0.3, 0.45], [0.1, 0.7], [0.08, 1.0], [0.1, 1.05]]), { pos: [-0.4, 0.05, 0], mat: MAT.glass }))
      kids.push(lathe(turned([[0.33, 0.02], [0.35, 0.06], [0.26, 0.35]]), { pos: [-0.4, 0.05, 0], mat: liq }))
      kids.push(SU(0.05, [sphere(0.3, { pos: [0.4, 0.4, 0], mat: MAT.glass }), cyl(0.06, 0.3, { pos: [0.4, 0.8, 0], mat: MAT.glass })]))
      kids.push(sphere(0.26, { pos: [0.4, 0.35, 0], mat: MAT.enamel(c2) }))
      kids.push(box([1.1, 0.03, 0.5], { pos: [0, 0.02, 0], r: 0.02, mat: MAT.wood(WOOD.oak) }))
      kids.push(cyl(0.05, 0.25, { pos: [0.95, 0.28, 0], mat: MAT.brass }))
      kids.push(ell([0.04, 0.09, 0.04], { pos: [0.95, 0.62, 0], mat: MAT.lamp('#6aa8ff') }))
      camera = cam(0.55, 4.2, 0.5, 1.0, 0.9)
      break
    }
    case 'chess': {
      kids.push(box([0.9, 0.05, 0.9], { pos: [0, 0.05, 0], r: 0.02, mat: MAT.wood(WOOD.walnut), decal: { canvas: checker(), proj: 'y', w: 1.6, h: 1.6 } }))
      const light = MAT.wood(WOOD.box, 8), dark = MAT.wood(WOOD.ebony, 8)
      const king = turned([[0.13, 0], [0.14, 0.03], [0.09, 0.08], [0.06, 0.3], [0.1, 0.36], [0.07, 0.4], [0.09, 0.5]])
      const pawn = turned([[0.1, 0], [0.11, 0.03], [0.07, 0.07], [0.04, 0.18], [0.07, 0.2]])
      const place = (pts, x, z, mat, top) => {
        kids.push(lathe(pts, { pos: [x, 0.1, z], mat }))
        if (top === 'cross') kids.push(U([box([0.012, 0.06, 0.012], { mat }), box([0.04, 0.012, 0.012], { pos: [0, 0.02, 0], mat })], { pos: [x, 0.66, z] }))
        if (top === 'ball') kids.push(sphere(0.055, { pos: [x, 0.35, z], mat }))
        if (top === 'knight') kids.push(SU(0.03, [ell([0.07, 0.12, 0.05], { pos: [x, 0.3, z], rot: [0, 0, -20], mat }), ell([0.05, 0.04, 0.1], { pos: [x - 0.04, 0.38, z], rot: [0, 90, 10], mat })]))
      }
      place(king, -0.2, 0.25, light, 'cross')
      place(pawn, 0.1, 0.35, light, 'ball')
      place(turned([[0.12, 0], [0.13, 0.03], [0.08, 0.08], [0.07, 0.2]]), -0.45, 0.4, light, 'knight')
      place(king, 0.25, -0.35, dark, 'cross')
      place(pawn, -0.1, -0.2, dark, 'ball')
      place(pawn, 0.5, -0.1, dark, 'ball')
      camera = cam(0.3, 3.6, 0.5, 1.0, 1.3)
      break
    }
    case 'figure': {
      const br = { ...MAT.bronze, color: '#7a5a30', rough: 0.3 }
      kids.push(box([0.9, 0.1, 0.4], { pos: [0, 0.1, 0], r: 0.02, mat: MAT.enamel('#2a2a2e') }))
      kids.push(
        SU(0.08, [
          ell([0.42, 0.2, 0.18], { pos: [0, 0.75, 0], mat: br }),
          capsule([0.3, 0.8, 0], [0.48, 1.12, 0], 0.1, { mat: br }),
          ell([0.18, 0.08, 0.08], { pos: [0.58, 1.12, 0], rot: [0, 0, -30], mat: br }),
          capsule([0.28, 0.65, 0.1], [0.34, 0.22, 0.1], 0.05, { mat: br }),
          capsule([0.28, 0.65, -0.1], [0.4, 0.3, -0.1], 0.05, { mat: br }),
          capsule([0.4, 0.3, -0.1], [0.36, 0.22, -0.1], 0.04, { mat: br }),
          capsule([-0.3, 0.65, 0.1], [-0.32, 0.22, 0.1], 0.05, { mat: br }),
          capsule([-0.3, 0.65, -0.1], [-0.26, 0.22, -0.1], 0.05, { mat: br }),
          capsule([-0.4, 0.8, 0], [-0.55, 0.45, 0], 0.04, { mat: br }),
          ell([0.03, 0.08, 0.02], { pos: [0.5, 1.26, 0.04], mat: br }),
        ]),
      )
      camera = cam(0.7, 4.0, 0.5, 1.0, 0.7)
      break
    }
    case 'automaton': {
      const g = MAT.gold
      kids.push(lathe(turned([[0.55, 0], [0.58, 0.05], [0.5, 0.15], [0.52, 0.25]]), { mat: g }))
      kids.push(U([capsule([0.48, 0.25, 0], [0.48, 1.0, 0], 0.012, { mat: g })], { polarY: 20 }))
      kids.push(SUB(sphere(0.5, { pos: [0, 1.0, 0], mat: g }), sphere(0.48, { pos: [0, 1.0, 0] }), box([1, 0.5, 1], { pos: [0, 0.6, 0] })))
      kids.push(torus(0.08, 0.015, { axis: 'z', pos: [0, 1.56, 0], mat: g }))
      kids.push(capsule([-0.3, 0.6, 0], [0.3, 0.6, 0], 0.015, { mat: MAT.wood(WOOD.walnut) }))
      kids.push(SU(0.05, [ell([0.14, 0.09, 0.08], { pos: [0, 0.72, 0], rot: [0, 0, 20], mat: MAT.enamel(c1) }), sphere(0.06, { pos: [0.12, 0.8, 0], mat: MAT.enamel(c1) }), ell([0.12, 0.03, 0.04], { pos: [-0.15, 0.68, 0], rot: [0, 0, -15], mat: MAT.enamel(hex(c1, -0.3)) })]))
      kids.push(cone(0.03, 0.025, 0.0, { axis: 'x', pos: [0.2, 0.8, 0], rot: [0, 0, -90], mat: MAT.gold }))
      camera = cam(0.85, 4.6, 0.5, 1.0, 0.7)
      break
    }
    case 'lamp': {
      const b = { ...MAT.bronze, color: '#8a6a3a' }
      kids.push(lathe(turned([[0.4, 0], [0.42, 0.05], [0.34, 0.08], [0.34, 0.14], [0.26, 0.17], [0.26, 0.22], [0.16, 0.26], [0.08, 0.3], [0.07, 1.1]]), { mat: b }))
      // domed glass shade on a stepped bronze column, lit from within
      kids.push(SUB(lathe(turned([[0.62, 1.05], [0.6, 1.2], [0.48, 1.42], [0.26, 1.56], [0.08, 1.6]]), { mat: { type: 'dielectric', color: '#f0d49a', rough: 0.25 }, decal: { canvas: decoGlass(), proj: 'cyl', h: 0.55, oy: 1.32 } }), lathe(turned([[0.58, 1.0], [0.56, 1.18], [0.44, 1.38], [0.0, 1.5]]), {})))
      kids.push(torus(0.62, 0.025, { pos: [0, 1.05, 0], mat: b }))
      kids.push(sphere(0.07, { pos: [0, 1.64, 0], mat: b }))
      kids.push(sphere(0.18, { pos: [0, 1.2, 0], mat: MAT.lamp('#ffd98a') }))
      camera = cam(0.85, 4.6, 0.5, 1.0, 0.7)
      break
    }
    case 'typewriter': {
      const body = { ...MAT.blackLacquer, rough: 0.12 }
      kids.push(box([0.9, 0.18, 0.55], { pos: [0, 0.2, 0], r: 0.06, mat: body }))
      kids.push(INT(box([0.8, 0.22, 0.35], { pos: [0, 0.42, -0.15], r: 0.05, mat: body }), cyl(0.6, 1, { axis: 'x', pos: [0, 0.0, -0.1] })))
      kids.push(cyl(0.1, 0.75, { axis: 'x', pos: [0, 0.62, -0.35], rr: 0.03, mat: MAT.rubber }))
      kids.push(box([0.4, 0.3, 0.005], { pos: [0, 0.9, -0.32], rot: [-12, 0, 0], mat: MAT.paper('#f6f2e6'), decal: { canvas: textLines(400, 300, { bg: '#f6f2e6', cols: 1, initial: '#222', seed: 'tw' }), proj: 'z', w: 0.8, h: 0.6 } }))
      for (let r = 0; r < 4; r++) kids.push(U([U([cyl(0.035, 0.03, { mat: MAT.chrome }), cyl(0.028, 0.005, { pos: [0, 0.03, 0], mat: MAT.enamel('#f0ece0') })])], { pos: [0, 0.4 - r * 0.02, 0.1 + r * 0.1], repX: { step: 0.1, n: 11 - (r % 2) } }))
      kids.push(box([0.35, 0.03, 0.05], { pos: [0, 0.3, 0.52], r: 0.02, mat: MAT.enamel('#f0ece0') }))
      kids.push(capsule([-0.95, 0.72, -0.35], [-1.1, 0.8, -0.1], 0.02, { mat: MAT.chrome }))
      camera = cam(0.45, 4.2, 0.5, 1.2, 1.3)
      break
    }
    // ------------------------------------------------------------ books & paper
    case 'book': {
      const cover = { type: 'dielectric', color: c1, rough: 0.55, proc: 'leather', pscale: 60, bump: 0.3 }
      const art = bookCover(v, id)
      kids.push(U([
        box([0.5, 0.08, 0.7], { pos: [0.01, 0.1, 0], r: 0.015, mat: MAT.paper('#efe6cf') }),
        box([0.53, 0.012, 0.73], { pos: [0, 0.19, 0], r: 0.01, mat: cover, decal: { canvas: art, proj: 'y', w: 1.06, h: 1.46, bump: 0.6 } }),
        box([0.53, 0.012, 0.73], { pos: [0, 0.012, 0], r: 0.01, mat: cover }),
        cyl(0.1, 0.72, { axis: 'z', pos: [-0.52, 0.1, 0], mat: cover }),
      ], { rot: [0, -25, 0], pos: [0, 0.2, 0] }))
      kids.push(box([0.6, 0.1, 0.8], { pos: [0.1, 0.1, -0.2], rot: [0, 10, 0], r: 0.015, mat: { type: 'dielectric', color: hex(c1, -0.4).replace('rgb', 'rgb'), rough: 0.6 } }))
      kids[1] = box([0.6, 0.1, 0.8], { pos: [0.1, 0.1, -0.2], rot: [0, 10, 0], r: 0.015, mat: { type: 'dielectric', color: '#2a1d14', rough: 0.6, proc: 'leather', pscale: 60 } })
      camera = cam(0.25, 3.4, 0.5, 0.8, 1.7)
      break
    }
    case 'openbook': {
      const page = MAT.paper('#f2e8cf')
      const leftC = textLines(700, 900, { seed: id + 'L', initial: v.c2 || '#9a1a1a' })
      const rightC = textLines(700, 900, { seed: id + 'R', initial: v.c2 || '#1f3f9a' })
      if (v.mark === 'portrait') {
        const ctx = leftC.getContext('2d')
        ctx.fillStyle = '#f2e8cf'
        ctx.fillRect(80, 120, 540, 700)
        ctx.strokeStyle = '#3a2c1c'
        ctx.lineWidth = 4
        ctx.strokeRect(150, 250, 400, 460)
        for (let i = 0; i < 120; i++) {
          ctx.globalAlpha = 0.5
          ctx.beginPath()
          ctx.moveTo(160 + i * 3.2, 260)
          ctx.lineTo(160 + i * 3.2, 700)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = '#f2e8cf'
        ctx.beginPath()
        ctx.ellipse(350, 430, 95, 125, 0, 0, 7)
        ctx.fill()
        ctx.fillStyle = '#3a2c1c'
        ctx.font = 'bold 44px Georgia'
        ctx.textAlign = 'center'
        ctx.fillText('SHAKESPEARES', 350, 170)
        ctx.font = 'bold 30px Georgia'
        ctx.fillText('COMEDIES, HISTORIES, & TRAGEDIES', 350, 220)
      }
      kids.push(INT(box([0.52, 0.2, 0.72], { pos: [-0.53, 0.1, 0], mat: page, decal: { canvas: leftC, proj: 'y', w: 1.04, h: 1.44 } }), cyl(2.2, 1, { axis: 'z', pos: [-0.53, -1.95, 0] })))
      kids.push(INT(box([0.52, 0.2, 0.72], { pos: [0.53, 0.1, 0], mat: page, decal: { canvas: rightC, proj: 'y', w: 1.04, h: 1.44 } }), cyl(2.2, 1, { axis: 'z', pos: [0.53, -1.95, 0] })))
      kids.push(box([1.12, 0.02, 0.76], { pos: [0, 0.02, 0], r: 0.015, mat: MAT.leather(c1, 50) }))
      camera = cam(0.2, 3.6, 0.5, 0.4, 2.0)
      break
    }
    case 'map': {
      kids.push(box([1.05, 0.008, 0.68], { pos: [0, 0.07, 0], mat: MAT.paper('#e6d6ae'), decal: { canvas: mapCanvas({ W: 1400 }), proj: 'y', w: 2.1, h: 1.36 } }))
      for (const x of [-1.1, 1.1]) kids.push(cyl(0.07, 0.76, { axis: 'z', pos: [x, 0.07, 0], rr: 0.03, mat: MAT.wood(WOOD.walnut) }))
      camera = cam(0.05, 3.6, 0.5, 0.3, 2.3)
      break
    }
    case 'ledger': {
      kids.push(U([
        box([0.5, 0.1, 0.68], { pos: [0.01, 0.12, 0], r: 0.015, mat: MAT.paper('#e8dcc0') }),
        box([0.53, 0.015, 0.71], { pos: [0, 0.23, 0], r: 0.012, mat: MAT.leather('#101012', 60), decal: { canvas: labelCanvas(520, 700, [['LEDGER', 0.06, 800], ['', 0.05], ['·  ✦  ·', 0.05]], { bg: 'rgba(0,0,0,0)', ink: '#d4af58' }), proj: 'y', w: 1.06, h: 1.42, bump: 0.5 } }),
        box([0.53, 0.015, 0.71], { pos: [0, 0.015, 0], r: 0.012, mat: MAT.leather('#101012', 60) }),
        cyl(0.12, 0.7, { axis: 'z', pos: [-0.52, 0.12, 0], mat: MAT.leather('#101012', 60) }),
      ].concat([[0.53, 0.71], [0.53, -0.71], [-0.5, 0.71], [-0.5, -0.71]].map(([x, z]) => box([0.07, 0.125, 0.07], { pos: [x, 0.12, z], r: 0.02, mat: MAT.gold }))).concat([box([0.1, 0.135, 0.12], { pos: [0.55, 0.12, 0], r: 0.02, mat: MAT.gold })]), { rot: [0, -20, 0] }))
      camera = cam(0.2, 3.2, 0.5, 0.8, 1.6)
      break
    }
    // ------------------------------------------------------------ cameras & tech
    case 'rangefinder': {
      const top = v.metal === 'black' ? MAT.blackMetal : MAT.chrome
      kids.push(box([0.7, 0.2, 0.17], { pos: [0, 0.3, 0], r: 0.08, mat: MAT.leather('#141414', 120) }))
      kids.push(INT(box([0.72, 0.07, 0.18], { pos: [0, 0.53, 0], r: 0.06, mat: top }), box([0.72, 0.2, 0.18], { pos: [0, 0.5, 0], r: 0.08 })))
      kids.push(box([0.72, 0.03, 0.18], { pos: [0, 0.1, 0], r: 0.03, mat: top }))
      kids.push(cyl(0.2, 0.08, { axis: 'z', pos: [0, 0.3, 0.24], mat: top }))
      kids.push(cyl(0.17, 0.12, { axis: 'z', pos: [0, 0.3, 0.36], mat: { ...MAT.blackMetal, proc: 'knurl', pscale: 2, bump: 0.6 } }))
      kids.push(cyl(0.14, 0.01, { axis: 'z', pos: [0, 0.3, 0.49], mat: { type: 'glass', color: '#6a8aa0' } }))
      kids.push(cyl(0.13, 0.005, { axis: 'z', pos: [0, 0.3, 0.47], mat: MAT.enamel('#0a0e18') }))
      for (const x of [-0.45, 0.25]) kids.push(box([0.07, 0.035, 0.01], { pos: [x, 0.52, 0.18], r: 0.01, mat: { type: 'glass', color: '#9ab0c0' } }))
      kids.push(cyl(0.06, 0.03, { pos: [0.5, 0.62, 0], mat: { ...top, proc: 'knurl', pscale: 3, bump: 0.6 } }))
      kids.push(cyl(0.07, 0.03, { pos: [-0.45, 0.62, 0], mat: { ...top, proc: 'knurl', pscale: 3, bump: 0.6 } }))
      if (v.mark === 'red') kids.push(cyl(0.035, 0.01, { axis: 'z', pos: [-0.25, 0.45, 0.18], mat: MAT.enamel('#d0202a') }))
      kids.push(plinth(1.0, 0.1))
      kids = [U(kids, { rot: [0, -28, 0] })]
      camera = cam(0.4, 3.4, 0.5, 0.6, 0.6)
      break
    }
    case 'boxcamera': {
      kids.push(box([0.32, 0.32, 0.32], { pos: [0, 0.42, 0], r: 0.03, mat: MAT.leather('#141414', 120) }))
      kids.push(box([0.33, 0.04, 0.33], { pos: [0, 0.76, 0], r: 0.02, mat: MAT.chrome }))
      kids.push(box([0.33, 0.2, 0.14], { pos: [0, 0.42, -0.45], r: 0.03, mat: MAT.chrome }))
      kids.push(box([0.28, 0.14, 0.28], { pos: [0, 0.94, 0], r: 0.02, mat: MAT.blackMetal }))
      kids.push(cyl(0.18, 0.12, { axis: 'z', pos: [0, 0.42, 0.42], mat: { ...MAT.blackMetal, proc: 'knurl', pscale: 2 } }))
      kids.push(cyl(0.16, 0.08, { axis: 'z', pos: [0, 0.42, 0.6], mat: MAT.chrome }))
      kids.push(cyl(0.13, 0.01, { axis: 'z', pos: [0, 0.42, 0.68], mat: { type: 'glass', color: '#6a8aa0' } }))
      kids.push(cyl(0.12, 0.005, { axis: 'z', pos: [0, 0.42, 0.665], mat: MAT.enamel('#0a0e18') }))
      kids.push(cyl(0.07, 0.04, { axis: 'x', pos: [0.36, 0.5, 0], mat: MAT.chrome }))
      kids.push(plinth(0.9, 0.1))
      kids = [U(kids, { rot: [0, -30, 0] })]
      camera = cam(0.55, 3.8, 0.5, 0.8, 0.8)
      break
    }
    case 'polaroid': {
      kids.push(box([0.55, 0.12, 0.35], { pos: [0, 0.14, 0], r: 0.05, mat: MAT.leather('#3a2a20', 100) }))
      kids.push(box([0.55, 0.3, 0.05], { pos: [0, 0.42, -0.25], rot: [-35, 0, 0], r: 0.03, mat: MAT.chrome }))
      kids.push(box([0.5, 0.26, 0.04], { pos: [0, 0.45, 0.02], rot: [60, 0, 0], r: 0.03, mat: MAT.leather('#3a2a20', 100) }))
      kids.push(cyl(0.1, 0.05, { axis: 'z', pos: [-0.15, 0.55, 0.12], rot: [-30, 0, 0], mat: MAT.blackMetal }))
      kids.push(cyl(0.08, 0.01, { axis: 'z', pos: [-0.15, 0.57, 0.17], rot: [-30, 0, 0], mat: { type: 'glass', color: '#6a8aa0' } }))
      kids.push(box([0.32, 0.005, 0.4], { pos: [0.1, 0.02, 0.62], rot: [0, 12, 0], mat: MAT.matte('#f4f2ec'), decal: { canvas: photoCard(), proj: 'y', w: 0.64, h: 0.8 } }))
      camera = cam(0.3, 3.6, 0.5, 0.8, 1.4)
      break
    }
    case 'mac': {
      const beige = MAT.plastic('#e4dcc8', 0.4)
      kids.push(SU(0.02, [box([0.45, 0.55, 0.45], { pos: [0, 0.65, -0.1], r: 0.06, mat: beige }), box([0.47, 0.08, 0.5], { pos: [0, 0.1, -0.08], r: 0.04, mat: beige })]))
      kids.push(box([0.33, 0.25, 0.01], { pos: [0, 0.8, 0.36], r: 0.05, mat: { type: 'dielectric', color: '#b8c0b0', rough: 0.05 }, decal: { canvas: macScreen(), proj: 'z', w: 0.66, h: 0.5 } }))
      kids.push(box([0.12, 0.012, 0.01], { pos: [0.18, 0.4, 0.36], mat: MAT.blackMetal }))
      kids.push(box([0.5, 0.03, 0.2], { pos: [0, 0.03, 0.75], r: 0.02, mat: beige }))
      kids.push(U([box([0.028, 0.012, 0.028], { r: 0.008, mat: MAT.plastic('#d2c9b2', 0.5) })], { pos: [0, 0.065, 0.75], repX: { step: 0.064, n: 14 } }))
      kids.push(U([box([0.028, 0.012, 0.028], { r: 0.008, mat: MAT.plastic('#d2c9b2', 0.5) })], { pos: [0, 0.065, 0.83], repX: { step: 0.064, n: 13 } }))
      kids.push(U([box([0.028, 0.012, 0.028], { r: 0.008, mat: MAT.plastic('#d2c9b2', 0.5) })], { pos: [0, 0.065, 0.67], repX: { step: 0.064, n: 13 } }))
      kids.push(box([0.1, 0.03, 0.14], { pos: [0.75, 0.03, 0.7], r: 0.04, mat: beige }))
      camera = cam(0.65, 4.2, 0.5, 1.0, 0.8)
      break
    }
    case 'walkman': {
      kids.push(box([0.4, 0.55, 0.1], { pos: [0, 0.7, 0], rot: [-8, 0, 0], r: 0.04, mat: MAT.plastic(c1, 0.25), decal: { canvas: walkmanFace(), proj: 'z', w: 0.8, h: 1.1 } }))
      kids.push(SUB(torus(0.42, 0.03, { axis: 'z', pos: [0, 1.4, -0.3], rot: [0, 0, 0], mat: { ...MAT.steel } }), box([1, 0.45, 1], { pos: [0, 1.0, -0.3] })))
      for (const x of [-0.42, 0.42]) kids.push(cyl(0.12, 0.04, { axis: 'x', pos: [x, 1.06, -0.3], mat: MAT.fabric('#e8a02a') }))
      kids.push(plinth(0.8, 0.1))
      camera = cam(0.75, 4.2, 0.5, 0.8, 0.6)
      break
    }
    case 'gameboy': {
      kids.push(box([0.4, 0.66, 0.08], { pos: [0, 0.78, 0], rot: [-10, 0, 0], r: 0.05, mat: MAT.plastic('#c9c6be', 0.35), decal: { canvas: gameboyFace(), proj: 'z', w: 0.8, h: 1.32 } }))
      for (const [x, y] of [[0.14, 0.6], [0.24, 0.66]]) kids.push(cyl(0.05, 0.02, { axis: 'z', pos: [x, y, 0.11], rot: [-10, 0, 0], mat: MAT.plastic('#a0204a', 0.2) }))
      kids.push(U([box([0.03, 0.09, 0.02], { mat: MAT.plastic('#222', 0.3) }), box([0.09, 0.03, 0.02], { mat: MAT.plastic('#222', 0.3) })], { pos: [-0.18, 0.64, 0.1], rot: [-10, 0, 0] }))
      kids.push(plinth(0.8, 0.1))
      camera = cam(0.8, 4.0, 0.5, 0.8, 0.6)
      break
    }
    case 'console': {
      kids.push(box([0.75, 0.1, 0.45], { pos: [0, 0.1, 0], r: 0.03, mat: MAT.plastic('#141210', 0.3) }))
      kids.push(INT(box([0.75, 0.1, 0.3], { pos: [0, 0.25, -0.1], r: 0.02, mat: MAT.plastic('#141210', 0.25), decal: { canvas: ribbed(), proj: 'y', w: 1.5, h: 0.6, bump: 1 } }), box([1, 0.2, 1], { pos: [0, 0.2, -0.3], rot: [15, 0, 0] })))
      kids.push(box([0.76, 0.06, 0.02], { pos: [0, 0.15, 0.45], mat: MAT.wood('#6a4222', 8) }))
      for (let i = 0; i < 4; i++) kids.push(box([0.03, 0.05, 0.03], { pos: [-0.5 + i * 0.12 + (i > 1 ? 0.5 : 0), 0.24, 0.3], r: 0.01, mat: MAT.chrome }))
      kids.push(box([0.2, 0.05, 0.2], { pos: [0.9, 0.05, 0.4], r: 0.03, mat: MAT.plastic('#141210', 0.3) }))
      kids.push(capsule([0.9, 0.1, 0.4], [0.9, 0.4, 0.42], 0.025, { mat: MAT.plastic('#141210', 0.3) }))
      kids.push(cyl(0.035, 0.012, { pos: [0.83, 0.11, 0.32], mat: MAT.plastic('#b3202a', 0.2) }))
      kids.push(box([0.2, 0.02, 0.28], { pos: [0.1, 0.35, -0.1], r: 0.01, mat: MAT.plastic('#2a2a2a', 0.4), decal: { canvas: labelCanvas(200, 280, [['GAME', 0.12], ['PROGRAM', 0.08]], { bg: '#e8a02a' }), proj: 'y', w: 0.4, h: 0.56 } }))
      camera = cam(0.25, 3.8, 0.5, 0.9, 1.3)
      break
    }
    case 'keyboard': {
      kids.push(INT(box([1.1, 0.08, 0.4], { pos: [0, 0.08, 0], r: 0.03, mat: MAT.plastic('#d9d4c6', 0.45) }), box([2, 0.2, 1], { pos: [0, 0.0, 0], rot: [6, 0, 0] })))
      for (let r = 0; r < 5; r++) kids.push(U([box([0.036, 0.03, 0.036], { r: 0.012, mat: MAT.plastic(r === 0 ? '#9aa0a6' : '#efebe0', 0.5) })], { pos: [0, 0.18 + r * 0.012, 0.28 - r * 0.1], repX: { step: 0.09, n: 22 - (r % 2) } }))
      kids.push(box([0.3, 0.03, 0.036], { pos: [-0.2, 0.17, 0.37], r: 0.012, mat: MAT.plastic('#efebe0', 0.5) }))
      camera = cam(0.2, 3.8, 0.5, 0.9, 1.3)
      break
    }
    case 'radiogram': {
      kids.push(box([1.0, 0.2, 0.45], { pos: [0, 0.24, 0], r: 0.02, mat: MAT.plastic('#f2f0ea', 0.3) }))
      for (const x of [-1.02, 1.02]) kids.push(box([0.03, 0.22, 0.46], { pos: [x, 0.24, 0], r: 0.01, mat: MAT.wood(WOOD.oak, 8) }))
      kids.push(cyl(0.3, 0.02, { pos: [-0.35, 0.46, -0.05], mat: MAT.blackMetal }))
      kids.push(cyl(0.29, 0.008, { pos: [-0.35, 0.49, -0.05], mat: MAT.blackLacquer, decal: { canvas: recordCanvas('#b3202a'), proj: 'y', w: 0.6, h: 0.6 } }))
      kids.push(capsule([0.1, 0.5, -0.3], [-0.2, 0.5, 0.05], 0.015, { mat: MAT.chrome }))
      kids.push(box([0.3, 0.1, 0.01], { pos: [0.55, 0.3, 0.45], mat: MAT.plastic('#d8d2c2', 0.4), decal: { canvas: dialScale(), proj: 'z', w: 0.6, h: 0.2 } }))
      for (const x of [0.2, 0.3, 0.4]) kids.push(cyl(0.03, 0.02, { axis: 'z', pos: [x, 0.12, 0.46], mat: MAT.plastic('#9a9a9a', 0.3) }))
      kids.push(INT(box([1.0, 0.25, 0.44], { pos: [0, 0.6, 0.0], mat: { type: 'glass', color: '#eef2f4' } }), SUB(box([1.0, 0.3, 0.44], { pos: [0, 0.6, 0.0] }), box([0.98, 0.3, 0.42], { pos: [0, 0.58, 0.0] }))))
      camera = cam(0.45, 4.4, 0.5, 1.0, 1.1)
      break
    }
    case 'turntable': {
      const bang = id === 'tech_beogram'
      kids.push(box([0.85, 0.08, 0.6], { pos: [0, 0.12, 0], r: 0.03, mat: bang ? { ...MAT.steel, rough: 0.2 } : id === 'tech_technics_1200' ? MAT.plastic('#2a2a2e', 0.25) : MAT.wood(WOOD.walnut, 6) }))
      kids.push(cyl(0.44, 0.03, { pos: [-0.12, 0.23, 0], mat: bang ? MAT.chrome : MAT.plastic('#333', 0.3), decal: bang ? undefined : { canvas: strobe(), proj: 'cyl', h: 0.06, oy: 0.23 } }))
      kids.push(cyl(0.42, 0.006, { pos: [-0.12, 0.265, 0], mat: MAT.blackLacquer, decal: { canvas: recordCanvas(c2 === '#d4af58' ? '#1f3f8a' : '#b3202a'), proj: 'y', w: 0.84, h: 0.84 } }))
      kids.push(cyl(0.04, 0.03, { pos: [0.6, 0.25, -0.35], mat: MAT.chrome }))
      kids.push(tube([[0.6, 0.3, -0.35], [0.62, 0.32, 0.1], [0.4, 0.3, 0.25]], 0.012, { mat: MAT.chrome }))
      kids.push(box([0.05, 0.02, 0.03], { pos: [0.37, 0.29, 0.26], mat: MAT.blackMetal }))
      if (id === 'tech_technics_1200') kids.push(box([0.02, 0.01, 0.2], { pos: [0.72, 0.21, 0.28], mat: MAT.chrome }))
      camera = cam(0.25, 3.8, 0.5, 0.9, 1.6)
      break
    }
    case 'amp': {
      const tolex = { type: 'dielectric', color: '#151515', rough: 0.5, proc: 'leather', pscale: 70, bump: 0.6 }
      kids.push(box([0.7, 0.2, 0.28], { pos: [0, 1.3, 0], r: 0.03, mat: tolex }))
      kids.push(box([0.66, 0.06, 0.01], { pos: [0, 1.32, 0.28], mat: id === 'tech_marshall_amp' ? MAT.gold : MAT.plastic('#b3202a', 0.3) }))
      kids.push(U([cyl(0.028, 0.03, { axis: 'z', mat: { ...MAT.blackMetal } })], { pos: [0, 1.32, 0.31], repX: { step: 0.1, n: 10 } }))
      kids.push(box([0.72, 0.52, 0.3], { pos: [0, 0.52, 0], r: 0.03, mat: tolex }))
      kids.push(box([0.64, 0.44, 0.01], { pos: [0, 0.52, 0.3], mat: MAT.fabric(id === 'tech_marshall_amp' ? '#3a2e1c' : '#8a6a3a') }))
      for (const x of [-0.6, 0.6]) kids.push(cyl(0.04, 0.03, { pos: [x, 0.02, 0.2], mat: MAT.chrome }))
      camera = cam(0.8, 4.6, 0.52, 1.2, 0.5)
      break
    }
    case 'guitar':
    case 'lespaul':
    case 'flyingv':
    case 'bass': {
      const outline =
        v.form === 'lespaul'
          ? ellipsePoly(0.36, 0.5, -0.1, 0.22)
          : v.form === 'flyingv'
            ? [[-0.05, 0.25], [0.05, 0.25], [0.42, -0.6], [0.28, -0.65], [0, -0.3], [-0.28, -0.65], [-0.42, -0.6]]
            : stratPoly(v.form === 'bass' ? 1.05 : 1)
      const finish = { type: 'dielectric', color: c1, rough: 0.08, spec: 1.2 }
      const neckLen = v.form === 'bass' ? 1.35 : 1.1
      const g = U(
        [
          extrude(poly(outline), 0.05, { rr: 0.02, mat: finish, decal: { canvas: sunburst(c1), proj: 'z', w: 1.1, h: 1.4 } }),
          v.form !== 'lespaul' && v.form !== 'flyingv' ? extrude(poly(outline.map(([x, y]) => [x * 0.7 + 0.05, y * 0.62 - 0.08])), 0.005, { pos: [0, 0, 0.055], mat: MAT.plastic(v.form === 'flyingv' ? '#111' : '#f4f1ea', 0.3) }) : null,
          box([0.045, neckLen / 2, 0.025], { pos: [0, neckLen / 2 + 0.1, 0.02], mat: MAT.wood('#8a5a2a', 12) }),
          box([0.07, 0.14, 0.02], { pos: [0, neckLen + 0.25, 0.02], r: 0.02, mat: v.form === 'lespaul' || v.form === 'flyingv' ? MAT.blackLacquer : finish }),
          ...(v.form === 'bass' ? [-0.05] : v.form === 'lespaul' ? [-0.2, 0.02] : [-0.26, -0.12, 0.02]).map((y) => box([0.06, 0.02, 0.012], { pos: [0, y, 0.065], r: 0.008, mat: v.form === 'lespaul' ? MAT.chrome : MAT.plastic('#f4f1ea', 0.3) })),
          box([0.07, 0.015, 0.012], { pos: [0, -0.4, 0.06], mat: MAT.chrome }),
          ...[-0.018, -0.006, 0.006, 0.018].map((x) => capsule([x, -0.4, 0.075], [x * 0.7, neckLen + 0.18, 0.045], 0.0025, { mat: MAT.chrome })),
        ],
        { pos: [0, 1.0, 0], rot: [-8, 25, -14], scale: 1.0 },
      )
      kids.push(g)
      kids.push(capsule([-0.25, 0, 0.3], [-0.05, 0.5, 0.05], 0.02, { mat: MAT.blackMetal }), capsule([0.25, 0, 0.3], [0.05, 0.5, 0.05], 0.02, { mat: MAT.blackMetal }), capsule([0, 0, -0.35], [0, 1.4, -0.12], 0.02, { mat: MAT.blackMetal }))
      camera = { pos: [1.0, 1.7, 4.6], target: [0, 1.3, 0], fov: 0.66 }
      break
    }
    case 'piano': {
      const lac = MAT.blackLacquer
      const plan = [[-0.8, 0.5], [0.8, 0.5], [0.85, 0.0], [0.6, -0.6], [0.3, -1.2], [0.0, -1.5], [-0.4, -1.55], [-0.75, -1.3], [-0.8, -0.6]]
      kids.push(extrude(poly(plan), 0.18, { axis: 'y', pos: [0, 0.95, 0], rr: 0.03, mat: lac }))
      kids.push(extrude(poly(plan), 0.012, { axis: 'y', pos: [0, 1.13, 0], rot: [0, 0, 0], mat: lac, scale: 1 }))
      kids.push(U([extrude(poly(plan), 0.012, { axis: 'y', mat: lac })], { pos: [-0.8, 1.14, 0], rot: [0, 0, 35], scale: 1 }))
      kids.push(capsule([0.3, 1.14, -0.6], [0.0, 1.8, -0.6], 0.015, { mat: lac }))
      kids.push(box([0.78, 0.04, 0.12], { pos: [0, 0.88, 0.62], mat: MAT.enamel('#f4f1ea') }))
      kids.push(U([box([0.012, 0.02, 0.07], { mat: MAT.blackLacquer })], { pos: [0, 0.93, 0.58], repX: { step: 0.045, n: 34 } }))
      for (const [x, z] of [[-0.7, 0.3], [0.7, 0.3], [0, -1.3]]) kids.push(cyl(0.06, 0.4, { pos: [x, 0.4, z], mat: lac }))
      kids.push(box([0.2, 0.2, 0.05], { pos: [0, 1.28, 0.5], rot: [-15, 0, 0], mat: lac }))
      camera = cam(1.0, 5.6, 0.55, 2.2, 1.2)
      break
    }
    case 'violin': {
      const body = extrude(poly(violinPoly()), 0.07, { rr: 0.05, mat: { type: 'dielectric', color: c1, rough: 0.12, proc: 'wood', pscale: 14, bump: 0.2, spec: 1.3 }, decal: { canvas: fHoles(), proj: 'z', w: 0.9, h: 1.2 } })
      const g = U([
        body,
        box([0.035, 0.34, 0.025], { pos: [0, 0.78, 0.05], mat: MAT.blackLacquer }),
        box([0.03, 0.12, 0.03], { pos: [0, 1.2, 0.04], mat: MAT.wood(c1, 12) }),
        torus(0.05, 0.02, { axis: 'x', pos: [0, 1.36, 0.06], mat: MAT.wood(c1, 12) }),
        box([0.1, 0.005, 0.03], { pos: [0, -0.1, 0.13], mat: MAT.wood('#e8dcc0', 12) }),
        box([0.08, 0.1, 0.02], { pos: [0, -0.4, 0.09], r: 0.02, mat: MAT.blackLacquer }),
        ...[-0.02, -0.007, 0.007, 0.02].map((x) => capsule([x, -0.35, 0.1], [x * 0.6, 1.1, 0.07], 0.002, { mat: MAT.chrome })),
      ], { pos: [0, 0.2, 0], rot: [-75, 0, 25], scale: 1.15 })
      kids.push(g)
      kids.push(box([1.2, 0.03, 0.9], { pos: [0, 0.02, 0], r: 0.02, mat: MAT.velvet('#3a0f18') }))
      camera = cam(0.2, 3.3, 0.5, 0.5, 1.9)
      break
    }
    case 'mic': {
      const chrome = MAT.chrome
      kids.push(lathe(turned([[0.35, 0], [0.36, 0.04], [0.1, 0.08], [0.04, 0.12], [0.03, 0.9]]), { mat: MAT.blackLacquer }))
      kids.push(U([
        lathe(turned([[0.1, -0.35], [0.16, -0.3], [0.17, 0.1]]), { mat: chrome }),
        SU(0.02, [cyl(0.17, 0.18, { pos: [0, 0.28, 0], mat: { ...chrome, proc: 'tweed', pscale: 90, bump: 0.8 } }), sphere(0.17, { pos: [0, 0.46, 0], mat: { ...chrome, proc: 'tweed', pscale: 90, bump: 0.8 } })]),
        torus(0.17, 0.015, { pos: [0, 0.1, 0], mat: chrome }),
      ], { pos: [0, 1.25, 0], rot: [0, 0, 8] }))
      kids.push(torus(0.19, 0.02, { axis: 'x', pos: [0, 1.28, 0], mat: MAT.blackMetal }))
      camera = cam(0.95, 4.4, 0.5, 0.9, 0.5)
      break
    }
    case 'vinyl': {
      kids.push(box([0.65, 0.65, 0.01], { pos: [-0.25, 0.7, -0.05], rot: [-12, 12, 0], mat: MAT.paper(c2), decal: { canvas: sleeveArt(c1, c2), proj: 'z', w: 1.3, h: 1.3 } }))
      kids.push(cyl(0.6, 0.006, { axis: 'z', pos: [0.35, 0.72, 0.02], rot: [-12, 12, 0], mat: MAT.blackLacquer, decal: { canvas: recordCanvas(c1), proj: 'z', w: 1.2, h: 1.2 } }))
      kids.push(box([1.3, 0.03, 0.2], { pos: [0, 0.05, 0.1], r: 0.02, mat: MAT.wood(WOOD.walnut) }))
      camera = cam(0.7, 4.0, 0.5, 0.6, 0.4)
      break
    }
    // ------------------------------------------------------------ fashion
    case 'birkin':
    case 'kelly':
    case 'bamboo':
    case 'flap':
    case 'ladydior':
    case 'baguette': {
      const lf = v.form
      const leather = lf === 'flap' || lf === 'ladydior' ? { ...MAT.leather(c1, 90), proc: 'quilted', pscale: 7, bump: 1.4 } : MAT.leather(c1, 80)
      const w = lf === 'baguette' ? 0.7 : lf === 'kelly' ? 0.55 : 0.6
      const h = lf === 'baguette' ? 0.28 : lf === 'flap' ? 0.34 : 0.45
      const d = lf === 'baguette' ? 0.14 : 0.24
      const trap = poly([[-w, 0], [w, 0], [w * 0.86, h * 2], [-w * 0.86, h * 2]])
      kids.push(extrude(trap, d, { rr: 0.06, mat: leather, decal: { canvas: stitching(c1, lf), proj: 'z', w: w * 2.2, h: h * 2.2, oy: h, bump: 0.8 } }))
      kids.push(INT(extrude(poly([[-w * 0.9, h * 1.1], [w * 0.9, h * 1.1], [w * 0.87, h * 2 + 0.02], [-w * 0.87, h * 2 + 0.02]]), d + 0.02, { rr: 0.04, mat: leather }), box([2, 2, 0.04], { pos: [0, 0, d + 0.02] })))
      const gold = { ...MAT.gold, rough: 0.12 }
      if (lf === 'birkin' || lf === 'kelly') {
        kids.push(box([0.07, 0.05, 0.02], { pos: [0, h * 1.2, d + 0.05], r: 0.015, mat: gold }))
        kids.push(U([box([0.07, 0.07, 0.025], { r: 0.02, mat: gold }), SUB(torus(0.045, 0.012, { axis: 'z', pos: [0, 0.07, 0], mat: gold }), box([0.1, 0.05, 0.1], { pos: [0, 0.03, 0] }))], { pos: [0, h * 0.95, d + 0.08] }))
        kids.push(SUB(torus(lf === 'kelly' ? 0.22 : 0.3, 0.035, { axis: 'z', pos: [0, h * 2, 0], mat: leather }), box([1, 0.4, 1], { pos: [0, h * 2 - 0.4, 0] })))
        if (lf === 'birkin') kids.push(SUB(torus(0.3, 0.035, { axis: 'z', pos: [0, h * 2, -0.1], mat: leather }), box([1, 0.4, 1], { pos: [0, h * 2 - 0.4, -0.1] })))
      }
      if (lf === 'bamboo') {
        const pts = []
        for (let i = 0; i <= 16; i++) {
          const a = (i / 16) * Math.PI
          pts.push([Math.cos(a) * 0.36, h * 2 + Math.sin(a) * 0.36, 0])
        }
        kids.push(tube(pts, 0.035, { mat: { ...MAT.wood('#c89a4a', 30), rough: 0.2 } }))
        kids.push(beads(pts.filter((_, i) => i % 3 === 0), 0.042, { mat: { ...MAT.wood('#a8782a', 30), rough: 0.2 } }))
        kids.push(box([0.08, 0.05, 0.02], { pos: [0, h * 1.25, d + 0.05], r: 0.015, mat: gold }))
      }
      if (lf === 'flap') {
        const pts = []
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI
          pts.push([Math.cos(a) * w * 0.95, h * 2 + Math.sin(a) * 0.8, -0.05])
        }
        kids.push(beads(pts, 0.025, { mat: gold }))
        kids.push(box([0.09, 0.04, 0.02], { pos: [0, h * 1.25, d + 0.05], r: 0.012, mat: gold }))
      }
      if (lf === 'ladydior') {
        kids.push(SUB(torus(0.25, 0.03, { axis: 'z', pos: [0, h * 2, 0], mat: leather }), box([1, 0.4, 1], { pos: [0, h * 2 - 0.4, 0] })))
        kids.push(U([torus(0.04, 0.008, { axis: 'z', mat: gold }), box([0.03, 0.03, 0.005], { pos: [0, -0.08, 0], mat: gold })], { pos: [0.25, h * 1.95, d + 0.03] }))
      }
      if (lf === 'baguette') {
        kids.push(box([0.12, 0.07, 0.02], { pos: [0, h * 1.4, d + 0.05], r: 0.015, mat: gold }))
        kids.push(SUB(torus(0.36, 0.025, { axis: 'z', pos: [0, h * 2, 0], mat: leather }), box([1, 0.4, 1], { pos: [0, h * 2 - 0.4, 0] })))
      }
      kids = [U(kids, { rot: [0, -22, 0], pos: [0, 0.02, 0] })]
      camera = lf === 'baguette' ? cam(0.35, 3.4, 0.5, 0.5, 0.6) : cam(0.55, 4.4, 0.5, 0.6, 0.6)
      break
    }
    case 'trunk':
    case 'steamer': {
      const canvasMono = monogram(c1, c2)
      const stand = v.form === 'steamer'
      const size = stand ? [0.55, 0.9, 0.4] : [0.95, 0.42, 0.5]
      const body = { type: 'dielectric', color: c1, rough: 0.5, spec: 0.5 }
      kids.push(box(size, { pos: [0, size[1], 0], r: 0.02, mat: body, decal: { canvas: canvasMono, proj: 'z', w: 3, h: 3, oy: 0 } }))
      const brass = { ...MAT.brass, proc: undefined, rough: 0.2 }
      const trim = MAT.leather('#6a4020', 60)
      for (const sx of [-1, 1]) for (const sy of [0, 1]) for (const sz of [-1, 1]) kids.push(box([0.07, 0.07, 0.07], { pos: [sx * size[0], sy * size[1] * 2, sz * size[2]], r: 0.02, mat: brass }))
      if (!stand) {
        kids.push(box([size[0] + 0.01, 0.03, size[2] + 0.01], { pos: [0, size[1] * 1.3, 0], mat: trim }))
        for (const x of [-0.45, 0.45]) kids.push(box([0.06, size[1] + 0.01, size[2] + 0.01], { pos: [x, size[1], 0], mat: trim }))
        kids.push(box([0.07, 0.08, 0.02], { pos: [0, size[1] * 1.3, size[2] + 0.02], r: 0.015, mat: brass }))
      } else {
        kids.push(box([0.03, size[1], size[2] + 0.01], { pos: [0, size[1], 0], mat: trim }))
        kids.push(box([0.06, 0.08, 0.02], { pos: [0.08, size[1] * 1.1, size[2] + 0.02], r: 0.015, mat: brass }))
      }
      kids = [U(kids, { rot: [0, -25, 0] })]
      camera = stand ? cam(0.9, 5.0, 0.5, 1.0, 0.6) : cam(0.45, 4.6, 0.5, 1.0, 0.9)
      break
    }
    case 'scarf': {
      const print = scarfPrint(c1, c2)
      kids.push(box([0.62, 0.03, 0.62], { pos: [0, 0.2, 0], rot: [0, 18, 0], r: 0.02, mat: { type: 'dielectric', color: c1, rough: 0.35, spec: 0.8 }, decal: { canvas: print, proj: 'y', w: 1.24, h: 1.24 } }))
      kids.push(box([0.66, 0.08, 0.66], { pos: [0, 0.1, 0], rot: [0, 18, 0], r: 0.06, mat: { type: 'dielectric', color: hex(c1, -0.1), rough: 0.35 } }))
      kids.push(box([0.8, 0.02, 0.8], { pos: [0, 0.0, 0], rot: [0, 8, 0], r: 0.01, mat: MAT.paper('#e9731f') }))
      camera = cam(0.15, 3.4, 0.5, 0.8, 1.9)
      break
    }
    case 'jacket': {
      const tweed = MAT.fabric(c1)
      kids.push(SU(0.08, [ell([0.55, 0.75, 0.3], { pos: [0, 1.05, 0], mat: tweed }), capsule([-0.52, 1.55, 0], [-0.7, 0.55, 0.05], 0.14, { mat: tweed }), capsule([0.52, 1.55, 0], [0.7, 0.55, 0.05], 0.14, { mat: tweed })]))
      kids.push(SUB(ell([0.25, 0.3, 0.1], { pos: [0, 1.62, 0.2], mat: MAT.fabric(c2) }), box([0.3, 0.1, 0.3], { pos: [0, 1.4, 0.2] })))
      for (const y of [0.8, 1.0, 1.2]) kids.push(cyl(0.035, 0.015, { axis: 'z', pos: [0.08, y, 0.3], mat: MAT.gold }))
      kids.push(capsule([0, 1.75, 0], [0, 1.95, 0], 0.08, { mat: MAT.velvet('#141414') }))
      kids.push(capsule([0, 0.0, 0], [0, 0.35, 0], 0.03, { mat: MAT.brass }))
      kids.push(cyl(0.35, 0.02, { pos: [0, 0.02, 0], mat: MAT.brass }))
      camera = cam(1.0, 5.0, 0.52, 0.8, 0.5)
      break
    }
    // ------------------------------------------------------------ coins, toys, cards
    case 'coin': {
      const face = coinFace(v.mark === 'owl' ? 'owl' : v.mark === 'liberty' ? 'liberty' : 'head')
      const metal = v.metal === 'steel' ? { ...MAT.silver, rough: 0.18 } : { ...MAT.silver, color: v.mark === 'head' ? '#c9c2b0' : '#dcdcdc', rough: 0.22 }
      const irregular = v.mark === 'head' || v.mark === 'owl'
      const coin = (pos, rot) =>
        irregular
          ? U([extrude(ngon(0.5, 11, 0.3), 0.05, { rr: 0.04, mat: { ...metal, rough: 0.28 }, decal: { canvas: face, proj: 'z', w: 1.05, h: 1.05, bump: 1.1, under: 1 } })], { pos, rot })
          : U([cyl(0.5, 0.045, { axis: 'z', rr: 0.02, mat: { ...metal, rough: 0.2 }, decal: { canvas: face, proj: 'z', w: 1.0, h: 1.0, bump: 1.1, under: 1 } })], { pos, rot })
      kids.push(coin([0.15, 0.47, 0.05], [-62, 0, 10]))
      kids.push(box([0.3, 0.2, 0.02], { pos: [0.15, 0.2, -0.28], rot: [28, 0, 10], mat: { type: 'glass', color: '#eef3f6' } }))
      kids.push(coin([-0.55, 0.06, -0.3], [-90, 0, 0]))
      kids.push(box([1.4, 0.02, 1.0], { pos: [0, 0.0, 0], r: 0.01, mat: MAT.velvet('#1a2440') }))
      camera = cam(0.4, 3.6, 0.46, 0.4, 0.7)
      break
    }
    case 'duckcoin': {
      const face = coinFace('duck')
      kids.push(U([cyl(0.5, 0.05, { axis: 'z', rr: 0.02, mat: { ...MAT.gold, rough: 0.12 }, decal: { canvas: face, proj: 'z', w: 1.0, h: 1.0, bump: 1.1, under: 1 } })], { pos: [0, 0.47, 0.05], rot: [-65, 0, 0] }))
      kids.push(box([0.3, 0.2, 0.02], { pos: [0, 0.2, -0.28], rot: [25, 0, 0], mat: { type: 'glass', color: '#eef3f6' } }))
      kids.push(box([1.2, 0.02, 0.9], { pos: [0, 0.0, 0], r: 0.01, mat: MAT.velvet('#2a1034') }))
      camera = cam(0.4, 3.4, 0.46, 0.4, 0.7)
      break
    }
    case 'bear': {
      const mohair = { type: 'dielectric', color: c1, rough: 0.9, proc: 'velvet', pscale: 60, bump: 1.2, spec: 0.15 }
      kids.push(SU(0.1, [
        ell([0.36, 0.44, 0.3], { pos: [0, 0.62, 0], mat: mohair }),
        sphere(0.3, { pos: [0, 1.2, 0.02], mat: mohair }),
        ell([0.13, 0.1, 0.12], { pos: [0, 1.13, 0.27], mat: MAT.velvet(c2) }),
        capsule([-0.3, 0.8, 0.05], [-0.42, 0.45, 0.2], 0.1, { mat: mohair }),
        capsule([0.3, 0.8, 0.05], [0.42, 0.45, 0.2], 0.1, { mat: mohair }),
        capsule([-0.2, 0.3, 0.05], [-0.25, 0.1, 0.35], 0.12, { mat: mohair }),
        capsule([0.2, 0.3, 0.05], [0.25, 0.1, 0.35], 0.12, { mat: mohair }),
      ]))
      for (const x of [-0.24, 0.24]) kids.push(SU(0.02, [ell([0.11, 0.1, 0.05], { pos: [x, 1.45, 0], mat: mohair })]))
      for (const x of [-0.1, 0.1]) kids.push(sphere(0.035, { pos: [x, 1.26, 0.27], mat: MAT.blackLacquer }))
      kids.push(ell([0.05, 0.035, 0.03], { pos: [0, 1.17, 0.38], mat: MAT.blackLacquer }))
      kids.push(cyl(0.03, 0.01, { axis: 'z', pos: [0.28, 1.45, 0.05], mat: MAT.chrome }))
      kids.push(torus(0.26, 0.03, { pos: [0, 0.95, 0.04], rot: [8, 0, 0], mat: MAT.velvet('#b3202a') }))
      camera = cam(0.8, 4.4, 0.5, 0.8, 0.5)
      break
    }
    case 'cube': {
      const colors = ['#f4f4f4', '#c41e3a', '#0051ba', '#ff5800', '#009e60', '#ffd500']
      const r = rng(id)
      const cub = []
      for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
        cub.push(box([0.15, 0.15, 0.15], { pos: [x * 0.32, y * 0.32, z * 0.32], r: 0.03, mat: MAT.plastic('#111', 0.3) }))
      }
      kids.push(U(cub))
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        kids.push(box([0.12, 0.12, 0.01], { pos: [a * 0.32, b * 0.32, 0.475], r: 0.02, mat: MAT.plastic(colors[Math.floor(r() * 6)], 0.15) }))
        kids.push(box([0.12, 0.01, 0.12], { pos: [a * 0.32, 0.475, b * 0.32], r: 0.02, mat: MAT.plastic(colors[Math.floor(r() * 6)], 0.15) }))
        kids.push(box([0.01, 0.12, 0.12], { pos: [0.475, a * 0.32, b * 0.32], r: 0.02, mat: MAT.plastic(colors[Math.floor(r() * 6)], 0.15) }))
      }
      kids = [U(kids, { pos: [0, 0.55, 0], rot: [0, 35, 0] })]
      camera = cam(0.6, 3.8, 0.5, 0.2, 1.1)
      break
    }
    case 'card': {
      const art = baseballCard()
      kids.push(box([0.42, 0.62, 0.05], { pos: [0, 0.75, 0], rot: [-8, 18, 0], r: 0.03, mat: { type: 'glass', color: '#eef3f6' } }))
      kids.push(box([0.3, 0.46, 0.005], { pos: [0, 0.68, 0], rot: [-8, 18, 0], mat: MAT.paper('#efe6cf'), decal: { canvas: art, proj: 'z', w: 0.6, h: 0.92 } }))
      kids.push(box([0.4, 0.08, 0.02], { pos: [0, 1.25, 0], rot: [-8, 18, 0], mat: MAT.matte('#f4f1ea'), decal: { canvas: labelCanvas(500, 100, [['1909-11 T206 · WAGNER', 0.22, 800], ['AUTHENTIC', 0.18, 600]], { bg: '#f4f1ea', ink: '#1f3f8a' }), proj: 'z', w: 0.8, h: 0.16 } }))
      kids.push(box([0.2, 0.06, 0.12], { pos: [0, 0.06, 0], r: 0.02, mat: MAT.blackLacquer }))
      camera = cam(0.8, 3.8, 0.46, 0.4, 0.4)
      break
    }
    // ------------------------------------------------------------ DuckJackpot lore & specials
    case 'key': {
      const k = v.mark === 'GRAND' ? MAT.gold : { ...MAT.brass, rough: 0.25, proc: 'hammered', pscale: 18, bump: 0.5 }
      const g = U([
        torus(0.26, 0.05, { axis: 'z', mat: k }),
        v.mark === 'GRAND' ? U([ell([0.1, 0.05, 0.03], { pos: [0.26, 0, 0], mat: k })], { polar: 8 }) : null,
        cyl(0.06, 0.72, { axis: 'x', pos: [0.98, 0, 0], rr: 0.02, mat: k }),
        torus(0.06, 0.02, { axis: 'x', pos: [0.35, 0, 0], mat: k }),
        box([0.05, 0.12, 0.025], { pos: [1.55, -0.12, 0], mat: k }),
        box([0.05, 0.08, 0.025], { pos: [1.68, -0.1, 0], mat: k }),
        gem(0.08, 'cab', { axis: 'z', pos: [0, 0, 0.04], mat: MAT.gem(c1) }),
      ], { pos: [-0.75, 0.1, 0.1], rot: [-90, 0, -12], scale: 0.9 })
      kids.push(g)
      kids.push(box([1.5, 0.02, 1.0], { pos: [0, 0.0, 0], r: 0.01, mat: MAT.velvet(v.mark === 'GRAND' ? '#2a1034' : '#141820') }))
      if (v.mark && v.mark !== 'GRAND') kids.push(box([0.2, 0.01, 0.12], { pos: [0.6, 0.03, 0.35], rot: [0, 20, 0], r: 0.02, mat: MAT.paper('#e8dcc0'), decal: { canvas: labelCanvas(300, 180, [[v.mark, 0.34, 800]], { bg: '#e8dcc0' }), proj: 'y', w: 0.4, h: 0.24 } }))
      camera = cam(0.15, 3.4, 0.5, 0.4, 1.9)
      break
    }
    case 'seal': {
      kids.push(U([
        lathe(turned([[0.18, 0], [0.2, 0.05], [0.14, 0.12], [0.12, 0.2]]), { mat: MAT.gold }),
        SU(0.05, [lathe(turned([[0.12, 0.2], [0.09, 0.4], [0.14, 0.7], [0.08, 0.85]]), { mat: MAT.wood(WOOD.ebony, 10) })]),
      ], { pos: [0.4, 0.02, -0.1], rot: [0, 0, 0] }))
      kids.push(SU(0.04, [cyl(0.24, 0.035, { pos: [-0.25, 0.05, 0.15], rr: 0.03, mat: { type: 'dielectric', color: c1, rough: 0.3, spec: 1.2 }, decal: { canvas: crest(), proj: 'y', w: 0.4, h: 0.4, bump: 3, under: 1 } })]))
      kids.push(box([0.7, 0.005, 0.5], { pos: [-0.2, 0.01, 0.1], rot: [0, 10, 0], mat: MAT.paper('#ece0c4'), decal: { canvas: textLines(700, 500, { cols: 1, seed: 'letter', initial: '#3a2c1c' }), proj: 'y', w: 1.4, h: 1.0 } }))
      camera = cam(0.2, 3.2, 0.5, 0.6, 1.5)
      break
    }
    case 'goldbar': {
      const bar = (pos, rot) =>
        INT(
          box([0.5, 0.12, 0.24], { pos, rot, r: 0.02, mat: { ...MAT.gold, rough: 0.1 }, decal: { canvas: barStamp(v.mark || 'DUCK RESERVE'), proj: 'y', w: 0.9, h: 0.42, bump: 2.5, under: 1 } }),
          U([box([0.44, 0.12, 0.2], { pos, rot, r: 0.02 }), box([0.5, 0.06, 0.24], { pos: [pos[0], pos[1] - 0.06, pos[2]], rot })]),
        )
      kids.push(bar([0, 0.12, 0], [0, -15, 0]))
      kids.push(bar([-0.35, 0.36, -0.05], [0, 10, 0]))
      kids.push(bar([0.4, 0.36, 0.05], [0, -25, 0]))
      camera = cam(0.3, 3.6, 0.5, 0.8, 1.2)
      break
    }
    case 'prism': {
      kids.push(extrude(poly([[-0.4, 0], [0.4, 0], [0, 0.7]]), 0.3, { pos: [0, 0.2, 0], mat: { type: 'glass', color: '#dff4ff' } }))
      kids.push(capsule([-2.5, 0.52, 0], [-0.2, 0.52, 0], 0.012, { mat: MAT.lamp('#ff2a2a') }))
      ;['#ff2a2a', '#ff9a2a', '#f2e22a', '#2ad04a', '#2a8aff', '#8a2aff'].forEach((col, i) => kids.push(capsule([0.2, 0.5, 0], [2.4, 0.2 + i * 0.1, 0.1], 0.01, { mat: MAT.lamp(col) })))
      kids.push(cyl(0.5, 0.1, { pos: [0, 0.1, 0], rr: 0.03, mat: MAT.blackLacquer }))
      camera = cam(0.5, 4.2, 0.5, 0.8, 0.9)
      break
    }
    case 'crown': {
      const g = { ...MAT.gold, rough: 0.12 }
      kids.push(SUB(cyl(0.6, 0.16, { pos: [0, 0.35, 0], mat: g }), cyl(0.54, 0.3, { pos: [0, 0.35, 0] })))
      kids.push(torus(0.6, 0.07, { pos: [0, 0.2, 0], mat: { type: 'dielectric', color: '#f4f0e6', rough: 0.95, proc: 'velvet', pscale: 30, bump: 1, spec: 0.2 } }))
      kids.push(U([SUB(torus(0.62, 0.03, { axis: 'z', pos: [0, 0.5, 0], mat: g }), box([1, 0.5, 1], { pos: [0, 0.0, 0] }))], { polarY: 4 }))
      kids.push(ell([0.55, 0.45, 0.55], { pos: [0, 0.55, 0], mat: MAT.velvet('#6a0f1c') }))
      kids.push(U([gem(0.07, 'brilliant', { axis: 'x', pos: [0.61, 0.35, 0], mat: MAT.gem(c1) })], { polarY: 6 }))
      kids.push(U([gem(0.05, 'cab', { axis: 'x', pos: [0.61, 0.35, 0], mat: MAT.gem(c2) })], { polarY: 6, rot: [0, 30, 0] }))
      kids.push(U([sphere(0.03, { pos: [0.6, 0.53, 0], mat: MAT.pearl })], { polarY: 12 }))
      kids.push(sphere(0.1, { pos: [0, 1.15, 0], mat: g }))
      kids.push(U([box([0.02, 0.1, 0.02], { mat: g }), box([0.07, 0.02, 0.02], { pos: [0, 0.03, 0], mat: g })], { pos: [0, 1.3, 0] }))
      kids.push(cyl(0.8, 0.1, { pos: [0, -0.02, 0], rr: 0.05, mat: MAT.velvet('#101a36') }))
      kids = [U(kids, { pos: [0, 0.1, 0] })]
      camera = cam(0.7, 4.0, 0.5, 0.8, 0.9)
      break
    }
    case 'egg': {
      kids.push(SUB(ell([0.46, 0.62, 0.46], { pos: [0, 1.0, 0], mat: MAT.enamel(c1), decal: { canvas: fabergeCanvas(c1), proj: 'sph', spin: 0.1, bump: 0.8 } })))
      kids.push(torus(0.47, 0.02, { pos: [0, 1.0, 0], mat: MAT.gold }))
      kids.push(U([gem(0.03, 'brilliant', { axis: 'x', pos: [0.47, 1.0, 0], mat: MAT.gem('#f4f8fc') })], { polarY: 10 }))
      kids.push(gem(0.07, 'brilliant', { pos: [0, 1.63, 0], mat: MAT.gem('#f4f8fc') }))
      kids.push(lathe(turned([[0.3, 0], [0.32, 0.05], [0.12, 0.12], [0.08, 0.3], [0.22, 0.42]]), { mat: MAT.gold }))
      camera = cam(0.85, 4.2, 0.5, 0.8, 0.5)
      break
    }
    case 'mystery': {
      const lac = { ...MAT.blackLacquer, rough: 0.05 }
      kids.push(box([0.6, 0.35, 0.4], { pos: [0, 0.35, 0], r: 0.04, mat: lac }))
      for (const x of [-0.4, 0.4]) kids.push(box([0.05, 0.36, 0.41], { pos: [x, 0.35, 0], r: 0.02, mat: MAT.gold }))
      kids.push(box([0.61, 0.03, 0.41], { pos: [0, 0.52, 0], mat: MAT.gold }))
      kids.push(cyl(0.12, 0.015, { axis: 'z', pos: [0, 0.35, 0.41], mat: { type: 'dielectric', color: '#8a0f1a', rough: 0.3 }, decal: { canvas: labelCanvas(200, 200, [['?', 0.7, 900]], { bg: 'rgba(0,0,0,0)', ink: '#d4af58', border: false }), proj: 'z', w: 0.24, h: 0.24, bump: 2 } }))
      camera = cam(0.4, 3.8, 0.5, 1.0, 1.0)
      break
    }
    case 'duck': {
      const g = { ...MAT.gold, rough: 0.08 }
      kids.push(box([0.45, 0.12, 0.35], { pos: [0, 0.12, 0], r: 0.02, mat: { type: 'dielectric', color: '#141416', rough: 0.1, proc: 'hammered', pscale: 6, bump: 0.2, spec: 1.2 } }))
      kids.push(SU(0.08, [ell([0.42, 0.26, 0.28], { pos: [0, 0.52, 0], mat: g }), sphere(0.2, { pos: [0.28, 0.9, 0], mat: g }), capsule([0.18, 0.62, 0], [0.26, 0.82, 0], 0.12, { mat: g }), ell([0.14, 0.06, 0.1], { pos: [-0.36, 0.62, 0], rot: [0, 0, 25], mat: g })]))
      kids.push(ell([0.14, 0.04, 0.08], { pos: [0.5, 0.88, 0], mat: g }))
      for (const z of [-0.12, 0.12]) kids.push(sphere(0.03, { pos: [0.36, 0.96, z], mat: MAT.blackLacquer }))
      camera = cam(0.6, 3.8, 0.5, 0.6, 0.7)
      break
    }
    case 'tape': {
      kids.push(box([0.6, 0.1, 0.36], { pos: [0, 0.1, 0], rot: [0, -15, 0], r: 0.015, mat: MAT.plastic('#141416', 0.3) }))
      kids.push(box([0.4, 0.005, 0.12], { pos: [0.02, 0.205, 0.12], rot: [0, -15, 0], mat: MAT.paper('#f2e6c8'), decal: { canvas: labelCanvas(600, 180, [[v.mark || 'CAM 01', 0.3, 800], ['24.09 · 03:14', 0.2, 500]], { bg: '#f2e6c8' }), proj: 'y', w: 0.8, h: 0.24 } }))
      kids.push(box([0.22, 0.005, 0.07], { pos: [0, 0.205, -0.06], rot: [0, -15, 0], mat: { type: 'glass', color: '#6a6f75' } }))
      kids.push(box([0.55, 0.14, 0.33], { pos: [0.3, 0.14, -0.55], rot: [0, 10, 0], r: 0.02, mat: MAT.plastic('#e8e2d2', 0.5) }))
      camera = cam(0.15, 3.2, 0.5, 0.6, 1.7)
      break
    }
    default:
      kids.push(sphere(0.5, { pos: [0, 0.5, 0], mat: MAT.gold }))
  }
  const tone = { velvet: '#2a1216', navy: '#12182a', green: '#121c16', ink: '#15141a', plum: '#1e1224', warm: '#1b1510', wall: '#1d1712', studio: '#16181b' }[v.tone || 'warm']
  return { root: U(kids), camera, wall: tone || '#1b1510', halo: '#3c2c1e', spot: [0, 1.4, 0], floorGloss: 0.16 }
}

// ---------------------------------------------------------------- 2D shapes & textures
function ellipsePoly(rx, ry, cy, cutout) {
  const pts = []
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    let x = Math.cos(a) * rx * (1 - 0.18 * Math.max(0, Math.sin(a)))
    let y = Math.sin(a) * ry + cy
    if (cutout && a > 0.3 && a < 1.2) x *= 0.75
    pts.push([x, y])
  }
  return pts
}
function stratPoly(s = 1) {
  const p = [[0.0, 0.2], [0.12, 0.22], [0.2, 0.34], [0.26, 0.22], [0.3, 0.0], [0.36, -0.3], [0.33, -0.52], [0.18, -0.64], [0.0, -0.66], [-0.18, -0.64], [-0.34, -0.52], [-0.37, -0.28], [-0.3, 0.0], [-0.3, 0.14], [-0.22, 0.26], [-0.12, 0.2]]
  return p.map(([x, y]) => [x * s, y * s])
}
function violinPoly() {
  const pts = []
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2
    const y = Math.sin(t) * 0.55
    const waist = 1 - 0.32 * Math.exp(-Math.pow(y / 0.12, 2))
    const w = (y < 0 ? 0.3 : 0.25) * waist
    pts.push([Math.cos(t) * w, y])
  }
  return pts
}
function netCanvas() {
  return canvas(1024, 512, (c, W, H) => {
    c.fillStyle = '#f8f8fa'
    c.fillRect(0, 0, W, H)
    c.strokeStyle = '#1f3f8a'
    c.lineWidth = 5
    for (let i = -20; i < 40; i++) {
      c.beginPath()
      c.moveTo(i * 40, 0)
      c.lineTo(i * 40 + H, H)
      c.stroke()
      c.beginPath()
      c.moveTo(i * 40, 0)
      c.lineTo(i * 40 - H, H)
      c.stroke()
    }
    c.fillStyle = '#d4af58'
    for (let x = 0; x < W; x += 40) for (let y = 20; y < H; y += 40) c.fillRect(x + ((y / 40) % 2) * 20 - 3, y - 3, 6, 6)
    c.fillStyle = '#d4af58'
    c.fillRect(0, 0, W, 16)
  })
}
function makiE() {
  return canvas(1024, 512, (c, W, H) => {
    c.fillStyle = 'rgba(0,0,0,0)'
    c.clearRect(0, 0, W, H)
    const r = rng('makie')
    c.fillStyle = '#d4af58'
    for (let i = 0; i < 1800; i++) c.fillRect(r() * W, H * 0.6 + r() * H * 0.4 * r(), 2, 2)
    c.strokeStyle = '#e6c46a'
    c.lineWidth = 5
    for (let k = 0; k < 6; k++) {
      c.beginPath()
      let x = r() * W, y = H
      c.moveTo(x, y)
      for (let j = 0; j < 8; j++) {
        x += (r() - 0.4) * 50
        y -= 30 + r() * 20
        c.lineTo(x, y)
      }
      c.stroke()
    }
    c.fillStyle = '#e6c46a'
    for (let k = 0; k < 16; k++) {
      c.beginPath()
      c.ellipse(r() * W, r() * H * 0.6, 14, 6, r() * 3, 0, 7)
      c.fill()
    }
  })
}
function marquetry() {
  return canvas(1024, 512, (c, W, H) => {
    c.clearRect(0, 0, W, H)
    c.strokeStyle = '#d8b27a'
    c.lineWidth = 8
    c.strokeRect(30, 30, W - 60, H - 60)
    c.lineWidth = 3
    c.strokeRect(50, 50, W - 100, H - 100)
    c.fillStyle = '#d8b27a'
    c.beginPath()
    c.ellipse(W / 2, H / 2, W * 0.16, H * 0.18, 0, 0, 7)
    c.fill()
    c.fillStyle = '#6a3a20'
    c.beginPath()
    c.ellipse(W / 2, H / 2, W * 0.13, H * 0.14, 0, 0, 7)
    c.fill()
    c.fillStyle = '#d8b27a'
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      c.beginPath()
      c.ellipse(W / 2 + Math.cos(a) * W * 0.07, H / 2 + Math.sin(a) * H * 0.07, 20, 8, a, 0, 7)
      c.fill()
    }
  })
}
function guilloche() {
  return canvas(512, 512, (c, W) => {
    c.fillStyle = '#808080'
    c.fillRect(0, 0, W, W)
    c.strokeStyle = '#ffffff'
    c.lineWidth = 2
    for (let i = 0; i < 60; i++) {
      c.beginPath()
      for (let a = 0; a <= 360; a += 3) {
        const t = (a * Math.PI) / 180
        const r = 20 + i * 4 + Math.sin(t * 12) * 5
        c.lineTo(W / 2 + Math.cos(t) * r, W / 2 + Math.sin(t) * r * 0.7)
      }
      c.stroke()
    }
  })
}
function chronoDial() {
  return canvas(512, 512, (c, W) => {
    const R = W / 2
    c.fillStyle = '#f4efe2'
    c.fillRect(0, 0, W, W)
    c.translate(R, R)
    c.fillStyle = '#222'
    c.font = `${R * 0.14}px Georgia`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const n = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
    n.forEach((t, i) => {
      const a = (i / 12) * Math.PI * 2
      c.fillText(t, Math.sin(a) * R * 0.78, -Math.cos(a) * R * 0.78)
    })
    c.beginPath()
    c.arc(0, R * 0.38, R * 0.2, 0, 7)
    c.stroke()
    c.lineWidth = 8
    c.strokeStyle = '#1f3f9a'
    c.beginPath()
    c.moveTo(0, 0)
    c.lineTo(-R * 0.35, -R * 0.3)
    c.moveTo(0, 0)
    c.lineTo(R * 0.2, -R * 0.62)
    c.stroke()
    c.font = `${R * 0.07}px Georgia`
    c.fillText('MARINE CHRONOMETER', 0, -R * 0.35)
  })
}
function scaleRing() {
  return canvas(1024, 128, (c, W, H) => {
    c.fillStyle = '#c9a44a'
    c.fillRect(0, 0, W, H)
    c.strokeStyle = '#3a2a10'
    for (let i = 0; i < 180; i++) {
      c.lineWidth = i % 10 ? 1 : 2.5
      c.beginPath()
      c.moveTo((i / 180) * W, 0)
      c.lineTo((i / 180) * W, i % 10 ? H * 0.3 : H * 0.55)
      c.stroke()
    }
  })
}
function checker() {
  return canvas(512, 512, (c, W) => {
    c.fillStyle = '#4a2e1a'
    c.fillRect(0, 0, W, W)
    const s = (W * 0.9) / 8
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      c.fillStyle = (i + j) % 2 ? '#2a1a10' : '#d8b27a'
      c.fillRect(W * 0.05 + i * s, W * 0.05 + j * s, s, s)
    }
  })
}
function bookCover(v, id) {
  return canvas(530, 730, (c, W, H) => {
    c.clearRect(0, 0, W, H)
    const gold = v.c2 || '#d4af58'
    c.strokeStyle = gold
    c.fillStyle = gold
    c.lineWidth = 6
    c.strokeRect(30, 30, W - 60, H - 60)
    c.lineWidth = 2
    c.strokeRect(46, 46, W - 92, H - 92)
    c.textAlign = 'center'
    c.font = 'bold 44px Georgia'
    const titles = { book_gatsby: 'THE GREAT GATSBY', book_hobbit: 'THE HOBBIT', book_potter: 'THE PHILOSOPHER’S STONE', book_atlas: 'ATLAS', book_victorian_illust: 'FAIRY TALES', book_verne: 'VOYAGES EXTRAORDINAIRES', book_doyle: 'A STUDY IN SCARLET', book_russian_classic: 'СОЧИНЕНІЯ' }
    const t = titles[id] || ''
    const words = t.split(' ')
    const lines = []
    let line = ''
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 12) {
        lines.push(line.trim())
        line = w
      } else line += ' ' + w
    }
    lines.push(line.trim())
    lines.forEach((l, i) => c.fillText(l, W / 2, 130 + i * 52))
    const cx = W / 2, cy = H * 0.62
    c.lineWidth = 5
    const mk = v.mark
    if (mk === 'eyes') {
      c.beginPath()
      c.ellipse(cx - 80, cy - 40, 60, 24, 0, 0, 7)
      c.ellipse(cx + 80, cy - 40, 60, 24, 0, 0, 7)
      c.stroke()
      c.beginPath()
      c.arc(cx - 80, cy - 40, 12, 0, 7)
      c.arc(cx + 80, cy - 40, 12, 0, 7)
      c.fill()
      for (let i = 0; i < 9; i++) c.fillRect(cx - 170 + i * 40, cy + 40 + (i % 3) * 14, 18, 90 - (i % 3) * 14)
    } else if (mk === 'mountain') {
      c.beginPath()
      c.moveTo(cx - 180, cy + 90)
      c.lineTo(cx - 90, cy - 40)
      c.lineTo(cx - 30, cy + 20)
      c.lineTo(cx + 50, cy - 90)
      c.lineTo(cx + 180, cy + 90)
      c.closePath()
      c.stroke()
      c.beginPath()
      c.arc(cx + 110, cy - 110, 26, 0, 7)
      c.fill()
    } else if (mk === 'bolt') {
      c.beginPath()
      c.moveTo(cx + 10, cy - 120)
      c.lineTo(cx - 50, cy + 10)
      c.lineTo(cx + 5, cy + 10)
      c.lineTo(cx - 30, cy + 120)
      c.stroke()
    } else if (mk === 'globe') {
      c.beginPath()
      c.arc(cx, cy, 110, 0, 7)
      c.ellipse(cx, cy, 45, 110, 0, 0, 7)
      c.moveTo(cx - 110, cy)
      c.lineTo(cx + 110, cy)
      c.stroke()
    } else if (mk === 'gear') {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        c.fillRect(cx + Math.cos(a) * 90 - 14, cy + Math.sin(a) * 90 - 14, 28, 28)
      }
      c.beginPath()
      c.arc(cx, cy, 85, 0, 7)
      c.stroke()
      c.beginPath()
      c.arc(cx, cy, 30, 0, 7)
      c.stroke()
    } else if (mk === 'bands') {
      for (const y of [cy - 150, cy - 110, cy + 110, cy + 150]) c.fillRect(70, y, W - 140, 10)
      c.strokeRect(cx - 120, cy - 70, 240, 140)
      c.font = 'bold 34px Georgia'
      c.fillText('ТОМЪ I', cx, cy + 12)
    } else if (mk === 'pipe') {
      c.beginPath()
      c.moveTo(cx - 90, cy - 60)
      c.lineTo(cx - 90, cy + 20)
      c.quadraticCurveTo(cx - 90, cy + 70, cx - 20, cy + 70)
      c.lineTo(cx + 110, cy - 40)
      c.stroke()
    } else {
      for (let i = 0; i < 4; i++) {
        c.save()
        c.translate(cx, cy)
        c.rotate((i * Math.PI) / 2)
        c.beginPath()
        c.moveTo(0, -30)
        c.quadraticCurveTo(60, -100, 0, -150)
        c.quadraticCurveTo(-60, -100, 0, -30)
        c.stroke()
        c.restore()
      }
      c.beginPath()
      c.arc(cx, cy, 26, 0, 7)
      c.fill()
    }
  })
}
function photoCard() {
  return canvas(320, 400, (c, W, H) => {
    c.fillStyle = '#f4f2ec'
    c.fillRect(0, 0, W, H)
    const g = c.createLinearGradient(0, 20, 0, 300)
    g.addColorStop(0, '#6a8aa8')
    g.addColorStop(1, '#d9b88a')
    c.fillStyle = g
    c.fillRect(20, 20, W - 40, 280)
    c.fillStyle = '#3a2a1a'
    c.beginPath()
    c.arc(W / 2, 200, 50, 0, 7)
    c.fill()
    c.fillRect(W / 2 - 60, 230, 120, 70)
  })
}
function macScreen() {
  return canvas(512, 390, (c, W, H) => {
    c.fillStyle = '#c9d2c2'
    c.fillRect(0, 0, W, H)
    c.fillStyle = '#1c1c1c'
    c.fillRect(0, 0, W, 22)
    c.fillStyle = '#c9d2c2'
    c.font = 'bold 14px monospace'
    c.fillText('  File  Edit  View  Special', 10, 16)
    c.strokeStyle = '#1c1c1c'
    c.lineWidth = 6
    c.strokeRect(W / 2 - 60, H / 2 - 70, 120, 140)
    c.beginPath()
    c.arc(W / 2 - 25, H / 2 - 20, 6, 0, 7)
    c.arc(W / 2 + 25, H / 2 - 20, 6, 0, 7)
    c.fillStyle = '#1c1c1c'
    c.fill()
    c.beginPath()
    c.arc(W / 2, H / 2 + 10, 30, 0.2, Math.PI - 0.2)
    c.stroke()
    const g = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.35)')
    c.fillStyle = g
    c.fillRect(0, 0, W, H)
  })
}
function walkmanFace() {
  return canvas(400, 550, (c, W, H) => {
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#c9ccd2'
    c.fillRect(0, 0, W, 90)
    c.fillStyle = '#1a1a1e'
    c.fillRect(50, 140, W - 100, 230)
    c.fillStyle = '#6a4a3a'
    c.fillRect(90, 200, W - 180, 110)
    c.fillStyle = '#e8e8e8'
    for (const x of [140, 260]) {
      c.beginPath()
      c.arc(x, 255, 34, 0, 7)
      c.fill()
    }
    c.fillStyle = '#c9ccd2'
    for (let i = 0; i < 5; i++) c.fillRect(40 + i * 66, 420, 54, 60)
    c.fillStyle = '#1a1a1e'
    c.font = 'bold 26px Helvetica'
    c.fillText('STEREO', 50, 60)
  })
}
function gameboyFace() {
  return canvas(400, 660, (c, W, H) => {
    c.clearRect(0, 0, W, H)
    c.fillStyle = '#5a5a6a'
    c.fillRect(30, 40, W - 60, 280)
    c.fillStyle = '#9bbc0f'
    c.fillRect(80, 70, W - 160, 210)
    c.fillStyle = '#306230'
    for (const [x, y] of [[150, 200], [170, 200], [170, 180], [190, 180], [120, 240], [140, 240], [160, 240], [180, 240], [200, 240], [220, 240]]) c.fillRect(x, y, 18, 18)
    c.fillStyle = '#8a8a9a'
    c.font = 'italic bold 22px Helvetica'
    c.fillText('DOT MATRIX WITH STEREO SOUND', 36, 34)
    c.fillStyle = '#1f3f8a'
    c.font = 'italic bold 30px Helvetica'
    c.fillText('POCKET CONSOLE', 70, 370)
  })
}
function ribbed() {
  return canvas(512, 200, (c, W, H) => {
    for (let x = 0; x < W; x += 12) {
      c.fillStyle = (x / 12) % 2 ? '#ffffff' : '#404040'
      c.fillRect(x, 0, 12, H)
    }
  })
}
function recordCanvas(label) {
  return canvas(512, 512, (c, W) => {
    const R = W / 2
    c.fillStyle = '#0c0c0e'
    c.fillRect(0, 0, W, W)
    for (let r = R * 0.35; r < R; r += 2.2) {
      c.strokeStyle = `rgba(255,255,255,${0.03 + (Math.sin(r) + 1) * 0.02})`
      c.beginPath()
      c.arc(R, R, r, 0, 7)
      c.stroke()
    }
    c.fillStyle = label
    c.beginPath()
    c.arc(R, R, R * 0.32, 0, 7)
    c.fill()
    c.fillStyle = '#f4f1ea'
    c.font = `bold ${R * 0.06}px Helvetica`
    c.textAlign = 'center'
    c.fillText('33⅓', R, R + R * 0.18)
    c.fillStyle = '#111'
    c.beginPath()
    c.arc(R, R, R * 0.03, 0, 7)
    c.fill()
  })
}
function strobe() {
  return canvas(1024, 64, (c, W, H) => {
    c.fillStyle = '#9aa0a6'
    c.fillRect(0, 0, W, H)
    c.fillStyle = '#2a2a2e'
    for (let x = 0; x < W; x += 8) c.fillRect(x, 0, 4, H * 0.4)
  })
}
function dialScale() {
  return canvas(512, 170, (c, W, H) => {
    c.fillStyle = '#e8e2d2'
    c.fillRect(0, 0, W, H)
    c.fillStyle = '#222'
    c.font = '18px Helvetica'
    ;['LW', 'MW', 'KW', 'UKW'].forEach((t, i) => c.fillText(t, 10, 30 + i * 36))
    for (let i = 0; i < 40; i++) c.fillRect(70 + i * 11, 20, 2, i % 5 ? 18 : 30)
    c.fillStyle = '#b3202a'
    c.fillRect(260, 10, 4, H - 20)
  })
}
function sleeveArt(c1, c2) {
  return canvas(650, 650, (c, W) => {
    c.fillStyle = c2
    c.fillRect(0, 0, W, W)
    c.fillStyle = c1
    c.beginPath()
    c.arc(W * 0.4, W * 0.45, W * 0.3, 0, 7)
    c.fill()
    c.fillStyle = '#f4f1ea'
    c.font = 'bold 50px Helvetica'
    c.fillText('FIRST PRESS', 40, W - 60)
    c.fillStyle = 'rgba(0,0,0,0.25)'
    c.fillRect(0, 0, W, 16)
  })
}
function monogram(c1, c2) {
  return canvas(1024, 1024, (c, W) => {
    c.fillStyle = c1
    c.fillRect(0, 0, W, W)
    c.fillStyle = c2
    c.globalAlpha = 0.75
    const s = 64
    for (let y = 0; y < W; y += s) for (let x = 0; x < W; x += s) {
      const off = ((y / s) % 2) * (s / 2)
      const cx = x + off + s / 4, cy = y + s / 2
      if ((x / s + y / s) % 2) {
        c.beginPath()
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4
          c.lineTo(cx + Math.cos(a) * (i % 2 ? 6 : 14), cy + Math.sin(a) * (i % 2 ? 6 : 14))
        }
        c.fill()
      } else {
        c.beginPath()
        c.arc(cx, cy, 11, 0, 7)
        c.fill()
      }
    }
    c.globalAlpha = 1
  })
}
function scarfPrint(c1, c2) {
  return canvas(1024, 1024, (c, W) => {
    c.fillStyle = c1
    c.fillRect(0, 0, W, W)
    c.strokeStyle = c2
    c.lineWidth = 16
    c.strokeRect(40, 40, W - 80, W - 80)
    c.lineWidth = 4
    c.strokeRect(80, 80, W - 160, W - 160)
    c.fillStyle = c2
    for (let i = 0; i < 12; i++) {
      c.save()
      c.translate(W / 2, W / 2)
      c.rotate((i / 12) * Math.PI * 2)
      c.beginPath()
      c.ellipse(0, -250, 40, 110, 0, 0, 7)
      c.fill()
      c.restore()
    }
    c.fillStyle = hex(c1, -0.35)
    c.beginPath()
    c.arc(W / 2, W / 2, 150, 0, 7)
    c.fill()
    c.fillStyle = c2
    c.beginPath()
    c.ellipse(W / 2, W / 2 + 10, 70, 90, 0, 0, 7)
    c.fill()
    c.beginPath()
    c.ellipse(W / 2 + 40, W / 2 - 80, 30, 40, 0.5, 0, 7)
    c.fill()
  })
}
function baseballCard() {
  return canvas(300, 460, (c, W, H) => {
    c.fillStyle = '#efe6cf'
    c.fillRect(0, 0, W, H)
    const g = c.createLinearGradient(0, 30, 0, 380)
    g.addColorStop(0, '#6a8a6a')
    g.addColorStop(1, '#8a9a7a')
    c.fillStyle = g
    c.fillRect(20, 20, W - 40, H - 90)
    c.fillStyle = '#3a4a6a'
    c.beginPath()
    c.moveTo(40, H - 70)
    c.quadraticCurveTo(W / 2, 200, W - 40, H - 70)
    c.fill()
    c.fillStyle = '#e0b48a'
    c.beginPath()
    c.ellipse(W / 2, 160, 48, 60, 0, 0, 7)
    c.fill()
    c.fillStyle = '#3a4a6a'
    c.beginPath()
    c.ellipse(W / 2, 112, 55, 26, 0, Math.PI, 0)
    c.fill()
    c.fillStyle = '#2a1c10'
    c.font = 'bold 26px Georgia'
    c.textAlign = 'center'
    c.fillText('WAGNER', W / 2, H - 42)
    c.font = '18px Georgia'
    c.fillText('PITTSBURG', W / 2, H - 18)
  })
}
function crest() {
  return canvas(256, 256, (c, W) => {
    c.fillStyle = '#707070'
    c.fillRect(0, 0, W, W)
    c.fillStyle = '#ffffff'
    c.strokeStyle = '#ffffff'
    c.lineWidth = 8
    c.beginPath()
    c.arc(W / 2, W / 2, W * 0.4, 0, 7)
    c.stroke()
    c.beginPath()
    c.moveTo(W * 0.3, W * 0.62)
    c.lineTo(W * 0.3, W * 0.42)
    c.lineTo(W / 2, W * 0.28)
    c.lineTo(W * 0.7, W * 0.42)
    c.lineTo(W * 0.7, W * 0.62)
    c.closePath()
    c.fill()
  })
}
function barStamp(text) {
  return canvas(900, 420, (c, W, H) => {
    c.fillStyle = '#808080'
    c.fillRect(0, 0, W, H)
    c.strokeStyle = '#ffffff'
    c.lineWidth = 8
    c.strokeRect(80, 60, W - 160, H - 120)
    c.fillStyle = '#ffffff'
    c.font = 'bold 64px Helvetica'
    c.textAlign = 'center'
    c.fillText(text, W / 2, H / 2 - 10)
    c.font = 'bold 48px Helvetica'
    c.fillText('999.9 · 1 KG', W / 2, H / 2 + 60)
  })
}
function fabergeCanvas(c1) {
  return canvas(1024, 512, (c, W, H) => {
    c.fillStyle = c1
    c.fillRect(0, 0, W, H)
    c.strokeStyle = 'rgba(255,255,255,0.18)'
    for (let x = 0; x < W; x += 6) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x + 40, H)
      c.stroke()
    }
    c.strokeStyle = '#e8c46a'
    c.lineWidth = 8
    for (let x = 0; x < W; x += 128) {
      c.beginPath()
      c.moveTo(x, 0)
      c.lineTo(x + 128, H)
      c.moveTo(x + 128, 0)
      c.lineTo(x, H)
      c.stroke()
    }
    c.fillStyle = '#f4f8fc'
    for (let x = 0; x < W; x += 128) for (let y = 0; y < H; y += 128) {
      c.beginPath()
      c.arc(x + 64, y + 64, 8, 0, 7)
      c.fill()
    }
  })
}

function decoDial() {
  return canvas(512, 512, (c, W) => {
    const R = W / 2
    c.fillStyle = '#f4efe2'
    c.fillRect(0, 0, W, W)
    c.translate(R, R)
    c.fillStyle = '#111'
    c.font = `bold ${R * 0.2}px Helvetica`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    ;['12', '3', '6', '9'].forEach((t, i) => {
      const a = (i / 4) * Math.PI * 2
      c.fillText(t, Math.sin(a) * R * 0.72, -Math.cos(a) * R * 0.72)
    })
    for (let i = 0; i < 12; i++) {
      if (i % 3 === 0) continue
      const a = (i / 12) * Math.PI * 2
      c.fillRect(Math.sin(a) * R * 0.75 - 6, -Math.cos(a) * R * 0.75 - 6, 12, 12)
    }
    c.lineWidth = 12
    c.strokeStyle = '#111'
    c.beginPath()
    c.moveTo(0, 0)
    c.lineTo(-R * 0.35, -R * 0.3)
    c.moveTo(0, 0)
    c.lineTo(R * 0.18, -R * 0.6)
    c.stroke()
  })
}

function sunburst(c1) {
  return canvas(512, 640, (c, W, H) => {
    const g = c.createRadialGradient(W / 2, H * 0.62, 20, W / 2, H * 0.6, W * 0.62)
    g.addColorStop(0, hex(c1, 0.35))
    g.addColorStop(0.55, c1)
    g.addColorStop(1, hex(c1, -0.75))
    c.fillStyle = g
    c.fillRect(0, 0, W, H)
    c.globalAlpha = 0.08
    for (let y = 0; y < H; y += 3) {
      c.fillStyle = y % 6 ? '#000' : '#fff'
      c.fillRect(0, y + Math.sin(y * 0.05) * 3, W, 2)
    }
    c.globalAlpha = 1
  })
}
function fHoles() {
  return canvas(360, 480, (c, W, H) => {
    c.clearRect(0, 0, W, H)
    c.strokeStyle = '#140a04'
    c.lineWidth = 7
    for (const s of [-1, 1]) {
      const x = W / 2 + s * 62
      c.beginPath()
      c.moveTo(x - s * 6, H * 0.36)
      c.bezierCurveTo(x + s * 14, H * 0.44, x - s * 14, H * 0.54, x + s * 6, H * 0.62)
      c.stroke()
      c.fillStyle = '#140a04'
      c.beginPath()
      c.arc(x - s * 6, H * 0.36, 6, 0, 7)
      c.arc(x + s * 6, H * 0.62, 6, 0, 7)
      c.fill()
    }
  })
}

function stitching(c1, form) {
  return canvas(512, 512, (c, W, H) => {
    c.clearRect(0, 0, W, H)
    const light = parseInt(c1.replace('#', '').slice(0, 2), 16) < 90
    c.strokeStyle = light ? '#e8dcc0' : '#3a2410'
    c.lineWidth = 3
    c.setLineDash([9, 6])
    c.strokeRect(34, 34, W - 68, H - 68)
    c.beginPath()
    c.moveTo(40, H * 0.52)
    c.lineTo(W - 40, H * 0.52)
    c.stroke()
    c.setLineDash([])
    if (form === 'baguette') {
      c.fillStyle = light ? 'rgba(232,220,192,0.6)' : 'rgba(40,24,8,0.6)'
      for (let y = 60; y < H - 40; y += 40) for (let x = 60 + ((y / 40) % 2) * 20; x < W - 40; x += 40) {
        c.fillRect(x, y, 14, 4)
        c.fillRect(x + 5, y - 5, 4, 14)
      }
    }
  })
}

function decoGlass() {
  return canvas(1024, 256, (c, W, H) => {
    c.fillStyle = '#f2d8a0'
    c.fillRect(0, 0, W, H)
    c.strokeStyle = '#8a6a3a'
    c.lineWidth = 5
    for (let x = 0; x < W; x += 64) {
      c.beginPath()
      c.moveTo(x, H)
      c.lineTo(x + 32, 0)
      c.lineTo(x + 64, H)
      c.stroke()
    }
    c.fillStyle = 'rgba(255,240,200,0.5)'
    c.fillRect(0, H * 0.45, W, 10)
  })
}
