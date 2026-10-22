  // ---------- Voetgangersnetwerk ----------
  // Elk stuk loopvlak heeft een hoogte en de zijden waarlangs je het kunt betreden.
  // Pad en binnenhof: alle zijden op hun voet. Zuilen: dek bovenop. Trap: onderkant aan de ene
  // zijde, bovenkant 3 m hoger aan de andere. Wegen en voordeuren doen passief mee: een pad
  // loopt ernaartoe, maar ze veranderen er zelf niet door.
  let pathLinks = new Map(), pathIfs = new Map();
  // Paden die tussen twee aansluitende wegvakken uitkomen, lopen haaks op de straat naar de hoek waar die twee
  // vakken elkaar raken: daar ligt de rand van de stoep. Per pad: [{ k, k2, ex, ez }] (logische zijde k, hoek lokaal);
  // cornerVia: "sleutel|zijde" → hoekpunt in de wereld en richting, voor de looproute.
  let pathCorners = new Map(), cornerVia = new Map();
  function ifacesOfColumn(q, r) {
    const st = stackOf(q, r), out = [];
    let y = 0;
    st.forEach((t, i) => {
      const b = baseOf(t);
      if (b === 'pad' || b === 'hof') out.push({ y, sides: 63 });
      else if (b === 'zuilen' && i === st.length - 1) out.push({ y: y + 3, sides: 63 });
      else if (b === 'trap' || b === 'helling' || b === 'trappad' || b === 'tribune') { const d = dirOf(t); out.push({ y, sides: 1 << ((d + 3) % 6) }); out.push({ y: y + 3, sides: 1 << d }); }
      else if (b === 'looppad') { out.push({ y, sides: 63 }); if (i === st.length - 1) out.push({ y: y + 3, sides: 63, passive: true }); }
      else if (b === 'blok' && i === st.length - 1) out.push({ y: y + 3, sides: 63, passive: true });
      else if (b === 'tunnel') { out.push({ y, sides: 63 }); if (i === st.length - 1) out.push({ y: y + 3, sides: 63, passive: true }); }
      else if (b === 'hofhelling') { const d = dirOf(t); out.push({ y, sides: 63 & ~(1 << d) }); out.push({ y: y + 3, sides: 1 << d }); }
      else if (isBuilding(b)) { const df = doorFace(q, r, y); if (df >= 0) out.push({ y, sides: 1 << df, passive: true }); }
      y += TY(t).h;
    });
    return out;
  }
  function pathHas(q, r, y, side) { const f = pathIfs.get(lk(q, r, y)); return !!f && ((f.sides >> side) & 1) === 1; }
  function computePathLinks() {
    const ifs = new Map();
    for (const k of cells.keys()) {
      const [q, r] = k.split(',').map(Number);
      for (const f of ifacesOfColumn(q, r)) {
        const kk = lk(q, r, f.y), prev = ifs.get(kk);
        if (prev) { prev.sides |= f.sides; prev.passive = prev.passive && !!f.passive; }
        else ifs.set(kk, { q, r, y: f.y, sides: f.sides, passive: !!f.passive });
      }
    }
    const has = (q, r, y, side) => { const f = ifs.get(lk(q, r, y)); return !!f && ((f.sides >> side) & 1) === 1; };
    const edges = [];
    for (const [ka, A] of ifs) {
      for (let k = 0; k < 6; k++) {
        if (!((A.sides >> k) & 1)) continue;
        const [dq, dr] = NEIGH[k], bq = A.q + dq, br = A.r + dr, kb = lk(bq, br, A.y);
        if (ka > kb || !has(bq, br, A.y, (k + 3) % 6)) continue;
        const B = ifs.get(kb);
        if (A.passive && B.passive) continue;
        const score = (has(A.q - dq, A.r - dr, A.y, k) ? 1 : 0) + (has(bq + dq, br + dr, A.y, (k + 3) % 6) ? 1 : 0);
        edges.push({ ka, kb, A, k, bq, br, score });
      }
    }
    edges.sort((e, f) => f.score - e.score || (e.ka < f.ka ? -1 : e.ka > f.ka ? 1 : 0) || e.k - f.k);
    const adj = new Map(), masks = new Map();
    const linked = (a, b) => adj.has(a) && adj.get(a).has(b);
    const link = (a, b) => { if (!adj.has(a)) adj.set(a, new Set()); adj.get(a).add(b); };
    for (const e of edges) {
      let tri = false;
      for (const kk of [(e.k + 1) % 6, (e.k + 5) % 6]) {
        const kc = lk(e.A.q + NEIGH[kk][0], e.A.r + NEIGH[kk][1], e.A.y);
        if (linked(e.ka, kc) && linked(e.kb, kc)) { tri = true; break; }
      }
      if (tri) continue;
      link(e.ka, e.kb); link(e.kb, e.ka);
      masks.set(e.ka, (masks.get(e.ka) || 0) | (1 << e.k));
      masks.set(e.kb, (masks.get(e.kb) || 0) | (1 << ((e.k + 3) % 6)));
    }
    const corners = new Map(), via = new Map();   // (haakse aansluitingen op vakwegen bestaan niet meer)
    return { masks, ifs, corners, via };
  }
  const pathMask = (q, r, y) => pathLinks.get(lk(q, r, y)) || 0;
  function refreshPathLinks() {
    const old = pathLinks, res = computePathLinks(), changed = new Set();
    for (const k of new Set([...old.keys(), ...res.masks.keys()])) {
      if ((old.get(k) || 0) !== (res.masks.get(k) || 0)) changed.add(k.split(',').slice(0, 2).join(','));
    }
    for (const k of new Set([...pathCorners.keys(), ...res.corners.keys()])) {
      if (JSON.stringify(pathCorners.get(k) || null) !== JSON.stringify(res.corners.get(k) || null)) changed.add(k.split(',').slice(0, 2).join(','));
    }
    pathLinks = res.masks; pathIfs = res.ifs; pathCorners = res.corners; cornerVia = res.via;
    return changed;
  }

  // ---------- Bouwhulpjes ----------
  function partsBag() {
    const m = new Map();
    return {
      put(mat, g) { if (!m.has(mat)) m.set(mat, []); m.get(mat).push(g); },
      flush(o) {
        for (const [mat, list] of m) {
          const mesh = new THREE.Mesh(mergeGeos(list), mat);
          mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.own = true; o.add(mesh);
        }
      },
    };
  }
  const X_AXIS = new THREE.Vector3(1, 0, 0);
  function boxAt(f, u, p, y, su, sy, sp, tilt) {   // doos in het assenstelsel van zijde f (u langs, p naar buiten)
    const [x, z] = local(f, u, p);
    const qt = new THREE.Quaternion().setFromAxisAngle(UP, f.rot);
    if (tilt) qt.multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, tilt));
    const g = G.unit.clone();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), qt, new THREE.Vector3(su, sy, sp)));
    return g;
  }
  function extrudePoly(pts, h, y0) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    if (y0) g.translate(0, y0, 0);
    return g;
  }
  // Vorm van een netwerk van stroken (half breed w) met een rond pleintje aan het eind
  // Zelfde, maar met losse armen { th, len }: zo kan een arm ook naar een hoek van het vak lopen
  function stripPolyArms(armsIn, w, endR) {
    const arms = armsIn.slice().sort((a, b) => a.th - b.th);
    const at = (th, s2, wl) => [Math.cos(th) * s2 - Math.sin(th) * wl, Math.sin(th) * s2 + Math.cos(th) * wl];
    const circle = (rad, n = 32) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * Math.PI * 2) * rad, Math.sin(i / n * Math.PI * 2) * rad]);
    if (!arms.length) return circle(endR);
    if (arms.length === 1) {
      const { th, len } = arms[0], al = Math.asin(w / endR), s0 = Math.sqrt(endR * endR - w * w), pts = [at(th, len, w), at(th, s0, w)];
      for (let i = 1; i < 28; i++) { const an = th + al + (Math.PI * 2 - 2 * al) * i / 28; pts.push([Math.cos(an) * endR, Math.sin(an) * endR]); }
      pts.push(at(th, s0, -w), at(th, len, -w));
      return pts;
    }
    const pts = [];
    arms.forEach((A, i) => {
      const B = arms[(i + 1) % arms.length];
      let g = B.th - A.th; if (g <= 1e-6) g += Math.PI * 2;
      pts.push(at(A.th, A.len, w));
      if (g < Math.PI - 1e-3) { const bis = A.th + g / 2, d = w / Math.sin(g / 2); pts.push([Math.cos(bis) * d, Math.sin(bis) * d]); }
      else if (g > Math.PI + 1e-3) {
        const a0 = A.th + Math.PI / 2, a1 = A.th + g - Math.PI / 2, n = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 16)));
        for (let j = 0; j <= n; j++) { const an = a0 + (a1 - a0) * j / n; pts.push([Math.cos(an) * w, Math.sin(an) * w]); }
      }
      pts.push(at(B.th, B.len, -w));
    });
    return pts;
  }
  function stripPoly(mask, w, endR) {
    const arms = [0, 1, 2, 3, 4, 5].filter(k => mask & (1 << k)).map(k => Math.atan2(FRAMES[k].nz, FRAMES[k].nx)).sort((a, b) => a - b);
    const L = INNER;
    const at = (th, s, wl) => [Math.cos(th) * s - Math.sin(th) * wl, Math.sin(th) * s + Math.cos(th) * wl];
    const circle = (rad, n = 32) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * Math.PI * 2) * rad, Math.sin(i / n * Math.PI * 2) * rad]);
    if (!arms.length) return circle(endR);
    if (arms.length === 1) {
      const th = arms[0], al = Math.asin(w / endR), s0 = Math.sqrt(endR * endR - w * w), pts = [at(th, L, w), at(th, s0, w)];
      for (let i = 1; i < 28; i++) { const an = th + al + (Math.PI * 2 - 2 * al) * i / 28; pts.push([Math.cos(an) * endR, Math.sin(an) * endR]); }
      pts.push(at(th, s0, -w), at(th, L, -w));
      return pts;
    }
    const pts = [];
    arms.forEach((a, i) => {
      const b = arms[(i + 1) % arms.length];
      let g = b - a; if (g <= 1e-6) g += Math.PI * 2;
      pts.push(at(a, L, w));
      if (g < Math.PI - 1e-3) { const bis = a + g / 2, d = w / Math.sin(g / 2); pts.push([Math.cos(bis) * d, Math.sin(bis) * d]); }
      else if (g > Math.PI + 1e-3) {
        const a0 = a + Math.PI / 2, a1 = a + g - Math.PI / 2, n = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 16)));
        for (let j = 0; j <= n; j++) { const an = a0 + (a1 - a0) * j / n; pts.push([Math.cos(an) * w, Math.sin(an) * w]); }
      }
      pts.push(at(b, L, -w));
    });
    return pts;
  }
  // Balustrade van 1 m langs de rand van een hoog loopvlak, behalve waar je verder kunt lopen
  function addRailings(bag, col, q, r, cx, cz, worldY, localY, mask) {
    for (let k = 0; k < 6; k++) {
      if ((mask >> k) & 1) continue;
      const nq = q + NEIGH[k][0], nr = r + NEIGH[k][1];
      if (pathHas(nq, nr, worldY, (k + 3) % 6)) continue;
      if (columnTop(nq, nr) >= worldY - 0.3) continue;   // geen hoogteverschil (of een muur): geen balustrade nodig
      const f = FRAMES[k], p = INNER - 0.12, half = R / 2 - 0.2;
      bag.put(M.rail, boxAt(f, 0, p, localY + 1.0, 2 * half, 0.06, 0.07));
      bag.put(M.rail, boxAt(f, 0, p, localY + 0.12, 2 * half, 0.04, 0.04));
      for (let u = -half; u <= half + 1e-6; u += 0.5) bag.put(M.rail, boxAt(f, u, p, localY + 0.56, 0.03, 0.88, 0.03));
      const [ax, az] = local(f, -half, p), [bx, bz] = local(f, half, p);
      col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: worldY, y1: worldY + 1.05, half: 0.05 });
    }
  }
  const PATH_HALF = 1.5;   // voetpad 3 m breed
  const padGeoCache = new Map();
  function makePedestrian(o, t, q, r, i, baseY, cx, cz, col) {
    const b = baseOf(t), bag = partsBag(), st = stackOf(q, r);
    const wall = (f, u0, u1, p, y0, y1, half) => {
      const [ax, az] = local(f, u0, p), [bx, bz] = local(f, u1, p);
      col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: baseY + y0, y1: baseY + y1, half });
    };
    if (b === 'pad') {
      const mask = pathMask(q, r, baseY), corners = pathCorners.get(lk(q, r, baseY)) || [];
      // elke arm loopt aan het eind naar de hoogte van wat daar ligt: stoep, berm, park, hof, drempel.
      // Ligt het pad tussen twee wegvakken, dan loopt één arm haaks op de straat naar de hoek met de stoep.
      const viaMask = corners.reduce((m2, c) => m2 | (1 << c.k), 0);
      const armK = [0, 1, 2, 3, 4, 5].filter(k => ((mask & ~viaMask) >> k) & 1);
      const ends = armK.map(k => {
        const e = edgeInfo(q, r, k, baseY);
        if (!e || e.notch) return PAD_TOP;
        if (e.bld) return FLOOR_T;
        if (Math.abs(e.lvl - GREEN) < 1e-3) return PAD_TOP;
        return +Math.max(0.03, e.lvl).toFixed(3);
      });
      if (padOnGrass(q, r, baseY)) {
        const tg = edgeTargets(q, r, baseY, GREEN);
        const gg = cachedField('p' + JSON.stringify(tg), () => fieldHexGeo(fieldFn(GREEN, tg)));
        const gm = new THREE.Mesh(gg, M.grass); gm.receiveShadow = true; o.add(gm);
        col.surfaces.push({ kind: 'tris', cx, cz, B: gg.userData.tb, base: baseY, bottom: baseY });
      }
      const arms = armK.map((k, j) => ({ th: Math.atan2(FRAMES[k].nz, FRAMES[k].nx), len: INNER, end: ends[j] }))
        .concat(corners.map(c => ({ th: Math.atan2(c.ez, c.ex), len: Math.hypot(c.ex, c.ez), end: WALK_H })));
      // zelf gekozen richting: een losse arm naar die zijde (bij een los stuk pad recht door het vak)
      const pv = padVar(t);
      if (pv.dir) {
        const free = [pv.dir - 1];
        if (!arms.length) free.push((pv.dir + 2) % 6);
        for (const k of free) {
          if (((mask >> k) & 1) || corners.some(c => c.k === k || c.k2 === k)) continue;
          const e = edgeInfo(q, r, k, baseY);
          const end = !e || e.notch || Math.abs(e.lvl - GREEN) < 1e-3 ? PAD_TOP : e.bld ? FLOOR_T : +Math.max(0.03, e.lvl).toFixed(3);
          arms.push({ th: Math.atan2(FRAMES[k].nz, FRAMES[k].nx), len: INNER, end });
        }
      }
      const half = pv.wide ? FIETS_HALF : PATH_HALF;
      const pkey = pv.wide + ':' + mask + ':' + ends.join(',') + ':' + corners.map(c => c.k).join(',') + ':' + pv.dir + ':' + arms.map(a => a.end).join(',');
      if (!padGeoCache.has(pkey)) {
        const poly = stripPolyArms(arms, half, pv.wide ? 3.6 : arms.length ? 2.6 : 3.2);
        const fn = (x, z) => {
          let bs = 0, bj = -1;
          arms.forEach((A, j) => { const s2 = x * Math.cos(A.th) + z * Math.sin(A.th); if (s2 > bs) { bs = s2; bj = j; } });
          if (bj < 0) return PAD_TOP;
          const A = arms[bj];
          return PAD_TOP + (A.end - PAD_TOP) * Math.max(0, Math.min(1, (bs - 2.6) / (A.len - 2.6)));
        };
        const geo = fieldExtrude(poly, fn); triBuckets(geo);
        const ent = { poly, geo };
        if (pv.wide) {   // fietsstroken in het midden en een middenstreep
          ent.lane = fieldExtrude(stripPolyArms(arms, FIETS_LANE, 3.0), (x, z) => fn(x, z) + 0.012);
          if (arms.length >= 2) ent.line = fieldExtrude(stripPolyArms(arms, 0.06, 1.0), (x, z) => fn(x, z) + 0.024);
        }
        padGeoCache.set(pkey, ent);
      }
      const pg = padGeoCache.get(pkey);
      if (pv.wide && !M.tileBeige) {
        const tile = (base, line, size) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 64, 64); g.fillStyle = line; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1 / size, 1 / size); tx.anisotropy = aniso; return std({ map: tx, roughness: 0.95 }); };
        M.tileBeige = tile('#c9bfae', '#a99f8e', 1.0); M.tileCycle = tile('#7c8a91', '#5f6c73', 1.5); M.tileLine = std({ color: '#23282c' });
      }
      const m = new THREE.Mesh(pg.geo, [pv.wide ? M.tileBeige : M.paver, M.kerb]); m.receiveShadow = true; m.castShadow = true; o.add(m);
      if (pg.lane) { const ml = new THREE.Mesh(pg.lane, [M.tileCycle, M.tileCycle]); ml.receiveShadow = true; o.add(ml); }
      if (pg.line) { const mn = new THREE.Mesh(pg.line, [M.tileLine, M.tileLine]); mn.receiveShadow = true; o.add(mn); }
      // bomen langs het pad: aan weerszijden van elke arm, op het gras
      if (pv.trees && padOnGrass(q, r, baseY)) {
        const add = (g, mt) => { const mm = new THREE.Mesh(g, mt); mm.castShadow = true; mm.receiveShadow = true; o.add(mm); return mm; };
        const gfn = fieldFn(GREEN, edgeTargets(q, r, baseY, GREEN)), list = arms.length ? arms : [{ th: 0, len: INNER }, { th: Math.PI, len: INNER }];
        let j = 0;
        for (const A of list) for (const side of [-1, 1]) {
          const sAl = 4.6, lat = side * (half + 1.3);
          const x = Math.cos(A.th) * sAl - Math.sin(A.th) * lat, z = Math.sin(A.th) * sAl + Math.cos(A.th) * lat;
          if (FRAMES.some(f => x * f.nx + z * f.nz > INNER - 0.9)) continue;
          if (list.some(B => segDist2(x, z, 0, 0, Math.cos(B.th) * B.len, Math.sin(B.th) * B.len) < half + 0.8)) continue;
          const hj = hash(q, r, 50 + j++), y0 = gfn(x, z) - 0.02, sc = 0.55 + (hj % 4) * 0.05;
          const tr = add(G.trunk, M.trunk); tr.scale.set(0.6, 0.8, 0.6); tr.position.set(x, y0, z);
          const cr = add(G.crown, M.leaf[hj % 3]); cr.scale.set(sc, sc * 1.15, sc); cr.position.set(x, y0 + 2.0 + 2.1 * sc, z); cr.rotation.y = hj % 5;
          col.walls.push({ ax: cx + x, az: cz + z, bx: cx + x, bz: cz + z, y0: baseY, y1: baseY + 3, half: 0.15 });
        }
      }
      col.surfaces.push({ kind: 'tris', cx, cz, B: pg.geo.userData.tb, base: baseY, bottom: baseY });
      if (baseY > 0.5) addRailings(bag, col, q, r, cx, cz, baseY, 0, mask);
    } else if (b === 'trap') {
      // Bordes beneden, 18 treden van 15,8 cm, bordes boven; 3 m breed met leuningen
      const d = dirOf(t), f = FRAMES[d], W = PATH_HALF, P1 = 2.6, H = 3, N = 18, run = 2 * P1 / N, rise = (H - 0.15) / N;
      bag.put(M.paverPlain, boxAt(f, 0, (-INNER - P1) / 2, 0.075, 2 * W, 0.15, INNER - P1));
      for (let j = 0; j < N; j++) { const top = 0.15 + (j + 1) * rise; bag.put(M.stone, boxAt(f, 0, -P1 + (j + 0.5) * run, top / 2, 2 * W, top, run)); }
      bag.put(M.stone, boxAt(f, 0, (P1 + INNER) / 2, H / 2 - 0.08, 2 * W, H - 0.16, INNER - P1));
      bag.put(M.paverPlain, boxAt(f, 0, (P1 + INNER) / 2, H - 0.075, 2 * W, 0.15, INNER - P1));
      const len = Math.hypot(2 * P1, H - 0.15), tilt = -Math.atan2(H - 0.15, 2 * P1);
      for (const su of [-1, 1]) {
        const u = su * (W + 0.05);
        bag.put(M.rail, boxAt(f, u, 0, (0.15 + H) / 2 + 1.0, 0.06, 0.07, len, tilt));
        for (const pp of [-P1, -P1 / 2, 0, P1 / 2, P1]) { const hp = 0.15 + (pp + P1) / (2 * P1) * (H - 0.15); bag.put(M.rail, boxAt(f, u, pp, hp + 0.5, 0.05, 1.0, 0.05)); }
        bag.put(M.rail, boxAt(f, u, (P1 + INNER) / 2, H + 1.0, 0.06, 0.07, INNER - P1));
        bag.put(M.rail, boxAt(f, u, INNER - 0.15, H + 0.5, 0.05, 1.0, 0.05));
        wall(f, u, u, -P1, 0, H + 1.05, 0.05);
        const [ax, az] = local(f, u, -P1), [bx, bz] = local(f, u, INNER);
        col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: baseY, y1: baseY + H + 1.05, half: 0.05 });
      }
      if (!((pathMask(q, r, baseY + H) >> d) & 1)) {   // bovenkant loopt nergens heen: dichtzetten
        bag.put(M.rail, boxAt(f, 0, INNER - 0.15, H + 1.0, 2 * W + 0.1, 0.07, 0.06));
        wall(f, -W, W, INNER - 0.15, H, H + 1.05, 0.05);
      }
      col.surfaces.push({ kind: 'rect', cx, cz, k: d, u0: -W, u1: W, p0: -INNER, p1: -P1, top: baseY + 0.15, bottom: baseY });
      col.surfaces.push({ kind: 'slope', cx, cz, k: d, u0: -W, u1: W, p0: -P1, p1: P1, y0: baseY + 0.15, y1: baseY + H, bottom: baseY });
      col.surfaces.push({ kind: 'rect', cx, cz, k: d, u0: -W, u1: W, p0: P1, p1: INNER, top: baseY + H, bottom: baseY });
    } else if (b === 'zuilen') {
      // Zes zuilen van 45 cm, een dek van 30 cm; je loopt eronderdoor en erbovenop
      for (let k = 0; k < 6; k++) {
        const a = (30 + 60 * k) * Math.PI / 180, x = Math.cos(a) * (R - 0.8), z = Math.sin(a) * (R - 0.8);
        const g = G.unit.clone(); g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, 1.35, z), new THREE.Quaternion(), new THREE.Vector3(0.45, 2.7, 0.45)));
        bag.put(M.concrete, g);
        col.walls.push({ ax: cx + x, az: cz + z, bx: cx + x, bz: cz + z, y0: baseY, y1: baseY + 2.7, half: 0.3 });
      }
      const hex = []; for (let k = 0; k < 6; k++) { const a = (30 + 60 * k) * Math.PI / 180; hex.push([(R - 0.01) * Math.cos(a), (R - 0.01) * Math.sin(a)]); }
      bag.put(M.concrete, extrudePoly(hex, 0.3, 2.7));
      const topIsMe = i === st.length - 1;
      if (topIsMe) {
        const deck = new THREE.Mesh(hexPlane(R - 0.01, false, true), M.walkTop); deck.position.y = 3.002; deck.receiveShadow = true; o.add(deck);
        addRailings(bag, col, q, r, cx, cz, baseY + 3, 3, pathMask(q, r, baseY + 3));
      }
      col.surfaces.push({ kind: 'hex', cx, cz, top: baseY + 3, bottom: baseY + 2.7, hole: false });
    } else if (b === 'hof') {
      // Binnenhof: muren van 3 m met poorten naar wat aansluit, klinkers, een boom en bankjes
      const mask = pathMask(q, r, baseY), T = 0.8, pc = INNER - T / 2, gate = CH_HALF;
      const floor = new THREE.Mesh(hexPlane(R - 0.05, false, true), M.paver); floor.position.y = 0.1; floor.receiveShadow = true; o.add(floor);
      col.surfaces.push({ kind: 'hex', cx, cz, top: baseY + 0.1, bottom: baseY, hole: false });
      for (let k = 0; k < 6; k++) {
        const f = FRAMES[k];
        if ((mask >> k) & 1) {
          const sideL = R / 2 - gate;
          bag.put(M.blockSide, boxAt(f, -(gate + R / 2) / 2, pc, 1.5, sideL, 3, T));
          bag.put(M.blockSide, boxAt(f, (gate + R / 2) / 2, pc, 1.5, sideL, 3, T));
          wall(f, -pc / SQ3, -gate, pc, 0, 3, T / 2); wall(f, gate, pc / SQ3, pc, 0, 3, T / 2);
        } else {
          bag.put(M.blockSide, boxAt(f, 0, pc, 1.5, R, 3, T));
          wall(f, -pc / SQ3, pc / SQ3, pc, 0, 3, T / 2);
        }
      }
      // Plantvak met boom in het midden
      const planter = new THREE.CylinderGeometry(1.4, 1.4, 0.45, 12).translate(0, 0.225 + 0.1, 0);
      bag.put(M.stone, planter);
      col.walls.push({ ax: cx, az: cz, bx: cx, bz: cz, y0: baseY, y1: baseY + 0.55, half: 1.4 });
      const trunk = G.trunk.clone(); trunk.translate(0, 0.55, 0); bag.put(M.trunk, trunk);
      const crown = G.crown.clone(); crown.scale(1.2, 1.35, 1.2); crown.translate(0, 0.55 + 2.4 + 2.4, 0); bag.put(M.leaf[(hash(q, r, i) >>> 3) % 3], crown);
      for (let k = 0; k < 3; k++) {   // drie bankjes rond de boom
        const f = FRAMES[(k * 2 + 1) % 6];
        bag.put(M.bench, boxAt(f, 0, 3.2, 0.55, 1.8, 0.08, 0.45));
        bag.put(M.bench, boxAt(f, -0.75, 3.2, 0.32, 0.08, 0.45, 0.4));
        bag.put(M.bench, boxAt(f, 0.75, 3.2, 0.32, 0.08, 0.45, 0.4));
      }
    }
    bag.flush(o);
  }

  // ---------- Looppaden door massieve blokken ----------
  // Elk blok is 3 m hoog. Paden van 4,2 m breed worden er op de voet doorheen gesneden, naar elke
  // zijde die aansluit. Wat overblijft zijn de componenten: een hoekstuk tussen twee paden (6x = de
  // zesvoudige splitsing), een helft (rechtdoor), een binnen- en buitenbocht. Bij drie of meer paden
  // komt er een plein van 4,4 m straal in het midden. De bovenkant is het tweede loopniveau.
  const CH_HALF = 2.1, PLAZA_R = 4.4, END_R = 2.6, RAMP_END = 6.8;
  const chanCache = new Map();
  function channelShapes(mask) {
    if (chanCache.has(mask)) return chanCache.get(mask);
    const TAU = Math.PI * 2, w = CH_HALF, L = INNER;
    const norm = a => ((a % TAU) + TAU) % TAU;
    const at = (th, sAl, wl) => [Math.cos(th) * sAl - Math.sin(th) * wl, Math.sin(th) * sAl + Math.cos(th) * wl];
    const corner = i => { const a = (30 + 60 * i) * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; };
    const arms = [0, 1, 2, 3, 4, 5].filter(k => mask & (1 << k)).map(k => norm(Math.atan2(FRAMES[k].nz, FRAMES[k].nx))).sort((a, b) => a - b);
    const n = arms.length;
    const out = { floor: null, solids: [] };
    if (!n) { out.solids.push([0, 1, 2, 3, 4, 5].map(corner)); chanCache.set(mask, out); return out; }
    const rp = n >= 3 ? PLAZA_R : END_R;
    function inner(a, g) {   // binnenrand van het pad, van de linkerkant van arm a tot de rechterkant van de volgende arm
      const b = a + g, pts = [at(a, L, w)];
      if (n === 2) {
        if (g < Math.PI - 1e-3) { const bis = a + g / 2, d = w / Math.sin(g / 2); pts.push([Math.cos(bis) * d, Math.sin(bis) * d]); }
        else if (g > Math.PI + 1e-3) {
          const a0 = a + Math.PI / 2, a1 = b - Math.PI / 2, m = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 16)));
          for (let j = 0; j <= m; j++) { const an = a0 + (a1 - a0) * j / m; pts.push([Math.cos(an) * w, Math.sin(an) * w]); }
        }
      } else {
        const al = Math.asin(w / rp), s0 = Math.sqrt(rp * rp - w * w);
        pts.push(at(a, s0, w));
        const a0 = a + al, a1 = b - al, m = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 18)));
        for (let j = 1; j < m; j++) { const an = a0 + (a1 - a0) * j / m; pts.push([Math.cos(an) * rp, Math.sin(an) * rp]); }
        pts.push(at(b, s0, -w));
      }
      pts.push(at(b, L, -w));
      return pts;
    }
    function outer(a, g) {   // buitenrand langs de zeshoek, met de hoekpunten daartussen
      const cs = [];
      for (let i = 0; i < 6; i++) { const ca = norm((30 + 60 * i) * Math.PI / 180 - a); if (ca > 1e-6 && ca < g - 1e-6) cs.push([ca, corner(i)]); }
      cs.sort((x, y) => x[0] - y[0]);
      return [at(a, L, w), ...cs.map(c => c[1]), at(a + g, L, -w)];
    }
    out.floor = [];
    for (let i = 0; i < n; i++) {
      const a = arms[i], g = n === 1 ? TAU : norm(arms[(i + 1) % n] - a) || TAU;
      const inn = inner(a, g);
      out.floor.push(...inn);
      out.solids.push(outer(a, g).concat(inn.slice(1, -1).reverse()));
    }
    chanCache.set(mask, out);
    return out;
  }
  const chanGeoCache = new Map();
  function channelGeos(mask, upper) {
    const k = mask + (upper ? 'u' : 'g');
    if (chanGeoCache.has(k)) return chanGeoCache.get(k);
    const sh = channelShapes(mask);
    const res = {
      solids: sh.solids.map(p => extrudePoly(p, 3)),
      // op de grond een klinkervloer van 5 cm; hoger een vloer die 5 cm boven het blok eronder uitkomt
      // (nooit precies even hoog, anders flikkeren de twee vlakken door elkaar)
      floor: sh.floor ? (upper ? extrudePoly(sh.floor, 0.25, -0.2) : extrudePoly(sh.floor, 0.05)) : null,
    };
    chanGeoCache.set(k, res);
    return res;
  }
  const rampCache = new Map();
  function rampGeo(f) { if (!rampCache.has(f)) rampCache.set(f, makeRampGeo(f)); return rampCache.get(f); }
  function makeRampGeo(f) {   // wig van het midden (0 m) tot RAMP_END (3 m), daarna vlak tot de rand
    const sh = new THREE.Shape([new THREE.Vector2(0, 0.05), new THREE.Vector2(RAMP_END, 3), new THREE.Vector2(INNER, 3), new THREE.Vector2(INNER, 0)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 2 * CH_HALF, bevelEnabled: false });
    g.translate(0, 0, -CH_HALF);
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(f.nx, 0, f.nz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-f.tx, 0, -f.tz));
    g.applyMatrix4(m);
    return g;
  }
  function makeChannelBlock(o, t, q, r, i, baseY, cx, cz, col) {
    const b = baseOf(t), upper = i > 0;
    const addMesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; o.add(m); return m; };
    let mask = 0;
    if (b === 'looppad') mask = pathMask(q, r, baseY);
    if (b === 'helling') { const d = dirOf(t); mask = (1 << d) | (1 << ((d + 3) % 6)); }
    const sh = channelShapes(mask), geos = channelGeos(mask, upper);
    geos.solids.forEach((g, n) => {
      addMesh(g, [M.blockTop, M.blockSide]);
      col.surfaces.push({ kind: 'poly', cx, cz, pts: sh.solids[n], top: baseY + 3, bottom: baseY });
    });
    if (b === 'looppad' && geos.floor) {
      addMesh(geos.floor, [M.paver, M.kerb]);
      col.surfaces.push({ kind: 'poly', cx, cz, pts: sh.floor, top: baseY + 0.05, bottom: baseY - 0.2 });
    }
    if (b === 'helling') {
      const d = dirOf(t), f = FRAMES[d], W = CH_HALF;
      const floor = cached('hellingvloer' + d + upper, () => boxAt(f, 0, -INNER / 2, upper ? -0.075 : 0.025, 2 * W, upper ? 0.25 : 0.05, INNER));
      addMesh(floor, M.paverPlain);
      addMesh(rampGeo(f), [M.paverPlain, M.blockSide]);
      col.surfaces.push({ kind: 'rect', cx, cz, k: d, u0: -W, u1: W, p0: -INNER, p1: 0, top: baseY + 0.05, bottom: baseY - 0.2 });
      col.surfaces.push({ kind: 'slope', cx, cz, k: d, u0: -W, u1: W, p0: 0, p1: RAMP_END, y0: baseY + 0.05, y1: baseY + 3, bottom: baseY });
      col.surfaces.push({ kind: 'rect', cx, cz, k: d, u0: -W, u1: W, p0: RAMP_END, p1: INNER, top: baseY + 3, bottom: baseY });
    }
  }

  // ---------- Meer modulaire modules ----------
  // Allemaal opgebouwd uit dezelfde componenten:
  //  helft / hoekstuk / bocht (uit channelShapes), dek (plaat over de paden), trede, helling (rampGeo),
  //  ringmuur (0,8 m met openingen van 4,2 m) en vloer.
  function clipHalf(poly, nx, nz, c, keepAbove) {   // knipt een veelhoek af langs een rechte lijn
    const out = [], sgn = keepAbove ? 1 : -1;
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length];
      const da = (A[0] * nx + A[1] * nz - c) * sgn, db = (B[0] * nx + B[1] * nz - c) * sgn;
      if (da >= 0) out.push(A);
      if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
    }
    return out;
  }
  const HEX_PTS = [0, 1, 2, 3, 4, 5].map(i => { const a = (30 + 60 * i) * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; });
  const modCache = new Map();
  const cached = (k, fn) => { if (!modCache.has(k)) modCache.set(k, fn()); return modCache.get(k); };
  function makeModular(o, t, q, r, i, baseY, cx, cz, col) {
    const b = baseOf(t), upper = i > 0, bag = partsBag();
    const addMesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; o.add(m); return m; };
    const solid = (poly, geo, top = 3, bottom = 0) => {
      addMesh(geo, [M.blockTop, M.blockSide]);
      col.surfaces.push({ kind: 'poly', cx, cz, pts: poly, top: baseY + top, bottom: baseY + bottom });
    };
    const wallSeg = (f, u0, u1, p, half) => {
      const [ax, az] = local(f, u0, p), [bx, bz] = local(f, u1, p);
      col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: baseY, y1: baseY + 3, half });
    };
    const floorPlate = () => {   // vloer: klinkers op maaiveld, of een plaat van 20 cm op een hoger niveau
      const g = cached('floor' + upper, () => upper ? extrudePoly(HEX_PTS, 0.25, -0.2) : extrudePoly(HEX_PTS, 0.05));
      addMesh(g, [M.paver, M.kerb]);
      col.surfaces.push({ kind: 'hex', cx, cz, top: baseY + 0.05, bottom: baseY - 0.2, hole: false });
    };

    if (b === 'tunnel') {
      // Looppad met een dek erover: onder lopen de paden door, bovenop is het één vlak
      const mask = pathMask(q, r, baseY), sh = channelShapes(mask), geos = channelGeos(mask, upper);
      geos.solids.forEach((g, n) => solid(sh.solids[n], g));
      if (geos.floor) {
        addMesh(geos.floor, [M.paver, M.kerb]);
        col.surfaces.push({ kind: 'poly', cx, cz, pts: sh.floor, top: baseY + 0.05, bottom: baseY - 0.2 });
        solid(sh.floor, cached('deck' + mask, () => extrudePoly(sh.floor, 0.5, 2.5)), 3, 2.5);
      }
    } else if (b === 'muur') {
      // Halve module: één helft massief (de kant waar je naar kijkt), de andere helft open
      const d = dirOf(t), f = FRAMES[d];
      const halves = channelShapes((1 << ((d + 1) % 6)) | (1 << ((d + 4) % 6))).solids;
      const score = p => p.reduce((s2, [x, z]) => s2 + x * f.nx + z * f.nz, 0) / p.length;
      const poly = score(halves[0]) > score(halves[1]) ? halves[0] : halves[1];
      solid(poly, cached('muur' + d, () => extrudePoly(poly, 3)));
    } else if (b === 'trappad') {
      // Als de helling, maar met 16 treden van 18 cm: rustiger om te lopen
      const d = dirOf(t), f = FRAMES[d], W = CH_HALF, N = 16, run = RAMP_END / N, rise = 2.95 / N;
      const mask = (1 << d) | (1 << ((d + 3) % 6)), sh = channelShapes(mask), geos = channelGeos(mask, upper);
      geos.solids.forEach((g, n) => solid(sh.solids[n], g));
      bag.put(M.paverPlain, boxAt(f, 0, -INNER / 2, upper ? -0.075 : 0.025, 2 * W, upper ? 0.25 : 0.05, INNER));
      for (let j = 0; j < N; j++) { const top = 0.05 + (j + 1) * rise; bag.put(M.stone, boxAt(f, 0, (j + 0.5) * run, top / 2, 2 * W, top, run)); }
      bag.put(M.stone, boxAt(f, 0, (RAMP_END + INNER) / 2, 1.5, 2 * W, 3, INNER - RAMP_END));
      col.surfaces.push({ kind: 'rect', cx, cz, k: d, u0: -W, u1: W, p0: -INNER, p1: 0, top: baseY + 0.05, bottom: baseY - 0.2 });
      col.surfaces.push({ kind: 'slope', cx, cz, k: d, u0: -W, u1: W, p0: 0, p1: RAMP_END, y0: baseY + 0.05, y1: baseY + 3, bottom: baseY });
      col.surfaces.push({ kind: 'rect', cx, cz, k: d, u0: -W, u1: W, p0: RAMP_END, p1: INNER, top: baseY + 3, bottom: baseY });
    } else if (b === 'tribune') {
      // Brede trap over het hele vak: 8 treden van 37,5 cm en 1,95 m diep, om op te zitten en op te lopen
      const d = dirOf(t), f = FRAMES[d], N = 8, depth = 2 * INNER / N, rise = 3 / N;
      for (let j = 0; j < N; j++) {
        const p0 = -INNER + j * depth, p1 = p0 + depth, top = (j + 1) * rise;
        const poly = cached('trib' + d + '_' + j + 'p', () => clipHalf(clipHalf(HEX_PTS, f.nx, f.nz, p0 - 1e-6, true), f.nx, f.nz, j === N - 1 ? INNER + 1 : p1 + 1e-6, false));
        solid(poly, cached('trib' + d + '_' + j, () => extrudePoly(poly, top)), top, 0);
      }
    } else if (b === 'hofhelling') {
      // Opgang: een hofje met een helling langs één kant omhoog naar het tweede niveau
      const d = dirOf(t), f = FRAMES[d], mask = pathMask(q, r, baseY), T = 0.8, pc = INNER - T / 2, gate = CH_HALF;
      floorPlate();
      for (let k = 0; k < 6; k++) {
        const fk = FRAMES[k];
        if (((mask >> k) & 1) || k === d) {
          const sideL = R / 2 - gate;
          bag.put(M.blockSide, boxAt(fk, -(gate + R / 2) / 2, pc, 1.5, sideL, 3, T));
          bag.put(M.blockSide, boxAt(fk, (gate + R / 2) / 2, pc, 1.5, sideL, 3, T));
          wallSeg(fk, -pc / SQ3, -gate, pc, T / 2); wallSeg(fk, gate, pc / SQ3, pc, T / 2);
        } else {
          bag.put(M.blockSide, boxAt(fk, 0, pc, 1.5, R, 3, T));
          wallSeg(fk, -pc / SQ3, pc / SQ3, pc, T / 2);
        }
      }
      addMesh(rampGeo(f), [M.paverPlain, M.blockSide]);
      col.surfaces.push({ kind: 'slope', cx, cz, k: d, u0: -CH_HALF, u1: CH_HALF, p0: 0, p1: RAMP_END, y0: baseY + 0.05, y1: baseY + 3, bottom: baseY });
      col.surfaces.push({ kind: 'rect', cx, cz, k: d, u0: -CH_HALF, u1: CH_HALF, p0: RAMP_END, p1: INNER, top: baseY + 3, bottom: baseY });
    }
    bag.flush(o);
  }

  // ---------- Blokken bouwen ----------
  const blocks = new THREE.Group(); scene.add(blocks);
  const groups = new Map();
  const colMap = new Map();   // per kolom: loopvlakken en muren voor botsing

  // ---------- Aansluitende hoogtes aan de randen ----------
  // Elk vlak (park, berm, pad) kijkt per zijde wat de buurman op dezelfde hoogte heeft. Ligt die lager,
  // dan loopt het eigen vlak in een flauw talud naar dat niveau af; ligt die gelijk of hoger, dan blijft
  // het vlak liggen. Het hogere vlak past zich dus altijd aan het lagere aan, en de randen sluiten.
  // Een pad dat een buurvak binnenkomt neemt de hoogte van dat vak over (en dat vak blijft daar vlak).
  const GREEN = FLAT, BAND = 2.2;
  const KUIL_D = 3, HEUV_H = 3, TERR_BAND = 4.6;   // uitgraving 3 m diep, verhoging 3 m hoog; hellingen lopen over 6,5 m
  const FIETS_HALF = 3.0, FIETS_LANE = 1.9;       // breed fietspad: 6 m, waarvan 3,8 m fietsstroken
  const smooth01 = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  function itemAtLevel(q, r, y) {
    let h = 0;
    for (const t of stackOf(q, r)) {
      const top = h + TY(t).h;
      if (Math.abs(h - y) < 0.01) return { t, h };
      if (h < y - 0.01 && top > y + 0.01) return { span: true };
      h = top;
    }
    return { t: null, h };
  }
  // Een pad op de grond ligt in een grasveld op parkhoogte (op een dak of brug niet)
  const padOnGrass = (q, r, y) => y < 0.01 && baseOf(stackOf(q, r)[0]) === 'pad';
  const PAD_TOP = GREEN + 0.02;
  // Pad-varianten in de naam: pad<n>, n = bomen (0/1) + 2 × richting (0 = vanzelf, 1..6 = extra arm naar zijde n-1)
  const padVar = t => { const m = /^pad(\d+)$/.exec(t || ''); const n = m ? +m[1] : 0; return { trees: n & 1, dir: (n >> 1) & 15, wide: (n >> 5) & 1 }; };
  const padName = (trees, dir, wide) => { const n = (trees ? 1 : 0) + 2 * dir + (wide ? 32 : 0); return n ? 'pad' + n : 'pad'; };
  // Recht stuk weg: precies twee armen die tegenover elkaar liggen; geeft de as-richting (0..2) of -1
  // ---------- Verkeerslichten ----------
  // Alle lichten staan op de getekende kruisingen (zie 07); hier worden alleen de lampen bijgewerkt.
  function updateLights(t) {
    if (!vecLightReg.length) return;
    const G = cars.vecGraph();
    for (const L of vecLightReg) { const st = vecLightState(G, L.n, L.eid, t) || 'r'; for (const c of ['r', 'a', 'g']) { const want = c === st ? M.lampOn[c] : M.lampOff; if (L.lamps[c].material !== want) L.lamps[c].material = want; } }
  }
  // ---------- Doorlopende daken ----------
  // Daken op dezelfde hoogte vormen samen één dak. De hoogte op elk punt is de helling maal de afstand tot de
  // dichtstbijzijnde dakgoot (een rand waar geen dak op dezelfde hoogte naast ligt), tot 5 m. Een los huis
  // krijgt zo een zeshoekig schilddak; huizen naast elkaar een doorlopende nok, met kepers en kilgoten waar
  // rijen elkaar raken. Omdat buren dezelfde goten zien, sluiten de daken naadloos op elkaar aan.
  const ROOF_H = 5;
  const roofAt = (q, r, y) => { const it = itemAtLevel(q, r, y); return !!it.t && baseOf(it.t) === 'dak'; };
  function roofEaves(q, r, y) {
    // goten: open zijden van dit huis en van de dakburen. Nok: lijnen tussen de middens van aangrenzende
    // daken (en het eigen midden); waar drie daken elkaar raken is de driehoek ertussen nok (plat).
    const eaves = [], ridges = [], tris = [], open = [];
    const w0 = cellToWorld(q, r);
    const set = [[0, 0], ...NEIGH].filter(([dq, dr]) => (dq === 0 && dr === 0) || roofAt(q + dq, r + dr, y));
    const P = set.map(([dq, dr]) => { const w = cellToWorld(q + dq, r + dr); return [+(w.x - w0.x).toFixed(3), +(w.z - w0.z).toFixed(3)]; });
    const adj = (a, b) => hexDist(set[a][0] - set[b][0], set[a][1] - set[b][1]) === 1;
    ridges.push([0, 0, 0, 0]);
    for (let a = 0; a < set.length; a++) for (let b = a + 1; b < set.length; b++) {
      if (!adj(a, b)) continue;
      ridges.push([...P[a], ...P[b]]);
      for (let c = b + 1; c < set.length; c++) if (adj(a, c) && adj(b, c)) tris.push([...P[a], ...P[b], ...P[c]]);
    }
    set.forEach(([dq, dr], n) => {
      const cq = q + dq, cr = r + dr;
      for (let k = 0; k < 6; k++) {
        if (roofAt(cq + NEIGH[k][0], cr + NEIGH[k][1], y)) continue;
        if (!dq && !dr) open.push(k);
        const f = FRAMES[k], [ax, az] = local(f, -R / 2, INNER), [bx, bz] = local(f, R / 2, INNER);
        eaves.push([+(P[n][0] + ax).toFixed(3), +(P[n][1] + az).toFixed(3), +(P[n][0] + bx).toFixed(3), +(P[n][1] + bz).toFixed(3)]);
      }
    });
    return { eaves, ridges, tris, open };
  }
  function segDist2(x, z, ax, az, bx, bz) {
    const ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
    const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)) : 0;
    return Math.hypot(ax + ex * t - x, az + ez * t - z);
  }
  function roofFn(E) {
    const inTri = (x, z, T) => {
      const s1 = (T[2] - T[0]) * (z - T[1]) - (T[3] - T[1]) * (x - T[0]);
      const s2 = (T[4] - T[2]) * (z - T[3]) - (T[5] - T[3]) * (x - T[2]);
      const s3 = (T[0] - T[4]) * (z - T[5]) - (T[1] - T[5]) * (x - T[4]);
      return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
    };
    return (x, z) => {
      let de = 1e9, dr = 1e9;
      for (const e of E.eaves) de = Math.min(de, segDist2(x, z, ...e));
      if (E.tris.some(T => inTri(x, z, T))) dr = 0;
      else for (const g of E.ridges) dr = Math.min(dr, segDist2(x, z, ...g));
      return de + dr > 1e-6 ? ROOF_H * de / (de + dr) : ROOF_H;
    };
  }
  // Dakvlak als fijn raster in twaalf driehoeken (midden, hoek, zijmidden), zodat nokken en hoekkepers
  // precies op ribben van het raster vallen
  function roofGeo(fn, N = 7) {
    const pos = [], idx = [], map = new Map();
    const V = (x, z) => {
      const kk = Math.round(x * 1000) + ',' + Math.round(z * 1000);
      let i = map.get(kk);
      if (i === undefined) { i = pos.length / 3; pos.push(x, fn(x, z), z); map.set(kk, i); }
      return i;
    };
    const tri = (a, b, c) => {
      const ny = (pos[b * 3 + 2] - pos[a * 3 + 2]) * (pos[c * 3] - pos[a * 3]) - (pos[b * 3] - pos[a * 3]) * (pos[c * 3 + 2] - pos[a * 3 + 2]);
      if (ny >= 0) idx.push(a, b, c); else idx.push(a, c, b);
    };
    const C = j => { const a = (30 + 60 * j) * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; };
    for (let s2 = 0; s2 < 6; s2++) {
      const A = C(s2), B = C(s2 + 1), Mm = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
      for (const [P1, P2] of [[A, Mm], [Mm, B]]) {
        const P = (i, j) => V((P1[0] * i + P2[0] * j) / N, (P1[1] * i + P2[1] * j) / N);
        for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
          tri(P(i, j), P(i + 1, j), P(i, j + 1));
          if (i + j < N - 1) tri(P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    // 'auto smooth': zacht binnen een dakvlak, scherp over nok, kepers en kilgoten (knik > 22°)
    const ng = g.toNonIndexed(), pa = ng.attributes.position, n = pa.count, fn2 = [], byPos = new Map();
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      vA.fromBufferAttribute(pa, t); vB.fromBufferAttribute(pa, t + 1); vC.fromBufferAttribute(pa, t + 2);
      const nn = vC.sub(vB).cross(vA.sub(vB)).normalize().clone(); fn2.push(nn);
      for (let c = 0; c < 3; c++) {
        const kk = Math.round(pa.getX(t + c) * 500) + ',' + Math.round(pa.getZ(t + c) * 500);
        let L = byPos.get(kk); if (!L) byPos.set(kk, L = []); L.push(t / 3);
      }
    }
    const nrm = new Float32Array(n * 3), cosT = Math.cos(22 * Math.PI / 180), acc = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      const own = fn2[t / 3];
      for (let c = 0; c < 3; c++) {
        const kk = Math.round(pa.getX(t + c) * 500) + ',' + Math.round(pa.getZ(t + c) * 500);
        acc.set(0, 0, 0);
        for (const f of byPos.get(kk)) if (fn2[f].dot(own) >= cosT) acc.add(fn2[f]);
        acc.normalize();
        nrm[(t + c) * 3] = acc.x; nrm[(t + c) * 3 + 1] = acc.y; nrm[(t + c) * 3 + 2] = acc.z;
      }
    }
    ng.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    return ng;
  }
  // Wat ligt er over zijde k, op hoogte y? { lvl } t.o.v. y, of null bij een muur, water of iets hogers dat niet meegeeft
  function edgeInfo(q, r, k, y) {
    const nq = q + NEIGH[k][0], nr = r + NEIGH[k][1], kb = (k + 3) % 6;
    const it = itemAtLevel(nq, nr, y);
    if (it.span) return null;
    if (!it.t) return { lvl: 0 };
    const b = baseOf(it.t);
    if (b === 'water') return { lvl: 0 };     // kade op straatniveau
    if (b === 'kuil' || b === 'brug' || b === 'brugp') return { lvl: 0 };   // de uitgraving loopt zelf omhoog tot straatniveau
    if (b === 'heuvel') return { lvl: HEUV_H };
    if (b === 'park') return { lvl: GREEN };
    if (b === 'pad') return padOnGrass(nq, nr, it.h) ? { lvl: GREEN } : { lvl: 0, notch: (pathMask(nq, nr, y) >> kb) & 1 };
    if (b === 'hof') return { lvl: 0.1 };
    if (isBuilding(b)) return { lvl: FLOOR_T, bld: true };   // vloerplaat tot aan de rand
    if (b === 'trap') return { lvl: 0.15 };                  // bordes onderaan
    if (b === 'zuilen' || b === 'blok' || b === 'muur') return { lvl: 0 };
    const h = TY(it.t).h;
    return { lvl: h <= 0.3 ? h : 0.05 };                       // looppad, helling, tunnel e.d.: vloer van 5 cm
  }
  // Per zijde het doel aan de rand (alleen waar de buurman lager ligt of een pad binnenkomt)
  function edgeTargets(q, r, y, own) {
    return [0, 1, 2, 3, 4, 5].map(k => {
      const e = edgeInfo(q, r, k, y);
      if (!e || e.lvl >= own - 1e-3) return null;
      return { lvl: +e.lvl.toFixed(3), notch: !!e.notch };
    });
  }
  // ---------- Hoog terrein ----------
  // Terrein is een eigen laag (zie 07b): één hoogte per vak in cells.terr. Oude steden met opgestapelde
  // "verhogingen" worden bij het laden omgezet (3 m per verhoging).
  const TERR_MAX = 10;
  const terrN = (q, r) => { let n = 0; for (const t of stackOf(q, r)) { if (baseOf(t) !== 'heuvel') break; n++; } return n; };
  const terrOnly = (q, r) => { const st = stackOf(q, r); return st.length > 0 && st.every(t => baseOf(t) === 'heuvel'); };
  function fieldFn(own, tg, band = BAND) {
    return (x, z) => {
      let num = 0, den = 0;
      for (let k = 0; k < 6; k++) {
        const e = tg[k]; if (!e) continue;
        const f = FRAMES[k], d = INNER - (x * f.nx + z * f.nz);
        if (d >= band) continue;
        const w = smooth01(1 - d / band);
        let to = e.lvl;
        if (e.notch) to = own + (to - own) * smooth01((Math.abs(x * f.tx + z * f.tz) - PATH_HALF) / 0.9);
        num += (to - own) * w * w; den += w;
      }
      return den > 0 ? own + num / den : own;
    };
  }
  // Zeshoek als driehoeksraster met hoogteveld fn, plus een rand naar beneden waar het vlak boven 0 uitkomt
  // keep(x, z) (optioneel): alleen driehoeken met een hoekpunt of zwaartepunt waarvoor keep waar is
  function fieldHexGeo(fn, N = 12, keep = null) {
    const pos = [], idx = [], map = new Map();
    const C = j => { const a = (30 + 60 * j) * Math.PI / 180; return [R * Math.cos(a), R * Math.sin(a)]; };
    const V = (x, z) => {
      const kk = Math.round(x * 1000) + ',' + Math.round(z * 1000);
      let i = map.get(kk);
      if (i === undefined) { i = pos.length / 3; pos.push(x, fn(x, z), z); map.set(kk, i); }
      return i;
    };
    const tri = (a, b, c) => {
      if (keep) {
        const X = i => pos[i * 3], Z = i => pos[i * 3 + 2];
        if (!keep(X(a), Z(a)) && !keep(X(b), Z(b)) && !keep(X(c), Z(c)) && !keep((X(a) + X(b) + X(c)) / 3, (Z(a) + Z(b) + Z(c)) / 3)) return;
      }
      const ny = (pos[b * 3 + 2] - pos[a * 3 + 2]) * (pos[c * 3] - pos[a * 3]) - (pos[b * 3] - pos[a * 3]) * (pos[c * 3 + 2] - pos[a * 3 + 2]);
      if (ny >= 0) idx.push(a, b, c); else idx.push(a, c, b);
    };
    for (let s = 0; s < 6; s++) {
      const A = C(s), B = C(s + 1);
      const P = (i, j) => V((A[0] * i + B[0] * j) / N, (A[1] * i + B[1] * j) / N);
      for (let i = 0; i < N; i++) for (let j = 0; j < N - i; j++) {
        tri(P(i, j), P(i + 1, j), P(i, j + 1));
        if (i + j < N - 1) tri(P(i + 1, j), P(i + 1, j + 1), P(i, j + 1));
      }
    }
    // rand: eigen hoekpunten (eigen normalen), naar buiten gericht
    for (let s = 0; s < 6; s++) {
      const A = C(s), B = C(s + 1), mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2;
      for (let i = 0; i < N; i++) {
        const x0 = A[0] + (B[0] - A[0]) * i / N, z0 = A[1] + (B[1] - A[1]) * i / N;
        const x1 = A[0] + (B[0] - A[0]) * (i + 1) / N, z1 = A[1] + (B[1] - A[1]) * (i + 1) / N;
        const y0 = fn(x0, z0), y1 = fn(x1, z1);
        if (Math.max(y0, y1) < 0.004) continue;
        if (keep && !keep((x0 + x1) / 2, (z0 + z1) / 2) && !keep(x0, z0) && !keep(x1, z1)) continue;
        const b = pos.length / 3;
        pos.push(x0, y0, z0, x1, y1, z1, x1, 0, z1, x0, 0, z0);
        // buitennormaal (mx, mz): kies de draairichting die naar buiten wijst
        const cr = (x1 - x0) * mz - (z1 - z0) * mx;
        if (cr < 0) idx.push(b, b + 1, b + 2, b, b + 2, b + 3); else idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
      }
    }
    // ongebruikte hoekpunten weglaten
    const used = new Map(), P2 = [], I2 = idx.map(i => {
      let j = used.get(i);
      if (j === undefined) { j = P2.length / 3; P2.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); used.set(i, j); }
      return j;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3));
    g.setIndex(I2);
    g.computeVertexNormals();
    return g;
  }
  // Een geëxtrudeerde vorm (dikte 1) waarvan de bovenkant het hoogteveld fn volgt
  function fieldExtrude(poly, fn) {
    const g = extrudePoly(poly, 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.5) p.setY(i, fn(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    return g;
  }
  // Botsing met een willekeurig hoogteveld: de bovenste driehoeken, in vakjes van 1 m
  function triBuckets(geo) {
    if (geo.userData.tb) return geo.userData.tb;
    const p = geo.attributes.position, ix = geo.index, n = ix ? ix.count : p.count, B = new Map();
    const gi = i => ix ? ix.getX(i) : i;
    for (let t = 0; t + 2 < n; t += 3) {
      const a = gi(t), b = gi(t + 1), c = gi(t + 2);
      const T = [p.getX(a), p.getZ(a), p.getY(a), p.getX(b), p.getZ(b), p.getY(b), p.getX(c), p.getZ(c), p.getY(c)];
      if (T[2] < 1e-3 && T[5] < 1e-3 && T[8] < 1e-3) continue;   // onderkant
      const area = (T[3] - T[0]) * (T[7] - T[1]) - (T[6] - T[0]) * (T[4] - T[1]);
      if (Math.abs(area) < 1e-6) continue;                        // verticale zijkant
      T.push(1 / area);
      const x0 = Math.floor(Math.min(T[0], T[3], T[6])), x1 = Math.floor(Math.max(T[0], T[3], T[6]));
      const z0 = Math.floor(Math.min(T[1], T[4], T[7])), z1 = Math.floor(Math.max(T[1], T[4], T[7]));
      for (let bx = x0; bx <= x1; bx++) for (let bz = z0; bz <= z1; bz++) {
        const kk = bx * 1000 + bz; let L = B.get(kk); if (!L) B.set(kk, L = []); L.push(T);
      }
    }
    return geo.userData.tb = B;
  }
  const fieldCache = new Map();
  function cachedField(key, make) { let g = fieldCache.get(key); if (!g) { g = make(); triBuckets(g); fieldCache.set(key, g); } return g; }


