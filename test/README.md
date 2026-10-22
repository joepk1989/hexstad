# Tests

Alles draait in een headless Chromium (Playwright) met software-rendering; de 3D-weergave wordt waar mogelijk uitgeschakeld voor snelheid.

Eenmalig:

```
cd test
pip install playwright && python -m playwright install chromium
npm init -y && npm i three@0.128.0 eslint@9
```

Eerst bouwen: `node build.js` in de hoofdmap. Daarna, vanuit `test/`:

| Script | Wat |
|---|---|
| `python sim3.py recht kruis T Y bocht60 laan kort lus acht rotonde snelweg klinker` | verkeer en voetgangers op losse wegvormen: botsingen, vastlopers, NaN, vallende mensen |
| `python simcity.py sample ring` | idem op de voorbeeldstad en de ringstad |
| `python all.py` | laadt een stad met álle bouwonderdelen, controleert materialen, lopen en foutmeldingen |
| `python wegen_beeld.py lus P acht blok rot snel snelx klinker kruis` | wegvormen: graaf (knopen/takken) en schermafbeeldingen (`DICHT=1` ook van dichtbij) |
| `python boetseer.py` | terrein boetseren met de muis (ophogen, Shift, helling, gladstrijken) en een weg erdoor; schermafbeeldingen |
| `python terr_bouw.py` | oude verhogingen worden terrein, een huis op een heuvel staat op de juiste hoogte, sokkels |
| `python terr_perf.py` | tijd van één boetseerstap (19 vakken) in een willekeurige stad |
| `python instellingen.py` | instellingenvenster: terrein hoog/normaal/low poly, schaduwen uit |
| `python lucht.py` | lucht en wolken op vijf tijden van de dag |
| `python v2test.py` | module v2: een proefhuis bouwen, plaatsen, trap op lopen, muur blokkeert |
| `python mm_raster.py` | module maker: het raster vult het hele gebied (1 en 7 vakken), plaatje van het tekenvlak |
| `python mm_3d.py` | module maker in 3D: standaardweergave, muur tekenen op een verdieping, verwijderen met twee klikken |
| `python mm_gevels.py` | toren met per verdieping een andere moderne gevel en vloer; schermafbeelding |
| `python mm_hoek.py [naam.png]` | muren die onder een hoek aansluiten, van dichtbij en van boven |
| `python bordes_test.py` | trap van hoek naar hoek in een woning: twee verdiepingen op lopen; doorsnede en beelden van binnen |
| `python mm_haaks.py` | module maker: muren onder 90° (rechthoekige kamer) |
| `python mod_namen.py [oude.html]` | modulenamen (hernoemen vanaf een oude versie, geen dubbele), zoeken, categorieën, maatfilters, , en . |
| `python lowpoly.py` | low poly terrein: los vak, groepje, dijk met een weg erlangs en eroverheen |
| `python mm_bordes.py` | module maker: bordestrap (U) tekenen met trapgat erboven, 3D-beeld |
| `python bordes_test.py` | huis: de bordestrap op lopen, bordes op 1,7 m en bovenverdieping op 3,2 m |
| `python mk_test.py` | de module maker: vloer, muren, deur, raam, trap, dak, opslaan, plaatsen |
| `python lib_test.py` | de honderd standaardmodules bouwen en plaatsen (screenshots in `out/`) |
| `python perf.py` / `prof.py` | tijd per geplaatst blok in een grote stad, profiel |
| `python close.py` | close-ups van kruisingen, bochten en wegeinden |
| `./mk.sh` | lint; maak eerst `all.js` (zie `mk.sh`) |

Screenshots en tussenbestanden komen in `test/out/` (niet in git).
