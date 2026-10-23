  // ---------- Filestad: een klein stadje waar het verkeer vastloopt ----------
  // Drie rechte wegen kruisen elkaar in het midden: één kruising met zes takken, dus drie groepen die om de beurt
  // groen krijgen (twee derde van de tijd rood). Een kleine ringweg eromheen stuurt alles steeds weer terug naar die
  // ene kruising. Dicht bebouwd met woningen en kantoren, en het verkeer is er twee keer zo druk als normaal
  // (cells.druk), zodat er al na een minuut files staan — en dan komt de Hulk (11b). Vast, zonder toeval.
  function fileCity() {
    const c = new Map(); c.inst = []; c.paths = []; c.terr = {}; c.druk = 2;
    const set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const ARM = 92, RING = 68;
    const P = (x, z) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10];
    // ---------- wegen: drie assen door het midden, een ring halverwege ----------
    for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; c.paths.push({ t: 'weg', l: 0, r: 0, p: [P(-Math.cos(a) * ARM, -Math.sin(a) * ARM), P(Math.cos(a) * ARM, Math.sin(a) * ARM)] }); }
    { const p = []; for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2; p.push(P(Math.cos(a) * RING, Math.sin(a) * RING)); } c.paths.push({ t: 'weg', l: 0, r: 0, p }); }
    // ---------- afstand tot de wegen ----------
    const roads = c.paths.map(p => ({ def: PATH_DEF[p.t], pts: smoothPts(p.p) }));
    const roadDist = (x, z) => { let d = 1e9; for (const r of roads) d = Math.min(d, distPoly(x, z, r.pts) - r.def.hw - r.def.walk); return d; };
    // ---------- bebouwing: alles binnen 100 m dat niet op een weg staat ----------
    const KANT = ['Kantoor · glas', 'Kantoor · beton', 'Kantoor · baksteen'];
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));
    const lib = name => byName.get(name) || std.get(name) || null;
    let n = 0;
    for (let q = -14; q <= 14; q++) for (let r = -14; r <= 14; r++) {
      const w = cellToWorld(q, r), rad = Math.hypot(w.x, w.z); if (rad > 100 || has(q, r)) continue;
      const d = roadDist(w.x, w.z); if (d < 1.5) continue;
      const h = ((q * 7 + r * 13 + q * r * 3) & 15);   // vaste 'toevalswaarde' per vak
      const street = d < 8;   // aan de straat
      if (rad < 22) { set(q, r, ['park']); continue; }   // het midden rond de kruising open
      if (street) {
        if (h < 5) set(q, r, Array(2 + (h % 3)).fill('kantoor'));
        else if (h < 13) set(q, r, Array(1 + (h % 3)).fill('woning'));
        else set(q, r, [h === 15 ? 'park1' : 'park']);
      } else if (h < 10) set(q, r, [h % 2 ? 'woning' : 'woning', 'woning']);
      else if (h < 12) set(q, r, ['park']);
      else if (h === 12 && rad > 80) set(q, r, ['water']);
      n++;
    }
    // een paar modules uit de bibliotheek als blikvangers aan de ring, met de deur naar de straat
    for (let k = 0; k < 6; k++) {
      const a = (k + 0.5) * Math.PI / 3, [q, r] = worldToCell(Math.cos(a) * (RING + 14), Math.sin(a) * (RING + 14));
      const m = lib(KANT[k % KANT.length]); if (!m) continue;
      const w = cellToWorld(q, r); if (roadDist(w.x, w.z) < 1.5) continue;
      c.delete(key(q, r));
      const rot = ((Math.round(-Math.atan2(-w.z, -w.x) / (Math.PI / 3)) % 6) + 6) % 6;
      c.inst.push({ mid: m.id, m: instData(m, false), q, r, rot: (rot + 1) % 6 });
    }
    return roofHouses(c);
  }
