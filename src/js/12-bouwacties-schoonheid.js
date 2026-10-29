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
  // Wat een module is, uit zijn naam en inhoud (een keer per exemplaar berekend): oppervlak in vakken, groen- en waterdeel
  // van de vloer, bomen, verdiepingen en soort. De naam is 'Soort · materiaal · 2L' en de categorie Wonen, Winkels, Werken, ...
  const modStatCache = new WeakMap();
  function modStat(I) {
    let S = modStatCache.get(I.m); if (S) return S;
    const M = modMeta(I.m), L0 = I.m.lv[0], f = Object.values(L0.f || {}).map(v => typeof v === 'string' ? v : v && v.m), nf = Math.max(1, f.length);
    const grass = f.filter(v => v === 'grass').length / nf, wat = f.filter(v => v === 'water').length / nf;
    let trees = 0, furn = 0; for (const L of I.m.lv) for (const o of L.o || []) { if (o.t === 'tree' || o.t === 'bush') trees++; else if (o.t !== 'lamp' && o.t !== 'bin') furn++; }
    const cat = I.m.cat || '', fam = String(I.m.name || '').split(' · ')[0];
    S = { n: M.n, fl: M.fl, bouw: M.bouw, deur: M.deur, cat, fam, grass, wat, trees, furn, kind: cat + ':' + fam + ':' + (String(I.m.name || '').split(' · ')[1] || '') };
    modStatCache.set(I.m, S); return S;
  }
  // inwoners en werkplekken: 1 verdieping woonmodule = 1 woonblok; winkels, horeca en openbaar tellen voor een half kantoor
  function modPeople() {
    let homes = 0, offices = 0;
    for (const I of cells.inst || []) { if (I.m.v !== 2) continue; const S = modStat(I); if (!S.bouw) continue; if (S.cat === 'Wonen') homes += S.fl; else if (S.cat === 'Werken') offices += S.fl; else if (S.cat === 'Winkels' || S.cat === 'Openbaar') offices += S.fl * 0.5; }
    return { homes, offices };
  }
  function cityBeauty() {
    const mods = (cells.inst || []).filter(I => I.m && I.m.v === 2 && Number.isInteger(I.q) && Number.isInteger(I.r));
    // bezette vakken: oude blokken, modules en vakken van getekende wegen
    const occ = new Set(cells.keys()), modKeys = new Set();
    for (const I of mods) for (const [q, r] of mv2Area(I)) { occ.add(key(q, r)); modKeys.add(key(q, r)); }
    for (const k of vecCover) occ.add(k);
    const N = occ.size;
    if (cells.size + mods.length < 5) return null;
    let roads = 0, parks = 0, water = 0, bridges = 0, laan = 0, padsGround = 0, deadEnds = 0, isolated = 0, bld = 0, bldOK = 0, roofGreen = 0, holes = 0, loose = 0, pedSpots = 0;
    let homes = 0, dests = 0;
    const greenAt = new Map(), built = new Set(vecCover);   // groen per vak; vakken met gebouw of weg
    const kinds = new Set(), heights = new Set(), seen = new Set(), waterKeys = new Set();
    for (const [k, st] of cells) {
      const [q, r] = k.split(',').map(Number), b0 = baseOf(st[0]);
      let h = 0, hasB = false;
      st.forEach((t, i) => {
        const b = baseOf(t); kinds.add('b:' + b);
        if (i > 0 && b === 'park') roofGreen++;
        if (isBuilding(b) && (i === 0 || !isBuilding(baseOf(st[i - 1])))) {
          bld++; if (b === 'woning') homes++; else dests++;
          if (NEIGH.some(([dq, dr]) => walkableAtLevel(q + dq, r + dr, h) === 2)) bldOK++;
        }
        if (isBuilding(b)) hasB = true;
        h += TY(t).h;
      });
      if (hasB) heights.add(Math.round(h / 3));
      if (b0 === 'park') { parks++; greenAt.set(k, 1); }
      if (hasB) built.add(k);
      if (b0 === 'water') { water++; waterKeys.add(k); }
      if (b0 === 'pad') padsGround++;
      for (const t of st) if (['pad', 'hof', 'trap', 'zuilen', 'looppad', 'trappad', 'tribune', 'hofhelling', 'helling', 'tunnel'].includes(baseOf(t))) pedSpots++;
    }
    // modules: gebouwen (met bereikbaarheid via de ingangsknopen), groen, water en plekken voor voetgangers
    const doorOK = new Map();   // module-nummer → heeft een ingang die op een stoep of straat uitkomt
    try {
      for (const n of people.graph().values()) if (n.kind.b === 'mdoor') {
        const m = /^md(\d+):/.exec(n.key); if (!m) continue;
        let ok = false; for (const e of n.edges.values()) if (e.vecDoor) ok = true;
        if (!ok && n.kind.outside) ok = roadTop(n.kind.outside[0], n.kind.outside[1]) != null;
        if (ok) doorOK.set(+m[1], true);
      }
    } catch (e) { }
    (cells.inst || []).forEach((I, ii) => {
      if (!I.m || I.m.v !== 2) return;
      const S = modStat(I); kinds.add('m:' + S.kind);
      if (S.bouw) {
        bld++; if (doorOK.get(ii)) bldOK++;
        for (const [q, r] of mv2Area(I)) built.add(key(q, r));
        if (S.cat === 'Wonen') homes++; else dests++;
        heights.add(S.fl);
      } else {
        // een open module: groen (gras en bomen), water of een plek om te zijn
        const gr = clamp01(S.grass * 0.8 + Math.min(1, S.trees / (S.n * 3)) * 0.4);
        const gv = S.cat === 'Groen' ? gr : gr * 0.5; if (gv > 0) for (const [q, r] of mv2Area(I)) greenAt.set(key(q, r), Math.max(greenAt.get(key(q, r)) || 0, gv));
        if (S.wat > 0.3) { water += S.n * S.wat; for (const [q, r] of mv2Area(I)) waterKeys.add(key(q, r)); }
        if (S.cat === 'Pleinen' || S.cat === 'Verbindingen' || S.cat === 'Openbaar' || S.furn >= 3) pedSpots += S.n;
        else if (S.cat === 'Groen' && S.furn) pedSpots += S.n * 0.5;
      }
    });
    // lege gaten (leeg vak met minstens vier bezette buren) en losse blokken (zonder buren)
    for (const k of occ) {
      if (vecCover.has(k) && !cells.has(k) && !modKeys.has(k)) continue;
      const [q, r] = k.split(',').map(Number); let nb = 0;
      for (const [dq, dr] of NEIGH) {
        const k2 = key(q + dq, r + dr);
        if (occ.has(k2)) { nb++; continue; }
        if (seen.has(k2)) continue;
        seen.add(k2);
        let c = 0; for (const [eq, er] of NEIGH) if (occ.has(key(q + dq + eq, r + dr + er))) c++;
        if (c >= 4) holes++;
      }
      if (!nb) loose++;
    }
    // wegen: het getekende net. Een laan telt als groen (bomen op de middenberm); doodlopend = knoop met één tak; een brug = weg over water
    { const G = cars.vecGraph(); roads = Math.round(G.totalLen / 15.6);
      for (const e of G.edges.values()) { if (e.t === 'laan') laan += Math.round(e.len / 15.6); }
      for (const n of G.nodes) if (n.edges.length === 1) deadEnds++;
      isolated = G.nodes.filter(n => n.edges.length === 1 && G.nodes[G.edges.get(n.edges[0]).a === G.nodes.indexOf(n) ? G.edges.get(n.edges[0]).b : G.edges.get(n.edges[0]).a].edges.length === 1).length / 2 | 0;
      if (waterKeys.size) for (const e of G.edges.values()) {
        const pts = e.pts || e.p || null; if (!pts || e.t === 'pad') continue;
        for (const P of pts) { const c = worldToCell(P[0], P[1]); if (c && waterKeys.has(key(c.q, c.r))) { bridges++; break; } }
      } }
    // groen telt alleen in de bebouwde kom: vakken binnen één vak van een gebouw of weg (een bos ver erbuiten telt niet mee)
    let core = new Set(built);
    for (let it = 0; it < 1; it++) { const nx = new Set(core); for (const k of core) { const [q, r] = k.split(',').map(Number); for (const [dq, dr] of NEIGH) nx.add(key(q + dq, r + dr)); } core = nx; }
    let coreN = 0, greenMod = 0; for (const k of occ) if (core.has(k)) coreN++;
    for (const [k, v] of greenAt) if (core.has(k)) greenMod += v;
    const total = Math.max(1, N), cn = Math.max(1, coreN);
    const green = greenMod + roofGreen + laan * 0.5 + padsGround * 0.3, roadShare = roads / Math.max(total, roads + 1);
    const greenShare = green / cn;
    const gV = clamp01(greenShare / 0.3) * (greenShare > 0.6 ? clamp01(1 - (greenShare - 0.6) * 1.5) : 1);   // te veel groen is ook niets: dan is het geen stad
    // afwisseling: veel soorten, en ook goed verdeeld (niet 90% hetzelfde)
    const kn = kinds.size;
    const hV = heights.size ? clamp01((heights.size - 1) / 4) : 0;
    const wonenShare = bld ? homes / bld : 0;
    const mix = bld >= 3 ? clamp01(1 - Math.abs(wonenShare - 0.72) * 2.2) : 0;   // rond 7 op de 10 woningen, de rest winkels, werk en openbaar
    const pedV = bld ? clamp01(pedSpots / (bld * 0.35)) : 0;
    const mixV = homes ? clamp01(dests / (homes * 0.14)) : (dests ? 1 : 0);
    const rows = [
      { name: 'Groen', w: 0.18, v: gV,
        detail: `${Math.round(greenShare * 100)}% groen${roofGreen ? `, ${roofGreen} daktuin${roofGreen === 1 ? '' : 'en'}` : ''}${laan ? `, ${laan} laanvak${laan === 1 ? '' : 'ken'} met bomen` : ''}${greenShare > 0.6 ? ' · te veel, het wordt een bos' : ''}`,
        tip: greenShare > 0.6 ? 'Zet er gebouwen tussen: een stad is geen bos.' : 'Leg een park, een tuin of een laan aan: een derde groen is mooi.' },
      { name: 'Bereikbaar', w: 0.2, v: bld ? bldOK / bld : null,
        detail: bld ? `${bldOK} van de ${bld} gebouwen ${bldOK === 1 ? 'ligt' : 'liggen'} met de voordeur aan een straat of voetpad` : 'Nog geen gebouwen',
        tip: 'Geef elk gebouw een voordeur aan een weg, stoep of pad.' },
      { name: 'Wegennet', w: 0.14, v: roads ? clamp01(1 - (deadEnds * 0.6 + isolated * 1.5) / roads) * (roadShare > 0.5 ? clamp01(1 - (roadShare - 0.5) * 2.5) : 1) : null,
        detail: roads ? `${roads} vakken weg, ${deadEnds} doodlopende ${deadEnds === 1 ? 'eind' : 'einden'}${isolated ? `, ${isolated} los stuk` : ''}${roadShare > 0.5 ? ', erg veel asfalt' : ''}` : 'Nog geen wegen',
        tip: 'Verbind doodlopende wegen tot rondjes, en laat niet de halve stad uit asfalt bestaan.' },
      { name: 'Afwisseling', w: 0.14, v: 0.55 * clamp01((kn - 3) / 12) + 0.25 * hV + 0.2 * mix,
        detail: `${kn} soorten gebouwen en plekken, ${heights.size} bouwhoogtes${bld >= 3 ? `, ${Math.round(wonenShare * 100)}% woningen` : ''}`,
        tip: 'Wissel af: hoog en laag, woningen met winkels en werk ertussen, pleinen, hofjes en tuinen.' },
      { name: 'Levendig', w: 0.12, v: bld ? 0.6 * pedV + 0.4 * mixV : null,
        detail: bld ? `${Math.round(pedSpots)} plekken voor voetgangers, ${dests} winkels en werkplekken bij ${homes} woningen` : 'Nog geen gebouwen',
        tip: 'Maak pleintjes, paden en trappen, en zet winkels en werk tussen de woningen: dat geeft leven.' },
      { name: 'Water', w: 0.08, v: water ? clamp01(0.7 + (bridges ? 0.3 : 0) - Math.max(0, water / total - 0.25) * 3) : 0.35,
        detail: water ? `${Math.round(water)} watervakken, ${bridges} ${bridges === 1 ? 'brug' : 'bruggen'}` : 'Geen water',
        tip: 'Een vijver of gracht met een brug erover maakt een stad meteen mooier.' },
      { name: 'Samenhang', w: 0.16, v: clamp01(1 - (holes * 0.7 + loose) / Math.max(4, total * 0.12)),
        detail: `${holes} lege ${holes === 1 ? 'gat' : 'gaten'} tussen de bebouwing, ${loose} losse ${loose === 1 ? 'blok' : 'blokken'}`,
        tip: 'Vul lege gaten tussen gebouwen op en haal losse blokken weg.' },
    ];
    let sw = 0, sv = 0;
    for (const x of rows) if (x.v !== null) { sw += x.w; sv += x.w * x.v; }
    const score = Math.round(Math.pow(sv / sw, 1.6) * 100);   // de top is moeilijker te halen dan het midden
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
      if (beauty.score > lastScore && typeof sound !== 'undefined') setTimeout(() => sound.fx('coin'), 140);   // mooier geworden: blij tingeltje
      clearTimeout(scoreFlash); scoreFlash = setTimeout(() => scoreBtn.classList.remove('up', 'down'), 1200);
    }
    lastScore = beauty ? beauty.score : null;
    if (!scoreSheet.hidden) renderScore();
  }
  function renderScore() {
    const pop = cityCounts(), mp = modPeople();
    document.getElementById('scoreBig').textContent = beauty ? beauty.score : '–';
    document.getElementById('scoreLabel').textContent = beauty ? beauty.label : 'Nog te klein';
    document.getElementById('scorePop').textContent = `≈ ${Math.round((pop.homes + mp.homes) * 3)} inwoners · ${Math.round((pop.offices + mp.offices) * 20)} werkplekken · ${people.agents.length} mensen en ${cars.list.length} auto's op straat`;
    const rowsEl = document.getElementById('scoreRows');
    rowsEl.innerHTML = '';
    if (beauty) for (const x of beauty.rows) {
      const d = document.createElement('div'); d.className = 'srow' + (x.v === null ? ' na' : '');
      const v = x.v === null ? null : Math.round(x.v * 100);
      const ico = { Groen: 'tree', Bereikbaar: 'door', Wegennet: 'road', Afwisseling: 'mix', Levendig: 'lively', Water: 'water', Samenhang: 'cohesion' }[x.name] || 'hex';
      d.innerHTML = `<svg class="srow-ico"><use href="#i-${ico}"/></svg><div class="srow-body"><div class="srow-top"><span></span><b>${v === null ? '–' : v}</b></div><div class="bar"><i style="width:${v || 0}%"></i></div><small></small></div>`;
      d.querySelector('span').textContent = x.name;
      d.querySelector('small').textContent = x.v === null ? x.detail + ' · telt niet mee' : x.detail;
      rowsEl.appendChild(d);
    }
    document.getElementById('scoreTip').textContent = beauty ? beauty.tip : 'Bouw minstens vijf vakken, dan krijgt je stad een score.';
  }
  scoreBtn.addEventListener('click', () => { updateScore(); renderScore(); scoreSheet.hidden = false; });
  const recklessBtn = document.getElementById('recklessBtn');
  recklessBtn.addEventListener('click', () => {
    const v = !cars.reckless;
    cars.setReckless(v); recklessBtn.setAttribute('aria-pressed', String(v));
    if (v && !cars.on) cars.setOn(true);
    toast(v ? "Totale chaos: auto's scheuren door rood en iedereen rent gillend rond · pas op bij het oversteken!" : "De rust is terug: de auto's rijden weer netjes", 2400);
  });
  document.getElementById('scoreClose').addEventListener('click', () => { scoreSheet.hidden = true; });
  scoreSheet.addEventListener('click', e => { if (e.target === scoreSheet) scoreSheet.hidden = true; });

  function canPlace(q, r, t) {
    const st = stackOf(q, r);
    const top = st[st.length - 1];
    t = toolBase(t);
    if (vecCover.has(key(q, r)) && !st.length && t !== 'pad' && t !== 'heuvel' && !(t === 'park' && secMaskOf(cells.paths, q, r))) return 'Hier ligt een weg';
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
    if (flyCam.on || tool === 'kies') return;   // cameramodus: niets bouwen of slopen
    if (TERR_TOOLS.has(tool)) return terrImpulse(q, r);
    if ((tool === 'heuvel' || tool === 'kuil') && terrBrush > 0) {
      const list = []; for (let dq = -terrBrush; dq <= terrBrush; dq++) for (let dr = -terrBrush; dr <= terrBrush; dr++) if (hexDist(dq, dr) <= terrBrush && terrainEdit(q + dq, r + dr, tool)) list.push([q + dq, r + dr]);
      if (!list.length) return toast('Hier kan het terrein niet ' + (tool === 'heuvel' ? 'hoger' : 'lager'));
      rebuildMany(list); terrainChanged(list); changed(); toast((tool === 'heuvel' ? 'Verhoogd: ' : 'Verlaagd: ') + list.length + ' vakken', 900); return;
    }
    if (tool === 'vrot') return placeRot(q, r);
    if (tool === 'spoor') return spoor.click(q, r);   // spoorlijn: vak na vak (11e)
    if (VEC_TOOLS.has(tool)) return vecChainClick([q, r]);   // klikmodus: knooppunt, stuk weg, knooppunt … (14)
    if (tool === 'module') { const a = anchorOf(lastPickRes) || [q, r]; return placeModule(a[0], a[1], lastPickRes && lastPickRes.inst && !lastPickRes.side ? lastPickRes.lv : 0); }
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
    // Park aanklikken met het park gekozen: andere inrichting (bomen, bankjes, bloemen, vijver, speeltuin)
    if (T === 'park' && top0 && baseOf(top0) === 'park') {
      const v = /^park\d$/.test(top0) ? +top0.slice(4) : 0, nv = (v + 1) % 5;
      st0[st0.length - 1] = nv ? 'park' + nv : 'park';
      rebuildAround(q, r); changed();
      toast(['Park met bomen', 'Park met bankjes en lantaarns', 'Park met bloemperken', 'Park met een vijver', 'Speeltuin'][nv] + ' · klik verder voor een andere inrichting', 1600);
      return;
    }
    // Water aanklikken met gracht of meer gekozen: wisselen tussen gracht (kademuren) en meer (natuurlijke oever)
    if (T === 'water' && top0 && baseOf(top0) === 'water' && st0.length === 1) {
      st0[0] = top0 === 'water1' ? 'water' : 'water1';
      rebuildAround(q, r); changed(); toast(st0[0] === 'water1' ? 'Meer met natuurlijke oever' : 'Gracht met kademuren', 1200);
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
    const first = T === 'park' && !st.length, sm = first && vecCover.has(k) ? secMaskOf(cells.paths, q, r) : 63;   // park langs een weg: alleen de vrije taartpunten
    st.push(...itemsFor(q, r, tool, DIRECTIONAL.has(T) ? viewDirIndex() : 0)); cells.set(k, st);
    if (first) { if (sm < 63) { (cells.sec || (cells.sec = {}))[k] = sm; toast('Park in stukjes: de rand langs de weg blijft vrij', 1800); } else if (cells.sec) delete cells.sec[k]; }
    if (T === 'woning' && columnTop(q, r) + TY('dak').h <= MAX_H + 0.01) st.push('dak');   // een huis krijgt standaard een dak
    rebuildAround(q, r); if (T === 'heuvel' || T === 'kuil') terrainChanged([[q, r]]); changed();
    if (T === 'heuvel' && terrN(q, r) > 1) toast('Verhoogd tot ' + terrN(q, r) * 3 + ' m', 900);
    people.onPlaced(q, r, y0, columnTop(q, r));
  }
  function removeTop(q, r) {
    if (flyCam.on) return;   // cameramodus: niets bouwen of slopen
    const k = key(q, r); const st = cells.get(k);
    if (!st || !st.length) return;
    st.pop();
    while (st.length && (baseOf(st[st.length - 1]) === 'brug' || baseOf(st[st.length - 1]) === 'brugp')) st.pop();   // een brug zonder weg erop hoort er niet te blijven
    if (!st.length) { cells.delete(k); if (cells.sec) delete cells.sec[k]; }
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
  function pick(cx, cy, withMods) {
    ndc.set(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = hudPickFilter(curvedHits(raycaster, [ground, terrGroup, blocks, ...(withMods || tool === 'module' || tool === 'gum' || tool === 'kies' ? [...modGroups.values()].map(e => e.group) : [])]));   // laagkiezer: wat erboven ligt is doorzichtig en niet aan te klikken
    if (!hits.length) return null;
    const h = hits[0];
    if (mode === 'walk' && h.distance > REACH) return null;
    if (h.object === ground || h.object.userData.terr) return { place: worldToCell(h.point.x, h.point.z), erase: null, point: h.point, terr: !!h.object.userData.terr };
    let o = h.object;
    { let g = o; while (g && !(g.userData && g.userData.inst)) g = g.parent;   // een module: bovenop bouwen (dak) of wisselen/weghalen (gevel)
      if (g) { const I = g.userData.inst, n = h.face.normal.clone().transformDirection(h.object.matrixWorld), cell = worldToCell(h.point.x, h.point.z); return { place: cell, erase: cell, point: h.point, inst: I, lv: stackLvAt(cell[0], cell[1]), side: n.y < 0.5 }; } }
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
    if (flyCam.on) return;   // cameramodus: niets bouwen of slopen
    if (vecChain.on) { vecChainEnd(); return; }   // rechts klikken stopt de weg-klikmodus
    if (spoor.chain.on) { spoor.end(); updateGhost(cx, cy); return; }
    const res = pick(cx, cy, true);   // ook met een ander gereedschap in de hand moet een module te raken zijn
    if (res && eraseModuleAt(res)) { updateGhost(cx, cy); return; }
    if (res && eraseEdgeAt(res)) { updateGhost(cx, cy); return; }
    if (res && (erasePathAt(res) || eraseTriAt(res))) { updateGhost(cx, cy); return; }
    if (res && spoor.eraseAt(res.point)) { updateGhost(cx, cy); return; }   // getekende weg: de hele lijn in één keer
    if (res && res.erase) removeTop(res.erase[0], res.erase[1]);
    updateGhost(cx, cy);
  }
  // Op een touchscreen eerst een voorbeeld tonen bij blokken met een richting: tik = voorbeeld, nog een tik = plaatsen
  let pendingKey = null, lastPickRes = null;
  function handleTap(cx, cy) {
    if (flyCam.on) return;   // cameramodus: niets bouwen of slopen
    if (tool === 'kies') { if (mode === 'build') kiesTap(cx, cy); return; }   // aanwijzen: opties voor een module of blok (15g)
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
    if (tool === 'gum') { if (!eraseEdgeAt(res) && !erasePathAt(res) && !eraseTriAt(res) && !spoor.eraseAt(res.point) && res.erase) removeTop(res.erase[0], res.erase[1]); }
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
  // voorbeeld van een getekende weg (klik) of rotonde: een platte strook of ring in de kleur van het spookblok
  const vecGhostBox = new THREE.BoxGeometry(1, 0.3, 1), vecGhostRing = new THREE.RingGeometry(8.25, 13.75, 36).rotateX(-Math.PI / 2);
  // Voorbeeld van de bezette vakken: omtrek van elk zeshoekig vak dat de nieuwe weg (mee)neemt
  const vecCells = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f2b233', transparent: true, opacity: 0.9, depthTest: false }));
  vecCells.visible = false; vecCells.renderOrder = 5; vecCells.frustumCulled = false; vecCells.userData.noOcc = true; scene.add(vecCells);
  function showVecCells(t, a, b) {
    // alleen de vakken waar de weg echt doorheen loopt: het vak van elk uiteinde en vakken waarvan het midden bijna op de lijn ligt
    const set = new Set(), len = Math.hypot(b[0] - a[0], b[1] - a[1]), ends = len < R * SQ3 * 0.9 ? [[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]] : [a, b];
    for (const e of ends) set.add(worldToCell(e[0], e[1]).join(','));
    if (len >= R * SQ3 * 0.9) { const [q0, r0] = worldToCell((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), n = Math.ceil(len / R) + 1; for (let dq = -n; dq <= n; dq++) for (let dr = -n; dr <= n; dr++) { const c = cellToWorld(q0 + dq, r0 + dr); if (distPoly(c.x, c.z, [a, b]) < R * 0.55) set.add((q0 + dq) + ',' + (r0 + dr)); } }
    const P = [];
    for (const k of set) {
      const [q, r] = k.split(',').map(Number), c = cellToWorld(q, r), y = Math.max(gH(q, r), terrainHeightAt(c.x, c.z)) + 0.4;
      for (let i = 0; i < 6; i++) { const a0 = (30 + 60 * i) * Math.PI / 180, a1 = a0 + Math.PI / 3; P.push(c.x + Math.cos(a0) * R * 0.96, y, c.z + Math.sin(a0) * R * 0.96, c.x + Math.cos(a1) * R * 0.96, y, c.z + Math.sin(a1) * R * 0.96); }
    }
    vecCells.geometry.dispose(); vecCells.geometry = new THREE.BufferGeometry(); vecCells.geometry.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); vecCells.visible = P.length > 0;
  }
  const vecGhost = new THREE.Mesh(vecGhostBox, ghostMat); vecGhost.visible = false; vecGhost.renderOrder = 4; vecGhost.userData.noOcc = true; scene.add(vecGhost);
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
      doors.muted = true;   // een voorbeeld laat geen deurbladen achter
      try { items.forEach((it, j) => { previewGroup.add(makeBlock(it, q, r, n0 + j, yy, x, z, { surfaces: [], walls: [] })); yy += TY(it).h; }); } finally { doors.muted = false; }
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
  // Wat haalt de hamer weg als je nu slaat? Zelfde volgorde als walkAction: module, randweg, getekende weg, driehoek, blok
  const PATH_NAMEN = { weg: 'Weg', brd: 'Brede weg', laan: 'Laan', pad: 'Pad', snel: 'Snelweg', klink: 'Klinkerstraat', fiets: 'Fietspad', ring: 'Rotonde', rot: 'Rotonde' };
  function eraseTarget(res) {
    if (!res || !res.point) return null;
    const x = res.point.x, z = res.point.z;
    if (cells.inst && cells.inst.length) {
      let best = res.inst ? cells.inst.indexOf(res.inst) : -1, bd = 7;
      if (best < 0) cells.inst.forEach((I, i) => { let d = 1e9; for (const a of instPts(I)) d = Math.min(d, Math.hypot(a[0] - x, a[1] - z)); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) return cells.inst[best].m.name || 'Module';
    }
    if (edgesOf().size && nearestExistingEdge(x, z, 4.5)) return 'Randweg';
    if (cells.paths && cells.paths.length) {
      let best = -1, bd = 1e9;
      cells.paths.forEach((p, i) => { const d = p.t === 'rot' ? Math.hypot(x - p.p[0][0], z - p.p[0][1]) - ROT.Ro : distPoly(x, z, smoothPts(p.p)) - PATH_DEF[p.t].hw; if (d < 2 && d < bd) { bd = d; best = i; } });
      if (best >= 0) return PATH_NAMEN[cells.paths[best].t] || 'Weg';
    }
    if (cells.tris && cells.tris.some(t => Math.hypot((t.v[0] + t.v[2] + t.v[4]) / 3 - x, (t.v[1] + t.v[3] + t.v[5]) / 3 - z) <= 3.2)) return 'Vlak';
    if (res.erase) { const st = stackOf(res.erase[0], res.erase[1]); if (st.length) { const t = TY(st[st.length - 1]); return (t && t.name) || 'Blok'; } }
    return null;
  }
  const aimLblEl = document.getElementById('aimLbl');
  function aimLabel(res) {   // alleen met de hamer in de hand: de naam van wat je zou weghalen
    const t = mode === 'walk' && hand === 'hamer' ? eraseTarget(res) : null;
    if (aimLblEl) { aimLblEl.hidden = !t; if (t) aimLblEl.textContent = 'Weghalen: ' + t; }
    if (crosshairEl) crosshairEl.classList.toggle('erase', !!t);
  }
  let lastHover = null;
  function updateGhost(cx, cy) {
    if (flyCam.on) {   // cameramodus: geen enkel bouwvoorbeeld, ook niet op lege vakken
      ghost.visible = false; ghostArrow.visible = false; ghostEdges.visible = false; edgeGhost.visible = false; moduleGhost.visible = false; vecGhost.visible = false; vecCells.visible = false; previewGroup.visible = false;
      vecPreClear(); terrHover(null); return;
    }
    if (cx == null) { if (!lastHover) return; [cx, cy] = lastHover; }
    lastHover = [cx, cy];
    ghostArrow.visible = false; vecCells.visible = false;
    if (!(VEC_TOOLS.has(tool) && !vecChain.on)) vecPreClear();
    if (tool === 'kies') {   // aanwijzen: geen bouwvoorbeeld, wel oplichten wat je aanwijst (15g)
      ghost.visible = false; ghostEdges.visible = false; edgeGhost.visible = false; moduleGhost.visible = false; vecGhost.visible = false; previewGroup.visible = false; previewActive = false; terrHover(null);
      if (mode === 'build') kiesHover(cx, cy); else kiesHide(); return;
    }
    const res = pick(cx, cy); lastPickRes = res; aimLabel(res);
    if (tool !== 'spoor') spoor.ghostHide();
    else { previewActive = false; ghost.visible = false; ghostEdges.visible = false; edgeGhost.visible = false; moduleGhost.visible = false; vecGhost.visible = false; spoor.hover(res && res.place && !(mode === 'walk' && hand !== 'bouwen') ? res.place : null); return; }
    edgeGhost.visible = false; moduleGhost.visible = false;
    if (terrHover(res, cx, cy)) { previewActive = false; ghost.visible = false; ghostEdges.visible = false; return; }
    if (!res || (mode === 'walk' && hand !== 'bouwen')) { ghost.visible = false; ghostEdges.visible = false; return; }
    if (VEC_TOOLS.has(tool) || tool === 'vrot') {   // voorbeeld: het stuk weg dat een klik hier maakt (of de rotonde)
      previewActive = false; ghost.visible = false; ghostEdges.visible = false;
      if (!res.place || roadDrag.on) { vecGhost.visible = false; vecPreClear(); return; }
      if (vecChain.on && VEC_T[tool] === vecChain.t) { vecGhost.visible = false; vecChainHover(res.place); return; }
      if (tool === 'vrot') { const c = cellToWorld(res.place[0], res.place[1]); vecGhost.geometry = vecGhostRing; vecGhost.position.set(c.x, gH(res.place[0], res.place[1]) + 0.3, c.z); vecGhost.rotation.y = 0; vecGhost.scale.set(1, 1, 1); vecGhost.visible = true; return; }
      if (VEC_TOOLS.has(tool)) { const plan = vecClickPlan(res.place, VEC_T[tool]); if (pathsOf().some(q0 => { const q = q0 === vecPre.tmp ? vecPre.orig : q0; return q && q.t === VEC_T[tool] && q.p && q.p.some(pt => Math.hypot(pt[0] - plan.W[0], pt[1] - plan.W[1]) < 3); })) { vecGhost.visible = false; vecPreClear(); return; }
        vecGhost.visible = false; vecPreShow(res.place, VEC_T[tool], plan); showVecCells(VEC_T[tool], plan.W, plan.W); return; }
      const { from, to } = vecClickPlan(res.place, VEC_T[tool]), dx = to[0] - from[0], dz = to[1] - from[1], len = Math.hypot(dx, dz) || 1, hw = PATH_DEF[VEC_T[tool]].hw;
      vecGhost.geometry = vecGhostBox; vecGhost.position.set((from[0] + to[0]) / 2, Math.max(gH(res.place[0], res.place[1]), terrainHeightAt((from[0] + to[0]) / 2, (from[1] + to[1]) / 2)) + 0.3, (from[1] + to[1]) / 2);
      vecGhost.rotation.y = -Math.atan2(dz, dx); vecGhost.scale.set(len + hw, 1, hw * 2); vecGhost.visible = true; showVecCells(VEC_T[tool], from, to); return;
    }
    vecGhost.visible = false;
    if (tool === 'module') { previewActive = false; ghost.visible = false; ghostEdges.visible = false; if (res.place) { const a = anchorOf(res); let lv = hudLayer() !== null ? hudLayer() : res.inst && !res.side ? res.lv : 0; if (!lv && modules[moduleSel] && Number.isInteger(a[0]) && Number.isInteger(a[1])) lv = overRoadLv(modules[moduleSel], moduleRot, a[0], a[1]) || 0; showModuleGhost(a[0], a[1], lv); } return; }
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

