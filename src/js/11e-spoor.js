  // ---------- Spoor ----------
  // Een spoorlijn teken je met het gereedschap Spoor (tab Wegen): klik vak na vak, de lijn loopt in een van de twaalf
  // raatrichtingen (zes langs de zijden, zes over de hoekpunten). Rechtermuisknop, Esc of nog eens op het laatste punt
  // klikken stopt. Beide uiteinden lopen vanzelf door tot ver voorbij de rand van de stad, de mist in (EXT meter): het
  // spoor verbindt je stad met de rest van de wereld. Bochten worden afgerond. Dubbelspoor, rechts rijden: op elk spoor
  // komt om de zoveel tijd een trein uit de mist, stopt bij een treinstation dat naast de lijn staat en rijdt verder.
  // Opslag: cells.rails = [{ p: [[x, z], …] }] (in de stadsdata als __r).
  const spoor = (() => {
    const EXT = 2600, TRACK = 2.05, STEP = 2, SLEEP = 0.65, TOP = 0.34;   // doorloop, halve spoorafstand, monsterafstand, dwarsliggers, bovenkant ballast
    const CAR = 16.6, NCAR = 4, VMAX = 24, ACC = 0.9;
    const mats = {
      ballast: new THREE.MeshStandardMaterial({ color: '#8d857b', roughness: 1, flatShading: true }),
      sleeper: new THREE.MeshStandardMaterial({ color: '#5e4a3a', roughness: 0.95, flatShading: true }),
      rail: new THREE.MeshStandardMaterial({ color: '#b5b9bd', metalness: 0.8, roughness: 0.35, flatShading: true }),
      body: new THREE.MeshStandardMaterial({ color: '#eef0f2', roughness: 0.5, flatShading: true }),
      band: new THREE.MeshStandardMaterial({ color: '#c8323a', roughness: 0.5, flatShading: true }),
      glass: new THREE.MeshStandardMaterial({ color: '#1d2a36', metalness: 0.3, roughness: 0.2, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: '#2a2c30', roughness: 0.8, flatShading: true }),
      ghost: new THREE.MeshBasicMaterial({ color: '#ffd84a', transparent: true, opacity: 0.55, depthWrite: false }),
    };
    const group = new THREE.Group(); scene.add(group);
    const trainGroup = new THREE.Group(); scene.add(trainGroup);
    let lines = [];   // per getekende lijn: { src, X, Z, Y, S, len, a, b, stops, trains }
    const railsOf = () => cells.rails || (cells.rails = []);
    // ---------- route: verlengen, bochten afronden, verdichten ----------
    function route(p) {
      const n = p.length, d0 = [p[0][0] - p[1][0], p[0][1] - p[1][1]], d1 = [p[n - 1][0] - p[n - 2][0], p[n - 1][1] - p[n - 2][1]];
      const l0 = Math.hypot(...d0) || 1, l1 = Math.hypot(...d1) || 1;
      const P = [[p[0][0] + d0[0] / l0 * EXT, p[0][1] + d0[1] / l0 * EXT], ...p, [p[n - 1][0] + d1[0] / l1 * EXT, p[n - 1][1] + d1[1] / l1 * EXT]];
      // bochten: een cirkelboog die beide rechte stukken raakt (straal tot 90 m, kleiner als de stukken kort zijn)
      const pts = [P[0]];
      for (let i = 1; i < P.length - 1; i++) {
        const A = P[i - 1], B = P[i], C = P[i + 1];
        const ux = A[0] - B[0], uz = A[1] - B[1], vx = C[0] - B[0], vz = C[1] - B[1], lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
        if (lu < 0.01 || lv < 0.01) continue;
        const cos = Math.max(-1, Math.min(1, (ux * vx + uz * vz) / (lu * lv))), th = Math.acos(cos);   // hoek tussen de stukken
        if (th > Math.PI - 0.01) { pts.push(B); continue; }   // rechtdoor
        const half = th / 2, maxT = Math.min(lu, lv) * 0.48;
        let rad = 90, t = rad / Math.tan(half); if (t > maxT) { t = maxT; rad = t * Math.tan(half); }
        const s = [B[0] + ux / lu * t, B[1] + uz / lu * t], e = [B[0] + vx / lv * t, B[1] + vz / lv * t];
        const bx = ux / lu + vx / lv, bz = uz / lu + vz / lv, bl = Math.hypot(bx, bz) || 1, cd = rad / Math.sin(half);
        const cx = B[0] + bx / bl * cd, cz = B[1] + bz / bl * cd;
        let a0 = Math.atan2(s[1] - cz, s[0] - cx), a1 = Math.atan2(e[1] - cz, e[0] - cx), da = a1 - a0;
        while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const k = Math.max(2, Math.ceil(Math.abs(da) * rad / 3));
        for (let j = 0; j <= k; j++) { const a = a0 + da * j / k; pts.push([cx + Math.cos(a) * rad, cz + Math.sin(a) * rad]); }
      }
      pts.push(P[P.length - 1]);
      // verdichten tot een monster per STEP meter
      const X = [], Z = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / STEP));
        for (let j = 0; j < k; j++) { X.push(a[0] + (b[0] - a[0]) * j / k); Z.push(a[1] + (b[1] - a[1]) * j / k); }
      }
      X.push(pts[pts.length - 1][0]); Z.push(pts[pts.length - 1][1]);
      const N = X.length, S = new Float32Array(N), Y = new Float32Array(N), G = new Float32Array(N);
      for (let i = 1; i < N; i++) S[i] = S[i - 1] + Math.hypot(X[i] - X[i - 1], Z[i] - Z[i - 1]);
      // hoogte: het maaiveld (nooit onder water), eerst de hoogste in de buurt, dan glad: zo zakt het spoor niet in een heuvel
      for (let i = 0; i < N; i++) G[i] = Math.max(0, terrGround(X[i], Z[i]));
      for (let i = 0; i < N; i++) { let m = 0; for (let j = Math.max(0, i - 3); j <= Math.min(N - 1, i + 3); j++) m = Math.max(m, G[j]); Y[i] = m; }
      for (let pass = 0; pass < 3; pass++) { const T = Y.slice(); for (let i = 1; i < N - 1; i++) Y[i] = (T[i - 1] + T[i] * 2 + T[i + 1]) / 4; }
      return { X, Z, Y, S, len: S[N - 1], N };
    }
    // punt op afstand s langs de lijn (zijwaarts verschoven met off; + = rechts van de rijrichting van begin naar eind)
    function at(L, s, off, out) {
      s = Math.max(0, Math.min(L.len, s));
      let lo = 0, hi = L.N - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.S[m] <= s) lo = m; else hi = m; }
      const f = (s - L.S[lo]) / Math.max(1e-6, L.S[hi] - L.S[lo]);
      const dx = L.X[hi] - L.X[lo], dz = L.Z[hi] - L.Z[lo], dl = Math.hypot(dx, dz) || 1;
      out.x = L.X[lo] + dx * f - dz / dl * off; out.z = L.Z[lo] + dz * f + dx / dl * off; out.y = L.Y[lo] + (L.Y[hi] - L.Y[lo]) * f;
      return out;
    }
    // ---------- meshes ----------
    // Een profiel (dwarsdoorsnede, [zijwaarts, hoogte]) langs de lijn trekken: één lint van driehoeken
    function ribbon(L, prof, pos) {
      const side = (i) => { const a = Math.max(0, i - 1), b = Math.min(L.N - 1, i + 1), dx = L.X[b] - L.X[a], dz = L.Z[b] - L.Z[a], dl = Math.hypot(dx, dz) || 1; return [-dz / dl, dx / dl]; };
      let prev = null;
      for (let i = 0; i < L.N; i++) {
        const [sx, sz] = side(i), ring = prof.map(([o, h]) => [L.X[i] + sx * o, L.Y[i] + h, L.Z[i] + sz * o]);
        if (prev) for (let k = 0; k < prof.length - 1; k++) {
          const a = prev[k], b = prev[k + 1], c = ring[k], d = ring[k + 1];
          pos.push(...a, ...b, ...c, ...b, ...d, ...c);
        }
        prev = ring;
      }
    }
    const meshOf = (pos, mat, shadow) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = !!shadow; m.frustumCulled = false; return m;
    };
    function clearMeshes() { for (const o of [...group.children]) { group.remove(o); o.geometry && o.geometry.dispose(); } }
    let builtSig = '';
    function build() {
      const keep = new Map(lines.map(L => [L.src, L])), nl = [];
      let sig = '';
      for (const r of railsOf()) {
        if (!r || !Array.isArray(r.p) || r.p.length < 2) continue;
        const L = Object.assign(route(r.p), { src: r }), old = keep.get(r);
        L.trains = old ? old.trains : []; L.stops = stationsOn(L); nl.push(L);
        let h = 0; for (let i = 0; i < L.N; i += 3) h = (h * 31 + Math.round(L.Y[i] * 20)) | 0;   // hoogteprofiel in het kort
        sig += JSON.stringify(r.p) + h + ';';
      }
      lines = nl;
      for (const L of lines) for (const T of L.trains) T.L = L;
      for (const o of [...trainGroup.children]) if (!lines.some(L => L.trains.some(T => T.obj === o))) trainGroup.remove(o);
      if (sig === builtSig) return;   // niets aan het spoor veranderd: de meshes blijven staan
      builtSig = sig; clearMeshes();
      const bal = [], rail = [], sl = [];
      for (const L of lines) {
        ribbon(L, [[-4.3, -0.25], [-3.4, TOP], [3.4, TOP], [4.3, -0.25]], bal);
        for (const t of [-TRACK, TRACK]) for (const g of [-0.72, 0.72]) { const o = t + g; ribbon(L, [[o - 0.05, TOP + 0.1], [o - 0.05, TOP + 0.26], [o + 0.05, TOP + 0.26], [o + 0.05, TOP + 0.1]], rail); }
        for (let s = SLEEP / 2; s < L.len; s += SLEEP) sl.push(L, s);
      }
      if (bal.length) { group.add(meshOf(bal, mats.ballast)); group.add(meshOf(rail, mats.rail)); }
      const n = sl.length;   // twee sporen per monster
      if (n) {
        const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.14, 2.5), mats.sleeper, n), M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = {}, p2 = {};
        let k = 0;
        for (let i = 0; i < sl.length; i += 2) {
          const L = sl[i], s = sl[i + 1];
          for (const t of [-TRACK, TRACK]) {
            at(L, s, t, p); at(L, s + 0.5, t, p2); e.set(0, -Math.atan2(p2.z - p.z, p2.x - p.x), 0); q.setFromEuler(e);
            M4.compose(new THREE.Vector3(p.x, p.y + TOP + 0.05, p.z), q, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(k++, M4);
          }
        }
        im.count = k; im.receiveShadow = true; im.frustumCulled = false; group.add(im);
      }
    }
    // treinstations naast de lijn: daar stopt de trein (s langs de lijn)
    function stationsOn(L) {
      const out = [];
      for (const I of cells.inst || []) {
        const m = modules.find(mm => mm.id === I.mid), nm = (m && m.name) || '';
        if (!/treinstation|^station\b/i.test(nm)) continue;
        const c = cellToWorld(I.q, I.r); let best = 1e9, bs = 0;
        for (let i = 0; i < L.N; i += 2) { const d = Math.hypot(L.X[i] - c.x, L.Z[i] - c.z); if (d < best) { best = d; bs = L.S[i]; } }
        if (best < 40) out.push(bs);
      }
      return out.sort((a, b) => a - b);
    }
    // ---------- treinen ----------
    function makeTrain() {
      const g = new THREE.Group(), cars = [];
      for (let i = 0; i < NCAR; i++) {
        const c = new THREE.Group(), lead = i === 0;
        const body = new THREE.Mesh(new THREE.BoxGeometry(CAR - (lead ? 3.2 : 0.8), 2.9, 2.9), mats.body); body.position.set(lead ? -1.2 : 0, 2.35, 0);
        const band = new THREE.Mesh(new THREE.BoxGeometry(CAR - (lead ? 3.2 : 0.8) + 0.02, 0.35, 2.94), mats.band); band.position.set(lead ? -1.2 : 0, 1.35, 0);
        const win = new THREE.Mesh(new THREE.BoxGeometry(CAR - (lead ? 4.4 : 2.4), 0.85, 2.96), mats.glass); win.position.set(lead ? -1.4 : 0, 2.75, 0);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(CAR - (lead ? 3.4 : 1.2), 0.3, 2.3), mats.body); roof.position.set(lead ? -1.2 : 0, 3.95, 0);
        c.add(body, band, win, roof);
        for (const bx of [-5.2, 5.2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 2.2), mats.dark); b.position.set(bx, 0.75, 0); c.add(b); }
        if (lead) {   // kop: een driehoekig prisma met een schuine voorruit
          const ng = new THREE.CylinderGeometry(1.7, 1.7, 2.9, 3); ng.rotateX(Math.PI / 2); ng.rotateZ(Math.PI / 2);   // punt naar voren
          const nose = new THREE.Mesh(ng, mats.band); nose.position.set(6.35, 2.35, 0);
          const ws = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 2.3), mats.glass); ws.position.set(5.52, 2.8, 0);
          c.add(nose, ws);
        }
        c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        c.rotation.order = 'YZX'; g.add(c); cars.push(c);
      }
      trainGroup.add(g); return { obj: g, cars };
    }
    const pa = {}, pb = {};
    function place(T) {
      const L = T.L, len = NCAR * CAR;
      for (let i = 0; i < NCAR; i++) {
        const c = T.u - CAR / 2 - i * CAR;   // midden van de wagen, gemeten in rijrichting
        const sf = T.dir > 0 ? c + 5.2 : L.len - (c + 5.2), sb = T.dir > 0 ? c - 5.2 : L.len - (c - 5.2), off = TRACK * T.dir;
        at(L, sf, off, pa); at(L, sb, off, pb);
        const car = T.cars[i], dx = pa.x - pb.x, dz = pa.z - pb.z, dy = pa.y - pb.y;
        car.position.set((pa.x + pb.x) / 2, (pa.y + pb.y) / 2 + TOP + 0.26, (pa.z + pb.z) / 2);
        car.rotation.y = -Math.atan2(dz, dx); car.rotation.z = Math.atan2(dy, Math.hypot(dx, dz));
      }
      T.obj.visible = T.u > 0 && T.u - len < L.len;
    }
    // afstand tot de stad: een trein verschijnt en verdwijnt in de mist (ver voorbij wat je kunt zien)
    const farFrom = (L, s) => { at(L, s, 0, pa); return Math.hypot(pa.x - CITY.cx, pa.z - CITY.cz) - CITY.lim; };
    function spawnU(L, dir) {   // het eerste punt (in rijrichting) dat nog ruim in de mist ligt
      const V = 1250; let best = 0;
      for (let u = 0; u < L.len; u += 40) { const s = dir > 0 ? u : L.len - u; if (farFrom(L, s) > V) best = u; else break; }
      return best;
    }
    function nearU(L, dir) {   // de eerste trein staat al vlak voor de stad, zodat je hem meteen ziet komen
      let best = 0;
      for (let u = 0; u < L.len; u += 10) { const s = dir > 0 ? u : L.len - u; if (farFrom(L, s) > 120) best = u; else break; }
      return best;
    }
    function tick(dt) {
      if (!lines.length) return;
      dt = Math.min(dt, 0.05);
      for (const L of lines) {
        if (L.trains.length < 2) for (const dir of [1, -1]) if (!L.trains.some(T => T.dir === dir)) { const T = Object.assign(makeTrain(), { L, dir, u: 0, v: VMAX, wait: dir > 0 ? 0 : 20, done: new Set() }); T.u = spawnU(L, dir); if (dir > 0) T.u = nearU(L, dir); L.trains.push(T); }
        for (const T of L.trains) {
          if (T.wait > 0) { T.wait -= dt; if (T.wait <= 0 && T.atStop) { T.atStop = false; try { at(L, T.dir > 0 ? T.u : L.len - T.u, 0, pa); sound.fx('toot', pa.x, pa.y, pa.z); } catch (e) { } } if (T.wait > 0) { place(T); continue; } }
          // volgende halte: de trein stopt met zijn midden bij het station
          const half = NCAR * CAR / 2; let target = Infinity;
          for (const s of L.stops) { const u = (T.dir > 0 ? s : L.len - s) + half; if (u > T.u - 0.5 && !T.done.has(s)) { target = Math.min(target, u); if (u === target) T.next = s; } }
          const dist = target - T.u, vb = isFinite(dist) ? Math.sqrt(Math.max(0, 2 * ACC * Math.max(0, dist))) : VMAX;
          const want = Math.min(VMAX, vb);
          T.v = want < T.v ? Math.max(want, T.v - ACC * 2.5 * dt) : Math.min(want, T.v + ACC * dt);
          T.u += T.v * dt;
          if (isFinite(dist) && dist < 0.6 && T.v < 1.2) { T.u = target; T.v = 0; T.wait = 12; T.atStop = true; T.done.add(T.next); }
          // ver voorbij de stad (of aan het eind van de lijn): even wachten, dan komt hij aan de andere kant weer uit de mist
          const head = T.dir > 0 ? T.u : L.len - T.u;
          if (T.u - NCAR * CAR > L.len - 1 || (T.passed && farFrom(L, head) > 1300)) { T.u = spawnU(L, T.dir); T.v = VMAX; T.wait = 15 + Math.random() * 25; T.done.clear(); T.passed = false; }
          if (farFrom(L, head) < 600) T.passed = true;
          place(T);
        }
      }
    }
    function clearTrains() { for (const L of lines) L.trains = []; for (const o of [...trainGroup.children]) trainGroup.remove(o); }
    // ---------- tekenen ----------
    const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [1, 1], [-1, 2], [-2, 1], [-1, -1], [1, -2], [2, -1]];   // zes buren en zes over de hoekpunten
    const chain = { on: false, r: null, end: 1 };
    // een vak in een van de twaalf richtingen vanaf het vorige punt (het dichtst bij waar je wijst)
    function snapFrom(from, q, r) {
      const [fq, fr] = worldToCell(from[0], from[1]), w = cellToWorld(q, r);
      let best = null, bd = 1e9;
      for (const [dq, dr] of DIRS) {
        const d = cellToWorld(dq, dr), d2 = d.x * d.x + d.z * d.z, f = cellToWorld(fq, fr);
        const k = Math.round(((w.x - f.x) * d.x + (w.z - f.z) * d.z) / d2); if (k < 1) continue;
        const c = cellToWorld(fq + dq * k, fr + dr * k), dd = Math.hypot(c.x - w.x, c.z - w.z);
        if (dd < bd) { bd = dd; best = [c.x, c.z]; }
      }
      return best;
    }
    const P = (x, z) => [Math.round(x * 100) / 100, Math.round(z * 100) / 100];
    function endNear(x, z) {   // een uiteinde van een bestaande lijn vlakbij (om verder te tekenen)
      for (const r of railsOf()) { const a = r.p[0], b = r.p[r.p.length - 1]; if (Math.hypot(a[0] - x, a[1] - z) < 6) return { r, end: 0 }; if (Math.hypot(b[0] - x, b[1] - z) < 6) return { r, end: 1 }; }
      return null;
    }
    function click(q, r) {
      const c = cellToWorld(q, r);
      if (!chain.on) {
        const e = endNear(c.x, c.z);
        if (e) { chain.on = true; chain.r = e.r; chain.end = e.end; toast('Spoor verlengen: klik het volgende vak · rechtermuisknop stopt', 2200); return; }
        chain.on = true; chain.r = { p: [P(c.x, c.z)] }; chain.end = 1; railsOf().push(chain.r);
        toast('Spoor: klik het volgende vak · de uiteinden lopen door tot voorbij de horizon', 2600); return;
      }
      const p = chain.r.p, last = chain.end ? p[p.length - 1] : p[0], nx = snapFrom(last, q, r);
      if (!nx || Math.hypot(nx[0] - last[0], nx[1] - last[1]) < 1) { end(); return; }   // nog eens op het laatste punt: klaar
      const prev = p.length >= 2 ? (chain.end ? p[p.length - 2] : p[1]) : null, put = v => { if (chain.end) p.push(v); else p.unshift(v); };
      if (!prev) put(P(...nx));
      else {
        let a = Math.atan2(nx[1] - last[1], nx[0] - last[0]) - Math.atan2(last[1] - prev[1], last[0] - prev[0]); while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI;
        if (Math.abs(a) > Math.PI / 2 + 0.01) { toast('Zo scherp kan een trein niet draaien (hooguit 90°)', 1600); try { sound.fx('deny'); } catch (e) { } return; }
        if (Math.abs(a) < 0.01) { if (chain.end) p[p.length - 1] = P(...nx); else p[0] = P(...nx); }   // rechtdoor: het eindpunt schuift op
        else put(P(...nx));
      }
      ghostHide(); build(); changed(); try { sound.fx('place'); } catch (e) { }
    }
    function end(quiet) {
      if (!chain.on) return;
      const r = chain.r; chain.on = false; chain.r = null; ghostHide();
      if (r.p.length < 2) { const i = railsOf().indexOf(r); if (i >= 0) railsOf().splice(i, 1); }
      else if (!quiet) toast('Spoor klaar', 900);
    }
    // voorbeeld: een geel lint van het laatste punt naar het vak onder de muis
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), mats.ghost); ghost.visible = false; ghost.renderOrder = 5; scene.add(ghost);
    function ghostHide() { ghost.visible = false; }
    function hover(cell) {
      if (!cell) return ghostHide();
      const c = cellToWorld(cell[0], cell[1]);
      if (!chain.on) { ghost.position.set(c.x, Math.max(0, terrGround(c.x, c.z)) + 0.4, c.z); ghost.scale.set(8.6, 1, 8.6); ghost.rotation.y = 0; ghost.visible = true; return; }
      const p = chain.r.p, last = chain.end ? p[p.length - 1] : p[0], nx = snapFrom(last, cell[0], cell[1]);
      if (!nx) return ghostHide();
      const dx = nx[0] - last[0], dz = nx[1] - last[1], L = Math.hypot(dx, dz);
      ghost.position.set((nx[0] + last[0]) / 2, Math.max(0, terrGround((nx[0] + last[0]) / 2, (nx[1] + last[1]) / 2)) + 0.6, (nx[1] + last[1]) / 2);
      ghost.rotation.y = -Math.atan2(dz, dx); ghost.scale.set(Math.max(1, L), 1, 8.6); ghost.visible = true;
    }
    // gum: een hele lijn weg (wijs het spoor aan, ook buiten de stad)
    function eraseAt(pt) {
      if (!pt) return false;
      let best = null, bd = 6;
      for (const L of lines) for (let i = 0; i < L.N; i += 1) { const d = Math.hypot(L.X[i] - pt.x, L.Z[i] - pt.z); if (d < bd) { bd = d; best = L; } }
      if (!best) return false;
      const i = railsOf().indexOf(best.src); if (i >= 0) railsOf().splice(i, 1);
      for (const T of best.trains) trainGroup.remove(T.obj); best.trains = [];
      build(); changed(); toast('Spoor weggehaald', 900); try { sound.fx('remove'); } catch (e) { }
      return true;
    }
    return { build, tick, click, end, hover, ghostHide, eraseAt, clearTrains, chain, lines: () => lines, at, EXT };
  })();
