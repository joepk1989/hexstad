  // ---------- Palet ----------
  const toolBtns = {};
  let catIdx = 0;
  const catBtn = document.createElement('button');
  catBtn.type = 'button'; catBtn.className = 'cat'; catBtn.id = 'catBtn';
  catBtn.addEventListener('click', () => { setCat((catIdx + 1) % CATS.length); selectTool(CATS[catIdx].tools[0]); });
  const palTabs = document.createElement('div'); palTabs.className = 'pal-tabs'; paletteEl.appendChild(palTabs);
  const palRow = document.createElement('div'); palRow.className = 'pal-row'; paletteEl.appendChild(palRow);
  const toolScroll = document.createElement('div'); toolScroll.className = 'tool-scroll'; palRow.appendChild(toolScroll);
  // pijlen links en rechts (met de muis; op een touchscreen veeg je) en het scrollwiel schuift opzij
  function scrollArrows(sc, host) {
    host.classList.add('sa-host'); const mk = (dir, txt) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'sarrow ' + dir; b.textContent = txt; b.setAttribute('aria-label', dir === 'l' ? 'Naar links' : 'Naar rechts'); b.addEventListener('click', () => sc.scrollBy({ left: (dir === 'l' ? -1 : 1) * Math.max(120, sc.clientWidth * 0.8), behavior: 'smooth' })); host.appendChild(b); return b; };
    const L = mk('l', '‹'), Rr = mk('r', '›');
    const upd = () => { const over = sc.scrollWidth > sc.clientWidth + 2, hr = host.getBoundingClientRect(), r = sc.getBoundingClientRect();
      L.style.left = (r.left - hr.left) + 'px'; Rr.style.right = (hr.right - r.right) + 'px';
      L.hidden = !over || sc.scrollLeft < 4; Rr.hidden = !over || sc.scrollLeft > sc.scrollWidth - sc.clientWidth - 4; };
    sc.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); new MutationObserver(() => requestAnimationFrame(upd)).observe(sc, { childList: true });
    sc.addEventListener('wheel', e => { if (sc.scrollWidth <= sc.clientWidth + 2 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; sc.scrollLeft += e.deltaY; e.preventDefault(); }, { passive: false });
    return upd;
  }
  const toolArrows = scrollArrows(toolScroll, palRow);
  CATS.forEach((c, ci) => { const t = document.createElement('button'); t.type = 'button'; t.className = 'pal-tab'; t.textContent = c.name; t.addEventListener('click', () => { setCat(ci); if (c.name === 'Modules') { renderModCards(); if (!modules.length) openSchets(); } }); /* alleen bladeren: kiezen doe je met een kaartje, dat komt in de snelbalk */ palTabs.appendChild(t); });
  const catOf = t => CATS.findIndex(c => c.tools.includes(t));
  const TOOL_GROUP = { woning: 'Blokken', dak: 'Bovenop' };   // Gebouwen: eerst de blokken, dan wat je erop zet
  function setCat(ci) {
    catIdx = ci;
    catBtn.innerHTML = `<span class="cat-name">${CATS[ci].name}</span><span class="cat-dots">${CATS.map((_, j) => j === ci ? '●' : '○').join('')}</span>`;
    for (const k in toolBtns) if (k !== 'gum') toolBtns[k].hidden = catOf(k) !== ci;
    toolBtns.module.hidden = true;
    toolScroll.querySelectorAll('.tool-sep').forEach(d => { d.hidden = +d.dataset.tab !== ci; });
    palTabs.querySelectorAll('.pal-tab').forEach((t, j) => { t.setAttribute('aria-pressed', String(j === ci)); if (j === ci) t.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
    renderModCards();
  }
  // De andere tabbladen tonen ook de modules die erbij horen (achter de gewone gereedschappen), per categorie
  const isWaterMod = m => /^(Haven|Kade|Water|Woonboot)\b/.test(m.name || '');
  const TAB_MODS = {
    'Wegen': m => m.cat === 'Vervoer' && !isWaterMod(m),
    'Paden': m => m.cat === 'Verbindingen' || m.cat === 'Pleinen',
    'Gebouwen': m => ['Wonen', 'Werken', 'Winkels', 'Horeca', 'Winkelcentrum', 'Openbaar', 'Sport', 'Voorzieningen'].includes(m.cat) && !isWaterMod(m),
    'Groen en water': m => m.cat === 'Groen' || isWaterMod(m),
    'Terrein': m => m.cat === 'Bouwdelen' && !isWaterMod(m),
  };
  function renderModCards() {
    toolScroll.querySelectorAll('.modcard, .modcard-sep:not(.tool-sep), .todo').forEach(n => n.remove());
    for (const nm of (CATS[catIdx].todo || [])) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool todo'; b.title = nm + ': nog te bepalen'; b.disabled = true;
      b.innerHTML = '<span class="sw sw-todo">?</span>' + nm; toolScroll.appendChild(b);
    }
    const isMod = CATS[catIdx].name === 'Modules', tabF = TAB_MODS[CATS[catIdx].name];
    modBar.hidden = !isMod;
    if (!isMod && !tabF) return;
    if (!isMod) { const sep = document.createElement('div'); sep.className = 'modcard-sep'; sep.textContent = 'Modules'; toolScroll.appendChild(sep); }
    if (isMod) renderModBar();
    if (isMod) { const add = document.createElement('button'); add.type = 'button'; add.className = 'tool modcard add'; add.innerHTML = '<span class="plus">+</span><span class="nm">Nieuw</span>'; add.addEventListener('click', () => openSchets()); toolScroll.appendChild(add); }
    if (isMod ? (['Alles', 'Winkelcentrum', 'Winkels'].includes(modCat) && !modQuery || /winkel/i.test(modQuery || '')) : CATS[catIdx].name === 'Gebouwen') { const g = document.createElement('button'); g.type = 'button'; g.className = 'tool modcard add gen'; g.title = 'Nieuw winkelcentrum: elke klik een nieuwe variant (1–3 lagen, andere winkels, materialen en dak). Daarna klik je in de stad om hem neer te zetten.';
      g.innerHTML = '<span class="plus">🎲</span><span class="nm">Winkelcentrum</span><span class="nv">nieuw</span>';
      g.addEventListener('click', () => { const m = mallGenerate(); let n = 2; const base = m.name; while (modules.some(x => x.name === m.name)) m.name = base.replace(/^(Winkelcentrum · [^·]+?)( · )/, '$1 ' + (n++) + '$2'); m.id = uid(); m._sig = Date.now(); modules.push(m); saveMods();
        moduleSel = modules.length - 1; moduleGhostKey = ''; selectTool('module'); renderModCards(); toast('"' + m.name + '" gemaakt · klik in de stad om hem neer te zetten (de dobbelsteen maakt een volgende variant)', 3500); });
      toolScroll.appendChild(g); }
    const queue = [], list = isMod ? modVisible() : modules.map((m, i) => i).filter(i => modules[i].v === 2 && tabF(modules[i])).sort((a, b) => { const A = modules[a], B = modules[b]; return catOrd(modCatOf(A)) - catOrd(modCatOf(B)) || coll.compare(A.name || '', B.name || ''); });
    let lastCat = null;
    for (const i of list) {
      const m = modules[i], M = modMeta(m), cat = m.v === 2 ? (m.cat || 'Overig') : 'Oude schets';
      if ((!isMod || modCat === 'Alles' && !modQuery) && cat !== lastCat) { const d = document.createElement('div'); d.className = 'modcard-sep'; d.textContent = cat; toolScroll.appendChild(d); lastCat = cat; }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tool modcard'; b.dataset.mi = i;
      b.title = m.name + '\n' + cat + ' · ' + (M.n === 7 ? '7 vakken' : '1 vak') + (M.bouw ? ' · ' + M.fl + (M.fl === 1 ? ' laag' : ' lagen') + ' (' + M.h + ' m)' : '') + ' · ' + ({ kap: 'schuin dak', plat: 'plat dak (stapelbaar)', open: 'open' })[M.top] + (M.deur ? ' · ' + M.deur + (M.deur === 1 ? ' deur' : ' deuren') : '') + (m.v === 2 ? '\nKlik: kiezen · dubbelklik: bewerken · rechtermuisknop: verwijderen' : '');
      b.setAttribute('aria-pressed', String(tool === 'module' && i === moduleSel));
      const rot = i === moduleSel ? moduleRot : 0, c = document.createElement('canvas'); c.width = c.height = 92; c.style.width = c.style.height = '46px';
      const th = document.createElement('span'); th.className = 'mth'; th.appendChild(c);
      const badge = (M.bouw ? M.fl + 'L' : '') + (M.k ? (M.bouw ? ' ' : '') + '7v' : ''); if (badge) { const bd = document.createElement('i'); bd.className = 'mbadge'; bd.textContent = badge; th.appendChild(bd); }
      if (M.stack) { const st = document.createElement('i'); st.className = 'mstack'; st.title = 'Plat dak: stapelbaar'; th.appendChild(st); }
      b.appendChild(th);
      if (m.v === 2) queue.push(() => { const t = mv2Thumb(m, rot, 46); c.getContext('2d').drawImage(t, 0, 0, 92, 92); }); else { const t = modThumb(m, rot, 46); c.getContext('2d').drawImage(t, 0, 0, 92, 92); }
      const parts = (m.name || '').split(' · '), fam = parts[0], rest = parts.slice(1).filter(x => !/^\d+[Lv]$/.test(x)).join(' · ');
      const sp = document.createElement('span'); sp.className = 'nm'; sp.textContent = fam; b.appendChild(sp);
      if (rest) { const sv = document.createElement('span'); sv.className = 'nv'; sv.textContent = rest; b.appendChild(sv); }
      b.addEventListener('click', () => { moduleSel = i; moduleGhostKey = ''; selectTool('module'); renderModCards(); });
      if (m.v === 2) b.addEventListener('dblclick', () => openSchets(m));
      let delArm = 0;   // rechtermuisknop: verwijderen (tweede keer binnen 4 s bevestigt)
      b.addEventListener('contextmenu', ev => { ev.preventDefault(); const now = performance.now(); if (now - delArm > 4000) { delArm = now; b.classList.add('warn'); toast('"' + m.name + '" verwijderen? Nog eens rechtermuisknop om te bevestigen (geplaatste exemplaren gaan ook weg)', 4000); return; }
        dropModule(m); const i2 = modules.indexOf(m); if (i2 >= 0) modules.splice(i2, 1); if (moduleSel === i2) moduleSel = modules.length ? 0 : null; else if (moduleSel > i2) moduleSel--; saveMods(); renderModCards(); toast('"' + m.name + '" verwijderd', 1500); });
      toolScroll.appendChild(b);
    }
    if (!list.length) { const d = document.createElement('div'); d.className = 'modcard-sep empty'; d.textContent = modQuery ? 'Niets gevonden voor "' + modQuery + '"' : 'Nog niets'; toolScroll.appendChild(d); }
    const sel = toolScroll.querySelector('.modcard[aria-pressed="true"]'); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const tick = () => { const t0 = performance.now(); while (queue.length && performance.now() - t0 < 12) queue.shift()(); if (queue.length) setTimeout(tick, 0); }; tick();
  }
  // ---------- Bladeren door de modules: zoeken, categorieën, maat, recent ----------
  // Volgorde: categorie (vaste volgorde), dan naam (natuurlijk: 2L voor 10L). Zoeken kijkt in naam en categorie;
  // elk zoekwoord moet het begin van een woord zijn ("rij hout", "glas 7", "plein 7v").
  const modBar = document.createElement('div'); modBar.className = 'modbar'; modBar.hidden = true; paletteEl.insertBefore(modBar, palRow);
  let modQuery = '', modSize = 0, modStack = false;   // modSize: 0 alle, 1 één vak, 7 zeven vakken
  let modRecent = []; try { modRecent = JSON.parse(localStorage.getItem('raatstad-modrecent') || '[]'); } catch (e) { /* geen opslag */ }
  function modUsed(m) { if (!m || !m.id) return; modRecent = [m.id, ...modRecent.filter(x => x !== m.id)].slice(0, 16); try { localStorage.setItem('raatstad-modrecent', JSON.stringify(modRecent)); } catch (e) { /* geen opslag */ } }
  const coll = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
  const catOrd = c => { const i = MV2.cats.indexOf(c); return i < 0 ? 99 : i; };
  const modCatOf = m => m.v === 2 ? (m.cat || 'Overig') : 'Oude schets';
  function modMatch(m, cat) {
    if (cat === 'Recent') { if (!modRecent.includes(m.id)) return false; }
    else if (cat !== 'Alles' && modCatOf(m) !== cat) return false;
    const M = modMeta(m);
    if (modSize && M.n !== modSize) return false;
    if (modStack && !M.stack) return false;
    if (modQuery) { const words = (m.name + ' ' + modCatOf(m)).toLowerCase().split(/[\s·()]+/).filter(Boolean); if (!modQuery.toLowerCase().split(/\s+/).every(w => words.some(x => x.startsWith(w)))) return false; }   // elk zoekwoord is het begin van een woord in de naam
    return true;
  }
  function modVisible() {
    const idx = modules.map((m, i) => i).filter(i => modMatch(modules[i], modCat));
    if (modCat === 'Recent') return idx.sort((a, b) => modRecent.indexOf(modules[a].id) - modRecent.indexOf(modules[b].id));
    return idx.sort((a, b) => { const A = modules[a], B = modules[b]; return catOrd(modCatOf(A)) - catOrd(modCatOf(B)) || coll.compare(A.name || '', B.name || ''); });
  }
  function setModCat(c) { modCat = c; try { localStorage.setItem('raatstad-modcat', c); } catch (e) { /* geen opslag */ } renderModCards(); toolScroll.scrollLeft = 0; }
  function renderModBar() {
    if (!modBar.firstChild) {
      modBar.innerHTML = '<label class="msearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg><input type="search" id="modSearch" placeholder="Zoek module  ( / )" autocomplete="off" spellcheck="false" aria-label="Zoek module"></label><div class="mchips" id="modChips"></div><div class="mfilt"><button type="button" data-sz="1" title="Alleen modules van 1 vak">1 vak</button><button type="button" data-sz="7" title="Alleen modules van 7 vakken">7 vakken</button><button type="button" data-st="1" title="Alleen modules met een plat dak (stapelbaar)">Plat dak</button></div>';
      const inp = modBar.querySelector('#modSearch');
      inp.addEventListener('input', () => { modQuery = inp.value.trim(); renderModCards(); });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Escape') { inp.value = ''; modQuery = ''; inp.blur(); renderModCards(); }
        if (e.key === 'Enter') { const l = modVisible(); if (l.length) { moduleSel = l[0]; moduleGhostKey = ''; selectTool('module'); inp.blur(); renderModCards(); toast(modules[moduleSel].name, 900); } }
        e.stopPropagation();
      });
      modBar.querySelectorAll('[data-sz]').forEach(b => b.addEventListener('click', () => { const v = +b.dataset.sz; modSize = modSize === v ? 0 : v; renderModCards(); }));
      modBar.querySelector('[data-st]').addEventListener('click', () => { modStack = !modStack; renderModCards(); });
    }
    const chips = modBar.querySelector('#modChips'); chips.innerHTML = ''; if (!chips.parentElement.classList.contains('mchips-wrap')) { const w = document.createElement('div'); w.className = 'mchips-wrap'; chips.parentElement.insertBefore(w, chips); w.appendChild(chips); renderModBar.arrows = scrollArrows(chips, w); }
    const cats = ['Alles', ...(modRecent.some(id => modules.some(m => m.id === id)) ? ['Recent'] : []), ...MV2.cats.filter(c => modules.some(m => modCatOf(m) === c)), ...(modules.some(m => m.v !== 2) ? ['Oude schets'] : [])];
    if (!cats.includes(modCat)) modCat = 'Alles';
    for (const c of cats) {
      const n = modules.filter(m => modMatch(m, c)).length;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mchip'; b.setAttribute('aria-pressed', String(c === modCat)); b.innerHTML = c + (c === 'Recent' ? '' : ' <b>' + n + '</b>'); if (!n && c !== modCat) b.classList.add('none');
      b.addEventListener('click', () => setModCat(c)); chips.appendChild(b);
    }
    modBar.querySelectorAll('[data-sz]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sz === modSize)));
    modBar.querySelector('[data-st]').setAttribute('aria-pressed', String(modStack));
    if (renderModBar.arrows) requestAnimationFrame(renderModBar.arrows); requestAnimationFrame(toolArrows);
  }
  // vorige / volgende module in de zichtbare lijst (sneltoetsen , en .)
  function modStep(d) {
    const l = modVisible(); if (!l.length) return;
    if (CATS[catIdx].name !== 'Modules') setCat(CATS.findIndex(c => c.name === 'Modules'));
    const at = l.indexOf(moduleSel), n = at < 0 ? (d > 0 ? 0 : l.length - 1) : (at + d + l.length) % l.length;
    moduleSel = l[n]; moduleGhostKey = ''; selectTool('module'); renderModCards(); toast(modules[moduleSel].name, 900);
  }
  let modCat = 'Alles'; try { modCat = localStorage.getItem('raatstad-modcat') || 'Alles'; } catch (e) { /* geen opslag */ }
  const tsvg = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const TERR_SVG = {
    tophoog: tsvg('<path d="M2 20c4-1 5-9 10-9s6 8 10 9" fill="#6fa356" stroke="#3d6b2c"/><path d="M12 9V2M9 5l3-3 3 3" stroke="#fff"/>'),
    tafgraaf: tsvg('<path d="M2 8c4 1 5 9 10 9s6-8 10-9v14H2z" fill="#6fa356" stroke="#3d6b2c"/><path d="M12 2v7M9 6l3 3 3-3" stroke="#fff"/>'),
    tvlak: tsvg('<path d="M2 20V13h20v7z" fill="#6fa356" stroke="#3d6b2c"/><path d="M3 9h18" stroke="#fff"/><path d="M8 6l-3 3 3 3M16 6l3 3-3 3" stroke="#fff"/>'),
    tglad: tsvg('<path d="M2 20c3 0 4-6 7-6s4 3 6 3 4-5 7-5v8z" fill="#6fa356" stroke="#3d6b2c"/><path d="M4 8c3-3 6 2 8 0s5-3 8 0" stroke="#fff"/>'),
    spoor: tsvg('<path d="M8 2L5 22M16 2l3 20" stroke-width="2.2"/><path d="M6 6h12M5.5 10.5h13M5 15h14M4.5 19.5h15" stroke="#8a6a4e" stroke-width="1.8"/>'),
    thelling: tsvg('<path d="M2 20L22 7v13z" fill="#6fa356" stroke="#3d6b2c"/><circle cx="5" cy="17" r="1.6" fill="#fff" stroke="none"/><circle cx="19" cy="8" r="1.6" fill="#fff" stroke="none"/><path d="M6.5 15.5l10-6" stroke="#fff" stroke-dasharray="2 2"/>'),
  };
  TOOLS.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tool'; b.id = 'tool-' + t;
    b.title = t === 'gum' ? 'Gum: haalt de bovenste laag weg' : VEC_TOOLS.has(t) ? TYPES[t].name + ': klik een knooppunt en dan het volgende vak (of sleep); rechtermuisknop stopt, gum haalt de hele weg weg' : TYPES[t].name;
    b.innerHTML = `<span class="sw sw-${t}">${TERR_SVG[t] ? TERR_SVG[t] : t === 'gum' ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' : ''}</span>${t === 'gum' ? 'Gum' : (TOOL_LABEL[t] || TYPES[t].name)}`;
    b.addEventListener('click', () => selectTool(t));
    { const lab = TOOL_GROUP[t]; if (lab) { const d = document.createElement('div'); d.className = 'modcard-sep tool-sep'; d.dataset.tab = catOf(t); d.textContent = lab; toolScroll.appendChild(d); } }   /* groepjes binnen een tabblad */
    (t === 'gum' ? palRow : toolScroll).appendChild(b); toolBtns[t] = b;
  });
  // Draaiknop: verschijnt bij blokken met een richting (tribune, trap, helling, …)
  const rotBtn = document.createElement('button');
  rotBtn.type = 'button'; rotBtn.className = 'tool rot'; rotBtn.id = 'rotBtn'; rotBtn.hidden = true;
  rotBtn.title = 'Draai 60° (R) · lang indrukken of Shift+R: weer automatisch';
  rotBtn.innerHTML = '<span class="sw sw-rot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg></span><span id="rotLbl">Draai</span>';
  palRow.insertBefore(rotBtn, toolBtns.gum);
  // Spiegelknop: een module in spiegelbeeld plaatsen (toets F)
  const mirBtn = document.createElement('button');
  mirBtn.type = 'button'; mirBtn.className = 'tool rot'; mirBtn.id = 'mirBtn'; mirBtn.hidden = true; mirBtn.title = 'Spiegelen (F): de module in spiegelbeeld plaatsen';
  mirBtn.innerHTML = '<span class="sw sw-rot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18" stroke-dasharray="2 2.5"/><path d="M9 7L4 17h5zM15 7l5 10h-5z"/></svg></span><span>Spiegel</span>';
  palRow.insertBefore(mirBtn, toolBtns.gum);
  function toggleMirror() { if (tool !== 'module') return; moduleMir = !moduleMir; mirBtn.setAttribute('aria-pressed', String(moduleMir)); moduleGhostKey = ''; toast(moduleMir ? 'Gespiegeld' : 'Niet gespiegeld', 900); if (mode === 'build') updateGhost(); }
  mirBtn.addEventListener('click', toggleMirror);
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
  function cycleTool(step) { hotStep(step); }   // scrollwiel: door de snelbalk (15d)
  let terrHintShown = false;
  function selectTool(t) {
    if (t !== tool && typeof vecChainEnd === 'function') vecChainEnd(true);
    tool = t;
    if (TERR_TOOLS.has(t) && !terrHintShown) { terrHintShown = true; setTimeout(() => toast((coarse ? 'Vasthouden en slepen' : 'Ingedrukt houden en slepen') + ' om te boetseren · Shift: andersom · [ ] penseel', 3200), 50); }
    { let cw = true; try { cw = setState.contour; } catch (e) { /* instellingen nog niet geladen */ } terrU.uContour.value = TERR_TOOLS.has(t) && cw ? 1 : 0; } if (!TERR_TOOLS.has(t)) { brushRing.hide(); terrLbl.hidden = true; }
    if (t !== 'gum' && t !== 'kies' && catOf(t) !== catIdx && !(t === 'module' && TAB_MODS[CATS[catIdx].name])) setCat(catOf(t));   /* een module uit een ander tabblad: daar blijven */
    for (const k in toolBtns) toolBtns[k].setAttribute('aria-pressed', String(k === t));
    placeBtn.textContent = t === 'gum' ? 'Weg' : 'Bouw';
    rotBtn.hidden = !DIRECTIONAL.has(t) && t !== 'module'; mirBtn.hidden = t !== 'module'; mirBtn.setAttribute('aria-pressed', String(moduleMir));
    if (t === 'module' && moduleSel === null) { if (modules.length) moduleSel = 0; else openSchets(); }
    if (t === 'module' && CATS[catIdx].name === 'Modules') renderModCards();
    try { refreshOpt(); } catch (e) { /* optiebalk bestaat nog niet tijdens het opstarten */ }
    if (typeof kiesOnTool === 'function') kiesOnTool(t);
    if (typeof hudOnTool === 'function') hudOnTool(t);   // snelbalk en gereedschap bijwerken (15d)
    pendingKey = null; if (coarse && mode === 'build') { ghost.visible = false; ghostArrow.visible = false; }
    if (mode === 'build') updateGhost();
    if (t !== 'spoor') spoor.end(true);
    if (t === 'spoor') toast((coarse ? 'Tik' : 'Klik') + ' vak na vak voor een spoorlijn · de uiteinden lopen door tot voorbij de horizon · een treinstation ernaast wordt een halte', 3200);
    if (t === 'vrot') toast((coarse ? 'Tik' : 'Klik') + ' op een vak voor een rotonde · trek daarna wegen naar het midden', 2600);
    if (t === 'vsnel') toast('Snelweg: wegen die hem kruisen gaan er vanzelf met een viaduct overheen', 2600);
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
  DN.apply(); ui(); window.__DN = DN; window.__mods = modules; window.__saveMods = () => { saveMods(); renderModCards(); }; window.__libStandard = libStandard; window.__libBuilder = libBuilder; window.__match = matchingModules; window.__libInstall = libInstall; window.__modDbg = () => { let walls = 0, surfaces = 0; for (const L of modCols.values()) for (const c of L) { walls += c.walls.length; surfaces += c.surfaces.length; } return { walls, surfaces, floorAt, blockedAt, whyBlocked, mv2Build, mv2New, walkWalls: (lv, x, z) => (modWalkDbg.wallsNear ? modWalkDbg.wallsNear(lv, x, z) : []).filter(w => Math.hypot(w.mid[0] - x, w.mid[1] - z) < 1.5).map(w => ({ from: w.from || w.o, o: w.o, pass: w.pass, a: w.a.map(v => +v.toFixed(2)), b: w.b.map(v => +v.toFixed(2)) })) }; }; window.__SC = () => ({ flyCam, kogels, collapse, modBatch: () => ({ on: BATCH_ON, batches: modBatches.size, meshes: [...modBatches.values()].reduce((n, b) => n + b.meshes.length, 0), rebuild: () => { for (const B of modBatches.values()) B.sig = '#'; buildModNet(); } }), selectTool, sound, chatter, cellToWorld, worldToCell, colMap, instData, libStandard, mv2Tf, mv2P, mv2Ts, MV2, keys, updateWalk, floorAt, blockedAt, roadTop, terrainHeightAt, terrGround, terrSet, terrFlush, gH, tChunks, tRoadSegs: () => tRoadSegs, pathProf, pathH, player, walkAction, pick, hand: () => hand, getCells: () => cells, cars, people, buildPathNet, openSchets, cover: () => [...vecCover], canPlace, place, scene, renderer, orbit, applyOrbit, camera, edgeMid: k => { const [q, r, kk] = k.split(',').map(Number), [a, b] = edgeEnds(q, r, kk), v = new THREE.Vector3((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2).project(camera); return [(v.x + 1) / 2 * window.innerWidth, (1 - v.y) / 2 * window.innerHeight]; }, dbgPick: (x, y) => { const r = pick(x, y); return r && r.point ? { p: [r.point.x, r.point.z], ne: nearestExistingEdge(r.point.x, r.point.z, 4.5), n2: nearestEdge(r.point.x, r.point.z), tool } : r; }, doAct, spoor, serialize, parseCity, CITY, modSel: i => { moduleSel = i; moduleGhostKey = ""; }, pathProf, deckCells, overRoadLv, buildLegs: () => legData, setCells: (o, inst) => { cells = new Map(Object.entries(o)); if (inst) cells.inst = inst; rebuildAll(); }, rebuildAll, buildModNet });

  // ---------- Optiebalk onderaan: opties van het gekozen blok + spelinstellingen ----------
  const optGrid = document.getElementById('optGrid'), optPeople = document.getElementById('optPeople'), optCars = document.getElementById('optCars');
  const optSpeed = document.getElementById('optSpeed');
  function refreshOpt() {
    optGrid.setAttribute('aria-pressed', String(gridOn));
    optPeople.setAttribute('aria-pressed', String(people.on)); optCars.setAttribute('aria-pressed', String(cars.on));
    const sp = DN.st.auto ? DN.st.speed : 0;
    optSpeed.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.sp === sp)));
  }
  optGrid.addEventListener('click', () => { gridOn = !gridOn; gridLines.visible = gridOn && mode !== 'walk'; try { localStorage.setItem('raatstad-raster', gridOn ? '1' : '0'); } catch (e) {} refreshOpt(); });
  try { if (localStorage.getItem('raatstad-raster') === '0') { gridOn = false; gridLines.visible = false; } } catch (e) {}
  optPeople.addEventListener('click', () => { people.setOn(!people.on); toast(people.on ? 'Er lopen weer mensen door de stad' : 'Geen mensen meer op straat', 1400); refreshOpt(); });
  optCars.addEventListener('click', () => { cars.setOn(!cars.on); toast(cars.on ? 'Er rijden weer auto\'s' : 'Geen auto\'s meer op straat', 1400); refreshOpt(); });
  optSpeed.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const v = +b.dataset.sp;
    if (v === 0) DN.st.auto = false; else { DN.st.auto = true; DN.st.speed = v; }
    DN.set(DN.st.tod); ui(); refreshOpt();
  });
  setInterval(refreshOpt, 500);
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
    if (cells.terr) undoCells.terr = { ...cells.terr };
    if (cells.sec) undoCells.sec = { ...cells.sec };
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
    if (!adoptArmed) adoptBtn.querySelector('b').textContent = 'Deze stad bewaren als mijn stad';
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
    doAct(act || 'cancel');
  });
  function doAct(act) {
    vecChainEnd(true);
    if (act === 'adopt') {
      if (!adoptArmed && hasMine()) { adoptArmed = true; adoptBtn.querySelector('b').textContent = 'Tik nog eens: je huidige eigen stad wordt vervangen'; return; }
      slot = 'mijn'; slotName = 'Mijn stad'; changed(); toast('Bewaard als mijn stad'); adoptArmed = false;
    }
    if (act === 'welcome') { sheet.hidden = true; openWelcome(); return; }
    if (act === 'mine') {
      if (slot !== 'mijn') { INC.reset(); collapse.reset(); }
      if (slot !== 'mijn') { cells = load(MINE) || new Map(); sanitize(cells); slot = 'mijn'; slotName = 'Mijn stad'; rebuildAll(); changed(); toast('Je eigen stad is terug'); }
      else toast('Je eigen stad staat al open');
    }
    if (act === 'sketch') { document.getElementById('sheet').hidden = true; openSchets(); return; }
    if (['start', 'sample', 'ring', 'random', 'blocks', 'layers', 'empty', 'dorp1', 'dorp2', 'dorp3', 'dorp4', 'mall', 'stad', 'file'].includes(act) || act.startsWith('gen:')) {
      INC.reset(); collapse.reset(); kogels.clear();   // een nieuwe stad: teller met ongelukjes en kapotte gebouwen beginnen opnieuw
      if (slot !== 'mijn' && cells.size) offerUndo();   // je eigen stad hoeft niet terug: die staat veilig apart
      slot = 'klad';
      slotName = act.startsWith('gen:') ? ({ dorp: 'Willekeurig dorp', kruis: 'Honingraatstad', ring: 'Zeshoekige ringstad', rotonde: 'Dorp met rotonde (zes armen)' }[act.split(':')[1]] || 'Gegenereerde stad') : { start: 'Startstadje', stad: 'Grote stad', file: 'Filestad', sample: 'Voorbeeldstad', ring: 'Ringstad', random: 'Willekeurige stad', blocks: 'Blokkenstad', layers: 'Gelaagde stad', empty: 'Lege bouwgrond', dorp1: 'Dorpsstraat', dorp2: 'Dorp met kruising', dorp3: 'Dorp met rotonde', mall: 'Winkelcentrum', dorp4: 'Dorp met brede weg' }[act];
    }
    if (act.startsWith('dorp')) { cells = roofHouses(dorp(+act[4])); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 120; orbit.phi = 0.85; applyOrbit(); toast('Dorpje geladen · je eigen stad staat veilig onder Mijn stad'); }
    if (act === 'stad') { cells = raatstadCity(); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 520; orbit.phi = 0.9; orbit.theta = 0.5; applyOrbit(); toast('Raatstad geladen: rotonde in het midden, zes buurten binnen de ringweg · je eigen stad staat veilig onder Mijn stad', 3500); }
    if (act === 'file') { cells = fileCity(); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 230; orbit.phi = 0.95; orbit.theta = 0.4; applyOrbit(); toast('Filestad geladen: één drukke kruising met zes takken · wacht een minuutje op de file … en op de Hulk', 4000); }
    if (act === 'mall') { cells = mallCity(); rebuildAll(); changed(); orbit.target.set(0, 6, 0); orbit.dist = 220; orbit.phi = 0.95; orbit.theta = 0.6; applyOrbit(); toast('Winkelcentrum geladen: hex-modules in vier lagen · klik op een dak om erop te bouwen', 3500); }
    if (act === 'copycity') {
      const txt = serialize(cells), done = () => toast('Stad gekopieerd (' + cells.size + ' vakken) · plak de code ergens om te delen', 2400);
      try { navigator.clipboard.writeText(txt).then(done, () => { toast('Kopiëren mislukt: klembord niet toegestaan', 2400); }); } catch (e) { toast('Kopiëren mislukt', 2000); }
      return;
    }
    if (act === 'pastecity') {
      try { navigator.clipboard.readText().then(t => { const m = parseCity((t || '').trim()); if (!m || !m.size && !(m.paths && m.paths.length)) return toast('Geen stadscode in het klembord', 2400); INC.reset(); collapse.reset(); cells = roofHouses(m); sheet.hidden = true; rebuildAll(); changed(); buildPathNet(); toast('Stad geplakt: ' + m.size + ' vakken', 2000); }, () => toast('Plakken mislukt: klembord niet toegestaan', 2400)); } catch (e) { toast('Plakken mislukt', 2000); }
      return;
    }
    if (act.startsWith('gen:')) { const [, lay, sd] = act.split(':'); cells = genTown(sd ? +sd : Math.floor(Math.random() * 1e6), lay); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 260; orbit.phi = 0.95; applyOrbit(); toast('Gegenereerd · je eigen stad staat veilig onder Mijn stad', 2600); }
    if (act === 'start') { cells = startCity(); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 230; orbit.phi = 0.95; orbit.theta = 0.4; applyOrbit(); toast('Startstadje geladen: rotonde en ringweg'); }
    if (act === 'sample') { cells = roofHouses(sampleCity()); rebuildAll(); changed(); toast('Voorbeeldstad geladen · je eigen stad staat veilig onder Mijn stad'); }
    if (act === 'ring') { cells = ringStad(); rebuildAll(); changed(); orbit.target.set(0, 0, 0); orbit.dist = 1500; orbit.phi = 0.9; applyOrbit(); toast('Ringstad geladen · je eigen stad staat veilig onder Mijn stad'); }
    if (act === 'random' || act === 'blocks' || act === 'layers') {
      const seed = (Math.random() * 1e9) >>> 0;
      cells = act === 'random' ? randomCity(seed) : act === 'layers' ? terraceCity(seed) : blockCity(seed);
      sanitize(cells); roofHouses(cells); rebuildAll(); changed();
      orbit.target.set(0, 0, 0); orbit.dist = act === 'random' ? 240 : 200; orbit.phi = 0.85; applyOrbit();
      toast({ random: 'Nieuwe stad', blocks: 'Nieuwe blokkenstad', layers: 'Nieuwe gelaagde stad' }[act] + ' · nummer ' + seed + ' · je eigen stad staat veilig');
    }
    if (act === 'oud') { const r = oudOmzetten(cells); if (r.done) { rebuildAll(); changed(); } toast(r.done ? r.done + ' oude blokken omgezet naar modules' + (r.kept ? ' · ' + r.kept + ' met iets anders erin bleven staan' : '') : (r.kept ? 'Geen kolom is zuiver genoeg om om te zetten (' + r.kept + ' blijven oud)' : 'Er staan geen oude blokken in deze stad'), 3200); }
    if (act === 'home') { orbit.target.set(0, 0, 0); applyOrbit(); toast('Terug in het midden', 1200); }
    if (act === 'empty') { cells = new Map(); rebuildAll(); changed(); toast('Lege bouwgrond · bewaar wat je bouwt via Menu → Deze stad bewaren'); }
    if (act === 'cars') { cars.setOn(!cars.on); toast(cars.on ? 'Er rijden weer auto\'s' : 'Geen auto\'s meer op straat'); }
    if (act === 'settings') { sheet.hidden = true; openSettings(); return; }
    if (act === 'people') { people.setOn(!people.on); toast(people.on ? 'Er lopen weer mensen door de stad' : 'Geen mensen meer op straat'); }
    sheet.hidden = true; adoptArmed = false; refreshMineUI();
  }

