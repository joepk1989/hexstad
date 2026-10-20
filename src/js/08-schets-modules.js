  // ---------- Schets en modules: teken vrij op het zeshoekraster; de lijnen klikken vast op randen en doorgangen ----------
  const MODS_KEY = 'hexstad-modules';
  let modules = [];
  try { modules = (JSON.parse(localStorage.getItem(MODS_KEY) || '[]') || []).filter(m => m && Array.isArray(m.edges)); } catch (e) { modules = []; }
  const uid = () => Math.random().toString(36).slice(2, 10);
  const ensureIds = () => modules.forEach(m => { if (!m.id) m.id = uid(); });
  ensureIds();
  // Startmodules: wegen uit echte wegvakken, dus met dezelfde gladde bochten, markering en verkeer als de rest van het spel
  try {
    if (!localStorage.getItem('hexstad-seed-wegen2')) {
      const NB = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]], at = (k, d = 1) => [NB[k][0] * d, NB[k][1] * d];
      const mk = (name, list) => ({ name, n: 2, k: 1, edges: [], cells: [...new Set(list.map(c => c.join(',')))], paths: [], tris: [] });
      const arm = (k, len) => Array.from({ length: len }, (_, i) => at(k, i + 1));
      const mods = [
        mk('Weg recht', [[0, 0], ...arm(0, 1), ...arm(3, 1)]),
        mk('Bocht', [[0, 0], ...arm(0, 1), ...arm(1, 1)]),
        mk('T-splitsing', [[0, 0], ...arm(0, 1), ...arm(3, 1), ...arm(1, 1)]),
        mk('Y-splitsing', [[0, 0], ...arm(0, 1), ...arm(2, 1), ...arm(4, 1)]),
        mk('Kruispunt', [[0, 0], ...arm(0, 1), ...arm(3, 1), ...arm(1, 1), ...arm(4, 1)]),
        mk('Rotonde', [0, 1, 2, 3, 4, 5].flatMap(k => [at(k), at(k, 2)])),
        mk('Lange weg', [[0, 0], ...arm(0, 3), ...arm(3, 3)]),
      ];
      const old = new Set(mods.map(m => m.name));
      modules = modules.filter(m => !(old.has(m.name) && m.n === 8 && !(m.cells || []).length));
      mods.forEach(m => { if (!modules.some(x => x.name === m.name)) modules.push(m); });
      ensureIds(); localStorage.setItem(MODS_KEY, JSON.stringify(modules)); localStorage.setItem('hexstad-seed-wegen2', '1');
    }
    if (!localStorage.getItem('hexstad-seed-tegel2')) {   // schuine wegtegel: asfalt met stoep aan beide kanten, langs de rasterlijnen
      { const oi = modules.findIndex(x => x.name === 'Weg schuin'); if (oi >= 0) modules.splice(oi, 1); }
      {
        const n = 4, t = R / n, SQ = Math.sqrt(3) / 2, tris = [], ux = Math.cos(Math.PI / 6), uz = Math.sin(Math.PI / 6), pv = (i, j) => [i * t * SQ, i * t / 2 + j * t];
        for (let i = -12; i <= 12; i++) for (let j = -20; j <= 20; j++) for (const t01 of [0, 1]) {
          const A = pv(i, j), B = pv(i + 1, j), C = pv(i, j + 1), D = pv(i + 1, j + 1), V = t01 ? [B, D, C] : [A, B, C], x = (V[0][0] + V[1][0] + V[2][0]) / 3, z = (V[0][1] + V[1][1] + V[2][1]) / 3;
          if (!(Math.abs(x) <= R * Math.sqrt(3) / 2)) continue;   // strook tussen twee verticale rasterlijnen: sluit naadloos aan op de volgende tegel
          const d = Math.abs(-x * uz + z * ux); if (d < 3.9) tris.push([i, j, t01, 'weg']); else if (d < 5.85) tris.push([i, j, t01, 'vloer']);
        }
        modules.push({ name: 'Weg schuin', n, k: 0, edges: [], cells: [], paths: [], tris });
      }
      ensureIds(); localStorage.setItem(MODS_KEY, JSON.stringify(modules)); localStorage.setItem('hexstad-seed-tegel2', '1');
    }
    if (!localStorage.getItem('hexstad-seed-lijn2')) {   // lijnmodules: sleep ze van vak naar vak
      [['Weg breed', 'brd', 0], ['Weg', 'weg', 0], ['Pad', 'pad', 0], ['Weg breed + groen', 'brd', 4], ['Weg + groen', 'weg', 4]].forEach(([nm, t, g]) => { if (!modules.some(x => x.name === nm)) modules.push({ name: nm, n: 2, k: 1, edges: [], cells: [], tris: [], paths: [{ t, l: 0, r: g, p: [[-7.8, 0], [7.8, 0]] }] }); });
      ensureIds(); localStorage.setItem(MODS_KEY, JSON.stringify(modules)); localStorage.setItem('hexstad-seed-lijn2', '1');
    }
  } catch (e) { /* geen opslag */ }
  const saveMods = () => { ensureIds(); try { localStorage.setItem(MODS_KEY, JSON.stringify(modules)); } catch (e) { /* geen opslag */ } };
  let moduleSel = null, moduleRot = 0;
  function rotKey(id, n) {   // draai een rand of doorgang n x 60° (tegen de klok in) rond vak 0,0
    let [q, r, k] = id.split(',').map(Number);
    for (let i = 0; i < n; i++) { [q, r] = [q + r, -q]; k = k >= 6 ? 6 + ((k - 5) % 3) : (k + 1) % 6; }
    return k >= 6 ? [q, r, k] : edgeCanon(q, r, k);
  }
  function moduleCells(mod, rot, q0, r0) { return (mod.cells || []).map(id => { let [q, r] = id.split(',').map(Number); for (let i = 0; i < rot; i++) [q, r] = [q + r, -q]; return [q + q0, r + r0]; }); }
  function modulePaths(mod, rot, q0, r0) {
    const th = -rot * Math.PI / 3, c = Math.cos(th), sn = Math.sin(th), o = cellToWorld(q0, r0);
    return (mod.paths || []).map(p => ({ t: p.t, l: p.l || 0, r: p.r || 0, p: p.p.map(a => [o.x + a[0] * c - a[1] * sn, o.z + a[0] * sn + a[1] * c]) }));
  }
  function moduleItems(mod, rot, q0, r0) { return mod.edges.map(([id, type]) => { const [q, r, k] = rotKey(id, rot); return [q + q0, r + r0, k, type]; }); }
  function placeCore(mod, rot, q0, r0) {   // zet de onderdelen van een module neer; geeft aantal en overgeslagen stukken
    const E = edgesOf(); let n = 0, skip = 0;
    for (const [q, r, k, type] of moduleItems(mod, rot, q0, r0)) {
      if (edgeBlocked(q, r, k)) { skip++; continue; }
      E.set(q + ',' + r + ',' + k, type); n++;
    }
    for (const [q, r] of moduleCells(mod, rot, q0, r0)) {
      const st = stackOf(q, r); if (st.length) { if (baseOf(st[0]) !== 'weg') skip++; continue; }
      cells.set(key(q, r), ['weg']); n++; rebuildAround(q, r);
    }
    const nt = triWorld(mod, rot, q0, r0); if (nt.length) { trisOf().push(...nt); n += nt.length; }
    const np = modulePaths(mod, rot, q0, r0); if (np.length) { pathsOf().push(...np); n += np.length; }
    return { n, skip };
  }
  // Fijn plaatsingsraster: een module zonder vakken of randen kan ook op het midden van een rand (tussen twee tegels) of op een hoekpunt staan
  const fineOK = m => !!m && !(m.cells || []).length && !(m.edges || []).length && (m.fine !== undefined ? !!m.fine : ((m.tris || []).some(t => t[3] === 'weg') || (m.paths || []).length > 0));
  function modAnchor(mod, pt, place) {
    if (!pt || !fineOK(mod)) return place;
    const c0 = worldToCell(pt.x, pt.z), cand = [];
    const cs = [[c0[0], c0[1]], ...NEIGH.map(n => [c0[0] + n[0], c0[1] + n[1]])];
    for (const [q, r] of cs) {
      cand.push([q, r]);
      for (let k = 0; k < 6; k++) { const a = NEIGH[k], b = NEIGH[(k + 1) % 6]; cand.push([q + a[0] / 2, r + a[1] / 2], [q + (a[0] + b[0]) / 3, r + (a[1] + b[1]) / 3]); }
    }
    let best = place, bd = 1e9;
    for (const a of cand) { const w = cellToWorld(a[0], a[1]), d = Math.hypot(w.x - pt.x, w.z - pt.z); if (d < bd - 1e-6) { bd = d; best = a; } }
    return best;
  }
  const anchorOf = res => res && res.place ? modAnchor(modules[moduleSel], res.point, res.place) : null;
  function placeModule(q0, r0) {
    const mod = modules[moduleSel]; if (!mod) { openSchets(); return false; }
    ensureIds();
    const { n, skip } = placeCore(mod, moduleRot, q0, r0);
    if (n) (cells.inst || (cells.inst = [])).push({ mid: mod.id, m: JSON.parse(JSON.stringify(mod)), q: q0, r: r0, rot: moduleRot });
    buildTriNet(); buildPathNet(); buildEdgeNet(); changed();
    toast(n ? '"' + mod.name + '" geplaatst' + (skip ? ' · ' + skip + ' stukken overgeslagen (water of bebouwing)' : '') : 'Hier past de module niet', 2200);
    return n > 0;
  }
  // Stad en schets gelijk houden: een bewerkte module past alle geplaatste exemplaren aan, een verwijderde module haalt ze weg
  const instOf = mod => (cells.inst || []).filter(I => I.mid ? I.mid === mod.id : I.m.name === mod.name);
  function syncModule(mod) {
    const L = instOf(mod); if (!L.length) return 0;
    for (const I of L.filter(x => !x.tw)) { removeInst(I); const r = placeCore(mod, I.rot, I.q, I.r); I.m = JSON.parse(JSON.stringify(mod)); I.mid = mod.id; if (!r.n) cells.inst.splice(cells.inst.indexOf(I), 1); }
    buildTriNet(); buildPathNet(); buildEdgeNet(); changed(); return L.length;
  }
  function dropModule(mod) {
    const L = instOf(mod); if (!L.length) return 0;
    for (const I of L) { removeInst(I); cells.inst.splice(cells.inst.indexOf(I), 1); }
    buildTriNet(); buildPathNet(); buildEdgeNet(); changed(); return L.length;
  }
  // Rechtermuisknop: haal een geplaatste module in zijn geheel weg
  function instPts(I) {
    const P = [], m = I.m;
    if (I.tw) { for (const t of I.tw) P.push(cenOf(t)); return P; }
    for (const [q, r, k] of moduleItems(m, I.rot, I.q, I.r)) { const [A, B] = edgeEnds(q, r, k); P.push([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]); }
    for (const [q, r] of moduleCells(m, I.rot, I.q, I.r)) { const w = cellToWorld(q, r); P.push([w.x, w.z]); }
    for (const t of triWorld(m, I.rot, I.q, I.r)) P.push([(t.v[0] + t.v[2] + t.v[4]) / 3, (t.v[1] + t.v[3] + t.v[5]) / 3]);
    for (const pa of modulePaths(m, I.rot, I.q, I.r)) for (const a of pa.p) P.push(a);
    return P;
  }
  function removeInst(I) {
    if (I.tw) { const sg = t => t.v.map(a => Math.round(a * 100)).join(','), ss = new Set(I.tw.map(sg)); if (cells.tris) cells.tris = cells.tris.filter(t => !ss.has(sg(t))); return; }
    const m = I.m, E = edgesOf();
    for (const [q, r, k, type] of moduleItems(m, I.rot, I.q, I.r)) { const kk = q + ',' + r + ',' + k; if (E.get(kk) === type) E.delete(kk); }
    for (const [q, r] of moduleCells(m, I.rot, I.q, I.r)) { const st = cells.get(key(q, r)); if (st && st.length === 1 && st[0] === 'weg') { cells.delete(key(q, r)); rebuildAround(q, r); } }
    const sig = t => t.v.map(a => Math.round(a * 100)).join(',');
    const ts = new Set(triWorld(m, I.rot, I.q, I.r).map(sig));
    if (ts.size && cells.tris) cells.tris = cells.tris.filter(t => !ts.has(sig(t)));
    const ps = modulePaths(m, I.rot, I.q, I.r);
    if (ps.length && cells.paths) cells.paths = cells.paths.filter(p => !ps.some(a => a.t === p.t && a.p.length === p.p.length && Math.hypot(a.p[0][0] - p.p[0][0], a.p[0][1] - p.p[0][1]) < 0.05));
  }
  function eraseModuleAt(res) {
    if (!res || !res.point || !cells.inst || !cells.inst.length) return false;
    const x = res.point.x, z = res.point.z; let best = -1, bd = 7;
    cells.inst.forEach((I, i) => { let d = 1e9; for (const a of instPts(I)) d = Math.min(d, Math.hypot(a[0] - x, a[1] - z)); if (d <= bd) { bd = d; best = i; } });
    if (best < 0) return false;
    const I = cells.inst.splice(best, 1)[0], m = I.m; removeInst(I);
    buildTriNet(); buildPathNet(); buildEdgeNet(); changed(); toast('"' + m.name + '" weggehaald', 1200); return true;
  }
  const moduleGhost = new THREE.Group(); scene.add(moduleGhost); let moduleGhostKey = '';
  function showModuleGhost(q0, r0) {
    const mod = modules[moduleSel], kk = mod ? moduleSel + ':' + moduleRot + ':' + q0 + ',' + r0 + ':' + mod.edges.length + ':' + (mod.cells || []).length + ':' + (mod.paths || []).length + ':' + (mod.tris || []).length : '';
    if (kk === moduleGhostKey) { moduleGhost.visible = !!mod; return; }
    moduleGhostKey = kk;
    while (moduleGhost.children.length) { const c = moduleGhost.children.pop(); c.geometry.dispose(); }
    if (!mod) { moduleGhost.visible = false; return; }
    for (const [q, r, k, type] of moduleItems(mod, moduleRot, q0, r0)) {
      const [A, B] = edgeEnds(q, r, k), bad = !!edgeBlocked(q, r, k);
      const m = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(B[0] - A[0], B[1] - A[1]), 0.3, type === 'brd' ? 13 : type === 'pad' ? 3 : 9), new THREE.MeshBasicMaterial({ color: bad ? '#e0573e' : '#f2b233', transparent: true, opacity: 0.5, depthWrite: false }));
      m.position.set((A[0] + B[0]) / 2, 0.25, (A[1] + B[1]) / 2); m.rotation.y = -Math.atan2(B[1] - A[1], B[0] - A[0]);
      moduleGhost.add(m);
    }
    for (const [q, r] of moduleCells(mod, moduleRot, q0, r0)) {
      const w = cellToWorld(q, r), bad = stackOf(q, r).length && baseOf(stackOf(q, r)[0]) !== 'weg';
      const m = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 9), new THREE.MeshBasicMaterial({ color: bad ? '#e0573e' : '#f2b233', transparent: true, opacity: 0.45, depthWrite: false }));
      m.position.set(w.x, 0.25, w.z); moduleGhost.add(m);
    }
    const tw = triWorld(mod, moduleRot, q0, r0);
    if (tw.length) {
      const pos = []; for (const t of tw) pos.push(t.v[0], 0.5, t.v[1], t.v[4], 0.5, t.v[5], t.v[2], 0.5, t.v[3]);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: '#f2b233', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 6; moduleGhost.add(m);
    }
    for (const p of modulePaths(mod, moduleRot, q0, r0)) {
      const sm = smoothPts(p.p), g = new THREE.BufferGeometry().setFromPoints(sm.map(a => new THREE.Vector3(a[0], 0.45, a[1])));
      const ln = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#f2b233', depthTest: false })); ln.renderOrder = 6; moduleGhost.add(ln);
    }
    moduleGhost.visible = true;
  }

  const skEl = document.getElementById('sketch'), skCv = document.getElementById('skCv'), skCtx = skCv.getContext('2d');
  const SK = { type: 't:muur', brush: 'hex', tris: new Map(), edges: new Map(), cells: new Set(), paths: [], undo: [], cur: null, editing: -1, W: 0, H: 0, scale: 1 };
  const SK_COL = { weg: '#3d4146', brd: '#1f2326', pad: '#b8663f' }, SK_W = { weg: 7, brd: 11, pad: 3 };
  const skToScr = (x, z) => [SK.W / 2 + x * SK.scale, SK.H / 2 + z * SK.scale];
  const skToWorld = (sx, sy) => [(sx - SK.W / 2) / SK.scale, (sy - SK.H / 2) / SK.scale];
  function skDraw() {
    const c = skCtx; c.clearRect(0, 0, SK.W, SK.H);
    const hx = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
    c.lineWidth = 1; c.strokeStyle = '#a9b99a'; c.fillStyle = '#e6edda';
    for (let q = -9; q <= 9; q++) for (let r = -9; r <= 9; r++) {
      if (hx(q, r) > 9) continue;
      const w = cellToWorld(q, r); c.beginPath();
      for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, [sx, sy] = skToScr(w.x + Math.cos(a) * R, w.z + Math.sin(a) * R); i ? c.lineTo(sx, sy) : c.moveTo(sx, sy); }
      c.closePath(); if (q === 0 && r === 0) { c.fillStyle = '#d6e2c4'; c.fill(); c.fillStyle = '#e6edda'; } c.stroke();
    }
    const TC = { muur: '#5a5a5a', weg: '#3c4045', pad: '#9b5a45', vloer: '#cfc6b0', gras: '#8fc06b', water: '#4a8fc0' };
    for (const [id, k] of SK.tris) { const [i, j, t] = id.split(',').map(Number); c.fillStyle = TC[k] || '#888'; c.beginPath(); triVerts(i, j, t).forEach((p, n) => { const q = skToScr(p[0], p[1]); n ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); c.fill(); }
    c.strokeStyle = 'rgba(60,70,50,0.35)'; c.lineWidth = 1;
    { const ext = Math.ceil(Math.max(SK.W, SK.H) / SK.scale / TS) + 4; c.beginPath();
      for (let i = -ext; i <= ext; i++) for (let j = -ext * 2; j <= ext; j++) for (const t of [0, 1]) { const v = triVerts(i, j, t), p = skToScr(v[0][0], v[0][1]); if (p[0] < -40 || p[0] > SK.W + 40 || p[1] < -40 || p[1] > SK.H + 40) continue; v.forEach((pp, n) => { const q = skToScr(pp[0], pp[1]); n ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath(); }
      c.stroke(); }
    c.strokeStyle = 'rgba(40,60,30,0.35)'; c.lineWidth = 1.4;
    for (let q = -4; q <= 4; q++) for (let r = -4; r <= 4; r++) { if (Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r)) > 4) continue; const w = cellToWorld(q, r); c.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3, [sx, sy] = skToScr(w.x + Math.cos(a) * R, w.z + Math.sin(a) * R); i ? c.lineTo(sx, sy) : c.moveTo(sx, sy); } c.closePath(); c.stroke(); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (const layer of [0, 1, 2, 3]) for (const path of SK.paths) {
      const def = PATH_DEF[path.t], sm = smoothPts(path.p);
      const [col, w] = layer === 0 ? [path.t === 'pad' ? '#9b988e' : '#cbc8bd', 2 * (def.hw + (path.t === 'pad' ? 0.3 : def.walk))] : layer === 1 ? ['#9b988e', 2 * def.hw + 0.6] : layer === 2 ? [path.t === 'pad' ? '#9b5a45' : '#3c4045', 2 * def.hw] : [path.t === 'pad' ? null : '#f1efe6', 0.25];
      if (!col || (layer === 1 && path.t === 'pad') ) continue;
      c.strokeStyle = col; c.lineWidth = w * SK.scale; if (layer === 3) c.setLineDash([3 * SK.scale, 3.5 * SK.scale]);
      c.beginPath(); sm.forEach((p, i) => { const q = skToScr(p[0], p[1]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); c.setLineDash([]);
    }
    c.strokeStyle = '#4b5056'; c.lineWidth = 7 * SK.scale; c.fillStyle = '#4b5056';
    for (const id of SK.cells) {
      const [q, r] = id.split(',').map(Number), w = cellToWorld(q, r), p = skToScr(w.x, w.z);
      c.beginPath(); c.arc(p[0], p[1], 3.5 * SK.scale, 0, 7); c.fill();
      for (let k = 0; k < 3; k++) { if (!SK.cells.has(key(q + NEIGH[k][0], r + NEIGH[k][1]))) continue; const w2 = cellToWorld(q + NEIGH[k][0], r + NEIGH[k][1]), p2 = skToScr(w2.x, w2.z); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p2[0], p2[1]); c.stroke(); }
    }
    for (const t of ['pad', 'weg', 'brd']) {
      c.strokeStyle = SK_COL[t]; c.lineWidth = SK_W[t] * SK.scale;
      for (const [id, type] of SK.edges) {
        if (type !== t) continue;
        const [q, r, k] = id.split(',').map(Number), [A, B] = edgeEnds(q, r, k), p = skToScr(A[0], A[1]), p2 = skToScr(B[0], B[1]);
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p2[0], p2[1]); c.stroke();
      }
    }
    if (SK.hover && (SK.type.startsWith('t:') || SK.type === 'gum')) {
      const [x, z] = skToWorld(SK.hover[0], SK.hover[1]), list = SK.brush === 'hex' ? triAround(...triVertexAt(x, z)) : [triAt(x, z)];
      const col = SK.type === 'gum' ? '#e0573e' : TC[SK.type.slice(2)];
      for (const [i, j, t] of list) {
        c.beginPath(); triVerts(i, j, t).forEach((p, n) => { const q = skToScr(p[0], p[1]); n ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.closePath();
        c.globalAlpha = 0.85; c.fillStyle = col; c.fill(); c.globalAlpha = 1; c.strokeStyle = '#f2b233'; c.lineWidth = 2.5; c.stroke();
      }
    }
    if (SK.cur && SK.cur.length > 1) {
      c.strokeStyle = SK.type === 'gum' ? '#e0573e' : '#f2b233'; c.lineWidth = 3; c.beginPath();
      SK.cur.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    }
  }
  function skResize() {
    const dpr = Math.min(2, devicePixelRatio || 1), b = skCv.getBoundingClientRect();
    SK.W = b.width; SK.H = b.height; skCv.width = b.width * dpr; skCv.height = b.height * dpr; skCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    SK.scale = Math.min(SK.W, SK.H) / 150; skDraw();
  }
  function skCommit() {   // de vrije lijn vastklikken op randen en doorgangen
    const pts = SK.cur.map(p => skToWorld(p[0], p[1])); SK.cur = null;
    if (!pts.length) return;
    SK.undo.push({ e: new Map(SK.edges), c: new Set(SK.cells), v: SK.paths.slice(), t: new Map(SK.tris) });
    if (SK.type[0] === 'v') {
      const w = rdp(pts, 1.2); if (w.length < 2 || Math.hypot(w[w.length - 1][0] - w[0][0], w[w.length - 1][1] - w[0][1]) < 3 && w.length < 3) { SK.undo.pop(); return; }
      SK.paths.push({ t: SK.type.slice(1), p: w.map(a => [Math.round(a[0] * 10) / 10, Math.round(a[1] * 10) / 10]) }); return;
    }
    const keys = [], seen = new Set();
    const addPt = p => {
      if (SK.type === 'cel' || false) { const [q, r] = worldToCell(p[0], p[1]), id = key(q, r); if (!seen.has(id)) { seen.add(id); keys.push(id); } return; }
      const ne = nearestEdge(p[0], p[1]); if (!seen.has(ne.key)) { seen.add(ne.key); keys.push(ne.key); }
    };
    addPt(pts[0]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
      for (let j = 1; j <= n; j++) addPt([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    if (SK.type === 'cel') keys.forEach(id => SK.cells.add(id));
    else if (SK.type === 'gum') {
      // gum haalt een tegel weg als je erop begint, anders de randen
      const [q0, r0] = worldToCell(pts[0][0], pts[0][1]);
      for (const p of pts) { const [q, r] = worldToCell(p[0], p[1]); SK.cells.delete(key(q, r)); }
      for (const id of keys) SK.edges.delete(id);
      SK.paths = SK.paths.filter(pa => { const sm = smoothPts(pa.p); return !pts.some(q => distPoly(q[0], q[1], sm) < PATH_DEF[pa.t].hw); });
    } else for (const id of keys) SK.edges.set(id, SK.type);
  }
  // Voorbeeldkaartjes van alle modules: zichtbaar zolang het modulegereedschap actief is; het gekozen kaartje draait mee
  const MOD_COL = { dak: '#8f3f33', glas: '#9fc7de', muur: '#8a8a8a', weg: '#3c4045', pad: '#9b5a45', vloer: '#cfc6b0', gras: '#6fa356', water: '#3a7ca5' };
  function modThumb(mod, rot, px) {
    const c = document.createElement('canvas'); c.width = c.height = px * 2; const g = c.getContext('2d');
    g.fillStyle = '#c8dca4'; g.fillRect(0, 0, c.width, c.height);
    const tris = triWorld(mod, rot, 0, 0), th = -rot * Math.PI / 3, co = Math.cos(th), si = Math.sin(th), rt = p => [p[0] * co - p[1] * si, p[0] * si + p[1] * co];
    const lines = [];
    for (const [id, type] of mod.edges || []) { const [q, r, k] = id.split(',').map(Number), [A, B] = edgeEnds(q, r, k); lines.push({ p: [rt(A), rt(B)], w: type === 'brd' ? 11 : type === 'pad' ? 2.5 : 7, c: type === 'pad' ? '#9b5a45' : '#3c4045' }); }
    for (const p of mod.paths || []) lines.push({ p: smoothPts(p.p).map(rt), w: p.t === 'brd' ? 11 : p.t === 'pad' ? 2.5 : 7, c: p.t === 'pad' ? '#9b5a45' : '#3c4045' });
    const dots = (mod.cells || []).map(id => { const [q, r] = id.split(',').map(Number), w = cellToWorld(q, r); return rt([w.x, w.z]); });
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; const ext = (x, z) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); };
    tris.forEach(t => { ext(t.v[0], t.v[1]); ext(t.v[2], t.v[3]); ext(t.v[4], t.v[5]); }); lines.forEach(l => l.p.forEach(p => ext(p[0], p[1]))); dots.forEach(p => ext(p[0], p[1]));
    if (x0 > x1) { x0 = -R; x1 = R; z0 = -R; z1 = R; }
    const span = Math.max(x1 - x0, z1 - z0, R) * 1.15, sc = c.width / span, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, X = x => c.width / 2 + (x - cx) * sc, Z = z => c.height / 2 + (z - cz) * sc;
    for (const l of lines) { g.strokeStyle = l.c; g.lineWidth = l.w * sc; g.lineCap = 'round'; g.beginPath(); l.p.forEach((p, i) => i ? g.lineTo(X(p[0]), Z(p[1])) : g.moveTo(X(p[0]), Z(p[1]))); g.stroke(); }
    g.fillStyle = '#3c4045'; for (const p of dots) g.fillRect(X(p[0]) - 4.5 * sc, Z(p[1]) - 4.5 * sc, 9 * sc, 9 * sc);
    for (const t of tris) { g.fillStyle = MOD_COL[t.k] || '#888'; g.beginPath(); g.moveTo(X(t.v[0]), Z(t.v[1])); g.lineTo(X(t.v[2]), Z(t.v[3])); g.lineTo(X(t.v[4]), Z(t.v[5])); g.closePath(); g.fill(); g.strokeStyle = MOD_COL[t.k] || '#888'; g.lineWidth = 0.6; g.stroke(); }
    return c;
  }
  const modStrip = document.getElementById('modStrip');
  function renderStrip() {
    if (typeof renderModCards === 'function' && typeof catIdx !== 'undefined') { try { renderModCards(); } catch (e) { /* palet bestaat nog niet */ } }
    return;
    modStrip.innerHTML = '';
    modules.forEach((m, i) => {
      const d = document.createElement('div'); d.className = 'mc'; d.setAttribute('aria-pressed', String(i === moduleSel)); d.title = m.name;
      d.appendChild(modThumb(m, i === moduleSel ? moduleRot : 0, 92)); const sp = document.createElement('span'); sp.textContent = m.name; d.appendChild(sp);
      d.onclick = () => { moduleSel = i; moduleGhostKey = ''; renderStrip(); if (mode === 'build') updateGhost(); };
      modStrip.appendChild(d);
    });
    if (!modules.length) { const d = document.createElement('div'); d.className = 'mc'; d.textContent = 'Nog geen modules. Open Menu → Modules.'; modStrip.appendChild(d); }
  }
  function skList() {
    const el = document.getElementById('skList');
    el.innerHTML = modules.length ? '' : '<span>Nog geen modules · teken iets en bewaar het</span>';
    modules.forEach((m, i) => {
      const d = document.createElement('div'); d.className = 'it'; d.innerHTML = '<span></span><button data-m="use">Plaats</button><button data-m="del">×</button>';
      d.firstChild.textContent = m.name + ' (' + (m.edges.length + (m.cells || []).length + (m.paths || []).length + (m.tris || []).length) + ')';
      d.onclick = e => {
        const a = e.target.dataset.m; if (!a) return;
        if (a === 'use') { moduleSel = i; moduleRot = 0; moduleGhostKey = ''; closeSketch(); selectTool('module'); renderStrip(); toast('Tik op de grond om "' + m.name + '" te plaatsen · R draait', 3200); }
        if (a === 'edit') { SK.edges = new Map(m.edges); SK.cells = new Set(m.cells || []); SK.paths = (m.paths || []).map(p => ({ t: p.t, p: p.p })); SK.tris = new Map((m.tris || []).map(([i, j, t, k]) => [i + ',' + j + ',' + t, k])); SK.undo = []; SK.editing = i; document.getElementById('skName').value = m.name; skDraw(); }
        if (a === 'del') { modules.splice(i, 1); if (moduleSel === i) moduleSel = null; else if (moduleSel > i) moduleSel--; saveMods(); skList(); }
      };
      el.appendChild(d);
    });
    renderStrip();
  }
  function openSketch() { skEl.hidden = false; skList(); requestAnimationFrame(skResize); }
  function closeSketch() { skEl.hidden = true; }
  addEventListener('resize', () => { if (!skEl.hidden) skResize(); });
  let skPaint = false, skLast = null;
  function skPaintAt(sx, sy) {
    const [x, z] = skToWorld(sx, sy), erase = SK.type === 'gum';
    const list = SK.brush === 'hex' ? triAround(...triVertexAt(x, z)) : [triAt(x, z)];
    for (const [i, j, t] of list) { const id = i + ',' + j + ',' + t; erase ? SK.tris.delete(id) : SK.tris.set(id, SK.type.slice(2)); }
  }
  skCv.addEventListener('pointerdown', e => {
    skCv.setPointerCapture(e.pointerId); const b = skCv.getBoundingClientRect(), p = [e.clientX - b.left, e.clientY - b.top];
    if (SK.type.startsWith('t:') || SK.type === 'gum') {
      skPaint = true; SK.undo.push({ e: new Map(SK.edges), c: new Set(SK.cells), v: SK.paths.slice(), t: new Map(SK.tris) });
      if (SK.type === 'gum') { const [x, z] = skToWorld(p[0], p[1]); SK.paths = SK.paths.filter(pa => distPoly(x, z, smoothPts(pa.p)) > PATH_DEF[pa.t].hw); }
      skPaintAt(p[0], p[1]); skLast = p; skDraw(); return;
    }
    SK.cur = [p]; skDraw();
  });
  skCv.addEventListener('pointermove', e => {
    const b = skCv.getBoundingClientRect(), p = [e.clientX - b.left, e.clientY - b.top];
    SK.hover = p;
    if (skPaint) { const n = Math.max(1, Math.ceil(Math.hypot(p[0] - skLast[0], p[1] - skLast[1]) / 6)); for (let i = 1; i <= n; i++) skPaintAt(skLast[0] + (p[0] - skLast[0]) * i / n, skLast[1] + (p[1] - skLast[1]) * i / n); skLast = p; skDraw(); return; }
    if (!SK.cur) { skDraw(); return; } SK.cur.push(p); skDraw();
  });
  skCv.addEventListener('pointerleave', () => { SK.hover = null; skDraw(); });
  const skUp = () => { skPaint = false; if (SK.cur) { skCommit(); skDraw(); } };
  skCv.addEventListener('pointerup', skUp); skCv.addEventListener('pointercancel', skUp);
  function importCode() {
    try {
      const raw = JSON.parse(document.getElementById('skCode').value), list = Array.isArray(raw) ? raw : [raw]; let n = 0;
      for (const m of list) if (m && Array.isArray(m.tris)) {
        modules.push({ name: String(m.name || 'Module').slice(0, 30), fine: m.fine === undefined ? undefined : (m.fine ? 1 : 0), n: [1, 2, 4, 8].includes(m.n) ? m.n : 2, edges: Array.isArray(m.edges) ? m.edges : [], cells: Array.isArray(m.cells) ? m.cells : [], paths: Array.isArray(m.paths) ? m.paths : [],
          tris: m.tris.filter(t => Array.isArray(t) && (t.length === 4 || t.length === 5) && t.slice(0, 3).every(Number.isFinite) && TRI_STY[t[3]]) }); n++;
      }
      if (!n) throw new Error('leeg');
      saveMods(); skList(); document.getElementById('skCode').value = ''; toast(n + ' module(s) geladen', 1800);
    } catch (err) { toast('Dit is geen geldige modulecode', 2200); }
  }
  document.getElementById('skCode').addEventListener('paste', () => setTimeout(importCode, 50));
  document.getElementById('skBar').addEventListener('click', e => {
    const a = e.target.closest('[data-sk]')?.dataset.sk; if (!a) return;
    if (a === 'brush') { SK.brush = SK.brush === 'hex' ? 'tri' : 'hex'; e.target.textContent = 'Penseel: ' + (SK.brush === 'hex' ? 'zeshoek' : 'driehoek'); return; }
    if (a.startsWith('t:') || a === 'vweg' || a === 'vbrd' || a === 'vpad' || a === 'cel' || a === 'weg' || a === 'brd' || a === 'pad' || a === 'gum') { SK.type = a; document.querySelectorAll('#skBar [aria-pressed]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sk === a))); }
    if (a === 'undo') { const rec = SK.undo.pop(); if (rec) { SK.edges = rec.e; SK.cells = rec.c; SK.paths = rec.v; if (rec.t) SK.tris = rec.t; } skDraw(); }
    if (a === 'clear') { SK.edges = new Map(); SK.cells = new Set(); SK.paths = []; SK.tris = new Map(); SK.undo = []; SK.editing = -1; skDraw(); }
    if (a === 'close') closeSketch();
    if (a === 'import') { importCode(); }
    if (false) {
      try {
        const raw = JSON.parse(document.getElementById('skCode').value), list = Array.isArray(raw) ? raw : [raw]; let n = 0;
        for (const m of list) if (m && Array.isArray(m.tris)) {
          modules.push({ name: String(m.name || 'Module').slice(0, 30), fine: m.fine === undefined ? undefined : (m.fine ? 1 : 0), n: [1, 2, 4, 8].includes(m.n) ? m.n : 2, edges: Array.isArray(m.edges) ? m.edges : [], cells: Array.isArray(m.cells) ? m.cells : [], paths: Array.isArray(m.paths) ? m.paths : [],
            tris: m.tris.filter(t => Array.isArray(t) && (t.length === 4 || t.length === 5) && t.slice(0, 3).every(Number.isFinite) && TRI_STY[t[3]]) }); n++;
        }
        if (!n) throw new Error('leeg');
        saveMods(); skList(); document.getElementById('skCode').value = ''; toast(n + ' module(s) geladen', 1800);
      } catch (err) { toast('Dit is geen geldige modulecode', 2200); }
    }
    if (a === 'save') {
      if (!SK.edges.size && !SK.cells.size && !SK.paths.length && !SK.tris.size) { toast('Teken eerst iets', 1400); return; }
      const nameEl = document.getElementById('skName'), name = (nameEl.value || '').trim() || 'Module ' + (modules.length + 1), item = { name, edges: [...SK.edges], cells: [...SK.cells], paths: SK.paths.map(p => ({ t: p.t, p: p.p })), tris: [...SK.tris].map(([id, k]) => [...id.split(',').map(Number), k]) };
      if (SK.editing >= 0 && modules[SK.editing]) modules[SK.editing] = item; else { modules.push(item); SK.editing = modules.length - 1; }
      saveMods(); skList(); toast('Module "' + name + '" bewaard', 1800);
    }
  });

  let openSchetsFn = null;
  const openSchets = () => { if (openSchetsFn) openSchetsFn(); };
  (() => {
(() => {
  const R = 9, SQ3 = Math.sqrt(3), PITCH = R * SQ3;
  const KINDS = [['muur', 'Muur'], ['dak', 'Dak'], ['glas', 'Glas'], ['weg', 'Weg'], ['pad', 'Pad'], ['vloer', 'Plein'], ['gras', 'Gras'], ['water', 'Water']];
  const AREAS = [[0, '1'], [1, '7'], [2, '19'], [3, '37']], FINES = [[1, '9 m'], [2, '4,5 m'], [4, '2,25 m'], [8, '1,1 m']];
  const appEl = document.getElementById('schetsApp'), css = n => getComputedStyle(appEl).getPropertyValue(n).trim();
  const S = { fine: 1, gl: 0, gr: 0, paths: [], pcur: null, tool: 'paint', ltype: 'weg', lay: 1, kind: 'muur', gum: false, hand: false, brush: 'hex', n: 4, k: 0, tris: new Map(), undo: [], redo: [], view: { x: 0, z: 0, s: 8 }, hover: null, editing: -1, last: null, shift: false, space: false };
  const persist = () => { saveMods(); skList(); };

  // rooster: zijde van een driehoek is R / n; een vak bestaat uit 6 n² driehoeken
  const TSn = n => R / n, ts = () => TSn(S.n);
  const triP = (i, j, t = ts()) => [i * t * SQ3 / 2, i * t / 2 + j * t];
  const triVerts = (i, j, t01, t = ts()) => { const A = triP(i, j, t), B = triP(i + 1, j, t), C = triP(i, j + 1, t), D = triP(i + 1, j + 1, t); return t01 ? [B, D, C] : [A, B, C]; };
  const triAtT = (x, z, t) => { const fi = x / (t * SQ3 / 2), fj = z / t - fi / 2, i = Math.floor(fi), j = Math.floor(fj); return [i, j, (fi - i) + (fj - j) < 1 ? 0 : 1]; };
  const triAt = (x, z) => triAtT(x, z, ts());
  function vertexAt(x, z) {
    const t = ts(), fi = x / (t * SQ3 / 2), fj = z / t - fi / 2; let b = null;
    for (let a = 0; a <= 1; a++) for (let c = 0; c <= 1; c++) { const I = Math.floor(fi) + a, J = Math.floor(fj) + c, p = triP(I, J), d = Math.hypot(p[0] - x, p[1] - z); if (!b || d < b.d) b = { I, J, d }; }
    return [b.I, b.J];
  }
  const around = (I, J) => [[I, J, 0], [I - 1, J, 0], [I, J - 1, 0], [I - 1, J, 1], [I, J - 1, 1], [I - 1, J - 1, 1]];
  const cellXZ = (q, r) => [PITCH * (q + r / 2), 1.5 * R * r];
  function cellOf(x, z) {   // vak waarin een punt ligt
    const fq = (x * SQ3 / 3 - z / 3) / R, fr = (2 / 3 * z) / R; let q = Math.round(fq), r = Math.round(fr), s = Math.round(-fq - fr);
    const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s + fq + fr);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return [q, r];
  }
  const hexDist = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
  const inArea = (x, z) => { const [q, r] = cellOf(x, z); return hexDist(q, r) <= S.k; };
  const centroid = v => [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3];
  const okTri = ([i, j, t]) => { const c = centroid(triVerts(i, j, t)); return inArea(c[0], c[1]); };
  const brushList = (x, z) => (S.brush === 'hex' ? around(...vertexAt(x, z)) : [triAt(x, z)]).filter(okTri);
  function lineCells(a, b) {   // alle driehoeken langs een rechte lijn (wereldcoördinaten)
    const out = new Map(), len = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.ceil(len / (ts() / 3)));
    for (let s = 0; s <= steps; s++) for (const c of brushList(a[0] + (b[0] - a[0]) * s / steps, a[1] + (b[1] - a[1]) * s / steps)) out.set(c.join(','), c);
    return [...out.values()];
  }

  // canvas
  const $ = id => document.getElementById('s_' + id), cv = $('cv'), ctx = cv.getContext('2d'), stage = $('stage');
  let W = 0, H = 0;
  // 3D-weergave: isometrisch (orthogonale camera) of perspectief, met dezelfde materialen als in het spel
  S.vm = '2d'; S.th = 0.5236; S.ph = 0.95; S.orb = false;
  const cv3 = $('cv3'), camP = new THREE.PerspectiveCamera(35, 1, 1, 3000), camO = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1500), cacheK = {}, V3 = new THREE.Vector3(), RAY = new THREE.Raycaster();
  let rnd = null, scn = null, tgroup = null, tsig = '', camC = camP;
  function camera3() {
    const k = [S.vm, S.view.x, S.view.z, S.view.s, S.th, S.ph, W, H].join(' ');
    if (cacheK.k === k) return camC;
    const s = S.view.s, iso = S.vm === 'iso', ph = iso ? 0.955 : S.ph, th = S.th; let d;
    if (iso) { camC = camO; camO.left = -W / 2 / s; camO.right = W / 2 / s; camO.top = H / 2 / s; camO.bottom = -H / 2 / s; d = 400; }
    else { camC = camP; camP.aspect = W / H; d = (H / 2) / (s * Math.tan(camP.fov * Math.PI / 360)); }
    camC.position.set(S.view.x + d * Math.sin(ph) * Math.sin(th), d * Math.cos(ph), S.view.z + d * Math.sin(ph) * Math.cos(th)); camC.lookAt(S.view.x, 0, S.view.z);
    camC.updateProjectionMatrix(); camC.updateMatrixWorld(true); cacheK.k = k; return camC;
  }
  const toS = (x, z) => { if (S.vm === '2d') return [W / 2 + (x - S.view.x) * S.view.s, H / 2 + (z - S.view.z) * S.view.s]; V3.set(x, 0, z).project(camera3()); return [(V3.x + 1) / 2 * W, (1 - V3.y) / 2 * H]; };
  const toW = (sx, sy) => {
    if (S.vm === '2d') return [(sx - W / 2) / S.view.s + S.view.x, (sy - H / 2) / S.view.s + S.view.z];
    RAY.setFromCamera({ x: sx / W * 2 - 1, y: 1 - sy / H * 2 }, camera3()); const o = RAY.ray.origin, d = RAY.ray.direction, t = Math.abs(d.y) < 1e-4 ? -1 : -o.y / d.y;
    return t < 0 ? [S.view.x, S.view.z] : [o.x + d.x * t, o.z + d.z * t];
  };
  function init3() {
    if (rnd) return true;
    try { rnd = new THREE.WebGLRenderer({ canvas: cv3, antialias: true }); } catch (e) { return false; }
    rnd.setPixelRatio(Math.min(2, devicePixelRatio || 1)); scn = new THREE.Scene(); scn.background = new THREE.Color('#d6e6ee');
    scn.add(new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 0.85)); const dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(-60, 110, 40); scn.add(dl);
    return true;
  }
  function build3() {
    if (tgroup) { scn.remove(tgroup); tgroup.traverse(m => { if (m.isMesh && m.userData.own) m.geometry.dispose(); if (m.userData.gnd) m.geometry.dispose(); }); }
    const T = [];
    for (const [id, v] of S.tris) { const [i, j, t] = id.split(',').map(Number), q = triVerts(i, j, t); T.push({ k: kindOf(v), v: [q[0][0], q[0][1], q[1][0], q[1][1], q[2][0], q[2][1]], h: v.includes('@') ? layOf(v) * 3 : undefined }); }
    tgroup = triBuild(T); tgroup.add(pathBuild(S.paths.map(a => ({ t: a.t, l: a.l, r: a.r, p: a.p }))));
    const gp = [], lp = [];
    for (let q = -S.k; q <= S.k; q++) for (let r = -S.k; r <= S.k; r++) {
      if (hexDist(q, r) > S.k) continue; const [cx, cz] = cellXZ(q, r), vs = [0, 1, 2, 3, 4, 5].map(n => { const a = Math.PI / 6 + n * Math.PI / 3; return [cx + Math.cos(a) * R, cz + Math.sin(a) * R]; });
      for (let n = 0; n < 6; n++) { const a = vs[n], b = vs[(n + 1) % 6]; gp.push(cx, -0.02, cz, b[0], -0.02, b[1], a[0], -0.02, a[1]); lp.push(a[0], 0.06, a[1], b[0], 0.06, b[1]); }
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gg.computeVertexNormals();
    const gm = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: '#86b45e', roughness: 1, side: THREE.DoubleSide })); gm.userData.gnd = true; tgroup.add(gm);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); const ln = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#5f7a43' })); ln.userData.gnd = true; tgroup.add(ln);
    scn.add(tgroup);
  }
  function render3() {
    if (!init3()) { S.vm = '2d'; return false; }
    const dpr = Math.min(2, devicePixelRatio || 1); if (cv3.width !== Math.round(W * dpr) || cv3.height !== Math.round(H * dpr)) rnd.setSize(W, H, false);
    let h = 5381; for (const [id, v] of S.tris) { const s2 = id + v; for (let i = 0; i < s2.length; i++) h = ((h << 5) + h + s2.charCodeAt(i)) | 0; }
    for (const a of S.paths) { h = (h * 31 + a.p.length * 7 + a.t.length + (a.l || 0) * 13 + (a.r || 0) * 17) | 0; for (const q of a.p) h = (h * 31 + Math.round(q[0] * 10) * 7 + Math.round(q[1] * 10)) | 0; }
    const sig = S.tris.size + ':' + h + ':' + S.k + ':' + S.paths.length; if (sig !== tsig) { tsig = sig; build3(); }
    rnd.render(scn, camera3()); return true;
  }
  function fit() { const half = (S.k * PITCH + R * 1.25) * 1.1; S.view = { x: 0, z: 0, s: Math.max(1.5, Math.min(60, Math.min(W, H) / (2 * half))) }; }
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1), b = stage.getBoundingClientRect(), first = !W;
    W = b.width; H = b.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (first) fit(); draw();
  }
  const EXT = new Set(['muur', 'dak', 'glas']), kindOf = v => v.split('@')[0], layOf = v => { const [k, l] = v.split('@'); return l != null ? +l : EXT.has(k) ? 1 : 0; };
  const enc = (k, L) => { if (k === 'water') return k; L = EXT.has(k) ? Math.max(1, L) : Math.max(0, L); return L === (EXT.has(k) ? 1 : 0) ? k : k + '@' + L; };
  const fillOf = k => css('--' + kindOf(k));
  function path(v) { v.forEach((p, n) => { const q = toS(p[0], p[1]); n ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }
  function gridLines() {
    const t = ts(), ext = (S.k + 1) * PITCH + R, iM = Math.ceil(ext / (t * SQ3 / 2)) + 1, jM = Math.ceil(ext / t) + iM;
    ctx.strokeStyle = css('--grid'); ctx.globalAlpha = S.vm !== '2d' ? 0.22 : S.n >= 8 ? 0.3 : 0.5; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -iM; i <= iM; i++) for (let j = -jM; j <= jM; j++) for (const t01 of [0, 1]) { const v = triVerts(i, j, t01), c = centroid(v); if (Math.abs(c[0]) > ext || Math.abs(c[1]) > ext || !inArea(c[0], c[1])) continue; const p = toS(c[0], c[1]); if (p[0] < -40 || p[0] > W + 40 || p[1] < -40 || p[1] > H + 40) continue; path(v); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  function offPts(pts, off) { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; return [p[0] - dz * off, p[1] + dx * off]; }); }
  function strokePath(pts, w, col, dash) {
    ctx.beginPath(); pts.forEach((a, n) => { const q = toS(a[0], a[1]); n ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.lineWidth = Math.max(1, w * S.view.s); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
  }
  function drawPaths() {
    for (const a of S.paths) {
      const def = PATH_DEF[a.t], pts = smoothPts(a.p), ew = a.t === 'pad' ? def.hw + 0.3 : def.hw + def.walk;
      for (const [w, sg] of [[a.r, 1], [a.l, -1]]) if (w > 0) strokePath(offPts(pts, sg * (ew + w / 2)), w, '#6aa84a');
      if (a.t === 'pad') { strokePath(pts, (def.hw + 0.3) * 2, '#7e4636'); strokePath(pts, def.hw * 2, '#b8663f'); continue; }
      strokePath(pts, (def.hw + def.walk) * 2, '#cbc8bd'); strokePath(pts, (def.hw + 0.3) * 2, '#9b988e'); strokePath(pts, def.hw * 2, '#3c4045');
      if (a.t === 'weg') strokePath(pts, 0.14, '#f1efe6', [3 * S.view.s, 3.5 * S.view.s]);
      else { strokePath(pts, 0.1, '#f1efe6', [3 * S.view.s, 3.5 * S.view.s]); }
    }
  }
  function drawCur() {
    if (S.tool !== 'line') return;
    const h = S.hover && !S.hand ? snapPt(toW(S.hover[0], S.hover[1])) : null, c = S.pcur ? S.pcur.slice() : [];
    if (h) { const pts = c.concat([h]); if (pts.length > 1) strokePath(smoothPts(pts), PATH_DEF[S.ltype].hw * 2, 'rgba(242,178,51,.45)'); }
    for (const a of c.concat(h ? [h] : [])) { const q = toS(a[0], a[1]); ctx.fillStyle = css('--signal'); ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, 7); ctx.fill(); }
  }
  function drawMarks() {
    if (S.tool === 'line') { drawCur(); return; }
    const erasing = S.gum || rightDown, col = erasing ? css('--bad') : fillOf(S.kind);
    const mark = (list, a) => { for (const [i, j, t01] of list) { ctx.beginPath(); path(triVerts(i, j, t01)); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = css('--signal'); ctx.lineWidth = 2; ctx.stroke(); } };
    if (mode === 'line' || (S.shift && S.last && S.hover && !S.hand && !mode)) {   // voorbeeld van een rechte lijn
      const a = mode === 'line' ? lineStart : S.last, b = S.hover ? toW(S.hover[0], S.hover[1]) : a;
      mark(lineCells(a, b), 0.7);
      const p = toS(a[0], a[1]), q = toS(b[0], b[1]); ctx.strokeStyle = css('--signal'); ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.setLineDash([]);
    } else if (S.hover && !S.hand && mode !== 'pan') { const [x, z] = toW(S.hover[0], S.hover[1]); mark(brushList(x, z), 0.85); }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (S.vm !== '2d' && render3()) { gridLines(); drawMarks(); return; }
    if (S.vm !== '2d') S.vm = '2d';
    ctx.fillStyle = css('--paper'); ctx.fillRect(0, 0, W, H);
    const t = ts(), ext = (S.k + 1) * PITCH + R, iM = Math.ceil(ext / (t * SQ3 / 2)) + 1, jM = Math.ceil(ext / t) + iM;
    // tekengebied: de vakken binnen de straal
    ctx.fillStyle = css('--area');
    for (let q = -S.k; q <= S.k; q++) for (let r = -S.k; r <= S.k; r++) { if (hexDist(q, r) > S.k) continue; const [cx, cz] = cellXZ(q, r); ctx.beginPath(); path([0, 1, 2, 3, 4, 5].map(n => { const a = Math.PI / 6 + n * Math.PI / 3; return [cx + Math.cos(a) * R, cz + Math.sin(a) * R]; })); ctx.fill(); }
    for (const [id, k] of S.tris) {
      const [i, j, t01] = id.split(',').map(Number), L = layOf(k), kd = kindOf(k), extra = L - (EXT.has(kd) ? 1 : 0), v = triVerts(i, j, t01);
      ctx.fillStyle = fillOf(k); ctx.beginPath(); path(v); ctx.fill();
      if (extra > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.55, extra * 0.13) + ')'; ctx.beginPath(); path(v); ctx.fill(); }
      if (L > 0 && ts() * S.view.s > 24) { const c = centroid(v), q = toS(c[0], c[1]); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = '700 ' + Math.min(18, ts() * S.view.s * 0.45) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L, q[0], q[1]); }
    }
    // diepte: een schaduw op de lagere buur langs elke rand waar het hoger is
    const hts = id => { const v = S.tris.get(id); return v && kindOf(v) !== 'water' ? layOf(v) : 0; };
    for (const [id, vv] of S.tris) {
      const h = hts(id); if (h <= 0) continue;
      const [i, j, t01] = id.split(',').map(Number), v = triVerts(i, j, t01), c = centroid(v);
      const nb = t01 ? [[i + 1, j, 0], [i, j + 1, 0], [i, j, 0]] : [[i, j - 1, 1], [i, j, 1], [i - 1, j, 1]];
      const ed = t01 ? [[0, 1], [1, 2], [2, 0]] : [[0, 1], [1, 2], [2, 0]];
      ed.forEach(([a0, b0], n) => {
        const d = h - hts(nb[n].join(',')); if (d <= 0) return;
        const p = v[a0], q = v[b0], mx = (p[0] + q[0]) / 2 - c[0], mz = (p[1] + q[1]) / 2 - c[1], l = Math.hypot(mx, mz) || 1, w = Math.min(ts() * 0.3, 0.25 + d * 0.3) * (mx * 0.5 + mz * 0.85 > 0 ? 1 : 0.55); if (!inArea((p[0] + q[0]) / 2 + mx / l * w, (p[1] + q[1]) / 2 + mz / l * w)) return;
        ctx.fillStyle = 'rgba(0,0,0,' + Math.min(0.5, 0.2 + d * 0.08) + ')'; ctx.beginPath(); path([p, q, [q[0] + mx / l * w, q[1] + mz / l * w], [p[0] + mx / l * w, p[1] + mz / l * w]]); ctx.fill();
      });
    }
    drawPaths(); gridLines();
    ctx.strokeStyle = css('--tile'); ctx.lineWidth = 1.8; ctx.beginPath();
    for (let q = -S.k; q <= S.k; q++) for (let r = -S.k; r <= S.k; r++) { if (hexDist(q, r) > S.k) continue; const [cx, cz] = cellXZ(q, r); path([0, 1, 2, 3, 4, 5].map(n => { const a = Math.PI / 6 + n * Math.PI / 3; return [cx + Math.cos(a) * R, cz + Math.sin(a) * R]; })); }
    ctx.stroke();
    const o = toS(0, 0); ctx.fillStyle = css('--signal'); ctx.beginPath(); ctx.arc(o[0], o[1], 4, 0, 7); ctx.fill();
    drawMarks();
  }
  new ResizeObserver(resize).observe(stage);
  
  // tekenen
  const stamp = () => { const m = new Map(S.tris); m.paths = S.paths.map(a => ({ t: a.t, l: a.l || 0, r: a.r || 0, p: a.p.map(q => q.slice()) })); return m; };
  const restore = m => { S.tris = new Map(m); S.paths = m.paths || []; S.pcur = null; };
  const snap = () => { S.undo.push(stamp()); if (S.undo.length > 100) S.undo.shift(); S.redo = []; };
  const setCells = list => { for (const c of list) { const id = c.join(','); (S.gum || rightDown) ? S.tris.delete(id) : S.tris.set(id, enc(S.kind, S.lay)); } };
  let mode = null, last = null, rightDown = false, lineStart = null;
  const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  // wegen tekenen: gladde lijnen die op roosterpunten vastklikken
  const snapPt = w => { const [I, J] = vertexAt(w[0], w[1]), q = triP(I, J); return inArea(q[0] * 0.999, q[1] * 0.999) ? q : null; };
  function lineFinish() {
    if (S.pcur && S.pcur.length > 1) { snap(); S.paths.push({ t: S.ltype, l: S.gl, r: S.gr, p: S.pcur.map(a => [Math.round(a[0] * 100) / 100, Math.round(a[1] * 100) / 100]) }); counts(); }
    S.pcur = null; sync(); draw();
  }
  function lineDown(e, p, w) {
    if (e.button === 2) {
      if (S.pcur) { S.pcur = null; sync(); draw(); return; }
      let best = -1, bd = 1e9; S.paths.forEach((a, i) => { const d = distPoly(w[0], w[1], smoothPts(a.p)) - PATH_DEF[a.t].hw; if (d < 2 && d < bd) { bd = d; best = i; } });
      if (best >= 0) { snap(); S.paths.splice(best, 1); counts(); } draw(); return;
    }
    const q = snapPt(w); if (!q) return;
    if (!S.pcur) S.pcur = [];
    const l = S.pcur[S.pcur.length - 1];
    if (l && Math.hypot(l[0] - q[0], l[1] - q[1]) < 0.01) { lineFinish(); return; }
    S.pcur.push(q); sync(); draw();
  }
  $('bLineDone').onclick = lineFinish;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); const p = pos(e), w = toW(p[0], p[1]);
    if (S.tool === 'line' && !S.hand && !S.space && e.button !== 1 && !(S.vm !== '2d' && (S.orb || e.altKey))) { lineDown(e, p, w); return; }
    if (S.vm !== '2d' && (S.orb || e.altKey)) { mode = 'orbit'; last = p; return; }
    if (S.hand || S.space || e.button === 1) { mode = 'pan'; last = p; return; }
    rightDown = e.button === 2; snap();
    if (e.shiftKey) { mode = 'line'; lineStart = S.last || w; S.hover = p; draw(); return; }
    mode = 'paint'; setCells(brushList(w[0], w[1])); last = p; S.last = w; draw(); counts();
  });
  cv.addEventListener('pointermove', e => {
    const p = pos(e); S.hover = p; S.shift = e.shiftKey;
    if (mode === 'pan') { const a0 = toW(last[0], last[1]), b0 = toW(p[0], p[1]); S.view.x += a0[0] - b0[0]; S.view.z += a0[1] - b0[1]; last = p; }
    else if (mode === 'orbit') { S.th -= (p[0] - last[0]) * 0.008; if (S.vm === '3d') S.ph = Math.max(0.15, Math.min(1.45, S.ph - (p[1] - last[1]) * 0.006)); last = p; }
    else if (mode === 'paint') { const n = Math.max(1, Math.ceil(Math.hypot(p[0] - last[0], p[1] - last[1]) / 4)); for (let i = 1; i <= n; i++) { const w = toW(last[0] + (p[0] - last[0]) * i / n, last[1] + (p[1] - last[1]) * i / n); setCells(brushList(w[0], w[1])); S.last = w; } last = p; counts(); }
    const [x, z] = toW(p[0], p[1]); $('readout').textContent = 'x ' + x.toFixed(2) + ' m   z ' + z.toFixed(2) + ' m';
    draw();
  });
  const up = e => {
    if (mode === 'line' && S.hover) { const b = toW(S.hover[0], S.hover[1]); setCells(lineCells(lineStart, b)); S.last = b; counts(); }
    mode = null; rightDown = false; draw();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { S.hover = null; draw(); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e), [wx, wz] = toW(p[0], p[1]); S.view.s = Math.max(1.5, Math.min(80, S.view.s * (e.deltaY < 0 ? 1.12 : 1 / 1.12))); const [nx, nz] = toW(p[0], p[1]); S.view.x += wx - nx; S.view.z += wz - nz; draw(); }, { passive: false });
  const zoom = f => { S.view.s = Math.max(1.5, Math.min(80, S.view.s * f)); draw(); };

  // raster aanpassen; bestaande tekening wordt mee verfijnd of vergroefd
  function refine(map) {
    const out = new Map();
    for (const [id, k] of map) {
      const [i, j, t] = id.split(',').map(Number), a = 2 * i, b = 2 * j;
      const kids = t ? [[a + 1, b, 1], [a + 1, b + 1, 1], [a, b + 1, 1], [a + 1, b + 1, 0]] : [[a, b, 0], [a + 1, b, 0], [a, b + 1, 0], [a, b, 1]];
      kids.forEach(c => out.set(c.join(','), k));
    }
    return out;
  }
  function coarsen(map, nFrom) {
    const votes = new Map(), tc = TSn(nFrom / 2), out = new Map();
    for (const [id, k] of map) { const [i, j, t] = id.split(',').map(Number), c = centroid(triVerts(i, j, t, TSn(nFrom))), pid = triAtT(c[0], c[1], tc).join(','); const m = votes.get(pid) || {}; m[k] = (m[k] || 0) + 1; votes.set(pid, m); }
    for (const [pid, m] of votes) { const best = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; if (best[1] >= 2) out.set(pid, best[0]); }
    return out;
  }
  function setN(n) {
    if (n === S.n) return;
    while (S.n < n) { S.tris = refine(S.tris); S.n *= 2; }
    while (S.n > n) { S.tris = coarsen(S.tris, S.n); S.n /= 2; }
    S.undo = []; S.redo = []; S.last = null; sync(); draw(); counts();
  }
  function setK(k) {
    S.k = k; if (k < S.k) S.undo = [];
    for (const id of [...S.tris.keys()]) { if (!okTri(id.split(',').map(Number))) S.tris.delete(id); }
    fit(); sync(); draw(); counts();
  }

  // paneel
  const kindsEl = $('kinds');
  KINDS.forEach(([k, label]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.innerHTML = '<span class="sw" style="background:var(--' + k + ')"></span>' + label;
    b.onclick = () => { S.tool = 'paint'; S.pcur = null; S.kind = k; S.lay = EXT.has(k) ? Math.max(1, S.lay) : (S.lay > 1 || k === 'water' ? 0 : S.lay); S.gum = false; S.hand = false; sync(); }; kindsEl.appendChild(b);
  });
  [['weg', 'Weg'], ['brd', 'Brede weg'], ['pad', 'Pad']].forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.l = k; b.textContent = label; b.onclick = () => { S.tool = 'line'; S.ltype = k; S.gum = false; S.hand = false; S.orb = false; S.pcur = null; sync(); draw(); }; $('lineRow').appendChild(b); });
  [['gl', 'glRow'], ['gr', 'grRow']].forEach(([key2, id]) => [[0, 'Geen'], [3, '3 m'], [6, '6 m']].forEach(([w, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.w = w; b.textContent = label; b.onclick = () => { S[key2] = w; sync(); draw(); }; $(id).appendChild(b); }));
  [[0, 'Op een vak'], [1, 'Ook tussen tegels']].forEach(([v, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.f = v; b.textContent = label; b.onclick = () => { S.fine = v; sync(); }; $('fineRow2').appendChild(b); });
  AREAS.forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.a = k; b.textContent = label; b.onclick = () => setK(k); $('areaRow').appendChild(b); });
  FINES.forEach(([n, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.n = n; b.textContent = label; b.onclick = () => setN(n); $('fineRow').appendChild(b); });
  function sync() {
    kindsEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(S.tool === 'paint' && !S.gum && !S.hand && b.dataset.k === S.kind)));
    $('lineRow').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(S.tool === 'line' && b.dataset.l === S.ltype)));
    ['gl', 'gr'].forEach(k2 => $(k2 + 'Row').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.w === S[k2]))));
    $('fineRow2').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.f === (S.fine ? 1 : 0))));
    $('bLineDone').hidden = !(S.pcur && S.pcur.length > 1);
    $('areaRow').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.a === S.k)));
    $('fineRow').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.n === S.n)));
    $('layNum').textContent = (EXT.has(S.kind) ? Math.max(1, S.lay) : S.lay) + (S.lay === 1 ? ' laag' : ' lagen') + ' · ' + (EXT.has(S.kind) ? Math.max(1, S.lay) : S.lay) * 3 + ' m';
    $('vm2').setAttribute('aria-pressed', String(S.vm === '2d')); $('vmI').setAttribute('aria-pressed', String(S.vm === 'iso')); $('vm3').setAttribute('aria-pressed', String(S.vm === '3d'));
    $('viewRow').hidden = S.vm === '2d'; $('bOrb').setAttribute('aria-pressed', String(S.orb)); $('bOrb').hidden = S.vm !== '3d';
    $('bGum').setAttribute('aria-pressed', String(S.gum)); $('bHand').setAttribute('aria-pressed', String(S.hand));
    $('bBrush').textContent = 'Penseel: ' + (S.brush === 'hex' ? 'zeshoek' : 'driehoek'); cv.style.cursor = S.hand ? 'grab' : 'crosshair';
    const tiles = 1 + 3 * S.k * (S.k + 1); $('sub').textContent = tiles + (tiles === 1 ? ' hexagon' : ' hexagonen') + ' · driehoek ' + (R / S.n).toLocaleString('nl', { maximumFractionDigits: 2 }) + ' m · vak = ' + 6 * S.n * S.n + ' driehoeken';
  }
  $('bLayDn').onclick = () => { S.lay = Math.max(0, S.lay - 1); sync(); }; $('bLayUp').onclick = () => { S.lay = Math.min(9, S.lay + 1); sync(); };
  const setVm = v => { const was = S.vm === '2d', now = v === '2d'; if (was && !now) S.view.s *= 0.55; else if (!was && now) S.view.s /= 0.55; S.vm = v; tsig = ''; sync(); draw(); };
  $('vm2').onclick = () => setVm('2d'); $('vmI').onclick = () => setVm('iso'); $('vm3').onclick = () => setVm('3d');
  $('bRotL').onclick = () => { S.th += Math.PI / 3; draw(); }; $('bRotR').onclick = () => { S.th -= Math.PI / 3; draw(); };
  $('bOrb').onclick = () => { S.orb = !S.orb; if (S.orb) { S.hand = false; S.gum = false; } sync(); };
  $('bGum').onclick = () => { S.gum = !S.gum; S.hand = false; sync(); draw(); };
  $('bHand').onclick = () => { S.hand = !S.hand; if (S.hand) S.gum = false; sync(); };
  $('bBrush').onclick = () => { S.brush = S.brush === 'hex' ? 'tri' : 'hex'; sync(); draw(); };
  $('bUndo').onclick = () => { if (S.pcur && S.pcur.length) { S.pcur.pop(); if (!S.pcur.length) S.pcur = null; draw(); return; } const m = S.undo.pop(); if (m) { S.redo.push(stamp()); restore(m); draw(); counts(); } };
  $('bRedo').onclick = () => { const m = S.redo.pop(); if (m) { S.undo.push(stamp()); restore(m); draw(); counts(); } };
  $('bClear').onclick = () => { if (S.tris.size || S.paths.length) { snap(); S.tris = new Map(); S.paths = []; S.pcur = null; S.last = null; draw(); counts(); } };
  $('bZoomIn').onclick = () => zoom(1.25); $('bZoomOut').onclick = () => zoom(0.8);
  const say = t => { $('msg').textContent = t; };
  const counts = () => say(S.tris.size ? S.tris.size + ' driehoeken' : '');

  const cur = () => ({ name: ($('name').value || '').trim() || 'Module ' + (modules.length + 1), n: S.n, k: S.k, fine: S.fine ? 1 : 0, edges: [], cells: [], paths: S.paths.map(a => ({ t: a.t, l: a.l || 0, r: a.r || 0, p: a.p.map(q => q.slice()) })), tris: [...S.tris].map(([id, v]) => { const k = kindOf(v), a = [...id.split(',').map(Number), k]; if (v.includes('@')) a.push(layOf(v)); return a; }) });
  function renderLib() {
    const el = $('lib'); el.innerHTML = modules.length ? '' : '<p class="hint">Nog geen modules. Teken iets en bewaar het.</p>';
    modules.forEach((m, idx) => {
      const d = document.createElement('div'); d.className = 'mod';
      d.innerHTML = '<span></span><small></small><button type="button" data-a="load">Open</button><button type="button" data-a="del" aria-label="Verwijder">×</button>';
      d.children[0].textContent = m.name; d.children[1].textContent = (m.tris || []).length;
      d.onclick = e => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === 'load') {
          S.n = [1, 2, 4, 8].includes(m.n) ? m.n : 2; S.k = Number.isInteger(m.k) ? Math.max(0, Math.min(3, m.k)) : 2;
          S.fine = m.fine !== undefined ? (m.fine ? 1 : 0) : (fineOK(m) ? 1 : 0); S.paths = (m.paths || []).map(a => ({ t: a.t, l: a.l || 0, r: a.r || 0, p: a.p.map(q => q.slice()) })); S.pcur = null; S.tool = 'paint'; S.tris = new Map((m.tris || []).map(([i2, j, t, k, L]) => [i2 + ',' + j + ',' + t, L != null ? k + '@' + L : k])); S.undo = []; S.redo = []; S.last = null; S.editing = idx; $('name').value = m.name; fit(); sync(); draw(); say('"' + m.name + '" geopend');
        }
        if (a === 'del') { const gone = modules.splice(idx, 1)[0], dn = dropModule(gone); if (S.editing === idx) S.editing = -1; else if (S.editing > idx) S.editing--; persist(); renderLib(); say('"' + gone.name + '" verwijderd' + (dn ? ' · ' + dn + ' uit de stad gehaald' : '')); }
      };
      el.appendChild(d);
    });
  }
  $('bSave').onclick = () => {
    if (!S.tris.size && !S.paths.length) { say('Teken eerst iets'); return; }
    const m = cur(); let upd = 0; if (S.editing >= 0 && modules[S.editing]) { m.id = modules[S.editing].id; modules[S.editing] = m; ensureIds(); upd = syncModule(m); } else { modules.push(m); S.editing = modules.length - 1; ensureIds(); }
    persist(); renderLib(); say('"' + m.name + '" bewaard' + (upd ? ' · ' + upd + ' in de stad bijgewerkt' : ''));
  };
  $('bNew').onclick = () => { S.fine = 1; S.paths = []; S.pcur = null; S.tris = new Map(); S.undo = []; S.redo = []; S.editing = -1; S.last = null; $('name').value = ''; draw(); say(''); };
  async function copy(text) {
    $('code').value = text;
    try { await navigator.clipboard.writeText(text); say('Gekopieerd. Plak de code in Hexstad.'); }
    catch (e) { $('code').select(); say('Selecteer en kopieer de code hierboven.'); }
  }
  $('bCopyOne').onclick = () => { if (!S.tris.size) { say('Teken eerst iets'); return; } copy(JSON.stringify(cur())); };
  $('bCopyAll').onclick = () => { if (!modules.length) { say('Bewaar eerst een module'); return; } copy(JSON.stringify(modules)); };
  $('bImport').onclick = () => {
    try {
      const raw = JSON.parse($('code').value), list = Array.isArray(raw) ? raw : [raw]; let n = 0;
      for (const m of list) { if (m && Array.isArray(m.tris)) { modules.push({ name: String(m.name || 'Module').slice(0, 30), fine: m.fine === undefined ? undefined : (m.fine ? 1 : 0), n: [1, 2, 4, 8].includes(m.n) ? m.n : 2, k: Number.isInteger(m.k) ? m.k : 2, edges: [], cells: [], paths: [], tris: m.tris.filter(t => Array.isArray(t) && t.length === 4) }); n++; } }
      if (!n) throw new Error('leeg'); persist(); renderLib(); say(n + ' module(s) geladen');
    } catch (e) { say('Dit is geen geldige modulecode'); }
  };
  addEventListener('keydown', e => {
    if (appEl.hidden) return; e.stopPropagation();
    if (e.key === 'Shift') { S.shift = true; draw(); }
    if (e.target.matches('input,textarea')) return;
    if (e.code === 'Space') { S.space = true; e.preventDefault(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('bUndo').click(); }
    if (S.tool === 'line' && e.key === 'Enter') lineFinish();
    if (S.tool === 'line' && e.key === 'Escape') { S.pcur = null; sync(); draw(); }
    if (e.key === 'e') $('bGum').click(); if (e.key === 'b') $('bBrush').click();
  }, true);
  addEventListener('keyup', e => {
    if (appEl.hidden) return; if (e.key === 'Shift') { S.shift = false; draw(); } if (e.code === 'Space') S.space = false; });

  $('bClose').onclick = () => { appEl.hidden = true; };
  openSchetsFn = () => { S.fine = 1; S.paths = []; S.pcur = null; S.tool = 'paint'; S.tris = new Map(); S.undo = []; S.redo = []; S.last = null; S.editing = -1; S.gum = false; S.hand = false; $('name').value = ''; say(''); appEl.hidden = false; renderLib(); sync(); resize(); fitSoon(); draw(); };
  const fitSoon = () => requestAnimationFrame(() => { resize(); draw(); });
  renderLib(); sync(); resize();
})();
  })();

