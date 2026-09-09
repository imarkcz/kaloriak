# PROIZOL — logo v křivkách

Rekonstrukce loga firmy PROIZOL z jediného podkladu, který byl k dispozici:
fotografie polepu na dodávce. Výstupem jsou vektorové soubory připravené
pro potisk oblečení — **všechny texty jsou převedené na křivky**, takže
k otevření ani k tisku není potřeba žádné písmo.

## Co je hotové

| | |
|---|---|
| Zdroj | 1 fotografie polepu (šikmý záběr, popraskaná fólie, nečistoty na laku) |
| Výstup | 9 barevných variant × SVG + PDF + PNG |
| Doporučená šířka potisku | 250 mm (hruď), 90 mm (levá hruď), 300 mm (záda) |

## Varianty

Soubory jsou v `logo/`. Ke každé variantě je `.svg` (editovatelné),
`.pdf` (pro tiskárnu) a `.png` (náhled, průhledné pozadí).

### Pro antracitové montérky

| Soubor | Popis | Počet barev |
|---|---|---|
| `proizol-logo-moderni-bila` | **doporučeno** — modernizovaná, krátká adresa `proizol.cz`, tenčí linka | 1 |
| `proizol-logo-moderni-bila-cervena` | totéž s červenou linkou jako firemním akcentem | 2 |
| `proizol-logo-bila` | věrná rekonstrukce, jednobarevná bílá | 1 |
| `proizol-logo-bila-cervena` | věrná rekonstrukce, červená linka | 2 |
| `proizol-logo-cervena-obrys` | bílá s červeným obrysem, nejvýraznější | 2 |

### Ostatní použití

| Soubor | Kam |
|---|---|
| `proizol-logo` | základní podoba (modrá + bílý obrys), na červené a tmavé podklady |
| `proizol-logo-na-cervene` | původní podoba na červené ploše — nášivka, cedule |
| `proizol-logo-modra` | jednobarevná modrá — bílé a světlé tričko, hlavičkový papír |
| `proizol-logo-cerna` | jednobarevná černá — výšivka, razítko, jednobarevný tisk |

## Barvy

| | HEX | Pantone | Poznámka |
|---|---|---|---|
| Modrá | `#012169` | 280 C | naměřeno z polepu (`#04206C`), sedí na 280 C |
| Bílá | `#FFFFFF` | — | |
| Červená | `#DA291C` | 485 C | **k potvrzení** — je to barva laku dodávky, ne doložená firemní barva |

## Co bylo při rekonstrukci opraveno

Fotka nebyla rovný sken, takže samotné obkreslení by přeneslo všechny vady
do vektoru. Proto proběhlo:

1. **Narovnání perspektivy.** Snímek je pořízený šikmo — písmena vpravo byla
   o 15 % větší než vlevo. Z fotky se změřily dva svazky rovnoběžek
   (účaří a verzálková linka nápisu, dělicí linka; svisle stojky P, I, L),
   z jejich úběžníků se dopočítala ohnisková vzdálenost fotoaparátu
   (vyšlo 25,9 mm ekv. — sedí na telefon) a z ní metrická rektifikace.
   Kontrola: obě „O" v PROIZOL vycházejí po narovnání 928 × 938 a 926 × 937 px,
   tedy shodně na 0,2 %.
2. **Zacelení prasklin** ve fólii — díry se klasifikují na protisky písmen
   (velké, kompaktní; zůstávají) a praskliny (tenké; zacelí se).
3. **Odstranění nečistot** z laku, které „ukously" kus písmene — nejvíc
   u třetího `w` ve `www`.
4. **Srovnání na účaří.** Fólie byla lepená po písmenech, takže každé
   sedělo jinde: nápis kolísal o 9 px (na výšce verzálky 909 px), podnadpis
   o 19 px (na výšce minusky 287 px, tj. 6,6 %).
5. **Vycentrování bloků.** Adresa a linka byly proti nápisu o 150 px vpravo —
   to byla ta asymetrie, kdy vpravo zbývalo víc plochy.
6. **Nový bílý obrys.** Z fotky se neobkresloval (byl odřený a nestejnoměrný),
   ale generuje se znovu jako rovnoměrný offset — stejně, jak vznikl
   v původním návrhu.

## Co se vědomě nedělalo

- **Podnadpis a adresa se nepřesázely.** Původní řezy jsou tučný zaoblený
  grotesk; v prostředí byla k dispozici jen základní systémová písma
  (Liberation, DejaVu), kterými by sazba ztratila charakter. Tvary jsou proto
  obkreslené z polepu a jen geometricky srovnané. Pokud má být sazba úplně
  nová, je potřeba dokoupit licenci vhodného písma.
- **Kresba písmen se neměnila.** Srovnávala se jen svislá poloha a výška
  (max. ±0,4 %); vodorovné rozestupy zůstaly nedotčené.

## Doporučení pro tisk

- **Sítotisk / transfer:** jednobarevná bílá varianta. Nejlevnější a na
  antracitu nejčitelnější.
- **Nejmenší rozumná šířka:** 80 mm. Pod ní přestane být dělicí linka
  a podnadpis čitelný — pro malé aplikace (čepice, levá hruď) doporučuji
  použít jen nápis PROIZOL bez podnadpisu a adresy.
- **Ochranná zóna:** kolem loga nechat volný prostor alespoň ve výšce
  písmene „O" z nápisu.
- **Výšivka:** použít `proizol-logo-cerna` nebo jednobarevnou bílou; bílý
  obrys kolem modré se ve výšivce v malých velikostech slepí.

## Jak to znovu spustit

```bash
cd pipeline
python3 rectify.py      # narovnání perspektivy      -> build/rectified.png
python3 vectorize.py    # separace, opravy, obtažení -> build/layers.json
python3 export.py       # barevné varianty           -> logo/
```

Závislosti: `potrace`, Python s `pillow`, `numpy`, `scipy`, `cairosvg`.
