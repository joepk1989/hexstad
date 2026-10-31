  // ---------- Aanwijzen (V): wijs in de stad een module of blok aan; een klik opent opties om het meteen aan te passen ----------
  // Draaien (per 60°), spiegelen, een passende variant kiezen, bewerken in de Raatmaker, meer hiervan bouwen (pipet),
  // oppakken om te verplaatsen, weghalen. Bij aanwijzen licht het hele exemplaar op als een draadmodel van zeshoeken.
  const KIES = { menu: null, tip: null, T: null, hoverKey: '' };
  const kiesHL = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f2b233', transparent: true, opacity: 0.95, depthTest: false }));
  kiesHL.renderOrder = 7; kiesHL.frustumCulled = false; kiesHL.visible = false; kiesHL.userData.noOcc = true; scene.add(kiesHL);
  const kiesMod = I => modules.find(m => m.id === I.mid) || null;
  function kiesTarget(res) {
    if (!res) return null;
    if (res.inst && cells.inst && cells.inst.includes(res.inst)) return { kind: 'mod', I: res.inst };
    if (res.erase && !res.inst) { const st = stackOf(res.erase[0], res.erase[1]); if (st.length) return { kind: 'blok', q: res.erase[0], r: res.erase[1] }; }
    return null;
  }
  const kiesKey = T => !T ? '' : T.kind === 'mod' ? 'm' + cells.inst.indexOf(T.I) + ':' + T.I.rot + ':' + !!T.I.mir + ':' + T.I.mid : 'b' + T.q + ',' + T.r + ':' + stackOf(T.q, T.r).length;
  function kiesPrisms(T) {   // per vak: [q, r, onder, boven]
    if (T.kind === 'mod') {
      const I = T.I, M = modMeta(I.m), area = I.m.v === 2 ? mv2Area(I) : Number.isInteger(I.q) && Number.isInteger(I.r) ? instArea(I) : [];
      const base = (Number.isInteger(I.q) && Number.isInteger(I.r) ? gH(I.q, I.r) : 0) + (I.lv || 0) * MV2.LV_H, top = base + Math.max(1, M.fl) * MV2.LV_H + (M.top === 'kap' ? 2.5 : 0.3);
      return area.map(([q, r]) => [q, r, base + 0.05, top]);
    }
    const st = stackOf(T.q, T.r), top = colTopW(T.q, T.r), t = TY(st[st.length - 1]);
    return [[T.q, T.r, top - ((t && t.h) || 3), top + 0.05]];
  }
  function kiesShow(T) {
    if (!T) { kiesHL.visible = false; return; }
    const P = [], rr = R * 0.985;
    for (const [q, r, y0, y1] of kiesPrisms(T)) {
      const c = cellToWorld(q, r);
      for (let i = 0; i < 6; i++) {
        const a0 = (30 + 60 * i) * Math.PI / 180, a1 = a0 + Math.PI / 3, x0 = c.x + Math.cos(a0) * rr, z0 = c.z + Math.sin(a0) * rr, x1 = c.x + Math.cos(a1) * rr, z1 = c.z + Math.sin(a1) * rr;
        P.push(x0, y0, z0, x1, y0, z1, x0, y1, z0, x1, y1, z1, x0, y0, z0, x0, y1, z0);
      }
    }
    kiesHL.geometry.dispose(); kiesHL.geometry = new THREE.BufferGeometry(); kiesHL.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); kiesHL.visible = P.length > 0;
  }
  const kiesName = T => T.kind === 'mod' ? (T.I.m.name || 'Module') : ((TY(stackOf(T.q, T.r).slice(-1)[0]) || {}).name || 'Blok');
  function kiesTipAt(T, cx, cy) {
    if (!KIES.tip) { KIES.tip = document.createElement('div'); KIES.tip.className = 'kies-tip'; KIES.tip.setAttribute('aria-hidden', 'true'); document.body.appendChild(KIES.tip); }
    if (!T || KIES.menu) { KIES.tip.hidden = true; return; }
    KIES.tip.hidden = false; KIES.tip.innerHTML = ''; const b = document.createElement('b'); b.textContent = kiesName(T); KIES.tip.appendChild(b); KIES.tip.append((coarse ? ' · tik' : ' · klik') + ' voor opties');
    KIES.tip.style.left = Math.min(window.innerWidth - 20, cx + 16) + 'px'; KIES.tip.style.top = Math.max(8, cy - 34) + 'px';
  }
  function kiesHide() { kiesHL.visible = false; if (KIES.tip) KIES.tip.hidden = true; kiesClose(); }
  // hover (vanuit updateGhost)
  function kiesHover(cx, cy) {
    if (KIES.menu) { kiesShow(KIES.T); if (KIES.tip) KIES.tip.hidden = true; return; }
    const T = kiesTarget(pick(cx, cy, true)); kiesShow(T); kiesTipAt(T, cx, cy);
  }
  // klik (vanuit handleTap)
  function kiesTap(cx, cy) {
    const T = kiesTarget(pick(cx, cy, true));
    if (!T) { kiesClose(); kiesShow(null); toast('Wijs een module of blok aan', 1200); return; }
    kiesOpen(T, cx, cy);
  }
  // een exemplaar opnieuw neerzetten met een andere draaiing of spiegeling (op dezelfde plek en laag)
  function kiesReplace(I, upd) {
    const i = cells.inst.indexOf(I); if (i < 0 || !I.m || I.m.v !== 2) return I;
    const mod = kiesMod(I), rot = upd.rot ?? I.rot, mir = upd.mir ?? !!I.mir;
    cells.inst.splice(i, 1); removeInst(I); modTopRefresh();
    const { n } = placeCore(mod || I.m, rot, I.q, I.r, I.lv || 0);
    if (!n) { cells.inst.splice(i, 0, I); modTopRefresh(); return I; }
    const m = mod ? instData(mod, mir) : (upd.mir !== undefined ? mv2Mirror(I.m) : I.m);
    const J = Object.assign({}, I, { m, rot }); if (mir) J.mir = true; else delete J.mir;
    cells.inst.splice(i, 0, J); buildModNet(); changed(); return J;
  }
  function kiesClose() { if (KIES.menu) { KIES.menu.remove(); KIES.menu = null; } }
  const KIES_ICON = {
    l: '<path d="M4 4v6h6"/><path d="M5.5 15a8 8 0 1 0 1.9-8.3L4 10"/>', r: '<path d="M20 4v6h-6"/><path d="M18.5 15a8 8 0 1 1-1.9-8.3L20 10"/>',
    m: '<path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M9 7L3 17h6zM15 7l6 10h-6z"/>', v: '<path d="M12 2.8l7.9 4.6v9.2L12 21.2l-7.9-4.6V7.4z"/><path d="M9 12h6M13 9.5l2.5 2.5-2.5 2.5"/>',
    e: '<path d="M12 2.8l7.9 4.6v9.2L12 21.2l-7.9-4.6V7.4z"/><path d="M9 15l1-3 4.5-4.5 2 2L12 14l-3 1z"/>', p: '<path d="M14.5 4.5l5 5M13 6l5 5-8 8H5v-5z"/>',
    o: '<path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.2-2.3L4 14.5a1.5 1.5 0 0 1 2.5-1.6L8 15"/>',
    x: '<path d="M7 20h11M5 15l9-9 5 5-8 8H8z"/>'
  };
  function kiesOpen(T, cx, cy) {
    kiesClose(); KIES.T = T; kiesShow(T); if (KIES.tip) KIES.tip.hidden = true;
    const box = document.createElement('div'); box.className = 'kies-menu'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Opties voor ' + kiesName(T));
    const head = document.createElement('div'); head.className = 'kies-head';
    const ttl = document.createElement('b'); ttl.textContent = kiesName(T); head.appendChild(ttl);
    const cls = document.createElement('button'); cls.type = 'button'; cls.className = 'kies-x'; cls.setAttribute('aria-label', 'Sluiten'); cls.textContent = '×'; cls.addEventListener('click', () => { kiesClose(); kiesShow(null); }); head.appendChild(cls);
    box.appendChild(head);
    const sub = document.createElement('small'); box.appendChild(sub);
    const grid = document.createElement('div'); grid.className = 'kies-grid'; box.appendChild(grid);
    const btn = (a, label, title, wide, danger) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.a = a; b.title = title || label; if (wide) b.classList.add('wide'); if (danger) b.classList.add('danger'); b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (KIES_ICON[a] || '') + '</svg>'; const s = document.createElement('span'); s.textContent = label; b.appendChild(s); grid.appendChild(b); return b; };
    const render = () => {
      grid.innerHTML = ''; const T2 = KIES.T; ttl.textContent = kiesName(T2);
      if (T2.kind === 'mod') {
        const I = T2.I, M = modMeta(I.m), mod = kiesMod(I), v2 = I.m.v === 2, n = mod ? instOf(mod).length : 1;
        sub.textContent = [I.lv ? 'laag ' + I.lv : 'op de grond', M.fl ? M.fl + (M.fl === 1 ? ' laag' : ' lagen') : null, M.k ? '7 vakken' : null, ((I.rot || 0) % 6) * 60 + '°', I.mir ? 'gespiegeld' : null].filter(Boolean).join(' · ');
        if (v2) { btn('l', 'Draai links', 'Een zesde slag linksom (60°)'); btn('r', 'Draai rechts', 'Een zesde slag rechtsom (60°)'); btn('m', I.mir ? 'Niet spiegelen' : 'Spiegelen', 'In spiegelbeeld'); }
        if (Number.isInteger(I.q) && Number.isInteger(I.r)) btn('v', 'Andere variant', 'De volgende module die op de buren aansluit');
        if (mod && v2) btn('e', 'Bewerken', 'Openen in de Raatmaker' + (n > 1 ? ' · past alle ' + n + ' exemplaren in de stad aan' : ''));
        if (mod) { btn('p', 'Meer hiervan', 'Deze module (met deze draaiing) in je hand nemen om er meer van te bouwen'); btn('o', 'Verplaatsen', 'Oppakken en ergens anders neerzetten'); }
        btn('x', 'Weghalen', 'Het hele exemplaar weghalen', !mod, true);
      } else {
        const st = stackOf(T2.q, T2.r), top = st[st.length - 1], b = baseOf(top);
        sub.textContent = st.length + (st.length === 1 ? ' blok' : ' blokken') + ' op dit vak';
        if (TOOLS.includes(b) && b !== 'gum') btn('p', 'Meer hiervan', 'Dit blok in je hand nemen');
        btn('x', 'Bovenste weg', 'De bovenste laag van dit vak weghalen', false, true);
      }
    };
    grid.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a, T2 = KIES.T;
      if (T2.kind === 'mod') {
        const I = T2.I, mod = kiesMod(I);
        if (a === 'l' || a === 'r') { const J = kiesReplace(I, { rot: ((I.rot || 0) + (a === 'l' ? 1 : 5)) % 6 }); if (J !== I) { T2.I = J; toast('Gedraaid', 700); } }
        else if (a === 'm') { const J = kiesReplace(I, { mir: !I.mir }); if (J !== I) { T2.I = J; toast(J.mir ? 'Gespiegeld' : 'Niet meer gespiegeld', 800); } }
        else if (a === 'v') { const i = cells.inst.indexOf(I); if (i >= 0 && swapInst(i)) T2.I = cells.inst[cells.inst.length - 1]; else toast('Geen andere variant die past', 1400); }
        else if (a === 'e') { kiesClose(); kiesShow(null); openSchets(mod); return; }
        else if (a === 'p' || a === 'o') {
          moduleSel = modules.indexOf(mod); moduleRot = (I.rot || 0) % 6; moduleMir = !!I.mir && mod.v === 2; moduleGhostKey = '';
          if (a === 'o') { const i = cells.inst.indexOf(I); if (i >= 0) { cells.inst.splice(i, 1); removeInst(I); buildTriNet(); buildPathNet(); buildEdgeNet(); buildModNet(); changed(); } }
          kiesClose(); kiesShow(null); selectTool('module'); renderModCards(); toast(a === 'o' ? '"' + mod.name + '" opgepakt · klik waar hij moet komen' : '"' + mod.name + '" in je hand', 2200); return;
        }
        else if (a === 'x') { const i = cells.inst.indexOf(I); if (i >= 0) { cells.inst.splice(i, 1); removeInst(I); buildTriNet(); buildPathNet(); buildEdgeNet(); buildModNet(); changed(); toast('"' + (I.m.name || 'Module') + '" weggehaald', 1200); } kiesClose(); kiesShow(null); return; }
      } else {
        const st = stackOf(T2.q, T2.r), b2 = baseOf(st[st.length - 1]);
        if (a === 'p') { kiesClose(); kiesShow(null); selectTool(b2); return; }
        if (a === 'x') { removeTop(T2.q, T2.r); if (!stackOf(T2.q, T2.r).length) { kiesClose(); kiesShow(null); return; } }
      }
      render(); kiesShow(KIES.T);
    });
    render(); document.body.appendChild(box); KIES.menu = box;
    const w = box.offsetWidth, h = box.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    box.style.left = Math.max(8, Math.min(vw - w - 8, cx + 14)) + 'px'; box.style.top = Math.max(8, Math.min(vh - h - 8, cy - 20)) + 'px';
  }
  document.addEventListener('pointerdown', e => { if (KIES.menu && !KIES.menu.contains(e.target) && e.target !== canvas) { kiesClose(); kiesShow(null); } }, true);
  window.addEventListener('keydown', e => { if (e.code === 'Escape' && KIES.menu) { kiesClose(); kiesShow(null); } });
  function kiesOnTool(t) { document.body.classList.toggle('tool-kies', t === 'kies'); if (t !== 'kies') kiesHide(); else if (!kiesOnTool.seen) { kiesOnTool.seen = true; toast((coarse ? 'Tik' : 'Klik') + ' op een module of blok voor opties: draaien, spiegelen, variant, bewerken, verplaatsen', 3200); } }
