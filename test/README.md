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
| `python sim3.py recht kruis T Y bocht60 laan kort` | verkeer en voetgangers op losse wegvormen: botsingen, vastlopers, NaN, vallende mensen |
| `python simcity.py sample ring` | idem op de voorbeeldstad en de ringstad |
| `python all.py` | laadt een stad met álle bouwonderdelen, controleert materialen, lopen en foutmeldingen |
| `python v2test.py` | module v2: een proefhuis bouwen, plaatsen, trap op lopen, muur blokkeert |
| `python mk_test.py` | de module maker: vloer, muren, deur, raam, trap, dak, opslaan, plaatsen |
| `python lib_test.py` | de honderd standaardmodules bouwen en plaatsen (screenshots in `out/`) |
| `python perf.py` / `prof.py` | tijd per geplaatst blok in een grote stad, profiel |
| `python close.py` | close-ups van kruisingen, bochten en wegeinden |
| `./mk.sh` | lint; maak eerst `all.js` (zie `mk.sh`) |

Screenshots en tussenbestanden komen in `test/out/` (niet in git).
