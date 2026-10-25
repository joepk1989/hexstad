  // ---------- Bediening onderaan (v100, uit het interfacelab: "Voorstel voor Hexstad") ----------
  // Bij bouwen én lopen op dezelfde plek: links het gereedschap (en tijdens het lopen de handen), in het midden de
  // snelbalk met negen blokken onder 1–9 en daarboven "Alle blokken" (Tab), rechts de schakelaar bouwen/lopen, aan de
  // rechterrand de laagkiezer. Wat je in de catalogus kiest, komt in het gekozen vak van de snelbalk.
  // De laagkiezer bouwt modules op de gekozen laag; alles daarboven wordt doorzichtig en is niet aan te klikken
  // (de stad wordt dan in twee keer getekend: tot de snede gewoon, daarboven als glas).
  // Ongedaan maken: na elke wijziging een momentopname van de stad (de tekst die toch al bewaard wordt), max. 15.
  // Deze functies worden ook elders aangeroepen (ook vóór dit bestand klaar is), dus ze kijken eerst of HUD er is.
  var HUD = null, hudFirstSnap = null;
  function hudLayer() { return HUD && mode === 'build' ? HUD.layer : null; }
  function hudCut() { return HUD.layer * MV2.LV_H + MV2.LV_H - 0.35; }
  function hudPickFilter(hits) { if (hudLayer() === null) return hits; const c = hudCut() + 0.05; return hits.filter(h => h.point.y <= c); }
  function hudSnap(s) { if (!HUD) { hudFirstSnap = s; return; } HUD.snap(s); }
  function hudOnTool(t) { if (HUD) HUD.onTool(t); }
  function hotStep(d) { if (HUD) HUD.step(d); }
  function hotSelect(i) { if (HUD) HUD.select(i); }
  function toggleCatalog(open) { if (HUD) HUD.catalog(open); }
  function hudRender() { if (CURVE.on) CURVE.c.value.set(mode === 'walk' ? player.x : orbit.target.x, mode === 'walk' ? player.z : orbit.target.z); if (HUD && hudLayer() !== null) HUD.renderLayered(); else renderer.render(scene, camera); }
  HUD = (() => {
    const hotbar = document.getElementById('hotbar'), hotName = document.getElementById('hotName'), catOpen = document.getElementById('catOpen');
    const rTools = document.getElementById('rTools'), layerPick = document.getElementById('layerPick');
    // ---------- snelbalk ----------
    const DEF = ['vweg', 'pad', 'woning', 'kantoor', 'dak', 'park', 'water', 'tophoog', 'module'];
    const valid = s => s && (s.t === 'module' || TOOLS.includes(s.t)) && s.t !== 'gum';
    let slots = null, idx = 0;
    try { const v = JSON.parse(localStorage.getItem('hexstad-snelbalk') || 'null'); if (v && Array.isArray(v.s) && v.s.length === 9) { slots = v.s.map(s => valid(s) ? s : null); idx = Math.max(0, Math.min(8, v.i | 0)); } } catch (e) { /* geen opslag */ }
    if (!slots) slots = DEF.map(t => t === 'module' ? { t, mid: (modules[moduleSel || 0] || {}).id } : { t });
    const saveSlots = () => { try { localStorage.setItem('hexstad-snelbalk', JSON.stringify({ s: slots, i: idx })); } catch (e) { /* geen opslag */ } };
    const modOf = s => modules.find(m => m.id === s.mid) || null;
    const nameOf = s => !s ? 'Leeg vak' : s.t === 'module' ? ((modOf(s) || {}).name || 'Module') : (TOOL_LABEL[s.t] || (TYPES[s.t] && TYPES[s.t].name) || s.t);
    const curMid = () => (modules[moduleSel] || {}).id;
    const same = (s, t) => s && s.t === t && (t !== 'module' || s.mid === curMid());
    function render() {
      hotbar.innerHTML = '';
      slots.forEach((s, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'hslot'; b.dataset.i = i;
        b.setAttribute('aria-pressed', String(i === idx && tool !== 'gum')); b.title = (i + 1) + ' · ' + nameOf(s) + (s ? '' : ' · kies iets in Alle blokken (Tab)');
        b.setAttribute('aria-label', (i + 1) + ': ' + nameOf(s));
        const hx = document.createElement('span'); hx.className = 'hx';
        if (s && s.t === 'module') { const m = modOf(s); const c = document.createElement('canvas'); c.width = c.height = 72; if (m) { try { const th = m.v === 2 ? mv2Thumb(m, 0, 36) : modThumb(m, 0, 36); c.getContext('2d').drawImage(th, 0, 0, 72, 72); } catch (e) { /* geen voorbeeld */ } } hx.appendChild(c); }
        else if (s) { const sw = document.createElement('span'); sw.className = 'sw sw-' + s.t; sw.innerHTML = TERR_SVG[s.t] || ''; hx.appendChild(sw); }
        b.appendChild(hx);
        const n = document.createElement('em'); n.textContent = i + 1; b.appendChild(n);
        b.addEventListener('click', () => select(i));
        hotbar.appendChild(b);
      });
    }
    let nameT = 0;
    function showName(txt) { hotName.textContent = txt; hotName.classList.add('show'); clearTimeout(nameT); nameT = setTimeout(() => hotName.classList.remove('show'), 1500); }
    function select(i) {
      idx = i; const s = slots[i]; saveSlots();
      if (!s) { render(); showName((i + 1) + ': leeg · kies iets in Alle blokken'); catalog(true); return; }
      if (s.t === 'module') {
        let mi = modules.findIndex(m => m.id === s.mid);
        if (mi < 0) { if (!modules.length) { openSchets(); return; } mi = 0; s.mid = modules[0].id; }
        moduleSel = mi; moduleGhostKey = ''; selectTool('module'); renderModCards();
      } else selectTool(s.t);
      if (mode === 'walk' && hand !== 'bouwen') setHand('bouwen');   // een blok kiezen = het in je hand nemen
      showName(nameOf(s)); render();
    }
    function step(d) { select((idx + d + 9) % 9); }
    // wat er elders gekozen wordt (catalogus, , en ., Delete): in de snelbalk zetten
    function onTool(t) {
      if (t !== 'gum') {
        if (!same(slots[idx], t)) {
          const j = slots.findIndex(s => same(s, t));
          if (j >= 0) idx = j; else { slots[idx] = t === 'module' ? { t, mid: curMid() } : { t }; }
          saveSlots();
        }
      }
      render(); tools();
    }
    // ---------- gereedschap linksonder: draaien, spiegelen, gum, ongedaan maken ----------
    const rbtn = (id, title, svgPath) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'rt'; b.id = id; b.title = title; b.setAttribute('aria-label', title.split(' (')[0]); b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + svgPath + '</svg>'; return b; };
    rotBtn.classList.add('rt'); mirBtn.classList.add('rt'); rTools.append(rotBtn, mirBtn);
    const gumBtn = rbtn('gumBtn', 'Gum: haalt weg wat je aanklikt (Delete)', '<path d="M7 20h11M5 15l9-9 5 5-8 8H8z"/>');
    const undoStepBtn = rbtn('undoStepBtn', 'Ongedaan maken (Ctrl+Z)', '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>');
    rTools.append(gumBtn, undoStepBtn);
    if (toolBtns.gum) toolBtns.gum.remove();   // de gum staat nu hier, niet meer in de catalogus
    gumBtn.addEventListener('click', () => { if (tool === 'gum') select(idx); else selectTool('gum'); });
    undoStepBtn.addEventListener('click', () => undo());
    function tools() {
      rotBtn.hidden = false; rotBtn.disabled = !(DIRECTIONAL.has(tool) || tool === 'module');
      mirBtn.hidden = false; mirBtn.disabled = tool !== 'module';
      gumBtn.setAttribute('aria-pressed', String(tool === 'gum'));
      undoStepBtn.disabled = !undoList.length;
    }
    // ---------- catalogus (Alle blokken) ----------
    function catalog(open) {
      const show = open === undefined ? paletteEl.hidden : !!open;
      paletteEl.hidden = !show; catOpen.setAttribute('aria-expanded', String(show));
      document.body.classList.toggle('cat-open', show);
      if (show) {
        if (document.pointerLockElement) document.exitPointerLock();
        if (tool !== 'gum' && catOf(tool) >= 0 && catOf(tool) !== catIdx) setCat(catOf(tool));
        const sel = paletteEl.querySelector('[aria-pressed="true"].tool'); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    catOpen.addEventListener('click', () => catalog());
    // een blok of module kiezen sluit de catalogus; tabs, zoeken en filters niet
    paletteEl.addEventListener('click', e => { const b = e.target.closest('.tool'); if (b && !b.classList.contains('add') && !b.disabled) setTimeout(() => catalog(false), 0); });
    canvas.addEventListener('pointerdown', () => { if (!paletteEl.hidden) catalog(false); });
    // ---------- laagkiezer ----------
    let layer = null, maxLv = 3;
    function topLevel() {
      let t = 0;
      for (const I of cells.inst || []) t = Math.max(t, instTopLv(I));
      for (const k of cells.keys()) { const [q, r] = k.split(',').map(Number); t = Math.max(t, Math.ceil((colTopW(q, r) - gH(q, r)) / MV2.LV_H)); }
      return t;
    }
    function renderLayers() {
      maxLv = Math.max(3, Math.min(9, topLevel() - 1));
      const walk = mode === 'walk', here = walk ? Math.max(0, Math.round((player.y - gH(...worldToCell(player.x, player.z))) / MV2.LV_H)) : null;
      let h = '<small>Laag</small><button type="button" data-l="alles" aria-pressed="' + (!walk && layer === null) + '" title="Alle lagen zien (Page Up boven de bovenste laag)"' + (walk ? ' disabled' : '') + '>Alles</button>';
      for (let l = maxLv; l >= 0; l--) {
        const on = walk ? l === here : layer === l, above = !walk && layer !== null && l > layer;
        h += '<button type="button" data-l="' + l + '" aria-pressed="' + on + '"' + (above ? ' class="above"' : '') + (walk ? ' disabled' : '') + ' title="' + (walk ? 'Je loopt op laag ' + here : 'Bouw op laag ' + l + ' (' + (l * MV2.LV_H) + ' m) · wat erboven ligt wordt doorzichtig') + '">' + l + '</button>';
      }
      h += '<small class="lk">PgUp/Dn</small>';
      layerPick.innerHTML = h;
    }
    function setLayer(n, quiet) {
      layer = n === null ? null : Math.max(0, Math.min(maxLv, n));
      renderLayers();
      if (!quiet) toast(layer === null ? 'Alle lagen' : 'Laag ' + layer + ' (' + layer * MV2.LV_H + ' m) · wat erboven ligt is doorzichtig', 1600);
      if (mode === 'build') { moduleGhostKey = ''; updateGhost(); }
    }
    layerPick.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b || b.disabled) return; setLayer(b.dataset.l === 'alles' ? null : +b.dataset.l); });
    const below = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0), aboveP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const glassMat = new THREE.MeshBasicMaterial({ color: '#dfe9f2', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
    function skipGlass(o) { if (!o.visible) return false; if (o.renderOrder < 0 || o.isPoints || o.isLine || o.isSprite || o.userData.noOcc || o.userData.wxPrecip) return true; const m = o.material || (o.children && o.children[0] && o.children[0].material); return !!(m && !Array.isArray(m) && m.isMeshBasicMaterial); }
    function renderLayered() {
      const cut = hudCut(); below.constant = cut; aboveP.constant = -cut;
      renderer.clippingPlanes = [below]; renderer.render(scene, camera);
      const hidden = []; for (const o of scene.children) if (skipGlass(o)) { o.visible = false; hidden.push(o); }
      const bg = scene.background, ac = renderer.autoClear, au = renderer.shadowMap.autoUpdate;
      scene.background = null; scene.overrideMaterial = glassMat; renderer.autoClear = false; renderer.shadowMap.autoUpdate = false; renderer.clippingPlanes = [aboveP];
      renderer.render(scene, camera);
      scene.background = bg; scene.overrideMaterial = null; renderer.autoClear = ac; renderer.shadowMap.autoUpdate = au; renderer.clippingPlanes = [];
      for (const o of hidden) o.visible = true;
    }
    // ---------- ongedaan maken ----------
    const undoList = []; let undoCur = hudFirstSnap, undoT = 0, layersT = 0;
    function snap(s) {
      if (s === undoCur) return;
      const now = performance.now();
      if (undoCur !== null && now - undoT > 700) { undoList.push(undoCur); if (undoList.length > 15) undoList.shift(); }   // snel achter elkaar (slepen, boetseren) telt als één stap
      undoCur = s; undoT = now; tools();
      clearTimeout(layersT); layersT = setTimeout(renderLayers, 300);
    }
    function undo() {
      if (!undoList.length) { toast('Niets meer om ongedaan te maken', 1200); return; }
      const prev = undoList.pop(), m = parseCity(prev); if (!m) return;
      cells = m; undoCur = prev; rebuildAll(); changed(); tools(); sound.fx('undo');
      toast('Ongedaan gemaakt' + (undoList.length ? ' · nog ' + undoList.length + ' stap' + (undoList.length === 1 ? '' : 'pen') : ''), 1200);
    }
    // ---------- toetsen: Ctrl+Z, Page Up/Down, Escape ----------
    window.addEventListener('keydown', e => {
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const mm = document.getElementById('mmApp'), sk = document.getElementById('schetsApp'); if ((mm && !mm.hidden) || (sk && !sk.hidden)) return;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (e.code === 'Escape' && !paletteEl.hidden) { catalog(false); return; }
      if (mode === 'build' && !roadDrag.on && (e.code === 'PageUp' || e.code === 'PageDown')) {
        e.preventDefault();
        if (e.code === 'PageUp') setLayer(layer === null ? 0 : layer + 1 > maxLv ? null : layer + 1);
        else setLayer(layer === null ? maxLv : layer - 1 < 0 ? null : layer - 1);
      }
    });
    // ---------- tijd en weer in één knop rechtsboven ----------
    const todBtnEl = document.getElementById('todBtn'), wxIco = document.createElement('span'); wxIco.className = 'tod-wx'; wxIco.setAttribute('aria-hidden', 'true'); todBtnEl.appendChild(wxIco);
    const WXG = { zon: '', bewolkt: '☁', regen: '☂', onweer: 'ϟ', mist: '≋', sneeuw: '❄' };
    let lastMode = mode;
    setInterval(() => {
      wxIco.textContent = WXG[weather.now] || ''; todBtnEl.title = 'Tijd, weer en beeld · ' + weather.NAME[weather.now];
      if (mode !== lastMode) { lastMode = mode; if (!paletteEl.hidden && mode === 'walk') catalog(false); }
      if (mode === 'walk') renderLayers();
    }, 500);
    const api = { snap, onTool, step, select, catalog, renderLayered, undo, get layer() { return layer; }, setLayer, slots: () => slots.slice(), get idx() { return idx; } };
    return api;
  })();
  HUD.onTool(tool); HUD.setLayer(null, true);
  window.__HUD = HUD;
