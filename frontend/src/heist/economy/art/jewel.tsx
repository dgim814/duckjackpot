import type { ReactNode } from 'react'
import { MetalRamp, Scene, polyPoints, type G, type Metal, type Tone } from './scene'

export type JewelForm =
  | 'ring'
  | 'solitaire'
  | 'cocktail'
  | 'bangle'
  | 'cuff'
  | 'serpent'
  | 'clover'
  | 'pearls'
  | 'riviere'
  | 'tiara'
  | 'brooch'
  | 'deco'
  | 'cameo'
  | 'earrings'
  | 'girandole'
  | 'pendant'
  | 'charm'
  | 'gem'
  | 'flower'
  | 'panther'
  | 'chain'

export type Cut = 'brilliant' | 'rose' | 'emerald' | 'oval' | 'cabochon' | 'pear' | 'cushion'

export type JewelV = {
  k: 'jewel'
  form: JewelForm
  metal: Metal
  gem: string
  gem2?: string
  cut?: Cut
  tone?: Tone
}

/** A cut stone centred on (x, y). */
export function Gem({ x, y, r, color, cut = 'brilliant' }: { x: number; y: number; r: number; color: string; cut?: Cut }) {
  const hl = <ellipse cx={x - r * 0.3} cy={y - r * 0.35} rx={r * 0.32} ry={r * 0.18} fill="#fff" opacity={0.55} />
  if (cut === 'emerald')
    return (
      <g>
        <polygon points={`${x - r * 0.6},${y - r} ${x + r * 0.6},${y - r} ${x + r * 0.8},${y - r * 0.8} ${x + r * 0.8},${y + r * 0.8} ${x + r * 0.6},${y + r} ${x - r * 0.6},${y + r} ${x - r * 0.8},${y + r * 0.8} ${x - r * 0.8},${y - r * 0.8}`} fill={color} stroke="#0006" />
        <rect x={x - r * 0.45} y={y - r * 0.65} width={r * 0.9} height={r * 1.3} fill="none" stroke="#fff" strokeOpacity={0.35} />
        <rect x={x - r * 0.25} y={y - r * 0.4} width={r * 0.5} height={r * 0.8} fill="#fff" opacity={0.12} />
      </g>
    )
  if (cut === 'oval' || cut === 'cabochon')
    return (
      <g>
        <ellipse cx={x} cy={y} rx={r * 0.8} ry={r} fill={color} stroke="#0006" />
        {cut === 'oval' ? <ellipse cx={x} cy={y} rx={r * 0.5} ry={r * 0.66} fill="none" stroke="#fff" strokeOpacity={0.3} /> : null}
        {hl}
      </g>
    )
  if (cut === 'pear')
    return (
      <g>
        <path d={`M${x} ${y - r * 1.2}Q${x + r * 0.95} ${y + r * 0.1} ${x} ${y + r}Q${x - r * 0.95} ${y + r * 0.1} ${x} ${y - r * 1.2}Z`} fill={color} stroke="#0006" />
        {hl}
      </g>
    )
  if (cut === 'cushion')
    return (
      <g>
        <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={r * 0.45} fill={color} stroke="#0006" />
        <polygon points={polyPoints(x, y, r * 0.55, 8, Math.PI / 8)} fill="#fff" fillOpacity={0.12} stroke="#fff" strokeOpacity={0.45} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = Math.PI / 8 + (i * Math.PI) / 4
          const k = i % 2 ? 1 : 1.3
          return <line key={i} x1={x + r * 0.55 * Math.cos(a)} y1={y + r * 0.55 * Math.sin(a)} x2={x + r * k * 0.95 * Math.cos(a)} y2={y + r * k * 0.95 * Math.sin(a)} stroke="#fff" strokeOpacity={0.35} />
        })}
        <polygon points={`${x - r * 0.9},${y + r * 0.9} ${x},${y + r * 0.2} ${x + r * 0.9},${y + r * 0.9}`} fill="#000" opacity={0.12} />
        {hl}
      </g>
    )
  if (cut === 'rose')
    return (
      <g>
        <circle cx={x} cy={y} r={r} fill={color} stroke="#0006" />
        {Array.from({ length: 12 }, (_, i) => {
          const a1 = (i * Math.PI) / 6
          const a2 = ((i + 1) * Math.PI) / 6
          return (
            <polygon
              key={i}
              points={`${x},${y} ${x + r * Math.cos(a1)},${y + r * Math.sin(a1)} ${x + r * Math.cos(a2)},${y + r * Math.sin(a2)}`}
              fill={i % 2 ? '#000' : '#fff'}
              opacity={i % 2 ? 0.14 : 0.22}
              stroke="#fff"
              strokeOpacity={0.35}
            />
          )
        })}
        {hl}
      </g>
    )
  return (
    <g>
      <polygon points={polyPoints(x, y, r, 8, Math.PI / 8)} fill={color} stroke="#0006" />
      <polygon points={polyPoints(x, y, r * 0.55, 8, Math.PI / 8)} fill="#fff" opacity={0.18} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = Math.PI / 8 + (i * Math.PI) / 4
        return <line key={i} x1={x + r * 0.55 * Math.cos(a)} y1={y + r * 0.55 * Math.sin(a)} x2={x + r * Math.cos(a)} y2={y + r * Math.sin(a)} stroke="#fff" strokeOpacity={0.3} />
      })}
      {hl}
    </g>
  )
}

function catenary(n: number, sag = 70, w = 170, top = 34) {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    pts.push([160 - w / 2 + t * w, top + Math.sin(t * Math.PI) * sag])
  }
  return pts
}

export function JewelArt({ v, g }: { v: JewelV; g: G }) {
  const m = `url(#${g('m')})`
  const gem = v.gem
  const gem2 = v.gem2 ?? '#f4f7fb'
  let body: ReactNode = null
  switch (v.form) {
    case 'ring':
    case 'solitaire':
    case 'cocktail':
      body = (
        <g>
          <ellipse cx={160} cy={110} rx={44} ry={36} fill="none" stroke={m} strokeWidth={9} />
          {v.form === 'solitaire' ? (
            <g stroke={m} strokeWidth={3}>
              <line x1={146} y1={78} x2={152} y2={52} />
              <line x1={174} y1={78} x2={168} y2={52} />
              <line x1={160} y1={80} x2={160} y2={50} />
            </g>
          ) : null}
          {v.form === 'cocktail'
            ? Array.from({ length: 12 }, (_, i) => {
                const a = (i * Math.PI) / 6
                return <circle key={i} cx={160 + 25 * Math.cos(a)} cy={60 + 23 * Math.sin(a)} r={4} fill={gem2} stroke="#0005" />
              })
            : null}
          <Gem x={160} y={v.form === 'ring' ? 72 : 60} r={v.form === 'cocktail' ? 19 : v.form === 'solitaire' ? 17 : 13} color={gem} cut={v.cut} />
        </g>
      )
      break
    case 'bangle':
      body = (
        <g>
          <ellipse cx={160} cy={96} rx={70} ry={44} fill="none" stroke={m} strokeWidth={14} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4 + 0.2
            return (
              <g key={i}>
                <circle cx={160 + 70 * Math.cos(a)} cy={96 + 44 * Math.sin(a)} r={3.4} fill="#0004" />
                <line x1={160 + 70 * Math.cos(a) - 2.4} y1={96 + 44 * Math.sin(a)} x2={160 + 70 * Math.cos(a) + 2.4} y2={96 + 44 * Math.sin(a)} stroke="#fff8" />
              </g>
            )
          })}
          {gem !== 'none' ? <Gem x={160} y={140} r={6} color={gem} /> : null}
        </g>
      )
      break
    case 'cuff':
    case 'panther':
      body = (
        <g>
          <ellipse cx={160} cy={100} rx={74} ry={42} fill="none" stroke={m} strokeWidth={24} />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * Math.PI) / 8
            return <circle key={i} cx={160 + 74 * Math.cos(a)} cy={100 + 42 * Math.sin(a)} r={3.4} fill={gem2} />
          })}
          {v.form === 'panther' ? (
            <g>
              <circle cx={160} cy={60} r={20} fill={m} stroke="#0006" />
              <polygon points="144,46 148,32 156,44" fill={m} />
              <polygon points="176,46 172,32 164,44" fill={m} />
              <circle cx={153} cy={58} r={3.2} fill={gem} />
              <circle cx={167} cy={58} r={3.2} fill={gem} />
              <path d="M155 68q5 5 10 0" stroke="#0008" fill="none" strokeWidth={2} />
            </g>
          ) : (
            <Gem x={160} y={58} r={12} color={gem} cut={v.cut} />
          )}
        </g>
      )
      break
    case 'serpent':
      body = (
        <g>
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={160} cy={70 + i * 24} rx={62 - i * 4} ry={16} fill="none" stroke={m} strokeWidth={11} />
          ))}
          {Array.from({ length: 18 }, (_, i) => (
            <line key={i} x1={104 + i * 6.4} y1={60 + (i % 3) * 24} x2={104 + i * 6.4} y2={70 + (i % 3) * 24} stroke="#0003" strokeWidth={2} />
          ))}
          <path d="M196 132q30 -4 34 12q-12 12 -34 2z" fill={m} stroke="#0006" />
          <circle cx={218} cy={138} r={2.6} fill={gem} />
        </g>
      )
      break
    case 'clover':
    case 'pearls':
    case 'riviere':
    case 'chain':
    case 'pendant':
    case 'charm': {
      const pts = catenary(v.form === 'clover' ? 7 : v.form === 'pearls' ? 23 : v.form === 'riviere' ? 17 : 26, v.form === 'pendant' ? 58 : 66)
      body = (
        <g>
          <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={m} strokeWidth={2.4} />
          {v.form === 'clover'
            ? pts.slice(1, -1).map(([x, y], i) => (
                <g key={i}>
                  {[0, 1, 2, 3].map((q) => (
                    <circle key={q} cx={x + (q % 2 ? 5 : -5)} cy={y + (q < 2 ? -5 : 5)} r={6} fill={i % 2 ? gem : gem2} stroke={m} strokeWidth={1.6} />
                  ))}
                </g>
              ))
            : null}
          {v.form === 'pearls'
            ? pts.map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r={6.4} fill={gem} stroke="#0003" />
                  <circle cx={x - 2} cy={y - 2} r={2} fill="#fff" opacity={0.8} />
                </g>
              ))
            : null}
          {v.form === 'riviere' ? pts.map(([x, y], i) => <Gem key={i} x={x} y={y} r={i === 8 ? 11 : 6 + Math.sin((i / 16) * Math.PI) * 3} color={i % 2 ? gem : gem2} cut={v.cut} />) : null}
          {v.form === 'chain' ? pts.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={4} ry={3} fill="none" stroke={m} strokeWidth={2} />) : null}
          {v.form === 'charm'
            ? pts.filter((_, i) => i % 5 === 2).map(([x, y], i) => (
                <g key={i}>
                  <line x1={x} y1={y} x2={x} y2={y + 10} stroke={m} strokeWidth={1.6} />
                  {i % 3 === 0 ? <path d={`M${x} ${y + 24}l-7 -8a4 4 0 0 1 7 -4a4 4 0 0 1 7 4z`} fill={gem} /> : i % 3 === 1 ? <circle cx={x} cy={y + 17} r={7} fill={m} /> : <polygon points={`${x},${y + 10} ${x + 7},${y + 22} ${x - 7},${y + 22}`} fill={gem2} />}
                </g>
              ))
            : null}
          {v.form === 'pendant' ? (
            <g>
              <path d="M160 96l-30 -12q-10 12 6 18zM160 96l30 -12q10 12 -6 18z" fill={gem2} opacity={0.85} stroke={m} strokeWidth={1.6} />
              <path d="M160 100l-26 4q-4 10 10 8zM160 100l26 4q4 10 -10 8z" fill={gem2} opacity={0.7} stroke={m} strokeWidth={1.4} />
              <rect x={156} y={88} width={8} height={48} rx={4} fill={m} />
              <Gem x={160} y={140} r={8} color={gem} cut="pear" />
            </g>
          ) : null}
        </g>
      )
      break
    }
    case 'tiara': {
      const peaks = [-4, -3, -2, -1, 0, 1, 2, 3, 4]
      body = (
        <g>
          <path d="M72 130Q160 96 248 130" fill="none" stroke={m} strokeWidth={8} />
          {peaks.map((i) => {
            const x = 160 + i * 19
            const base = 116 + Math.abs(i) * 2.2
            const h = 46 - Math.abs(i) * 7
            return (
              <g key={i}>
                <path d={`M${x - 9} ${base}Q${x} ${base - h} ${x + 9} ${base}`} fill="none" stroke={m} strokeWidth={3} />
                <Gem x={x} y={base - h * 0.62} r={i === 0 ? 9 : 5} color={i === 0 ? gem : gem2} cut={i === 0 ? v.cut ?? 'pear' : 'brilliant'} />
              </g>
            )
          })}
        </g>
      )
      break
    }
    case 'brooch':
    case 'flower':
      body = (
        <g>
          {Array.from({ length: v.form === 'flower' ? 6 : 8 }, (_, i) => {
            const n = v.form === 'flower' ? 6 : 8
            const a = (i * 2 * Math.PI) / n
            return v.form === 'flower' ? (
              <ellipse key={i} cx={160 + 26 * Math.cos(a)} cy={90 + 26 * Math.sin(a)} rx={20} ry={12} fill={gem} stroke={m} strokeWidth={1.4} transform={`rotate(${(a * 180) / Math.PI} ${160 + 26 * Math.cos(a)} ${90 + 26 * Math.sin(a)})`} />
            ) : (
              <Gem key={i} x={160 + 32 * Math.cos(a)} y={90 + 32 * Math.sin(a)} r={9} color={i % 2 ? gem : gem2} />
            )
          })}
          {v.form === 'flower' ? (
            <g stroke={m} strokeWidth={0.8} opacity={0.6}>
              {Array.from({ length: 6 }, (_, i) => {
                const a = (i * Math.PI) / 3
                return <line key={i} x1={160 + 10 * Math.cos(a)} y1={90 + 10 * Math.sin(a)} x2={160 + 44 * Math.cos(a)} y2={90 + 44 * Math.sin(a)} />
              })}
              <path d="M160 116q-6 30 -30 44" fill="none" stroke="#3d7a4a" strokeWidth={4} opacity={1} />
            </g>
          ) : (
            <circle cx={160} cy={90} r={40} fill="none" stroke={m} strokeWidth={3} />
          )}
          <Gem x={160} y={90} r={v.form === 'flower' ? 11 : 16} color={v.form === 'flower' ? gem2 : gem} cut={v.cut} />
        </g>
      )
      break
    case 'deco':
      body = (
        <g>
          <polygon points="98,90 130,58 190,58 222,90 190,122 130,122" fill={m} stroke="#0006" />
          <polygon points="108,90 134,66 186,66 212,90 186,114 134,114" fill="#101014" />
          {[-2, -1, 1, 2].map((i) => (
            <line key={i} x1={160 + i * 16} y1={70} x2={160 + i * 16} y2={110} stroke={m} strokeWidth={2} />
          ))}
          {[-3, -2, -1, 1, 2, 3].map((i) => (
            <circle key={i} cx={160 + i * 16 - Math.sign(i) * 8} cy={90} r={3.4} fill={gem2} />
          ))}
          <Gem x={160} y={90} r={13} color={gem} cut={v.cut ?? 'emerald'} />
        </g>
      )
      break
    case 'cameo':
      body = (
        <g>
          <ellipse cx={160} cy={90} rx={50} ry={62} fill={m} />
          {Array.from({ length: 20 }, (_, i) => {
            const a = (i * Math.PI) / 10
            return <circle key={i} cx={160 + 46 * Math.cos(a)} cy={90 + 58 * Math.sin(a)} r={2.2} fill="#fff8" />
          })}
          <ellipse cx={160} cy={90} rx={40} ry={52} fill={gem} />
          <path d="M168 50c14 2 20 16 17 30 0 8-4 12-3 18 8 6 14 16 12 28-3 14-18 22-34 20-16-2-26-14-24-28 2-12 10-18 12-24-2-8-8-14-6-24 3-12 14-21 26-20z" fill={gem2} />
        </g>
      )
      break
    case 'earrings':
    case 'girandole':
      body = (
        <g>
          {[118, 202].map((x) => (
            <g key={x}>
              <circle cx={x} cy={44} r={9} fill={m} />
              {v.form === 'girandole' ? (
                <g>
                  <path d={`M${x - 22} ${62}q22 -14 44 0q-22 10 -44 0z`} fill={m} />
                  {[-16, 0, 16].map((d) => (
                    <g key={d}>
                      <line x1={x + d} y1={66} x2={x + d} y2={d === 0 ? 100 : 88} stroke={m} strokeWidth={1.6} />
                      <Gem x={x + d} y={d === 0 ? 114 : 100} r={d === 0 ? 12 : 8} color={gem} cut="pear" />
                    </g>
                  ))}
                </g>
              ) : (
                <g>
                  <line x1={x} y1={52} x2={x} y2={80} stroke={m} strokeWidth={2} />
                  <Gem x={x} y={100} r={16} color={gem} cut={v.cut ?? 'pear'} />
                </g>
              )}
              <Gem x={x} y={44} r={6} color={gem2} />
            </g>
          ))}
        </g>
      )
      break
    case 'gem':
      body = (
        <g>
          <rect x={112} y={124} width={96} height={16} rx={3} fill="#0d0d10" stroke={m} strokeWidth={1.4} />
          <Gem x={160} y={86} r={38} color={gem} cut={v.cut} />
        </g>
      )
      break
  }
  return (
    <Scene g={g} tone={v.tone ?? 'velvet'}>
      <defs>
        <MetalRamp id={g('m')} metal={v.metal} />
      </defs>
      {body}
    </Scene>
  )
}
