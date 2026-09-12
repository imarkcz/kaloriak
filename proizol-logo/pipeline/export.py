"""
Krok 3 - sestaveni finalnich souboru.

Z obrysu v build/layers.json sklada barevne varianty a exportuje je
do SVG / PDF / PNG. Vsechny texty jsou krivky, zadne pismo neni potreba.
"""
import json

import cairosvg

from common import BUILD, DIST, NAVY, RED, WHITE, log

WIDTH_UNITS = 1000.0            # sirka loga v uzivatelskych jednotkach SVG
PRINT_MM = 250.0                # doporucena sirka potisku na hrud
ANTHRACITE = "#33383C"          # barva monterek - jen pro nahledy


def build_svg(layers, geom, fills, background=None, pad=0.0,
              short_url=False, rule_scale=1.0, wordmark_only=False,
              print_mm=None):
    """fills: {vrstva: barva | None}; None = vrstva se vynecha.

    wordmark_only: jen napis PROIZOL, orezany na vlastni ohranicujici
    obdelnik - pro male aplikace (leva hrud, cepice), kde by podnadpis
    a adresa byly necitelne.
    """
    bx0, by0, bx1, by1 = geom["bbox_word" if wordmark_only else "bbox"]
    k = WIDTH_UNITS / (bx1 - bx0)
    w, h = WIDTH_UNITS, (by1 - by0) * k
    m = pad * w
    mm = (print_mm if print_mm else PRINT_MM) * (1 + 2 * pad)
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{-m:.3f} {-m:.3f} {w + 2 * m:.3f} {h + 2 * m:.3f}" '
        f'width="{mm:.3f}mm" '
        f'height="{mm * (h + 2 * m) / (w + 2 * m):.3f}mm">',
        '<title>PROIZOL</title>',
    ]
    if background:
        out.append(f'<rect x="{-m:.3f}" y="{-m:.3f}" width="{w + 2 * m:.3f}" '
                   f'height="{h + 2 * m:.3f}" fill="{background}"/>')

    url_layer = "url_short" if short_url else "url"
    order = (("keyline_word", "word") if wordmark_only
             else ("keyline", "blue", "rule", url_layer))
    for name in order:
        key = {"keyline_word": "keyline", "word": "blue"}.get(name, name)
        color = fills.get("url" if name == url_layer else key)
        if not color:
            continue
        if name == "rule":                       # linka se kresli jako obdelnik
            rx0, ry0, rx1, ry1 = geom["rule"]
            cy = (ry0 + ry1) / 2.0
            hh = (ry1 - ry0) * rule_scale / 2.0
            out.append(f'<rect id="rule" x="{(rx0 - bx0) * k:.3f}" '
                       f'y="{(cy - hh - by0) * k:.3f}" '
                       f'width="{(rx1 - rx0) * k:.3f}" '
                       f'height="{2 * hh * k:.3f}" fill="{color}"/>')
            continue
        lay = layers[name]
        tf = f"scale({k:.8f}) translate({-bx0},{-by0}) {lay['transform']}"
        out.append(f'<g id="{name}" fill="{color}" fill-rule="evenodd" '
                   f'transform="{tf}">')
        out += [f'<path d="{d}"/>' for d in lay["paths"]]
        out.append('</g>')
    out.append('</svg>')
    return "\n".join(out)


VARIANTS = {
    "proizol-logo": (
        dict(keyline=WHITE, blue=NAVY, rule=WHITE, url=WHITE), None,
        "zakladni - modra s bilym obrysem"),
    "proizol-logo-bila": (
        dict(keyline=None, blue=WHITE, rule=WHITE, url=WHITE), None,
        "jednobarevna bila - nejlepsi na antracit, nejlevnejsi tisk"),
    "proizol-logo-bila-cervena": (
        dict(keyline=None, blue=WHITE, rule=RED, url=WHITE), None,
        "bila s cervenou linkou - firemni akcent, 2 barvy"),
    "proizol-logo-cervena-obrys": (
        dict(keyline=RED, blue=WHITE, rule=RED, url=WHITE), None,
        "bila s cervenym obrysem - nejvyraznejsi na antracitu"),
    "proizol-logo-modra": (
        dict(keyline=None, blue=NAVY, rule=NAVY, url=NAVY), None,
        "jednobarevna modra - na bile a svetle tricko"),
    "proizol-logo-cerna": (
        dict(keyline=None, blue="#000000", rule="#000000", url="#000000"),
        None, "jednobarevna cerna - vysivka, razitko, fax"),
    "proizol-logo-na-cervene": (
        dict(keyline=WHITE, blue=NAVY, rule=WHITE, url=WHITE), RED,
        "puvodni podoba na cervene plose"),
}


MODERN = {
    "proizol-logo-moderni-bila": (
        dict(keyline=None, blue=WHITE, rule=WHITE, url=WHITE), None,
        "modernizovana - kratka adresa proizol.cz, tenci linka"),
    "proizol-logo-moderni-bila-cervena": (
        dict(keyline=None, blue=WHITE, rule=RED, url=WHITE), None,
        "modernizovana s cervenou linkou"),
}


# Samotny napis - na levou hrud, cepici a vsude pod 120 mm sirky, kde by
# podnadpis (vyska pismene 1,6 mm pri 90 mm) a linka (0,4 mm) zanikly.
WORDMARK = {
    "proizol-napis-modra-bily-obrys": (
        dict(keyline=WHITE, blue=NAVY),
        "jen napis, modra s bilym obrysem - seda bluza"),
    "proizol-napis-bila": (
        dict(keyline=None, blue=WHITE),
        "jen napis, bila - antracitova bluza"),
    "proizol-napis-modra": (
        dict(keyline=None, blue=NAVY),
        "jen napis, modra - svetle podklady"),
}
WORDMARK_MM = 90.0          # doporucena sirka na levou hrud


def main():
    layers = json.loads((BUILD / "layers.json").read_text())
    geom = json.loads((BUILD / "geometry.json").read_text())

    if "bbox_word" in geom:
        for name, (fills, desc) in WORDMARK.items():
            svg = build_svg(layers, geom, fills, wordmark_only=True,
                            print_mm=WORDMARK_MM)
            (DIST / f"{name}.svg").write_text(svg)
            data = svg.encode()
            cairosvg.svg2pdf(bytestring=data, write_to=str(DIST / f"{name}.pdf"))
            cairosvg.svg2png(bytestring=data, write_to=str(DIST / f"{name}.png"),
                             output_width=2400, background_color="#00000000")
            log(f"{name:32s} {desc}")

    for name, (fills, bg, desc) in MODERN.items():
        svg = build_svg(layers, geom, fills, bg, short_url=True, rule_scale=0.55)
        (DIST / f"{name}.svg").write_text(svg)
        data = svg.encode()
        cairosvg.svg2pdf(bytestring=data, write_to=str(DIST / f"{name}.pdf"))
        cairosvg.svg2png(bytestring=data, write_to=str(DIST / f"{name}.png"),
                         output_width=2400, background_color="#00000000")
        log(f"{name:32s} {desc}")

    for name, (fills, bg, desc) in VARIANTS.items():
        svg = build_svg(layers, geom, fills, bg)
        (DIST / f"{name}.svg").write_text(svg)
        data = svg.encode()
        cairosvg.svg2pdf(bytestring=data, write_to=str(DIST / f"{name}.pdf"))
        cairosvg.svg2png(bytestring=data, write_to=str(DIST / f"{name}.png"),
                         output_width=2400,
                         background_color=None if bg else "#00000000")
        log(f"{name:32s} {desc}")

    # nahledy na antracitovem podkladu (kontrola citelnosti na monterkach)
    for name in ("proizol-logo", "proizol-logo-bila", "proizol-logo-bila-cervena",
                 "proizol-logo-cervena-obrys"):
        svg = build_svg(layers, geom, VARIANTS[name][0], ANTHRACITE, pad=0.06)
        cairosvg.svg2png(bytestring=svg.encode(),
                         write_to=str(BUILD / f"nahled-antracit-{name}.png"),
                         output_width=1600)
    log(f"hotovo: {len(list(DIST.glob('*')))} souboru v dist/")


if __name__ == "__main__":
    main()
