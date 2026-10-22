  // ---------- Bouwacties ----------
  let tool = 'woning';
  const statsEl = document.getElementById('stats');
  function updateStats() {
    let n = 0, top = 0;
    for (const [k, st] of cells) { n += st.length; const [q, r] = k.split(',').map(Number); top = Math.max(top, colTopW(q, r)); }
    statsEl.textContent = `${slotName} · ${n} ${n === 1 ? 'blok' : 'blokken'} · hoogste punt ${top.toFixed(top % 1 ? 1 : 0).replace('.', ',')} m`;
    refreshMineUI();
    if (typeof updateScore === 'function') updateScore();
  }
  function changed() { save(); updateStats(); }

  // ---------- Schoonheid ----------
  // Een score van 0 tot 100 uit zes dingen die een stad mooi maken: groen, bereikbaarheid, een logisch
  // wegennet, afwisseling, water en samenhang (geen gaten of losse blokken).
  const clamp01 = x => Math.max(0, Math.min(1, x));
  function cityBeauty() {
    const N = cells.size;
    if (N < 5) return null;
    let roads = 0, parks = 0, water = 0, bridges = 0, laan = 0, padsGround = 0, deadEnds = 0, isolated = 0, bld = 0, bldOK = 0, roofGreen = 0, holes = 0, loose = 0, pedSpots = 0;
    const types = new Set(), heights = new Set(), seen = new Set();
    for (const [k, st] of cells) {
      const [q, r] = k.split(',').map(Number), b0 = baseOf(st[0]);
      let h = 0, hasB = false;
      st.forEach((t, i) => {
        const b = baseOf(t); types.add(b);
        if (i > 0 && b === 'park') roofGreen++;
        if (isBuilding(b) && (i === 0 || !isBuilding(baseOf(st[i - 1])))) {
          bld++;
          if (NEIGH.some(([dq, dr]) => walkableAtLevel(q + dq, r + dr, h) === 2)) bldOK++;
        }
        if (isBuilding(b)) hasB = true;
        h += TY(t).h;
      });
      if (hasB) heights.add(Math.round(h / 3));
      if (b0 === 'park') parks++;
      if (b0 === 'water') water++;
      if (b0 === 'pad') padsGround++;
      for (const t of st) if (['pad', 'hof', 'trap', 'zuilen', 'looppad', 'trappad', 'tribune', 'hofhelling', 'helling', 'tunnel'].includes(baseOf(t))) pedSpots++;
      let nb = 0;
      for (const [dq, dr] of NEIGH) {
        const k2 = key(q + dq, r + dr);
        if (cells.has(k2)) { nb++; continue; }
        if (seen.has(k2)) continue;
        seen.add(k2);
        let c = 0; for (const [eq, er] of NEIGH) if (cells.has(key(q + dq + eq, r + dr + er))) c++;
        if (c >= 4) holes++;
      }
      if (!nb) loose++;
    }
    // wegen: het getekende net. Een laan telt als groen (bomen op de middenberm); doodlopend = knoop met één tak
    { const G = cars.vecGraph(); roads = Math.round(G.totalLen / 15.6); for (const e of G.edges.values()) if (e.t === 'laan') laan += Math.round(e.len / 15.6); for (const n of G.nodes) if (n.edges.length === 1) deadEnds++; isolated = G.nodes.filter(n => n.edges.length === 1 && G.nodes[G.edges.get(n.edges[0]).a === G.nodes.indexOf(n) ? G.edges.get(n.edges[0]).b : G.edges.get(n.edges[0]).a].edges.length === 1).length / 2 | 0; }
    const green = parks + roofGreen + laan * 0.5 + padsGround * 0.3, roadShare = roads / Math.max(N, roads + 1);
    const rows = [
      { name: 'Groen', w: 0.2, v: clamp01(green / (N * 0.22)),
        detail: `${parks} ${parks === 1 ? 'park' : 'parken'}${roofGreen ? `, ${roofGreen} daktuin${roofGreen === 1 ? '' : 'en'}` : ''}, ${laan} laanvak${laan === 1 ? '' : 'ken'} met bomen`,
        tip: 'Leg een park aan of trek een laan: die heeft bomen op de middenberm.' },
      { name: 'Bereikbaar', w: 0.2, v: bld ? bldOK / bld : null,
        detail: bld ? `${bldOK} van de ${bld} gebouwen ${bldOK === 1 ? 'ligt' : 'liggen'} aan een straat of voetpad` : 'Nog geen gebouwen',
        tip: 'Zet gebouwen aan een weg of voetpad, zodat je er via de voordeur kunt komen.' },
      { name: 'Wegennet', w: 0.14, v: roads ? clamp01(1 - (deadEnds * 0.6 + isolated * 1.5) / roads) * (roadShare > 0.5 ? clamp01(1 - (roadShare - 0.5) * 2.5) : 1) : null,
        detail: roads ? `${roads} vakken weg, ${deadEnds} doodlopende ${deadEnds === 1 ? 'eind' : 'einden'}${isolated ? `, ${isolated} los stuk` : ''}${roadShare > 0.5 ? ', erg veel asfalt' : ''}` : 'Nog geen wegen',
        tip: 'Verbind doodlopende wegen tot rondjes, en laat niet de halve stad uit asfalt bestaan.' },
      { name: 'Afwisseling', w: 0.14, v: 0.6 * clamp01((types.size - 2) / 9) + 0.4 * (heights.size ? clamp01((heights.size - 1) / 5) : 0),
        detail: `${types.size} soorten blokken, ${heights.size} verschillende bouwhoogtes`,
        tip: 'Wissel af: hoog en laag, pleinen, hofjes, paden en trappen.' },
      { name: 'Levendig', w: 0.12, v: bld ? clamp01(pedSpots / (bld * 0.35)) : null,
        detail: bld ? `${pedSpots} plekken voor voetgangers (paden, hofjes, pleinen, trappen)` : 'Nog geen gebouwen',
        tip: 'Maak plekken voor voetgangers: paden, hofjes, trappen en pleintjes tussen de gebouwen.' },
      { name: 'Water', w: 0.08, v: water ? clamp01(0.7 + (bridges ? 0.3 : 0) - Math.max(0, water / N - 0.25) * 3) : 0.35,
        detail: water ? `${water} watervakken, ${bridges} ${bridges === 1 ? 'brug' : 'bruggen'}` : 'Geen water',
        tip: 'Een gracht met een brug erover maakt een stad meteen mooier.' },
      { name: 'Samenhang', w: 0.16, v: clamp01(1 - (holes * 0.7 + loose) / Math.max(4, N * 0.12)),
        detail: `${holes} lege ${holes === 1 ? 'gat' : 'gaten'} tussen de bebouwing, ${loose} losse ${loose === 1 ? 'blok' : 'blokken'}`,
        tip: 'Vul lege gaten tussen gebouwen op en haal losse blokken weg.' },
    ];
    let sw = 0, sv = 0;
    for (const x of rows) if (x.v !== null) { sw += x.w; sv += x.w * x.v; }
    const score = Math.round(Math.pow(sv / sw, 1.4) * 100);   // de top is moeilijker te halen dan het midden
    const label = score >= 85 ? 'Prachtig' : score >= 70 ? 'Mooi' : score >= 55 ? 'Gezellig' : score >= 35 ? 'Gewoon' : 'Rommelig';
    const weakest = rows.filter(x => x.v !== null).sort((a, b) => a.v * a.w - b.v * b.w)[0];
    return { score, label, rows, tip: weakest && weakest.v < 0.9 ? weakest.tip : 'Een prachtige stad. Loop er eens doorheen!' };
  }
  const scoreBtn = document.getElementById('scoreBtn'), scoreVal = document.getElementById('scoreVal'), scoreSheet = document.getElementById('scoreSheet');
  let lastScore = null, scoreFlash = 0, beauty = null;
  function updateScore() {
    beauty = cityBeauty();
    scoreVal.textContent = beauty ? beauty.score : '–';
    scoreBtn.querySelector('small').textContent = beauty ? beauty.label : 'schoonheid';
    if (beauty && lastScore !== null && beauty.score !== lastScore) {
      scoreBtn.classList.remove('up', 'down'); scoreBtn.classList.add(beauty.score > lastScore ? 'up' : 'down');
      clearTimeout(scoreFlash); scoreFlash = setTimeout(() => scoreBtn.classList.remove('up', 'down'), 1200);
    }
    lastScore = beauty ? beauty.score : null;
    if (!scoreSheet.hidden) renderScore();
  }
  function renderScore() {
    const pop = cityCounts();
    document.getElementById('scoreBig').textContent = beauty ? beauty.score : '–';
    document.getElementById('scoreLabel').textContent = beauty ? beauty.label : 'Nog te klein';
    document.getElementById('scorePop').textContent = `≈ ${pop.homes * 3} inwoners · ${pop.offices * 20} werkplekken · ${people.agents.length} mensen en ${cars.list.length} auto's op straat`;
    const rowsEl = document.getElementById('scoreRows');
    rowsEl.innerHTML = '';
    if (beauty) for (const x of beauty.rows) {
      const d = document.createElement('div'); d.className = 'srow' + (x.v === null ? ' na' : '');
      const v = x.v === null ? null : Math.round(x.v * 100);
      d.innerHTML = `<div class="srow-top"><span></span><b>${v === null ? '–' : v}</b></div><div class="bar"><i style="width:${v || 0}%"></i></div><small></small>`;
      d.querySelector('span').textContent = x.name;
      d.querySelector('small').textContent = x.v === null ? x.detail + ' · telt niet mee' : x.detail;
      rowsEl.appendChild(d);
    }
    document.getElementById('scoreTip').textContent = beauty ? beauty.tip : 'Bouw minstens vijf vakken, dan krijgt je stad een score.';
  }
  scoreBtn.addEventListener('click', () => { renderScore(); scoreSheet.hidden = false; });
  const recklessBtn = document.getElementById('recklessBtn');
  recklessBtn.addEventListener('click', () => {
    const v = !cars.reckless;
    cars.setReckless(v); recklessBtn.setAttribute('aria-pressed', String(v));
    if (v && !cars.on) cars.setOn(true);
    toast(v ? "Roekeloos rijgedrag: de auto's scheuren door rood · pas op bij het oversteken!" : "De auto's rijden weer netjes", 2400);
  });
  document.getElementById('scoreClose').addEventListener('click', () => { scoreSheet.hidden = true; });
  scoreSheet.addEventListener('click', e => { if (e.target === scoreSheet) scoreSheet.hidden = true; });

  function canPlace(q, r, t) {
    const st = stackOf(q, r);
    const top = st[st.length - 1];
    t = toolBase(t);
    if (vecCover.has(key(q, r)) && !st.length && t !== 'pad' && t !== 'heuvel') return 'Hier ligt een weg';
    if (t === 'heuvel' && terrN(q, r) >= TERR_MAX) return 'Hoger dan ' + TERR_MAX * 3 + ' m kan niet';
    if (modCellOccupied(q, r)) return 'Hier staat een module';
    if ((t === 'kuil' || t === 'water') && gH(q, r) > 0.3) return (t === 'kuil' ? 'Een uitgraving' : 'Water') + ' kan alleen op vlakke grond (hoogte 0)';
    if (!allowedOn(t, top, st[st.length - 2])) return whyNot(t, top);
    if (columnTop(q, r) + TY(t).h > MAX_H + 0.01) return 'Maximaal 60 meter hoog';
    if (mode === 'walk') {   // niet bouwen op de plek waar je zelf staat
      const c = cellToWorld(q, r), dx = player.x - c.x, dz = player.z - c.z;
      if (FRAMES.every(f => dx * f.nx + dz * f.nz <= INNER + 0.6)) return 'Je staat zelf op dit vak; richt verder weg';
    }
    return null;
  }
  // Terreinpenseel: verhogen of verlagen in één keer op 1, 7 of 19 vakken
  let terrBrush = 1;
  function terrainEdit(q, r, T) {   // één stap hoger of lager; geeft true als er iets veranderde
    const k = key(q, r), st = stackOf(q, r);
    if (modCellOccupied(q, r)) return false;
    if (T === 'heuvel') { if (st.length && !terrOnly(q, r)) return false; if (terrN(q, r) >= TERR_MAX) return false; cells.set(k, st.concat(['heuvel'])); return true; }
    if (T === 'kuil') { if (terrOnly(q, r)) { const ns = st.slice(0, -1); if (ns.length) cells.set(k, ns); else cells.delete(k); return true; } if (!st.length && !vecCover.has(k)) { cells.set(k, ['kuil']); return true; } return false; }
    return false;
  }
  function place(q, r) {
    if (TERR_TOOLS.has(tool)) return terrImpulse(q, r);
    if ((tool === 'heuvel' || tool === 'kuil') && terrBrush > 0) {
      const list = []; for (let dq = -terrBrush; dq <= terrBrush; dq++) for (let dr = -terrBrush; dr <= terrBrush; dr++) if (hexDist(dq, dr) <= terrBrush && terrainEdit(q + dq, r + dr, tool)) list.push([q + dq, r + dr]);
      if (!list.length) return toast('Hier kan het terrein niet ' + (tool === 'heuvel' ? 'hoger' : 'lager'));
      rebuildMany(list); terrainChanged(list); changed(); toast((tool === 'heuvel' ? 'Verhoogd: ' : 'Verlaagd: ') + list.length + ' vakken', 900); return;
    }
    if (VEC_TOOLS.has(tool)) { toast('Sleep van vak naar vak om een ' + TYPES[tool].name.toLowerCase() + ' te trekken', 1600); return; }
    if (tool === 'module') { const a = anchorOf(lastPickRes) || [q, r]; return placeModule(a[0], a[1]); }
    if (EDGE_TOOLS.has(tool)) return placeEdgeAt(lastPickRes);
    const T = toolBase(tool), wideTool = tool === 'fietspad';
    // Zelfde blok met een richting nog eens aantikken: draait het geplaatste blok 60°
    const st0 = stackOf(q, r), top0 = st0[st0.length - 1];
    if (DIRECTIONAL.has(T) && top0 && baseOf(top0) === T) {
      st0[st0.length - 1] = T + ((dirOf(top0) + 1) % 6);
      rebuildAround(q, r); changed(); toast('Gedraaid', 900);
      return;
    }
    // Dak aanklikken met het dak gekozen: dakkapel erbij (voor, dan voor en achter, dan weer zonder)
    if (T === 'dak' && top0 && baseOf(top0) === 'dak') {
      const v = /^dak\d$/.test(top0) ? +top0.slice(3) : 0, nv = (v + 1) % 3;
      st0[st0.length - 1] = nv ? 'dak' + nv : 'dak';
      rebuildAround(q, r); changed();
      toast(['Dak zonder dakkapel', 'Dakkapel aan de voorkant', 'Dakkapellen voor en achter'][nv], 1200);
      return;
    }
    // Woning op een huis met dak: er komt een verdieping onder het dak bij
    if (T === 'woning' && top0 && baseOf(top0) === 'dak' && st0.length >= 2 && isBuilding(baseOf(st0[st0.length - 2]))) {
      if (columnTop(q, r) + TY('woning').h > MAX_H + 0.01) return toast('Maximaal 60 meter hoog');
      if (mode === 'walk' && canPlace(q, r, 'dak') === 'Je staat zelf op dit vak; richt verder weg') return toast('Je staat zelf op dit vak; richt verder weg');
      const y0 = columnTop(q, r);
      st0.splice(st0.length - 1, 0, 'woning');
      rebuildAround(q, r); changed(); people.onPlaced(q, r, y0, columnTop(q, r));
      return;
    }
    // Pad aanklikken met het pad gekozen: bomen erbij of eraf; een los eind draait mee naar een andere kant
    if ((T === 'pad') && top0 && baseOf(top0) === 'pad') {
      const y = columnTop(q, r) - TY(top0).h, m = pathMask(q, r, y), v = padVar(top0);
      let links = 0; for (let k = 0; k < 6; k++) if ((m >> k) & 1) links++;
      let { trees, dir } = v, msg;
      if (wideTool) { st0[st0.length - 1] = padName(trees, dir, !v.wide); rebuildAround(q, r); changed(); toast(v.wide ? 'Smal pad' : 'Breed fietspad', 1200); return; }
      if (links >= 2) { trees ^= 1; msg = trees ? 'Bomen langs het pad' : 'Pad zonder bomen'; }
      else {
        const free = [0, 1, 2, 3, 4, 5].filter(k => !((m >> k) & 1));
        const idx = (dir ? free.indexOf(dir - 1) : -1) + 1;
        if (idx >= free.length) { dir = 0; trees ^= 1; msg = trees ? 'Bomen langs het pad · klik verder om te draaien' : 'Pad zonder bomen'; }
        else { dir = free[idx] + 1; msg = 'Pad gedraaid · klik verder voor een andere richting of bomen'; }
      }
      st0[st0.length - 1] = padName(trees, dir, v.wide);
      rebuildAround(q, r); changed(); toast(msg, 1600);
      return;
    }
    // Verlagen op een heuvel: één verhoging eraf
    if (T === 'kuil' && terrOnly(q, r)) { st0.pop(); if (!st0.length) cells.delete(key(q, r)); rebuildAround(q, r); terrainChanged([[q, r]]); changed(); toast(terrN(q, r) ? 'Verlaagd tot ' + terrN(q, r) * 3 + ' m' : 'Weer op straatniveau', 900); return; }
    const why = canPlace(q, r, tool);
    if (why) return toast(why);
    const k = key(q, r);
    const st = cells.get(k) || [];
    const y0 = columnTop(q, r);
    st.push(...itemsFor(q, r, tool, DIRECTIONAL.has(T) ? viewDirIndex() : 0)); cells.set(k, st);
    if (T === 'woning' && columnTop(q, r) + TY('dak').h <= MAX_H + 0.01) st.push('dak');   // een huis krijgt standaard een dak
    rebuildAround(q, r); if (T === 'heuvel' || T === 'kuil') terrainChanged([[q, r]]); changed();
    if (T === 'heuvel' && terrN(q, r) > 1) toast('Verhoogd tot ' + terrN(q, r) * 3 + ' m', 900);
    people.onPlaced(q, r, y0, columnTop(q, r));
  }
  function removeTop(q, r) {
    const k = key(q, r); const st = cells.get(k);
    if (!st || !st.length) return;
    st.pop();
    while (st.length && (baseOf(st[st.length - 1]) === 'brug' || baseOf(st[st.length - 1]) === 'brugp')) st.pop();   // een brug zonder weg erop hoort er niet te blijven
    if (!st.length) cells.delete(k);
    rebuildAround(q, r); terrainChanged([[q, r]]); changed();
  }

  // De trap loopt omhoog in de richting waarin je kijkt
  // Richting: automatisch de kijkrichting, of vastgezet met de draaiknop / R
  let manualDir = null;
  function viewDirIndex() {
    if (manualDir !== null) return manualDir;
    let fx, fz;
    if (mode === 'walk') { fx = -Math.sin(player.yaw); fz = -Math.cos(player.yaw); }
    else { fx = orbit.target.x - camera.position.x; fz = orbit.target.z - camera.position.z; }
    let best = 0, bd = -Infinity;
    FRAMES.forEach((f, k) => { const d = f.nx * fx + f.nz * fz; if (d > bd) { bd = d; best = k; } });
    return best;
  }
  const REACH = 30;   // zo ver kun je bouwen tijdens het lopen (m)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(cx, cy) {
    ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([ground, terrGroup, blocks], true);
    if (!hits.length) return null;
    const h = hits[0];
    if (mode === 'walk' && h.distance > REACH) return null;
    if (h.object === ground || h.object.userData.terr) return { place: worldToCell(h.point.x, h.point.z), erase: null, point: h.point, terr: !!h.object.userData.terr };
    let o = h.object;
    while (o && (!o.userData || o.userData.q === undefined)) o = o.parent;
    if (!o) return null;
    const { q, r } = o.userData;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    let cell;
    // bovenkant, of de bovenste helft van het bovenste blok (zo kun je vanaf de straat op een gebouw stapelen)
    const st = stackOf(q, r), topH = st.length ? TY(st[st.length - 1]).h : 0, ct = colTopW(q, r);
    if (n.y > 0.5 || (st.length && h.point.y > ct - Math.max(0.5, topH) * 0.5)) cell = [q, r];
    else { const p = h.point.clone().addScaledVector(n, 0.4); cell = worldToCell(p.x, p.z); }
    return { place: cell, erase: [q, r], point: h.point };
  }
  // Rechtermuisknop: haalt de bovenste laag weg, welk blok er ook gekozen is
  function eraseAt(cx, cy) {
    const res = pick(cx, cy);
    if (res && eraseModuleAt(res)) { updateGhost(cx, cy); return; }
    if (res && eraseEdgeAt(res)) { updateGhost(cx, cy); return; }
    if (res && (erasePathAt(res) || eraseTriAt(res))) { updateGhost(cx, cy); return; }   // getekende weg: de hele lijn in één keer
    if (res && res.erase) removeTop(res.erase[0], res.erase[1]);
    updateGhost(cx, cy);
  }
  // Op een touchscreen eerst een voorbeeld tonen bij blokken met een richting: tik = voorbeeld, nog een tik = plaatsen
  let pendingKey = null, lastPickRes = null;
  function handleTap(cx, cy) {
    const res = pick(cx, cy); lastPickRes = res;
    if (!res) return;
    if (coarse && DIRECTIONAL.has(tool) && mode === 'build') {
      const [q, r] = res.place, k = key(q, r), st = stackOf(q, r), top = st[st.length - 1];
      if (top && baseOf(top) === tool) { pendingKey = null; place(q, r); return; }
      if (pendingKey === k) { pendingKey = null; place(q, r); ghost.visible = false; ghostArrow.visible = false; return; }
      pendingKey = k; updateGhost(cx, cy);
      toast('Tik nog eens op dit vak om te plaatsen · Draai om te draaien', 2600);
      return;
    }
    if (tool === 'gum') { if (!eraseEdgeAt(res) && !erasePathAt(res) && !eraseTriAt(res) && res.erase) removeTop(res.erase[0], res.erase[1]); }
    else place(res.place[0], res.place[1]);
    updateGhost(cx, cy);
  }

  // Spookblok bij muis-hover
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#f2b233', transparent: true, opacity: 0.42, depthWrite: false });
  const ghostBad = new THREE.MeshBasicMaterial({ color: '#e0573e', transparent: true, opacity: 0.45, depthWrite: false });
  const ghost = new THREE.Mesh(G.full, ghostMat); ghost.visible = false; scene.add(ghost);
  // Tijdens het lopen: een vage vulling met een duidelijke omtrek, zodat het beeld vrij blijft
  const ghostWalk = new THREE.MeshBasicMaterial({ color: '#f2b233', transparent: true, opacity: 0.12, depthWrite: false });
  const ghostWalkBad = new THREE.MeshBasicMaterial({ color: '#e0573e', transparent: true, opacity: 0.14, depthWrite: false });
  const edgeCache = new Map();
  const ghostEdges = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f2b233', transparent: true, opacity: 0.95, depthTest: false }));
  ghostEdges.renderOrder = 5; ghostEdges.visible = false; scene.add(ghostEdges);
  function syncGhostEdges() {
    if (previewActive || mode !== 'walk' || !ghost.visible) { ghostEdges.visible = false; return; }
    if (!edgeCache.has(ghost.geometry)) edgeCache.set(ghost.geometry, new THREE.EdgesGeometry(ghost.geometry, 20));
    ghostEdges.geometry = edgeCache.get(ghost.geometry);
    ghostEdges.position.copy(ghost.position); ghostEdges.scale.copy(ghost.scale);
    ghostEdges.material.color.set(ghost.material === ghostBad || ghost.material === ghostWalkBad ? '#e0573e' : '#f2b233');
    ghostEdges.visible = true;
    if (mode === 'walk') ghost.material = ghost.material === ghostBad ? ghostWalkBad : ghostWalk;
  }
  const ghostArrow = (() => {   // pijl die de looprichting van een trap aangeeft
    const s = new THREE.Shape(); s.moveTo(4.5, 0); s.lineTo(-1.5, 2.6); s.lineTo(-0.5, 0); s.lineTo(-1.5, -2.6); s.closePath();
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, ghostMat); m.visible = false; scene.add(m); return m;
  })();
  // Doorzichtig voorbeeld van de échte module, met de juiste aansluitingen op wat ernaast ligt
  const ghostNone = new THREE.MeshBasicMaterial({ visible: false });
  const crosshairEl = document.querySelector('.crosshair');
  const previewGroup = new THREE.Group(); scene.add(previewGroup);
  const prevMat = new THREE.MeshLambertMaterial({ color: '#f2b233', emissive: '#4a3300', transparent: true, opacity: 0.5, depthWrite: false });
  const prevBad = new THREE.MeshLambertMaterial({ color: '#ff3b2f', emissive: '#8a160c', transparent: true, opacity: 0.5, depthWrite: false });
  let previewActive = false, previewKey = '';
  function showPreview(q, r, valid) {
    {
    const items = itemsFor(q, r, tool, DIRECTIONAL.has(tool) ? viewDirIndex() : 0);
    const k = key(q, r), had = cells.has(k), st = had ? cells.get(k) : [];
    const pk = [k, items.join('+'), st.length, valid, mode].join('|');
    if (pk === previewKey) return;
    previewKey = pk;
    disposeGroup(previewGroup); previewGroup.clear();
    const baseY = st.reduce((sum, x) => sum + TY(x).h, 0);
    const n0 = st.length;
    st.push(...items); if (!had) cells.set(k, st);
    const saved = [pathLinks, pathIfs, pathCorners, cornerVia];
    try {   // even doen alsof het blok er al staat, zodat paden goed aansluiten
      const pr = computePathLinks(); pathLinks = pr.masks; pathIfs = pr.ifs; pathCorners = pr.corners; cornerVia = pr.via;
      const { x, z } = cellToWorld(q, r);
      previewGroup.position.set(x, gH(q, r), z);
      let yy = baseY;
      items.forEach((it, j) => { previewGroup.add(makeBlock(it, q, r, n0 + j, yy, x, z, { surfaces: [], walls: [] })); yy += TY(it).h; });
    } finally {
      st.length = n0; if (!had) cells.delete(k);
      [pathLinks, pathIfs, pathCorners, cornerVia] = saved;
    }
    }
    const mat = valid ? prevMat : prevBad;
    mat.opacity = mode === 'walk' ? (valid ? 0.22 : 0.14) : 0.5;   // tijdens het lopen subtiel, zodat het beeld vrij blijft
    previewGroup.traverse(m => {
      if (!m.isMesh) return;
      if (m.material === holeMat) { m.visible = false; return; }
      m.material = mat; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 3;
    });
  }
  let lastHover = null;
  function updateGhost(cx, cy) {
    if (cx == null) { if (!lastHover) return; [cx, cy] = lastHover; }
    lastHover = [cx, cy];
    ghostArrow.visible = false;
    const res = pick(cx, cy); lastPickRes = res;
    edgeGhost.visible = false; moduleGhost.visible = false;
    if (terrHover(res, cx, cy)) { previewActive = false; ghost.visible = false; ghostEdges.visible = false; return; }
    if (!res || (mode === 'walk' && hand !== 'bouwen')) { ghost.visible = false; ghostEdges.visible = false; return; }
    if (VEC_TOOLS.has(tool)) { previewActive = false; ghost.visible = false; ghostEdges.visible = false; return; }
    if (tool === 'module') { previewActive = false; ghost.visible = false; ghostEdges.visible = false; if (res.place) { const a = anchorOf(res); showModuleGhost(a[0], a[1]); } return; }
    if (EDGE_TOOLS.has(tool)) {
      previewActive = false; ghost.visible = false; ghostEdges.visible = false;
      const ne = res.point ? nearestEdge(res.point.x, res.point.z) : null;
      showEdgeGhost(res, !ne || !!edgeBlocked(ne.q, ne.r, ne.k), tool === 'randweg' ? 9 : tool === 'randbreed' ? 13 : 3);
      return;
    }
    if (tool === 'gum' && res.point && edgesOf().size) {
      const ne = nearestExistingEdge(res.point.x, res.point.z, 4.5);
      if (ne) { previewActive = false; ghost.visible = false; ghostEdges.visible = false; showEdgeGhost({ point: { x: (edgeEnds(ne.q, ne.r, ne.k)[0][0] + edgeEnds(ne.q, ne.r, ne.k)[1][0]) / 2, z: (edgeEnds(ne.q, ne.r, ne.k)[0][1] + edgeEnds(ne.q, ne.r, ne.k)[1][1]) / 2 } }, true, 5); return; }
    }
    if (tool === 'gum') {
      previewActive = false;
      if (!res.erase) { ghost.visible = false; ghostEdges.visible = false; return; }
      const [q, r] = res.erase; const st = stackOf(q, r); const t = st[st.length - 1];
      const { x, z } = cellToWorld(q, r);
      ghost.geometry = geoFor(t); ghost.material = ghostBad;
      ghost.position.set(x, colTopW(q, r) - TY(t).h - 0.02, z); ghost.scale.setScalar(1.05);
    } else {
      const [q, r] = res.place; const { x, z } = cellToWorld(q, r);
      const valid = !canPlace(q, r, tool);
      showPreview(q, r, valid);
      previewActive = true;
      ghost.geometry = geoFor(baseOf(tool)); ghost.material = ghostNone;
      ghost.position.set(x, colTopW(q, r) + 0.01, z); ghost.scale.setScalar(1.01);
      if (DIRECTIONAL.has(tool)) {
        const f = FRAMES[viewDirIndex()];
        ghostArrow.position.set(x, colTopW(q, r) + 3.4, z); ghostArrow.rotation.y = -Math.atan2(f.nz, f.nx);
        ghostArrow.material = valid ? ghostMat : ghostBad; ghostArrow.visible = true;
      }
    }
    ghost.visible = true;
    syncGhostEdges();
  }

