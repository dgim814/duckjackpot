"""Visual audit of the baked lot images. Usage: python3 tools/lot-renderer/audit.py <cats.json>
cats.json: [{id, section, tier, kind}] for every market lot."""
import hashlib, json, os, sys
from PIL import Image, ImageFilter, ImageStat

lots = json.load(open(sys.argv[1]))
EXPECT = {'WATCHES': 'watch', 'JEWELRY': 'jewel', 'ART': 'paint', 'ANTIQUES': 'obj', 'COLLECTIBLES': 'obj', 'RARE': 'obj'}


def dhash(im):
    g = im.convert('L').resize((17, 16), Image.LANCZOS)
    p = list(g.getdata())
    return sum(1 << i for i in range(256) if p[(i // 16) * 17 + i % 16] > p[(i // 16) * 17 + i % 16 + 1])


def small(im):
    return list(im.convert('RGB').resize((32, 20), Image.LANCZOS).getdata())


fails, rows, files, dh, sm = [], [], {}, {}, {}
for l in lots:
    i = l['id']
    d, t = f'public/heist/lots/{i}.webp', f'public/heist/lots/{i}.thumb.webp'
    if not (os.path.exists(d) and os.path.exists(t)):
        fails.append(('missing', i))
        continue
    D, T = Image.open(d), Image.open(t)
    if D.size != (800, 500) or T.size != (288, 228):
        fails.append(('size', i))
    digest = hashlib.sha1(open(d, 'rb').read()).hexdigest()
    if digest in files:
        fails.append(('duplicate', i, files[digest]))
    files[digest] = i
    dh[i], sm[i] = dhash(D), small(D)
    g = D.convert('L')
    edges = ImageStat.Stat(g.filter(ImageFilter.FIND_EDGES)).mean[0]
    std = ImageStat.Stat(g).stddev[0]
    tg = T.convert('L')
    w, hh = tg.size
    centre = ImageStat.Stat(tg.crop((w * 0.2, hh * 0.15, w * 0.8, hh * 0.85))).stddev[0]
    if l['kind'] != EXPECT[l['section']]:
        fails.append(('category', i))
    if edges < 2.0 or std < 14:
        fails.append(('low-detail', i, round(edges, 2)))
    if centre < 12:
        fails.append(('empty-thumb', i))
    rows.append({'id': i, 'edges': round(edges, 2), 'contrast': round(std, 1)})

near = []
ids = list(dh)
for a in range(len(ids)):
    for b in range(a + 1, len(ids)):
        shape = bin(dh[ids[a]] ^ dh[ids[b]]).count('1')
        colour = sum(abs(x - y) for p, q in zip(sm[ids[a]], sm[ids[b]]) for x, y in zip(p, q)) / (len(sm[ids[a]]) * 3)
        if shape <= 10 and colour < 10:
            near.append((ids[a], ids[b], shape, round(colour, 1)))
es = sorted(r['edges'] for r in rows)
print(json.dumps({'lots': len(lots), 'unique_files': len(files), 'near_duplicates': near, 'fails': fails,
                  'edge_density': {'min': es[0], 'median': es[len(es) // 2], 'max': es[-1]}}, indent=1))
