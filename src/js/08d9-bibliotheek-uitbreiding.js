  // ---------- Bibliotheek, uitbreiding (lib10): 35 basisgebouwen die nog ontbraken (staat vóór 08e: de hulpjes hieronder moeten klaar zijn als 08e bij het laden de bibliotheek installeert) ----------
  // Voorzieningen (tankstation, laadplein, trafohuisje, zonnepark, windmolen, watertoren, waterzuivering, milieustraat),
  // openbaar (huisarts, apotheek, kinderopvang, kleine school, zwembad, theater, bioscoop, begraafplaats, bus- en tramhalte),
  // sport en buiten (sportveld, kinderboerderij, haven, woonboot), wonen (galerijflat, portiekflat, boerderij, zorgcomplex,
  // studentenhuis), werken en winkels (garage, bouwmarkt, tuincentrum, snackbar, datacenter, laboratorium) en verbindingen
  // (glazen trappenhuis, roltrap). Eerst de basis (vloeren, muren, verdiepingen, trappen), de inrichting komt in libExtraDetails.
  // Zijden van ring()/cellRing(): zijde s heeft zijn normaal op 60° + 60°·s (zijde 5 kijkt naar +x); de buur over zijde s is NB_S[s].
  const NB_S = [[0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 0]];
  function libExtra(add) {
    const ts = 2.25, vAt = (x, z) => { const fi = x / (ts * SQ3 / 2), fj = z / ts - fi / 2; return [Math.round(fi), Math.round(fj)]; };
    const inHex6 = (x, z, rad, cx = 0, cz = 0) => { for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; if ((x - cx) * Math.cos(a) + (z - cz) * Math.sin(a) > rad * SQ3 / 2 + 1e-6) return false; } return true; };
    const sideTo = (cx, cz) => (Math.round(Math.atan2(-cz, -cx) / (Math.PI / 3)) + 5 + 12) % 6;   // zijde van een vak die naar het midden kijkt
    const areaOf = k => { const out = []; for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) out.push([q, r]); return out; };
    // afscheiding langs de buitenrand van het hele gebied (haag of hek), met poorten: [[q, r, zijde, opening]]
    const edgeRing = (b, k, mat, gates = []) => { for (const [q, r] of areaOf(k)) { const sides = [], open = {}; for (let s = 0; s < 6; s++) if (mv2HexDist(q + NB_S[s][0], r + NB_S[s][1]) > k) sides.push(s); for (const [gq, gr, gs, go] of gates) if (gq === q && gr === r) open[gs] = go; if (sides.length) b.cellRing(0, q, r, mat, { sides, open }); } };
    // trap van 1,95 m in de band van 1,95 m langs de rand (zoals in trappen.dae): A langs de linkerzijde omlaag, B langs de rechterzijde omhoog
    const bandStair = (b, li, which, kind = 'stair') => b.m.lv[li].s.push(which === 'A' ? { a: vAt(-5.846, 3.375), d: 4, n: 3, w: 1.95, k: kind, off: -0.975 } : { a: vAt(5.846, -3.375), d: 1, n: 3, w: 1.95, k: kind, off: -0.975 });
    // een gebouw van een heel vak met f verdiepingen (zoals de woningen): deur aan zijde 0, wenteltrap achterin, plat dak
    const tower = (b, floors, mat, opts = {}) => {
      for (let f = 0; f < floors; f++) { b.cell(f, 0, 0, f ? (opts.up || 'wood') : (opts.ground || 'tile')); b.cellRing(f, 0, 0, mat, { open: f ? {} : (opts.open || { 0: 'door' }), win: opts.win ?? 2 }); }
      b.cell(floors, 0, 0, 'concrete'); if (floors > 1) b.stairwell(floors, 0, 6.75, 3, 3, 1.2); return b;
    };
    const V = 'Voorzieningen';
    // ---------- Voorzieningen ----------
    { const b = libBuilder('Tankstation · luifel', V); b.cell(0, 0, 0, 'asphalt');
      b.hex(0, -3.897, 0, 4.5, 'tile'); b.ring(0, -3.897, 0, 4.5, 'panel', { sides: [0, 1, 2, 3, 4], win: 2 }); b.ring(0, -3.897, 0, 4.5, 'glass', { sides: [5], open: { 5: 'door' } }); b.hex(1, -3.897, 0, 4.5, 'concrete');
      b.where(1, (x, z) => x > 1.2 && Math.abs(z) < 5.4 && inHex6(x, z, 8.6), 'concrete');   // luifel boven de pompen
      for (const [x, z] of [[2.2, 4.4], [2.2, -4.4], [6.4, 2.2], [6.4, -2.2]]) b.obj(0, 'pillar', x, z);
      libExtraDetails(b, 'tankstation'); add(b); }
    { const b = libBuilder('Laadplein · zonnedak', V); b.cell(0, 0, 0, 'asphalt');
      b.where(1, (x, z) => Math.abs(z) < 4.9 && Math.abs(x) < 6.2, 'concrete');   // overkapping met zonnepanelen
      for (const [x, z] of [[-5.2, 4.2], [0, 4.2], [5.2, 4.2], [-5.2, -4.2], [0, -4.2], [5.2, -4.2]]) b.obj(0, 'pillar', x, z);
      libExtraDetails(b, 'laadplein'); add(b); }
    { const b = libBuilder('Trafohuisje · baksteen', V); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 2.25, 'concrete').ring(0, 0, 0, 2.25, 'brick', { open: { 0: 'door' } }).hex(1, 0, 0, 2.25, 'concrete'); b.cellRing(0, 0, 0, 'fence', { open: { 0: 'gate' } }); libExtraDetails(b, 'trafo'); add(b); }
    { const b = libBuilder('Zonnepark · panelen', V); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'fence', { open: { 5: 'gate' } }); libExtraDetails(b, 'zonnepark'); add(b); }
    { const b = libBuilder('Windmolen · modern', V); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 2.25, 'concrete'); libExtraDetails(b, 'windmolen'); add(b); }
    { const b = libBuilder('Watertoren · baksteen', V); b.cell(0, 0, 0, 'grass');
      for (let f = 0; f < 6; f++) { b.hex(f, 0, 0, 4.5, f ? 'wood' : 'tile'); b.ring(f, 0, 0, 4.5, 'brick', { open: f ? {} : { 0: 'door' }, win: f % 2 ? 1 : 0 }); b.stairUp(f, 0, 0, 0, 1, 1.5, 'spiral'); }
      for (const f of [6, 7]) { b.hex(f, 0, 0, 6.75, f === 6 ? 'concrete' : 'wood'); b.ring(f, 0, 0, 6.75, 'corten', { win: f === 7 ? 3 : 0 }); }
      b.stairUp(6, 0, 0, 0, 1, 1.5, 'spiral'); b.hex(8, 0, 0, 6.75, 'concrete'); libExtraDetails(b, 'watertoren'); add(b); }
    { const b = libBuilder('Waterzuivering · bekkens', V, 1); b.all(0, 'asphalt');
      for (const [q, r] of [[1, 0], [-1, 1], [0, -1]]) { const c = mv2CellXZ(q, r); b.hex(0, c[0], c[1], 6.75, 'water'); b.ring(0, c[0], c[1], 6.75, 'fence'); }
      b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'concrete', { open: { 0: 'door', 3: 'door' }, win: 3 }).cell(1, 0, 0, 'concrete'); libExtraDetails(b, 'waterzuivering'); add(b); }
    { const b = libBuilder('Milieustraat · containers', V); b.cell(0, 0, 0, 'asphalt').hex(0, -3.897, 0, 2.25, 'tile').ring(0, -3.897, 0, 2.25, 'wood', { open: { 5: 'door' } }).hex(1, -3.897, 0, 2.25, 'concrete'); b.cellRing(0, 0, 0, 'fence', { open: { 5: 'gate' } }); libExtraDetails(b, 'milieustraat'); add(b); }
    // ---------- Openbaar ----------
    { const b = libBuilder('Huisarts · wit', 'Openbaar'); tower(b, 2, 'plaster', { up: 'carpet' }); libExtraDetails(b, 'huisarts'); add(b); }
    { const b = libBuilder('Apotheek · wit', 'Openbaar'); b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'plaster', { sides: [1, 2, 3, 4, 5], win: 3 }).cellRing(0, 0, 0, 'glass', { sides: [0], open: { 0: 'door' } }).cell(1, 0, 0, 'concrete'); libExtraDetails(b, 'apotheek'); add(b); }
    { const b = libBuilder('Kinderopvang · hout', 'Openbaar'); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 6.75, 'wood').ring(0, 0, 0, 6.75, 'wood', { open: { 0: 'door' }, win: 2 }).hex(1, 0, 0, 6.75, 'concrete'); b.cellRing(0, 0, 0, 'fence', { open: { 0: 'gate' } }); libExtraDetails(b, 'kinderopvang'); add(b); }
    { const b = libBuilder('School · hout', 'Openbaar'); tower(b, 2, 'slats', { up: 'carpet' }); libExtraDetails(b, 'school'); add(b); }
    { const b = libBuilder('Zwembad · overdekt', 'Openbaar', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 15.75, 'tile'); b.ring(0, 0, 0, 15.75, 'glass', { open: { 0: 'gate' } });
      b.where(0, (x, z) => Math.abs(z) < 4.6 && Math.abs(x) < 9.8, 'water'); b.hex(1, 0, 0, 15.75, 'glass'); libExtraDetails(b, 'zwembad'); add(b); }
    // theater en bioscoop: hal van twee lagen hoog met een tribune die oploopt naar een balkon achterin
    const hall = (name, mat, win, key) => {
      const b = libBuilder(name, 'Openbaar'), A = [3.897, 2.25], u = [Math.cos(Math.PI * 7 / 6), Math.sin(Math.PI * 7 / 6)];
      b.cell(0, 0, 0, 'stonetile'); b.cellRing(0, 0, 0, mat, { open: { 5: 'gate' }, win: 0 });
      b.m.lv[0].s.push({ a: vAt(...A), d: 3, n: 3, w: 3.9, k: 'trib' });
      b.where(1, (x, z) => (x - A[0]) * u[0] + (z - A[1]) * u[1] > 6.6, 'wood'); b.cellRing(1, 0, 0, mat, { win }); b.cell(2, 0, 0, 'concrete');
      libExtraDetails(b, key); add(b);
    };
    hall('Theater · natuursteen', 'stone', 2, 'theater');
    hall('Bioscoop · zalen', 'darkbrick', 0, 'bioscoop');
    { const b = libBuilder('Begraafplaats · bomen', 'Groen', 1); b.all(0, 'grass'); b.where(0, (x, z) => Math.abs(x - 0.974) < 0.7 || Math.abs(-0.5 * x + SQ3 / 2 * z - 0.974) < 0.7, 'paver');   /* paden langs het raster (90° en 30°): rechte randen */
      b.hex(0, -15.588, 0, 4.5, 'stonetile').ring(0, -15.588, 0, 4.5, 'stone', { open: { 5: 'door' }, win: 1 }).hex(1, -15.588, 0, 4.5, 'concrete');   // kapel
      edgeRing(b, 1, 'hedge', [[1, 0, 5, 'gate']]); libExtraDetails(b, 'begraafplaats'); add(b); }
    { const b = libBuilder('Vervoer · bushalte', 'Openbaar'); b.cell(0, 0, 0, 'paver').where(0, (x, z) => x > 3.9, 'tile'); libExtraDetails(b, 'bushalte'); add(b); }
    { const b = libBuilder('Vervoer · tramhalte', 'Openbaar'); b.cell(0, 0, 0, 'paver').where(0, (x, z) => Math.abs(x) < 2.4, 'tile'); libExtraDetails(b, 'tramhalte'); add(b); }
    // ---------- Sport en buiten ----------
    { const b = libBuilder('Sportveld · voetbal', 'Openbaar', 1); b.all(0, 'grass');
      b.hex(0, -15.588, 0, 4.5, 'tile').ring(0, -15.588, 0, 4.5, 'concrete', { open: { 5: 'door' }, win: 2 }).hex(1, -15.588, 0, 4.5, 'concrete');   // kleedkamers
      edgeRing(b, 1, 'fence', [[-1, 0, 2, 'gate'], [1, 0, 5, 'gate']]); libExtraDetails(b, 'sportveld'); add(b); }
    { const b = libBuilder('Kinderboerderij · schuur', 'Groen', 1); b.all(0, 'grass'); b.cell(0, 0, 0, 'paver');
      b.cellRing(0, 0, 0, 'wood', { open: { 5: 'gate', 2: 'gate' }, win: 2 }); b.roof(0, 0, 0, 'hip');
      for (const [q, r] of [[0, 1], [-1, 1], [0, -1], [1, -1]]) { const c = mv2CellXZ(q, r); b.cellRing(0, q, r, 'fence', { open: { [sideTo(c[0], c[1])]: 'gate' } }); }
      edgeRing(b, 1, 'hedge', [[1, 0, 5, 'open'], [-1, 0, 2, 'open']]); libExtraDetails(b, 'kinderboerderij'); add(b); }
    { const b = libBuilder('Haven · steiger', 'Pleinen'); b.cell(0, 0, 0, 'water').where(0, (x, z) => x < -5.85, 'paver').where(0, (x, z) => Math.abs(-0.5 * x + SQ3 / 2 * z - 0.974) < 0.7 && x >= -5.85, 'wood');   /* kade langs zijde 2, steiger schuin (30°) langs een rij driehoeken */ libExtraDetails(b, 'haven'); add(b); }
    { const b = libBuilder('Woonboot · hout', 'Wonen'); b.cell(0, 0, 0, 'water').hex(0, 0, 0, 6.75, 'wood').where(0, (x, z) => Math.abs(-0.5 * x + SQ3 / 2 * z - 0.974) < 0.7 && x > 0, 'wood');
      b.ring(0, 0, 0, 4.5, 'wood', { open: { 5: 'door' }, win: 1 }).hex(1, 0, 0, 4.5, 'concrete'); libExtraDetails(b, 'woonboot'); add(b); }
    // ---------- Wonen ----------
    { const b = libBuilder('Flat · galerij', 'Wonen');
      for (let f = 0; f < 5; f++) { b.where(f, (x, z) => !inHex6(x, z, 6.75), f ? 'concrete' : 'tile'); b.hex(f, 0, 0, 6.75, f ? 'wood' : 'tile'); b.ring(f, 0, 0, 6.75, 'concrete', { open: { 0: 'door', 2: 'door', 4: 'door' }, win: 3 }); if (f) b.cellRing(f, 0, 0, 'fence'); if (f < 4) bandStair(b, f, f % 2 ? 'B' : 'A'); }
      b.cell(5, 0, 0, 'concrete'); libExtraDetails(b, 'galerijflat'); add(b); }
    { const b = libBuilder('Flat · portiek', 'Wonen'); tower(b, 4, 'darkbrick'); libExtraDetails(b, 'portiekflat'); add(b); }
    { const b = libBuilder('Studentenhuis · panelen', 'Wonen'); tower(b, 4, 'panel', { win: 1 }); libExtraDetails(b, 'studentenhuis'); add(b); }
    { const b = libBuilder('Boerderij · schuur', 'Wonen', 1); b.all(0, 'grass'); b.cell(0, 1, 0, 'paver');
      for (let f = 0; f < 2; f++) { b.cell(f, 0, 0, f ? 'wood' : 'tile'); b.cellRing(f, 0, 0, 'brick', { open: f ? {} : { 5: 'door', 2: 'door' }, win: 2 }); } b.roof(1, 0, 0, 'hip'); b.stairwell(2, 0, 6.75, 3, 3, 1.2);   // woonhuis
      b.cell(0, -1, 0, 'concrete'); b.cellRing(0, -1, 0, 'wood', { open: { 5: 'gate', 2: 'gate' }, win: 0 }); b.roof(0, -1, 0, 'hip');   // schuur
      for (const [q, r] of [[0, 1], [-1, 1]]) { const c = mv2CellXZ(q, r); b.cellRing(0, q, r, 'fence', { open: { [sideTo(c[0], c[1])]: 'gate' } }); }   // weides
      libExtraDetails(b, 'boerderij'); add(b); }
    { const b = libBuilder('Zorgcomplex · tuin', 'Wonen', 1); b.all(0, 'grass'); b.hex(0, 0, 0, 4.5, 'paver');
      for (const [q, r] of areaOf(1)) { if (!q && !r) continue; const c = mv2CellXZ(q, r), st = sideTo(c[0], c[1]);
        for (let f = 0; f < 3; f++) { b.cell(f, q, r, f ? 'carpet' : 'tile'); b.cellRing(f, q, r, 'plaster', { open: f ? {} : { [st]: 'door', [(st + 3) % 6]: 'door' }, win: 2 }); }
        b.cell(3, q, r, 'concrete'); b.stairwell(3, c[0], c[1] + 6.75, 3, 3, 1.2, c); }
      libExtraDetails(b, 'zorgcomplex'); add(b); }
    // ---------- Werken en winkels ----------
    { const b = libBuilder('Garage · autobedrijf', 'Werken'); b.cell(0, 0, 0, 'concrete').cellRing(0, 0, 0, 'concrete', { open: { 5: [['gate', 1], ['gate', 2]], 2: 'door' }, win: 3 }).cell(1, 0, 0, 'concrete'); libExtraDetails(b, 'garage'); add(b); }
    { const b = libBuilder('Bouwmarkt · hal', 'Winkels', 1); b.all(0, 'asphalt'); b.hex(0, 0, 0, 15.75, 'polished'); b.ring(0, 0, 0, 15.75, 'corten', { sides: [1, 2, 3, 4, 5], win: 0 }).ring(0, 0, 0, 15.75, 'glass', { sides: [0], open: { 0: 'gate' } }); b.hex(1, 0, 0, 15.75, 'concrete'); libExtraDetails(b, 'bouwmarkt'); add(b); }
    { const b = libBuilder('Tuincentrum · kas', 'Winkels', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 15.75, 'tile'); b.ring(0, 0, 0, 15.75, 'glass', { open: { 0: 'gate', 3: 'gate' } }); b.hex(1, 0, 0, 15.75, 'glass'); libExtraDetails(b, 'tuincentrum'); add(b); }
    { const b = libBuilder('Snackbar · frituur', 'Winkels'); b.cell(0, 0, 0, 'paver').hex(0, 0, 0, 4.5, 'tile').ring(0, 0, 0, 4.5, 'plaster', { open: { 0: 'door', 5: 'window', 1: 'window' } }).hex(1, 0, 0, 4.5, 'concrete'); libExtraDetails(b, 'snackbar'); add(b); }
    { const b = libBuilder('Datacenter · gesloten', 'Werken'); b.cell(0, 0, 0, 'asphalt');
      for (let f = 0; f < 2; f++) { b.hex(f, 0, 0, 6.75, f ? 'concrete' : 'polished'); b.ring(f, 0, 0, 6.75, 'panel', { open: f ? {} : { 0: 'door' }, win: 0 }); } b.hex(2, 0, 0, 6.75, 'concrete'); b.stairwell(2, 0, 4.5, 3, 2, 1.2);
      b.cellRing(0, 0, 0, 'fence', { open: { 0: 'gate' } }); libExtraDetails(b, 'datacenter'); add(b); }
    { const b = libBuilder('Laboratorium · glas', 'Werken'); tower(b, 3, 'curtain', { up: 'polished', ground: 'polished', win: 0 }); libExtraDetails(b, 'laboratorium'); add(b); }
    // ---------- Verbindingen ----------
    { const b = libBuilder('Trappenhuis · glas', 'Verbindingen'); b.cell(0, 0, 0, 'paver');
      for (let f = 0; f < 4; f++) { b.hex(f, 0, 0, 4.5, f ? 'concrete' : 'tile'); b.ring(f, 0, 0, 4.5, 'glass', { open: f ? {} : { 0: 'door' } }); b.stairUp(f, 0, 0, 0, 1, 1.5, 'spiral'); }
      b.hex(4, 0, 0, 4.5, 'concrete').ring(4, 0, 0, 4.5, 'fence'); libExtraDetails(b, 'trappenhuis'); add(b); }
    { const b = libBuilder('Roltrap · glas', 'Verbindingen'); b.cell(0, 0, 0, 'polished').cell(1, 0, 0, 'polished'); bandStair(b, 0, 'A', 'esc'); b.cellRing(1, 0, 0, 'fence'); libExtraDetails(b, 'roltrap'); add(b); }
  }
  // ---------- Tweede ronde: inrichting en bijzonderheden ----------
  // Hulpjes: een voorwerp tegen een muur van een zeshoek (apothema ap, muur met de normaal op deg graden), voorkant naar binnen;
  // een bed met het hoofdeinde tegen de muur; een woonlaag (keuken, tafel, bank, bed, bureau) op hoeken die vrij zijn van de deur en de trap.
  const D2R = Math.PI / 180, AP_CELL = 7.62, AP_34 = 5.7, AP_HALF = 3.75;
  const wSpot = (ap, deg, inset, along = 0, cx = 0, cz = 0) => { const a = deg * D2R, r = ap - inset; return [cx + Math.cos(a) * r - Math.sin(a) * along, cz + Math.sin(a) * r + Math.cos(a) * along]; };
  const atWall = (b, li, t, ap, deg, inset, along = 0, cx = 0, cz = 0) => { const [x, z] = wSpot(ap, deg, inset, along, cx, cz); b.obj(li, t, x, z, deg * D2R + Math.PI / 2); return b; };
  const bedAt = (b, li, ap, deg, cx = 0, cz = 0) => { const [x, z] = wSpot(ap, deg, 1.05, 0, cx, cz); b.obj(li, 'bed', x, z, deg * D2R + Math.PI); return b; };
  const angFree = (avoid) => [240, 180, 300, 0, 120, 60].filter(a => avoid.every(v => Math.abs(((a - v + 540) % 360) - 180) >= 40));
  // kind: 'beneden' (keuken, tafel, bank), 'boven' (bedden, bureau), 'woning' (alles op één laag); avoid: hoeken (graden) van deur(en) en trap
  function home(b, li, ap, kind, cx = 0, cz = 0, avoid = [60, 90]) {
    const A = angFree(avoid), s = ap / AP_CELL; if (A.length < 3) return;
    if (kind !== 'boven') { atWall(b, li, 'kitchen', ap, A[0], 0.37, 0, cx, cz); atWall(b, li, 'sofa', ap, A[1], 0.5, 0, cx, cz); const t = wSpot(ap, (A[0] + A[1]) / 2 + (Math.abs(A[0] - A[1]) > 180 ? 180 : 0), 3.6 * s + 1.2, 0, cx, cz); b.obj(li, 'table', t[0], t[1]); }
    if (kind !== 'beneden') bedAt(b, li, ap, A[2], cx, cz);
    if (kind === 'boven') { if (ap > 6 && A[3] !== undefined) bedAt(b, li, ap, A[3], cx, cz); atWall(b, li, 'desk', ap, A[0], 0.45, 0, cx, cz); }
  }
  function officeFloor(b, li, s = 1, cx = 0, cz = 0) { for (const [x, z] of [[-3.8, -0.8], [-3.6, -3.4], [0, -3.8], [3.4, -3.4], [4.2, -0.6]]) b.obj(li, 'desk', cx + x * s, cz + z * s); }
  function shopFloor(b, li, ap, cx = 0, cz = 0) { atWall(b, li, 'counter', ap, 240, 0.45, 0, cx, cz); atWall(b, li, 'shelf', ap, 180, 0.3, 0, cx, cz); atWall(b, li, 'shelf', ap, 300, 0.3, 0, cx, cz); }
  function solarRoof(b, li, rad, cx = 0, cz = 0) { for (let x = -rad; x <= rad; x += 3.8) for (let z = -rad; z <= rad; z += 2.3) { const ok = [[-1.8, -0.9], [1.8, -0.9], [-1.8, 0.9], [1.8, 0.9]].every(([dx, dz]) => { const px = x + dx, pz = z + dz; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; if (px * Math.cos(a) + pz * Math.sin(a) > (rad - 0.6) * SQ3 / 2) return false; } return true; }); if (ok) b.obj(li, 'solar', cx + x, cz + z); } }
  const lvls = b => b.m.lv.map((L, i) => i).filter(i => Object.keys(b.m.lv[i].w).length);   // lagen met muren (de verdiepingen)
  // Voorwerpen die bij een trap staan (instap, uitstap, de baan van de trap of het gat erboven) weghalen: anders kun je de trap niet op
  function pruneNearStairs(b) {
    const m = b.m, ts = 2.25;
    m.lv.forEach((L, li) => { const S = [...(L.s || []).map(s => [s, 0]), ...((m.lv[li - 1] || {}).s || []).map(s => [s, 1])]; if (!S.length || !L.o.length) return;
      L.o = L.o.filter(o => !S.some(([St, up]) => { if (St.k === 'hexramp' || St.k === 'trib') return false; const a = mv2P(St.a[0], St.a[1], ts);
        if (St.k === 'spiral') return Math.hypot(o.x - a[0], o.z - a[1]) < 3.1;
        const D = MV2.DIR6[St.d] || MV2.DIR6[0], dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl, len = (St.n || 1) * ts, w = St.w || 1.2, off = St.off || 0;
        const cx = o.x - a[0], cz = o.z - a[1], al = cx * ux + cz * uz, lat = cx * -uz + cz * ux - off, wide = St.k === 'u' ? (St.side || 1) * w : 0, lo = Math.min(0, wide) - w / 2 - 0.9, hi = Math.max(0, wide) + w / 2 + 0.9;
        return lat > lo && lat < hi && (up ? al > 0.2 * len && al < len + 2.2 : al > -2.0 && al < len + 0.5); })); });
  }
  // ---- bestaande modules (lib10): inrichting erbij, op naam (de naam in de bouwcode) ----
  function libOldDetails(b) {
    const nm = b.m.name, L = lvls(b), top = b.m.lv.length - 1;
    if (/^(Rijtjeshuis|Stadswoning|Herenhuis)/.test(nm)) { for (const li of L) home(b, li, AP_CELL, li ? 'boven' : 'beneden'); return; }
    if (/^(Bungalow|Studio plat dak)$/.test(nm)) { home(b, 0, AP_CELL, 'woning'); if (nm === 'Studio plat dak') solarRoof(b, top, 9); return; }
    if (/^(Appartementen|Woontoren)/.test(nm)) { for (const li of L) { if (li) home(b, li, AP_CELL, 'woning'); else { atWall(b, 0, 'sofa', AP_CELL, 180, 0.5); b.obj(0, 'planter', -3.4, -4.2).obj(0, 'bike', 2.6, -4.8, -Math.PI / 6); } } return; }
    if (/^(Villa|Stadsvilla)/.test(nm)) { for (const li of L) home(b, li, AP_34, li ? 'boven' : 'beneden'); return; }
    if (/^(Bungalow met tuin|Tuinhuis)$/.test(nm)) { home(b, 0, AP_34, 'woning'); return; }
    if (nm === 'Patiowoning') { home(b, 0, AP_CELL, 'woning'); b.m.lv[0].o = b.m.lv[0].o.filter(o => o.t !== 'table'); b.obj(0, 'table', 4.4, -1.6); return; }
    if (nm === 'Woonerf 7 huizen') { for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (mv2HexDist(q, r) === 1) { const c = mv2CellXZ(q, r), door = Math.atan2(-c[1], -c[0]) / D2R; for (let f = 0; f < 2; f++) home(b, f, AP_34, f ? 'boven' : 'beneden', c[0], c[1], [door, 90]); } return; }
    if (nm === 'Hofje met 6 woningen') { for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (mv2HexDist(q, r) === 1) { const c = mv2CellXZ(q, r), door = Math.atan2(-c[1], -c[0]) / D2R; home(b, 0, AP_CELL, 'beneden', c[0], c[1], [door, door + 180, 90]); home(b, 1, AP_CELL, 'boven', c[0], c[1], [90]); } return; }
    if (/^Kantoor/.test(nm)) { for (const li of L) { if (li) officeFloor(b, li); else { atWall(b, 0, 'counter', AP_CELL, 240, 0.45); atWall(b, 0, 'sofa', AP_CELL, 180, 0.5); b.obj(0, 'planter', 3.2, -3.6); } } if (/beton/.test(nm)) solarRoof(b, top, 9); return; }
    if (nm === 'Werkplaats') { b.obj(0, 'car', 2.4, -2.4); atWall(b, 0, 'shelf', AP_CELL, 180, 0.3); atWall(b, 0, 'counter', AP_CELL, 240, 0.45); solarRoof(b, top, 9); return; }
    if (nm === 'Bedrijfshal') { b.circle(0, 'shelf', 0, 0, 8.5, 6, Math.PI / 6); b.obj(0, 'container', -4, 2, Math.PI / 2).obj(0, 'container', -1.6, 2, Math.PI / 2).obj(0, 'car', 3.5, -1); solarRoof(b, top, 15.75); return; }
    if (nm === 'Fabriek met schoorsteen') { b.obj(0, 'chimney', -9.5, 16.5).obj(0, 'container', 17.5, 5, Math.PI / 2).obj(0, 'container', 17.5, -5, Math.PI / 2); b.circle(0, 'shelf', 0, 0, 8, 6); officeFloor(b, 1, 1.4); return; }
    if (nm === 'Parkeergarage 2 lagen') { b.obj(0, 'car', 2.8, 0, Math.PI / 2).obj(0, 'car', -5.6, 0, Math.PI / 2); b.obj(1, 'car', 3.6, 0.2, Math.PI / 2).obj(1, 'car', -5.6, -0.4, Math.PI / 2).obj(1, 'car', 0.4, -6.3); return; }
    if (nm === 'Loods open') { b.obj(0, 'container', 1.8, -1.6).obj(0, 'container', 1.8, 1.0).obj(0, 'car', -2.6, -0.6, Math.PI / 2); return; }
    if (/^(Winkel met|Bakkerij|Boetiek)/.test(nm)) { shopFloor(b, 0, AP_CELL); for (const li of L) if (li) home(b, li, AP_CELL, 'boven'); return; }
    if (/^(Café met terras|Restaurant)$/.test(nm)) { atWall(b, 0, 'counter', AP_34, 240, 0.45); b.obj(0, 'table', -1.4, -1.6).obj(0, 'table', -2.4, 1.2); for (const li of L) if (li) home(b, li, AP_34, 'woning'); return; }
    if (nm === 'Hotel 4 lagen') { atWall(b, 0, 'counter', AP_CELL, 240, 0.45); atWall(b, 0, 'sofa', AP_CELL, 180, 0.5); atWall(b, 0, 'sofa', AP_CELL, 300, 0.5); for (const li of L) if (li) { bedAt(b, li, AP_CELL, 240); bedAt(b, li, AP_CELL, 300); bedAt(b, li, AP_CELL, 180); } return; }
    if (nm === 'Supermarkt') { for (const z of [-6.5, -3.5, -0.5, 2.5]) for (const x of [-7, -3.5, 0]) b.obj(0, 'shelf', x, z); b.obj(0, 'counter', 5.5, 6.5, Math.PI / 6).obj(0, 'counter', 8.5, 4.8, Math.PI / 6); b.obj(0, 'car', 19.5, 5, Math.PI / 2).obj(0, 'car', -19.5, -5, Math.PI / 2); solarRoof(b, top, 15.75); return; }
    if (nm === 'Winkelpassage') { atWall(b, 0, 'shelf', AP_CELL, 180, 0.3); atWall(b, 0, 'shelf', AP_CELL, 0, 0.3); atWall(b, 0, 'shelf', AP_CELL, 120, 0.3, 0); atWall(b, 0, 'shelf', AP_CELL, 300, 0.3); officeFloor(b, 1); return; }
    if (nm === 'Basisschool') { for (const li of [0, 1]) { b.circle(li, 'desk', 0, 0, 5.5, 6, Math.PI / 6); b.circle(li, 'desk', 0, 0, 10, 8, 0.2); } solarRoof(b, top, 15.75); return; }
    if (nm === 'Gemeentehuis') { b.obj(0, 'counter', 4, 4, Math.PI / 6).obj(0, 'counter', -4, -4, Math.PI / 6); b.circle(0, 'sofa', 0, 0, 8, 3, 0.4); for (const li of [1, 2]) b.circle(li, 'desk', 0, 0, 7, 8, 0.2); return; }
    if (nm === 'Kerk met toren') { const ax = [Math.cos(60 * D2R), Math.sin(60 * D2R)], tg = [-ax[1], ax[0]]; for (let t = -3; t <= 3; t += 1.5) for (const l of [-1.7, 1.7]) { const x = ax[0] * t + tg[0] * l, z = ax[1] * t + tg[1] * l; if (Math.hypot(x + 3.897, z) > 2.9) b.obj(0, 'bench', x, z, 150 * D2R); } b.obj(0, 'counter', -2.8, -4.85, 150 * D2R); return; }
    if (nm === 'Ziekenhuis') { b.obj(0, 'counter', 5, 5, Math.PI / 6); b.circle(0, 'sofa', 0, 0, 7.5, 3, 0.5); for (const li of [1, 2, 3]) b.circle(li, 'bed', 0, 0, 9, 8, 0.2); return; }
    if (nm === 'Museum') { b.circle(0, 'bench', 0, 0, 6, 3, 0.5); b.circle(0, 'planter', 0, 0, 10, 6, 0.3); b.circle(1, 'bench', 0, 0, 6, 3, 1.2); return; }
    if (nm === 'Sporthal') { b.obj(0, 'goal', -10.5, 0, -Math.PI / 2).obj(0, 'goal', 10.5, 0, Math.PI / 2); b.obj(0, 'bench', 0, 9.5).obj(0, 'bench', 0, -9.5); solarRoof(b, top, 15.75); return; }
    if (nm === 'Brandweerkazerne') { b.obj(0, 'car', 2.6, -2.2).obj(0, 'car', 2.6, 2.4); atWall(b, 0, 'shelf', AP_CELL, 180, 0.3); home(b, 1, AP_CELL, 'boven', 0, 0, [60, 270]); return; }
    if (nm === 'Politiebureau') { atWall(b, 0, 'counter', AP_CELL, 240, 0.45); atWall(b, 0, 'sofa', AP_CELL, 180, 0.5); officeFloor(b, 1); return; }
    if (nm === 'Busstation') { b.obj(0, 'shelter', 6.2, 0, -Math.PI / 2); return; }
    if (nm === 'Speeltuin') { b.m.lv[0].o = b.m.lv[0].o.filter(o => o.t !== 'planter'); b.obj(0, 'slide', -1.8, 1.4, Math.PI / 6).obj(0, 'swing', 1.8, -1.2); return; }
    if (nm === 'Parkeerplaats') { for (const x of [-2.6, 2.6]) for (const z of [-3.2, 3.2]) b.obj(0, 'car', x, z, Math.PI / 2); return; }
    if (nm === 'Parkeerterrein') { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; for (const rr of [10.5, 14]) b.obj(0, 'car', Math.cos(a + 0.35) * rr, Math.sin(a + 0.35) * rr, a + 0.35); } return; }
    if (nm === 'Kade') { b.obj(0, 'boat', -2.5, -4.6, 0).obj(0, 'boat', 3.2, -6.2, 0.1); return; }
  }
  // ---- nieuwe modules: inrichting ----
  function libExtraDetails(b, key) {
    const D = {
      tankstation: () => { b.obj(0, 'pump', 3.8, 1.5).obj(0, 'pump', 3.8, -1.5).obj(0, 'car', 2.2, 0, Math.PI / 2).obj(0, 'sign', 1.0, 6.5, Math.PI / 6); b.obj(0, 'counter', -3.0, -1.3, Math.PI / 2).obj(0, 'shelf', -6.0, 0.2, Math.PI / 2).obj(0, 'charger', 6.6, 0); },
      laadplein: () => { b.obj(0, 'car', -2.6, 2.0, Math.PI / 2).obj(0, 'car', 2.6, -2.0, Math.PI / 2).obj(0, 'charger', -2.6, 4.7).obj(0, 'charger', 2.6, -4.7); for (const x of [-3.6, 0, 3.6]) for (const z of [-3.2, -1.05, 1.05, 3.2]) b.obj(1, 'solar', x, z); },
      trafo: () => { b.obj(0, 'bush', -4.6, 3.8).obj(0, 'bush', 4.6, -3.8).obj(0, 'lamp', -4.4, -4.0); },
      zonnepark: () => { for (const z of [-2.6, 0, 2.6]) for (const x of [-3.6, 0, 3.6]) b.obj(0, 'solar', x, z); },   /* rijen met een looppad ertussen */
      windmolen: () => { b.obj(0, 'turbine', 0, 0, Math.PI / 6).obj(0, 'bench', 5.4, -3.2, Math.PI / 3); },
      watertoren: () => { b.obj(0, 'bench', 5.8, 0, -Math.PI / 2).obj(0, 'tree', -5.6, 3.6).obj(0, 'tree', -5.4, -3.8).obj(0, 'lamp', 4.6, 4.2); },
      waterzuivering: () => { b.obj(0, 'container', -15.6, -3.2).obj(0, 'container', -15.6, 3.2).obj(0, 'container', 8.6, -13.2, Math.PI / 3); b.obj(0, 'lamp', -12, 8).obj(0, 'lamp', 12, 8); atWall(b, 0, 'desk', AP_CELL, 180, 0.45); atWall(b, 0, 'shelf', AP_CELL, 120, 0.3); },
      milieustraat: () => { for (const x of [1.2, 3.0, 4.8]) for (const z of [-3.0, 3.0]) b.obj(0, 'container', x, z, Math.PI / 2); b.obj(0, 'desk', -3.9, -0.6); },
      huisarts: () => { atWall(b, 0, 'counter', AP_CELL, 240, 0.45); atWall(b, 0, 'sofa', AP_CELL, 180, 0.5); atWall(b, 0, 'sofa', AP_CELL, 300, 0.5); b.obj(0, 'planter', -2.6, -1.2); bedAt(b, 1, AP_CELL, 300); atWall(b, 1, 'desk', AP_CELL, 180, 0.45); atWall(b, 1, 'desk', AP_CELL, 240, 0.45); },
      apotheek: () => { atWall(b, 0, 'counter', AP_CELL, 240, 0.45); for (const d of [180, 300, 120]) atWall(b, 0, 'shelf', AP_CELL, d, 0.3); b.obj(0, 'planter', 2.8, 2.6); },
      kinderopvang: () => { b.obj(0, 'table', -1.6, -1.4).obj(0, 'table', 1.6, -1.6); atWall(b, 0, 'sofa', AP_34, 180, 0.5); atWall(b, 0, 'kitchen', AP_34, 240, 0.37); atWall(b, 0, 'swing', 7.79, 240, 0.85); atWall(b, 0, 'bench', 7.79, 300, 0.45); },
      school: () => { for (const li of [0, 1]) officeFloor(b, li, 0.95); atWall(b, 0, 'counter', AP_CELL, 180, 0.45); },
      zwembad: () => { for (const x of [-6, 0, 6]) for (const z of [-7.2, 7.2]) b.obj(0, 'bench', x, z); b.obj(0, 'planter', -11.5, 0).obj(0, 'planter', 11.5, 0).obj(0, 'counter', 5.5, 7.4, Math.PI / 6).obj(0, 'bike', 19, 4, Math.PI / 6).obj(0, 'bike', 19, -4, -Math.PI / 6); },
      theater: () => { b.obj(0, 'counter', 5.6, 3.25, 120 * D2R).obj(0, 'planter', 4.6, 5.7).obj(0, 'planter', 6.6, 1.0); atWall(b, 1, 'sofa', AP_CELL, 210, 0.5); },
      bioscoop: () => { b.obj(0, 'screen', 5.7, 3.3, 120 * D2R).obj(0, 'counter', -2.6, 5.2, 30 * D2R).obj(0, 'sign', 2.0, -6.0); atWall(b, 1, 'sofa', AP_CELL, 210, 0.5); },
      begraafplaats: () => {
        for (let x = -22; x <= 22; x += 2.3) for (let z = -22; z <= 22; z += 2.9) { const s1 = Math.abs(x - 0.974), s2 = Math.abs(-0.5 * x + SQ3 / 2 * z - 0.974); if (s1 < 1.9 || s2 < 1.9 || Math.hypot(x + 15.588, z) < 6.5) continue; const [q, r] = mv2CellOf(x, z); if (mv2HexDist(q, r) > 1) continue; const c = mv2CellXZ(q, r); let ok = true; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; if ((x - c[0]) * Math.cos(a) + (z - c[1]) * Math.sin(a) > 6.6) ok = false; } if (!ok) continue; b.obj(0, (Math.round(x * 3 + z * 7) % 11) ? 'grave' : 'tree', x, z); }
        b.obj(0, 'bench', -10.4, -3.2, -Math.PI / 2).obj(0, 'counter', -17.6, 0, Math.PI / 2); },
      bushalte: () => { b.obj(0, 'shelter', 5.0, 0, -Math.PI / 2).obj(0, 'bin', 5.4, 2.6).obj(0, 'lamp', 5.6, -3.2).obj(0, 'tree', -3.6, 3.0).obj(0, 'bench', -3.0, -2.8, Math.PI / 2); },
      tramhalte: () => { b.obj(0, 'shelter', -0.4, 2.8, -Math.PI / 2).obj(0, 'shelter', 0.4, -2.8, Math.PI / 2).obj(0, 'lamp', 0, 6.4).obj(0, 'lamp', 0, -6.4).obj(0, 'bin', 0.9, 0.2); },
      sportveld: () => { b.obj(0, 'goal', -8.6, 0, -Math.PI / 2).obj(0, 'goal', 19.6, 0, Math.PI / 2); b.obj(0, 'bench', -10.6, 5.0, -Math.PI / 2).obj(0, 'bench', -10.6, -5.0, -Math.PI / 2); for (const [x, z] of [[-8, 12], [-8, -12], [18, 12], [18, -12]]) b.obj(0, 'lamp', x, z); atWall(b, 0, 'bench', AP_HALF, 180, 0.4, 0, -15.588, 0); },
      kinderboerderij: () => { for (const [q, r] of [[0, 1], [-1, 1], [0, -1], [1, -1]]) { const c = mv2CellXZ(q, r); for (let i = 0; i < 3; i++) { const a = i * 2.1 + q; b.obj(0, 'sheep', c[0] + Math.cos(a) * 3, c[1] + Math.sin(a) * 3, a); } b.obj(0, 'tree', c[0] - 3.4, c[1] + 2.4); } b.obj(0, 'bench', 13.4, 4.5, Math.PI / 6).obj(0, 'bin', 13.6, -4.6); b.obj(0, 'container', -4, 2.2, Math.PI / 2).obj(0, 'container', -4, -0.2, Math.PI / 2); },
      haven: () => { const n = [-0.5, SQ3 / 2], u = [SQ3 / 2, 0.5], at = (a, t) => [n[0] * a + u[0] * t, n[1] * a + u[1] * t]; for (const [a, t] of [[2.95, 1.5], [2.95, -3.2], [-1.0, 2.2], [-1.0, -2.6]]) { const p = at(a, t); b.obj(0, 'boat', p[0], p[1], Math.PI / 6); } b.obj(0, 'bench', -6.8, -1.6, -Math.PI / 2).obj(0, 'lamp', -6.9, 2.6).obj(0, 'lamp', -6.9, -4.4); },
      woonboot: () => { atWall(b, 0, 'kitchen', AP_HALF, 240, 0.37); atWall(b, 0, 'sofa', AP_HALF, 180, 0.5); bedAt(b, 0, AP_HALF, 120); b.obj(0, 'planter', 4.5, -3.2).obj(0, 'bench', -4.8, -2.6, 240 * D2R + Math.PI / 2); },
      galerijflat: () => { for (let f = 1; f < 5; f++) home(b, f, AP_34, 'woning', 0, 0, [60, 180, 300]); atWall(b, 0, 'sofa', AP_34, 120, 0.5); b.obj(0, 'planter', 1.6, -2.6).obj(0, 'bike', -1.6, -2.4, Math.PI / 2); },
      portiekflat: () => { atWall(b, 0, 'sofa', AP_CELL, 180, 0.5); b.obj(0, 'bike', 2.6, -4.8, -Math.PI / 6); for (let f = 1; f < 4; f++) home(b, f, AP_CELL, 'woning'); },
      studentenhuis: () => { b.obj(0, 'bike', 2.6, -4.8, -Math.PI / 6).obj(0, 'bike', -2.2, -5.2, Math.PI / 6); atWall(b, 0, 'kitchen', AP_CELL, 240, 0.37); b.obj(0, 'table', -1.4, -2); for (let f = 1; f < 4; f++) { bedAt(b, f, AP_CELL, 240); bedAt(b, f, AP_CELL, 300); atWall(b, f, 'desk', AP_CELL, 180, 0.45); atWall(b, f, 'desk', AP_CELL, 0, 0.45); } solarRoof(b, 4, 9); },
      boerderij: () => { home(b, 0, AP_CELL, 'beneden', 0, 0, [0, 180, 90]); home(b, 1, AP_CELL, 'boven', 0, 0, [90]); b.obj(0, 'car', 15.6, -1.2, Math.PI / 2).obj(0, 'tree', 18.8, 4.6).obj(0, 'bike', 12.8, 4.4, Math.PI / 3); b.obj(0, 'container', -15.6, 3, Math.PI / 2).obj(0, 'container', -13.2, 3, Math.PI / 2); for (const [q, r] of [[0, 1], [-1, 1]]) { const c = mv2CellXZ(q, r); for (let i = 0; i < 4; i++) { const a = i * 1.6 + r; b.obj(0, 'sheep', c[0] + Math.cos(a) * 3.2, c[1] + Math.sin(a) * 3.2, a); } } for (const [q, r] of [[0, -1], [1, -1]]) { const c = mv2CellXZ(q, r); b.obj(0, 'tree', c[0] - 2.5, c[1]).obj(0, 'tree', c[0] + 2.5, c[1] + 1.5); } },
      zorgcomplex: () => { b.obj(0, 'fountain', 0, 0).circle(0, 'bench', 0, 0, 3.3, 3, 0.5).circle(0, 'tree', 0, 0, 5.9, 3, Math.PI / 6); for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (mv2HexDist(q, r) === 1) { const c = mv2CellXZ(q, r), door = Math.atan2(-c[1], -c[0]) / D2R; home(b, 0, AP_CELL, 'beneden', c[0], c[1], [door, door + 180, 90]); for (const f of [1, 2]) home(b, f, AP_CELL, 'woning', c[0], c[1], [90]); } },
      garage: () => { b.obj(0, 'car', 2.6, -2.4).obj(0, 'car', 2.6, 2.4); atWall(b, 0, 'shelf', AP_CELL, 180, 0.3); atWall(b, 0, 'counter', AP_CELL, 240, 0.45); atWall(b, 0, 'container', AP_CELL, 120, 0.75); },
      bouwmarkt: () => { for (const z of [-7.5, -4, -0.5, 3]) for (const x of [-8, -4.5, -1]) b.obj(0, 'shelf', x, z); b.obj(0, 'counter', 5, 6.8, Math.PI / 6).obj(0, 'counter', 8.4, 4.8, Math.PI / 6); for (const [x, z, r] of [[19.5, 4.5, Math.PI / 2], [19.5, -4.5, Math.PI / 2], [-19.5, 4.5, Math.PI / 2], [-12.5, -15.5, Math.PI / 6]]) b.obj(0, 'car', x, z, r); solarRoof(b, 1, 15.75); },
      tuincentrum: () => { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; b.obj(0, 'tree', Math.cos(a) * 9, Math.sin(a) * 9); b.obj(0, 'planter', Math.cos(a + 0.5) * 5, Math.sin(a + 0.5) * 5); } b.obj(0, 'counter', 5, 6.6, Math.PI / 6); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.obj(0, 'bush', Math.cos(a) * 19, Math.sin(a) * 19).obj(0, 'planter', Math.cos(a + 0.25) * 18.5, Math.sin(a + 0.25) * 18.5); } },
      snackbar: () => { atWall(b, 0, 'counter', AP_HALF, 240, 0.45); b.obj(0, 'table', -1.0, 0.6); for (const d of [180, 240, 300]) { const p = wSpot(7.79, d, 1.9); b.obj(0, 'table', p[0], p[1]); } b.obj(0, 'sign', 3.4, 6.1, 60 * D2R + Math.PI / 2).obj(0, 'bin', 6.6, 1.6); },
      datacenter: () => { for (const li of [0, 1]) for (const z of [-3.2, -0.6]) for (const x of [-2.4, 2.4]) b.obj(li, 'shelf', x, z); atWall(b, 0, 'container', 7.79, 240, 0.95);   /* koeling: één blok, de rest van de band blijft vrij */ solarRoof(b, 2, 6.75); },
      laboratorium: () => { for (const li of [0, 1, 2]) { atWall(b, li, 'counter', AP_CELL, 240, 0.45); atWall(b, li, 'counter', AP_CELL, 300, 0.45); atWall(b, li, 'shelf', AP_CELL, 180, 0.3); b.obj(li, 'desk', -1.6, -2.2).obj(li, 'desk', 1.8, -2.4); } },
      trappenhuis: () => { b.obj(0, 'bench', 5.8, 0, -Math.PI / 2).obj(0, 'planter', -5.6, 3.4).obj(0, 'planter', -5.6, -3.4).obj(0, 'bike', 4.6, -4.6, -Math.PI / 3); b.obj(4, 'bench', 1.4, -2.2, 0); },
      roltrap: () => { b.obj(0, 'planter', 3.2, 3.0).obj(0, 'sign', 4.6, -2.6).obj(0, 'bench', 2.2, -4.6, Math.PI / 6); b.obj(1, 'bench', 3.4, 3.6, -Math.PI / 6).obj(1, 'planter', 4.6, -2.0).obj(1, 'bin', 1.2, -5.2); },
    };
    if (D[key]) D[key]();
  }
