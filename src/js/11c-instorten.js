  // ---------- Instorten ----------
  // Raakt een auto hard een gebouw, dan breken de stukken bij de inslag af (muren, vloertegels, daken, voorwerpen). Wat dan
  // nergens meer op rust, valt ook: een stuk blijft staan zolang er een weg van steun naar de grond is (omhoog is gratis,
  // opzij kost een stap, naar beneden hangen kost er twee; meer dan drie stappen houdt niets). Hoekposten en muren zijn zo
  // vanzelf de dragers. Het gebouw wordt pas op dat moment in losse stukken opgebouwd (daarvoor staat het samengevoegd).
  // Het vallen is eenvoudige zwaartekracht met een paar stuiters; het puin zakt na een tijdje weg.
  const collapse = (() => {
    const ST = { on: (() => { try { return localStorage.getItem('raatstad-instorten') === '1'; } catch (e) { return false; } })() }, mods = new Map(), debris = [], dust = [];
    const MAXD = 420, TOL = 0.16, MAXDUST = 120;
    const dustMesh = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.28), new THREE.MeshLambertMaterial({ color: '#cfc8bb', flatShading: true }), MAXDUST);
    dustMesh.frustumCulled = false; dustMesh.count = 0; dustMesh.userData.noOcc = true; dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(dustMesh);
    const root = new THREE.Group(); root.name = 'instorten'; scene.add(root);
    const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), AX = new THREE.Vector3(), EU = new THREE.Euler();
    let tNow = 0; const LOG = [], CNT = { call: 0, mod: 0, bouw: 0, nohit: 0, hit: 0, slow: 0 };
    const groundAt = (x, z) => { let y = 0; try { y = terrainHeightAt(x, z) || 0; } catch (e) { } const r = roadTop(x, z, 0.5); return r != null ? Math.max(y, r) : y; };

    // gebouw omzetten naar losse stukken (een keer)
    // Een gebouw in losse stukken voorbereiden (het zware deel: alle stukken bouwen en uitzoeken welke elkaar raken). Gebeurt bij de
    // eerste klap, of eerder: in de cameramodus wordt het gebouw waar je op richt alvast voorbereid als er even tijd is.
    const preCache = new WeakMap(), doorMats = new Map();
    const doorMat = col => { col = col || '#5a3a22'; let m = doorMats.get(col); if (!m) doorMats.set(col, m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.75 })); return m; };
    function prepare(I, e) {
      const built = modPiecesOf(I); if (!built || !built.pieces || !built.pieces.length) return null;
      const items = [], box = (g, mat, dy, extra) => { g.computeBoundingBox(); const bb = g.boundingBox, c = bb.getCenter(new THREE.Vector3()); c.y += dy; g.translate(-c.x, -(c.y - dy), -c.z);
        const sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
        // niet dragend: glas en dunne delen (kozijnstijlen, ruiten, leuningen) en het plafond (een vlak zonder dikte) staan zelf wel, maar houden niets omhoog
        const weak = !!(mat && (mat.transparent || (mat.opacity ?? 1) < 0.95)) || sx * sy * sz < 0.06 || Math.min(sx, sz) < 0.07 && sy > 0.3 || sy < 0.03;
        items.push(Object.assign({ g, mat, c, hx: sx / 2, hy: sy / 2, hz: sz / 2, flat: sy < 0.45 && sx * sz > 1.5, big: sx * sy * sz, weak }, extra)); };
      for (const { mat, g } of built.pieces) box(g, mat, built.G, {});
      // het hek op de rand van vloeren en daken (08c, buildRails) doet als losse stukken mee: het valt pas als de vloer eronder valt
      for (const g0 of railParts(I)) box(g0.clone(), mv2Mats().metal, 0, { flat: false, weak: true, rail: true });
      for (const g0 of legParts(I)) box(g0, mv2Mats().slab, 0, { flat: false, leg: true });   // poten onder een module boven de weg (08l): dragers
      // deurbladen (09b) doen ook mee: ze staan in de opening zoals ze nu staan (open of dicht), dragen niets en vallen of breken los als de rest
      for (const d of doors.list) if (d.owner === I) {
        const th = Math.atan2(-d.tz, d.tx) + d.sgn * d.open * 1.5, g = new THREE.BoxGeometry(d.w, d.h, 0.05).translate(d.w / 2, d.h / 2, 0).rotateY(th).translate(d.hx, d.y, d.hz);
        box(g, doorMat(d.col), 0, { flat: false, weak: true, door: true });
      }
      // aanraking: dozen die elkaar (bijna) raken; langs x gesorteerd, zodat alleen stukken die in x overlappen vergeleken worden
      const n = items.length, nb = items.map(() => []), ord = items.map((p, i) => i).sort((i, j) => (items[i].c.x - items[i].hx) - (items[j].c.x - items[j].hx));
      for (let x = 0; x < n; x++) { const i = ord[x], a = items[i], xmax = a.c.x + a.hx + TOL;
        for (let y = x + 1; y < n; y++) { const j = ord[y], b = items[j]; if (b.c.x - b.hx > xmax) break;
          if (Math.abs(a.c.y - b.c.y) > a.hy + b.hy + TOL || Math.abs(a.c.z - b.c.z) > a.hz + b.hz + TOL || Math.abs(a.c.x - b.c.x) > a.hx + b.hx + TOL) continue;
          nb[i].push(j); nb[j].push(i); } }
      const pre = { G: built.G, items, nb }; preCache.set(e, pre); return pre;
    }
    function ensure(I) {
      let S = mods.get(I); const e = modGroups.get(I);
      if (S && S.e === e) return S;
      if (S) drop(I);
      if (!e) return null;
      const pre = preCache.get(e) || prepare(I, e); if (!pre) return null; preCache.delete(e);   // de stukken worden nu echt gebruikt (en bij weggooien opgeruimd)
      const grp = new THREE.Group(); root.add(grp);
      S = { I, e, G: pre.G, gy: legGround(I), grp, P: [], pend: 0, clock: 0 };
      pre.items.forEach((it, i) => { const mesh = new THREE.Mesh(it.g, it.mat); mesh.position.copy(it.c); mesh.castShadow = true; mesh.receiveShadow = !it.rail; mesh.matrixAutoUpdate = true; grp.add(mesh);
        S.P.push({ mesh, c: it.c.clone(), hx: it.hx, hy: it.hy, hz: it.hz, st: 'stand', nb: pre.nb[i], dist: 0, flat: it.flat, big: it.big, weak: it.weak, rail: !!it.rail, door: !!it.door, leg: !!it.leg }); });
      S.doorBak = doors.list.filter(d => d.owner === I).map(d => Object.assign({}, d)); doors.clear(I);   // de deurbladen zijn nu losse stukken
      e.collapsed = true; modBatchRefresh(); railsHide(I, true); if (legData.has(I)) legsHide(I, true); mods.set(I, S); S.baked = false;
      if (e.col) { S.colBak = { w: e.col.walls, s: e.col.surfaces }; e.col.walls = []; e.col.surfaces = []; S.col = e.col; }   // geen onzichtbare muren meer: de botsing van het hele gebouw valt weg
      return S;
    }
    // cameramodus: het gebouw in het vizier alvast voorbereiden (als de browser even niets te doen heeft)
    let aimT = 0, aimBusy = false;
    function aimPrep(dt) {
      if (typeof flyCam === 'undefined' || !flyCam.on || aimBusy) return; aimT += dt; if (aimT < 0.3) return; aimT = 0;
      const d = new THREE.Vector3(); camera.getWorldDirection(d); const o = camera.position; let I = null;
      for (let t = 4; t < 90 && !I; t += 2) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y < -1) break; const [q, r] = worldToCell(x, z), top = modTop.get(q + ',' + r); if (top && top.inst && y < gH(top.inst.q, top.inst.r) + instTopLv(top.inst) * 3 + 2.5) I = top.inst; }
      if (!I || mods.has(I)) return; const e = modGroups.get(I); if (!e || preCache.has(e) || !modMeta(I.m).bouw) return;
      aimBusy = true; const go = () => { aimBusy = false; if (modGroups.get(I) === e && !mods.has(I) && !preCache.has(e)) prepare(I, e); };
      if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 600 }); else setTimeout(go, 50);
    }
    function drop(I) {
      const S = mods.get(I); if (!S) return; mods.delete(I);
      unbake(S); root.remove(S.grp); for (const p of S.P) { if (p.mesh.parent === S.grp) p.mesh.geometry.dispose(); if (p.wg) { p.wg.dispose(); p.wg = null; } }
      for (let i = debris.length - 1; i >= 0; i--) if (debris[i].S === S) { root.remove(debris[i].p.mesh); debris[i].p.mesh.geometry.dispose(); debris.splice(i, 1); }
      if (S.col && S.colBak) { S.col.walls = S.colBak.w; S.col.surfaces = S.colBak.s; }
      if (S.e) S.e.collapsed = false; modBatchRefresh(); railsHide(I, false); if (legData.has(I)) legsHide(I, false);
      if (S.doorBak && modGroups.get(I) === S.e) for (const d of S.doorBak) doors.add(I, d);   // hetzelfde gebouw staat weer heel: de deuren terug (bij herbouwen maakt buildModNet nieuwe)
    }
    // Wat blijft staan wordt weer per materiaal samengevoegd (anders kost een kapot gebouw honderden tekenopdrachten); de losse
    // stukken blijven onzichtbaar staan voor de volgende klap. Per gebouw en in hetzelfde beeld: eerst het samengevoegde stuk
    // maken, dan pas de losse stukken verbergen (en bij een nieuwe klap andersom). Vroeger gebeurde het samenvoegen pas tot
    // 0,4 s later voor alle gebouwen tegelijk: dan was het gebouw even weg, of stond het er dubbel (dat knipperde).
    // Daarna, als alles een paar seconden stil ligt, gaan alle kapotte gebouwen samen in één set (minder tekenopdrachten); ook
    // die wissel gebeurt in één beeld, en een nieuwe klap zet meteen de losse sets per gebouw terug.
    let gMeshes = [], gDirty = false, gIdle = 0;
    function mergeStanding(list) {
      const bags = new Map();
      for (const S of list) for (const p of S.P) {
        if (p.st !== 'stand') continue; const m = p.mesh, k = matKey(m.material, true, true); let L = bags.get(k); if (!L) bags.set(k, L = { mat: m.material, list: [] });
        if (!p.wg) { m.updateMatrix(); p.wg = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); p.wg.applyMatrix4(m.matrix); }   // staande stukken bewegen niet: één keer omrekenen
        L.list.push(p.wg);
      }
      const out = []; for (const L of bags.values()) { const mesh = new THREE.Mesh(mergeGeos(L.list), L.mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.matrixAutoUpdate = false; out.push(mesh); }
      return out;
    }
    function dissolveGlobal() {   // de gezamenlijke set weg, de sets per gebouw weer zichtbaar (zelfde beeld)
      if (!gMeshes.length) return;
      for (const S of mods.values()) if (S.inG) { S.inG = false; if (S.bk) S.bk.visible = true; }
      for (const m of gMeshes) { root.remove(m); m.geometry.dispose(); } gMeshes = [];
    }
    function consolidate() {
      const list = [...mods.values()].filter(S => S.baked && S.bk); gDirty = false; if (list.length < 2) return;
      dissolveGlobal(); gMeshes = mergeStanding(list); for (const m of gMeshes) root.add(m);
      for (const S of list) { S.inG = true; S.bk.visible = false; }
    }
    function bake(S) {
      if (S.baked) return; S.baked = true;
      S.bk = new THREE.Group(); for (const m of mergeStanding([S])) S.bk.add(m); S.grp.add(S.bk);
      for (const p of S.P) if (p.st === 'stand') p.mesh.visible = false;
      gDirty = true; gIdle = 0;
    }
    function unbake(S) {
      if (!S.baked) return; S.baked = false;
      if (S.inG) dissolveGlobal();
      for (const p of S.P) if (p.st === 'stand') p.mesh.visible = true;
      if (S.bk) { S.grp.remove(S.bk); S.bk.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); S.bk = null; }
      gDirty = true; gIdle = 0;
    }
    // steun: kleinste 'prijs' van de grond tot elk stuk (0 omhoog; opzij 1 per 1,5 m; naar beneden hangend 2 plus de afstand; via een niet-dragend stuk 4; meer dan 3 valt)
    function support(S) {
      // Dijkstra met een binaire hoop (vroeger werd de hele wachtrij bij elke stap opnieuw gesorteerd: tot 0,3 s per keer)
      const P = S.P, n = P.length, dist = new Array(n).fill(99), hk = [], hv = [], done = new Uint8Array(n);
      const push = (d, i) => { let k = hk.length; hk.push(d); hv.push(i); while (k > 0) { const pa = (k - 1) >> 1; if (hk[pa] <= d) break; hk[k] = hk[pa]; hv[k] = hv[pa]; k = pa; } hk[k] = d; hv[k] = i; };
      const pop = () => { const d0 = hk[0], i0 = hv[0], d = hk.pop(), i = hv.pop(); if (hk.length) { let k = 0; const N = hk.length; for (;;) { let c = 2 * k + 1; if (c >= N) break; if (c + 1 < N && hk[c + 1] < hk[c]) c++; if (hk[c] >= d) break; hk[k] = hk[c]; hv[k] = hv[c]; k = c; } hk[k] = d; hv[k] = i; } return [d0, i0]; };
      for (let i = 0; i < n; i++) { const p = P[i]; p.pre = -1; if (p.st !== 'stand') continue; if (p.c.y - p.hy <= (S.gy ?? S.G) + 0.4) { dist[i] = 0; push(0, i); } }
      while (hk.length) {
        const [d0, i] = pop(); if (done[i] || d0 > dist[i]) continue; done[i] = 1; const a = P[i];
        for (const j of a.nb) {
          const b = P[j]; if (b.st !== 'stand') continue;
          const lift = Math.min(a.hy, b.hy) + 0.05, above = b.c.y - b.hy >= a.c.y + a.hy - 0.3 && b.c.y - a.c.y > lift, below = b.c.y + b.hy <= a.c.y - a.hy + 0.3 && a.c.y - b.c.y > lift,   // twee vloertegels naast elkaar liggen niet óp elkaar (ze zijn dunner dan de speling)
          hd = Math.hypot(b.c.x - a.c.x, b.c.z - a.c.z), over = Math.hypot(Math.max(0, Math.abs(b.c.x - a.c.x) - a.hx), Math.max(0, Math.abs(b.c.z - a.c.z) - a.hz)), cost = a.weak && !b.weak ? 4 : above ? (over < 0.25 ? 0 : Math.max(0.5, over / 1.5)) : below ? 2 + hd / 1.5 : Math.max(0.5, hd / 1.5);   // óp iets staan is gratis als je midden erboven staat; op de rand leunen telt als uitkragen   // wat alleen op glas of een dun stijltje rust, valt; opzij telt per meter (ruim 4,5 m uitkragen houdt niets)
          if (dist[i] + cost < dist[j]) { dist[j] = dist[i] + cost; b.pre = i; push(dist[j], j); }
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
      p.v = new THREE.Vector3(p.vx + (Math.random() - 0.5) * 0.6, p.flat ? 0 : 0.2 + Math.random() * 0.6, p.vz + (Math.random() - 0.5) * 0.6);
      // een staande plaat kantelt om (draait om zijn voet, weg van de klap); een vloertegel zakt recht naar beneden
      const pl = Math.hypot(p.vx, p.vz), tall = p.hy > Math.min(p.hx, p.hz) * 2;
      if (tall) { const dx = pl > 0.3 ? p.vx / pl : Math.random() - 0.5, dz = pl > 0.3 ? p.vz / pl : Math.random() - 0.5, dl = Math.hypot(dx, dz) || 1, k = 1.2 + Math.min(2.5, pl * 0.25); p.w = new THREE.Vector3(dz / dl * k, (Math.random() - 0.5) * 0.4, -dx / dl * k); p.v.x += dx / dl * p.hy * 0.5; p.v.z += dz / dl * p.hy * 0.5; }
      else p.w = new THREE.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.2);
      p.still = 0; p.m = undefined; p.mesh.matrixAutoUpdate = false; p.mesh.updateMatrix();
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


    // ---------- Puin als starre lichamen ----------
    // Elk brokstuk is een doos met massa (het volume), een draai en een draaisnelheid. Per stap: zwaartekracht, dan botsen
    // de acht hoekpunten met de grond, met stukken die nog staan (ook van andere gebouwen), met auto's/mensen (11) en met
    // ander puin. Een botsing is een stoot in het raakpunt (met draaimoment), zo kantelt een muurplaat om en komt puin
    // schuin tegen de gevel tot rust in plaats van plat door alles heen te zakken. Wie stilligt slaapt ('rust') en is
    // een vaste hindernis; een harde klap maakt hem weer wakker. Een zwaar, snel stuk dat een staand stuk raakt, slaat
    // dat los (domino, ook naar het buurgebouw).
    const REST_T = 20, GRAV = 12, CELL = 3, CORN = [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]];
    const V = new THREE.Vector3(), V2 = new THREE.Vector3(), RN = new THREE.Vector3(), RV = new THREE.Vector3(), JV = new THREE.Vector3(), M3 = new THREE.Matrix3();
    const gk = (x, z) => Math.floor(x / CELL) * 73856093 ^ Math.floor(z / CELL) * 19349663;
    function body(p) {   // massa en traagheid (één keer)
      if (p.m === undefined) { p.m = Math.max(0.05, 8 * p.hx * p.hy * p.hz); p.I = p.m * (p.hx * p.hx + p.hy * p.hy + p.hz * p.hz) / 3; }
    }
    // omhullende doos (wereld-assen) van een gedraaid stuk
    function aabb(p) {
      const m = p.mesh; M3.setFromMatrix4(m.matrix); const e = M3.elements;
      p.ex = Math.abs(e[0]) * p.hx + Math.abs(e[3]) * p.hy + Math.abs(e[6]) * p.hz; p.ey = Math.abs(e[1]) * p.hx + Math.abs(e[4]) * p.hy + Math.abs(e[7]) * p.hz; p.ez = Math.abs(e[2]) * p.hx + Math.abs(e[5]) * p.hy + Math.abs(e[8]) * p.hz;
    }
    // stoot in raakpunt r (t.o.v. het midden) langs normaal n op lichaam p (ander lichaam q mag null/statisch zijn)
    function impulse(p, q, px, py, pz, nx, ny, nz, e, mu) {
      const rx = px - p.mesh.position.x, ry = py - p.mesh.position.y, rz = pz - p.mesh.position.z;
      let vx = p.v.x + (p.w.y * rz - p.w.z * ry), vy = p.v.y + (p.w.z * rx - p.w.x * rz), vz = p.v.z + (p.w.x * ry - p.w.y * rx);
      let qx = 0, qy = 0, qz = 0, qrx = 0, qry = 0, qrz = 0, invMq = 0, invIq = 0;
      if (q && q.st === 'fall') { qrx = px - q.mesh.position.x; qry = py - q.mesh.position.y; qrz = pz - q.mesh.position.z; qx = q.v.x + (q.w.y * qrz - q.w.z * qry); qy = q.v.y + (q.w.z * qrx - q.w.x * qrz); qz = q.v.z + (q.w.x * qry - q.w.y * qrx); invMq = 1 / q.m; invIq = 1 / q.I; }
      vx -= qx; vy -= qy; vz -= qz;
      const vn = vx * nx + vy * ny + vz * nz; if (vn >= 0) return 0;
      const cx = ry * nz - rz * ny, cy = rz * nx - rx * nz, cz = rx * ny - ry * nx, kp = (cx * cx + cy * cy + cz * cz) / p.I;
      const dx = qry * nz - qrz * ny, dy = qrz * nx - qrx * nz, dz = qrx * ny - qry * nx, kq = invIq ? (dx * dx + dy * dy + dz * dz) * invIq : 0;
      const j = -(1 + e) * vn / (1 / p.m + invMq + kp + kq);
      // wrijving: tegen de tangentiële snelheid in, hooguit mu·j
      let tx = vx - vn * nx, ty = vy - vn * ny, tz = vz - vn * nz; const tl = Math.hypot(tx, ty, tz);
      let jt = 0; if (tl > 1e-4) { tx /= tl; ty /= tl; tz /= tl; jt = Math.min(mu * j, tl / (1 / p.m + invMq + kp + kq)); }
      const ix = j * nx - jt * tx, iy = j * ny - jt * ty, iz = j * nz - jt * tz;
      p.v.x += ix / p.m; p.v.y += iy / p.m; p.v.z += iz / p.m;
      p.w.x += (ry * iz - rz * iy) / p.I; p.w.y += (rz * ix - rx * iz) / p.I; p.w.z += (rx * iy - ry * ix) / p.I;
      if (invMq) { q.v.x -= ix * invMq; q.v.y -= iy * invMq; q.v.z -= iz * invMq; q.w.x -= (qry * iz - qrz * iy) * invIq; q.w.y -= (qrz * ix - qrx * iz) * invIq; q.w.z -= (qrx * iy - qry * ix) * invIq; }
      return j;
    }
    function wake(p) { if (p.st !== 'rust') return; p.st = 'fall'; p.rest = 0; p.still = 0; p.mesh.scale.setScalar(1); if (!p.v) { p.v = new THREE.Vector3(); p.w = new THREE.Vector3(); } }
    // een hoekpunt in een doos (wereld-assen, midden c, halve maten h): kleinste uitweg → [nx, ny, nz, diepte] of null
    function inBox(x, y, z, cx, cy, cz, hx, hy, hz, vy, dt) {
      const dx = hx - Math.abs(x - cx), dy = hy - Math.abs(y - cy), dz = hz - Math.abs(z - cz); if (dx <= 0 || dy <= 0 || dz <= 0) return null;
      if (vy < 0 && y > cy && dy < -vy * dt + 0.06) return [0, 1, 0, dy];   // van boven erin gevallen: naar boven eruit (ook bij een dunne vloer)
      if (dy <= dx && dy <= dz) return [0, y > cy ? 1 : -1, 0, dy];
      if (dx <= dz) return [x > cx ? 1 : -1, 0, 0, dx]; return [0, 0, z > cz ? 1 : -1, dz];
    }
    let hitBudget = 0;
    function physics(dt0) {
      if (!debris.length) return;
      const steps = 2, dt = dt0 / steps; hitBudget = 6;
      // raster van alles waar puin tegenaan kan: staand puin (rust) en staande stukken van alle kapotte gebouwen
      const grid = new Map(), put = (p, S) => { aabb(p); const x0 = Math.floor((p.mesh.position.x - p.ex) / CELL), x1 = Math.floor((p.mesh.position.x + p.ex) / CELL), z0 = Math.floor((p.mesh.position.z - p.ez) / CELL), z1 = Math.floor((p.mesh.position.z + p.ez) / CELL); for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const k = gx * 73856093 ^ gz * 19349663; let L = grid.get(k); if (!L) grid.set(k, L = []); L.push(p); } };
      for (const S of mods.values()) if (!S.sgrid || S.sgridN !== S.P.length) { S.sgrid = new Map(); S.sgridN = S.P.length; for (const p of S.P) { if (p.weak && !p.flat) continue; const x0 = Math.floor((p.c.x - p.hx) / CELL), x1 = Math.floor((p.c.x + p.hx) / CELL), z0 = Math.floor((p.c.z - p.hz) / CELL), z1 = Math.floor((p.c.z + p.hz) / CELL); for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) { const k = gx * 73856093 ^ gz * 19349663; let L = S.sgrid.get(k); if (!L) S.sgrid.set(k, L = []); L.push(p); } } }
      for (const d of debris) { const p = d.p; body(p); if (p.st === 'rust') put(p, d.S); }
      for (let s = 0; s < steps; s++) {
        for (const d of debris) {
          const p = d.p, m = p.mesh; if (p.st !== 'fall') continue;
          p.v.y -= GRAV * dt; m.position.addScaledVector(p.v, dt);
          AX.copy(p.w); const wl = AX.length(); if (wl > 1e-4) { Q4.setFromAxisAngle(AX.normalize(), wl * dt); m.quaternion.premultiply(Q4); }
          p.w.multiplyScalar(1 - 0.4 * dt); m.updateMatrix(); aabb(p);
          M3.setFromMatrix4(m.matrix); const e = M3.elements; let onGround = false, bump = 0;
          for (const [sx, sy, sz] of CORN) {
            const lx = sx * p.hx, ly = sy * p.hy, lz = sz * p.hz, x = m.position.x + e[0] * lx + e[3] * ly + e[6] * lz, y = m.position.y + e[1] * lx + e[4] * ly + e[7] * lz, z = m.position.z + e[2] * lx + e[5] * ly + e[8] * lz;
            // grond en wegen
            const g = groundAt(x, z); if (y < g) { m.position.y += g - y; const j = impulse(p, null, x, g, z, 0, 1, 0, 0.15, 0.6); if (j > bump) bump = j; onGround = true; }
            // staande stukken (van elk kapot gebouw)
            for (const S of mods.values()) { const L = S.sgrid.get(gk(x, z)); if (!L) continue; for (const q of L) { if (q.st !== 'stand' || q === p) continue; const r = inBox(x, y, z, q.c.x, q.c.y, q.c.z, q.hx, q.hy, q.hz, p.v.y, dt); if (!r) continue;
              const rel = Math.hypot(p.v.x, p.v.y, p.v.z);
              if (!q.weak && !q.flat && rel > 5 && (q.m === undefined ? (q.m = Math.max(0.05, 8 * q.hx * q.hy * q.hz)) : q.m) * 3 + 12 < p.m * rel && hitBudget > 0 && S.P.includes(q)) { hitBudget--; release(S, q, p.v.x * 0.3, p.v.z * 0.3, 0); S.clock = Math.max(S.clock, 0.25); unbake(S); p.v.multiplyScalar(0.5); continue; }   // domino: een zwaar, snel stuk slaat een staand stuk los
              m.position.x += r[0] * r[3]; m.position.y += r[1] * r[3]; m.position.z += r[2] * r[3]; const j = impulse(p, null, x, y, z, r[0], r[1], r[2], 0.1, 0.5); if (j > bump) bump = j; if (r[1] > 0) onGround = true; } }
            // ander puin (slapend of vallend)
            { const L = grid.get(gk(x, z)); if (L) for (const q of L) { if (q === p || q.st === 'gone') continue; const r = inBox(x, y, z, q.mesh.position.x, q.mesh.position.y, q.mesh.position.z, q.ex, q.ey, q.ez, p.v.y, dt); if (!r) continue;
              const share = q.st === 'fall' ? q.m / (p.m + q.m) : 1; m.position.x += r[0] * r[3] * share; m.position.y += r[1] * r[3] * share; m.position.z += r[2] * r[3] * share;
              if (q.st === 'fall') { q.mesh.position.x -= r[0] * r[3] * (1 - share); q.mesh.position.y -= r[1] * r[3] * (1 - share); q.mesh.position.z -= r[2] * r[3] * (1 - share); }
              const j = impulse(p, q.st === 'fall' ? q : null, x, y, z, r[0], r[1], r[2], 0.05, 0.55); if (j > bump) bump = j; if (r[1] > 0) onGround = true;
              if (q.st === 'rust' && j > 2.5 * q.m) wake(q); } }
          }
          if (bump > 1.5 * p.m) { puff(m.position.x, m.position.y - p.hy, m.position.z, 2); try { if (p.big > 1.5 && Math.random() < 0.4) sound.impact(Math.min(1, bump / (8 * p.m)), m.position.x, 0.4, m.position.z, false); } catch (e) { } }
          // auto's en mensen: een zwaar stuk met vaart raakt ze (11)
          if (p.big > 0.6 && hitBudget > 0) { const sp = p.v.length(); if (sp > 3) { try { if (cars.ballHit(m.position.x, m.position.y, m.position.z, p.v.x, p.v.y, p.v.z, Math.max(p.hx, p.hz))) { hitBudget--; p.v.multiplyScalar(0.6); } } catch (e) { } } }
          // slapen
          const sp2 = p.v.lengthSq(), wl2 = p.w.lengthSq();
          if (onGround && sp2 < 0.09 && wl2 < 0.25) { p.still = (p.still || 0) + dt; if (p.still > 0.4) { p.st = 'rust'; p.rest = 0; p.v.set(0, 0, 0); p.w.set(0, 0, 0); put(p, d.S); } } else p.still = 0;
        }
      }
      for (const d of debris) if (d.p.st === 'fall') { d.p.mesh.updateMatrix(); aabb(d.p); put(d.p, d.S); }   // vallend puin ook in het raster, voor de volgende stap
    }
    // een auto raakt het gebouw bij (x, z) met snelheid sp
    function probe(x, z, sp, vx, vz) {
      if (!ST.on) return false; CNT.call++;
      const [q, r] = worldToCell(x, z); let top = modTop.get(q + ',' + r);
      if ((!top || !top.inst) && sp >= 6 && !probe.busy) {   // een oud blok (woning, kantoor): eerst omzetten naar een module, dan kan het instorten
        const kk = q + ',' + r, st = cells.get(kk);
        if (st && st.length && st.some(tp => /^(woning|kantoor)/.test(tp)) && oudOmzetten(cells, kk).done) { probe.busy = true; try { rebuildAround(q, r); buildModNet(); changed(); top = modTop.get(kk); } finally { probe.busy = false; } }
      }
      if (!top || !top.inst) return false; CNT.mod++;
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

    // Een kogel (cameramodus): raakt hij een stuk van een gebouw, op welke hoogte ook, dan breekt alles binnen R rond de inslag los.
    // Geeft true terug als er iets geraakt is (dan stuitert de kogel terug).
    function shoot(x, y, z, vx, vy, vz, rad, heavy) {
      if (!ST.on) return false;
      const [q, r] = worldToCell(x, z), kk = q + ',' + r; let top = modTop.get(kk);
      if (!top || !top.inst) {   // oud blok: eerst omzetten
        const st = cells.get(kk); if (st && st.length && st.some(tp => /^(woning|kantoor)/.test(tp)) && y < colTopW(q, r) + rad && !probe.busy && oudOmzetten(cells, kk).done) { probe.busy = true; try { rebuildAround(q, r); buildModNet(); changed(); top = modTop.get(kk); } finally { probe.busy = false; } }
      }
      if (!top || !top.inst) return false;
      const I = top.inst; if (!modGroups.get(I) || !modMeta(I.m).bouw) return false;
      if (y - rad > gH(I.q, I.r) + instTopLv(I) * 3 + 2.5) return false;   // er hoog overheen (dak inbegrepen)
      let S = mods.get(I) && mods.get(I).e === modGroups.get(I) ? mods.get(I) : null;
      if (!S) { S = ensure(I); if (!S) return false; }
      const reach = rad + 0.25;
      if (!S.P.some(p => p.st === 'stand' && Math.abs(x - p.c.x) <= p.hx + reach && Math.abs(y - p.c.y) <= p.hy + reach && Math.abs(z - p.c.z) <= p.hz + reach)) return false;
      // een kogel breekt alleen rond de inslag los (zoals een echte muur: een deuk, geen hele gevel); wat daarboven geen
      // steun meer heeft, trekt settle() er vanzelf achteraan, dus het gebouw stort toch geloofwaardig verder in
      const sp = Math.hypot(vx, vy, vz), R = heavy ? Math.min(4.2, 1 + sp * 0.04 + rad * 1.3) : Math.min(3.2, 0.55 + sp * 0.028 + rad * 1.1), hl = Math.hypot(vx, vz) || 1;   // sloopkogel: groter gat
      let n = 0;
      for (const p of S.P) {
        if (p.st !== 'stand') continue;
        const d = Math.hypot(p.c.x - x, (p.c.y - y) * 1.15, p.c.z - z); if (d > R) continue;
        const k = Math.pow(Math.max(0, 1 - d / (R + 0.3)), 1.6);
        if (Math.random() > (heavy ? 0.6 + 0.4 * k : 0.35 + 0.65 * k)) continue;   // niet elk stuk binnen bereik breekt los: een paar scherven, geen hele muur in één klap
        release(S, p, vx / hl * sp * 0.2 * k + (Math.random() - 0.5) * 2, vz / hl * sp * 0.2 * k + (Math.random() - 0.5) * 2, Math.random() * 0.06); n++;
      }
      if (n) { puff(x, y, z, 12 + Math.min(18, n)); S.clock = 0.25; unbake(S); try { sound.fx('crunch', x, y, z, 1); sound.impact(1, x, y, z, false); } catch (e) { } }
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
      aimPrep(dt);
      for (const [I, S] of [...mods]) if (!cells.inst || !cells.inst.includes(I) || modGroups.get(I) !== S.e) drop(I);   // weggehaald, vervangen of nieuwe stad: de brokstukken verdwijnen mee
      if (!mods.size && !dust.length) return;
      tNow += dt; dt = Math.min(dt, 0.05); gIdle += dt;
      if (gDirty && gIdle > 2.5 && ![...mods.values()].some(S => S.pend > 0 || S.clock > 0)) consolidate();
      for (const S of [...mods.values()]) {
        if (modGroups.get(S.I) !== S.e) { drop(S.I); continue; }   // het gebouw is intussen opnieuw opgebouwd
        for (const p of S.P) if (p.st === 'pend') { p.t -= dt; if (p.t <= 0) launch(S, p); }
        if (S.clock > 0) { S.clock -= dt; if (S.clock <= 0) { settle(S); S.clock = S.pend ? 0.3 : 0; } }   // na het vallen opnieuw kijken wat er nog steunt
        else if (S.pend === 0) { /* rust */ }
        if (S.pend > 0 && S.clock <= 0) S.clock = 0.35;
        if (S.pend === 0 && S.clock <= 0 && !S.baked) bake(S);
      }
      physics(dt);
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i], p = d.p, m = p.mesh; p.age += dt;
        if (p.st === 'rust') { p.rest += dt; if (p.rest > REST_T) { const k = Math.max(0, 1 - (p.rest - REST_T) / 2); m.scale.setScalar(k); m.updateMatrix(); if (k <= 0) p.st = 'gone'; } }
        if (p.st === 'gone' || p.age > 60 || m.position.y < -60) { root.remove(m); m.geometry.dispose(); p.st = 'gone'; debris.splice(i, 1); }
      }
      // stof
      for (let i = dust.length - 1; i >= 0; i--) { const q = dust[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vx *= 0.97; q.vz *= 0.97; q.vy *= 0.96; if (q.t >= q.life) dust.splice(i, 1); }
      dustMesh.count = dust.length;
      dust.forEach((q, i) => { const k = q.t / q.life, s = q.s * (0.5 + k * 1.4) * (1 - k * k); EU.set(q.t * 2, q.t, 0); M4.makeRotationFromEuler(EU).scale(S3.set(s, s, s)).setPosition(q.x, q.y, q.z); dustMesh.setMatrixAt(i, M4); });
      dustMesh.instanceMatrix.needsUpdate = true;
    }
    function reset() { for (const I of [...mods.keys()]) drop(I); dissolveGlobal(); dust.length = 0; dustMesh.count = 0; }
    return {
      probe, update, reset, ahead, shoot,
      get on() { return ST.on; }, setOn(v) { ST.on = !!v; try { localStorage.setItem('raatstad-instorten', ST.on ? '1' : '0'); } catch (e) { } if (!v) reset(); },
      // voor tests: raak het gebouw op deze plek
      hit(x, z, sp, vx, vz) { return probe(x, z, sp, vx, vz); },
      log: LOG, cnt: CNT,
      dbg: () => [...mods.values()][0],
      // voor tests: een gebouw in losse stukken zetten, en stukken weghalen (zoals een klap), dan valt wat geen steun meer heeft
      prep(x, z) { const [q, r] = worldToCell(x, z), top = modTop.get(q + ',' + r); return top && top.inst ? ensure(top.inst) : null; },
      chain(S, i) { support(S); const P = S.P, out = []; let k = i, guard = 0; while (k >= 0 && guard++ < 60) { const q = P[k]; out.push([+(q.c.x).toFixed(1), +(q.c.y - S.G).toFixed(2), +(q.c.z).toFixed(1), +q.hx.toFixed(2), +q.hy.toFixed(2), +q.hz.toFixed(2), q.flat ? 'F' : q.weak ? 'w' : '', +q.dist.toFixed(2)]); k = q.pre; } return out; },
      knock(S, fn) { let n = 0; for (const p of S.P) if (p.st === 'stand' && fn(p)) { release(S, p, 0, 0, 0); n++; } if (n) { S.clock = 0.25; unbake(S); } return n; },
      stats: () => ({ baked: [...mods.values()].filter(S => S.baked).length, gm: gMeshes.length + [...mods.values()].reduce((n, S) => n + (S.bk && S.bk.visible ? S.bk.children.length : 0), 0), inG: [...mods.values()].filter(S => S.inG).length, dup: [...mods.values()].filter(S => S.inG && S.bk && S.bk.visible).length, gGlobal: gMeshes.length, liveMeshes: [...mods.values()].reduce((n, S) => n + S.P.filter(p => p.st === 'stand' && p.mesh.visible).length, 0), modules: mods.size, debris: debris.length, dust: dust.length, standing: [...mods.values()].reduce((n, S) => n + S.P.filter(p => p.st === 'stand').length, 0), pieces: [...mods.values()].reduce((n, S) => n + S.P.length, 0), pending: [...mods.values()].reduce((n, S) => n + S.pend, 0) })
    };
  })();
