import { MAT, METAL_OF, U, SU, SUB, beads, box, capsule, cyl, ell, extrude, gem, ngon, sphere, torus, tube, arc } from '../dsl.js'

/**
 * Jewellery photographed like a jeweller's catalogue: rings in a velvet
 * cushion, necklaces draped on a velvet bust, earrings on a stand, brooches
 * on tilted velvet, loose stones on a pedestal.
 */
const VELVET = { velvet: '#3a0f18', navy: '#101a36', green: '#0f2a1a', ink: '#17151c', plum: '#3a1848', warm: '#5a3a24' }

const gemMat = (c) => (c === 'none' ? MAT.gold : MAT.gem(c))

function necklacePts(n, sag = 0.9, open = 0.62) {
  // hugs the neck of the bust at the back, hangs down onto the chest in front
  const pts = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const a = -Math.PI * open + t * Math.PI * 2 * open
    const d = sag * Math.pow(Math.cos((a / open) * 0.5), 2)
    const y = 2.62 - d
    const x = Math.sin(a) * 0.58 * (1 + 0.45 * d)
    const z = -0.1 + Math.cos(a) * 0.56 + d * 0.3
    pts.push([x, y, z])
  }
  return pts
}

function bust(col) {
  const v = MAT.velvet(col)
  return SU(0.25, [
    cyl(0.5, 0.7, { pos: [0, 2.85, -0.1], mat: v }),
    ell([1.75, 0.95, 0.75], { pos: [0, 1.75, -0.2], mat: v }),
    cyl(0.9, 0.9, { pos: [0, 0.8, -0.2], rr: 0.1, mat: v }),
  ])
}

export function buildJewel(v, id) {
  const metal = METAL_OF[v.metal] || MAT.gold
  const g1 = gemMat(v.gem)
  const g2 = gemMat(v.gem2 || '#f4f8fc')
  const velvetCol = VELVET[v.tone || 'velvet'] || VELVET.velvet
  const velvet = MAT.velvet(velvetCol)
  const cut = v.cut
  let root
  let camera = { pos: [1.2, 1.7, 4.2], target: [0, 0.75, 0], fov: 0.5 }
  const wall = '#15100d'
  switch (v.form) {
    case 'ring':
    case 'solitaire':
    case 'cocktail': {
      const R = 0.5, r = v.form === 'ring' && v.metal === 'silver' ? 0.09 : 0.065
      const cy = 0.58
      const kids = [torus(R, r, { axis: 'z', pos: [0, cy, 0], mat: metal })]
      const top = cy + R + r * 0.6
      if (v.form === 'solitaire') {
        kids.push(U([capsule([0.16, 0, 0], [0.1, 0.3, 0], 0.022, { mat: metal })], { pos: [0, top, 0], polarY: 6 }))
        kids.push(gem(0.2, cut || 'brilliant', { pos: [0, top + 0.3, 0], mat: g1 }))
      } else if (v.form === 'cocktail') {
        kids.push(cyl(0.3, 0.07, { pos: [0, top + 0.08, 0], mat: metal, rr: 0.03 }))
        kids.push(U([gem(0.045, 'brilliant', { pos: [0.27, 0, 0], mat: g2 })], { pos: [0, top + 0.16, 0], polarY: 14 }))
        kids.push(gem(cut === 'emerald' ? 0.25 : 0.22, cut || 'oval', { pos: [0, top + 0.25, 0], mat: g1 }))
      } else {
        kids.push(cyl(0.15, 0.06, { pos: [0, top + 0.04, 0], mat: metal, rr: 0.02 }))
        kids.push(gem(0.14, cut || 'brilliant', { pos: [0, top + 0.14, 0], mat: g1 }))
      }
      root = U([
        U(kids, { rot: [0, 32, 0] }),
        SUB(box([1.1, 0.3, 0.65], { pos: [0, 0.3, 0], r: 0.14, mat: velvet }), box([0.2, 0.2, 0.08], { pos: [0, 0.62, 0] })),
      ])
      camera = { pos: [1.2, 1.9, 3.7], target: [0, 1.0, 0], fov: 0.42 }
      break
    }
    case 'bangle':
    case 'cuff':
    case 'panther': {
      const R = 0.78, r = v.form === 'bangle' ? 0.07 : 0.16
      const ring = [torus(R, r, { mat: metal })]
      if (v.form === 'bangle') ring.push(U([cyl(0.04, 0.03, { axis: 'x', pos: [R + r * 0.75, 0, 0], mat: MAT.polished }), box([0.012, 0.008, 0.05], { pos: [R + r * 0.75 + 0.03, 0, 0], mat: MAT.blackMetal })], { polarY: 10 }))
      if (v.form !== 'bangle') ring.push(U([ell([0.05, 0.06, 0.035], { pos: [R + r * 0.92, 0.05, 0], mat: MAT.blackLacquer }), ell([0.04, 0.05, 0.03], { pos: [R + r * 0.8, -0.1, 0.05], mat: MAT.blackLacquer })], { polarY: 16 }))
      if (v.form === 'panther') {
        ring.push(
          U(
            [
              SU(0.08, [ell([0.28, 0.24, 0.26], { mat: metal }), ell([0.14, 0.1, 0.16], { pos: [0, -0.08, 0.2], mat: metal })]),
              ell([0.07, 0.1, 0.05], { pos: [-0.17, 0.2, 0.02], rot: [0, 0, 25], mat: metal }),
              ell([0.07, 0.1, 0.05], { pos: [0.17, 0.2, 0.02], rot: [0, 0, -25], mat: metal }),
              gem(0.045, 'cab', { axis: 'z', pos: [-0.1, 0.03, 0.22], mat: g1 }),
              gem(0.045, 'cab', { axis: 'z', pos: [0.1, 0.03, 0.22], mat: g1 }),
              ell([0.04, 0.03, 0.03], { pos: [0, -0.07, 0.34], mat: MAT.blackLacquer }),
            ],
            { pos: [0, 0.05, -(R + 0.12)], rot: [-72, 0, 0] },
          ),
        )
      } else if (v.form === 'cuff') {
        ring.push(gem(0.12, cut || 'brilliant', { axis: 'z', pos: [0, 0, R + r + 0.02], mat: g1 }))
      }
      root = U([U(ring, { pos: [0, R * 0.88 + 0.02, 0], rot: [72, 0, 0] }), box([2.4, 0.08, 1.6], { pos: [0, -0.02, -0.2], r: 0.06, mat: velvet })])
      camera = { pos: [1.0, 2.4, 4.6], target: [0, 0.7, 0], fov: 0.52 }
      break
    }
    case 'serpent': {
      const coils = []
      for (let i = 0; i < 3; i++) coils.push(torus(0.6 - i * 0.02, 0.1, { pos: [0, 0.35 + i * 0.26, 0], rot: [8 - i * 8, 0, 6], mat: { ...metal, proc: 'hammered', pscale: 30, bump: 0.8 } }))
      coils.push(SU(0.06, [ell([0.18, 0.1, 0.28], { pos: [0.35, 0.9, 0.55], rot: [0, 30, 0], mat: metal })]))
      coils.push(gem(0.035, 'cab', { axis: 'y', pos: [0.28, 0.99, 0.66], mat: g1 }))
      coils.push(gem(0.035, 'cab', { axis: 'y', pos: [0.44, 0.99, 0.6], mat: g1 }))
      root = U([U(coils), box([2.4, 0.08, 1.6], { pos: [0, 0.14, -0.2], r: 0.06, mat: velvet })])
      camera = { pos: [1.2, 2.1, 4.2], target: [0, 0.75, 0], fov: 0.46 }
      break
    }
    case 'pearls':
    case 'riviere':
    case 'clover':
    case 'chain':
    case 'pendant': {
      const kids = [bust(velvetCol)]
      if (v.form === 'pearls') {
        kids.push(beads(necklacePts(31, 0.95), 0.085, { mat: MAT.pearl }))
        kids.push(beads(necklacePts(37, 1.25, 0.66), 0.075, { mat: { ...MAT.pearl, color: '#f1e6dc' } }))
        const p0 = necklacePts(31, 0.95)[15]
        kids.push(U([cyl(0.1, 0.03, { axis: 'z', rr: 0.01, mat: metal }), U([gem(0.03, 'brilliant', { axis: 'z', pos: [0.07, 0, 0.03], mat: MAT.gem('#f4f8fc') })], { polar: 8 }), gem(0.05, 'brilliant', { axis: 'z', pos: [0, 0, 0.04], mat: MAT.gem('#f4f8fc') })], { pos: [p0[0], p0[1] - 0.05, p0[2] + 0.1], rot: [-15, 0, 0] }))
      } else {
        kids.push(tube(necklacePts(40, 0.9), 0.018, { mat: metal }))
      }
      if (v.form === 'riviere') {
        const pts = necklacePts(13, 0.92)
        pts.forEach((p, i) => {
          const mid = Math.abs(i - 6)
          const r = mid === 0 ? 0.14 : 0.1 - mid * 0.008
          kids.push(U([cyl(r * 1.05, 0.03, { mat: metal, rr: 0.01 }), gem(r, i === 6 ? cut || 'pear' : cut === 'rose' ? 'rose' : 'brilliant', { pos: [0, 0.04, 0], mat: i % 2 || i === 6 ? g1 : g2 })], { pos: [p[0], p[1] - 0.03, p[2] + 0.04], rot: [80, 0, 0] }))
        })
      }
      if (v.form === 'clover') {
        necklacePts(7, 0.92).slice(1, 6).forEach((p, i) => {
          kids.push(
            U(
              [
                U([SU(0.02, [cyl(0.09, 0.02, { pos: [0.08, 0, 0], mat: i % 2 ? g2 : g1.type === 'gem' ? MAT.enamel(v.gem) : g1 })])], { polarY: 4, rot: [0, 45, 0] }),
                U([torus(0.09, 0.012, { pos: [0.08, 0.02, 0], mat: metal })], { polarY: 4, rot: [0, 45, 0] }),
                sphere(0.03, { pos: [0, 0.03, 0], mat: metal }),
              ],
              { pos: [p[0], p[1] - 0.05, p[2] + 0.05], rot: [80, 0, 0] },
            ),
          )
        })
      }
      if (v.form === 'pendant') {
        const p = necklacePts(41, 0.9)[20]
        kids.push(
          U(
            [
              capsule([0, 0.28, 0], [0, -0.3, 0], 0.035, { mat: metal }),
              ell([0.34, 0.1, 0.02], { pos: [-0.3, 0.12, 0], rot: [0, 0, 18], mat: { type: 'glass', color: v.gem2 || '#9ad0c0' } }),
              ell([0.34, 0.1, 0.02], { pos: [0.3, 0.12, 0], rot: [0, 0, -18], mat: { type: 'glass', color: v.gem2 || '#9ad0c0' } }),
              ell([0.26, 0.08, 0.02], { pos: [-0.24, -0.08, 0], rot: [0, 0, -14], mat: { type: 'glass', color: v.gem2 || '#9ad0c0' } }),
              ell([0.26, 0.08, 0.02], { pos: [0.24, -0.08, 0], rot: [0, 0, 14], mat: { type: 'glass', color: v.gem2 || '#9ad0c0' } }),
              ell([0.36, 0.12, 0.012], { pos: [-0.3, 0.12, -0.012], rot: [0, 0, 18], mat: metal }),
              ell([0.36, 0.12, 0.012], { pos: [0.3, 0.12, -0.012], rot: [0, 0, -18], mat: metal }),
              gem(0.08, 'pear', { axis: 'z', pos: [0, -0.42, 0.02], rot: [0, 0, 180], mat: g1 }),
            ],
            { pos: [p[0], p[1] - 0.35, p[2] + 0.08], rot: [-12, 0, 0] },
          ),
        )
      }
      root = U(kids)
      camera = { pos: [0.9, 2.6, 5.4], target: [0, 1.95, 0], fov: 0.5 }
      break
    }
    case 'charm': {
      const pts = []
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2
        pts.push([Math.cos(a) * 0.85, 0.08, Math.sin(a) * 0.62])
      }
      pts.push(pts[0])
      const kids = [tube(pts, 0.035, { mat: metal }), box([2.6, 0.06, 1.8], { pos: [0, 0, -0.1], r: 0.05, mat: velvet })]
      const charms = [
        [0.85, 0, g1, 'heart'],
        [0.3, 1, metal, 'disc'],
        [-0.4, 2, g2, 'star'],
        [-0.85, 3, metal, 'bell'],
      ]
      charms.forEach(([x, i, mat, k]) => {
        const z = Math.sqrt(Math.max(0, 1 - (x / 0.86) ** 2)) * 0.62 + 0.12
        const pos = [x * 0.9, 0.12, z]
        if (k === 'heart') kids.push(U([sphere(0.09, { pos: [-0.06, 0.03, 0], mat: MAT.enamel('#b3202a') }), sphere(0.09, { pos: [0.06, 0.03, 0], mat: MAT.enamel('#b3202a') }), ell([0.13, 0.13, 0.06], { pos: [0, -0.06, 0], mat: MAT.enamel('#b3202a') })], { pos, rot: [-70, 0, 0] }))
        else if (k === 'disc') kids.push(cyl(0.13, 0.02, { pos, rr: 0.01, mat: metal }))
        else if (k === 'star') kids.push(extrude(ngon(0.14, 5), 0.03, { pos, rot: [90, 0, 0], rr: 0.01, mat: MAT.enamel('#2e86c1') }))
        else kids.push(SU(0.03, [sphere(0.1, { pos, mat: metal }), cyl(0.12, 0.02, { pos: [pos[0], pos[1] - 0.06, pos[2]], mat: metal })]))
        void i
      })
      root = U(kids)
      camera = { pos: [0.5, 2.4, 3.3], target: [0, 0.1, 0.15], fov: 0.46 }
      break
    }
    case 'tiara': {
      const kids = [arc(1.0, 0.045, Math.PI * 0.15, Math.PI * 0.85, { axis: 'z', pos: [0, 0, 0], mat: metal })]
      for (let i = -4; i <= 4; i++) {
        const a = Math.PI / 2 + i * 0.16
        const bx = Math.cos(a) * 1.0, by = Math.sin(a) * 1.0
        const h = 0.55 - Math.abs(i) * 0.09
        kids.push(tube([[bx - 0.08, by, 0], [bx, by + h, 0], [bx + 0.08, by, 0]], 0.022, { mat: metal }))
        kids.push(gem(i === 0 ? 0.13 : 0.07, i === 0 ? cut || 'pear' : 'brilliant', { axis: 'z', pos: [bx, by + h * 0.62, 0.04], mat: i === 0 ? g1 : g2 }))
        kids.push(gem(0.035, 'brilliant', { axis: 'z', pos: [bx, by + h + 0.02, 0.02], mat: g2 }))
      }
      root = U([U(kids, { pos: [0, -0.1, 0] }), SU(0.2, [ell([1.3, 0.55, 0.9], { pos: [0, 0.35, -0.2], mat: velvet })])])
      root = U([U(kids, { pos: [0, 0.05, 0.1], rot: [-10, 0, 0] }), ell([1.4, 0.95, 1.0], { pos: [0, 0.1, -0.45], mat: velvet })])
      camera = { pos: [0.6, 1.6, 4.8], target: [0, 1.15, 0], fov: 0.46 }
      break
    }
    case 'brooch':
    case 'flower':
    case 'deco':
    case 'cameo': {
      const kids = []
      if (v.form === 'brooch') {
        kids.push(cyl(0.5, 0.03, { axis: 'z', mat: metal, rr: 0.015 }))
        kids.push(U([gem(0.1, 'brilliant', { axis: 'z', pos: [0.38, 0, 0.05], mat: g2 })], { polar: 10 }))
        kids.push(U([gem(0.07, cut || 'brilliant', { axis: 'z', pos: [0.22, 0, 0.06], mat: g1 })], { polar: 7 }))
        kids.push(gem(0.16, cut || 'cab', { axis: 'z', pos: [0, 0, 0.08], mat: g1 }))
      } else if (v.form === 'flower') {
        kids.push(U([ell([0.3, 0.14, 0.05], { pos: [0.3, 0, 0.04], mat: MAT.gem(v.gem) })], { polar: 6 }))
        kids.push(U([ell([0.31, 0.15, 0.03], { pos: [0.3, 0, 0.0], mat: metal })], { polar: 6 }))
        kids.push(gem(0.12, 'brilliant', { axis: 'z', pos: [0, 0, 0.1], mat: g2 }))
        kids.push(capsule([0, -0.45, 0], [-0.3, -1.0, 0], 0.035, { mat: { ...metal } }))
        kids.push(ell([0.22, 0.09, 0.03], { pos: [-0.28, -0.72, 0.02], rot: [0, 0, 40], mat: MAT.gem('#2e8a4a') }))
      } else if (v.form === 'deco') {
        kids.push(extrude(ngon(0.62, 6, 0), 0.04, { rr: 0.02, mat: metal, scale: 1, rot: [0, 0, 0] }))
        kids.push(extrude(ngon(0.5, 6, 0), 0.02, { pos: [0, 0, 0.04], mat: MAT.blackLacquer }))
        kids.push(U([gem(0.045, 'brilliant', { axis: 'z', pos: [0.4, 0, 0.06], mat: g2 })], { polar: 12 }))
        kids.push(gem(0.19, cut || 'emerald', { axis: 'z', pos: [0, 0, 0.1], mat: g1 }))
      } else {
        kids.push(ell([0.5, 0.62, 0.05], { mat: metal }))
        kids.push(U([sphere(0.028, { pos: [0.48, 0, 0.04], mat: metal })], { polar: 34, scale: 1 }))
        kids.push(ell([0.42, 0.54, 0.07], { pos: [0, 0, 0.03], mat: MAT.ceramic(v.gem) }))
        kids.push(SU(0.04, [ell([0.13, 0.17, 0.05], { pos: [0.02, 0.18, 0.09], mat: MAT.ceramic(v.gem2 || '#f2e6d6') }), ell([0.16, 0.12, 0.05], { pos: [0.0, -0.08, 0.09], mat: MAT.ceramic(v.gem2 || '#f2e6d6') }), ell([0.12, 0.22, 0.05], { pos: [-0.02, -0.28, 0.08], mat: MAT.ceramic(v.gem2 || '#f2e6d6') }), ell([0.06, 0.1, 0.05], { pos: [0.13, 0.13, 0.1], mat: MAT.ceramic(v.gem2 || '#f2e6d6') })]))
      }
      // a velvet board leaning back; the piece rests on its face
      root = U([U(kids, { pos: [0, 1.0, 0.02], rot: [-22, 0, 0], scale: 1.05 }), box([1.6, 1.25, 0.08], { pos: [0, 1.0, -0.14], rot: [-22, 0, 0], r: 0.06, mat: velvet }), box([2.4, 0.05, 1.4], { pos: [0, 0.0, 0], r: 0.03, mat: velvet })])
      camera = { pos: [0.4, 1.5, 4.4], target: [0, 1.0, 0], fov: 0.44 }
      break
    }
    case 'earrings':
    case 'girandole': {
      const kids = [
        box([1.4, 0.05, 0.05], { pos: [0, 1.9, 0], r: 0.02, mat: MAT.blackLacquer }),
        cyl(0.03, 0.95, { pos: [0, 0.95, 0], mat: MAT.blackLacquer }),
        cyl(0.4, 0.03, { pos: [0, 0.03, 0], rr: 0.02, mat: MAT.blackLacquer }),
      ]
      for (const x of [-0.5, 0.5]) {
        const e = [arc(0.08, 0.012, Math.PI * 0.1, Math.PI * 1.2, { axis: 'z', pos: [0, 1.95, 0], mat: metal }), gem(0.06, 'brilliant', { axis: 'z', pos: [0, 1.8, 0.03], mat: g2 })]
        if (v.form === 'girandole') {
          e.push(SU(0.02, [ell([0.18, 0.07, 0.03], { pos: [0, 1.66, 0], mat: metal })]))
          for (const dx of [-0.13, 0, 0.13]) {
            e.push(capsule([dx, 1.62, 0], [dx, dx === 0 ? 1.42 : 1.5, 0], 0.008, { mat: metal }))
            e.push(gem(dx === 0 ? 0.1 : 0.07, 'pear', { axis: 'z', pos: [dx, dx === 0 ? 1.3 : 1.41, 0.02], rot: [0, 0, 180], mat: g1 }))
          }
        } else {
          e.push(capsule([0, 1.76, 0], [0, 1.58, 0], 0.01, { mat: metal }))
          e.push(gem(0.14, cut || 'pear', { axis: 'z', pos: [0, 1.4, 0.03], rot: [0, 0, 180], mat: g1 }))
        }
        kids.push(U(e, { pos: [x, 0, 0] }))
      }
      root = U(kids)
      camera = { pos: [0.5, 1.8, 4.2], target: [0, 1.5, 0], fov: 0.42 }
      break
    }
    case 'gem':
    default: {
      root = U([
        gem(0.62, cut || 'brilliant', { pos: [0, 1.12, 0], rot: [38, 20, 0], mat: g1 }),
        cyl(0.42, 0.34, { pos: [0, 0.34, 0], rr: 0.04, mat: MAT.blackLacquer }),
        cyl(0.5, 0.04, { pos: [0, 0.7, 0], rr: 0.02, mat: velvet }),
      ])
      camera = { pos: [1.0, 2.1, 4.2], target: [0, 1.0, 0], fov: 0.42 }
    }
  }
  return { root, camera, wall, halo: '#3c2c1e', spot: [0, 1.4, 0], floorGloss: 0.12 }
}
