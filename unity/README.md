# Raatstad in Unity — proefversie (wegen + wandelen)

Een eerste Unity-proef van de wegen uit de browserversie: hexraster op ware grootte (R = 9 m), wegen klikken en slepen,
vaste lagen van 3 m voor een gelaagd netwerk, en rondlopen in eerste persoon.

## Openen (Unity 6.3 LTS, pc)
1. Unity Hub → **New project** → **3D (Universal Render Pipeline)**, naam bijv. `Raatstad`.
2. Kopieer de map `unity/Assets/Scripts` uit deze repo naar `Assets/` van je project.
3. Open een scene (de standaard `SampleScene` is goed) en druk op **Play**. Er is geen scene-opbouw nodig:
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
