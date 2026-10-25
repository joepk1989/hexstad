# Visuele tests (screenshots en overlapcontrole)

Deze scripts starten de gebouwde site in een headless Chromium en maken screenshots of meten de interface.

```
node build.js --site                       # in de hoofdmap: maakt site/index.html
cd test && npm i three@0.128.0 playwright  # eenmalig
node visueel/overlap-mobiel.js 390x844     # telefoon: overlap en buiten beeld, per stand (bouwmodus, kijken, bouwen, hamer)
node visueel/rotonde.js                    # rotonde en aansluiting van dichtbij
```

Standaard komen de beelden in `test/visueel/uit/` (niet in git); met `UIT=pad` kies je een andere map. Goede telefoonformaten om te controleren: 390x844, 360x640, 320x568 en liggend 844x390. Houd de bouw met `--site` aan: alleen die versie heeft de viewport-meta, zonder die toont de telefoonemulatie de pagina uitgezoomd.
Bewaarde screenshots van de ontwikkeling staan in `docs/ontwikkeling/`.
