  // ---------- Mensen ----------
  // Voetgangers lopen over een netwerk dat uit de stad zelf komt: stoepen (rechts van de rijbaan), paden,
  // looppaden, tunnels, loopbruggen en dakterrassen. Ze nemen trappen en hellingen, gaan voordeuren in
  // en uit, en blijven soms even staan in een hofje of op een plein.
  const CLIMBS = new Set(['trap', 'helling', 'trappad', 'tribune', 'hofhelling']);
  function nodeKind(q, r, y) {
    const st = stackOf(q, r);
    let h = 0;
    for (let i = 0; i < st.length; i++) {
      const t = st[i], b = baseOf(t), top = h + TY(t).h, last = i === st.length - 1;
      if (Math.abs(h - y) < 0.01) {
        if (CLIMBS.has(b)) return { b, d: dirOf(t), level: 'low' };
        if (isBuilding(b) && (i === 0 || !isBuilding(st[i - 1]))) { const d = doorFace(q, r, h); return d >= 0 ? { b: 'door', d } : null; }
        if (['weg', 'laan', 'pad', 'hof', 'looppad', 'tunnel'].includes(b)) return { b };
      }
      if (last && Math.abs(top - y) < 0.01) {
        if (CLIMBS.has(b)) return { b, d: dirOf(t), level: 'high' };
        if (['blok', 'tunnel', 'zuilen'].includes(b)) return { b: 'top' };   // niet bovenop een looppad: daar is het midden open
      }
      h = top;
    }
    return null;
  }
  function buildWalkGraph() {
    const nodes = new Map();
    for (const [k, f] of pathIfs) {
      const kind = nodeKind(f.q, f.r, f.y);
      if (kind) nodes.set(k, { key: k, q: f.q, r: f.r, y: f.y, kind, edges: new Map() });
    }
    // Op een brug kun je alleen over het dek: alleen de zijden waar de weg of het pad doorloopt
    const deckSides = n => {
      const st = stackOf(n.q, n.r);
      if (baseOf(st[0]) !== 'water') return 63;
      return baseOf(st[1]) === 'weg' ? (roadLinks.get(n.key) || 0) : (pathLinks.get(n.key) || 0);
    };
    const link = (a, b, side, climb) => {
      if (!a || !b || a === b) return;
      if (!climb && (!((deckSides(a) >> side) & 1) || !((deckSides(b) >> ((side + 3) % 6)) & 1))) return;
      const bs = side < 0 ? -1 : (side + 3) % 6;
      a.edges.set(b.key, { to: b, side, climb, corner: side >= 0 ? cornerVia.get(a.key + '|' + side) : undefined });
      b.edges.set(a.key, { to: a, side: bs, climb, corner: bs >= 0 ? cornerVia.get(b.key + '|' + bs) : undefined });
    };
    for (const n of nodes.values()) {
      let mask = (pathLinks.get(n.key) || 0) | (roadLinks.get(n.key) || 0);
      if (n.kind.b === 'laan') {   // laan: langs de stoep naar het volgende vak, en de stoepen van zijstraten op
        const I = laanAt(n.q, n.r);
        if (I) { mask |= I.arms; if (I.contF) mask |= 1 << I.G.F; if (I.contB) mask |= 1 << I.G.Bk; }
      }
      for (let k = 0; k < 6; k++) {
        const nb = nodes.get(lk(n.q + NEIGH[k][0], n.r + NEIGH[k][1], n.y));
        if (!nb) continue;
        if ((mask >> k) & 1) link(n, nb, k, false);
        else if (n.kind.b === 'top' && nb.kind.b === 'top') link(n, nb, k, false);   // dakterras naar dakterras
        else if (n.kind.b === 'door' && n.kind.d === k && nb.kind.b !== 'door') link(n, nb, k, false);   // voordeur naar buiten
      }
      if (n.kind.level === 'low') link(n, nodes.get(lk(n.q, n.r, n.y + 3)), -1, true);   // trap of helling op
    }
    // Getekende wegen: knopen op kruisingen en uiteinden, stoepen ertussen (nog los van het hexnetwerk)
    const G = cars.vecGraph();
    const vn = G.nodes.map(N => { const r = N.z / (1.5 * R); return { key: 'v' + Math.round(N.x * 2) / 2 + ',' + Math.round(N.z * 2) / 2, q: N.x / (R * SQ3) - r / 2, r, y: PW_H, x: N.x, z: N.z, kind: { b: 'vec' }, edges: new Map() }; });
    for (const e of G.edges.values()) {
      const A = vn[e.a], B = vn[e.b];
      A.edges.set(B.key, { to: B, side: -1, climb: false, vec: e, dir: 0 });
      B.edges.set(A.key, { to: A, side: -1, climb: false, vec: e, dir: 1 });
    }
    for (const n of vn) if (n.edges.size) nodes.set(n.key, n);
    for (const [k, n] of nodes) if (!n.edges.size) nodes.delete(k);
    return nodes;
  }

  const people = (() => {
    const MAX = 160;
    // ---------- Lichaamsvormen ----------
    // Vloeiende vormen uit draaiprofielen (lathe): ledematen met ronde uiteinden en spierbolling, een romp
    // met borst, taille en heupen, een hoofd met kaak, neus en oren. Maten in meters, volwassene ~1,78 m.
    const V2 = (x, y) => new THREE.Vector2(x, y);
    const lathe = (pts, seg = 12) => new THREE.LatheGeometry(pts, seg);
    function limb(len, rt, rb, bulge = 0, bulgeAt = 0.35, seg = 12) {   // van y=0 (gewricht) naar y=-len, met ronde doppen
      const pts = [V2(0, rt * 0.9)];
      for (let i = 1; i <= 4; i++) { const a = Math.PI / 2 * (1 - i / 4); pts.push(V2(rt * Math.cos(a), rt * Math.sin(a) * 0.9)); }
      for (let i = 1; i < 10; i++) {
        const t = i / 10, rr = rt + (rb - rt) * t + bulge * Math.exp(-Math.pow((t - bulgeAt) / 0.22, 2));
        pts.push(V2(rr, -len * t));
      }
      for (let i = 0; i <= 4; i++) { const a = -Math.PI / 2 * (i / 4); pts.push(V2(rb * Math.cos(a), -len + rb * Math.sin(a) * 0.9)); }
      pts[pts.length - 1].x = 0;
      return lathe(pts.reverse(), seg);
    }
    const sphere = (r, sx, sy, sz, x, y, z, ws = 12, hs = 9) => new THREE.SphereGeometry(r, ws, hs).scale(sx, sy, sz).translate(x, y, z);
    const colored = (g, hex) => {   // vertex-kleur voor onderdelen met meerdere kleuren (ogen, mond)
      const n = (g.index ? g.toNonIndexed() : g), c = new THREE.Color(hex), arr = new Float32Array(n.attributes.position.count * 3);
      for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
      n.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return n;
    };
    const mergeC = list => {   // samenvoegen mét vertex-kleuren
      const g = mergeGeos(list), cols = [];
      for (const x of list) cols.push(...x.attributes.color.array);
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(cols), 3)); return g;
    };
    // Romp (vanaf de heupgewrichten, y=0, tot de nek op 0,57): man en vrouw
    const torsoProfile = (waist, chest, shoulder, hip) => [V2(0, -0.075), V2(hip * 0.97, -0.07), V2(hip * 1.01, 0.0), V2(hip * 1.01, 0.07), V2(waist, 0.19), V2(waist * 1.06, 0.27),
      V2(chest, 0.37), V2(chest * 1.02, 0.44), V2(shoulder, 0.5), V2(shoulder * 0.8, 0.545), V2(0.075, 0.57), V2(0, 0.575)];
    const torsoM = lathe(torsoProfile(0.15, 0.18, 0.17, 0.155), 16).scale(1.08, 1, 0.6);
    const torsoF = mergeGeos([lathe(torsoProfile(0.125, 0.152, 0.145, 0.163), 16).scale(1.0, 1, 0.62),
      sphere(0.05, 1.05, 0.85, 0.6, -0.05, 0.375, 0.058), sphere(0.05, 1.05, 0.85, 0.6, 0.05, 0.375, 0.058)]);
    const hipsGeo = lathe([V2(0, -0.1), V2(0.085, -0.095), V2(0.135, -0.05), V2(0.148, 0.0), V2(0.148, 0.06), V2(0, 0.065)], 16).scale(1.05, 1, 0.66);
    // Jas: een iets ruimere schil om romp en heupen, tot halverwege de dij, met een kraagje
    const coatGeo = lathe([V2(0.175, -0.36), V2(0.18, -0.12), V2(0.172, 0.02), V2(0.16, 0.19), V2(0.178, 0.3), V2(0.195, 0.44), V2(0.185, 0.5), V2(0.12, 0.555), V2(0.085, 0.6), V2(0.075, 0.6)], 16).scale(1.1, 1, 0.66);
    const skirtGeo = lathe([V2(0.14, 0.05), V2(0.165, -0.05), V2(0.2, -0.2), V2(0.25, -0.36), V2(0.27, -0.46)], 16).scale(1, 1, 0.78);
    // Hoofd: schedel, kaak en kin, neus en oren in één vorm
    // Eén vloeiende hoofdvorm: een bol die onderaan smaller wordt (kaak) en een kin naar voren krijgt
    const skull = new THREE.SphereGeometry(0.105, 22, 18), sp = skull.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      let x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i);
      const low = Math.max(0, -y / 0.105);                       // 0 boven, 1 bij de kin
      x *= 1 - 0.3 * low * low;                                  // kaak loopt smal toe
      z *= 1.06 - 0.12 * low * low;
      if (z > 0) z += 0.018 * low * (1 - low) * 4 * (1 - Math.abs(x) / 0.1);   // kin en kaaklijn naar voren
      y *= y > 0 ? 1.1 : 1.22;                                   // iets langgerekt, vooral het gezicht
      if (z < 0 && y > -0.02) z *= 1.08;                         // achterhoofd
      sp.setXYZ(i, x, y + 0.008, z);
    }
    skull.computeVertexNormals();
    const headGeo = mergeGeos([skull, sphere(0.016, 0.85, 1.35, 1.25, 0, -0.012, 0.108, 8, 6),
      sphere(0.013, 0.65, 1.8, 1.3, -0.102, 0.0, -0.006, 8, 6), sphere(0.013, 0.65, 1.8, 1.3, 0.102, 0.0, -0.006, 8, 6)]);
    // Ogen (wit + iris) en mond, met vertex-kleuren
    const faceGeo = mergeC([colored(sphere(0.017, 1.1, 0.8, 0.6, -0.037, 0.02, 0.094, 10, 8), '#f4f1ea'), colored(sphere(0.017, 1.1, 0.8, 0.6, 0.037, 0.02, 0.094, 10, 8), '#f4f1ea'),
      colored(sphere(0.0085, 1, 1, 0.5, -0.037, 0.02, 0.104, 8, 6), '#2a1d14'), colored(sphere(0.0085, 1, 1, 0.5, 0.037, 0.02, 0.104, 8, 6), '#2a1d14'),
      colored(sphere(0.02, 1.2, 0.22, 0.4, 0, -0.058, 0.098, 8, 4), '#8a4b45')]);
    const browGeo = mergeGeos([new THREE.BoxGeometry(0.038, 0.008, 0.012).rotateZ(0.12).translate(-0.038, 0.048, 0.1), new THREE.BoxGeometry(0.038, 0.008, 0.012).rotateZ(-0.12).translate(0.038, 0.048, 0.1)]);
    // Kapsels (allemaal ten opzichte van het hoofd)
    const cap = (r = 0.112) => new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1.02, 1.12, 1.08).rotateX(-0.42).translate(0, 0.02, -0.006);
    const HAIRS = {
      short: cap(),
      long: mergeGeos([cap(), lathe([V2(0.1, 0.02), V2(0.112, -0.06), V2(0.105, -0.17), V2(0.085, -0.24), V2(0, -0.245)], 14).scale(1.05, 1, 0.7).translate(0, 0, -0.04)]),
      bun: mergeGeos([cap(), sphere(0.05, 1, 0.9, 1, 0, 0.07, -0.1)]),
      tail: mergeGeos([cap(), new THREE.ConeGeometry(0.035, 0.22, 10).rotateX(Math.PI * 0.92).translate(0, -0.05, -0.135)]),
      curly: new THREE.IcosahedronGeometry(0.128, 1).scale(1.05, 1.0, 1.05).translate(0, 0.045, -0.015),
    };
    const shoeGeo = mergeGeos([sphere(0.046, 1, 1.0, 2.6, 0, -0.035, 0.05, 14, 10), sphere(0.046, 1, 0.3, 2.65, 0, -0.068, 0.05, 14, 6)]);   // schoen met zool
    const handGeo = mergeGeos([sphere(0.042, 1, 2.0, 0.55, 0, -0.07, 0, 10, 8), sphere(0.016, 1, 2.2, 1, 0.032, -0.05, 0.012, 6, 5).rotateZ(-0.35)]);
    const PARTS = {
      thigh:    { geo: limb(0.44, 0.082, 0.056, 0.012, 0.25), per: 2 },
      shin:     { geo: limb(0.44, 0.056, 0.038, 0.014, 0.28), per: 2 },
      shoe:     { geo: shoeGeo, per: 2 },
      hips:     { geo: hipsGeo, per: 1 },
      torsoM:   { geo: torsoM, per: 1 },
      torsoF:   { geo: torsoF, per: 1 },
      coat:     { geo: coatGeo, per: 1 },
      neck:     { geo: new THREE.CylinderGeometry(0.043, 0.05, 0.12, 10).translate(0, 0.05, 0), per: 1 },
      head:     { geo: headGeo, per: 1 },
      face:     { geo: faceGeo, per: 1, vc: true, noShadow: true },
      brows:    { geo: browGeo, per: 1, noShadow: true },
      hairShort:{ geo: HAIRS.short, per: 1 }, hairLong: { geo: HAIRS.long, per: 1 }, hairBun: { geo: HAIRS.bun, per: 1 },
      hairTail: { geo: HAIRS.tail, per: 1 }, hairCurly: { geo: HAIRS.curly, per: 1 },
      upperArm: { geo: limb(0.29, 0.05, 0.04, 0.008, 0.3), per: 2 },
      foreArm:  { geo: limb(0.26, 0.041, 0.03, 0.006, 0.25), per: 2 },
      hand:     { geo: handGeo, per: 2 },
      skirt:    { geo: skirtGeo, per: 1 },
      pack:     { geo: mergeGeos([new THREE.BoxGeometry(0.28, 0.36, 0.13), sphere(0.06, 2.2, 1, 1, 0, -0.12, 0.05)]), per: 1 },
    };
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    const matV = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true });
    const meshes = {};
    for (const [name, pdef] of Object.entries(PARTS)) {
      const n = MAX * pdef.per, m = new THREE.InstancedMesh(pdef.geo, pdef.vc ? matV : mat, n);
      m.frustumCulled = false; m.castShadow = !pdef.noShadow; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const white = new THREE.Color('#ffffff'); for (let i = 0; i < n; i++) m.setColorAt(i, white);   // kleurbuffer vóór de eerste render
      m.count = 0; scene.add(m); meshes[name] = m;
    }
    const SHIRTS = ['#c8553d', '#2f6690', '#e9b44c', '#3a7d44', '#8e5572', '#f2efe6', '#3d405b', '#d97b4a', '#6aa4b0', '#b5838d', '#81b29a', '#e07a5f', '#264653', '#d4d0c8', '#5b7f95'];
    const COATS = ['#3b3f45', '#6b4e37', '#2c3e50', '#8b7d6b', '#7a2e2e', '#4f5d3a', '#1f1f24', '#a68b5b'];
    const PANTS = ['#2b3440', '#4a3b2f', '#1f2a44', '#5c6166', '#3b5a7a', '#c2b59b', '#2a2a2a', '#45576b'];
    const SKIN = ['#f3d2b3', '#e8b994', '#d29b72', '#a8704b', '#7a4b31', '#5a3824'];
    const HAIR = ['#1c1a19', '#2e211a', '#4a3020', '#6b4528', '#a0703f', '#c9a46a', '#e3cf9a', '#9c3e1f'];
    const GREYS = ['#8e8c88', '#b9b6b0', '#dcd9d2'];
    const SHOES = ['#222222', '#3a2a1e', '#efefef', '#6b4a2e', '#2f3e57', '#8a2c2c'];
    const PACKS = ['#2f4858', '#8d3b2c', '#3f6844', '#d39b32', '#222831'];
    const col = new THREE.Color();
    let graph = new Map(), nodeList = [], doorList = [];
    const agents = [];
    let on = true;
    try { on = localStorage.getItem('hexstad-mensen') !== '0'; } catch (e) {}
    const btn = document.getElementById('peopleBtn');
    const label = () => { btn.textContent = 'Mensen: ' + (on ? 'aan' : 'uit'); };
    label();

    const pick = a => a[Math.floor(Math.random() * a.length)];
    const right = f => [-f.nz, f.nx];
    function cellC(n) { return cellToWorld(n.q, n.r); }
    // Waar in een vak loop je naartoe? Afhankelijk van het soort vak en de richting waarin je binnenkomt
    // Punt op de stoep zo dicht mogelijk bij (x, z): in bochten en op kruisingen volgt de stoep de ronde vorm
    function onSidewalk(n, x, z) {
      const c = cellC(n), polys = roadGeo(roadLinks.get(n.key) || 0).walkPolys, lx = x - c.x, lz = z - c.z;
      for (const pts of polys) if (inPoly(lx, lz, pts)) return [x, z];
      let best = null, bd = 1e9;
      for (const pts of polys) for (let i = 0; i < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
        const t = Math.max(0, Math.min(1, ((lx - ax) * dx + (lz - az) * dz) / l2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(px - lx, pz - lz);
        if (d < bd) {
          const l = Math.sqrt(l2), nx = -dz / l, nz = dx / l;   // een meter naar binnen: midden van de stoep
          const p1 = [px + nx, pz + nz], p2 = [px - nx, pz - nz];
          best = inPoly(p1[0], p1[1], pts) ? p1 : inPoly(p2[0], p2[1], pts) ? p2 : [px, pz]; bd = d;
        }
      }
      return best ? [c.x + best[0], c.z + best[1]] : [x, z];
    }
    // stoep van de laan: 1,3 m van de buitenrand (de stoep is 2,5 m breed)
    function laanWalk(n, tt, a) {
      const c = cellC(n), G = LAAN_G[laanCell(n.q, n.r)], p = 1.3 + a.lane * 0.45 - 4.5;
      if (!G) return [c.x, c.z];
      return [c.x + G.f[0] * tt + G.n[0] * p, c.z + G.f[1] * tt + G.n[1] * p];
    }
    const roadK = n => n.kind.b === 'weg' || n.kind.b === 'laan';
    const vecOff = (e, a) => a.walkSide * (PATH_DEF[e.t].hw + PATH_DEF[e.t].walk / 2 + a.lane * 0.5);
    let curA = null;   // de voetganger die nu aan de beurt is (voor de vloerhoogte op getekende stoepen)
    function vecFloor(x, z) {   // vloer op een getekende weg: stoep, rijbaan of niets; alleen de takken rond de voetganger
      const E = curA && curA.vedges; if (!E) return 0;
      let best = 0;
      for (const e of E) {
        let d = 1e9; for (let i = 0; i < e.pts.length - 1; i++) d = Math.min(d, distSeg(x, z, e.pts[i], e.pts[i + 1]));
        const D = PATH_DEF[e.t], h = d < D.hw + 0.3 ? ASPH_H : d < D.hw + D.walk + 0.3 ? PW_H : 0; if (h > best) best = h;
      }
      return best;
    }
    const vecEdgesAround = (...ns) => { const out = []; for (const n of ns) if (n) for (const e of n.edges.values()) if (e.vec && !out.includes(e.vec)) out.push(e.vec); return out; };
    function centerOf(n, f, a) {
      const c = cellC(n), K = n.kind;
      if (K.b === 'laan') return laanWalk(n, 0, a);
      if (K.b === 'vec') { const e = [...n.edges.values()][0]; if (e && e.vec) { a.vedges = vecEdgesAround(n); return cars.vecWalk(e.vec, e.dir, vecOff(e.vec, a))[0]; } return [n.x, n.z]; }
      const [rx, rz] = f ? right(f) : [0, 0];
      if (K.b === 'weg') return onSidewalk(n, c.x + rx * a.walkSide * 3.4, c.z + rz * a.walkSide * 3.4);
      if (K.b === 'hof') return [c.x + rx * a.walkSide * 2.9, c.z + rz * a.walkSide * 2.9];
      if (K.b === 'door') { const fd = FRAMES[K.d]; return [c.x + fd.nx * (INNER - 3), c.z + fd.nz * (INNER - 3)]; }
      if (K.level) {
        const fd = FRAMES[K.d];
        const p = K.b === 'hofhelling' ? (K.level === 'low' ? -2.5 : INNER - 1.0) : (K.level === 'low' ? -(INNER - 1.3) : INNER - 1.3);
        return [c.x + fd.nx * p, c.z + fd.nz * p];
      }
      return [c.x + rx * a.lane, c.z + rz * a.lane];
    }
    function midOf(n, side, a, other) {
      const c = cellC(n), f = FRAMES[side], [rx, rz] = right(f);
      let off = a.lane;
      if (n.kind.b === 'door' || other.kind.b === 'door') off = 0;
      else if (n.kind.b === 'laan' && other.kind.b === 'laan') { const G = LAAN_G[laanCell(n.q, n.r)]; if (G) return laanWalk(n, f.nx * G.f[0] + f.nz * G.f[1] > 0 ? INNER : -INNER, a); }
      else if (roadK(n) && roadK(other)) off = a.walkSide * 3.4;
      return [c.x + f.nx * INNER + rx * off, c.z + f.nz * INNER + rz * off];
    }
    function floorFor(x, z, feet) {
      let best = null;
      for (const c of nearby(x, z)) for (const s2 of c.surfaces) {
        const t = surfTop(s2, x, z);
        if (t !== null && t <= feet + 0.45 && (best === null || t > best)) best = t;
      }
      if (best === null || best < 0.5) { const v = vecFloor(x, z); if (v > 0) best = Math.max(best || 0, v); }
      return best === null ? (feet < 0.5 ? 0 : feet) : best;
    }
    function place(a, n, fromDoor) {
      curA = a;
      a.node = n; a.prev = null; a.wps = []; a.state = 'walk'; a.timer = 0;
      const [x, z] = centerOf(n, null, a);
      a.x = x; a.z = z; a.y = n.y; a.goingIn = false;
      a.fade = fromDoor ? 0 : 1;
      initFeet(a);
    }
    // ---------- Voeten: echte stappen ----------
    // Elke voet staat op een vaste plek tot hij een stap zet. Een stap begint als de voet te ver van zijn
    // ideale plek (onder de heup, iets vooruit) staat; hij landt waar de heup straks is, op de vloer daar.
    const fwdOf = h => [Math.sin(h), Math.cos(h)], rightOf = h => [Math.cos(h), -Math.sin(h)];
    const ANKLE = 0.082;   // enkel boven de vloer: de schoenzool raakt precies de grond
    function initFeet(a) {
      const sc = a.scale, [rx, rz] = rightOf(a.heading);
      a.hipY = a.y + 0.965 * sc; a.sway = 0; a.spd = 0; a.avoid = 0; a.follow = 1; a.lastFoot = -1;
      a.feet = [-1, 1].map(side => {
        const x = a.x + rx * side * 0.1 * sc, z = a.z + rz * side * 0.1 * sc, y = floorFor(x, z, a.y) + ANKLE * sc;
        return { x, y, z, cx: x, cy: y, cz: z, h: a.heading, swing: false, t: 0, fx: x, fy: y, fz: z, tx: x, ty: y, tz: z, dur: 0.4, arc: 0.07 };
      });
    }
    function stepFeet(a, dt) {
      if (!a.feet) initFeet(a);
      const sc = a.scale, [rx, rz] = rightOf(a.heading);
      const stepLen = a.stride * 0.4;
      // werkelijke snelheid van het lichaam (ook als iemand opzij geduwd wordt)
      if (a.lx === undefined) { a.lx = a.x; a.lz = a.z; a.vx = 0; a.vz = 0; }
      const k = Math.min(1, dt * 10);
      a.vx += ((a.x - a.lx) / Math.max(dt, 1e-3) - a.vx) * k; a.vz += ((a.z - a.lz) / Math.max(dt, 1e-3) - a.vz) * k;
      a.lx = a.x; a.lz = a.z;
      const spd = Math.hypot(a.vx, a.vz), moving = spd > 0.15;
      const fx = moving ? a.vx / spd : Math.sin(a.heading), fz = moving ? a.vz / spd : Math.cos(a.heading);
      // blijft een voet ver achter (geduwd, gestruikeld)? dan de zwaaiende voet sneller neerzetten
      let behind = false;
      a.feet.forEach((f, i) => { if (!f.swing && Math.hypot(f.x - a.x, f.z - a.z) > Math.max(0.42 * sc, stepLen * 0.62)) behind = true; });
      let swinging = -1;
      // een staande voet die echt te ver weg staat (na een duw of een sprong vooruit) zet je direct onder je
      a.feet.forEach((f, i) => {
        if (f.swing || Math.hypot(f.x - a.x, f.z - a.z) < 0.9 * sc) return;
        const side = i ? 1 : -1;
        f.x = a.x + rx * side * 0.1 * sc; f.z = a.z + rz * side * 0.1 * sc; f.y = floorFor(f.x, f.z, a.y) + ANKLE * sc; f.h = a.heading;
      });
      a.feet.forEach((f, i) => {
        if (!f.swing) {
          f.cx = f.x; f.cy = f.y; f.cz = f.z;
          // draaien op de bal van de voet: een staande voet draait langzaam mee met het lichaam
          let dh = a.heading - f.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
          if (Math.abs(dh) > 0.3) f.h += Math.sign(dh) * Math.min(Math.abs(dh) - 0.3, dt * 2.2);
          return;
        }
        swinging = i;
        f.t = Math.min(1, f.t + dt / f.dur * (behind ? 2.5 : 1));
        const p = 0.45 * f.t + 0.55 * f.t * f.t * (3 - 2 * f.t);   // meteen naar voren, rustig neerzetten
        f.cx = f.fx + (f.tx - f.fx) * p; f.cz = f.fz + (f.tz - f.fz) * p;
        f.cy = f.fy + (f.ty - f.fy) * p + Math.sin(Math.PI * f.t) * f.arc;
        // de zwaaivoet blijft aan zijn eigen kant: niet langs of door het standbeen, en niet wijd uitzwaaien
        const o = a.feet[1 - i], side = i ? 1 : -1;
        const latO = ((f.cx - o.x) * rx + (f.cz - o.z) * rz) * side;
        if (latO < 0.12 * sc) { const d = 0.12 * sc - latO; f.cx += rx * side * d; f.cz += rz * side * d; }
        const latB = ((f.cx - a.x) * rx + (f.cz - a.z) * rz) * side;
        if (latB > 0.28 * sc) { const d = latB - 0.28 * sc; f.cx -= rx * side * d; f.cz -= rz * side * d; }
        if (f.t >= 1) { f.swing = false; f.x = f.tx; f.y = f.ty; f.z = f.tz; f.cx = f.x; f.cy = f.y; f.cz = f.z; }
      });
      if (swinging < 0) {
        // Ritme zoals echt lopen: een zwaai duurt ~0,4 s (langzamer lopen = kortere passen, niet tragere benen).
        // De voet landt een halve pas vóór de heup; de andere voet staat dan een halve pas erachter.
        // kortere benen (kinderen) stappen sneller; een halve pas is nooit meer dan een derde beenlengte
        const swingT = moving ? Math.max(0.22, Math.min(0.5, 0.42 * Math.sqrt(1.3 / Math.max(0.6, spd)) * Math.sqrt(sc))) : 0.32;
        // waar de heup heen gaat: de echte snelheid (ook als iemand geduwd wordt), of de bedoelde als die hoger is (optrekken)
        const vReal = Math.hypot(a.vx, a.vz), useReal = vReal >= a.spd * 0.9;
        const pvx = useReal ? a.vx : 0.5 * Math.sin(a.heading) * a.spd + 0.5 * a.vx, pvz = useReal ? a.vz : 0.5 * Math.cos(a.heading) * a.spd + 0.5 * a.vz;
        const half = Math.min(stepLen * 0.5, 0.33 * sc, Math.hypot(pvx, pvz) * swingT * 0.5 + 0.03 * sc);
        const lead = moving ? half : 0;
        const ideal = side => [a.x + fx * lead + rx * side * 0.1 * sc, a.z + fz * lead + rz * side * 0.1 * sc];
        let best = -1, bestErr = 0;
        const errs = [0, 0];
        a.feet.forEach((f, i) => {
          const [ix, iz] = ideal(i ? 1 : -1), ex = f.x - ix, ez = f.z - iz;
          let dh = f.h - a.heading; dh = Math.abs(Math.atan2(Math.sin(dh), Math.cos(dh)));
          // zijwaarts weggeduwd of gedraaid telt zwaarder: dan eerder een stapje bijzetten
          const lon = ex * fx + ez * fz, lat = ex * rx + ez * rz;
          const err = Math.hypot(lon, lat * 1.6) + dh * 0.55 * sc;
          errs[i] = err;
          if (err > bestErr) { bestErr = err; best = i; }
        });
        const thr = moving ? Math.max(0.12 * sc, half * 1.5) : 0.13 * sc;
        // om en om stappen: is de andere voet ook al een eind van zijn plek, dan gaat die eerst
        if (best >= 0 && best === a.lastFoot && moving && errs[1 - best] > thr * 0.8 && bestErr < stepLen) { best = 1 - best; bestErr = Math.max(errs[best], thr + 1e-3); }
        if (best >= 0 && bestErr > thr && !(best === a.lastFoot && moving && bestErr < stepLen * 1.3)) {
          const f = a.feet[best], [ix, iz] = ideal(best ? 1 : -1);
          const dur = swingT;
          let tx = ix + pvx * dur, tz = iz + pvz * dur;   // landen waar de heup straks is, een halve pas vooruit
          // nooit kruisen: de voet landt altijd aan zijn eigen kant van de andere voet
          { const o = a.feet[1 - best], side = best ? 1 : -1, latO = ((tx - o.x) * rx + (tz - o.z) * rz) * side;
            if (latO < 0.15 * sc) { tx += rx * side * (0.15 * sc - latO); tz += rz * side * (0.15 * sc - latO); } }
          const ty = floorFor(tx, tz, Math.max(a.y, f.y - ANKLE * sc)) + ANKLE * sc;
          Object.assign(f, { swing: true, t: 0, fx: f.x, fy: f.y, fz: f.z, tx, ty, tz, dur, h: a.heading,
            arc: (moving ? 0.075 : 0.035) * sc + Math.max(0, ty - f.y) * 0.7 });
          a.lastFoot = best;
        }
      }
      // heuphoogte: zo hoog als de standbenen toelaten (daar komt de natuurlijke op-en-neer beweging vandaan)
      const L = 0.88 * sc * 0.985;
      let hy = a.y + (0.965 - (moving ? 0.02 : 0)) * sc;   // heupgewricht: enkel + beenlengte, licht gebogen
      a.feet.forEach((f, i) => {
        // ook de zwaaivoet telt mee bij afzetten en neerzetten, anders schiet de heup omhoog en strekt het been te ver
        // (midden in de zwaai geeft de knie mee: daar telt hij nauwelijks)
        const slack = f.swing ? Math.max(0, (Math.sin(Math.PI * f.t) - 0.7) / 0.3) * 0.3 * sc : 0;
        const side = i ? 1 : -1, hx = a.x + rx * side * 0.088 * sc, hz = a.z + rz * side * 0.088 * sc;
        const dh = Math.hypot(f.cx - hx, f.cz - hz), maxY = f.cy + Math.sqrt(Math.max(0, L * L - dh * dh)) + 0.02 * sc + slack;
        if (maxY < hy) hy = maxY;
      });
      // De heup zakt zo nodig om bij een staande voet te blijven (een voet mag nooit van de grond loskomen),
      // maar niet dieper dan een diepe kniebuiging; zo ver weg komt een voet niet, want dan stapt hij eerder bij
      hy = Math.max(hy, a.y + 0.62 * sc);
      a.hipY += (hy - a.hipY) * Math.min(1, dt * (hy < a.hipY ? 18 : 8));   // vlot zakken, rustig omhoog
      const sw = swinging < 0 ? 0 : (swinging ? -1 : 1) * 0.024 * sc;   // gewicht boven het standbeen
      a.sway += (sw - a.sway) * Math.min(1, dt * 7);
    }
    // ---------- Elkaar ontwijken ----------
    function separate(a, grid) {   // nooit door elkaar heen lopen
      const gx = Math.floor(a.x / 2), gz = Math.floor(a.z / 2);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const list = grid.get((gx + i) + ',' + (gz + j)); if (!list) continue;
        for (const o of list) {
          if (o === a || Math.abs(o.y - a.y) > 1) continue;
          const ox = o.x - a.x, oz = o.z - a.z, d = Math.hypot(ox, oz);
          if (d < 0.5) {
            const ux = d > 1e-4 ? ox / d : Math.cos(a.id), uz = d > 1e-4 ? oz / d : Math.sin(a.id), push = Math.min((0.5 - d) * 0.5, 0.05);
            a.x -= ux * push; a.z -= uz * push;
          }
        }
      }
    }
    function avoidance(a, dt, grid) {
      const [fx, fz] = fwdOf(a.heading), [rx, rz] = rightOf(a.heading);
      let side = 0, follow = 1;
      const gx = Math.floor(a.x / 2), gz = Math.floor(a.z / 2);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const list = grid.get((gx + i) + ',' + (gz + j)); if (!list) continue;
        for (const o of list) {
          if (o === a || Math.abs(o.y - a.y) > 1) continue;
          const ox = o.x - a.x, oz = o.z - a.z, d = Math.hypot(ox, oz);
          if (d > 2.4 || d < 1e-4) continue;
          const ahead = ox * fx + oz * fz, lat = ox * rx + oz * rz;
          if (ahead <= 0.05) continue;
          const same = Math.sin(o.heading) * fx + Math.cos(o.heading) * fz;
          if (same > 0.5 && o.moving && ahead < 1.4 && Math.abs(lat) < 0.55) {   // iemand loopt voor je: tempo aanpassen
            follow = Math.min(follow, Math.max(0.15, (o.spd || 0) / Math.max(0.1, a.speed) - (1.4 - ahead) * 0.3));
          } else if (ahead < 2.4 && Math.abs(lat) < 0.8) {
            if (same < -0.3 && lat < 0.35) side += 1;          // tegenligger: rechts houden
            else side += lat > 0 ? -1 : 1;                     // stilstaand of schuin: uitwijken naar de vrije kant
          }
        }
      }
      const target = Math.max(-1, Math.min(1, side)) * 0.65;
      a.avoid += (target - a.avoid) * Math.min(1, dt * (target ? 2.5 : 1.2));
      a.follow += (follow - a.follow) * Math.min(1, dt * 5);
    }
    let agentId = 0;
    function newAgent() {
      const r = Math.random, kid = r() < 0.1, old = !kid && r() < 0.13, female = r() < 0.5;
      const dress = female && !kid && r() < 0.35, coat = !kid && r() < (old ? 0.6 : 0.25);
      const hairStyle = old && !female ? (r() < 0.4 ? null : 'short') : kid ? (female ? pick(['tail', 'long', 'bun']) : pick(['short', 'curly'])) :
        female ? pick(['long', 'long', 'tail', 'bun', 'short', 'curly']) : (r() < 0.1 ? null : pick(['short', 'short', 'short', 'curly']));
      const height = kid ? 1.15 + r() * 0.25 : female ? 1.6 + r() * 0.14 : 1.72 + r() * 0.17;
      const a = {
        id: ++agentId, kid, old, female, dress, coat,
        scale: height / 1.78,
        build: (female ? 0.94 : 1.03) + (r() - 0.5) * 0.12,   // smal of breed
        speed: kid ? 1.25 + r() * 0.35 : old ? 0.8 + r() * 0.2 : 1.1 + r() * 0.4,
        stride: (kid ? 1.0 : old ? 1.15 : 1.45) * (0.95 + r() * 0.1) * height / 1.78 * 1.2,
        lean: old ? 0.12 + r() * 0.08 : 0.04,
        phase: r() * 6.28, walkAmt: 0, t: r() * 100, lookPhase: r() * 100,
        walkSide: r() < 0.5 ? 1 : -1, lane: (r() - 0.5) * 1.2, heading: r() * 6.28,
        skin: pick(SKIN), hair: old ? pick(GREYS) : pick(HAIR), hairStyle,
        shirt: pick(SHIRTS), pants: pick(PANTS), shoes: pick(SHOES), coatCol: pick(COATS),
        shortSleeves: !coat && r() < 0.35, shorts: !dress && !coat && !old && r() < 0.18,
        pack: !kid && !old && r() < 0.16 ? pick(PACKS) : null,
      };
      a.dressCol = dress ? (r() < 0.5 ? a.shirt : pick(SHIRTS)) : null;
      a.legs = dress ? (r() < 0.5 ? a.skin : '#2b2b2b') : a.shorts ? a.skin : a.pants;
      const n = doorList.length && r() < 0.4 ? pick(doorList) : pick(nodeList);
      place(a, n, n.kind.b === 'door');
      return a;
    }
    function chooseNext(a) {
      const n = a.node, es = [...n.edges.values()];
      let cands = es.filter(e => !a.prev || e.to !== a.prev);
      if (!cands.length) cands = es;
      const inSide = a.prev ? [...a.prev.edges.values()].find(e => e.to === n)?.side : undefined;
      let total = 0;
      const w = cands.map(e => {
        let v = 1;
        if (e.to.kind.b === 'door') v = 0.25;
        if (e.climb) v = 1.6;
        if (inSide !== undefined && e.side === inSide) v *= 3;   // liefst rechtdoor
        total += v; return v;
      });
      let x = Math.random() * total;
      for (let i = 0; i < cands.length; i++) { x -= w[i]; if (x <= 0) return cands[i]; }
      return cands[cands.length - 1];
    }
    function go(a, e) {
      const from = a.node, to = e.to;
      a.prev = from; a.node = to; a.wps = [];
      if (e.vec) { a.precise = false; a.vedges = vecEdgesAround(from, to); a.wps = cars.vecWalk(e.vec, e.dir, vecOff(e.vec, a)); return; }
      a.vedges = null;
      a.precise = e.climb || to.kind.b === 'door' || from.kind.b === 'door' || !!to.kind.level || !!from.kind.level;   // deuren en trappen: precies volgen
      if (e.corner) {
        // haaks pad naar de straat: over het pad naar de hoek, dan de stoep op (of andersom)
        const C = e.corner, onPath = [C.x - C.dx * 1.6, C.z - C.dz * 1.6], onWalk = [C.x + C.dx * 0.9, C.z + C.dz * 0.9];
        if (roadK(from)) a.wps.push(onWalk, onPath); else a.wps.push(onPath, onWalk);
        a.wps.push(centerOf(to, FRAMES[e.side], a));
        if (to.kind.b === 'door') a.goingIn = true;
        return;
      }
      if (!e.climb) {
        const fromRoad = roadK(from), toRoad = roadK(to);
        const edge = off => { const c = cellC(from), f2 = FRAMES[e.side], [rx, rz] = right(f2); return [c.x + f2.nx * (INNER - 0.4) + rx * off, c.z + f2.nz * (INNER - 0.4) + rz * off]; };
        const inner = (from.kind.b === 'door' || to.kind.b === 'door') ? 0 : a.lane;
        if (fromRoad && !toRoad) { a.wps.push(edge(a.walkSide * 3.4)); a.wps.push(edge(inner)); }   // over de stoep naar de rand, dan pas oversteken
        a.wps.push(midOf(from, e.side, a, to));
      }
      const f = e.climb ? FRAMES[from.kind.d] : FRAMES[e.side];
      if (!e.climb && !roadK(from) && roadK(to)) {   // van een pad de straat op: eerst naar de stoep
        const c = cellC(to), fb = FRAMES[(e.side + 3) % 6], [rx, rz] = right(f);
        a.wps.push([c.x + fb.nx * (INNER - 0.6) + rx * a.walkSide * 3.4, c.z + fb.nz * (INNER - 0.6) + rz * a.walkSide * 3.4]);
      }
      a.wps.push(centerOf(to, f, a));
      if (to.kind.b === 'door') a.goingIn = true;
    }
    function rebuild() {
      // Is er iets weggehaald of bijgebouwd? Wie nu boven het niets staat, valt.
      // Bij een hele nieuwe stad begint iedereen gewoon opnieuw.
      if (peopleLocalEdit) {
        for (const a of agents) {
          if (a.state !== 'walk' && a.state !== 'pause') continue;
          if (a.y - groundAt(a.x, a.z, a.y) > 0.8) startRagdoll(a, 0, 0, 0);
        }
      } else for (const a of agents) if (a.state === 'rag' || a.state === 'getup') { a.rag = null; a.gu = null; a.node = null; a.state = 'walk'; }
      const wholeNew = !peopleLocalEdit;
      peopleLocalEdit = false;
      graph = buildWalkGraph();
      nodeList = [...graph.values()];
      doorList = nodeList.filter(n => n.kind.b === 'door');
      // bewoners en werkers: hoe meer huizen en kantoren, hoe drukker op straat (plus een paar wandelaars)
      const pop = cityCounts();
      const vLen = cars.vecGraph().totalLen;   // getekende wegen tellen mee per lengte
      const want = Math.min(8, nodeList.length * 0.05 + vLen / 40) + pop.homes * 1.6 + pop.offices * 1.2;
      const target = on ? Math.min(MAX, Math.round(Math.min(want, nodeList.length * 0.8 + vLen / 20))) : 0;
      for (const a of agents) {   // wie op een verdwenen plek stond (of: een hele nieuwe stad), begint ergens anders opnieuw
        const n = a.node && graph.get(a.node.key);
        if (!n || wholeNew) { if (nodeList.length) place(a, pick(nodeList), false); continue; }
        a.node = n; a.prev = a.prev && graph.get(a.prev.key) || null;
      }
      while (agents.length > target) agents.pop();
      while (agents.length < target && nodeList.length) agents.push(newAgent());
    }
    // Skelet: wortel → bekken → dij → scheen → voet; bekken → borst → schouder → bovenarm → onderarm → hand;
    // borst → nek → hoofd. Een pose is een set matrices, uit de loopanimatie of uit de ragdoll.
    const T = new THREE.Matrix4(), B = new THREE.Matrix4(), M = new THREE.Matrix4();
    const mk4 = () => new THREE.Matrix4();
    const pose = { pelvis: mk4(), chest: mk4(), neck: mk4(), head: mk4(), thigh: [mk4(), mk4()], shin: [mk4(), mk4()], shoe: [mk4(), mk4()], upperArm: [mk4(), mk4()], foreArm: [mk4(), mk4()], hand: [mk4(), mk4()] };
    const cnt = {}, owner = {}, dirtyCol = {};
    for (const k in meshes) owner[k] = [];
    let curId = 0;
    function put(name, m, color) {
      const mesh = meshes[name], i = cnt[name]++;
      mesh.setMatrixAt(i, m);
      const key = curId + color;   // kleur alleen zetten als er een ander mens (of andere kleur) op deze plek staat
      if (owner[name][i] !== key) { owner[name][i] = key; col.set(color); mesh.setColorAt(i, col); dirtyCol[name] = true; }
    }
    const tr = (x, y, z) => T.makeTranslation(x, y, z);
    const VH = new THREE.Vector3(), VF = new THREE.Vector3(), VK = new THREE.Vector3(), VU = new THREE.Vector3(), VN = new THREE.Vector3(), VFw = new THREE.Vector3(), VKf = new THREE.Vector3();
    const BX = new THREE.Vector3(), BY = new THREE.Vector3(), BZ = new THREE.Vector3();
    function boneTo(m, A, Bp, fwd, s) {   // bot van A naar Bp (geometrie hangt langs -y), knie/elleboog-richting = fwd
      BY.subVectors(A, Bp).normalize();
      BZ.copy(fwd).addScaledVector(BY, -fwd.dot(BY));
      if (BZ.lengthSq() < 1e-6) BZ.set(0, 0, 1).addScaledVector(BY, -BY.z);
      BZ.normalize(); BX.crossVectors(BY, BZ);
      m.makeBasis(BX.multiplyScalar(s), BY.multiplyScalar(s), BZ.multiplyScalar(s)).setPosition(A);
    }
    function animPose(a) {
      if (!a.feet) initFeet(a);
      const sc = a.scale * (0.2 + 0.8 * a.fade), w = Math.min(1, a.spd / 1.0), idle = 1 - w;
      const [fx, fz] = fwdOf(a.heading), stepLen = a.stride * 0.4;
      VFw.set(fx, 0, fz);
      const fL = a.feet[0], fR = a.feet[1];
      const legDiff = ((fR.cx - fL.cx) * fx + (fR.cz - fL.cz) * fz) / Math.max(0.2, stepLen);   // >0: rechtervoet voor
      const ld = Math.max(-1.2, Math.min(1.2, legDiff));
      const idleSway = Math.sin(a.t * 0.9) * 0.012 * idle;
      M.makeRotationY(a.heading).setPosition(a.x, a.hipY, a.z).multiply(B.makeScale(sc, sc, sc));
      const PV = pose.pelvis;
      PV.copy(M).multiply(tr((a.sway + idleSway) / sc, 0, 0))
        .multiply(B.makeRotationY(-ld * 0.12))                       // heup draait mee met het voorste been
        .multiply(B.makeRotationZ(-a.sway / sc * 2.2));             // heup zakt aan de kant van het zwaaibeen
      // borst draait tegengesteld aan de heup; ouderen lopen iets voorovergebogen
      pose.chest.copy(PV).multiply(B.makeRotationY(ld * 0.24)).multiply(B.makeRotationZ(a.sway / sc * 1.5))
        .multiply(B.makeRotationX(a.lean + 0.035 * w)).multiply(B.makeScale(a.build, 1, 1));
      const CH = pose.chest, L1 = 0.44 * sc, L2 = 0.44 * sc;
      for (let si = 0; si < 2; si++) {
        const side = si ? 1 : -1, f = a.feet[si];
        // Benen: inverse kinematica van heup naar de echte voetpositie
        VH.set(side * 0.088 * a.build, -0.02, 0).applyMatrix4(PV);
        VF.set(f.cx, f.cy, f.cz);
        VU.subVectors(VF, VH); let dist = VU.length();
        if (dist > L1 + L2 - 1e-3) { VU.multiplyScalar((L1 + L2 - 1e-3) / dist); dist = L1 + L2 - 1e-3; VF.copy(VH).add(VU); }
        VU.normalize();
        const cosA = Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist))), sinA = Math.sqrt(1 - cosA * cosA);
        // knie wijst tussen de looprichting en de richting van de voet in: geen gedraaide benen na een bocht
        VKf.set(fx + Math.sin(f.h), 0, fz + Math.cos(f.h)); if (VKf.lengthSq() < 1e-4) VKf.copy(VFw); VKf.normalize();
        VN.copy(VKf).addScaledVector(VU, -VKf.dot(VU)).normalize();
        VK.copy(VH).addScaledVector(VU, L1 * cosA).addScaledVector(VN, L1 * sinA);   // knie buigt naar voren
        boneTo(pose.thigh[si], VH, VK, VKf, sc);
        boneTo(pose.shin[si], VK, VF, VKf, sc);
        // voet: plat neergezet; tijdens de zwaai eerst tenen omlaag (afzetten), dan tenen omhoog (hiel eerst landen)
        const pitch = f.swing ? (f.t < 0.55 ? 0.5 * Math.sin(Math.PI * f.t / 0.55) : -0.22 * Math.sin(Math.PI * (f.t - 0.55) / 0.45)) : 0;
        pose.shoe[si].makeRotationY(f.h).multiply(B.makeRotationX(pitch)).multiply(T.makeScale(sc, sc, sc)).setPosition(VF);
        // armen: tegengesteld aan de benen, elleboog buigt meer als de arm naar voren gaat
        const same = side > 0 ? ld : -ld, armRot = same * 0.38 * Math.min(1, w + 0.2);
        pose.upperArm[si].copy(CH).multiply(tr(side * 0.2, 0.495, -0.005)).multiply(B.makeScale(1 / a.build, 1, 1))
          .multiply(B.makeRotationZ(side * (0.09 + 0.02 * idle))).multiply(B.makeRotationX(armRot - 0.04));
        pose.foreArm[si].copy(pose.upperArm[si]).multiply(tr(0, -0.29, 0)).multiply(B.makeRotationX(-0.16 - Math.max(0, -armRot) * 0.7));
        pose.hand[si].copy(pose.foreArm[si]).multiply(tr(0, -0.265, 0)).multiply(B.makeRotationY(side * 0.4));
      }
      // hoofd blijft rustig: compenseert de borstdraai en kijkt af en toe om zich heen
      const look = Math.sin(a.lookPhase * 0.31) * Math.sin(a.lookPhase * 0.17) * (0.25 + 0.45 * idle);
      pose.neck.copy(CH).multiply(B.makeScale(1 / a.build, 1, 1)).multiply(tr(0, 0.545, 0.005)).multiply(B.makeRotationX(-a.lean * 0.7));
      pose.head.copy(pose.neck).multiply(tr(0, 0.165, 0.012)).multiply(B.makeRotationY(-ld * 0.2 + look)).multiply(B.makeRotationX(0.04 * w));
      if (a.kid) pose.head.multiply(B.makeScale(1.16, 1.16, 1.16));   // kinderen hebben naar verhouding een groter hoofd
    }
    function emit(a) {
      curId = a.id;
      const lower = a.dress ? a.dressCol : a.pants;
      put('hips', pose.pelvis, a.coat ? a.pants : lower);
      for (let si = 0; si < 2; si++) {
        put('thigh', pose.thigh[si], a.dress ? a.legs : a.pants);
        put('shin', pose.shin[si], a.legs);
        put('shoe', pose.shoe[si], a.shoes);
        put('upperArm', pose.upperArm[si], a.coat ? a.coatCol : a.shirt);
        put('foreArm', pose.foreArm[si], a.coat ? a.coatCol : a.shortSleeves ? a.skin : a.shirt);
        put('hand', pose.hand[si], a.skin);
      }
      put(a.female ? 'torsoF' : 'torsoM', pose.chest, a.dress ? a.dressCol : a.shirt);
      if (a.coat) put('coat', pose.chest, a.coatCol);
      if (a.dress) { M.copy(pose.pelvis).multiply(tr(0, 0.0, 0)); put('skirt', M, a.dressCol); }
      if (a.pack) { M.copy(pose.chest).multiply(tr(0, 0.33, -0.17)); put('pack', M, a.pack); }
      put('neck', pose.neck, a.skin);
      put('head', pose.head, a.skin);
      put('face', pose.head, '#ffffff');
      put('brows', pose.head, a.old ? a.hair : a.hair);
      if (a.hairStyle) put('hair' + a.hairStyle[0].toUpperCase() + a.hairStyle.slice(1), pose.head, a.hair);
    }

    // ---------- Ragdoll (Verlet-deeltjes met afstandsbeperkingen) ----------
    // 0 hoofd, 1 nek, 2 bekken, 3/4 schouders, 5/6 ellebogen, 7/8 handen, 9/10 heupen, 11/12 knieën, 13/14 voeten
    const NP = 15, RAD = [0.12, 0.07, 0.11, 0.07, 0.07, 0.05, 0.05, 0.05, 0.05, 0.07, 0.07, 0.06, 0.06, 0.06, 0.06];
    const TORSO = [1, 2, 3, 4, 9, 10];
    const LINKS = [[0, 1], [0, 3], [0, 4], [3, 5], [4, 6], [5, 7], [6, 8], [9, 11], [10, 12], [11, 13], [12, 14]];
    for (let i = 0; i < TORSO.length; i++) for (let j = i + 1; j < TORSO.length; j++) LINKS.push([TORSO[i], TORSO[j]]);   // romp blijft stijf
    const MINS = [[3, 7, 0.55], [4, 8, 0.55], [9, 13, 0.6], [10, 14, 0.6], [0, 2, 0.9]];   // armen en benen niet helemaal dubbelvouwen
    const MAX_RAG = window.matchMedia('(pointer: coarse)').matches ? 5 : 8, GRAV = -9.81, STEP = 1 / 60;   // op een telefoon minder tegelijk
    const V = new THREE.Vector3();
    const origin = (m, out, o) => { out[o] = m.elements[12]; out[o + 1] = m.elements[13]; out[o + 2] = m.elements[14]; };
    function groundAt(x, z, y) {   // hoogste vloer onder dit punt (water = 1,3 m onder straatniveau)
      let best = null;
      for (const c of nearby(x, z)) for (const s2 of c.surfaces) {
        const t = surfTop(s2, x, z);
        if (t !== null && t <= y + 0.3 && (best === null || t > best)) best = t;
      }
      if (best !== null) return best;
      { const v = vecFloor(x, z); if (v > 0) return v; }
      const [q, r] = worldToCell(x, z);
      return baseOf(stackOf(q, r)[0]) === 'water' ? -1.3 : 0;
    }
    function inSolid(x, z, y) {
      for (const c of nearby(x, z)) for (const s2 of c.surfaces) {
        if (s2.bottom === undefined || s2.kind === 'ramp') continue;
        const t = surfTop(s2, x, z);
        if (t !== null && s2.bottom < y - 0.02 && y < t - 0.35) return true;
      }
      return false;
    }
    function startRagdoll(a, vx, vy, vz, lift = 0) {
      // Te veel tegelijk aan het vallen? Dan bevriest de oudste waar hij ligt (hij blijft gewoon liggen)
      const ragging = agents.filter(o => o.state === 'rag' && !o.rag.frozen);
      if (ragging.length >= MAX_RAG) ragging.sort((p1, p2) => p2.rag.t - p1.rag.t)[0].rag.frozen = true;
      animPose(a);
      const p = new Float32Array(NP * 3), q = new Float32Array(NP * 3);
      origin(pose.head, p, 0); origin(pose.neck, p, 3); origin(pose.pelvis, p, 6);
      for (let si = 0; si < 2; si++) {
        origin(pose.upperArm[si], p, (3 + si) * 3); origin(pose.foreArm[si], p, (5 + si) * 3); origin(pose.hand[si], p, (7 + si) * 3);
        origin(pose.thigh[si], p, (9 + si) * 3); origin(pose.shin[si], p, (11 + si) * 3); origin(pose.shoe[si], p, (13 + si) * 3);
      }
      for (let i = 0; i < NP; i++) {
        p[i * 3 + 1] += lift;
        // iets meer snelheid bovenin: dan kantelt het lichaam
        const top = (p[i * 3 + 1] - p[6 + 1]) * 0.6;
        q[i * 3] = p[i * 3] - (vx * (1 + top)) * STEP; q[i * 3 + 1] = p[i * 3 + 1] - vy * STEP; q[i * 3 + 2] = p[i * 3 + 2] - (vz * (1 + top)) * STEP;
      }
      const rest = LINKS.map(([i, j]) => Math.hypot(p[i * 3] - p[j * 3], p[i * 3 + 1] - p[j * 3 + 1], p[i * 3 + 2] - p[j * 3 + 2]));
      const mins = MINS.map(([i, j, f]) => f * Math.hypot(p[i * 3] - p[j * 3], p[i * 3 + 1] - p[j * 3 + 1], p[i * 3 + 2] - p[j * 3 + 2]));
      // hoe hard de klap, hoe langer iemand blijft liggen: 6 tot 14 seconden
      const hit = Math.hypot(vx, vy, vz);
      a.rag = { p, q, rest, mins, acc: 0, still: 0, t: 0, wet: false, frozen: false, lie: 6 + Math.min(5, hit * 0.45) + Math.random() * 3 };
      a.state = 'rag'; a.goingIn = false; a.wps = []; a.fade = 1;
    }
    function ragStep(a) {
      const R2 = a.rag, p = R2.p, q = R2.q;
      let maxV = 0, hardHit = 0;
      for (let i = 0; i < NP; i++) {   // integreren
        const o = i * 3;
        const wet = groundAt(p[o], p[o + 2], p[o + 1]) <= -1.29 && p[o + 1] < -1.0;
        const damp = wet ? 0.9 : 0.995;
        const vx = (p[o] - q[o]) * damp, vy = (p[o + 1] - q[o + 1]) * damp, vz = (p[o + 2] - q[o + 2]) * damp;
        q[o] = p[o]; q[o + 1] = p[o + 1]; q[o + 2] = p[o + 2];
        p[o] += vx; p[o + 1] += vy + (wet ? 2.5 : GRAV) * STEP * STEP; p[o + 2] += vz;   // in het water blijf je drijven
        if (wet) R2.wet = true;
        maxV = Math.max(maxV, Math.hypot(vx, vy, vz) / STEP);
      }
      for (let it = 0; it < 6; it++) {   // beperkingen
        for (let k = 0; k < LINKS.length; k++) {
          const [i, j] = LINKS[k], oi = i * 3, oj = j * 3;
          const dx = p[oj] - p[oi], dy = p[oj + 1] - p[oi + 1], dz = p[oj + 2] - p[oi + 2];
          const d = Math.hypot(dx, dy, dz) || 1e-6, f = (d - R2.rest[k]) / d * 0.5;
          p[oi] += dx * f; p[oi + 1] += dy * f; p[oi + 2] += dz * f;
          p[oj] -= dx * f; p[oj + 1] -= dy * f; p[oj + 2] -= dz * f;
        }
        for (let k = 0; k < MINS.length; k++) {
          const [i, j] = MINS[k], oi = i * 3, oj = j * 3;
          const dx = p[oj] - p[oi], dy = p[oj + 1] - p[oi + 1], dz = p[oj + 2] - p[oi + 2];
          const d = Math.hypot(dx, dy, dz) || 1e-6;
          if (d >= R2.mins[k]) continue;
          const f = (d - R2.mins[k]) / d * 0.5;
          p[oi] += dx * f; p[oi + 1] += dy * f; p[oi + 2] += dz * f;
          p[oj] -= dx * f; p[oj + 1] -= dy * f; p[oj + 2] -= dz * f;
        }
      }
      for (let i = 0; i < NP; i++) {   // botsingen met vloer, massieve blokken en muren
        const o = i * 3, r = RAD[i] * a.scale;
        if (inSolid(p[o], p[o + 2], p[o + 1])) { p[o] = q[o]; p[o + 2] = q[o + 2]; }
        const g = groundAt(p[o], p[o + 2], p[o + 1]);
        if (p[o + 1] < g + r) {
          const vdown = Math.max(0, q[o + 1] - p[o + 1]);
          hardHit = Math.max(hardHit, vdown / STEP);
          p[o + 1] = g + r;
          q[o + 1] = p[o + 1] - vdown * 0.2;   // klein stuitertje
          q[o] = p[o] - (p[o] - q[o]) * 0.75; q[o + 2] = p[o + 2] - (p[o + 2] - q[o + 2]) * 0.75;   // wrijving
        }
        for (const c of nearby(p[o], p[o + 2])) for (const w2 of c.walls) {
          if (w2.quay || p[o + 1] < w2.y0 || p[o + 1] > w2.y1) continue;   // over de kade kun je de gracht in vallen
          const dx = w2.bx - w2.ax, dz = w2.bz - w2.az, l2 = dx * dx + dz * dz;
          const t = l2 ? Math.max(0, Math.min(1, ((p[o] - w2.ax) * dx + (p[o + 2] - w2.az) * dz) / l2)) : 0;
          const cx = w2.ax + t * dx, cz = w2.az + t * dz, ex = p[o] - cx, ez = p[o + 2] - cz, d = Math.hypot(ex, ez), min = w2.half + r;
          if (d < min && d > 1e-6) { p[o] = cx + ex / d * min; p[o + 2] = cz + ez / d * min; }
        }
      }
      if (hardHit > 3.5) sound.impact(Math.min(1, hardHit / 12), p[6], p[7], p[8], R2.wet);
      return maxV;
    }
    function ragPose(a) {   // matrices uit de deeltjes
      const p = a.rag.p, s = a.scale;
      const P = i => V.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      const pel = new THREE.Vector3().copy(P(2)), nek = new THREE.Vector3().copy(P(1));
      const yA = nek.clone().sub(pel).normalize();
      const xA = new THREE.Vector3(p[12] - p[9], p[13] - p[10], p[14] - p[11]);   // linkerschouder → rechterschouder
      xA.addScaledVector(yA, -xA.dot(yA)).normalize();   // haaks op de ruggengraat en lengte 1, anders krimpt de romp
      const zA = new THREE.Vector3().crossVectors(xA, yA);
      pose.pelvis.makeBasis(xA.clone().multiplyScalar(s), yA.clone().multiplyScalar(s), zA.clone().multiplyScalar(s)).setPosition(pel);
      pose.chest.copy(pose.pelvis).multiply(B.makeScale(a.build, 1, 1));
      const bone = (m, ia, ib, at) => {   // bot van deeltje ia naar ib, met de voorkant van de romp als richtlijn
        const y = new THREE.Vector3(p[ia * 3] - p[ib * 3], p[ia * 3 + 1] - p[ib * 3 + 1], p[ia * 3 + 2] - p[ib * 3 + 2]).normalize();
        const z = zA.clone().addScaledVector(y, -zA.dot(y));
        if (z.lengthSq() < 1e-6) z.copy(xA).cross(y);
        z.normalize();
        const x = new THREE.Vector3().crossVectors(y, z);
        const k = at === undefined ? ia : at;
        m.makeBasis(x.multiplyScalar(s), y.multiplyScalar(s), z.multiplyScalar(s)).setPosition(p[k * 3], p[k * 3 + 1], p[k * 3 + 2]);
      };
      for (let si = 0; si < 2; si++) {
        bone(pose.thigh[si], 9 + si, 11 + si); bone(pose.shin[si], 11 + si, 13 + si); bone(pose.shoe[si], 11 + si, 13 + si, 13 + si);
        bone(pose.upperArm[si], 3 + si, 5 + si); bone(pose.foreArm[si], 5 + si, 7 + si); bone(pose.hand[si], 5 + si, 7 + si, 7 + si);
      }
      bone(pose.neck, 0, 1, 1);   // y wijst van nek naar hoofd
      bone(pose.head, 0, 1, 0);
      if (a.kid) pose.head.multiply(B.makeScale(1.16, 1.16, 1.16));   // zelfde hoofdmaat als tijdens het lopen
    }
    // Ragdoll opnieuw laten beginnen vanaf de huidige houding (bijvoorbeeld iemand die net aan het opstaan is)
    function ragFrom(a, p0, ref) {
      const src = ref || p0, dd = (A, i, j) => Math.hypot(A[i * 3] - A[j * 3], A[i * 3 + 1] - A[j * 3 + 1], A[i * 3 + 2] - A[j * 3 + 2]);
      const active = agents.filter(o => o !== a && o.state === 'rag' && !o.rag.frozen);
      if (active.length >= MAX_RAG) active.sort((p1, p2) => p2.rag.t - p1.rag.t)[0].rag.frozen = true;
      a.rag = { p: new Float32Array(p0), q: new Float32Array(p0), rest: LINKS.map(([i, j]) => dd(src, i, j)), mins: MINS.map(([i, j, f]) => f * dd(src, i, j)),
        acc: 0, still: 0, t: 0, wet: false, frozen: false, lie: 6 + Math.random() * 4 };
      a.state = 'rag'; a.gu = null; a.goingIn = false; a.wps = []; a.fade = 1;
    }
    // Iets (een auto) duwt tegen een liggend of opstaand lichaam: de geraakte delen krijgen die snelheid mee
    function kick(a, test, vx, vy, vz) {
      if (a.state === 'getup') ragFrom(a, a.rag.p, a.gu && a.gu.stand);
      if (a.state !== 'rag') return false;
      const R2 = a.rag; let hit = false;
      for (let i = 0; i < NP; i++) {
        const o = i * 3;
        if (!test(R2.p[o], R2.p[o + 2], R2.p[o + 1])) continue;
        hit = true;
        R2.q[o] = R2.p[o] - vx * STEP; R2.q[o + 1] = R2.p[o + 1] - vy * STEP; R2.q[o + 2] = R2.p[o + 2] - vz * STEP;
      }
      if (hit) {
        if (R2.frozen) {   // wakker worden; als er te veel bewegen, bevriest een ander
          R2.frozen = false;
          const active = agents.filter(o => o !== a && o.state === 'rag' && !o.rag.frozen);
          if (active.length >= MAX_RAG) active.sort((p1, p2) => p2.rag.t - p1.rag.t)[0].rag.frozen = true;
        }
        R2.still = 0; R2.t = Math.min(R2.t, 1);
      }
      return hit;
    }
    function standUp(a) {
      const R2 = a.rag, p = R2.p;
      a.rag = null;
      const px = p[6], pz = p[8], py = p[7];
      if (R2.wet) { a.state = 'inside'; a.timer = 3 + Math.random() * 4; return; }   // uit de gracht geklommen, ergens anders verder
      // dichtstbijzijnde punt van het netwerk op ongeveer deze hoogte
      let best = null, bd = 1e9;
      const gy = groundAt(px, pz, py);
      const crossesWater = (x1, z1, x2, z2) => {
        for (let i = 1; i <= 8; i++) { const t = i / 8, [q, r] = worldToCell(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t); if (baseOf(stackOf(q, r)[0]) === 'water' && stackOf(q, r).length === 1) return true; }
        return false;
      };
      for (const n of nodeList) {
        if (Math.abs(n.y - gy) > 1.2) continue;
        const c = cellToWorld(n.q, n.r), d = Math.hypot(c.x - px, c.z - pz);
        if (d > 16 || crossesWater(px, pz, c.x, c.z)) continue;
        if (d < bd) { bd = d; best = n; }
      }
      if (!best || bd > 16) { a.state = 'inside'; a.timer = 2 + Math.random() * 3; return; }
      // Overeind komen: eerst op handen en knieën, even bijkomen, dan rechtop (3 s), daarna loopt hij verder.
      // Hij staat op boven zijn voeten en kijkt de kant op waar zijn hoofd lag.
      const fmx = (p[39] + p[42]) / 2, fmz = (p[41] + p[44]) / 2;
      const hh = Math.atan2(p[0] - fmx, p[2] - fmz);
      a.heading = Number.isFinite(hh) ? hh : (a.heading || 0);
      a.x = fmx; a.z = fmz; a.y = gy; a.spd = 0; a.walkAmt = 0; a.fade = 1;
      initFeet(a); animPose(a);
      const stand = new Float32Array(NP * 3);
      origin(pose.head, stand, 0); origin(pose.neck, stand, 3); origin(pose.pelvis, stand, 6);
      for (let si = 0; si < 2; si++) {
        origin(pose.upperArm[si], stand, (3 + si) * 3); origin(pose.foreArm[si], stand, (5 + si) * 3); origin(pose.hand[si], stand, (7 + si) * 3);
        origin(pose.thigh[si], stand, (9 + si) * 3); origin(pose.shin[si], stand, (11 + si) * 3); origin(pose.shoe[si], stand, (13 + si) * 3);
      }
      const [fx, fz] = fwdOf(a.heading), sc = a.scale, kneel = new Float32Array(stand);
      for (let i = 0; i < NP; i++) kneel[i * 3 + 1] = gy + (stand[i * 3 + 1] - gy) * 0.5;
      for (const i of [11, 12]) { kneel[i * 3] += fx * 0.32 * sc; kneel[i * 3 + 2] += fz * 0.32 * sc; kneel[i * 3 + 1] = gy + 0.1 * sc; }   // knieën op de grond
      for (const i of [7, 8]) { kneel[i * 3] += fx * 0.42 * sc; kneel[i * 3 + 2] += fz * 0.42 * sc; kneel[i * 3 + 1] = gy + 0.06 * sc; }   // handen steunen
      for (const i of [5, 6]) { kneel[i * 3] += fx * 0.36 * sc; kneel[i * 3 + 2] += fz * 0.36 * sc; kneel[i * 3 + 1] = gy + 0.32 * sc; }   // ellebogen erboven
      for (const i of [0, 1, 3, 4]) { kneel[i * 3] += fx * 0.25 * sc; kneel[i * 3 + 2] += fz * 0.25 * sc; }                               // voorovergebogen
      a.gu = { t: 0, from: new Float32Array(p), kneel, stand, node: best };
      a.rag = { p: new Float32Array(p) };
      a.state = 'getup';
    }
    function render() {
      for (const k in meshes) cnt[k] = 0;
      for (const a of agents) {
        if (a.state === 'inside') continue;
        if (a.state === 'rag' || a.state === 'getup') ragPose(a); else animPose(a);
        emit(a);
      }
      for (const k in meshes) { const m = meshes[k]; m.count = cnt[k]; m.instanceMatrix.needsUpdate = true; if (dirtyCol[k]) { m.instanceColor.needsUpdate = true; dirtyCol[k] = false; } }
    }
    let lastPX = 0, lastPZ = 0, lastMode = '';
    return {
      agents,
      // Door een auto geraakt
      hit(a, vx, vz) { if (a.state === 'walk' || a.state === 'pause') startRagdoll(a, vx, 2.2 + Math.hypot(vx, vz) * 0.25, vz, 0.05); },
      kick,
      // bekken van iemand die ligt of aan het opstaan is (voor auto's die moeten remmen)
      lying() { return agents.filter(a => (a.state === 'rag' || a.state === 'getup') && a.rag); },
      get on() { return on; },
      get count() { return agents.length; },
      setOn(v) { on = v; label(); try { localStorage.setItem('hexstad-mensen', on ? '1' : '0'); } catch (e) {} peopleDirty = true; },
      // Staat er iemand in de weg? (de speler loopt niet door mensen heen, behalve als je rent: dan val je ze omver)
      blocks(x, z, y) {
        for (const a of agents) {
          if ((a.state !== 'walk' && a.state !== 'pause') || a.fade < 0.6) continue;
          if (Math.abs(a.y - y) < 1.2 && Math.hypot(a.x - x, a.z - z) < 0.45 * a.scale + 0.05) return true;
        }
        return false;
      },
      // Een blok op iemand gezet: die wordt weggeslingerd
      onPlaced(q, r, y0, y1) {
        const c = cellToWorld(q, r);
        for (const a of agents) {
          if (a.state === 'inside' || a.state === 'rag' || a.state === 'getup') continue;
          const [aq, ar] = worldToCell(a.x, a.z);
          if (aq !== q || ar !== r || a.y < y0 - 0.3 || a.y > y1) continue;
          let dx = a.x - c.x, dz = a.z - c.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
          startRagdoll(a, dx * (4 + Math.random() * 3), 5 + Math.random() * 3, dz * (4 + Math.random() * 3), y1 - a.y + 0.2);
        }
      },
      update(dt) {
        if (peopleDirty) { peopleDirty = false; rebuild(); }
        if (!agents.length) { for (const k in meshes) meshes[k].count = 0; return; }
        dt = Math.min(dt, 0.1);
        // snelheid van de speler, om te bepalen of je iemand opzij duwt of omver loopt
        const walking = mode === 'walk' && lastMode === 'walk';
        const pvx = walking ? (player.x - lastPX) / dt : 0, pvz = walking ? (player.z - lastPZ) / dt : 0, pSpeed = Math.hypot(pvx, pvz);
        lastPX = player.x; lastPZ = player.z; lastMode = mode;
        // raster van wie waar staat, voor het ontwijken (de speler telt mee)
        const grid = new Map();
        const addG = o => { const k = Math.floor(o.x / 2) + ',' + Math.floor(o.z / 2); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(o); };
        for (const a of agents) if (a.state === 'walk' || a.state === 'pause') { a.moving = a.spd > 0.2; addG(a); }
        if (mode === 'walk') addG({ x: player.x, z: player.z, y: player.y, heading: player.yaw + Math.PI, spd: pSpeed, moving: pSpeed > 0.3 });
        for (const a of agents) {
          curA = a;
          a.t += dt; a.lookPhase += dt;
          if (a.fade < 1) a.fade = Math.min(1, a.fade + dt * 1.5);
          if (a.state === 'inside') { a.timer -= dt; if (a.timer <= 0 && nodeList.length) { const n = doorList.length ? pick(doorList) : pick(nodeList); place(a, n, true); } continue; }
          if (a.state === 'getup') {
            const G2 = a.gu; G2.t += dt;
            // 1 s overeind op handen en knieën, 0,8 s even zo blijven zitten, 1,2 s rechtop komen
            const T = Math.min(1, G2.t / 3.0), sm = x => x * x * (3 - 2 * x);
            const [A, B2, k] = T < 0.33 ? [G2.from, G2.kneel, sm(T / 0.33)] : T < 0.6 ? [G2.kneel, G2.kneel, 1] : [G2.kneel, G2.stand, sm((T - 0.6) / 0.4)];
            for (let i = 0; i < NP * 3; i++) a.rag.p[i] = A[i] + (B2[i] - A[i]) * k;
            if (T >= 1) { a.rag = null; a.gu = null; a.node = G2.node; a.prev = null; a.wps = [centerOf(G2.node, null, a)]; a.state = 'walk'; initFeet(a); }
            continue;
          }
          if (a.state === 'rag') {
            const R2 = a.rag; R2.acc += dt; R2.t += dt;
            let v = 0;
            if (R2.frozen) R2.acc = 0; else while (R2.acc >= STEP) { v = ragStep(a); R2.acc -= STEP; }
            R2.still = v < 0.35 ? R2.still + dt : 0;
            // eerst uitrollen, dan een flinke tijd blijven liggen (bijkomen), dan pas opstaan
            if (R2.still > R2.lie || R2.t > R2.lie + 8) standUp(a);
            continue;
          }
          // tegen de speler aan?
          if (walking) {
            const dx = a.x - player.x, dz = a.z - player.z, d = Math.hypot(dx, dz);
            if (d < 0.6 && Math.abs(a.y - player.y) < 1.2) {
              if (pSpeed > 3) { startRagdoll(a, pvx * 0.9 + dx / (d || 1) * 0.5, 1.6 + pSpeed * 0.25, pvz * 0.9 + dz / (d || 1) * 0.5); sound.grunt(a.x, 0.9, a.z, Math.min(1, pSpeed / 8)); continue; }
              // rustig: ze stappen zijwaarts uit je looplijn (rechts of links, wat het dichtst bij is)
              const pl = Math.hypot(pvx, pvz) || 1, lx = -pvz / pl, lz = pvx / pl;
              const sideS = (dx * lx + dz * lz) >= 0 ? 1 : -1;
              const ux = lx * sideS * 0.85 + dx / (d || 1) * 0.35, uz = lz * sideS * 0.85 + dz / (d || 1) * 0.35, ul = Math.hypot(ux, uz) || 1;
              const push = Math.min(0.6 - d + 0.1, dt * 1.6);
              a.x += ux / ul * push; a.z += uz / ul * push;
            }
          }
          if (a.state === 'pause') {
            a.timer -= dt; a.spd = Math.max(0, a.spd - dt * 3); a.walkAmt = Math.max(0, a.walkAmt - dt * 3);
            { const fy = floorFor(a.x, a.z, a.y); if (a.y - fy > 0.8) { startRagdoll(a, 0, 0, 0); continue; } a.y += (fy - a.y) * Math.min(1, dt * 14); }
            stepFeet(a, dt);
            if (a.timer <= 0) a.state = 'walk';
            continue;
          }
          if (!a.wps.length) {
            if (a.goingIn) { a.state = 'inside'; a.timer = 4 + Math.random() * 10; a.goingIn = false; continue; }
            const k = a.node.kind;
            if ((k.b === 'hof' || (k.b === 'looppad' && a.node.edges.size >= 3) || k.level === 'high') && Math.random() < 0.18) { a.state = 'pause'; a.timer = 2 + Math.random() * 5; }
            go(a, chooseNext(a));
            continue;
          }
          // Vloeiend sturen: vooruitkijken naar het volgende punt, afremmen in scherpe bochten, op de plek draaien
          if (a.fade > 0.5) separate(a, grid);
          let [tx, tz] = a.wps[0];
          const d0 = Math.hypot(tx - a.x, tz - a.z);
          // geen vooruitgang (staat er iemand op dat punt?) → punt overslaan en doorlopen
          if (d0 < (a.prog ? a.prog.d - 0.05 : 1e9)) a.prog = { d: d0, t: 0 }; else a.prog.t += dt;
          if (d0 < (a.precise ? 0.22 : 0.5) || (a.prog.t > 1.5 && d0 < 3) || a.prog.t > 5) { a.wps.shift(); a.prog = null; continue; }
          if (!a.precise && a.wps.length > 1 && d0 < 1.6) { const [nx, nz] = a.wps[1], k = (1 - d0 / 1.6) * 0.65; tx += (nx - tx) * k; tz += (nz - tz) * k; }
          if (!a.precise) { avoidance(a, dt, grid); const [rx, rz] = rightOf(a.heading); tx += rx * a.avoid; tz += rz * a.avoid; }
          else { a.avoid *= 0.9; a.follow = 1; }
          const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz) || 1e-6;
          let err = Math.atan2(dx, dz) - a.heading; err = Math.atan2(Math.sin(err), Math.cos(err));
          a.heading += Math.sign(err) * Math.min(Math.abs(err), dt * (a.spd < 0.3 ? 3.6 : 2.5));   // niet sneller draaien dan de voeten bijhouden
          a.heading = Math.atan2(Math.sin(a.heading), Math.cos(a.heading));
          const align = Math.cos(Math.min(Math.abs(err), Math.PI / 2));
          const want = a.speed * Math.max(0, (align - 0.35) / 0.65) * (a.follow || 1) * (a.precise ? 0.85 : 1);
          a.spd += (want - a.spd) * Math.min(1, dt * (want > a.spd ? 2.5 : 5));
          const step = Math.min(d, a.spd * dt), [fx, fz] = fwdOf(a.heading);
          // oversteken: niet de rijbaan op als er een auto aankomt
          if (a.y >= 0.2 && typeof cars !== 'undefined' && cars.list.length) {
            const nx = a.x + fx * 0.6, nz = a.z + fz * 0.6;
            // na een paar seconden wachten toch oversteken: de auto's stoppen dan voor je
            if ((a.carWait || 0) < 4 && floorFor(nx, nz, a.y) < 0.2 && cars.approaching(nx, nz)) { a.carWait = (a.carWait || 0) + dt; a.spd = Math.max(0, a.spd - dt * 6); a.prog = null; stepFeet(a, dt); continue; }
            if (a.y >= 0.2 && floorFor(nx, nz, a.y) >= 0.2) a.carWait = 0;
          }
          a.x += fx * step; a.z += fz * step;
          a.walkAmt = Math.min(1, a.spd / 1.0);
          const fy = floorFor(a.x, a.z, a.y);
          if (a.y - fy > 0.8) { startRagdoll(a, Math.sin(a.heading) * a.spd, 0, Math.cos(a.heading) * a.spd); continue; }   // geen grond meer onder je: vallen
          a.y += (fy - a.y) * Math.min(1, dt * 14);
          stepFeet(a, dt);
          if (a.goingIn && a.wps.length === 1) a.fade = Math.max(0, Math.min(a.fade, d0 / 2.5));   // verdwijnt in de deuropening
        }
        render();
      },
    };
  })();

