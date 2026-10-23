  // ---------- Start ----------
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Opstarten: open wat er de vorige keer open stond. Bestaat er nog geen "mijn stad" (oudere versie),
  // dan wordt de bewaarde stad je eigen stad.
  try {
    const sv = JSON.parse(localStorage.getItem(SLOT) || 'null');
    if (sv && (sv.slot === 'mijn' || sv.slot === 'klad')) { slot = sv.slot; slotName = sv.slotName || (slot === 'mijn' ? 'Mijn stad' : 'Andere stad'); }
  } catch (e) {}
  cells = load() || null;
  if (!cells) { cells = load(MINE) || ringStad(); slot = load(MINE) ? 'mijn' : 'klad'; slotName = slot === 'mijn' ? 'Mijn stad' : 'Ringstad'; if (!load(MINE)) { orbit.dist = 1500; orbit.phi = 0.9; } }
  if (!hasMine() && slot === 'mijn') { try { localStorage.setItem(MINE, serialize(cells)); } catch (e) {} }
  if (!hasMine() && slot === 'klad' && !localStorage.getItem(SLOT)) { slot = 'mijn'; slotName = 'Mijn stad'; }
  const cleaned = sanitize(cells);
  // eenmalig: huizen in bestaande steden krijgen een dak (daarna mag je een dak gewoon weghalen)
  try {
    if (!localStorage.getItem('hexstad-daken-v1')) {
      roofHouses(cells);
      const mine = load(MINE); if (mine) { roofHouses(mine); localStorage.setItem(MINE, serialize(mine)); }
      localStorage.setItem('hexstad-daken-v1', '1');
    }
  } catch (e) {}
  save();
  if (modsReset) {   // eenmalig: oude modules uit de stad, ook uit de andere opgeslagen stad
    if (cells.inst && cells.inst.length) { for (const I of cells.inst) removeInst(I); cells.inst = []; }
    try { for (const k of [MINE, STORE]) { const o = load(k); if (o && o.inst && o.inst.length) { const keep = cells; cells = o; for (const I of o.inst) removeInst(I); o.inst = []; cells = keep; localStorage.setItem(k, serialize(o)); } } } catch (e) { /* geen opslag */ }
  }
  rebuildAll(); updateStats();
  if (modsReset) changed();
  if (libRefreshed) { let n = 0; for (const m of modules) if (m.v === 2) n += syncModule(m); if (n) changed(); }   // vernieuwde standaardmodules ook in de stad
  selectTool('woning');
  applyOrbit();
  setTimeout(() => toast(cleaned
    ? `${cleaned} ${cleaned === 1 ? 'blok stond' : 'blokken stonden'} op een onlogische plek en ${cleaned === 1 ? 'is' : 'zijn'} weggehaald`
    : coarse
      ? 'Tik om te bouwen · sleep om te draaien · knijp om te zoomen'
      : 'Klik bouwt · rechtsklik wist · sleep om te draaien · rechts slepen schuift · scroll zoomt · Shift+scroll wisselt', 5000), 400);

  let last = performance.now(), frameNo = 0;
  const mmAppEl = document.getElementById('mmApp');
  function frame(now) {
    if (mmAppEl && !mmAppEl.hidden) { last = now; requestAnimationFrame(frame); return; }   // module maker open: de stad staat stil (scheelt veel rekenwerk)
    frameMs += (Math.min(1000, now - last) - frameMs) * 0.1;   // gemiddelde beeldtijd (trage computer: langer stilhouden voor een hoekpunt)
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    previewGroup.visible = previewActive && ghost.visible && !(mode === 'walk' && previewKey.endsWith('false|walk'));
    crosshairEl.classList.toggle('bad', mode === 'walk' && ghost.visible && previewActive && previewKey.endsWith('false|walk'));
    sound.update(dt);
    updateLights(now / 1000);
    DN.update(dt); clouds.update(dt, camera.position); sculptUpdate(dt);
    people.update(dt);
    cars.update(dt);
    if (mode === 'walk') {
      updateWalk(dt);
      if (roadDrag.on) { const res = pick(window.innerWidth / 2, window.innerHeight / 2); if (res) roadPaintTo(res.place); }
      if ((frameNo++ & 1) === 0) updateGhost(window.innerWidth / 2, window.innerHeight / 2);
    }
    else updateBuildKeys(dt);
    // oneindige bouwgrond: grond en rasterlijnen schuiven mee met waar je bent (rasterlijnen in hele vakken)
    {
      const fx = mode === 'walk' ? player.x : orbit.target.x, fz = mode === 'walk' ? player.z : orbit.target.z;
      ground.position.x = fx; ground.position.z = fz;
      const [gq, gr] = worldToCell(fx, fz), gw = cellToWorld(gq, gr);
      gridLines.position.set(gw.x, 0, gw.z);
    }
    if (mode === 'walk') { followSun(player.x, player.z, 150); scene.fog.near = 380; scene.fog.far = 1150; }
    else { followSun(orbit.target.x, orbit.target.z, orbit.dist); scene.fog.near = 380 + orbit.dist * 0.6; scene.fog.far = 1150 + orbit.dist * 1.2; }
    weather.update(dt);   // weer: mist dichter, neerslag, nat en sneeuw (13b)
    if (LOD.on) {
      const want = (mode === 'walk' ? 9 : orbit.dist > 700 ? 4 : orbit.dist > 350 ? 7 : 11) * R * SQ3;
      const chg = want !== LOD.rad; LOD.rad = want;
      lodUpdate(mode === 'walk' ? player.x : orbit.target.x, mode === 'walk' ? player.z : orbit.target.z, chg);
    }
    DN.place(camera.position);
    hudRender();   // gewoon, of in twee keer met de laagkiezer (15d)
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
