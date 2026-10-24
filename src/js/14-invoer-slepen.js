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
          if (e.button === 0 && DRAG_TOOLS.has(tool) && hand === 'bouwen') {   // ingedrukt houden: weg of pad trekken waar je naar kijkt
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
      const terrT = TERR_TOOLS.has(tool) && (e.button === 0 || e.button === 2) && !e.altKey;   // terrein: links én rechts boetseren (rechts andersom), schuiven met het wiel/middelste knop
      downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, panMode: (e.button === 2 && !terrT) || (e.shiftKey && !terrT), right: e.button === 2,
        rotate: e.button === 1 || e.altKey,
        road: (DRAG_TOOLS.has(tool) || EDGE_TOOLS.has(tool) || lineModSel()) && e.button === 0 && !e.shiftKey && !e.altKey && e.pointerType === 'mouse' };
      if (terrT && e.pointerType === 'mouse') { downInfo.sculpt = sculptStart(e.clientX, e.clientY, e.shiftKey || e.button === 2); downInfo.moved = true; }   // terrein: meteen boetseren
      if (terrT && e.pointerType !== 'mouse') {   // touchscreen: even vasthouden, dan boetseren
        const d0 = downInfo; clearTimeout(roadHold);
        roadHold = setTimeout(() => { if (downInfo !== d0 || d0.moved || pointers.size !== 1) return; d0.moved = true; d0.sculpt = sculptStart(d0.x, d0.y, false); }, 320);
      }
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
    if (pointers.size === 1 && downInfo && downInfo.sculpt) { sculptMove(e.clientX, e.clientY); updateGhost(e.clientX, e.clientY); return; }
    if (pointers.size === 1 && downInfo) {
      if (!downInfo.moved && Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 7) downInfo.moved = true;
      if (!downInfo.moved) return;
      ghost.visible = false; ghostArrow.visible = false; pendingKey = null;
      if (downInfo.road) {
        if (EDGE_TOOLS.has(tool)) { edgePaintAt(e.clientX, e.clientY); return; }
        if (!roadDrag.on) { roadDrag.pt = groundPointAt(downInfo.x, downInfo.y); roadDragStart(groundCellAt(downInfo.x, downInfo.y)); }
        roadDrag.pt = groundPointAt(e.clientX, e.clientY);
        roadPaintTo(groundCellAt(e.clientX, e.clientY));
        if (!roadDrag.vmoveP || Math.hypot(e.clientX - roadDrag.vmoveP[0], e.clientY - roadDrag.vmoveP[1]) > 4) { roadDrag.vmoveP = [e.clientX, e.clientY]; roadDrag.vmoveT = performance.now(); }   // ná het tekenen: stilstaan telt pas vanaf dan
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
    if (SC.on) { sculptEnd(); if (downInfo) downInfo.moved = true; }
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
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !pointers.size) { ghost.visible = false; brushRing.hide(); terrLbl.hidden = true; } });
  // Scrollwiel: tijdens het lopen wissel je van blok; in bouwmodus zoom je, met Shift wissel je
  let wheelAcc = 0, wheelT = 0;
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const d = e.deltaY || e.deltaX;   // Shift+wiel geeft in sommige browsers deltaX
    if (roadDrag.on && roadDrag.vp) { wheelAcc += d; const now = performance.now(); if (Math.abs(wheelAcc) < 40 || now - wheelT < 120) return; roadHeightStep(wheelAcc < 0 ? 1 : -1); wheelAcc = 0; wheelT = now; return; }   // tijdens het slepen van een weg: hoger of lager
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
  const mmApp = document.getElementById('mmApp');
  window.addEventListener('keydown', e => {
    if (mmApp && !mmApp.hidden) return;   // de module maker heeft zijn eigen toetsen
    if (e.target.closest && e.target.closest('button') && (e.code === 'Space' || e.code === 'Enter')) return;
    keys[e.code] = true;
    if (mode === 'walk' && e.code === 'Space') { e.preventDefault(); jump(); }
    const n = parseInt(e.key, 10);
    if (roadDrag.on && roadDrag.vp && ['KeyE', 'KeyQ', 'PageUp', 'PageDown', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'].includes(e.code)) { e.preventDefault(); roadHeightStep(['KeyE', 'PageUp', 'Equal', 'NumpadAdd'].includes(e.code) ? 1 : -1); return; }
    if (mode === 'walk' && e.code === 'KeyQ') { const H = ['kijken', 'bouwen', 'hamer']; setHand(H[(H.indexOf(hand) + 1) % 3]); toast(hand === 'kijken' ? 'Kijken' : hand === 'bouwen' ? 'Bouwen: ' + (TYPES[toolBase(tool)] ? TYPES[toolBase(tool)].name : tool) : 'Hamer: klik om te slopen', 1200); return; }
    if (e.code === 'KeyR') { e.shiftKey ? resetRotation() : rotateDir(); return; }
    if (e.code === 'KeyF' && mode === 'build' && tool === 'module') { toggleMirror(); return; }
    if (n >= 1 && n <= 9 && !e.ctrlKey && !e.metaKey && !e.altKey) hotSelect(n - 1);   // snelbalk (15d)
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.getElementById('jumpBtn').addEventListener('pointerdown', e => { e.preventDefault(); jump(); });
  // Bouwen tijdens het lopen: wat in het midden van het beeld ligt
  let handHintT = 0;
  function walkAction(erase) {
    if (hand === 'kijken') { if (performance.now() - handHintT > 2500) { handHintT = performance.now(); toast('Je kijkt alleen · kies linksonder bouwen of de hamer (Q)', 1800); } return; }
    if (hand === 'bouwen' && erase) { toast('Pak de hamer om te slopen (Q)', 1400); return; }
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2, res = pick(cx, cy);
    if (!res) return toast('Richt het puntje op de grond of een blok binnen 30 m');
    lastPickRes = res;
    if (hand === 'hamer' || tool === 'gum') {
      swingHand();
      if (eraseModuleAt(res) || eraseEdgeAt(res) || erasePathAt(res) || eraseTriAt(res)) { sound.impact(1.2, res.point.x, res.point.y, res.point.z, false); return; }
      if (res.erase) { removeTop(res.erase[0], res.erase[1]); sound.impact(1.2, res.point.x, res.point.y, res.point.z, false); } else toast('Hier valt niets weg te halen');
    }
    else { swingHand(); place(res.place[0], res.place[1]); }
  }
  // ---------- Weg trekken: linkermuisknop ingedrukt houden en slepen ----------
  // Elk vak waar je overheen sleept wordt weg (ook als je snel beweegt: de vakken ertussen worden ingevuld).
  // Waar geen weg mag komen wordt stil overgeslagen; bestaande wegen blijven gewoon liggen.
  // Alles wat een lijn vormt kun je trekken: wegen, paden, looppaden, tunnels en grachten
  const DRAG_TOOLS = new Set(['pad', 'fietspad', 'kuil', 'heuvel', 'looppad', 'tunnel', 'water', 'vweg', 'vbrd', 'vlaan', 'vsnel', 'vklink', 'vfiets']);
  const roadDrag = { on: false, last: null, count: 0, tool: 'weg' };
  let frameMs = 16;
  let dakHintShown = false, padHintShown = false;
  // Waar wijs je naar op de grond? Ook op een heuvel: eerst het terrein (en wegen), anders het grondvlak
  function groundHit(cx, cy) {
    ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const objs = pathGroup ? [ground, terrGroup, blocks, pathGroup] : [ground, terrGroup, blocks];
    return raycaster.intersectObjects(objs, true)[0] || null;
  }
  function groundCellAt(cx, cy) { const h = groundHit(cx, cy); return h ? worldToCell(h.point.x, h.point.z) : null; }
  function groundPointAt(cx, cy) { const h = groundHit(cx, cy); return h ? { x: h.point.x, z: h.point.z } : null; }
  function hexLine(a, b) {
    const A = cellToWorld(a[0], a[1]), B = cellToWorld(b[0], b[1]), n = hexDist(b[0] - a[0], b[1] - a[1]), out = [];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      out.push(worldToCell(A.x + (B.x - A.x) * t + 1e-3, A.z + (B.z - A.z) * t + 1e-3));
    }
    return out;
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
  // Indrukken is het beginpunt, loslaten het eindpunt: de weg is altijd een rechte lijn daartussen (ook op een
  // touchscreen makkelijk). Een bocht maak je door een tweede weg vanaf het eindpunt te trekken; die sluit vanzelf aan.
  function vecPaintTo(cell) {
    const D = roadDrag;
    if (!D.vp) { D.vp = { t: VEC_T[D.tool], l: 0, r: 0, p: [] }; D.vstart = cell; D.vcorners = []; D.voffs = []; D.voff0 = 0; D.voff = 0; pathsOf().push(D.vp); showDragH(true); }
    const L = D.last; if (L && L[0] === cell[0] && L[1] === cell[1]) return;
    D.last = cell;
    // Even stilhouden tijdens het slepen zet een hoekpunt: daarna gaat de weg vanaf dat punt verder (een bocht in één sleep)
    clearTimeout(D.vtimer);
    const arm = ms => { D.vtimer = setTimeout(() => {
      const still = performance.now() - (D.vmoveT || 0);
      const need = Math.min(2000, 600 + Math.max(0, frameMs - 20) * 8);   // bij een trage weergave komen muisbewegingen later binnen
      if (still < need) { arm(need - still); return; }   // de muis bewoog nog (bijvoorbeeld een trage weergave): nog even wachten
      if (D.on && D.vp && D.vend && !(D.vend[0] === D.vfrom()[0] && D.vend[1] === D.vfrom()[1])) { D.vcorners.push(D.vend); D.voffs.push(D.voff); D.last = null; vecPaintTo(D.vend); toast('Hoekpunt · sleep verder voor de bocht', 1200); }
    }, ms); };
    arm(650);
    D.vfrom = () => D.vcorners.length ? D.vcorners[D.vcorners.length - 1] : D.vstart;
    const from = D.vfrom();
    // dwars door bebouwing mag: wat onder de weg komt, verdwijnt bij het loslaten (Ctrl+Z zet het terug)
    D.vend = cell;
    const W = c => { const w = cellToWorld(c[0], c[1]); return [Math.round(w.x * 100) / 100, Math.round(w.z * 100) / 100]; };
    const same = cell[0] === from[0] && cell[1] === from[1];
    D.vp.core = [D.vstart, ...D.vcorners, ...(same ? [] : [cell])].map(W); D.vp.p = D.vp.core.length > 1 ? vecExtend(D.vp.core, false) : D.vp.core;
    { const ys = [D.voff0, ...D.voffs, ...(same ? [] : [D.voff])]; if (ys.some(v => v)) D.vp.y = D.vp.p.length > ys.length ? [ys[0], ...ys, ys[ys.length - 1]] : ys; else delete D.vp.y; }   // ophoging per punt (m boven het terrein)
    if (D.vp.p.length < 2) D.vp.p = [];
    D.count = 0; for (let i = 1; i < D.vp.p.length; i++) D.count += 1;
    { const pts = [D.vstart, ...D.vcorners, ...(same ? [] : [cell])]; D.count = pts.length < 2 ? 0 : 1 + pts.slice(1).reduce((n, c, i) => n + hexDist(c[0] - pts[i][0], c[1] - pts[i][1]), 0); }
    buildPathNet(true);
  }
  // Tijdens het slepen van een weg: hoger of lager (E/Q, Page Up/Down, + / −, scrollwiel of de knoppen ▲▼).
  // Zolang je nog op het beginvak staat, verander je het begin; daarna het punt waar je nu bent.
  const dragHEl = document.getElementById('dragH');
  function showDragH(on) { if (dragHEl) dragHEl.hidden = !on; }
  function roadHeightStep(dir) {
    const D = roadDrag; if (!D.on || !D.vp) return false;
    const atStart = !D.vend || (D.vend[0] === D.vstart[0] && D.vend[1] === D.vstart[1] && !D.vcorners.length);
    const cur = atStart ? D.voff0 : D.voff, nv = Math.max(0, Math.min(ROAD_MAX_OFF, Math.round((cur + dir * 1.5) * 2) / 2));
    if (atStart) { D.voff0 = nv; D.voff = nv; } else { D.voff = nv; const lc = D.vcorners[D.vcorners.length - 1]; if (lc && D.vend && lc[0] === D.vend[0] && lc[1] === D.vend[1]) D.voffs[D.voffs.length - 1] = nv; }   // op een hoekpunt: dat punt
    D.last = null; vecPaintTo(D.vend || D.vstart);
    toast(nv ? (atStart ? 'Begin van de weg ' : 'Weg hier ') + nv.toLocaleString('nl') + ' m boven het terrein' : (atStart ? 'Begin van de weg' : 'Weg hier') + ' op het terrein', 1100);
    return true;
  }
  if (dragHEl) dragHEl.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); roadHeightStep(+b.dataset.d); }));
  // Lijn van vakmiddens: een half vak verlengd aan beide kanten (vak vol weg), behalve waar het eind op een andere weg aansluit
  function vecExtend(core, snap, self) {
    const P = core.map(p => p.slice()), n = P.length, h = 0.15;
    const tipAt = (b, a) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [r2(b[0] + dx / L * h), r2(b[1] + dz / L * h)]; };
    let sE = false, sS = false;
    if (snap) { const e = vecSnap(P[n - 1], self), b = vecSnap(P[0], self); sE = e[0] !== P[n - 1][0] || e[1] !== P[n - 1][1]; sS = b[0] !== P[0][0] || b[1] !== P[0][1]; P[n - 1] = e; P[0] = b; }
    const out = [...(sS ? [] : [tipAt(P[0], P[1])]), ...P, ...(sE ? [] : [tipAt(P[n - 1], P[n - 2])])];
    if (self) { self.tipS = !sS; self.tipE = !sE; }
    return out;
  }
  function vecDragEnd() {
    const D = roadDrag, vp = D.vp; D.vp = null; clearTimeout(D.vtimer); showDragH(false); if (!vp) return;
    if (!vp.core || vp.core.length < 2) { const i = cells.paths.indexOf(vp); if (i >= 0) cells.paths.splice(i, 1); buildPathNet(); vecChainClick(D.vstart); return; }
    { const ex = vecExtend(vp.core, true, vp); if (vp.y) { const ys = vp.y.slice(vp.y.length > vp.core.length ? 1 : 0, vp.y.length > vp.core.length ? 1 + vp.core.length : vp.core.length); vp.y = [...(vp.tipS ? [ys[0]] : []), ...ys, ...(vp.tipE ? [ys[ys.length - 1]] : [])]; } vp.p = ex; delete vp.core; }
    const gone = vecClearUnder([vp]);
    buildPathNet(); changed(); toast(TYPES[D.tool].name + ' aangelegd, ' + D.count + ' vakken lang' + (gone ? ' · ' + gone + ' ' + (gone === 1 ? 'gebouw' : 'gebouwen') + ' weggehaald (Ctrl+Z zet terug)' : ''), gone ? 2600 : 1400);
  }
  // Wat onder een nieuwe weg staat, gaat weg: gebouwen, blokken en modules op de vakken waarvan het midden op de
  // verharding ligt. Water, een uitgraving en het terrein blijven (daar wordt de weg een brug of klimt hij).
  function vecClearUnder(P) {
    let gone = 0; const touched = [];
    for (const k of vecCoverOf(P, true)) {
      const [q, r] = k.split(',').map(Number);
      if (cells.inst && cells.inst.length) {
        const hit = cells.inst.filter(I => I.m && (I.m.v === 2 ? mv2Area(I).some(([a, b]) => a === q && b === r) : moduleCells(I.m, I.rot, I.q, I.r).some(([a, b]) => a === q && b === r)));
        for (const I of hit) { const i = cells.inst.indexOf(I); if (i >= 0) { cells.inst.splice(i, 1); removeInst(I); gone++; } }
      }
      const st = stackOf(q, r); if (!st.length) continue;
      const b0 = baseOf(st[0]), keep = (b0 === 'water' || b0 === 'kuil') ? 1 : (b0 === 'heuvel' && terrOnly(q, r)) ? st.length : 0;
      if (keep >= st.length) continue;
      if (columnTop(q, r) - (keep ? TY(st[0]).h : 0) <= 0.5 && !st.slice(keep).some(t => ['woning', 'kantoor', 'dak', 'blok', 'zuilen', 'hof', 'tunnel', 'looppad', 'trap', 'muur', 'tribune', 'helling', 'trappad', 'hofhelling'].includes(baseOf(t)))) continue;   // een pad of park onder de weg mag blijven
      const ns = st.slice(0, keep); if (ns.length) cells.set(k, ns); else cells.delete(k); gone++; touched.push([q, r]);
    }
    if (touched.length) { if (touched.length > 3) rebuildMany(touched); else for (const [q, r] of touched) rebuildAround(q, r); }
    if (gone) { buildTriNet(); buildEdgeNet(); buildModNet(); }
    return gone;
  }
  // Eén klik met een wegtool op een vak: ligt er in een buurvak een uiteinde van zo'n weg, dan loopt die door tot
  // hier; anders begint hier een stukje weg van twee vakken in je kijkrichting (R draait die)
  function vecClickPlan(cell, t) {   // wat een klik zou doen: {best: {p, end}, from, to} (ook voor het voorbeeld)
    const c = cellToWorld(cell[0], cell[1]), W = [Math.round(c.x * 100) / 100, Math.round(c.z * 100) / 100];
    let best = null, bd = 1e9;
    for (const p of pathsOf()) {
      if (p.t !== t || !p.p || p.p.length < 2 || p === vecPre.tmp) continue;
      for (const end of [0, p.p.length - 1]) { const e = p.p[end], d = Math.hypot(e[0] - c.x, e[1] - c.z); if (d < 1 || d > R * SQ3 * 1.05) continue; if (d < bd) { bd = d; best = { p, end }; } }
    }
    if (best) return { best, W, from: best.p.p[best.end], to: W };
    const k = manualDir !== null ? manualDir : viewDirIndex(), n = NEIGH[k], c2 = cellToWorld(cell[0] + n[0], cell[1] + n[1]);
    return { best: null, W, from: W, to: [Math.round(c2.x * 100) / 100, Math.round(c2.z * 100) / 100] };
  }
  // Aansluiten: een nieuw wegeinde dat dicht bij een andere weg komt, schuift naar het dichtstbijzijnde punt van die weg
  // (of naar zijn uiteinde), zodat apart getekende wegen een echte T-aansluiting of verlenging krijgen.
  function vecSnap(W, self) {
    const lim = R * SQ3 * 1.05; let best = null, bd = lim;
    for (const q of pathsOf()) {
      if (q === self || q === vecPre.tmp || !q.p || q.p.length < 2 || !PATH_DEF[q.t]) continue;
      const pts = smoothPts(q.p);
      for (let j = 0; j < pts.length - 1; j++) {
        const a = pts[j], b = pts[j + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
        const f = Math.max(0, Math.min(1, ((W[0] - a[0]) * dx + (W[1] - a[1]) * dz) / l2)), px = a[0] + dx * f, pz = a[1] + dz * f, d = Math.hypot(W[0] - px, W[1] - pz);
        if (d < bd) { bd = d; best = [px, pz]; }
      }
      for (const e of [q.p[0], q.p[q.p.length - 1]]) { const d = Math.hypot(W[0] - e[0], W[1] - e[1]); if (d < bd + 1.5 && d < lim) { bd = Math.min(bd, d); best = [e[0], e[1]]; break; } }
    }
    return best ? [Math.round(best[0] * 100) / 100, Math.round(best[1] * 100) / 100] : W;
  }
  function vecClick(cell, t) {
    if (!cell) return;
    const { best, W, to } = vecClickPlan(cell, t);
    let made;
    if (best) { const p = best.p; if (best.end === 0) { p.p.unshift(W); if (p.y) p.y.unshift(0); } else { p.p.push(W); if (p.y) p.y.push(0); } made = p; }
    else { made = { t, l: 0, r: 0, p: [W, to] }; made.p[1] = vecSnap(made.p[1], made); pathsOf().push(made); }
    const gone = vecClearUnder([made]);
    buildPathNet(); changed(); toast((best ? TYPES[tool].name + ' doorgetrokken' : TYPES[tool].name + ': klik op het volgende vak om door te trekken, of sleep') + (gone ? ' · ' + gone + ' weggehaald' : ''), 1800);
  }
  // Klikmodus voor getekende wegen (naast slepen): de eerste klik zet een knooppunt, daarna laat elke muisbeweging het
  // stuk weg van dat knooppunt naar het vak onder de muis alvast zien (echt gebouwd, als voorbeeld), en de volgende klik
  // legt het vast en maakt dát vak het nieuwe knooppunt. Zo klik je een hele weg met bochten bij elkaar. Klik op het
  // knooppunt zelf, rechts, Esc, ander gereedschap of slepen stopt. Begin je naast het uiteinde van zo'n weg, dan gaat die door.
  const vecChain = { on: false, t: null, node: null, path: null, end: -1, tmp: null, hover: null };
  const vecNodeGeo = new THREE.CylinderGeometry(R * 0.55, R * 0.55, 0.5, 6), vecNode = new THREE.Mesh(vecNodeGeo, ghostMat), vecHover = new THREE.Mesh(vecNodeGeo, ghostMat);
  for (const m of [vecNode, vecHover]) { m.visible = false; m.renderOrder = 4; m.userData.noOcc = true; scene.add(m); }
  const vecNodeAt = (m, cell) => { const c = cellToWorld(cell[0], cell[1]); m.position.set(c.x, Math.max(gH(cell[0], cell[1]), terrainHeightAt(c.x, c.z)) + 0.3, c.z); m.visible = true; };
  function vecChainTmpOff() { const C = vecChain; if (!C.tmp) return false; const i = pathsOf().indexOf(C.tmp); if (i >= 0) pathsOf().splice(i, 1); C.tmp = null; C.hover = null; return true; }
  // Eén klik vult een vak al met weg: een kort stukje (ronde kop) op die plek; de volgende klik trekt het door.
  // Zonder klik laat de hover hetzelfde stukje zien, alsof het er al ligt.
  function vecStubPts(cell) {
    const c = cellToWorld(cell[0], cell[1]), k = manualDir !== null ? manualDir : viewDirIndex(), n = NEIGH[k], d = cellToWorld(cell[0] + n[0], cell[1] + n[1]), L = Math.hypot(d.x - c.x, d.z - c.z) || 1, h = 0.15;   // een rondje op het midden van het vak (net als bij paden); vanaf daar klik je verder
    const a = [c.x - (d.x - c.x) / L * h, c.z - (d.z - c.z) / L * h], b = [c.x + (d.x - c.x) / L * h, c.z + (d.z - c.z) / L * h];
    return [a, [c.x, c.z], b].map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);
  }
  const vecPre = { tmp: null, key: '' };
  function vecPreClear() { if (!vecPre.tmp) return; const i = pathsOf().indexOf(vecPre.tmp); vecPre.tmp = null; vecPre.key = ''; if (i >= 0) { pathsOf().splice(i, 1); buildPathNet(true); } }
  function vecPreShow(cell, t, pts) {
    const kk = cell[0] + ',' + cell[1] + ',' + t + ',' + (manualDir !== null ? manualDir : viewDirIndex()) + (pts ? 'c' + pts[0] : ''); if (vecPre.tmp && vecPre.key === kk) return;
    const i = vecPre.tmp ? pathsOf().indexOf(vecPre.tmp) : -1; if (i >= 0) pathsOf().splice(i, 1);
    vecPre.tmp = { t, l: 0, r: 0, p: pts || vecStubPts(cell) }; vecPre.key = kk; pathsOf().push(vecPre.tmp); buildPathNet(true);
  }
  function vecChainEnd(quiet) {
    const C = vecChain; if (!C.on) return;
    const had = vecChainTmpOff(); vecCells.visible = false; C.on = false; C.path = null; C.node = null; vecNode.visible = false; vecHover.visible = false;
    if (had) buildPathNet();
    if (!quiet) toast('Weg klaar', 900);
  }
  function vecChainHover(cell) {   // voorbeeld: het stuk van het knooppunt naar dit vak, echt gebouwd
    const C = vecChain; if (!C.on || !cell) return;
    if (C.hover && C.hover[0] === cell[0] && C.hover[1] === cell[1]) return;
    const same = cell[0] === C.node[0] && cell[1] === C.node[1];
    vecChainTmpOff(); C.hover = cell;
    if (same) { vecHover.visible = false; buildPathNet(true); return; }
    const W = c => { const w = cellToWorld(c[0], c[1]); return [Math.round(w.x * 100) / 100, Math.round(w.z * 100) / 100]; };
    C.tmp = { t: C.t, l: 0, r: 0, p: [W(C.node), vecSnap(W(cell), C.path)] }; { const q = C.tmp.p, w = W(cell); if (q[1][0] === w[0] && q[1][1] === w[1]) { const dx = q[1][0] - q[0][0], dz = q[1][1] - q[0][1], L = Math.hypot(dx, dz) || 1; q.push([q[1][0] + dx / L * R * SQ3 / 2, q[1][1] + dz / L * R * SQ3 / 2]); } } pathsOf().push(C.tmp); showVecCells(C.t, C.tmp.p[0], C.tmp.p[1]);
    vecNodeAt(vecHover, cell); buildPathNet(true);
  }
  // Klikken werkt als bij paden: elk vak dat je aantikt wordt een stuk weg van rand tot rand. Ligt het naast het eind van een
  // weg (van dezelfde soort), dan sluit het daar op aan; anders begint er een nieuwe weg. Er is geen "knooppunt" dat je moet afsluiten.
  // Een weg heeft een staartje (half vak) voorbij zijn laatste vak, zodat het vak vol zit; dat schuift bij het doorklikken mee.
  const HALF = 0.15, r2 = v => Math.round(v * 100) / 100;
  function vecChainClick(cell) {
    const t = VEC_T[tool]; if (!cell) return;
    vecChainEnd(true); vecPreClear();
    const c = cellToWorld(cell[0], cell[1]), Wc = [r2(c.x), r2(c.z)];
    for (const q of pathsOf()) if (q.t === t && q.p && q.p.some(pt => Math.hypot(pt[0] - Wc[0], pt[1] - Wc[1]) < 3)) { toast('Hier ligt al weg', 900); return; }
    const plan = vecClickPlan(cell, t);
    let path, gone = 0, snapped = false;
    if (!plan.best) {
      path = { t, l: 0, r: 0, p: vecStubPts(cell) }; path.tipS = path.tipE = true; pathsOf().push(path);
    } else {
      path = plan.best.p; const atStart = plan.best.end === 0, P = path.p, tipOn = atStart ? path.tipS : path.tipE;
      const inner = tipOn ? (atStart ? P[1] : P[P.length - 2]) : P[atStart ? 0 : P.length - 1];
      if (Math.hypot(inner[0] - Wc[0], inner[1] - Wc[1]) < 3) { toast('Hier ligt al weg', 900); return; }
      const W = vecSnap(Wc, path); snapped = W[0] !== Wc[0] || W[1] !== Wc[1];
      if (tipOn) { if (atStart) P.shift(); else P.pop(); if (path.y) { if (atStart) path.y.shift(); else path.y.pop(); } }
      if (P.length === 2 && tipOn) {   // het beginstukje (één vak): het andere staartje draait mee richting de nieuwe klik
        const cc = atStart ? P[0] : P[1], dx = W[0] - cc[0], dz = W[1] - cc[1], L = Math.hypot(dx, dz) || 1, o = [r2(cc[0] - dx / L * HALF), r2(cc[1] - dz / L * HALF)];
        if (atStart) P[1] = o; else P[0] = o;
      }
      if (atStart) { P.unshift(W); if (path.y) path.y.unshift(0); } else { P.push(W); if (path.y) path.y.push(0); }
      const tip = () => { const a = atStart ? P[1] : P[P.length - 2], b = atStart ? P[0] : P[P.length - 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1; return [r2(b[0] + dx / L * HALF), r2(b[1] + dz / L * HALF)]; };
      if (!snapped) { const tp = tip(); if (atStart) { P.unshift(tp); path.tipS = true; } else { P.push(tp); path.tipE = true; } if (path.y) { if (atStart) path.y.unshift(0); else path.y.push(0); } }
      else if (atStart) path.tipS = false; else path.tipE = false;
    }
    gone = vecClearUnder([path]);
    buildPathNet(); changed();
    toast(snapped ? 'Weg sluit aan' + (gone ? ' · ' + gone + ' weggehaald' : '') : (plan.best ? 'Weg doorgetrokken' : TYPES[tool].name + ' · tik het volgende vak, of houd ingedrukt en sleep voor een lijn') + (gone ? ' · ' + gone + ' weggehaald (Ctrl+Z zet terug)' : ''), 1600);
  }
  function roadPaintTo(cell) {
    if (!cell) return;
    if (VEC_TOOLS.has(roadDrag.tool)) return vecPaintTo(cell);
    if (roadDrag.tool === 'module') return linePaintTo(cell);
    // Vakken: indrukken is het beginpunt, loslaten het eindpunt; daartussen een rechte rij vakken die meebeweegt
    const D = roadDrag, L = D.last;
    if (L && L[0] === cell[0] && L[1] === cell[1]) return;
    if (!D.vstart) { D.vstart = cell; D.prior = new Map(); }
    D.last = cell;
    const T = D.tool, want = [D.vstart, ...hexLine(D.vstart, cell)], wantK = new Set(want.map(([q, r]) => key(q, r))), touched = [];
    for (const [k, prev] of D.prior) {   // weer weg van de lijn af: terugzetten wat er stond
      if (wantK.has(k)) continue;
      if (prev) cells.set(k, prev); else cells.delete(k);
      D.prior.delete(k); touched.push(k.split(',').map(Number));
    }
    const placed = [];
    for (const [q, r] of want) {
      const k = key(q, r); if (D.prior.has(k)) continue;
      const st = stackOf(q, r), top = st[st.length - 1];
      if (T === 'kuil' && terrOnly(q, r)) {   // verlagen over een heuvel: één verhoging eraf
        D.prior.set(k, st.slice()); const ns = st.slice(0, -1); if (ns.length) cells.set(k, ns); else cells.delete(k); touched.push([q, r]); continue;
      }
      if (top && baseOf(top) === toolBase(T) && !(T === 'heuvel' && terrOnly(q, r))) continue;
      if (canPlace(q, r, T)) continue;
      const y0 = columnTop(q, r);
      D.prior.set(k, st.length ? st.slice() : null);
      cells.set(k, st.concat(itemsFor(q, r, T, 0)));
      placed.push([q, r, y0]); touched.push([q, r]);
    }
    if (!touched.length) return;
    if (touched.length > 3) rebuildMany(touched); else for (const [q, r] of touched) rebuildAround(q, r);
    if (T === 'heuvel' || T === 'kuil') terrainChanged(touched);
    for (const [q, r, y0] of placed) people.onPlaced(q, r, y0, columnTop(q, r));
    D.count = D.prior.size;
    changed();
  }
  function roadDragStart(cell) { vecChainEnd(true); vecPreClear(); roadDrag.on = true; roadDrag.last = null; roadDrag.count = 0; roadDrag.skip = 0; roadDrag.lp = null; roadDrag.sp = null; roadDrag.vp = null; roadDrag.vstart = null; roadDrag.prior = null; roadDrag.tool = tool; ghost.visible = false; ghostArrow.visible = false; vecGhost.visible = false; previewGroup.visible = false; roadPaintTo(cell); }
  function roadDragEnd() {
    if (!roadDrag.on) return;
    roadDrag.on = false; roadDrag.last = null;
    if (VEC_TOOLS.has(roadDrag.tool)) return vecDragEnd();
    if (roadDrag.tool === 'module') return lineDragEnd();
    const what = { pad: 'pad', fietspad: 'fietspad', kuil: 'uitgraving', heuvel: 'verhoging', looppad: 'looppad', tunnel: 'tunnel', water: 'gracht' }[roadDrag.tool] || 'blokken';
    if (roadDrag.count > 1) toast(`${roadDrag.count} vakken ${what} aangelegd`, 1400);
  }
  const placeBtn = document.getElementById('placeBtn');
  placeBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); walkAction(false); });

