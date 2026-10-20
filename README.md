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
2. Eén wegsysteem (vectorlijnen) met verkeer; oude wegtools en tegelsleep weg
3. Modules als JSON-bestanden, exporteren en importeren
4. Randcodes op modules zodat ze automatisch op elkaar aansluiten; klikken op een weg wisselt de variant
