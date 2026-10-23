  // ---------- De stad: één voorbeeldstad met alles erin ----------
  // Een grote ringweg (laan met bomen), zes wegen recht naar het midden en daar een rotonde. Binnen de binnenring het
  // centrum met hoogbouw; daaromheen zes buurten, één per taartpunt:
  //   0 (0–60°)     winkelcentrum uit de SketchUp-schets, met parkeren en markt
  //   1 (60–120°)   woonwijk: rijhuizen en villa's uit de bibliotheek, een woonerf en een hofje, speeltuin
  //   2 (120–180°)  openbaar: school, bibliotheek, gemeentehuis, kerk, ziekenhuis, station, stadsplein
  //   3 (180–240°)  park en water: een meer waar de weg als brug overheen gaat, bos, vijver, voetpaden, voetbrug
  //   4 (240–300°)  terrein: een dijk waar de weg naar het zuidwesten overheen klimt, villa's en tuinen op de helling, trap naar terras
  //   5 (300–360°)  werken en de oude bouwblokken: fabriek, hallen, parkeergarage, looppaden, tunnel, tribune
  // Buiten de ring: een snelweg langs de oostkant (de weg erheen gaat er met een viaduct over) en een fietsring.
  // Alles is vast (geen toeval), zodat de stad elke keer hetzelfde is en tests erop kunnen rekenen.
  function hexstadCity() {
    const c = new Map(); c.inst = []; c.paths = []; c.terr = {};
    const set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const RING = 270, SPOKE = 335, INNER_R = 112;
    const P = (x, z) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    const circ = (rad, n, t) => { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; p.push(P(Math.cos(a) * rad, Math.sin(a) * rad)); } return { t, l: 0, r: 0, p }; };
    // ---------- wegen ----------
    c.paths.push({ t: 'rot', l: 0, r: 0, p: [[0, 0]] });
    c.paths.push(circ(RING, 48, 'laan'));
    c.paths.push(circ(INNER_R, 30, 'weg'));
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.paths.push({ t: k % 3 === 0 ? 'brd' : 'weg', l: 0, r: 0, p: [[0, 0], P(Math.cos(a) * SPOKE, Math.sin(a) * SPOKE)] }); }
    c.paths.push({ t: 'snel', l: 0, r: 0, p: [[300, -480], [300, 480]] });
    c.paths.push(circ(RING + 40, 48, 'fiets'));
    // straten in de buurten (klinkers), tussen de spaken in
    const mid = (k, r0, r1) => { const a = (k + 0.5) * Math.PI / 3; return { t: 'klink', l: 0, r: 0, p: [P(Math.cos(a) * r0, Math.sin(a) * r0), P(Math.cos(a) * r1, Math.sin(a) * r1)] }; };
    c.paths.push(mid(1, 130, 262)); c.paths.push(mid(2, 130, 262)); c.paths.push(mid(5, 130, 262)); c.paths.push(mid(4, 130, 205));
    // voetpaden door het park, rond het meer
    const lake = [-185, 0];   // op de weg naar het westen: die gaat er als brug overheen
    { const p = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; p.push(P(lake[0] + Math.cos(a) * 54, lake[1] + Math.sin(a) * 54)); } c.paths.push({ t: 'pad', l: 0, r: 0, p }); }
    c.paths.push({ t: 'pad', l: 0, r: 0, p: [P(lake[0] + 38, lake[1] + 38), P(Math.cos(Math.PI * 1.12) * 118, Math.sin(Math.PI * 1.12) * 118)] });
    // ---------- afstand tot de wegen ----------
    const roads = c.paths.filter(p => p.t !== 'rot').map(p => ({ def: PATH_DEF[p.t], pts: smoothPts(p.p) }));
    const roadDist = (x, z) => { let d = Math.hypot(x, z) - ROT.Ro; for (const r of roads) d = Math.min(d, distPoly(x, z, r.pts) - r.def.hw - r.def.walk); return d; };
    const free = (q, r, m = 7.5) => { const w = cellToWorld(q, r); return roadDist(w.x, w.z) > m; };
    const angOf = (q, r) => { const w = cellToWorld(q, r); return ((Math.atan2(w.z, w.x) / Math.PI * 180) + 360) % 360; };
    const radOf = (q, r) => { const w = cellToWorld(q, r); return Math.hypot(w.x, w.z); };
    const sectorOf = (q, r) => Math.floor(angOf(q, r) / 60) % 6;
    // de zijde van een vak die naar de dichtstbijzijnde weg kijkt (deur van een module naar de straat)
    const toRoad = (q, r) => { const w = cellToWorld(q, r); let best = null, bd = 1e9; for (const rd of roads) { const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, d = Math.hypot(px - w.x, pz - w.z); if (d < bd) { bd = d; best = [px - w.x, pz - w.z]; } } } if (!best) best = [-w.x, -w.z]; const ang = Math.atan2(best[1], best[0]); return ((Math.round(-ang / (Math.PI / 3)) % 6) + 6) % 6; };
    // ---------- modules uit de bibliotheek ----------
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));
    const lib = name => byName.get(name) || std.get(name) || null;
    const put = (name, q, r, rot, lv, mir) => { const m = lib(name); if (!m) return false; c.inst.push(Object.assign({ mid: m.id, m: instData(m, !!mir), q, r, rot: ((rot % 6) + 6) % 6 }, lv ? { lv } : {}, mir ? { mir: true } : {})); return true; };
    const taken = new Set(), take = (q, r) => taken.add(key(q, r)), isTaken = (q, r) => taken.has(key(q, r)) || has(q, r);
    const hilly = (q, r) => (c.terr[q + ',' + r] || 0) > 0.3;
    const place1 = (name, q, r, rot) => {   // deur (ringzijde 0 = geometriezijde 5) naar de straat; een module van 7 vakken moet overal vrij staan
      if (isTaken(q, r) || !free(q, r)) return false; if (rot === undefined) rot = (toRoad(q, r) + 1) % 6;
      const m = lib(name); if (!m) return false;
      const area = m.k ? [[q, r], ...NEIGH.map(([a, b]) => [q + a, r + b])] : [[q, r]];
      if (area.some(([a, b]) => isTaken(a, b) || !free(a, b, m.k ? 6 : 7.5) || hilly(a, b))) return false;
      if (!put(name, q, r, rot)) return false; area.forEach(([a, b]) => take(a, b)); return true; };
    const place7 = (name, q, r, rot = 0) => { const cells7 = [[q, r], ...NEIGH.map(([a, b]) => [q + a, r + b])]; if (cells7.some(([a, b]) => isTaken(a, b) || !free(a, b, 6))) return false; if (!put(name, q, r, rot)) return false; cells7.forEach(([a, b]) => take(a, b)); return true; };
    // ---------- water: een meer in het park; de weg erdoor wordt een brug ----------
    const [lq, lr] = worldToCell(lake[0], lake[1]);
    for (let q = lq - 5; q <= lq + 5; q++) for (let r = lr - 5; r <= lr + 5; r++) { const w = cellToWorld(q, r); if (Math.hypot(w.x - lake[0], w.z - lake[1]) < 40) { set(q, r, ['water']); take(q, r); } }
    // ---------- terrein: een dijk dwars over de weg naar het zuidwesten (270°), met een zachte flank ----------
    { const A = 240 * Math.PI / 180, C = [Math.cos(A) * 200, Math.sin(A) * 200], tx = -Math.sin(A), tz = Math.cos(A);   // dijk loopt loodrecht op de weg naar het zuidwesten
      for (let q = -30; q <= 30; q++) for (let r = -30; r <= 30; r++) { const w = cellToWorld(q, r), dx = w.x - C[0], dz = w.z - C[1], along = dx * tx + dz * tz, across = Math.abs(dx * Math.cos(A) + dz * Math.sin(A)); if (Math.abs(along) > 95 || across > 34) continue; const end = Math.max(0, Math.min(1, (95 - Math.abs(along)) / 30)), h = 4.5 * end * (across < 12 ? 1 : Math.max(0, 1 - (across - 12) / 22)); if (h > 0.3) c.terr[q + ',' + r] = Math.round(h * 2) / 2; } }
    // ---------- winkelcentrum (sector 0), verschoven naar zijn plek ----------
    { const [mq, mr] = worldToCell(Math.cos(0.52) * 190, Math.sin(0.52) * 190);   // 120° gedraaid: de lange kant langs de ring
      for (const [ni, q0, r0, lv, rot, mir] of MALL) { const q1 = -r0, r1 = q0 + r0, q = -r1, r = q1 + r1, name = MALL_NAMES[ni]; put(name, q + mq, r + mr, rot + 2, lv, mir); if (!lv) { take(q + mq, r + mr); for (const [a, b] of NEIGH) if (!isTaken(q + mq + a, r + mr + b)) take(q + mq + a, r + mr + b); } }
      // parkeren en markt bij het winkelcentrum
      const park = [['Parkeerplaats · lantaarns', 0.62, 255], ['Parkeerplaats · haag', 0.42, 255], ['Plein · markt', 0.24, 150], ['Winkel · supermarkt', 0.9, 170], ['Fietsenstalling · overdekt', 0.75, 250], ['Horeca · hotel', 0.14, 250]];
      for (const [name, a, rad] of park) { const [q, r] = worldToCell(Math.cos(a) * rad, Math.sin(a) * rad); place1(name, q, r); } }
    // ---------- centrum: hoogbouw rond de rotonde, pleinen aan de binnenring ----------
    const pleinen = ['Plein · fontein', 'Plein · terras', 'Plein · lantaarns', 'Plein · kiosk', 'Plein · zitkuil', 'Plein · stadsplein'];
    for (let k = 0; k < 6; k++) { const a = (k + 0.5) * Math.PI / 3, [q, r] = worldToCell(Math.cos(a) * 40, Math.sin(a) * 40); place1(pleinen[k], q, r); }
    const torens = ['Kantoortoren · glas', 'Woontoren · glas', 'Kantoor · glas', 'Appartementen · glas', 'Kantoor · beton', 'Appartementen · beton'];
    for (let k = 0; k < 6; k++) { const a = (k + 0.5) * Math.PI / 3; for (const rad of [66, 88]) { const [q, r] = worldToCell(Math.cos(a + (rad > 70 ? 0.14 : -0.1)) * rad, Math.sin(a + (rad > 70 ? 0.14 : -0.1)) * rad); place1(torens[(k + (rad > 70 ? 3 : 0)) % 6], q, r); } }
    // ---------- woonwijk (sector 1) ----------
    place7('Woonerf · 6 huizen', ...worldToCell(Math.cos(1.57) * 200, Math.sin(1.57) * 200), 0);
    place7('Hofje · 6 woningen', ...worldToCell(Math.cos(1.95) * 215, Math.sin(1.95) * 215), 0);
    place1('Park · speeltuin', ...worldToCell(Math.cos(1.25) * 215, Math.sin(1.25) * 215));
    place1('Park · plantsoen', ...worldToCell(Math.cos(1.75) * 150, Math.sin(1.75) * 150));
    // ---------- openbaar (sector 2) ----------
    const openbaar = [['School · baksteen', 2.3, 160], ['Bibliotheek · glas', 2.55, 160], ['Gemeentehuis · natuursteen', 2.45, 205], ['Kerk · toren', 2.72, 215], ['Ziekenhuis · wit', 2.95, 190], ['Museum · beton', 2.2, 215], ['Sporthal · beton', 2.98, 240], ['Hulpdienst · brandweer', 2.3, 248], ['Hulpdienst · politie', 2.6, 248], ['Vervoer · busstation', 2.9, 135], ['Vervoer · treinstation', 2.15, 250], ['Plein · stadsplein', 2.62, 185]];
    for (const [name, a, rad] of openbaar) place1(name, ...worldToCell(Math.cos(a) * rad, Math.sin(a) * rad));
    // ---------- park en water (sector 3) ----------
    const groen = [['Park · vijver', 3.4, 150], ['Bos · bomen', 3.55, 245], ['Bos · bomen', 3.95, 240], ['Park · stadspark', 3.3, 240], ['Park · bankjes', 3.9, 150], ['Park · hondenveld', 3.2, 200], ['Tuin · rozentuin', 3.75, 135], ['Grasveld · bomen', 3.5, 130]];
    for (const [name, a, rad] of groen) place1(name, ...worldToCell(Math.cos(a) * rad, Math.sin(a) * rad), 0);
    place1('Brug · voetgangers', ...worldToCell(lake[0] + 46 * Math.cos(2.4), lake[1] + 46 * Math.sin(2.4)), 0);
    // ---------- terrein (sector 4) ----------
    const heuvel = [['Villa · wit · tuin', 4.35, 150], ['Villa · baksteen · tuin', 4.5, 150], ['Bungalow · hout · tuin', 4.65, 148], ['Villa · natuursteen · plein', 4.9, 150], ['Tuin · boomgaard', 4.45, 245], ['Tuin · moestuin', 4.62, 248], ['Trap · naar terras', 4.3, 228], ['Terras op palen · trap', 4.78, 240], ['Toren · uitkijk', 4.97, 232], ['Amfitheater · rond', 4.22, 255]];
    for (const [name, a, rad] of heuvel) { const [q, r] = worldToCell(Math.cos(a) * rad, Math.sin(a) * rad); if (!hilly(q, r)) place1(name, q, r); }
    // ---------- werken en oude bouwblokken (sector 5) ----------
    const werk = [['Fabriek · baksteen', 5.6, 240], ['Bedrijfshal · beton', 5.75, 238], ['Werkplaats · beton', 5.45, 240], ['Loods · open', 5.9, 240], ['Parkeergarage · beton', 5.55, 165], ['Kantoor · baksteen', 5.35, 160], ['Markthal · overdekt', 5.85, 165]];
    for (const [name, a, rad] of werk) place1(name, ...worldToCell(Math.cos(a) * rad, Math.sin(a) * rad));
    { const [bq, br] = worldToCell(Math.cos(5.62) * 200, Math.sin(5.62) * 200);   // bouwblokken met looppaden, tunnel, tribune en een hof erbovenop
      const B = [[0, 0, ['blok']], [1, 0, ['blok']], [2, 0, ['blok', 'park']], [-1, 0, ['blok']], [0, 1, ['looppad']], [1, 1, ['tunnel']], [-1, 1, ['looppad']], [-2, 1, ['hof']], [2, 1, ['helling5']], [0, -1, ['blok', 'muur1']], [1, -1, ['tribune5']], [-1, -1, ['looppad']], [2, -1, ['blok']], [-2, 0, ['zuilen', 'hof']], [-2, -1, ['zuilen']], [3, 0, ['trap0']], [3, -1, ['pad']], [4, -1, ['pad']]];
      for (const [dq, dr, st] of B) { const q = bq + dq, r = br + dr; if (!isTaken(q, r) && free(q, r, 5)) { set(q, r, st.slice()); take(q, r); } } }
    // ---------- rijhuizen en kantoren langs de straten; daarbuiten gewone woningen en parkjes ----------
    const RIJ = ['Rijhuis · baksteen', 'Rijhuis · wit', 'Rijhuis · natuursteen', 'Rijhuis · hout', 'Stadswoning · wit', 'Herenhuis · natuursteen', 'Bungalow · baksteen', 'Patiowoning · baksteen'];
    const WINKELS = ['Winkel · etalage', 'Winkel · bovenwoning', 'Winkel · boetiek', 'Horeca · café met terras', 'Horeca · restaurant', 'Winkel · bakkerij', 'Kiosk · hout'];
    const KANT = ['Kantoor · glas', 'Kantoor · beton', 'Kantoor · baksteen', 'Appartementen · beton', 'Studio · hout'];
    const span = Math.ceil((RING + 60) / (R * SQ3)) + 2;
    let n = 0;
    for (let q = -span; q <= span; q++) for (let r = -span; r <= span; r++) {
      if (hexDist(q, r) > span || isTaken(q, r)) continue;
      const rad = radOf(q, r), s = sectorOf(q, r), w = cellToWorld(q, r), d = roadDist(w.x, w.z), h = (q * 7 + r * 13 + q * r) & 15;
      if (rad > RING + 8) { if (rad < RING + 70 && d > 7.5 && h < 3 && !hilly(q, r)) { set(q, r, ['park']); } continue; }   // buiten de ring: wat groen
      if (d < 7.5) continue;   // op of naast een weg
      const street = d < 7.5 + 17;   // eerste rij langs een straat
      if (rad < INNER_R - 10) {   // centrum
        if (street) { if (h < 10) set(q, r, Array(4 + (h % 5)).fill(h < 6 ? 'kantoor' : 'woning')); else place1(KANT[h % KANT.length], q, r); }
        else if (h < 6) set(q, r, Array(2 + (h % 3)).fill('woning'));
        else if (h < 8) set(q, r, ['park']);
        continue;
      }
      if (hilly(q, r)) continue;   // op de dijk staat niets
      if (s === 0) { if (street && rad > 215 && h < 6) place1(WINKELS[h % WINKELS.length], q, r); else if (!street && h < 4) set(q, r, ['park']); continue; }
      if (s === 1) { if (street) { if (h < 11) place1(RIJ[(h + n++) % RIJ.length], q, r); else set(q, r, [h % 2 ? 'woning' : 'woning', 'woning']); } else if (h < 5) set(q, r, ['woning']); else if (h < 8) set(q, r, [h === 7 ? 'park4' : h === 6 ? 'park1' : 'park']); continue; }
      if (s === 2) { if (street && h < 7) place1(RIJ[(h * 3) % RIJ.length], q, r); else if (h < 4) set(q, r, ['park']); continue; }
      if (s === 3) { if (h < 9) set(q, r, [h % 4 === 1 ? 'park' + (1 + (h % 4)) : 'park']); continue; }   // ook bankjes, bloemen, vijvers, speeltuinen
      if (s === 4) { if (street && h < 6) place1(RIJ[(h + 2) % RIJ.length], q, r); else if (h < 5) set(q, r, ['park']); continue; }
      if (s === 5) { if (street && rad < 200 && h < 7) place1(KANT[h % KANT.length], q, r); else if (street && h < 9) set(q, r, Array(1 + (h % 3)).fill('kantoor')); else if (h < 3) set(q, r, ['park']); }
    }
    sanitize(c); roofHouses(c);
    return c;
  }
