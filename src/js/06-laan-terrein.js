  // ---------- Laan: vormen ----------
  // Alles wordt uit rechte stroken gesneden: zeshoek ∩ strook (p0..p1) geeft convexe stukken, en de aansluitingen
  // van zijstraten worden er als convexe vormen uit weggeknipt. Elk stuk wordt een plaat met eigen hoogte:
  // stoep 25 cm, fietspad 17 cm, parkeerstrook en rijbaan 12 cm, middenberm 25 cm met gras en bomen.
  M.fiets = std({ color: '#a24a3c', roughness: 0.95 });
  M.laanAsph = std({ color: COL.asphalt, roughness: 0.95 });
  M.mark = std({ color: COL.mark, roughness: 0.7 });
  M.fietsX = std({ color: '#a24a3c', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });   // fietspad loopt in rood door over de zijstraat
  M.parkPaver = (() => {   // grijze klinkers in de parkeerstrook
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), bw = 128 / 3, bh = 128 / 6;
    g.fillStyle = '#5d5b57'; g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 6; row++) for (let i = -1; i < 4; i++) {
      const x = i * bw + (row % 2) * bw / 2, v = Math.abs(Math.sin(i * 53.1 + row * 17.9) * 4375.85) % 1;
      g.fillStyle = `hsl(35, ${4 + v * 4}%, ${44 + v * 9}%)`;
      g.fillRect(x + 1.2, row * bh + 1.2, bw - 2.4, bh - 2.4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.6, 1 / 0.6); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.95 });
  })();
  const polyArea = P => { let a = 0; for (let i = 0; i < P.length; i++) { const [x1, z1] = P[i], [x2, z2] = P[(i + 1) % P.length]; a += x1 * z2 - x2 * z1; } return a / 2; };
  const HEX_PLANES = FRAMES.map(f => [f.nx, f.nz, INNER, false]);
  function clipAll(poly, planes) {
    let P = poly;
    for (const [nx, nz, c, above] of planes) { if (P.length < 3) return []; P = clipHalf(P, nx, nz, c, above); }
    return P.length >= 3 && Math.abs(polyArea(P)) > 2e-3 ? P : [];
  }
  // convex stuk min convexe vorm → convexe stukken
  function cutConvex(subj, cut) {
    const out = [], ccw = polyArea(cut) > 0;
    let rest = subj;
    for (let i = 0; i < cut.length && rest.length >= 3; i++) {
      const A = cut[i], B = cut[(i + 1) % cut.length];
      let nx = -(B[1] - A[1]), nz = B[0] - A[0];
      if (!ccw) { nx = -nx; nz = -nz; }
      const l = Math.hypot(nx, nz); if (l < 1e-9) continue;
      nx /= l; nz /= l;
      const c = A[0] * nx + A[1] * nz;
      const outside = clipHalf(rest, nx, nz, c, false);
      if (outside.length >= 3 && Math.abs(polyArea(outside)) > 2e-3) out.push(outside);
      rest = clipHalf(rest, nx, nz, c, true);
    }
    return out;
  }
  const cutAll = (pieces, cuts) => cuts.reduce((ps, c) => ps.flatMap(p => cutConvex(p, c)), pieces.filter(p => p.length >= 3));
  function convexHull(pts) {
    const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-9) lo.pop(); lo.push(p); }
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 1e-9) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1));
  }
  // Convexe stukken → plaat: bovenvlak (eigen materiaal) en zijkanten (band of asfaltrand), los van elkaar
  function slabGeos(pieces, h, withSides = true) {
    const top = [], uv = [], side = [];
    for (const P of pieces) {
      for (let i = 1; i + 1 < P.length; i++) {
        const a = P[0], b = P[i], c = P[i + 1];
        const ny = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
        for (const [x, z] of (ny >= 0 ? [a, b, c] : [a, c, b])) { top.push(x, h, z); uv.push(x, -z); }
      }
      if (!withSides) continue;
      let mx = 0, mz = 0; for (const [x, z] of P) { mx += x; mz += z; } mx /= P.length; mz /= P.length;
      for (let i = 0; i < P.length; i++) {
        let A = P[i], B = P[(i + 1) % P.length];
        const ex = B[0] - A[0], ez = B[1] - A[1];
        if (Math.hypot(ex, ez) < 1e-4) continue;
        if (-ez * ((A[0] + B[0]) / 2 - mx) + ex * ((A[1] + B[1]) / 2 - mz) < 0) [A, B] = [B, A];
        side.push(A[0], 0, A[1], B[0], 0, B[1], B[0], h, B[1], A[0], 0, A[1], B[0], h, B[1], A[0], h, A[1]);
      }
    }
    const mk = (arr, uvs) => {
      if (!arr.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs || new Array(arr.length / 3 * 2).fill(0), 2));
      g.computeVertexNormals(); g.computeBoundingSphere();
      return g;
    };
    return { top: mk(top, uv), side: mk(side) };
  }
  const laanGeoCache = new Map();
  // Vorm van één laanvak (alles in lokale coördinaten, gedeeld tussen vakken met dezelfde situatie)
  function laanShape(I, sig) {
    if (laanGeoCache.has(sig)) return laanGeoCache.get(sig);
    const G = I.G, n = G.n, f = G.f;
    const Pof = (x, z) => x * n[0] + z * n[1] + 4.5;
    const L = (tt, p) => [f[0] * tt + n[0] * (p - 4.5), f[1] * tt + n[1] * (p - 4.5)];
    const band = (p0, p1, extra = []) => clipAll(HEX_PTS, [[n[0], n[1], p0 - 4.5, true], [n[0], n[1], p1 - 4.5, false], ...extra]);
    const halfF = [f[0], f[1], 0, true], halfB = [f[0], f[1], 0, false];
    // Zijstraten: een trechter van asfalt van de rand tot de rijbaan, en de stoepen van de zijstraat tot de stoep van de laan
    const hulls = [], walksRaw = [];
    for (let O = 0; O < 6; O++) {
      if (!((I.arms >> O) & 1)) continue;
      const fo = FRAMES[O], nO = [fo.nx, fo.nz], tO = [fo.tx, fo.tz], M0 = [nO[0] * INNER, nO[1] * INNER];
      const dn = nO[0] * n[0] + nO[1] * n[1];
      const atP = (u, p) => {
        const bx = M0[0] + tO[0] * u, bz = M0[1] + tO[1] * u, sAl = (Pof(bx, bz) - p) / dn;
        return [bx - nO[0] * sAl, bz - nO[1] * sAl];
      };
      const out = (u) => [M0[0] + tO[0] * u + nO[0] * 0.05, M0[1] + tO[1] * u + nO[1] * 0.05];
      const hp = convexHull([out(-2.5), out(2.5), atP(-2.5, 0.6), atP(2.5, 0.6), atP(-6.2, LAAN.park + 0.1), atP(6.2, LAAN.park + 0.1)]);
      const h = clipAll(hp, [...HEX_PLANES, [n[0], n[1], LAAN.park - 4.5, false]]);
      if (h.length) hulls.push(h);
      const w = clipAll(HEX_PTS, [[tO[0], tO[1], -4.5, true], [tO[0], tO[1], 4.5, false], [n[0], n[1], -4.5, false]]);
      if (w.length) walksRaw.push(w);
    }
    const seq = (list) => { const acc = [], done = []; for (const P of list) { acc.push(...cutAll([P], done)); done.push(P); } return acc; };
    const armAsph = seq(hulls);
    const walkArm = cutAll(seq(walksRaw), hulls);
    const stoep = cutAll([band(0, LAAN.stoep)], hulls);
    const fiets = cutAll([band(LAAN.stoep, LAAN.fiets)], hulls);
    const park = cutAll([band(LAAN.fiets, LAAN.park)], hulls);
    const lane = [band(LAAN.park, LAAN.lane)].filter(p => p.length);
    // Middenberm: stukken tussen de openingen, met ronde neuzen
    const gs = I.gaps.map(([a, b]) => [a * G.sgn, b * G.sgn].sort((x, y) => x - y));
    let segs = [[-40, 40]];
    for (const [a, b] of gs) segs = segs.flatMap(([x, y]) => b <= x || a >= y ? [[x, y]] : [[x, a], [b, y]]).filter(([u, v]) => v - u > 3.2);
    const stadium = (a, b) => {
      const r2 = 1.5, pts = [];
      if (b < 39) for (let j = 0; j <= 8; j++) { const an = -Math.PI / 2 + Math.PI * j / 8; pts.push(L(b - r2 + Math.cos(an) * r2, LAAN.midC + Math.sin(an) * r2)); }
      else pts.push(L(b, LAAN.midC - r2), L(b, LAAN.midC + r2));
      if (a > -39) for (let j = 0; j <= 8; j++) { const an = Math.PI / 2 + Math.PI * j / 8; pts.push(L(a + r2 + Math.cos(an) * r2, LAAN.midC + Math.sin(an) * r2)); }
      else pts.push(L(a, LAAN.midC + r2), L(a, LAAN.midC - r2));
      return pts;
    };
    const meds = segs.map(([a, b]) => stadium(a, b));
    const seamAsph = [], green = [];
    for (const [paired, hp] of [[I.pf, halfF], [I.pb, halfB]]) {
      const reg = band(LAAN.lane, 30, [hp]);
      if (!reg.length) continue;
      if (!paired) { green.push(reg); continue; }
      for (const m of meds) { const pc = clipAll(m, [...HEX_PLANES, [n[0], n[1], LAAN.lane - 4.5, true], hp]); if (pc.length) green.push(pc); }
      seamAsph.push(...cutAll([reg], meds));
    }
    // Kop van de laan: dat stuk wordt plein
    const plaza = [];
    const capCut = (pieces) => {
      if (I.capF === 'all') { plaza.push(...pieces); return []; }
      let keep = pieces;
      if (typeof I.capF === 'number') { plaza.push(...keep.map(P => clipAll(P, [[f[0], f[1], I.capF, true]])).filter(P => P.length)); keep = keep.map(P => clipAll(P, [[f[0], f[1], I.capF, false]])).filter(P => P.length); }
      if (typeof I.capB === 'number') { plaza.push(...keep.map(P => clipAll(P, [[f[0], f[1], I.capB, false]])).filter(P => P.length)); keep = keep.map(P => clipAll(P, [[f[0], f[1], I.capB, true]])).filter(P => P.length); }
      return keep;
    };
    const [stoepK, fietsK, parkK, laneK, greenK] = [stoep, fiets, park, lane.concat(seamAsph), green].map(capCut);
    // Berm aan de buitenkant: het puntje van het vak buiten de stoep
    const inArm = (x, z) => walksRaw.some(w => inPoly(x, z, w)) || hulls.some(h => inPoly(x, z, h));
    const res = {
      slabs: [
        { pieces: stoepK.concat(walkArm, plaza), h: WALK_H, top: M.walkTop, side: M.kerb },
        { pieces: fietsK, h: FIETS_H, top: M.fiets, side: M.kerb },
        { pieces: parkK, h: ASPH_H, top: M.parkPaver, side: M.asphaltSide },
        { pieces: laneK.concat(armAsph), h: ASPH_H, top: M.laanAsph, side: M.asphaltSide },
        { pieces: greenK, h: WALK_H, top: M.grass, side: M.kerb },
      ],
      keepBerm: (x, z) => Pof(x, z) < 0 && !inArm(x, z),
      hulls, green: greenK, parkK, L, Pof,
    };
    for (const sl of res.slabs) { const g = slabGeos(sl.pieces, sl.h); sl.topGeo = g.top; sl.sideGeo = g.side; }
    // Stopstreep vlak voor een vak met een verkeerslicht
    const fx = hulls.map(h => clipAll(h, [[n[0], n[1], LAAN.stoep - 4.5, true], [n[0], n[1], LAAN.fiets - 4.5, false]])).filter(p => p.length);
    if (fx.length) res.fietsX = slabGeos(fx, ASPH_H + 0.003, false).top;
    if (I.nextCtrl) {
      const A = L(INNER - 3.2, LAAN.park + 0.15), B = L(INNER - 3.2, LAAN.lane - 0.15), C = L(INNER - 2.8, LAAN.lane - 0.15), D = L(INNER - 2.8, LAAN.park + 0.15);
      res.mark = slabGeos([[A, B, C, D]], ASPH_H + 0.006, false).top;
    }
    laanGeoCache.set(sig, res);
    return res;
  }
  // Geparkeerde auto's (stilstaand, getekend door het autoverkeer), per vak
  const parkedReg = new Map();
  let parkedVersion = 0;
  function makeLaan(o, t, q, r, i, baseY, cx, cz, col) {
    const d = laanD(t), LG = LAAN_G[d];
    const I = laanAt(q, r) || { q, r, d, G: LG, pf: false, pb: false, contF: false, contB: false, arms: 0, U: false, ctrl: false, nextCtrl: false, gaps: [], S: 0, strip: 0 };
    const sig = (roadLinks.laanSig && roadLinks.laanSig.get(key(q, r))) || JSON.stringify([d, 'los']);
    const S = laanShape(I, I.shapeKey || sig), L = S.L;
    const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; o.add(m); return m; };
    for (const sl of S.slabs) {
      if (sl.topGeo) { const m = add(sl.topGeo, sl.top); m.castShadow = false; }
      if (sl.sideGeo) add(sl.sideGeo, sl.side);
      for (const P of sl.pieces) col.surfaces.push({ kind: 'poly', cx, cz, pts: P, top: baseY + sl.h, bottom: baseY });
    }
    if (S.mark) add(S.mark, M.mark).castShadow = false;
    if (S.fietsX) add(S.fietsX, M.fietsX).castShadow = false;
    // berm
    const outer = [LG.ob, LG.of], vtype = vergeType(q, r, outer), own = vergeLevel(vtype);
    const tg = edgeTargets(q, r, baseY, own).map((e, k) => outer.includes(k) ? e : null);
    const bg = cachedField('lb' + (I.shapeKey || sig) + own + JSON.stringify(tg), () => fieldHexGeo(fieldFn(own, tg), 16, S.keepBerm));
    const bm = new THREE.Mesh(bg, vtype === 'plaza' ? M.walkTop : M.grass); bm.receiveShadow = true; o.add(bm);
    col.surfaces.push({ kind: 'tris', cx, cz, B: bg.userData.tb, base: baseY, bottom: baseY });
    // boom op de middenberm (of het plantvak), midden in het vak: om de 7,8 m staat er dus een boom
    const [tx, tz] = L(0, LAAN.midC);
    if (S.green.some(P => inPoly(tx, tz, P))) {
      const hj = hash(q, r, 41), sc = 0.85 + (hj % 4) * 0.07;
      const tr = add(G.trunk, M.trunk); tr.scale.set(0.85, 1.25, 0.85); tr.position.set(tx, WALK_H - 0.02, tz);
      const cr = add(G.crown, M.leaf[hj % 3]); cr.scale.set(sc, sc * 1.2, sc); cr.position.set(tx, WALK_H + 3.2 + 2.1 * sc, tz); cr.rotation.y = (hj % 7) * 0.4;
      col.walls.push({ ax: cx + tx, az: cz + tz, bx: cx + tx, bz: cz + tz, y0: baseY, y1: baseY + 3.5, half: 0.2 });
    }
    // verkeerslichten: voor wie over de laan binnenkomt (op de stoep, rechts) en voor elke zijstraat
    const lights = [];
    const pole = (x, z, fr, arm) => {
      add(G.tlPole, M.tlBody).position.set(x, WALK_H, z);
      const hd = add(G.tlHead, M.tlBody); hd.position.set(x, WALK_H + 3.0, z); hd.rotation.y = fr.rot;
      const lamps = {};
      [['r', 0.3], ['a', 0], ['g', -0.3]].forEach(([c, dy]) => {
        const l = new THREE.Mesh(G.tlLamp, M.lampOff);
        l.position.set(x + fr.nx * 0.18, WALK_H + 3.0 + dy, z + fr.nz * 0.18); l.rotation.y = fr.rot;
        o.add(l); lamps[c] = l;
      });
      col.walls.push({ ax: cx + x, az: cz + z, bx: cx + x, bz: cz + z, y0: baseY, y1: baseY + 3.5, half: 0.08 });
      lights.push({ q, r, arm, lamps });
    };
    if (I.ctrl) {
      let pos = null;
      for (const p of [2.0, 1.2]) { const P = L(-INNER + 0.7, p); if (!S.hulls.some(h => inPoly(P[0], P[1], h))) { pos = P; break; } }
      if (pos) pole(pos[0], pos[1], FRAMES[LG.Bk], LG.Bk);
    }
    for (let O = 0; O < 6; O++) {
      if (!((I.arms >> O) & 1)) continue;
      const fo = FRAMES[O], x = fo.nx * (INNER - 1.0) + fo.nz * 3.4, z = fo.nz * (INNER - 1.0) - fo.nx * 3.4;
      pole(x, z, fo, O);
    }
    if (col.lights) col.lights.push(...lights);
    // geparkeerde auto's: om de 6 m een vak, ruim de helft bezet; niet waar een zijstraat de strook kruist
    if (col.parked) {
      const h = Math.atan2(LG.f[1], LG.f[0]);
      for (let j = Math.floor((I.S - 10) / 6); j <= Math.ceil((I.S + 10) / 6); j++) {
        const tt = (j * 6 + 3 - I.S) * LG.sgn, [px, pz] = L(tt, 5.5);
        if (!inHex(px, pz)) continue;
        if (hash(j & 0xfffff, I.strip & 0xfffff, 5) % 100 >= 55) continue;
        const corners = [[-2.4, -1.0], [2.4, -1.0], [2.4, 1.0], [-2.4, 1.0], [0, 0]].map(([a, b]) => L(tt + a, 5.5 + b));
        if (corners.some(([x, z]) => S.hulls.some(hh => inPoly(x, z, hh)))) continue;
        if (!S.parkK.some(P => inPoly(px, pz, P))) continue;   // niet op het plein aan de kop
        col.parked.push({ x: cx + px, z: cz + pz, h, paint: hash(j & 0xfffff, I.strip & 0xfffff, 9) });
        col.walls.push({ ax: cx + px - LG.f[0] * 1.9, az: cz + pz - LG.f[1] * 1.9, bx: cx + px + LG.f[0] * 1.9, bz: cz + pz + LG.f[1] * 1.9, y0: baseY, y1: baseY + 1.4, half: 0.9 });
      }
    }
  }

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
    const mask = roadMaskAt(q, r, top);
    const poly = cached('bdek' + mask, () => stripPoly(mask, STREET_W / 2 + 0.15, KEER.walk));
    bag.put(M.beton, extrudePoly(poly, 0.7, h - 0.7));   // dek van 70 cm dik
    const arms = [0, 1, 2, 3, 4, 5].filter(k => (mask >> k) & 1);
    const { fn } = kuilField(q, r);
    for (const k of arms) {
      if (isKuilAt(q + NEIGH[k][0], r + NEIGH[k][1])) continue;   // het dek loopt door over de volgende uitgraving
      const m = new THREE.Mesh(slopeSkin(FRAMES[k], STREET_W / 2 + 0.15, fn), M.skin); m.receiveShadow = true; m.userData.own = true; o.add(m);
    }
    if (arms.length === 2 && arms[1] - arms[0] === 3) {   // borstweringen langs beide zijden
      const f = FRAMES[arms[0]];
      for (const sgn of [-1, 1]) {
        const u = sgn * (STREET_W / 2 + 0.15 - 0.18);
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
    if (baseOf(t) === 'laan') { makeLaan(o, t, q, r, i, baseY, cx, cz, col); return o; }
    const laan = t === 'weg1';   // weg met bomen aan beide kanten
    if (laan) t = 'weg';
    const kapels = /^dak\d$/.test(t) ? +t.slice(3) : 0;   // dak1: een dakkapel aan de voorkant, dak2: voor en achter
    if (kapels) t = 'dak';
    if (t !== 'weg' && t !== 'water' && t !== 'park' && t !== 'dak') col.surfaces.push({ kind: 'hex', cx, cz, top: baseY + TYPES[t].h, bottom: baseY, hole: false });
    const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; o.add(m); return m; };
    const hv = hash(q, r, i);
    if (t === 'weg') {
      let mask = 0;
      for (let k = 0; k < 6; k++) if (roadLinked(q, r, k, baseY)) mask |= 1 << k;
      const rg = roadGeo(mask);
      if (rg.asph) {
        const a = new THREE.Mesh(rg.asph, [roadMat(mask), M.asphaltSide]); a.receiveShadow = true; o.add(a);
        col.surfaces.push({ kind: 'poly', cx, cz, pts: rg.asphPoly, top: baseY + ASPH_H, bottom: baseY });
      }
      rg.walk.forEach((g, n) => {
        const m = new THREE.Mesh(g, [M.walkTop, M.kerb]); m.receiveShadow = true; m.castShadow = true; o.add(m);
        col.surfaces.push({ kind: 'poly', cx, cz, pts: rg.walkPolys[n], top: baseY + WALK_H, bottom: baseY });
      });
      // Laan: per vak aan elke kant één boom, midden op het vak, net naast de stoep in de berm.
      // Zo staan ze om de 15,6 m, ook over de tegelgrens heen gelijk verdeeld.
      const ax = straightAxis(mask);
      const laanTrees = laan && ax >= 0 ? [-6.0, 6.0].map(u => local(FRAMES[ax], u, 0)) : [];
      // Verkeerslichten: rechts van elke inkomende rijstrook, op de stoep bij de rand van het vak, naar buiten gericht
      if (i === 0 && junctionInfo(q, r)) {
        const regs = [];
        for (let k = 0; k < 6; k++) {
          if (!((mask >> k) & 1)) continue;
          const f = FRAMES[k], [x, z] = local(f, 2.85, INNER - 0.7);
          add(G.tlPole, M.tlBody).position.set(x, WALK_H, z);
          const hd = add(G.tlHead, M.tlBody); hd.position.set(x, WALK_H + 3.0, z); hd.rotation.y = f.rot;
          const lamps = {};
          [['r', 0.3], ['a', 0], ['g', -0.3]].forEach(([c, dy]) => {
            const l = new THREE.Mesh(G.tlLamp, M.lampOff);
            l.position.set(x + f.nx * 0.18, WALK_H + 3.0 + dy, z + f.nz * 0.18); l.rotation.y = f.rot;
            o.add(l); lamps[c] = l;
          });
          col.walls.push({ ax: cx + x, az: cz + z, bx: cx + x, bz: cz + z, y0: baseY, y1: baseY + 3.5, half: 0.08 });
          regs.push({ q, r, arm: k, lamps });
        }
        lightReg.set(key(q, r), regs);
      }
      // Bermen invullen naar wat erachter ligt: park → gras met bomen, woning → voortuin met struiken,
      // kantoor/plein/paden → bestrating, anders een grasberm. Zo sluit alles op elkaar aan.
      if (baseOf(stackOf(q, r)[0]) !== 'water' && baseOf(stackOf(q, r)[0]) !== 'kuil') rg.verges.forEach((vg, vi) => {
        const type = vergeType(q, r, vg.sides), own = vergeLevel(type);
        // alleen de zijden van deze berm tellen mee; waar de buurman lager ligt loopt de berm af
        const tg = edgeTargets(q, r, baseY, own).map((e, k) => vg.sides.includes(k) ? e : null);
        // langs de stoep blijft de berm op eigen hoogte; het talud zit aan de buitenkant
        const ff = fieldFn(own, tg), inner = vg.inner;
        const fn = (x, z) => {
          let d = 1e9;
          for (let j = 0; j + 1 < inner.length; j++) {
            const [ax, az] = inner[j], [bx, bz] = inner[j + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1e-9;
            const t2 = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2));
            d = Math.min(d, Math.hypot(ax + ex * t2 - x, az + ez * t2 - z));
          }
          return own + (ff(x, z) - own) * smooth01(d / 1.5);
        };
        // fijn raster over de berm; wat onder de stoep doorloopt valt weg onder de stoeptegels
        const geo = cachedField('v' + mask + ':' + vi + ':' + own + JSON.stringify(tg), () => {
          const xs = vg.poly.map(v => v[0]), zs = vg.poly.map(v => v[1]);
          const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
          return fieldHexGeo(fn, 16, (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1 && inPoly(x, z, vg.poly));
        });
        const m = new THREE.Mesh(geo, type === 'plaza' ? M.walkTop : M.grass); m.receiveShadow = true; o.add(m);
        col.surfaces.push({ kind: 'tris', cx, cz, B: geo.userData.tb, base: baseY, bottom: baseY });
        const yAt = (x, z) => fn(x, z);
        const hv2 = hash(q, r, vi + 7);
        // Een pad of hof dat via een zijde op deze berm uitkomt: een verbindingsstukje haaks naar de stoep
        const pm = pathMask(q, r, baseY), keep = [];
        for (const sd of vg.sides) {
          if (!((pm >> sd) & 1) || cornerVia.has(lk(q, r, baseY) + '|' + sd)) continue;
          const nb = stackOf(q + NEIGH[sd][0], r + NEIGH[sd][1]);
          if (!nb.length || baseOf(nb[0]) === 'weg') continue;
          const [mx, mz] = local(FRAMES[sd], 0, INNER), inr = vg.inner;
          let best = null, bd = 1e9;
          for (let j = 0; j + 1 < inr.length; j++) {
            const [ax, az] = inr[j], [bx, bz] = inr[j + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez || 1e-9;
            const t2 = Math.max(0, Math.min(1, ((mx - ax) * ex + (mz - az) * ez) / l2)), px = ax + ex * t2, pz = az + ez * t2, d = Math.hypot(px - mx, pz - mz);
            if (d < bd) { bd = d; best = [px, pz]; }
          }
          if (!best || bd < 0.05) continue;
          const ux = (best[0] - mx) / bd, uz = (best[1] - mz) / bd, wx = -uz * PATH_HALF, wz = ux * PATH_HALF, L2 = bd + 0.25;
          const poly = [[mx + wx, mz + wz], [mx + ux * L2 + wx, mz + uz * L2 + wz], [mx + ux * L2 - wx, mz + uz * L2 - wz], [mx - wx, mz - wz]];
          const y0 = own === GREEN ? PAD_TOP : own;
          const cfn = (x, z) => y0 + (WALK_H - 0.005 - y0) * Math.max(0, Math.min(1, ((x - mx) * ux + (z - mz) * uz) / bd));
          const cg = cachedField('vc' + mask + ':' + sd + ':' + y0, () => fieldExtrude(poly, cfn));
          const cm = new THREE.Mesh(cg, [M.paver, M.kerb]); cm.receiveShadow = true; o.add(cm);
          col.surfaces.push({ kind: 'tris', cx, cz, B: cg.userData.tb, base: baseY, bottom: baseY });
          keep.push([mx, mz, best[0], best[1]]);
        }
        // haakse paden van buurpaden die in een hoek van dit vak uitkomen
        for (let k = 0; k < 6; k++) {
          const nq = q + NEIGH[k][0], nr = r + NEIGH[k][1], list = pathCorners.get(lk(nq, nr, baseY));
          if (!list) continue;
          const wn = cellToWorld(nq, nr);
          for (const c of list) { const x = wn.x + c.ex - cx, z = wn.z + c.ez - cz; keep.push([x, z, x, z]); }
        }
        // vrije plek in de berm (niet te dicht bij de rand) voor een boom of struik
        const spot = (fx, fz) => {
          const [x, z] = [vg.c[0] + fx, vg.c[1] + fz];
          if (!inPoly(x, z, vg.poly)) return null;
          for (let j = 0; j < vg.poly.length; j++) {
            const [ax, az] = vg.poly[j], [bx, bz] = vg.poly[(j + 1) % vg.poly.length], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
            const t2 = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
            if (Math.hypot(ax + dx * t2 - x, az + dz * t2 - z) < (type === 'park' ? 1.6 : 0.8)) return null;
          }
          for (const [ax, az, bx, bz] of keep) if (segDist2(x, z, ax, az, bx, bz) < 2.6) return null;   // paden vrijhouden
          return [x, z];
        };
        const myTrees = laanTrees.filter(([x, z]) => inPoly(x, z, vg.poly));
        myTrees.forEach(([x, z], j) => {
          const hj = hash(q, r, 31 + vi * 2 + j), y0 = yAt(x, z) - 0.02;
          const tr = add(G.trunk, M.trunk); tr.scale.set(0.85, 1.25, 0.85); tr.position.set(x, y0, z);
          const sc = 0.85 + (hj % 4) * 0.07, cr = add(G.crown, M.leaf[hj % 3]);
          cr.scale.set(sc, sc * 1.2, sc); cr.position.set(x, y0 + 3.2 + 2.1 * sc, z); cr.rotation.y = (hj % 7) * 0.4;
          col.walls.push({ ax: cx + x, az: cz + z, bx: cx + x, bz: cz + z, y0: baseY, y1: baseY + 3.5, half: 0.2 });
        });
        if (myTrees.length) return;   // de laanboom is de beplanting van deze berm
        if (type === 'park' && vg.area > 10) {
          const p0 = spot(0, 0);
          if (p0) {
            const y0 = yAt(p0[0], p0[1]) - 0.02;
            add(G.trunk, M.trunk).position.set(p0[0], y0, p0[1]);
            const sc = 0.85 + (hv2 % 4) * 0.12, cr = add(G.crown, M.leaf[hv2 % 3]);
            cr.scale.set(sc, sc * 1.15, sc); cr.position.set(p0[0], y0 + 2.4 + 2.1 * sc * 0.9, p0[1]);
          }
        } else if ((type === 'garden' || type === 'berm' || type === 'park') && vg.area > 3) {
          const n2 = type === 'garden' ? 3 : 2;
          for (let j = 0; j < n2; j++) {
            const an = (hv2 >>> (j * 3)) % 6 * 1.05 + j * 2.1, rr = 0.6 + ((hv2 >>> (j * 5)) % 4) * 0.35;
            const p0 = spot(Math.cos(an) * rr, Math.sin(an) * rr);
            if (!p0) continue;
            const sz = 0.45 + ((hv2 >>> (j + 4)) % 3) * 0.12, sh = add(G.crown, M.leaf[(hv2 >>> (j + 1)) % 3]);
            sh.scale.set(sz * 0.55, sz * 0.45, sz * 0.55); sh.position.set(p0[0], yAt(p0[0], p0[1]) + sz * 0.4, p0[1]);
          }
        }
      });
    } else if (t === 'dak') {
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
      const isBridgeAt = (nq, nr) => isWaterAt(nq, nr) && stackOf(nq, nr).length > 1;
      const wallSeg = (f, p, y0, y1) => {
        const [ax, az] = local(f, -R / 2, p), [bx, bz] = local(f, R / 2, p);
        col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: baseY + y0, y1: baseY + y1, half: 0.15, quay: true });
      };
      // Brug: het dek is precies zo breed als de straat (9 m) of het pad erop (3,6 m)
      let deckMask = 0, straight = false, deckW = 0;
      if (bridge) {
        const top = baseOf(st[i + 1]), isRoadTop = top === 'weg';
        for (let k = 0; k < 6; k++) if (isRoadTop ? roadLinked(q, r, k, baseY) : ((pathMask(q, r, baseY) >> k) & 1)) deckMask |= 1 << k;
        deckW = isRoadTop ? STREET_W / 2 : PATH_HALF + 0.3;
        const arms = [0, 1, 2, 3, 4, 5].filter(k => (deckMask >> k) & 1);
        straight = arms.length === 2 && arms[1] - arms[0] === 3;
        const poly = cached('dekp' + deckMask + '_' + deckW, () => stripPoly(deckMask, deckW, isRoadTop ? KEER.walk : 2.6));
        bag.put(M.brug, cached('dek' + deckMask + '_' + deckW, () => extrudePoly(poly, 0.5, -0.5)));
        col.surfaces.push({ kind: 'poly', cx, cz, pts: poly, top: baseY, bottom: baseY - 0.5 });
        if (straight) {   // borstweringen langs beide zijden van de brug
          const f = FRAMES[arms[0]], lift = isRoadTop ? WALK_H : 0;
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
  const EDGE_TOOLS = new Set(['randweg', 'randbreed', 'randpad']);
  const EDGE_TYPE = { randweg: 'weg', randbreed: 'brd', randpad: 'pad' };
  const EDGE_WIDTHS = { weg: [2.5, 4.5], brd: [4.5, 6.5] };   // halve rijbaan, halve breedte incl. stoep
  const roadGeoW = (type, arms, L) => { const sa = ASPH_HALF, sw = WALK_HALF; [ASPH_HALF, WALK_HALF] = EDGE_WIDTHS[type]; try { return buildRoadGeo(arms, L, true); } finally { ASPH_HALF = sa; WALK_HALF = sw; } };
  const EDGE_LIFT = 0.06, EDGE_L = R / 2, PAD_H_EDGE = 0.15;
  const edgesOf = () => cells.edges || (cells.edges = new Map());
  const edgeColMap = new Map();
  let edgeGroup = null;
  function edgeCanon(q, r, k) { return k < 3 ? [q, r, k] : [q + NEIGH[k][0], r + NEIGH[k][1], k - 3]; }
  const edgeKey = (q, r, k) => edgeCanon(q, r, k).join(',');
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
  function edgeRoadCols() {   // loopvlakken per vak, zodat je er in de loopmodus op kunt lopen
    return edgeColMap;
  }

