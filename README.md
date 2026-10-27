# Raatstad

(Voorheen "Hexstad"; de bestandsnamen, opslagsleutels en de reponaam heten nog zo.) Online: https://joepk1989.github.io/hexstad/ (GitHub Pages, bouwt vanzelf bij elke push via `.github/workflows/pages.yml`).

3D-stadsbouwer in de browser op een zeshoekraster, op ware grootte (vak 15,6 m breed, zijde 9 m). Gebouwd met three.js r128, zonder build-tools behalve één klein script.

## Indeling van de repo

| Map | Wat |
|---|---|
| `src/` | de webversie: `index.html`, `style.css`, `js/NN-naam.js` (zie hieronder) |
| `build.js` | bouwt `dist/hexstad.html` (één bestand) of met `--site` de volledige pagina voor GitHub Pages (`site/`) |
| `assets/` | geluiden |
| `test/` | testscripts voor de logica (zie `test/README.md`); `test/visueel/` voor screenshots en de overlapcontrole op telefoon |
| `docs/ontwikkeling/` | bewaarde screenshots en testbeelden van de ontwikkeling, met een overzicht in de README daar |
| `lab/interface/` | het interfacelab waaruit de bediening (v100) komt |
| `unity/` | de Unity-poort met bolvormige planeet (eigen `unity/README.md`) |
| `.github/workflows/` | publiceert de site op GitHub Pages bij elke push |

`dist/`, `site/`, `node_modules/` en `test/visueel/uit/` staan niet in git.

## Interface: standen en telefoon

- **Zweven** (bouwmodus boven de stad): bovenbalk met score, klok, geluid en Menu; onderaan snelbalk; gereedschap links en Bouwen/Lopen rechts.
- **Lopen** heeft drie handen. *Kijken* en *slopen* zijn minimalistisch (bijna niets in beeld; met de hamer toont een label wat je weghaalt, `eraseTarget` in `12`); alleen *bouwen* toont het palet, de bouwgereedschappen en de laagkiezer. Dit staat in `style.css` onder "Minimalistisch beeld tijdens het lopen".
- **Telefoon** (onderaan `style.css`): alles wat je bedient staat onderaan, in elke stand op dezelfde plek: snelbalk (alleen bouwen) helemaal onder, daarboven links de handen, in het midden het menu (☰) en rechts de Bouwen/Lopen-schakelaar, daarboven de joystick en de knoppen Spring en Bouw/Sloop. De hoogte van die rij volgt uit `--base`. Controleer elke wijziging met `test/visueel/overlap-mobiel.js` op 390x844, 360x640, 320x568 en 844x390.

## Wegstijl: alles schuin

Elke stoeprand is een schuine rand (`slopeInto`, `KERB_IN` 15 cm tot `KERB_OUT` 45 cm naast het asfalt) en nooit een verticale wand: rechte wegen, bochten, doodlopende koppen, de rotonde (buitenrand, overrijdbare rand, eiland), de middenberm van een laan en smalle paden. Een nieuw wegelement moet `slopeInto` gebruiken en de stoep laten beginnen bij `KERB_OUT`. Aansluitingen op de rotonde worden dwars op de weg gemeten (`inGap`), zodat de rotondestoep evenwijdig aan de wegstoep eindigt.

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
| `08d` module-maker | **de Raatbouwer**: bovenaanzicht en 3D, verdiepingen, gereedschap met iconen, bibliotheek, delen |
| `08d9` bibliotheek-uitbreiding | 35 basisgebouwen (voorzieningen, sport, wonen, werken), inrichting voor alle standaardmodules, niets bij de trappen |
| `08e` modules-bibliotheek | de 151 standaardmodules, gemaakt met een kleine bouw-API op het v2-model |
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

Wissel je naar lopen, dan val je recht naar beneden vanaf de plek waar de camera hangt (hooguit 30 m boven wat eronder ligt): een dak, een galerij, de straat (`dropPlayer` in `13`). Je kijkt dezelfde kant op als de camera. Doorzichtig glas telt niet als raakpunt. Na de landing kijk je rustig weer vooruit. Hangt de camera boven water of buiten de wereld, dan kom je zoals vroeger op het dichtstbijzijnde vrije vak terecht.

## Voetgangers door modules

Het loopnetwerk van de voetgangers (`buildWalkGraph` in `10`) krijgt uit `08f` knopen voor elke module: per exemplaar, per verdieping en per vak zes knopen, één per zijde (sector), op het zwaartepunt van de vloer in die sector. Op een galerij loopt iemand zo netjes rondom, door een winkel langs de muren. Twee knopen zijn verbonden als de rechte lijn ertussen geen muur kruist, of alleen muren met een deur, poort of open doorgang; dan loopt het pad door het midden van die opening (`route`). Hek en haag tellen als muur. Er moet overal vloer onder het pad liggen (geen vide, trapgat of weggehaalde lichtkap). Trappen, hellingen en de schans verbinden de verdiepingen; een plat dak waar niets op staat is beloopbaar (dakterras, passage over de daken). Een opening in de buitenrand op de begane grond is een ingang (`mdoor`), die net als een voordeur aan de dichtstbijzijnde stoep wordt gekoppeld (ook midden op een lang recht stuk straat). Langwerpige voorwerpen (stelling, toonbank, bank, fietsenrek) botsen als een lijnstuk langs hun lengte, niet als een grote cirkel die een deur dichtzet. Ook de inrichting staat in het netwerk als hindernis: langwerpige voorwerpen als lijnstuk, ronde (fontein, tafel, plantenbak, zuil, boom, prullenbak) als kruis, zodat geen pad door een stelling loopt. Stukken netwerk waar je niet uit kunt (een winkel zonder deur naar buiten) tellen niet mee als startplek. Winkels trekken bezoekers: per winkelmodule komen er mensen bij.

De modules in de familie Winkelcentrum hebben daarom twee achterdeuren tegenover de voorkant (die bij rug-aan-rug winkels op elkaar vallen), het dakpaviljoen een open terras aan de voorkant, en de doorgang open kiosken naar de buren. In het voorbeeld-winkelcentrum lopen voetgangers van de straat de opritten op, door de tunnels de entreehal in en via de trappen naar de straat op de tweede verdieping. De dichte kern op de begane grond is (zoals in de schets) niet van buiten te bereiken.

## De stad

**Menu → Hexstad** laadt de ene voorbeeldstad met alles erin (`08g-hexstad-stad.js`, vast, geen toeval): een rotonde in het midden, zes wegen recht naar buiten (twee brede), een binnenring, de ringweg (laan met bomen, straal 270 m), een fietsring erbuiten en een snelweg langs de oostkant waar de weg met een viaduct overheen gaat. Binnen de binnenring het centrum met hoogbouw en pleinen; daaromheen zes buurten, één per taartpunt: het winkelcentrum (de SketchUp-schets, 120° gedraaid zodat hij langs de ring past) met parkeren en markt; de woonwijk met rijhuizen, villa's, een woonerf en een hofje; openbaar (school, bibliotheek, gemeentehuis, kerk, ziekenhuis, museum, station, stadsplein); park en water met een meer waar de weg als brug overheen gaat, voetpaden en een voetbrug; terrein met een dijk waar de weg overheen klimt en villa's en tuinen ernaast; werken met fabriek, hallen, parkeergarage en de oude bouwblokken (looppaden, tunnel, tribune, zuilen, hof). Modules uit de bibliotheek staan met de deur naar de dichtstbijzijnde straat (`toRoad`), een module van 7 vakken alleen waar al die vakken vrij zijn. De losse voorbeeldsteden (ringstad, dorpjes, blokkenstad …) zijn uit het menu; de code en `doAct('sample')` enzovoort bestaan nog voor de tests. De loopwereld voor de speler reikt tot 450 m van het midden.

**Menu → Filestad** (`08h-filestad.js`) is een klein stadje waar het verkeer vastloopt: drie rechte wegen kruisen elkaar in het midden (één kruising met zes takken, dus drie lichtgroepen en twee derde van de tijd rood), een kleine ringweg eromheen stuurt alles steeds weer naar die kruising, dicht bebouwd met woningen en kantoren. Het verkeer is er twee keer zo druk als normaal: `cells.druk = 2` (bewaard als `__d`) vermenigvuldigt in `cars.rebuild` zowel het gewenste aantal auto's als het plafond per meter weg. Na een halve minuut staat er een file, en dan komt de Hulk.

## Bediening (v100)

Ontworpen in het interfacelab (`lab/interface/`, voorbeeld "Voorstel voor Hexstad"): bij bouwen en lopen staat alles op dezelfde plek (`15d-bediening.js`, HTML in `index.html`, stijlen onderaan `style.css`).

- **Linksboven**: naam, aantal blokken en schoonheid; daaronder de ongelukjes-teller. **Rechtsboven**: één knop met de tijd en het weer (het paneel erachter heeft ook de tijdsnelheid, het weer en raster/mensen/auto's), geluid en menu. Roekeloos rijgedrag staat in Instellingen.
- **Snelbalk 1–9** onderaan in het midden: negen zeshoekige vakken, ook tijdens het lopen. Cijfertoetsen, klik of het scrollwiel kiezen een vak; tijdens het lopen neem je het blok dan meteen in je hand. Wat je kiest in **Alle blokken** (Tab, of de knop erboven) komt in het gekozen vak; een blok dat al in de balk staat wordt daar gekozen. De balk wordt bewaard (`hexstad-snelbalk`). Standaard: weg, pad, woning, kantoor, dak, park, water, ophogen, module.
- **Alle blokken** is de oude catalogus met tabbladen, maar nu een paneel dat boven de snelbalk openklapt en na een keuze dichtgaat (ook Escape of een klik in de stad). De zoekbalk en filters bij modules staan erin; `/` opent hem meteen bij het zoekveld.
- **Gereedschap linksonder**: draaien (R), spiegelen (F), gum (Delete) en ongedaan maken (Ctrl+Z). Tijdens het lopen staan de handen erboven (kijken, bouwen, hamer; Q).
- **Ongedaan maken**: na elke wijziging wordt de stad (de tekst die toch al bewaard wordt) in een rij van 15 momentopnamen gezet; wijzigingen binnen 0,7 s tellen als één stap (slepen, boetseren). `parseCity` in `01` leest zo'n tekst terug.
- **Bouwen/lopen**: een schakelaar rechtsonder (L).
- **Laagkiezer** aan de rechterrand: kies op welke laag een module komt (Page Up/Down, of klik). Alles boven die laag wordt glas: de stad wordt in twee keer getekend, tot de snede (`laag × 3 m + 2,65 m`) gewoon en daarboven met een doorzichtig materiaal (`renderLayered`, met `renderer.clippingPlanes`). Wat boven de snede ligt is niet aan te klikken (`hudPickFilter` in `pick`). **Alles** zet de kiezer uit. Tijdens het lopen toont de kiezer alleen op welke laag je staat.



Achter de tijdknop rechtsboven staat **Weer** met zeven knoppen: zon, bewolkt, regen, onweer, mist, sneeuw en wisselend. Met **O** ga je naar het volgende weer (Shift+O naar het vorige), ook tijdens het lopen; je keuze staat ook in Instellingen en wordt bewaard (`hexstad.weer`). Bij wisselend volgt het ene weer vanzelf op het andere (zon → bewolkt → regen → onweer …), sneller als de tijd sneller loopt en niet als de tijd stilstaat (`13b-weer.js`).

- **Lucht en licht**: bewolking maakt de lucht grijs en de zon zwakker (minder schaduw), 's nachts geen sterren of maan. Bij donker weer gaan de lampen binnen eerder aan. Mist zet de horizon dicht; in bouwmodus blijft je eigen stad zichtbaar. Alles verloopt in een paar seconden (`WXK` in `02`, gemengd in `DN.apply`).
- **Regen en sneeuw** zijn deeltjes in een doos rond de camera (9000 strepen, 7000 vlokken), helemaal op de grafische kaart berekend. Bij onweer is de regen harder en schuin, en flitst de lucht met daarna de donder (verder weg is later en zachter).
- **Droog onder een dak**: elke halve seconde wordt de stad van bovenaf als hoogtekaart getekend (alleen bij nat weer). Wat daaronder ligt, krijgt geen regen en geen sneeuw: onder een galerij, in de hal, onder een boom.
- **Nat en sneeuw op de stad**: alle gewone materialen krijgen een stukje shader (`wxPatch` in `02`). Wat naar boven kijkt en open ligt, wordt bij regen donkerder en glanzend (de lucht spiegelt in de straat) en bij sneeuw wit, met wat vlekken. Na de regen droogt de stad op; sneeuw blijft liggen en smelt langzaam, sneller in de regen. Water doet niet mee (`userData.noWx`).
- **Geluid**: gesis en geruis van regen, wind bij storm en een beetje bij sneeuw, donder. Vogels zwijgen bij regen.
- **Voetgangers**: bij regen steekt ruim de helft buiten een paraplu op, wie er geen heeft loopt sneller. Ze gaan liever naar binnen of onder een overkapping en blijven langer binnen. In de sneeuw lopen ze iets langzamer.

## Bouwen: wegen klikken, wegen door bebouwing, voorbeeld, parken, daken

**Wegen klikken (v103).** Met een getekende weg gekozen zet de eerste klik een knooppunt (gele zeshoek). Daarna laat elke muisbeweging het stuk weg van dat knooppunt naar het vak onder de muis alvast zien — echt gebouwd als tijdelijk pad (`vecChain.tmp`, `buildPathNet(true)`), dus met stoep, markering en bochten — en de volgende klik legt het vast en maakt dát vak het nieuwe knooppunt. Zo klik je een hele weg met bochten bij elkaar; wat onder de weg stond gaat weg (Ctrl+Z zet terug). Stoppen: nog eens op het knooppunt klikken, rechtermuisknop, Esc, ander gereedschap, een andere stad of naar lopen wisselen. Begin je in een buurvak van het uiteinde van zo'n weg, dan gaat die weg verder in plaats van een nieuwe. Slepen werkt nog net zo (slepen beëindigt een klikreeks). Code: `vecChainClick/Hover/End` in `14-invoer-slepen.js`, aangeroepen vanuit `place()` en `updateGhost()` in 12.

- **Een weg met één klik**: met een wegtool op een vak klikken maakt een stukje weg. Eindigt er in een buurvak al zo'n weg, dan loopt die door tot dit vak; anders begint hier een weg van twee vakken in je kijkrichting (R draait). Klik vak voor vak om door te trekken (`vecClick` in `14`).
- **Slepen door bebouwing**: een weg stopt niet meer bij een gebouw. Wat onder de verharding komt (gebouwen, blokken, modules) verdwijnt bij het loslaten; water, een uitgraving en het terrein blijven (brug, klim). Ctrl+Z zet het terug (`vecClearUnder`). Andersom niet: op een weg kun je niet bouwen.
- **Voorbeeld**: bij een wegtool zie je de strook die een klik maakt, bij de rotonde de ring; bij het terrein doorzichtige plaatjes op de nieuwe hoogte onder het penseel (`terrPreview` in `14b`), bij de helling een lijn van A naar B.
- **Parken**: klik met het park op een park voor een andere inrichting: bomen, bankjes met lantaarns, bloemperken, een vijver met riet, een speeltuin (`park1`…`park4`, zie `06`).
- **Daken**: het schildak wordt op 2,5 m afgesneden (plat stuk bovenop, `ROOF_CUT` in `05`) en krijgt een schoorsteen aan de achterkant; de dakkapellen zijn ingekort.
- **Terrein**: links ophogen, rechts afgraven (of andersom bij afgraven); egaliseren links naar de gemiddelde hoogte onder het penseel, rechts naar de hoogte van het startvak. Sneeuwvlekken zijn zeshoekjes (`wxHex` in de shader).

## Mensen: low poly, groeten, praatjes, schrikken

De mensen zijn low poly (weinig segmenten, platte vlakken) met meer gezicht: ogen met glimlichtjes, wenkbrauwen, wangen, mond; sommigen een bril of baard, en wie groet of kletst lacht. Wie elkaar tegemoet loopt zwaait soms even en kijkt de ander aan; af en toe blijven twee mensen staan voor een praatje (naar elkaar gedraaid, knikkend). Loop je er zelf langs, dan word je gegroet. Wordt iemand aangereden (of komt de Hulk langs), dan schrikken de omstanders: handen omhoog, even stilstaan, kijken (`social`, `startle` in `10`). Bij een aanrijding klinkt een vrouw hoger, een kind nog hoger en een oudere lager (`sound.grunt(…, who)`).

## De Hulk

Staat er een file (vijf of meer auto's die bij elkaar al een tijd stilstaan, `cars.jams()`), dan komt een reus van 4,5 m aangelopen (`11b-hulk.js`), tilt de auto's één voor één op en slingert ze weg (`cars.toss`: een boog door de lucht, tollend, de wielen blijven eraan; na de landing glijdt de auto nog even en begint ergens anders opnieuw). De omstanders schrikken, de file is opgelost, de Hulk loopt weer weg. Hooguit één keer per anderhalve minuut; `__hulk.summon()` roept hem voor een test. Een file is: vijf of meer auto's binnen 22 m van elkaar die elk al meer dan 6 s stilstaan (`c.still`, om welke reden ook: rood licht, voorrang, een keerlus, iemand ervoor).

## Deuren

Elke voordeur (huizen en kantoren uit `03-gebouwen.js`, deuropeningen van modules uit `08c`) heeft een deurblad dat naar binnen openzwaait zodra jij of een voetganger binnen 2,2 m komt, en weer dichtgaat als iedereen weg is (`09b-deuren.js`, één `InstancedMesh` voor alle bladen, `window.__doors`). Het scharnier zit links gezien van buiten; de deur blokkeert niet, de opening in de muur blijft vrij. Deuren horen bij een eigenaar (een vak of een module-exemplaar) en gaan weg als die herbouwd wordt. Binnen onder een dak valt geen zonlicht, dus het blad licht zichzelf zacht bij in zijn eigen kleur (eigen `onBeforeCompile` bovenop de weer-shader). Let op in r128: `setColorAt` maakt de kleurbuffer zo groot als `count`, dus die buffer wordt zelf aangemaakt.

## De speler heeft een lichaam (v105)

Tijdens het lopen heeft de speler een eigen pop in dezelfde `people`-code (`PB` in `10-mensen.js`): romp, armen, benen met echte voetstappen (`stepFeet`) en een hoofd net achter de camera (geen hoofd in beeld, wel in de schaduw). Het lichaam staat iets achter de camera, verder naarmate je omlaag kijkt. Met de hamer of een blok in de hand is de rechterarm de mouw met hand in beeld (`armG` in `13`); anders kijk je gewoon. Raakt een auto je (`hitPeople` → `people.hitPlayer`, alleen bij een rijdende auto > 9 km/u op jouw hoogte), dan neemt dezelfde ragdoll als bij voetgangers het over: `player.down`, de besturing is uit en de camera zit in het hoofd van het lichaam (`people.pbCamera`, gladgestreken). Na een paar seconden liggen komt hij op handen en knieën en dan overeind; daarna 3 s onkwetsbaar. Het telt als ongelukje (`auto`). Netjes rijdend verkeer stopt voor je; in de gekkenhuis-stand (`cars.reckless`) niet. Test: `python speler_val.py`.

## Ongelukjes en door iets heen lopen

Linksboven, onder de naam van de stad, telt een knop de ongelukjes met voetgangers (aangereden door een auto, gevallen, omver gelopen door de speler, geraakt door een geplaatst blok) en hoe vaak iemand door een muur of voorwerp heen liep (`INC`, `incident` en `throughCheck` in `10`). Een klik toont de laatste gebeurtenissen; **toon** vliegt erheen en zet een rode ring op de plek. **Op nul** zet de tellers terug. Valt iemand omdat jij de vloer weghaalt of een andere stad laadt, dan telt dat niet als ongeluk. Tijdens het tekenen van een weg blijven de voetgangers gewoon staan (alleen wie zijn plek kwijt is, begint opnieuw); ze lopen een deur in zonder te krimpen; over een brugdek (getekende weg over water) kun je lopen; binnen is het licht gedempt; auto's kruipen of 'spoken' nooit meer dwars door rijdende auto's heen.

Voetgangers lopen zelf niet meer door muren, inrichting of over de rand van een vloer: een stap die een muur op lichaamshoogte zou kruisen glijdt langs die muur (`wallStep`), en een stap de leegte in wordt niet gezet. Dat geldt ook voor duwen tussen mensen en uitwijken voor de speler. Wie een voordeur uitkomt, stapt eerst naar buiten en loopt zo nodig om de hoek van het eigen gebouw naar de stoep, niet dwars door de zijmuur. Loopt iemand toch klem (een paar seconden geen vooruitgang, of binnen een module heel lang onderweg naar dezelfde knoop), dan begint hij opnieuw bij de knoop waar hij heen ging. In het loopnetwerk ligt een hoekpunt om de kern van een galerij nooit op of tegen een dichte muur. Met `__INC.dbg = 1` (console) krijgt elke melding het gelopen spoor erbij; `__modDbg().whyBlocked` noemt nu ook de bron (module met naam en plek, blok, rand, weg) en `walkWalls(laag, x, z)` toont de muren zoals het loopnetwerk ze ziet.

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


Nieuw in de Raatbouwer hiervoor:
- **Schans (S)**: klik in een vak bij de zijde waar je onderaan instapt; het hele vak wordt een oprit die aan de overkant 3 m hoger uitkomt (`hexramp` in `mv2Build`: vlakke middenstrook van 9 m en twee gewrongen zijdriehoeken, dichte wanden eromheen).
- **Penseel (N)** voor de vloer: zeshoek · één driehoek · heel vak · kern (¾) · rand (galerij).
- Vloermateriaal **Glazen dak** (doorzichtig, voor lichtkappen) en de voorwerpen **winkelstelling**, **toonbank** en **lichtreclame**.
- Een trap kan zijwaarts verschoven staan (`off` in een trap-item), zodat hij in een galerijband van 1,95 m past.

## Modules: namen en bladeren

Elke module heet **soort · variant (· bijzonderheid) · lagen · maat**, bijvoorbeeld `Rijhuis · baksteen · 2L` of `Plein · markt · 7v`. Het aantal lagen (`2L`, alleen bij gebouwen) en de maat (`7v` voor 7 vakken; 1 vak heeft geen toevoeging) rekent de Raatbouwer bij het bewaren zelf uit en zet ze achteraan (`modMeta`, `modSuffix` in `08c`). De standaardbibliotheek gebruikt dezelfde regel (`LIB_NAMES` in `08e`). Oude namen worden eenmalig omgezet, en de categorie Trappen heet nu **Verbindingen** (trappen, hellingen, bruggen: wat lagen met elkaar verbindt).

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

## Bibliotheek: 151 modules, nagekeken (lib10)

De hele bibliotheek is opnieuw opgebouwd en per module automatisch nagekeken (`test/visueel/bieb_audit.js`): elke module wordt los in een lege stad gezet en met de echte botsing (`floorAt`/`blockedAt`) vanaf de straat afgelopen. Gemeld wordt een verdieping die niet bereikbaar is, een trap die boven nergens uitkomt, een voorwerp dat zweeft, in een muur staat, buiten het gebied valt of op een ander voorwerp, en een hek of muur die nergens op staat. `bieb_platen.js` maakt per categorie een overzichtsplaat met 3D-miniaturen.

Nieuw: **Voorzieningen** (tankstation, laadplein met zonnedak, trafohuisje, zonnepark, windmolen, watertoren, waterzuivering, milieustraat), **Openbaar** (huisarts, apotheek, kinderopvang, school van 1 vak, zwembad, theater, bioscoop, bus- en tramhalte, sportveld), **Groen** (begraafplaats, kinderboerderij), **Pleinen** (haven), **Wonen** (woonboot, galerijflat, portiekflat, studentenhuis, boerderij, zorgcomplex), **Werken/Winkels** (garage, datacenter, laboratorium, bouwmarkt, tuincentrum, snackbar) en **Verbindingen** (glazen trappenhuis, roltrap). Nieuwe voorwerpen: bed, bank (binnen), bureau, keukenblok, filmdoek, auto, tankpomp, laadpaal, zonnepanelen, windmolen, schoorsteen, container, doel, grafsteen, boot, abri, glijbaan, schommel, schaap. Woningen, kantoren, winkels, hotel, ziekenhuis, school en kerk zijn ingericht; platte daken van grote gebouwen hebben zonnepanelen (een dak met alleen zonnepanelen blijft een dak).

Bij het bijwerken (`hexstad-lib10`) worden standaardmodules die je nooit zelf hebt bewaard vervangen (zelfde id) en komen de nieuwe erbij; geplaatste exemplaren in elke stad krijgen de nieuwe versie (`buildModNet`). Het koppelen gaat op de precieze naam, dan op de naam uit de bouwcode, en alleen op de naam zonder lagen/maat als die uniek is (Rijhuis · baksteen bestaat in 2L én 3L).

## Low poly terrein

Standaard (Instellingen → Terrein → Low poly) wordt het terrein op het driehoeksrooster van de vakken getekend in plaats van op een vierkant rooster (`lpMesh` in `07b`). Elk vak bestaat uit zes driehoeken. Het midden ligt op de hoogte van het vak en elk hoekpunt op de laagste van de drie vakken die daar samenkomen. Eén verhoogd vak wordt zo een puntje, een groep een plateau met schuine flanken, en een strook van drie vakken breed een dijk. Elk vak dat een weg (met stoep) raakt is een wegvak: zijn midden en hoekpunten liggen op de hoogte van de weg. Een weg langs een dijk loopt daardoor strak langs de voet, en een weg over een dijk snijdt er met een bult doorheen. Lopen gebruikt precies dezelfde driehoeken (`lpHeight`).

## Trappen in huizen

Woningen en kantoren hebben een **bordestrap langs één muur** (`UT` in `03`), zoals in de bovenaanzicht-schets: de eerste steek loopt langs de binnenkant van de muur omhoog naar een bordes in de hoek (1,5 m), de tweede steek komt aan de muurkant terug en je komt boven uit naast waar je begon. Per verdieping wisselt de trap van muur (zijde 4 en 1), zodat hij niet steeds in hetzelfde trapgat staat. In de vloer erboven zit een trapgat met balustrade; de muur achter de trap krijgt geen ramen. Lopen gaat over schuine loopvlakken (`slopeU`) en een bordesvlak; de vloer heeft een gat (`holePoly`).

## Aanwijzen in de stad (V)

Met de muispijl linksonder (of toets **V**) wijs je in de stad een module of blok aan: hij licht op als een draadmodel van zeshoeken, met de naam bij de muis. Een klik geeft een optiekaart: **draai links/rechts** (60°), **spiegelen**, **andere variant** (die op de buren aansluit), **bewerken** in de Raatbouwer (past alle exemplaren aan), **meer hiervan** (pipet), **verplaatsen** (oppakken en ergens anders neerzetten) en **weghalen**. Bij een gewoon blok: meer hiervan of de bovenste laag weg. Esc of een klik ernaast sluit de kaart (`15g-aanwijzen.js`).

## Modules en de Raatbouwer

Een module v2 is een gebied van 1, 7, 19 of 37 vakken met verdiepingen van 3 m, getekend op het fijne driehoekraster (zijde 4,5 of 2,25 m):

- **Vloeren** zijn driehoeken met een materiaal (klinkers, tegels, hout, kantoorvloer, beton, gras, water, asfalt, dakbedekking). Een vloer op een verdieping is ook het plafond eronder; een bovenste laag met alleen vloer is een plat dak.
- **Muren** liggen op de ribben van het raster (baksteen, stucwerk, beton, glaswand, hout, natuursteen, haag, hek) en kunnen een **deur, raam, poort** of **open doorgang** hebben.
- **Trappen en hellingen** lopen van een rasterpunt in een van zes richtingen 3 m omhoog naar de volgende verdieping.
- **Daken** per vak: puntdak of plat. **Voorwerpen**: boom, struik, bankje, lantaarn, zuil, tafel, plantenbak, fontein, prullenbak, fietsenrek.

In de stad wordt een module echt gebouwd (`mv2Build`): één mesh per materiaal, plus loopvlakken per verdieping en muren voor de botsing, zodat je erdoorheen en de trap op kunt lopen. Vakken onder een module zijn bezet voor andere blokken en wegen. Randcodes (muur, deur, groen, stoep, water, weg, leeg) worden uit de begane grond afgeleid; een klik op een geplaatste module wisselt naar de variant die het best op de buren past.

De **Raatbouwer** (vroeger module maker of schets; in het menu **Raatbouwer**, of Modules → Nieuw, of dubbelklik op een module) werkt als een bouwtekening: gereedschap bovenaan met sneltoetsen (V kiezen, H schuiven, F vloer, G vullen, W muur, M kamer, D deur, R raam, P poort, O open, C dicht, T trap, U bordestrap, J wenteltrap, L helling, S schans, K dak, B voorwerp, X gum), verdiepingen met ▲▼ of Page Up/Down, 3D-weergave met 3, ongedaan maken met Ctrl+Z. Bewaren zet de module in het palet; geplaatste exemplaren worden meteen bijgewerkt. Modules zijn als JSON-bestand te delen.

**Trappen tekenen**: wijs een driehoekje aan en de trap staat er al als voorbeeld, met oranje de driehoeken die hij bezet (vol = helemaal, lichter = deels); een klik zet hem neer (3 zijden, één verdieping), slepen geeft een andere lengte of richting. De wenteltrap valt precies over de zes driehoeken om een rasterpunt. Tijdens het plaatsen zie je ook welke vloerdriehoeken op de verdieping erboven bedekt blijven en welke het trapgat worden. Het trapgat wordt precies afgeknipt op het eind van de trap (de vloer erboven loopt door tot de bovenste trede), zodat de trap goed aansluit. De **wenteltrap (J)**: klik het midden, sleep naar de kant waar je onderaan instapt; kies linksom of rechtsom omhoog. De gum kleurt ook in 3D de muur rood waar je overheen gaat (straal tegen de wandvlakken), niet alleen de vloer.

**Voorwerpen (B)**: je ziet het voorwerp al staan voor je klikt (in 3D half doorzichtig), met zijn omtrek en een pijltje naar de voorkant. Draaien per 30°: Q en E, Shift+scroll of de knoppen ↺ ↻; houd ingedrukt en sleep om het te richten (Ctrl: vrij). Op een voorwerp: klik draait 30°, slepen richt het, rechtermuisknop haalt het weg.

**3D is de standaardweergave** en je tekent er gewoon in: elke klik wordt een straal vanuit de camera, gesneden met het vlak van de verdieping waar je bent (`toW`/`toS` in `08d`), dus al het gereedschap werkt in 3D en bovenaanzicht hetzelfde. Het raster en de rand van het gebied liggen op de hoogte van die verdieping. Draaien: middelste muisknop, Alt+slepen, spatie+slepen of het handje; schuiven: Shift+slepen of het pijltje. Standaard zie je de module tot en met de verdieping waar je tekent. Op het noorden staat een **hoogtemeter**: een paal met een streep per verdieping (3 m), de huidige in oranje, met een N; in het bovenaanzicht een ladder boven het gebied. Zolang de Raatbouwer open is staat de stad stil (scheelt rekenwerk).

**Hoeken**: waar twee muren onder een hoek samenkomen staat een ronde hoekpost van dezelfde dikte en hetzelfde materiaal, zodat de rechte muurblokken zonder kier of uitstekend hoekje aansluiten (ook bij hagen).

**Muren onder 90°**: behalve langs de ribben van het raster (30°, 90°, 150°) kun je muren ook haaks daarop trekken (0°, 60°, 120°, `MV2.DIRW` 3–5, √3 × zo lang), zodat een muur in twaalf richtingen snapt en rechthoekige kamers mogelijk zijn. Vullen (G) stopt alleen bij muren langs het raster.

**Gevels en vloeren** (`modernMats` in `08c`): baksteen, donkere steen, wit stucwerk, schoon beton, gevelpanelen, houten lamellen, cortenstaal en glasgevel als textuur op ware schaal (uv in meters, doorlopend over stukken en verdiepingen); vloeren ook in visgraat parket, gepolijst beton en natuursteen tegels.

**Verwijderen** gaat met twee klikken (× in de bibliotheek, of rechtermuisknop op een kaartje in het palet), omdat een bevestigingsvenster (`confirm`) in een ingesloten pagina niet werkt. De oude schets is niet meer te openen; oude schets-modules kun je nog plaatsen en verwijderen.

## Opslag

Steden en modules staan in `localStorage` van de browser. Modules kunnen als JSON-bestand worden geëxporteerd en geïmporteerd (Raatbouwer → Delen). De 151 standaardmodules worden één keer toegevoegd en zijn met "Standaard terugzetten" te herstellen.

## Plan

1. ✅ Code in losse bestanden
2. ✅ Eén wegsysteem (vectorlijnen) met verkeer, verkeerslichten, mensen, zandvakken
3. ✅ Modules delen als bestand
4. ✅ Randcodes op modules; een klik op een geplaatste module wisselt naar de variant die op de buren past
5. ✅ Oude vakweg-, laan- en randwegcode verwijderd (alleen de omzetting voor oude steden blijft)
6. ✅ Ronde kop op doodlopende wegen
7. ✅ Modules v2 met verdiepingen, openingen, trappen, daken en voorwerpen; begaanbaar in de stad
8. ✅ Raatbouwer met gereedschap en iconen, 3D-weergave, bibliotheek
9. ✅ Honderd standaardmodules in families (wonen, werken, winkels, openbaar, groen, pleinen, trappen, bouwdelen)
10. ✅ Hoog terrein, wegen over heuvels en viaducten, sneltoetsen met hulpvenster

Nog te doen:

- Echte brug op het nieuwe wegennet (dek, hoogte)
- Afgeronde stoephoeken op kruisingen (nu recht afgesneden, bij een laan een lange witte punt)
- Parkeerstroken met geparkeerde auto's, keerlus aan het eind van een laan, zebrapaden
- Voetpad als getekende lijn
- Plaatsvervangers in het menu: Rotonde, Spoor, Parkeren, Winkel, School, Fabriek, Bomen, Hagen, Vijver, Fontein, Klif, Strand, Brug, Poort, Toren
- Auto's die een parkeergarage in rijden
- Raatbouwer: muren met eigen hoogte, schuine daken over een vrije vorm, hellende vloeren, teksten en bordjes

## Testen

In `test/` staan de simulaties en controles (Playwright, headless Chromium): verkeer op losse wegvormen en in de voorbeeldstad, een stad met alle bouwonderdelen, de Raatbouwer, de standaardbibliotheek en lint. Zie `test/README.md`.

## Randvulling langs wegen (v116)
Een vak dat deels op een weg of stoep ligt, kan nu een park in stukjes worden: alleen de taartpunten (zesde delen van het zeshoekige vak) die vrij van de weg zijn, worden gras met bomen. Het masker staat per vak in `cells.sec` (opgeslagen als `__s`). Het startstadje is hiermee gevuld; zelf bouwen: kies Park en tik een vak naast de weg.

## Stadsgenerator (snel testen)
`src/js/08j-generator.js`: `genTown(seed, indeling)`; indelingen `dorp`, `rotonde`, `kruis`, `ring`. Via het menu (Dorp, Dorp met rotonde, Stad met raster, Kleine ringstad) of in de console `__SC().doAct('gen:dorp:7')` (zelfde seed = zelfde stad).
`node test/visueel/generator.js 5` bouwt per indeling 5 seeds en meldt gebouwen zonder stoep naar de deur.

## Geluid
Alles behalve de vogels, de aanrijdingsklappen en het kreunen is gesynthetiseerd met Web Audio (`13-camera-modus-geluid.js`, `sound.fx(naam, x, y, z, sterkte)`):
bouwen (tok), draaien (tik), slopen (gruis), kan niet (zoem), ongedaan maken, wisselen tussen bouwen en lopen (zwiep), een nieuwe stad (akkoordje),
mooier geworden (tingeltje), springen, deuren (kraak en klik), piepende banden en botsend metaal (roekeloos), claxon, krekels 's nachts en de brul van de Hulk.
De haken voor bouwen en slopen staan in `15f-geluid-haken.js`.

## Instorten
Raakt een auto (die slipt na een botsing) hard een modulegebouw, dan breken de stukken bij de inslag af (`src/js/11c-instorten.js`).
Het gebouw wordt op dat moment in losse stukken opgebouwd (`mv2Build` met `pieces: true`); wat nergens meer op steunt valt ook
(steun = kortste weg naar de grond: omhoog gratis, opzij 1, naar beneden 2, meer dan 3 houdt niets). Hoekposten en muren zijn zo
de dragers. Puin valt met zwaartekracht en zakt na ~10 s weg; wat blijft staan wordt samengevoegd getekend. Instelling: Instorten
(aan/uit; uit zet alles terug). Test: `test/visueel/instorten*.js`. Ontwerp voor Unity: zelfde steungraaf, echte physics voor het vallen.

## Autoschade en oude blokken
- **Schade** (`11-autos.js`, blok "Schade"): elke auto heeft `hp` (100). Een botsing (`hurt`) kost `impact × 1,9`, tegen een gebouw `snelheid × 1,2`, een landing na de Hulk 30. Onder 65 gaat hij roken, onder 35 zwaarder, op 0 brandt hij (`ignite`: hij rolt uit en staat stil) en na 4,5–7,5 s ontploft hij (`explode`): vuur en rook, een dreun (`sound.fx('boom')`), wie dichtbij loopt wordt geraakt, buurauto's krijgen 35 schade (kettingreactie) en de auto begint ergens anders opnieuw met 100. Na een gewone botsing zoekt de auto zelf de weg terug (`rejoin`: dichtstbijzijnde rijstrook, vloeiende bocht, geen teleportatie). Er zijn geen takelwagens meer (`towDispatch` doet niets).
- **Oude blokken** (`08k-oud-omzetten.js`): `oudOmzetten(cells)` zet kolommen woning/kantoor/blok/zuilen/hof/tribune/tunnel om in bibliotheekmodules, gelijke hoogte, deur naar de straat. Gebeurt automatisch in `rebuildAll()`; Menu → "Oude blokken omzetten" doet het ook los. Kolommen met iets anders (pad, park, trap) blijven oud.

## Cameramodus en totale chaos
- **Cameramodus** (`13-camera-modus-geluid.js`, `flyCam`): in de bouwmodus zet Spatie het aan en uit (Esc ook). Geen interface en geen bouwvoorbeeld. De muis kijkt (aanwijzer vastgezet), W/A/S/D vliegt met wat vaart in de kijkrichting, E/Q omhoog/omlaag, Shift ×3, Ctrl ×0,25, het wiel zoomt (beeldhoek 12–95°), F slaat een foto op (`flyPhoto`, png zonder knoppen). Bij het stoppen komt het draaipunt op wat je aankijkt (`flyStop`).
- **Totale chaos** (de oude knop "Roekeloos rijgedrag", intern nog `cars.reckless`): mensen rennen (×1,6–3,5), pauzeren en kletsen niet, schreeuwen af en toe (`sound.scream`, opnames in `assets/schreeuw.mp3`: paniek, korte kreten, een gruwelkreet bij een explosie en een kreet die bij het bloed hoort) en de spreekballonnen tonen paniek en verwarring (`PANIC`, plus brand- en instortzinnen als dat echt gebeurt).

## Lopen en rennen
Mensen zetten hun voeten echt neer (`stepFeet`), met benen via inverse kinematica (`animPose`). Vanaf ~2,2 m/s rennen ze (`runFeet`): afzetten achter de heup, landen vlak ervoor, een zweefmoment, hiel omhoog, gebogen pompende armen, voorover leunen. Rennende mensen kijken verder vooruit en halen tragere lopers in. Metingen: `test/visueel/loopmeting.js` (voetwerk), `ontwijk.js` (bijna-botsingen), `loopbeeld.js` (beeldreeks van opzij). Alle maten en formules voor Unity staan in `unity/OVERDRACHT.md` §20.

## Trappen in de Raatbouwer
Trap (T) en Bordestrap (U) volgen het voorbeeld `trappen.dae`: 16 treden per verdieping (18,75 cm op, 42 cm aantrede bij 3 rasterzijden), één driehoekrij breed (1,95 m), zwevende treden, een driehoekig bordes (rechte trap) of een bordes over twee rijen met een schuine kant van 60° (bordestrap). Het gat in de vloer erboven komt vanzelf (`stairHoles` in `08c`). Zolang de maker open is, is het weer helder en 13:00. Maten en formules: `unity/OVERDRACHT.md` §22.
