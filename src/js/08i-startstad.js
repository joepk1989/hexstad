  // ---------- Startstadje: een rotonde in het midden, een kleine ringweg eromheen ----------
  // Dit is de stad die je ziet als je Raatstad voor het eerst opent: drie wegen vanuit een rotonde naar een ring van
  // 70 m, huizen en kantoren langs de straten, een parkje en een vijver. Vast (geen toeval), klein genoeg voor een
  // telefoon. Via Menu → Startstadje haal je hem terug.
  function startCity() {
    const c = new Map(); c.inst = []; c.paths = []; c.terr = {};
    const set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const RING = 70, ARM = 95;
    const P = (x, z) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    c.paths.push({ t: 'rot', l: 0, r: 0, p: [[0, 0]] });
    { const p = []; for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2; p.push(P(Math.cos(a) * RING, Math.sin(a) * RING)); } c.paths.push({ t: 'weg', l: 0, r: 0, p }); }
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3 + Math.PI / 6; c.paths.push({ t: 'weg', l: 0, r: 0, p: [[0, 0], P(Math.cos(a) * ARM, Math.sin(a) * ARM)] }); }
    const roads = c.paths.filter(p => p.t !== 'rot').map(p => ({ def: PATH_DEF[p.t], pts: smoothPts(p.p) }));
    const roadDist = (x, z) => { let d = 1e9; for (const r of roads) d = Math.min(d, distPoly(x, z, r.pts) - r.def.hw - r.def.walk); return Math.min(d, Math.hypot(x, z) - 22); };
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > 108 || has(q, r)) continue;
      const d = roadDist(w.x, w.z); if (d < 8.5) continue;   // het vak is zelf ~9 m breed: het midden moet zo ver van de weg liggen dat de rand de stoep niet raakt
      const h = ((q * 7 + r * 13 + q * r * 3) & 15), ang = Math.atan2(w.z, w.x);
      const street = d < 15;
      if (rad < RING - 14) {   // binnen de ring: aan de rotondekant een parkje met vijver, verder huizen aan de straat
        if (ang > 1.9 && ang < 3.0 && rad < 48) { set(q, r, [h === 6 ? 'water' : h < 4 ? 'park1' : 'park']); continue; }
        if (street) set(q, r, h < 3 ? Array(2 + (h % 2)).fill('kantoor') : h < 14 ? Array(1 + (h % 2)).fill('woning') : ['park']);
        else set(q, r, h < 12 ? ['woning'] : ['park']);
        continue;
      }
      if (rad > RING + 14 && rad < 108) {   // buiten de ring: alleen aan de straat, en wat groen
        if (street) set(q, r, h < 3 ? ['kantoor', 'kantoor', 'kantoor'] : h < 13 ? ['woning', 'woning'] : [h === 15 ? 'park2' : 'park']);
        else if (h < 8 && rad < 100) set(q, r, h < 4 ? ['woning'] : ['park']);
      }
    }
    return roofHouses(c);
  }
