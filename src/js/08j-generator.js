  // ---------- Stadsgenerator: een dorp of stad in één klik, met een seed (dezelfde seed = dezelfde stad) ----------
  // Wegen volgens een indeling (dorp, kruis, ring, rotonde); langs de straat rijhuizen en winkels (modules, deur naar de
  // straat, dus altijd een stoep naar de deur), daarachter parken, een vijver, een plein en bos. Bedoeld om snel steden
  // te kunnen maken en testen: doAct('gen:dorp:7') of Menu → Stad. test/visueel/generator.js controleert de bereikbaarheid.
  function genTown(seed, layout, Rd) {
    seed = (seed | 0) || 1; Rd = Rd || (layout === 'dorp' ? 130 : 120);
    const c = new Map(); c.inst = []; c.paths = []; c.terr = {};
    const set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const hv = (q, r, s = 0) => { const x = Math.sin(q * 12.9898 + r * 78.233 + (seed + s) * 37.719) * 43758.5453; return x - Math.floor(x); };
    const P = (x, z) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10], W = (a, b) => c.paths.push({ t: 'weg', l: 0, r: 0, p: [P(...a), P(...b)] });
    let rot = false;
    const A60 = Math.PI / 3, pol = (a, r, o) => [(o ? o[0] : 0) + Math.cos(a) * r, (o ? o[1] : 0) + Math.sin(a) * r];
    // Alles op het zeshoekraster: wegen lopen alleen onder hoeken van 60° (geen haakse kruispunten, geen vierkanten)
    if (layout === 'dorp') {   // drie hoofdstraten onder 60° door het midden (Y-vorm) met een zeshoekige lus eromheen
      const a0 = hv(1, 2) * A60; for (let k = 0; k < 3; k++) W(pol(a0 + k * A60, -Rd), pol(a0 + k * A60, Rd));
      const RL = Rd * 0.5, pts = []; for (let i = 0; i <= 6; i++) pts.push(P(...pol(a0 + A60 / 2 + i * A60, RL))); c.paths.push({ t: 'weg', l: 0, r: 0, p: pts }); }
    else if (layout === 'kruis') {   // honingraat: wegen langs de randen van een groot zeshoekig raster
      const Rh = 56, sp = Rh * Math.sqrt(3), seen = new Set(), nn = Math.ceil(Rd / sp) + 1;
      for (let i = -nn; i <= nn; i++) for (let j = -nn; j <= nn; j++) {
        const cx = sp * (i + j / 2), cz = sp * j * Math.sqrt(3) / 2; if (Math.hypot(cx, cz) > Rd - 10) continue;
        for (let k = 0; k < 6; k++) { const p1 = P(...pol(k * A60 + A60 / 2, Rh, [cx, cz])), p2 = P(...pol((k + 1) * A60 + A60 / 2, Rh, [cx, cz])), id = [p1, p2].map(v => Math.round(v[0] / 3) + ',' + Math.round(v[1] / 3)).sort().join('|'); if (seen.has(id) || Math.hypot(p1[0], p1[1]) > Rd + 20 || Math.hypot(p2[0], p2[1]) > Rd + 20) continue; seen.add(id); W(p1, p2); } } }
    else if (layout === 'ring') {   // zeshoekige ringweg met zes spaken
      rot = true; const RING = Rd * 0.62, a0 = hv(2, 5) * A60, pts = []; for (let i = 0; i <= 6; i++) pts.push(P(...pol(a0 + i * A60, RING))); c.paths.push({ t: 'weg', l: 0, r: 0, p: pts });
      for (let k = 0; k < 6; k++) W([0, 0], pol(a0 + k * A60, Rd)); }
    else { rot = true; const a0 = hv(3, 1) * A60; for (let k = 0; k < 6; k++) W([0, 0], pol(a0 + k * A60, Rd));   // rotonde met zes armen
      const RL = Rd * 0.55, pts = []; for (let i = 0; i <= 6; i++) pts.push(P(...pol(a0 + A60 / 2 + i * A60, RL))); c.paths.push({ t: 'weg', l: 0, r: 0, p: pts }); }
    if (rot) c.paths.unshift({ t: 'rot', l: 0, r: 0, p: [[0, 0]] });
    // doorsluipjes: smalle paden haaks op de straat, tussen de huizen door naar de tweede rij (huizen ernaast mogen er hun deur op hebben)
    { const base0 = c.paths.filter(p => p.t === 'weg').map(p => smoothPts(p.p)); let k = 0;
      for (const pts of base0) { let acc = 0; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += L; if (acc < 70 + hv(i, 9, 1) * 40) continue; acc = 0; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (hv(i, k++, 2) < 0.5 ? 1 : -1) * Math.PI / 3, nx = Math.cos(ang), nz = Math.sin(ang), side = 1, rr = Math.hypot(a[0], a[1]); if (rr < 30 || rr > Rd * 0.85) continue; const len = 26 + hv(i, 3, 5) * 8; const e0 = PATH_DEF.weg.hw + PATH_DEF.weg.walk; c.paths.push({ t: 'pad', l: 0, r: 0, p: [P(a[0] + nx * e0, a[1] + nz * e0), P(a[0] + nx * side * len, a[1] + nz * side * len)] }); } } }
    const roads = c.paths.filter(p => p.t !== 'rot').map(p => ({ def: PATH_DEF[p.t], pts: smoothPts(p.p) }));
    const roadDist = (x, z) => { let d = rot ? Math.hypot(x, z) - 22 : 1e9; for (const r of roads) d = Math.min(d, distPoly(x, z, r.pts) - r.def.hw - r.def.walk); return d; };
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));
    const lib = name => byName.get(name) || std.get(name) || null;
    const toRoad = (q, r) => { const w = cellToWorld(q, r); let best = null, bd = 1e9; for (const rd of roads) { if (rd.def === PATH_DEF.pad) continue; const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, dd = Math.hypot(px - w.x, pz - w.z); if (dd < bd) { bd = dd; best = [px - w.x, pz - w.z]; } } } if (!best) best = [-w.x, -w.z]; const ang = Math.atan2(best[1], best[0]); return ((Math.round(-ang / (Math.PI / 3)) % 6) + 6) % 6; };
    const used = new Set();
    const mod = (name, q, r, fb) => { const m = lib(name); if (!m) { if (fb) set(q, r, fb.slice()); return; } c.inst.push({ mid: m.id, m: instData(m, false), q, r, rot: (toRoad(q, r) + 1) % 6 }); used.add(key(q, r)); };
    const RIJ = ['Rijhuis · baksteen', 'Rijhuis · wit', 'Rijhuis · natuursteen', 'Rijhuis · hout', 'Stadswoning · wit', 'Rijhuis · baksteen'];
    const WINKEL = ['Winkel · bakkerij', 'Horeca · café met terras', 'Winkel · etalage', 'Winkel · bovenwoning', 'Winkel · boetiek', 'Horeca · restaurant'];
    const GROEN = ['Park · plantsoen', 'Park · bankjes', 'Tuin · rozentuin', 'Grasveld · leeg', 'Tuin · boomgaard'];
    const n = Math.ceil((Rd + 30) / (R * SQ3)) + 2, cand = [];
    for (let q = -n; q <= n; q++) for (let r = -n; r <= n; r++) { const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > Rd + 24) continue; const d = roadDist(w.x, w.z); if (d >= 8.5) cand.push({ q, r, w, rad, d }); }
    cand.sort((a, b) => a.rad - b.rad);
    // vijver: drie vakken water op een rustige plek tussen de straten, dicht bij het midden
    { const sp = cand.find(k => k.d > 18 && k.d < 34 && k.rad > 25 && k.rad < Rd * 0.7 && hv(k.q, k.r, 3) > 0.3);
      if (sp) for (const [a, b] of [[0, 0], [1, 0], [0, 1]]) { const w = cellToWorld(sp.q + a, sp.r + b); if (!has(sp.q + a, sp.r + b) && roadDist(w.x, w.z) > 12) { set(sp.q + a, sp.r + b, ['water']); used.add(key(sp.q + a, sp.r + b)); } } }
    // plein met fontein aan de straat dichtbij het midden, speeltuin ergens in het groen
    { const f = cand.find(k => k.d < 15 && !used.has(key(k.q, k.r))); if (f) mod('Plein · fontein', f.q, f.r);
      const s = cand.find(k => k.d > 16 && k.d < 30 && k.rad > Rd * 0.3 && !used.has(key(k.q, k.r)) && hv(k.q, k.r, 4) > 0.5); if (s) mod('Park · speeltuin', s.q, s.r); }
    for (const k of cand) {
      const { q, r, rad, d } = k; if (used.has(key(q, r)) || has(q, r)) continue;
      const p = hv(q, r), cen = rad < Rd * 0.45, street = d < 15;
      if (street) { if (cen && p < 0.45) mod(WINKEL[Math.floor(p * 40) % WINKEL.length], q, r, ['woning']); else if (p > 0.94) mod(layout === 'dorp' ? 'Park · bankjes' : 'Kantoor · baksteen', q, r, ['woning']); else mod(RIJ[Math.floor(p * 97) % RIJ.length], q, r, ['woning']); }
      else if (d < 34) mod(p < 0.28 ? 'Bos · bomen' : GROEN[Math.floor(p * 53) % GROEN.length], q, r, ['park']);
      else if (p < 0.3 && rad < Rd + 10) mod('Bos · bomen', q, r, ['park']);
    }
    // zichtbaar pad van elk huis/winkel naar de straat (smal pad vanaf de gevel tot aan de weg)
    for (const I of c.inst) { if (!/^(Rijhuis|Stadswoning|Winkel|Horeca|Kantoor)/.test(base(I.m.name))) continue; const w = cellToWorld(I.q, I.r); let best = null, bd = 1e9, bdef = null;
      for (const rd of roads) { if (rd.def === PATH_DEF.pad) continue; const pts = rd.pts; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, dd = Math.hypot(px - w.x, pz - w.z); if (dd < bd) { bd = dd; best = [px, pz]; bdef = rd.def; } } }
      const eg = bdef ? bdef.hw + bdef.walk : 4.5;   // het pad stopt aan de rand van de stoep, niet op het asfalt
      if (best && bd > eg + 5) { const f = 5 / bd, g = (bd - eg) / bd; c.paths.push({ t: 'pad', l: 0, r: 0, p: [P(w.x + (best[0] - w.x) * f, w.z + (best[1] - w.z) * f), P(w.x + (best[0] - w.x) * g, w.z + (best[1] - w.z) * g)] }); } }
    c.sec = {};   // randvulling: vakken half op de weg worden een park in stukjes
    for (let q = -n; q <= n; q++) for (let r = -n; r <= n; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > Rd + 24 || has(q, r) || used.has(key(q, r))) continue;
      const m = secMaskOf(c.paths, q, r); let cnt = 0; for (let s = 0; s < 6; s++) cnt += (m >> s) & 1;
      if (cnt < 2 || m === 63) continue;
      set(q, r, ['park']); c.sec[key(q, r)] = m;
    }
    return roofHouses(c);
  }
