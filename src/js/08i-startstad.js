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
    // ---------- modules uit de bibliotheek: rijhuizen en winkels langs de straat, pleinen en parken ertussen ----------
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));
    const lib = name => byName.get(name) || std.get(name) || null;
    const toRoad = (q, r) => { const w = cellToWorld(q, r); let best = null, bd = 1e9; for (const rd of roads) { const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, dd = Math.hypot(px - w.x, pz - w.z); if (dd < bd) { bd = dd; best = [px - w.x, pz - w.z]; } } } if (!best) best = [-w.x, -w.z]; const ang = Math.atan2(best[1], best[0]); return ((Math.round(-ang / (Math.PI / 3)) % 6) + 6) % 6; };
    const used = new Set();   // vakken met een module (die staan los, zonder blok)
    const mod = (name, q, r, fallback) => {   // deur naar de straat; bestaat de module niet, dan het oude blok
      const m = lib(name); if (!m) { if (fallback) set(q, r, fallback.slice()); return; }
      c.inst.push({ mid: m.id, m: instData(m, false), q, r, rot: (toRoad(q, r) + 1) % 6 }); used.add(key(q, r)); };
    const RIJ = ['Rijhuis · baksteen', 'Rijhuis · wit', 'Rijhuis · natuursteen', 'Rijhuis · hout', 'Stadswoning · wit', 'Rijhuis · baksteen'];
    const WINKEL = ['Winkel · bakkerij', 'Horeca · café met terras', 'Winkel · etalage', 'Winkel · bovenwoning', 'Winkel · boetiek', 'Horeca · restaurant'];
    const PARK = ['Park · plantsoen', 'Park · bankjes', 'Tuin · rozentuin', 'Grasveld · leeg', 'Park · plantsoen', 'Tuin · boomgaard'];
    // vaste plekken: vijver in het park, fontein en terras bij de rotonde, een kerk als blikvanger, speeltuin
    const spot = (name, x, z) => { const [q, r] = worldToCell(x, z); if (has(q, r)) return; mod(name, q, r); };
    spot('Park · vijver', Math.cos(2.45) * 40, Math.sin(2.45) * 40);
    spot('Plein · fontein', Math.cos(0.5) * 36, Math.sin(0.5) * 36);
    spot('Plein · terras', Math.cos(4.6) * 38, Math.sin(4.6) * 38);
    spot('Kerk · toren', Math.cos(5.6) * 52, Math.sin(5.6) * 52);
    spot('Park · speeltuin', Math.cos(1.3) * 96, Math.sin(1.3) * 96);
    spot('Bibliotheek · glas', Math.cos(3.7) * 98, Math.sin(3.7) * 98);
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > 108 || has(q, r) || used.has(key(q, r))) continue;
      const d = roadDist(w.x, w.z); if (d < 8.5) continue;   // het vak is zelf ~9 m breed: het midden moet zo ver van de weg liggen dat de rand de stoep niet raakt
      const h = ((q * 7 + r * 13 + q * r * 3) & 15), ang = Math.atan2(w.z, w.x);
      const street = d < 15;
      if (rad < RING - 14) {   // binnen de ring: aan de rotondekant een parkje, verder rijhuizen, winkels bij de rotonde
        if (ang > 1.9 && ang < 3.0 && rad < 48) { mod(PARK[h % PARK.length], q, r, ['park']); continue; }
        if (street) { if (rad < 52 && h % 3 !== 2) mod(WINKEL[h % WINKEL.length], q, r, ['woning']); else if (h < 3) mod('Kantoor · baksteen', q, r, ['kantoor', 'kantoor']); else mod(RIJ[h % RIJ.length], q, r, ['woning']); }
        else if (h < 10) mod(h < 4 ? 'Patiowoning · baksteen' : h < 7 ? 'Bungalow · baksteen' : 'Tuinhuis · hout', q, r, ['woning']); else mod(PARK[h % PARK.length], q, r, ['park']);
        continue;
      }
      if (rad > RING + 14 && rad < 108) {   // buiten de ring: alleen aan de straat, en wat groen
        if (street) { if (h < 3) mod('Kantoor · glas', q, r, ['kantoor', 'kantoor', 'kantoor']); else if (h < 13) mod(RIJ[(h + q) % RIJ.length], q, r, ['woning', 'woning']); else mod(h === 15 ? 'Bos · bomen' : PARK[h % PARK.length], q, r, ['park']); }
        else if (h < 8 && rad < 100) { if (h < 4) mod(h < 2 ? 'Villa · wit · tuin' : 'Villa · baksteen · tuin', q, r, ['woning']); else mod('Bos · bomen', q, r, ['park']); }
      }
    }
    // Randvulling: vakken die half op de weg liggen worden een park in stukjes (alleen de taartpunten die vrij zijn)
    c.sec = {};
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > 108 || has(q, r) || used.has(key(q, r))) continue;
      const m = secMaskOf(c.paths, q, r); let n = 0; for (let s = 0; s < 6; s++) n += (m >> s) & 1;
      if (n < 2 || m === 63) continue;
      set(q, r, ['park']); c.sec[key(q, r)] = m;
    }
    return roofHouses(c);
  }
