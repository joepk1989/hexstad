  // ---------- Instellingen ----------
  // Eén venster (Menu → Instellingen) met alles wat je kunt instellen: beeld en prestaties (terrein, schaduwen,
  // beeldscherpte, wolken) en de opties die ook in de balk staan (raster, tijd, mensen, auto's, geluid).
  // Beeld en prestaties worden bewaard in localStorage 'hexstad-set'.
  const SET_KEY = 'hexstad-set';
  const setState = (() => { const d = { terr: 'laag', shadow: 'zacht', res: 'scherp', clouds: true, contour: true }; try { const o = Object.assign(d, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); if (COARSE && !o.mob) { o.mob = 1; o.shadow = 'eenvoudig'; o.res = 'normaal'; o.crowd = 0.5; o.clouds = true; } if (!o.tv) { o.terr = 'laag'; o.tv = 1; } return o; } catch (e) { return d; } })();   // low poly is de standaard; tv = opgeslagen na die wissel
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
  PERF.crowd = setState.crowd || 1;
  // Prestatiemeter: beelden per seconde, tekenopdrachten, driehoeken en de videokaart die de browser gebruikt
  const perfEl = document.createElement('div'); perfEl.id = 'perf'; perfEl.hidden = true; document.body.appendChild(perfEl);
  const gpuName = (() => { try { const gl = renderer.getContext(), x = gl.getExtension('WEBGL_debug_renderer_info'); return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return '?'; } })();
  let perfN = 0, perfT = performance.now(), perfMin = 1e9, perfLast = performance.now();
  function perfTick() {
    if (perfEl.hidden) return;
    const now = performance.now(); perfN++; perfMin = Math.min(perfMin, now - perfLast); perfLast = now;
    if (now - perfT < 500) return;
    const fps = perfN * 1000 / (now - perfT), i = renderer.info.render;
    const soft = /swiftshader|llvmpipe|software|mesa offscreen/i.test(gpuName);
    const fc = fps >= 50 ? '#8fdc7a' : fps >= 30 ? '#f5c542' : '#ff7a6b';
    if (setState.perf === 'fps') { perfEl.className = 'perf-fps'; perfEl.innerHTML = `<b style="color:${fc}">${fps.toFixed(0)}</b> fps`; perfN = 0; perfT = now; perfMin = 1e9; return; }
    perfEl.className = '';
    perfEl.innerHTML = `<b style="color:${fc}">${fps.toFixed(0)} fps</b> · ${i.calls} tekenopdrachten · ${(i.triangles / 1000).toFixed(0)}k driehoeken · ${renderer.getPixelRatio().toFixed(2)}× · ${people.count} mensen · ${cars.list.length} auto's<br><small>${gpuName}${soft ? ' — LET OP: geen videokaart, de processor tekent' : ''}</small>`;
    perfN = 0; perfT = now; perfMin = 1e9;
  }
  function setPerf(v) { setState.perf = v === 'fps' ? 'fps' : !!v; perfEl.hidden = !v; perfT = performance.now(); perfN = 0; }
  setPerf(setState.perf === undefined ? 'fps' : setState.perf);   // standaard: een kleine fps-teller in beeld
  curveSet(setState.wereld === "bol");
  const SET_ROWS = [
    { sub: 'Beeld en prestaties' },
    { id: 'terr', name: 'Terrein', note: 'Low poly: de driehoeken van het raster, strak en het snelst', opts: [['hoog', 'Hoog'], ['normaal', 'Normaal'], ['laag', 'Low poly']], get: () => setState.terr, set: v => { setState.terr = v; terrQuality(v); } },
    { id: 'wereld', name: 'Wereld', note: 'Bol: de stad als kleine planeet, de horizon buigt weg (bouwen blijft gewoon)', opts: [['plat', 'Plat'], ['bol', 'Bol']], get: () => setState.wereld || 'plat', set: v => { setState.wereld = v; curveSet(v === 'bol'); } },
    { id: 'shadow', name: 'Schaduwen', opts: [['zacht', 'Zacht'], ['eenvoudig', 'Eenvoudig'], ['uit', 'Uit']], get: () => setState.shadow, set: v => { setState.shadow = v; applyShadow(v); } },
    { id: 'res', name: 'Beeldscherpte', note: 'Snel tekent minder pixels', opts: [['scherp', 'Scherp'], ['normaal', 'Normaal'], ['snel', 'Snel']], get: () => setState.res, set: v => { setState.res = v; applyRes(v); } },
    { id: 'crowd', name: 'Drukte', note: "Minder mensen en auto's is lichter voor een telefoon", opts: [[1, 'Vol'], [0.5, 'Rustig'], [0.25, 'Weinig']], get: () => setState.crowd || 1, set: v => { setState.crowd = v; PERF.crowd = v; peopleDirty = true; carsDirty = true; } },
    { id: 'perf', name: 'Prestatiemeter', note: 'Beelden per seconde en wat de videokaart tekent', opts: [['fps', 'Alleen fps'], [true, 'Uitgebreid'], [false, 'Uit']], get: () => setState.perf === 'fps' ? 'fps' : !!setState.perf, set: v => setPerf(v) },
    { id: 'clouds', name: 'Wolken', opts: [[true, 'Aan'], [false, 'Uit']], get: () => setState.clouds, set: v => { setState.clouds = v; clouds.setOn(v); } },
    { sub: 'Bouwen' },
    { id: 'grid', name: 'Raster', opts: [[true, 'Aan'], [false, 'Uit']], get: () => gridOn, set: v => { if (v !== gridOn) optGrid.click(); } },
    { id: 'contour', name: 'Hoogtelijnen', note: 'Tijdens het boetseren van het terrein', opts: [[true, 'Aan'], [false, 'Uit']], get: () => setState.contour, set: v => { setState.contour = v; terrU.uContour.value = v && TERR_TOOLS.has(tool) ? 1 : 0; } },
    { id: 'brush', name: 'Penseel', note: 'Terrein: aantal vakken ([ en ])', opts: [[0, '1'], [1, '7'], [2, '19'], [3, '37']], get: () => terrBrush, set: v => setBrush(v) },
    { sub: 'Stad' },
    { id: 'speed', name: 'Tijd', opts: [[0, 'Pauze'], [1, '1×'], [4, '4×'], [12, '12×']], get: () => DN.st.auto ? DN.st.speed : 0, set: v => { const b = optSpeed.querySelector(`[data-sp="${v}"]`); if (b) b.click(); } },
    { id: 'weer', name: 'Weer', note: 'Wisselend: het weer verandert vanzelf (toets O)', opts: weather.ORDER.map(k => [k, weather.NAME[k]]), get: () => weather.mode, set: v => weather.set(v) },
    { id: 'reckless', name: 'Roekeloos rijgedrag', note: "Auto's scheuren, halen in, slingeren om obstakels heen en sommige jagen op voetgangers (ook op jou)", opts: [[true, 'Aan'], [false, 'Uit']], get: () => document.getElementById('recklessBtn').getAttribute('aria-pressed') === 'true', set: v => { const b = document.getElementById('recklessBtn'); if ((b.getAttribute('aria-pressed') === 'true') !== v) b.click(); } },
    { id: 'bloed', name: 'Bloed', note: 'Bij aanrijdingen: spatten, bloed op de auto en bloedige bandensporen', opts: [[true, 'Aan'], [false, 'Uit']], get: () => cars.gore, set: v => cars.setGore(v) },
    { id: 'people', name: 'Mensen', opts: [[true, 'Aan'], [false, 'Uit']], get: () => people.on, set: v => { if (v !== people.on) optPeople.click(); } },
    { id: 'cars', name: "Auto's", opts: [[true, 'Aan'], [false, 'Uit']], get: () => cars.on, set: v => { if (v !== cars.on) optCars.click(); } },
    { id: 'sound', name: 'Geluid', opts: [[true, 'Aan'], [false, 'Uit']], get: () => document.getElementById('soundBtn').getAttribute('aria-pressed') === 'true', set: v => { const b = document.getElementById('soundBtn'); if ((b.getAttribute('aria-pressed') === 'true') !== v) b.click(); } },
  ];
  const setSheet = document.getElementById('setSheet'), setRows = document.getElementById('setRows');
  function renderSettings() {
    setRows.innerHTML = '';
    for (const R0 of SET_ROWS) {
      if (R0.sub) { const p = document.createElement('p'); p.className = 'sheet-sub'; p.textContent = R0.sub; setRows.appendChild(p); continue; }
      const row = document.createElement('div'); row.className = 'set-row' + (R0.opts.length > 5 ? ' wide' : '');
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

  // ---------- Welkomscherm ----------
  // Bij het starten (tenzij uitgezet), en via Menu → Welkom en uitleg. De grote knop gaat verder met de stad die open staat.
  const welcomeSheet = document.getElementById('welcomeSheet'), WELCOME_KEY = 'hexstad-welkom';
  function openWelcome() {
    const n = [...cells.values()].reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
    document.getElementById('welcomeInfo').textContent = slotName + (n ? ' · ' + n + ' blokken' : '');
    document.getElementById('welcomeSkip').checked = localStorage.getItem(WELCOME_KEY) === 'uit';
    welcomeSheet.hidden = false;
  }
  const closeWelcome = () => { welcomeSheet.hidden = true; };
  document.getElementById('welcomeGo').addEventListener('click', closeWelcome);
  document.getElementById('welcomeSkip').addEventListener('change', e => { try { localStorage.setItem(WELCOME_KEY, e.target.checked ? 'uit' : 'aan'); } catch (err) {} });
  welcomeSheet.querySelectorAll('[data-wact]').forEach(b => b.addEventListener('click', () => { closeWelcome(); doAct(b.dataset.wact); }));
  welcomeSheet.addEventListener('click', e => { if (e.target === welcomeSheet) closeWelcome(); });
  let showWelcome = true; try { showWelcome = localStorage.getItem(WELCOME_KEY) !== 'uit'; } catch (e) {}
