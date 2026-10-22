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
| `08b` bouwdelen-modules | de zes oude bouwdelen als schetsmodules (alleen uiterlijk), eenmalig aan de lijst toegevoegd |
| `08c` modules-v2 | **modules v2**: het model (verdiepingen, vloeren, muren met openingen, trappen, daken, voorwerpen), de bouwer naar 3D met botsing, plaatsing in de stad, randcodes, 3D-miniaturen |
| `08d` module-maker | **de module maker**: bovenaanzicht en 3D, verdiepingen, gereedschap met iconen, bibliotheek, delen |
| `08e` modules-bibliotheek | de honderd standaardmodules, gemaakt met een kleine bouw-API op het v2-model |
| `09` detailniveau-botsing | detailniveau voor grote steden, botsing |
| `10` mensen | voetgangers op stoepen en paden, deuren aan getekende wegen |
| `11` autos | auto's en hun rijgedrag op de wegengraaf |
| `12` bouwacties-schoonheid | plaatsen en weghalen, schoonheidsscore |
| `13` camera-modus-geluid | camera, loopmodus, geluid |
| `14` invoer-slepen | muis en aanraking, wegen slepen |
| `15` ui-palet | palet en menu's |
| `15b` sneltoetsen | toetsen in bouwmodus (schuiven, draaien, categorie, gum, penseel…) en het hulpvenster (?) |
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

## Terrein en wegen op hoogte

- **Verhogen** stapelt verhogingen van 3 m op elkaar (tot 30 m); **Verlagen** haalt er één af, op vlakke grond wordt het een uitgraving. Met `[` en `]` werkt het penseel op 1, 7 of 19 vakken tegelijk.
- Een stapel verhogingen is één hoogteveld (`terrFieldAbs` in `05`): het vak loopt naar een randwaarde die het deelt met de buurman (halverwege tussen twee heuvelvakken, of de hoogte van vlakke grond ernaast); hoeken delen de drie vakken eromheen. Tussen heuvelvakken is het glooiend, naar vlakke grond blijft een plateau met talud.
- **Wegen volgen het terrein** (`pathProf` in `07`): het maaiveld onder de middenlijn, uitgevlakt over ±6 m. Tijdens het slepen maakt `E`/`Q` (of Page Up/Down, scrollwiel, ▲▼) de weg 1,5 m hoger of lager boven het terrein (`path.y`, per punt, tot 12 m). Hoger dan het maaiveld krijgt een wand tot de grond; het maaiveld van een heuvel sluit aan op de weg (ingraving of dijkje).
- Wegen die op verschillende hoogte over elkaar gaan (viaduct) worden **niet** met elkaar verbonden. Auto's, mensen en de speler gebruiken de bovenkant van de weg als loopvlak (`roadCols`), dus ze rijden en lopen mee op en af.

## Modules en de module maker

Een module v2 is een gebied van 1, 7, 19 of 37 vakken met verdiepingen van 3 m, getekend op het fijne driehoekraster (zijde 4,5 of 2,25 m):

- **Vloeren** zijn driehoeken met een materiaal (klinkers, tegels, hout, kantoorvloer, beton, gras, water, asfalt, dakbedekking). Een vloer op een verdieping is ook het plafond eronder; een bovenste laag met alleen vloer is een plat dak.
- **Muren** liggen op de ribben van het raster (baksteen, stucwerk, beton, glaswand, hout, natuursteen, haag, hek) en kunnen een **deur, raam, poort** of **open doorgang** hebben.
- **Trappen en hellingen** lopen van een rasterpunt in een van zes richtingen 3 m omhoog naar de volgende verdieping.
- **Daken** per vak: puntdak of plat. **Voorwerpen**: boom, struik, bankje, lantaarn, zuil, tafel, plantenbak, fontein, prullenbak, fietsenrek.

In de stad wordt een module echt gebouwd (`mv2Build`): één mesh per materiaal, plus loopvlakken per verdieping en muren voor de botsing, zodat je erdoorheen en de trap op kunt lopen. Vakken onder een module zijn bezet voor andere blokken en wegen. Randcodes (muur, deur, groen, stoep, water, weg, leeg) worden uit de begane grond afgeleid; een klik op een geplaatste module wisselt naar de variant die het best op de buren past.

De **module maker** (Modules → Nieuw, of dubbelklik op een module) werkt als een bouwtekening: gereedschap bovenaan met sneltoetsen (V kiezen, H schuiven, F vloer, G vullen, W muur, M kamer, D deur, R raam, P poort, O open, C dicht, T trap, L helling, K dak, B voorwerp, X gum), verdiepingen met ▲▼ of Page Up/Down, 3D-weergave met 3, ongedaan maken met Ctrl+Z. Bewaren zet de module in het palet; geplaatste exemplaren worden meteen bijgewerkt. Modules zijn als JSON-bestand te delen.

De oude schets (driehoeken schilderen) blijft bereikbaar voor oude modules via "Oude schets".

## Opslag

Steden en modules staan in `localStorage` van de browser. Modules kunnen als JSON-bestand worden geëxporteerd en geïmporteerd (module maker → Delen). De honderd standaardmodules worden één keer toegevoegd en zijn met "Standaard terugzetten" te herstellen.

## Plan

1. ✅ Code in losse bestanden
2. ✅ Eén wegsysteem (vectorlijnen) met verkeer, verkeerslichten, mensen, zandvakken
3. ✅ Modules delen als bestand
4. ✅ Randcodes op modules; een klik op een geplaatste module wisselt naar de variant die op de buren past
5. ✅ Oude vakweg-, laan- en randwegcode verwijderd (alleen de omzetting voor oude steden blijft)
6. ✅ Ronde kop op doodlopende wegen
7. ✅ Modules v2 met verdiepingen, openingen, trappen, daken en voorwerpen; begaanbaar in de stad
8. ✅ Module maker met gereedschap en iconen, 3D-weergave, bibliotheek
9. ✅ Honderd standaardmodules in families (wonen, werken, winkels, openbaar, groen, pleinen, trappen, bouwdelen)
10. ✅ Hoog terrein, wegen over heuvels en viaducten, sneltoetsen met hulpvenster

Nog te doen:

- Echte brug op het nieuwe wegennet (dek, hoogte)
- Afgeronde stoephoeken op kruisingen (nu recht afgesneden, bij een laan een lange witte punt)
- Parkeerstroken met geparkeerde auto's, keerlus aan het eind van een laan, zebrapaden
- Voetpad als getekende lijn
- Plaatsvervangers in het menu: Rotonde, Spoor, Parkeren, Winkel, School, Fabriek, Bomen, Hagen, Vijver, Fontein, Klif, Strand, Brug, Poort, Toren
- Mensen die modules in lopen (deuren en trappen in het loopnetwerk); auto's die een parkeergarage in rijden
- Module maker: muren met eigen hoogte, schuine daken over een vrije vorm, hellende vloeren, teksten en bordjes

## Testen

In `test/` staan de simulaties en controles (Playwright, headless Chromium): verkeer op losse wegvormen en in de voorbeeldstad, een stad met alle bouwonderdelen, de module maker, de standaardbibliotheek en lint. Zie `test/README.md`.
