  // ---------- Schets en modules: teken vrij op het zeshoekraster; de lijnen klikken vast op randen en doorgangen ----------
  const MODS_KEY = 'raatstad-modules';
  let modules = [];
  try { modules = (JSON.parse(localStorage.getItem(MODS_KEY) || '[]') || []).filter(m => m && Array.isArray(m.edges)); } catch (e) { modules = []; }
  const uid = () => Math.random().toString(36).slice(2, 10);
  const ensureIds = () => modules.forEach(m => { if (!m.id) m.id = uid(); });
  ensureIds();
  // Geen startmodules meer: de lijst begint leeg en vult zich met je eigen schetsen.
  // Eenmalig (reset 1) worden eerder meegeleverde modules en alles wat ermee in de stad staat weggehaald.
  let modsReset = false;
  try { if (!localStorage.getItem('raatstad-mods-reset1')) { modules = []; localStorage.setItem(MODS_KEY, '[]'); localStorage.setItem('raatstad-mods-reset1', '1'); modsReset = true; } } catch (e) { /* geen opslag */ }
  const saveMods = () => { ensureIds(); try { localStorage.setItem(MODS_KEY, JSON.stringify(modules)); } catch (e) { /* geen opslag */ } };
  let moduleSel = null, moduleRot = 0, moduleMir = false;   // moduleMir: gespiegeld plaatsen (toets F)
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
  function placeCore(mod, rot, q0, r0, lv = 0) {   // zet de onderdelen van een module neer; geeft aantal en overgeslagen stukken
    if (mod.v === 2) { const why = mv2CanPlace(mod, rot, q0, r0, lv); if (why) { toast(why, 1400); return { n: 0, skip: 1 }; } return { n: 1, skip: 0 }; }
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
  // Klik op het dak van een module: de gekozen module komt erbovenop (gelaagde stad). Klik op de gevel: wisselen
  // naar de variant die het best aansluit (zoals voorheen).
  function placeModule(q0, r0, lv) {
    if (flyCam.on) return;   // cameramodus: niets bouwen of slopen
    const mod = modules[moduleSel]; if (!mod) { openSchets(); return false; }
    ensureIds();
    if (lv === undefined && mod.v === 2 && hudLayer() !== null) lv = hudLayer();   // laagkiezer (15d)
    if (lv === undefined) lv = mod.v === 2 && Number.isInteger(q0) && Number.isInteger(r0) && lastPickRes && lastPickRes.inst ? stackLvAt(q0, r0) : 0;
    if (!lv && mod.v === 2 && Number.isInteger(q0) && Number.isInteger(r0)) { const t = cellModTop(q0, r0); if (t && isDeckMod(t.inst.m) && !isDeckMod(mod)) lv = t.top; }   // op een wegdek geklikt: erbovenop (het dek is de grond)
    if (!lv && mod.v === 2 && Number.isInteger(q0) && Number.isInteger(r0)) { const ol = overRoadLv(mod, moduleRot, q0, r0); if (ol) lv = ol; }   // op een weg geklikt: de module komt erboven, op poten (08l)
    if (lastPickRes && lastPickRes.inst && lastPickRes.side) { const i = cells.inst.indexOf(lastPickRes.inst); if (i >= 0 && swapInst(i)) return true; }   // op de gevel van een geplaatste module: wisselen
    const { n, skip } = placeCore(mod, moduleRot, q0, r0, lv);
    if (n) modUsed(mod);
    const mir = moduleMir && mod.v === 2;
    if (n) (cells.inst || (cells.inst = [])).push(Object.assign({ mid: mod.id, m: instData(mod, mir), q: q0, r: r0, rot: moduleRot }, lv ? { lv } : {}, mir ? { mir: true } : {}));
    if (n && lv && mod.v === 2) { buildModNet(); if (isDeckMod(mod)) buildPathNet(); changed(); toast('"' + mod.name + '" geplaatst op laag ' + lv + ' (' + lv * MV2.LV_H + ' m)' + (mv2Area({ m: mod, rot: moduleRot, q: q0, r: r0 }).some(([q, r]) => vecCover.has(q + ',' + r)) ? ' · boven de weg, op poten' : ''), 2200); return true; }
    if (n && mod.v === 2 && Number.isInteger(q0) && Number.isInteger(r0)) { const G0 = gH(q0, r0); terrSet(mv2Area({ m: mod, rot: moduleRot, q: q0, r: r0 }).map(([q, r]) => [q, r, G0])); }   // de module staat vlak: het terrein eronder op één hoogte
    buildTriNet(); buildPathNet(); buildEdgeNet(); buildModNet(); changed();
    toast(n ? '"' + mod.name + '" geplaatst' + (skip ? ' · ' + skip + ' stukken overgeslagen (water of bebouwing)' : '') : 'Hier past de module niet', 2200);
    return n > 0;
  }
  // ---------- Randcodes: wat er op elke buitenrand van een module zit, zodat modules op elkaar aansluiten ----------
  // Afgeleid uit de tekening: een weg die op het midden van een rand uitkomt → 'weg' (of 'brd', 'laan', 'pad'); anders de
  // driehoeken vlak bij de rand: weg, pad, groen (gras), stoep (vloer/plein), muur (muur/dak/glas), water; niets → 'leeg'.
  const CODE_OF_KIND = { weg: 'weg', pad: 'pad', gras: 'groen', vloer: 'stoep', plein: 'stoep', muur: 'muur', dak: 'muur', glas: 'muur', water: 'water' };
  const CODE_COL = { deur: '#e9c46a', weg: '#3c4045', brd: '#1f2326', laan: '#5f9a48', pad: '#9b5a45', groen: '#6aa84a', stoep: '#cbc8bd', muur: '#8a8a8a', water: '#4a8fd1', leeg: 'rgba(0,0,0,0)' };
  const hexDistQR = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
  function moduleBoundary(k) {   // alle buitenranden van een gebied met straal k, als [q, r, zijde]
    const out = [];
    for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) { if (hexDistQR(q, r) > k) continue; for (let s = 0; s < 6; s++) if (hexDistQR(q + NEIGH[s][0], r + NEIGH[s][1]) > k) out.push([q, r, s]); }
    return out;
  }
  function moduleCodes(m) {
    if (m.v === 2) return modV2Codes(m);
    const codes = {}, kk = m.k || 0, ts = R / ([1, 2, 4, 8].includes(m.n) ? m.n : 2);
    const tris = (m.tris || []).map(([i, j, t, kind]) => { const v = triVerts(i, j, t, ts); return { x: (v[0][0] + v[1][0] + v[2][0]) / 3, z: (v[0][1] + v[1][1] + v[2][1]) / 3, kind }; });
    for (const [q, r, s] of moduleBoundary(kk)) {
      const c = cellToWorld(q, r), f = FRAMES[s], mx = c.x + f.nx * INNER, mz = c.z + f.nz * INNER;
      let code = null;
      for (const p of m.paths || []) for (const e of [p.p[0], p.p[p.p.length - 1]]) if (Math.hypot(e[0] - mx, e[1] - mz) < 2.5) code = p.t;
      if (!code) {
        const cnt = {};
        for (const t of tris) { if (Math.hypot(t.x - mx, t.z - mz) > 3.2) continue; const cd = CODE_OF_KIND[t.kind]; if (cd) cnt[cd] = (cnt[cd] || 0) + 1; }
        code = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || 'leeg';
      }
      codes[q + ',' + r + ',' + s] = code;
    }
    return codes;
  }
  const codesOf = m => m.codes || (m.codes = moduleCodes(m));
  // code van een module op een rand van het gedraaide, geplaatste exemplaar (wereldrand q,r,zijde → lokaal terugdraaien)
  function codeAtWorld(I, q, r, s) {
    const codes = codesOf(I.m);
    let [lq, lr] = [q - I.q, r - I.r], ls = s;
    for (let i = 0; i < I.rot % 6; i++) { [lq, lr] = [-lr, lq + lr]; ls = (ls + 5) % 6; }   // omgekeerde van (q,r)→(q+r,−q), zijde −1
    return codes[lq + ',' + lr + ',' + ls] || null;
  }
  const instArea = I => { const k = I.m.k || 0, out = []; for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (hexDistQR(q, r) <= k) { let [a, b] = [q, r]; for (let i = 0; i < I.rot; i++) [a, b] = [a + b, -a]; out.push([a + I.q, b + I.r]); } return out; };
  // Wat staat er naast een geplaatst exemplaar? Per buitenrand de code van de buur (andere module, vak, getekende weg)
  function neighbourCodes(I) {
    const req = []; const insts = (cells.inst || []).filter(J => J !== I && Number.isInteger(J.q) && Number.isInteger(J.r) && (J.lv || 0) === (I.lv || 0));
    // getekende wegen van anderen (niet van dit exemplaar zelf) die op een rand uitkomen
    const own = new Set(modulePaths(I.m, I.rot, I.q, I.r).map(p => Math.round(p.p[0][0] * 10) + ',' + Math.round(p.p[0][1] * 10)));
    const ends = []; for (const p of cells.paths || []) { if (!p.p || p.p.length < 2 || own.has(Math.round(p.p[0][0] * 10) + ',' + Math.round(p.p[0][1] * 10))) continue; ends.push([p.p[0], p.t], [p.p[p.p.length - 1], p.t]); }
    for (const [lq, lr, ls] of moduleBoundary(I.m.k || 0)) {
      let [q, r] = [lq, lr], s = ls; for (let i = 0; i < I.rot; i++) { [q, r] = [q + r, -q]; s = (s + 1) % 6; }
      q += I.q; r += I.r;
      const nq = q + NEIGH[s][0], nr = r + NEIGH[s][1], ns = (s + 3) % 6;
      let code = null;
      const J = insts.find(J => instArea(J).some(([a, b]) => a === nq && b === nr));
      if (J) code = codeAtWorld(J, nq, nr, ns);
      if (!code) {
        const c = cellToWorld(q, r), f = FRAMES[s], mx = c.x + f.nx * INNER, mz = c.z + f.nz * INNER;
        for (const [e, t] of ends) if (Math.hypot(e[0] - mx, e[1] - mz) < 2.5) code = t;
      }
      if (!code) {
        const st = stackOf(nq, nr), b = baseOf(st[0] || '');
        code = !st.length ? 'leeg' : b === 'weg' || b === 'laan' ? 'weg' : b === 'pad' ? 'pad' : b === 'park' ? 'groen' : b === 'water' ? 'water' : isBuilding(b) ? 'muur' : 'leeg';
      }
      req.push({ q, r, s, code });
    }
    return req;
  }
  // Passende modules: zelfde straal, en op elke rand met een buur dezelfde code; gesorteerd op aantal afwijkingen
  function matchingModules(I) {
    const req = neighbourCodes(I), out = [];
    for (let mi = 0; mi < modules.length; mi++) {
      const m = modules[mi]; if ((m.k || 0) !== (I.m.k || 0) || m.v !== 2 && !fineOK(m) && !(m.tris || []).length) continue;
      for (let rot = 0; rot < 6; rot++) {
        const J = { m, q: I.q, r: I.r, rot }; let bad = 0, used = 0;
        for (const e of req) { if (e.code === 'leeg') continue; used++; if (codeAtWorld(J, e.q, e.r, e.s) !== e.code) bad++; }
        out.push({ mi, rot, bad, used });
      }
    }
    out.sort((a, b) => a.bad - b.bad || a.mi - b.mi || a.rot - b.rot);
    return out;
  }
  function instIdxAt(res) {
    if (!res || !res.point || !cells.inst) return -1;
    if (res.inst) { const i = cells.inst.indexOf(res.inst); if (i >= 0) return i; }
    const x = res.point.x, z = res.point.z; let best = -1, bd = 7;
    cells.inst.forEach((I, i) => {
      let d = 1e9; for (const a of instPts(I)) d = Math.min(d, Math.hypot(a[0] - x, a[1] - z));
      if (Number.isInteger(I.q) && Number.isInteger(I.r)) for (const [q, r] of instArea(I)) { const c = cellToWorld(q, r); d = Math.min(d, Math.max(0, Math.hypot(c.x - x, c.z - z) - INNER)); }   // binnen het gebied van de module telt ook
      if (d <= bd) { bd = d; best = i; }
    });
    return best;
  }
  // Klik op een geplaatste module: wissel naar de variant die het best op de buren aansluit; nog een klik: de volgende
  function swapInst(i) {
    const I = cells.inst[i]; if (!Number.isInteger(I.q) || !Number.isInteger(I.r)) return false;
    const list = matchingModules(I); if (!list.length) return false;
    const cur = list.findIndex(c => modules[c.mi].id === I.mid && c.rot === I.rot % 6);
    const next = list[(cur + 1) % list.length], m = modules[next.mi];
    cells.inst.splice(i, 1); removeInst(I); modTopRefresh();
    const { n } = placeCore(m, next.rot, I.q, I.r, I.lv || 0);
    if (!n) { cells.inst.splice(i, 0, I); modTopRefresh(); return false; }   // past niet: het oude exemplaar blijft staan
    if (n) cells.inst.push(Object.assign({ mid: m.id, m: instData(m, I.mir), q: I.q, r: I.r, rot: next.rot }, I.lv ? { lv: I.lv } : {}, I.mir ? { mir: true } : {}));
    buildTriNet(); buildPathNet(); buildEdgeNet(); buildModNet(); changed();
    toast('"' + m.name + '"' + (next.rot ? ' · gedraaid' : '') + (next.bad ? ' · ' + next.bad + ' rand(en) sluiten niet aan' : ' · sluit aan') + ' (' + ((cur + 1) % list.length + 1) + '/' + list.length + ')', 2000);
    return true;
  }
  // Stad en schets gelijk houden: een bewerkte module past alle geplaatste exemplaren aan, een verwijderde module haalt ze weg
  const instOf = mod => (cells.inst || []).filter(I => I.mid ? I.mid === mod.id : I.m.name === mod.name);
  function syncModule(mod) {
    const L = instOf(mod); if (!L.length) return 0;
    for (const I of L.filter(x => !x.tw)) { removeInst(I); const r = placeCore(mod, I.rot, I.q, I.r, I.lv || 0); I.m = instData(mod, I.mir); I.mid = mod.id; if (!r.n) cells.inst.splice(cells.inst.indexOf(I), 1); }
    buildTriNet(); buildPathNet(); buildEdgeNet(); buildModNet(); changed(); return L.length;
  }
  function dropModule(mod) {
    const L = instOf(mod); if (!L.length) return 0;
    for (const I of L) { removeInst(I); cells.inst.splice(cells.inst.indexOf(I), 1); }
    buildTriNet(); buildPathNet(); buildEdgeNet(); buildModNet(); changed(); return L.length;
  }
  // Rechtermuisknop: haal een geplaatste module in zijn geheel weg
  function instPts(I) {
    const P = [], m = I.m;
    if (m.v === 2) { for (const [q, r] of mv2Area(I)) { const w = cellToWorld(q, r); P.push([w.x, w.z]); } return P; }
    if (I.tw) { for (const t of I.tw) P.push(cenOf(t)); return P; }
    for (const [q, r, k] of moduleItems(m, I.rot, I.q, I.r)) { const [A, B] = edgeEnds(q, r, k); P.push([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]); }
    for (const [q, r] of moduleCells(m, I.rot, I.q, I.r)) { const w = cellToWorld(q, r); P.push([w.x, w.z]); }
    for (const t of triWorld(m, I.rot, I.q, I.r)) P.push([(t.v[0] + t.v[2] + t.v[4]) / 3, (t.v[1] + t.v[3] + t.v[5]) / 3]);
    for (const pa of modulePaths(m, I.rot, I.q, I.r)) for (const a of pa.p) P.push(a);
    return P;
  }
  function removeInst(I) {
    if (I.m && I.m.v === 2) return;   // een module v2 staat alleen in cells.inst; buildModNet ruimt op
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
    const x = res.point.x, z = res.point.z; let best = res.inst ? cells.inst.indexOf(res.inst) : -1, bd = 7;
    if (best < 0) cells.inst.forEach((I, i) => { let d = 1e9; for (const a of instPts(I)) d = Math.min(d, Math.hypot(a[0] - x, a[1] - z)); if (d < bd - 1e-6 || (d <= bd + 1e-6 && best >= 0 && (I.lv || 0) > (cells.inst[best].lv || 0))) { bd = d; best = i; } });   // bij gelijke afstand de bovenste
    if (best < 0) return false;
    const I = cells.inst.splice(best, 1)[0], m = I.m; removeInst(I);
    buildTriNet(); buildPathNet(); buildEdgeNet(); buildModNet(); changed(); toast('"' + m.name + '" weggehaald', 1200); return true;
  }
  const moduleGhost = new THREE.Group(); scene.add(moduleGhost); let moduleGhostKey = '';
  function showModuleGhost(q0, r0, lv = 0) {
    const mod0 = modules[moduleSel], mod = mod0 && moduleMir && mod0.v === 2 ? (showModuleGhost.mc && showModuleGhost.mc.src === mod0 && showModuleGhost.mc.sig === mod0._sig ? showModuleGhost.mc.m : (showModuleGhost.mc = { src: mod0, sig: mod0._sig, m: mv2Mirror(mod0) }).m) : mod0, kk = mod ? moduleSel + ':' + moduleRot + ':' + (moduleMir ? 'm' : '') + ':' + q0 + ',' + r0 + ':' + lv + ':' + mod.edges.length + ':' + (mod.cells || []).length + ':' + (mod.paths || []).length + ':' + (mod.tris || []).length : '';
    if (kk === moduleGhostKey) { moduleGhost.visible = !!mod; return; }
    moduleGhostKey = kk;
    while (moduleGhost.children.length) { const c = moduleGhost.children.pop(); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); }); }
    if (!mod) { moduleGhost.visible = false; return; }
    if (mod.v === 2) {
      const bad = !!mv2CanPlace(mod, moduleRot, q0, r0, lv);
      for (const [q, r] of mv2Area({ m: mod, rot: moduleRot, q: q0, r: r0 })) { const w = cellToWorld(q, r), g = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.3, R - 0.3, 0.3, 6), new THREE.MeshBasicMaterial({ color: bad ? '#e0573e' : '#f2b233', transparent: true, opacity: 0.4, depthWrite: false })); g.position.set(w.x, 0.3, w.z); moduleGhost.add(g); }
      const b = mv2Build(mod, mv2Tf(moduleRot, q0, r0), [0, 0], { stacked: lv > 0 }); b.group.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: bad ? '#e0573e' : '#f2b233', transparent: true, opacity: 0.35, depthWrite: false }); o.castShadow = false; } }); moduleGhost.add(b.group);
      moduleGhost.position.y = (Number.isInteger(q0) ? gH(q0, r0) : 0) + lv * MV2.LV_H; moduleGhost.visible = true; return;
    }
    moduleGhost.position.y = 0;
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

  const MOD_COL = { dak: '#8f3f33', glas: '#9fc7de', muur: '#8a8a8a', weg: '#3c4045', pad: '#9b5a45', vloer: '#cfc6b0', gras: '#6fa356', water: '#3a7ca5' };
  function modThumb(mod, rot, px) {
    if (mod.v === 2) return mv2Thumb(mod, rot, px);
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
  function renderStrip() { if (typeof renderModCards === 'function') { try { renderModCards(); } catch (e) { /* palet bestaat nog niet */ } } }

  let openSchetsFn = null, openMakerFn = null;
  const openSchets = (m) => { if (openMakerFn) openMakerFn(m); else if (openSchetsFn) openSchetsFn(); };
  const openSchetsOld = () => { if (openSchetsFn) openSchetsFn(); };
  (() => {
(() => {
  const R = 9, SQ3 = Math.sqrt(3), PITCH = R * SQ3;
  const KINDS = [['muur', 'Muur'], ['dak', 'Dak'], ['glas', 'Glas'], ['weg', 'Weg'], ['pad', 'Pad'], ['vloer', 'Plein'], ['gras', 'Gras'], ['water', 'Water']];
  const AREAS = [[0, '1'], [1, '7'], [2, '19'], [3, '37']], FINES = [[1, '9 m'], [2, '4,5 m'], [4, '2,25 m'], [8, '1,1 m']];
  const appEl = document.getElementById('schetsApp'), css = n => getComputedStyle(appEl).getPropertyValue(n).trim();
  const S = window.__SS = { fine: 1, gl: 0, gr: 0, paths: [], pcur: null, tool: 'paint', ltype: 'weg', lay: 1, kind: 'muur', gum: false, hand: false, brush: 'hex', n: 4, k: 0, tris: new Map(), undo: [], redo: [], view: { x: 0, z: 0, s: 8 }, hover: null, editing: -1, last: null, shift: false, space: false };
  const persist = () => { saveMods(); renderStrip(); };

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
      else if (a.t === 'laan') { for (const sg of [1, -1]) { strokePath(offPts(pts, sg * 7.75), 2, '#9b5a45'); strokePath(offPts(pts, sg * 4.75), 0.12, '#f1efe6'); } strokePath(pts, 3, '#6aa84a'); }
      else { strokePath(pts, 0.1, '#f1efe6', [3 * S.view.s, 3.5 * S.view.s]); }
    }
  }
  function drawCodes() {   // randcodes langs de buitenranden: zo sluit deze module op andere aan
    if (!S.tris.size && !S.paths.length) return;
    const codes = moduleCodes(cur());
    for (const [id, code] of Object.entries(codes)) {
      if (code === 'leeg') continue;
      const [q, r, s] = id.split(',').map(Number), [cx, cz] = cellXZ(q, r), f = FRAMES[s], mx = cx + f.nx * INNER, mz = cz + f.nz * INNER;
      const a = toS(mx + f.tx * 2.2, mz + f.tz * 2.2), b = toS(mx - f.tx * 2.2, mz - f.tz * 2.2);
      ctx.strokeStyle = CODE_COL[code] || '#fff'; ctx.lineWidth = Math.max(3, 1.1 * S.view.s); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (S.view.s > 5) { const t = toS(mx + f.nx * 1.6, mz + f.nz * 1.6); ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(code, t[0], t[1]); }
    }
  }
  function drawCur() {
    if (S.tool !== 'line') return;
    if (S.vm === '2d' && S.view.s > 3) { ctx.fillStyle = 'rgba(0,0,0,.18)'; for (const a of hexAnchors()) { const q = toS(a[0], a[1]); ctx.beginPath(); ctx.arc(q[0], q[1], 2, 0, 7); ctx.fill(); } }
    for (const a of S.paths) for (const q0 of a.p) { const q = toS(q0[0], q0[1]); ctx.fillStyle = '#fff'; ctx.strokeStyle = css('--signal'); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], 3.5, 0, 7); ctx.fill(); ctx.stroke(); }
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
    for (const id of S.tris.keys()) {
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
    drawCodes();
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
  // wegen tekenen: gladde lijnen die vastklikken op het zeshoekraster (midden van een vak, midden van een rand,
  // hoekpunt), zodat een weg uit een module precies aansluit op de wegen ernaast
  function hexAnchors() {
    if (S._anch && S._anch.k === S.k) return S._anch.list;
    const list = [], seen = new Set(), add = (x, z) => { const k = Math.round(x * 20) + ',' + Math.round(z * 20); if (!seen.has(k)) { seen.add(k); list.push([Math.round(x * 100) / 100, Math.round(z * 100) / 100]); } };
    for (let q = -S.k; q <= S.k; q++) for (let r = -S.k; r <= S.k; r++) {
      if (hexDist(q, r) > S.k) continue;
      const [cx, cz] = cellXZ(q, r); add(cx, cz);
      for (let n = 0; n < 6; n++) { const a = Math.PI / 6 + n * Math.PI / 3, b = a + Math.PI / 3, vx = cx + Math.cos(a) * R, vz = cz + Math.sin(a) * R; add(vx, vz); add((vx + cx + Math.cos(b) * R) / 2, (vz + cz + Math.sin(b) * R) / 2); }
    }
    S._anch = { k: S.k, list }; return list;
  }
  const snapPt = w => { let best = null, bd = 1e9; for (const p of hexAnchors()) { const d = Math.hypot(p[0] - w[0], p[1] - w[1]); if (d < bd) { bd = d; best = p; } } return best && bd < R * 0.6 ? best.slice() : null; };
  // een punt van een bestaande weg onder de muis (om te verslepen)
  function pathPtAt(w) { const tol = Math.max(0.8, 10 / S.view.s); for (let i = S.paths.length - 1; i >= 0; i--) for (let j = 0; j < S.paths[i].p.length; j++) { const q = S.paths[i].p[j]; if (Math.hypot(q[0] - w[0], q[1] - w[1]) < tol) return { i, j }; } return null; }
  let dragPt = null, drawMoved = false;
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
    if (!S.pcur) { const hit = pathPtAt(w); if (hit) { snap(); dragPt = hit; mode = 'dragpt'; draw(); return; } }   // punt verslepen
    const q = snapPt(w); if (!q) return;
    if (!S.pcur) S.pcur = [];
    const l = S.pcur[S.pcur.length - 1];
    if (l && Math.hypot(l[0] - q[0], l[1] - q[1]) < 0.01) { lineFinish(); return; }
    S.pcur.push(q); mode = 'drawline'; drawMoved = false; sync(); draw();
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
    else if (mode === 'drawline') {   // slepen: elk nieuw rasterpunt onder de muis wordt een punt van de weg
      const w = toW(p[0], p[1]), q = snapPt(w), l = S.pcur && S.pcur[S.pcur.length - 1];
      if (q && l && Math.hypot(l[0] - q[0], l[1] - q[1]) > 0.01) { S.pcur.push(q); drawMoved = true; sync(); }
    }
    else if (mode === 'dragpt' && dragPt) { const w = toW(p[0], p[1]), q = snapPt(w) || [Math.round(w[0] * 100) / 100, Math.round(w[1] * 100) / 100]; S.paths[dragPt.i].p[dragPt.j] = q; }
    else if (mode === 'paint') { const n = Math.max(1, Math.ceil(Math.hypot(p[0] - last[0], p[1] - last[1]) / 4)); for (let i = 1; i <= n; i++) { const w = toW(last[0] + (p[0] - last[0]) * i / n, last[1] + (p[1] - last[1]) * i / n); setCells(brushList(w[0], w[1])); S.last = w; } last = p; counts(); }
    const [x, z] = toW(p[0], p[1]); $('readout').textContent = 'x ' + x.toFixed(2) + ' m   z ' + z.toFixed(2) + ' m';
    draw();
  });
  const up = e => {
    if (mode === 'line' && S.hover) { const b = toW(S.hover[0], S.hover[1]); setCells(lineCells(lineStart, b)); S.last = b; counts(); }
    if (mode === 'drawline') { mode = null; if (drawMoved && S.pcur && S.pcur.length > 1) { lineFinish(); return; } }
    if (mode === 'dragpt') { dragPt = null; counts(); }
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
  [['weg', 'Weg'], ['brd', 'Brede weg'], ['laan', 'Laan'], ['pad', 'Pad']].forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.l = k; b.textContent = label; b.onclick = () => { S.tool = 'line'; S.ltype = k; S.gum = false; S.hand = false; S.orb = false; S.pcur = null; sync(); draw(); }; $('lineRow').appendChild(b); });
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

  const cur = () => { const m = { name: ($('name').value || '').trim() || 'Module ' + (modules.length + 1), n: S.n, k: S.k, fine: S.fine ? 1 : 0, edges: [], cells: [], paths: S.paths.map(a => ({ t: a.t, l: a.l || 0, r: a.r || 0, p: a.p.map(q => q.slice()) })), tris: [...S.tris].map(([id, v]) => { const k = kindOf(v), a = [...id.split(',').map(Number), k]; if (v.includes('@')) a.push(layOf(v)); return a; }) }; m.codes = moduleCodes(m); return m; };
  function renderLib() {
    const el = $('lib'); el.innerHTML = modules.length ? '' : '<p class="hint">Nog geen modules. Teken iets en bewaar het.</p>';
    modules.forEach((m, idx) => {
      if (m.v === 2) return;   // modules van de module maker horen daar thuis
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
    try { await navigator.clipboard.writeText(text); say('Gekopieerd. Plak de code in Raatstad.'); }
    catch (e) { $('code').select(); say('Selecteer en kopieer de code hierboven.'); }
  }
  $('bCopyOne').onclick = () => { if (!S.tris.size && !S.paths.length) { say('Teken eerst iets'); return; } copy(JSON.stringify(cur())); };
  // Bestand aanbieden: in de artifact-weergave via claude.use('downloads') (de kijker bevestigt), anders een gewone download
  async function download(name, text) {
    try {
      const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null;
      if (dl) { try { await dl.save({ filename: name, data: text }); say('Bestand bewaard'); } catch (e) { say(e && e.code === 'declined' ? 'Niet bewaard' : 'Bewaren lukt hier niet; gebruik Kopieer'); } return; }
    } catch (e) { /* geen artifact-omgeving */ }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  $('bSaveOne').onclick = () => { if (!S.tris.size && !S.paths.length) { say('Teken eerst iets'); return; } const m = cur(); download(m.name.replace(/[^\w\-]+/g, '_') + '.json', JSON.stringify(m)); };
  $('bSaveAll').onclick = () => { if (!modules.length) { say('Bewaar eerst een module'); return; } download('raatstad-modules.json', JSON.stringify(modules)); };
  $('bFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; f.text().then(t => { $('code').value = t; $('bImport').click(); e.target.value = ''; }); };
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

