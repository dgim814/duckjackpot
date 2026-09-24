"""
Builds the NFT try-on skin sheets from the base heist duck.

    python3 frontend/scripts/build_nft_skins.py

Input : frontend/public/heist/duck_sheet.png   (4x4 grid, 256 px frames:
        idle 0-3, walk 4-11, dash 12-15 -- the layout DuckView already uses)
Output: frontend/public/heist/nft-skins/<skin>/sheet.png  (same grid, same size)

Every frame is derived from the same base frame, so canvas, pivot, feet and
scale are identical to the normal duck: the skin never shifts the sprite and
never changes the hitbox. Only colours and accessories are added:
gold-graded body, hoodie trim, sunglasses over the eye mask, chain + pendant
anchored to the beak, and a crown on the beanie -- all per frame.
"""
import colorsys
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'heist', 'duck_sheet.png')
OUT = os.path.join(ROOT, 'public', 'heist', 'nft-skins')
FRAME = 256
GRID = 4

SKINS = {
    # DUCK JACKPOT / GOLD: black + gold + warm amber, the flagship.
    'gold': {
        'body_hue': 0.125, 'body_sat': 0.92, 'body_gain': 1.0,
        'trim': (255, 205, 72), 'trim2': (170, 112, 20),
        'lens': (18, 16, 14), 'lens_glint': (255, 236, 170), 'frame': (255, 206, 70),
        'chain': (255, 200, 60), 'chain_dark': (150, 96, 10),
        'pendant': 'coin', 'crown': (255, 208, 64), 'crown_dark': (170, 108, 14), 'gem': (40, 200, 255),
        'beanie_band': None,
    },
    # FAST 200: gold + orange + electric amber, lightning shades and badge.
    'fast200': {
        'body_hue': 0.118, 'body_sat': 0.95, 'body_gain': 1.04,
        'trim': (255, 150, 30), 'trim2': (200, 90, 10),
        'lens': (26, 18, 8), 'lens_glint': (255, 190, 60), 'frame': (255, 170, 40),
        'chain': (255, 206, 70), 'chain_dark': (160, 100, 12),
        'pendant': 'bolt', 'crown': (255, 196, 50), 'crown_dark': (180, 100, 10), 'gem': (255, 120, 20),
        'beanie_band': (255, 150, 30),
    },
    # FAST 100: black + gold + red/orange, sharper street look.
    'fast100': {
        'body_hue': 0.112, 'body_sat': 0.9, 'body_gain': 0.98,
        'trim': (235, 40, 40), 'trim2': (255, 170, 40),
        'lens': (30, 6, 6), 'lens_glint': (255, 90, 70), 'frame': (255, 190, 60),
        'chain': (255, 196, 64), 'chain_dark': (150, 90, 10),
        'pendant': 'gem', 'crown': (255, 196, 56), 'crown_dark': (160, 96, 10), 'gem': (230, 30, 40),
        'beanie_band': (220, 36, 36),
    },
}


def classify(px):
    r, g, b, a = px
    if a < 40:
        return 'none'
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if v < 0.28:
        return 'black'
    if s < 0.22 and v > 0.72:
        return 'white'
    if 0.10 <= h <= 0.19 and s > 0.45 and v > 0.45:
        return 'yellow'
    if 0.0 <= h < 0.10 and s > 0.5 and v > 0.45:
        return 'orange'
    return 'other'


def analyse(frame):
    """Per-frame anchors: silhouette box, beanie top, eyes, beak."""
    w, h = frame.size
    px = frame.load()
    cls = [[classify(px[x, y]) for x in range(w)] for y in range(h)]
    ys = [y for y in range(h) if any(cls[y][x] != 'none' for x in range(w))]
    top, bottom = ys[0], ys[-1]
    head_cut = top + int((bottom - top) * 0.42)
    # beak: the connected orange region holding the rightmost orange pixel of the head (duck faces right)
    head_orange = {(x, y) for y in range(top, head_cut) for x in range(w) if cls[y][x] == 'orange'}
    beak = []
    visited = set()
    for start in head_orange:
        if start in visited:
            continue
        comp = [start]
        visited.add(start)
        stack = [start]
        while stack:
            x, y = stack.pop()
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in head_orange and n not in visited:
                    visited.add(n)
                    comp.append(n)
                    stack.append(n)
        if len(comp) > len(beak):
            beak = comp
    bx0 = min(p[0] for p in beak); bx1 = max(p[0] for p in beak)
    by0 = min(p[1] for p in beak); by1 = max(p[1] for p in beak)
    # eyes: whites of the eye in the mask band right above the beak
    eyes = [(x, y) for y in range(max(top, by0 - 28), by0 + 6) for x in range(max(0, bx0 - 12), bx1 - 4)
            if cls[y][x] == 'white']
    # Glasses keep one size in every frame (no flicker); only their centre follows the head.
    if eyes and max(p[0] for p in eyes) - min(p[0] for p in eyes) >= 35:
        ecx = (min(p[0] for p in eyes) + max(p[0] for p in eyes)) / 2
        ecy = (min(p[1] for p in eyes) + max(p[1] for p in eyes)) / 2
    else:
        ecx, ecy = bx1 - 34, by0 - 6
    ex0, ex1, ey0, ey1 = ecx - 23, ecx + 23, ecy - 8, ecy + 8
    # beanie top centre: topmost silhouette row, mean x of black pixels there
    row = [x for x in range(w) if cls[top + 3][x] == 'black'] or [w // 2]
    beanie_x = sum(row) / len(row)
    return {
        'cls': cls, 'top': top, 'bottom': bottom, 'head_cut': head_cut,
        'beak': (bx0, by0, bx1, by1), 'eyes': (ex0, ey0, ex1, ey1), 'beanie_x': beanie_x,
    }


def clean_checker(frame, info):
    """The base art has a baked grey checkerboard between the legs; clear it on the skins."""
    px = frame.load()
    cls = info['cls']
    y0 = info['top'] + int((info['bottom'] - info['top']) * 0.62)
    for y in range(y0, frame.size[1]):
        for x in range(frame.size[0]):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # grey squares (light and dark) have no colour; feet and feathers do
            if (s < 0.14 and v > 0.3) or (s < 0.35 and v > 0.8):
                px[x, y] = (0, 0, 0, 0)
                cls[y][x] = 'none'


def grade_body(frame, info, sk):
    """Yellow feathers -> rich metallic gold, keeping the original shading."""
    px = frame.load()
    cls = info['cls']
    for y in range(frame.size[1]):
        for x in range(frame.size[0]):
            if cls[y][x] != 'yellow':
                continue
            r, g, b, a = px[x, y]
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            # metal, not paint: deeper amber shadows, pale-gold highlights, more contrast
            vv = min(1, (v ** 1.2) * sk['body_gain'])
            hue = sk['body_hue'] - (1 - vv) * 0.04
            sat = min(1, sk['body_sat'] * (0.85 + 0.15 * s))
            if vv > 0.96:
                sat *= 1 - 0.35 * (vv - 0.96) / 0.04
            rr, gg, bb = colorsys.hsv_to_rgb(hue, sat, vv)
            px[x, y] = (int(rr * 255), int(gg * 255), int(bb * 255), a)


def trim_hoodie(frame, info, sk):
    """Thin coloured edge where the black hoodie meets the body: the 'luxury jacket' piping."""
    px = frame.load()
    cls = info['cls']
    w, h = frame.size
    eye_bottom = int(info['eyes'][3])
    edits = []
    for y in range(eye_bottom + 8, info['bottom']):
        for x in range(1, w - 1):
            if cls[y][x] != 'black':
                continue
            n = [cls[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < h]
            if 'yellow' in n:
                edits.append((x, y, sk['trim']))
            elif 'none' in n:
                edits.append((x, y, sk['trim2']))
    for x, y, c in edits:
        a = px[x, y][3]
        px[x, y] = (*c, a)


def beanie_band(frame, info, sk):
    """A coloured stripe on the beanie cuff (FAST skins)."""
    if not sk['beanie_band']:
        return
    px = frame.load()
    cls = info['cls']
    ey0 = int(info['eyes'][1])
    y0 = max(info['top'] + 10, ey0 - 16)
    for y in range(y0, y0 + 4):
        for x in range(frame.size[0]):
            if cls[y][x] == 'black':
                px[x, y] = (*sk['beanie_band'], px[x, y][3])


def sunglasses(draw, info, sk, skin):
    ex0, ey0, ex1, ey1 = info['eyes']
    cx, cy = (ex0 + ex1) / 2, (ey0 + ey1) / 2
    w = ex1 - ex0 + 4
    h = ey1 - ey0 + 2
    box = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
    # one wraparound lens over the mask, gold rim, bridge towards the beak
    draw.rounded_rectangle(box, radius=h / 2.2, fill=(*sk['lens'], 255), outline=(*sk['frame'], 255), width=2)
    draw.line([box[2] - 2, cy - 1, box[2] + 8, cy - 3], fill=(*sk['frame'], 255), width=2)
    draw.line([box[0] + 4, box[1] + 3, box[0] + w * 0.45, box[1] + 3], fill=(*sk['lens_glint'], 200), width=2)
    if skin == 'fast200':
        # small lightning glyph in the lens
        bx, by = cx + w * 0.12, cy
        draw.polygon([(bx - 2, by - 5), (bx + 3, by - 5), (bx, by), (bx + 3, by), (bx - 3, by + 6), (bx - 1, by + 1), (bx - 4, by + 1)],
                     fill=(255, 190, 40, 255))


def chain(draw, info, sk, skin):
    bx0, by0, bx1, by1 = info['beak']
    # necklace hangs under the beak across the hoodie, following the frame's head position
    a = (bx0 - 34, by1 - 2)
    c = (bx0 + 6, by1 + 6)
    mid = ((a[0] + c[0]) / 2 - 2, by1 + 26)
    pts = []
    for i in range(0, 13):
        t = i / 12
        x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * mid[0] + t * t * c[0]
        y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * mid[1] + t * t * c[1]
        pts.append((x, y))
    for i, (x, y) in enumerate(pts):
        r = 3.2
        draw.ellipse([x - r, y - r * 0.8, x + r, y + r * 0.8], fill=(*sk['chain'], 255), outline=(*sk['chain_dark'], 255))
    px, py = pts[6][0], pts[6][1] + 7
    if sk['pendant'] == 'coin':
        draw.ellipse([px - 7, py - 7, px + 7, py + 7], fill=(*sk['chain'], 255), outline=(*sk['chain_dark'], 255), width=2)
        draw.line([px, py - 5, px, py + 5], fill=(*sk['chain_dark'], 255), width=2)
        draw.arc([px - 3, py - 4, px + 3, py + 1], 90, 300, fill=(*sk['chain_dark'], 255), width=1)
        draw.arc([px - 3, py - 1, px + 3, py + 4], 270, 120, fill=(*sk['chain_dark'], 255), width=1)
    elif sk['pendant'] == 'bolt':
        draw.polygon([(px - 1, py - 9), (px + 6, py - 9), (px + 1, py - 1), (px + 6, py - 1), (px - 4, py + 10), (px - 1, py + 2), (px - 6, py + 2)],
                     fill=(255, 176, 30, 255), outline=(150, 70, 0, 255))
    else:
        draw.polygon([(px, py - 8), (px + 7, py), (px, py + 8), (px - 7, py)], fill=(*sk['gem'], 255), outline=(*sk['chain'], 255))
        draw.line([px - 3, py - 2, px, py - 5], fill=(255, 200, 200, 220), width=1)


def crown(draw, info, sk):
    cx = info['beanie_x'] + 4
    hgt = 20
    base = max(info['top'] + 14, hgt + 4)
    w = 42
    x0, x1 = cx - w / 2, cx + w / 2
    yb = base
    yt = base - hgt
    pts = [(x0, yb), (x0 - 2, yt + 8), (x0 + w * 0.22, yb - 10), (cx, yt), (x1 - w * 0.22, yb - 10), (x1 + 2, yt + 8), (x1, yb)]
    draw.polygon(pts, fill=(*sk['crown'], 255), outline=(*sk['crown_dark'], 255))
    draw.rectangle([x0, yb - 5, x1, yb + 1], fill=(*sk['crown_dark'], 255))
    draw.line([x0 + 2, yb - 3, x1 - 2, yb - 3], fill=(255, 240, 180, 255), width=1)
    for gx in (cx - 12, cx, cx + 12):
        draw.ellipse([gx - 2.5, yb - 5, gx + 2.5, yb], fill=(*sk['gem'], 255))
    for tx, ty in ((x0 - 2, yt + 8), (cx, yt), (x1 + 2, yt + 8)):
        draw.ellipse([tx - 3, ty - 3, tx + 3, ty + 3], fill=(255, 236, 160, 255), outline=(*sk['crown_dark'], 255))


def build_frame(frame, skin):
    sk = SKINS[skin]
    frame = frame.copy()
    info = analyse(frame)
    clean_checker(frame, info)
    grade_body(frame, info, sk)
    trim_hoodie(frame, info, sk)
    beanie_band(frame, info, sk)
    over = Image.new('RGBA', frame.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    chain(d, info, sk, skin)
    sunglasses(d, info, sk, skin)
    crown(d, info, sk)
    # soft 1 px dark edge so accessories sit in the art instead of floating on it
    shadow = over.split()[3].filter(ImageFilter.GaussianBlur(1.2))
    edge = Image.new('RGBA', frame.size, (20, 12, 4, 0))
    edge.putalpha(shadow.point(lambda v: int(v * 0.55)))
    frame.alpha_composite(edge)
    frame.alpha_composite(over)
    return frame


def main(only=None):
    base = Image.open(SRC).convert('RGBA')
    for skin in SKINS:
        if only and skin not in only:
            continue
        sheet = Image.new('RGBA', base.size, (0, 0, 0, 0))
        for i in range(GRID * GRID):
            cx, cy = (i % GRID) * FRAME, (i // GRID) * FRAME
            f = base.crop((cx, cy, cx + FRAME, cy + FRAME))
            sheet.alpha_composite(build_frame(f, skin), (cx, cy))
        os.makedirs(os.path.join(OUT, skin), exist_ok=True)
        path = os.path.join(OUT, skin, 'sheet.png')
        sheet.save(path, optimize=True)
        print('wrote', os.path.relpath(path, ROOT), os.path.getsize(path) // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1:] or None)
