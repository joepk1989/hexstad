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
  const PATH_DEF = { weg: { hw: 2.5, walk: 2.0 }, brd: { hw: 4.5, walk: 2.0 }, laan: { hw: 8.75, walk: 2.5, med: 1.5 }, pad: { hw: 1.6, walk: 0.5 } };
  const vmat = (color, n) => std({ color, polygonOffset: true, polygonOffsetFactor: -n, polygonOffsetUnits: -n, side: THREE.DoubleSide });
  const VM = { grass: vmat('#6aa84a', 1), walk: vmat('#cbc8bd', 1), kerb: vmat('#9b988e', 2), asph: vmat('#3c4045', 3), dash: vmat('#f1efe6', 4), pave: vmat('#9b5a45', 3) };
  let pathGroup = null;
  // Welke vakken beslaat een getekende weg? Een vak hoort erbij als zijn midden dicht genoeg bij de lijn ligt
  // (breedte van de weg plus een half vak). Die vakken krijgen een zandkleurige vloer en zijn niet meer bebouwbaar.
  let vecCover = new Set();
  function vecCoverOf(P, strict) {   // strict: alleen vakken waarvan het midden binnen de verharding ligt (voor obstakels)
    const out = new Set();
    for (const path of P || []) {
      const def = PATH_DEF[path.t]; if (!def || !path.p || path.p.length < 2) continue;
      const pts = smoothPts(path.p), reach = def.hw + def.walk + (strict ? 0 : R * 0.5), cand = new Set(), samp = [];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (R / 2))); for (let j = 0; j <= n; j++) samp.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]); }
      for (const p of samp) { const [q, r] = worldToCell(p[0], p[1]); for (let dq = -2; dq <= 2; dq++) for (let dr = -2; dr <= 2; dr++) cand.add((q + dq) + ',' + (r + dr)); }
      for (const k of cand) { const [q, r] = k.split(',').map(Number), c = cellToWorld(q, r); if (distPoly(c.x, c.z, pts) < reach) out.add(k); }
    }
    return out;
  }
  // Vakken waar een weg niet doorheen mag: gebouwen en alles wat hoger is dan de grond, en water
  const vecObstacle = (q, r) => { const st = stackOf(q, r); if (!st.length) return false; const b = baseOf(st[0]); return b === 'water' || b === 'kuil' || b === 'heuvel' || columnTop(q, r) > 0.5; };
  const SAND = std({ color: '#d6c69a', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const HEX_FLAT = (() => { const s = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; i ? s.lineTo(Math.cos(a) * R, Math.sin(a) * R) : s.moveTo(Math.cos(a) * R, Math.sin(a) * R); } s.closePath(); return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); })();
  function smoothPts(p) {   // hoeken afronden (straal tot 8 m, nooit verder dan de helft van een stuk), ongeveer elke 2 m een punt
    if (p.length < 3) return p.map(a => a.slice());
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
  function vecGraphOf(paths, ver) {
    const P = (paths || []).filter(p => (p.t === 'weg' || p.t === 'brd' || p.t === 'laan') && p.p && p.p.length > 1);
    const lines = P.map(p => { const pts = smoothPts(p.p); let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q[0]); z0 = Math.min(z0, q[1]); x1 = Math.max(x1, q[0]); z1 = Math.max(z1, q[1]); } return { t: p.t, pts, cuts: new Set(), bb: [x0 - 9, z0 - 9, x1 + 9, z1 + 9] }; });
    const bbHit = (A, B) => A.bb[0] <= B.bb[2] && B.bb[0] <= A.bb[2] && A.bb[1] <= B.bb[3] && B.bb[1] <= A.bb[3];
    const cutAt = (L, i, f) => { if (f < 0.02) { if (i > 0) L.cuts.add(i); } else if (f > 0.98) { if (i + 1 < L.pts.length - 1) L.cuts.add(i + 1); } else L.cuts.add(i + f); };
    // kruisende lijnen: allebei knippen op het snijpunt
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
      const A = lines[a], B = lines[b]; if (!bbHit(A, B)) continue;
      for (let i = 0; i < A.pts.length - 1; i++) for (let j = 0; j < B.pts.length - 1; j++) { const x = segX(A.pts[i], A.pts[i + 1], B.pts[j], B.pts[j + 1]); if (x) { cutAt(A, i, x[0]); cutAt(B, j, x[1]); } }
    }
    // een uiteinde dat op een andere lijn uitkomt (T-aansluiting): die lijn daar knippen
    for (const A of lines) for (const e of [A.pts[0], A.pts[A.pts.length - 1]]) for (const B of lines) {
      if (B === A || e[0] < B.bb[0] || e[0] > B.bb[2] || e[1] < B.bb[1] || e[1] > B.bb[3]) continue;
      let bi = -1, bf = 0, bd = 1e9;
      for (let j = 0; j < B.pts.length - 1; j++) {
        const p = B.pts[j], q = B.pts[j + 1], dx = q[0] - p[0], dz = q[1] - p[1], l2 = dx * dx + dz * dz || 1;
        const f = Math.max(0, Math.min(1, ((e[0] - p[0]) * dx + (e[1] - p[1]) * dz) / l2)), d = Math.hypot(e[0] - p[0] - dx * f, e[1] - p[1] - dz * f);
        if (d < bd) { bd = d; bi = j; bf = f; }
      }
      if (bi >= 0 && bd < PATH_DEF[B.t].hw + 1.5 && !(bi === 0 && bf < 0.02) && !(bi === B.pts.length - 2 && bf > 0.98)) cutAt(B, bi, bf);
    }
    const pieces = [];
    for (const L of lines) {
      const cuts = [...L.cuts].sort((x, y) => x - y); let cur = [L.pts[0]], ci = 0;
      for (let i = 0; i < L.pts.length - 1; i++) {
        while (ci < cuts.length && cuts[ci] < i + 1) {
          const f = cuts[ci] - i, p = f <= 0 ? L.pts[i] : [L.pts[i][0] + (L.pts[i + 1][0] - L.pts[i][0]) * f, L.pts[i][1] + (L.pts[i + 1][1] - L.pts[i][1]) * f];
          if (f > 0) cur.push(p);
          if (cur.length > 1) pieces.push({ t: L.t, pts: cur });
          cur = [p]; ci++;
        }
        cur.push(L.pts[i + 1]);
      }
      if (cur.length > 1) pieces.push({ t: L.t, pts: cur });
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
      edges.set(id, { id, t: pc.t, pts, a, b, len }); nodes[a].edges.push(id); nodes[b].edges.push(id); totalLen += len;
    });
    // Verkeerslichten: elke knoop met drie of meer takken. De takken worden in twee groepen verdeeld (de as van de
    // eerste tak en de rest); de groepen krijgen om de beurt groen. Elke kruising heeft een eigen beginmoment.
    for (let n = 0; n < nodes.length; n++) {
      const N = nodes[n]; if (N.edges.length < 3) continue;
      const dirIn = id => { const e = edges.get(id); const into = e.b === n; const p = into ? e.pts : e.pts.slice().reverse(); const a = p[p.length - 2], b = p[p.length - 1]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
      // takken op (bijna) dezelfde lijn vormen één groep; elke groep krijgt om de beurt groen (meestal 2, bij zes takken 3)
      const reps = [], grp = new Map();
      for (const id of N.edges) { const d = dirIn(id); let g = reps.findIndex(r => Math.abs(d[0] * r[0] + d[1] * r[1]) > 0.9); if (g < 0) { g = reps.length; reps.push(d); } grp.set(id, g); }
      if (reps.length < 2) continue;
      N.light = { grp, n: reps.length, off: ((Math.round(N.x * 7) * 31 + Math.round(N.z * 7) * 17) & 1023) / 1024 * 28 };
    }
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
    const N = G.nodes[n]; if (!N || N.edges.length < 3) return 0;
    let hw = 0; for (const id of N.edges) hw = Math.max(hw, PATH_DEF[G.edges.get(id).t].hw); return Math.max(hw + 2.5, 7.5);
  };
  const vecTrimW = (G, n) => { const t = vecJunctionTrim(G, n); return t ? t + 0.3 : 0; };   // stoep: net voorbij de stopstreep
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
  function convertCellRoads() {
    const plain = new Set(), laanC = [];
    for (const [k, st] of cells) {
      if (!Array.isArray(st) || st.length !== 1) continue;
      const b = baseOf(st[0]);
      if (b === 'weg') plain.add(k); else if (laanD(st[0]) >= 0) laanC.push({ k, d: laanD(st[0]) });
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
    for (const k of used) cells.delete(k);
    for (const { k } of laanC) cells.delete(k);
    for (const k of plain) if (!used.has(k)) cells.delete(k);   // een eenzaam wegvak zonder buren: weg
    return true;
  }
  const newLayer = () => ({ pos: [], idx: [] });
  function ribbonInto(L, pts, hw, y, off = 0) {   // een lint rond een lijn; off schuift het opzij
    if (pts.length < 2) return;
    const base = L.pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const nx = -dz, nz = dx, cx = pts[i][0] + nx * off, cz = pts[i][1] + nz * off;
      L.pos.push(cx + nx * hw, y, cz + nz * hw, cx - nx * hw, y, cz - nz * hw);
    }
    for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; L.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  function wallInto(L, pts, off, y0, y1) {   // verticale strook (stoeprand) langs een lijn, off opzij
    if (pts.length < 2) return;
    const base = L.pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const x = pts[i][0] - dz * off, z = pts[i][1] + dx * off;
      L.pos.push(x, y0, z, x, y1, z);
    }
    for (let i = 0; i < pts.length - 1; i++) { const a = base + i * 2; L.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  function ringWallInto(L, p, r, y0, y1) {
    const base = L.pos.length / 3;
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, x = p[0] + Math.cos(a) * r, z = p[1] + Math.sin(a) * r; L.pos.push(x, y0, z, x, y1, z); }
    for (let i = 0; i < 24; i++) { const a = base + i * 2, b = base + ((i + 1) % 24) * 2; L.idx.push(a, a + 1, b, a + 1, b + 1, b); }
  }
  function polyInto(L, pts, y) {   // platte veelhoek (waaier vanuit het eerste punt)
    const base = L.pos.length / 3; for (const p of pts) L.pos.push(p[0], y, p[1]);
    for (let i = 1; i < pts.length - 1; i++) L.idx.push(base, base + i, base + i + 1);
  }
  function wallSeg(L, a, b, y0, y1) { const base = L.pos.length / 3; L.pos.push(a[0], y0, a[1], a[0], y1, a[1], b[0], y0, b[1], b[0], y1, b[1]); L.idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2); }
  function discInto(L, p, r, y) {
    const base = L.pos.length / 3; L.pos.push(p[0], y, p[1]);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; L.pos.push(p[0] + Math.cos(a) * r, y, p[1] + Math.sin(a) * r); }
    for (let i = 0; i < 16; i++) L.idx.push(base, base + 1 + i, base + 1 + (i + 1) % 16);
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
  function layerMesh(L, mat) {
    if (!L.pos.length) return null;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
    const nn = new Float32Array(L.pos.length); for (let i = 1; i < nn.length; i += 3) nn[i] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); g.setIndex(L.idx);
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData.own = true; return m;
  }
  function buildPathNet() {
    if (pathGroup) { pathGroup.traverse(m => { if (m.isMesh && m.userData.own) m.geometry.dispose(); }); scene.remove(pathGroup); }
    vecLightReg = []; pathGroup = pathBuild(cells.paths, vecLightReg); scene.add(pathGroup); carsDirty = true; vecDirty = true; peopleDirty = true;
    vecCover = vecCoverOf(cells.paths);
    for (const k of vecCover) { const [q, r] = k.split(',').map(Number); if (stackOf(q, r).length) continue; const c = cellToWorld(q, r), m = new THREE.Mesh(HEX_FLAT, SAND); m.position.set(c.x, 0.03, c.z); m.receiveShadow = true; pathGroup.add(m); }
  }
  function pathBuild(P, lightReg) {   // lint-meshes voor een lijst vrije wegen; ook gebruikt door de 3D-weergave in de schets
    const pathGroup = new THREE.Group();
    if (!P || !P.length) return pathGroup;
    const grass = newLayer(), walk = newLayer(), kerb = newLayer(), asph = newLayer(), pave = newLayer(), dash = newLayer(), Y = 0.1;
    for (const path of P) {
      const def = PATH_DEF[path.t]; if (!def || !path.p || path.p.length < 2) continue;
      const pts = smoothPts(path.p);
      const edgeW = path.t === 'pad' ? def.hw + 0.3 : def.hw + def.walk;
      for (const [w, sg] of [[path.r, 1], [path.l, -1]]) if (w > 0) ribbonInto(grass, pts, w / 2, path.t === 'pad' ? Y - 0.005 : PW_H - 0.005, sg * (edgeW + w / 2));
      if (path.t === 'pad') {
        ribbonInto(kerb, pts, def.hw + 0.3, Y + 0.01); pts.length && [pts[0], pts[pts.length - 1]].forEach(p => discInto(kerb, p, def.hw + 0.3, Y + 0.01));
        ribbonInto(pave, pts, def.hw, Y + 0.02); [pts[0], pts[pts.length - 1]].forEach(p => discInto(pave, p, def.hw, Y + 0.02));
        continue;
      }
      ribbonInto(asph, pts, def.hw + 0.3, Y + 0.02);   // de ronde kop komt alleen op een doodlopend eind (zie de knopen hieronder)
    }
    // Stoepen per tak van de graaf: 25 cm hoog (als bij de gewone wegen) met een stoeprand; ze houden op bij
    // een kruising, zodat ze niet over de zijstraat heen lopen. Aan de kop van een doodlopende weg een ring.
    const GR = vecGraphOf(P);
    // Middenberm van een laan: verhoogd gras met stoeprand en om de 10 m een boom; houdt op voor een kruising en
    // voor de kop van de laan (daar keren de auto's)
    const medTrim = n => { const N = GR.nodes[n]; if (!N) return 0; if (N.edges.length < 3) return N.edges.length === 1 ? 7 : 0; return vecJunctionTrim(GR, n) + 1.5; };
    for (const e of GR.edges.values()) {
      if (e.t !== 'laan') continue;
      const med = PATH_DEF.laan.med, mp = trimPts(e.pts, medTrim(e.a), medTrim(e.b)); if (mp.length < 2 || plen(mp) < 2) continue;
      ribbonInto(grass, mp, med, PW_H + 0.005); for (const sg of [1, -1]) wallInto(kerb, mp, sg * med, Y, PW_H); ribbonInto(kerb, mp, med, PW_H, 0);
      [mp[0], mp[mp.length - 1]].forEach(p => { ringWallInto(kerb, p, med, Y, PW_H); discInto(grass, p, med, PW_H + 0.005); });
      const L = plen(mp); let s = 5, i = 1, acc = 0;
      while (s < L - 4) {
        while (i < mp.length - 1 && acc + Math.hypot(mp[i][0] - mp[i - 1][0], mp[i][1] - mp[i - 1][1]) < s) { acc += Math.hypot(mp[i][0] - mp[i - 1][0], mp[i][1] - mp[i - 1][1]); i++; }
        const a = mp[i - 1], b = mp[i], f = (s - acc) / Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1])), x = a[0] + (b[0] - a[0]) * f, z = a[1] + (b[1] - a[1]) * f;
        const hj = (Math.round(x * 3) * 31 + Math.round(z * 3) * 17) & 1023, sc = 0.85 + (hj % 4) * 0.07;
        const tr = new THREE.Mesh(G.trunk, M.trunk); tr.scale.set(0.85, 1.25, 0.85); tr.position.set(x, PW_H - 0.02, z); tr.castShadow = true; pathGroup.add(tr);
        const cr = new THREE.Mesh(G.crown, M.leaf[hj % 3]); cr.scale.set(sc, sc * 1.2, sc); cr.position.set(x, PW_H + 3.2 + 2.1 * sc, z); cr.rotation.y = (hj % 7) * 0.4; cr.castShadow = true; pathGroup.add(cr);
        s += 10;
      }
    }
    // Wegmarkering per tak, en niet over de kruising heen
    const markTrim = n => vecJunctionTrim(GR, n);
    for (const e of GR.edges.values()) {
      if (e.t === 'pad') continue;
      const mp = trimPts(e.pts, markTrim(e.a), markTrim(e.b)); if (mp.length < 2) continue;
      if (e.t === 'weg') dashesInto(dash, mp, 0.07, Y + 0.03, 3, 3.5);
      else if (e.t === 'laan') { for (const sg of [1, -1]) { ribbonInto(dash, mp, 0.06, Y + 0.03, sg * 4.75); ribbonInto(pave, mp, 1.0, Y + 0.025, sg * 7.75); ribbonInto(dash, mp, 0.05, Y + 0.03, sg * 6.75); } }
      else { dashesInto(dash, mp, 0.06, Y + 0.03, 3, 3.5, 2.25); dashesInto(dash, mp, 0.06, Y + 0.03, 3, 3.5, -2.25); ribbonInto(dash, mp, 0.05, Y + 0.03, 0.12); ribbonInto(dash, mp, 0.05, Y + 0.03, -0.12); }
    }
    // Stoephoeken op kruisingen: tussen twee opeenvolgende takken loopt de stoep door (afgesneden hoek), met stoeprand
    for (let n = 0; n < GR.nodes.length; n++) {
      const N = GR.nodes[n]; if (N.edges.length < 3) continue;
      const arms = N.edges.map(id => { const e = GR.edges.get(id), dir = e.a === n ? 0 : 1, p = dir ? e.pts.slice().reverse() : e.pts, a = p[0], b = p[Math.min(p.length - 1, 2)]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { e, dir, d: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], th: Math.atan2(b[1] - a[1], b[0] - a[0]) }; }).sort((x, y) => x.th - y.th);
      for (let i = 0; i < arms.length; i++) {
        const A = arms[i], B = arms[(i + 1) % arms.length];
        const sideTo = (X, Y) => { const r = [-X.d[1], X.d[0]]; return r[0] * Y.d[0] + r[1] * Y.d[1] > 0 ? 1 : -1; };
        const sA = sideTo(A, B), sB = sideTo(B, A), dA = PATH_DEF[A.e.t], dB = PATH_DEF[B.e.t];
        const KA = vecWalkPts(GR, A.e, A.dir, sA * (dA.hw + 0.3))[0], OA = vecWalkPts(GR, A.e, A.dir, sA * (dA.hw + dA.walk))[0];
        const KB = vecWalkPts(GR, B.e, B.dir, sB * (dB.hw + 0.3))[0], OB = vecWalkPts(GR, B.e, B.dir, sB * (dB.hw + dB.walk))[0];
        polyInto(asph, [[N.x, N.z], KA, KB], Y + 0.02);   // het kruisingsvak zelf: tot aan de afgesneden hoek dicht met asfalt
        polyInto(walk, [KA, KB, OB, OA], PW_H); polyInto(kerb, [KA, KB, [KB[0] + (OB[0] - KB[0]) * 0.08, KB[1] + (OB[1] - KB[1]) * 0.08], [KA[0] + (OA[0] - KA[0]) * 0.08, KA[1] + (OA[1] - KA[1]) * 0.08]], PW_H + 0.005);
        wallSeg(kerb, KA, KB, Y, PW_H); wallSeg(walk, OA, OB, 0, PW_H);
      }
    }
    // Verkeerslichten: per tak een paal rechts van de rijbaan, op de hoek van de stoep, met de kop naar het verkeer
    for (let n = 0; n < GR.nodes.length; n++) {
      const N = GR.nodes[n]; if (!N.light) continue;
      for (const id of N.edges) {
        const e = GR.edges.get(id), def = PATH_DEF[e.t], into = e.b === n, pts = into ? e.pts : e.pts.slice().reverse();
        const lane = trimPts(offsetPts(pts, def.hw + 0.9), 0, vecTrimW(GR, n) - 0.6), p = lane[lane.length - 1], a = lane[Math.max(0, lane.length - 2)];
        let dx = p[0] - a[0], dz = p[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const nx = -dx, nz = -dz, rot = Math.PI / 2 - Math.atan2(nz, nx);
        const pole = new THREE.Mesh(G.tlPole, M.tlBody); pole.position.set(p[0], PW_H, p[1]); pathGroup.add(pole);
        const hd = new THREE.Mesh(G.tlHead, M.tlBody); hd.position.set(p[0], PW_H + 3.0, p[1]); hd.rotation.y = rot; pathGroup.add(hd);
        const lamps = {};
        [['r', 0.3], ['a', 0], ['g', -0.3]].forEach(([c, dy]) => { const lm = new THREE.Mesh(G.tlLamp, M.lampOff); lm.position.set(p[0] + nx * 0.18, PW_H + 3.0 + dy, p[1] + nz * 0.18); lm.rotation.y = rot; pathGroup.add(lm); lamps[c] = lm; });
        if (lightReg) lightReg.push({ n, eid: id, lamps });
      }
    }
    for (const e of GR.edges.values()) {
      const def = PATH_DEF[e.t], hw = def.hw + def.walk;
      for (const sg of [1, -1]) {
        const sp = vecWalkPts(GR, e, 0, sg * (def.hw + def.walk / 2)), kp = vecWalkPts(GR, e, 0, sg * (def.hw + 0.3)), ep = vecWalkPts(GR, e, 0, sg * hw);
        ribbonInto(walk, sp, def.walk / 2, PW_H); wallInto(kerb, kp, 0, Y, PW_H); ribbonInto(kerb, vecWalkPts(GR, e, 0, sg * (def.hw + 0.15)), 0.15, PW_H + 0.005); wallInto(walk, ep, 0, 0, PW_H);
      }
      // doodlopend eind: recht afgesloten, met de stoep er als kap omheen
      for (const n of [e.a, e.b]) if (GR.nodes[n].edges.length === 1) {
        const p = [GR.nodes[n].x, GR.nodes[n].z], q = e.a === n ? e.pts[1] : e.pts[e.pts.length - 2]; let dx = p[0] - q[0], dz = p[1] - q[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const rx = -dz, rz = dx, P = (al, lat) => [p[0] + dx * al + rx * lat, p[1] + dz * al + rz * lat];
        polyInto(walk, [P(0, -hw), P(0, hw), P(def.walk, hw), P(def.walk, -hw)], PW_H);
        polyInto(kerb, [P(-0.3, -(def.hw + 0.3)), P(-0.3, def.hw + 0.3), P(0.15, def.hw + 0.3), P(0.15, -(def.hw + 0.3))], PW_H + 0.005);
        wallSeg(kerb, P(-0.3, -(def.hw + 0.3)), P(-0.3, def.hw + 0.3), Y, PW_H); wallSeg(walk, P(def.walk, -hw), P(def.walk, hw), 0, PW_H);
        wallSeg(walk, P(0, hw), P(def.walk, hw), 0, PW_H); wallSeg(walk, P(0, -hw), P(def.walk, -hw), 0, PW_H);
      }
    }
    [[grass, VM.grass], [walk, VM.walk], [kerb, VM.kerb], [asph, VM.asph], [pave, VM.pave], [dash, VM.dash]].forEach(([L, mat]) => { const m = layerMesh(L, mat); if (m) pathGroup.add(m); });
    return pathGroup;
  }
  const distPoly = (x, z, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, distSeg(x, z, pts[i], pts[i + 1])); return d; };
  function erasePathAt(res) {
    if (!res || !res.point || !cells.paths || !cells.paths.length) return false;
    let best = -1, bd = 1e9;
    cells.paths.forEach((p, i) => { const d = distPoly(res.point.x, res.point.z, smoothPts(p.p)) - PATH_DEF[p.t].hw; if (d < 2 && d < bd) { bd = d; best = i; } });
    if (best < 0) return false;
    cells.paths.splice(best, 1); buildPathNet(); changed(); toast('Weg weggehaald', 900); return true;
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
    const dash = partsBag(); const xPieces = {}; let edgeXSurf = null;
    for (const [k, type] of E) {
      const [q, r, kk] = k.split(',').map(Number), [A, B] = edgeEnds(q, r, kk);
      addArm(A, B, type); addArm(B, A, type);
      if (type === 'weg' || type === 'brd') {   // kruising: ligt aan beide kanten een gewone weg, dan loopt die rechtdoor over de randweg (90°)
        const [q2, r2] = kk < 6 ? [q + NEIGH[kk][0], r + NEIGH[kk][1]] : [q, r], isW = (a, b) => (cells.get(key(a, b)) || []).some(t => baseOf(t) === 'weg' || baseOf(t) === 'laan');
        if (kk < 6 && isW(q, r) && isW(q2, r2)) {
          const th0 = Math.atan2(B[1] - A[1], B[0] - A[0]), mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2, LIFT = 0.2;
          const xPiece = xPieces[type] || (xPieces[type] = roadGeoW(type, [0, 1, 2, 3].map(i => ({ th: i * Math.PI / 2 })), EDGE_L));
          const put = (g, mat, cast) => { const m = new THREE.Mesh(g, mat); m.position.set(mx, LIFT, mz); m.rotation.y = -th0; m.receiveShadow = true; m.castShadow = !!cast; edgeGroup.add(m); };
          if (xPiece.asph) put(xPiece.asph, [M.asphalt, M.asphaltSide]);
          xPiece.walk.forEach(g => put(g, [M.walkTop, M.kerb], true));
          // zebrapaden op alle vier de armen
          const cw = partsBag(), cs = Math.cos(th0), sn = Math.sin(th0);
          for (let arm = 0; arm < 4; arm++) {
            const ph = arm * Math.PI / 2;
            for (let i = -(type === 'brd' ? 4 : 2); i <= (type === 'brd' ? 4 : 2); i++) {
              const g = new THREE.BoxGeometry(0.5, 0.012, 0.9);
              g.rotateY(-ph); g.translate(Math.cos(ph) * 3.3 + Math.cos(ph + Math.PI / 2) * i * 0.8, 0, Math.sin(ph) * 3.3 + Math.sin(ph + Math.PI / 2) * i * 0.8);
              g.rotateY(-th0); g.translate(mx, LIFT + ASPH_H + 0.008, mz);
              cw.put(M.dash, g);
            }
          }
          cw.flush(edgeGroup);
          if (xPiece.asphPoly) {
            const pts = xPiece.asphPoly.map(p => [mx + p[0] * cs - p[1] * sn, mz + p[0] * sn + p[1] * cs]);
            (edgeXSurf = edgeXSurf || []).push({ kind: 'poly', cx: mx, cz: mz, pts, top: LIFT + ASPH_H, bottom: 0 });
          }
        }
      }
      if ((type === 'weg' || type === 'brd') && kk < 6) {   // één streepje op de helft van elke zijde
        const th = Math.atan2(B[1] - A[1], B[0] - A[0]), g = new THREE.BoxGeometry(1.5, 0.01, 0.12);
        g.rotateY(-th); g.translate((A[0] + B[0]) / 2, EDGE_LIFT + ASPH_H + 0.006, (A[1] + B[1]) / 2);
        dash.put(M.dash, g);
      }
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
    (edgeXSurf || []).forEach(sf => reg({ x: sf.cx, z: sf.cz }, sf));
    const emit = (v, type, arms) => {
        const pk = type + ':' + arms.map(a => Math.round(a.th * 180 / Math.PI)).join(',');
        let piece = edgePieceCache.get(pk);
        if (!piece) {
          if (type !== 'pad') piece = roadGeoW(type, arms.map(a => ({ th: a.th })), EDGE_L);
          else {
            const poly = stripPolyArms(arms.map(a => ({ th: a.th, len: EDGE_L })), PATH_HALF, 1.7);
            piece = { padPoly: poly, pad: extrudePoly(poly, PAD_H_EDGE) };
          }
          edgePieceCache.set(pk, piece);
        }
        const place = m => { m.position.set(v.x, EDGE_LIFT, v.z); m.receiveShadow = true; edgeGroup.add(m); return m; };
        if (type !== 'pad') {
          if (piece.asph) { place(new THREE.Mesh(piece.asph, [M.asphalt, M.asphaltSide])); reg(v, { kind: 'poly', cx: v.x, cz: v.z, pts: piece.asphPoly, top: EDGE_LIFT + ASPH_H, bottom: EDGE_LIFT }); }
          piece.walk.forEach((g, n) => { const m = place(new THREE.Mesh(g, [M.walkTop, M.kerb])); m.castShadow = true; reg(v, { kind: 'poly', cx: v.x, cz: v.z, pts: piece.walkPolys[n], top: EDGE_LIFT + WALK_H, bottom: EDGE_LIFT }); });
        } else {
          const m = place(new THREE.Mesh(piece.pad, [M.paver, M.kerb])); m.castShadow = true;
          reg(v, { kind: 'poly', cx: v.x, cz: v.z, pts: piece.padPoly, top: EDGE_LIFT + PAD_H_EDGE, bottom: EDGE_LIFT });
        }
    };
    for (const v of V.values()) {
      for (const type of ['weg', 'brd', 'pad']) {
        const arms = v.arms.filter(a => a.type === type).sort((a, b) => a.th - b.th);
        if (arms.length) emit(v, type, arms);
      }
    }
    // rechtdoor door een vak: het middenstuk tussen de twee hoekpunt-stukken
    for (const [k, type] of E) {
      const [q, r, kk] = k.split(',').map(Number); if (kk < 6) continue;
      const [A, B] = edgeEnds(q, r, kk), th0 = Math.atan2(B[1] - A[1], B[0] - A[0]), c = cellToWorld(q, r);
      emit({ x: c.x, z: c.z }, type, [{ th: th0 }, { th: th0 + Math.PI }].sort((a, b) => a.th - b.th));
    }
    dash.flush(edgeGroup);
  }
  function placeEdgeAt(res, quiet) {
    if (!res || !res.point) return false;
    const ne = nearestEdge(res.point.x, res.point.z), type = EDGE_TYPE[tool], E = edgesOf();
    const why = edgeBlocked(ne.q, ne.r, ne.k);
    if (why) { if (!quiet) toast(why); return false; }
    if (E.get(ne.key) === type) { if (!quiet) toast('Hier ligt al ' + (type === 'weg' ? 'een randweg' : type === 'brd' ? 'een brede weg' : 'een randpad') + ' · gum haalt hem weg', 1600); return false; }
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


