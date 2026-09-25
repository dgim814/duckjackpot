import type { ReactNode } from 'react'
import { METAL, MetalRamp, Scene, starPoints, polyPoints, type G, type Metal, type Tone } from './scene'

export type WatchCase = 'round' | 'big' | 'cushion' | 'octagon' | 'porthole' | 'square' | 'rect' | 'tonneau' | 'pocket' | 'digital' | 'shield'
export type WatchBezel = 'plain' | 'diver' | 'gmt' | 'tachy' | 'fluted' | 'screws' | 'hour' | 'notched' | 'h24'
export type WatchStrap = 'oyster' | 'jubilee' | 'president' | 'integrated' | 'leather' | 'rubber' | 'nato' | 'chain' | 'resin' | 'mesh' | 'none'

export type WatchV = {
  k: 'watch'
  case: WatchCase
  metal: Metal
  dial: string
  bezel?: WatchBezel
  /** Bezel insert colours (diver / gmt: [top, bottom]). */
  insert?: [string, string?]
  strap: WatchStrap
  strapColor?: string
  numerals?: 'baton' | 'arabic' | 'roman' | 'big' | 'dots' | 'none'
  sub?: 0 | 2 | 3
  subColor?: string
  date?: boolean
  day?: boolean
  hands?: string
  accent?: string
  /** Special dial features. */
  extra?: 'skeleton' | 'tourbillon' | 'moon' | 'guilloche' | 'waves' | 'tapisserie' | 'stripes' | 'grille' | 'star' | 'lightning' | 'bigdate' | 'triangle' | 'crownguard' | 'gadroon' | 'texture'
  tone?: Tone
}

const C = { x: 160, y: 90 }

function caseShape(kind: WatchCase, fill: string, stroke?: string, sw = 0) {
  const { x, y } = C
  const common = { fill, stroke, strokeWidth: sw }
  switch (kind) {
    case 'round':
      return <circle cx={x} cy={y} r={46} {...common} />
    case 'big':
    case 'pocket':
      return <circle cx={x} cy={y} r={54} {...common} />
    case 'cushion':
      return <rect x={x - 48} y={y - 48} width={96} height={96} rx={30} {...common} />
    case 'octagon':
      return <polygon points={polyPoints(x, y, 52, 8, Math.PI / 8)} {...common} />
    case 'porthole':
      return <rect x={x - 46} y={y - 46} width={92} height={92} rx={36} {...common} />
    case 'square':
      return <rect x={x - 46} y={y - 46} width={92} height={92} rx={12} {...common} />
    case 'rect':
      return <rect x={x - 34} y={y - 50} width={68} height={100} rx={8} {...common} />
    case 'tonneau':
      return (
        <path
          d={`M${x - 38} ${y - 52}Q${x} ${y - 60} ${x + 38} ${y - 52}Q${x + 50} ${y} ${x + 38} ${y + 52}Q${x} ${y + 60} ${x - 38} ${y + 52}Q${x - 50} ${y} ${x - 38} ${y - 52}Z`}
          {...common}
        />
      )
    case 'digital':
      return <rect x={x - 50} y={y - 40} width={100} height={80} rx={16} {...common} />
    case 'shield':
      return <path d={`M${x - 52} ${y - 38}Q${x} ${y - 58} ${x + 52} ${y - 38}L${x + 8} ${y + 50}Q${x} ${y + 58} ${x - 8} ${y + 50}Z`} {...common} />
  }
}

function scaled(kind: WatchCase, k: number, fill: string, stroke?: string, sw = 0) {
  return (
    <g transform={`translate(${C.x} ${C.y}) scale(${k}) translate(${-C.x} ${-C.y})`}>{caseShape(kind, fill, stroke, sw / k)}</g>
  )
}

function radius(kind: WatchCase) {
  if (kind === 'big' || kind === 'pocket') return 54
  if (kind === 'rect') return 34
  if (kind === 'digital') return 40
  return 46
}

function Strap({ v, metalFill }: { v: WatchV; metalFill: string }) {
  const { x } = C
  const narrow = v.case === 'rect' || v.case === 'shield'
  const w = narrow ? 34 : v.case === 'big' || v.case === 'octagon' || v.case === 'porthole' ? 50 : 42
  const top = <rect x={x - w / 2} y={-4} width={w} height={60} />
  const bottom = <rect x={x - w / 2} y={124} width={w} height={60} />
  const band = (fill: string, extra?: ReactNode) => (
    <g fill={fill}>
      {top}
      {bottom}
      {extra}
    </g>
  )
  const links = (cols: number, gap: number, center?: string) => {
    const out: ReactNode[] = []
    const cw = w / cols
    for (const y0 of [-6, 124]) {
      for (let yy = y0; yy < y0 + 62; yy += gap) {
        for (let c = 0; c < cols; c++) {
          const fill = center && c === Math.floor(cols / 2) ? center : metalFill
          out.push(<rect key={`${y0}-${yy}-${c}`} x={x - w / 2 + c * cw + 0.8} y={yy} width={cw - 1.6} height={gap - 2} rx={2} fill={fill} />)
        }
      }
    }
    return <g>{out}</g>
  }
  switch (v.strap) {
    case 'oyster':
      return links(3, 14)
    case 'jubilee':
      return links(5, 9)
    case 'president':
      return links(3, 7)
    case 'integrated': {
      const out: ReactNode[] = []
      for (const y0 of [-4, 126]) for (let yy = y0; yy < y0 + 60; yy += 12) {
        out.push(<rect key={`a${yy}`} x={x - w / 2} y={yy} width={w * 0.28} height={10} rx={2} fill={metalFill} />)
        out.push(<rect key={`b${yy}`} x={x - w * 0.18} y={yy + 2} width={w * 0.36} height={6} rx={2} fill={metalFill} opacity={0.75} />)
        out.push(<rect key={`c${yy}`} x={x + w * 0.22} y={yy} width={w * 0.28} height={10} rx={2} fill={metalFill} />)
      }
      return <g>{out}</g>
    }
    case 'leather':
      return band(
        v.strapColor ?? '#3a2416',
        <g stroke="#e8d5b0" strokeOpacity={0.35} strokeDasharray="3 3" fill="none">
          <line x1={x - w / 2 + 4} y1={0} x2={x - w / 2 + 4} y2={52} />
          <line x1={x + w / 2 - 4} y1={0} x2={x + w / 2 - 4} y2={52} />
          <line x1={x - w / 2 + 4} y1={128} x2={x - w / 2 + 4} y2={180} />
          <line x1={x + w / 2 - 4} y1={128} x2={x + w / 2 - 4} y2={180} />
        </g>,
      )
    case 'rubber':
    case 'resin':
      return band(
        v.strapColor ?? '#141416',
        <g fill="#000" opacity={0.35}>
          {[8, 22, 36, 138, 152, 166].map((yy) => (
            <rect key={yy} x={x - w / 2 + 4} y={yy} width={w - 8} height={4} rx={2} />
          ))}
        </g>,
      )
    case 'nato': {
      const cols = (v.strapColor ?? '#2b3a55,#8a1f2a,#2b3a55').split(',')
      const sw = w / cols.length
      return (
        <g>
          {cols.map((c, i) => (
            <g key={i} fill={c}>
              <rect x={x - w / 2 + i * sw} y={-4} width={sw} height={60} />
              <rect x={x - w / 2 + i * sw} y={124} width={sw} height={60} />
            </g>
          ))}
        </g>
      )
    }
    case 'mesh':
      return band(metalFill, <g stroke="#000" strokeOpacity={0.25}>{[4, 10, 16, 22, 28, 34, 40, 46, 130, 136, 142, 148, 154, 160, 166, 172].map((yy) => <line key={yy} x1={x - w / 2} y1={yy} x2={x + w / 2} y2={yy} />)}</g>)
    case 'chain': {
      const out: ReactNode[] = []
      for (let i = 0; i < 9; i++) {
        const t = i / 8
        const px = x - 8 - t * 90
        const py = 30 - Math.sin(t * Math.PI) * 26 + t * 8
        out.push(<ellipse key={i} cx={px} cy={py} rx={6} ry={4} fill="none" stroke={metalFill} strokeWidth={2.4} transform={`rotate(${-20 + t * 50} ${px} ${py})`} />)
      }
      return <g>{out}</g>
    }
    case 'none':
      return null
  }
}

function Bezel({ v, r }: { v: WatchV; r: number }) {
  const { x, y } = C
  const b = v.bezel ?? 'plain'
  if (b === 'plain') return null
  const [c1, c2] = v.insert ?? ['#111', undefined]
  const ring = r * 0.93
  const w = r * 0.14
  const ticks = (n: number, len: number, col: string, wide = 1.4) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n - Math.PI / 2
      return (
        <line
          key={i}
          x1={x + (ring - len) * Math.cos(a)}
          y1={y + (ring - len) * Math.sin(a)}
          x2={x + ring * Math.cos(a)}
          y2={y + ring * Math.sin(a)}
          stroke={col}
          strokeWidth={wide}
        />
      )
    })
  if (b === 'screws') {
    const n = v.case === 'octagon' ? 8 : v.case === 'square' ? 8 : 6
    return (
      <g>
        {Array.from({ length: n }, (_, i) => {
          const a = (i * 2 * Math.PI) / n + (v.case === 'square' ? Math.PI / 4 : Math.PI / n)
          const rr = v.case === 'square' ? r * 0.92 : r * 0.9
          return <polygon key={i} points={polyPoints(x + rr * Math.cos(a), y + rr * Math.sin(a), 3.4, 6)} fill="#f4f1ea" stroke="#555" strokeWidth={0.6} />
        })}
      </g>
    )
  }
  if (b === 'fluted') return <g>{ticks(60, w, '#fff8', 1)}</g>
  if (b === 'notched') return <g>{Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3; return <circle key={i} cx={x + ring * Math.cos(a)} cy={y + ring * Math.sin(a)} r={3} fill="#00000066" /> })}</g>
  const r2 = ring - w
  const arc = (from: number, to: number, col: string) => {
    const p = (a: number, rr: number) => `${x + rr * Math.cos(a)} ${y + rr * Math.sin(a)}`
    const large = to - from > Math.PI ? 1 : 0
    return <path d={`M${p(from, ring)}A${ring} ${ring} 0 ${large} 1 ${p(to, ring)}L${p(to, r2)}A${r2} ${r2} 0 ${large} 0 ${p(from, r2)}Z`} fill={col} />
  }
  return (
    <g>
      {b === 'gmt' && c2 ? (
        <>
          {arc(-Math.PI, 0, c1)}
          {arc(0, Math.PI, c2)}
        </>
      ) : (
        <circle cx={x} cy={y} r={ring - w / 2} fill="none" stroke={c1} strokeWidth={w} />
      )}
      {b === 'diver' || b === 'gmt' || b === 'h24' ? ticks(12, w * 0.6, '#f2eee4', 1.6) : null}
      {b === 'tachy' || b === 'hour' ? ticks(b === 'hour' ? 24 : 36, w * 0.5, '#f2eee4', 1) : null}
      {b === 'diver' ? <polygon points={`${x},${y - ring + w * 0.9} ${x - 4},${y - ring + 2} ${x + 4},${y - ring + 2}`} fill="#f7e9b8" /> : null}
    </g>
  )
}

function Numerals({ v, r }: { v: WatchV; r: number }) {
  const { x, y } = C
  const n = v.numerals ?? 'baton'
  const col = v.hands ?? '#f3efe6'
  const rr = r * 0.62
  if (n === 'none') return null
  if (n === 'arabic' || n === 'roman' || n === 'big') {
    const labels = n === 'roman' ? ['XII', 'III', 'VI', 'IX'] : ['12', '3', '6', '9']
    const fs = n === 'big' ? r * 0.26 : r * 0.18
    return (
      <g fill={col} fontFamily="Georgia, serif" fontWeight={700} fontSize={fs} textAnchor="middle" dominantBaseline="central">
        <text x={x} y={y - rr}>{labels[0]}</text>
        <text x={x + rr} y={y}>{labels[1]}</text>
        <text x={x} y={y + rr}>{labels[2]}</text>
        <text x={x - rr} y={y}>{labels[3]}</text>
      </g>
    )
  }
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6 - Math.PI / 2
        if (n === 'dots') return <circle key={i} cx={x + rr * Math.cos(a)} cy={y + rr * Math.sin(a)} r={i % 3 === 0 ? 3 : 2} fill={col} />
        const len = i % 3 === 0 ? r * 0.16 : r * 0.1
        return (
          <line
            key={i}
            x1={x + (rr - len / 2) * Math.cos(a)}
            y1={y + (rr - len / 2) * Math.sin(a)}
            x2={x + (rr + len / 2) * Math.cos(a)}
            y2={y + (rr + len / 2) * Math.sin(a)}
            stroke={col}
            strokeWidth={i % 3 === 0 ? 3 : 1.8}
          />
        )
      })}
    </g>
  )
}

function Dial({ v, r, g }: { v: WatchV; r: number; g: G }) {
  const { x, y } = C
  const e = v.extra
  const hands = v.hands ?? '#f3efe6'
  const sub = v.sub ?? 0
  const subs: [number, number][] = sub === 3 ? [[-0.42, 0], [0.42, 0], [0, 0.42]] : sub === 2 ? (v.case === 'big' ? [[0, -0.38], [0, 0.38]] : [[-0.4, 0], [0.4, 0]]) : []
  const lines: ReactNode[] = []
  if (e === 'guilloche') for (let i = 1; i < 6; i++) lines.push(<circle key={i} cx={x} cy={y} r={r * 0.12 * i} fill="none" stroke="#fff" strokeOpacity={0.12} />)
  if (e === 'waves') for (let i = -3; i < 4; i++) lines.push(<path key={i} d={`M${x - r} ${y + i * 9}q${r / 4} -5 ${r / 2} 0t${r / 2} 0t${r / 2} 0t${r / 2} 0`} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={2} />)
  if (e === 'stripes') for (let i = -4; i < 5; i++) lines.push(<line key={i} x1={x - r} y1={y + i * 7} x2={x + r} y2={y + i * 7} stroke="#000" strokeOpacity={0.25} strokeWidth={2} />)
  if (e === 'tapisserie') for (let i = -5; i < 6; i++) lines.push(<g key={i} stroke="#000" strokeOpacity={0.28}><line x1={x - r} y1={y + i * 6} x2={x + r} y2={y + i * 6} /><line x1={x + i * 6} y1={y - r} x2={x + i * 6} y2={y + r} /></g>)
  if (e === 'texture') for (let i = 0; i < 40; i++) lines.push(<circle key={i} cx={x + ((i * 37) % 60) - 30} cy={y + ((i * 53) % 60) - 30} r={1.2} fill="#fff" opacity={0.16} />)
  return (
    <g>
      <clipPath id={g('dial')}>{scaled(v.case, 0.8, '#000')}</clipPath>
      <g clipPath={`url(#${g('dial')})`}>
        {lines}
        {e === 'skeleton' ? (
          <g fill="none" stroke={METAL[v.metal][1]} strokeWidth={2.2} opacity={0.9}>
            <circle cx={x - 12} cy={y - 14} r={13} />
            <circle cx={x + 14} cy={y + 12} r={16} />
            <circle cx={x - 10} cy={y + 20} r={8} />
            <path d={`M${x - 30} ${y - 34}L${x + 30} ${y + 34}M${x + 30} ${y - 34}L${x - 30} ${y + 34}`} strokeOpacity={0.5} />
          </g>
        ) : null}
      </g>
      {e === 'grille' ? (
        <g stroke={METAL[v.metal][1]} strokeWidth={2} opacity={0.85}>
          {[-20, 0, 20].map((d) => (
            <line key={`v${d}`} x1={x + d} y1={y - r * 0.72} x2={x + d} y2={y + r * 0.72} />
          ))}
          {[-20, 0, 20].map((d) => (
            <line key={`h${d}`} x1={x - r * 0.72} y1={y + d} x2={x + r * 0.72} y2={y + d} />
          ))}
        </g>
      ) : null}
      {v.case !== 'digital' ? <Numerals v={v} r={r} /> : null}
      {e === 'triangle' ? <polygon points={`${x},${y - r * 0.5} ${x - 6},${y - r * 0.68} ${x + 6},${y - r * 0.68}`} fill={hands} /> : null}
      {e === 'star' ? <polygon points={starPoints(x, y - r * 0.3, 7)} fill="#c92a2a" /> : null}
      {subs.map(([dx, dy], i) => (
        <g key={i}>
          <circle cx={x + dx * r} cy={y + dy * r} r={r * 0.2} fill={v.subColor ?? '#00000055'} stroke={hands} strokeOpacity={0.5} />
          <line x1={x + dx * r} y1={y + dy * r} x2={x + dx * r} y2={y + dy * r - r * 0.15} stroke={hands} strokeWidth={1.2} />
        </g>
      ))}
      {e === 'moon' ? (
        <g>
          <path d={`M${x - 14} ${y + r * 0.44}a14 14 0 0 1 28 0z`} fill="#10214a" />
          <circle cx={x + 3} cy={y + r * 0.36} r={5} fill="#f2d98a" />
        </g>
      ) : null}
      {e === 'tourbillon' ? (
        <g>
          <circle cx={x} cy={y + r * 0.42} r={r * 0.2} fill="#0008" stroke={METAL[v.metal][0]} strokeWidth={1.4} />
          <path d={`M${x - 7} ${y + r * 0.42}h14M${x} ${y + r * 0.42 - 7}v14`} stroke={METAL[v.metal][0]} strokeWidth={1.4} />
        </g>
      ) : null}
      {e === 'bigdate' ? (
        <g>
          <rect x={x + 6} y={y - 30} width={11} height={14} fill="#fff" stroke="#333" />
          <rect x={x + 18} y={y - 30} width={11} height={14} fill="#fff" stroke="#333" />
        </g>
      ) : null}
      {v.date ? <rect x={x + r * 0.46} y={y - 5} width={r * 0.2} height={10} fill="#fbfaf5" stroke="#333" strokeWidth={0.6} /> : null}
      {v.day ? <rect x={x - r * 0.28} y={y - r * 0.62} width={r * 0.56} height={10} rx={2} fill="#fbfaf5" stroke="#333" strokeWidth={0.6} /> : null}
      {v.case === 'digital' ? (
        <g>
          <rect x={x - 34} y={y - 22} width={68} height={40} rx={4} fill="#a7b39a" />
          <text x={x} y={y + 6} textAnchor="middle" fontFamily="monospace" fontWeight={700} fontSize={20} fill="#1f261a">
            10:10
          </text>
        </g>
      ) : (
        <g strokeLinecap="round">
          <line x1={x} y1={y} x2={x - r * 0.34} y2={y - r * 0.3} stroke={hands} strokeWidth={4} />
          <line x1={x} y1={y} x2={x + r * 0.42} y2={y - r * 0.46} stroke={hands} strokeWidth={3} />
          {e === 'lightning' ? (
            <polyline points={`${x},${y} ${x - 4},${y + r * 0.2} ${x + 4},${y + r * 0.3} ${x},${y + r * 0.6}`} fill="none" stroke={v.accent ?? '#ff7a1a'} strokeWidth={1.8} />
          ) : (
            <line x1={x} y1={y + r * 0.14} x2={x} y2={y - r * 0.64} stroke={v.accent ?? hands} strokeWidth={1.4} />
          )}
          <circle cx={x} cy={y} r={3} fill={v.accent ?? hands} />
        </g>
      )}
    </g>
  )
}

export function WatchArt({ v, g }: { v: WatchV; g: G }) {
  const { x, y } = C
  const m = `url(#${g('m')})`
  const r = radius(v.case)
  return (
    <Scene g={g} tone={v.tone ?? 'warm'}>
      <defs>
        <MetalRamp id={g('m')} metal={v.metal} />
      </defs>
      <Strap v={v} metalFill={m} />
      {v.case === 'pocket' ? (
        <g>
          <rect x={x - 7} y={y - 70} width={14} height={14} rx={3} fill={m} />
          <circle cx={x} cy={y - 76} r={10} fill="none" stroke={m} strokeWidth={4} />
        </g>
      ) : v.case !== 'digital' ? (
        <rect x={x + r - 2} y={y - 6} width={10} height={12} rx={2} fill={m} />
      ) : null}
      {v.extra === 'crownguard' ? <path d={`M${x + r - 4} ${y - 16}q18 16 0 32`} fill="none" stroke={m} strokeWidth={6} /> : null}
      {v.case === 'rect' ? (
        <g fill={m}>
          <rect x={x - 38} y={y - 54} width={8} height={108} rx={3} />
          <rect x={x + 30} y={y - 54} width={8} height={108} rx={3} />
        </g>
      ) : null}
      {caseShape(v.case, m, '#00000055', 1)}
      {v.bezel && v.bezel !== 'plain' && v.bezel !== 'screws' && v.bezel !== 'notched' ? scaled(v.case, 0.94, '#00000022') : null}
      {scaled(v.case, 0.8, v.dial, '#00000066', 1)}
      {v.extra === 'gadroon' ? (
        <g stroke="#00000055" strokeWidth={1.4}>
          {[-3, -1, 1, 3].map((i) => (
            <line key={i} x1={x - 26} y1={y + i * 3 - 44} x2={x + 26} y2={y + i * 3 - 44} />
          ))}
          {[-3, -1, 1, 3].map((i) => (
            <line key={`b${i}`} x1={x - 26} y1={y + i * 3 + 44} x2={x + 26} y2={y + i * 3 + 44} />
          ))}
        </g>
      ) : null}
      <Bezel v={v} r={r} />
      <Dial v={v} r={r * 0.8} g={g} />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.45} rx={r * 0.4} ry={r * 0.14} fill="#fff" opacity={0.1} transform={`rotate(-24 ${x} ${y})`} />
    </Scene>
  )
}
