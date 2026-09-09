"""
Krok 1 - narovnani fotografie do roviny polepu.

Fotka je porizena sikmo, takze logo je v perspektive (pismena vpravo jsou
o ~15 % vetsi nez vlevo). Skript najde ve fotce dva svazky rovnobezek:

  * vodorovny - verzalkova linka PROIZOL, uctari PROIZOL, delici linka
  * svisly    - stojky pismen P, I, L

Z jejich ubezniku se dopocita ohniskova vzdalenost kamery (predpoklad:
ctvercove pixely, hlavni bod ve stredu snimku) a z ni metricka rektifikace,
ktera vrati spravny pomer stran - ne jen "narovnani na oko".

Vystup: build/rectified.png
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from common import BUILD, SOURCE, log

Image.MAX_IMAGE_PIXELS = None

TARGET_CAP_PX = 900.0   # vyska verzalek PROIZOL v narovnanem rastru


# ----------------------------------------------------------------- masky ---
def color_masks(rgb):
    a = rgb.astype(np.int16)
    R, B = a[..., 0], a[..., 2]
    mx, mn = a.max(2), a.min(2)
    blue = (B - R > 25) & (B > 55) & (R < 150)
    white = (mn > 115) & ((mx - mn) < 75)
    return blue, white


def letters(blue, min_area=1500, close=9):
    """Souvisle modre komponenty = jednotliva pismena (praskliny zaceleny)."""
    m = ndi.binary_opening(ndi.binary_closing(blue, np.ones((close, close))),
                           np.ones((3, 3)))
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1))
    m = np.isin(lab, np.nonzero(sizes > min_area)[0] + 1)
    lab, n = ndi.label(m)
    out = {}
    for i, sl in enumerate(ndi.find_objects(lab)):
        ys, xs = sl
        out[i + 1] = (xs.start, ys.start, xs.stop - xs.start,
                      ys.stop - ys.start, lab[sl] == (i + 1))
    return out


# ------------------------------------------------------- vodorovne linky ---
def profile(comp, side):
    x0, y0, w, h, m = comp
    xs, ys = [], []
    for c in range(w):
        col = np.nonzero(m[:, c])[0]
        if len(col):
            xs.append(x0 + c)
            ys.append(y0 + (col.max() if side == "bot" else col.min()))
    return np.asarray(xs, float), np.asarray(ys, float)


def flat_part(prof, slope, side, band=4.0):
    """Body lezici na rovne casti obrysu (patka / temeno pismene)."""
    X, Y = prof
    d = Y - slope * X
    ref = d.max() if side == "bot" else d.min()
    sel = np.abs(d - ref) < band
    return X[sel], Y[sel]


def fit_h(points):
    X = np.concatenate([p[0] for p in points])
    Y = np.concatenate([p[1] for p in points])
    return np.polyfit(X, Y, 1)          # y = m*x + c


def rule_line(white, blue):
    """Delici linka: tenke bile behy, ktere maji nad i pod sebou jen lak."""
    ink = white | blue
    H, W = white.shape
    pts = []
    for x in range(W):
        col = white[:, x]
        d = np.diff(np.concatenate(([0], col.view(np.int8), [0])))
        for s, e in zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]):
            if not (2 <= e - s <= 16) or s - 30 < 0 or e + 30 >= H:
                continue
            if ink[s - 30:s - 5, x].any() or ink[e + 5:e + 30, x].any():
                continue
            pts.append((x, (s + e - 1) / 2.0))
    P = np.asarray(pts)
    X, Y = P[:, 0], P[:, 1]
    p = np.array([0.095, np.median(Y - 0.095 * X)])
    for _ in range(6):
        keep = np.abs(Y - np.polyval(p, X)) < 5
        p = np.polyfit(X[keep], Y[keep], 1)
    return p


# --------------------------------------------------------- svisle stojky ---
def fit_v(comp, side, yfrac):
    """Hrana stojky: x = a*y + b."""
    x0, y0, w, h, m = comp
    xs, ys = [], []
    for r in range(int(h * yfrac[0]), int(h * yfrac[1])):
        row = np.nonzero(m[r, :])[0]
        if len(row) == 0:
            continue
        xs.append(x0 + (row.min() if side == "L" else row.max()))
        ys.append(y0 + r)
    x, y = np.asarray(xs, float), np.asarray(ys, float)
    p = np.polyfit(y, x, 1)
    for _ in range(3):
        keep = np.abs(x - np.polyval(p, y)) < 3
        p = np.polyfit(y[keep], x[keep], 1)
    return p


def vanishing_h(lines):                 # y = m x + c
    A = np.array([[m, -1.0] for m, _ in lines])
    b = np.array([-c for _, c in lines])
    return np.linalg.lstsq(A, b, rcond=None)[0]


def vanishing_v(lines):                 # x = a y + b
    A = np.array([[-1.0, a] for a, _ in lines])
    b = np.array([-bb for _, bb in lines])
    return np.linalg.lstsq(A, b, rcond=None)[0]


# ------------------------------------------------------------------ main ---
def main():
    img = Image.open(SOURCE).convert("RGB")
    rgb = np.asarray(img)
    H, W = rgb.shape[:2]
    log(f"zdroj {W}x{H}")

    blue, white = color_masks(rgb)
    comps = letters(blue)
    big = sorted([k for k, v in comps.items() if v[3] > 200 and v[2] > 80],
                 key=lambda k: comps[k][0])
    names = ["P", "R", "O", "I", "Z", "O2", "L"]
    M = dict(zip(names, big))
    log(f"nalezeno {len(big)} verzalek PROIZOL")

    flat = ["P", "R", "I", "Z", "L"]    # pismena s rovnou patkou i temenem
    base = fit_h([flat_part(profile(comps[M[n]], "bot"), .09, "bot") for n in flat])
    cap = fit_h([flat_part(profile(comps[M[n]], "top"), .09, "top") for n in flat])
    rule = rule_line(white, blue)
    log(f"uctari  y = {base[0]:+.5f}x + {base[1]:.1f}")
    log(f"verzalky y = {cap[0]:+.5f}x + {cap[1]:.1f}")
    log(f"linka    y = {rule[0]:+.5f}x + {rule[1]:.1f}")

    stems = [fit_v(comps[M["I"]], "L", (.06, .94)),
             fit_v(comps[M["I"]], "R", (.06, .94)),
             fit_v(comps[M["P"]], "L", (.06, .94)),
             fit_v(comps[M["L"]], "L", (.04, .80))]

    vph = vanishing_h([cap, base, rule])
    vpv = vanishing_v(stems)
    log(f"ubeznik vodorovny {vph.round(1)}  svisly {vpv.round(1)}")

    # kalibrace z ortogonality obou ubezniku
    px, py = W / 2, H / 2
    f2 = -((vph - [px, py]) @ (vpv - [px, py]))
    if f2 <= 0:
        raise SystemExit("ubezniky nejsou ortogonalni - zkontroluj detekci linek")
    f = float(np.sqrt(f2))
    log(f"ohnisko {f:.0f} px  = {f * 36 / W:.1f} mm ekv. (kinofilm)")

    K = np.array([[f, 0, px], [0, f, py], [0, 0, 1.0]])
    Ki = np.linalg.inv(K)
    d1 = Ki @ np.array([*vph, 1.0]); d1 /= np.linalg.norm(d1)
    d2 = Ki @ np.array([*vpv, 1.0]); d2 /= np.linalg.norm(d2)
    if d1[0] < 0: d1 = -d1              # +x doprava
    if d2[1] < 0: d2 = -d2              # +y dolu
    log(f"ortogonalita smeru: {abs(d1 @ d2):.1e}")
    normal = np.cross(d1, d2)
    log(f"sklon roviny vuci ose objektivu: {np.degrees(np.arccos(abs(normal[2]))):.1f} deg")

    Hp = K @ np.stack([d1, d2, Ki @ np.array([1350.0, 700.0, 1.0])], axis=1)
    Hi = np.linalg.inv(Hp)

    def to_plane(pts):
        P = np.array([[x, y, 1.0] for x, y in pts]).T
        Q = Hi @ P
        return (Q[:2] / Q[2]).T

    xm = 1300.0
    cap_h = abs(to_plane([(xm, np.polyval(base, xm))])[0][1]
                - to_plane([(xm, np.polyval(cap, xm))])[0][1])
    S = TARGET_CAP_PX / cap_h

    corners = to_plane([(400, 330), (2350, 330), (400, 1300), (2350, 1300)])
    umin, vmin = corners.min(0)
    umax, vmax = corners.max(0)
    pad = 0.06 * (umax - umin)
    umin -= pad; umax += pad; vmin -= pad * .6; vmax += pad * .6
    Wo, Ho = int(round((umax - umin) * S)), int(round((vmax - vmin) * S))
    log(f"narovnany rastr {Wo}x{Ho}")

    yy, xx = np.mgrid[0:Ho, 0:Wo]
    P = np.stack([(umin + xx / S).ravel(), (vmin + yy / S).ravel(), np.ones(Wo * Ho)])
    Q = Hp @ P
    Q /= Q[2]
    sx, sy = Q[0].reshape(Ho, Wo), Q[1].reshape(Ho, Wo)

    src = rgb.astype(np.float32)
    out = np.empty((Ho, Wo, 3), np.float32)
    for c in range(3):
        out[..., c] = ndi.map_coordinates(src[..., c], [sy, sx], order=3,
                                          mode="constant", cval=0)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(BUILD / "rectified.png")
    np.save(BUILD / "homography.npy", Hp)
    log(f"ulozeno {BUILD / 'rectified.png'}")


if __name__ == "__main__":
    main()
