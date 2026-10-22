  // ---------- Terrein boetseren ----------
  // Vijf gereedschappen, allemaal met de muis ingedrukt houden en slepen (op een touchscreen: even vasthouden):
  //  Ophogen / Afgraven  zolang je drukt gaat het terrein onder het penseel omhoog of omlaag (Shift: andersom)
  //  Egaliseren          alles wat je raakt gaat naar de hoogte van het vak waar je begon
  //  Gladstrijken        scherpe overgangen worden zacht (elk vak schuift naar het gemiddelde van zijn buren)
  //  Helling             sleep van A naar B: een gelijkmatige helling van de hoogte bij A naar die bij B
  // Het penseel is 1, 7, 19 of 37 vakken ([ en ]); het midden werkt het hardst. Vakken waar iets op staat blijven
  // liggen. Hoogtelijnen (elke 1,5 m, dikker elke 7,5 m) laten zien wat je doet.
  const TERR_TOOLS = new Set(['tophoog', 'tafgraaf', 'tvlak', 'tglad', 'thelling']);
  const TERR_COL = { tophoog: '#f2b233', tafgraaf: '#5aa9e6', tvlak: '#ffffff', tglad: '#8fd16a', thelling: '#f08a5d' };
  const brushCells = (q, r, B = terrBrush) => { const out = []; for (let dq = -B; dq <= B; dq++) for (let dr = -B; dr <= B; dr++) { const d = hexDist(dq, dr); if (d <= B) out.push([q + dq, r + dr, d]); } return out; };
  const brushW = d => d === 0 ? 1 : 1 - 0.55 * d / (terrBrush + 0.5);
  const terrFree = (q, r) => !terrOcc(q, r);
  // Penseelring en hoogtelabel
  const brushRing = (() => {
    const N = 96, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const m = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthTest: false }));
    m.renderOrder = 20; m.visible = false; m.frustumCulled = false; scene.add(m);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true }));
    dot.renderOrder = 20; dot.visible = false; scene.add(dot);
    return {
      show(x, z, tl) {
        const rad = terrBrush * 2 * INNER + R * 0.95, P = g.attributes.position;
        for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, px = x + Math.cos(a) * rad, pz = z + Math.sin(a) * rad; P.setXYZ(i, px, terrGround(px, pz) + 0.3, pz); }
        P.needsUpdate = true; m.material.color.set(TERR_COL[tl] || '#fff'); dot.material.color.set(TERR_COL[tl] || '#fff');
        dot.position.set(x, terrGround(x, z) + 0.25, z); m.visible = dot.visible = true;
      },
      hide() { m.visible = dot.visible = false; },
    };
  })();
  const terrLbl = document.createElement('div'); terrLbl.id = 'terrLbl'; terrLbl.hidden = true; document.body.appendChild(terrLbl);
  const fmtM = v => (Math.round(v * 2) / 2).toLocaleString('nl', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' m';
  function terrHover(res, cx, cy) {
    if (!TERR_TOOLS.has(tool) || !res || !res.point || mode !== 'build') { brushRing.hide(); terrLbl.hidden = true; return false; }
    const [q, r] = worldToCell(res.point.x, res.point.z), c = cellToWorld(q, r);
    brushRing.show(c.x, c.z, tool);
    terrLbl.hidden = false; terrLbl.style.left = (cx + 16) + 'px'; terrLbl.style.top = (cy + 14) + 'px';
    terrLbl.textContent = terrOcc(q, r) ? fmtM(gH(q, r)) + ' · bebouwd' : SC.on && tool === 'thelling' && SC.a ? fmtM(SC.ha) + ' → ' + fmtM(SC.prior.get(q + ',' + r) ?? gH(q, r)) : fmtM(gH(q, r));
    return true;
  }
  // Een streek: van indrukken tot loslaten
  const SC = { on: false, x: 0, y: 0, inv: false, touched: new Set(), a: null, ha: 0, prior: null, hv: 0 };
  function terrCellAt(cx, cy) { const h = groundHit(cx, cy); return h ? worldToCell(h.point.x, h.point.z) : null; }
  function sculptStart(cx, cy, inv) {
    const c = terrCellAt(cx, cy); if (!c) return false;
    Object.assign(SC, { on: true, x: cx, y: cy, inv: !!inv, touched: new Set(), a: c, ha: gH(c[0], c[1]), prior: new Map(), hv: gH(c[0], c[1]) });
    if (tool === 'tophoog' || tool === 'tafgraaf') sculptStep(0.12);   // een klik is ook al een stapje
    if (tool === 'thelling') sculptMove(cx, cy);
    return true;
  }
  function sculptMove(cx, cy) {
    SC.x = cx; SC.y = cy;
    if (!SC.on || tool !== 'thelling') return;
    // helling: alles terugzetten en opnieuw een rechte helling van A naar het vak onder de muis
    const b = terrCellAt(cx, cy); if (!b) return;
    const back = []; for (const [k, h] of SC.prior) { const [q, r] = k.split(',').map(Number); back.push([q, r, h]); }
    terrSet(back); SC.prior.clear();
    const A = cellToWorld(SC.a[0], SC.a[1]), Bw = cellToWorld(b[0], b[1]), hb = gH(b[0], b[1]), dx = Bw.x - A.x, dz = Bw.z - A.z, L2 = dx * dx + dz * dz;
    if (L2 < 1) { terrFlush(); return; }
    const line = [SC.a, ...hexLine(SC.a, b)], set = new Map();
    for (const [q, r] of line) for (const [cq, cr] of brushCells(q, r)) {
      const k = cq + ',' + cr; if (set.has(k) || !terrFree(cq, cr)) continue;
      const w = cellToWorld(cq, cr), t = Math.max(0, Math.min(1, ((w.x - A.x) * dx + (w.z - A.z) * dz) / L2));
      set.set(k, [cq, cr, SC.ha + (hb - SC.ha) * t]);
    }
    for (const [k, v] of set) { SC.prior.set(k, gH(v[0], v[1])); SC.touched.add(k); }
    terrSet([...set.values()]); terrFlush();
  }
  function sculptStep(dt) {
    const c = terrCellAt(SC.x, SC.y); if (!c) return;
    const raise = (tool === 'tophoog') !== SC.inv, list = [];
    for (const [q, r, d] of brushCells(c[0], c[1])) {
      if (!terrFree(q, r)) continue;
      const w = brushW(d), h = gH(q, r);
      let nh = h;
      if (tool === 'tophoog' || tool === 'tafgraaf') nh = h + (raise ? 1 : -1) * 6 * w * dt;
      else if (tool === 'tvlak') { const dv = SC.hv - h; nh = h + Math.sign(dv) * Math.min(Math.abs(dv), 12 * w * dt); }
      else if (tool === 'tglad') { let s = 0; for (const [dq, dr] of NEIGH) s += gH(q + dq, r + dr); nh = h + (s / 6 - h) * Math.min(1, 4 * w * dt); }
      list.push([q, r, nh]);
    }
    const ch = terrSet(list);
    for (const [q, r] of ch) SC.touched.add(q + ',' + r);
    if (ch.length) terrFlush();
  }
  let sculptAcc = 0;
  function sculptUpdate(dt) {   // elke frame zolang de knop is ingedrukt (niet bij de helling: die volgt de muis)
    if (!SC.on || tool === 'thelling') return;
    sculptAcc += dt; if (sculptAcc < 0.05) return;   // 20 keer per seconde is genoeg
    sculptStep(Math.min(0.15, sculptAcc)); sculptAcc = 0;
    if (lastHover) updateGhost();
  }
  function sculptEnd() {
    if (!SC.on) return;
    SC.on = false; sculptAcc = 0;
    if (!SC.touched.size) return;
    const list = [...SC.touched].map(k => k.split(',').map(Number));
    terrVer++;   // wegprofielen volgen het nieuwe terrein
    if (!terrainChanged(list)) terrFlush();
    peopleDirty = true; carsDirty = true; changed();
    const name = { tophoog: SC.inv ? 'Afgegraven' : 'Opgehoogd', tafgraaf: SC.inv ? 'Opgehoogd' : 'Afgegraven', tvlak: 'Geëgaliseerd', tglad: 'Gladgestreken', thelling: 'Helling gemaakt' }[tool];
    toast(name + ': ' + list.length + (list.length === 1 ? ' vak' : ' vakken'), 1000);
  }
  // Tijdens het lopen (hand: bouwen) een klik: één flinke stap op het vak waar je naar kijkt
  function terrImpulse(q, r) {
    const raise = tool !== 'tafgraaf', list = [];
    for (const [cq, cr, d] of brushCells(q, r)) { if (!terrFree(cq, cr)) continue; const h = gH(cq, cr), w = brushW(d); list.push([cq, cr, tool === 'tglad' ? h + ([...NEIGH].reduce((s, [dq, dr]) => s + gH(cq + dq, cr + dr), 0) / 6 - h) * 0.6 * w : tool === 'tvlak' ? gH(q, r) : h + (raise ? 1.5 : -1.5) * w]); }
    const ch = terrSet(list); if (!ch.length) return toast('Hier ligt iets: het terrein blijft liggen');
    terrVer++; if (!terrainChanged(ch)) terrFlush(); peopleDirty = true; carsDirty = true; changed();
  }
