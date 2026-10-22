  // ---------- Sneltoetsen ----------
  // Bouwen: WASD/pijltjes schuiven de kaart, Q/E draaien, + / − zoomen, 1–9 kiest een blok, Tab wisselt van
  // categorie, R draait, Delete is de gum, [ ] maakt het terreinpenseel groter of kleiner, G raster, P pauze,
  // L lopen, M menu, ? dit overzicht. Tijdens het slepen van een weg: E/Q (of Page Up/Down, scrollwiel) hoger/lager.
  const keysPanel = document.getElementById('keysPanel'), keysBtn = document.getElementById('keysBtn'), keysList = document.getElementById('keysList');
  const K = (...k) => k.map(x => `<kbd>${x}</kbd>`).join(' ');
  const KEYS_BUILD = [
    ['Kaart', null], [K('W', 'A', 'S', 'D'), 'schuiven (of pijltjes)'], [K('Q', 'E'), 'draaien'], [K('+', '−'), 'in- en uitzoomen'],
    ['Bouwen', null], [K('1') + '…' + K('9'), 'blok in deze categorie'], [K('Tab'), 'volgende categorie (Shift: vorige)'], [K('R'), 'draaien (Shift+R: terug)'],
    [K('Del'), 'gum aan/uit'], [K('[', ']'), 'penseel: 1, 7, 19 of 37 vakken'], [K('Shift') + '+wiel', 'ander blok'],
    ['Modules', null], [K(',', '.'), 'vorige / volgende module'], [K('/'), 'zoek een module (Enter kiest de eerste)'],
    ['Terrein', null], ['slepen', 'boetseren (ingedrukt houden)'], [K('Shift') + '+slepen', 'andersom (ophogen ↔ afgraven)'], [K('1') + '…' + K('5'), 'ophogen · afgraven · egaliseren · glad · helling'],
    ['Weg slepen', null], [K('E', 'Q'), 'hoger / lager (ook Page Up/Down, wiel)'], ['stilhouden', 'hoekpunt: bocht in één sleep'],
    ['Overig', null], [K('G'), 'raster aan/uit'], [K('P'), 'tijd pauze / verder'], [K('L'), 'lopen'], [K('M'), 'menu'], [K('?'), 'dit overzicht'],
  ];
  const KEYS_WALK = [
    ['Lopen', null], [K('W', 'A', 'S', 'D'), 'lopen'], [K('Shift'), 'rennen'], [K('Spatie'), 'springen'], ['muis', 'rondkijken (klik om te vangen)'],
    ['Handen', null], [K('Q'), 'kijken · bouwen · hamer'], ['klik', 'bouwen of slopen (met Bouwen/Hamer)'], ['wiel', 'ander blok'], [K('1') + '…' + K('9'), 'blok in deze categorie'],
    ['Overig', null], [K('L'), 'terug naar bouwen'], [K('Esc'), 'muis loslaten'], [K('?'), 'dit overzicht'],
  ];
  function renderKeys() {
    const L = mode === 'walk' ? KEYS_WALK : KEYS_BUILD;
    document.getElementById('keysTitle').textContent = mode === 'walk' ? 'Sneltoetsen · lopen' : 'Sneltoetsen · bouwen';
    keysList.innerHTML = L.map(([a, b]) => b === null ? `<div class="sep">${a}</div>` : `<dt>${a}</dt><dd>${b}</dd>`).join('');
  }
  function toggleKeys(on) {
    const show = on === undefined ? keysPanel.hidden : on;
    keysPanel.hidden = !show; keysBtn.setAttribute('aria-expanded', String(show)); if (show) renderKeys();
    try { localStorage.setItem('hexstad-keys-seen', '1'); } catch (e) { /* geen opslag */ }
  }
  keysBtn.addEventListener('click', () => toggleKeys());
  document.getElementById('keysClose').addEventListener('click', () => toggleKeys(false));
  // eerste keer: even laten zien (alleen met een toetsenbord)
  try { if (!localStorage.getItem('hexstad-keys-seen') && !document.body.classList.contains('coarse')) setTimeout(() => { toggleKeys(true); setTimeout(() => { if (!keysPanel.matches(':hover')) toggleKeys(false); }, 9000); }, 1500); } catch (e) { /* geen opslag */ }

  // terreinpenseel: 0 = één vak, 1 = met de ring eromheen (7), 2 = twee ringen (19)
  function setBrush(b) { terrBrush = Math.max(0, Math.min(3, b)); toast('Terreinpenseel: ' + [1, 7, 19, 37][terrBrush] + (terrBrush ? ' vakken' : ' vak'), 1000); if (lastHover) updateGhost(); }
  let prevTool = null;
  const busy = e => { const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return true; const mm = document.getElementById('mmApp'), sk = document.getElementById('schetsApp'); return (mm && !mm.hidden) || (sk && !sk.hidden) || e.ctrlKey || e.metaKey || e.altKey; };
  window.addEventListener('keydown', e => {
    if (busy(e)) return;
    if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) { toggleKeys(); e.preventDefault(); return; }
    if (e.code === 'Escape') { if (!keysPanel.hidden) toggleKeys(false); const sh = document.getElementById('sheet'); if (sh && !sh.hidden) sh.hidden = true; return; }
    if (e.code === 'KeyL') { document.getElementById('modeBtn').click(); if (!keysPanel.hidden) renderKeys(); return; }
    if (mode === 'walk') return;   // de rest is voor bouwen
    if (roadDrag.on) return;       // tijdens slepen: hoogte (zie invoer)
    if (e.code === 'Tab') { e.preventDefault(); setCat((catIdx + (e.shiftKey ? CATS.length - 1 : 1)) % CATS.length); const t = CATS[catIdx].tools[0]; if (CATS[catIdx].name !== 'Modules') selectTool(t); toast(CATS[catIdx].name, 800); return; }
    if (e.code === 'Delete' || e.code === 'Backspace') { e.preventDefault(); if (tool === 'gum' && prevTool) selectTool(prevTool); else { prevTool = tool; selectTool('gum'); } toast(tool === 'gum' ? 'Gum' : 'Gum uit', 700); return; }
    if (e.code === 'Comma') { modStep(-1); return; }    // vorige / volgende module
    if (e.code === 'Period') { modStep(1); return; }
    if (e.code === 'Slash' && !e.shiftKey) { e.preventDefault(); setCat(CATS.findIndex(c => c.name === 'Modules')); const i = document.getElementById('modSearch'); if (i) { i.focus(); i.select(); } return; }
    if (e.code === 'BracketLeft') { setBrush(terrBrush - 1); return; }
    if (e.code === 'BracketRight') { setBrush(terrBrush + 1); return; }
    if (e.code === 'KeyG') { document.getElementById('optGrid').click(); return; }
    if (e.code === 'KeyP') { const sp = document.querySelectorAll('#optSpeed [data-sp]'), cur = [...sp].find(b => b.getAttribute('aria-pressed') === 'true'); const paused = cur && cur.dataset.sp === '0'; (paused ? [...sp].find(b => b.dataset.sp === (keysLastSpeed || '1')) : [...sp].find(b => b.dataset.sp === '0')).click(); if (!paused && cur) keysLastSpeed = cur.dataset.sp; toast(paused ? 'Tijd loopt weer' : 'Pauze', 700); return; }
    if (e.code === 'KeyM') { document.getElementById('menuBtn').click(); return; }
    if (e.code === 'Equal' || e.code === 'NumpadAdd') { zoom(0.85); applyOrbit(); return; }
    if (e.code === 'Minus' || e.code === 'NumpadSubtract') { zoom(1.18); applyOrbit(); return; }
  });
  let keysLastSpeed = null;
  // ingedrukte toetsen in bouwmodus: schuiven en draaien, elke frame een stukje
  function updateBuildKeys(dt) {
    if (mode !== 'build' || roadDrag.on) return;
    const mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), mz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0), rot = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
    if (!mx && !mz && !rot) return;
    const mmOpen = (document.getElementById('mmApp') || {}).hidden === false; if (mmOpen) return;
    if (mx || mz) pan(-mx * 520 * dt, -mz * 520 * dt);
    if (rot) orbit.theta += rot * dt * 1.6;
    applyOrbit();
  }
