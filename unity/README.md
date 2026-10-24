# Raatstad in Unity — proefversie (wegen + wandelen)

Een eerste Unity-proef van de wegen uit de browserversie: hexraster op ware grootte (R = 9 m), wegen klikken en slepen,
vaste lagen van 3 m voor een gelaagd netwerk, en rondlopen in eerste persoon.

## Openen (Unity 6.6, pc)
De map `unity/` is een compleet Unity-project (Assets, Packages, ProjectSettings).
1. Haal de repo op (git clone of Download ZIP).
2. Unity Hub → **Add → Add project from disk** → kies de map `unity`.
3. Open `Assets/Scenes/SampleScene` en druk op **Play**.

Unity maakt `Library/`, `Temp/` en `Logs/` zelf; die staan niet in git (zie `.gitignore`). Er is geen scene-opbouw nodig:
   `Raatstad.cs` maakt grond, raster, licht, camera en gereedschap zelf aan.
4. Staat in de Console een fout over input? Ga naar *Edit → Project Settings → Player → Active Input Handling* en kies **Both**.

## Bediening
| Bouwen | |
|---|---|
| Klik op een vak | één vak vullen met een rondje; de volgende klik in een buurvak trekt de weg door |
| Vasthouden (>0,3 s) en slepen | rechte lijn onder een rasterhoek (30°-veelvouden: 60° en 90° bochten) |
| E / Q | laag omhoog / omlaag (hoogte = laag × 3 m, los van het terrein; hetzelfde als een modulelaag) |
| X | weg onder de muis weghalen · Ctrl+Z ongedaan maken |
| WASD, rechtermuis, scroll | camera · Shift = sneller |
| Tab | wisselen tussen bouwen en wandelen |

Wandelen: WASD, muis, Shift rennen, Spatie springen. Wegen op hogere lagen kun je op lopen.

## Wat erin zit en wat nog niet
- Hover toont de weg al alsof die er is (zelfde bouwcode als bij de klik) met één geel omlijnd vak.
- Een nieuwe weg sluit alleen aan op een andere weg langs een rasterrichting; kruisingen zijn stoep onder, asfalt erop.
- **Nog niet:** terrein, auto's, modules (JSON), opslaan, opritten tussen lagen, verkeerslichten/zebrapaden.

## Bestanden
`Hex.cs` raster · `RoadRules.cs` regels (klik, slepen, aansluiten, hoeken) · `RoadMesher.cs` meshes · `Builder.cs` invoer en camera ·
`Walker.cs` wandelaar · `Inp.cs` invoer (oud en nieuw Input System) · `Raatstad.cs` opstart.

## Wat er nu in zit
- Hexraster, wegen (klik/sleep, 30°-hoeken, lagen), blokken: woning, kantoor, park, gracht, meer, pad, dak, heuvel, blok; opslaan/laden (JSON)
- Eerste persoon wandelen (Tab), dag/nacht (N), mensen (lopen, groeten, praatjes), auto's, brabbeltaal (M = stem uit), spreekballonnen met kleur
- Toetsen: 1-9 gereedschap (klikbalk onderin heeft ze allemaal), X weghalen, Ctrl+Z ongedaan

## Planeet (standaard aan)
`Raatstad.PlanetMode = true` maakt de wereld een echte bol: een Goldberg-veelvlak van 21.162 vakken (21.150 zeshoeken en
12 vijfhoeken), straal 600 m, omtrek 3,8 km. Bouwen gaat per vak (een weg is ook een blok; wegvakken sluiten vanzelf
op elkaar aan), de camera schuift over de bol, en in wandelmodus wijst de zwaartekracht naar het middelpunt.
Zet `PlanetMode` op `false` voor het platte raster met getekende wegen.

## Op de planeet zit nu ook
- Slepen om te bouwen (en te gummen), drie opslagslots (knoppen rechtsonder)
- Meertjes met oevers, riet en water dat doorloopt naar buurmeren; uitgraving (3 m lager) en heuvel (3 m hoger)
- Geluid: vogels (`Assets/Resources/vogels.mp3`), wind, stadsruis, voetstappen; M = geluid aan/uit
- Schoonheidsscore linksonder (muis erop = de uitleg per onderdeel), blokken, hoogste punt, fps, pijl naar het centrum

- Weer (R: zon, bewolkt, regen, onweer, mist, sneeuw; anders wisselend), lantaarns die 's avonds aangaan, rotonde-eilandje op kruisingen,
  paden die op elkaar en op wegen aansluiten (mensen lopen er ook over), huizen in vier muurkleuren, autogezoem, H = naar het midden van de stad

## Controle zonder Unity
`stub/check.sh` compileert alle scripts met `mcs` tegen een kleine stub van de Unity-API (alleen compilefouten,
niet draaibaar); `stub/PlanetTest.cs` test de planeetgeometrie los van Unity.
