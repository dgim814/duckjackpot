import type { ReactNode } from 'react'
import { Gem } from './jewel'
import { MetalRamp, Scene, polyPoints, starPoints, type G, type Metal, type Tone } from './scene'

export type ObjForm =
  // antiques & instruments
  | 'vase'
  | 'bowl'
  | 'candlestick'
  | 'casket'
  | 'mantelclock'
  | 'snuffbox'
  | 'teaset'
  | 'globe'
  | 'celestial'
  | 'armillary'
  | 'telescope'
  | 'typewriter'
  | 'lamp'
  | 'musicbox'
  | 'automaton'
  | 'rangefinder'
  | 'boxcamera'
  | 'polaroid'
  | 'compass'
  | 'binnacle'
  | 'figure'
  | 'map'
  | 'book'
  | 'openbook'
  | 'microscope'
  | 'chronometer'
  | 'helmet'
  | 'medkit'
  | 'flasks'
  | 'theodolite'
  | 'sextant'
  | 'chess'
  | 'samovar'
  | 'cup'
  // fashion
  | 'birkin'
  | 'kelly'
  | 'flap'
  | 'trunk'
  | 'steamer'
  | 'bamboo'
  | 'ladydior'
  | 'baguette'
  | 'scarf'
  | 'jacket'
  | 'watchbox'
  // tech & music
  | 'mac'
  | 'walkman'
  | 'gameboy'
  | 'console'
  | 'keyboard'
  | 'radiogram'
  | 'turntable'
  | 'amp'
  | 'guitar'
  | 'lespaul'
  | 'flyingv'
  | 'bass'
  | 'piano'
  | 'violin'
  | 'mic'
  | 'vinyl'
  // coins, toys, cards
  | 'coin'
  | 'bear'
  | 'cube'
  | 'card'
  // DuckJackpot lore & specials
  | 'key'
  | 'seal'
  | 'goldbar'
  | 'prism'
  | 'ledger'
  | 'crown'
  | 'duckcoin'
  | 'egg'
  | 'mystery'
  | 'duck'
  | 'tape'

export type ObjV = {
  k: 'obj'
  form: ObjForm
  c1: string
  c2?: string
  metal?: Metal
  tone?: Tone
  /** Small printed mark: coin legend, card number, book emblem… */
  mark?: string
}

function body(v: ObjV, m: string, g: G): ReactNode {
  const c1 = v.c1
  const c2 = v.c2 ?? '#e8dcc0'
  switch (v.form) {
    case 'vase':
      return (
        <g>
          <path d="M142 34h36v10q-4 8 12 26q22 26 10 58q-8 18 -40 20q-32 -2 -40 -20q-12 -32 10 -58q16 -18 12 -26z" fill={c1} stroke="#0004" />
          <path d="M126 88q34 12 68 0M122 112q38 12 76 0" fill="none" stroke={c2} strokeWidth={4} />
          <path d="M142 64q18 -8 36 0q-6 14 -18 14q-12 0 -18 -14z" fill="none" stroke={c2} strokeWidth={2} />
          {[140, 160, 180].map((x) => (
            <circle key={x} cx={x} cy={100} r={4} fill="none" stroke={c2} strokeWidth={1.6} />
          ))}
          <rect x={140} y={30} width={40} height={6} rx={2} fill={c2} />
        </g>
      )
    case 'bowl':
      return (
        <g>
          <path d="M104 78q56 -10 112 0q-6 56 -56 60q-50 -4 -56 -60z" fill={c1} />
          <path d="M104 78q56 10 112 0" fill={c2} opacity={0.4} />
          <path d="M122 92q14 18 6 40M190 88q-10 20 4 36" stroke="#d4af58" strokeWidth={2.4} fill="none" />
          <path d="M112 84q48 8 96 0" stroke="#fff" strokeOpacity={0.12} strokeWidth={6} fill="none" />
        </g>
      )
    case 'candlestick':
      return (
        <g fill={m}>
          {[128, 192].map((x) => (
            <g key={x}>
              <rect x={x - 5} y={40} width={10} height={20} fill="#f3ecd8" />
              <path d={`M${x} 26q6 8 0 14q-6 -6 0 -14z`} fill="#ffcc55" />
              <path d={`M${x - 12} 60h24l-6 10v40l12 20h-36l12 -20v-40z`} />
              <ellipse cx={x} cy={136} rx={24} ry={6} />
            </g>
          ))}
        </g>
      )
    case 'casket':
      return (
        <g>
          <path d="M96 70q64 -34 128 0v10h-128z" fill={c1} stroke={m} strokeWidth={2} />
          <rect x={96} y={80} width={128} height={56} rx={4} fill={c1} stroke={m} strokeWidth={2} />
          <path d="M120 100q40 -16 80 0M120 118q40 16 80 0" stroke={c2} strokeWidth={2} fill="none" />
          <rect x={152} y={84} width={16} height={20} rx={3} fill={m} />
          <circle cx={160} cy={92} r={2.4} fill="#111" />
        </g>
      )
    case 'mantelclock':
      return (
        <g>
          <path d="M100 136h120v-10h-10v-40q0 -40 -50 -48q-50 8 -50 48v40h-10z" fill={c1} stroke={m} strokeWidth={2} />
          <rect x={112} y={96} width={96} height={30} fill={c2} opacity={0.4} />
          {[-2, -1, 0, 1, 2].map((i) => (
            <rect key={i} x={156 + i * 16} y={100} width={8} height={22} fill={m} opacity={0.7} />
          ))}
          <circle cx={160} cy={72} r={22} fill="#f4efe2" stroke={m} strokeWidth={4} />
          <line x1={160} y1={72} x2={160} y2={56} stroke="#111" strokeWidth={2} />
          <line x1={160} y1={72} x2={172} y2={72} stroke="#111" strokeWidth={2} />
        </g>
      )
    case 'snuffbox':
      return (
        <g>
          <ellipse cx={160} cy={112} rx={62} ry={22} fill={m} />
          <rect x={98} y={92} width={124} height={20} fill={m} />
          <ellipse cx={160} cy={92} rx={62} ry={22} fill={m} stroke="#0005" />
          <ellipse cx={160} cy={92} rx={40} ry={13} fill={c1} stroke="#fff5" />
          <path d="M140 92q20 -12 40 0q-20 12 -40 0z" fill="none" stroke="#fff8" />
        </g>
      )
    case 'teaset':
      return (
        <g fill={m}>
          <path d="M110 136q-24 -2 -22 -34q2 -26 34 -26h28q32 0 34 26q2 32 -22 34z" />
          <path d="M154 96q30 -6 40 -26l6 4q-10 30 -40 34z" />
          <path d="M88 96q-18 4 -14 22q4 12 16 8" fill="none" stroke={m} strokeWidth={5} />
          <ellipse cx={132} cy={74} rx={20} ry={5} />
          <circle cx={132} cy={66} r={5} />
          <path d="M206 136q-18 0 -18 -20v-14h40v14q0 20 -22 20z" />
          <path d="M104 106q28 8 56 0" fill="none" stroke="#fff6" strokeWidth={2} />
        </g>
      )
    case 'globe':
    case 'celestial':
      return (
        <g>
          <path d="M160 134v-8M130 138h60" stroke={m} strokeWidth={6} />
          <circle cx={160} cy={78} r={48} fill={c1} />
          {v.form === 'globe' ? (
            <g fill={c2} opacity={0.9}>
              <path d="M126 58q14 -12 26 -4q4 14 -8 22q-12 4 -18 -8z" />
              <path d="M164 70q14 -6 22 4q6 16 -4 30q-12 6 -16 -8q-6 -12 -2 -26z" />
              <path d="M140 96q10 0 12 10q-2 12 -10 14q-6 -10 -2 -24z" />
            </g>
          ) : (
            <g>
              {Array.from({ length: 14 }, (_, i) => (
                <polygon key={i} points={starPoints(126 + ((i * 29) % 70), 46 + ((i * 41) % 64), 3.2)} fill="#f3d98a" />
              ))}
              <polyline points="130,60 146,70 160,62 178,78 190,70" stroke="#f3d98a" strokeWidth={1} fill="none" />
            </g>
          )}
          <path d="M160 30a48 48 0 0 1 0 96" fill="none" stroke={m} strokeWidth={5} transform="rotate(20 160 78)" />
          <ellipse cx={160} cy={78} rx={48} ry={10} fill="none" stroke="#fff3" />
        </g>
      )
    case 'armillary':
      return (
        <g fill="none" stroke={m} strokeWidth={4}>
          <circle cx={160} cy={76} r={46} />
          <ellipse cx={160} cy={76} rx={46} ry={14} />
          <ellipse cx={160} cy={76} rx={46} ry={14} transform="rotate(-24 160 76)" />
          <ellipse cx={160} cy={76} rx={14} ry={46} />
          <circle cx={160} cy={76} r={8} fill={c1} stroke="none" />
          <path d="M160 122v10M132 138h56" strokeWidth={6} />
        </g>
      )
    case 'telescope':
      return (
        <g>
          <g stroke={c2} strokeWidth={4}>
            <line x1={160} y1={96} x2={126} y2={140} />
            <line x1={160} y1={96} x2={194} y2={140} />
            <line x1={160} y1={96} x2={160} y2={142} />
          </g>
          <g transform="rotate(-24 160 80)">
            <rect x={86} y={70} width={150} height={20} rx={4} fill={m} />
            <rect x={70} y={73} width={20} height={14} rx={3} fill={m} />
            <rect x={232} y={66} width={12} height={28} rx={3} fill={m} />
            {[120, 160, 200].map((x) => (
              <rect key={x} x={x} y={69} width={4} height={22} fill="#0004" />
            ))}
          </g>
        </g>
      )
    case 'typewriter':
      return (
        <g>
          <rect x={92} y={48} width={136} height={14} rx={7} fill="#1a1a1a" />
          <rect x={120} y={30} width={80} height={24} fill="#f3eee2" />
          <path d="M92 70h136l14 62h-164z" fill={c1} />
          {[0, 1, 2].map((r) =>
            Array.from({ length: 10 - r }, (_, i) => <circle key={`${r}-${i}`} cx={108 + r * 7 + i * 13} cy={96 + r * 12} r={5} fill="#f3eee2" stroke="#111" strokeWidth={1.2} />),
          )}
          <rect x={126} y={128} width={68} height={6} rx={3} fill="#f3eee2" />
          <rect x={132} y={72} width={56} height={10} fill={m} />
        </g>
      )
    case 'lamp':
      return (
        <g>
          <path d="M112 56l20 -28h56l20 28z" fill={c1} opacity={0.9} />
          <path d="M112 56h96" stroke={m} strokeWidth={3} />
          {[128, 144, 160, 176, 192].map((x) => (
            <line key={x} x1={x} y1={30} x2={x - (x - 160) * 0.3} y2={56} stroke="#fff4" />
          ))}
          <rect x={156} y={56} width={8} height={62} fill={m} />
          <path d="M126 136l14 -18h40l14 18z" fill={m} />
          <ellipse cx={160} cy={64} rx={40} ry={10} fill="#ffdd88" opacity={0.2} />
        </g>
      )
    case 'musicbox':
      return (
        <g>
          <path d="M96 64l24 -26h120l-24 26z" fill={c1} opacity={0.8} />
          <rect x={96} y={64} width={120} height={70} fill={c1} stroke={m} strokeWidth={2} />
          <rect x={112} y={72} width={88} height={30} rx={14} fill={m} />
          {Array.from({ length: 14 }, (_, i) => (
            <circle key={i} cx={118 + i * 6} cy={80 + (i % 3) * 7} r={1.2} fill="#222" />
          ))}
          <rect x={112} y={108} width={88} height={6} fill={m} opacity={0.7} />
          <path d="M216 96h14v-10h6v22h-6v-10" fill={m} />
        </g>
      )
    case 'automaton':
      return (
        <g>
          <path d="M112 132v-70q0 -34 48 -40q48 6 48 40v70z" fill="none" stroke={m} strokeWidth={3} />
          {[128, 144, 160, 176, 192].map((x) => (
            <line key={x} x1={x} y1={30} x2={x} y2={132} stroke={m} strokeWidth={1.4} />
          ))}
          <rect x={104} y={128} width={112} height={12} rx={3} fill={m} />
          <line x1={132} y1={96} x2={188} y2={96} stroke={c2} strokeWidth={3} />
          <path d="M150 94q-4 -22 18 -24q14 4 14 14l12 2l-10 6q-8 10 -34 2z" fill={c1} />
          <circle cx={172} cy={78} r={2} fill="#111" />
        </g>
      )
    case 'rangefinder':
      return (
        <g>
          <rect x={88} y={62} width={144} height={62} rx={14} fill={c1} />
          <rect x={88} y={62} width={144} height={20} rx={10} fill={m} />
          <rect x={88} y={118} width={144} height={6} fill={m} />
          <rect x={102} y={68} width={22} height={10} rx={2} fill="#1d2833" />
          <rect x={196} y={68} width={22} height={10} rx={2} fill="#1d2833" />
          <circle cx={160} cy={102} r={26} fill={m} />
          <circle cx={160} cy={102} r={18} fill="#0d0d10" />
          <circle cx={154} cy={96} r={5} fill="#6fa0d0" opacity={0.6} />
          <circle cx={112} cy={56} r={6} fill={m} />
          <circle cx={212} cy={56} r={8} fill={m} />
          {v.mark ? <circle cx={134} cy={72} r={4} fill="#d0202a" /> : null}
        </g>
      )
    case 'boxcamera':
      return (
        <g>
          <rect x={116} y={48} width={88} height={88} rx={6} fill={c1} />
          <rect x={116} y={48} width={88} height={20} fill={m} />
          <rect x={126} y={30} width={68} height={18} fill="#111" />
          <circle cx={160} cy={100} r={30} fill={m} />
          <circle cx={160} cy={100} r={20} fill="#0d0d10" />
          <circle cx={152} cy={92} r={5} fill="#6fa0d0" opacity={0.6} />
          <rect x={204} y={70} width={10} height={40} rx={3} fill={m} />
        </g>
      )
    case 'polaroid':
      return (
        <g>
          <path d="M100 136l20 -80h80l20 80z" fill={c1} />
          <rect x={120} y={46} width={80} height={24} fill={m} />
          <circle cx={160} cy={96} r={18} fill="#0d0d10" stroke={m} strokeWidth={4} />
          <rect x={128} y={124} width={64} height={30} fill="#f4f2ec" />
          <rect x={134} y={128} width={52} height={20} fill="#6a8aa8" />
          <rect x={186} y={74} width={10} height={6} fill="#d0202a" />
        </g>
      )
    case 'compass':
    case 'binnacle':
      return (
        <g>
          {v.form === 'binnacle' ? <path d="M124 140l8 -48h56l8 48z" fill={c1} /> : null}
          <circle cx={160} cy={v.form === 'binnacle' ? 72 : 88} r={44} fill={m} />
          <circle cx={160} cy={v.form === 'binnacle' ? 72 : 88} r={36} fill="#efe6cf" />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i * Math.PI) / 8
            const cy = v.form === 'binnacle' ? 72 : 88
            return <line key={i} x1={160 + 30 * Math.cos(a)} y1={cy + 30 * Math.sin(a)} x2={160 + 35 * Math.cos(a)} y2={cy + 35 * Math.sin(a)} stroke="#333" />
          })}
          <polygon points={v.form === 'binnacle' ? '160,42 166,72 160,102 154,72' : '160,58 166,88 160,118 154,88'} fill={c2} />
          <polygon points={v.form === 'binnacle' ? '160,42 166,72 154,72' : '160,58 166,88 154,88'} fill="#b3202a" />
          {v.form === 'compass' ? <circle cx={160} cy={42} r={6} fill="none" stroke={m} strokeWidth={3} /> : null}
        </g>
      )
    case 'figure':
      return (
        <g>
          <rect x={112} y={124} width={96} height={14} rx={2} fill="#2a1c12" />
          <path d="M120 124q2 -30 18 -40q14 -6 30 -6q18 -2 28 -16q8 -4 8 6q-4 10 -10 14q10 10 6 26l-6 16h-8l2 -16q-10 6 -26 4l-6 12h-8l2 -14q-8 4 -12 14z" fill={m} />
          <path d="M196 62l8 -10 4 4" stroke={m} strokeWidth={4} fill="none" />
        </g>
      )
    case 'map':
      return (
        <g>
          <path d="M84 42h152v96h-152z" fill="#e6d6ae" />
          <path d="M84 42h152v96h-152z" fill="none" stroke="#8a6a3a" strokeWidth={3} />
          <rect x={78} y={38} width={10} height={104} rx={5} fill="#7a5530" />
          <rect x={232} y={38} width={10} height={104} rx={5} fill="#7a5530" />
          <g fill={c1} opacity={0.85}>
            <path d="M104 60q18 -8 26 6q-4 18 -14 30q-10 -2 -14 -16q-4 -10 2 -20z" />
            <path d="M144 58q18 -6 30 2q2 14 -10 18q-8 18 -18 10q-6 -14 -2 -30z" />
            <path d="M188 64q16 -6 30 4q2 16 -10 26q-14 4 -20 -10z" />
            <path d="M190 106q12 -4 18 6q-2 10 -12 10q-8 -6 -6 -16z" />
          </g>
          <circle cx={120} cy={116} r={12} fill="none" stroke="#8a6a3a" />
          <polygon points="120,104 123,116 120,128 117,116" fill="#8a6a3a" />
          {Array.from({ length: 5 }, (_, i) => (
            <line key={i} x1={88} y1={52 + i * 20} x2={232} y2={52 + i * 20} stroke="#8a6a3a" strokeOpacity={0.25} />
          ))}
        </g>
      )
    case 'book':
      return (
        <g>
          <rect x={112} y={34} width={100} height={108} rx={3} fill="#f1e9d4" />
          <rect x={106} y={30} width={100} height={110} rx={3} fill={c1} />
          <rect x={106} y={30} width={14} height={110} fill="#0003" />
          <rect x={128} y={44} width={66} height={3} fill={c2} />
          <rect x={128} y={122} width={66} height={3} fill={c2} />
          {v.mark === 'eyes' ? (
            <g>
              <ellipse cx={146} cy={76} rx={11} ry={5} fill={c2} />
              <ellipse cx={176} cy={76} rx={11} ry={5} fill={c2} />
              <circle cx={146} cy={76} r={3} fill="#111" />
              <circle cx={176} cy={76} r={3} fill="#111" />
              {[0, 1, 2, 3, 4].map((i) => (
                <rect key={i} x={132 + i * 12} y={98 + (i % 2) * 4} width={6} height={20} fill="#f3d05a" opacity={0.7} />
              ))}
            </g>
          ) : v.mark === 'mountain' ? (
            <g>
              <polygon points="126,112 146,70 162,92 176,62 200,112" fill={c2} />
              <circle cx={184} cy={56} r={6} fill="#e8b04a" />
            </g>
          ) : v.mark === 'bolt' ? (
            <polyline points="158,58 150,86 166,84 156,114" stroke={c2} strokeWidth={5} fill="none" />
          ) : v.mark === 'globe' ? (
            <g fill="none" stroke={c2} strokeWidth={2}>
              <circle cx={162} cy={84} r={24} />
              <ellipse cx={162} cy={84} rx={10} ry={24} />
              <line x1={138} y1={84} x2={186} y2={84} />
            </g>
          ) : v.mark === 'gear' ? (
            <g>
              <polygon points={polyPoints(162, 84, 24, 12)} fill={c2} />
              <circle cx={162} cy={84} r={10} fill={c1} />
              <path d="M130 116q30 -16 64 0" stroke={c2} strokeWidth={2} fill="none" />
            </g>
          ) : v.mark === 'bands' ? (
            <g>
              {[56, 70, 98, 112].map((y) => (
                <rect key={y} x={120} y={y} width={86} height={5} rx={2} fill={c2} opacity={0.8} />
              ))}
              <rect x={136} y={76} width={54} height={18} rx={2} fill="#1a100c" stroke={c2} />
              <rect x={144} y={82} width={38} height={2} fill={c2} />
              <rect x={148} y={87} width={30} height={2} fill={c2} />
            </g>
          ) : v.mark === 'pipe' ? (
            <g>
              <path d="M140 92q0 16 16 16h8q6 0 8 -8l12 -30" stroke={c2} strokeWidth={5} fill="none" />
              <rect x={134} y={70} width={14} height={24} rx={3} fill={c2} />
            </g>
          ) : (
            <g fill="none" stroke={c2} strokeWidth={2}>
              <rect x={132} y={58} width={60} height={52} rx={6} />
              <path d="M162 62v44M136 84h52" />
              <circle cx={162} cy={84} r={10} />
            </g>
          )}
        </g>
      )
    case 'openbook':
      return (
        <g>
          <path d="M78 132q40 -14 82 0q42 -14 82 0v-94q-40 -14 -82 0q-42 -14 -82 0z" fill={c1} />
          <path d="M84 126q36 -12 74 0v-86q-38 -12 -74 0z" fill="#f2e8cf" />
          <path d="M162 126q38 -12 74 0v-86q-36 -12 -74 0z" fill="#f2e8cf" />
          {v.mark === 'portrait' ? (
            <g>
              <rect x={100} y={50} width={44} height={54} fill="#e0d2b0" stroke="#5a4a38" />
              <ellipse cx={122} cy={72} rx={10} ry={13} fill="#5a4a38" />
              <path d="M104 104q18 -22 36 0z" fill="#5a4a38" />
            </g>
          ) : (
            <g>
              {[92, 124].map((x) => Array.from({ length: 12 }, (_, i) => <line key={`${x}-${i}`} x1={x} y1={52 + i * 6} x2={x + 26} y2={52 + i * 6} stroke="#3a3024" strokeWidth={1.4} />))}
              <rect x={92} y={48} width={10} height={12} fill="#b3202a" />
            </g>
          )}
          {[170, 202].map((x) => Array.from({ length: 12 }, (_, i) => <line key={`${x}-${i}`} x1={x} y1={52 + i * 6} x2={x + 26} y2={52 + i * 6} stroke="#3a3024" strokeWidth={1.4} />))}
          <rect x={170} y={48} width={10} height={12} fill={c2} />
        </g>
      )
    case 'microscope':
      return (
        <g fill={m}>
          <path d="M112 140h96l-6 -12h-84z" />
          <path d="M184 128q10 -40 -16 -74l-10 6q22 32 12 68z" />
          <rect x={132} y={92} width={48} height={8} rx={2} />
          <g transform="rotate(-18 150 60)">
            <rect x={140} y={24} width={20} height={60} rx={4} />
            <rect x={136} y={20} width={28} height={8} rx={2} />
            <rect x={144} y={84} width={12} height={10} />
          </g>
          <circle cx={186} cy={84} r={7} />
        </g>
      )
    case 'chronometer':
      return (
        <g>
          <rect x={96} y={70} width={128} height={68} rx={4} fill={c1} />
          <path d="M96 70l14 -22h100l14 22z" fill={c1} opacity={0.75} />
          <rect x={96} y={70} width={128} height={6} fill={m} />
          <circle cx={160} cy={62} r={30} fill={m} />
          <circle cx={160} cy={62} r={24} fill="#f4efe2" />
          <circle cx={160} cy={72} r={7} fill="none" stroke="#333" />
          <line x1={160} y1={62} x2={160} y2={44} stroke="#111" strokeWidth={2} />
          <line x1={160} y1={62} x2={174} y2={56} stroke="#111" strokeWidth={2} />
          <rect x={152} y={100} width={16} height={10} rx={2} fill={m} />
        </g>
      )
    case 'helmet':
      return (
        <g>
          <path d="M104 140q-6 -30 10 -40h92q16 10 10 40z" fill={m} />
          <circle cx={160} cy={72} r={50} fill={m} />
          <circle cx={160} cy={76} r={22} fill="#1a2a30" stroke={m} strokeWidth={6} />
          <g stroke="#6a4a2a" strokeWidth={2}>
            <line x1={160} y1={54} x2={160} y2={98} />
            <line x1={138} y1={76} x2={182} y2={76} />
          </g>
          <circle cx={120} cy={70} r={12} fill="#1a2a30" stroke={m} strokeWidth={4} />
          <circle cx={200} cy={70} r={12} fill="#1a2a30" stroke={m} strokeWidth={4} />
          {[112, 136, 184, 208].map((x) => (
            <circle key={x} cx={x} cy={118} r={3} fill="#3a2a1a" />
          ))}
        </g>
      )
    case 'medkit':
      return (
        <g>
          <rect x={86} y={60} width={148} height={78} rx={6} fill={c1} />
          <rect x={94} y={68} width={132} height={62} rx={4} fill={c2} />
          {[108, 128, 148, 168, 188, 208].map((x, i) => (
            <g key={x}>
              <rect x={x} y={76} width={6} height={30} rx={2} fill={i % 2 ? '#3a2a1a' : '#e8e2d2'} />
              <rect x={x + 1} y={106} width={4} height={18} fill="none" stroke="#bbb" />
            </g>
          ))}
          <path d="M86 60l18 -22h112l18 22z" fill={c1} opacity={0.7} />
        </g>
      )
    case 'flasks':
      return (
        <g>
          <path d="M112 134l18 -40v-30h14v30l18 40z" fill={c1} opacity={0.75} stroke="#dfe8f0" />
          <path d="M116 126l12 -22h24l12 22z" fill={c2} opacity={0.8} />
          <circle cx={200} cy={108} r={26} fill={c2} opacity={0.55} stroke="#dfe8f0" />
          <rect x={194} y={60} width={12} height={24} fill="none" stroke="#dfe8f0" />
          <rect x={170} y={60} width={6} height={74} fill={m} />
          <path d="M150 56q40 -20 44 8" stroke="#dfe8f0" fill="none" strokeWidth={2} />
          <path d="M196 140h8l4 -8h-16z" fill="#4a90e2" />
        </g>
      )
    case 'theodolite':
      return (
        <g>
          <g stroke="#7a5530" strokeWidth={5}>
            <line x1={160} y1={104} x2={120} y2={146} />
            <line x1={160} y1={104} x2={200} y2={146} />
            <line x1={160} y1={104} x2={160} y2={148} />
          </g>
          <rect x={134} y={94} width={52} height={12} rx={3} fill={m} />
          <path d="M142 94v-34h36v34" fill="none" stroke={m} strokeWidth={6} />
          <rect x={120} y={52} width={80} height={16} rx={6} fill={m} />
          <circle cx={160} cy={60} r={12} fill={m} stroke="#0005" />
          <circle cx={160} cy={84} r={8} fill="#2a2a2a" />
        </g>
      )
    case 'sextant':
      return (
        <g fill="none" stroke={m} strokeWidth={5}>
          <path d="M104 118a70 70 0 0 1 112 0" />
          <line x1={160} y1={36} x2={104} y2={118} />
          <line x1={160} y1={36} x2={216} y2={118} />
          <line x1={160} y1={36} x2={176} y2={120} strokeWidth={4} />
          <rect x={120} y={60} width={40} height={10} rx={3} fill={m} />
          <circle cx={160} cy={36} r={7} fill={m} />
          <path d="M112 124h96" stroke="#0005" strokeWidth={2} strokeDasharray="2 3" />
        </g>
      )
    case 'chess':
      return (
        <g>
          <polygon points="80,140 240,140 214,104 106,104" fill="#6a4a2a" />
          {Array.from({ length: 16 }, (_, i) => {
            const cx = 110 + (i % 8) * 14
            return i < 8 ? null : <rect key={i} x={cx - 4 + (i % 2) * 2} y={116} width={10} height={8} fill="#e8dcc0" opacity={0.6} />
          })}
          {[
            [120, '#f2ead8'],
            [148, '#f2ead8'],
            [176, '#1a1410'],
            [202, '#1a1410'],
          ].map(([x, c], i) => (
            <g key={i} fill={c as string} stroke="#0006">
              <path d={`M${(x as number) - 12} 118h24l-4 -8h-16z`} />
              {i === 0 || i === 3 ? (
                <g>
                  <rect x={(x as number) - 5} y={66} width={10} height={44} />
                  <polygon points={polyPoints(x as number, 60, 9, 6)} />
                  <path d={`M${(x as number) - 2} 44h4v8h4v4h-4v4h-4v-4h-4v-4h4z`} />
                </g>
              ) : (
                <g>
                  <path d={`M${(x as number) - 7} 110v-22q-4 -16 8 -26q10 4 10 14l-6 4 4 30z`} />
                  <circle cx={(x as number) + 2} cy={68} r={1.6} fill="#888" />
                </g>
              )}
            </g>
          ))}
        </g>
      )
    case 'samovar':
      return (
        <g fill={m}>
          <path d="M128 136h64l-8 -12h-48z" />
          <path d="M124 124q-8 -30 4 -60q32 -12 64 0q12 30 4 60z" />
          <rect x={148} y={36} width={24} height={20} rx={3} />
          <path d="M140 36q20 -16 40 0" />
          <path d="M122 76q-20 0 -20 20M198 76q20 0 20 20" fill="none" stroke={m} strokeWidth={5} />
          <path d="M160 102h22l10 8h-10" />
          {[140, 156, 172].map((x) => (
            <circle key={x} cx={x} cy={86} r={5} fill={c1} />
          ))}
        </g>
      )
    case 'cup':
      return (
        <g>
          <ellipse cx={160} cy={134} rx={62} ry={10} fill="#f2f2f4" stroke="#1f3f8a" strokeWidth={2} />
          <path d="M112 70h96q-4 54 -48 58q-44 -4 -48 -58z" fill="#f7f7f9" />
          <clipPath id={g('clip')}>
            <path d="M112 70h96q-4 54 -48 58q-44 -4 -48 -58z" />
          </clipPath>
          <g clipPath={`url(#${g('clip')})`} stroke="#1f3f8a" strokeWidth={2}>
            {Array.from({ length: 12 }, (_, i) => (
              <g key={i}>
                <line x1={100 + i * 12} y1={70} x2={130 + i * 12} y2={130} />
                <line x1={130 + i * 12} y1={70} x2={100 + i * 12} y2={130} />
              </g>
            ))}
          </g>
          <ellipse cx={160} cy={70} rx={48} ry={8} fill="#fff" stroke="#d4af58" strokeWidth={2} />
          <path d="M206 80q22 2 16 22q-6 12 -20 8" fill="none" stroke="#f7f7f9" strokeWidth={6} />
          <path d="M206 80q22 2 16 22q-6 12 -20 8" fill="none" stroke="#d4af58" strokeWidth={1.4} />
        </g>
      )
    case 'birkin':
    case 'kelly':
      return (
        <g>
          <path d={v.form === 'birkin' ? 'M128 64q0 -30 32 -30q32 0 32 30' : 'M140 56q0 -22 20 -22q20 0 20 22'} fill="none" stroke={c1} strokeWidth={7} />
          <path d="M96 138l12 -74h104l12 74z" fill={c1} />
          <path d={v.form === 'birkin' ? 'M104 64h112l-6 28h-100z' : 'M102 64h116l-10 36h-96z'} fill={c1} stroke="#0004" />
          {v.form === 'birkin' ? (
            <g>
              <rect x={122} y={80} width={10} height={24} rx={2} fill="#0003" />
              <rect x={188} y={80} width={10} height={24} rx={2} fill="#0003" />
            </g>
          ) : null}
          <rect x={150} y={88} width={20} height={14} rx={2} fill={m} />
          <path d="M154 106h12v14h-12z" fill={m} />
          <path d="M100 136h120" stroke="#fff3" />
        </g>
      )
    case 'flap':
    case 'ladydior':
      return (
        <g>
          {v.form === 'flap' ? (
            <path d="M110 70q-8 -40 50 -44q58 4 50 44" fill="none" stroke={m} strokeWidth={3} strokeDasharray="5 2" />
          ) : (
            <path d="M126 64q0 -30 34 -30q34 0 34 30" fill="none" stroke={c1} strokeWidth={6} />
          )}
          <rect x={100} y={62} width={120} height={76} rx={8} fill={c1} />
          <clipPath id={g('clip')}>
            <rect x={100} y={62} width={120} height={76} rx={8} />
          </clipPath>
          <g clipPath={`url(#${g('clip')})`} stroke="#fff" strokeOpacity={0.2} strokeWidth={1.4}>
            {Array.from({ length: 12 }, (_, i) => (
              <g key={i}>
                <line x1={80 + i * 16} y1={62} x2={140 + i * 16} y2={138} />
                <line x1={140 + i * 16} y1={62} x2={80 + i * 16} y2={138} />
              </g>
            ))}
          </g>
          <path d="M100 70h120v34q-60 12 -120 0z" fill="#0002" />
          {v.form === 'flap' ? <rect x={150} y={96} width={20} height={12} rx={2} fill={m} /> : <g fill={m}><circle cx={196} cy={80} r={6} /><text x={196} y={84} fontSize={8} textAnchor="middle" fill="#111">D</text></g>}
        </g>
      )
    case 'steamer':
      return (
        <g>
          <rect x={92} y={24} width={66} height={116} rx={4} fill={c1} stroke="#6a4020" strokeWidth={4} />
          <rect x={162} y={24} width={66} height={116} rx={4} fill={c1} stroke="#6a4020" strokeWidth={4} />
          <rect x={98} y={30} width={54} height={104} fill="#e8dcc0" opacity={0.9} />
          <line x1={100} y1={40} x2={150} y2={40} stroke={m} strokeWidth={3} />
          {[108, 122, 136].map((x) => (
            <path key={x} d={`M${x} 40v6l-8 8h16l-8 -8`} fill="none" stroke="#5a3a1e" strokeWidth={1.6} />
          ))}
          {[112, 126, 140].map((x, i) => (
            <rect key={x} x={x - 7} y={56} width={14} height={60} rx={3} fill={['#6a2a2a', '#2a3a5a', '#3a5a3a'][i]} />
          ))}
          {[34, 58, 82, 106].map((y) => (
            <g key={y}>
              <rect x={168} y={y} width={54} height={20} rx={2} fill="#e8dcc0" opacity={0.9} />
              <rect x={190} y={y + 8} width={10} height={4} rx={1} fill={m} />
            </g>
          ))}
        </g>
      )
    case 'trunk':
      return (
        <g>
          <rect x={v.form === 'trunk' ? 76 : 112} y={v.form === 'trunk' ? 64 : 26} width={v.form === 'trunk' ? 168 : 96} height={v.form === 'trunk' ? 76 : 114} rx={4} fill={c1} />
          <clipPath id={g('clip')}>
            <rect x={v.form === 'trunk' ? 76 : 112} y={v.form === 'trunk' ? 64 : 26} width={v.form === 'trunk' ? 168 : 96} height={v.form === 'trunk' ? 76 : 114} rx={4} />
          </clipPath>
          <g clipPath={`url(#${g('clip')})`} fill={c2} opacity={0.55}>
            {Array.from({ length: 60 }, (_, i) => (
              <polygon key={i} points={starPoints(72 + (i % 10) * 18 + (Math.floor(i / 10) % 2) * 9, 30 + Math.floor(i / 10) * 20, 3.4, 0.5)} />
            ))}
          </g>
          {v.form === 'trunk' ? (
            <g fill="none" stroke="#6a4020" strokeWidth={5}>
              <rect x={76} y={64} width={168} height={76} rx={4} />
              <line x1={76} y1={84} x2={244} y2={84} />
              <line x1={120} y1={64} x2={120} y2={140} />
              <line x1={200} y1={64} x2={200} y2={140} />
            </g>
          ) : (
            <g fill="none" stroke="#6a4020" strokeWidth={5}>
              <rect x={112} y={26} width={96} height={114} rx={4} />
              <line x1={160} y1={26} x2={160} y2={140} />
            </g>
          )}
          <rect x={v.form === 'trunk' ? 152 : 152} y={v.form === 'trunk' ? 78 : 76} width={16} height={14} rx={2} fill={m} />
        </g>
      )
    case 'bamboo':
      return (
        <g>
          <path d="M128 70q-4 -46 32 -46q36 0 32 46" fill="none" stroke="#c89a4a" strokeWidth={9} />
          {[0.25, 0.5, 0.75].map((t) => (
            <circle key={t} cx={128 + t * 64} cy={40 - Math.sin(t * Math.PI) * 14} r={5} fill="#a8782a" />
          ))}
          <path d="M104 138q-6 -40 10 -68h92q16 28 10 68z" fill={c1} />
          <path d="M112 70h96v20q-48 10 -96 0z" fill="#0002" />
          <rect x={152} y={86} width={16} height={10} rx={2} fill={m} />
        </g>
      )
    case 'baguette':
      return (
        <g>
          <path d="M112 76q48 -34 96 0" fill="none" stroke={c1} strokeWidth={6} />
          <rect x={90} y={76} width={140} height={54} rx={14} fill={c1} />
          <path d="M90 90h140v18q-70 10 -140 0z" fill="#0002" />
          <rect x={146} y={94} width={28} height={18} rx={3} fill={m} />
          <text x={160} y={107} fontSize={11} fontWeight={800} textAnchor="middle" fill="#2a1a0a">FF</text>
        </g>
      )
    case 'scarf':
      return (
        <g>
          <g transform="rotate(-8 160 90)">
            <rect x={100} y={30} width={120} height={120} fill={c1} />
            <rect x={108} y={38} width={104} height={104} fill="none" stroke={c2} strokeWidth={3} />
            <circle cx={160} cy={90} r={30} fill="none" stroke={c2} strokeWidth={2} />
            <path d="M140 104q10 -30 26 -26q10 4 10 16l12 -2q-2 16 -20 18q-8 12 -28 -6z" fill={c2} />
            {[118, 202].map((x) => [48, 132].map((y) => <polygon key={`${x}${y}`} points={starPoints(x, y, 6)} fill={c2} />))}
          </g>
        </g>
      )
    case 'jacket':
      return (
        <g>
          <path d="M112 36l-30 20 -8 84h40l4 -60 4 60h76l4 -60 4 60h40l-8 -84 -30 -20 -24 14h-52z" fill={c1} />
          <clipPath id={g('clip')}>
            <path d="M112 36l-30 20 -8 84h40l4 -60 4 60h76l4 -60 4 60h40l-8 -84 -30 -20 -24 14h-52z" />
          </clipPath>
          <g clipPath={`url(#${g('clip')})`} stroke={c2} strokeOpacity={0.25}>
            {Array.from({ length: 30 }, (_, i) => (
              <line key={i} x1={70 + i * 6} y1={30} x2={60 + i * 6} y2={150} />
            ))}
          </g>
          <path d="M136 50l24 40 24 -40" fill="none" stroke={c2} strokeWidth={4} />
          <path d="M160 90v50" stroke={c2} strokeWidth={4} />
          {[100, 116, 132].map((y) => (
            <circle key={y} cx={152} cy={y} r={3.4} fill={m} />
          ))}
          <path d="M84 138h36M200 138h36" stroke={m} strokeWidth={3} />
        </g>
      )
    case 'watchbox':
      return (
        <g>
          <path d="M100 76l14 -34h92l14 34z" fill={c1} />
          <rect x={100} y={76} width={120} height={60} rx={6} fill={c1} />
          <rect x={112} y={86} width={96} height={40} rx={4} fill={c2} />
          <ellipse cx={160} cy={106} rx={20} ry={14} fill="#0d0d10" />
          <path d="M150 56l10 -8 10 8 -4 6h-12z" fill={m} />
        </g>
      )
    case 'mac':
      return (
        <g>
          <path d="M112 30h96l6 104h-108z" fill={c1} />
          <rect x={124} y={42} width={72} height={54} rx={4} fill="#1a1d1a" />
          <rect x={130} y={48} width={60} height={42} fill="#d0d6cc" />
          <rect x={150} y={60} width={20} height={16} rx={3} fill="none" stroke="#222" strokeWidth={2} />
          <circle cx={156} cy={66} r={1.4} fill="#222" />
          <circle cx={164} cy={66} r={1.4} fill="#222" />
          <rect x={138} y={108} width={36} height={4} rx={2} fill="#9a9a90" />
          <rect x={104} y={134} width={112} height={8} rx={2} fill={c1} />
          <path d="M122 118h10" stroke="#6ab04c" strokeWidth={3} />
        </g>
      )
    case 'walkman':
      return (
        <g>
          <rect x={112} y={40} width={96} height={100} rx={8} fill={c1} />
          <rect x={112} y={40} width={96} height={100} rx={8} fill="none" stroke={c2} strokeWidth={4} />
          <rect x={124} y={56} width={72} height={46} rx={4} fill="#1a1a1e" />
          <circle cx={142} cy={79} r={9} fill="#e8e8e8" />
          <circle cx={178} cy={79} r={9} fill="#e8e8e8" />
          <rect x={150} y={72} width={20} height={14} fill="#6a4a3a" />
          {[124, 142, 160, 178].map((x) => (
            <rect key={x} x={x} y={112} width={14} height={16} rx={2} fill={c2} />
          ))}
          <path d="M112 30q48 -24 96 0" fill="none" stroke="#e8a02a" strokeWidth={4} />
        </g>
      )
    case 'gameboy':
      return (
        <g>
          <path d="M122 24h76q6 0 6 6v104q0 12 -22 12h-60q-6 0 -6 -6v-110q0 -6 6 -6z" fill={c1} />
          <rect x={130} y={34} width={60} height={50} rx={4} fill="#5a5a6a" />
          <rect x={138} y={40} width={44} height={38} fill="#9bbc0f" />
          <rect x={146} y={60} width={10} height={10} fill="#306230" />
          <rect x={156} y={50} width={10} height={20} fill="#306230" />
          <path d="M136 100h8v-8h6v8h8v6h-8v8h-6v-8h-8z" fill="#222" />
          <circle cx={180} cy={100} r={6} fill="#a0204a" />
          <circle cx={168} cy={108} r={6} fill="#a0204a" />
        </g>
      )
    case 'console':
      return (
        <g>
          <path d="M84 110l12 -34h128l12 34z" fill="#1a1410" />
          <rect x={84} y={110} width={152} height={22} fill="#1a1410" />
          <rect x={96} y={80} width={128} height={20} fill={c1} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={96} y1={83 + i * 3} x2={224} y2={83 + i * 3} stroke="#0005" />
          ))}
          {[108, 124, 196, 212].map((x) => (
            <rect key={x} x={x} y={116} width={8} height={10} fill="#bbb" />
          ))}
          <rect x={140} y={64} width={40} height={18} fill="#3a2a1a" />
          <rect x={146} y={60} width={28} height={8} fill="#e8a02a" />
        </g>
      )
    case 'keyboard':
      return (
        <g>
          <path d="M72 124l10 -52h156l10 52z" fill={c1} />
          {[0, 1, 2, 3, 4].map((r) =>
            Array.from({ length: 13 - (r === 4 ? 6 : 0) }, (_, i) => (
              <rect key={`${r}-${i}`} x={88 + r * 2 + i * 11 + (r === 4 ? 30 : 0)} y={78 + r * 9} width={r === 4 && i === 3 ? 40 : 9} height={7} rx={1} fill={i > 10 ? '#7a8088' : c2} />
            )),
          )}
        </g>
      )
    case 'radiogram':
      return (
        <g>
          <rect x={76} y={80} width={168} height={52} rx={4} fill={c1} />
          <rect x={76} y={80} width={168} height={52} rx={4} fill="none" stroke="#c8c2b4" strokeWidth={2} />
          <rect x={80} y={132} width={10} height={10} fill="#8a6a40" />
          <rect x={230} y={132} width={10} height={10} fill="#8a6a40" />
          <path d="M78 80l6 -30h152l6 30" fill="#dfe8ee" opacity={0.35} stroke="#dfe8ee" />
          <circle cx={130} cy={70} r={22} fill="#2a2a2a" opacity={0.7} />
          {Array.from({ length: 10 }, (_, i) => (
            <line key={i} x1={186} y1={92 + i * 3.4} x2={236} y2={92 + i * 3.4} stroke="#999" />
          ))}
          <rect x={90} y={100} width={80} height={20} rx={2} fill="#e8e2d2" />
          <circle cx={200} cy={124} r={4} fill="#666" />
        </g>
      )
    case 'turntable':
      return (
        <g>
          <path d="M72 128l20 -52h136l20 52z" fill={c1} />
          <rect x={72} y={128} width={176} height={10} fill={c2} />
          <ellipse cx={150} cy={102} rx={56} ry={20} fill="#111" />
          <ellipse cx={150} cy={102} rx={40} ry={14} fill="none" stroke="#333" />
          <ellipse cx={150} cy={102} rx={12} ry={4} fill="#c0392b" />
          <path d="M226 84l-16 18 -26 10" fill="none" stroke={c2} strokeWidth={4} />
          <circle cx={226} cy={84} r={6} fill={c2} />
          {v.mark === 'dots' ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => <circle key={i} cx={98 + i * 14} cy={116} r={1.4} fill="#ddd" />) : null}
        </g>
      )
    case 'amp':
      return (
        <g>
          <rect x={98} y={26} width={124} height={34} rx={3} fill="#141414" />
          <rect x={98} y={26} width={124} height={8} fill={c2} />
          {[112, 126, 140, 154, 168, 182, 196].map((x) => (
            <circle key={x} cx={x} cy={46} r={4} fill={m} />
          ))}
          <rect x={98} y={62} width={124} height={80} rx={3} fill="#141414" />
          <rect x={106} y={70} width={108} height={64} fill={c1} />
          {Array.from({ length: 16 }, (_, i) => (
            <line key={i} x1={106 + i * 7} y1={70} x2={106 + i * 7} y2={134} stroke="#0004" />
          ))}
          <text x={160} y={42} fontSize={9} fontStyle="italic" fontWeight={800} textAnchor="middle" fill="#fff" opacity={0.9}>
            {v.mark ?? ''}
          </text>
        </g>
      )
    case 'guitar':
    case 'lespaul':
    case 'bass': {
      const neckLen = v.form === 'bass' ? 96 : 80
      return (
        <g transform="rotate(-36 160 96)">
          <rect x={152} y={96 - neckLen - 10} width={16} height={neckLen} fill="#8a5a2a" />
          <rect x={148} y={96 - neckLen - 28} width={24} height={22} rx={4} fill={v.form === 'lespaul' ? '#111' : c2} />
          {v.form === 'lespaul' ? (
            <path d="M160 88q-40 -2 -38 30q-8 12 -4 26q10 22 42 22q32 0 42 -22q4 -14 -4 -26q2 -30 -38 -30z" fill={c1} />
          ) : (
            <path d="M136 86q-20 -10 -18 8q4 12 -2 22q-10 24 14 38q30 12 60 -4q18 -12 6 -32q-8 -12 4 -26q-4 -14 -22 -6q-20 6 -42 0z" fill={c1} />
          )}
          {v.form === 'lespaul' ? <path d="M160 88q-40 -2 -38 30q-8 12 -4 26q10 22 42 22" fill="none" stroke="#f2d27a" strokeWidth={2} /> : null}
          <path d="M140 110q20 -8 40 0l-4 28q-16 6 -32 0z" fill={v.form === 'lespaul' ? '#f2e6c8' : '#f4f1ea'} opacity={0.9} />
          {[112, 124, 136].slice(0, v.form === 'bass' ? 1 : v.form === 'lespaul' ? 2 : 3).map((y) => (
            <rect key={y} x={150} y={y} width={20} height={6} rx={1} fill="#222" />
          ))}
          {[154, 158, 162, 166].map((x) => (
            <line key={x} x1={x} y1={96 - neckLen - 10} x2={x} y2={150} stroke="#ddd" strokeWidth={0.6} />
          ))}
        </g>
      )
    }
    case 'flyingv':
      return (
        <g transform="rotate(-20 160 96)">
          <rect x={153} y={16} width={14} height={78} fill="#6a3a1a" />
          <path d="M150 4h20l6 16h-32z" fill="#1a1a1a" />
          <path d="M160 90l-44 70h20l24 -38 24 38h20z" fill={c1} />
          <path d="M150 100l10 -10 10 10 -4 22h-12z" fill="#f4f1ea" />
          <rect x={152} y={104} width={16} height={6} fill="#222" />
          <rect x={152} y={116} width={16} height={6} fill="#222" />
        </g>
      )
    case 'piano':
      return (
        <g>
          <polygon points="84,86 196,22 242,74" fill="#18181c" stroke="#6a6a72" strokeWidth={1.4} />
          <line x1={190} y1={82} x2={214} y2={44} stroke="#9a9aa2" strokeWidth={2} />
          <path d="M76 110V86H212Q248 86 250 98Q248 110 212 110Z" fill="#0e0e11" stroke="#6a6a72" strokeWidth={1.4} />
          <path d="M84 90H206Q236 90 240 98" fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={3} />
          <rect x={60} y={100} width={40} height={10} fill="#f4f1ea" />
          {[64, 70, 76, 82, 88, 94].map((x) => (
            <rect key={x} x={x} y={100} width={3} height={6} fill="#111" />
          ))}
          {[82, 176, 236].map((x) => (
            <rect key={x} x={x} y={110} width={7} height={28} rx={2} fill="#0e0e11" stroke="#555" />
          ))}
          <path d="M150 110v18h10" stroke={m} strokeWidth={2} fill="none" />
        </g>
      )
    case 'violin':
      return (
        <g transform="rotate(-28 160 90)">
          <rect x={155} y={0} width={10} height={60} fill="#1a1a1a" />
          <path d="M156 -6q-8 -10 4 -12q12 2 4 12z" fill="#6a3a1a" />
          <path d="M160 52q-30 0 -28 22q2 10 8 14q-10 6 -12 20q0 30 32 30q32 0 32 -30q-2 -14 -12 -20q6 -4 8 -14q2 -22 -28 -22z" fill={c1} />
          <path d="M148 90q-4 10 0 18M172 90q4 10 0 18" stroke="#111" strokeWidth={2} fill="none" />
          <rect x={150} y={104} width={20} height={4} fill="#e8dcc0" />
          {[156, 159, 161, 164].map((x) => (
            <line key={x} x1={x} y1={0} x2={x} y2={124} stroke="#ddd" strokeWidth={0.6} />
          ))}
          <rect x={154} y={122} width={12} height={16} fill="#111" />
        </g>
      )
    case 'mic':
      return (
        <g>
          <rect x={154} y={98} width={12} height={34} fill={m} />
          <ellipse cx={160} cy={138} rx={30} ry={6} fill={m} />
          <rect x={132} y={24} width={56} height={80} rx={26} fill={m} />
          <clipPath id={g('clip')}>
            <rect x={132} y={24} width={56} height={80} rx={26} />
          </clipPath>
          <g clipPath={`url(#${g('clip')})`} stroke="#0006">
            {Array.from({ length: 14 }, (_, i) => (
              <line key={i} x1={132} y1={28 + i * 6} x2={188} y2={28 + i * 6} />
            ))}
          </g>
          <rect x={132} y={60} width={56} height={10} fill={c1} />
        </g>
      )
    case 'vinyl':
      return (
        <g>
          <rect x={86} y={30} width={108} height={108} fill={c2} />
          <rect x={96} y={40} width={88} height={88} fill={c1} opacity={0.7} />
          <circle cx={196} cy={84} r={54} fill="#0e0e10" />
          {[46, 38, 30, 22].map((r) => (
            <circle key={r} cx={196} cy={84} r={r} fill="none" stroke="#2a2a2e" />
          ))}
          <circle cx={196} cy={84} r={16} fill={c1} />
          <circle cx={196} cy={84} r={2.4} fill="#111" />
        </g>
      )
    case 'coin':
      return (
        <g>
          {v.mark === 'head' ? (
            <path d="M160 32q30 2 44 20q12 18 6 40q-4 26 -26 38q-22 10 -44 2q-26 -10 -30 -36q-4 -30 14 -48q14 -14 36 -16z" fill={m} />
          ) : (
            <circle cx={160} cy={84} r={52} fill={m} />
          )}
          {v.mark === 'head' ? (
            <text x={160} y={52} fontSize={9} fontWeight={700} textAnchor="middle" fill="#0006" letterSpacing={2}>
              IMP · CAESAR
            </text>
          ) : null}
          <circle cx={160} cy={84} r={44} fill="none" stroke="#0004" strokeWidth={2} />
          {Array.from({ length: 40 }, (_, i) => {
            const a = (i * Math.PI) / 20
            return <line key={i} x1={160 + 49 * Math.cos(a)} y1={84 + 49 * Math.sin(a)} x2={160 + 52 * Math.cos(a)} y2={84 + 52 * Math.sin(a)} stroke="#0003" />
          })}
          {v.mark === 'owl' ? (
            <g fill="#0005">
              <ellipse cx={160} cy={92} rx={18} ry={24} />
              <circle cx={152} cy={76} r={7} fill="#fff6" />
              <circle cx={168} cy={76} r={7} fill="#fff6" />
              <circle cx={152} cy={76} r={3} />
              <circle cx={168} cy={76} r={3} />
              <path d="M186 60q10 10 4 24" stroke="#0005" strokeWidth={3} fill="none" />
            </g>
          ) : v.mark === 'liberty' ? (
            <g fill="#0005">
              <path d="M140 108q-6 -30 16 -42q20 -6 26 12q2 12 -8 16l4 14z" />
              {Array.from({ length: 7 }, (_, i) => (
                <polygon key={i} points={starPoints(126 + i * 11, 124 - Math.sin((i / 6) * Math.PI) * 6, 3)} />
              ))}
            </g>
          ) : (
            <g fill="#0005">
              <path d="M146 110q-10 -34 14 -46q22 -4 26 16q0 14 -10 18l2 12z" />
              <path d="M150 62q10 -10 26 -2" stroke="#0005" strokeWidth={4} fill="none" />
            </g>
          )}
        </g>
      )
    case 'bear':
      return (
        <g fill={c1}>
          <circle cx={132} cy={40} r={14} />
          <circle cx={188} cy={40} r={14} />
          <circle cx={160} cy={58} r={30} />
          <ellipse cx={160} cy={112} rx={34} ry={30} />
          <ellipse cx={120} cy={104} rx={12} ry={22} transform="rotate(30 120 104)" />
          <ellipse cx={200} cy={104} rx={12} ry={22} transform="rotate(-30 200 104)" />
          <ellipse cx={136} cy={138} rx={16} ry={10} />
          <ellipse cx={184} cy={138} rx={16} ry={10} />
          <ellipse cx={160} cy={68} rx={12} ry={9} fill={c2} />
          <circle cx={148} cy={52} r={3} fill="#111" />
          <circle cx={172} cy={52} r={3} fill="#111" />
          <circle cx={160} cy={64} r={3.4} fill="#111" />
          <circle cx={188} cy={42} r={3} fill={m} />
          <path d="M142 84q18 10 36 0" stroke="#b3202a" strokeWidth={4} fill="none" />
        </g>
      )
    case 'cube': {
      const cols = ['#e8e8e8', '#b3202a', '#1f5fb0', '#e8a02a', '#2e9a4a', '#f2d23a']
      return (
        <g>
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <g key={`${r}${c}`}>
                <rect x={122 + c * 20} y={62 + r * 20} width={18} height={18} rx={2} fill={cols[(r * 3 + c) % 6]} stroke="#111" strokeWidth={2} />
                <polygon points={`${122 + c * 20},${62} ${140 + c * 20},${62} ${152 + c * 20},${48} ${134 + c * 20},${48}`} transform={`translate(${r * 4} ${-r * 5})`} fill={cols[(c + r + 2) % 6]} stroke="#111" strokeWidth={2} />
                <polygon points={`182,${62 + r * 20} 194,${48 + r * 20} 194,${66 + r * 20} 182,${80 + r * 20}`} transform={`translate(${c * 4} ${-c * 5})`} fill={cols[(c + r + 4) % 6]} stroke="#111" strokeWidth={2} />
              </g>
            )),
          )}
        </g>
      )
    }
    case 'card':
      return (
        <g>
          <rect x={126} y={26} width={68} height={112} rx={3} fill="#efe6cf" stroke="#8a6a3a" />
          <rect x={132} y={32} width={56} height={84} fill={c1} />
          <ellipse cx={160} cy={62} rx={12} ry={15} fill="#e0b48a" />
          <path d="M136 116q2 -30 24 -30q22 0 24 30z" fill={c2} />
          <path d="M146 52q14 -12 28 0" fill={c2} />
          <rect x={132} y={120} width={56} height={12} fill="#efe6cf" />
          <text x={160} y={130} fontSize={8} fontWeight={800} textAnchor="middle" fill="#3a2a1a">
            {v.mark ?? ''}
          </text>
        </g>
      )
    case 'key':
      return (
        <g fill={m} transform="rotate(-18 160 90)">
          <circle cx={112} cy={90} r={26} />
          <circle cx={112} cy={90} r={12} fill="#0008" />
          <rect x={134} y={84} width={100} height={12} rx={4} />
          <rect x={206} y={96} width={10} height={18} />
          <rect x={222} y={96} width={10} height={24} />
          {v.mark ? (
            <text x={112} y={124} fontSize={10} fontWeight={800} textAnchor="middle" fill={c1}>
              {v.mark}
            </text>
          ) : null}
          <Gem x={112} y={66} r={6} color={c1} />
        </g>
      )
    case 'seal':
      return (
        <g>
          <rect x={150} y={30} width={20} height={44} rx={6} fill={c2} />
          <circle cx={160} cy={30} r={12} fill={c2} />
          <path d="M126 74h68l6 14h-80z" fill={m} />
          <circle cx={160} cy={122} r={26} fill={c1} />
          <circle cx={160} cy={122} r={18} fill="none" stroke="#0005" strokeWidth={2} />
          <path d="M150 128v-12l10 -8 10 8v12z" fill="#0005" />
        </g>
      )
    case 'goldbar':
      return (
        <g>
          <polygon points="98,128 222,128 206,92 114,92" fill={m} stroke="#6a4a12" />
          <polygon points="114,92 206,92 196,76 124,76" fill="#fbe9ad" />
          <text x={160} y={116} fontSize={10} fontWeight={800} textAnchor="middle" fill="#6a4a12">
            {v.mark ?? '999.9'}
          </text>
          <path d="M150 96q10 -8 20 0" fill="none" stroke="#6a4a12" strokeWidth={2} />
          <circle cx={170} cy={96} r={2} fill="#6a4a12" />
        </g>
      )
    case 'prism':
      return (
        <g>
          <path d="M40 60L130 90" stroke="#ff2a2a" strokeWidth={3} opacity={0.9} />
          {['#ff2a2a', '#ff9a2a', '#f2e22a', '#2ad04a', '#2a8aff', '#8a2aff'].map((c, i) => (
            <path key={c} d={`M190 92L290 ${58 + i * 12}`} stroke={c} strokeWidth={3} opacity={0.85} />
          ))}
          <polygon points="160,36 206,130 114,130" fill={c1} opacity={0.55} stroke="#dff4ff" strokeWidth={2} />
          <polygon points="160,36 206,130 170,130" fill="#fff" opacity={0.15} />
        </g>
      )
    case 'ledger':
      return (
        <g>
          <rect x={106} y={32} width={108} height={110} rx={4} fill="#101012" />
          <rect x={106} y={32} width={16} height={110} fill="#1d1d22" />
          <rect x={200} y={78} width={20} height={18} rx={3} fill={m} />
          <text x={166} y={82} fontSize={10} fontWeight={800} textAnchor="middle" fill={c1} letterSpacing={1}>
            LEDGER
          </text>
          <polygon points={starPoints(166, 104, 10)} fill={c1} />
          <path d="M130 46h72M130 126h72" stroke={c1} strokeWidth={1.4} />
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d="M100 124l-8 -64 34 30 34 -48 34 48 34 -30 -8 64z" fill={m} stroke="#6a4a12" />
          <rect x={98} y={120} width={124} height={16} rx={3} fill={m} />
          {[118, 160, 202].map((x, i) => (
            <Gem key={x} x={x} y={128} r={5} color={i === 1 ? c1 : c2} />
          ))}
          <Gem x={160} y={76} r={9} color={c1} />
          {[92, 126, 194, 228].map((x, i) => (
            <circle key={x} cx={x} cy={i === 1 || i === 2 ? 88 : 58} r={4} fill="#f4f1ea" />
          ))}
        </g>
      )
    case 'duckcoin':
      return (
        <g>
          <circle cx={160} cy={84} r={52} fill={m} />
          <circle cx={160} cy={84} r={42} fill="none" stroke="#6a4a12" strokeWidth={2} />
          <path d="M138 96q0 -26 22 -28q8 -14 22 -8q6 6 -2 10l8 4 -10 4q4 20 -14 26q-22 4 -26 -8z" fill="#6a4a12" />
          <circle cx={170} cy={66} r={2} fill="#fbe9ad" />
          <text x={160} y={124} fontSize={9} fontWeight={800} textAnchor="middle" fill="#6a4a12">
            {v.mark ?? 'DUCK'}
          </text>
        </g>
      )
    case 'egg':
      return (
        <g>
          <path d="M138 134h44l-6 -10h-32z" fill={m} />
          <ellipse cx={160} cy={76} rx={40} ry={52} fill={c1} />
          <ellipse cx={160} cy={76} rx={40} ry={52} fill="none" stroke={m} strokeWidth={3} />
          {[-30, -10, 10, 30].map((d) => (
            <path key={d} d={`M${160 + d * 0.9} 26q${-d * 0.4} 50 0 102`} fill="none" stroke={m} strokeWidth={2} />
          ))}
          <path d="M122 76h76" stroke={m} strokeWidth={3} />
          {[134, 150, 170, 186].map((x) => (
            <circle key={x} cx={x} cy={76} r={3} fill={c2} />
          ))}
          <Gem x={160} y={28} r={6} color={c2} />
        </g>
      )
    case 'mystery':
      return (
        <g>
          <rect x={98} y={62} width={124} height={76} rx={6} fill={c1} />
          <path d="M98 62l18 -26h88l18 26z" fill={c1} opacity={0.75} />
          <rect x={98} y={62} width={124} height={76} rx={6} fill="none" stroke={m} strokeWidth={3} />
          <rect x={156} y={62} width={8} height={76} fill={m} />
          {[128, 192].map((x) => (
            <text key={x} x={x} y={112} fontSize={30} fontWeight={900} textAnchor="middle" fill={c2}>
              ?
            </text>
          ))}
        </g>
      )
    case 'duck':
      return (
        <g>
          <rect x={120} y={128} width={80} height={12} rx={2} fill="#1a1410" />
          <path d="M126 128q-10 -40 22 -50q-10 -30 16 -38q22 -2 26 18q2 10 -4 16l18 -2q-4 14 -18 14q20 18 8 42z" fill={m} />
          <circle cx={172} cy={52} r={3} fill="#111" />
          <path d="M150 104q14 8 28 -2" stroke="#6a4a12" strokeWidth={2} fill="none" />
        </g>
      )
    case 'tape':
      return (
        <g>
          <rect x={92} y={52} width={136} height={78} rx={6} fill="#141416" />
          <rect x={104} y={62} width={112} height={26} rx={3} fill={c1} />
          <text x={160} y={80} fontSize={11} fontWeight={800} textAnchor="middle" fill="#111">
            {v.mark ?? 'CAM 01'}
          </text>
          <rect x={120} y={96} width={80} height={24} rx={10} fill="#2a2a2e" />
          <circle cx={138} cy={108} r={8} fill="#e8e8e8" />
          <circle cx={182} cy={108} r={8} fill="#e8e8e8" />
          <circle cx={214} cy={60} r={4} fill="#d0202a" />
        </g>
      )
  }
}

export function ObjectArt({ v, g }: { v: ObjV; g: G }) {
  return (
    <Scene g={g} tone={v.tone ?? 'warm'}>
      <defs>
        <MetalRamp id={g('m')} metal={v.metal ?? 'brass'} />
      </defs>
      {body(v, `url(#${g('m')})`, g)}
    </Scene>
  )
}
