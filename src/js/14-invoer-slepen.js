  // ---------- Invoer ----------
  const pointers = new Map();
  let downInfo = null, pinchPrev = null;
  let joyId = null, joyOrigin = null, lookId = null;
  const joyEl = document.getElementById('joy'), knobEl = document.getElementById('knob');
  function resetPointers() {
    pointers.clear(); downInfo = null; pinchPrev = null; joyId = null; lookId = null;
    joyVec.x = joyVec.y = 0; joyEl.classList.remove('active'); joyEl.style.left = joyEl.style.top = joyEl.style.bottom = '';
    knobEl.style.transform = '';
  }
  const pinchState = () => {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); });   // middelste knop: draaien, niet autoscrollen
  let roadHold = 0;
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    if (mode === 'walk') {
      if (e.pointerType === 'mouse') {
        if (document.pointerLockElement === canvas) {
          if (e.button === 0 && DRAG_TOOLS.has(tool)) {   // ingedrukt houden: weg of pad trekken waar je naar kijkt
            const res = pick(window.innerWidth / 2, window.innerHeight / 2);
            if (!res) return toast('Richt het puntje op de grond of een blok binnen 30 m');
            const st = stackOf(res.place[0], res.place[1]);
            if (st.length && baseOf(st[st.length - 1]) === toolBase(tool)) { place(res.place[0], res.place[1]); return; }
            roadDragStart(res.place); return;
          }
          walkAction(e.button === 2); return;
        }
        if (canvas.requestPointerLock) {
          try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
        }
        lookId = e.pointerId; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      } else if (e.clientX < window.innerWidth / 2 && joyId === null) {
        joyId = e.pointerId; joyOrigin = { x: e.clientX, y: e.clientY };
        joyEl.classList.add('active');
        joyEl.style.left = e.clientX + 'px'; joyEl.style.top = (e.clientY - 120) + 'px'; joyEl.style.bottom = 'auto';
      } else if (lookId === null) {
        lookId = e.pointerId; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      return;
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, panMode: e.button === 2 || e.shiftKey, right: e.button === 2,
        rotate: e.button === 1 || e.altKey,
        road: (DRAG_TOOLS.has(tool) || EDGE_TOOLS.has(tool) || lineModSel()) && e.button === 0 && !e.shiftKey && !e.altKey && e.pointerType === 'mouse' };
      // touchscreen: even stil vasthouden met een weg of pad gekozen, dan slepen trekt er een
      if (DRAG_TOOLS.has(tool) && e.pointerType !== 'mouse') {
        const d0 = downInfo;
        clearTimeout(roadHold);
        roadHold = setTimeout(() => {
          if (downInfo !== d0 || d0.moved || pointers.size !== 1) return;
          d0.road = true; d0.moved = true;
          roadDragStart(groundCellAt(d0.x, d0.y));
          toast(tool === 'weg' ? 'Sleep om de weg te trekken' : 'Sleep om te trekken', 1200);
        }, 320);
      }
    }
    else { downInfo && (downInfo.moved = true); pinchPrev = pinchState(); }
  });
  canvas.addEventListener('pointermove', e => {
    if (mode === 'walk') {
      if (e.pointerId === joyId) {
        let dx = e.clientX - joyOrigin.x, dy = e.clientY - joyOrigin.y;
        const l = Math.hypot(dx, dy), max = 48;
        if (l > max) { dx *= max / l; dy *= max / l; }
        joyVec.x = dx / max; joyVec.y = dy / max;
        knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (e.pointerId === lookId && !document.pointerLockElement) {
        const p = pointers.get(e.pointerId); if (!p) return;
        const s = e.pointerType === 'mouse' ? 0.004 : 0.006;
        player.yaw -= (e.clientX - p.x) * s;
        player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - (e.clientY - p.y) * s));
        p.x = e.clientX; p.y = e.clientY;
      }
      return;
    }
    const p = pointers.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse') updateGhost(e.clientX, e.clientY); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1 && downInfo) {
      if (!downInfo.moved && Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 7) downInfo.moved = true;
      if (!downInfo.moved) return;
      ghost.visible = false; ghostArrow.visible = false; pendingKey = null;
      if (downInfo.road) {
        if (EDGE_TOOLS.has(tool)) { edgePaintAt(e.clientX, e.clientY); return; }
        if (!roadDrag.on) { roadDrag.pt = groundPointAt(downInfo.x, downInfo.y); roadDragStart(groundCellAt(downInfo.x, downInfo.y)); }
        roadDrag.pt = groundPointAt(e.clientX, e.clientY);
        roadPaintTo(groundCellAt(e.clientX, e.clientY));
        return;
      }
      if (downInfo.panMode && !downInfo.rotate) pan(dx, dy);
      else {
        orbit.theta -= dx * 0.0075;
        orbit.phi = Math.max(0.18, Math.min(1.42, orbit.phi - dy * 0.006));
      }
      applyOrbit();
    } else if (pointers.size === 2 && pinchPrev) {
      const now = pinchState();
      if (now.d > 0 && pinchPrev.d > 0) zoom(pinchPrev.d / now.d);
      pan(now.mx - pinchPrev.mx, now.my - pinchPrev.my);
      pinchPrev = now; applyOrbit();
    }
  });
  function endPointer(e) {
    if (mode === 'walk') {
      if (roadDrag.on && e.pointerType === 'mouse') roadDragEnd();
      if (e.pointerId === joyId) { joyId = null; joyVec.x = joyVec.y = 0; joyEl.classList.remove('active'); joyEl.style.left = joyEl.style.top = joyEl.style.bottom = ''; knobEl.style.transform = ''; }
      if (e.pointerId === lookId) lookId = null;
      pointers.delete(e.pointerId);
      return;
    }
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    clearTimeout(roadHold);
    if (roadDrag.on) { roadDragEnd(); if (downInfo) downInfo.moved = true; }
    if (e.type === 'pointerup' && wasSingle && downInfo && !downInfo.moved && !downInfo.rotate && performance.now() - downInfo.t < 600) {
      if (downInfo.right) eraseAt(e.clientX, e.clientY); else handleTap(e.clientX, e.clientY);
    }
    if (pointers.size < 2) pinchPrev = null;
    if (pointers.size === 0) downInfo = null;
    else if (pointers.size === 1) { const [p] = pointers.values(); downInfo = { x: p.x, y: p.y, t: 0, moved: true, panMode: false }; }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !pointers.size) ghost.visible = false; });
  // Scrollwiel: tijdens het lopen wissel je van blok; in bouwmodus zoom je, met Shift wissel je
  let wheelAcc = 0, wheelT = 0;
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const d = e.deltaY || e.deltaX;   // Shift+wiel geeft in sommige browsers deltaX
    if (mode === 'walk' || e.shiftKey) {
      wheelAcc += d;
      const now = performance.now();
      if (Math.abs(wheelAcc) < 40 || now - wheelT < 90) return;   // touchpads geven veel kleine stapjes
      cycleTool(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; wheelT = now;
      if (mode === 'build') updateGhost(e.clientX, e.clientY);
      return;
    }
    zoom(1 + Math.max(-0.3, Math.min(0.3, e.deltaY * 0.0012)));
    applyOrbit(); updateGhost(e.clientX, e.clientY);
  }, { passive: false });

  document.addEventListener('mousemove', e => {
    if (mode !== 'walk' || document.pointerLockElement !== canvas) return;
    player.yaw -= e.movementX * 0.0022;
    player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * 0.0022));
  });
  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('button') && (e.code === 'Space' || e.code === 'Enter')) return;
    keys[e.code] = true;
    if (mode === 'walk' && e.code === 'Space') { e.preventDefault(); jump(); }
    const n = parseInt(e.key, 10);
    if (e.code === 'KeyR') { e.shiftKey ? resetRotation() : rotateDir(); return; }
    const inCat = CATS[catIdx].tools;
    if (n >= 1 && n <= inCat.length) selectTool(inCat[n - 1]);
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.getElementById('jumpBtn').addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  // Bouwen tijdens het lopen: wat in het midden van het beeld ligt
  function walkAction(erase) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2, res = pick(cx, cy);
    if (!res) return toast('Richt het puntje op de grond of een blok binnen 30 m');
    lastPickRes = res;
    if (erase || tool === 'gum') { if (eraseModuleAt(res) || eraseEdgeAt(res) || erasePathAt(res) || eraseTriAt(res)) return; if (res.erase) removeTop(res.erase[0], res.erase[1]); else toast('Hier valt niets weg te halen'); }
    else place(res.place[0], res.place[1]);
  }
  // ---------- Weg trekken: linkermuisknop ingedrukt houden en slepen ----------
  // Elk vak waar je overheen sleept wordt weg (ook als je snel beweegt: de vakken ertussen worden ingevuld).
  // Waar geen weg mag komen wordt stil overgeslagen; bestaande wegen blijven gewoon liggen.
  // Alles wat een lijn vormt kun je trekken: wegen, paden, looppaden, tunnels en grachten
  const DRAG_TOOLS = new Set(['weg', 'laan', 'pad', 'fietspad', 'kuil', 'heuvel', 'looppad', 'tunnel', 'water', 'vweg', 'vbrd', 'vlaan']);
  const roadDrag = { on: false, last: null, count: 0, tool: 'weg' };
  let roadHintShown = false, dakHintShown = false, padHintShown = false, laanHintShown = false;
  function groundCellAt(cx, cy) {
    ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const h = raycaster.intersectObject(ground, false)[0];
    return h ? worldToCell(h.point.x, h.point.z) : null;
  }
  function groundPointAt(cx, cy) {
    ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const h = raycaster.intersectObject(ground, false)[0];
    return h ? { x: h.point.x, z: h.point.z } : null;
  }
  function hexLine(a, b) {
    const A = cellToWorld(a[0], a[1]), B = cellToWorld(b[0], b[1]), n = hexDist(b[0] - a[0], b[1] - a[1]), out = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      out.push(worldToCell(A.x + (B.x - A.x) * t + 1e-3, A.z + (B.z - A.z) * t + 1e-3));
    }
    return out;
  }
  // Laan trekken: langs één van de drie rechte richtingen vanaf waar je begon
  function laanPaintTo(cell) {
    const D = roadDrag;
    if (!D.lstart) { D.lstart = cell; D.la = null; return; }
    const A = cellToWorld(D.lstart[0], D.lstart[1]), B = cellToWorld(cell[0], cell[1]), vx = B.x - A.x, vz = B.z - A.z;
    if (Math.hypot(vx, vz) < 1) return;
    if (D.la === null) {
      if (manualDir !== null) D.la = manualDir % 3;
      else { let best = 0, bd = -1; for (let a = 0; a < 3; a++) { const u = LAAN_G[a].u, dd = Math.abs(vx * u[0] + vz * u[1]); if (dd > bd) { bd = dd; best = a; } } D.la = best; }
      D.ls = laanSideFor(D.la, D.lstart[0], D.lstart[1]); D.lk = new Set();
    }
    const u = LAAN_G[D.la].u, k = Math.round((vx * u[0] + vz * u[1]) / LAAN_PITCH), step = NEIGH[D.la], list = [];
    for (let j = Math.min(0, k); j <= Math.max(0, k); j++) if (!D.lk.has(j)) { D.lk.add(j); list.push([D.lstart[0] + step[0] * j, D.lstart[1] + step[1] * j]); }
    if (!list.length) return;
    const res = placeLaan(list, D.la, D.ls);
    D.count += list.length - res.skipped; D.skip += res.skipped;
  }
  // Lijnmodule (een module met precies één weg of pad): sleep van vak naar vak en de weg vormt zich
  const isLineMod = m => !!m && (m.paths || []).length === 1 && !(m.edges || []).length && !(m.cells || []).length && !(m.tris || []).length;
  // Tegelmodule (een hexagon met een weg van rand naar rand, getekend met driehoeken): slepen zet er één per vak neer, gedraaid in de looprichting
  const isStampMod = m => !!m && m.k === 0 && (m.tris || []).some(t => t[3] === 'weg') && !(m.paths || []).length && !(m.cells || []).length && !(m.edges || []).length;
  const lineModSel = () => tool === 'module' && (isLineMod(modules[moduleSel]) || isStampMod(modules[moduleSel]));
  const cenOf = t => [(t.v[0] + t.v[2] + t.v[4]) / 3, (t.v[1] + t.v[3] + t.v[5]) / 3];
  function stampAxis(mod) {   // tussen welke twee tegenover elkaar liggende randen loopt de weg? (een van de drie buurrichtingen)
    const T = triWorld(mod, 0, 0, 0).filter(t => t.k === 'weg'); if (!T.length) return 0;
    const cnt = [0, 0, 0, 0, 0, 0], half = R * Math.sqrt(3) / 2;
    for (const t of T) { const c = cenOf(t); for (let k = 0; k < 6; k++) { const w = cellToWorld(NEIGH[k][0], NEIGH[k][1]), l = Math.hypot(w.x, w.z), u = [w.x / l, w.z / l]; if (half - (c[0] * u[0] + c[1] * u[1]) < 2.6) cnt[k]++; } }
    let best = 0, bs = -1; for (let k = 0; k < 3; k++) { const sc = Math.min(cnt[k], cnt[k + 3]); if (sc > bs) { bs = sc; best = k; } }
    return best;
  }
  const dirIdx = (a, b) => NEIGH.findIndex(n => n[0] === b[0] - a[0] && n[1] === b[1] - a[1]);
  function stampTris(mod, C) {   // alle tegels langs de reeks vakken C; bij een bocht twee gedraaide helften
    const ax = stampAxis(mod), out = [];
    for (let i = 0; i < C.length; i++) {
      const [q, r] = C[i], kin = i > 0 ? dirIdx(C[i - 1], C[i]) : (C.length > 1 ? dirIdx(C[0], C[1]) : ax), kout = i < C.length - 1 ? dirIdx(C[i], C[i + 1]) : kin;
      const ki = kin < 0 ? ax : kin, ko = kout < 0 ? ki : kout, c0 = cellToWorld(q, r);
      if (ki === ko || (ki + 3) % 6 === ko) { out.push(...triWorld(mod, ((ki - ax) % 6 + 6) % 6, q, r)); continue; }
      const dv = k => { const w = cellToWorld(q + NEIGH[k][0], r + NEIGH[k][1]); return [w.x - c0.x, w.z - c0.z]; }, di = dv(ki), dout = dv(ko);
      for (const t of triWorld(mod, ((ki - ax) % 6 + 6) % 6, q, r)) { const [x, z] = cenOf(t); if ((x - c0.x) * di[0] + (z - c0.z) * di[1] <= 1e-6) out.push(t); }
      for (const t of triWorld(mod, ((ko - ax) % 6 + 6) % 6, q, r)) { const [x, z] = cenOf(t); if ((x - c0.x) * dout[0] + (z - c0.z) * dout[1] > 1e-6) out.push(t); }
    }
    return out;
  }
  // Fijn slepen: tegels achter elkaar langs de richting van de weg, ook tussen tegels in; de richting volgt je muis
  function stampAngle(mod) {   // hoek van de weg in de tegel, op 30° afgerond
    const T = triWorld(mod, 0, 0, 0).filter(t => t.k === 'weg'); if (!T.length) return 0;
    let sx = 0, sz = 0, sxx = 0, szz = 0, sxz = 0; for (const t of T) { const [x, z] = cenOf(t); sx += x; sz += z; } sx /= T.length; sz /= T.length;
    for (const t of T) { const [x, z] = cenOf(t); sxx += (x - sx) ** 2; szz += (z - sz) ** 2; sxz += (x - sx) * (z - sz); }
    return Math.round(0.5 * Math.atan2(2 * sxz, sxx - szz) / (Math.PI / 6));
  }
  function finePaintTo(cell) {
    const D = roadDrag, pt = D.pt; if (!pt) return;
    if (!D.sp) { const mod = modules[moduleSel], a = modAnchor(mod, pt, cell); D.sp = { mod, fine: true, a0: a, tris: [], n: 0, rot: moduleRot, a30: stampAngle(mod) }; }
    const sp = D.sp, s0 = cellToWorld(sp.a0[0], sp.a0[1]), v = [pt.x - s0.x, pt.z - s0.z], pitch = sp.a30 % 2 === 0 ? R * SQ3 : 2 * R, th0 = sp.a30 * Math.PI / 6;
    let best = sp.rot, bd = -1e9;
    if (Math.hypot(v[0], v[1]) > pitch * 0.5) for (let r = 0; r < 6; r++) { const a = th0 - r * Math.PI / 3, d = v[0] * Math.cos(a) + v[1] * Math.sin(a); if (d > bd) { bd = d; best = r; } }
    const a = th0 - best * Math.PI / 3, n = Math.max(0, Math.round((v[0] * Math.cos(a) + v[1] * Math.sin(a)) / pitch)), list = [];
    for (let j = 0; j <= n; j++) { const x = s0.x + Math.cos(a) * pitch * j, z = s0.z + Math.sin(a) * pitch * j, r = z / (1.5 * R); list.push([x / (R * SQ3) - r / 2, r]); }
    const old = new Set(sp.tris); cells.tris = trisOf().filter(t => !old.has(t)); sp.tris = []; sp.rot = best; sp.n = n;
    for (const [q, r] of list) sp.tris.push(...triWorld(sp.mod, best, q, r));
    cells.tris.push(...sp.tris); buildTriNet(); D.count = n + 1;
  }
  function stampPaintTo(cell) {
    const D = roadDrag; if (!cell) return;
    if (!D.sp) D.sp = { mod: modules[moduleSel], C: [], tris: [] };
    const sp = D.sp, L = D.last; if (L && L[0] === cell[0] && L[1] === cell[1]) return;
    const todo = L ? hexLine(L, cell) : [cell]; D.last = cell;
    for (const c of todo) { const l = sp.C[sp.C.length - 1]; if (!l || l[0] !== c[0] || l[1] !== c[1]) sp.C.push(c); }
    const T = trisOf(), old = new Set(sp.tris); cells.tris = T.filter(t => !old.has(t)); sp.tris = stampTris(sp.mod, sp.C); cells.tris.push(...sp.tris);
    buildTriNet(); D.count = sp.C.length;
  }
  function stampEnd() {
    const D = roadDrag, sp = D.sp; D.sp = null; if (!sp) return;
    if (sp.fine) {
      if (sp.n < 1) { const old = new Set(sp.tris); cells.tris = trisOf().filter(t => !old.has(t)); buildTriNet(); placeModule(sp.a0[0], sp.a0[1]); return; }
      (cells.inst || (cells.inst = [])).push({ m: { name: sp.mod.name + ' (gesleept)', n: 2, edges: [], cells: [], paths: [], tris: [] }, q: sp.a0[0], r: sp.a0[1], rot: 0, tw: sp.tris.map(t => ({ k: t.k, v: t.v, h: t.h })) });
      changed(); toast(sp.n + 1 + ' tegels geplaatst', 1400); return;
    }
    if (sp.C.length < 2) { const old = new Set(sp.tris); cells.tris = trisOf().filter(t => !old.has(t)); buildTriNet(); placeModule(sp.C[0][0], sp.C[0][1]); return; }
    (cells.inst || (cells.inst = [])).push({ m: { name: sp.mod.name + ' (gesleept)', n: 2, edges: [], cells: [], paths: [], tris: [] }, q: sp.C[0][0], r: sp.C[0][1], rot: 0, tw: sp.tris.map(t => ({ k: t.k, v: t.v, h: t.h })) });
    changed(); toast(sp.C.length + ' vakken aangelegd', 1400);
  }
  function linePaintTo(cell) {
    const D = roadDrag; if (!cell) return;
    if (isStampMod(modules[moduleSel])) return fineOK(modules[moduleSel]) ? finePaintTo(cell) : stampPaintTo(cell);
    if (!D.lp) { const m = modules[moduleSel]; D.lp = { t: m.paths[0].t, name: m.name, mid: m.id, start: cell, path: { t: m.paths[0].t, l: m.paths[0].l || 0, r: m.paths[0].r || 0, p: [] } }; pathsOf().push(D.lp.path); }
    const L = D.last; if (L && L[0] === cell[0] && L[1] === cell[1]) return;
    const todo = L ? hexLine(L, cell) : [cell]; D.last = cell;
    for (const [q, r] of todo) { const w = cellToWorld(q, r), pt = [Math.round(w.x * 100) / 100, Math.round(w.z * 100) / 100], P = D.lp.path.p, l = P[P.length - 1]; if (!l || Math.hypot(l[0] - pt[0], l[1] - pt[1]) > 0.5) P.push(pt); }
    if (D.lp.path.p.length > 1) { buildPathNet(); D.count = D.lp.path.p.length; }
  }
  function lineDragEnd() {
    if (roadDrag.sp) return stampEnd();
    const D = roadDrag, lp = D.lp; D.lp = null; if (!lp) return;
    const P = lp.path.p;
    if (P.length < 2) { const i = cells.paths.indexOf(lp.path); if (i >= 0) cells.paths.splice(i, 1); buildPathNet(); placeModule(lp.start[0], lp.start[1]); return; }
    const o = cellToWorld(lp.start[0], lp.start[1]);
    (cells.inst || (cells.inst = [])).push({ m: { name: lp.name + ' (gesleept)', n: 2, edges: [], cells: [], tris: [], paths: [{ t: lp.t, l: lp.path.l, r: lp.path.r, p: P.map(a => [Math.round((a[0] - o.x) * 100) / 100, Math.round((a[1] - o.z) * 100) / 100]) }] }, q: lp.start[0], r: lp.start[1], rot: 0 });
    changed(); toast(P.length + ' vakken aangelegd', 1400);
  }
  // Getekende weg trekken (Weg, Brede weg, Laan): een vrije lijn door de vakmiddens; kruisingen ontstaan vanzelf
  function vecPaintTo(cell) {
    const D = roadDrag;
    if (!D.vp) { D.vp = { t: VEC_T[D.tool], l: 0, r: 0, p: [] }; pathsOf().push(D.vp); }
    const L = D.last; if (L && L[0] === cell[0] && L[1] === cell[1]) return;
    const todo = L ? hexLine(L, cell) : [cell]; D.last = cell;
    for (const [q, r] of todo) { const w = cellToWorld(q, r), pt = [Math.round(w.x * 100) / 100, Math.round(w.z * 100) / 100], P = D.vp.p, l = P[P.length - 1]; if (!l || Math.hypot(l[0] - pt[0], l[1] - pt[1]) > 0.5) P.push(pt); }
    if (D.vp.p.length > 1) { buildPathNet(); D.count = D.vp.p.length; }
  }
  function vecDragEnd() {
    const D = roadDrag, vp = D.vp; D.vp = null; if (!vp) return;
    if (vp.p.length < 2) { const i = cells.paths.indexOf(vp); if (i >= 0) cells.paths.splice(i, 1); buildPathNet(); toast('Sleep van vak naar vak om een ' + TYPES[D.tool].name.toLowerCase() + ' te trekken', 1600); return; }
    changed(); toast(TYPES[D.tool].name + ' aangelegd, ' + vp.p.length + ' vakken lang', 1400);
  }
  function roadPaintTo(cell) {
    if (!cell) return;
    if (VEC_TOOLS.has(roadDrag.tool)) return vecPaintTo(cell);
    if (roadDrag.tool === 'module') return linePaintTo(cell);
    if (roadDrag.tool === 'laan') return laanPaintTo(cell);
    const L = roadDrag.last;
    if (L && L[0] === cell[0] && L[1] === cell[1]) return;
    const todo = L ? hexLine(L, cell) : [cell];
    roadDrag.last = cell;
    const placed = [];
    for (const [q, r] of todo) {
      const st = stackOf(q, r), top = st[st.length - 1];
      const T = roadDrag.tool;
      if (top && baseOf(top) === toolBase(T)) continue;
      if (canPlace(q, r, T)) continue;
      const y0 = columnTop(q, r);
      cells.set(key(q, r), st.concat(itemsFor(q, r, T, 0)));
      placed.push([q, r, y0]);
    }
    if (!placed.length) return;
    for (const [q, r] of placed) rebuildAround(q, r);
    for (const [q, r, y0] of placed) people.onPlaced(q, r, y0, columnTop(q, r));
    roadDrag.count += placed.length;
    changed();
    if (roadDrag.tool === 'weg') laanArmHint(placed);
  }
  function roadDragStart(cell) { roadDrag.on = true; roadDrag.last = null; roadDrag.count = 0; roadDrag.skip = 0; roadDrag.lstart = null; roadDrag.lp = null; roadDrag.sp = null; roadDrag.vp = null; roadDrag.tool = tool; ghost.visible = false; ghostArrow.visible = false; previewGroup.visible = false; roadPaintTo(cell); }
  function roadDragEnd() {
    if (!roadDrag.on) return;
    roadDrag.on = false; roadDrag.last = null;
    if (VEC_TOOLS.has(roadDrag.tool)) return vecDragEnd();
    if (roadDrag.tool === 'module') return lineDragEnd();
    if (roadDrag.tool === 'laan') {
      const st0 = roadDrag.lstart;
      if (!roadDrag.count && !roadDrag.skip && st0) { place(st0[0], st0[1]); return; }   // niet echt gesleept: één stukje laan
      if (roadDrag.count > 0) toast(`Laan aangelegd, ${roadDrag.count} ${roadDrag.count === 1 ? 'vak' : 'vakken'} lang${roadDrag.skip ? ` · ${roadDrag.skip} overgeslagen waar al iets stond` : ''}`, 1800);
      else if (roadDrag.skip) toast('Hier past geen laan: er staat al iets op de plek van een van de twee rijen');
      return;
    }
    const what = { weg: 'weg', pad: 'pad', fietspad: 'fietspad', kuil: 'uitgraving', heuvel: 'verhoging', looppad: 'looppad', tunnel: 'tunnel', water: 'gracht' }[roadDrag.tool] || 'blokken';
    if (roadDrag.count > 1) toast(`${roadDrag.count} vakken ${what} aangelegd`, 1400);
  }
  const placeBtn = document.getElementById('placeBtn');
  placeBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); walkAction(false); });

