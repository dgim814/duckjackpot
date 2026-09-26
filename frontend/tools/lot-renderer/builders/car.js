import { SHAPES } from '/src/heist/economy/art/car.tsx'
import { MAT, U, SU, SUB, INT, box, canvas, capsule, cyl, ell, extrude, poly, pathPoints } from '../dsl.js'

/**
 * Collector cars, shot like a studio catalogue photo: a sculpted body (rounded core,
 * fender bulges and cabin blended smoothly, then cut by the lot's own side profile),
 * clear-coated paint, glasshouse, chrome, brakes behind the rims, long-lens camera.
 */
const S = 1 / 52
const SPORTY = new Set(['hyper', 'f40', 'wedge', 'miura', 'racer'])
const CLASSIC = new Set(['gt60', 'gull', 'prewar', 'atlantic', 'veteran', 'roadster', 'etype', 'sedan', 'beetle', 'fiat500', 'mini', 'cv2', 'ds'])

function toXY(pts) {
  return pts.map(([x, y]) => [(x - 160) * S, (138 - y) * S])
}

function numberDecal(n) {
  return canvas(256, 256, (c, W) => {
    c.fillStyle = '#f4f1ea'
    c.beginPath()
    c.arc(W / 2, W / 2, W * 0.46, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#111'
    c.font = `900 ${n.length > 2 ? 90 : 140}px Helvetica, Arial`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(n, W / 2, W / 2 + 8)
  })
}

export function buildCar(v) {
  const sh = SHAPES[v.body]
  const prof = toXY(pathPoints(sh.d, 6))
  const glass = toXY(pathPoints(sh.glass, 6))
  const xs = prof.map((p) => p[0])
  const L = (Math.max(...xs) - Math.min(...xs)) / 2
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2
  const narrow = ['fiat500', 'mini', 'cv2', 'beetle', 'veteran'].includes(v.body)
  const W = narrow ? 0.62 : v.body === 'hyper' || v.body === 'wedge' || v.body === 'f40' || v.body === 'miura' ? 0.86 : 0.78
  const ys = prof.map((p) => p[1])
  const top = Math.max(...ys)
  const belt = Math.min(...glass.map((p) => p[1]))
  const paint = MAT.paint(v.color, 0.05)
  const glassMat = { type: 'dielectric', color: '#020305', rough: 0.01, spec: 1.3 }
  const open = v.body === 'roadster' || v.body === 'veteran'
  const cutY = open ? top - 0.02 : belt
  const plan = () => extrude({ k: 'ellipse', rx: L * 1.05, ry: W * 1.6 }, 3, { axis: 'y', pos: [cx, 0, 0] })
  const r0 = sh.r * S
  const gxs = glass.map((p) => p[0])
  const upperXs = prof.filter((p) => p[1] > cutY + 0.03).map((p) => p[0])
  const gx0 = Math.max(Math.min(...gxs) - 0.26, upperXs.length ? Math.min(...upperXs) : -9)
  const gx1 = Math.min(Math.max(...gxs) + 0.4, upperXs.length ? Math.max(...upperXs) : 9)
  const Wc = W * (narrow ? 0.86 : 0.72)
  // Sculpted volume: a rounded core, a fender bulge over every wheel and a rounded cabin,
  // blended smoothly; the car's own side profile then cuts the exact silhouette.
  const volume = (mat) =>
    SU(0.2, [
      box([L * 0.98, (cutY - 0.17) / 2 + 0.03, W * 0.9], { pos: [cx, (cutY + 0.17) / 2, 0], r: 0.2, mat }),
      ...sh.wheels.flatMap((wx) =>
        [-1, 1].map((z) => ell([r0 + 0.3, r0 + 0.14, 0.3], { pos: [(wx - 160) * S, r0 + 0.08, z * (W - 0.24)], mat })),
      ),
      open ? null : box([(gx1 - gx0) / 2 + 0.05, (top - cutY) / 2 + 0.12, Wc], { pos: [(gx0 + gx1) / 2, (top + cutY) / 2, 0], r: 0.26, mat }),
    ])
  // smooth intersection: silhouette edges roll over like pressed metal instead of a hard crease
  const bodyShape = (mat) => ({ op: 'i', k: 0.09, kids: [volume(mat), extrude(poly(prof), 3), plan()] })
  const arches = sh.wheels.map((wx) => cyl(r0 + 0.07, 2, { axis: 'z', pos: [(wx - 160) * S, r0, 0] }))
  const gx = gxs
  const doorFront = Math.min(...gx) + 0.05
  const doorRear = cx + (Math.max(...gx) - cx) * 0.55
  const grooves = open ? [] : [doorFront, doorRear].map((x) => box([0.008, (cutY - 0.3) / 2, W + 0.3], { pos: [x, (cutY + 0.3) / 2, 0] }))
  // glasshouse: above the beltline between windscreen base and rear screen, minus roof panel and B-pillar
  const pillarX = cx + (Math.max(...gx) - cx) * 0.2
  const glassZone = open
    ? null
    : SUB(
        box([(gx1 - gx0) / 2, 0.8, 3], { pos: [(gx0 + gx1) / 2, cutY + 0.8, 0] }),
        box([2, 0.06, 3], { pos: [(gx0 + gx1) / 2, top - 0.02, 0] }),
        box([0.035, 1, 3], { pos: [pillarX, cutY + 0.5, 0] }),
      )
  const kids = []
  kids.push(SUB(bodyShape(paint), ...arches, ...grooves, ...(glassZone ? [glassZone] : [])))
  if (glassZone) kids.push(SUB(INT(bodyShape(glassMat), glassZone), ...arches))
  if (open) {
    // cockpit: windscreen frame and low seats
    const ws = prof.reduce((a, p) => (p[1] > cutY - 0.1 && p[0] < a ? p[0] : a), 9)
    kids.push(box([0.02, 0.14, Wc * 0.9], { pos: [ws + 0.35, cutY + 0.12, 0], rot: [0, 0, -25], r: 0.01, mat: { type: 'glass', color: '#cfd8de' } }))
    for (const z of [-0.3, 0.3]) kids.push(box([0.14, 0.12, 0.18], { pos: [cx + 0.3, cutY - 0.04, z * W], r: 0.06, mat: MAT.leather('#2a1810', 60) }))
  }
  if (v.accent && v.body !== 'prewar' && v.body !== 'veteran') kids.push(SUB(INT(bodyShape(MAT.paint(v.accent, 0.05)), box([4, 0.13, 2], { pos: [0, 0.3, 0] })), ...arches))
  if (v.stripe) {
    for (const z of [-0.14, 0.14]) kids.push(SUB(INT(bodyShape(MAT.paint(v.stripe, 0.05)), box([4, 3, 0.07], { pos: [0, 0, z] })), ...arches, ...(glassZone ? [glassZone] : [])))
  }
  // fenders for pre-war cars
  if (v.body === 'prewar' || v.body === 'veteran') {
    for (const wx of sh.wheels) {
      const x = (wx - 160) * S
      for (const z of [-1, 1]) kids.push(SUB(ell([sh.r * S + 0.22, sh.r * S + 0.1, 0.2], { pos: [x, sh.r * S + 0.02, z * (W + 0.02)], mat: MAT.paint(v.accent || '#141414', 0.05) }), box([1, 1, 1], { pos: [x, sh.r * S - 0.55, z * (W + 0.02)] })))
    }
    // running boards: only between the wings, painted edge with a rubber tread on top
    const wxs = sh.wheels.map((wx) => (wx - 160) * S)
    const b0 = Math.min(...wxs) + sh.r * S + 0.12, b1 = Math.max(...wxs) - sh.r * S - 0.12
    for (const z of [-1, 1]) {
      kids.push(box([(b1 - b0) / 2, 0.035, 0.12], { pos: [(b0 + b1) / 2, 0.36, z * (W + 0.08)], r: 0.025, mat: MAT.paint(v.accent || '#141414', 0.05) }))
      kids.push(box([(b1 - b0) / 2 - 0.02, 0.008, 0.1], { pos: [(b0 + b1) / 2, 0.397, z * (W + 0.08)], mat: { ...MAT.rubber, color: '#101012', rough: 0.8 } }))
    }
  }
  // wheels
  const wheelStyle = v.wheels || (v.body === 'prewar' || v.body === 'atlantic' ? 'wire' : v.body === 'veteran' ? 'spoke' : 'alloy')
  for (const wx of sh.wheels) {
    const x = (wx - 160) * S
    const r = sh.r * S
    for (const z of [-1, 1]) {
      const zz = z * (W - 0.1)
      kids.push(cyl(r, 0.14, { axis: 'z', pos: [x, r, zz], rr: r * 0.32, mat: { ...MAT.rubber, color: '#141416', rough: 0.62 } }))
      const rim = r * (wheelStyle === 'spoke' ? 0.82 : 0.66)
      const face = zz + z * 0.14
      if (!CLASSIC.has(v.body)) {
        kids.push(cyl(rim * 0.72, 0.012, { axis: 'z', pos: [x, r, zz + z * 0.07], mat: { type: 'metal', color: '#7a7e84', rough: 0.35, proc: 'brushed', pscale: 80 } }))
        kids.push(box([0.07, 0.1, 0.035], { pos: [x + rim * 0.45, r + rim * 0.35, zz + z * 0.085], rot: [0, 0, -35], r: 0.02, mat: MAT.paint(SPORTY.has(v.body) ? '#c8161d' : '#2a2a2e', 0.2) }))
      }
      // rim barrel (dark), spokes / disc on the outer face, chrome lip and hub
      kids.push(cyl(rim, 0.13, { axis: 'z', pos: [x, r, zz], mat: { type: 'metal', color: '#3a3d42', rough: 0.4 } }))
      kids.push(SUB(cyl(rim + 0.015, 0.02, { axis: 'z', pos: [x, r, face], rr: 0.01, mat: MAT.chrome }), cyl(rim - 0.03, 0.1, { axis: 'z', pos: [x, r, face] })))
      if (wheelStyle === 'wire') kids.push(U([capsule([0, 0, 0], [rim, 0, 0], 0.007, { mat: MAT.chrome })], { pos: [x, r, face - z * 0.02], polar: 30 }))
      else if (wheelStyle === 'spoke') kids.push(U([box([rim / 2, 0.028, 0.03], { pos: [rim / 2, 0, 0], mat: MAT.wood('#8a5a30', 8) })], { pos: [x, r, face - z * 0.02], polar: 12 }))
      else if (wheelStyle === 'steel') kids.push(cyl(rim * 0.97, 0.03, { axis: 'z', pos: [x, r, face - z * 0.02], rr: 0.025, mat: MAT.paint(v.color === '#141414' ? '#d9d9d9' : '#ecebe6', 0.1) }))
      else kids.push(U([box([rim * 0.46, 0.05, 0.025], { pos: [rim * 0.5, 0, 0], r: 0.018, mat: { ...MAT.polished, color: '#c9ced4' } })], { pos: [x, r, face - z * 0.01], polar: v.body === 'hyper' || v.body === 'f40' ? 10 : 5 }))
      kids.push(cyl(rim * 0.2, 0.03, { axis: 'z', pos: [x, r, face], rr: 0.02, mat: MAT.chrome }))
      if (!CLASSIC.has(v.body)) kids.push(cyl(rim * 0.62, 0.02, { axis: 'z', pos: [x, r, zz + z * 0.06], mat: { type: 'metal', color: '#8a8e94', rough: 0.3, proc: 'hammered', pscale: 30 } }))
    }
  }
  // lights, grille, bumpers
  const front = Math.min(...xs), rear = Math.max(...xs)
  const frontY = prof.reduce((a, p) => (p[0] < front + 0.35 ? Math.max(a, p[1]) : a), 0)
  const rearY = prof.reduce((a, p) => (p[0] > rear - 0.35 ? Math.max(a, p[1]) : a), 0)
  for (const z of [-1, 1]) {
    kids.push(ell([0.1, 0.07, 0.13], { pos: [front + 0.1, Math.max(0.45, frontY - 0.12), z * W * 0.62], mat: { type: 'glass', color: '#fff6dc' } }))
    kids.push(ell([0.08, 0.055, 0.1], { pos: [front + 0.1, Math.max(0.45, frontY - 0.12), z * W * 0.62], mat: MAT.lamp('#fff3d8') }))
    kids.push(ell([0.06, 0.05, 0.14], { pos: [rear - 0.05, Math.max(0.45, rearY - 0.1), z * W * 0.62], mat: MAT.lamp('#c0101a') }))
  }
  kids.push(box([0.05, 0.08, W * 0.38], { pos: [front + 0.03, Math.max(0.36, frontY - 0.24), 0], r: 0.03, mat: MAT.blackMetal }))
  if (CLASSIC.has(v.body)) {
    kids.push(capsule([front + 0.02, 0.36, -W * 0.85], [front + 0.02, 0.36, W * 0.85], 0.045, { mat: MAT.chrome }))
    kids.push(capsule([rear - 0.02, 0.38, -W * 0.85], [rear - 0.02, 0.38, W * 0.85], 0.045, { mat: MAT.chrome }))
  }
  if (v.wing) {
    kids.push(box([0.22, 0.02, W * 0.95], { pos: [rear - 0.35, rearY + 0.22, 0], r: 0.01, mat: MAT.paint(v.color) }))
    for (const z of [-0.5, 0.5]) kids.push(box([0.05, 0.12, 0.02], { pos: [rear - 0.35, rearY + 0.1, z * W], mat: MAT.blackMetal }))
  }
  if (v.number) {
    for (const z of [-1, 1]) kids.push(cyl(0.2, 0.004, { axis: 'z', pos: [cx + 0.1, belt - 0.22, z * (W + 0.005)], mat: MAT.matte('#f4f1ea'), decal: { canvas: numberDecal(v.number), proj: 'z', w: 0.42, h: 0.42 } }))
  }
  // mirrors, door handles, exhaust
  const aPillar = Math.min(...gx)
  if (v.body !== 'veteran' && v.body !== 'roadster') {
    for (const z of [-1, 1]) {
      kids.push(ell([0.1, 0.06, 0.07], { pos: [aPillar + 0.05, belt + 0.05, z * (W * 0.88 + 0.1)], mat: MAT.paint(v.color) }))
      kids.push(capsule([cx + 0.05, belt - 0.12, z * (W + 0.005)], [cx + 0.2, belt - 0.12, z * (W + 0.005)], 0.018, { mat: MAT.chrome }))
    }
  }
  for (const z of [-0.35, 0.35]) kids.push(cyl(0.05, 0.1, { axis: 'x', pos: [rear - 0.02, 0.3, z * W], rr: 0.02, mat: MAT.chrome }))
  return {
    root: U(kids),
    camera: { pos: [-7.0, 1.75, 7.8], target: [cx + 0.1, 0.5, 0], fov: 0.27 },
    wall: '#15171a',
    halo: '#2c2f34',
    spot: [0, 2.5, 0],
    floorGloss: 0.5,
  }
}
