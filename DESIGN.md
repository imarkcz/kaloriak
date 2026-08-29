# DESIGN.md

Designový systém Kaloriaku. Zdroj pravdy jsou `tailwind.config.js` a `src/index.css`; tenhle soubor vysvětluje proč.

Směr zadal uživatel odkazem na [superconscious-app.webflow.io](https://superconscious-app.webflow.io/). Hodnoty níž jsou odečtené z té stránky a přizpůsobené mobilnímu nástroji.

## Color

Strategie: **Restrained.** Tmavý neutrální podklad, jeden fialový akcent, tři kategoriální barvy pro makra.

| Token | Hex | Role |
|---|---|---|
| `bg` | `#0c0b0c` | podklad celé aplikace (z reference) |
| `surface` | `#131215` | karta |
| `surface-2` | `#1a181d` | vnořený povrch, pole, chip |
| `surface-3` | `#232028` | aktivní stav, thumbnail |
| `violet-500` | `#8f69e0` | primární akce, aktivní výběr, prstenec |
| `violet-300` | `#b9a3ff` | akcentní text a popisky |
| `lilac` | `#edc5fc` | výhradně ambientní záře, nikdy text |
| `macro-protein` | `#f47da6` | bílkoviny |
| `macro-carbs` | `#e8b45f` | sacharidy |
| `macro-fat` | `#6ec2f0` | tuky |

Neutrály jsou zabarvené do fialové (`#0c0b0c` není čistá černá, `#131215` má modrofialový nádech). Text je bílý s alfa kanálem, ne šedé hexy: `ink` 100 %, `ink-soft` 70 %, `ink-mute` 45 %, `ink-dim` 30 %.

Semantika je oddělená od akcentu: `#f0765a` chyba, `#e0a03f` varování, `#5ecf9e` v pořádku. Fialová nikdy neznamená stav, vždycky jen akci nebo výběr.

## Type

Jedno písmo: **Wix Madefor Display** (Google Fonts, váhy 400–800). Geometrický grotesk z reference. Fallback `system-ui`.

Škála je pevná v rem, poměr 1,2. Nejmenší popisek je 12 px; `text-[9px]` a `text-[10px]` se v projektu už nepoužívají.

| Krok | Velikost | Váha | Tracking |
|---|---|---|---|
| `display` | 56 px | 500 | −0.055em |
| `hero` | 40 px | 600 | −0.045em |
| `h1` | 28 px | 600 | −0.035em |
| `h2` | 21 px | 600 | −0.025em |
| `h3` | 17 px | 600 | −0.015em |
| `body` | 15 px | 400 | 0 |
| `sm` | 13 px | 400/500 | 0 |
| `label` | 12 px | 600 | 0.08em, uppercase |

Čísla vždycky `tabular-nums`. Velká čísla (hero, prstenec) mají tracking −0.05em, jinak vypadají řídce.

## Elevation

Žádné vrstvení skla. Dvě úrovně:

- **`.card`** — `#131215`, radius 24 px, obrys `rgba(255,255,255,0.07)`, vnitřní horní světlo `inset 0 1px 0 rgba(255,255,255,0.05)`, měkký stín dolů.
- **`.card-lit`** — totéž plus gradientový 1px obrys, který nahoře svítí. Jenom pro hero.

Rozostření (`backdrop-filter`) má v aplikaci **jediné místo**: spodní navigace, která překrývá scrollující obsah. Tam má práci.

Radius: karta 24 px, velká karta 28 px, pole a tlačítko 16 px, chip a pilulka 999 px.

## Glow

Technika z reference: plná barva + `filter: blur()` + nízká opacita + `border-radius: 50%`. Je to jeden kompozitovaný layer, levnější než plátno s částicemi.

- Hero záře: `#8f69e0`, blur 120 px, opacita 0.22
- Ambientní pozadí: `#edc5fc`, blur 200 px, opacita 0.10
- Malý akcent pod ikonou: `#8f69e0`, blur 40 px, opacita 0.25

Záře se pomalu posouvají (`transform: translate3d`, 30–50 s perioda). Nikdy neanimuj `filter` ani `opacity` ve smyčce.

## Motion

150–250 ms na stavové přechody, `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo). Žádné odskakování.

Povolené animace:
- `reveal` — vstup obsahu, opacity + 10px posun, stagger 40 ms přes `--i`
- `ring-draw` — prstenec se dokreslí při změně hodnoty
- `sweep` — pomalá rotace kónického světla po prstenci, 8 s, jenom hero
- `drift` — ambientní záře

Všechno respektuje `prefers-reduced-motion`.

## Components

Každý interaktivní prvek má default, hover, focus-visible, active, disabled. Tlačítka mají tři varianty a nic jiného:

- **primary** — plná fialová, bílý text, radius 16 px
- **ghost** — `surface-2`, obrys, `ink-soft`
- **plain** — jen text, `ink-mute`

Ikony: jedna tažená SVG sada, `stroke-width: 1.75`, `stroke-linecap: round`. Emoji zůstávají výhradně jako fallback obrázku jídla v `FoodThumb` a v kategoriích, nikde ve struktuře.

Prázdné stavy učí rozhraní: řeknou, co se stane po klepnutí, ne „zatím nic“.
