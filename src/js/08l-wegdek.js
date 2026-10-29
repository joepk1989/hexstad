  // ---------- Gelaagde stad: wegen op wegdekken, modules boven de weg ----------
  // Wegdek: een module waar een weg overheen mag (Wegdek · …, Parkeergarage · …). Een weg die je eroverheen trekt haalt
  // het niet weg maar ligt op het dak, en klimt er met een oprit naartoe (hoogstens 12 % steil, zie pathProf in 07).
  // Andersom kun je een wegdek op een bestaande weg zetten: de weg gaat dan vanzelf omhoog.
  // Boven een weg (of op een leeg vak) kan een module ook zweven, als de onderkant minstens 4,5 m boven de weg ligt:
  // hij krijgt zeshoekige poten op de hoekpunten die niet op de rijbaan staan (deckLegs, gebouwd in buildModNet).
  var deckSig_ = '', deckMap_ = new Map(), railForce_ = false;
  function isDeckMod(m) { return !!m && m.v === 2 && (!!m.deck || /^(Wegdek|Parkeergarage)/.test(m.name || '')); }
  // vak → hoogte (absoluut) van het dak van het hoogste wegdek op dat vak
  function deckCells() {
    const live = (cells.inst || []).filter(I => I.m && isDeckMod(I.m));
    let sig = ''; for (const I of live) sig += I.q + ',' + I.r + ',' + I.rot + ',' + (I.lv || 0) + ',' + I.m.lv.length + ',' + gH(I.q, I.r) + ';';
    if (sig === deckSig_) return deckMap_;
    deckSig_ = sig; deckMap_ = new Map();
    for (const I of live) { const top = gH(I.q, I.r) + instTopLv(I) * MV2.LV_H; for (const [q, r] of mv2Area(I)) { const k = q + ',' + r; deckMap_.set(k, Math.max(deckMap_.has(k) ? deckMap_.get(k) : -1e9, top)); } }
    return deckMap_;
  }
  function deckKey() { deckCells(); return deckSig_; }
  function deckAt(x, z, fast) { const D = fast ? deckMap_ : deckCells(); if (!D || !D.size) return null; const [q, r] = worldToCell(x, z), v = D.get(q + ',' + r); return v === undefined ? null : v; }
  // Weghoogte langs de middenlijn optillen naar de wegdekken eronder, met opritten (pts, S, h zoals in pathProf)
  const DECK_SLOPE = 0.12;
  function deckLift(pts, S, h) {
    const D = deckCells(); if (!D.size) return h;
    const on = []; for (let i = 0; i < pts.length; i++) { const t = deckAt(pts[i][0], pts[i][1], true); if (t !== null) on.push([S[i], t + 0.06]); }
    if (!on.length) return h;
    return h.map((v, k) => {
      let best = v;
      for (const [s, T] of on) { if (T <= v) continue; const d = Math.abs(S[k] - s); if (d < 0.01) { best = Math.max(best, T); continue; } const L = Math.max(18, (T - v) / DECK_SLOPE); if (d >= L) continue; best = Math.max(best, v + (T - v) * smooth01(1 - d / L)); }
      return best;
    });
  }
  // ---------- Modules boven de weg ----------
  const CLEAR = 4.5;   // vrije hoogte onder een module boven de weg
  // hoogste wegoppervlak in het gebied van een module (null: geen weg)
  function roadTopIn(area) {
    let top = null;
    for (const [q, r] of area) { if (!vecCover.has(q + ',' + r)) continue; const c = cellToWorld(q, r);
      for (const [dx, dz] of [[0, 0], [5, 0], [-5, 0], [2.5, 4.3], [-2.5, 4.3], [2.5, -4.3], [-2.5, -4.3]]) { const t = roadTop(c.x + dx, c.z + dz, 50); if (t !== null && (top === null || t > top)) top = t; }
      if (top === null) top = gH(q, r) + 0.3; }
    return top;
  }
  // laag waarop een module boven de weg terechtkomt als je op een weg klikt (0: geen weg)
  function overRoadLv(mod, rot, q0, r0) {
    if (!mod || mod.v !== 2 || isDeckMod(mod)) return 0;
    const area = mv2Area({ m: mod, rot, q: q0, r: r0 }); if (!area.some(([q, r]) => vecCover.has(q + ',' + r))) return 0;
    const t = roadTopIn(area), G = gH(q0, r0); return Math.max(2, Math.ceil((t - G + CLEAR) / MV2.LV_H - 1e-6));
  }
  // Mag een module op laag lv op dit vak zweven? (geen module eronder; weg of leeg vak; hoog genoeg boven de weg)
  function floatOK(I0, q, r, lv) {
    if (lv < 1 || stackOf(q, r).length) return false;
    if (vecCover.has(q + ',' + r)) { const t = roadTopIn([[q, r]]); if (gH(I0.q, I0.r) + lv * MV2.LV_H < t + CLEAR - 1e-3) return false; }
    return true;
  }
  // Poten onder zwevende modules: per vak dat niet op een module staat, op de zes hoekpunten (en het midden als daar geen
  // weg is); niet op de rijbaan of te dicht erbij. Geeft per exemplaar een lijst [x, z, onder, boven].
  function deckLegs(I) {
    const lv = instLv(I); if (!lv) return [];
    const G = gH(I.q, I.r), y1 = G + lv * MV2.LV_H - MV2.FLOOR_T, out = [], seen = new Set(); out.all = true;
    for (const [q, r] of mv2Area(I)) {
      if (legTops && legTops.has(q + ',' + r + ',' + lv)) { out.all = false; continue; }   // een andere module eindigt hier precies op deze laag: hij staat erop
      const c = cellToWorld(q, r), spots = [[c.x, c.z]];
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; spots.push([c.x + Math.cos(a) * (R - 0.6), c.z + Math.sin(a) * (R - 0.6)]); }
      for (const [x, z] of spots) {
        const k = Math.round(x * 2) + ',' + Math.round(z * 2); if (seen.has(k)) continue; seen.add(k);
        if (onCarriage(x, z)) continue;
        const dk = deckAt(x, z), base = Math.max(terrGround(x, z), dk !== null && dk < y1 - 0.5 ? dk : -1e9, 0);
        if (y1 - base < 0.5) continue;
        out.push([x, z, base, y1]);
      }
    }
    return out;
  }
  // ligt dit punt op de rijbaan (of de stoeprand ervan) van een getekende weg?
  function onCarriage(x, z) {
    for (const p of cells.paths || []) {
      const def = PATH_DEF[p.t]; if (!def || !p.p) continue;
      if (p.t === 'rot') { if (Math.hypot(x - p.p[0][0], z - p.p[0][1]) < 15) return true; continue; }
      if (p.p.length < 2) continue; const pr = pathProf(p), m = def.hw + 0.9;
      if (x < pr.bb[0] - m || x > pr.bb[2] + m || z < pr.bb[1] - m || z > pr.bb[3] + m) continue;
      if (distPoly(x, z, pr.pts) < m) return true;
    }
    return false;
  }
  // Meshes en botsing van alle poten (één InstancedMesh); per exemplaar bewaard voor instorten (legParts)
  var legGeo = new THREE.CylinderGeometry(0.42, 0.48, 1, 6).translate(0, 0.5, 0);
  var legMesh = null, legData = new Map(), legCols = new Map(), legTops = null;
  function buildLegs(live) {
    if (legMesh) { scene.remove(legMesh); legMesh.dispose(); legMesh = null; }
    for (const [k, col] of legCols) { const L = modCols.get(k); if (L) { const i = L.indexOf(col); if (i >= 0) L.splice(i, 1); } }   // oude botsing eruit
    legData = new Map(); legCols = new Map();
    const all = []; legTops = new Set();
    for (const J of live) { const t = instTopLv(J); for (const [q, r] of mv2Area(J)) legTops.add(q + ',' + r + ',' + t); }
    for (const I of live) { const L = deckLegs(I); if (L.length) { legData.set(I, L); for (const g of L) all.push([I, g]); } }
    if (!all.length) return;
    legMesh = new THREE.InstancedMesh(legGeo, mv2Mats().slab, all.length); legMesh.castShadow = true; legMesh.receiveShadow = true;
    const M4 = new THREE.Matrix4(); let n = 0;
    for (const [I, [x, z, y0, y1]] of all) {
      const e = modGroups.get(I); if (e && e.collapsed) continue;
      M4.makeScale(1, y1 - y0, 1).setPosition(x, y0, z); legMesh.setMatrixAt(n++, M4);
      // botsing: zes korte muurtjes om de poot
      const k = worldToCell(x, z).join(','); let col = legCols.get(k); if (!col) legCols.set(k, col = { walls: [], surfaces: [] });
      for (let i = 0; i < 6; i++) { const a0 = i * Math.PI / 3, a1 = a0 + Math.PI / 3; col.walls.push({ ax: x + Math.cos(a0) * 0.45, az: z + Math.sin(a0) * 0.45, bx: x + Math.cos(a1) * 0.45, bz: z + Math.sin(a1) * 0.45, y0, y1, half: 0.05 }); }
    }
    legMesh.count = n; scene.add(legMesh);
    for (const [k, col] of legCols) { let L = modCols.get(k); if (!L) modCols.set(k, L = []); L.push(col); }
  }
  // de poten van een exemplaar als losse geometrie (instorten)
  function legGround(I) { const L = legData.get(I); return L && L.all && L.length ? Math.min(...L.map(g => g[2])) : null; }   // instorten: helemaal op poten? dan is alleen de voet van een poot grond
  function legParts(I) { return (legData.get(I) || []).map(([x, z, y0, y1]) => legGeo.clone().scale(1, y1 - y0, 1).translate(x, y0, z)); }
  function legsHide(I, hide) { /* bij instorten: alles opnieuw, zonder de poten van dat gebouw (de stukken nemen het over) */ buildLegs((cells.inst || []).filter(J => J.m && J.m.v === 2 && modGroups.has(J))); }
