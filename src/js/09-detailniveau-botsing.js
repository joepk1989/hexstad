  // ---------- Detailniveau: grote steden tekenen alleen vlak om je heen volledig; de rest is een goedkoop vlakkenmodel ----------
  const LOD = { on: false, rad: 10 * R * SQ3, fx: 1e9, fz: 1e9, mesh: null };
  const LOD_COL = { kuil: 0x5f9a4a, heuvel: 0x5f9a4a, weg: 0x3d4148, water: 0x3a7ca5, park: 0x5f9a4a, hof: 0x9a9a92, woning: 0xd9b48f, kantoor: 0x8fa6bd, dak: 0xb5543c, pad: 0xb8aa8a };
  const lodFar = (x, z) => LOD.on && Math.hypot(x - LOD.fx, z - LOD.fz) > LOD.rad;
  function lodProxy() {
    if (LOD.mesh) { blocks.remove(LOD.mesh); LOD.mesh.geometry.dispose(); LOD.mesh = null; }
    if (!LOD.on) return;
    const pos = [], nor = [], colr = [], cc = new THREE.Color();
    const ang = [0, 1, 2, 3, 4, 5].map(i => (30 + 60 * i) * Math.PI / 180), cs = ang.map(Math.cos), sn = ang.map(Math.sin);
    const tri = (a, b, c, n, col) => { for (const v of [a, b, c]) { pos.push(v[0], v[1], v[2]); nor.push(n[0], n[1], n[2]); colr.push(col.r, col.g, col.b); } };
    for (const [k, st] of cells) {
      if (groups.has(k)) continue;
      const [q, r] = k.split(',').map(Number), { x, z } = cellToWorld(q, r);
      const top = baseOf(st[st.length - 1]), road = false;
      let h = gH(q, r); for (const t of st) h += TY(t)?.h || 0;
      if (top === 'park' && st.length === 1) h = 0.1;
      if (top === 'water' || (st.length === 2 && baseOf(st[0]) === 'water')) h = st.length === 2 ? 0.25 : -1.2;
      const rad = road ? R : R * 0.88;
      cc.setHex(LOD_COL[top] || 0x999999);
      if (st.length > 1 && top === 'woning') cc.offsetHSL(0, 0, ((st.length * 37) % 7) / 100 - 0.03);
      const P = i => [x + cs[i % 6] * rad, h, z + sn[i % 6] * rad];
      const ctr = [x, h, z];
      for (let i = 0; i < 6; i++) tri(ctr, P(i + 1), P(i), [0, 1, 0], cc);
      if (h > 0.5) {
        const side = cc.clone().multiplyScalar(0.8);
        for (let i = 0; i < 6; i++) {
          const a = P(i), b = P(i + 1), a0 = [a[0], 0, a[2]], b0 = [b[0], 0, b[2]];
          const mx = cs[i] + cs[(i + 1) % 6], mz = sn[i] + sn[(i + 1) % 6], ml = Math.hypot(mx, mz) || 1, n = [mx / ml, 0, mz / ml];
          tri(a0, b, a, n, side); tri(a0, b0, b, n, side);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.frustumCulled = false; m.matrixAutoUpdate = false; blocks.add(m); LOD.mesh = m;
  }
  // volgt de camera: vakken vlakbij worden gedetailleerd gebouwd, vakken ver weg weer vervangen door het vlakkenmodel
  function lodUpdate(fx, fz, force) {
    if (!LOD.on) return;
    if (!force && Math.hypot(fx - LOD.fx, fz - LOD.fz) < R * SQ3 * 3) return;
    LOD.fx = fx; LOD.fz = fz;
    for (const k of cells.keys()) {
      const [q, r] = k.split(',').map(Number), { x, z } = cellToWorld(q, r), d = Math.hypot(x - fx, z - fz), g = groups.get(k);
      if (!g && d <= LOD.rad) buildColumn(q, r, true);
      else if (g && d > LOD.rad + 3 * R * SQ3) { disposeGroup(g); blocks.remove(g); groups.delete(k); colMap.delete(k); }
    }
    lodProxy();
  }
  function buildColumn(q, r, force) {
    const k = key(q, r);
    const old = groups.get(k);
    if (old) { disposeGroup(old); blocks.remove(old); groups.delete(k); }
    colMap.delete(k);
    const st = cells.get(k);
    if (!st || !st.length) return;
    const { x, z } = cellToWorld(q, r);
    if (!force && lodFar(x, z)) return;
    const col = { surfaces: [], walls: [] };
    const g = new THREE.Group();
    let y = 0;
    st.forEach((t, i) => { g.add(makeBlock(t, q, r, i, y, x, z, col)); y += TY(t).h; });
    const G = gH(q, r); g.position.set(x, G, z); shiftCol(col, G);   // alles op het vak staat op de terreinhoogte
    { const pl = terrPlinth(q, r); if (pl) g.add(pl); }
    blocks.add(g); groups.set(k, g); colMap.set(k, col);
  }
  let peopleDirty = true, peopleLocalEdit = false, carsDirty = true, vecDirty = true;
  function rebuildAround(q, r) {
    terrVer++;
    const todo = new Set();
    for (const k of refreshPathLinks()) todo.add(k);
    todo.add(key(q, r));
    for (const [dq, dr] of NEIGH) todo.add(key(q + dq, r + dr));
    // randhoogtes hangen ook af van de berm van een weg ernaast, en die van de buren van die weg
    for (const [dq, dr] of NEIGH) for (const [eq, er] of NEIGH) {
      const nq = q + dq + eq, nr = r + dr + er, b = baseOf(stackOf(nq, nr)[0]);
      if (b === 'park' || b === 'pad' || b === 'weg') todo.add(key(nq, nr));
    }
    for (const k of todo) { const [cq, cr] = k.split(',').map(Number); buildColumn(cq, cr); }
    terrDirty([[q, r]]); terrFlush();   // plateau van het vak
    peopleDirty = true; peopleLocalEdit = true; carsDirty = true;
  }
  // Veel vakken tegelijk (een laan trekken): de netwerken één keer bijwerken
  function rebuildMany(list) {
    terrVer++;
    const todo = new Set();
    for (const k of refreshPathLinks()) todo.add(k);
    for (const [q, r] of list) {
      todo.add(key(q, r));
      for (const [dq, dr] of NEIGH) {
        todo.add(key(q + dq, r + dr));
        for (const [eq, er] of NEIGH) { const nq = q + dq + eq, nr = r + dr + er, b = baseOf(stackOf(nq, nr)[0]); if (b === 'park' || b === 'pad' || b === 'weg') todo.add(key(nq, nr)); }
      }
    }
    for (const k of todo) { const [cq, cr] = k.split(',').map(Number); buildColumn(cq, cr); }
    terrDirty(list); terrFlush();
    peopleDirty = true; peopleLocalEdit = true; carsDirty = true;
  }
  function rebuildAll() {
    convertCellRoads();   // oude vakwegen worden getekende wegen
    terrMigrate(); terrHold = true; terrRebuildAll();   // oude verhogingen worden terreinhoogte
    terrVer++; roadCols = new Map();
    for (const g of groups.values()) { disposeGroup(g); blocks.remove(g); }
    groups.clear(); colMap.clear();
    { const res = computePathLinks(); pathLinks = res.masks; pathIfs = res.ifs; pathCorners = res.corners; cornerVia = res.via; }
    LOD.on = cells.size > 1800;
    if (LOD.on) { LOD.fx = mode === 'walk' ? player.x : orbit.target.x; LOD.fz = mode === 'walk' ? player.z : orbit.target.z; }
    for (const k of cells.keys()) { const [q, r] = k.split(',').map(Number); buildColumn(q, r); }
    lodProxy(); buildEdgeNet(); buildPathNet(); buildTriNet(); buildModNet(); peopleDirty = true; carsDirty = true;
    terrHold = false; terrFlush();
  }

  // ---------- Botsing tijdens lopen ----------
  const PR = 0.25, STEP = 0.4, TORSO = 1.2;
  const SAMPLES = [[0, 0], [0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]];
  function inHex(dx, dz) { for (const f of FRAMES) if (dx * f.nx + dz * f.nz > INNER) return false; return true; }
  function inRect(dx, dz, f, u0, u1, p0, p1) {
    const u = dx * f.tx + dz * f.tz, p = dx * f.nx + dz * f.nz;
    return u >= u0 && u <= u1 && p >= p0 && p <= p1 ? u : null;
  }
  function surfTop(s, x, z) {
    const dx = x - s.cx, dz = z - s.cz;
    if (s.kind === 'poly') return inPoly(dx, dz, s.pts) ? s.top : null;
    if (s.kind === 'tris') {
      const L = s.B.get(Math.floor(dx) * 1000 + Math.floor(dz));
      if (!L) return null;
      let best = null;
      for (const T of L) {
        const ex = dx - T[0], ez = dz - T[1];
        const w1 = (ex * (T[7] - T[1]) - (T[6] - T[0]) * ez) * T[9];
        const w2 = ((T[3] - T[0]) * ez - ex * (T[4] - T[1])) * T[9];
        if (w1 < -1e-4 || w2 < -1e-4 || w1 + w2 > 1 + 1e-4) continue;
        const y = T[2] + (T[5] - T[2]) * w1 + (T[8] - T[2]) * w2;
        if (best === null || y > best) best = y;
      }
      return best === null ? null : s.base + best;
    }
    if (s.kind === 'rect' || s.kind === 'slope') {
      const f = FRAMES[s.k], u = dx * f.tx + dz * f.tz, p = dx * f.nx + dz * f.nz;
      if (u < s.u0 || u > s.u1 || p < s.p0 || p > s.p1) return null;
      return s.kind === 'rect' ? s.top : s.y0 + (s.y1 - s.y0) * (p - s.p0) / (s.p1 - s.p0);
    }
    if (s.kind === 'slopeU') {   // schuine steek van een bordestrap: hoogte loopt lineair langs u
      const u = dx * s.tx + dz * s.tz, p = dx * s.nx + dz * s.nz;
      if (u < s.u0 || u > s.u1 || p < s.p0 || p > s.p1) return null;
      return s.y0 + (s.y1 - s.y0) * (u - s.u0) / (s.u1 - s.u0);
    }
    if (s.kind === 'hex') {
      if (!inHex(dx, dz)) return null;
      if (s.holePoly && inPoly(dx, dz, s.holePoly)) return null;
      if (s.hole && inRect(dx, dz, FRAMES[s.hk ?? STAIR], HOLE.u0, HOLE.u1, HOLE.p0, HOLE.p1) !== null) return null;
      return s.top;
    }
    const u = inRect(dx, dz, FRAMES[s.k ?? STAIR], ST.u0, ST.u1, ST.p0, ST.p1);
    if (u === null) return null;
    return s.base + FLOOR_T + 3 * (u - ST.u0) / (ST.u1 - ST.u0);
  }
  const surfBottom = s => s.kind === 'ramp' ? s.base + FLOOR_T : s.bottom;
  function nearby(x, z) {
    const [q, r] = worldToCell(x, z), out = [];
    const c = colMap.get(key(q, r)); if (c) out.push(c);
    const e0 = edgeColMap.get(key(q, r)); if (e0) out.push(e0);
    const m0 = modCols.get(key(q, r)); if (m0) out.push(...m0);
    const r0 = roadCols.get(key(q, r)); if (r0) for (const x of r0) if (!out.includes(x)) out.push(x);
    for (const [dq, dr] of NEIGH) { const kk = key(q + dq, r + dr), c2 = colMap.get(kk); if (c2) out.push(c2); const e2 = edgeColMap.get(kk); if (e2) out.push(e2); const m2 = modCols.get(kk); if (m2) for (const x of m2) if (!out.includes(x)) out.push(x); const r2 = roadCols.get(kk); if (r2) for (const x of r2) if (!out.includes(x)) out.push(x); }
    return out;
  }
  function segDist(x, z, w) {
    const dx = w.bx - w.ax, dz = w.bz - w.az, l2 = dx * dx + dz * dz;
    const s = l2 ? Math.max(0, Math.min(1, ((x - w.ax) * dx + (z - w.az) * dz) / l2)) : 0;
    return Math.hypot(w.ax + s * dx - x, w.az + s * dz - z);
  }
  // Water is onbegaanbaar, behalve op een brugdek
  function waterAt(x, z) {
    const [q, r] = worldToCell(x, z);
    if (baseOf(stackOf(q, r)[0]) !== 'water') return false;
    const c = colMap.get(key(q, r));
    if (c) for (const s2 of c.surfaces) { const t = surfTop(s2, x, z); if (t !== null && t > -0.6) return false; }
    return true;
  }
  function blockedAt(x, z, feet) {
    if (feet < 3) for (const [ox, oz] of SAMPLES) if (waterAt(x + ox, z + oz)) return true;
    for (const c of nearby(x, z)) {
      for (const s of c.surfaces) {
        if (surfBottom(s) >= feet + TORSO) continue;
        for (const [ox, oz] of SAMPLES) {
          const t = surfTop(s, x + ox, z + oz);
          if (t !== null && t > feet + STEP) return true;
        }
      }
      for (const w of c.walls) {
        if (w.y0 >= feet + TORSO || w.y1 <= feet + STEP) continue;
        if (segDist(x, z, w) < PR + w.half) return true;
      }
    }
    return false;
  }
  function whyBlocked(x, z, feet) {   // voor tests: wat blokkeert hier?
    const out = [];
    for (const c of nearby(x, z)) {
      for (const s of c.surfaces) { if (surfBottom(s) >= feet + TORSO) continue; for (const [ox, oz] of SAMPLES) { const t = surfTop(s, x + ox, z + oz); if (t !== null && t > feet + STEP) { out.push({ surf: s.kind, top: +t.toFixed(2), bottom: surfBottom(s) }); break; } } }
      for (const w of c.walls) { if (w.y0 >= feet + TORSO || w.y1 <= feet + STEP) continue; const d = segDist(x, z, w); if (d < PR + w.half) out.push({ wall: [+w.ax.toFixed(2), +w.az.toFixed(2), +w.bx.toFixed(2), +w.bz.toFixed(2)], y: [+w.y0.toFixed(2), +w.y1.toFixed(2)], half: w.half, d: +d.toFixed(2) }); }
    }
    return out;
  }
  function floorAt(x, z, feet) {
    let best = Math.max(0, terrGround(x, z));   // het maaiveld (terrein), daarboven wat er gebouwd is
    const cols = nearby(x, z);
    for (const [ox, oz] of SAMPLES) for (const c of cols) for (const s of c.surfaces) {
      const t = surfTop(s, x + ox, z + oz);
      if (t !== null && t <= feet + STEP && t > best) best = t;
    }
    return best;
  }

