  // ---------- Gelaagde stad: wegen op wegdekken, modules boven de weg ----------
  // Wegdek: een module waar een weg overheen mag (Wegdek · …, Parkeergarage · …). Een weg die je eroverheen trekt haalt
  // het niet weg maar ligt op het dak, en klimt er met een oprit naartoe (hoogstens 12 % steil, zie pathProf in 07).
  // Andersom kun je een wegdek op een bestaande weg zetten: de weg gaat dan vanzelf omhoog.
  // Boven een weg (of op een leeg vak) kan een module ook zweven, als de onderkant minstens 4,5 m boven de weg ligt:
  // hij krijgt zeshoekige poten op de hoekpunten die niet op de rijbaan staan (deckLegs, gebouwd in buildModNet).
  var deckSig_ = '', deckMap_ = new Map(), roofMap_ = new Map(), railForce_ = false;
  function isDeckMod(m) { return !!m && m.v === 2 && (!!m.deck || /^(Wegdek|Parkeergarage)/.test(m.name || '')); }
  // Dakweg: een weg die je op een plat dak begint te slepen (path.dak) mag over elk plat dak (winkelcentrum, kantoor,
  // flat …): die modules blijven staan en de weg ligt erop. Een gewone weg haalt ze nog steeds weg.
  function isRoofMod(m) { return !!m && m.v === 2 && (isDeckMod(m) || modMeta(m).top === 'plat'); }
  // vak → hoogte (absoluut) van het dak van het hoogste wegdek (deckMap_) en van het hoogste platte dak (roofMap_) op dat vak
  function deckCells() {
    const live = (cells.inst || []).filter(I => I.m && I.m.v === 2);
    let sig = ''; for (const I of live) if (isRoofMod(I.m)) sig += I.q + ',' + I.r + ',' + I.rot + ',' + (I.lv || 0) + ',' + I.m.lv.length + ',' + gH(I.q, I.r) + (isDeckMod(I.m) ? 'd' : '') + ';';
    if (sig === deckSig_) return deckMap_;
    deckSig_ = sig; deckMap_ = new Map(); roofMap_ = new Map();
    const tops = new Map(); for (const I of live) { const t = gH(I.q, I.r) + instTopLv(I) * MV2.LV_H; for (const [q, r] of mv2Area(I)) { const k = q + ',' + r; if (!tops.has(k) || tops.get(k)[0] < t) tops.set(k, [t, I]); } }
    for (const [k, [t, I]] of tops) { if (!isRoofMod(I.m)) continue; roofMap_.set(k, t); if (isDeckMod(I.m)) deckMap_.set(k, t); }   // alleen het bovenste exemplaar telt (een huis op een dek is geen dek meer)
    return deckMap_;
  }
  function deckKey() { deckCells(); return deckSig_; }
  function deckAt(x, z, fast, roof) { if (!fast) deckCells(); const D = roof ? roofMap_ : deckMap_; if (!D || !D.size) return null; const [q, r] = worldToCell(x, z), v = D.get(q + ',' + r); return v === undefined ? null : v; }
  // de bovenkant van een plat dak onder dit scherm-punt (voor een dakweg): { inst, y } of null
  function roofUnder(res) { if (!res || !res.inst || res.side || !isRoofMod(res.inst.m) || !res.point) return null; const y = gH(res.inst.q, res.inst.r) + instTopLv(res.inst) * MV2.LV_H; return Math.abs(res.point.y - y) < 1.2 ? { inst: res.inst, y } : null; }
  // Weghoogte langs de middenlijn optillen naar de wegdekken eronder, met opritten (pts, S, h zoals in pathProf)
  const DECK_SLOPE = 0.12;
  function deckLift(pts, S, h, roof) {
    deckCells(); if (!(roof ? roofMap_ : deckMap_).size) return h;
    const on = []; for (let i = 0; i < pts.length; i++) { const t = deckAt(pts[i][0], pts[i][1], true, roof); if (t !== null) on.push([S[i], t + 0.06]); }
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
  var legMesh = null, legData = new Map(), legCols = new Map(), legTops = null, towerMeshes = null;
  function buildLegs(live) {
    if (legMesh) { scene.remove(legMesh); legMesh.dispose(); legMesh = null; }
    for (const [k, col] of legCols) { const L = modCols.get(k); if (L) { const i = L.indexOf(col); if (i >= 0) L.splice(i, 1); } }   // oude botsing eruit
    legData = new Map(); legCols = new Map();
    const all = []; legTops = new Set();
    for (const J of live) { const t = instTopLv(J); for (const [q, r] of mv2Area(J)) legTops.add(q + ',' + r + ',' + t); }
    for (const I of live) { const L = deckLegs(I); if (L.length) { legData.set(I, L); for (const g of L) all.push([I, g]); } }
    if (towerMeshes) { for (const m of towerMeshes) { scene.remove(m); m.geometry.dispose(); } towerMeshes = null; }
    legTowers = new Map();
    { const geo = { step: [], metal: [], slab: [] };
      for (const [I, L] of legData) { if (!L.all) continue; const e = modGroups.get(I); if (e && e.collapsed) continue; const T = towerFor(I); if (!T) continue; legTowers.set(I, T);
        const k = worldToCell(T.c[0], T.c[1]).join(','); let col = legCols.get(k); if (!col) legCols.set(k, col = { walls: [], surfaces: [] }); towerBuild(T, geo, col); }
      const Mt = mv2Mats(), mk = (arr, mat) => { if (!arr.length) return null; let g; if (Array.isArray(arr) && typeof arr[0] === 'number') { g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(arr.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); } else g = mergeGeos(arr); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
      towerMeshes = [mk(geo.step, Mt.step), mk(geo.metal, Mt.metal), mk(geo.slab, Mt.slab)].filter(Boolean); }
    if (!all.length) { for (const [k, col] of legCols) { let L = modCols.get(k); if (!L) modCols.set(k, L = []); L.push(col); } return; }
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
  // ---------- Trappenhuis-poot: een zeshoekige wenteltrap naast een module die helemaal op poten staat ----------
  // Bij een deur of open doorgang van de begane grond van de module (die nu boven de weg hangt) komt buiten een
  // wenteltrap van de grond tot de vloer: 12 treden per 3 m rond een zeshoekige kern, met een bordes naar de deur.
  // Niet op de rijbaan en niet tegen een ander gebouw. Mensen nemen hem (08f: modWalkAdd), de speler ook (botsing).
  var legTowers = new Map();   // exemplaar → { c, y0, yT, N, phi, door, out, lvW, q, r, k }
  const TW_AC = 0.32, TW_AP = 1.75, TW_OFF = 2.55;
  function hull2(P) {   // bolle omhullende (xz), tegen de klok in
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const hexR = (A, th) => { let d = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6; return A / Math.cos(d); };   // zeshoek met de hoekpunten op 0°, 60° …
  function towerFor(I) {
    const m = I.m, L0 = m.lv[0]; if (!L0) return null;
    const ts = mv2Ts(m), tf = mv2Tf(I.rot, I.q, I.r), G = gH(I.q, I.r), lv = instLv(I), yT = G + lv * MV2.LV_H + 0.02;
    const cand = [];
    for (const id in L0.w) {
      const W = L0.w[id]; if (!W || !['door', 'gate', 'open'].includes(W.o)) continue;
      const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue;
      const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let nx = -(b[1] - a[1]), nz = b[0] - a[0]; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
      const inA = mv2InArea(m, mid[0] + nx * 0.6, mid[1] + nz * 0.6), inB = mv2InArea(m, mid[0] - nx * 0.6, mid[1] - nz * 0.6);
      if (inA === inB) continue;   // geen buitenrand
      if (inA) { nx = -nx; nz = -nz; }
      const Wm = tf(mid[0], mid[1]), Wo = tf(mid[0] + nx, mid[1] + nz), ox = Wo[0] - Wm[0], oz = Wo[1] - Wm[1];
      cand.push({ door: Wm, out: [ox, oz] });
    }
    for (const sh of [0, 2.5, -2.5, 5, -5, 7.5, -7.5]) for (const c0 of cand) {   // recht voor de deur, of wat opzij (dan loopt het bordes langs de gevel)
      const tx = -c0.out[1], tz = c0.out[0], c = [c0.door[0] + c0.out[0] * TW_OFF + tx * sh, c0.door[1] + c0.out[1] * TW_OFF + tz * sh];
      let ok = true;
      for (let s = -1; s < 6 && ok; s++) { const x = s < 0 ? c[0] : c[0] + Math.cos(s * Math.PI / 3) * 2.2, z = s < 0 ? c[1] : c[1] + Math.sin(s * Math.PI / 3) * 2.2, [q, r] = worldToCell(x, z);
        if (onCarriage(x, z) || modCellOccupied(q, r) || stackOf(q, r).length) ok = false;
        const t = modTop.get(q + ',' + r); if (t && t.inst !== I) ok = false; }
      if (!ok) continue;
      const y0 = Math.max(0, terrGround(c[0], c[1])), rise = yT - y0; if (rise < 1) continue;
      const N = Math.max(12, Math.round(rise / 0.25)), phi = Math.atan2(c0.door[1] - c[1], c0.door[0] - c[0]);
      const inP = [c0.door[0] - c0.out[0] * 1.0, c0.door[1] - c0.out[1] * 1.0], [q, r] = worldToCell(inP[0], inP[1]);
      let k = 0, bd = -2; for (let s2 = 0; s2 < 6; s2++) { const dd = c0.out[0] * FRAMES[s2].nx + c0.out[1] * FRAMES[s2].nz; if (dd > bd) { bd = dd; k = s2; } }
      return { c, y0, yT, N, phi, door: c0.door, out: c0.out, inP, lvW: lv, q, r, k, sh };
    }
    return null;
  }
  // geometrie (wereld) van één trappenhuis-poot: treden, kern, leuning, bordes; plus botsing in col
  function towerBuild(T, geo, col) {
    const { c, y0, yT, N, phi } = T, hs = (yT - y0) / N, step = Math.PI / 6, TH = 0.26, P = (th, A) => { const rr = hexR(A, th); return [c[0] + Math.cos(th) * rr, c[1] + Math.sin(th) * rr]; };
    const prism = (pts, yb, yt, arr) => {   // bolle veelhoek (wereld-xz) als blok van yb tot yt
      const n = pts.length, cx = pts.reduce((s, p) => s + p[0], 0) / n, cz = pts.reduce((s, p) => s + p[1], 0) / n;
      const tri = (A, B, C) => { const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, mx = (A[0] + B[0] + C[0]) / 3 - cx, my = (A[1] + B[1] + C[1]) / 3 - (yb + yt) / 2, mz = (A[2] + B[2] + C[2]) / 3 - cz; if (nx * mx + ny * my + nz * mz >= 0) arr.push(...A, ...B, ...C); else arr.push(...A, ...C, ...B); };
      for (let i = 1; i < n - 1; i++) { tri([pts[0][0], yt, pts[0][1]], [pts[i][0], yt, pts[i][1]], [pts[i + 1][0], yt, pts[i + 1][1]]); tri([pts[0][0], yb, pts[0][1]], [pts[i][0], yb, pts[i][1]], [pts[i + 1][0], yb, pts[i + 1][1]]); }
      for (let i = 0; i < n; i++) { const A = pts[i], B = pts[(i + 1) % n]; tri([A[0], yb, A[1]], [B[0], yb, B[1]], [B[0], yt, B[1]]); tri([A[0], yb, A[1]], [B[0], yt, B[1]], [A[0], yt, A[1]]); }
    };
    const k0 = Math.floor(Math.max(1, Math.round(Math.hypot(c[0], c[1]))));  void k0;
    for (let s = 0; s < N; s++) {
      const t0 = phi - (N - s) * step, t1 = t0 + step, top = y0 + (s + 1) * hs;
      const pts = [P(t0, TW_AC), P(t0, TW_AP), P(t1, TW_AP), P(t1, TW_AC)];
      prism(pts, top - TH, top, geo.step);
      col.surfaces.push({ kind: 'poly', cx: c[0], cz: c[1], pts: pts.map(p => [p[0] - c[0], p[1] - c[1]]), top, bottom: top - TH });
      if (s >= 1 && s <= N - 2) { const A = P(t0, TW_AP + 0.12), B = P(t1, TW_AP + 0.12); col.walls.push({ ax: A[0], az: A[1], bx: B[0], bz: B[1], y0: top - 0.5, y1: top + 0.95, half: 0.05 });
        const bar = (ya, yb2) => { const dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz); const g = new THREE.BoxGeometry(l, 0.05, 0.05); g.rotateZ(Math.atan2(yb2 - ya, l)); g.rotateY(-Math.atan2(dz, dx)); g.translate((A[0] + B[0]) / 2, (ya + yb2) / 2, (A[1] + B[1]) / 2); geo.metal.push(g); };
        bar(top + 0.95, top + hs + 0.95); const pg = new THREE.CylinderGeometry(0.03, 0.03, 0.95 + TH, 6); pg.translate(A[0], top - TH + (0.95 + TH) / 2, A[1]); geo.metal.push(pg); }
    }
    { const rc = TW_AC / 0.866, g = new THREE.CylinderGeometry(rc, rc, yT - y0 + 1.05, 6); g.translate(c[0], (y0 + yT + 1.05) / 2, c[1]); geo.metal.push(g);
      for (let i = 0; i < 6; i++) { const a0 = i * Math.PI / 3, a1 = a0 + Math.PI / 3; col.walls.push({ ax: c[0] + Math.cos(a0) * rc, az: c[1] + Math.sin(a0) * rc, bx: c[0] + Math.cos(a1) * rc, bz: c[1] + Math.sin(a1) * rc, y0, y1: yT + 1, half: 0.05 }); } }
    // bordes van de bovenste tree naar de deur
    { const tx = -T.out[1], tz = T.out[0], w = 1.0, pts = [[T.door[0] + tx * w, T.door[1] + tz * w], [T.door[0] - tx * w, T.door[1] - tz * w]];
      for (const da of [-1.5, -0.5, 0.5, 1.5]) pts.push(P(phi + da * step / 1.5, TW_AP));
      const L = hull2(pts); prism(L, yT - 0.3, yT, geo.slab); const cx = L.reduce((s2, p) => s2 + p[0], 0) / L.length, cz = L.reduce((s2, p) => s2 + p[1], 0) / L.length;
      col.surfaces.push({ kind: 'poly', cx, cz, pts: L.map(p => [p[0] - cx, p[1] - cz]), top: yT, bottom: yT - 0.3 });
      for (let i = 0; i < L.length; i++) { const A = L[i], B = L[(i + 1) % L.length], mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
        if (Math.abs((mx - T.door[0]) * T.out[0] + (mz - T.door[1]) * T.out[1]) < 0.15) continue;   // langs de gevel: open (daar is de deur)
        if (Math.hypot(mx - c[0], mz - c[1]) < TW_AP + 0.05) continue;   // tegen de trap: open
        col.walls.push({ ax: A[0], az: A[1], bx: B[0], bz: B[1], y0: yT, y1: yT + 1.0, half: 0.05 });
        const dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz); if (l < 0.05) continue; const g = new THREE.BoxGeometry(l, 0.05, 0.05); g.rotateY(-Math.atan2(dz, dx)); g.translate(mx, yT + 1.0, mz); geo.metal.push(g);
        const pg = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6); pg.translate(A[0], yT + 0.5, A[1]); geo.metal.push(pg); } }
  }
