  // ---------- Hulpjes voor veelhoeken ----------
  // ---------- Terrein: uitgraving, verhoging en brug ----------
  // Hoogteveld voor brede hellingen: langs een rand met een doel loopt het vlak precies naar dat doel,
  // ook als twee randen elkaar overlappen (anders zakt de rand weg en blijft er een kier naar de grond)
  function terrainFn(own, tg, band) {
    return (x, z) => {
      let prod = 1, num = 0, den = 0;
      for (let k = 0; k < 6; k++) {
        const e = tg[k]; if (!e) continue;
        const f = FRAMES[k], d = INNER - (x * f.nx + z * f.nz);
        if (d >= band) continue;
        const t = smooth01(1 - d / band);
        prod *= 1 - t; num += (e.lvl - own) * t; den += t;
      }
      return den > 0 ? own + (num / den) * (1 - prod) : own;
    };
  }
  const isKuilAt = (q, r) => baseOf(stackOf(q, r)[0]) === 'kuil';
  function kuilField(q, r) {
    const tg = NEIGH.map(([dq, dr]) => isKuilAt(q + dq, r + dr) ? null : { lvl: 0, notch: false });
    return { fn: terrainFn(-KUIL_D, tg, TERR_BAND), keyS: 'kuil' + tg.map(x => x ? 1 : 0).join('') };
  }
  function makeTerrain(o, t, q, r, i, baseY, cx, cz, col) {
    let fn, keyS;
    if (baseOf(t) === 'kuil') {
      ({ fn, keyS } = kuilField(q, r));
      const hole = new THREE.Mesh(hexPlane(R, false, true), holeMat); hole.position.y = 0.005; hole.renderOrder = -10; o.add(hole);
    } else {
      const tg = edgeTargets(q, r, baseY, HEUV_H);
      keyS = 'heuv' + JSON.stringify(tg);
      fn = terrainFn(HEUV_H, tg, TERR_BAND);
    }
    const geo = cachedField(keyS, () => fieldHexGeo(fn, 14));
    const m = new THREE.Mesh(geo, M.grass); m.receiveShadow = true; m.castShadow = true; o.add(m);
    col.surfaces.push({ kind: 'tris', cx, cz, B: geo.userData.tb, base: baseY, bottom: baseY });
  }
  // Betonnen bekleding op het talud onder een brug: een rooster dat precies de breedte van het dek volgt
  function slopeSkin(f, W, fn) {
    const nu = 6, np = 14, p0 = INNER - TERR_BAND - 0.5, pos = [], idx = [];
    for (let j = 0; j <= np; j++) {
      const p = p0 + (INNER - p0) * j / np;
      for (let n = 0; n <= nu; n++) { const u = -W + 2 * W * n / nu, [x, z] = local(f, u, p); pos.push(x, fn(x, z) + 0.05, z); }
    }
    for (let j = 0; j < np; j++) for (let n = 0; n < nu; n++) { const a = j * (nu + 1) + n, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function makeBrug(o, t, q, r, i, baseY, cx, cz, col) {
    const h = TY(t).h, top = baseY + h, bag = partsBag();
    if (!M.skin) { M.skin = std({ color: '#8f9189', side: THREE.DoubleSide }); M.beton = std({ color: '#b3b4ae' }); }
    const mask = pathMask(q, r, top);   // (alleen nog een brug onder een pad)
    const poly = cached('bdek' + mask, () => stripPoly(mask, PATH_HALF + 0.3, 2.6));
    bag.put(M.beton, extrudePoly(poly, 0.7, h - 0.7));   // dek van 70 cm dik
    const arms = [0, 1, 2, 3, 4, 5].filter(k => (mask >> k) & 1);
    const { fn } = kuilField(q, r);
    for (const k of arms) {
      if (isKuilAt(q + NEIGH[k][0], r + NEIGH[k][1])) continue;   // het dek loopt door over de volgende uitgraving
      const m = new THREE.Mesh(slopeSkin(FRAMES[k], PATH_HALF + 0.3, fn), M.skin); m.receiveShadow = true; m.userData.own = true; o.add(m);
    }
    if (arms.length === 2 && arms[1] - arms[0] === 3) {   // borstweringen langs beide zijden
      const f = FRAMES[arms[0]];
      for (const sgn of [-1, 1]) {
        const u = sgn * (PATH_HALF + 0.3 - 0.18);
        bag.put(M.beton, boxAt(f, u, 0, h + WALK_H + 0.45, 0.35, 0.9, 2 * INNER));
        bag.put(M.kadeSteen, boxAt(f, u, 0, h + WALK_H + 0.93, 0.45, 0.06, 2 * INNER));
        const [ax, az] = local(f, u, -INNER), [bx, bz] = local(f, u, INNER);
        col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: top - 1, y1: top + 1.2, half: 0.18 });
      }
    }
    bag.flush(o);
  }

  function makeBlock(t, q, r, i, baseY, cx, cz, col) {
    const o = new THREE.Group();
    o.position.y = baseY;
    o.userData = { q, r, i };
    if (baseOf(t) === 'kuil' || baseOf(t) === 'heuvel') { makeTerrain(o, t, q, r, i, baseY, cx, cz, col); return o; }
    if (baseOf(t) === 'brug' || baseOf(t) === 'brugp') { makeBrug(o, t, q, r, i, baseY, cx, cz, col); return o; }
    if (isBuilding(t)) { makeBuilding(o, t, q, r, i, baseY, cx, cz, col); return o; }
    if (['pad', 'trap', 'zuilen', 'hof'].includes(baseOf(t))) { makePedestrian(o, t, q, r, i, baseY, cx, cz, col); return o; }
    if (['looppad', 'blok', 'helling'].includes(baseOf(t))) { makeChannelBlock(o, t, q, r, i, baseY, cx, cz, col); return o; }
    if (['tunnel', 'muur', 'trappad', 'tribune', 'hofhelling'].includes(baseOf(t))) { makeModular(o, t, q, r, i, baseY, cx, cz, col); return o; }
    const kapels = /^dak\d$/.test(t) ? +t.slice(3) : 0;   // dak1: een dakkapel aan de voorkant, dak2: voor en achter
    if (kapels) t = 'dak';
    if (t !== 'water' && t !== 'park' && t !== 'dak') col.surfaces.push({ kind: 'hex', cx, cz, top: baseY + TYPES[t].h, bottom: baseY, hole: false });
    const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; o.add(m); return m; };
    const hv = hash(q, r, i);
    if (t === 'dak') {
      const eav = roofEaves(q, r, baseY);
      const rkey = 'dak' + JSON.stringify([eav.eaves, eav.ridges, eav.tris]);
      const rgeo = cachedField(rkey, () => roofGeo(roofFn(eav)));
      if (!M.roofTileD) { M.roofTileD = M.roofTile.clone(); M.roofTileD.side = THREE.DoubleSide; M.roofTileD.flatShading = false; }
      add(rgeo, M.roofTileD);
      col.surfaces.push({ kind: 'tris', cx, cz, B: rgeo.userData.tb, base: baseY, bottom: baseY });
      if (kapels && eav.open.length) {
        // voorkant = de kant van de voordeur van het huis eronder
        const st = stackOf(q, r);
        let hb = 0, j = i - 1; while (j > 0 && isBuilding(baseOf(st[j - 1]))) j--;
        for (let n = 0; n < j; n++) hb += TY(st[n]).h;
        let front = j >= 0 && isBuilding(baseOf(st[j])) ? doorFace(q, r, hb) : -1;
        if (front < 0) front = hv % 6;
        // alleen op een dakvlak met een goot: anders loopt het dak daar door naar de buren
        const ok = k => eav.open.includes(k);
        if (!ok(front)) front = ok((front + 3) % 6) ? (front + 3) % 6 : eav.open[0];
        const faces = kapels === 1 ? [front] : [front, (front + 3) % 6].filter(ok);
        for (const k of faces) {
          const ry = FRAMES[k].rot;
          for (const [g, m] of [[G.kapelBox, M.kapel], [G.kapelTop, M.kapelDak], [G.kapelWin, M.darkGlass], [G.kapelSill, M.kapel]]) add(g, m).rotation.y = ry;
        }
      }
    } else if (t === 'park') {
      const tg = edgeTargets(q, r, baseY, GREEN);
      const geo = cachedField('p' + JSON.stringify(tg), () => fieldHexGeo(fieldFn(GREEN, tg)));
      add(geo, M.grass);
      col.surfaces.push({ kind: 'tris', cx, cz, B: geo.userData.tb, base: baseY, bottom: baseY });
      const n = 3 + (hv % 2);
      const base = (hv % 6) * Math.PI / 3;
      for (let k = 0; k < n; k++) {
        const ang = base + k * (Math.PI * 2 / n) + ((hv >>> (k + 7)) % 3) * 0.2;
        const rad = 3.0 + ((hv >>> (k * 5 + 3)) % 4) * 0.55;
        const tx = Math.cos(ang) * rad, tz = Math.sin(ang) * rad;
        add(G.trunk, M.trunk).position.set(tx, FLAT, tz);
        const sc = 0.85 + ((hv >>> (k * 2 + 1)) % 4) * 0.13;
        const c = add(G.crown, M.leaf[(hv >>> k) % 3]);
        c.scale.set(sc, sc * 1.15, sc); c.position.set(tx, FLAT + 2.4 + 2.1 * sc * 0.9, tz);
      }
    } else if (t === 'water') {
      // Gracht: waterspiegel op -1,4 m, bakstenen kademuren met een hardstenen rand waar land grenst.
      // Ligt er een weg of pad op, dan is het een brug: stenen dek, en borstweringen langs open water.
      const WATER_Y = -1.4, bag = partsBag();
      const hole = new THREE.Mesh(hexPlane(R, false, true), holeMat); hole.position.y = 0.005; hole.renderOrder = -10; o.add(hole);
      const surf = new THREE.Mesh(hexPlane(R, false, true), M.water); surf.position.y = WATER_Y; surf.receiveShadow = true; o.add(surf);
      const st = stackOf(q, r), bridge = st.length > i + 1;
      const isWaterAt = (nq, nr) => baseOf(stackOf(nq, nr)[0]) === 'water';
      const wallSeg = (f, p, y0, y1) => {
        const [ax, az] = local(f, -R / 2, p), [bx, bz] = local(f, R / 2, p);
        col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: baseY + y0, y1: baseY + y1, half: 0.15, quay: true });
      };
      // Brug: het dek is precies zo breed als de straat (9 m) of het pad erop (3,6 m)
      let deckMask = 0, straight = false, deckW = 0;
      if (bridge) {
        for (let k = 0; k < 6; k++) if ((pathMask(q, r, baseY) >> k) & 1) deckMask |= 1 << k;
        deckW = PATH_HALF + 0.3;
        const arms = [0, 1, 2, 3, 4, 5].filter(k => (deckMask >> k) & 1);
        straight = arms.length === 2 && arms[1] - arms[0] === 3;
        const poly = cached('dekp' + deckMask + '_' + deckW, () => stripPoly(deckMask, deckW, 2.6));
        bag.put(M.brug, cached('dek' + deckMask + '_' + deckW, () => extrudePoly(poly, 0.5, -0.5)));
        col.surfaces.push({ kind: 'poly', cx, cz, pts: poly, top: baseY, bottom: baseY - 0.5 });
        if (straight) {   // borstweringen langs beide zijden van de brug
          const f = FRAMES[arms[0]], lift = 0;
          for (const sgn of [-1, 1]) {
            const u = sgn * (deckW - 0.18);
            bag.put(M.brug, boxAt(f, u, 0, lift + 0.45, 0.35, 0.9, 2 * INNER));
            bag.put(M.kadeSteen, boxAt(f, u, 0, lift + 0.93, 0.45, 0.06, 2 * INNER));
            const [ax, az] = local(f, u, -INNER), [bx, bz] = local(f, u, INNER);
            col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: baseY - 2, y1: baseY + 1.2, half: 0.18 });
          }
        }
      }
      for (let k = 0; k < 6; k++) {
        const f = FRAMES[k], nq = q + NEIGH[k][0], nr = r + NEIGH[k][1];
        if (!isWaterAt(nq, nr)) {   // kademuur naar het land
          bag.put(M.kade, boxAt(f, 0, INNER - 0.15, -1.0, R, 2.0, 0.3));
          bag.put(M.kadeSteen, boxAt(f, 0, INNER - 0.25, 0.06, R, 0.12, 0.5));
          if (!bridge || !((deckMask >> k) & 1)) wallSeg(f, INNER - 0.15, -2, 1.2);
        }
      }
      bag.flush(o);
    }
    return o;
  }

  function disposeGroup(g) { g.traverse(m => { if (m.isMesh && m.userData.own) m.geometry.dispose(); }); }
  // ---------- Wegen en paden langs de rand tussen twee vakken ----------
  // Een randweg ligt over de zijde die twee vakken delen: elk vak levert een halve strook. De zijden vormen samen
  // een honingraat; op elk hoekpunt komen er hooguit drie bij elkaar. Ze worden bewaard in cells.edges
  // als "q,r,k" (k = 0..2: de zijde van vak q,r naar buurman k) → 'weg' of 'pad'.
  const EDGE_TOOLS = new Set(['randpad']);   // (randweg en brede randweg zijn getekende wegen geworden)
  const EDGE_LIFT = 0.06, EDGE_L = R / 2, PAD_H_EDGE = 0.15;
  const edgesOf = () => cells.edges || (cells.edges = new Map());
  const edgeColMap = new Map();
  let edgeGroup = null;
  function edgeCanon(q, r, k) { return k < 3 ? [q, r, k] : [q + NEIGH[k][0], r + NEIGH[k][1], k - 3]; }
  function edgeEnds(q, r, k) {
    if (k >= 6) { const c0 = cellToWorld(q, r), a0 = local(FRAMES[k - 6], -R / 2, INNER); return [[c0.x + a0[0], c0.z + a0[1]], [c0.x - a0[0], c0.z - a0[1]]]; }   // 6..8: rechtdoor door het vak, van hoekpunt naar hoekpunt
    const c = cellToWorld(q, r), f = FRAMES[k], a = local(f, -R / 2, INNER), b = local(f, R / 2, INNER);
    return [[c.x + a[0], c.z + a[1]], [c.x + b[0], c.z + b[1]]];
  }
  function distSeg(px, pz, a, b) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2)) : 0;
    return Math.hypot(a[0] + t * dx - px, a[1] + t * dz - pz);
  }
  // De zijde die het dichtst bij een punt ligt
  function nearestEdge(x, z) {
    const [q, r] = worldToCell(x, z);
    let best = null;
    for (let k = 0; k < 6; k++) {
      const [a, b] = edgeEnds(q, r, k), d = distSeg(x, z, a, b);
      if (!best || d < best.d) best = { q, r, k, d };
    }
    for (let k = 6; k < 9; k++) {
      const [a, b] = edgeEnds(q, r, k), d = distSeg(x, z, a, b);
      if (d < best.d) best = { q, r, k, d };
    }
    if (best.k >= 6) return { q: best.q, r: best.r, k: best.k, d: best.d, key: best.q + ',' + best.r + ',' + best.k };
    const [cq, cr, ck] = edgeCanon(best.q, best.r, best.k);
    return { q: cq, r: cr, k: ck, d: best.d, key: cq + ',' + cr + ',' + ck };
  }
  // De bestaande randweg die het dichtst bij een punt ligt (binnen maxD meter)
  function nearestExistingEdge(x, z, maxD) {
    const E = edgesOf(); if (!E.size) return null;
    const [q0, r0] = worldToCell(x, z); let best = null;
    for (const [dq, dr] of [[0, 0], ...NEIGH]) for (let k = 0; k < 9; k++) {
      const [q, r, kk] = k < 6 ? edgeCanon(q0 + dq, r0 + dr, k) : [q0 + dq, r0 + dr, k], id = q + ',' + r + ',' + kk;
      if (!E.has(id)) continue;
      const [a, b] = edgeEnds(q, r, kk), d = distSeg(x, z, a, b);
      if (d <= maxD && (!best || d < best.d)) best = { q, r, k: kk, d, key: id };
    }
    return best;
  }
  const edgeCellsOf = (q, r, k) => k >= 6 ? [[q, r]] : [[q, r], [q + NEIGH[k][0], r + NEIGH[k][1]]];
  function edgeBlocked(q, r, k) {
    for (const [cq, cr] of edgeCellsOf(q, r, k)) {
      const b0 = baseOf(stackOf(cq, cr)[0]);
      if (b0 === 'water') return 'Over water past geen randweg; leg er een brug over';
      if (b0 === 'kuil' || b0 === 'heuvel') return 'Op verhoogd of verlaagd terrein past geen randweg';
      if (columnTop(cq, cr) > 0.5) return 'Een randweg ligt op de grond';
    }
    return null;
  }

