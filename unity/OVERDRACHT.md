# Overdracht webversie → Unity (stand 25 oktober 2026)

Dit document beschrijft alles wat er in de webversie van Raatstad (`src/js/`) is bijgekomen sinds de laatste Unity-versie
(planeet-wegensysteem, zie `unity/README.md`), met de maten, regels en formules die je nodig hebt om het in Unity na te bouwen.
Alles is gebaseerd op zeshoeken en driehoeken; bouw naar die standaard. De webversie is de bron: elk onderdeel noemt het bestand.

## 0. Basismaten (gelijk in beide versies)
- Vak: R = 9 m van midden tot hoekpunt, 15,6 m breed (R·√3), zijde 9 m. Vakmidden: `x = R·√3·(q + r/2)`, `z = 1,5·R·r` (axiale q,r).
- Verdieping: 3 m (`LV_H`), muur 0,25 m, vloer 0,2 m, maximaal 8 lagen.
- Getekende wegen (`07-driehoeken-vectorwegen.js`): halve breedte asfalt en stoepbreedte per type:
  weg 2,5 + 2,0 · brede weg 4,5 + 2,0 · laan 8,75 + 2,5 (middenberm 1,5) · pad 1,6 + 0,5 · snelweg 10,1 + 2,0 · klinkerstraat 2,75 + 1,8 · fietspad 1,25 + 0,4.
  Stoep ligt op 0,25 m (`PW_H`), stoeprand binnen 0,15 en buiten 0,45 breed, **altijd schuin** (geen rechte stoepranden), ook bij rotondes.
- Rotonde: rijbaanmidden 11 m, binnenrand 8,25, buitenrand 13,75, eiland 6,75 m met overrijdbare klinkerrand en een boom.
- Deur van een module: deur moet binnen 14 m van een beloopbare stoep liggen, anders is het huis onbereikbaar (de test `test/visueel/generator.js` controleert dit).

## 1. Stadsgenerator (`08j-generator.js`)
Eén klik maakt een dorp of stad; dezelfde seed geeft dezelfde stad. Knoppen: Menu (Dorp, Dorp met rotonde, Honingraatstad, Zeshoekige ringstad) en
welkomstscherm (Willekeurig dorp, Willekeurige honingraatstad). Console: `doAct('gen:dorp:7')`.

**Wegen alleen op het zeshoekraster.** Alle wegen lopen over vakmiddens, langs de zes assen van het raster (0°, 60°, 120° …), met hoekpunten op
vakmiddens. Geen haakse kruispunten, geen vierkanten, geen weg die dwars door een vak snijdt. `PITCH = R·√3 = 15,59 m` (afstand tussen vakmiddens),
straal van de stad `Rd = 125 m`, afgerond op een veelvoud van PITCH.
- **dorp**: drie hoofdstraten onder 60° door het midden (Y-vorm, van −Rd tot +Rd) plus een zeshoekige lus op 4 vakken van het midden (hoekpunten `(cos(i·60°), sin(i·60°))·4·PITCH`).
- **rotonde**: rotonde in het midden, zes armen vanuit (0,0) naar `Rd` onder `k·60°`, plus een zeshoekige lus op 4 vakken.
- **kruis** (honingraat): wegen langs de randen van grote zeshoeken met 4 vakken per zijde (`Rh = 4·PITCH`), middens op een driehoeksrooster met afstand `Rh·√3`; elke rand één keer.
- **ring**: rotonde, zeshoekige ringweg op 5 vakken, zes spaken vanuit het midden.
- Spaken beginnen in het middelpunt van de rotonde (anders ontstaan doodlopende keerlussen).

**Vulling** (afstand tot de dichtstbijzijnde echte weg `dr`, gemeten vanaf de rand van de stoep):
- `dr < 15 m` (straatvak): rijhuizen (Rijhuis baksteen/wit/natuursteen/hout, Stadswoning wit); in het centrum (`rad < 0,45·Rd`) 45 % winkels (bakkerij, café met terras, etalage, bovenwoning, boetiek, restaurant); 6 % Kantoor baksteen (in een dorp: Park bankjes). Deur naar de weg: `rot = (toRoad + 1) mod 6`, waarbij `toRoad` de rasterrichting is naar het dichtstbijzijnde punt van een echte weg (doorsluipjes tellen niet mee).
- `15 ≤ dr < 34 m`: 28 % Bos bomen, anders Park plantsoen / Park bankjes / Tuin rozentuin / Grasveld leeg / Tuin boomgaard.
- verder weg, binnen `Rd + 10`: 30 % Bos bomen.
- Vaste plekken: Plein fontein op het eerste straatvak vanaf het midden; Park speeltuin in het groen (16–30 m van de weg, buiten `0,3·Rd`); vijver van drie vakken water `[[0,0],[1,0],[0,1]]` op een rustige plek 18–34 m van de weg, 25 m tot `0,7·Rd` van het midden.
- Randvulling: vakken die half op de weg liggen worden een park in sectoren (`secMaskOf`, alleen bij 2–5 vrije sectoren).

**Paden**
- Voordeurpad per huis/winkel/kantoor: smal pad (`pad`) van 5 m voor de gevel tot aan de **rand van de stoep** (niet op het asfalt): eindpunt = punt op de weg min `(hw + walk)` langs de lijn gevel→weg; alleen als de afstand > `hw + walk + 5`.
- Doorsluipjes: op ~16 % van de vakmiddens die precies op een weg liggen (afstand < 1,5 m), buiten 30 m en binnen `0,85·Rd` van het midden, minimaal 45 m uit elkaar: een pad vanaf de stoeprand onder `±60°` t.o.v. de wegrichting, 2 vakken (31 m) lang. Huizen mogen hun deur op een doorsluipje hebben, maar de deurrichting mikt op de echte weg.

**Hash-RNG**: `hv(q, r, s) = frac(sin(q·12,9898 + r·78,233 + (seed + s)·37,719)·43758,5453)`, zodat dezelfde seed dezelfde stad geeft.

## 2. Zeshoekige wenteltrap (`08c-modules-v2.js` renderer `S.k === 'spiral'`, `08e-modules-bibliotheek.js` `stairwell`)
Vervangt in alle huizen en torens de rechte trap met zijmuur.
- Per verdieping (3 m) één volle omwenteling van **12 trapeziumtreden** (elk 30°), tredehoogte 0,25 m, dikte 0,26 m.
- Treden zijn stukken van een **zeshoekige ring**: binnenapothema 0,32 m (kern), buitenapothema 1,75 m. Hoek van de zeshoek: `r(θ) = A / cos(d)` met `d = ((θ − a0) mod 60°)`, naar `[−30°, 30°]` gevouwen; zijmiddens op `a0 + n·60°`.
- Kern: zeshoekige kolom (straal `0,32/0,866`), hoogte 3 m + 1,05 m, metaal.
- Leuning: palen van 0,95 m op de buitenhoek van tree 1 t/m 11, bovenlat 0,05 m dik langs de buitenkant. Loopvlak hout, zijkanten steen/stuc (`Mt.step`).
- Botsing: buitenrand tree 1–10 dicht (0,5 m onder tot 0,95 m boven de tree), kern dicht over de hele hoogte; eerste en laatste tree open (in- en uitstap).
- Vloergat erboven: alle vloerdriehoeken met middelpunt binnen 2,15 m van de kern **en** hoek < 330° vanaf de startrichting (het laatste stuk van 30° blijft vloer: daar stap je de verdieping op).
- Plaatsing: `stairwell(floors, x, z, d6, n, w, ctr)` zet de trap 1,4 m richting het middelpunt van de module als de opgegeven plek > 2,5 m van het midden ligt; draairichting kiest de rasterrichting die het meest naar het midden wijst. De volgende verdieping begint waar de vorige eindigt (één doorlopende spiraal). Breedte 1,5 m. Toren rond 6 lagen: trap op (0, 2,0).
- Gemeten: speler klimt van 0 m naar 4,5 m (verdieping 1 op 3,0 m) met de normale loopbesturing.

## 3. Low-poly voertuigen (`11-0-lowpoly-voertuigen.js`, `11-autos.js`)
De oude gladde elektrische auto is weg. Zeven typen delen één rijmodel: 4,7 m lang, wielbasis 2,9 m (`WB = 1,45` halve wielbasis), spoor 1,66 m (`TRACK = 0,83`),
wielstraal 0,36 m, wielen op `x = ±1,45, z = ±0,83`. Remmen, botsingen en bochtsnelheden zijn ongewijzigd (botsingsdoos 2,35 × 0,96 halve maten).

**Opbouw**: elke carrosserie is een romp van doorsneden langs de lengte `[x, yOnder, yGordel, yDak, bOnder, bGordel, bDak]` (b = halve breedte).
Elke doorsnede is een **zeshoek**: onder de gordellijn lopen de flanken schuin naar binnen, erboven ook (tuimeling). Driehoeken met de normaal naar buiten
(gecontroleerd tegen het middelpunt van het segment); kopse kanten als waaier. Ruiten zijn dunne platen 12–14 mm buiten de romp (zodat stijlen en dakranden
in de lakkleur blijven staan), wielkasten donkere halve zeshoeken over de flank (`±0,74 m` rond de as, bovenkant 0,74–0,98 m), een donkere band onderaan.
`flatShading` overal.

| type | kans | kenmerken |
|---|---|---|
| sedan | 20 % | lange kap, cabine x −1,62…0,64, dak 1,42 m; lichtlijn 3,95 m lang op de gordellijn (0,64 m) in accentkleur; koplampen 2 × 0,44 m, achterlicht 1,4 m breed |
| coupe | 12 % | lage wig: neus 0,56 m, dak 1,28 m; donkere streep 0,44–0,52 m over de flank (x −2,0…1,7); vier kleine koplampen |
| suv | 18 % | kast: romp tot 1,12 m, cabine tot 1,72 m (x −2,12…1,1); dakrails 2,4 m; donkere onderkant 0,34–0,56; smalle koplampen 0,42 m |
| wedge | 10 % | stalen wig-pickup (vaste kleur #d3d8dc, `metalness 0,3`): één schuin vlak van neus (0,94 m) tot dakpunt (1,84 m op x −0,15), daarna aflopend naar 1,36 m achter; tuimeling boven sterk (bDak 0,6); lichtbalk voor 1,66 m breed op 0,8 m, rood achter 1,62 m op 1,22 m |
| stad | 20 % | hatchback, cabine x −1,58…0,74, dak 1,42 m |
| bestel | 12 % | laadruimte tot 2,05 m (x −2,3…0,95), cabine met ruit 1,04–1,62 m |
| taxi | 8 % | stadsauto in #f2c230 met daklicht 0,3 × 0,14 × 0,6 op 1,5 m |

Lakkleuren (`LP_PAINT`): #e8c547 #d9534f #4a90a4 #f2f3f5 #3d5a80 #7bb356 #e07a3f #2b2f36 #b8a9c9 #c9ced4 #5a1f2a #b5a36a #1c1f24. Ruitkleur #1d2b36 (roughness 0,6).
Wielen: band 10-hoek, velg 8-hoek, vijf gaten, gloeiende ring (hub) in de accentkleur. Test-opstelling: `node test/visueel/voertuigen.js`.

## 4. Roekeloos rijgedrag (`11-autos.js`, instelling "Roekeloos rijgedrag")
Elke auto krijgt een persona zodra de stand aan gaat:
- **racer** (35 %): doelsnelheid 26 m/s. Achter een tragere auto op een recht stuk (3–26 m voor hem, hij rijdt > 3 m/s en de ander > 0,5 m/s trager): claxon, 3,5 s inhalen over de **linker** rijstrook (zijdelingse verschuiving 2,7 m), pas terug als de ander > 7 m achter hem is.
- **ontwijker** (40 %): doelsnelheid 20 m/s. Iemand 3 tot `6 + 0,9·v` m vooruit binnen 1,6 m zijwaarts, of een auto 3–14 m vooruit die hem laat remmen: 1,4–1,6 s uitwijken (2,4 m naar de vrije kant), remt niet.
- **jager** (25 %): doelsnelheid 17 m/s. Kiest het dichtstbijzijnde doelwit in een kegel vóór zich (2,5–34 m, zijwaarts < `3 + 0,45·afstand`), ook de speler in loopstand; stuurt erop af (zijwaartse verschuiving tot −4,5…+5,5 m, dus ook over de stoep), claxon bij de start, 6 s jagen, dan 5 s rust. Snelheid tot 16 m/s.
- Sturen: fietsmodel (Stanley-regelaar) met een doelverschuiving `latCur` naast de rijlijn: `δ = atan(L·κ) + eHead + atan(−1,6·(eLat − latCur)/(1,5 + v))`, `δ` begrensd op 0,7 rad (0,95 onder 4 m/s), stuursnelheid 2,6 rad/s. Op de stoep (`onCurb`) verliest hij snelheid, maar wordt niet teruggetrokken als `|latCur| ≥ 1`.
- Roekeloze auto's raken de speler ook op de stoeprand (hoogteverschil < 0,35 m i.p.v. 0,2). Versnellen 7 m/s², remmen 9 m/s² (netjes 2,5 / 6).
- Test: `node test/visueel/roekeloos.js` (30 auto's, 30 s: tellingen inhalen/ontwijken/jagen/botsingen).

## 5. Vastzitten: achteruit en eromheen (`11-autos.js`, blok "Vast achter een auto die niet meer rijdt")
Geldt voor netjes én roekeloos verkeer, alleen achter de **kop** van een rij (een gebotste auto, of een auto die stilstaat zonder zelf op iets te wachten: niet `ahead`, niet voor een licht, geen voorrang). Niet in een gewone rij voor rood.
1. Wachten: netjes 4 s, roekeloos 1,2 s, met `v < 1,2` en de stilstaande auto binnen 9 m. (Zet `creepT` en `wait` op 0 zodat hij niet gaat doorkruipen.)
2. Achteruit: netjes 1,6 s met −1,6 m/s, roekeloos 1,0 s met −3 m/s; alleen als er achter hem binnen 7,5 m (zijwaarts 1,9 m) geen auto staat, en (netjes) geen voetganger binnen 5 m. Bestelbussen piepen (`fx('beep')`, 1040 Hz blokgolf, elke 0,6 s).
3. Eromheen: 5 s (roekeloos 3,5 s), zijdelingse verschuiving −2,7 m (linker rijstrook), snelheid 2,5–4,5 m/s (roekeloos tot 14). Netjes verkeer wacht eerst tot er geen tegenligger aankomt (cos(hoekverschil) < −0,5, 3 m achter tot 32 m voor, 0,8–5 m links); na 12 s wachten geeft hij het op. Pas terug als de stilstaande auto > 6,5 m achter hem is.
- In netjes verkeer wordt de zijwaartse verschuiving toegepast door de positie op de rijlijn `lo` meter opzij te zetten (`x −= sin(h)·lo, z += cos(h)·lo`); roekeloos via het stuurmodel.
- `c.v` mag alleen negatief zijn tijdens het achteruitrijden (ondergrens −3).
- Test: `node test/visueel/achteruit.js [roekeloos]` (zet drie auto's met een auto erachter stil, spoelt het verkeer vooruit met stappen van 0,05 s).

## 6. Bomen en voorwerpen nooit door wegen of gebouwen (`08c-modules-v2.js` `offSpot`)
Bomen, struiken, bankjes, prullenbakken, tafels, fietsenrekken en plantenbakken van een module op laag 0 worden weggelaten als:
- er een weg of stoep onder staat (`roadTop(x, z) !== null`), of
- een van zeven proefpunten (het punt zelf en zes punten op 2,3 m onder `k·60°`) in een vak van een **ander** gebouw ligt (module die niet begint met Park/Bos/Tuin/Grasveld/Plein/Water/Vlak/Parkeer/Rij/Afscheiding/Kade, of een klassiek blok dat geen park/water/pad/weg/laan/vlak is).
Komt er later een weg over een boom, dan wordt de module 0 s later opnieuw gebouwd (`setTimeout` na `buildPathNet`), zodat de boom verdwijnt; weg weg = boom terug.
Nog niet aangepast: de oude park- en padblokken en bomen in de middenberm van een laan.

## 7. Geluid (`13-camera-modus-geluid.js`, haken in `15f-geluid-haken.js`)
Alles behalve vogels (`vogels.mp3`), aanrijdingsklappen (`klap.mp3`) en kreunen (`grunts.mp3`) wordt gesynthetiseerd (Web Audio; in Unity: AudioSource met
gegenereerde AudioClips of korte samples). `fx(naam, x, y, z, sterkte)`; zonder positie "in je oor", met positie ruimtelijk (inverse afstand, refDistance 3–12 m).
Per naam een minimale tussentijd (ms) zodat het niet ratelt.

| naam | wanneer | klank |
|---|---|---|
| place | blok/module/weg geplaatst | sinus 210→120 Hz 0,13 s + driehoek 640→420 Hz + ruistik 2,6 kHz |
| rotate | gedraaid | driehoek 900→1200 Hz 0,05 s + hoge ruis |
| remove | gesloopt | bruine ruis lowpass 700→180 Hz 0,28 s + sinus 120→55 Hz + 5 gruistikjes 2,2–4,7 kHz |
| deny | kan niet | twee blokgolfjes 170 en 130 Hz |
| click | elke knop | sinus 1800→1500 Hz 0,03 s, zacht |
| undo | ongedaan | ruis bandpass 2600→500 Hz 0,22 s + sinus 660→330 |
| whoosh | wisselen bouwen ↔ lopen | ruis bandpass 350→1900 Hz 0,26 s |
| gen | nieuwe stad (start, generator, bestand) | zwiep + vijf tonen (C D E G A C D E – ladder zonder halve tonen: 261,6 293,7 329,6 392 440 523,3 587,3 659,3 Hz) 70 ms na elkaar |
| coin | schoonheidsscore gestegen | driehoek 880 Hz dan 1318,6 Hz |
| jump | springen | ruis 700→1500 Hz 0,12 s |
| door | deur gaat open (binnen 14 m van de camera) | zaagtand 95→150 Hz met vibrato 23 Hz door bandpass 1,1 kHz, 0,42 s + klik 3,2 kHz |
| squeal | roekeloos: dwarsversnelling `v²/L·tan δ > 6,5` bij v > 7, of remmen > 8 m/s² | ruis bandpass 1,9→1,5 kHz Q 14 + sinus 1150→980 Hz, 0,35–0,75 s, max elke 0,9 s per auto |
| crunch | auto's botsen (sterkte = impact/12) | bruine ruis lowpass 500→120 Hz + highpass ruis 1,4 kHz + vier scherpe resonanties 1,32/2,21/3,48/4,95 kHz + rinkelend glas bij sterkte > 0,5 |
| horn | inhalen, start van een jacht | twee zaagtanden 392 en 466 Hz lowpass 1,8 kHz, 0,35–0,65 s, minstens 0,8 s tussen claxons |
| beep | bestelbus achteruit | blokgolf 1040 Hz 0,16 s |
| cricket | 's nachts (`nightK > 0,45`), elke 0,4 s kans `0,5·nightK`, op 4–18 m afstand | drie sinus-tjirpjes 4,3–4,9 kHz, 55 ms uit elkaar; luider bij groen, stil bij regen |
| splash | (beschikbaar, nog niet aangeroepen) | ruis bandpass 1400→500 Hz 0,5 s + bruine plof |
| roar | de Hulk komt (0,6 s na de donder) | drie zaagtanden 68/71/102 Hz lowpass 700 Hz + bruine ruis, 1,1 s |

Haken voor bouwen/slopen: vóór en na `place`, `eraseAt`, `removeTop`, `walkAction` wordt de inhoud van de stad geteld (vakken + 7·modules + 13·wegen + 3·randen + 5·driehoeken);
meer = place, minder = remove, gelijk met toast "Gedraaid"/"Dak" = rotate, gelijk met toast "kan niet"/"geen"/"al een" = deny. Vogelkoor telt nu ook groene modules mee (Park/Bos/Tuin/Grasveld binnen 2 vakken, 2 punten per module).

## 8. Interface en telefoon (eerder in deze sessie, zie ook README "Interface: standen en telefoon")
- Drie handen in loopstand: kijken (bijna niets in beeld), bouwen (bouwgereedschap), hamer (toont wat je sloopt, label `#aimLbl`).
- Op de telefoon staat alles onderaan: handen links, ☰ menu midden, Bouwen/Lopen rechts; joystick en springknop erboven. Geen paginazoom (viewport `maximum-scale=1, user-scalable=no`, gesture-events geblokkeerd), `html, body { position: fixed; inset: 0 }`.
- Laadscherm: hexraster met een golf (zelfde stijl als `HexLoadingScreen.cs`: R = min(36, max(18, min(W,H)/11)) px, gap R/6, vertraging `afstand·0,005 − 0,785` s).
- Startstadje: rotonde met drie wegen, modulehuizen met de deur naar de straat, vijver van drie vakken, plein met fontein, rozentuin, speeltuin, bibliotheek; tweede rij parkmodules.

## 9. Open punten
- Unity: noord- en zuidpool op de bol (vraag staat open); `unity/README.md` is niet bijgewerkt sinds het planeet-wegensysteem.
- Web: modulehuizen hebben platte daken, blokhuizen rode kappen (keuze nog open); doorsluipjes kruisen elkaar soms; oude parkblokken en laanbomen houden nog geen rekening met wegen; water- en verkeerslichtgeluiden nog niet.
- Alles is getest in een headless browser (playwright, swiftshader); niets is op een echte telefoon nagekeken.

## Bestanden in de webversie
`08j-generator.js` generator · `08c-modules-v2.js` modules, wenteltrap, offSpot · `08e-modules-bibliotheek.js` modulebibliotheek, `stairwell` ·
`11-0-lowpoly-voertuigen.js` carrosserieën · `11-autos.js` rijgedrag, roekeloos, achteruit · `13-camera-modus-geluid.js` geluid · `15f-geluid-haken.js` haken ·
`test/visueel/{generator,voertuigen,roekeloos,achteruit,geluid}.js` tests.
