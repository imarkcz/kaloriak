"""
Krok 4 - nahledy loga na pracovni bluze.

Barva oblečeni rozhoduje o tom, ktera varianta loga je citelna, a to
zcela obraci doporuceni:

    kontrast vuci podkladu     seda #8A8D90      antracit #33383C
    bila                            3,5x               11,9x
    modra 280 C                     4,3x                1,3x
    cervena 485 C                   1,4x                2,4x

Na antracitu je citelna bila, na sede modra. Cervena nikde neobstoji jako
nosna barva - jen jako akcent. Skript kontrasty pocita (ne hadá) a podle
nich ke kazde barve bluzy vybere doporucenou variantu.

Kresba bluzy je schematicka - slouzi k posouzeni velikosti a umisteni,
ne jako strihovy podklad.

Vystup: mockup/*.png
"""
import json

import cairosvg
from PIL import Image

from common import BUILD, DIST, NAVY, RED, WHITE, log

ROOT = DIST.parent
MOCKUP = ROOT / "mockup"
MOCKUP.mkdir(exist_ok=True)

CHEST_MM = 560.0        # sirka hrudi bluzy
BODY_UNITS = 220.0      # tomu odpovida sirka trupu v kresbe
MM = BODY_UNITS / CHEST_MM

GARMENTS = {
    "seda": dict(base="#8A8D90", dark="#74777A", seam="#5B5F63",
                 mesh="#2B2E31", label="seda bluza"),
    "antracit": dict(base="#33383C", dark="#2B2F33", seam="#22262A",
                     mesh="#1A1D20", label="antracitova bluza"),
}

VARIANTS = {
    "modra-bily-obrys": dict(keyline=WHITE, blue=NAVY, rule=WHITE, url=WHITE,
                             lead=NAVY, label="modra + bily obrys"),
    "bila": dict(keyline=None, blue=WHITE, rule=WHITE, url=WHITE,
                 lead=WHITE, label="jednobarevna bila"),
    "bila-cerveny-obrys": dict(keyline=RED, blue=WHITE, rule=RED, url=WHITE,
                               lead=WHITE, label="bila + cerveny obrys"),
    "modra": dict(keyline=None, blue=NAVY, rule=NAVY, url=NAVY,
                  lead=NAVY, label="jednobarevna modra"),
}


def luminance(hex_):
    ch = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    ch = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in ch]
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


class Logo:
    """Vrstvy loga prevedene na SVG skupiny."""

    def __init__(self):
        self.layers = json.loads((BUILD / "layers.json").read_text())
        g = json.loads((BUILD / "geometry.json").read_text())
        self.x0, self.y0, x1, y1 = g["bbox"]
        self.w = 1000.0
        self.k = self.w / (x1 - self.x0)
        self.h = (y1 - self.y0) * self.k
        self.rule_box = g["rule"]
        self.word_h = 175.0          # vyska samotneho napisu v jednotkach loga

    def _group(self, name, color):
        lay = self.layers[name]
        tf = (f"scale({self.k:.8f}) translate({-self.x0},{-self.y0}) "
              f"{lay['transform']}")
        paths = "".join(f'<path d="{d}"/>' for d in lay["paths"])
        return (f'<g fill="{color}" fill-rule="evenodd" '
                f'transform="{tf}">{paths}</g>')

    def _rule(self, color):
        rx0, ry0, rx1, ry1 = self.rule_box
        return (f'<rect x="{(rx0 - self.x0) * self.k:.2f}" '
                f'y="{(ry0 - self.y0) * self.k:.2f}" '
                f'width="{(rx1 - rx0) * self.k:.2f}" '
                f'height="{(ry1 - ry0) * self.k:.2f}" fill="{color}"/>')

    def full(self, v):
        out = ""
        if v["keyline"]:
            out += self._group("keyline", v["keyline"])
        out += self._group("blue", v["blue"]) + self._rule(v["rule"])
        out += self._group("url", v["url"])
        return out

    def wordmark(self, v):
        """Jen napis - vnorene viewBox podnadpis i adresu orizne."""
        out = ""
        if v["keyline"]:
            out += self._group("keyline", v["keyline"])
        return out + self._group("blue", v["blue"])


def jacket(g, back):
    b, d, s, m = g["base"], g["dark"], g["seam"], g["mesh"]
    p = [f'<path d="M 92,74 L 34,112 L 16,268 L 76,283 L 100,163 Z" fill="{d}"/>',
         f'<path d="M 328,74 L 386,112 L 404,268 L 344,283 L 320,163 Z" fill="{d}"/>',
         f'<path d="M 96,120 L 112,116 L 116,190 L 100,194 Z" fill="{m}"/>',
         f'<path d="M 324,120 L 308,116 L 304,190 L 320,194 Z" fill="{m}"/>',
         f'<path d="M 16,268 L 76,283 L 72,306 L 12,291 Z" fill="{s}"/>',
         f'<path d="M 404,268 L 344,283 L 348,306 L 408,291 Z" fill="{s}"/>',
         f'<path d="M 92,74 C 118,62 146,55 172,52 C 180,74 194,86 210,86 '
         f'C 226,86 240,74 248,52 C 274,55 302,62 328,74 L 320,163 L 320,436 '
         f'L 100,436 L 100,163 Z" fill="{b}"/>',
         f'<path d="M 100,418 L 320,418 L 320,436 L 100,436 Z" fill="{d}"/>']
    if back:
        p += [f'<path d="M 100,152 C 150,140 180,150 210,158 C 240,150 270,140 '
              f'320,152" stroke="{s}" stroke-width="2.5" fill="none"/>',
              f'<path d="M 168,40 L 252,40 L 252,88 C 240,96 226,100 210,100 '
              f'C 194,100 180,96 168,88 Z" fill="{d}"/>']
    else:
        p += [f'<rect x="203" y="86" width="14" height="332" fill="{d}"/>',
              f'<path d="M 210,88 L 210,418" stroke="{s}" stroke-width="2" fill="none"/>',
              f'<rect x="228" y="150" width="76" height="11" rx="4" fill="{s}"/>',
              f'<path d="M 118,140 L 180,140 L 180,178 L 118,178 Z" fill="{d}"/>',
              f'<rect x="116" y="136" width="66" height="9" fill="{s}"/>',
              f'<path d="M 168,40 L 252,40 L 252,86 L 168,86 Z" fill="{d}"/>']
    return "".join(p)


def render(g, back, content, vb_h, cx, cy, w_mm, out, px=1200):
    lw = w_mm * MM
    lh = lw * vb_h / 1000.0
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 480" '
           f'width="420" height="480"><rect width="420" height="480" '
           f'fill="#FFFFFF"/>{jacket(g, back)}'
           f'<svg x="{cx - lw / 2:.3f}" y="{cy:.3f}" width="{lw:.3f}" '
           f'height="{lh:.3f}" viewBox="0 0 1000 {vb_h:.3f}">{content}</svg></svg>')
    cairosvg.svg2png(bytestring=svg.encode(), write_to=str(out), output_width=px)


def strip(paths, out):
    ims = [Image.open(p).convert("RGB") for p in paths]
    c = Image.new("RGB", (sum(i.width for i in ims), ims[0].height), "white")
    x = 0
    for i in ims:
        c.paste(i, (x, 0))
        x += i.width
    c.save(out)


def main():
    logo = Logo()
    for gname, g in GARMENTS.items():
        scored = sorted(VARIANTS.items(),
                        key=lambda kv: -contrast(kv[1]["lead"], g["base"]))
        log(f"{g['label']} ({g['base']}):")
        for vname, v in scored:
            log(f"    {v['label']:24s} kontrast {contrast(v['lead'], g['base']):.2f}x"
                + ("   <- doporuceno" if vname == scored[0][0] else ""))
        best = scored[0][0]

        for vname, v in VARIANTS.items():
            render(g, True, logo.full(v), logo.h, 210, 190, 300,
                   MOCKUP / f"{gname}-zada-{vname}.png")
        render(g, False, logo.wordmark(VARIANTS[best]), logo.word_h,
               266, 108, 90, MOCKUP / f"{gname}-predek-{best}.png")

        strip([MOCKUP / f"{gname}-zada-{v}.png" for v in VARIANTS],
              MOCKUP / f"{gname}-srovnani.png")
        strip([MOCKUP / f"{gname}-predek-{best}.png",
               MOCKUP / f"{gname}-zada-{best}.png"],
              MOCKUP / f"{gname}-doporuceno.png")
    log(f"hotovo: {len(list(MOCKUP.glob('*.png')))} nahledu v mockup/")


if __name__ == "__main__":
    main()
