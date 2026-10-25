  // ---------- Driehoekraster: een schets bestaat uit gekleurde driehoeken (zijde 4,5 m, een vak is 24 driehoeken) ----------
  const TS = R / 2, TRI_H = { muur: 3, dak: 3, glas: 3 }, TRI_EXT = new Set(['muur', 'dak', 'glas']);
  const triP = (i, j, ts = TS) => [i * ts * SQ3 / 2, i * ts / 2 + j * ts];
  function triVerts(i, j, t, ts = TS) { const A = triP(i, j, ts), B = triP(i + 1, j, ts), C = triP(i, j + 1, ts), D = triP(i + 1, j + 1, ts); return t ? [B, D, C] : [A, B, C]; }
  const TRI_STY = { muur: ['#9a5b45', '#c4c6c2'], dak: ['#9a5b45', '#8f3f33'], glas: ['#6f9bb8', '#9fc7de'], weg: ['#3c4045'], pad: ['#9b5a45'], vloer: ['#cfc6b0'], gras: ['#7bb356'], water: ['#3a7ca5'] };
  const TRI_Y = { weg: 0.12, pad: 0.15, vloer: 0.14, gras: 0.04, water: 0.06 };
  const trisOf = () => cells.tris || (cells.tris = []);   // {k, v: [ax, az, bx, bz, cx, cz], h}
  let triGroup = null;
  const TM = {};
  function buildTriNet() {
    if (triGroup) { triGroup.traverse(m => { if (m.isMesh && m.userData.own) m.geometry.dispose(); }); scene.remove(triGroup); }
    triGroup = triBuild(cells.tris); scene.add(triGroup);
  }
  function triBuild(T) {   // meshes voor een lijst driehoeken {k, v, h}; ook gebruikt door de 3D-weergave in de schets
    const triGroup = new THREE.Group();
    if (!TM.muur) for (const k in TRI_STY) TM[k] = TRI_STY[k].map((c, n) => vmat(c, 2 + n));
    if (!T || !T.length) return triGroup;
    const by = {}; for (const t of T) (by[t.k] || (by[t.k] = [])).push(t);
    const mk = (pos, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; m.userData.own = true; triGroup.add(m); };
    const r2 = v => Math.round(v * 20) / 20, topY = t => TRI_EXT.has(t.k) ? (t.h != null ? t.h : TRI_H[t.k]) : TRI_Y[t.k] + (t.k === 'water' ? 0 : (t.h || 0));
    const eid = (p, q) => [r2(p[0]) + ',' + r2(p[1]), r2(q[0]) + ',' + r2(q[1])].sort().join('|');
    const EM = new Map();   // rand -> hoogtes van de driehoeken die eraan grenzen
    for (const t of T) { const [ax, az, bx, bz, cx, cz] = t.v, y = topY(t); for (const [p, q] of [[[ax, az], [bx, bz]], [[bx, bz], [cx, cz]], [[cx, cz], [ax, az]]]) { const id = eid(p, q), e = EM.get(id); if (e) e.push(y); else EM.set(id, [y]); } }
    for (const k in by) {
      const top = [], side = [];
      for (const t of by[k]) {
        const h = topY(t), [ax, az, bx, bz, cx, cz] = t.v;
        top.push(ax, h, az, cx, h, cz, bx, h, bz);   // winding: boven
        if (h > 0.5) for (const [p, q] of [[[ax, az], [bx, bz]], [[bx, bz], [cx, cz]], [[cx, cz], [ax, az]]]) {
          const ys = EM.get(eid(p, q)), low = ys.length > 1 ? Math.min(...ys) : 0;
          if (ys.length > 1 && low >= h - 0.01) continue;   // de buur is even hoog of hoger: geen wand nodig
          const y0 = ys.length > 1 ? (ys[0] === h && ys[1] === h ? h : low) : 0;
          side.push(p[0], y0, p[1], q[0], y0, q[1], q[0], h, q[1], p[0], y0, p[1], q[0], h, q[1], p[0], h, p[1]);
        }
      }
      mk(top, TM[k][TM[k].length > 1 ? 1 : 0]);
      if (side.length) mk(side, TM[k][0]);
    }
    return triGroup;
  }
  function triWorld(mod, rot, q0, r0) {   // module-driehoeken omgezet naar wereldcoördinaten
    const th = -rot * Math.PI / 3, c = Math.cos(th), sn = Math.sin(th), o = cellToWorld(q0, r0);
    return (mod.tris || []).map(([i, j, t, k, h]) => { const v = []; for (const p of triVerts(i, j, t, R / ([1, 2, 4, 8].includes(mod.n) ? mod.n : 2))) v.push(Math.round((o.x + p[0] * c - p[1] * sn) * 100) / 100, Math.round((o.z + p[0] * sn + p[1] * c) * 100) / 100); return { k, v, h: h != null ? h * 3 : undefined }; });
  }
  function eraseTriAt(res) {
    if (!res || !res.point || !cells.tris || !cells.tris.length) return false;
    const x = res.point.x, z = res.point.z, n0 = cells.tris.length;
    cells.tris = cells.tris.filter(t => Math.hypot((t.v[0] + t.v[2] + t.v[4]) / 3 - x, (t.v[1] + t.v[3] + t.v[5]) / 3 - z) > 3.2);
    if (cells.tris.length === n0) return false;
    buildTriNet(); changed(); toast('Weggehaald', 900); return true;
  }

  // ---------- Vrije vectorwegen: lijnen die niet aan het raster vastzitten (uit een schets of module) ----------
  const pathsOf = () => cells.paths || (cells.paths = []);
  const PW_H = 0.25;   // stoephoogte van een getekende weg
  // laan: per richting rijstrook 3,25 · parkeerstrook 2 · fietspad 2, met een middenberm van 3 m (med = halve berm)
  // zelfde maten als de oude vakwegen: weg 9 m (rijbaan 5 m + 2 m stoep), brede weg 13 m (vier stroken), laan 22,5 m
  // snelweg: per richting twee stroken van 3,5 m en een vluchtstrook van 2,2 m, in het midden een betonnen barrière;
  // geen stoep maar een grasberm (walk). Klinkerstraat: smal, rood gebakken klinkers, geen belijning. Fietspad: rood
  // asfalt, 2,5 m, alleen voor de sier en de looproute. ring: de rijbaan van een rotonde (eenrichting, zie vecGraphOf).
  const PATH_DEF = { weg: { hw: 2.5, walk: 2.0 }, brd: { hw: 4.5, walk: 2.0 }, laan: { hw: 8.75, walk: 2.5, med: 1.5 }, pad: { hw: 1.6, walk: 0.5 },
    snel: { hw: 10.1, walk: 2.0, snel: true }, klink: { hw: 2.75, walk: 1.8, klink: true }, fiets: { hw: 1.25, walk: 0.4 }, ring: { hw: 2.75, walk: 0 } };
  const CAR_T = new Set(['weg', 'brd', 'laan', 'snel', 'klink']);   // getekende wegen waar auto's over rijden
  const ROT = { Rc: 11, Ri: 8.25, Ro: 13.75, isl: 6.75 };   // rotonde: midden van de rijbaan, binnen- en buitenrand, eiland (met overrijdbare rand tot Ri)
  // Een lijn knippen met een cirkel: de stukken buiten de cirkel, met de snijpunten op de cirkel (arms: waar ze de cirkel raken)
  function clipCircle(pts, C, r, arms) {
    const inside = p => Math.hypot(p[0] - C[0], p[1] - C[1]) < r, out = []; let cur = inside(pts[0]) ? null : [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], ia = inside(a), ib = inside(b);
      if (ia !== ib) {
        const dx = b[0] - a[0], dz = b[1] - a[1], fx = a[0] - C[0], fz = a[1] - C[1], A = dx * dx + dz * dz, B = 2 * (fx * dx + fz * dz), Cc = fx * fx + fz * fz - r * r, disc = Math.sqrt(Math.max(0, B * B - 4 * A * Cc));
        let t = (-B + (ia ? disc : -disc)) / (2 * A); t = Math.max(0, Math.min(1, t));
        const x = [a[0] + dx * t, a[1] + dz * t];
        if (arms && !arms.some(m => Math.hypot(m.pt[0] - x[0], m.pt[1] - x[1]) < 3)) arms.push({ pt: x, th: Math.atan2(x[1] - C[1], x[0] - C[0]) });
        if (ia) cur = [x, b]; else { cur.push(x); out.push(cur); cur = null; }
      } else if (!ia) cur.push(b);
    }
    if (cur && cur.length > 1) out.push(cur);
    return out;
  }
  function rotClip(pts, rots, arms) {   // alle rotondes: stukken buiten de rijbaanmiddens
    let parts = [pts];
    for (const R0 of rots) { const nx = []; for (const pp of parts) nx.push(...clipCircle(pp, R0.c, ROT.Rc, arms ? R0.arms : null)); parts = nx; }
    return parts.filter(pp => pp.length > 1 && plen(pp) > 0.5);
  }
  const vmat = (color, n) => std({ color, polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n, side: THREE.DoubleSide });
  const VM = { klink: vmat('#7d4c3f', 3), bike: vmat('#a54a3c', 2), rail: std({ color: '#b9bcbf', metalness: 0.4, roughness: 0.45, side: THREE.DoubleSide }), barrier: std({ color: '#c9c7c0', side: THREE.DoubleSide }), skirt: vmat('#a9a59a', 0), grass: vmat('#6aa84a', 1), walk: vmat('#c3beb1', 1), kerb: vmat('#8f8b82', 2), asph: vmat('#3c4045', 3), dash: vmat('#f1efe6', 4), pave: vmat('#9b5a45', 3) };
  let pathGroup = null;
  // Welke vakken beslaat een getekende weg? Een vak hoort erbij als zijn midden dicht genoeg bij de lijn ligt
  // (breedte van de weg plus een half vak). Die vakken krijgen een zandkleurige vloer en zijn niet meer bebouwbaar.
  let vecCover = new Set();
  function vecCoverOf(P, strict) {   // strict: alleen vakken waarvan het midden binnen de verharding ligt (voor obstakels)
    const out = new Set();
    for (const path of P || []) {
      if (path.t === 'rot' && path.p && path.p.length) {   // rotonde: alles binnen de stoep
        const C = path.p[0], reach = ROT.Ro + 2.3 + (strict ? 0 : R * 0.5), [q0, r0] = worldToCell(C[0], C[1]);
        for (let dq = -3; dq <= 3; dq++) for (let dr = -3; dr <= 3; dr++) { const c = cellToWorld(q0 + dq, r0 + dr); if (Math.hypot(c.x - C[0], c.z - C[1]) < reach) out.add((q0 + dq) + ',' + (r0 + dr)); }
        continue;
      }
      const def = PATH_DEF[path.t]; if (!def || !path.p || path.p.length < 2) continue;
      const pts = smoothPts(path.p), reach = def.hw + def.walk + (strict ? 0 : R * 0.5), cand = new Set(), samp = [];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (R / 2))); for (let j = 0; j <= n; j++) samp.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
      for (const p of samp) { const [q, r] = worldToCell(p[0], p[1]); for (let dq = -2; dq <= 2; dq++) for (let dr = -2; dr <= 2; dr++) cand.add((q + dq) + ',' + (r + dr)); }
      for (const k of cand) { const [q, r] = k.split(',').map(Number), c = cellToWorld(q, r); if (distPoly(c.x, c.z, pts) < reach) out.add(k); }
    }
    return out;
  }
  // Randvulling: van een vak dat deels op een weg ligt blijven de zes taartpunten (sectoren, 0..5) over die vrij van
  // wegen en stoep zijn. Geeft een bitmasker (0 = geen enkele punt vrij, 63 = het hele vak is vrij).
  function secMaskOf(P, q, r, margin = 0.4) {
    const items = [];
    for (const path of P || []) {
      if (path.t === 'rot' && path.p && path.p.length) items.push({ c: path.p[0], off: ROT.Ro + 2.3 });
      else { const def = PATH_DEF[path.t]; if (def && path.p && path.p.length >= 2) items.push({ pts: smoothPts(path.p), off: def.hw + def.walk }); }
    }
    const c = cellToWorld(q, r), gap = (x, z) => { let g = 1e9; for (const it of items) g = Math.min(g, (it.c ? Math.hypot(x - it.c[0], z - it.c[1]) : distPoly(x, z, it.pts)) - it.off); return g; };
    let mask = 0;
    for (let s = 0; s < 6; s++) {
      const a0 = (30 + 60 * s) * Math.PI / 180, a1 = a0 + Math.PI / 3, am = (a0 + a1) / 2;
      const pts = [[0.55, am], [0.87, am], [1, a0], [1, a1]];
      let ok = true;
      for (const [rr, an] of pts) if (gap(c.x + Math.cos(an) * R * rr, c.z + Math.sin(an) * R * rr) < margin) { ok = false; break; }
      if (ok) mask |= 1 << s;
    }
    return mask;
  }
  // Vakken waar een weg niet doorheen mag: gebouwen en alles wat hoger is dan de grond, en water
  // (water en een uitgraving mogen: daar wordt de weg een brug)
  const vecObstacle = (q, r) => { if (modCellOccupied(q, r)) return true; const st = stackOf(q, r); if (!st.length) return false; const b = baseOf(st[0]); if (b === 'water' || b === 'kuil') return st.length > 1; if (b === 'heuvel') return !terrOnly(q, r); return columnTop(q, r) > 0.5; };   // over een heuvel mag een weg: hij volgt het terrein
  const SAND = std({ color: '#d6c69a', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const HEX_FLAT = (() => { const s = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; i ? s.lineTo(Math.cos(a) * R, Math.sin(a) * R) : s.moveTo(Math.cos(a) * R, Math.sin(a) * R); } s.closePath(); return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); })();
  function smoothPts(p) {   // hoeken afronden (straal tot 8 m, nooit verder dan de helft van een stuk), ongeveer elke 2 m een punt
    if (p.length < 3) return p.map(a => a.slice());
    // gesloten lus (eindpunt = beginpunt): beginnen halverwege het eerste stuk, zodat ook die hoek rond wordt
    if (p.length > 3 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 0.5) { const m = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2]; p = [m, ...p.slice(1, -1), p[0], m]; }
    const out = [p[0].slice()];
    const push = q => { const l = out[out.length - 1]; if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.05) out.push(q); };
    const lineTo = (a, b) => { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)); for (let i = 1; i <= n; i++) push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); };
    let cur = p[0];
    for (let i = 1; i < p.length - 1; i++) {
      const A = cur, P = p[i], B = p[i + 1], la = Math.hypot(P[0] - A[0], P[1] - A[1]), lb = Math.hypot(B[0] - P[0], B[1] - P[1]);
      const d = Math.min(8, la * 0.45, lb * 0.45);
      if (d < 0.3) { lineTo(cur, P); cur = P; continue; }
      const P1 = [P[0] + (A[0] - P[0]) / la * d, P[1] + (A[1] - P[1]) / la * d], P2 = [P[0] + (B[0] - P[0]) / lb * d, P[1] + (B[1] - P[1]) / lb * d];
      lineTo(cur, P1);
      const n = Math.max(3, Math.ceil(d / 1.2));
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push([u * u * P1[0] + 2 * u * t * P[0] + t * t * P2[0], u * u * P1[1] + 2 * u * t * P[1] + t * t * P2[1]]); }
      cur = P2;
    }
    lineTo(cur, p[p.length - 1]);
    return out;
  }
  // ---------- Hoogte van een weg: volgt het terrein, glad gemaakt, plus de eigen ophoging ----------
  // Elke getekende weg krijgt een hoogteprofiel langs zijn lengte: het maaiveld onder de middenlijn (een brug over water
  // of een uitgraving blijft op straatniveau), uitgevlakt over ±6 m zodat hij geleidelijk stijgt en daalt. path.y
  // (optioneel, per punt) tilt de weg op dat punt op boven het terrein; daartussen loopt de ophoging lineair.
  const profCache = new Map();
  let terrVer = 0;   // telt op bij elke verandering van de vakken (terrein): profielen worden dan opnieuw berekend
  const ROAD_MAX_OFF = 12;
  function pathProf(path) {
    const snels = path.t === 'snel' ? [] : (cells.paths || []).filter(p => p.t === 'snel' && p.p && p.p.length > 1);
    const sig = terrVer + '|' + JSON.stringify(path.p) + '|' + (path.y ? path.y.join(',') : '') + '|' + snels.map(p => JSON.stringify(p.p)).join(';');
    let P = profCache.get(path); if (P && P.sig === sig) return P;
    const sp = smoothPts(path.p), pts = [], S = [];
    for (let i = 0; i < sp.length - 1; i++) { const a = sp[i], b = sp[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / 1.5)); for (let j = 0; j < n; j++) pts.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
    pts.push(sp[sp.length - 1]); for (let i = 0; i < pts.length; i++) S.push(i ? S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) : 0);
    const live = !!(cells.paths && cells.paths.includes(path));
    let h = pts.map(p => live ? terrainHeightAt(p[0], p[1]) : 0);
    if (live && h.some(v => v > 0.01)) {   // glad: gemiddelde over ±6 m, twee keer
      for (let pass = 0; pass < 2; pass++) { const o = h.slice(); let a = 0, b = 0, sum = 0; for (let i = 0; i < h.length; i++) { while (b < h.length && S[b] <= S[i] + 6) sum += o[b++]; while (S[a] < S[i] - 6) sum -= o[a++]; h[i] = sum / (b - a); } }
    }
    if (live && Array.isArray(path.y) && path.y.some(v => v)) {   // ophoging per punt, lineair langs de weg
      const sAt = q => { let bi = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; bi = i; } }); return S[bi]; };
      const keys = path.p.map((q, i) => [sAt(q), Math.max(0, Math.min(path.abs ? 24 : ROAD_MAX_OFF, +path.y[i] || 0))]).sort((x, y) => x[0] - y[0]);
      h = h.map((v, i) => { const s0 = S[i]; let j = 0; while (j < keys.length - 1 && keys[j + 1][0] < s0) j++; const A = keys[j], B = keys[Math.min(j + 1, keys.length - 1)], f = B[0] > A[0] ? Math.max(0, Math.min(1, (s0 - A[0]) / (B[0] - A[0]))) : 0; return (path.abs ? 0 : v) + A[1] + (B[1] - A[1]) * f; });   // abs: vaste laag, hoogte los van het terrein
    }
    // Over een snelweg gaat een andere weg altijd met een viaduct: 7 m boven de snelweg over de hele breedte, met
    // opritten van 55 m aan weerszijden (een uiteinde dat óp de snelweg uitkomt is een aansluiting, geen kruising)
    if (live && snels.length) {
      const L = S[S.length - 1];
      for (const sp of snels) {
        const sq = smoothPts(sp.p), half = PATH_DEF.snel.hw + 3;
        for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < sq.length - 1; j++) {
          const x = segX(pts[i], pts[i + 1], sq[j], sq[j + 1]); if (!x) continue;
          const s0 = S[i] + (S[i + 1] - S[i]) * x[0]; if (s0 < 8 || s0 > L - 8) continue;
          const cx = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * x[0], cz = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * x[0], top = terrainHeightAt(cx, cz) + 7;
          const d1 = pts[i + 1][0] - pts[i][0], d2 = pts[i + 1][1] - pts[i][1], e1 = sq[j + 1][0] - sq[j][0], e2 = sq[j + 1][1] - sq[j][1];
          const sinA = Math.abs(d1 * e2 - d2 * e1) / ((Math.hypot(d1, d2) * Math.hypot(e1, e2)) || 1), plat = half / Math.max(0.35, sinA);   // schuin erover: langere overspanning
          h = h.map((v, k) => { const d = Math.abs(S[k] - s0), w = d <= plat ? 1 : d >= plat + 55 ? 0 : smooth01(1 - (d - plat) / 55); return w ? v + Math.max(0, top - v) * w : v; });
        }
      }
    }
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }
    P = { sig, pts, S, h, bb: [x0, z0, x1, z1], flat: !h.some(v => Math.abs(v) > 0.01) };
    profCache.set(path, P); return P;
  }
  function pathH(path, x, z) {   // hoogte van de weg bij het dichtstbijzijnde punt van zijn middenlijn
    const P = pathProf(path); if (P.flat) return 0;
    let bi = 0, bf = 0, bd = 1e9; const pts = P.pts;
    for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), d = (a[0] + dx * f - x) ** 2 + (a[1] + dz * f - z) ** 2; if (d < bd) { bd = d; bi = i; bf = f; } }
    return P.h[bi] + ((P.h[bi + 1] ?? P.h[bi]) - P.h[bi]) * bf;
  }
  // ---------- Vectorwegen als graaf: knopen op uiteinden, kruisingen en T-aansluitingen, takken ertussen ----------
  // Gebruikt door de auto's en de mensen (rijstroken en stoepen) en door de tekenlaag (stoepen die bij kruisingen ophouden).
  const segX = (a, b, c, d) => {   // snijpunt van segmenten ab en cd als [t, u], of null
    const rx = b[0] - a[0], rz = b[1] - a[1], sx = d[0] - c[0], sz = d[1] - c[1], den = rx * sz - rz * sx;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * sz - (c[1] - a[1]) * sx) / den, u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
    return t > -1e-6 && t < 1 + 1e-6 && u > -1e-6 && u < 1 + 1e-6 ? [t, u] : null;
  };
  const plen = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
  const dirAt = (pts, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
  // Een weg van minder dan een meter is één los vak (een klik): alleen een rondje, nog geen weg om over te rijden
  const isLone = p => { if (!p.p || p.p.length < 2) return false; let L = 0; for (let i = 1; i < p.p.length; i++) L += Math.hypot(p.p[i][0] - p.p[i - 1][0], p.p[i][1] - p.p[i - 1][1]); return L < 1; };
  function vecGraphOf(paths, ver) {
    const P = (paths || []).filter(p => CAR_T.has(p.t) && p.p && p.p.length > 1 && !isLone(p));
    const rots = (paths || []).filter(p => p.t === 'rot' && p.p && p.p.length).map(p => ({ c: p.p[0], src: p, arms: [] }));
    const mkLine = (t, src, pts) => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q[0]); z0 = Math.min(z0, q[1]); x1 = Math.max(x1, q[0]); z1 = Math.max(z1, q[1]); } return { t, src, pts, cuts: new Set(), bb: [x0 - 9, z0 - 9, x1 + 9, z1 + 9] }; };
    // rotondes: de wegen houden op bij de rijbaan van de rotonde; waar ze de cirkel raken komt een aansluiting
    const lines = [];
    for (const p of P) for (const pts of rots.length ? rotClip(smoothPts(p.p), rots, true) : [smoothPts(p.p)]) lines.push(mkLine(p.t, p, pts));
    const sameLevel = (A, B, x, z) => Math.abs(pathH(A.src, x, z) - pathH(B.src, x, z)) < 2.5;   // een weg die eroverheen gaat (viaduct) kruist niet
    const bbHit = (A, B) => A.bb[0] <= B.bb[2] && B.bb[0] <= A.bb[2] && A.bb[1] <= B.bb[3] && B.bb[1] <= A.bb[3];
    const cutAt = (L, i, f) => { if (f < 0.02) { if (i > 0) L.cuts.add(i); } else if (f > 0.98) { if (i + 1 < L.pts.length - 1) L.cuts.add(i + 1); } else L.cuts.add(i + f); };
    // kruisende lijnen: allebei knippen op het snijpunt
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
      const A = lines[a], B = lines[b]; if (!bbHit(A, B)) continue;
      for (let i = 0; i < A.pts.length - 1; i++) for (let j = 0; j < B.pts.length - 1; j++) { const x = segX(A.pts[i], A.pts[i + 1], B.pts[j], B.pts[j + 1]); if (x && sameLevel(A, B, A.pts[i][0] + (A.pts[i + 1][0] - A.pts[i][0]) * x[0], A.pts[i][1] + (A.pts[i + 1][1] - A.pts[i][1]) * x[0])) { cutAt(A, i, x[0]); cutAt(B, j, x[1]); } }
    }
    // een lijn die zichzelf kruist (een lus of een acht): ook daar knippen (niet de stukken die aan elkaar vastzitten)
    for (const A of lines) {
      const n = A.pts.length - 1, closed = Math.hypot(A.pts[0][0] - A.pts[n][0], A.pts[0][1] - A.pts[n][1]) < 0.5;
      for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
        if (closed && i === 0 && j === n - 1) continue;
        const x = segX(A.pts[i], A.pts[i + 1], A.pts[j], A.pts[j + 1]);
        if (x && x[0] > 1e-3 && x[0] < 1 - 1e-3 || x && x[1] > 1e-3 && x[1] < 1 - 1e-3) { cutAt(A, i, x[0]); cutAt(A, j, x[1]); }
      }
    }
    // een uiteinde dat op een andere lijn uitkomt (T-aansluiting): die lijn daar knippen; ook op de eigen lijn, als
    // dat stuk ver genoeg (langs de weg gemeten) van dat uiteinde af ligt
    for (const A of lines) for (const [e, atEnd] of [[A.pts[0], false], [A.pts[A.pts.length - 1], true]]) for (const B of lines) {
      if (e[0] < B.bb[0] || e[0] > B.bb[2] || e[1] < B.bb[1] || e[1] > B.bb[3]) continue;
      const self = B === A, S = self ? (A.S || (A.S = A.pts.reduce((o, q, i) => (o.push(i ? o[i - 1] + Math.hypot(q[0] - A.pts[i - 1][0], q[1] - A.pts[i - 1][1]) : 0), o), []))) : null, sE = self ? (atEnd ? S[S.length - 1] : 0) : 0;
      let bi = -1, bf = 0, bd = 1e9;
      for (let j = 0; j < B.pts.length - 1; j++) {
        if (self && Math.abs(S[j] - sE) < 14 && Math.abs(S[j + 1] - sE) < 14) continue;
        const p = B.pts[j], q = B.pts[j + 1], dx = q[0] - p[0], dz = q[1] - p[1], l2 = dx * dx + dz * dz || 1;
        const f = Math.max(0, Math.min(1, ((e[0] - p[0]) * dx + (e[1] - p[1]) * dz) / l2)), d = Math.hypot(e[0] - p[0] - dx * f, e[1] - p[1] - dz * f);
        if (d < bd) { bd = d; bi = j; bf = f; }
      }
      if (bi >= 0 && bd < PATH_DEF[B.t].hw + 1.5 && !(bi === 0 && bf < 0.02) && !(bi === B.pts.length - 2 && bf > 0.98) && sameLevel(A, B, e[0], e[1])) cutAt(B, bi, bf);
    }
    const pieces = [];
    for (const L of lines) {
      const cuts = [...L.cuts].sort((x, y) => x - y); let cur = [L.pts[0]], ci = 0;
      for (let i = 0; i < L.pts.length - 1; i++) {
        while (ci < cuts.length && cuts[ci] < i + 1) {
          const f = cuts[ci] - i, p = f <= 0 ? L.pts[i] : [L.pts[i][0] + (L.pts[i + 1][0] - L.pts[i][0]) * f, L.pts[i][1] + (L.pts[i + 1][1] - L.pts[i][1]) * f];
          if (f > 0) cur.push(p);
          if (cur.length > 1) pieces.push({ t: L.t, src: L.src, pts: cur });
          cur = [p]; ci++;
        }
        cur.push(L.pts[i + 1]);
      }
      if (cur.length > 1) pieces.push({ t: L.t, src: L.src, pts: cur });
    }
    // de rijbaan van elke rotonde: bogen tussen de aansluitingen, in de rijrichting (tegen de klok in van boven gezien)
    for (const R0 of rots) {
      const C = R0.c, Rc = ROT.Rc, arms = R0.arms.sort((a, b) => b.th - a.th);
      const arc = (th0, th1) => { const n = Math.max(4, Math.ceil(Math.abs(th0 - th1) * Rc / 1.5)); return Array.from({ length: n + 1 }, (_, i) => { const t = th0 + (th1 - th0) * i / n; return [C[0] + Math.cos(t) * Rc, C[1] + Math.sin(t) * Rc]; }); };
      if (!arms.length) pieces.push({ t: 'ring', src: R0.src, pts: arc(0, -2 * Math.PI) });
      else for (let i = 0; i < arms.length; i++) { const a = arms[i], b = arms[(i + 1) % arms.length]; let th1 = b.th; if (th1 >= a.th - 1e-6) th1 -= 2 * Math.PI; pieces.push({ t: 'ring', src: R0.src, pts: arc(a.th, th1) }); }
    }
    // een stuk dat bij zijn eigen begin eindigt (gesloten lus zonder aansluitingen): in tweeën, met een knoop halverwege
    for (let k = pieces.length - 1; k >= 0; k--) {
      const pc = pieces[k], a = pc.pts[0], b = pc.pts[pc.pts.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) >= 7 || pc.pts.length < 4 || plen(pc.pts) < 20) continue;
      const half = plen(pc.pts) / 2; let acc = 0, m = 1;
      for (; m < pc.pts.length - 1; m++) { acc += Math.hypot(pc.pts[m][0] - pc.pts[m - 1][0], pc.pts[m][1] - pc.pts[m - 1][1]); if (acc >= half) break; }
      pieces.splice(k, 1, { t: pc.t, src: pc.src, pts: pc.pts.slice(0, m + 1) }, { t: pc.t, src: pc.src, pts: pc.pts.slice(m) });
    }
    // knopen: uiteinden die bij elkaar liggen zijn één knoop; het eerste uiteinde bepaalt de plek
    const nodes = [], nodeOf = p => { for (let i = 0; i < nodes.length; i++) if (Math.hypot(nodes[i].x - p[0], nodes[i].z - p[1]) < 7) return i; nodes.push({ x: p[0], z: p[1], edges: [] }); return nodes.length - 1; };
    const edges = new Map(); let totalLen = 0;
    const rk = p => Math.round(p[0] * 2) / 2 + ',' + Math.round(p[1] * 2) / 2;
    // eerst alle uiteinden aan knopen toewijzen; een knoop komt op het zwaartepunt van zijn uiteinden te liggen, en de
    // uiteinden van de stukken worden daarop vastgezet, zodat rijstroken, stoepen en hoeken één middelpunt delen
    const ends = pieces.map(pc => [nodeOf(pc.pts[0]), nodeOf(pc.pts[pc.pts.length - 1])]);
    const acc = nodes.map(() => [0, 0, 0]);
    pieces.forEach((pc, i) => { const [a, b] = ends[i]; acc[a][0] += pc.pts[0][0]; acc[a][1] += pc.pts[0][1]; acc[a][2]++; const q = pc.pts[pc.pts.length - 1]; acc[b][0] += q[0]; acc[b][1] += q[1]; acc[b][2]++; });
    nodes.forEach((N, i) => { if (acc[i][2]) { N.x = acc[i][0] / acc[i][2]; N.z = acc[i][1] / acc[i][2]; } });
    const snap = (pts, n, atStart) => {   // uiteinde op de knoop; tussenpunten binnen 1,5 m van de knoop vervallen
      const N = nodes[n], P = atStart ? pts : pts.slice().reverse(), out = [[N.x, N.z]];
      for (let i = 1; i < P.length; i++) if (Math.hypot(P[i][0] - N.x, P[i][1] - N.z) > 1.5 || i === P.length - 1) out.push(P[i]);
      return atStart ? out : out.reverse();
    };
    pieces.forEach((pc, i) => {
      const [a, b] = ends[i]; if (a === b) return;
      let pts = snap(pc.pts, a, true); pts = snap(pts, b, false); if (pts.length < 2) return;
      const len = plen(pts); if (len < 7) return;   // korter dan de samenvoegstraal van knopen: dan zijn a en b al één knoop
      let id = pc.t + ':' + rk(pts[0]) + '>' + rk(pts[pts.length - 1]); while (edges.has(id)) id += "'";
      edges.set(id, { id, t: pc.t, src: pc.src, pts, a, b, len }); nodes[a].edges.push(id); nodes[b].edges.push(id); totalLen += len;
    });
    for (const e of edges.values()) if (e.t === 'ring') { e.oneway = true; nodes[e.a].rot = true; nodes[e.b].rot = true; }   // rotonde: eenrichting, geen lichten
    // Verkeerslichten: elke knoop met drie of meer takken. De takken worden in twee groepen verdeeld (de as van de
    // eerste tak en de rest); de groepen krijgen om de beurt groen. Elke kruising heeft een eigen beginmoment.
    for (let n = 0; n < nodes.length; n++) {
      const N = nodes[n]; if (N.edges.length < 3 || N.rot || N.edges.some(id => edges.get(id).t === 'snel' || edges.get(id).t === 'klink')) continue;   // geen lichten op een rotonde of de snelweg (invoegen)
      const dirIn = id => { const e = edges.get(id); const into = e.b === n; const p = into ? e.pts : e.pts.slice().reverse(); const a = p[p.length - 2], b = p[p.length - 1]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
      // takken op (bijna) dezelfde lijn vormen één groep; elke groep krijgt om de beurt groen (meestal 2, bij zes takken 3)
      const reps = [], grp = new Map();
      for (const id of N.edges) { const d = dirIn(id); let g = reps.findIndex(r => Math.abs(d[0] * r[0] + d[1] * r[1]) > 0.9); if (g < 0) { g = reps.length; reps.push(d); } grp.set(id, g); }
      if (reps.length < 2) continue;
      N.light = { grp, n: reps.length, off: ((Math.round(N.x * 7) * 31 + Math.round(N.z * 7) * 17) & 1023) / 1024 * 28 };
    }
    nodes.forEach(N => { let sum = 0; for (const id of N.edges) { const e = edges.get(id); sum += pathH(e.src, N.x, N.z); } N.y = N.edges.length ? sum / N.edges.length : 0; });   // hoogte van de knoop
    return { nodes, edges, totalLen, ver: ver || 0 };
  }
  const VTL = { G: 10, A: 2.5, AR: 1.5 };   // per groep: groen, oranje, alles rood
  function vecLightState(G, n, eid, t) {   // 'g' | 'a' | 'r', of null als er geen licht staat
    const N = G.nodes[n]; if (!N || !N.light || !N.light.grp.has(eid)) return null;
    const per = VTL.G + VTL.A + VTL.AR, cyc = per * (N.light.n || 2), tt = ((t + N.light.off) % cyc + cyc) % cyc, i = Math.floor(tt / per), w = tt - i * per;
    if (N.light.grp.get(eid) !== i) return 'r';
    return w < VTL.G ? 'g' : w < VTL.G + VTL.A ? 'a' : 'r';
  }
  let vecLightReg = [];   // lampen van de getekende kruisingen: [{ n, eid, lamps }], bijgewerkt door updateLights
  // Kruisingsvak: zo ver van de knoop houden rijstroken, markering en stoepen op. Minimaal 7,5 m, zodat ook een
  // scherpe bocht (60° tussen de takken, gewoon op een zeshoekraster) ruimte heeft en afslaande auto's niet over de
  // stoephoek gaan; bij brede wegen de halve breedte plus 2,5 m.
  const vecJunctionTrim = (G, n) => {
    const N = G.nodes[n]; if (!N) return 0; if (N.rot) return 3.5;   // rotonde: de aansluiting ligt op de ring
    if (N.edges.length < 3) return 0;
    let hw = 0; for (const id of N.edges) hw = Math.max(hw, PATH_DEF[G.edges.get(id).t].hw); return Math.max(hw + 2.5, 7.5);
  };
  // Knik: twee takken die onder een hoek op elkaar aansluiten (een bocht uit twee losse wegen). Geeft de draaihoek
  // (0 = rechtdoor) en de richtingen de knoop uit; null als het geen knik is.
  function vecBend(G, n) {
    const N = G.nodes[n]; if (!N || N.edges.length !== 2 || N.rot) return null;
    const D = N.edges.map(id => { const e = G.edges.get(id), p = e.a === n ? e.pts : e.pts.slice().reverse(), q = p[Math.min(p.length - 1, 2)]; const l = Math.hypot(q[0] - p[0][0], q[1] - p[0][1]) || 1; return { e, d: [(q[0] - p[0][0]) / l, (q[1] - p[0][1]) / l] }; });
    const cos = Math.max(-1, Math.min(1, D[0].d[0] * D[1].d[0] + D[0].d[1] * D[1].d[1])), turn = Math.PI - Math.acos(cos);
    return turn > 0.17 ? { turn, A: D[0], B: D[1], hw: Math.max(PATH_DEF[D[0].e.t].hw, PATH_DEF[D[1].e.t].hw), walk: Math.max(PATH_DEF[D[0].e.t].walk, PATH_DEF[D[1].e.t].walk) } : null;
  }
  // bij een knik houden rijstroken en markering zo ver voor de knoop op dat ze niet in de andere tak steken
  const vecBendTrim = (G, n, w) => { const B = vecBend(G, n); return B ? Math.min(8, w * Math.tan(Math.min(B.turn, 2.6) / 2)) : 0; };
  // Ronde kop van een doodlopende weg: een halve cirkel (bij een smalle weg wat breder dan de weg zelf, zodat een
  // auto kan keren) met stoep en rand eromheen. Het middelpunt C ligt op het eindpunt zelf: het midden van het
  // laatste zeshoekvak (cN = afstand van eindpunt tot middelpunt, nu 0). trimW: tot hier lopen de rechte stoepen; trimLane: tot hier lopen de
  // rijstroken, waarna de auto in een boog naar de keerbaan zwenkt.
  const HEAD_EXT = { weg: 2.1 }, HEAD_RHO = { weg: 3.0, brd: 3.4, laan: 3.125 };
  function vecHead(G, n) {
    const N = G.nodes[n]; if (!N || N.edges.length !== 1) return null;
    const e = G.edges.get(N.edges[0]), def = e && PATH_DEF[e.t]; if (!def || e.t === 'pad') return null;
    const pts = e.a === n ? e.pts : e.pts.slice().reverse();   // vanaf het eindpunt de weg in
    let q = pts[1] || pts[0]; for (let i = 1; i < pts.length; i++) { q = pts[i]; if (Math.hypot(q[0] - N.x, q[1] - N.z) > 1.5) break; }
    let dx = N.x - q[0], dz = N.z - q[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const R = def.hw + (HEAD_EXT[e.t] || 0), cN = 0, J = Math.sqrt(Math.max(0, R * R - def.hw * def.hw));
    return { N, e, def, d: [dx, dz], r: [-dz, dx], R, cN, rho: HEAD_RHO[e.t] || 3, C: [N.x, N.z], trimW: cN + J, trimLane: cN + (e.t === 'laan' ? 0 : 3.2) };
  }
  const vecTrimW0 = (G, n) => { if (G.nodes[n] && G.nodes[n].rot) return 2.6; /* de stoep van de weg begint net in de rotondestoep */ const H = vecHead(G, n); if (H) return H.trimW; const t = vecJunctionTrim(G, n); if (t) return t + 0.3; const B = vecBend(G, n); return B ? vecBendTrim(G, n, B.hw + B.walk + 0.3) : 0; };
  const vecTrimW = (G, n) => { const c = G.trimW || (G.trimW = new Map()); let v = c.get(n); if (v === undefined) c.set(n, v = vecTrimW0(G, n)); return v; };   // per graaf onthouden (de graaf wordt bij elke wijziging nieuw gebouwd)   // stoep: net voorbij de stopstreep
  function offsetPts(src, off) {   // de lijn opzij geschoven (rechts van de looprichting bij off > 0)
    const out = [];
    for (let i = 0; i < src.length; i++) { const a = src[Math.max(0, i - 1)], b = src[Math.min(src.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; out.push([src[i][0] - dz * off, src[i][1] + dx * off]); }
    return out;
  }
  function trimPts(pts, t0, t1) {   // t0 van het begin en t1 van het eind afknippen
    const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const len = seg[seg.length - 1]; if (t0 + t1 > 0 && t0 + t1 > len - 1.5) { const k = Math.max(0, len - 1.5) / (t0 + t1); t0 *= k; t1 *= k; }
    const at = s => { let i = 1; while (i < seg.length - 1 && seg[i] < s) i++; const f = (s - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; };
    const out = [at(t0)]; for (let i = 0; i < pts.length; i++) if (seg[i] > t0 + 0.05 && seg[i] < len - t1 - 0.05) out.push(pts[i]); out.push(at(len - t1)); return out;
  }
  const vecWalkPts = (G, e, dir, off) => trimPts(offsetPts(dir ? e.pts.slice().reverse() : e.pts, off), vecTrimW(G, dir ? e.b : e.a), vecTrimW(G, dir ? e.a : e.b));
  // ---------- Omzetting van oude vakwegen naar getekende wegen ----------
  // Rechte reeksen wegvakken (langs een van de drie assen) worden één getekende weg door de vakmiddens; een bocht of
  // kruising ontstaat waar reeksen elkaar raken. Twee rijen laanvakken worden één getekende laan over hun middenlijn.
  // Vakken met iets erbovenop (tunnel, looppad) of een brug over water blijven zoals ze zijn.
  // Maten van de oude vak-laan, alleen nog nodig om zo'n laan om te zetten: d = as (0..2) + 3 × kant; u = langs de as,
  // n = dwars, naar de partnerrij toe
  const LAAN_PITCH = R * SQ3, laanD = t => { const m = /^laan([0-5]?)$/.exec(t || ''); return m ? +(m[1] || 0) : -1; };
  const LAAN_G = [0, 1, 2, 3, 4, 5].map(d => { const a = d % 3, s = d >= 3 ? 1 : 0, U = FRAMES[a], u = [U.nx, U.nz], n = s ? [u[1], -u[0]] : [-u[1], u[0]]; return { a, u, n }; });
  function convertCellRoads() {
    // randwegen (weg of brede weg over de rand tussen twee vakken) worden getekende wegen over diezelfde lijn
    if (cells.edges && cells.edges.size) {
      const P0 = pathsOf(); let n = 0;
      for (const [k, type] of [...cells.edges]) {
        if (type !== 'weg' && type !== 'brd') continue;
        const [q, r, kk] = k.split(',').map(Number), [A, B] = edgeEnds(q, r, kk);
        P0.push({ t: type, l: 0, r: 0, p: [[Math.round(A[0] * 100) / 100, Math.round(A[1] * 100) / 100], [Math.round(B[0] * 100) / 100, Math.round(B[1] * 100) / 100]] });
        cells.edges.delete(k); n++;
      }
      if (n) buildEdgeNet();
    }
    const plain = new Set(), laanC = [];
    for (const [k, st] of cells) {
      if (!Array.isArray(st) || !st.length) continue;
      if (st.some(t => baseOf(t) === 'weg')) plain.add(k);   // ook een weg op water (brug) of onder een tunnel
      else if (st.length === 1 && laanD(st[0]) >= 0) laanC.push({ k, d: laanD(st[0]) });
    }
    if (!plain.size && !laanC.length) return false;
    const P = pathsOf(), rnd = v => Math.round(v * 100) / 100, cw = k => { const [q, r] = k.split(',').map(Number); return cellToWorld(q, r); };
    // lanen: groeperen per as en middenlijn
    const groups = new Map();
    for (const { k, d } of laanC) {
      const G = LAAN_G[d], c = cw(k), mx = c.x + G.n[0] * 6.75, mz = c.z + G.n[1] * 6.75, v = [-G.u[1], G.u[0]], perp = Math.round((mx * v[0] + mz * v[1]) * 2) / 2, gk = G.a + ':' + perp;
      if (!groups.has(gk)) groups.set(gk, { a: G.a, u: G.u, v, perp, s: [] });
      groups.get(gk).s.push(mx * G.u[0] + mz * G.u[1]);
    }
    for (const g of groups.values()) {
      g.s.sort((x, y) => x - y);
      // aaneengesloten stukken (gat > 1,5 vak = aparte laan)
      let start = g.s[0], prev = g.s[0];
      const emit = (s0, s1) => { const a = s0 - LAAN_PITCH / 2, b = s1 + LAAN_PITCH / 2; P.push({ t: 'laan', l: 0, r: 0, p: [[rnd(a * g.u[0] + g.perp * g.v[0]), rnd(a * g.u[1] + g.perp * g.v[1])], [rnd(b * g.u[0] + g.perp * g.v[0]), rnd(b * g.u[1] + g.perp * g.v[1])]] }); };
      for (let i = 1; i < g.s.length; i++) { if (g.s[i] - prev > LAAN_PITCH * 1.5) { emit(start, prev); start = g.s[i]; } prev = g.s[i]; }
      emit(start, prev);
    }
    const laanMid = k => { const st = cells.get(k); const d = st && st.length === 1 ? laanD(st[0]) : -1; if (d < 0) return null; const G = LAAN_G[d], c = cw(k); return [rnd(c.x + G.n[0] * 6.75), rnd(c.z + G.n[1] * 6.75)]; };
    // gewone wegen: per as de maximale rechte reeksen
    const used = new Set(), runs = [];
    for (let ax = 0; ax < 3; ax++) {
      const [dq, dr] = NEIGH[ax];
      for (const k of plain) {
        const [q, r] = k.split(',').map(Number);
        if (plain.has((q - dq) + ',' + (r - dr))) continue;   // niet het begin van een reeks
        const run = [[q, r]]; let [a, b] = [q + dq, r + dr];
        while (plain.has(a + ',' + b)) { run.push([a, b]); a += dq; b += dr; }
        if (run.length < 2) continue;
        runs.push({ run, before: (q - dq) + ',' + (r - dr), after: a + ',' + b });
      }
    }
    // Twee wegvakken naast elkaar die allebei ook aan een derde wegvak grenzen (een driehoekje van drie vakken, zoals in
    // een breed kruispunt van vakwegen) zijn geen aparte weg: die korte dwarsverbinding vervalt als beide vakken al in
    // een andere reeks zitten.
    const common = R2 => { const [A, B] = R2.run; for (const [dq, dr] of NEIGH) { const k = (A[0] + dq) + ',' + (A[1] + dr); if (plain.has(k) && NEIGH.some(([eq, er]) => B[0] + eq === A[0] + dq && B[1] + er === A[1] + dr)) return true; } return false; };
    const cand = runs.filter(x => x.run.length === 2 && common(x)), cover = new Map();
    for (const x of runs) if (!cand.includes(x)) for (const c of x.run) cover.set(c.join(','), (cover.get(c.join(',')) || 0) + 1);
    const keep = runs.filter(x => !cand.includes(x) || !x.run.every(c => cover.get(c.join(','))));
    for (const { run, before, after } of keep) {
      run.forEach(c => used.add(c.join(',')));
      const A = cellToWorld(run[0][0], run[0][1]), B = cellToWorld(run[run.length - 1][0], run[run.length - 1][1]);
      let p0 = [rnd(A.x), rnd(A.z)], p1 = [rnd(B.x), rnd(B.z)];
      const lb = laanMid(before), la = laanMid(after);   // sluit aan op een laan ernaast
      if (lb) p0 = lb; if (la) p1 = la;
      P.push({ t: 'weg', l: 0, r: 0, p: [p0, p1] });
    }
    // losse wegvakken die in geen enkele reeks zitten maar wel aan een reeks grenzen: kort stukje naar het buurvak
    for (const k of plain) {
      if (used.has(k)) continue;
      const [q, r] = k.split(',').map(Number), c = cellToWorld(q, r);
      for (let s = 0; s < 6; s++) { const nk = (q + NEIGH[s][0]) + ',' + (r + NEIGH[s][1]); if (used.has(nk)) { const n = cw(nk); P.push({ t: 'weg', l: 0, r: 0, p: [[rnd(c.x), rnd(c.z)], [rnd(n.x), rnd(n.z)]] }); used.add(k); break; } }
    }
    // het wegvak zelf verdwijnt; water, uitgraving of een tunnel erboven blijft (de brug of het dek komt uit de getekende weg)
    const strip = k => { const st = (cells.get(k) || []).filter(t => { const b = baseOf(t); return b !== 'weg' && b !== 'brug' && b !== 'brugp'; }); if (st.length) cells.set(k, st); else cells.delete(k); };
    for (const k of plain) strip(k);
    for (const { k } of laanC) cells.delete(k);
    return true;
  }
  // Lagen van de wegtekening. Alles wordt eerst plat bedacht (y = hoogte boven de weg) en bij het wegschrijven op de
  // hoogte van de weg gelegd: HF(x, z) is de hoogtefunctie van het stuk dat nu getekend wordt (een weg, een tak of een
  // knoop). Elk stuk krijgt ook een groepsnummer, zodat de botsing per stuk een eigen onderkant heeft (een viaduct over
  // een weg blokkeert het lopen eronder niet).
  let HF = null, HG = 0;
  const newLayer = () => ({ pos: [], idx: [], mk: [] });
  const ALL_L = [];
  function ctx(fn, g) { HF = fn; HG = g; for (const L of ALL_L) L.mk.push([L.idx.length, g]); }
  const hy = (x, z) => HF ? HF(x, z) : 0;
  const pushV = (L, x, y, z) => L.pos.push(x, y + hy(x, z), z);
  const densify = (pts, step = 2) => { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let j = 1; j <= n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); } return out; };   // genoeg punten om een helling te volgen
  function ribbonInto(L, pts, hw, y, off = 0) {   // een lint rond een lijn; off schuift het opzij
    if (pts.length < 2) return;
    if (HF) pts = densify(pts);
    const base = L.pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const nx = -dz, nz = dx, cx = pts[i][0] + nx * off, cz = pts[i][1] + nz * off;
      const h = hy(pts[i][0], pts[i][1]);   // dwars over de weg: één hoogte (vlak wegdek)
      L.pos.push(cx + nx * hw, y + h, cz + nz * hw, cx - nx * hw, y + h, cz - nz * hw);
    }
    for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; L.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  function wallInto(L, pts, off, y0, y1, abs0) {   // verticale strook (stoeprand) langs een lijn, off opzij; abs0: onderkant absoluut
    if (pts.length < 2) return;
    if (HF) pts = densify(pts);
    const base = L.pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const x = pts[i][0] - dz * off, z = pts[i][1] + dx * off, h = hy(pts[i][0], pts[i][1]);
      L.pos.push(x, abs0 ? y0 : y0 + h, z, x, y1 + h, z);
    }
    for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; L.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  function ringWallInto(L, p, r, y0, y1) {
    const base = L.pos.length / 3, h = hy(p[0], p[1]);
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, x = p[0] + Math.cos(a) * r, z = p[1] + Math.sin(a) * r; L.pos.push(x, y0 + h, z, x, y1 + h, z); }
    for (let i = 0; i < 24; i++) { const a = base + i * 2, b = base + ((i + 1) % 24) * 2; L.idx.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  function polyInto(L, pts, y) {   // platte veelhoek (waaier vanuit het eerste punt); op een helling fijner verdeeld
    if (!HF) { const base = L.pos.length / 3; for (const p of pts) pushV(L, p[0], y, p[1]); for (let i = 1; i < pts.length - 1; i++) L.idx.push(base, base + i, base + i + 1); return; }
    for (let i = 1; i < pts.length - 1; i++) {
      const A = pts[0], B = pts[i], C = pts[i + 1], n = Math.max(1, Math.min(12, Math.ceil(Math.max(Math.hypot(B[0] - A[0], B[1] - A[1]), Math.hypot(C[0] - A[0], C[1] - A[1]), Math.hypot(C[0] - B[0], C[1] - B[1])) / 2)));
      const base = L.pos.length / 3, id = (a, b) => base + a * (n + 1) - a * (a - 1) / 2 + b;   // a = stap richting B, b = richting C (a + b ≤ n)
      for (let a2 = 0; a2 <= n; a2++) for (let b2 = 0; b2 <= n - a2; b2++) { const x = A[0] + (B[0] - A[0]) * a2 / n + (C[0] - A[0]) * b2 / n, z = A[1] + (B[1] - A[1]) * a2 / n + (C[1] - A[1]) * b2 / n; pushV(L, x, y, z); }
      for (let a2 = 0; a2 < n; a2++) for (let b2 = 0; b2 < n - a2; b2++) { L.idx.push(id(a2, b2), id(a2 + 1, b2), id(a2, b2 + 1)); if (b2 < n - a2 - 1) L.idx.push(id(a2 + 1, b2), id(a2 + 1, b2 + 1), id(a2, b2 + 1)); }
    }
  }
  function wallSeg(L, a, b, y0, y1) { const base = L.pos.length / 3, ha = hy(a[0], a[1]), hb = hy(b[0], b[1]); L.pos.push(a[0], y0 + ha, a[1], a[0], y1 + ha, a[1], b[0], y0 + hb, b[1], b[0], y1 + hb, b[1]); L.idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2); }
  // Stoeprand met een lichte schuine kant: van het wegdek (lijn A, hoogte yA) schuin omhoog naar de stoep (lijn B, hoogte yB).
  // A en B mogen een verschillend aantal punten hebben; ze worden op gelijke stappen langs hun lengte gelegd.
  const KERB_IN = 0.15, KERB_OUT = 0.45;   // de schuine kant loopt van 15 tot 45 cm naast de rand van het asfalt
  function resamplePts(pts, n) {
    if (pts.length < 2) return pts.slice(); const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = S[S.length - 1] || 1, out = []; let j = 0;
    for (let k = 0; k <= n; k++) { const t = L * k / n; while (j < pts.length - 2 && S[j + 1] < t) j++; const f = (t - S[j]) / ((S[j + 1] - S[j]) || 1); out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]); }
    return out;
  }
  function slopeInto(L, A, B, yA, yB) {
    if (A.length < 2 || B.length < 2) return;
    let len = 0; for (let i = 1; i < A.length; i++) len += Math.hypot(A[i][0] - A[i - 1][0], A[i][1] - A[i - 1][1]);
    const n = Math.max(A.length - 1, B.length - 1, Math.ceil(len / (HF ? 1.5 : 4)), 1), a = resamplePts(A, n), b = resamplePts(B, n), base = L.pos.length / 3;
    for (let i = 0; i <= n; i++) {   // de bovenrand schuift 8 cm onder de stoep door: geen kier tussen rand en stoep
      const dx = b[i][0] - a[i][0], dz = b[i][1] - a[i][1], l = Math.hypot(dx, dz) || 1, bx = b[i][0] + dx / l * 0.08, bz = b[i][1] + dz / l * 0.08;
      L.pos.push(a[i][0], yA + hy(a[i][0], a[i][1]), a[i][1], bx, yB - 0.006 + hy(bx, bz), bz);
    }
    for (let i = 0; i < n; i++) { const k = base + i * 2; L.idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  function discInto(L, p, r, y) {
    const base = L.pos.length / 3, h = hy(p[0], p[1]); L.pos.push(p[0], y + h, p[1]);
    for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16; L.pos.push(p[0] + Math.cos(a) * r, y + h, p[1] + Math.sin(a) * r); }
    for (let i = 0; i < 32; i++) L.idx.push(base, base + 1 + i, base + 1 + (i + 1) % 32);
  }
  function dashesInto(L, pts, hw, y, len, gap, off = 0) {
    let acc = 0, on = true, run = [];
    const flush = () => { if (run.length > 1) ribbonInto(L, run, hw, y, off); run = []; };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (on) { if (!run.length) run.push(a); run.push(b); }
      acc += d; if (acc >= (on ? len : gap)) { acc = 0; if (on) flush(); on = !on; }
    }
    flush();
  }
  // Ligt dit punt van een weg (op hoogte h) boven een andere, lagere weg? Dan is het daar een brug: geen wand tot de
  // grond en geen dijk eronder. m: hoe ver naast de lagere weg dat nog geldt
  function roadSpan(path, x, z, h, m = 3) {
    for (const p of cells.paths || []) {
      if (p === path || p.t === 'rot') continue; const def = PATH_DEF[p.t]; if (!def || !p.p || p.p.length < 2) continue;
      const pr = pathProf(p), mm = def.hw + def.walk + m;
      if (x < pr.bb[0] - mm || x > pr.bb[2] + mm || z < pr.bb[1] - mm || z > pr.bb[3] + mm) continue;
      if (distPoly(x, z, pr.pts) < mm && pathH(p, x, z) < h - 3) return true;
    }
    return false;
  }
  function skirtInto(L, pts, sg, path) {   // wand langs een lijn van de weg (bovenkant stoep) tot het maaiveld, waar de weg erboven ligt
    if (pts.length < 2) return;
    pts = densify(pts, 1.5);
    const top = p => PW_H + hy(p[0], p[1]), bot = p => { const [q, r] = worldToCell(p[0], p[1]), b = baseOf(stackOf(q, r)[0] || ''); return b === 'water' || b === 'kuil' ? null : terrainHeightAt(p[0], p[1]) - 0.05; };
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (path && roadSpan(path, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, hy((a[0] + b[0]) / 2, (a[1] + b[1]) / 2))) { wallSeg(L, a, b, -1.3, PW_H); continue; }   // brugdek: alleen de rand van het dek
      const ba = bot(a), bb = bot(b); if (ba === null || bb === null) continue;
      const ta = top(a), tb = top(b); if (ta - ba < 0.35 && tb - bb < 0.35) continue;
      const base = L.pos.length / 3; L.pos.push(a[0], Math.min(ba, ta), a[1], a[0], ta, a[1], b[0], Math.min(bb, tb), b[1], b[0], tb, b[1]);
      L.idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  // Botsing: de bovenkant van asfalt, stoep, berm en klinkers als driehoeken, per stuk (groep) een eigen loopvlak
  let roadCols = new Map();   // 'q,r' → [col]
  function roadCollision(layers) {
    const groups = new Map();
    for (const L of layers) {
      const mk = L.mk.concat([[L.idx.length, -1]]);
      for (let m = 0; m < mk.length - 1; m++) {
        const g = mk[m][1], i0 = mk[m][0], i1 = mk[m + 1][0]; if (i1 <= i0) continue;
        let G = groups.get(g); if (!G) groups.set(g, G = []);
        for (let t = i0; t + 2 < i1; t += 3) { const a = L.idx[t], b = L.idx[t + 1], c = L.idx[t + 2]; G.push(L.pos[a * 3], L.pos[a * 3 + 1], L.pos[a * 3 + 2], L.pos[b * 3], L.pos[b * 3 + 1], L.pos[b * 3 + 2], L.pos[c * 3], L.pos[c * 3 + 1], L.pos[c * 3 + 2]); }
      }
    }
    const out = new Map();
    for (const [, pos] of groups) {
      if (!pos.length) continue;
      let lo = 1e9, x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (let i = 0; i < pos.length; i += 3) { lo = Math.min(lo, pos[i + 1]); x0 = Math.min(x0, pos[i]); x1 = Math.max(x1, pos[i]); z0 = Math.min(z0, pos[i + 2]); z1 = Math.max(z1, pos[i + 2]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const col = { surfaces: [{ kind: 'tris', cx: 0, cz: 0, B: triBuckets(g), base: 0, bottom: lo - 0.35, road: true }], walls: [] };
      const [qa, ra] = worldToCell(x0, z0), [qb, rb] = worldToCell(x1, z1), seen = new Set();
      for (let q = Math.min(qa, qb) - 2; q <= Math.max(qa, qb) + 2; q++) for (let r = Math.min(ra, rb) - 2; r <= Math.max(ra, rb) + 2; r++) {
        const c = cellToWorld(q, r); if (c.x < x0 - R || c.x > x1 + R || c.z < z0 - R || c.z > z1 + R) continue;
        const k = q + ',' + r; if (seen.has(k)) continue; seen.add(k); let L = out.get(k); if (!L) out.set(k, L = []); L.push(col);
      }
    }
    return out;
  }
  // Hoogte van een weg (rijbaan of stoep) onder een punt, het dichtst bij ref; null als er geen weg is
  function roadTop(x, z, ref) {
    const L = roadCols.get(key(...worldToCell(x, z))); if (!L) return null;
    let best = null;
    for (const c of L) for (const s2 of c.surfaces) { const t = surfTop(s2, x, z); if (t !== null && (best === null || Math.abs(t - ref) < Math.abs(best - ref))) best = t; }
    return best;
  }
  function layerMesh(L, mat) {
    if (!L.pos.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
    const nn = new Float32Array(L.pos.length); for (let i = 1; i < nn.length; i += 3) nn[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); g.setIndex(L.idx);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData.own = true; return m;
  }
  // Terrein veranderd onder of naast een weg: de weg (hoogteprofiel) opnieuw opbouwen
  // Wegprofielen vóór een terreinwijziging onthouden (zie terrainChanged)
  function roadProfSnap() { const m = new Map(); for (const p of cells.paths || []) { const P = profCache.get(p); if (P) m.set(p, P.h.slice()); } return m; }
  // Het hele wegennet wordt alleen opnieuw gebouwd als het terrein onder of naast een weg is veranderd ÉN een weg daardoor
  // echt een ander hoogteprofiel krijgt (prev: de profielen van vóór de wijziging). Anders is het terrein tekenen genoeg.
  function terrainChanged(list, prev) {
    let near = false;
    outer: for (const [q, r] of list) for (const [dq, dr] of [[0, 0], ...NEIGH]) if (vecCover.has((q + dq) + ',' + (r + dr))) { near = true; break outer; }
    if (!near) return false;
    if (prev) {
      let diff = false;
      for (const p of cells.paths || []) { const old = prev.get(p), nw = pathProf(p).h; if (!old || old.length !== nw.length || nw.some((v, i) => Math.abs(v - old[i]) > 0.005)) { diff = true; break; } }
      if (!diff) return false;
    }
    buildPathNet(); return true;
  }
  // quick: tijdens het slepen alleen de tekening; botsing en het maaiveld langs de weg pas bij het loslaten
  function buildPathNet(quick) {
    if (pathGroup) { pathGroup.traverse(m => { if (m.isMesh && m.userData.own) m.geometry.dispose(); }); scene.remove(pathGroup); }
    for (const k of profCache.keys()) if (!cells.paths || !cells.paths.includes(k)) profCache.delete(k);
    vecLightReg = []; pathGroup = pathBuild(cells.paths, vecLightReg, quick); scene.add(pathGroup); carsDirty = true; vecDirty = true;
    if (!quick) { peopleDirty = true; peopleLocalEdit = true; }   // een weg erbij of weg: de voetgangers blijven waar ze zijn (alleen wie zijn plek kwijt is, begint opnieuw); tijdens het slepen helemaal niets
    if (!quick) roadCols = pathGroup.userData.col || new Map();
    if (!quick) setTimeout(() => { try { if (typeof buildModNet === 'function' && modGroups.size) buildModNet(); } catch (e) {} }, 0);   // bomen op een nieuwe weg verdwijnen
    vecCover = vecCoverOf(cells.paths);
    if (!quick) terrRoadsChanged();   // het maaiveld langs de wegen sluit aan op de weg
    // (geen zandkleurige zeshoeken meer onder de weg: de rand van de weg volgt de weg zelf, niet het raster)
  }
  function pathBuild(P, lightReg, quick) {   // lint-meshes voor een lijst vrije wegen; ook gebruikt door de 3D-weergave in de schets
    const pathGroup = new THREE.Group();
    if (!P || !P.length) return pathGroup;
    const grass = newLayer(), walk = newLayer(), kerb = newLayer(), asph = newLayer(), pave = newLayer(), dash = newLayer(), skirt = newLayer(), bike = newLayer(), rail = newLayer(), barrier = newLayer(), klink = newLayer(), Y = 0.1;
    ALL_L.length = 0; ALL_L.push(grass, walk, kerb, asph, pave, dash, skirt, bike, rail, barrier, klink);
    const surfOf = n => GR.nodes[n].edges.every(id => GR.edges.get(id).t === 'klink') ? klink : asph;   // knoop met alleen klinkerstraten: klinkers
    let gid = 0;
    const rots = P.filter(p => p.t === 'rot' && p.p && p.p.length).map(p => ({ c: p.p[0], src: p, arms: [] }));
    const GR = vecGraphOf(P), heads = GR.nodes.map((_, n) => vecHead(GR, n)).filter(Boolean);
    const pathHF = path => (x, z) => pathH(path, x, z);
    const nodeHF = n => { const src = GR.nodes[n].edges.map(id => GR.edges.get(id).src); return (x, z) => { let best = 0, bd = 1e9; for (const p of src) { const pr = pathProf(p); if (pr.flat) { if (bd > 1e8) { best = 0; bd = 1e8; } continue; } const d = distPoly(x, z, pr.pts); if (d < bd) { bd = d; best = pathH(p, x, z); } } return best; }; };
    const headTrim = pt => { let t = 0; for (const H of heads) if (Math.hypot(H.N.x - pt[0], H.N.z - pt[1]) < 4) t = Math.max(t, H.cN); return t; };   // het asfalt stopt waar de ronde kop begint
    for (const path of P) {   // los vak (één klik): een rondje asfalt met stoep
      const def = PATH_DEF[path.t]; if (!def || !path.p || path.p.length < 2 || !isLone(path)) continue;
      ctx(pathHF(path), gid++);
      const ext = HEAD_EXT[path.t] || 0, c = path.p[0], kw = def.hw + ext + 0.3, ow = def.hw + ext + (def.walk || 0);   // even groot als de ronde kop van een weg
      discInto(path.t === 'pad' ? pave : path.t === 'fiets' ? bike : def.klink ? klink : asph, c, kw, Y + 0.02);
      if (def.walk) { const ring = r => Array.from({ length: 33 }, (_, i) => [c[0] + Math.cos(i / 32 * Math.PI * 2) * r, c[1] + Math.sin(i / 32 * Math.PI * 2) * r]), kb = kw - 0.3 + KERB_IN, kt2 = kw - 0.3 + KERB_OUT;
        slopeInto(kerb, ring(kb), ring(kt2), Y + 0.015, PW_H); for (let i = 0; i < 32; i++) { const a0 = i / 32 * Math.PI * 2, a1 = (i + 1) / 32 * Math.PI * 2; polyInto(walk, [[c[0] + Math.cos(a0) * kt2, c[1] + Math.sin(a0) * kt2], [c[0] + Math.cos(a0) * ow, c[1] + Math.sin(a0) * ow], [c[0] + Math.cos(a1) * ow, c[1] + Math.sin(a1) * ow], [c[0] + Math.cos(a1) * kt2, c[1] + Math.sin(a1) * kt2]], PW_H); } }
    }
    for (const path of P) {
      const def = PATH_DEF[path.t]; if (!def || !path.p || path.p.length < 2 || isLone(path)) continue;
      const pts0 = smoothPts(path.p); ctx(pathHF(path), gid++);
      const edgeW = path.t === 'pad' || path.t === 'fiets' ? def.hw + 0.3 : def.hw + def.walk;
      for (const [w, sg] of [[path.r, 1], [path.l, -1]]) if (w > 0) ribbonInto(grass, pts0, w / 2, path.t === 'pad' || path.t === 'fiets' ? Y - 0.005 : PW_H - 0.005, sg * (edgeW + w / 2));
      for (const pts of rots.length ? rotClip(pts0, rots) : [pts0]) {
        if (path.t === 'pad' || path.t === 'fiets') {   // pad: klinkers; fietspad: rood asfalt met een witte streep in het midden
          const L = path.t === 'fiets' ? bike : pave;
          ribbonInto(kerb, pts, def.hw + 0.3, Y + 0.01); pts.length && [pts[0], pts[pts.length - 1]].forEach(p => discInto(kerb, p, def.hw + 0.3, Y + 0.01));
          ribbonInto(L, pts, def.hw, Y + 0.02); [pts[0], pts[pts.length - 1]].forEach(p => discInto(L, p, def.hw, Y + 0.02));
          if (path.t === 'fiets') dashesInto(dash, pts, 0.06, Y + 0.03, 1.5, 1.5);
          continue;
        }
        const t0 = headTrim(pts[0]), t1 = headTrim(pts[pts.length - 1]); ribbonInto(def.klink ? klink : asph, t0 || t1 ? trimPts(pts, t0, t1) : pts, def.hw + 0.3, Y + 0.02);
      }   // de ronde kop komt alleen op een doodlopend eind (zie de knopen hieronder)
    }
    // Stoepen per tak van de graaf: 25 cm hoog (als bij de gewone wegen) met een stoeprand; ze houden op bij
    // een kruising, zodat ze niet over de zijstraat heen lopen. Aan de kop van een doodlopende weg een ring.
    // Middenberm van een laan: verhoogd gras met stoeprand en om de 10 m een boom; houdt op voor een kruising en
    // voor de kop van de laan (daar keren de auto's)
    const medTrim = n => { const N = GR.nodes[n]; if (!N) return 0; if (N.edges.length < 3) return N.edges.length === 1 ? (vecHead(GR, n).cN + 3) : vecBendTrim(GR, n, 9.75); return vecJunctionTrim(GR, n) + 1.5; };
    for (const e of GR.edges.values()) {
      if (e.t !== 'laan') continue;
      ctx(pathHF(e.src), gid++);
      const med = PATH_DEF.laan.med, mp = trimPts(e.pts, medTrim(e.a), medTrim(e.b)); if (mp.length < 2 || plen(mp) < 2) continue;
      ribbonInto(grass, mp, med, PW_H + 0.005); for (const sg of [1, -1]) slopeInto(kerb, offsetPts(mp, sg * (med + 0.3)), offsetPts(mp, sg * med), Y + 0.015, PW_H); ribbonInto(kerb, mp, med, PW_H, 0);
      [mp[0], mp[mp.length - 1]].forEach(p => { const rg = r => Array.from({ length: 25 }, (_, i) => [p[0] + Math.cos(i / 24 * Math.PI * 2) * r, p[1] + Math.sin(i / 24 * Math.PI * 2) * r]); slopeInto(kerb, rg(med + 0.3), rg(med), Y + 0.015, PW_H); discInto(grass, p, med, PW_H + 0.005); });
      const L = plen(mp); let s = 5, i = 1, acc = 0;
      while (s < L - 4) {
        while (i < mp.length - 1 && acc + Math.hypot(mp[i][0] - mp[i - 1][0], mp[i][1] - mp[i - 1][1]) < s) { acc += Math.hypot(mp[i][0] - mp[i - 1][0], mp[i][1] - mp[i - 1][1]); i++; }
        const a = mp[i - 1], b = mp[i], f = (s - acc) / Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1])), x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
        const hj = (Math.round(x * 3) * 31 + Math.round(z * 3) * 17) & 1023, sc = 0.85 + (hj % 4) * 0.07;
        const tr = new THREE.Mesh(G.trunk, M.trunk); tr.scale.set(0.85, 1.25, 0.85); tr.position.set(x, PW_H - 0.02 + hy(x, z), z); tr.castShadow = true; pathGroup.add(tr);
        const cr = new THREE.Mesh(G.crown, M.leaf[hj % 3]); cr.scale.set(sc, sc * 1.2, sc); cr.position.set(x, PW_H + 3.2 + 2.1 * sc + hy(x, z), z); cr.rotation.y = (hj % 7) * 0.4; cr.castShadow = true; pathGroup.add(cr);
        s += 10;
      }
    }
    // Wegmarkering per tak, en niet over de kruising heen
    const markTrim = n => { const H = vecHead(GR, n); return H ? H.cN : (vecJunctionTrim(GR, n) || vecBendTrim(GR, n, 1.0)); };
    for (const e of GR.edges.values()) {
      if (e.t === 'pad' || e.t === 'ring' || e.t === 'klink') continue;
      ctx(pathHF(e.src), gid++);
      const mp = trimPts(e.pts, markTrim(e.a), markTrim(e.b)); if (mp.length < 2) continue;
      if (e.t === 'snel') {   // doorgetrokken randstrepen, gestreepte strookscheiding, betonnen middenbarrière
        for (const sg of [1, -1]) { ribbonInto(dash, mp, 0.1, Y + 0.03, sg * 0.95); ribbonInto(dash, mp, 0.1, Y + 0.03, sg * 7.85); dashesInto(dash, mp, 0.07, Y + 0.03, 9, 12, sg * 4.4); }
        ribbonInto(barrier, mp, 0.3, Y + 0.85); for (const sg of [1, -1]) wallInto(barrier, mp, sg * 0.3, Y, Y + 0.85);
      }
      else if (e.t === 'weg') dashesInto(dash, mp, 0.07, Y + 0.03, 3, 3.5);
      else if (e.t === 'laan') { for (const sg of [1, -1]) { ribbonInto(dash, mp, 0.06, Y + 0.03, sg * 4.75); ribbonInto(pave, mp, 1.0, Y + 0.025, sg * 7.75); ribbonInto(dash, mp, 0.05, Y + 0.03, sg * 6.75); } }
      else { dashesInto(dash, mp, 0.06, Y + 0.03, 3, 3.5, 2.25); dashesInto(dash, mp, 0.06, Y + 0.03, 3, 3.5, -2.25); ribbonInto(dash, mp, 0.05, Y + 0.03, 0.12); ribbonInto(dash, mp, 0.05, Y + 0.03, -0.12); }
    }
    // Knikken: asfalt rond dichtmaken en de stoep met een ronde buitenhoek om de knik heen leggen
    for (let n = 0; n < GR.nodes.length; n++) {
      const B = vecBend(GR, n); if (!B) continue;
      ctx(nodeHF(n), gid++);
      const N = GR.nodes[n], hw = B.hw, ow = hw + B.walk, kw = hw + 0.3, tr = vecBendTrim(GR, n, ow + 0.3);
      discInto(surfOf(n), [N.x, N.z], kw, Y + 0.02);
      const bis = [B.A.d[0] + B.B.d[0], B.A.d[1] + B.B.d[1]], bl = Math.hypot(bis[0], bis[1]) || 1; bis[0] /= bl; bis[1] /= bl;
      const outN = d => { let nx = -d[1], nz = d[0]; if (nx * bis[0] + nz * bis[1] > 0) { nx = -nx; nz = -nz; } return [nx, nz]; };   // normaal naar de buitenkant van de bocht
      const nA = outN(B.A.d), nB = outN(B.B.d), a0 = Math.atan2(nA[1], nA[0]); let a1 = Math.atan2(nB[1], nB[0]);
      // van nA naar nB via de buitenkant (langs -bis)
      const mid = Math.atan2(-bis[1], -bis[0]); const norm = a => { while (a - a0 > Math.PI) a -= 2 * Math.PI; while (a - a0 < -Math.PI) a += 2 * Math.PI; return a; };
      a1 = norm(a1); const m = norm(mid); if ((m - a0) * (a1 - a0) < 0 || Math.abs(m - a0) > Math.abs(a1 - a0)) a1 = a1 > a0 ? a1 - 2 * Math.PI : a1 + 2 * Math.PI;
      const inner = [], outer = [], steps = 10;
      const pt = (al, lat, d, nn) => [N.x + d[0] * al + nn[0] * lat, N.z + d[1] * al + nn[1] * lat];
      inner.push(pt(tr, kw, B.A.d, nA)); outer.push(pt(tr, ow, B.A.d, nA));
      for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; inner.push([N.x + Math.cos(a) * kw, N.z + Math.sin(a) * kw]); outer.push([N.x + Math.cos(a) * ow, N.z + Math.sin(a) * ow]); }
      inner.push(pt(tr, kw, B.B.d, nB)); outer.push(pt(tr, ow, B.B.d, nB));
      const mk = lat => { const Lp = [pt(tr, lat, B.A.d, nA)]; for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; Lp.push([N.x + Math.cos(a) * lat, N.z + Math.sin(a) * lat]); } Lp.push(pt(tr, lat, B.B.d, nB)); return Lp; };
      const kB = mk(hw + KERB_IN), kT = mk(hw + KERB_OUT);
      slopeInto(kerb, kB, kT, Y + 0.015, PW_H);
      for (let i = 0; i < kT.length - 1; i++) { polyInto(walk, [kT[i], outer[i], outer[i + 1], kT[i + 1]], PW_H); wallSeg(walk, outer[i], outer[i + 1], 0, PW_H); }
    }
    // Stoephoeken op kruisingen: tussen twee opeenvolgende takken loopt de stoep door (afgesneden hoek), met stoeprand
    for (let n = 0; n < GR.nodes.length; n++) {
      const N = GR.nodes[n]; if (N.edges.length < 3 || N.rot) continue;
      ctx(nodeHF(n), gid++);
      const arms = N.edges.map(id => { const e = GR.edges.get(id), dir = e.a === n ? 0 : 1, p = dir ? e.pts.slice().reverse() : e.pts, a = p[0], b = p[Math.min(p.length - 1, 2)]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { e, dir, d: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], th: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }).sort((x, y) => x.th - y.th);
      for (let i = 0; i < arms.length; i++) {
        const A = arms[i], B = arms[(i + 1) % arms.length];
        const sideTo = (X, Y) => { const r = [-X.d[1], X.d[0]]; return r[0] * Y.d[0] + r[1] * Y.d[1] > 0 ? 1 : -1; };
        const sA = 1, sB = -1, dA = PATH_DEF[A.e.t], dB = PATH_DEF[B.e.t];
        const KA = vecWalkPts(GR, A.e, A.dir, sA * (dA.hw + 0.3))[0], OA = vecWalkPts(GR, A.e, A.dir, sA * (dA.hw + dA.walk))[0];
        const KB = vecWalkPts(GR, B.e, B.dir, sB * (dB.hw + 0.3))[0], OB = vecWalkPts(GR, B.e, B.dir, sB * (dB.hw + dB.walk))[0];
        // ronde stoephoek: een boog die aan beide stoepranden raakt (kwadratisch, met het snijpunt van de randen als
        // trekpunt); lopen de randen (bijna) evenwijdig of uit elkaar, dan een rechte lijn
        const corner = (P, Q) => {
          const d = [-A.d[0], -A.d[1]], e = [-B.d[0], -B.d[1]], den = d[0] * e[1] - d[1] * e[0];
          if (Math.abs(den) > 0.05) {
            const t = ((Q[0] - P[0]) * e[1] - (Q[1] - P[1]) * e[0]) / den, u = ((Q[0] - P[0]) * d[1] - (Q[1] - P[1]) * d[0]) / den;
            if (t > 0.2 && u > 0.2 && t < 25 && u < 25) { const X = [P[0] + d[0] * t, P[1] + d[1] * t], out = []; for (let k = 0; k <= 10; k++) { const f = k / 10, g = 1 - f; out.push([g * g * P[0] + 2 * g * f * X[0] + f * f * Q[0], g * g * P[1] + 2 * g * f * X[1] + f * f * Q[1]]); } return out; }
          }
          return Array.from({ length: 11 }, (_, k) => [P[0] + (Q[0] - P[0]) * k / 10, P[1] + (Q[1] - P[1]) * k / 10]);
        };
        const kc = corner(KA, KB), oc = corner(OA, OB);
        const bc = corner(vecWalkPts(GR, A.e, A.dir, sA * (dA.hw + KERB_IN))[0], vecWalkPts(GR, B.e, B.dir, sB * (dB.hw + KERB_IN))[0]);
        const tc = corner(vecWalkPts(GR, A.e, A.dir, sA * (dA.hw + KERB_OUT))[0], vecWalkPts(GR, B.e, B.dir, sB * (dB.hw + KERB_OUT))[0]);
        slopeInto(kerb, bc, tc, Y + 0.015, PW_H);
        polyInto(surfOf(n), [[N.x, N.z], ...kc], Y + 0.02);   // het kruisingsvak zelf: tot aan de stoephoek dicht met asfalt
        for (let k = 0; k < kc.length - 1; k++) {
          const ki = kc[k], kj = kc[k + 1], oi = oc[k], oj = oc[k + 1], lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
          polyInto(walk, [tc[k], oi, oj, tc[k + 1]], PW_H);
          wallSeg(walk, oi, oj, 0, PW_H);
        }
      }
      // Zebrapaden en stopstrepen bij een kruising met verkeerslichten: net binnen het kruisingsvak, de auto's
      // stoppen ervoor
      if (N.light) for (const A of arms) {
        const def = PATH_DEF[A.e.t], jt = vecJunctionTrim(GR, n), P0 = A.dir ? A.e.pts.slice().reverse() : A.e.pts;
        const at = s0 => { const q = trimPts(P0, s0, 0); const p = q[0], b = q[1] || P0[1]; const l = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1; return [p, [(b[0] - p[0]) / l, (b[1] - p[1]) / l]]; };
        const [zc, zd] = at(jt - 1.7), zr = [-zd[1], zd[0]], half = def.hw - 0.3;
        for (let u = -half + 0.25; u <= half - 0.24; u += 1.0) { const c = [zc[0] + zr[0] * u, zc[1] + zr[1] * u]; ribbonInto(dash, [[c[0] - zd[0] * 1.3, c[1] - zd[1] * 1.3], [c[0] + zd[0] * 1.3, c[1] + zd[1] * 1.3]], 0.25, Y + 0.035); }
        const [sc, sd] = at(jt + 0.15), sr = [-sd[1], sd[0]];   // stopstreep over de inkomende helft (links van de richting naar buiten)
        ribbonInto(dash, [[sc[0] - sr[0] * 0.2, sc[1] - sr[1] * 0.2], [sc[0] - sr[0] * (def.hw - 0.3), sc[1] - sr[1] * (def.hw - 0.3)]], 0.15, Y + 0.035);
      }
    }
    // Verkeerslichten: per tak een paal rechts van de rijbaan, op de hoek van de stoep, met de kop naar het verkeer
    for (let n = 0; n < GR.nodes.length; n++) {
      const N = GR.nodes[n]; if (!N.light) continue;
      ctx(nodeHF(n), gid++);
      for (const id of N.edges) {
        const e = GR.edges.get(id), def = PATH_DEF[e.t], into = e.b === n, pts = into ? e.pts : e.pts.slice().reverse();
        const lane = trimPts(offsetPts(pts, def.hw + 0.9), 0, vecTrimW(GR, n) - 0.6), p = lane[lane.length - 1], a = lane[Math.max(0, lane.length - 2)];
        let dx = p[0] - a[0], dz = p[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const nx = -dx, nz = -dz, rot = Math.PI / 2 - Math.atan2(nz, nx);
        const pole = new THREE.Mesh(G.tlPole, M.tlBody); pole.position.set(p[0], PW_H + hy(p[0], p[1]), p[1]); pathGroup.add(pole);
        const hd = new THREE.Mesh(G.tlHead, M.tlBody); hd.position.set(p[0], PW_H + 3.0 + hy(p[0], p[1]), p[1]); hd.rotation.y = rot; pathGroup.add(hd);
        const lamps = {};
        [['r', 0.3], ['a', 0], ['g', -0.3]].forEach(([c, dy]) => { const lm = new THREE.Mesh(G.tlLamp, M.lampOff); lm.position.set(p[0] + nx * 0.18, PW_H + 3.0 + dy + hy(p[0], p[1]), p[1] + nz * 0.18); lm.rotation.y = rot; pathGroup.add(lm); lamps[c] = lm; });
        if (lightReg) lightReg.push({ n, eid: id, lamps });
      }
    }
    // Brug: waar de weg over water of een uitgraving gaat, krijgt hij een dek met zijkanten tot op de bodem
    for (const e of GR.edges.values()) {
      const def = PATH_DEF[e.t], hw = def.hw + def.walk, samp = [];
      ctx(pathHF(e.src), gid++);
      for (let i = 0; i < e.pts.length - 1; i++) { const a = e.pts[i], b = e.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)); for (let j = 0; j < n; j++) samp.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
      samp.push(e.pts[e.pts.length - 1]);
      const depth = p => { const [q, r] = worldToCell(p[0], p[1]), b = baseOf(stackOf(q, r)[0] || ''); return b === 'water' ? -1.5 : b === 'kuil' ? -3.2 : null; };
      let run = [];
      const flush = () => { if (run.length > 1) { const d = Math.min(...run.map(x => x[1])); const pts = run.map(x => x[0]); for (const sg of [1, -1]) wallInto(walk, pts, sg * hw, d, 0.01, true); const keep = HF; HF = null; ribbonInto(kerb, pts, hw, d); HF = keep; } run = []; };
      for (const p of samp) { const d = depth(p); if (d === null) flush(); else run.push([p, d]); }
      flush();
    }
    for (const e of GR.edges.values()) {
      if (e.t === 'ring') continue;   // de rotonde tekent zichzelf (hieronder)
      const def = PATH_DEF[e.t], hw = def.hw + def.walk;
      ctx(pathHF(e.src), gid++);
      // dijkje of viaduct: waar de weg hoger ligt dan het maaiveld, een wand van de stoeprand naar beneden
      if (!pathProf(e.src).flat) {
        for (const sg of [1, -1]) skirtInto(skirt, vecWalkPts(GR, e, 0, sg * hw), sg, e.src);
        // pijler op de middenberm van een snelweg eronder
        const snels = P.filter(p => p.t === 'snel' && p !== e.src && p.p && p.p.length > 1), done = [];
        if (snels.length) for (const q of densify(e.pts, 1)) {
          const top = hy(q[0], q[1]);
          for (const sp of snels) { const pr = pathProf(sp); if (distPoly(q[0], q[1], pr.pts) > 0.6 || done.some(d => Math.hypot(d[0] - q[0], d[1] - q[1]) < 8)) continue;
            const low = pathH(sp, q[0], q[1]) + Y, hgt = top - 1.3 - low; if (hgt < 2) continue; done.push(q);
            const i = e.pts.findIndex(p => Math.hypot(p[0] - q[0], p[1] - q[1]) < 3) , dv = dirAt(e.pts, Math.max(0, i)), pier = new THREE.Mesh(new THREE.BoxGeometry(1.1, hgt, hw * 1.6), VM.barrier);
            pier.position.set(q[0], low + hgt / 2, q[1]); pier.rotation.y = -Math.atan2(dv[1], dv[0]); pier.castShadow = true; pier.receiveShadow = true; pier.userData.own = true; pathGroup.add(pier); }
        }
      }
      if (def.snel) {   // snelweg: grasberm op wegniveau en een vangrail langs de buitenkant
        for (const sg of [1, -1]) { ribbonInto(grass, vecWalkPts(GR, e, 0, sg * (def.hw + 0.3 + (def.walk - 0.3) / 2)), (def.walk - 0.3) / 2, Y + 0.01); const rp = vecWalkPts(GR, e, 0, sg * (def.hw + 0.6)); wallInto(rail, rp, 0, Y + 0.45, Y + 0.8); wallInto(rail, rp, sg * 0.05, Y + 0.45, Y + 0.8); }
        continue;
      }
      for (const sg of [1, -1]) {
        const ep = vecWalkPts(GR, e, 0, sg * hw);
        if (def.walk >= 0.8) {   // schuine stoeprand, dan de stoep
          const sp = vecWalkPts(GR, e, 0, sg * (def.hw + (def.walk + KERB_OUT) / 2));
          ribbonInto(walk, sp, (def.walk - KERB_OUT) / 2, PW_H); slopeInto(kerb, vecWalkPts(GR, e, 0, sg * (def.hw + KERB_IN)), vecWalkPts(GR, e, 0, sg * (def.hw + KERB_OUT)), Y + 0.015, PW_H);
        } else { const sp = vecWalkPts(GR, e, 0, sg * (def.hw + def.walk / 2)), kp = vecWalkPts(GR, e, 0, sg * (def.hw + 0.3)); ribbonInto(walk, sp, def.walk / 2, PW_H); slopeInto(kerb, vecWalkPts(GR, e, 0, sg * (def.hw + 0.05)), kp, Y + 0.015, PW_H); }
        wallInto(walk, ep, 0, 0, PW_H);
      }
      // doodlopend eind: ronde kop (halve cirkel) met asfalt, stoeprand en stoep eromheen
      for (const n of [e.a, e.b]) { const H = vecHead(GR, n); if (!H) continue;
        const { C, d, r, R } = H, at = (rad, th) => [C[0] + (d[0] * Math.cos(th) + r[0] * Math.sin(th)) * rad, C[1] + (d[1] * Math.cos(th) + r[1] * Math.sin(th)) * rad];
        // boog op afstand dl buiten de rand van het wegdek: begint waar hij de rechte stoeprand raakt (zijkant hw + dl)
        const arc = (dl, steps = 28) => { const rad = R + dl, th0 = Math.PI - Math.asin(Math.min(1, (def.hw + dl) / rad)); return Array.from({ length: steps + 1 }, (_, i) => at(rad, -th0 + 2 * th0 * i / steps)); };
        discInto(def.klink ? klink : asph, C, R + 0.3, Y + 0.02);
        const inner = arc(0), outer = arc(def.walk), kt = arc(0.3);
        if (def.walk >= 0.8) { const hB = arc(KERB_IN), hT = arc(KERB_OUT); slopeInto(kerb, hB, hT, Y + 0.015, PW_H); for (let i = 0; i < hT.length - 1; i++) { polyInto(walk, [hT[i], outer[i], outer[i + 1], hT[i + 1]], PW_H); wallSeg(walk, outer[i], outer[i + 1], 0, PW_H); } }
        else { slopeInto(kerb, arc(0.05), kt, Y + 0.015, PW_H); for (let i = 0; i < inner.length - 1; i++) { polyInto(walk, [inner[i], outer[i], outer[i + 1], inner[i + 1]], PW_H); wallSeg(walk, outer[i], outer[i + 1], 0, PW_H); } }
      }
    }
    // Rotondes: rijbaan als ring, eiland met een overrijdbare klinkerrand en een boom, stoep eromheen (open waar een
    // weg aansluit) en haaientanden bij elke inrit
    for (const R0 of rots) {
      const C = R0.c, h0 = pathProf(R0.src).h[0] || 0; ctx(() => h0, gid++);
      const arms = [];
      for (const N of GR.nodes) { if (!N.rot || Math.abs(Math.hypot(N.x - C[0], N.z - C[1]) - ROT.Rc) > 1) continue; for (const id of N.edges) { const e = GR.edges.get(id); if (e.t !== 'ring') arms.push({ th: Math.atan2(N.z - C[1], N.x - C[0]), def: PATH_DEF[e.t] }); } }
      // stoep en rand van de rotonde: open waar een weg aansluit. De opening wordt dwars op de weg gemeten (niet in graden),
      // zodat de rand van de rotondestoep evenwijdig loopt aan de stoeprand van de weg en er geen trap of kier ontstaat
      const NF = 720, angF = i => i / NF * Math.PI * 2, P = (r, th) => [C[0] + Math.cos(th) * r, C[1] + Math.sin(th) * r];
      const inGap = (th, r) => arms.some(A => { const d = Math.atan2(Math.sin(th - A.th), Math.cos(th - A.th)); return Math.abs(d) < 1.4 && Math.abs(r * Math.sin(d)) < A.def.hw + KERB_OUT; });
      const N0 = 72, ang = i => i / N0 * Math.PI * 2;
      const band = (L, r0, r1, y, gap) => { const n = gap ? NF : N0, an = i => i / n * Math.PI * 2; for (let i = 0; i < n; i++) { const a = an(i), b = an(i + 1); if (gap && inGap((a + b) / 2, (r0 + r1) / 2)) continue; polyInto(L, [P(r0, a), P(r1, a), P(r1, b), P(r0, b)], y); } };
      const wallArc = (L, r, y0, y1, gap) => { const n = gap ? NF : N0, an = i => i / n * Math.PI * 2; for (let i = 0; i < n; i++) { const a = an(i), b = an(i + 1); if (gap && inGap((a + b) / 2, r)) continue; wallSeg(L, P(r, a), P(r, b), y0, y1); } };
      band(asph, ROT.Ri, ROT.Ro + 0.3, Y + 0.02);
      for (let i = 0; i < NF; i++) { const a = angF(i), b = angF(i + 1); if (inGap((a + b) / 2, ROT.Ro + 0.4)) continue; slopeInto(kerb, [P(ROT.Ro + KERB_IN, a), P(ROT.Ro + KERB_IN, b)], [P(ROT.Ro + KERB_OUT, a), P(ROT.Ro + KERB_OUT, b)], Y + 0.015, PW_H); }   // schuine stoeprand, net als bij de wegen
      band(walk, ROT.Ro + KERB_OUT, ROT.Ro + 2.3, PW_H, true); wallArc(walk, ROT.Ro + 2.3, 0, PW_H, true);
      const ringPts = r => Array.from({ length: N0 + 1 }, (_, i) => P(r, ang(i)));
      band(pave, ROT.isl, ROT.Ri, Y + 0.1); slopeInto(kerb, ringPts(ROT.Ri + 0.12), ringPts(ROT.Ri - 0.08), Y + 0.015, Y + 0.1);   // overrijdbare rand, schuin
      slopeInto(kerb, ringPts(ROT.isl + 0.1), ringPts(ROT.isl - 0.2), Y + 0.1, PW_H + 0.05); band(kerb, ROT.isl - 0.25, ROT.isl, PW_H + 0.05); discInto(grass, C, ROT.isl - 0.25, PW_H + 0.06);
      for (const A of arms) {   // haaientanden op de inrit (rechts van wie de rotonde op rijdt)
        const d = [Math.cos(A.th), Math.sin(A.th)], r = [-d[1], d[0]], base = ROT.Ro + 0.8;
        for (let u = 0.35; u < A.def.hw - 0.2; u += 0.85) { const m = [C[0] + d[0] * base - r[0] * u, C[1] + d[1] * base - r[1] * u]; polyInto(dash, [[m[0] - r[0] * 0.3, m[1] - r[1] * 0.3], [m[0] + r[0] * 0.3, m[1] + r[1] * 0.3], [m[0] + d[0] * 0.75, m[1] + d[1] * 0.75]], Y + 0.035); }
      }
      { const tr = new THREE.Mesh(G.trunk, M.trunk); tr.scale.set(1, 1.4, 1); tr.position.set(C[0], PW_H + h0, C[1]); tr.castShadow = true; pathGroup.add(tr);
        const cr = new THREE.Mesh(G.crown, M.leaf[1]); cr.scale.set(1.35, 1.5, 1.35); cr.position.set(C[0], PW_H + 4.2 + h0, C[1]); cr.castShadow = true; pathGroup.add(cr); }
    }
    ctx(null, -1);
    [[grass, VM.grass], [walk, VM.walk], [kerb, VM.kerb], [asph, VM.asph], [pave, VM.pave], [dash, VM.dash], [skirt, VM.skirt], [bike, VM.bike], [rail, VM.rail], [barrier, VM.barrier], [klink, VM.klink]].forEach(([L, mat]) => { const m = layerMesh(L, mat); if (m) pathGroup.add(m); });
    if (lightReg && !quick) pathGroup.userData.col = roadCollision([asph, walk, pave, grass, bike, klink]);
    return pathGroup;
  }
  const distPoly = (x, z, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(x, z, pts[i], pts[i + 1])); return d; };
  // Rotonde neerzetten op het midden van een vak (twee ringen vakken moeten vrij zijn); wegen die erin uitkomen of
  // erdoorheen lopen sluiten vanzelf aan
  function placeRot(q, r) {
    const c = cellToWorld(q, r), P = pathsOf();
    if (P.some(p => p.t === 'rot' && Math.hypot(p.p[0][0] - c.x, p.p[0][1] - c.z) < 2 * ROT.Ro + 6)) return toast('Hier ligt al een rotonde vlakbij');
    const rp = { t: 'rot', l: 0, r: 0, p: [[Math.round(c.x * 100) / 100, Math.round(c.z * 100) / 100]] };
    for (const k of vecCoverOf([rp], true)) { const [a, b] = k.split(',').map(Number); if (vecObstacle(a, b)) return toast('Hier staat iets in de weg: een rotonde is ongeveer 32 m breed'); }
    P.push(rp); buildPathNet(); changed(); toast('Rotonde · trek wegen naar het midden om aan te sluiten', 2000);
  }
  function erasePathAt(res) {
    if (!res || !res.point || !cells.paths || !cells.paths.length) return false;
    let best = -1, bd = 1e9;
    cells.paths.forEach((p, i) => { const d = p.t === 'rot' ? Math.hypot(res.point.x - p.p[0][0], res.point.z - p.p[0][1]) - ROT.Ro : distPoly(res.point.x, res.point.z, smoothPts(p.p)) - PATH_DEF[p.t].hw; if (d < 2 && d < bd) { bd = d; best = i; } });
    if (best < 0) return false;
    const gone = cells.paths.splice(best, 1)[0]; buildPathNet(); changed(); toast(gone.t === 'rot' ? 'Rotonde weggehaald' : 'Weg weggehaald', 900); return true;
  }
  const edgePieceCache = new Map();
  function buildEdgeNet() {
    if (edgeGroup) { edgeGroup.traverse(m => { if (m.isMesh && m.userData.own) m.geometry.dispose(); }); scene.remove(edgeGroup); }
    edgeGroup = new THREE.Group(); scene.add(edgeGroup); edgeColMap.clear();
    const E = edgesOf(); if (!E.size) return;
    const V = new Map(), vid = p => Math.round(p[0] * 2) + ',' + Math.round(p[1] * 2);
    const addArm = (a, b, type) => {
      const id = vid(a); let v = V.get(id); if (!v) V.set(id, v = { x: a[0], z: a[1], arms: [] });
      v.arms.push({ th: Math.atan2(b[1] - a[1], b[0] - a[0]), type });
    };
    for (const [k, type] of E) {
      const [q, r, kk] = k.split(',').map(Number), [A, B] = edgeEnds(q, r, kk);
      addArm(A, B, type); addArm(B, A, type);
    }
    const reg = (v, surf) => {   // de drie vakken rond dit hoekpunt kennen het vlak
      const seen = new Set();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + 0.3, [q, r] = worldToCell(v.x + Math.cos(a) * 1.5, v.z + Math.sin(a) * 1.5), kk = key(q, r);
        if (seen.has(kk)) continue; seen.add(kk);
        let c = edgeColMap.get(kk); if (!c) edgeColMap.set(kk, c = { surfaces: [], walls: [] });
        c.surfaces.push(surf);
      }
    };
    const emit = (v, type, arms) => {
        const pk = type + ':' + arms.map(a => Math.round(a.th * 180 / Math.PI)).join(',');
        let piece = edgePieceCache.get(pk);
        if (!piece) {
          const poly = stripPolyArms(arms.map(a => ({ th: a.th, len: EDGE_L })), PATH_HALF, 1.7);
          piece = { padPoly: poly, pad: extrudePoly(poly, PAD_H_EDGE) };
          edgePieceCache.set(pk, piece);
        }
        const place = m => { m.position.set(v.x, EDGE_LIFT, v.z); m.receiveShadow = true; edgeGroup.add(m); return m; };
        {
          const m = place(new THREE.Mesh(piece.pad, [M.paver, M.kerb])); m.castShadow = true;
          reg(v, { kind: 'poly', cx: v.x, cz: v.z, pts: piece.padPoly, top: EDGE_LIFT + PAD_H_EDGE, bottom: EDGE_LIFT });
        }
    };
    for (const v of V.values()) {
      const arms = v.arms.filter(a => a.type === 'pad').sort((a, b) => a.th - b.th);
      if (arms.length) emit(v, 'pad', arms);
    }
    // rechtdoor door een vak: het middenstuk tussen de twee hoekpunt-stukken
    for (const [k, type] of E) {
      const [q, r, kk] = k.split(',').map(Number); if (kk < 6) continue;
      const [A, B] = edgeEnds(q, r, kk), th0 = Math.atan2(B[1] - A[1], B[0] - A[0]), c = cellToWorld(q, r);
      emit({ x: c.x, z: c.z }, type, [{ th: th0 }, { th: th0 + Math.PI }].sort((a, b) => a.th - b.th));
    }
  }
  function placeEdgeAt(res, quiet) {
    if (!res || !res.point) return false;
    const ne = nearestEdge(res.point.x, res.point.z), type = 'pad', E = edgesOf();
    const why = edgeBlocked(ne.q, ne.r, ne.k);
    if (why) { if (!quiet) toast(why); return false; }
    if (E.get(ne.key) === type) { if (!quiet) toast('Hier ligt al een randpad · gum haalt hem weg', 1600); return false; }
    E.set(ne.key, type); buildEdgeNet(); changed();
    return true;
  }
  function eraseEdgeAt(res) {
    if (!res || !res.point) return false;
    const E = edgesOf(); if (!E.size) return false;
    const ne = nearestExistingEdge(res.point.x, res.point.z, 4.5);
    if (!ne) return false;
    E.delete(ne.key); buildEdgeNet(); changed(); toast('Randweg weggehaald', 900);
    return true;
  }
  let edgeLast = null;
  let edgePrevXY = null;
  function edgePaintOne(cx, cy) {
    const res = pick(cx, cy); if (!res || !res.point) return;
    const ne = nearestEdge(res.point.x, res.point.z);
    if (edgeLast === ne.key) return;
    edgeLast = ne.key; lastPickRes = res;
    placeEdgeAt(res, true);
  }
  // Slepen: tussen twee pointer-events in extra punten nemen, zodat geen rand wordt overgeslagen
  function edgePaintAt(cx, cy) {
    const p = edgePrevXY;
    if (p && Math.hypot(cx - p[0], cy - p[1]) < 300) {
      const n = Math.max(1, Math.ceil(Math.hypot(cx - p[0], cy - p[1]) / 5));
      for (let i = 1; i <= n; i++) edgePaintOne(p[0] + (cx - p[0]) * i / n, p[1] + (cy - p[1]) * i / n);
    } else edgePaintOne(cx, cy);
    edgePrevXY = [cx, cy];
  }
  addEventListener('pointerup', () => { edgePrevXY = null; edgeLast = null; });
  addEventListener('pointerdown', () => { edgePrevXY = null; });
  const edgeGhost = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 1), new THREE.MeshBasicMaterial({ color: '#f2b233', transparent: true, opacity: 0.6, depthWrite: false }));
  edgeGhost.visible = false; scene.add(edgeGhost);
  function showEdgeGhost(res, bad, width) {
    if (!res || !res.point) { edgeGhost.visible = false; return; }
    const ne = nearestEdge(res.point.x, res.point.z), [A, B] = edgeEnds(ne.q, ne.r, ne.k);
    edgeGhost.position.set((A[0] + B[0]) / 2, 0.25, (A[1] + B[1]) / 2);
    edgeGhost.rotation.y = -Math.atan2(B[1] - A[1], B[0] - A[0]);
    edgeGhost.scale.set(Math.hypot(B[0] - A[0], B[1] - A[1]), 1, width || 4.5);
    edgeGhost.material.color.set(bad ? '#e0573e' : '#f2b233');
    edgeGhost.visible = true;
  }


