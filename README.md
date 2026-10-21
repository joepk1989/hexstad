# Hexstad

3D-stadsbouwer in de browser op een zeshoekraster, op ware grootte (vak 15,6 m breed, zijde 9 m). Gebouwd met three.js r128, zonder build-tools behalve één klein script.

## Werken aan de code

- `src/index.html` – de pagina (HUD, menu's, schets-app)
- `src/style.css` – alle stijlen
- `src/js/NN-naam.js` – de spellogica, in volgorde van nummer. Alle bestanden delen één scope (ze worden bij het bouwen achter elkaar in één functie gezet), dus `const R` uit `01-raster-data.js` is overal beschikbaar.
- `assets/` – geluiden

Wat er in de bestanden zit:

| Bestand | Inhoud |
|---|---|
| `01` raster-data | rastermaten, bouwtypes, `VEC_TOOLS` (weg, brede weg, laan) |
| `02` scene | three.js, licht, materialen |
| `03` gebouwen | holle gebouwblokken met ramen, deuren, trappen |
| `04` wegen-klassiek | alleen nog de hoogtes (stoep 25 cm, asfalt 12 cm) en een punt-in-veelhoek-test |
| `05` blokken-netwerken | voetgangersnetwerk, bouwblokken |
| `06` laan-terrein | uitgraving, verhoging, hellingen, brug |
| `07` driehoeken-vectorwegen | **het wegsysteem**: de wegengraaf, kruisingen, bochten, ronde koppen, stoepen, markering, verkeerslichten, en `convertCellRoads` voor oude steden |
| `08` schets-modules | schets-app, modules, randcodes, delen als bestand |
| `09` detailniveau-botsing | detailniveau voor grote steden, botsing |
| `10` mensen | voetgangers op stoepen en paden, deuren aan getekende wegen |
| `11` autos | auto's en hun rijgedrag op de wegengraaf |
| `12` bouwacties-schoonheid | plaatsen en weghalen, schoonheidsscore |
| `13` camera-modus-geluid | camera, loopmodus, geluid |
| `14` invoer-slepen | muis en aanraking, wegen slepen |
| `15` ui-palet | palet en menu's |
| `16` start | opstarten |

## Het wegsysteem

Wegen zijn vrij getekende lijnen (`cells.paths`, typen `weg`, `brd`, `laan`, `pad`). Je sleept recht van beginpunt naar eindpunt (vasthouden = hoekpunt, voor een bocht in één sleep); de punten liggen op zeshoekmiddens.

- **Graaf** (`vecGraphOf`): de lijnen worden bij kruisingen en T-aansluitingen doorgeknipt tot takken tussen knopen. Knopen binnen 7 m smelten samen.
- **Kruising, bocht en doodlopend eind** krijgen elk hun eigen vorm: een kruisingsvak (minimaal 7,5 m van de knoop), een afgeronde stoep om een bocht, en een **ronde kop** op een doodlopend eind (`vecHead`). De kop is een halve cirkel met het middelpunt op het midden van het laatste vak; een gewone weg is er 2,1 m breder voor, zodat auto's kunnen keren.
- **Auto's** rijden rechts op een rijstrook van de tak, kiezen op een knoop een volgende tak, stoppen voor verkeerslichten en keren in de ronde kop (eerst naar buiten zwenken, dan een halve cirkel).
- **Mensen** lopen over de stoepen en komen binnen via voordeuren die aan de dichtstbijzijnde stoep koppelen.
- **Vakken** onder een weg krijgen een zandkleur en zijn niet bebouwbaar; een weg stopt vóór gebouwen en water.
- **Oude steden**: vakwegen, vak-lanen, bruggen en wegen onder een tunnel worden bij het laden omgezet in getekende wegen (`convertCellRoads`). Een brug is nu een vlakke getekende weg over het water, zonder brugdek.


Bouwen:

```
node build.js
```

Dat maakt `dist/hexstad.html` (één bestand, zelfde als de gepubliceerde versie) en kopieert de geluiden ernaast. `dist/` staat niet in git.

## Opslag

Steden en modules staan in `localStorage` van de browser. Modules kunnen als JSON-bestand worden geëxporteerd en geïmporteerd (schets → Delen).

## Plan

1. ✅ Code in losse bestanden
2. ✅ Eén wegsysteem (vectorlijnen) met verkeer, verkeerslichten, mensen, zandvakken
3. ✅ Modules delen als bestand
4. ✅ Randcodes op modules; een klik op een geplaatste module wisselt naar de variant die op de buren past
5. ✅ Oude vakweg-, laan- en randwegcode verwijderd (alleen de omzetting voor oude steden blijft)
6. ✅ Ronde kop op doodlopende wegen

Nog te doen:

- Echte brug op het nieuwe wegennet (dek, hoogte)
- Afgeronde stoephoeken op kruisingen (nu recht afgesneden, bij een laan een lange witte punt)
- Parkeerstroken met geparkeerde auto's, keerlus aan het eind van een laan, zebrapaden
- Voetpad als getekende lijn
- Plaatsvervangers in het menu: Rotonde, Spoor, Parkeren, Winkel, School, Fabriek, Bomen, Hagen, Vijver, Fontein, Klif, Strand, Brug, Poort, Toren
- Lopen over modules, miniaturen met groene stroken

## Testen

Er is geen testpakket in de repo. Gecontroleerd is met ESLint op de samengevoegde code en met een simulatie in een headless browser (kruising, T, Y, bocht, laan, korte weg en een voorbeeldstad: botsingen, vastlopers, NaN-waarden, mensen die vallen).
