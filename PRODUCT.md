# PRODUCT.md

Kontext pro design. Načítá ho skill `impeccable`. Když se změní směr produktu, uprav tenhle soubor, ne jednotlivé komponenty.

## Register

`product` — design slouží úloze. Kaloriak je nástroj, který člověk otevře pětkrát denně na deset vteřin, ne stránka, kterou si prohlíží.

## Users

Jeden konkrétní člověk a pár lidí kolem něj. Česky mluvící, hlídá si příjem kalorií a makra, cvičí, nosí hodinky. Aplikaci má na domovské obrazovce iPhonu jako PWA. Není to začátečník: rozumí pojmům BMR, TDEE, makra, deficit.

## Scéna

Stojí v kuchyni v půl osmé večer, telefon v jedné ruce, a rozhoduje se, jestli si může dát dobírku.

Z té věty plyne všechno ostatní. Potřebuje jedno číslo, které na otázku odpovídá, dost kontrastu na to, aby ho přečetl pod kuchyňským světlem, a terče velké pro palec. Nepotřebuje osm stejně důležitých sekcí pod sebou ani nic, co se hýbe bez důvodu.

## Product purpose

Zapsat jídlo za pár vteřin a hned vidět, kolik zbývá do denního cíle. Všechno ostatní (AI odhad z fotky, skener čárových kódů, pitný režim, aktivity, historie) tuhle jednu smyčku obsluhuje.

## Tone

Věcný, stručný, tykání. Čísla mluví, text jenom doplňuje. Žádné povzbuzování, žádné vykřičníky, žádné „skvělá práce!“. Když je něco špatně, řekne se to rovnou a doplní, co s tím.

## Brand direction

Vizuální směr zadal uživatel odkazem na [superconscious-app.webflow.io](https://superconscious-app.webflow.io/): hluboká černá s fialovou září, jedno geometrické písmo, velká tichá typografie, měkce zaoblené tmavé karty s vlasovým obrysem, svítící prstenec jako hlavní prvek. Detaily v [DESIGN.md](DESIGN.md).

## Anti-references

- MyFitnessPal a Kalorické tabulky: hustá šedá tabulka, reklamy, deset akcí na obrazovku.
- Fitness aplikace se šablonou hero metriky: obří kruh, velké číslo, tři podpůrné statistiky, gradient. Kaloriak z toho vyšel a vrací se z toho.
- Cokoli, co se hýbe bez sdělení stavu. Částice, konfety, odskakující easing.

## Strategic principles

1. **Jedno číslo nahoře odpovídá na otázku dne.** Zbývá, ne snědeno.
2. **Zápis jídla je nejkratší cesta v aplikaci.** Když se dá zkrátit o jedno klepnutí, zkrátí se.
3. **Pohyb nese stav.** Ambientní záře je prostředí, ne animace. Všechno ostatní se hýbe, jen když se něco změnilo.
4. **Data se neztrácejí.** Offline zápis je normální stav, ne chyba. Banner se rozsvítí jen tehdy, když opravdu něco visí.
5. **Emoji nejsou ikonový systém.** Jedna tažená SVG sada napříč aplikací.
