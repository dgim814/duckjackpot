import { MetalRamp, Scene, type G } from "./scene";

export type CarBody =
  | "gt60"
  | "wedge"
  | "hyper"
  | "f40"
  | "gull"
  | "prewar"
  | "atlantic"
  | "veteran"
  | "roadster"
  | "etype"
  | "sedan"
  | "gtcoupe"
  | "p911"
  | "miura"
  | "racer"
  | "boxy"
  | "beetle"
  | "fiat500"
  | "mini"
  | "cv2"
  | "ds";

export type CarV = {
  k: "car";
  body: CarBody;
  color: string;
  /** Lower-body / roof contrast colour. */
  accent?: string;
  stripe?: string;
  number?: string;
  wing?: boolean;
  wheels?: "alloy" | "wire" | "spoke" | "steel";
};

type Shape = { d: string; glass: string; wheels: [number, number]; r: number };

const SHAPES: Record<CarBody, Shape> = {
  gt60: {
    d: "M62 124Q58 112 72 106L118 98Q140 78 170 76Q204 76 224 94L254 102Q262 108 258 124Z",
    glass: "M132 97Q146 83 168 82Q192 82 206 96Z",
    wheels: [96, 226],
    r: 16,
  },
  wedge: {
    d: "M58 124L62 110L150 90Q170 76 196 78L238 92L260 102L262 124Z",
    glass: "M152 90Q170 81 194 82L214 90Z",
    wheels: [94, 228],
    r: 17,
  },
  hyper: {
    d: "M56 124Q56 114 70 110L128 98Q156 80 186 82Q220 86 240 100L262 106L262 124Z",
    glass: "M142 98Q160 87 184 87Q206 89 218 98Z",
    wheels: [92, 230],
    r: 17,
  },
  f40: {
    d: "M58 124L62 112L140 96Q164 82 192 84L236 96L262 102L262 124Z",
    glass: "M146 96Q166 86 190 87L208 94Z",
    wheels: [94, 228],
    r: 17,
  },
  gull: {
    d: "M60 124Q58 108 80 104L120 98Q138 76 168 74Q200 74 216 94Q246 98 258 110L260 124Z",
    glass: "M134 97Q148 81 168 80Q190 80 202 95Z",
    wheels: [96, 226],
    r: 16,
  },
  prewar: {
    d: "M60 124Q58 112 76 108L150 104L164 94L194 94L202 104L246 106Q264 110 262 124Z",
    glass: "M166 95L172 84L176 95Z",
    wheels: [100, 226],
    r: 18,
  },
  atlantic: {
    d: "M60 124Q58 108 82 106L128 102Q150 76 184 76Q226 80 256 118L258 124Z",
    glass: "M140 101Q156 83 180 82Q204 84 216 98Z",
    wheels: [100, 226],
    r: 18,
  },
  veteran: {
    d: "M70 120L70 104L142 104L142 90L152 90L152 104L196 104L196 78L234 78L234 104L252 104L252 120Z",
    glass: "M142 90L146 72L150 90Z",
    wheels: [104, 222],
    r: 22,
  },
  roadster: {
    d: "M60 124Q58 110 76 106L150 100L160 88L166 100L230 100Q256 104 260 124Z",
    glass: "M150 100L160 86L166 100Z",
    wheels: [96, 228],
    r: 16,
  },
  etype: {
    d: "M56 122Q54 110 68 108L150 98Q170 80 196 80Q222 82 244 104Q258 110 260 122Z",
    glass: "M160 97Q176 84 196 84Q214 86 226 100Z",
    wheels: [94, 232],
    r: 16,
  },
  sedan: {
    d: "M58 124L60 102L104 98L126 74L220 74L240 98L262 102L262 124Z",
    glass: "M130 97L141 79L180 79L180 97ZM186 97L186 79L214 79L228 97Z",
    wheels: [98, 228],
    r: 18,
  },
  gtcoupe: {
    d: "M58 124Q58 110 72 106L126 98Q150 78 180 78Q214 80 236 98L260 106L260 124Z",
    glass: "M138 98Q154 83 180 83Q206 85 220 98Z",
    wheels: [94, 228],
    r: 17,
  },
  p911: {
    d: "M62 124Q60 112 72 108L110 104Q132 76 172 74Q214 76 244 108Q258 112 258 124Z",
    glass: "M122 102Q140 82 170 80Q196 80 212 100Z",
    wheels: [96, 222],
    r: 16,
  },
  miura: {
    d: "M56 124Q56 112 70 110L140 102Q162 86 190 86Q220 88 248 106L262 110L262 124Z",
    glass: "M150 101Q166 90 186 90L196 100Z",
    wheels: [94, 230],
    r: 17,
  },
  racer: {
    d: "M56 124Q58 108 80 104L140 96Q160 84 180 84Q208 86 230 98L262 108L262 124Z",
    glass: "M150 95Q164 87 180 88L186 95Z",
    wheels: [96, 230],
    r: 16,
  },
  boxy: {
    d: "M60 124L62 106L112 100L138 78L210 78L234 98L260 102L260 124Z",
    glass: "M142 97L156 83L200 83L200 97ZM206 97L206 83L222 97Z",
    wheels: [96, 226],
    r: 17,
  },
  beetle: {
    d: "M70 124Q66 104 88 100Q110 60 160 58Q212 60 236 104Q256 108 252 124Z",
    glass: "M118 90Q134 68 160 66Q184 68 196 90Z",
    wheels: [100, 216],
    r: 16,
  },
  fiat500: {
    d: "M92 124Q88 106 104 102Q116 70 160 68Q204 70 214 102Q230 106 228 124Z",
    glass: "M122 96Q134 76 160 75Q186 76 196 96Z",
    wheels: [114, 206],
    r: 13,
  },
  mini: {
    d: "M88 124L90 100L110 96L118 72L204 72L210 96L230 98L232 124Z",
    glass: "M122 94L128 77L160 77L160 94ZM166 94L166 77L200 77L204 94Z",
    wheels: [112, 208],
    r: 12,
  },
  cv2: {
    d: "M78 124Q76 104 96 100Q110 66 150 62Q196 60 220 86Q234 100 240 124Z",
    glass: "M124 92Q134 70 152 68L176 68L184 92Z",
    wheels: [106, 214],
    r: 15,
  },
  ds: {
    d: "M58 124Q54 112 74 104Q120 92 142 78Q180 70 210 80Q240 90 262 116L262 124Z",
    glass: "M144 90Q160 78 182 77Q204 78 222 90Z",
    wheels: [98, 226],
    r: 16,
  },
};

function Wheel({
  x,
  r,
  kind,
  g,
}: {
  x: number;
  r: number;
  kind: CarV["wheels"];
  g: G;
}) {
  const y = 138 - r;
  const rim = `url(#${g("rim")})`;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#0b0b0c" />
      <circle
        cx={x}
        cy={y}
        r={r * 0.66}
        fill={kind === "steel" ? "#d9d9d9" : rim}
      />
      {kind === "wire" || kind === "spoke"
        ? Array.from({ length: kind === "wire" ? 16 : 10 }, (_, i) => {
            const a = (i * Math.PI) / (kind === "wire" ? 8 : 5);
            return (
              <line
                key={i}
                x1={x}
                y1={y}
                x2={x + r * 0.64 * Math.cos(a)}
                y2={y + r * 0.64 * Math.sin(a)}
                stroke="#3a3a3a"
                strokeWidth={kind === "spoke" ? 2 : 0.8}
              />
            );
          })
        : Array.from({ length: 5 }, (_, i) => {
            const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            return (
              <line
                key={i}
                x1={x}
                y1={y}
                x2={x + r * 0.6 * Math.cos(a)}
                y2={y + r * 0.6 * Math.sin(a)}
                stroke="#2a2a2a"
                strokeWidth={3}
              />
            );
          })}
      <circle cx={x} cy={y} r={r * 0.16} fill="#2a2a2a" />
    </g>
  );
}

export function CarArt({ v, g }: { v: CarV; g: G }) {
  const s = SHAPES[v.body];
  const wheels =
    v.wheels ??
    (v.body === "prewar" || v.body === "atlantic"
      ? "wire"
      : v.body === "veteran"
        ? "spoke"
        : "alloy");
  return (
    <Scene g={g} tone="studio" floor={false}>
      <defs>
        <MetalRamp id={g("rim")} metal="steel" />
        <linearGradient id={g("sh")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.35} />
          <stop offset="45%" stopColor="#fff" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.45} />
        </linearGradient>
        <clipPath id={g("body")}>
          <path d={s.d} />
        </clipPath>
      </defs>
      <rect x={0} y={132} width={320} height={48} fill="#000" opacity={0.35} />
      <g transform="translate(160 94) scale(0.88) translate(-160 -98)">
        <ellipse cx={160} cy={140} rx={112} ry={6} fill="#000" opacity={0.6} />
        {v.body === "prewar" || v.body === "veteran" ? (
          <g fill={v.accent ?? "#141414"}>
            <path
              d={`M${s.wheels[0] - s.r - 8} ${136 - s.r}Q${s.wheels[0]} ${120 - s.r * 1.6} ${s.wheels[0] + s.r + 10} ${136 - s.r}L${s.wheels[1] - s.r - 10} ${136 - s.r}Q${s.wheels[1]} ${120 - s.r * 1.6} ${s.wheels[1] + s.r + 6} ${130 - s.r}L${s.wheels[1] + s.r + 6} ${136 - s.r * 0.6}H${s.wheels[0] - s.r - 8}Z`}
            />
          </g>
        ) : null}
        <path d={s.d} fill={v.color} />
        <g clipPath={`url(#${g("body")})`}>
          {v.accent && v.body !== "prewar" && v.body !== "veteran" ? (
            <rect x={0} y={112} width={320} height={20} fill={v.accent} />
          ) : null}
          {v.stripe ? (
            <g fill={v.stripe}>
              <rect x={0} y={106} width={320} height={4} />
              <rect x={0} y={112} width={320} height={4} />
            </g>
          ) : null}
          <rect
            x={0}
            y={0}
            width={320}
            height={180}
            fill={`url(#${g("sh")})`}
          />
          <line
            x1={50}
            y1={112}
            x2={270}
            y2={112}
            stroke="#fff"
            strokeOpacity={0.18}
            strokeWidth={1.2}
          />
          {v.body === "miura"
            ? [196, 204, 212, 220].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1={90}
                  x2={x + 10}
                  y2={102}
                  stroke="#000"
                  strokeOpacity={0.5}
                  strokeWidth={2}
                />
              ))
            : null}
          {v.body === "cv2"
            ? [80, 86, 92, 98, 104].map((x) => (
                <line
                  key={x}
                  x1={x}
                  y1={100}
                  x2={x + 16}
                  y2={96}
                  stroke="#000"
                  strokeOpacity={0.25}
                  strokeWidth={1.4}
                />
              ))
            : null}
          {v.body === "atlantic" ? (
            <path
              d="M128 102Q150 74 184 74Q226 78 256 118"
              fill="none"
              stroke="#fff"
              strokeOpacity={0.35}
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          ) : null}
        </g>
        <path d={s.glass} fill="#16202c" stroke="#9fb4c8" strokeOpacity={0.4} />
        <path d={s.glass} fill="#fff" opacity={0.08} />
        {v.number ? (
          <g>
            <circle cx={170} cy={112} r={11} fill="#f4f1ea" stroke="#111" />
            <text
              x={170}
              y={116}
              textAnchor="middle"
              fontSize={12}
              fontWeight={800}
              fontFamily="Arial, sans-serif"
              fill="#111"
            >
              {v.number}
            </text>
          </g>
        ) : null}
        {v.wing ? (
          <g fill={v.color}>
            <rect x={222} y={82} width={44} height={6} rx={2} />
            <rect x={236} y={88} width={4} height={12} />
            <rect x={256} y={88} width={4} height={12} />
          </g>
        ) : null}
        <ellipse
          cx={v.body === "veteran" ? 72 : s.wheels[0] - s.r - 18}
          cy={v.body === "veteran" ? 104 : 112}
          rx={4}
          ry={3}
          fill="#fff7d6"
          opacity={0.9}
        />
        <Wheel x={s.wheels[0]} r={s.r} kind={wheels} g={g} />
        <Wheel x={s.wheels[1]} r={s.r} kind={wheels} g={g} />
      </g>
    </Scene>
  );
}
