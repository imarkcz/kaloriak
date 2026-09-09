"""
Srovnani rucne nalepeneho polepu do typograficke roviny.

Folie byla na dodavku lepena po jednotlivych pismenech, takze kazde sedi
o par pixelu jinde. Po narovnani perspektivy zbyva:

  napis PROIZOL   uctari kolisa o  9 px pri vysce verzalky 909 px
  podnadpis       uctari kolisa o 19 px pri vysce minusky  287 px  (6.6 %)
  bloky           nejsou svisle zarovnane - napis je o 150 px vlevo
                  proti lince a webove adrese

Modul kazdy tvar posune (a u verzalek i svisle dorovna vysku) tak, aby
blok sedel na jedne uctari, a pak vsechny bloky vycentruje na spolecnou osu.
Vodorovne rozestupy pismen zustavaji nedotcene - meni se jen svisla poloha.
"""
import numpy as np
from scipy import ndimage as ndi

MAX_SHIFT = 40          # pojistka: vetsi posun nez tohle je chyba detekce


def glyphs(mask):
    """Rozpad masky na jednotlive tvary serazene zleva."""
    lab, n = ndi.label(mask)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab)):
        out.append({
            "id": i + 1, "slice": sl, "mask": lab[sl] == (i + 1),
            "x0": sl[1].start, "x1": sl[1].stop,
            "y0": sl[0].start, "y1": sl[0].stop,
            "w": sl[1].stop - sl[1].start, "h": sl[0].stop - sl[0].start,
        })
    return sorted(out, key=lambda g: g["x0"])


def attach_accents(gl, body_h):
    """Priradi hacky a carky k pismenu pod nimi; vrati (pismena, {id: parent})."""
    small = [g for g in gl if g["h"] < 0.45 * body_h]
    body = [g for g in gl if g["h"] >= 0.45 * body_h]
    parent = {}
    for a in small:
        cand = [b for b in body
                if b["x0"] - 30 < (a["x0"] + a["x1"]) / 2 < b["x1"] + 30
                and b["y0"] > a["y0"]]
        if cand:                                    # hacek nad pismenem
            parent[a["id"]] = min(cand, key=lambda b: b["y0"] - a["y1"])["id"]
        else:                                       # samostatna tecka
            body.append(a)
    return body, parent


def caps_targets(body):
    """Verzalky: oddelene cile pro pismena s rovnou a s oblou patkou."""
    hs = np.array([g["h"] for g in body])
    flat_h = np.median(hs[hs <= np.median(hs) * 1.02])
    flat = [g for g in body if g["h"] <= flat_h * 1.02]
    round_ = [g for g in body if g["h"] > flat_h * 1.02]
    tb = np.median([g["y1"] for g in flat])
    th = np.median([g["h"] for g in flat])
    tgt = {}
    for g in flat:
        tgt[g["id"]] = (tb, th)
    if round_:
        over_lo = np.median([g["y1"] for g in round_]) - tb
        over_hi = (tb - th) - np.median([g["y0"] for g in round_])
        for g in round_:
            tgt[g["id"]] = (tb + over_lo, th + over_lo + over_hi)
    return tgt


def lowercase_shifts(body):
    """Minusky: posun podle te hrany tvaru, ktera lezi bliz spolecne lince
    (patka u dotahu nahoru, temeno u dotahu dolu)."""
    tops = np.array([g["y0"] for g in body], float)
    bots = np.array([g["y1"] for g in body], float)
    T, B = np.median(tops), np.median(bots)
    shift = {}
    for g in body:
        dt, db = g["y0"] - T, g["y1"] - B
        shift[g["id"]] = -(dt if abs(dt) < abs(db) else db)
    return shift


def warp(canvas, g, dx, dy, sy=1.0, base=None):
    """Vlozi tvar do platna posunuty o (dx, dy) a svisle prepocitany o sy."""
    if abs(sy - 1.0) < 1e-6:
        y0 = int(round(g["y0"] + dy)); x0 = int(round(g["x0"] + dx))
        sub = g["mask"]
        h, w = sub.shape
        canvas[y0:y0 + h, x0:x0 + w] |= sub
        return
    pad = 6
    h_out = int(np.ceil(g["h"] * sy)) + 2 * pad
    yy, xx = np.mgrid[0:h_out, 0:g["w"]]
    ysrc = (yy - pad) / sy
    out = ndi.map_coordinates(g["mask"].astype(np.float32), [ysrc, xx],
                              order=1, mode="constant", cval=0) > 0.5
    ytop = (base + dy) - (g["y1"] - g["y0"]) * sy - pad
    y0 = int(round(ytop)); x0 = int(round(g["x0"] + dx))
    y0 = max(y0, 0); x0 = max(x0, 0)
    canvas[y0:y0 + h_out, x0:x0 + g["w"]] |= out


def straighten(mask, kind):
    """kind: 'caps' (verzalky) nebo 'lower' (minusky s dotahy)."""
    gl = glyphs(mask)
    body_h = np.median([g["h"] for g in gl])
    body, parent = attach_accents(gl, body_h)
    by_id = {g["id"]: g for g in gl}

    out = np.zeros_like(mask)
    moves = {}
    if kind == "caps":
        tgt = caps_targets(body)
        for g in body:
            tb, th = tgt[g["id"]]
            sy = float(th) / g["h"]
            dy = float(tb - g["y1"])
            if abs(dy) > MAX_SHIFT:
                dy = 0.0
            moves[g["id"]] = (dy, sy, g["y1"])
            warp(out, g, 0, dy, sy, base=g["y1"])
    else:
        sh = lowercase_shifts(body)
        for g in body:
            dy = float(np.clip(sh[g["id"]], -MAX_SHIFT, MAX_SHIFT))
            moves[g["id"]] = (dy, 1.0, g["y1"])
            warp(out, g, 0, dy)

    for aid, pid in parent.items():                 # hacky jedou s pismenem
        dy, sy, _ = moves.get(pid, (0.0, 1.0, 0))
        warp(out, by_id[aid], 0, dy)
    return out, moves


def center_blocks(blocks, axis=None):
    """Vrati vodorovny posun pro kazdy blok tak, aby sdilely stejnou osu."""
    ext = {k: (np.nonzero(m.any(0))[0][[0, -1]]) for k, m in blocks.items()}
    if axis is None:
        axis = (ext["word"][0] + ext["word"][1] + 1) / 2.0
    return {k: axis - (e[0] + e[1] + 1) / 2.0 for k, e in ext.items()}, axis, ext


def shift_x(mask, dx):
    d = int(round(dx))
    if d == 0:
        return mask
    out = np.zeros_like(mask)
    if d > 0:
        out[:, d:] = mask[:, :-d]
    else:
        out[:, :d] = mask[:, -d:]
    return out
