# Maakt de app-iconen van C.L.O.N.E.S (low-poly: kristal + 3 clones).
# Helemaal zelf getekend met code, dus geen plaatjes van anderen.
# Draaien: python3 icons/maak_iconen.py   (nodig: pip install pillow)
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

S = 1024
HERE = Path(__file__).parent

def mix(a, b, t):
    a = tuple(int(a[i:i+2], 16) for i in (1, 3, 5)); b = tuple(int(b[i:i+2], 16) for i in (1, 3, 5))
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))

def shade(c, f):
    return tuple(max(0, min(255, round(v * f))) for v in c)

def hexc(h):
    return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def draw_back():
    random.seed(7)
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    # Lucht: low-poly driehoeken, boven donkerder blauw, onder lichter
    n = 8; step = S / n
    for gy in range(n + 1):
        for gx in range(n + 1):
            x0, y0 = gx * step, gy * step
            for tri in ([(x0, y0), (x0 + step, y0), (x0, y0 + step)],
                        [(x0 + step, y0), (x0 + step, y0 + step), (x0, y0 + step)]):
                cy = sum(p[1] for p in tri) / 3 / S
                base = mix('#3a86ff', '#8fd3f4', min(1, cy * 1.3))
                d.polygon(tri, fill=shade(base, random.uniform(0.93, 1.07)))
    # Heuvels (low-poly)
    hill1 = [(0, 700), (180, 620), (360, 680), (560, 600), (760, 660), (1024, 590), (1024, 1024), (0, 1024)]
    d.polygon(hill1, fill=hexc('#5fae55'))
    pts = [(0, 790), (220, 730), (470, 790), (720, 720), (1024, 780), (1024, 1024), (0, 1024)]
    d.polygon(pts, fill=hexc('#8bd36b'))
    for a, b, c in [((0, 790), (220, 730), (120, 860)), ((470, 790), (720, 720), (600, 870)), ((720, 720), (1024, 780), (900, 850))]:
        d.polygon([a, b, c], fill=hexc('#7cc65e'))

    return im

def draw_front():
    # Kristal + clones op een doorzichtige laag, zodat we ze kunnen verkleinen
    # Groot kristal in het midden (achter de clones)
    cx, top, mid, bot, w = 512, 150, 330, 640, 230
    gem = {
        'tl': [(cx - w, mid), (cx - w * 0.45, top), (cx, mid)],
        'tm': [(cx - w * 0.45, top), (cx + w * 0.45, top), (cx, mid)],
        'tr': [(cx + w * 0.45, top), (cx + w, mid), (cx, mid)],
        'bl': [(cx - w, mid), (cx, mid), (cx, bot)],
        'br': [(cx, mid), (cx + w, mid), (cx, bot)],
    }
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).ellipse([cx - 330, 90, cx + 330, 700], fill=150)
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    im = Image.new('RGBA', (S, S), (255, 255, 255, 0))  # witte gloed achter het kristal
    im.putalpha(glow)
    d = ImageDraw.Draw(im)
    cols = {'tl': '#7ff0ff', 'tm': '#c8fbff', 'tr': '#48d6f0', 'bl': '#00b4d8', 'br': '#0077a3'}
    for k, poly in gem.items():
        d.polygon(poly, fill=hexc(cols[k]))
    d.polygon([(cx - w * 0.3, top + 20), (cx - w * 0.05, top + 20), (cx - w * 0.38, mid - 30)], fill=(255, 255, 255))

    # Drie clones (dezelfde jongen, 3 keer): achterste twee kleiner
    def clone(px, py, sc, dark=1.0):
        def box(x0, y0, x1, y1, col, side=None):
            col = shade(hexc(col), dark)
            X0, Y0, X1, Y1 = px + x0 * sc, py + y0 * sc, px + x1 * sc, py + y1 * sc
            d.rectangle([X0, Y0, X1, Y1], fill=col)
            # low-poly schaduwkant rechts
            sw = (X1 - X0) * 0.28
            d.polygon([(X1 - sw, Y0), (X1, Y0), (X1, Y1), (X1 - sw, Y1)], fill=shade(col, 0.8))
        box(-62, -130, -12, 0, '#2d3142'); box(12, -130, 62, 0, '#2d3142')      # benen
        box(-84, -310, 84, -130, '#3a86ff')                                     # lijf
        box(-128, -300, -88, -160, '#3a86ff'); box(88, -300, 128, -160, '#3a86ff')  # armen
        box(-128, -165, -92, -128, '#ffcc99'); box(92, -165, 128, -128, '#ffcc99')  # handen
        box(-80, -470, 80, -320, '#ffcc99')                                     # hoofd
        box(-86, -500, 86, -445, '#e63946'); box(40, -462, 140, -440, '#e63946')    # pet
        e = shade(hexc('#222222'), dark)
        d.rectangle([px - 44 * sc, py - 410 * sc, px - 20 * sc, py - 378 * sc], fill=e)
        d.rectangle([px + 18 * sc, py - 410 * sc, px + 42 * sc, py - 378 * sc], fill=e)
        d.rectangle([px - 26 * sc, py - 352 * sc, px + 26 * sc, py - 340 * sc], fill=shade(hexc('#d9776b'), dark))

    clone(300, 840, 0.78, 0.88)
    clone(724, 840, 0.78, 0.88)
    clone(512, 880, 1.0)
    return im

def compose(scale):
    back = draw_back().convert('RGBA')
    front = draw_front()
    if scale != 1:
        sz = round(S * scale)
        front = front.resize((sz, sz), Image.LANCZOS)
        layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        layer.paste(front, ((S - sz) // 2, (S - sz) // 2 + round(S * 0.03)))
        front = layer
    back.alpha_composite(front)
    return back.convert('RGB')

def main():
    big = compose(1)
    for size, name in [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
        big.resize((size, size), Image.LANCZOS).save(HERE / name, optimize=True)
    # Maskable: kristal en clones kleiner in het midden, zodat Android er een rondje van kan maken
    compose(0.78).resize((512, 512), Image.LANCZOS).save(HERE / 'icon-maskable-512.png', optimize=True)

if __name__ == '__main__':
    main()
