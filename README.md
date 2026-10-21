# Hexstad

3D-stadsbouwer in de browser op een zeshoekraster, op ware grootte (vak 15,6 m breed, zijde 9 m). Gebouwd met three.js r128, zonder build-tools behalve één klein script.

## Werken aan de code

- `src/index.html` – de pagina (HUD, menu's, schets-app)
- `src/style.css` – alle stijlen
- `src/js/NN-naam.js` – de spellogica, in volgorde van nummer. Alle bestanden delen één scope (ze worden bij het bouwen achter elkaar in één functie gezet), dus `const R` uit `01-raster-data.js` is overal beschikbaar.
- `assets/` – geluiden

Bouwen:

```
node build.js
```

Dat maakt `dist/hexstad.html` (één bestand, zelfde als de gepubliceerde versie) en kopieert de geluiden ernaast. `dist/` staat niet in git.

## Opslag

Steden en modules staan in `localStorage` van de browser. Modules naar bestanden verhuizen staat op de lijst.

## Plan

1. ✅ Code in losse bestanden (zonder gedragswijziging)
2. Eén wegsysteem (vectorlijnen) met verkeer — gedaan: Weg, Brede weg en Laan als sleeptools (recht van beginpunt naar eindpunt), auto's en mensen erop, voordeuren sluiten erop aan, zandkleurige wegvakken die niet bebouwbaar zijn, wegen stoppen voor gebouwen; de vakwegen zijn uit het palet. Nog te doen: verkeerslichten op getekende kruisingen, de oude vakwegen uit de code
3. ✅ Modules als JSON-bestand exporteren en importeren (schets → Delen)
4. ✅ Randcodes op modules (automatisch afgeleid uit de tekening, zichtbaar in de schets); in de stad wisselt een klik op een geplaatste module naar de variant die op de buren past
5. Oude vakweg-, laan- en randwegcode verwijderen — stap a ✅: vakwegen en vak-lanen worden bij het laden automatisch getekende wegen (`convertCellRoads`, ook voor Ringstad en de voorbeeldstad); stap b: bruggen/tunnels, dan de oude code eruit
