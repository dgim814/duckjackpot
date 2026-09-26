# Lot renderer

Offline studio renders for every Black Market lot (dev-only, not part of the app bundle).

- `engine.js` — WebGL2 raymarcher: SDF scene → GLSL, PBR-ish metals / gems / glass / clear-coat paint /
  leather / wood, studio softboxes, soft shadows, AO, glossy floor, canvas decals (dials, labels, reliefs).
- `builders/` — one builder per family (watch, jewel, painting, objects); recipes come from
  `src/heist/economy/art/visuals.ts`. Paintings use real public-domain images from `sources/`
  (Wikimedia Commons, all marked Public domain); copyrighted works are the lot's own composition, re-painted.
- Bake: run the dev server, `node tools/lot-renderer/save-server.mjs <dir>`, open
  `/tools/lot-renderer/index.html`, call `__bake(ids)` in the console, then
  `python3 tools/lot-renderer/convert.py <dir>` → `public/heist/lots/<id>.webp` (800×500) +
  `<id>.thumb.webp` (288×228) and `src/heist/economy/art/assets.ts`.
- QA: `audit.py` (presence, uniqueness, near-duplicates, detail), `shots.mjs` + `market-preview.html`
  (375×812 screenshots of the real Black Market page).
