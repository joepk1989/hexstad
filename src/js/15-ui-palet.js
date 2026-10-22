  // ---------- Palet ----------
  const toolBtns = {};
  let catIdx = 0;
  const catBtn = document.createElement('button');
  catBtn.type = 'button'; catBtn.className = 'cat'; catBtn.id = 'catBtn';
  catBtn.addEventListener('click', () => { setCat((catIdx + 1) % CATS.length); selectTool(CATS[catIdx].tools[0]); });
  const palTabs = document.createElement('div'); palTabs.className = 'pal-tabs'; paletteEl.appendChild(palTabs);
  const palRow = document.createElement('div'); palRow.className = 'pal-row'; paletteEl.appendChild(palRow);
  const toolScroll = document.createElement('div'); toolScroll.className = 'tool-scroll'; palRow.appendChild(toolScroll);
  CATS.forEach((c, ci) => { const t = document.createElement('button'); t.type = 'button'; t.className = 'pal-tab'; t.textContent = c.name; t.addEventListener('click', () => { setCat(ci); if (c.name !== 'Modules') selectTool(c.tools[0]); else { renderModCards(); if (modules.length) { if (moduleSel === null) moduleSel = 0; selectTool('module'); } else openSchets(); } }); palTabs.appendChild(t); });
  const catOf = t => CATS.findIndex(c => c.tools.includes(t));
  function setCat(ci) {
    catIdx = ci;
    catBtn.innerHTML = `<span class="cat-name">${CATS[ci].name}</span><span class="cat-dots">${CATS.map((_, j) => j === ci ? '●' : '○').join('')}</span>`;
    for (const k in toolBtns) if (k !== 'gum') toolBtns[k].hidden = catOf(k) !== ci;
    toolBtns.module.hidden = true;
    palTabs.querySelectorAll('.pal-tab').forEach((t, j) => { t.setAttribute('aria-pressed', String(j === ci)); if (j === ci) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
    renderModCards();
  }
  function renderModCards() {
    toolScroll.querySelectorAll('.modcard, .todo').forEach(n => n.remove());
    for (const nm of (CATS[catIdx].todo || [])) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool todo'; b.title = nm + ': nog te bepalen'; b.disabled = true;
      b.innerHTML = '<span class="sw sw-todo">?</span>' + nm; toolScroll.appendChild(b);
    }
    if (CATS[catIdx].name !== 'Modules') return;
    // categoriekeuze vooraan, dan de kaartjes; miniaturen in 3D worden in kleine porties getekend (honderd modules)
    const cats = ['Alles', ...MV2.cats.filter(c => modules.some(m => (m.cat || 'Overig') === c)), ...(modules.some(m => m.v !== 2) ? ['Oude schets'] : [])];
    const selC = document.createElement('select'); selC.className = 'tool modcard modcat'; selC.setAttribute('aria-label', 'Categorie'); for (const c of cats) { const o = document.createElement('option'); o.value = c; o.textContent = c; selC.appendChild(o); } selC.value = cats.includes(modCat) ? modCat : 'Alles'; selC.addEventListener('change', () => { modCat = selC.value; try { localStorage.setItem('hexstad-modcat', modCat); } catch (e) { /* geen opslag */ } renderModCards(); }); toolScroll.appendChild(selC);
    const add = document.createElement('button'); add.type = 'button'; add.className = 'tool modcard add'; add.innerHTML = '<span class="plus">+</span><span class="nm">Nieuw</span>'; add.addEventListener('click', () => openSchets()); toolScroll.appendChild(add);
    const queue = [];
    modules.forEach((m, i) => {
      if (modCat !== 'Alles' && (modCat === 'Oude schets' ? m.v === 2 : (m.cat || 'Overig') !== modCat || m.v !== 2)) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool modcard'; b.title = m.name + (m.v === 2 ? ' · dubbelklik om te bewerken' : ''); b.setAttribute('aria-pressed', String(tool === 'module' && i === moduleSel));
      const rot = i === moduleSel ? moduleRot : 0, c = document.createElement('canvas'); c.width = c.height = 92; c.style.width = c.style.height = '46px'; b.appendChild(c);
      if (m.v === 2) queue.push(() => { const t = mv2Thumb(m, rot, 46); c.getContext('2d').drawImage(t, 0, 0, 92, 92); }); else { const t = modThumb(m, rot, 46); c.getContext('2d').drawImage(t, 0, 0, 92, 92); }
      const sp = document.createElement('span'); sp.className = 'nm'; sp.textContent = m.name; b.appendChild(sp);
      b.addEventListener('click', () => { moduleSel = i; moduleGhostKey = ''; selectTool('module'); renderModCards(); });
      if (m.v === 2) b.addEventListener('dblclick', () => openSchets(m));
      toolScroll.appendChild(b);
    });
    const tick = () => { const t0 = performance.now(); while (queue.length && performance.now() - t0 < 12) queue.shift()(); if (queue.length) setTimeout(tick, 0); }; tick();
  }
  let modCat = 'Alles'; try { modCat = localStorage.getItem('hexstad-modcat') || 'Alles'; } catch (e) { /* geen opslag */ }
  TOOLS.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tool'; b.id = 'tool-' + t;
    b.title = t === 'gum' ? 'Gum: haalt de bovenste laag weg' : VEC_TOOLS.has(t) ? TYPES[t].name + ': sleep van vak naar vak; rechtermuisknop of gum haalt de hele weg weg' : TYPES[t].name;
    b.innerHTML = `<span class="sw sw-${t}">${t === 'gum' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' : ''}</span>${t === 'gum' ? 'Gum' : (TOOL_LABEL[t] || TYPES[t].name)}`;
    b.addEventListener('click', () => selectTool(t));
    (t === 'gum' ? palRow : toolScroll).appendChild(b); toolBtns[t] = b;
  });
  // Draaiknop: verschijnt bij blokken met een richting (tribune, trap, helling, …)
  const rotBtn = document.createElement('button');
  rotBtn.type = 'button'; rotBtn.className = 'tool rot'; rotBtn.id = 'rotBtn'; rotBtn.hidden = true;
  rotBtn.title = 'Draai 60° (R) · lang indrukken of Shift+R: weer automatisch';
  rotBtn.innerHTML = '<span class="sw sw-rot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg></span><span id="rotLbl">Draai</span>';
  palRow.insertBefore(rotBtn, toolBtns.gum);
  let rotHold = 0, rotLong = false;
  rotBtn.addEventListener('pointerdown', () => { rotLong = false; rotHold = setTimeout(() => { rotLong = true; resetRotation(); }, 550); });
  rotBtn.addEventListener('pointerup', () => clearTimeout(rotHold));
  rotBtn.addEventListener('pointerleave', () => clearTimeout(rotHold));
  rotBtn.addEventListener('click', () => { if (!rotLong) rotateDir(); });
  rotBtn.addEventListener('contextmenu', e => e.preventDefault());
  function rotateDir() {
    if (tool === 'module') { moduleRot = (moduleRot + 1) % 6; renderStrip(); toast('Module gedraaid', 900); if (mode === 'build') updateGhost(); return; }
    if (!DIRECTIONAL.has(tool)) return;
    manualDir = ((manualDir !== null ? manualDir : viewDirIndex()) + 1) % 6;
    document.getElementById('rotLbl').textContent = 'Vast';
    toast('Gedraaid · de richting staat nu vast', 1400);
    if (mode === 'build' && (!coarse || pendingKey)) updateGhost();
  }
  function resetRotation() {
    manualDir = null;
    document.getElementById('rotLbl').textContent = 'Draai';
    toast('Richting volgt weer je kijkrichting', 1400);
    if (mode === 'build') updateGhost();
  }
  setCat(0);
  function cycleTool(step) {
    const i = TOOLS.indexOf(tool);
    const t = TOOLS[(i + step + TOOLS.length) % TOOLS.length];
    selectTool(t);
    toolBtns[t].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    toast(t === 'gum' ? 'Gum' : TYPES[t].name, 900);
  }
  let terrHintShown = false;
  function selectTool(t) {
    tool = t;
    if ((t === 'heuvel' || t === 'kuil') && !terrHintShown) { terrHintShown = true; setTimeout(() => toast(t === 'heuvel' ? 'Klik nog eens op hetzelfde vak: 3 m hoger · [ ] maakt het penseel groter' : 'Op een heuvel: 3 m lager · op vlakke grond: een uitgraving · [ ] penseel', 3200), 50); }
    if (t !== 'gum' && catOf(t) !== catIdx) setCat(catOf(t));
    for (const k in toolBtns) toolBtns[k].setAttribute('aria-pressed', String(k === t));
    placeBtn.textContent = t === 'gum' ? 'Weg' : 'Bouw';
    rotBtn.hidden = !DIRECTIONAL.has(t) && t !== 'module';
    if (t === 'module' && moduleSel === null) { if (modules.length) moduleSel = 0; else openSchets(); }
    if (t === 'module' && CATS[catIdx].name === 'Modules') renderModCards();
    try { refreshOpt(); } catch (e) { /* optiebalk bestaat nog niet tijdens het opstarten */ }
    pendingKey = null; if (coarse && mode === 'build') { ghost.visible = false; ghostArrow.visible = false; }
    if (mode === 'build') updateGhost();
    if (t === 'dak' && !dakHintShown) { dakHintShown = true; toast((coarse ? 'Tik' : 'Klik') + ' op een dak voor een dakkapel · nog eens voor voor en achter · nog eens voor zonder', 3600); }
    if (t === 'pad' && !padHintShown) { padHintShown = true; toast((coarse ? 'Pad: vasthouden en slepen trekt een pad · tik' : 'Pad: ingedrukt houden en slepen trekt een pad · klik') + ' op een pad voor bomen of een andere richting', 4200); }
  }

  // ---------- Toast & menu ----------
  const toastEl = document.getElementById('toast');
  let toastTimer = 0;
  function toast(msg, ms = 2200) {
    toastEl.textContent = msg; toastEl.classList.remove('fade');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.add('fade'), ms);
  }
  const sheet = document.getElementById('sheet');
  menuBtn.addEventListener('click', () => { sheet.hidden = false; });

  // ---------- Tijd van de dag: knop, paneel ----------
  const todBtn = document.getElementById('todBtn'), todPanel = document.getElementById('todPanel'), todRange = document.getElementById('todRange');
  const todAutoBtn = document.getElementById('todAutoBtn'), todLblEl = document.getElementById('todLbl'), todIconEl = document.getElementById('todIcon');
  const todTimeEl = document.getElementById('todTime'), todNameEl = document.getElementById('todName');
  const todName = t => t >= 5 && t < 8 ? 'Zonsopgang' : t >= 8 && t < 12 ? 'Ochtend' : t >= 12 && t < 17 ? 'Middag' : t >= 17 && t < 20 ? 'Avond' : t >= 20 && t < 22 ? 'Schemering' : 'Nacht';
  function ui() {
    const t = DN.st.tod, h = Math.floor(t), m = Math.floor((t - h) * 60), txt = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    todLblEl.textContent = txt; todIconEl.textContent = nightK > 0.5 ? '☾' : '☀';
    if (!todPanel.hidden) { todTimeEl.textContent = txt; todNameEl.textContent = todName(t); if (document.activeElement !== todRange) todRange.value = t; }
    todAutoBtn.setAttribute('aria-pressed', String(DN.st.auto)); todAutoBtn.textContent = 'Tijd loopt: ' + (DN.st.auto ? 'aan' : 'uit');
  }
  function toggleTod(open) {
    todPanel.hidden = open === undefined ? !todPanel.hidden : !open; todBtn.setAttribute('aria-expanded', String(!todPanel.hidden)); ui();
  }
  todBtn.addEventListener('click', e => { e.stopPropagation(); toggleTod(); });
  todPanel.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('pointerdown', e => { if (!todPanel.hidden && !todPanel.contains(e.target) && e.target !== todBtn && !todBtn.contains(e.target)) toggleTod(false); });
  todRange.addEventListener('input', () => { DN.set(+todRange.value); ui(); });
  todPanel.querySelectorAll('[data-tod]').forEach(b => b.addEventListener('click', () => { DN.set(+b.dataset.tod); ui(); }));
  todAutoBtn.addEventListener('click', () => { DN.st.auto = !DN.st.auto; DN.set(DN.st.tod); ui(); });
  DN.apply(); ui(); window.__DN = DN; window.__mods = modules; window.__saveMods = () => { saveMods(); renderModCards(); }; window.__libStandard = libStandard; window.__match = matchingModules; window.__libInstall = libInstall; window.__modDbg = () => { let walls = 0, surfaces = 0; for (const L of modCols.values()) for (const c of L) { walls += c.walls.length; surfaces += c.surfaces.length; } return { walls, surfaces, floorAt, blockedAt, mv2Build, mv2New }; }; window.__SC = () => ({ roadTop, terrainHeightAt, pathProf, pathH, player, walkAction, pick, hand: () => hand, getCells: () => cells, cars, people, buildPathNet, openSchets, cover: () => [...vecCover], canPlace, place, scene, renderer, orbit, applyOrbit, camera, edgeMid: k => { const [q, r, kk] = k.split(',').map(Number), [a, b] = edgeEnds(q, r, kk), v = new THREE.Vector3((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2).project(camera); return [(v.x + 1) / 2 * window.innerWidth, (1 - v.y) / 2 * window.innerHeight]; }, dbgPick: (x, y) => { const r = pick(x, y); return r && r.point ? { p: [r.point.x, r.point.z], ne: nearestExistingEdge(r.point.x, r.point.z, 4.5), n2: nearestEdge(r.point.x, r.point.z), tool } : r; }, setCells: o => { cells = new Map(Object.entries(o)); rebuildAll(); } });

  // ---------- Optiebalk onderaan: opties van het gekozen blok + spelinstellingen ----------
  const optTool = document.getElementById('ogTool'), optToolName = document.getElementById('ogToolName');
  const optRot = document.getElementById('optRot'), optAutoDir = document.getElementById('optAutoDir'), optGrid = document.getElementById('optGrid');
  const optClock = document.getElementById('optClock'), optPeople = document.getElementById('optPeople'), optCars = document.getElementById('optCars');
  const optSpeed = document.getElementById('optSpeed');
  function refreshOpt() {
    const rotatable = DIRECTIONAL.has(tool);
    optTool.hidden = !rotatable;
    if (rotatable) {
      optToolName.textContent = TYPES[baseOf(tool)].name;
      optAutoDir.setAttribute('aria-pressed', String(manualDir !== null));
      optAutoDir.textContent = manualDir !== null ? 'Richting: vast' : 'Richting: auto';
    }
    optGrid.setAttribute('aria-pressed', String(gridOn));
    optPeople.setAttribute('aria-pressed', String(people.on)); optCars.setAttribute('aria-pressed', String(cars.on));
    const sp = DN.st.auto ? DN.st.speed : 0;
    optSpeed.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sp === sp)));
  }
  optRot.addEventListener('click', () => { rotateDir(); refreshOpt(); });
  optAutoDir.addEventListener('click', () => { if (manualDir !== null) resetRotation(); else rotateDir(); refreshOpt(); });
  optGrid.addEventListener('click', () => { gridOn = !gridOn; gridLines.visible = gridOn && mode !== 'walk'; try { localStorage.setItem('hexstad-raster', gridOn ? '1' : '0'); } catch (e) {} refreshOpt(); });
  try { if (localStorage.getItem('hexstad-raster') === '0') { gridOn = false; gridLines.visible = false; } } catch (e) {}
  optPeople.addEventListener('click', () => { people.setOn(!people.on); toast(people.on ? 'Er lopen weer mensen door de stad' : 'Geen mensen meer op straat', 1400); refreshOpt(); });
  optCars.addEventListener('click', () => { cars.setOn(!cars.on); toast(cars.on ? 'Er rijden weer auto\'s' : 'Geen auto\'s meer op straat', 1400); refreshOpt(); });
  optSpeed.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const v = +b.dataset.sp;
    if (v === 0) DN.st.auto = false; else { DN.st.auto = true; DN.st.speed = v; }
    DN.set(DN.st.tod); ui(); refreshOpt();
  });
  setInterval(() => { optClock.textContent = todLblEl.textContent; refreshOpt(); }, 500);
  refreshOpt();

  // Vervangen of wissen van de hele stad kan 10 seconden worden teruggedraaid
  const undoBtn = document.getElementById('undoBtn');
  let undoCells = null, undoTimer = 0;
  function offerUndo() {
    undoCells = new Map([...cells].map(([k, st]) => [k, st.slice()]));
    if (cells.edges) undoCells.edges = new Map(cells.edges);
    if (cells.tris) undoCells.tris = cells.tris.map(t => ({ k: t.k, v: t.v.slice(), h: t.h }));
    if (cells.paths) undoCells.paths = cells.paths.map(p => ({ t: p.t, l: p.l || 0, r: p.r || 0, p: p.p.map(a => a.slice()) }));
    if (cells.inst) undoCells.inst = cells.inst.slice();
    undoBtn.hidden = false; clearTimeout(undoTimer);
    undoTimer = setTimeout(() => { undoBtn.hidden = true; undoCells = null; }, 10000);
  }
  // Knoppen in het kaartmenu bijwerken
  const mineBtn = document.getElementById('mineBtn'), mineInfo = document.getElementById('mineInfo');
  const adoptBtn = document.getElementById('adoptBtn'), mineNote = document.getElementById('mineNote');
  let adoptArmed = false;
  function hasMine() { try { const m = load(MINE); return !!(m && m.size); } catch (e) { return false; } }
  function refreshMineUI() {
    if (!mineBtn) return;
    let n = 0;
    if (slot === 'mijn') for (const st of cells.values()) n += st.length;
    else { const m = load(MINE); if (m) for (const st of m.values()) n += st.length; }
    mineInfo.textContent = n ? `${n} ${n === 1 ? 'blok' : 'blokken'}` : 'nog leeg';
    mineBtn.setAttribute('aria-current', String(slot === 'mijn'));
    adoptBtn.hidden = slot === 'mijn';
    if (!adoptArmed) adoptBtn.textContent = 'Deze stad bewaren als mijn stad';
    mineNote.textContent = slot === 'mijn'
      ? 'Je eigen stad wordt automatisch bewaard. Een andere stad openen verandert er niets aan.'
      : `Nu open: ${slotName}. Wat je hier bouwt hoort niet bij je eigen stad, tenzij je hem bewaart.`;
  }
  undoBtn.addEventListener('click', () => {
    if (!undoCells) return;
    cells = undoCells; undoCells = null; undoBtn.hidden = true; clearTimeout(undoTimer);
    rebuildAll(); changed(); toast('Je vorige stad is terug');
  });
  sheet.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act && e.target !== sheet) return;
    if (act === 'adopt') {
      if (!adoptArmed && hasMine()) { adoptArmed = true; adoptBtn.textContent = 'Tik nog eens: je huidige eigen stad wordt vervangen'; return; }
      slot = 'mijn'; slotName = 'Mijn stad'; changed(); toast('Bewaard als mijn stad'); adoptArmed = false;
    }
    if (act === 'mine') {
      if (slot !== 'mijn') { cells = load(MINE) || new Map(); sanitize(cells); slot = 'mijn'; slotName = 'Mijn stad'; rebuildAll(); changed(); toast('Je eigen stad is terug'); }
      else toast('Je eigen stad staat al open');
    }
    if (act === 'sketch') { document.getElementById('sheet').hidden = true; openSchets(); return; }
    if (['sample', 'ring', 'random', 'blocks', 'layers', 'empty', 'dorp1', 'dorp2', 'dorp3', 'dorp4'].includes(act)) {
      if (slot !== 'mijn' && cells.size) offerUndo();   // je eigen stad hoeft niet terug: die staat veilig apart
      slot = 'klad';
      slotName = { sample: 'Voorbeeldstad', ring: 'Ringstad', random: 'Willekeurige stad', blocks: 'Blokkenstad', layers: 'Gelaagde stad', empty: 'Lege bouwgrond', dorp1: 'Dorpsstraat', dorp2: 'Dorp met kruising', dorp3: 'Dorp met rotonde', dorp4: 'Dorp met brede weg' }[act];
    }
    if (act.startsWith('dorp')) { cells = roofHouses(dorp(+act[4])); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 120; orbit.phi = 0.85; applyOrbit(); toast('Dorpje geladen · je eigen stad staat veilig onder Mijn stad'); }
    if (act === 'sample') { cells = roofHouses(sampleCity()); rebuildAll(); changed(); toast('Voorbeeldstad geladen · je eigen stad staat veilig onder Mijn stad'); }
    if (act === 'ring') { cells = ringStad(); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 1500; orbit.phi = 0.9; applyOrbit(); toast('Ringstad geladen · je eigen stad staat veilig onder Mijn stad'); }
    if (act === 'random' || act === 'blocks' || act === 'layers') {
      const seed = (Math.random() * 1e9) >>> 0;
      cells = act === 'random' ? randomCity(seed) : act === 'layers' ? terraceCity(seed) : blockCity(seed);
      sanitize(cells); roofHouses(cells); rebuildAll(); changed();
      orbit.target.set(0, 0, 0); orbit.dist = act === 'random' ? 240 : 200; orbit.phi = 0.85; applyOrbit();
      toast({ random: 'Nieuwe stad', blocks: 'Nieuwe blokkenstad', layers: 'Nieuwe gelaagde stad' }[act] + ' · nummer ' + seed + ' · je eigen stad staat veilig');
    }
    if (act === 'home') { orbit.target.set(0, 0, 0); applyOrbit(); toast('Terug in het midden', 1200); }
    if (act === 'empty') { cells = new Map(); rebuildAll(); changed(); toast('Lege bouwgrond · bewaar wat je bouwt via Menu → Deze stad bewaren'); }
    if (act === 'cars') { cars.setOn(!cars.on); toast(cars.on ? 'Er rijden weer auto\'s' : 'Geen auto\'s meer op straat'); }
    if (act === 'people') { people.setOn(!people.on); toast(people.on ? 'Er lopen weer mensen door de stad' : 'Geen mensen meer op straat'); }
    sheet.hidden = true; adoptArmed = false; refreshMineUI();
  });

