  // ---------- Instellingen ----------
  // Eén venster (Menu → Instellingen) met alles wat je kunt instellen: beeld en prestaties (terrein, schaduwen,
  // beeldscherpte, wolken) en de opties die ook in de balk staan (raster, tijd, mensen, auto's, geluid).
  // Beeld en prestaties worden bewaard in localStorage 'hexstad-set'.
  const SET_KEY = 'hexstad-set';
  const setState = (() => { const d = { terr: 'laag', shadow: 'zacht', res: 'scherp', clouds: true, contour: true }; try { const o = Object.assign(d, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); if (!o.tv) { o.terr = 'laag'; o.tv = 1; } return o; } catch (e) { return d; } })();   // low poly is de standaard; tv = opgeslagen na die wissel
  const saveSet = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(setState)); } catch (e) { /* geen opslag */ } };
  function applyShadow(v) {
    sun.castShadow = v !== 'uit';
    const size = v === 'eenvoudig' ? 1024 : 2048, type = v === 'eenvoudig' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    if (sun.shadow.mapSize.x !== size || renderer.shadowMap.type !== type) {
      sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      renderer.shadowMap.type = type; scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
    }
  }
  function applyRes(v) { const d = window.devicePixelRatio || 1; renderer.setPixelRatio(v === 'snel' ? Math.min(d, 1) * 0.75 : v === 'normaal' ? Math.min(d, 1) : Math.min(d, 2)); resize(); }
  // bij het opstarten (het terrein leest zijn detail zelf al in, zie 07b)
  applyShadow(setState.shadow); if (setState.res !== 'scherp') applyRes(setState.res); clouds.setOn(setState.clouds);
  const SET_ROWS = [
    { sub: 'Beeld en prestaties' },
    { id: 'terr', name: 'Terrein', note: 'Low poly: de driehoeken van het raster, strak en het snelst', opts: [['hoog', 'Hoog'], ['normaal', 'Normaal'], ['laag', 'Low poly']], get: () => setState.terr, set: v => { setState.terr = v; terrQuality(v); } },
    { id: 'shadow', name: 'Schaduwen', opts: [['zacht', 'Zacht'], ['eenvoudig', 'Eenvoudig'], ['uit', 'Uit']], get: () => setState.shadow, set: v => { setState.shadow = v; applyShadow(v); } },
    { id: 'res', name: 'Beeldscherpte', note: 'Snel tekent minder pixels', opts: [['scherp', 'Scherp'], ['normaal', 'Normaal'], ['snel', 'Snel']], get: () => setState.res, set: v => { setState.res = v; applyRes(v); } },
    { id: 'clouds', name: 'Wolken', opts: [[true, 'Aan'], [false, 'Uit']], get: () => setState.clouds, set: v => { setState.clouds = v; clouds.setOn(v); } },
    { sub: 'Bouwen' },
    { id: 'grid', name: 'Raster', opts: [[true, 'Aan'], [false, 'Uit']], get: () => gridOn, set: v => { if (v !== gridOn) optGrid.click(); } },
    { id: 'contour', name: 'Hoogtelijnen', note: 'Tijdens het boetseren van het terrein', opts: [[true, 'Aan'], [false, 'Uit']], get: () => setState.contour, set: v => { setState.contour = v; terrU.uContour.value = v && TERR_TOOLS.has(tool) ? 1 : 0; } },
    { id: 'brush', name: 'Penseel', note: 'Terrein: aantal vakken ([ en ])', opts: [[0, '1'], [1, '7'], [2, '19'], [3, '37']], get: () => terrBrush, set: v => setBrush(v) },
    { sub: 'Stad' },
    { id: 'speed', name: 'Tijd', opts: [[0, 'Pauze'], [1, '1×'], [4, '4×'], [12, '12×']], get: () => DN.st.auto ? DN.st.speed : 0, set: v => { const b = optSpeed.querySelector(`[data-sp="${v}"]`); if (b) b.click(); } },
    { id: 'weer', name: 'Weer', note: 'Wisselend: het weer verandert vanzelf (toets O)', opts: weather.ORDER.map(k => [k, weather.NAME[k]]), get: () => weather.mode, set: v => weather.set(v) },
    { id: 'people', name: 'Mensen', opts: [[true, 'Aan'], [false, 'Uit']], get: () => people.on, set: v => { if (v !== people.on) optPeople.click(); } },
    { id: 'cars', name: "Auto's", opts: [[true, 'Aan'], [false, 'Uit']], get: () => cars.on, set: v => { if (v !== cars.on) optCars.click(); } },
    { id: 'sound', name: 'Geluid', opts: [[true, 'Aan'], [false, 'Uit']], get: () => document.getElementById('soundBtn').getAttribute('aria-pressed') === 'true', set: v => { const b = document.getElementById('soundBtn'); if ((b.getAttribute('aria-pressed') === 'true') !== v) b.click(); } },
  ];
  const setSheet = document.getElementById('setSheet'), setRows = document.getElementById('setRows');
  function renderSettings() {
    setRows.innerHTML = '';
    for (const R0 of SET_ROWS) {
      if (R0.sub) { const p = document.createElement('p'); p.className = 'sheet-sub'; p.textContent = R0.sub; setRows.appendChild(p); continue; }
      const row = document.createElement('div'); row.className = 'set-row';
      row.innerHTML = `<div class="set-name">${R0.name}${R0.note ? `<small>${R0.note}</small>` : ''}</div>`;
      const seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', R0.name);
      for (const [v, lbl] of R0.opts) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = lbl; b.setAttribute('aria-pressed', String(R0.get() === v));
        b.addEventListener('click', () => { R0.set(v); saveSet(); renderSettings(); });
        seg.appendChild(b);
      }
      row.appendChild(seg); setRows.appendChild(row);
    }
    const keysRow = document.createElement('button'); keysRow.type = 'button'; keysRow.className = 'btn'; keysRow.textContent = 'Sneltoetsen bekijken';
    keysRow.addEventListener('click', () => { setSheet.hidden = true; toggleKeys(true); }); setRows.appendChild(keysRow);
  }
  function openSettings() { renderSettings(); setSheet.hidden = false; }
  document.getElementById('setClose').addEventListener('click', () => { setSheet.hidden = true; });
  setSheet.addEventListener('click', e => { if (e.target === setSheet) setSheet.hidden = true; });
