"""
Nove logo PROIZOL - postaveno jako geometrie, ne obtazeni.

Podklad byl rastrovy render s kovovym gradientem. Obtahovat ho nema smysl
ze dvou duvodu: gradient by se do krivek preneslo jako pasy, a na sitotisk
se gradient stejne nehodi - potreba jsou plochy barvy. Logo se proto sklada
znovu: pismo z varijabilniho rezu prevedene na krivky, strecha a linka jako
ciste geometrie.

Rozmery jsou v jednotkach, kde vyska verzalky napisu = 1000.

Vystup: logo2/*.svg
"""
import json
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "logo2"
OUT.mkdir(exist_ok=True)
FONTS = Path("/tmp/fonts")

WHITE = "#FFFFFF"
RED = "#E01B22"
RED_DARK = "#A8141A"        # jen pro trojbarevnou verzi strechy
INK = "#23272B"             # podklad nahledu

CAP = 1000.0                # vyska verzalky napisu = zakladni jednotka


class Face:
    """Varijabilni rez ustaleny na jedne vaze a sirce, s vytahem obrysu."""

    def __init__(self, name, wght, wdth):
        f = TTFont(FONTS / f"{name}.ttf")
        axes = {a.axisTag for a in f["fvar"].axes}
        loc = {}
        if "wght" in axes:
            loc["wght"] = wght
        if "wdth" in axes:
            loc["wdth"] = wdth
        self.font = instantiateVariableFont(f, loc, updateFontNames=False)
        self.upem = self.font["head"].unitsPerEm
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.hmtx = self.font["hmtx"]
        os2 = self.font["OS/2"]
        self.cap_units = getattr(os2, "sCapHeight", None) or self.upem * 0.7

    def name_of(self, ch):
        return self.cmap[ord(ch)]

    def outline(self, ch):
        pen = SVGPathPen(self.glyphs)
        self.glyphs[self.name_of(ch)].draw(pen)
        return pen.getCommands()

    def advance(self, ch):
        return self.hmtx[self.name_of(ch)][0]


def set_text(face, text, cap_height, tracking=0.0):
    """Vysadi text a prevede na krivky.

    Vraci (svg, sirka, stredy_pismen) - vse uz v cilovych jednotkach.
    tracking je prostrkani v jednotkach cap_height.
    """
    s = cap_height / face.cap_units
    track = tracking * cap_height / s          # prostrkani v jednotkach pisma
    parts, centers, x = [], [], 0.0
    for ch in text:
        adv = face.advance(ch)
        if ch != " ":
            d = face.outline(ch)
            if d:
                parts.append(f'<g transform="translate({x:.2f},0)">'
                             f'<path d="{d}"/></g>')
        centers.append((x + adv / 2.0) * s)
        x += adv + track
    width = (x - track) * s
    # pismo ma osu y nahoru; prevod na SVG (y dolu) a na cilovou vysku
    return (f'<g transform="scale({s:.6f},{-s:.6f})">{"".join(parts)}</g>',
            width, centers)


def fit_tracking(face, text, cap_height, target_width):
    """Prostrkani, ktere text roztahne presne na zadanou sirku.

    Sirka je v prostrkani linearni, takze staci dva vzorky a interpolace.
    """
    _, w0, _ = set_text(face, text, cap_height, 0.0)
    _, w1, _ = set_text(face, text, cap_height, 0.1)
    n = max(len(text) - 1, 1)
    if abs(w1 - w0) < 1e-9:
        return 0.0
    return 0.1 * (target_width - w0) / (w1 - w0)


def roof(cx, apex_y, base_y, half_span, thick):
    """Cervena strecha nad Z.

    Pasmo mezi dvema obracenymi V, spodni hrana rovne odriznuta - konce
    krovu tim koncia vodorovne, ne do spicky. `thick` je svisla tloustka.
    """
    drop = base_y - apex_y
    # kde vnitrni hrana dosedne na rez
    u = half_span * (1.0 - thick / drop)
    return (f'M {cx - half_span:.2f},{base_y:.2f} '
            f'L {cx:.2f},{apex_y:.2f} '
            f'L {cx + half_span:.2f},{base_y:.2f} '
            f'L {cx + u:.2f},{base_y:.2f} '
            f'L {cx:.2f},{apex_y + thick:.2f} '
            f'L {cx - u:.2f},{base_y:.2f} Z')


def build(face_word, face_tag, face_url, *, colors, compact=False):
    """Slozi logo. Vraci (svg_obsah, sirka, vyska) v jednotkach CAP=1000.

    compact=True vrati jen znak - strechu a napis PROIZOL, bez podnadpisu,
    linky a adresy. To je podoba pro male aplikace (leva hrud, cepice).
    """
    c_word = colors["word"]
    c_acc = colors["accent"]

    word, w_word, pos = set_text(face_word, "PROIZOL", CAP, tracking=0.012)
    W = w_word
    cx = W / 2.0
    x_word = 0.0

    # podnadpis a adresa se prostrkaji na podil sirky napisu
    TAG_CAP = 0.256 * CAP
    tr = fit_tracking(face_tag, "VŠE O STŘECHÁCH", TAG_CAP, 0.78 * W)
    tag, w_tag, _ = set_text(face_tag, "VŠE O STŘECHÁCH", TAG_CAP, tr)

    URL_CAP = 0.50 * CAP
    URL = "www.proizol.cz"
    tu = fit_tracking(face_url, URL, URL_CAP, 0.96 * W)
    i_dot = URL.rindex(".")
    url_a, w_a, _ = set_text(face_url, URL[:i_dot], URL_CAP, tu)
    url_dot, w_dot, _ = set_text(face_url, ".", URL_CAP, tu)
    url_b, w_b, _ = set_text(face_url, URL[i_dot + 1:], URL_CAP, tu)
    w_url = w_a + w_dot + w_b + 2 * tu * URL_CAP

    # svisly rytmus
    y_cap = 0.51 * CAP                  # temeno verzalek napisu
    y_base = y_cap + CAP                # uctari napisu
    y_tag = y_base + 0.57 * CAP         # uctari podnadpisu
    y_rule = y_tag + 0.37 * CAP
    rule_t = 0.037 * CAP
    y_url = y_rule + 0.83 * CAP         # uctari adresy
    H = y_url + 0.18 * CAP              # rezerva na dotahy dolu

    # strecha nad Z: Z je pate ze sedmi pismen "PROIZOL"
    z_cx = x_word + pos[4]
    z_w = face_word.advance("Z") * CAP / face_word.cap_units

    g = []
    g.append(f'<g id="strecha" fill="{c_acc}"><path d="'
             + roof(z_cx, 0.0, y_cap, 0.95 * CAP, 0.26 * CAP)
             + '"/></g>')
    g.append(f'<g id="napis" fill="{c_word}" fill-rule="evenodd" '
             f'transform="translate({x_word:.2f},{y_base:.2f})">{word}</g>')

    # Diagonala Z cervene. Z se neseka - vybarvi se pruh pres celou sirku
    # pismene, orezany jeho vlastnim obrysem, ve svisle zone mezi hornim
    # a dolnim bremenem. V te zone je jediny tah prave diagonala.
    zd, _, _ = set_text(face_word, "Z", CAP, 0.0)
    bar = 0.235 * CAP
    g.append(
        f'<clipPath id="clip-z"><g transform="translate({z_cx - z_w / 2:.2f},'
        f'{y_base:.2f})">{zd}</g></clipPath>'
        f'<rect id="z-diagonala" clip-path="url(#clip-z)" '
        f'x="{z_cx - z_w:.2f}" y="{y_base - CAP + bar:.2f}" '
        f'width="{2 * z_w:.2f}" height="{CAP - 2 * bar:.2f}" fill="{c_acc}"/>')

    if compact:
        return "".join(g), W, y_base + 0.02 * CAP

    dot_r = 0.050 * CAP
    gap = 0.35 * CAP
    dots = []
    for side in (-1, 1):
        base = cx + side * (w_tag / 2.0 + gap)
        for i in range(3):
            dots.append(f'<circle cx="{base + side * i * dot_r * 2.7:.2f}" '
                        f'cy="{y_tag - TAG_CAP * 0.34:.2f}" r="{dot_r:.2f}"/>')
    g.append(f'<g id="tecky" fill="{c_acc}">{"".join(dots)}</g>')
    g.append(f'<g id="podnadpis" fill="{c_word}" fill-rule="evenodd" '
             f'transform="translate({cx - w_tag / 2.0:.2f},{y_tag:.2f})">'
             f'{tag}</g>')

    g.append(f'<rect id="linka" x="0" y="{y_rule:.2f}" width="{W:.2f}" '
             f'height="{rule_t:.2f}" fill="{c_acc}"/>')

    x = cx - w_url / 2.0
    g.append(f'<g id="adresa" fill="{c_word}" fill-rule="evenodd" '
             f'transform="translate({x:.2f},{y_url:.2f})">{url_a}</g>')
    g.append(f'<g id="adresa-tecka" fill="{c_acc}" fill-rule="evenodd" '
             f'transform="translate({x + w_a:.2f},{y_url:.2f})">{url_dot}</g>')
    g.append(f'<g id="adresa-cz" fill="{c_word}" fill-rule="evenodd" '
             f'transform="translate({x + w_a + w_dot:.2f},{y_url:.2f})">'
             f'{url_b}</g>')

    return "".join(g), W, H


def svg(content, W, H, background=None, mm=250.0, pad=0.0):
    m = pad * W
    vb = f"{-m:.2f} {-m:.2f} {W + 2 * m:.2f} {H + 2 * m:.2f}"
    bg = (f'<rect x="{-m:.2f}" y="{-m:.2f}" width="{W + 2 * m:.2f}" '
          f'height="{H + 2 * m:.2f}" fill="{background}"/>' if background else "")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" '
            f'width="{mm:.2f}mm" height="{mm * (H + 2 * m) / (W + 2 * m):.2f}mm">'
            f'<title>PROIZOL</title>{bg}{content}</svg>')


VARIANTS = {
    "bila-cervena": dict(word=WHITE, accent=RED),
    "bila": dict(word=WHITE, accent=WHITE),
    "cervena-tmava": dict(word="#23272B", accent=RED),
    "cerna": dict(word="#000000", accent="#000000"),
}


def faces(font="Saira", wght=800, wdth=125):
    """Napis a podnadpis hranatym rezem, adresa kulatym groteskem -
    stejne jako v predloze."""
    return (Face(font, wght, wdth), Face(font, 600, 118),
            Face("ArchivoExp", 700, 100))


def main(font="Saira", wght=800, wdth=125):
    import cairosvg
    fw, ft, fu = faces(font, wght, wdth)
    print(f"  rez {font} w{wght} x{wdth}; cap={fw.cap_units}/{fw.upem} upem")
    geo = {"font": font, "wght": wght, "wdth": wdth, "cap": CAP}
    for compact, tag, mm in ((False, "", 250.0), (True, "-znak", 90.0)):
        for name, colors in VARIANTS.items():
            content, W, H = build(fw, ft, fu, colors=colors, compact=compact)
            stem = f"proizol2{tag}-{name}"
            data = svg(content, W, H, mm=mm)
            (OUT / f"{stem}.svg").write_text(data)
            cairosvg.svg2pdf(bytestring=data.encode(),
                             write_to=str(OUT / f"{stem}.pdf"))
            cairosvg.svg2png(bytestring=data.encode(),
                             write_to=str(OUT / f"{stem}.png"),
                             output_width=2400, background_color="#00000000")
        geo["znak" if compact else "logo"] = {
            "width": round(W, 1), "height": round(H, 1),
            "ratio": round(W / H, 3), "print_mm": mm}
        print(f"  {'znak' if compact else 'logo '}: {W:.0f} x {H:.0f} "
              f"(pomer {W / H:.2f}), {len(VARIANTS)} variant, {mm:.0f} mm")
    (OUT / "geometry.json").write_text(json.dumps(geo, indent=2))


if __name__ == "__main__":
    main()
