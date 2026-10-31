  // ---------- Startdorp: alles wat een dorp nodig heeft om te functioneren ----------
  // Dit is de stad die je ziet als je Raatstad voor het eerst opent (Menu → Startstadje haalt hem terug). Vast, geen
  // toeval, klein genoeg voor een telefoon. Alles op het zeshoekraster: een zeshoekige ringweg op 4 vakken (62 m), drie
  // straten van de rotonde in het midden naar de hoeken van de ring, en drie uitvalswegen. Wat een dorp nodig heeft:
  //  wonen      rijhuizen, bungalows en villa's langs alle straten (iedereen woont ergens, zie 10-mensen: doelen)
  //  werken     een bedrijventerrein (bedrijfshal, werkplaats, garage) en de voorzieningen in de kern
  //  leren      een basisschool met kinderopvang
  //  kopen      supermarkt, bakker, en een snackbar bij het sportveld
  //  zorg       huisarts en apotheek
  //  ontmoeten  dorpsplein met fontein, kerk, café met terras, restaurant
  //  bewegen    speeltuin, park met vijver, sportveld, bos
  //  vervoer    bushalte, treinstation aan het spoor (loopt door tot voorbij de horizon), parkeerplaats
  //  techniek   trafohuisje
  function startCity() {
    const c = new Map(); c.inst = []; c.paths = []; c.terr = {};
    const set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const P = (x, z) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    const W = (q, r) => { const w = cellToWorld(q, r); return P(w.x, w.z); };
    // ---------- wegen ----------
    const RING = [[4, 0], [0, 4], [-4, 4], [-4, 0], [0, -4], [4, -4]];
    c.paths.push({ t: 'rot', l: 0, r: 0, p: [[0, 0]] });
    c.paths.push({ t: 'weg', l: 0, r: 0, p: [...RING, RING[0]].map(([q, r]) => W(q, r)) });   // ringweg (gesloten zeshoek)
    for (const [q, r] of [RING[0], RING[2], RING[4]]) c.paths.push({ t: 'weg', l: 0, r: 0, p: [[0, 0], W(q, r)] });   // drie straten naar het midden
    c.paths.push({ t: 'weg', l: 0, r: 0, p: [W(0, 4), W(0, 7)] });     // noord: naar het station
    c.paths.push({ t: 'weg', l: 0, r: 0, p: [W(-4, 0), W(-8, 0)] });   // west: uitvalsweg langs de supermarkt
    c.paths.push({ t: 'weg', l: 0, r: 0, p: [W(4, -4), W(7, -7)] });   // zuidoost: naar het bedrijventerrein
    { const a = cellToWorld(-22, 11), b = cellToWorld(14, 11); c.rails = [{ p: [P(a.x, a.z), P(b.x, b.z)] }]; }   // spoor ten noorden van het dorp (11e)
    const roads = c.paths.filter(p => p.t !== 'rot').map(p => ({ def: PATH_DEF[p.t], pts: smoothPts(p.p) }));
    const roadDist = (x, z) => { let d = 1e9; for (const r of roads) d = Math.min(d, distPoly(x, z, r.pts) - r.def.hw - r.def.walk); return Math.min(d, Math.hypot(x, z) - 22); };
    // ---------- modules uit de bibliotheek ----------
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));
    const lib = name => byName.get(name) || std.get(name) || null;
    const toRoad = (q, r) => { const w = cellToWorld(q, r); let best = null, bd = 1e9; for (const rd of roads) { const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, d = Math.hypot(px - w.x, pz - w.z); if (d < bd) { bd = d; best = [px - w.x, pz - w.z]; } } } if (!best) return 0; const ang = Math.atan2(best[1], best[0]); let k = Math.round(-ang / (Math.PI / 3)); return ((k % 6) + 6) % 6; };
    const used = new Set(), free = (q, r) => !has(q, r) && !used.has(key(q, r));
    const area = (q, r, k) => { const out = [[q, r]]; if (k) for (const [a, b] of NEIGH) out.push([q + a, r + b]); return out; };
    const mod = (name, q, r) => {   // deur naar de straat
      const m = lib(name); if (!m) return false; const k = m.k || 0, A = area(q, r, k);
      if (!A.every(([a, b]) => free(a, b))) return false;
      c.inst.push({ mid: m.id, m: instData(m, false), q, r, rot: (toRoad(q, r) + 1) % 6 }); for (const [a, b] of A) used.add(key(a, b)); return true;
    };
    // vaste plek: het vrije vak (of de vrije 7 vakken) het dichtst bij (x, z), met de rand vrij van de weg en vlak aan een straat
    const spot = (name, x, z, far = 26) => {
      const m = lib(name); if (!m) return false; const k = m.k || 0; let best = null, bd = 1e9;
      for (let q = -12; q <= 12; q++) for (let r = -12; r <= 12; r++) {
        const w = cellToWorld(q, r), d = Math.hypot(w.x - x, w.z - z); if (d > far + 20 || d >= bd) continue;
        const A = area(q, r, k); if (!A.every(([a, b]) => free(a, b) && roadDist(cellToWorld(a, b).x, cellToWorld(a, b).z) >= 8.5)) continue;
        const near = Math.min(...A.map(([a, b]) => roadDist(cellToWorld(a, b).x, cellToWorld(a, b).z))); if (near > 15) continue;   // aan de straat (de deur moet een stoep hebben)
        bd = d; best = [q, r];
      }
      return best ? mod(name, best[0], best[1]) : false;
    };
    const at = (deg, rad) => [Math.cos(deg * Math.PI / 180) * rad, Math.sin(deg * Math.PI / 180) * rad];
    // eerst de grote dingen (7 vakken), dan de vaste voorzieningen
    spot('Vervoer · treinstation', ...cellXZ(0, 9), 10);
    spot('Sportveld · voetbal', ...at(25, 100), 30);
    spot('Winkel · supermarkt', ...at(160, 92), 30);
    spot('Bedrijfshal · beton', ...at(285, 100), 30);
    spot('Kerk · toren', ...at(55, 30));
    spot('Plein · fontein', ...at(30, 24));
    spot('Horeca · café met terras', ...at(80, 26));
    spot('Winkel · bakkerij', ...at(15, 42));
    spot('Huisarts · wit', ...at(100, 42));
    spot('Apotheek · wit', ...at(70, 48));
    spot('Horeca · restaurant', ...at(110, 25));
    spot('Park · speeltuin', ...at(180, 30));
    spot('School · hout', ...at(300, 30));
    spot('Kinderopvang · hout', ...at(325, 44));
    spot('Werkplaats · beton', ...at(305, 85));
    spot('Garage · autobedrijf', ...at(320, 80));
    spot('Trafohuisje · baksteen', ...at(260, 78));
    spot('Snackbar · frituur', ...at(45, 82));
    spot('Vervoer · bushalte', ...at(75, 80));
    spot('Parkeerplaats · haag', ...at(140, 75));
    spot('Park · vijver', ...at(205, 88));
    spot('Bos · bomen', ...at(220, 100));
    spot('Park · bankjes', ...at(240, 40));
    // ---------- wonen: huizen aan elke straat, een tweede rij groen ----------
    const RIJ = ['Rijhuis · baksteen', 'Rijhuis · wit', 'Rijhuis · natuursteen', 'Rijhuis · hout', 'Stadswoning · wit', 'Rijhuis · baksteen'];
    const RAND = ['Bungalow · baksteen', 'Villa · wit · tuin', 'Bungalow · hout · tuin', 'Villa · baksteen · tuin'];
    const PARK = ['Park · plantsoen', 'Park · bankjes', 'Tuin · rozentuin', 'Grasveld · leeg', 'Park · plantsoen', 'Tuin · boomgaard'];
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > 112 || !free(q, r)) continue;
      const d = roadDist(w.x, w.z); if (d < 8.5) continue;   // het vak moet zo ver van de weg liggen dat de rand de stoep niet raakt
      const h = ((q * 7 + r * 13 + q * r * 3) & 15), street = d < 15;
      if (street) { if (rad < 70) mod(RIJ[h % RIJ.length], q, r); else if (h < 11) mod(h < 6 ? RIJ[(h + q) % RIJ.length] : RAND[h % RAND.length], q, r); else mod(h === 15 ? 'Bos · bomen' : PARK[h % PARK.length], q, r); }
      else if (rad < 64) mod(PARK[h % PARK.length], q, r);
      else if (h < 7 && rad < 100) mod(h < 3 ? 'Park · plantsoen' : 'Bos · bomen', q, r);
    }
    // Randvulling: vakken die half op de weg liggen worden een park in stukjes (alleen de taartpunten die vrij zijn)
    c.sec = {};
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > 112 || !free(q, r)) continue;
      const m = secMaskOf(c.paths, q, r); let n = 0; for (let s = 0; s < 6; s++) n += (m >> s) & 1;
      if (n < 2 || m === 63) continue;
      set(q, r, ['park']); c.sec[key(q, r)] = m;
    }
    return roofHouses(c);
  }
  function cellXZ(q, r) { const w = cellToWorld(q, r); return [w.x, w.z]; }
