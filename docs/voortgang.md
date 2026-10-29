# Raatstad — voortgang (stand 29 oktober 2026)

Webversie: `joepk1989/raatstad` (GitHub Pages). Alles op zeshoeken en driehoeken; vak R = 9 m, verdieping 3 m.
Technische details per onderdeel: `claude/unity-overdracht-webversie.md` (§ 0–30) en de README.

## Klaar (laatste weken)
- **Winkelcentrum** · klein (7 vakken, 2 lagen) met galerijen, roltrap en wenteltrap; **generator** voor varianten (dobbelsteen bij de modules). Bibliotheek: 157 modules, allemaal nagekeken (bereikbaar, niets zwevend).
- **Palet**: tabbladen Wegen, Paden, Gebouwen, Groen en water, Terrein tonen hun eigen modules; pijlen en scrollwiel; Gebouwen in groepjes (Blokken, Bovenop).
- **Instorten / cameramodus**: dragende wanden, kanonskogel en sloopkogel (gaat door meerdere muren), deuren en treden breken los, vloertegels zijn dichte platen; haperingen verminderd.
- **Spoor**: tekenbaar dubbelspoor in twaalf raatrichtingen, loopt door tot voorbij de horizon; treinen (rechts rijden) stoppen bij een treinstation naast de lijn.
- **Terreinstap**: ophogen, afgraven en egaliseren per 3 m (instelling: 3 m, 1,5 m, vrij).
- **Gelaagde stad**:
  - Wegdek-modules (3, 6, 9 m; 1 of 7 vakken) en parkeergarages: een weg eroverheen ligt erop, met opritten (≤ 12 %).
  - Dakweg: begin het slepen op een plat dak (winkelcentrum, kantoor, flat) en de weg ligt over alle platte daken.
  - Module boven de weg: klik op een weg, de module komt op laag 2 (6 m) op zeshoekige poten; poten dragen bij instorten.
  - Trappenhuis-poot: een zeshoekige wenteltrap naar de deur van een zwevende module; mensen lopen hem op.
  - Een wegdek is grond: modules erop, en daken/dekken sluiten aan op de stoep van een dakweg.
- Kleine fixes: trapeinde volgt de driehoeken, hellingen niet meer doorzichtig (voetgangersbrug).

## Volgende stappen (voorstel)
1. Groene daken: park en groen direct op een plat dak; dakweg tussen groen door.
2. Laagweergave voor alles (wegen, dekken, poten) zodat je onder de dekken kunt bouwen.
3. Sfeer onder de dekken: licht tegen de pijlers, geparkeerde auto's, bussen.
4. Generator voor een gelaagde stad (ringweg op 6 m, huizen op poten, plein op een dek).
5. Daarna: mensen met een doel, Klif, tunnels voor auto's, rivieren.

## Open punten
- Deur van een module op een dek draait nog niet vanzelf naar het dek (zelf draaien met R).
- Een weg die je tijdens het slepen ophoogt krijgt een dichte wand, nog geen brugdek op pijlers.
- Treinen botsen nergens mee; geen brug of tunnel waar spoor en weg elkaar kruisen.
- Alles is getest in een headless browser (playwright, swiftshader), niet op een echte telefoon.
