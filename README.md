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

Wegen zijn vrij getekende lijnen (`cells.paths`). Typen: `weg` (9 m), `brd` (brede weg, 13 m), `laan` (met middenberm en bomen), `snel` (snelweg 2×2 met vluchtstrook en middenbarrière), `klink` (klinkerstraat, stapvoets, geen lichten), `fiets` (fietspad), `pad`, en `rot` (rotonde: één punt, het midden). Je sleept recht van beginpunt naar eindpunt (vasthouden = hoekpunt, voor een bocht in één sleep); de punten liggen op zeshoekmiddens. Een rotonde zet je met een klik.

- **Graaf** (`vecGraphOf`): de lijnen worden bij kruisingen en T-aansluitingen doorgeknipt tot takken tussen knopen. Knopen binnen 7 m smelten samen. Een lijn die **zichzelf** kruist of op zichzelf uitkomt wordt ook geknipt, en een **gesloten lus** (eindpunt = beginpunt) wordt in tweeën gedeeld, met afgeronde hoeken rondom.
- **Kruising, bocht en doodlopend eind** krijgen elk hun eigen vorm: een kruisingsvak met **ronde stoephoeken** (een boog die aan beide stoepranden raakt), **zebrapaden en stopstrepen** bij verkeerslichten, een afgeronde stoep om een bocht, en een **ronde kop** op een doodlopend eind (`vecHead`).
- **Rotonde** (`ROT`, `clipCircle`): wegen houden op bij de rijbaan van de rotonde; waar ze de cirkel raken komt een aansluiting. De rijbaan bestaat uit eenrichtingstakken (`ring`, tegen de klok in van boven gezien). Eiland met overrijdbare klinkerrand en een boom, stoep rondom (open bij de wegen), haaientanden bij elke inrit. Auto's op de rotonde hebben voorrang; wie erop wil, wacht bij de haaientanden.
- **Snelweg**: geen stoep maar een grasberm en vangrail; geen verkeerslichten (een aansluiting is invoegen). Een andere weg die hem **kruist** gaat er altijd met een **viaduct** overheen: 7 m boven de snelweg met opritten van 55 m (`pathProf`), een brugdek zonder wand tot de grond (`roadSpan`), geen dijk onder de overspanning en een pijler op de middenberm. Auto's rijden er 130 km/u (en kijken verder vooruit om op tijd te remmen).
- **Auto's** rijden rechts op een rijstrook van de tak, kiezen op een knoop een volgende tak (niet tegen de rijrichting in op een rotonde), stoppen voor verkeerslichten en keren in de ronde kop.
- **Mensen** lopen over de stoepen (niet langs de snelweg of over de rotonde-rijbaan) en komen binnen via voordeuren die aan de dichtstbijzijnde stoep koppelen.
- **Vakken** onder een weg zijn niet bebouwbaar; een weg stopt vóór gebouwen en water.
- **Oude steden**: vakwegen, vak-lanen, bruggen en wegen onder een tunnel worden bij het laden omgezet in getekende wegen (`convertCellRoads`).


Bouwen:

```
node build.js
```

Dat maakt `dist/hexstad.html` (één bestand, zelfde als de gepubliceerde versie) en kopieert de geluiden ernaast. `dist/` staat niet in git.

## Terrein en wegen op hoogte

- **Terrein is een eigen laag** (`07b-terrein.js`): één hoogte per vak in `cells.terr` (`'q,r'` → meter, 0 … 30), opgeslagen als `__g`. Oude steden met opgestapelde "verhogingen" worden bij het laden omgezet (3 m per verhoging, `terrMigrate`).
- **Het landschap**: tussen de middens van drie buurvakken loopt het vlak lineair (driehoeksrooster, geen zeshoekranden), daarna gaussisch vervaagd (σ 3 m) op een vast wereldrooster. Een vak waar iets op staat is een vlak plateau op zijn eigen hoogte met een stenen **sokkel** tot op de grond (`terrPlinth`): strakke rand, en tussen twee bebouwde vakken van verschillende hoogte een keermuur. Langs een weg sluit het maaiveld aan op de weg, gemeten vanaf de weg zelf (`roadAdjust`): een ingraving of dijk die evenwijdig aan de weg loopt.
- Het landschap is opgedeeld in **stukken van 32 × 32 m**; een bewerking rekent en tekent alleen de stukken die het raakt. `terrainHeightAt` is het veld zonder wegen (daar volgen de wegen op), `terrGround` het getekende maaiveld (daar lopen mensen en de speler op).
- **Alles op een vak staat op de terreinhoogte** (`gH(q, r)`): de kolom (`buildColumn`) en modules worden opgetild, hun botsvlakken verschoven (`shiftCol`). Stapels blijven intern relatief (vanaf 0); `colTopW` geeft de echte hoogte.
- **Boetseren** (`14b-boetseren.js`, Terrein): Ophogen, Afgraven, Egaliseren, Gladstrijken en Helling trekken. Muis ingedrukt houden en slepen (touchscreen: even vasthouden), Shift draait ophogen/afgraven om, `[` `]` maakt het penseel 1, 7, 19 of 37 vakken. Bebouwde vakken blijven liggen. Een ring toont het penseel, een label de hoogte, en hoogtelijnen (elke 1,5 m, dikker elke 7,5 m) het reliëf. Een geplaatste module maakt het terrein onder zich vlak.
- **Wegen volgen het terrein** (`pathProf` in `07`): het maaiveld onder de middenlijn, uitgevlakt over ±6 m. Tijdens het slepen maakt `E`/`Q` (of Page Up/Down, scrollwiel, ▲▼) de weg 1,5 m hoger of lager boven het terrein (`path.y`, per punt, tot 12 m).
- Wegen die op verschillende hoogte over elkaar gaan (viaduct) worden **niet** met elkaar verbonden; een echt brugdek met pijlers moet nog komen.

## Instellingen

Menu → Instellingen (`15c-instellingen.js`, bewaard in `localStorage` `hexstad-set`): **terrein** hoog (1 m rooster), normaal (2 m) of low poly (4 m, platte vlakken; het snelst), **schaduwen** zacht, eenvoudig of uit, **beeldscherpte** scherp, normaal of snel, **wolken**, en verder raster, hoogtelijnen, penseel, tijd, mensen, auto's en geluid.

## Gelaagde stad: modules op elkaar

Een geplaatst exemplaar heeft een laag `lv` (0 = op de grond, 1 = op 3 m, enzovoort). **Klik op het dak** van een module en de gekozen module komt erbovenop; klik op de gevel en je wisselt zoals voorheen naar de variant die het best aansluit. De spookmodule laat zien waar hij komt. Regels (`mv2CanPlace` in `08c`):
- op elk vak van het gebied moet precies op die laag een module eindigen (geen zwevende of half ondersteunde modules);
- op een schuin dak kun je niet bouwen;
- de bovenkant van een module is `lv` + aantal verdiepingen; een bovenste laag met alleen dakvloer telt niet mee en wordt **verborgen zodra er iets op staat** (`noRoof` in `mv2Build`). Zo kijk je vanaf een galerij in de winkel eronder.

Een gestapelde module krijgt een plafond onder zijn begane grond (`stacked`). Groen op een dak (boom, struik, plantenbak) telt niet als verdieping; staat er een module op, dan verdwijnt het groen daaronder, en staat er hoger een module boven het vak (overdekte straat), dan wordt een boom een struik. Lopen en botsing werken per laag (`modCols`, `shiftCol`). Buren voor de randcodes zijn alleen modules op dezelfde laag. De gum haalt het exemplaar weg waar je op klikt (het bovenste).

## Van bouwen naar lopen: vallen

Wissel je naar lopen, dan val je uit de lucht (16 m) op de plek waar het midden van het bouwscherm naar kijkt: een dak, een galerij, de straat (`dropPlayer` in `13`). Doorzichtig glas telt niet als raakpunt. Na de landing kijk je rustig weer vooruit. Kijk je naar water of naar niets, dan kom je zoals vroeger op het dichtstbijzijnde vrije vak terecht.

## Voetgangers door modules

Het loopnetwerk van de voetgangers (`buildWalkGraph` in `10`) krijgt uit `08f` knopen voor elke module: per exemplaar, per verdieping en per vak zes knopen, één per zijde (sector), op het zwaartepunt van de vloer in die sector. Op een galerij loopt iemand zo netjes rondom, door een winkel langs de muren. Twee knopen zijn verbonden als de rechte lijn ertussen geen muur kruist, of alleen muren met een deur, poort of open doorgang; dan loopt het pad door het midden van die opening (`route`). Hek en haag tellen als muur. Er moet overal vloer onder het pad liggen (geen vide, trapgat of weggehaalde lichtkap). Trappen, hellingen en de schans verbinden de verdiepingen; een plat dak waar niets op staat is beloopbaar (dakterras, passage over de daken). Een opening in de buitenrand op de begane grond is een ingang (`mdoor`), die net als een voordeur aan de dichtstbijzijnde stoep wordt gekoppeld (ook midden op een lang recht stuk straat). Langwerpige voorwerpen (stelling, toonbank, bank, fietsenrek) botsen als een lijnstuk langs hun lengte, niet als een grote cirkel die een deur dichtzet. Stukken netwerk waar je niet uit kunt (een winkel zonder deur naar buiten) tellen niet mee als startplek. Winkels trekken bezoekers: per winkelmodule komen er mensen bij.

De modules in de familie Winkelcentrum hebben daarom twee achterdeuren tegenover de voorkant (die bij rug-aan-rug winkels op elkaar vallen), het dakpaviljoen een open terras aan de voorkant, en de doorgang open kiosken naar de buren. In het voorbeeld-winkelcentrum lopen voetgangers van de straat de opritten op, door de tunnels de entreehal in en via de trappen naar de straat op de tweede verdieping. De dichte kern op de begane grond is (zoals in de schets) niet van buiten te bereiken.

## Spiegelen, nette aansluitingen en balustrades

- **Spiegelen** (toets F of de knop Spiegel naast Draai): een module wordt in spiegelbeeld geplaatst. De moduledata zelf wordt gespiegeld (`mv2Mirror` in `08c`: vloeren, muren, trappen, schans, daken en voorwerpen), zodat bouw, botsing en loopnetwerk vanzelf kloppen; het exemplaar onthoudt `mir`. Zo is één galerij-met-trap genoeg: gespiegeld staat de trap aan de andere kant.
- **Eén muur per rand**: hebben twee modules een muur op dezelfde rand, dan blijft er één over (`wallSkips`): een deur, poort of open doorgang wint van een raam, een raam van een dichte muur, verder de eerst geplaatste. Ook dubbele hoekposten verdwijnen. Dat voorkomt flikkerende, overlappende texturen en zorgt dat een deur tussen twee buren echt open is (ook voor de voetgangers).
- **Balustrades** (`buildRails`): langs elke buitenrand van een loopvlak (vloer of zichtbaar dak) boven de grond komt een hek van 1,05 m met botsing, tenzij er een muur staat of je er op dezelfde hoogte verder loopt (vloer, trap, helling). De oprit heeft een zichtbare leuning langs de zijranden.
- **Groen binnen**: een dak waar naast op die hoogte andere modules staan (een hal) krijgt een fontein en een klein groen eiland in een plein; een overdekt dak (straat met een laag erboven) een plantenbak. Bovenop blijft het groene dak met boom.
- Trappen sluiten in het loopnetwerk alleen aan de voor- en achterkant aan, niet opzij door de leuning.

## Winkelcentrum: de hex-modules uit de SketchUp-schets

De familie **Winkelcentrum** (categorie, `08e`) bouwt de tien bouwstenen uit `hex_mall.dae` na, elk met een functie; zijde +x is de voorkant of passagekant, de "kern" is de zeshoek van ¾ (straal 6,75 m) met een rand van 1,95 m eromheen:

| SketchUp | Hexstad | Betekenis |
|---|---|---|
| variable | `Winkelcentrum · winkel`, `· winkel · boeken`, `· horeca` | winkelblok: glazen pui met open front, dichte zijwanden, stellingen, toonbank, lichtreclame; plat dak met een groen dak (gras, boom, struiken) in de kern |
| recht | `· magazijn` | dicht betonblok met poort achter, stellingen |
| half | `· café · half` | halve zeshoek langs de lange diagonaal; de diagonaal is een glazen pui naar de passage, tafels binnen |
| afgesneden | `· winkel · afgesneden` | één zijde tot halverwege teruggezet; de schuine pui is de ingang |
| tunnel | `· doorgang` | passage van 9 m breed dwars door het blok, met een berging in elke punt |
| schans | `· oprit` | het hele vak is een helling naar de verdieping erboven (zie Schans in de maker) |
| space | `· dakpaviljoen` | teruggezette opbouw van ¾ met een terras van 1,95 m rondom (hek, tafels) |
| ring | `· galerij` | vloerring rond een vide met balustrade: zet hem op een winkel en je kijkt erin |
| trapring | `· galerij · trap` (gespiegeld geplaatst voor de andere kant) | onderaan alleen de trap (de vloer is het dak eronder), erboven de galerijring; trap van 1,95 m in de band langs één zijde |
| trapzijde | `· trap` | trap van 1,95 m langs de rand van het vak met het bordes uit de schets naar de galerij ernaast; twee stuks gespiegeld tegen elkaar geven de brede trap |

De schansflanken (`schans_zijde`) staan tussen de vakken en zijn weggelaten. **Menu → Winkelcentrum (hex-modules)** laadt het winkelcentrum precies zoals getekend (`MALL` in `08e`, uit de Collada-export gelezen): elke bouwsteen op zijn eigen vak, laag en draaiing. Alleen de winkels zijn gedraaid (een zeshoekig blok ziet er rondom hetzelfde uit), zodat hun pui naar de hal, de straat op de tweede verdieping of naar buiten kijkt; blokken die de schets in een blok laat staan (`space` binnen een `variable`) vallen weg. De indeling:
- **begane grond**: een dichte kern van winkels en een magazijn, met twee **opritten** aan de westkant;
- **eerste verdieping**: de opritten komen via twee **tunnels** (doorgangen) uit in de **entreehal**, die diagonaal door het centrum loopt en open is naar de lucht; de halve en afgesneden blokken geven de hal zijn schuine wanden;
- **trappen** naar de tweede verdieping: twee galerijen met trap (`trapring`, één gespiegeld) en een **brede trap** tussen de twee halve blokken: twee keer de module trap, elk in zijn eigen vak, de tweede gespiegeld, met het bordes uit de schets naar de galerij van het buurvak;
- **tweede verdieping**: een overdekte straat over de daken van de eerste verdieping, met dakpaviljoens (`space`) en een galerij rond een vide;
- **derde verdieping**: een laag winkels als dak over die straat (in de schets dragen die op de buren; in het voorbeeld zweven ze daar dus).


Nieuw in de module maker hiervoor:
- **Schans (S)**: klik in een vak bij de zijde waar je onderaan instapt; het hele vak wordt een oprit die aan de overkant 3 m hoger uitkomt (`hexramp` in `mv2Build`: vlakke middenstrook van 9 m en twee gewrongen zijdriehoeken, dichte wanden eromheen).
- **Penseel (N)** voor de vloer: zeshoek · één driehoek · heel vak · kern (¾) · rand (galerij).
- Vloermateriaal **Glazen dak** (doorzichtig, voor lichtkappen) en de voorwerpen **winkelstelling**, **toonbank** en **lichtreclame**.
- Een trap kan zijwaarts verschoven staan (`off` in een trap-item), zodat hij in een galerijband van 1,95 m past.

## Modules: namen en bladeren

Elke module heet **soort · variant (· bijzonderheid) · lagen · maat**, bijvoorbeeld `Rijhuis · baksteen · 2L` of `Plein · markt · 7v`. Het aantal lagen (`2L`, alleen bij gebouwen) en de maat (`7v` voor 7 vakken; 1 vak heeft geen toevoeging) rekent de module maker bij het bewaren zelf uit en zet ze achteraan (`modMeta`, `modSuffix` in `08c`). De standaardbibliotheek gebruikt dezelfde regel (`LIB_NAMES` in `08e`). Oude namen worden eenmalig omgezet, en de categorie Trappen heet nu **Verbindingen** (trappen, hellingen, bruggen: wat lagen met elkaar verbindt).

`modMeta(m)` geeft per module de gegevens voor bladeren en stapelen:
- `fl`: verdiepingen (een bovenste laag met alleen dakvloer telt niet mee);
- `n`: maat in vakken (1 of 7);
- `h`: hoogte in meters;
- `top`: `kap` (schuin dak), `plat` (beloopbaar plat dak, `stack: true`: hier kan straks een module op) of `open`;
- `deur` / `weg`: hoeveel randen een deur of weg hebben.

In het palet (tab Modules) staat boven de kaartjes een balk:
- een zoekveld (`/`; elk woord zoekt op het begin van een woord in de naam, Enter kiest de eerste);
- knoppen per categorie met aantallen, plus **Recent** (de laatst geplaatste);
- filters **1 vak**, **7 vakken** en **Plat dak**.

Bij Alles staan de kaartjes per categorie gegroepeerd en op naam gesorteerd. Elk kaartje toont de soort, daaronder de variant, en een badge met lagen en maat; een geel blokje betekent plat dak. `,` en `.` springen naar de vorige of volgende module.

## Low poly terrein

Standaard (Instellingen → Terrein → Low poly) wordt het terrein op het driehoeksrooster van de vakken getekend in plaats van op een vierkant rooster (`lpMesh` in `07b`). Elk vak bestaat uit zes driehoeken. Het midden ligt op de hoogte van het vak en elk hoekpunt op de laagste van de drie vakken die daar samenkomen. Eén verhoogd vak wordt zo een puntje, een groep een plateau met schuine flanken, en een strook van drie vakken breed een dijk. Elk vak dat een weg (met stoep) raakt is een wegvak: zijn midden en hoekpunten liggen op de hoogte van de weg. Een weg langs een dijk loopt daardoor strak langs de voet, en een weg over een dijk snijdt er met een bult doorheen. Lopen gebruikt precies dezelfde driehoeken (`lpHeight`).

## Trappen in huizen

Woningen en kantoren hebben een **bordestrap langs één muur** (`UT` in `03`), zoals in de bovenaanzicht-schets: de eerste steek loopt langs de binnenkant van de muur omhoog naar een bordes in de hoek (1,5 m), de tweede steek komt aan de muurkant terug en je komt boven uit naast waar je begon. Per verdieping wisselt de trap van muur (zijde 4 en 1), zodat hij niet steeds in hetzelfde trapgat staat. In de vloer erboven zit een trapgat met balustrade; de muur achter de trap krijgt geen ramen. Lopen gaat over schuine loopvlakken (`slopeU`) en een bordesvlak; de vloer heeft een gat (`holePoly`).

## Modules en de module maker

Een module v2 is een gebied van 1, 7, 19 of 37 vakken met verdiepingen van 3 m, getekend op het fijne driehoekraster (zijde 4,5 of 2,25 m):

- **Vloeren** zijn driehoeken met een materiaal (klinkers, tegels, hout, kantoorvloer, beton, gras, water, asfalt, dakbedekking). Een vloer op een verdieping is ook het plafond eronder; een bovenste laag met alleen vloer is een plat dak.
- **Muren** liggen op de ribben van het raster (baksteen, stucwerk, beton, glaswand, hout, natuursteen, haag, hek) en kunnen een **deur, raam, poort** of **open doorgang** hebben.
- **Trappen en hellingen** lopen van een rasterpunt in een van zes richtingen 3 m omhoog naar de volgende verdieping.
- **Daken** per vak: puntdak of plat. **Voorwerpen**: boom, struik, bankje, lantaarn, zuil, tafel, plantenbak, fontein, prullenbak, fietsenrek.

In de stad wordt een module echt gebouwd (`mv2Build`): één mesh per materiaal, plus loopvlakken per verdieping en muren voor de botsing, zodat je erdoorheen en de trap op kunt lopen. Vakken onder een module zijn bezet voor andere blokken en wegen. Randcodes (muur, deur, groen, stoep, water, weg, leeg) worden uit de begane grond afgeleid; een klik op een geplaatste module wisselt naar de variant die het best op de buren past.

De **module maker** (Modules → Nieuw, of dubbelklik op een module) werkt als een bouwtekening: gereedschap bovenaan met sneltoetsen (V kiezen, H schuiven, F vloer, G vullen, W muur, M kamer, D deur, R raam, P poort, O open, C dicht, T trap, U bordestrap, L helling, S schans, K dak, B voorwerp, X gum), verdiepingen met ▲▼ of Page Up/Down, 3D-weergave met 3, ongedaan maken met Ctrl+Z. Bewaren zet de module in het palet; geplaatste exemplaren worden meteen bijgewerkt. Modules zijn als JSON-bestand te delen.

**3D is de standaardweergave** en je tekent er gewoon in: elke klik wordt een straal vanuit de camera, gesneden met het vlak van de verdieping waar je bent (`toW`/`toS` in `08d`), dus al het gereedschap werkt in 3D en bovenaanzicht hetzelfde. Het raster en de rand van het gebied liggen op de hoogte van die verdieping. Draaien: middelste muisknop, Alt+slepen, spatie+slepen of het handje; schuiven: Shift+slepen of het pijltje. Standaard zie je de module tot en met de verdieping waar je tekent. Op het noorden staat een **hoogtemeter**: een paal met een streep per verdieping (3 m), de huidige in oranje, met een N; in het bovenaanzicht een ladder boven het gebied. Zolang de module maker open is staat de stad stil (scheelt rekenwerk).

**Hoeken**: waar twee muren onder een hoek samenkomen staat een ronde hoekpost van dezelfde dikte en hetzelfde materiaal, zodat de rechte muurblokken zonder kier of uitstekend hoekje aansluiten (ook bij hagen).

**Muren onder 90°**: behalve langs de ribben van het raster (30°, 90°, 150°) kun je muren ook haaks daarop trekken (0°, 60°, 120°, `MV2.DIRW` 3–5, √3 × zo lang), zodat een muur in twaalf richtingen snapt en rechthoekige kamers mogelijk zijn. Vullen (G) stopt alleen bij muren langs het raster.

**Gevels en vloeren** (`modernMats` in `08c`): baksteen, donkere steen, wit stucwerk, schoon beton, gevelpanelen, houten lamellen, cortenstaal en glasgevel als textuur op ware schaal (uv in meters, doorlopend over stukken en verdiepingen); vloeren ook in visgraat parket, gepolijst beton en natuursteen tegels.

**Verwijderen** gaat met twee klikken (× in de bibliotheek, of rechtermuisknop op een kaartje in het palet), omdat een bevestigingsvenster (`confirm`) in een ingesloten pagina niet werkt. De oude schets is niet meer te openen; oude schets-modules kun je nog plaatsen en verwijderen.

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
- Auto's die een parkeergarage in rijden
- Module maker: muren met eigen hoogte, schuine daken over een vrije vorm, hellende vloeren, teksten en bordjes

## Testen

In `test/` staan de simulaties en controles (Playwright, headless Chromium): verkeer op losse wegvormen en in de voorbeeldstad, een stad met alle bouwonderdelen, de module maker, de standaardbibliotheek en lint. Zie `test/README.md`.
