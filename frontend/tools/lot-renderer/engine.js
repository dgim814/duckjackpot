/**
 * DuckJackpot lot renderer — offline studio renders of Black Market lots.
 *
 * Scenes are trees of signed-distance primitives (see dsl.js). The tree is
 * compiled to a GLSL `map()` and raymarched in WebGL2 with a small physically
 * based shading model: metals, dielectrics (plastic / leather / wood / paper),
 * clear-coated paint, glass and cut gems, lit by studio softboxes, with soft
 * shadows, ambient occlusion, a glossy floor and per-object canvas decals
 * (dials, labels, coin reliefs, globe maps). Output is baked to WebP.
 */

const PRELUDE = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform vec2 uTile;
uniform vec3 uCamPos;
uniform mat3 uCamRot;
uniform float uFov;
uniform sampler2D uAtlas;
uniform vec4 uMatA[NMAT];
uniform vec4 uMatB[NMAT];
uniform vec4 uMatC[NMAT];
uniform vec4 uMatD[NMAT];
uniform vec3 uWall;
uniform vec3 uHalo;
uniform float uExposure;
uniform float uFloorY;
uniform float uFloorGloss;
uniform vec3 uSpot;
out vec4 fragColor;

#define PI 3.14159265

// ---------- noise ----------
float hash13(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
float cells(vec3 p) {
  vec3 i = floor(p), f = fract(p); float d = 1.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(x, y, z); vec3 o = vec3(hash13(i + g), hash13(i + g + 17.1), hash13(i + g + 41.7));
    d = min(d, length(g + o - f));
  }
  return d;
}

// ---------- primitives ----------
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float sdCyl(vec3 p, float r, float h, float rr) { vec2 d = vec2(length(p.xz) - r + rr, abs(p.y) - h + rr); return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rr; }
float sdTorus(vec3 p, float R, float r) { vec2 q = vec2(length(p.xz) - R, p.y); return length(q) - r; }
float sdTorusArc(vec3 p, float R, float r, float a0, float a1) {
  float a = atan(p.z, p.x); float am = clamp(a, a0, a1);
  vec3 c = vec3(cos(am) * R, 0.0, sin(am) * R);
  return length(p - c) - r;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
float sdEll(vec3 p, vec3 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-5); }
float sdCone(vec3 p, float h, float r1, float r2) {
  vec2 q = vec2(length(p.xz), p.y);
  vec2 k1 = vec2(r2, h); vec2 k2 = vec2(r2 - r1, 2.0 * h);
  vec2 ca = vec2(q.x - min(q.x, (q.y < 0.0) ? r1 : r2), abs(q.y) - h);
  vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}
// brilliant cut, table up (+y), radius r at the girdle: table, star, kite and upper-girdle facets; 16+8 pavilion
float sdBrilliant(vec3 p, float r) {
  float g = length(p.xz) - r;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * PI / 4.0;
    g = max(g, dot(p, normalize(vec3(cos(a), 1.25, sin(a)))) - 0.6 * r);                         // kite (bezel)
    g = max(g, dot(p, normalize(vec3(cos(a + PI / 8.0), 2.4, sin(a + PI / 8.0)))) - 0.52 * r);   // star
    g = max(g, dot(p, normalize(vec3(cos(a + PI / 16.0), 0.72, sin(a + PI / 16.0)))) - 0.72 * r); // upper girdle
    g = max(g, dot(p, normalize(vec3(cos(a - PI / 16.0), 0.72, sin(a - PI / 16.0)))) - 0.72 * r);
    g = max(g, dot(p, normalize(vec3(cos(a), -1.0, sin(a)))) - 0.62 * r);                        // pavilion main
    g = max(g, dot(p, normalize(vec3(cos(a + PI / 16.0), -0.8, sin(a + PI / 16.0)))) - 0.7 * r); // lower girdle
    g = max(g, dot(p, normalize(vec3(cos(a - PI / 16.0), -0.8, sin(a - PI / 16.0)))) - 0.7 * r);
  }
  return max(g, p.y - 0.34 * r);
}
float sdEmeraldCut(vec3 p, vec3 b) {
  float d = sdBox(p, b, 0.0);
  float c = (abs(p.x) + abs(p.z)) - (b.x + b.z) * 0.78;
  float t = abs(p.y) * 1.6 + max(abs(p.x) / b.x, abs(p.z) / b.z) * b.y * 1.2 - b.y * 2.1;
  return max(max(d, c * 0.7), t * 0.6);
}
float extrude(float d2, float z, float h, float rr) { vec2 w = vec2(d2 + rr, abs(z) - h + rr); return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - rr; }
float sd2Circle(vec2 p, float r) { return length(p) - r; }
float sd2RRect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float sd2Ellipse(vec2 p, vec2 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-5); }
float sd2Annulus(vec2 p, float R, float r) { return abs(length(p) - (R + r) * 0.5) - (R - r) * 0.5; }
float sd2NGon(vec2 p, float r, float n, float rot) {
  float a = atan(p.y, p.x) - rot; float s = 2.0 * PI / n;
  a = mod(a + s * 0.5, s) - s * 0.5;
  return length(p) * cos(a) - r * cos(PI / n);
}
float sdRoseCut(vec3 p, float r) {
  float d = max(length(p.xz) - r, -p.y);
  for (int i = 0; i < 6; i++) {
    float a = float(i) * PI / 3.0;
    d = max(d, dot(p, normalize(vec3(cos(a), 0.55, sin(a)))) - 0.55 * r);
    d = max(d, dot(p, normalize(vec3(cos(a + PI / 6.0), 1.6, sin(a + PI / 6.0)))) - 0.74 * r);
  }
  return max(d, p.y - 0.62 * r);
}
float sdCushionCut(vec3 p, float r) {
  vec3 q = p; float sq = sd2RRect(q.xz, vec2(r * 0.92), r * 0.35);
  float g = -1e9;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * PI / 4.0 + PI / 8.0;
    g = max(g, dot(p, normalize(vec3(cos(a), 1.3, sin(a)))) - 0.64 * r);
    g = max(g, dot(p, normalize(vec3(cos(a + PI / 8.0), -1.1, sin(a + PI / 8.0)))) - 0.64 * r);
  }
  return max(max(g, p.y - 0.36 * r), sq);
}
vec3 polarZ(vec3 q, float n) { float s = 2.0 * PI / n; float a = atan(q.y, q.x); a = mod(a + s * 0.5, s) - s * 0.5; return vec3(length(q.xy) * vec2(cos(a), sin(a)), q.z); }
vec3 polarY(vec3 q, float n) { float s = 2.0 * PI / n; float a = atan(q.z, q.x); a = mod(a + s * 0.5, s) - s * 0.5; return vec3(length(q.xz) * cos(a), q.y, length(q.xz) * sin(a)); }
vec3 arcX(vec3 q, float a0, float da, float n) {
  float a = atan(q.y, q.z); float ap = mod(a - a0, 2.0 * PI);
  float i = clamp(floor(ap / da), 0.0, n - 1.0); float c = a0 + (i + 0.5) * da;
  float cs = cos(c), sn = sin(c);
  return vec3(q.x, -sn * q.z + cs * q.y, cs * q.z + sn * q.y);
}
vec3 repX(vec3 q, float step, float n) { float i = clamp(floor(q.x / step + n * 0.5), 0.0, n - 1.0); return vec3(q.x - (i - n * 0.5 + 0.5) * step, q.y, q.z); }
vec2 opU(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
vec2 opSU(vec2 a, vec2 b, float k) { float h = clamp(0.5 + 0.5 * (b.x - a.x) / k, 0.0, 1.0); float d = mix(b.x, a.x, h) - k * h * (1.0 - h); return vec2(d, h > 0.5 ? a.y : b.y); }
vec2 opS(vec2 a, vec2 b) { return vec2(max(a.x, -b.x), a.y); }
vec2 opI(vec2 a, vec2 b) { return vec2(max(a.x, b.x), a.y); }
vec2 opSI(vec2 a, vec2 b, float k) { float h = clamp(0.5 - 0.5 * (b.x - a.x) / k, 0.0, 1.0); return vec2(mix(b.x, a.x, h) + k * h * (1.0 - h), a.y); }
`

const SHADING = /* glsl */ `
// ---------- studio environment ----------
float softbox(vec3 d, vec3 c, vec3 up, vec2 size, float rough) {
  vec3 r = normalize(cross(up, c)); vec3 u = cross(c, r);
  float z = dot(d, c); if (z <= 0.0) return 0.0;
  vec2 q = vec2(dot(d, r), dot(d, u)) / z;
  float w = 0.02 + rough * 0.9;
  return smoothstep(size.x + w, size.x - w, abs(q.x)) * smoothstep(size.y + w, size.y - w, abs(q.y));
}
vec3 env(vec3 d, float rough) {
  // light-tent studio: warm key softbox, cool strip fill, top panel, rim strip, low bounce card
  vec3 col = mix(vec3(0.02, 0.018, 0.016), vec3(0.09, 0.08, 0.07), smoothstep(-0.4, 0.8, d.y));
  col += uWall * 0.5 * smoothstep(0.5, -0.1, abs(d.y - 0.05));
  float k = 1.0 / (1.0 + rough * 3.0);
  col += vec3(1.0, 0.95, 0.88) * 6.0 * k * softbox(d, normalize(vec3(-0.6, 0.6, 0.55)), vec3(0, 1, 0), vec2(0.75, 0.55), rough);
  col += vec3(0.85, 0.92, 1.0) * 3.0 * k * softbox(d, normalize(vec3(0.9, 0.3, 0.35)), vec3(0, 1, 0), vec2(0.22, 0.9), rough);
  col += vec3(1.0) * 2.0 * k * softbox(d, vec3(0, 1, 0), vec3(0, 0, 1), vec2(0.7, 0.7), rough);
  col += vec3(1.0, 0.88, 0.72) * 3.0 * k * softbox(d, normalize(vec3(0.1, 0.4, -1.0)), vec3(0, 1, 0), vec2(1.4, 0.1), rough);
  col += vec3(1.0, 0.92, 0.8) * 1.2 * k * softbox(d, normalize(vec3(0.0, -0.05, 1.0)), vec3(0, 1, 0), vec2(1.2, 0.12), rough);
  col += vec3(1.0, 0.85, 0.6) * 1.5 * k * softbox(d, normalize(vec3(-0.95, 0.1, 0.1)), vec3(0, 1, 0), vec2(0.1, 0.8), rough);
  return col;
}

MAPCODE

vec3 calcNormal(vec3 p, bool g) {
  const vec2 e = vec2(1.0, -1.0) * 0.0006;
  return normalize(e.xyy * map(p + e.xyy, g).x + e.yyx * map(p + e.yyx, g).x + e.yxy * map(p + e.yxy, g).x + e.xxx * map(p + e.xxx, g).x);
}
vec2 march(vec3 ro, vec3 rd, bool g, float tmax) {
  float t = 0.0;
  for (int i = 0; i < 320; i++) {
    vec2 h = map(ro + rd * t, g);
    if (abs(h.x) < 0.00025 * (1.0 + t)) return vec2(t, h.y);
    t += h.x * 0.8;
    if (t > tmax) break;
  }
  return vec2(-1.0, -1.0);
}
float softShadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0, t = 0.01;
  for (int i = 0; i < 72; i++) {
    float h = map(ro + rd * t, false).x;
    res = min(res, k * h / t);
    t += clamp(h, 0.006, 0.12);
    if (res < 0.002 || t > 6.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float ao(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++) { float h = 0.012 * float(i * i); o += (h - map(p + n * h, false).x) * s; s *= 0.7; }
  return clamp(1.0 - 2.2 * o, 0.0, 1.0);
}

float heightAt(int m, vec3 p) {
  vec4 C = uMatC[m];
  if (C.z <= C.x) return 0.0;
  vec2 uv = decalUV(m, p);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  vec4 t = texture(uAtlas, mix(C.xy, C.zw, vec2(uv.x, 1.0 - uv.y)));
  return dot(t.rgb, vec3(0.3, 0.59, 0.11)) * t.a;
}
float procHeight(int proc, vec3 q) {
  if (proc == 1) return fbm(vec3(q.x * 0.3, q.y * 6.0, q.z * 0.3)) * 0.5;               // wood
  if (proc == 2) return 1.0 - cells(q * 1.0);                                            // leather
  if (proc == 3) return vnoise(vec3(q.x * 0.2, q.y * 30.0, q.z * 30.0));                 // brushed
  if (proc == 4) return cells(q * 0.5);                                                  // hammered / cast
  if (proc == 5) return fbm(q * 2.0) * 0.3;                                              // paper
  if (proc == 6) return 0.5 + 0.25 * sin(q.x * 6.0) * sin(q.y * 6.0) + fbm(q * 3.0) * 0.4; // tweed
  if (proc == 7) return step(0.5, fract((floor(q.x) + floor(q.y)) * 0.5)) * 0.4;           // carbon
  if (proc == 8) return 0.5 + 0.5 * sin(atan(q.z, q.x) * 36.0);                           // knurl
  if (proc == 9) return fbm(q * 4.0) * 0.2;                                              // velvet
  if (proc == 10) { vec2 g = abs(fract(vec2(q.x + q.y, q.x - q.y) * 0.5) - 0.5); return smoothstep(0.0, 0.12, min(g.x, g.y)); } // quilted
  if (proc == 11) return 0.5 + 0.5 * sin(q.x * 3.14159);                                   // corrugated
  return 0.0;
}

vec3 tonemap(vec3 c) {
  c *= uExposure;
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}

vec3 background(vec3 ro, vec3 rd) {
  // dark museum wall with a soft spotlight halo behind the lot
  vec3 d = rd;
  float halo = exp(-4.0 * dot(d.xy - vec2(0.0, 0.08), d.xy - vec2(0.0, 0.08)));
  return uWall * 0.35 + uHalo * halo * 0.7;
}

vec3 shadeSurface(vec3 p, vec3 rd, vec3 n, int m, bool deep);

vec3 shadeFloor(vec3 p, vec3 rd) {
  vec3 n = vec3(0, 1, 0);
  vec3 L = normalize(vec3(-0.45, 0.85, 0.35));
  float sh = softShadow(p + n * 0.002, L, 10.0);
  float occ = 1.0;
  for (int i = 1; i <= 4; i++) { float h = 0.03 * float(i); occ -= (h - map(p + n * h, false).x) * 1.4 / float(i); }
  // wide contact shadow for objects standing clear of the floor
  float dUp = map(p + n * 0.35, false).x;
  occ *= mix(0.45, 1.0, smoothstep(0.05, 0.6, dUp));
  occ = clamp(occ, 0.0, 1.0);
  float pool = exp(-1.6 * dot(p.xz - uSpot.xz, p.xz - uSpot.xz) / max(uSpot.y, 0.01));
  vec3 base = uWall * 0.55 + vec3(0.02) + uHalo * pool * 0.9;
  vec3 col = base * (0.35 + 0.65 * sh) * occ;
  // faint glossy reflection
  vec3 rr = reflect(rd, n);
  vec2 h = march(p + n * 0.003, rr, true, 6.0);
  if (h.x > 0.0) {
    vec3 q = p + rr * h.x;
    vec3 nq = calcNormal(q, true);
    col += shadeSurface(q, rr, nq, int(h.y), false) * uFloorGloss * exp(-h.x * 3.0);
  }
  return col;
}

vec3 shadeSurface(vec3 p, vec3 rd, vec3 n0, int m, bool deep) {
  vec4 A = uMatA[m]; vec4 B = uMatB[m]; vec4 C = uMatC[m]; vec4 D = uMatD[m];
  int type = int(A.w + 0.5);
  vec3 albedo = A.rgb;
  float rough = B.x;
  int proc = int(B.z + 0.5);
  float pscale = B.w;
  vec3 n = n0;
  // decal colour + bump
  if (C.z > C.x) {
    vec2 uv = decalUV(m, p);
    if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
      vec4 t = texture(uAtlas, mix(C.xy, C.zw, vec2(uv.x, 1.0 - uv.y)));
      albedo = mix(albedo, pow(t.rgb, vec3(2.2)), t.a * (1.0 - D.w));
      if (D.x > 0.0) {
        float e = 0.0015;
        vec3 g = vec3(heightAt(m, p + vec3(e, 0, 0)) - heightAt(m, p - vec3(e, 0, 0)),
                      heightAt(m, p + vec3(0, e, 0)) - heightAt(m, p - vec3(0, e, 0)),
                      heightAt(m, p + vec3(0, 0, e)) - heightAt(m, p - vec3(0, 0, e))) / (2.0 * e);
        n = normalize(n - D.x * 0.004 * (g - n * dot(n, g)));
      }
    }
  }
  if (proc > 0) {
    vec3 q = p * pscale;
    float hv = procHeight(proc, q);
    float e = 0.02;
    vec3 g = vec3(procHeight(proc, q + vec3(e, 0, 0)) - procHeight(proc, q - vec3(e, 0, 0)),
                  procHeight(proc, q + vec3(0, e, 0)) - procHeight(proc, q - vec3(0, e, 0)),
                  procHeight(proc, q + vec3(0, 0, e)) - procHeight(proc, q - vec3(0, 0, e))) / (2.0 * e);
    float bump = B.y;
    n = normalize(n - bump * 0.02 * (g - n * dot(n, g)));
    if (proc == 1) albedo *= 0.65 + 0.7 * smoothstep(0.2, 0.8, fbm(vec3(q.x * 0.4, q.y * 9.0, q.z * 0.4)));
    else if (proc == 2) albedo *= 0.85 + 0.25 * hv;
    else if (proc == 3) rough = clamp(rough + (hv - 0.5) * 0.15, 0.02, 1.0);
    else if (proc == 5) albedo *= 0.85 + 0.3 * hv;
    else if (proc == 6) albedo *= 0.7 + 0.6 * fbm(q * 5.0);
    else if (proc == 7) albedo *= 0.6 + hv;
    else if (proc == 9) albedo *= 0.8 + 0.4 * hv;
  }
  vec3 v = -rd;
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  vec3 r = reflect(rd, n);
  vec3 L1 = normalize(vec3(-0.45, 0.85, 0.35));
  vec3 L2 = normalize(vec3(0.85, 0.35, 0.45));
  float sh = deep ? softShadow(p + n0 * 0.002, L1, 12.0) : 1.0;
  float occ = deep ? ao(p, n0) : 1.0;
  vec3 diffuseLight = vec3(1.0, 0.96, 0.9) * 2.4 * max(dot(n, L1), 0.0) * sh
                    + vec3(0.8, 0.88, 1.0) * 0.7 * max(dot(n, L2), 0.0)
                    + vec3(0.18, 0.16, 0.15) * (0.6 + 0.4 * n.y) * occ;
  vec3 col;
  if (type == 1) { // metal
    vec3 F = albedo + (1.0 - albedo) * pow(1.0 - ndv, 5.0);
    col = env(r, rough) * F * mix(1.0, occ, 0.6) + albedo * diffuseLight * 0.06 * rough;
  } else if (type == 2) { // cut gem: facet mosaic of fire and extinction
    float F = 0.05 + 0.95 * pow(1.0 - ndv, 5.0);
    vec3 refr = refract(rd, n, 1.0 / 2.2);
    vec3 fq = floor(n * 5.0 + 0.5);
    float h1 = hash13(fq * 1.7 + 3.1), h2 = hash13(fq * 2.9 + 7.7);
    // virtual internal facets: a position-dependent kaleidoscope inside each real facet
    vec3 w = vec3(sin(p.x * 83.0 + p.y * 51.0 + h1 * 6.0), sin(p.y * 77.0 + p.z * 59.0 + h2 * 6.0), sin(p.z * 71.0 + p.x * 47.0));
    vec3 vn = normalize(vec3(h1 - 0.5, -1.0, h2 - 0.5) + 0.9 * sign(w) * abs(w));
    vec3 i1 = reflect(refr, vn);
    vec3 i2 = reflect(i1, normalize(vec3(w.y, 0.5, w.z)));
    vec3 inner = env(i1, 0.02) * 1.1 + env(i2, 0.02) * 0.7;
    inner = inner * inner * 0.7;
    float facet = step(0.45, h1) * (0.6 + 0.8 * h2);
    vec3 fire = vec3(1.0, 0.5, 0.25) * step(0.92, h2) + vec3(0.3, 0.5, 1.0) * step(0.95, h1) + vec3(0.4, 1.0, 0.5) * step(0.97, fract(h1 * 7.0));
    float sat = clamp(1.0 - dot(albedo, vec3(0.33)) * 1.2, 0.0, 1.0);
    vec3 body = albedo * (inner * (0.08 + 2.2 * facet) + vec3(0.02)) + albedo * diffuseLight * 0.1;
    col = env(r, 0.01) * F * 0.9 + body * (1.0 - F) + fire * (1.0 - sat) * 1.6 * (0.3 + facet);
  } else if (type == 3) { // glass (only reflections; body seen through)
    float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    col = env(r, 0.02) * F;
  } else if (type == 4) { // clear-coated paint: coloured base + mirror-like lacquer
    float F = 0.05 + 0.95 * pow(1.0 - ndv, 5.0);
    vec3 base = albedo * diffuseLight * 0.62 + albedo * env(r, 0.6) * 0.3;
    vec3 coat = env(r, 0.015) * (0.1 + 0.9 * F);
    col = base * (1.0 - F) + coat * mix(1.0, occ, 0.5);
  } else if (type == 5) { // emissive
    col = albedo * 2.5;
  } else { // dielectric
    float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    float spec = D.y > 0.0 ? D.y : 1.0;
    col = albedo * diffuseLight + env(r, rough) * F * spec * mix(1.0, occ, 0.7);
    if (proc == 9) col += albedo * pow(1.0 - ndv, 3.0) * 0.6; // velvet sheen
  }
  return col;
}

void main() {
  vec2 fc = gl_FragCoord.xy + uTile;
  vec2 uv = (fc - 0.5 * uRes) / uRes.y;
  vec3 rd = normalize(uCamRot * vec3(uv * uFov, 1.0));
  vec3 ro = uCamPos;
  float tFloor = rd.y < 0.0 ? (uFloorY - ro.y) / rd.y : 1e9;
  vec2 hit = march(ro, rd, true, min(tFloor, 40.0));
  vec3 col;
  if (hit.x > 0.0 && hit.x < tFloor) {
    vec3 p = ro + rd * hit.x;
    int m = int(hit.y);
    vec3 n = calcNormal(p, true);
    int type = int(uMatA[m].w + 0.5);
    if (type == 3) {
      // glass: add reflection, then look through it
      vec3 refl = shadeSurface(p, rd, n, m, false);
      vec2 h2 = march(p + rd * 0.001, rd, false, 40.0);
      vec3 behind;
      if (h2.x > 0.0) { vec3 q = p + rd * (h2.x + 0.001); behind = shadeSurface(q, rd, calcNormal(q, false), int(h2.y), true); }
      else behind = background(ro, rd);
      col = behind * uMatA[m].rgb + refl;
    } else {
      col = shadeSurface(p, rd, n, m, true);
    }
  } else if (tFloor < 1e8) {
    col = shadeFloor(ro + rd * tFloor, rd);
    float fog = smoothstep(4.0, 12.0, tFloor);
    col = mix(col, background(ro, rd), fog);
  } else {
    col = background(ro, rd);
  }
  // vignette
  vec2 q = fc / uRes;
  col *= 0.55 + 0.45 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.25);
  fragColor = vec4(tonemap(col), 1.0);
}
`

// ------------------------------------------------------------------ codegen

function f(n) {
  const s = Number(n).toFixed(5)
  return s.includes('.') ? s : s + '.0'
}
function v3(a) {
  return `vec3(${f(a[0])},${f(a[1])},${f(a[2])})`
}
function rotMat(rot) {
  // rot in degrees [x, y, z]; returns 3x3 (row-major array) R = Rz*Ry*Rx
  const [ax, ay, az] = (rot || [0, 0, 0]).map((d) => (d * Math.PI) / 180)
  const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az)
  const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx]
  const Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy]
  const Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1]
  const mul = (A, B) => {
    const o = []
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o.push(A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j])
    return o
  }
  return mul(Rz, mul(Ry, Rx))
}
function invTransformExpr(src, node) {
  // local = R^T * (p - pos) / s
  let e = src
  if (node.pos) e = `(${e}-${v3(node.pos)})`
  if (node.rot && node.rot.some((x) => x)) {
    const R = rotMat(node.rot)
    // transpose: mat3 constructor is column-major, so passing R row-major gives R^T
    e = `(mat3(${R.map(f).join(',')})*${e})`
  }
  if (node.scale && node.scale !== 1) e = `(${e}/${f(node.scale)})`
  return e
}

function shape2d(s, v) {
  switch (s.k) {
    case 'circle':
      return `sd2Circle(${v},${f(s.r)})`
    case 'rrect':
      return `sd2RRect(${v},vec2(${f(s.w)},${f(s.h)}),${f(s.r || 0)})`
    case 'ellipse':
      return `sd2Ellipse(${v},vec2(${f(s.rx)},${f(s.ry)}))`
    case 'annulus':
      return `sd2Annulus(${v},${f(s.R)},${f(s.r)})`
    case 'ngon':
      return `sd2NGon(${v},${f(s.r)},${f(s.n)},${f(s.rot || 0)})`
    case 'poly':
      return `POLY${s.id}(${v})`
    default:
      throw new Error('shape2d ' + s.k)
  }
}

export class Compiler {
  constructor() {
    this.mats = []
    this.decals = []
    this.polys = []
    this.uvCases = []
    this.tmp = 0
  }
  mat(m, decal) {
    const key = JSON.stringify(m)
    if (!decal) {
      const i = this.mats.findIndex((x) => x.key === key && !x.decal)
      if (i >= 0) return i
    }
    this.mats.push({ key, m, decal })
    return this.mats.length - 1
  }
  poly(pts) {
    const id = this.polys.length
    this.polys.push(pts)
    return id
  }
  // returns [code, var] where var is a vec2 (dist, mat)
  emit(node, pv, chain, glassCtx) {
    const q = `q${this.tmp++}`
    const local = invTransformExpr(pv, node)
    const nextChain = [...chain, node]
    let code = `vec3 ${q}=${local};\n`
    if (node.polar) code += `${q}=polarZ(${q},${f(node.polar)});\n`
    if (node.polarY) code += `${q}=polarY(${q},${f(node.polarY)});\n`
    if (node.arcX) code += `${q}=arcX(${q},${f(node.arcX.a0)},${f(node.arcX.da)},${f(node.arcX.n)});\n`
    if (node.repX) code += `${q}=repX(${q},${f(node.repX.step)},${f(node.repX.n)});\n`
    const s = node.scale || 1
    const out = `d${this.tmp++}`
    if (node.kids) {
      const parts = node.kids.map((k) => this.emit(k, q, nextChain, glassCtx))
      code += parts.map((x) => x[0]).join('')
      let acc = parts[0][1]
      for (let i = 1; i < parts.length; i++) {
        const b = parts[i][1]
        if (node.op === 's') acc = `opS(${acc},${b})`
        else if (node.op === 'i') acc = node.k ? `opSI(${acc},${b},${f(node.k)})` : `opI(${acc},${b})`
        else if (node.k) acc = `opSU(${acc},${b},${f(node.k)})`
        else acc = `opU(${acc},${b})`
      }
      code += `vec2 ${out}=${acc};\n`
      if (s !== 1) code += `${out}.x*=${f(s)};\n`
      return [code, out]
    }
    const m = this.mat(node.mat || { type: 0, color: [0.5, 0.5, 0.5], rough: 0.5 }, node.decal)
    if (node.decal) this.uvCases.push({ m, chain: nextChain, decal: node.decal })
    const d = this.prim(node, q)
    const isGlass = ['glass', 3].includes((node.mat || {}).type)
    if (isGlass) code += `vec2 ${out}=g?vec2(${d},${f(m)}):vec2(1e9,-1.0);\n`
    else code += `vec2 ${out}=vec2(${d},${f(m)});\n`
    if (s !== 1) code += `${out}.x*=${f(s)};\n`
    return [code, out]
  }
  prim(n, q) {
    const ax = (axis) => (axis === 'x' ? `${q}.yxz` : axis === 'z' ? `${q}.xzy` : q)
    switch (n.prim) {
      case 'sphere':
        return `sdSphere(${q},${f(n.r)})`
      case 'box':
        return `sdBox(${q},${v3(n.size)},${f(n.r || 0)})`
      case 'cyl':
        return `sdCyl(${ax(n.axis)},${f(n.r)},${f(n.h)},${f(n.rr || 0)})`
      case 'torus':
        return `sdTorus(${ax(n.axis)},${f(n.R)},${f(n.r)})`
      case 'arc':
        return `sdTorusArc(${ax(n.axis)},${f(n.R)},${f(n.r)},${f(n.a0)},${f(n.a1)})`
      case 'capsule':
        return `sdCapsule(${q},${v3(n.a)},${v3(n.b)},${f(n.r)})`
      case 'ell':
        return `sdEll(${q},${v3(n.r)})`
      case 'cone':
        return `sdCone(${ax(n.axis)},${f(n.h)},${f(n.r1)},${f(n.r2)})`
      case 'gem': {
        const p = ax(n.axis)
        if (n.cut === 'rose') return `sdRoseCut(${p},${f(n.r)})`
        if (n.cut === 'cushion') return `sdCushionCut(${p},${f(n.r)})`
        if (n.cut === 'emerald') return `sdEmeraldCut(${p},vec3(${f(n.r * 0.8)},${f(n.r * 0.35)},${f(n.r)}))`
        if (n.cut === 'cab') return `sdEll(${p}-vec3(0,${f(-n.r * 0.2)},0),vec3(${f(n.r)},${f(n.r * 0.6)},${f(n.r * (n.aspect || 1))}))`
        if (n.cut === 'oval') return `sdBrilliant(${p}*vec3(1.0,1.0,${f(1 / (n.aspect || 1.3))}),${f(n.r)})*0.85`
        if (n.cut === 'pear') return `sdBrilliant((${p}-vec3(0,0,${f(n.r * 0.3)}))*vec3(1.0+0.35*clamp(${p}.z/${f(n.r)},0.0,1.0),1.0,0.75),${f(n.r)})*0.75`
        return `sdBrilliant(${p},${f(n.r)})`
      }
      case 'extrude': {
        const p = n.axis === 'y' ? `${q}.xzy` : n.axis === 'x' ? `${q}.zyx` : q
        const s = n.shape.k === 'poly' ? { ...n.shape, id: this.poly(n.shape.pts) } : n.shape
        return `extrude(${shape2d(s, `${p}.xy`)},${p}.z,${f(n.h)},${f(n.rr || 0)})`
      }
      case 'lathe': {
        const s = { k: 'poly', id: this.poly(n.pts) }
        const p = ax(n.axis)
        return `${shape2d(s, `vec2(length(${p}.xz),${p}.y)`)}`
      }
      case 'beads': {
        const id = this.poly(n.pts.map((x) => [x[0], x[1], x[2]]))
        return `BEADS${id}(${q},${f(n.r)})`
      }
      case 'tube': {
        const id = this.poly(n.pts.map((x) => [x[0], x[1], x[2]]))
        return `TUBE${id}(${q},${f(n.r)})`
      }
      default:
        throw new Error('prim ' + n.prim)
    }
  }
  compile(root) {
    const [code, out] = this.emit(root, 'p', [], true)
    const polyFns = this.polys
      .map((pts, id) => {
        if (pts[0].length === 3) {
          const arr = `const vec3 V[${pts.length}]=vec3[${pts.length}](${pts.map((x) => v3(x)).join(',')});`
          return `float BEADS${id}(vec3 p,float r){${arr}float d=1e9;for(int i=0;i<${pts.length};i++)d=min(d,length(p-V[i])-r);return d;}
float TUBE${id}(vec3 p,float r){${arr}float d=1e9;for(int i=0;i<${pts.length - 1};i++)d=min(d,sdCapsule(p,V[i],V[i+1],r));return d;}
float POLY${id}(vec2 p){return 1e9;}`
        }
        const arr = `const vec2 V[${pts.length}]=vec2[${pts.length}](${pts.map((x) => `vec2(${f(x[0])},${f(x[1])})`).join(',')});`
        return `float POLY${id}(vec2 p){${arr}float d=dot(p-V[0],p-V[0]);float s=1.0;for(int i=0,j=${pts.length - 1};i<${pts.length};j=i,i++){vec2 e=V[j]-V[i];vec2 w=p-V[i];vec2 b=w-e*clamp(dot(w,e)/dot(e,e),0.0,1.0);d=min(d,dot(b,b));bvec3 c=bvec3(p.y>=V[i].y,p.y<V[j].y,e.x*w.y>e.y*w.x);if(all(c)||all(not(c)))s*=-1.0;}return s*sqrt(d);}`
      })
      .join('\n')
    const uvFn = `vec2 decalUV(int m, vec3 p){\n${this.uvCases
      .map(({ m, chain, decal }) => {
        let e = 'p'
        for (const n of chain) e = invTransformExpr(e, n)
        const w = decal.w || 1, h = decal.h || 1
        let uv
        const ox = decal.ox || 0, oy = decal.oy || 0
        if (decal.proj === 'y') uv = `vec2((L.x-${f(ox)})/${f(w)}+0.5,(-L.z-${f(oy)})/${f(h)}+0.5)`
        else if (decal.proj === 'x') uv = `vec2((-L.z-${f(ox)})/${f(w)}+0.5,(L.y-${f(oy)})/${f(h)}+0.5)`
        else if (decal.proj === 'sph') uv = `vec2(atan(L.x,L.z)/(2.0*PI)+0.5+${f(decal.spin || 0)},asin(clamp(normalize(L).y,-1.0,1.0))/PI+0.5)`
        else if (decal.proj === 'cyl') uv = `vec2(fract(atan(L.x,L.z)/(2.0*PI)+0.5+${f(decal.spin || 0)}),(L.y-${f(oy)})/${f(h)}+0.5)`
        else uv = `vec2((L.x-${f(ox)})/${f(w)}+0.5,(L.y-${f(oy)})/${f(h)}+0.5)`
        const side = decal.side ? `if(L.z*${f(decal.side)}<0.0)return vec2(-1.0);` : ''
        return `if(m==${m}){vec3 L=${e};${side}return ${uv};}`
      })
      .join('\n')}\nreturn vec2(-1.0);}\n`
    const map = `${polyFns}\n${uvFn}\nvec2 map(vec3 p, bool g){\n${code}return ${out};\n}\n`
    return map
  }
}

// ------------------------------------------------------------------ runtime

function parseColor(c) {
  if (Array.isArray(c)) return c
  const h = c.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16)
  // sRGB -> linear
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.pow(x / 255, 2.2))
}

const TYPES = { dielectric: 0, metal: 1, gem: 2, glass: 3, paint: 4, emissive: 5 }
const PROCS = { none: 0, wood: 1, leather: 2, brushed: 3, hammered: 4, paper: 5, tweed: 6, carbon: 7, knurl: 8, velvet: 9, quilted: 10, corrugated: 11 }

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false })
    if (!gl) throw new Error('WebGL2 unavailable')
    this.gl = gl
    this.atlas = document.createElement('canvas')
    this.atlas.width = this.atlas.height = 2048
  }
  packDecals(mats) {
    const ctx = this.atlas.getContext('2d')
    ctx.clearRect(0, 0, 2048, 2048)
    let x = 0, y = 0, rowH = 0
    const regions = []
    for (const m of mats) {
      if (!m.decal) {
        regions.push([0, 0, 0, 0])
        continue
      }
      const c = m.decal.canvas
      const w = c.width, h = c.height
      if (x + w > 2048) {
        x = 0
        y += rowH + 2
        rowH = 0
      }
      if (y + h > 2048) throw new Error('atlas full')
      ctx.drawImage(c, x, y)
      regions.push([(x + 0.5) / 2048, (y + 0.5) / 2048, (x + w - 0.5) / 2048, (y + h - 0.5) / 2048])
      x += w + 2
      rowH = Math.max(rowH, h)
    }
    return regions
  }
  render(scene, width, height) {
    const gl = this.gl
    const comp = new Compiler()
    const mapCode = comp.compile(scene.root)
    const nmat = Math.max(1, comp.mats.length)
    const src = PRELUDE.replaceAll('NMAT', String(nmat)) + SHADING.replace('MAPCODE', mapCode)
    const vs = `#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0,1);}`
    const prog = this.link(vs, src)
    gl.useProgram(prog)
    this.canvas.width = width
    this.canvas.height = height
    gl.viewport(0, 0, width, height)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    // atlas
    const regions = this.packDecals(comp.mats)
    const tex = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlas)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.uniform1i(gl.getUniformLocation(prog, 'uAtlas'), 0)
    // materials
    const A = [], B = [], C = [], D = []
    comp.mats.forEach(({ m, decal }, i) => {
      const col = parseColor(m.color || '#888888')
      A.push(...col, TYPES[m.type || 'dielectric'] ?? m.type)
      B.push(m.rough ?? 0.4, m.bump ?? 0.6, PROCS[m.proc || 'none'], m.pscale ?? 40)
      C.push(...regions[i])
      D.push(decal?.bump ?? 0, m.spec ?? 0, 0, decal?.under ?? 0)
    })
    if (!comp.mats.length) {
      A.push(0.5, 0.5, 0.5, 0), B.push(0.5, 0, 0, 1), C.push(0, 0, 0, 0), D.push(0, 0, 0, 0)
    }
    gl.uniform4fv(gl.getUniformLocation(prog, 'uMatA'), new Float32Array(A))
    gl.uniform4fv(gl.getUniformLocation(prog, 'uMatB'), new Float32Array(B))
    gl.uniform4fv(gl.getUniformLocation(prog, 'uMatC'), new Float32Array(C))
    gl.uniform4fv(gl.getUniformLocation(prog, 'uMatD'), new Float32Array(D))
    // camera
    const cam = scene.camera
    const fwd = norm(sub(cam.target, cam.pos))
    const right = norm(cross(fwd, [0, 1, 0]))
    const up = cross(right, fwd)
    gl.uniformMatrix3fv(gl.getUniformLocation(prog, 'uCamRot'), false, new Float32Array([...right, ...up, ...fwd]))
    gl.uniform3fv(gl.getUniformLocation(prog, 'uCamPos'), cam.pos)
    gl.uniform1f(gl.getUniformLocation(prog, 'uFov'), cam.fov ?? 0.9)
    gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), width, height)
    const lin = (c) => parseColor(c)
    gl.uniform3fv(gl.getUniformLocation(prog, 'uWall'), lin(scene.wall || '#1b1611'))
    gl.uniform3fv(gl.getUniformLocation(prog, 'uHalo'), lin(scene.halo || '#4a3a28'))
    gl.uniform1f(gl.getUniformLocation(prog, 'uExposure'), scene.exposure ?? 1)
    gl.uniform1f(gl.getUniformLocation(prog, 'uFloorY'), scene.floorY ?? 0)
    gl.uniform1f(gl.getUniformLocation(prog, 'uFloorGloss'), scene.floorGloss ?? 0.18)
    gl.uniform3fv(gl.getUniformLocation(prog, 'uSpot'), scene.spot || [0, 1.2, 0])
    // draw in horizontal tiles to stay under GPU watchdog limits
    const tileLoc = gl.getUniformLocation(prog, 'uTile')
    gl.enable(gl.SCISSOR_TEST)
    const step = 64
    for (let y0 = 0; y0 < height; y0 += step) {
      gl.scissor(0, y0, width, step)
      gl.uniform2f(tileLoc, 0, 0)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.finish()
    }
    gl.disable(gl.SCISSOR_TEST)
    gl.deleteProgram(prog)
    gl.deleteTexture(tex)
    gl.deleteBuffer(buf)
    return { materials: comp.mats.length }
  }
  link(vsSrc, fsSrc) {
    const gl = this.gl
    const sh = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(s)
        const lines = src.split('\n')
        const m = /ERROR: 0:(\d+)/.exec(log || '')
        const ctx = m ? lines.slice(Math.max(0, +m[1] - 3), +m[1] + 2).join('\n') : ''
        throw new Error(log + '\n' + ctx)
      }
      return s
    }
    const p = gl.createProgram()
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vsSrc))
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fsSrc))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
    return p
  }
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}
function norm(a) {
  const l = Math.hypot(...a)
  return a.map((x) => x / l)
}
