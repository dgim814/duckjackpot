/** Tiny modelling DSL for the lot renderer: primitives, groups, materials, canvases. */

export const box = (size, o = {}) => ({ prim: 'box', size, ...o })
export const sphere = (r, o = {}) => ({ prim: 'sphere', r, ...o })
export const cyl = (r, h, o = {}) => ({ prim: 'cyl', r, h, ...o })
export const torus = (R, r, o = {}) => ({ prim: 'torus', R, r, ...o })
export const arc = (R, r, a0, a1, o = {}) => ({ prim: 'arc', R, r, a0, a1, ...o })
export const capsule = (a, b, r, o = {}) => ({ prim: 'capsule', a, b, r, ...o })
export const ell = (r, o = {}) => ({ prim: 'ell', r, ...o })
export const cone = (h, r1, r2, o = {}) => ({ prim: 'cone', h, r1, r2, ...o })
export const gem = (r, cut = 'brilliant', o = {}) => ({ prim: 'gem', r, cut, ...o })
export const extrude = (shape, h, o = {}) => ({ prim: 'extrude', shape, h, ...o })
export const lathe = (pts, o = {}) => ({ prim: 'lathe', pts, ...o })
export const beads = (pts, r, o = {}) => ({ prim: 'beads', pts, r, ...o })
export const tube = (pts, r, o = {}) => ({ prim: 'tube', pts, r, ...o })

export const U = (kids, o = {}) => ({ op: 'u', kids: kids.filter(Boolean), ...o })
export const SU = (k, kids, o = {}) => ({ op: 'u', k, kids: kids.filter(Boolean), ...o })
export const SUB = (a, ...b) => ({ op: 's', kids: [a, ...b] })
export const INT = (a, ...b) => ({ op: 'i', kids: [a, ...b] })

export const circle = (r) => ({ k: 'circle', r })
export const rrect = (w, h, r = 0) => ({ k: 'rrect', w, h, r })
export const ellipse2 = (rx, ry) => ({ k: 'ellipse', rx, ry })
export const annulus = (R, r) => ({ k: 'annulus', R, r })
export const ngon = (r, n, rot = 0) => ({ k: 'ngon', r, n, rot })
export const poly = (pts) => ({ k: 'poly', pts })

/** Materials. Colours are sRGB hex; metals use measured-ish reflectance tints. */
export const MAT = {
  steel: { type: 'metal', color: '#c8ccd2', rough: 0.14, proc: 'brushed', pscale: 60, bump: 0.2 },
  polished: { type: 'metal', color: '#d7dbe0', rough: 0.05 },
  silver: { type: 'metal', color: '#e6e6e8', rough: 0.08 },
  gold: { type: 'metal', color: '#f2c46a', rough: 0.09 },
  goldBrushed: { type: 'metal', color: '#f0c068', rough: 0.2, proc: 'brushed', pscale: 60, bump: 0.2 },
  rose: { type: 'metal', color: '#f0b09a', rough: 0.1 },
  plat: { type: 'metal', color: '#dfe2e6', rough: 0.07 },
  ti: { type: 'metal', color: '#9ea4aa', rough: 0.28, proc: 'brushed', pscale: 60, bump: 0.25 },
  blackMetal: { type: 'metal', color: '#3a3b3e', rough: 0.3 },
  brass: { type: 'metal', color: '#e0b25a', rough: 0.22, proc: 'hammered', pscale: 18, bump: 0.25 },
  bronze: { type: 'metal', color: '#9a6a36', rough: 0.35, proc: 'hammered', pscale: 14, bump: 0.5 },
  copper: { type: 'metal', color: '#e39462', rough: 0.25, proc: 'hammered', pscale: 12, bump: 0.35 },
  chrome: { type: 'metal', color: '#e8ebee', rough: 0.03 },
  glass: { type: 'glass', color: '#f2f6f7' },
  tintedGlass: { type: 'glass', color: '#6f7d85' },
  rubber: { type: 'dielectric', color: '#1a1a1c', rough: 0.55, spec: 0.4 },
  blackLacquer: { type: 'dielectric', color: '#0d0d0f', rough: 0.08 },
  ceramic: (c) => ({ type: 'dielectric', color: c, rough: 0.12 }),
  plastic: (c, rough = 0.3) => ({ type: 'dielectric', color: c, rough }),
  leather: (c, s = 90) => ({ type: 'dielectric', color: c, rough: 0.45, proc: 'leather', pscale: s, bump: 0.7 }),
  wood: (c, s = 6) => ({ type: 'dielectric', color: c, rough: 0.35, proc: 'wood', pscale: s, bump: 0.2 }),
  paper: (c) => ({ type: 'dielectric', color: c, rough: 0.8, proc: 'paper', pscale: 8, bump: 0.1, spec: 0.2 }),
  fabric: (c) => ({ type: 'dielectric', color: c, rough: 0.9, proc: 'tweed', pscale: 30, bump: 0.5, spec: 0.1 }),
  velvet: (c) => ({ type: 'dielectric', color: c, rough: 0.95, proc: 'velvet', pscale: 30, bump: 0.3, spec: 0.1 }),
  paint: (c, rough = 0.04) => ({ type: 'paint', color: c, rough }),
  gem: (c) => ({ type: 'gem', color: c }),
  pearl: { type: 'dielectric', color: '#efe7da', rough: 0.18, spec: 1.6 },
  enamel: (c) => ({ type: 'dielectric', color: c, rough: 0.06 }),
  matte: (c) => ({ type: 'dielectric', color: c, rough: 0.7, spec: 0.3 }),
  lamp: (c) => ({ type: 'emissive', color: c }),
}
export const METAL_OF = {
  gold: MAT.gold,
  steel: MAT.steel,
  silver: MAT.silver,
  rose: MAT.rose,
  plat: MAT.plat,
  black: MAT.blackMetal,
  ti: MAT.ti,
  brass: MAT.brass,
  copper: MAT.copper,
  bronze: MAT.bronze,
}

/** 2D canvas helper for decals. */
export function canvas(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  draw(ctx, w, h)
  return c
}

/** Seeded random for deterministic details. */
export function rng(seed) {
  let s = 0
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Parse an SVG path (M L H V Q C Z, absolute) into a sampled polyline. */
export function pathPoints(d, steps = 8) {
  const tok = d.match(/[MLHVQCZmlhvqcz]|-?\d*\.?\d+(?:e-?\d+)?/g)
  const out = []
  let i = 0, cmd = '', x = 0, y = 0
  const num = () => parseFloat(tok[i++])
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++]
    if (cmd === 'Z' || cmd === 'z') continue
    if (cmd === 'M' || cmd === 'L') {
      x = num()
      y = num()
      out.push([x, y])
    } else if (cmd === 'H') {
      x = num()
      out.push([x, y])
    } else if (cmd === 'V') {
      y = num()
      out.push([x, y])
    } else if (cmd === 'Q') {
      const cx = num(), cy = num(), ex = num(), ey = num()
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        out.push([(1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey])
      }
      x = ex
      y = ey
    } else if (cmd === 'C') {
      const c1x = num(), c1y = num(), c2x = num(), c2y = num(), ex = num(), ey = num()
      for (let s = 1; s <= steps; s++) {
        const t = s / steps, u = 1 - t
        out.push([u * u * u * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex, u * u * u * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey])
      }
      x = ex
      y = ey
    } else i++
  }
  return out
}
