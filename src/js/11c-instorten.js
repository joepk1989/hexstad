  // ---------- Instorten ----------
  // Raakt een auto hard een gebouw, dan breken de stukken bij de inslag af (muren, vloertegels, daken, voorwerpen). Wat dan
  // nergens meer op rust, valt ook: een stuk blijft staan zolang er een weg van steun naar de grond is (omhoog is gratis,
  // opzij kost een stap, naar beneden hangen kost er twee; meer dan drie stappen houdt niets). Hoekposten en muren zijn zo
  // vanzelf de dragers. Het gebouw wordt pas op dat moment in losse stukken opgebouwd (daarvoor staat het samengevoegd).
  // Het vallen is eenvoudige zwaartekracht met een paar stuiters; het puin zakt na een tijdje weg.
  const collapse = (() => {
    const ST = { on: true }, mods = new Map(), debris = [], dust = [];
    const MAXD = 170, TOL = 0.16, MAXDUST = 120;
    const dustMesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.28), new THREE.MeshLambertMaterial({ color: '#cfc8bb', flatShading: true }), MAXDUST);
    dustMesh.frustumCulled = false; dustMesh.count = 0; dustMesh.userData.noOcc = true; dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(dustMesh);
    const root = new THREE.Group(); root.name = 'instorten'; scene.add(root);
    const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), AX = new THREE.Vector3(), EU = new THREE.Euler();
    let tNow = 0; const LOG = [], CNT = { call: 0, mod: 0, bouw: 0, nohit: 0, hit: 0, slow: 0 };
    const groundAt = (x, z) => { let y = 0; try { y = terrainHeightAt(x, z) || 0; } catch (e) { } const r = roadTop(x, z, 0.5); return r != null ? Math.max(y, r) : y; };

    // gebouw omzetten naar losse stukken (een keer)
    function ensure(I) {
      let S = mods.get(I); const e = modGroups.get(I);
      if (S && S.e === e) return S;
      if (S) drop(I);
      if (!e) return null;
      const built = modPiecesOf(I); if (!built || !built.pieces || !built.pieces.length) return null;
      const grp = new THREE.Group(); root.add(grp);
      S = { I, e, G: built.G, grp, P: [], pend: 0, clock: 0 };
      for (const { mat, g } of built.pieces) {
        g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3()); c.y += built.G;
        g.translate(-c.x, -(c.y - built.G), -c.z);
        const mesh = new THREE.Mesh(g, mat); mesh.position.copy(c); mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = true;
        const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
        S.P.push({ mesh, c: c.clone(), hx: sx / 2, hy: sy / 2, hz: sz / 2, st: 'stand', nb: [], dist: 0, flat: sy < 0.45 && sx * sz > 1.5, big: sx * sy * sz });
        grp.add(mesh);
      }
      // aanraking: dozen die elkaar (bijna) raken
      const P = S.P, n = P.length;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = P[i], b = P[j];
        if (Math.abs(a.c.x - b.c.x) > a.hx + b.hx + TOL || Math.abs(a.c.y - b.c.y) > a.hy + b.hy + TOL || Math.abs(a.c.z - b.c.z) > a.hz + b.hz + TOL) continue;
        a.nb.push(j); b.nb.push(i);
      }
      e.collapsed = true; modBatchRefresh(); mods.set(I, S); S.baked = false;
      if (e.col) { S.colBak = { w: e.col.walls, s: e.col.surfaces }; e.col.walls = []; e.col.surfaces = []; S.col = e.col; }   // geen onzichtbare muren meer: de botsing van het hele gebouw valt weg
      return S;
    }
    function drop(I) {
      const S = mods.get(I); if (!S) return; mods.delete(I);
      unbake(S); gDirty = true; root.remove(S.grp); for (const p of S.P) if (p.mesh.parent === S.grp) p.mesh.geometry.dispose();
      for (let i = debris.length - 1; i >= 0; i--) if (debris[i].S === S) { root.remove(debris[i].p.mesh); debris[i].p.mesh.geometry.dispose(); debris.splice(i, 1); }
      if (S.col && S.colBak) { S.col.walls = S.colBak.w; S.col.surfaces = S.colBak.s; }
      if (S.e) S.e.collapsed = false; modBatchRefresh();
    }
    // Wat blijft staan wordt weer per materiaal samengevoegd, over alle kapotte gebouwen heen (anders kost elk kapot gebouw
    // honderden tekenopdrachten); de losse stukken blijven onzichtbaar staan voor de volgende klap.
    let gMeshes = [], gDirty = false, gT = 0;
    function bake(S) { if (S.baked) return; S.baked = true; for (const p of S.P) if (p.st === 'stand') p.mesh.visible = false; gDirty = true; }
    function unbake(S) { if (!S.baked) return; S.baked = false; for (const p of S.P) if (p.st === 'stand') p.mesh.visible = true; gDirty = true; }
    function rebuildGlobal() {
      for (const m of gMeshes) { root.remove(m); m.geometry.dispose(); } gMeshes = [];
      const bags = new Map();
      for (const S of mods.values()) if (S.baked) for (const p of S.P) {
        if (p.st !== 'stand') continue; const m = p.mesh, k = matKey(m.material, true, true); let L = bags.get(k); if (!L) bags.set(k, L = { mat: m.material, list: [] });
        m.updateMatrix(); const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrix); L.list.push(g);
      }
      for (const L of bags.values()) { const mesh = new THREE.Mesh(mergeGeos(L.list), L.mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; root.add(mesh); gMeshes.push(mesh); }
      gDirty = false;
    }
    // steun: kleinste 'prijs' van de grond tot elk stuk (0 omhoog, 1 opzij, 2 naar beneden hangend)
    function support(S) {
      const P = S.P, n = P.length, dist = new Array(n).fill(99), open = [];
      for (let i = 0; i < n; i++) { const p = P[i]; if (p.st !== 'stand') continue; if (p.c.y - p.hy <= S.G + 0.4) { dist[i] = 0; open.push(i); } }
      while (open.length) {
        open.sort((a, b) => dist[b] - dist[a]); const i = open.pop(), a = P[i];
        for (const j of a.nb) {
          const b = P[j]; if (b.st !== 'stand') continue;
          const above = b.c.y - b.hy >= a.c.y + a.hy - 0.3, below = b.c.y + b.hy <= a.c.y - a.hy + 0.3, cost = above ? 0 : below ? 2 : 1;
          if (dist[i] + cost < dist[j]) { dist[j] = dist[i] + cost; open.push(j); }
        }
      }
      for (let i = 0; i < n; i++) P[i].dist = dist[i];
    }
    function release(S, p, vx, vz, delay) {   // een stuk wordt los: valt na 'delay' seconden
      p.st = 'pend'; p.t = delay; p.vx = vx; p.vz = vz; S.pend++;
    }
    function launch(S, p) {
      p.st = 'fall'; S.pend = Math.max(0, S.pend - 1);
      if (debris.length >= MAXD) { p.st = 'gone'; p.mesh.visible = false; puff(p.c.x, p.c.y, p.c.z, 3); return; }
      p.v = new THREE.Vector3(p.vx + (Math.random() - 0.5) * 1.5, 0.5 + Math.random() * 2, p.vz + (Math.random() - 0.5) * 1.5);
      p.w = new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 5);
      p.rest = 0; p.age = 0; debris.push({ S, p });
      if (S.grp.userData.n === undefined) S.grp.userData.n = 0;
    }
    function puff(x, y, z, k) {
      for (let i = 0; i < k; i++) { if (dust.length >= MAXDUST) dust.shift(); dust.push({ x: x + (Math.random() - 0.5) * 1.5, y: y + Math.random() * 1.2, z: z + (Math.random() - 0.5) * 1.5, vx: (Math.random() - 0.5) * 2.5, vy: 0.6 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 2.5, t: 0, life: 1.4 + Math.random() * 1.4, s: 0.6 + Math.random() * 0.9 }); }
    }
    // wat nergens meer op steunt wordt los (met vertraging: eerst het verste, zo valt het van binnen naar buiten in elkaar)
    function settle(S) {
      support(S); let n = 0;
      for (const p of S.P) if (p.st === 'stand' && p.dist > 3) { release(S, p, 0, 0, 0.12 + Math.min(0.9, (p.dist >= 99 ? 0.1 : p.dist * 0.12)) + Math.random() * 0.25); n++; }
      return n;
    }

    // een auto raakt het gebouw bij (x, z) met snelheid sp
    function probe(x, z, sp, vx, vz) {
      if (!ST.on) return false; CNT.call++;
      const [q, r] = worldToCell(x, z), top = modTop.get(q + ',' + r); if (!top || !top.inst) return false; CNT.mod++;
      const I = top.inst; if (!modGroups.get(I) || !modMeta(I.m).bouw) return false; CNT.bouw++;   // alleen gebouwen (geen parken en pleinen)
      let S = mods.get(I) && mods.get(I).e === modGroups.get(I) ? mods.get(I) : null;
      if (!S) {
        // eerst kijken of een stuk (muur of vloer) echt in de weg zit: dan pas het gebouw omzetten
        if (sp < 4) return true;
        S = ensure(I); if (!S) return false;
      }
      const reach = 1.1;
      const hit = S.P.filter(p => p.st === 'stand' && Math.abs(x - p.c.x) <= p.hx + reach && Math.abs(z - p.c.z) <= p.hz + reach && p.c.y - p.hy < S.G + 3.6 && !p.flat);
      if (!hit.length) { CNT.nohit++; return false; }
      if (sp < 4) { CNT.slow++; return true; }
      CNT.hit++;
      const R = Math.min(13, 2.4 + Math.max(0, sp - 3) * 0.6), dl = Math.hypot(vx, vz) || 1, dx = vx / dl, dz = vz / dl;
      let n = 0;
      for (const p of S.P) {
        if (p.st !== 'stand') continue;
        const d = Math.hypot(p.c.x - x, p.c.z - z); if (d > R || p.c.y - p.hy > S.G + 3.6 + (sp > 14 ? 3 : 0)) continue;
        release(S, p, dx * sp * 0.22 * (1 - d / (R + 0.5)) + (Math.random() - 0.5), dz * sp * 0.22 * (1 - d / (R + 0.5)) + (Math.random() - 0.5), Math.random() * 0.08); n++;
      }
      LOG.push([I.m.name, +sp.toFixed(1), n, hit.length]); if (LOG.length > 60) LOG.shift();
      if (!n) return true;
      puff(x, S.G + 1.2, z, 10 + Math.min(14, n)); S.clock = 0.25; unbake(S);
      try { sound.fx('crunch', x, 1, z, Math.min(1, sp / 14)); sound.impact(Math.min(1, sp / 12), x, 0.8, z, false); } catch (e) { }
      return true;
    }

    // een gebouw vlak voor een auto: richting (eenheidsvector) van de dichtstbijzijnde gevel binnen 45 m en 55 graden, of null
    let tgtCache = null, tgtSig = -1;
    function ahead(x, z, h) {
      const live = (cells.inst || []).length; if (tgtSig !== live || !tgtCache) { tgtSig = live; tgtCache = []; for (const I of cells.inst || []) if (I.m && I.m.v === 2 && !I.lv && modMeta(I.m).bouw) { const w = cellToWorld(I.q, I.r); tgtCache.push([w.x, w.z]); } }
      let best = null, bd = 1e9; const cx = Math.cos(h), sz = Math.sin(h);
      for (const [wx, wz] of tgtCache) { const dx = wx - x, dz = wz - z, d = Math.hypot(dx, dz); if (d > 45 || d < 8) continue; if ((dx * cx + dz * sz) / d < Math.cos(0.96)) continue; if (d < bd) { bd = d; best = [dx / d, dz / d, d]; } }
      return best;
    }
    function update(dt) {
      for (const [I, S] of [...mods]) if (!cells.inst || !cells.inst.includes(I) || modGroups.get(I) !== S.e) drop(I);   // weggehaald, vervangen of nieuwe stad: de brokstukken verdwijnen mee
      if (gDirty && !mods.size) rebuildGlobal();
      if (!mods.size && !dust.length) return;
      tNow += dt; dt = Math.min(dt, 0.05); gT += dt;
      if (gDirty && gT > 0.4) { gT = 0; rebuildGlobal(); }
      for (const S of [...mods.values()]) {
        if (modGroups.get(S.I) !== S.e) { drop(S.I); continue; }   // het gebouw is intussen opnieuw opgebouwd
        for (const p of S.P) if (p.st === 'pend') { p.t -= dt; if (p.t <= 0) launch(S, p); }
        if (S.clock > 0) { S.clock -= dt; if (S.clock <= 0) { settle(S); S.clock = S.pend ? 0.3 : 0; } }   // na het vallen opnieuw kijken wat er nog steunt
        else if (S.pend === 0) { /* rust */ }
        if (S.pend > 0 && S.clock <= 0) S.clock = 0.35;
        if (S.pend === 0 && S.clock <= 0 && !S.baked) bake(S);
      }
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i], p = d.p, m = p.mesh; p.age += dt;
        if (p.st === 'fall') {
          p.v.y -= 13 * dt; m.position.addScaledVector(p.v, dt);
          AX.copy(p.w); const wl = AX.length(); if (wl > 1e-4) { Q4.setFromAxisAngle(AX.normalize(), wl * dt); m.quaternion.premultiply(Q4); }
          // landen: op de grond of op een vloer die nog staat
          let gy = groundAt(m.position.x, m.position.z);
          for (const o of d.S.P) if (o.st === 'stand' && o.flat && Math.abs(m.position.x - o.c.x) < o.hx && Math.abs(m.position.z - o.c.z) < o.hz) { const ty = o.c.y + o.hy; if (ty > gy && m.position.y - p.hy * 0.8 > ty - 0.6 - Math.abs(p.v.y) * dt) gy = ty; }
          const rest = Math.min(p.hy, Math.max(0.06, Math.min(p.hx, p.hz)));
          if (m.position.y - rest < gy) {
            m.position.y = gy + rest;
            if (Math.abs(p.v.y) > 2) { puff(m.position.x, gy + 0.3, m.position.z, 2); try { if (p.big > 1.5 && Math.random() < 0.5) sound.impact(Math.min(1, Math.abs(p.v.y) / 10), m.position.x, 0.4, m.position.z, false); } catch (e) { } }
            p.v.y *= -0.22; p.v.x *= 0.6; p.v.z *= 0.6; p.w.multiplyScalar(0.5);
            if (p.v.length() < 0.7) { p.st = 'rust'; p.rest = 0; }
          }
        } else if (p.st === 'rust') {
          p.rest += dt;
          if (p.rest > 9) { const k = Math.max(0, 1 - (p.rest - 9) / 2); m.scale.setScalar(k); if (k <= 0) { p.st = 'gone'; } }
        }
        if (p.st === 'gone' || p.age > 40) { root.remove(m); m.geometry.dispose(); p.st = 'gone'; debris.splice(i, 1); }
      }
      // stof
      for (let i = dust.length - 1; i >= 0; i--) { const q = dust[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vx *= 0.97; q.vz *= 0.97; q.vy *= 0.96; if (q.t >= q.life) dust.splice(i, 1); }
      dustMesh.count = dust.length;
      dust.forEach((q, i) => { const k = q.t / q.life, s = q.s * (0.5 + k * 1.4) * (1 - k * k); EU.set(q.t * 2, q.t, 0); M4.makeRotationFromEuler(EU).scale(S3.set(s, s, s)).setPosition(q.x, q.y, q.z); dustMesh.setMatrixAt(i, M4); });
      dustMesh.instanceMatrix.needsUpdate = true;
    }
    function reset() { for (const I of [...mods.keys()]) drop(I); dust.length = 0; dustMesh.count = 0; }
    return {
      probe, update, reset, ahead,
      get on() { return ST.on; }, setOn(v) { ST.on = !!v; if (!v) reset(); },
      // voor tests: raak het gebouw op deze plek
      hit(x, z, sp, vx, vz) { return probe(x, z, sp, vx, vz); },
      log: LOG, cnt: CNT,
      dbg: () => [...mods.values()][0],
      stats: () => ({ baked: [...mods.values()].filter(S => S.baked).length, gm: gMeshes.length, liveMeshes: [...mods.values()].reduce((n, S) => n + S.P.filter(p => p.st === 'stand' && p.mesh.visible).length, 0), modules: mods.size, debris: debris.length, dust: dust.length, standing: [...mods.values()].reduce((n, S) => n + S.P.filter(p => p.st === 'stand').length, 0), pieces: [...mods.values()].reduce((n, S) => n + S.P.length, 0), pending: [...mods.values()].reduce((n, S) => n + S.pend, 0) })
    };
  })();
