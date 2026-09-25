import type { ReactNode } from 'react'
import { MetalRamp, Scene, starPoints, type G } from './scene'

export type PaintScene =
  | 'starry'
  | 'mona'
  | 'supper'
  | 'scream'
  | 'impression'
  | 'lilies'
  | 'dali'
  | 'guernica'
  | 'avignon'
  | 'pearl'
  | 'venus'
  | 'adam'
  | 'caravaggio'
  | 'nightwatch'
  | 'kiss'
  | 'pop'
  | 'square'
  | 'kandinsky'
  | 'seurat'
  | 'poster'
  | 'engraving'
  | 'watercolor'
  | 'landscape'
  | 'stilllife'
  | 'portrait'
  | 'wave'
  | 'sunflowers'
  | 'temeraire'
  | 'hunters'

export type Frame = 'ornate' | 'gold' | 'black' | 'wood' | 'mat' | 'fresco'

export type PaintV = { k: 'paint'; scene: PaintScene; frame: Frame; portrait?: boolean }

export type Box = { x: number; y: number; w: number; h: number }

/** Composition sketches — stylised impressions of the works, not reproductions. */
export function sceneArt(s: PaintScene, b: Box): ReactNode {
  const X = (f: number) => b.x + f * b.w
  const Y = (f: number) => b.y + f * b.h
  type Extra = { key?: string | number; opacity?: number; transform?: string }
  const R = (fx: number, fy: number, fw: number, fh: number, fill: string, { key, ...extra }: Extra = {}) => (
    <rect key={key} x={X(fx)} y={Y(fy)} width={fw * b.w} height={fh * b.h} fill={fill} {...extra} />
  )
  const E = (fx: number, fy: number, rx: number, ry: number, fill: string, { key, ...extra }: Extra = {}) => (
    <ellipse key={key} cx={X(fx)} cy={Y(fy)} rx={rx * b.w} ry={ry * b.h} fill={fill} {...extra} />
  )
  switch (s) {
    case 'starry':
      return (
        <g>
          {R(0, 0, 1, 1, '#1b3a78')}
          {[0.18, 0.3, 0.42].map((fy, i) => (
            <path key={i} d={`M${X(0)} ${Y(fy)}q${b.w * 0.2} ${-b.h * 0.14} ${b.w * 0.4} 0t${b.w * 0.4} 0t${b.w * 0.3} 0`} fill="none" stroke={i === 1 ? '#9ec3f0' : '#4f7fc8'} strokeWidth={4} />
          ))}
          <circle cx={X(0.48)} cy={Y(0.3)} r={b.h * 0.1} fill="none" stroke="#dfe9ff" strokeWidth={3} />
          {[[0.15, 0.12], [0.32, 0.2], [0.66, 0.14], [0.78, 0.3], [0.58, 0.44]].map(([fx, fy], i) => (
            <g key={i}>
              <circle cx={X(fx)} cy={Y(fy)} r={b.h * 0.06} fill="#f2d24b" opacity={0.35} />
              <circle cx={X(fx)} cy={Y(fy)} r={b.h * 0.03} fill="#f7e27a" />
            </g>
          ))}
          <circle cx={X(0.88)} cy={Y(0.14)} r={b.h * 0.08} fill="#f5c93a" />
          <path d={`M${X(0)} ${Y(0.78)}Q${X(0.4)} ${Y(0.62)} ${X(1)} ${Y(0.74)}V${Y(1)}H${X(0)}Z`} fill="#243a5c" />
          <path d={`M${X(0.12)} ${Y(1)}Q${X(0.08)} ${Y(0.5)} ${X(0.18)} ${Y(0.18)}Q${X(0.24)} ${Y(0.55)} ${X(0.26)} ${Y(1)}Z`} fill="#16241c" />
          {[0.45, 0.55, 0.65, 0.75].map((fx) => R(fx, 0.82, 0.04, 0.05, '#f2d24b', { key: fx }))}
        </g>
      )
    case 'mona':
      return (
        <g>
          {R(0, 0, 1, 1, '#6b6a3e')}
          <path d={`M${X(0)} ${Y(0.45)}Q${X(0.2)} ${Y(0.3)} ${X(0.3)} ${Y(0.42)}L${X(0.7)} ${Y(0.38)}Q${X(0.85)} ${Y(0.28)} ${X(1)} ${Y(0.4)}V${Y(0.55)}H${X(0)}Z`} fill="#8b8a5c" />
          <path d={`M${X(0.08)} ${Y(0.55)}Q${X(0.2)} ${Y(0.5)} ${X(0.24)} ${Y(0.62)}`} stroke="#b19a5a" strokeWidth={3} fill="none" />
          <path d={`M${X(0.14)} ${Y(1)}Q${X(0.18)} ${Y(0.6)} ${X(0.5)} ${Y(0.56)}Q${X(0.82)} ${Y(0.6)} ${X(0.86)} ${Y(1)}Z`} fill="#2a2618" />
          {E(0.5, 0.36, 0.2, 0.2, '#2a2014')}
          {E(0.5, 0.36, 0.14, 0.16, '#d7b27a')}
          {R(0.4, 0.5, 0.2, 0.1, '#d7b27a')}
          <path d={`M${X(0.44)} ${Y(0.43)}q${b.w * 0.06} ${b.h * 0.02} ${b.w * 0.12} 0`} stroke="#7a5230" strokeWidth={1.2} fill="none" />
          {E(0.42, 0.9, 0.12, 0.05, '#d7b27a')}
          {E(0.6, 0.88, 0.1, 0.05, '#d7b27a')}
        </g>
      )
    case 'supper':
      return (
        <g>
          {R(0, 0, 1, 1, '#b39b6b')}
          <polygon points={`${X(0)},${Y(0)} ${X(0.35)},${Y(0.25)} ${X(0.35)},${Y(0.6)} ${X(0)},${Y(0.9)}`} fill="#8c7650" />
          <polygon points={`${X(1)},${Y(0)} ${X(0.65)},${Y(0.25)} ${X(0.65)},${Y(0.6)} ${X(1)},${Y(0.9)}`} fill="#8c7650" />
          {R(0.35, 0.25, 0.3, 0.35, '#c9b88f')}
          {R(0.44, 0.3, 0.12, 0.2, '#e8e3d1')}
          {R(0.04, 0.62, 0.92, 0.1, '#efe7d6')}
          {Array.from({ length: 13 }, (_, i) => {
            const fx = 0.1 + i * 0.066
            const c = i === 6 ? '#b03a2e' : ['#6d4f7a', '#4a6a7a', '#a5703a', '#5a7a4a'][i % 4]
            return (
              <g key={i}>
                {E(fx, 0.5, 0.028, 0.07, c)}
                {E(fx, 0.4, 0.018, 0.035, '#d9b48a')}
              </g>
            )
          })}
          {R(0.04, 0.72, 0.92, 0.28, '#5d4a33')}
        </g>
      )
    case 'scream':
      return (
        <g>
          {R(0, 0, 1, 1, '#e0602b')}
          {[0.1, 0.2, 0.3].map((fy, i) => (
            <path key={i} d={`M${X(0)} ${Y(fy)}q${b.w * 0.25} ${b.h * 0.1} ${b.w * 0.5} 0t${b.w * 0.5} 0`} fill="none" stroke={['#f2a23a', '#c9342a', '#f4c552'][i]} strokeWidth={6} />
          ))}
          <path d={`M${X(0.4)} ${Y(0.45)}q${b.w * 0.3} ${b.h * 0.1} ${b.w * 0.6} ${-b.h * 0.02}V${Y(1)}H${X(0.5)}Z`} fill="#2b3f6b" />
          <polygon points={`${X(0)},${Y(0.62)} ${X(0.6)},${Y(0.35)} ${X(0.66)},${Y(0.4)} ${X(0.15)},${Y(1)} ${X(0)},${Y(1)}`} fill="#8a5a2a" />
          <line x1={X(0)} y1={Y(0.75)} x2={X(0.62)} y2={Y(0.37)} stroke="#4a2a14" strokeWidth={2} />
          <path d={`M${X(0.34)} ${Y(1)}Q${X(0.3)} ${Y(0.8)} ${X(0.38)} ${Y(0.7)}Q${X(0.46)} ${Y(0.8)} ${X(0.44)} ${Y(1)}Z`} fill="#2a2a2a" />
          {E(0.39, 0.62, 0.05, 0.1, '#e4d0a0')}
          {E(0.38, 0.62, 0.012, 0.03, '#2a2a2a')}
        </g>
      )
    case 'impression':
      return (
        <g>
          {R(0, 0, 1, 1, '#6f8698')}
          {R(0, 0, 1, 0.45, '#8ea0a8')}
          <circle cx={X(0.6)} cy={Y(0.34)} r={b.h * 0.07} fill="#f0612b" />
          {[0.5, 0.58, 0.66, 0.74].map((fy, i) => (
            <line key={i} x1={X(0.55)} y1={Y(fy)} x2={X(0.65)} y2={Y(fy)} stroke="#f0612b" strokeWidth={3} opacity={0.8} />
          ))}
          {[0.15, 0.3, 0.8, 0.9].map((fx, i) => (
            <line key={i} x1={X(fx)} y1={Y(0.1)} x2={X(fx)} y2={Y(0.45)} stroke="#566a78" strokeWidth={2} />
          ))}
          {E(0.3, 0.72, 0.06, 0.03, '#23313d')}
          {E(0.45, 0.84, 0.05, 0.025, '#23313d')}
          {E(0.18, 0.62, 0.04, 0.02, '#23313d')}
        </g>
      )
    case 'lilies':
      return (
        <g>
          {R(0, 0, 1, 1, '#3f6b7a')}
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1={X(0.1 * i)} y1={Y(0)} x2={X(0.1 * i + 0.05)} y2={Y(1)} stroke="#6f9f8a" strokeWidth={3} opacity={0.4} />
          ))}
          {[[0.2, 0.3], [0.5, 0.5], [0.8, 0.28], [0.3, 0.75], [0.72, 0.78]].map(([fx, fy], i) => (
            <g key={i}>
              {E(fx, fy, 0.1, 0.06, '#5f8a3e')}
              {E(fx + 0.02, fy - 0.01, 0.025, 0.02, i % 2 ? '#f2b2c4' : '#f8e3ea')}
            </g>
          ))}
        </g>
      )
    case 'dali':
      return (
        <g>
          {R(0, 0, 1, 0.6, '#d9a45a')}
          {R(0, 0.6, 1, 0.4, '#5a4128')}
          {R(0.7, 0.3, 0.3, 0.3, '#9a7a4a')}
          <path d={`M${X(0.12)} ${Y(0.7)}L${X(0.12)} ${Y(0.35)}L${X(0.4)} ${Y(0.3)}`} stroke="#3a2a1a" strokeWidth={3} fill="none" />
          <path d={`M${X(0.3)} ${Y(0.3)}q${b.w * 0.1} 0 ${b.w * 0.1} ${b.h * 0.08}q0 ${b.h * 0.15} ${-b.w * 0.04} ${b.h * 0.22}q-${b.w * 0.02} -${b.h * 0.1} -${b.w * 0.08} -${b.h * 0.2}z`} fill="#b9c6d8" stroke="#6b7a8a" />
          <path d={`M${X(0.45)} ${Y(0.66)}q${b.w * 0.14} -${b.h * 0.04} ${b.w * 0.2} 0q-${b.w * 0.02} ${b.h * 0.1} -${b.w * 0.12} ${b.h * 0.12}z`} fill="#c4cfdf" stroke="#6b7a8a" />
          <path d={`M${X(0.58)} ${Y(0.84)}q${b.w * 0.14} -${b.h * 0.08} ${b.w * 0.24} ${b.h * 0.02}q-${b.w * 0.1} ${b.h * 0.1} -${b.w * 0.24} ${b.h * 0.04}z`} fill="#e9d4a6" stroke="#8a6a3a" />
          {E(0.2, 0.8, 0.08, 0.04, '#c96a3a')}
        </g>
      )
    case 'guernica':
      return (
        <g>
          {R(0, 0, 1, 1, '#9a9a96')}
          <polygon points={`${X(0)},${Y(0)} ${X(0.3)},${Y(0)} ${X(0.2)},${Y(1)} ${X(0)},${Y(1)}`} fill="#3a3a3a" />
          <polygon points={`${X(0.35)},${Y(0.2)} ${X(0.65)},${Y(0.3)} ${X(0.55)},${Y(0.8)} ${X(0.3)},${Y(0.7)}`} fill="#e6e6e0" />
          <polygon points={`${X(0.7)},${Y(0)} ${X(1)},${Y(0.2)} ${X(1)},${Y(1)} ${X(0.8)},${Y(1)}`} fill="#5a5a58" />
          <path d={`M${X(0.42)} ${Y(0.1)}l${b.w * 0.04} ${b.h * 0.08}l${b.w * 0.04} -${b.h * 0.08}z`} fill="#f2f2e8" />
          <line x1={X(0.46)} y1={Y(0.03)} x2={X(0.46)} y2={Y(0.1)} stroke="#222" />
          {E(0.46, 0.45, 0.05, 0.08, '#2a2a2a')}
          {E(0.15, 0.3, 0.04, 0.06, '#cfcfc8')}
          <polyline points={`${X(0.2)},${Y(0.9)} ${X(0.4)},${Y(0.85)} ${X(0.6)},${Y(0.92)} ${X(0.85)},${Y(0.84)}`} stroke="#1a1a1a" strokeWidth={3} fill="none" />
          {E(0.85, 0.35, 0.05, 0.07, '#e6e6e0')}
        </g>
      )
    case 'avignon':
      return (
        <g>
          {R(0, 0, 1, 1, '#4a6c9c')}
          {R(0, 0, 0.25, 1, '#b86a4a')}
          {[0.14, 0.34, 0.52, 0.7, 0.88].map((fx, i) => (
            <g key={i}>
              <polygon points={`${X(fx - 0.07)},${Y(1)} ${X(fx - 0.05)},${Y(0.35)} ${X(fx + 0.05)},${Y(0.35)} ${X(fx + 0.08)},${Y(1)}`} fill={i === 4 ? '#c98a6a' : '#e0a88a'} />
              <polygon points={`${X(fx - 0.04)},${Y(0.18)} ${X(fx + 0.04)},${Y(0.16)} ${X(fx + 0.05)},${Y(0.32)} ${X(fx - 0.03)},${Y(0.34)}`} fill={i >= 3 ? '#7a4a3a' : '#e8b89a'} />
            </g>
          ))}
          <polygon points={`${X(0.4)},${Y(0.9)} ${X(0.55)},${Y(0.84)} ${X(0.52)},${Y(0.98)}`} fill="#e6e0d0" />
        </g>
      )
    case 'pearl':
      return (
        <g>
          {R(0, 0, 1, 1, '#141210')}
          <path d={`M${X(0.2)} ${Y(1)}Q${X(0.3)} ${Y(0.68)} ${X(0.55)} ${Y(0.68)}Q${X(0.8)} ${Y(0.72)} ${X(0.86)} ${Y(1)}Z`} fill="#b8883a" />
          {E(0.52, 0.48, 0.2, 0.2, '#e8c9a0')}
          <path d={`M${X(0.3)} ${Y(0.42)}Q${X(0.42)} ${Y(0.14)} ${X(0.66)} ${Y(0.24)}Q${X(0.74)} ${Y(0.34)} ${X(0.64)} ${Y(0.38)}Q${X(0.46)} ${Y(0.3)} ${X(0.34)} ${Y(0.46)}Z`} fill="#2f5aa0" />
          <path d={`M${X(0.62)} ${Y(0.3)}Q${X(0.78)} ${Y(0.36)} ${X(0.72)} ${Y(0.66)}L${X(0.66)} ${Y(0.64)}Z`} fill="#e8c24a" />
          <circle cx={X(0.44)} cy={Y(0.62)} r={b.w * 0.035} fill="#e8eef4" />
          <circle cx={X(0.435)} cy={Y(0.61)} r={b.w * 0.012} fill="#fff" />
          {E(0.58, 0.46, 0.02, 0.02, '#3a2a20')}
          {E(0.6, 0.58, 0.04, 0.015, '#b3524a')}
        </g>
      )
    case 'venus':
      return (
        <g>
          {R(0, 0, 1, 0.6, '#9fc4c6')}
          {R(0, 0.6, 1, 0.4, '#6e9a9a')}
          {[0.66, 0.74, 0.82].map((fy) => (
            <path key={fy} d={`M${X(0)} ${Y(fy)}l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4l${b.w * 0.05} -4l${b.w * 0.05} 4`} stroke="#e6f0ea" fill="none" />
          ))}
          <path d={`M${X(0.34)} ${Y(0.95)}Q${X(0.5)} ${Y(0.7)} ${X(0.66)} ${Y(0.95)}Z`} fill="#e9d8b8" />
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={X(0.5)} y1={Y(0.94)} x2={X(0.36 + i * 0.056)} y2={Y(0.8)} stroke="#b89a6a" />
          ))}
          <path d={`M${X(0.46)} ${Y(0.84)}Q${X(0.44)} ${Y(0.5)} ${X(0.5)} ${Y(0.34)}Q${X(0.56)} ${Y(0.5)} ${X(0.54)} ${Y(0.84)}Z`} fill="#f2dcc4" />
          {E(0.5, 0.28, 0.035, 0.07, '#f2dcc4')}
          <path d={`M${X(0.47)} ${Y(0.24)}Q${X(0.38)} ${Y(0.5)} ${X(0.44)} ${Y(0.7)}`} stroke="#c9873a" strokeWidth={5} fill="none" />
          {E(0.14, 0.3, 0.08, 0.1, '#6a8ab0')}
          {E(0.86, 0.5, 0.06, 0.18, '#d6809a')}
        </g>
      )
    case 'adam':
      return (
        <g>
          {R(0, 0, 1, 1, '#d8c7a4')}
          {E(0.82, 0.3, 0.2, 0.24, '#a8443a', { opacity: 0.85 })}
          <path d={`M${X(0)} ${Y(0.62)}Q${X(0.25)} ${Y(0.5)} ${X(0.44)} ${Y(0.56)}`} stroke="#d59a74" strokeWidth={10} fill="none" strokeLinecap="round" />
          <path d={`M${X(1)} ${Y(0.48)}Q${X(0.75)} ${Y(0.48)} ${X(0.56)} ${Y(0.52)}`} stroke="#d59a74" strokeWidth={10} fill="none" strokeLinecap="round" />
          <line x1={X(0.44)} y1={Y(0.56)} x2={X(0.48)} y2={Y(0.56)} stroke="#c68a64" strokeWidth={3} strokeLinecap="round" />
          <line x1={X(0.52)} y1={Y(0.52)} x2={X(0.56)} y2={Y(0.52)} stroke="#c68a64" strokeWidth={3} strokeLinecap="round" />
          <path d={`M${X(0)} ${Y(0.85)}Q${X(0.3)} ${Y(0.74)} ${X(0.5)} ${Y(1)}H${X(0)}Z`} fill="#8b7a5a" />
        </g>
      )
    case 'caravaggio':
      return (
        <g>
          {R(0, 0, 1, 1, '#16110c')}
          <polygon points={`${X(1)},${Y(0)} ${X(0.75)},${Y(0)} ${X(0.2)},${Y(0.7)} ${X(0.5)},${Y(0.8)}`} fill="#c9a25a" opacity={0.18} />
          {R(0.1, 0.62, 0.6, 0.1, '#4a3420')}
          {[0.2, 0.33, 0.46, 0.6].map((fx, i) => (
            <g key={i}>
              {E(fx, 0.52, 0.05, 0.1, ['#8a3a2a', '#3a4a6a', '#d0b070', '#5a3a5a'][i])}
              {E(fx, 0.36, 0.035, 0.06, '#e0b890')}
            </g>
          ))}
          <g>
            {E(0.86, 0.5, 0.05, 0.14, '#3a2a1a')}
            {E(0.86, 0.3, 0.035, 0.06, '#c49a74')}
            <line x1={X(0.83)} y1={Y(0.45)} x2={X(0.66)} y2={Y(0.4)} stroke="#c49a74" strokeWidth={3} />
          </g>
        </g>
      )
    case 'nightwatch':
      return (
        <g>
          {R(0, 0, 1, 1, '#2a1f14')}
          {R(0, 0.75, 1, 0.25, '#3a2c1c')}
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              {E(0.06 + i * 0.09, 0.52, 0.035, 0.14, '#1a140e')}
              {E(0.06 + i * 0.09, 0.34, 0.022, 0.04, '#8a6a4a')}
              <line x1={X(0.06 + i * 0.09)} y1={Y(0.1)} x2={X(0.08 + i * 0.09)} y2={Y(0.46)} stroke="#4a3a2a" />
            </g>
          ))}
          {E(0.48, 0.58, 0.05, 0.2, '#111')}
          {E(0.6, 0.58, 0.05, 0.2, '#e8cc7a')}
          {E(0.34, 0.6, 0.03, 0.1, '#f2d890')}
        </g>
      )
    case 'kiss':
      return (
        <g>
          {R(0, 0, 1, 1, '#6a5a2a')}
          {Array.from({ length: 40 }, (_, i) => (
            <circle key={i} cx={X((i * 0.137) % 1)} cy={Y((i * 0.311) % 1)} r={1.4} fill="#d9b84a" opacity={0.6} />
          ))}
          <path d={`M${X(0.3)} ${Y(1)}Q${X(0.26)} ${Y(0.3)} ${X(0.5)} ${Y(0.12)}Q${X(0.74)} ${Y(0.3)} ${X(0.7)} ${Y(1)}Z`} fill="#d4a93a" />
          {Array.from({ length: 8 }, (_, i) => R(0.36 + (i % 2) * 0.08, 0.3 + i * 0.08, 0.06, 0.05, i % 3 ? '#1e1e1e' : '#f2f2e8', { key: i }))}
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={`c${i}`} cx={X(0.58 + (i % 2) * 0.05)} cy={Y(0.45 + i * 0.08)} r={b.w * 0.022} fill={['#c0392b', '#2e86c1', '#7d3c98'][i % 3]} />
          ))}
          {E(0.46, 0.2, 0.05, 0.06, '#e8c9a0')}
          {E(0.55, 0.26, 0.04, 0.05, '#e8c9a0')}
          {R(0, 0.9, 1, 0.1, '#5a7a3a')}
        </g>
      )
    case 'pop':
      return (
        <g>
          {[['#f2b8d2', '#f5d04a'], ['#6ec8e8', '#f07a3a'], ['#f5d04a', '#e0507a'], ['#8ad06a', '#6a5ae0']].map(([bg, hair], i) => {
            const fx = (i % 2) * 0.5
            const fy = Math.floor(i / 2) * 0.5
            return (
              <g key={i}>
                {R(fx, fy, 0.5, 0.5, bg)}
                {E(fx + 0.25, fy + 0.2, 0.14, 0.14, hair)}
                {E(fx + 0.25, fy + 0.3, 0.09, 0.14, '#f2c7a4')}
                {E(fx + 0.25, fy + 0.38, 0.03, 0.02, '#d0243a')}
                {E(fx + 0.22, fy + 0.28, 0.012, 0.012, '#2a6ab0')}
                {E(fx + 0.28, fy + 0.28, 0.012, 0.012, '#2a6ab0')}
              </g>
            )
          })}
        </g>
      )
    case 'square':
      return (
        <g>
          {R(0, 0, 1, 1, '#ece6d8')}
          {R(0.16, 0.14, 0.68, 0.72, '#141414')}
          <path d={`M${X(0.2)} ${Y(0.3)}l${b.w * 0.1} ${b.h * 0.05}M${X(0.6)} ${Y(0.7)}l${b.w * 0.08} -${b.h * 0.03}`} stroke="#3a3a36" strokeWidth={1} />
        </g>
      )
    case 'kandinsky':
      return (
        <g>
          {R(0, 0, 1, 1, '#eee6d2')}
          <circle cx={X(0.22)} cy={Y(0.3)} r={b.h * 0.2} fill="#1d1d24" />
          <circle cx={X(0.22)} cy={Y(0.3)} r={b.h * 0.12} fill="#b43a4a" />
          <circle cx={X(0.22)} cy={Y(0.3)} r={b.h * 0.06} fill="#f2c94a" />
          <polygon points={`${X(0.5)},${Y(0.8)} ${X(0.66)},${Y(0.2)} ${X(0.74)},${Y(0.84)}`} fill="#2e5aa0" opacity={0.8} />
          {[0.2, 0.3, 0.4, 0.5].map((fy) => (
            <line key={fy} x1={X(0.4)} y1={Y(fy)} x2={X(0.96)} y2={Y(fy + 0.25)} stroke="#1d1d24" strokeWidth={1.6} />
          ))}
          <circle cx={X(0.84)} cy={Y(0.22)} r={b.h * 0.07} fill="#e2863a" />
          {R(0.1, 0.72, 0.28, 0.06, '#1d1d24', { transform: `rotate(-12 ${X(0.24)} ${Y(0.75)})` })}
          <path d={`M${X(0.05)} ${Y(0.6)}l${b.w * 0.1} ${b.h * 0.2}l${b.w * 0.1} -${b.h * 0.2}`} stroke="#6a3a8a" strokeWidth={2} fill="none" />
        </g>
      )
    case 'seurat':
      return (
        <g>
          {R(0, 0, 1, 1, '#8fb07a')}
          {R(0, 0, 1, 0.3, '#b9c9a8')}
          {R(0, 0.3, 0.3, 0.12, '#6f9ab0')}
          {Array.from({ length: 70 }, (_, i) => (
            <circle key={i} cx={X((i * 0.173) % 1)} cy={Y(0.3 + ((i * 0.37) % 0.7))} r={1.3} fill={i % 3 ? '#c9d88a' : '#4a7a4a'} opacity={0.7} />
          ))}
          {[[0.62, 0.55, '#1f2a3a'], [0.72, 0.52, '#2a1f2a'], [0.2, 0.7, '#e6d8b8'], [0.42, 0.62, '#b3503a']].map(([fx, fy, c], i) => (
            <g key={i}>
              {E(fx as number, fy as number, 0.03, 0.12, c as string)}
              {E(fx as number, (fy as number) - 0.16, 0.015, 0.03, '#d8b890')}
            </g>
          ))}
          <path d={`M${X(0.66)} ${Y(0.32)}a${b.w * 0.06} ${b.h * 0.05} 0 0 1 ${b.w * 0.12} 0z`} fill="#b3503a" />
          <path d={`M${X(0.14)} ${Y(0.48)}a${b.w * 0.05} ${b.h * 0.04} 0 0 1 ${b.w * 0.1} 0z`} fill="#e6d8b8" />
        </g>
      )
    case 'poster':
      return (
        <g>
          {R(0, 0, 1, 1, '#e8d6b0')}
          <circle cx={X(0.5)} cy={Y(0.34)} r={b.w * 0.3} fill="#d9a55a" />
          <circle cx={X(0.5)} cy={Y(0.34)} r={b.w * 0.3} fill="none" stroke="#6a4a2a" strokeWidth={2} />
          <path d={`M${X(0.3)} ${Y(0.9)}Q${X(0.34)} ${Y(0.46)} ${X(0.5)} ${Y(0.44)}Q${X(0.66)} ${Y(0.46)} ${X(0.7)} ${Y(0.9)}Z`} fill="#6f8a6a" />
          {E(0.5, 0.33, 0.1, 0.1, '#f0d4b4')}
          <path d={`M${X(0.38)} ${Y(0.3)}Q${X(0.3)} ${Y(0.5)} ${X(0.36)} ${Y(0.6)}M${X(0.62)} ${Y(0.3)}Q${X(0.7)} ${Y(0.5)} ${X(0.64)} ${Y(0.6)}`} stroke="#a8502a" strokeWidth={6} fill="none" />
          {R(0.08, 0.9, 0.84, 0.07, '#6a4a2a')}
          {R(0.2, 0.92, 0.6, 0.02, '#e8d6b0')}
        </g>
      )
    case 'engraving':
      return (
        <g>
          {R(0, 0, 1, 1, '#ece2cc')}
          {Array.from({ length: 16 }, (_, i) => (
            <line key={i} x1={X(0)} y1={Y(0.62 + i * 0.024)} x2={X(1)} y2={Y(0.62 + i * 0.024)} stroke="#3a3024" strokeWidth={0.6} />
          ))}
          {[0.25, 0.6].map((fx, s) => (
            <g key={s} stroke="#2a2218" fill="none">
              <path d={`M${X(fx - 0.14)} ${Y(0.62)}Q${X(fx)} ${Y(0.72)} ${X(fx + 0.14)} ${Y(0.62)}Z`} fill="#3a3024" />
              <line x1={X(fx)} y1={Y(0.62)} x2={X(fx)} y2={Y(0.12)} strokeWidth={1.4} />
              <line x1={X(fx + 0.06)} y1={Y(0.62)} x2={X(fx + 0.06)} y2={Y(0.24)} />
              {[0.2, 0.34, 0.48].map((fy) => (
                <path key={fy} d={`M${X(fx - 0.07)} ${Y(fy)}Q${X(fx)} ${Y(fy + 0.06)} ${X(fx + 0.07)} ${Y(fy)}V${Y(fy + 0.1)}H${X(fx - 0.07)}Z`} fill="#f4ecdc" strokeWidth={0.8} />
              ))}
            </g>
          ))}
          {R(0.8, 0.44, 0.2, 0.18, '#5a4a38')}
          {R(0.84, 0.32, 0.06, 0.12, '#5a4a38')}
        </g>
      )
    case 'watercolor':
      return (
        <g>
          {R(0, 0, 1, 1, '#f6efe2')}
          {E(0.3, 0.3, 0.3, 0.2, '#a9c7e0', { opacity: 0.5 })}
          {R(0.08, 0.3, 0.3, 0.6, '#d8b894', { opacity: 0.7 })}
          {R(0.62, 0.22, 0.3, 0.68, '#c9a0a0', { opacity: 0.6 })}
          <path d={`M${X(0.08)} ${Y(0.46)}h${b.w * 0.3}l-${b.w * 0.04} ${b.h * 0.08}h-${b.w * 0.22}z`} fill="#c0392b" opacity={0.75} />
          {[0.12, 0.2, 0.28].map((fx) => E(fx, 0.78, 0.025, 0.03, '#6a5a4a', { key: fx, opacity: 0.6 }))}
          {R(0, 0.9, 1, 0.1, '#b0a898', { opacity: 0.5 })}
        </g>
      )
    case 'landscape':
      return (
        <g>
          {R(0, 0, 1, 1, '#c9b27a')}
          {R(0, 0, 1, 0.5, '#a9b6a0')}
          {E(0.5, 0.52, 0.3, 0.06, '#e8d8a8', { opacity: 0.7 })}
          {[0.1, 0.22, 0.78, 0.9].map((fx, i) => (
            <g key={i}>
              <rect x={X(fx - 0.01)} y={Y(0.5)} width={b.w * 0.02} height={b.h * 0.3} fill="#3a2a1a" />
              {E(fx, 0.38, 0.1, 0.2, i % 2 ? '#3f5a2e' : '#4f6a34')}
            </g>
          ))}
          {R(0, 0.8, 1, 0.2, '#5a5a2e')}
          {E(0.46, 0.84, 0.04, 0.03, '#8a6a4a')}
        </g>
      )
    case 'stilllife':
      return (
        <g>
          {R(0, 0, 1, 1, '#1c1611')}
          {R(0, 0.68, 1, 0.32, '#4a3620')}
          <path d={`M${X(0.12)} ${Y(0.68)}Q${X(0.3)} ${Y(0.6)} ${X(0.5)} ${Y(0.7)}L${X(0.4)} ${Y(0.9)}Z`} fill="#e8e0d0" />
          <path d={`M${X(0.62)} ${Y(0.7)}Q${X(0.58)} ${Y(0.3)} ${X(0.7)} ${Y(0.24)}Q${X(0.82)} ${Y(0.3)} ${X(0.78)} ${Y(0.7)}Z`} fill="#7a8a9a" />
          {E(0.3, 0.64, 0.06, 0.07, '#c0392b')}
          {E(0.42, 0.66, 0.05, 0.06, '#e2a13a')}
          {[0.22, 0.26, 0.3].map((fx) => E(fx, 0.56, 0.02, 0.025, '#6a2a5a', { key: fx }))}
          {E(0.72, 0.3, 0.05, 0.02, '#b0c0d0', { opacity: 0.5 })}
        </g>
      )
    case 'portrait':
      return (
        <g>
          {R(0, 0, 1, 1, '#1c1814')}
          <path d={`M${X(0.12)} ${Y(1)}Q${X(0.18)} ${Y(0.6)} ${X(0.5)} ${Y(0.56)}Q${X(0.82)} ${Y(0.6)} ${X(0.88)} ${Y(1)}Z`} fill="#0e0c0a" />
          {E(0.5, 0.58, 0.2, 0.05, '#f0ece2')}
          {E(0.5, 0.38, 0.14, 0.17, '#d6aa84')}
          <path d={`M${X(0.34)} ${Y(0.34)}Q${X(0.5)} ${Y(0.12)} ${X(0.66)} ${Y(0.34)}Q${X(0.66)} ${Y(0.2)} ${X(0.5)} ${Y(0.18)}Q${X(0.34)} ${Y(0.2)} ${X(0.34)} ${Y(0.34)}Z`} fill="#3a2a1a" />
          <path d={`M${X(0.44)} ${Y(0.5)}q${b.w * 0.06} ${b.h * 0.03} ${b.w * 0.12} 0`} stroke="#5a3a2a" strokeWidth={2} fill="none" />
        </g>
      )
    case 'wave':
      return (
        <g>
          {R(0, 0, 1, 1, '#efe2c4')}
          {E(0.72, 0.62, 0.1, 0.08, '#2c4d7a')}
          <polygon points={`${X(0.64)},${Y(0.66)} ${X(0.72)},${Y(0.52)} ${X(0.8)},${Y(0.66)}`} fill="#f4f0e6" />
          <path d={`M${X(0)} ${Y(1)}V${Y(0.6)}Q${X(0.1)} ${Y(0.1)} ${X(0.4)} ${Y(0.12)}Q${X(0.56)} ${Y(0.14)} ${X(0.52)} ${Y(0.3)}Q${X(0.44)} ${Y(0.2)} ${X(0.36)} ${Y(0.34)}Q${X(0.28)} ${Y(0.6)} ${X(0.5)} ${Y(0.8)}Q${X(0.8)} ${Y(0.9)} ${X(1)} ${Y(0.8)}V${Y(1)}Z`} fill="#1f3f7a" />
          <path d={`M${X(0.2)} ${Y(0.2)}Q${X(0.4)} ${Y(0.06)} ${X(0.54)} ${Y(0.26)}`} stroke="#f4f0e6" strokeWidth={5} fill="none" strokeDasharray="4 3" />
          {[0.1, 0.18, 0.26].map((fx) => (
            <circle key={fx} cx={X(0.5 + fx * 0.3)} cy={Y(0.24 + fx * 0.2)} r={2} fill="#f4f0e6" />
          ))}
          <path d={`M${X(0.3)} ${Y(0.74)}q${b.w * 0.12} -${b.h * 0.08} ${b.w * 0.24} 0`} stroke="#e8d8a8" strokeWidth={4} fill="none" />
        </g>
      )
    case 'sunflowers':
      return (
        <g>
          {R(0, 0, 1, 1, '#e8c84a')}
          {R(0, 0.74, 1, 0.26, '#d8a03a')}
          <path d={`M${X(0.34)} ${Y(0.54)}H${X(0.66)}L${X(0.62)} ${Y(0.9)}H${X(0.38)}Z`} fill="#e6c26a" stroke="#8a6a2a" />
          {R(0.34, 0.62, 0.32, 0.04, '#3a6ab0')}
          {[[0.3, 0.3], [0.5, 0.2], [0.7, 0.3], [0.4, 0.45], [0.6, 0.44], [0.24, 0.5], [0.78, 0.5]].map(([fx, fy], i) => (
            <g key={i}>
              {Array.from({ length: 10 }, (_, j) => {
                const a = (j * Math.PI) / 5
                return E(fx + Math.cos(a) * 0.05, fy + Math.sin(a) * 0.08, 0.025, 0.035, '#f2b21a', { key: j })
              })}
              {E(fx, fy, 0.035, 0.05, '#6a4a1a')}
            </g>
          ))}
        </g>
      )
    case 'temeraire':
      return (
        <g>
          {R(0, 0, 1, 1, '#c9d2d0')}
          {R(0, 0, 1, 0.7, '#e9c07a')}
          <circle cx={X(0.8)} cy={Y(0.62)} r={b.h * 0.08} fill="#f0602a" />
          {E(0.82, 0.5, 0.2, 0.14, '#e8803a', { opacity: 0.6 })}
          {R(0, 0.7, 1, 0.3, '#8fa6a6')}
          <path d={`M${X(0.2)} ${Y(0.7)}H${X(0.46)}L${X(0.44)} ${Y(0.64)}H${X(0.22)}Z`} fill="#dcd6c4" />
          {[0.26, 0.33, 0.4].map((fx) => (
            <line key={fx} x1={X(fx)} y1={Y(0.64)} x2={X(fx)} y2={Y(0.16)} stroke="#dcd6c4" strokeWidth={1.6} />
          ))}
          <path d={`M${X(0.46)} ${Y(0.74)}H${X(0.58)}L${X(0.56)} ${Y(0.68)}H${X(0.48)}Z`} fill="#2a2420" />
          <line x1={X(0.52)} y1={Y(0.68)} x2={X(0.52)} y2={Y(0.5)} stroke="#2a2420" strokeWidth={3} />
          {E(0.54, 0.44, 0.04, 0.06, '#5a4a40', { opacity: 0.7 })}
        </g>
      )
    case 'hunters':
      return (
        <g>
          {R(0, 0, 1, 1, '#e6ece8')}
          {R(0, 0, 1, 0.45, '#a8b8b0')}
          <polygon points={`${X(0.55)},${Y(0.45)} ${X(0.75)},${Y(0.2)} ${X(0.9)},${Y(0.45)}`} fill="#dfe6e2" />
          {E(0.66, 0.66, 0.16, 0.05, '#8ab0a8')}
          {E(0.86, 0.72, 0.1, 0.04, '#8ab0a8')}
          <polygon points={`${X(0)},${Y(0.45)} ${X(0.45)},${Y(0.7)} ${X(0.45)},${Y(1)} ${X(0)},${Y(1)}`} fill="#f4f6f4" />
          {[0.1, 0.2, 0.32].map((fx, i) => (
            <g key={i} stroke="#2a2018" strokeWidth={2}>
              <line x1={X(fx)} y1={Y(0.7)} x2={X(fx)} y2={Y(0.1)} />
              <line x1={X(fx)} y1={Y(0.3)} x2={X(fx + 0.06)} y2={Y(0.2)} />
              <line x1={X(fx)} y1={Y(0.4)} x2={X(fx - 0.05)} y2={Y(0.3)} />
            </g>
          ))}
          {[0.14, 0.22, 0.3].map((fx) => E(fx, 0.78, 0.02, 0.06, '#2a2018', { key: fx }))}
          {[0.6, 0.64, 0.7].map((fx) => E(fx, 0.66, 0.006, 0.012, '#2a2018', { key: fx }))}
          {[0.3, 0.5].map((fx) => (
            <path key={fx} d={`M${X(fx)} ${Y(0.12)}l${b.w * 0.02} ${b.h * 0.02}l${b.w * 0.02} -${b.h * 0.02}`} stroke="#2a2018" fill="none" />
          ))}
        </g>
      )
  }
}

export function PaintingArt({ v, g }: { v: PaintV; g: G }) {
  const portrait = v.portrait
  const box: Box = portrait ? { x: 112, y: 22, w: 96, h: 132 } : { x: 70, y: 26, w: 180, h: 122 }
  const pad = v.frame === 'ornate' ? 12 : v.frame === 'mat' ? 14 : v.frame === 'fresco' ? 4 : 8
  const outer = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 }
  const frameFill = v.frame === 'black' ? '#141414' : v.frame === 'wood' ? '#5a3a20' : v.frame === 'mat' ? '#f1ebdd' : v.frame === 'fresco' ? '#bfae8e' : `url(#${g('m')})`
  return (
    <Scene g={g} tone="wall" floor={false}>
      <defs>
        <MetalRamp id={g('m')} metal="gold" />
        <clipPath id={g('c')}>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} />
        </clipPath>
      </defs>
      <rect x={outer.x + 4} y={outer.y + 6} width={outer.w} height={outer.h} fill="#000" opacity={0.45} />
      <rect x={outer.x} y={outer.y} width={outer.w} height={outer.h} fill={frameFill} />
      {v.frame === 'ornate' ? (
        <g>
          <rect x={outer.x + 3} y={outer.y + 3} width={outer.w - 6} height={outer.h - 6} fill="none" stroke="#7d5a14" strokeWidth={2} />
          {[
            [outer.x + 6, outer.y + 6],
            [outer.x + outer.w - 6, outer.y + 6],
            [outer.x + 6, outer.y + outer.h - 6],
            [outer.x + outer.w - 6, outer.y + outer.h - 6],
          ].map(([cx, cy], i) => (
            <polygon key={i} points={starPoints(cx, cy, 6, 0.5)} fill="#fbe9ad" />
          ))}
        </g>
      ) : null}
      {v.frame === 'mat' ? <rect x={box.x - 2} y={box.y - 2} width={box.w + 4} height={box.h + 4} fill="none" stroke="#c9bfa8" /> : null}
      <g clipPath={`url(#${g('c')})`}>{sceneArt(v.scene, box)}</g>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="#000" strokeOpacity={0.4} />
      <rect x={outer.x} y={outer.y} width={outer.w} height={outer.h} fill="none" stroke="#fff" strokeOpacity={0.08} />
    </Scene>
  )
}
