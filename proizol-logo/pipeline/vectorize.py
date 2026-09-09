"""
Krok 2 - prevod narovnaneho rastru na krivky.

  1. barevna separace (modra / bila)
  2. oprava necistot na laku a prasklin ve folii
  3. srovnani na uctari + vycentrovani bloku (viz regularize.py)
  4. vyhlazeni obrysu
  5. bily obrys se generuje znovu jako rovnomerny offset - z fotky se
     neobkresluje, protoze je odreny a nestejnomerny
  6. delici linka jako presny obdelnik pres celou sirku loga
  7. potrace prevede kazdou vrstvu na bezierovy obrys

Vystup: build/layers.json + build/geometry.json
"""
import json
import re
import subprocess

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import regularize as reg
from common import BUILD, log

Image.MAX_IMAGE_PIXELS = None

SIGMA = 3.0             # vyhlazeni obrysu [px]
SPLIT_BLUE = 1630       # hranice napis / podnadpis
SPLIT_RULE = 2400       # nad = obrys pisma, pod = linka
SPLIT_URL = 2600        # pod = webova adresa
RULE_RATIO = 0.062      # tloustka linky vuci vysce verzalky


def disc(r):
    y, x = np.mgrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def grow(mask, r):
    """Dilatace kruhem - pres distancni transformaci (radove rychlejsi)."""
    return ndi.distance_transform_edt(~mask) <= r


def smooth(mask, sigma=SIGMA):
    return ndi.gaussian_filter(mask.astype(np.float32), sigma) > 0.5 if sigma > 0 else mask


def despeckle(mask, min_area):
    lab, n = ndi.label(mask)
    if n == 0:
        return mask
    sizes = ndi.sum(mask, lab, range(1, n + 1))
    return np.isin(lab, np.nonzero(sizes >= min_area)[0] + 1)


def damage_mask(rgb):
    """Necistoty na laku = ani lak, ani bila folie, ani modra folie."""
    R, B = rgb[..., 0], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2)
    other = ~(((R - B > 55) & (R > 90)) | ((mn > 115) & ((mx - mn) < 75))
              | (B - R > 25))
    inside = np.zeros(other.shape, bool)
    inside[420:3700, 620:7400] = True
    return despeckle(ndi.binary_opening(other & inside, np.ones((3, 3))), 250)


def heal(mask, damage, grow_px=35, fill=25):
    """Doplni zakousnuti od necistoty. Uzavreni se pocita jen v okoli
    poskozeni, takze ostre vrcholy pismen jinde zustanou nedotcene."""
    lab, n = ndi.label(damage)
    out = mask.copy()
    st = disc(fill)
    for sl in ndi.find_objects(lab):
        ys = slice(max(sl[0].start - grow_px - fill, 0), sl[0].stop + grow_px + fill)
        xs = slice(max(sl[1].start - grow_px - fill, 0), sl[1].stop + grow_px + fill)
        zone = grow(damage[ys, xs], grow_px)
        out[ys, xs] = np.where(zone, ndi.binary_closing(mask[ys, xs], st),
                               out[ys, xs])
    return out


def repair_cracks(blue):
    """Zaceli praskliny, protisky pismen zachova."""
    filled = ndi.binary_fill_holes(blue)
    lab, n = ndi.label(filled & ~blue)
    cracks, kept = [], 0
    for i, sl in enumerate(ndi.find_objects(lab)):
        area = int((lab[sl] == (i + 1)).sum())
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if area >= 1500 and area / (h * w) > 0.45 and min(h, w) > 25:
            kept += 1
        else:
            cracks.append(i + 1)
    log(f"protisku zachovano {kept}, prasklin zaceleno {len(cracks)}")
    return ndi.binary_closing(blue | np.isin(lab, cracks), disc(7))


def keyline_width(blue, white, y0, y1):
    vals = []
    for x in range(0, blue.shape[1], 3):
        cb = np.nonzero(blue[y0:y1, x])[0]
        if len(cb) == 0:
            continue
        r, k = y0 + cb.min() - 1, 0
        while r >= y0 and white[r, x]:
            r -= 1
            k += 1
        if k:
            vals.append(k)
    return int(np.median(vals))


def run_potrace(mask, name, turd=60):
    pbm = BUILD / f"{name}.pbm"
    svg = BUILD / f"layer-{name}.svg"
    Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert("1").save(pbm)
    subprocess.run(["potrace", "-b", "svg", "-a", "1.0", "-O", "0.2",
                    "-t", str(turd), "-u", "20", "-o", str(svg), str(pbm)],
                   check=True)
    txt = svg.read_text()
    tf = re.search(r'<g transform="([^"]+)"', txt)
    paths = re.findall(r'<path d="([^"]+)"', txt)
    log(f"{name}: {len(paths)} obrysu")
    return (tf.group(1) if tf else ""), paths


def main():
    rgb = np.asarray(Image.open(BUILD / "rectified.png").convert("RGB")).astype(np.int16)
    R, B = rgb[..., 0], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2)

    blue = despeckle(ndi.binary_opening(B - R > 25, np.ones((3, 3))), 400)
    white = despeckle(ndi.binary_opening((mn > 115) & ((mx - mn) < 75),
                                         np.ones((3, 3))), 500)
    dmg = damage_mask(rgb)
    log(f"poskozeni laku: {ndi.label(dmg)[1]} mist, {int(dmg.sum())} px")
    white = heal(white, dmg)
    blue = repair_cracks(blue)

    kw_word = keyline_width(blue, white, 500, SPLIT_BLUE)
    kw_tag = keyline_width(blue, white, SPLIT_BLUE, 2450)
    log(f"obrys: napis {kw_word} px, podnadpis {kw_tag} px")

    lab, n = ndi.label(blue)
    cy = np.array(ndi.center_of_mass(blue, lab, range(1, n + 1)))[:, 0]
    word = np.isin(lab, np.nonzero(cy < SPLIT_BLUE)[0] + 1)
    tag = np.isin(lab, np.nonzero(cy >= SPLIT_BLUE)[0] + 1)
    url = despeckle(white & (np.arange(white.shape[0])[:, None] >= SPLIT_URL), 2000)

    # --- srovnani na uctari ------------------------------------------------
    word_r, mv_w = reg.straighten(word, "caps")
    tag_r, mv_t = reg.straighten(tag, "lower")
    url_r, mv_u = reg.straighten(url, "lower")
    for nm, mv in (("napis", mv_w), ("podnadpis", mv_t), ("adresa", mv_u)):
        d = [m[0] for m in mv.values()]
        s = [m[1] for m in mv.values()]
        log(f"{nm}: srovnani {min(d):+.0f}..{max(d):+.0f} px, "
            f"vyska x{min(s):.3f}..{max(s):.3f}")

    # --- vycentrovani bloku na spolecnou osu -------------------------------
    blocks = {"word": word_r, "tag": tag_r, "url": url_r}
    dx, axis, ext = reg.center_blocks(blocks)
    log(f"osa loga x={axis:.0f}; posuny " +
        ", ".join(f"{k} {v:+.0f}" for k, v in dx.items()))
    word_r = reg.shift_x(word_r, dx["word"])
    tag_r = reg.shift_x(tag_r, dx["tag"])
    url_r = reg.shift_x(url_r, dx["url"])

    # --- kratsi adresa bez "www." pro modernejsi variantu -------------------
    ug = reg.glyphs(url_r)
    med_h = np.median([g["h"] for g in ug])
    dots = [g for g in ug if g["h"] < 0.4 * med_h and g["w"] < 0.5 * med_h]
    url_short = url_r.copy()
    if dots:
        cut = min(dots, key=lambda g: g["x0"])["x1"]     # tecka za "www"
        url_short[:, :cut] = False
        us = np.nonzero(url_short.any(0))[0]
        url_short = reg.shift_x(url_short, axis - (us[0] + us[-1] + 1) / 2.0)
        log(f"kratka adresa: rez na x={cut}, "
            f"{ndi.label(url_short)[1]} tvaru")

    word_s, tag_s = smooth(word_r), smooth(tag_r)
    url_s, url_short_s = smooth(url_r), smooth(url_short)
    key = grow(word_s, kw_word) | grow(tag_s, kw_tag)

    # linka se kresli az pri exportu jako obdelnik - jde tak menit jeji sila
    widths = {k: np.nonzero(m.any(0))[0][[0, -1]]
              for k, m in (("word", word_s), ("tag", tag_s), ("url", url_s))}
    half = max((e[1] - e[0] + 1) for e in widths.values()) / 2.0
    ys = np.nonzero(white[SPLIT_RULE:SPLIT_URL].any(1))[0]
    ry = SPLIT_RULE + (ys.min() + ys.max()) / 2.0
    rh = max(int(round(909 * RULE_RATIO)), 8)
    log(f"linka: sirka {int(2 * half)} px, tloustka {rh} px, osa y={ry:.0f}")

    layers = {}
    for nm, m in [("keyline", key), ("blue", word_s | tag_s),
                  ("url", url_s), ("url_short", url_short_s)]:
        tf, paths = run_potrace(m, nm)
        layers[nm] = {"transform": tf, "paths": paths}

    rule_box = [axis - half, ry - rh / 2.0, axis + half, ry + rh / 2.0]
    allm = key | word_s | tag_s | url_s
    ys, xs = np.nonzero(allm)
    geom = {
        "raster": list(map(int, blue.shape[::-1])),
        "bbox": [int(min(xs.min(), rule_box[0])), int(ys.min()),
                 int(max(xs.max(), rule_box[2])) + 1, int(ys.max()) + 1],
        "cap_height": 909, "axis": float(axis),
        "rule": [float(v) for v in rule_box],
        "keyline_word": kw_word, "keyline_tag": kw_tag,
    }
    (BUILD / "geometry.json").write_text(json.dumps(geom, indent=2))
    (BUILD / "layers.json").write_text(json.dumps(layers))
    bb = geom["bbox"]
    log(f"bbox {bb}; osa vuci stredu bboxu: "
        f"{axis - (bb[0] + bb[2]) / 2:+.1f} px")


if __name__ == "__main__":
    main()
