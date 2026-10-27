  // ---------- Auto's ----------
  // Low-poly auto's (zie 11-0-lowpoly-voertuigen.js), op ware grootte: 4,70 m lang, ongeveer 1,9 m breed, wielbasis 2,90 m,
  // wielen van 72 cm. Ze rijden rechts, 1,25 m naast de middenstreep, volgen de bochtbogen, keren in de keerlus,
  // remmen voor elkaar, voor overstekende mensen en voor jou.
  const cars = (() => {
    const MAX = 40, CAP = 280, WB = 1.45, TRACK = 0.83, WR = 0.36;
    // wielen draaien op het scherm niet sneller dan dit (rad/s): sneller lijkt het door de beeldsnelheid achteruit te gaan
    const SPIN_MAX = 13;   // CAP: ook de geparkeerde auto's
    const barGeo = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const tireGeo = new THREE.CylinderGeometry(WR, WR, 0.24, 10).rotateX(Math.PI / 2);
    const rimGeo = mergeGeos([new THREE.CylinderGeometry(0.25, 0.25, 0.25, 8).rotateX(Math.PI / 2)]);
    // vijf gaten in de velg aan beide kanten: zo zie je de wielen draaien
    const holes = [];
    for (let k = 0; k < 5; k++) for (const side of [-1, 1]) {
      const a = k / 5 * Math.PI * 2;
      holes.push(new THREE.CylinderGeometry(0.052, 0.052, 0.01, 6).rotateX(Math.PI / 2).translate(Math.cos(a) * 0.15, Math.sin(a) * 0.15, side * 0.126));
    }
    const holeGeo = mergeGeos(holes);
    const hubGeo = new THREE.TorusGeometry(0.19, 0.018, 4, 14);   // gloeiende ring in de velg
    const PARTS = {   // wielen (gedeeld door alle typen); de carrosserieën staan per type in LPM
      tire:   { geo: tireGeo, mat: new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: 0.9, flatShading: true }), per: 4 },
      rim:    { geo: rimGeo, mat: new THREE.MeshStandardMaterial({ color: '#b9c0c8', roughness: 0.4, metalness: 0.35, flatShading: true }), per: 4 },
      holes:  { geo: holeGeo, mat: new THREE.MeshStandardMaterial({ color: '#202428', roughness: 0.7 }), per: 4 },
      hub:    { geo: hubGeo, mat: new THREE.MeshBasicMaterial({ color: '#ffffff' }), per: 8, color: true },
    };
    const meshes = {};
    for (const [k, pd] of Object.entries(PARTS)) {
      const m = new THREE.InstancedMesh(pd.geo, pd.mat, CAP * pd.per);
      m.frustumCulled = false; m.castShadow = k !== 'front' && k !== 'rear' && k !== 'glow' && k !== 'hub'; m.receiveShadow = k === 'body';
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (pd.color) { const w = new THREE.Color('#ffffff'); for (let i = 0; i < CAP * pd.per; i++) m.setColorAt(i, w); }
      m.count = 0; m.userData.noOcc = true; scene.add(m); meshes[k] = m;
    }
    // low-poly typen: per type een eigen carrosserie, ruit en lampen (zelfde wielen en afmetingen als de elektrische auto)
    const LPM = {};
    for (const t of LP_TYPES) {
      const G = lpBuildVehicle(t), mk = (geo, mat, cast, color) => { const m = new THREE.InstancedMesh(geo, mat, CAP); m.frustumCulled = false; m.castShadow = cast; m.receiveShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); if (color) { const w = new THREE.Color('#ffffff'); for (let i = 0; i < CAP; i++) m.setColorAt(i, w); } m.count = 0; m.userData.noOcc = true; scene.add(m); return m; };
      LPM[t] = { body: mk(G.body, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: G.metal ? 0.35 : 0.55, metalness: G.metal ? 0.3 : 0.12, flatShading: true }), true, true),
        trim: G.trim ? mk(G.trim, new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.8, flatShading: true }), false, false) : null,
        glow: G.glow ? mk(G.glow, new THREE.MeshBasicMaterial({ color: '#ffffff' }), false, true) : null, glass: G.glass ? mk(G.glass, new THREE.MeshStandardMaterial({ color: '#1d2b36', roughness: 0.6, metalness: 0.15, flatShading: true }), false, false) : null, lamp: mk(G.lamp, new THREE.MeshBasicMaterial({ vertexColors: true }), false, false) };
    }
    const PAINT = ['#f2f3f5', '#e9ecef', '#1c1f24', '#2b2f36', '#9ea7b0', '#c9ced4', '#1f3c5c', '#5a1f2a', '#d8c9a8', '#2f4a3f'];
    const ACCENT = ['#ff2a3a', '#3ef0ff', '#ff3ec8', '#ffb23e', '#7dff6a', '#7a8cff'];
    // ---------- Bloed (laag-poly: zeshoekige spatten, driehoekige druppels) ----------
    // Wie wordt aangereden bloedt: spatten op het wegdek, een plas bij wie blijft liggen, vlekken op de auto en bloedige
    // bandensporen. Aan/uit in de instellingen.
    const GORE = { on: true, SC: 420, PC: 220 };
    try { GORE.on = localStorage.getItem('hexstad-bloed') !== '0'; } catch (e) { }
    const goreSplat = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), GORE.SC);
    const gorePart = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: '#c4101e' }), GORE.PC);
    { const w = new THREE.Color('#ffffff'); for (let i = 0; i < GORE.SC; i++) goreSplat.setColorAt(i, w); }   // eerst de kleurbuffer (hij krijgt de grootte van count), dan pas count 0
    for (const m of [goreSplat, gorePart]) { m.frustumCulled = false; m.count = 0; m.userData.noOcc = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    const goreS = [], goreP = [], goreLater = []; let goreI = 0;   // spatten (ringbuffer), druppels, plassen die later komen
    const GM = new THREE.Matrix4(), GQ = new THREE.Quaternion(), GV = new THREE.Vector3(), GS = new THREE.Vector3(), GY = new THREE.Vector3(0, 1, 0), GC = new THREE.Color();
    function goreSplatAt(x, y, z, size, fresh) {
      if (!GORE.on) return;
      const o = { x, y: y + 0.035 + (goreI % 7) * 0.002, z, s: size, rot: Math.random() * 6.28, sx: 0.7 + Math.random() * 0.6, t: fresh ? 0 : 12 };
      goreS[goreI % GORE.SC] = o; goreI++;
    }
    // bloed op de auto: per type drie plekken (voorbumper, motorkap, voorruit), gevonden met een straal op de echte carrosserie
    const goreProbe = (geo, ox, oy, oz, dx, dy, dz) => { const mm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), rc = new THREE.Raycaster(new THREE.Vector3(ox, oy, oz), new THREE.Vector3(dx, dy, dz).normalize(), 0, 20), h = rc.intersectObject(mm)[0]; if (!h) return null; const n = h.face.normal.clone(); if (n.dot(rc.ray.direction) > 0) n.negate(); return { p: h.point, n }; };
    for (const t of LP_TYPES) {
      const G = lpBuildVehicle(t); G.body.computeBoundingBox(); const bb = G.body.boundingBox, L = LPM[t]; L.blood = [];
      const spots = [
        goreProbe(G.body, bb.max.x + 2, bb.min.y + (bb.max.y - bb.min.y) * 0.35, 0.18, -1, 0, 0),
        goreProbe(G.body, bb.max.x * 0.55, bb.max.y + 2, -0.22, 0, -1, 0),
        goreProbe(G.glass || G.body, bb.max.x * 0.12, bb.max.y + 2, 0.2, 0, -1, 0)];
      spots.forEach((sp, li) => {
        if (!sp) { L.blood.push(null); return; }
        const geo = new THREE.CircleGeometry([0.3, 0.38, 0.34][li], 6); GM.compose(sp.p.clone().addScaledVector(sp.n, 0.02), GQ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sp.n), new THREE.Vector3(1.2, 0.8, 1)); geo.applyMatrix4(GM);
        const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#8d0f18', side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), CAP); m.frustumCulled = false; m.count = 0; m.visible = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.userData.noOcc = true; scene.add(m); L.blood.push(m);
      });
    }
    let on = true;
    try { on = localStorage.getItem('hexstad-autos') !== '0'; } catch (e) {}
    const btn = document.getElementById('carsBtn');
    const label = () => { const st = btn.querySelector('.state'); if (st) st.textContent = on ? 'aan' : 'uit'; else btn.textContent = "Auto's: " + (on ? 'aan' : 'uit'); btn.classList.toggle('off', !on); };
    label();
    const list = [];
    let reckless = false, carSeq = 0, forceN = 0; const crashLog = [];
    const pick = a => a[Math.floor(Math.random() * a.length)];
    // Een stuk rijlijn (leg): { path: {pts, seg, len}, cx, cz, … }; de auto rijdt langs path en plant alvast het volgende stuk
    function planNext(c) { return c.vec ? vecNext(c) : null; }
    function useLeg(c, L) {
      c.q = L.q; c.r = L.r; c.inS = L.inS; c.outS = L.outS; c.path = L.path; c.cx = L.cx; c.cz = L.cz;
      c.vec = !!L.vec; c.u = !!L.u; c.eid = L.eid; c.dir = L.dir; c.lane = L.lane; c.nodeEnd = L.nodeEnd; c.exitPt = L.exitPt; c.exitD = L.exitD;
      c.late = reckless && Math.random() < 0.4 ? 1.6 + Math.random() * 1.6 : 1;
      c.kind = L.kind; c.pri = ['ring', 'snel'].includes((VG.edges.get(L.eid) || {}).t) ? 2 : 1;   // op de rotonde en de snelweg heb je voorrang
      c.next = planNext(c);
    }
    // Klopt een (gepland) stuk rijlijn nog na een verbouwing?
    function validLeg(L) {
      if (!L || !L.path || !L.vec) return false;
      const e = VG.edges.get(L.eid); return !!e && (L.dir ? e.a : e.b) === L.nodeEnd;
    }

    const mkPath = pts => { const seg = [0]; for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, seg, len: seg[seg.length - 1] }; };
    function bez(A, dA, B, dB, k = 0.42, n = 24) {
      const h = k * Math.hypot(B[0] - A[0], B[1] - A[1]), P1 = [A[0] + dA[0] * h, A[1] + dA[1] * h], P2 = [B[0] - dB[0] * h, B[1] - dB[1] * h], out = [];
      for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([0, 1].map(j => u * u * u * A[j] + 3 * u * u * t * P1[j] + 3 * u * t * t * P2[j] + t * t * t * B[j])); }
      return out;
    }
    // ---------- Vectorwegen: auto's over vrij getekende wegen ----------
    // De getekende lijnen (cells.paths, typen weg en brd) worden een graaf: knopen op uiteinden, kruisingen en
    // T-aansluitingen, takken ertussen. Een auto rijdt op de rechter rijstrook van een tak, kiest op een knoop een
    // volgende tak (liefst rechtdoor) en keert aan een dood eind om de kop van de weg.
    let VG = { nodes: [], edges: new Map(), totalLen: 0, ver: 0 };
    const VLANE = { weg: [1.25], brd: [1.1, 3.4], laan: [3.125], snel: [2.65, 6.15], klink: [1.3], ring: [0] };   // afstand van de rijstrook tot het midden van de weg
    function vecGraph() { if (vecDirty) { vecDirty = false; VG = vecGraphOf(cells.paths, VG.ver + 1); } return VG; }
    const nodeTrim = n => { const H = vecHead(VG, n); return H ? H.trimLane : (vecJunctionTrim(VG, n) || vecBendTrim(VG, n, 2.0)); };   // voor een kruising: het kruisingsvak; op een doodlopend eind: de ronde keerkop
    const lanePts = (e, dir, off) => offsetPts(dir ? e.pts.slice().reverse() : e.pts, off);   // rijstrook: rechts van het midden
    const laneOff = (e, lane) => VLANE[e.t][Math.min(lane, VLANE[e.t].length - 1)];
    function vecLeg(e, dir, lane, from) {   // from: einde van de vorige rijstrook {pt, d}; daarvandaan een bocht naar deze
      const nA = dir ? e.b : e.a, nB = dir ? e.a : e.b;
      let pts = trimPts(lanePts(e, dir, laneOff(e, lane)), nodeTrim(nA), nodeTrim(nB)), turn = false;
      if (from) {
        const s = pts[0], d0 = dirAt(pts, 0);
        if (Math.hypot(s[0] - from.pt[0], s[1] - from.pt[1]) > 0.3) { pts = bez(from.pt, from.d, s, d0, 0.42, 16).concat(pts.slice(1)); turn = Math.abs(Math.atan2(from.d[0] * d0[1] - from.d[1] * d0[0], from.d[0] * d0[0] + from.d[1] * d0[1])) > 0.35; }
      }
      return { vec: true, eid: e.id, dir, lane, nodeEnd: nB, q: 100000 + nB, r: 1, inS: 0, outS: 3, kind: turn ? 'turn' : 'lane', path: mkPath(pts), cx: 0, cz: 0, exitPt: pts[pts.length - 1], exitD: dirAt(pts, pts.length - 1) };
    }
    function vecULeg(e, dir, lane, from) {   // keren in de ronde kop van een doodlopende weg: eerst naar de buitenrand zwenken, dan een halve cirkel
      const nB = dir ? e.a : e.b, H = vecHead(VG, nB), off = laneOff(e, lane);
      let d, r, C, rho;
      if (H) { d = H.d; r = H.r; C = H.C; rho = Math.max(H.rho, off); }
      else { const N = VG.nodes[nB]; d = from.d; r = [-d[1], d[0]]; C = [N.x - d[0] * 1.8, N.z - d[1] * 1.8]; rho = off; }
      const Q0 = [C[0] + r[0] * rho, C[1] + r[1] * rho];
      let pts = Math.hypot(Q0[0] - from.pt[0], Q0[1] - from.pt[1]) > 0.4 ? bez(from.pt, from.d, Q0, d, 0.42, 10) : [Q0];
      for (let i = 1; i <= 18; i++) { const th = Math.PI * i / 18; pts.push([C[0] + d[0] * Math.sin(th) * rho + r[0] * Math.cos(th) * rho, C[1] + d[1] * Math.sin(th) * rho + r[1] * Math.cos(th) * rho]); }
      return { vec: true, u: true, eid: e.id, dir, lane, nodeEnd: nB, q: 100000 + nB, r: 0, inS: 0, outS: 0, kind: 'u', path: mkPath(pts), cx: 0, cz: 0, exitPt: pts[pts.length - 1], exitD: [-d[0], -d[1]] };
    }
    const laneFor = (e, lane) => VLANE[e.t].length > 1 ? (lane < VLANE[e.t].length ? lane : Math.floor(Math.random() * VLANE[e.t].length)) : 0;
    function vecNext(c) {
      const e = VG.edges.get(c.eid); if (!e) return null;
      const from = { pt: c.exitPt, d: c.exitD };
      if (c.u) return vecLeg(e, c.dir ? 0 : 1, c.lane, from);
      const nEnd = c.dir ? e.a : e.b;   // uit de tak zelf halen: knoopnummers verschuiven als de graaf opnieuw gebouwd is
      const N = VG.nodes[nEnd], opts = N.edges.filter(id => id !== c.eid).map(id => VG.edges.get(id)).filter(o => !o.oneway || o.a === nEnd);   // eenrichting (rotonde): alleen in de rijrichting
      if (!opts.length) return vecULeg(e, c.dir, c.lane, from);
      const sc = opts.map(o => { const od = o.a === nEnd ? 0 : 1; let d0 = dirAt(o.pts, od ? o.pts.length - 1 : 0); if (od) d0 = [-d0[0], -d0[1]]; return { o, od, cos: d0[0] * from.d[0] + d0[1] * from.d[1] }; });
      const straight = sc.filter(x => x.cos > 0.8), ch = straight.length && Math.random() < 0.55 ? pick(straight) : pick(sc);
      const L = vecLeg(ch.o, ch.od, laneFor(ch.o, c.lane), from); L.viaNode = nEnd; L.viaEid = c.eid; return L;   // het licht staat bij de knoop waar deze tak begint
    }
    function spawnVec(c) {
      let x = Math.random() * VG.totalLen, e = null;
      for (const E of VG.edges.values()) { e = E; x -= E.len; if (x <= 0) break; }
      if (!e) return false;
      c.prev = null; useLeg(c, vecLeg(e, e.oneway || Math.random() < 0.5 ? 0 : 1, laneFor(e, 99), null)); return true;
    }
    // Licht bij het binnenrijden van een stuk rijlijn
    function entryLight(L, t) {
      if (!L) return null;
      return L.vec && L.viaNode != null ? vecLightState(VG, L.viaNode, L.viaEid, t) : null;
    }
    // punt op de rijlijn, ook een stukje in het vorige of volgende vak (voor voor- en achteras)
    function posOn(c, s) {
      if (s > c.path.len && c.next) return posAt({ path: c.next.path, cx: c.next.cx, cz: c.next.cz }, s - c.path.len);
      if (s < 0 && c.prev) return posAt(c.prev, c.prev.path.len + s);
      return posAt(c, s);
    }
    function posAt(c, s) {
      const P = c.path, seg = P.seg;
      s = Math.max(0, Math.min(P.len, s));
      let i = 1; while (i < seg.length - 1 && seg[i] < s) i++;
      const t = (s - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]), a = P.pts[i - 1], b = P.pts[i];
      return [c.cx + a[0] + (b[0] - a[0]) * t, c.cz + a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
    }
    function spawn(c, tryN = 0) {
      let ok = false;
      for (let tries = 0; tries < 8 && !ok; tries++) if (VG.totalLen > 0) ok = spawnVec(c);
      if (!ok) { c.path = null; return false; }
      c.s = Math.random() * c.path.len * 0.8;
      const [x, z, h] = posAt(c, c.s);
      c.x = x; c.z = z; c.h = h; c.v = 4; c.spin = 0; c.steer = 0; c.wait = 0;
      { const [ax, az, ah] = posOn(c, c.s - WB); c.rx = ax; c.rz = az; c.h = ah; c.delta = 0; c.x = ax + Math.cos(ah) * WB; c.z = az + Math.sin(ah) * WB; }
      // vering: hoogte, stampen en rollen van de carrosserie, met snelheden; wielhoogtes
      { const t = roadTop(c.x, c.z, ASPH_H); c.sy = t ?? ASPH_H; } c.vy = 0; c.pitch = 0; c.vp = 0; c.roll = 0; c.vr = 0; c.g = [c.sy, c.sy, c.sy, c.sy]; c.hPrev = h; c.vPrev = 4;
      c.crash = null;
      // niet boven op een andere auto beginnen
      if (tryN < 8 && list.some(o => o !== c && o.path && Math.hypot(o.x - c.x, o.z - c.z) < 7)) return spawn(c, tryN + 1);
      if (tryN >= 8) c.ghost = 3;   // geen vrije plek gevonden: even 'doorzichtig' zodat hij niet meteen botst
      return true;
    }
    function rebuild() {
      vecGraph(); tows.length = 0; for (const c of list) { c.towed = false; c.towT = false; }
      // hoe meer huizen en kantoren, hoe meer verkeer; nooit voller dan de wegen aankunnen
      const pop = cityCounts(), nRoad = VG.totalLen / 15.6, druk = cells.druk || 1;   // druk: extra verkeer (Filestad)
      const want = Math.round((nRoad / 14 + pop.homes * 0.3 + pop.offices * 0.2) * druk * PERF.crowd);
      let target = on && nRoad >= 3 ? Math.min(MAX, Math.max(1, Math.min(want, Math.floor(nRoad / 2.5 * druk)))) : 0;
      if (forceN) target = Math.min(MAX, forceN);   // alleen voor de simulatietest
      while (list.length > target) list.pop();
      for (const c of list) { if (!validLeg(c)) spawn(c); else c.next = planNext(c); }
      while (list.length < target) {
        const c = { paint: pick(PAINT), accent: pick(ACCENT), id: carSeq++ };
        { const u = Math.random(); let acc = 0; c.type = LP_TYPES[LP_TYPES.length - 1]; for (const t of LP_TYPES) { acc += LP_WEIGHT[t]; if (u < acc) { c.type = t; break; } } c.paint = LP_FIXED[c.type] || pick(LP_PAINT); }
        if (!spawn(c)) break;
        list.push(c);
      }
      for (let i = list.length - 1; i >= 0; i--) if (!list[i].path) list.splice(i, 1);
    }
    const M = new THREE.Matrix4(), W = new THREE.Matrix4(), Q = new THREE.Matrix4(), col = new THREE.Color();
    const WHEELS = [[WB, TRACK], [WB, -TRACK], [-WB, TRACK], [-WB, -TRACK]];
    // ---------- Vering ----------
    // Elk wiel voelt de grond eronder (rijbaan 12 cm, stoeprand 25 cm, berm, brugdek). De carrosserie hangt
    // aan veren: ze volgt het vlak door de vier wielen, veert na als een wiel een stoeprand op- of afrijdt,
    // helt naar buiten in een bocht en duikt in bij het remmen.
    const baseOf_ = c => (c.sy ?? ASPH_H) - ASPH_H;   // maaiveld onder de auto (0 op een vlakke weg, hoger op een heuvel of viaduct)
    const lvlOf = (a, c) => a.y - baseOf_(c);         // hoogte van iemand t.o.v. de weg van deze auto
    function groundPt(x, z) {
      let best = 0;
      for (const cl of nearby(x, z)) for (const s2 of cl.surfaces) {
        const t = surfTop(s2, x, z);
        if (t !== null && t < 0.6 && t > best) best = t;
      }
      return best;
    }
    const wheelWorld = (c, wx, wz) => { const ch = Math.cos(c.h), sh = Math.sin(c.h); return [c.x + wx * ch - wz * sh, c.z + wx * sh + wz * ch]; };
    function suspend(c, dt) {
      if (dt <= 0) return;
      const g = WHEELS.map(([wx, wz], j) => { const [x, z] = wheelWorld(c, wx, wz), t = roadTop(x, z, c.g && c.g[j] != null ? c.g[j] : (c.sy ?? ASPH_H)); return t !== null ? t : Math.max(c.vec ? ASPH_H : 0, groundPt(x, z)); });   // het wiel voelt de weg onder zich, op elke hoogte
      // een wiel dat een stoeprand op of af gaat: tikje in de vering en een doffe bons
      let jolt = 0;
      g.forEach((v, j) => { jolt = Math.max(jolt, Math.abs(v - (c.g[j] ?? v))); });
      if (jolt > 0.07 && c.v > 1.5 && (c.lastBump || 0) < performance.now() - 400) { c.lastBump = performance.now(); sound.impact(Math.min(0.35, jolt * c.v * 0.12), c.x, ASPH_H, c.z, false); }
      c.g = g;
      c.onCurb = g.some(v => v > Math.min(...g) + 0.07);
      let yaw = c.h - (c.hPrev ?? c.h); yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw)) / dt; c.hPrev = c.h;
      const acc = (c.v - (c.vPrev ?? c.v)) / dt; c.vPrev = c.v;
      const gF = (g[0] + g[1]) / 2, gR = (g[2] + g[3]) / 2, gP = (g[0] + g[2]) / 2, gN = (g[1] + g[3]) / 2;
      const yT = (gF + gR) / 2;
      const pT = Math.atan2(gF - gR, 2 * WB) + Math.max(-0.05, Math.min(0.05, acc * 0.008));
      const rT = -Math.atan2(gP - gN, 2 * TRACK) - Math.max(-0.06, Math.min(0.06, c.v * yaw * 0.011));
      const spring = (val, vel, target, k, d) => { vel += (k * (target - val) - d * vel) * dt; return [val + vel * dt, vel]; };
      const n = Math.max(1, Math.ceil(dt / 0.01)), sub = dt / n, keepDt = dt;
      dt = sub;
      for (let i = 0; i < n; i++) {
        [c.sy, c.vy] = spring(c.sy, c.vy, yT, 220, 16);
        [c.pitch, c.vp] = spring(c.pitch, c.vp, pT, 160, 12);
        [c.roll, c.vr] = spring(c.roll, c.vr, rT, 160, 12);
      }
      dt = keepDt;
    }
    // ---------- Takelwagen ----------
    // Een wrak (of een auto die telkens opnieuw botst) wordt opgeruimd: een gele takelwagen met knipperlicht rijdt langs de weg
    // aan, steekt voorbij, achteruit naar de neus van het wrak, haakt het vast en sleept het de stad uit. Het wrak komt daarna
    // schoon en heel ergens anders weer de weg op. Zo loopt een vastgelopen kruispunt vanzelf weer door.
    const tows = []; let towTimer = 0, towScan = 0;
    const TOW_LEN = 5.4;   // hart takelwagen tot hart wrak aan de haak
    function towDispatch() {
      return;   // geen takelwagens meer: een kapotte auto brandt uit en ontploft (zie hurt/ignite/explode)
      if (tows.length >= (reckless ? 5 : 1) || list.length < 3) return;
      let best = null, bs = 0;
      for (const c of list) {
        if (c.towed || c.fly || !c.path || c.towT) continue;
        const wrecked = (c.crash && (c.trT || 0) > 1.5), stale = (c.stillT || 0) > 6;
        if (!wrecked && !stale) continue;
        let n = 0; for (const o of list) if (o !== c && o.v < 0.4 && Math.hypot(o.x - c.x, o.z - c.z) < 16) n++;
        const sc = 1 + n * 1.5 + (c.stillT || 0) * 0.1 + (c.trT || 0) * 0.05 + (wrecked ? 1 : 0);
        if (sc > bs) { bs = sc; best = c; }
      }
      if (!best) return;
      const [x1, z1] = posOn(best, best.s), [x2, z2, h2] = posOn(best, best.s + 2);
      const R = Math.hypot(x2 - x1, z2 - z1) > 0.01 ? Math.atan2(z2 - z1, x2 - x1) : h2, fx = Math.cos(R), fz = Math.sin(R), sx = -fz, sz = fx;
      best.towT = true;
      tows.push({ wreck: best, R, fx, fz, sx, sz, x: best.x - fx * 38 + sx * 2.6, z: best.z - fz * 46 + sz * 2.6, h: R, v: 0, spin: 0, steer: 0, pitch: 0, roll: 0, sy: ASPH_H, g: [ASPH_H, ASPH_H, ASPH_H, ASPH_H], type: 'bestel', paint: '#f2b300', accent: '#ffb23e', phase: 'in', t: 0, beep: 0, dist: 0 });
      sound.fx('horn', best.x, 1, best.z, 0.6);
    }
    function towStep(T, dt) {
      const W = T.wreck, alive = list.indexOf(W) >= 0 && !W.fly && W.path;
      T.t += dt; T.flash = (T.flash || 0) + dt; T.accent = Math.floor(T.flash / 0.22) % 2 ? '#ffffff' : '#ff9a1f';
      const ax = (x, z) => (x - W.x) * T.fx + (z - W.z) * T.fz, lat = (x, z) => (x - W.x) * T.sx + (z - W.z) * T.sz;
      let dv = 0;
      if (T.phase === 'in') {
        const al = ax(T.x, T.z), rem = 9 - al;
        if (!alive || (!W.towed && !W.crash && W.v > 2 && al > -10)) { T.phase = 'out'; W.towT = false; W.towed = false; W.ghost = 0; T.wreck = null; }
        else if (rem <= 0.3) T.phase = 'swing';
        else { const want = Math.max(2, Math.min(16, Math.sqrt(2 * 5 * rem))); T.v += Math.max(-10 * dt, Math.min(6 * dt, want - T.v)); dv = T.v; }
      } else if (T.phase === 'swing') {
        if (!alive) { T.phase = 'out'; W.towT = false; W.towed = false; W.ghost = 0; T.wreck = null; }
        else {
          const al = ax(T.x, T.z), la = lat(T.x, T.z);
          T.v = -2.4; dv = T.v; T.beep -= dt; if (T.beep <= 0) { T.beep = 0.55; sound.fx('beep', T.x, 0.8, T.z); }
          const k = Math.max(0, Math.min(1, (9 - al) / 3.6));   // zijwaarts terug op de as van het wrak
          const tl = 2.6 * (1 - k), dl = tl - la; T.x += T.sx * dl * Math.min(1, dt * 4); T.z += T.sz * dl * Math.min(1, dt * 4);
          if (al <= TOW_LEN + 0.15 && Math.abs(la) < 0.3) { T.phase = 'hook'; T.t = 0; T.v = 0; W.towed = true; W.crash = null; W.cvx = W.cvz = 0; W.w = 0; W.v = 0; W.ghost = 99; W.blood = W.blood; sound.fx('click', W.x, 0.8, W.z); }
        }
      } else if (T.phase === 'hook') {
        if (!alive) { T.phase = 'out'; W.towT = false; W.towed = false; W.ghost = 0; T.wreck = null; }
        else { const k = Math.min(1, T.t / 1.0); dv = 0; T.v = 0; if (T.t > 1.0) { T.phase = 'out'; T.t = 0; sound.fx('horn', T.x, 1, T.z, 0.5); } else if (T.t > 0.5 && !T.chain) { T.chain = 1; sound.fx('crunch', T.x, 0.5, T.z, 0.25); } }
      } else {   // 'out': weg
        T.v += Math.min(5 * dt, 13 - T.v); dv = T.v; T.dist += T.v * dt;
        if (T.dist > 50) {
          if (T.wreck) { const w = T.wreck; w.towed = false; w.towT = false; w.ghost = 0; w.blood = 0; w.bloodTrail = 0; w.crash = null; w.v = 0; w.roll = 0; w.pitch = 0; w.rx = undefined; w.stillT = 0; spawn(w); }
          tows.splice(tows.indexOf(T), 1); return;
        }
      }
      T.x += T.fx * dv * dt; T.z += T.fz * dv * dt; T.h = T.R; T.spin += dv / WR * dt;
      { const t = roadTop(T.x, T.z, ASPH_H); T.sy = t ?? ASPH_H; T.g = [T.sy, T.sy, T.sy, T.sy]; }
      // het wrak aan de haak: neus omhoog, volgt de wagen
      if (T.wreck && (T.phase === 'hook' || T.phase === 'out')) {
        const W2 = T.wreck, k = T.phase === 'out' ? 1 : Math.min(1, T.t / 1.0), e = k * k * (3 - 2 * k), tx = T.x - T.fx * TOW_LEN, tz = T.z - T.fz * TOW_LEN;
        W2.x += (tx - W2.x) * Math.min(1, dt * (T.phase === 'out' ? 12 : 5)); W2.z += (tz - W2.z) * Math.min(1, dt * (T.phase === 'out' ? 12 : 5));
        let dh = T.R - W2.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); W2.h += dh * Math.min(1, dt * 4);
        W2.pitch = 0.2 * e; W2.roll = (W2.roll || 0) * (1 - Math.min(1, dt * 4)); W2.sy = T.sy + 0.28 * e; W2.g = [T.sy + 0.55 * e, T.sy + 0.55 * e, T.sy, T.sy];
        W2.v = T.phase === 'out' ? T.v : 0; W2.spin += (T.phase === 'out' ? T.v : 0) / WR * dt; W2.steer = 0;
      }
    }
    function towTick(dt) {
      towScan += dt;
      if (towScan >= 0.5) { for (const c of list) { c.stillT = (c.v < 0.25 && !c.towed) ? (c.stillT || 0) + towScan : 0; c.trT = ((c.crash || c.stillT > 0) && !c.towed) ? (c.trT || 0) + towScan : 0; } towScan = 0; towTimer += 0.5; if (towTimer >= 2.5) { towTimer = 0; towDispatch(); } }
      for (let i = tows.length - 1; i >= 0; i--) towStep(tows[i], dt);
    }
    // ---------- Schade: een auto overleeft een paar klappen, gaat dan roken, vat vlam en ontploft; dan is hij weg ----------
    const SM = { N: 170, F: 120 };
    const smokeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }), SM.N);
    const fireMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), SM.F);
    { const w = new THREE.Color('#ffffff'); for (let i = 0; i < SM.N; i++) smokeMesh.setColorAt(i, w); for (let i = 0; i < SM.F; i++) fireMesh.setColorAt(i, w); }
    for (const m of [smokeMesh, fireMesh]) { m.frustumCulled = false; m.count = 0; m.userData.noOcc = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
    const smokeP = [], fireP = [], FC0 = new THREE.Color('#fff2a0'), FC1 = new THREE.Color('#ff7a1a'), FC2 = new THREE.Color('#a8200c'), SC0 = new THREE.Color('#3a3835'), SC1 = new THREE.Color('#9b9a96');
    const rnd = () => Math.random() - 0.5;
    function puffSmoke(x, y, z, dark, big) { if (smokeP.length >= SM.N) smokeP.shift(); smokeP.push({ x, y, z, vx: rnd() * (big ? 3 : 0.7), vy: (big ? 2.2 : 1.1) + Math.random() * 1.1, vz: rnd() * (big ? 3 : 0.7), t: 0, life: (big ? 3 : 1.8) + Math.random() * 1.3, s0: big ? 1.1 : 0.55, s1: big ? 4.6 : 2.0, dark }); }
    function puffFire(x, y, z, big, vx, vz) { if (fireP.length >= SM.F) fireP.shift(); fireP.push({ x, y, z, vx: vx ?? rnd() * 0.8, vy: (big ? 2.5 : 1.4) + Math.random() * 1.6, vz: vz ?? rnd() * 0.8, t: 0, life: (big ? 0.7 : 0.4) + Math.random() * 0.3, s0: big ? 1.5 : 0.8, s1: 0.2 }); }
    function fxTick(dt) {
      for (const L of [smokeP, fireP]) for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.t += dt; if (q.t >= q.life) { L.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vx *= 1 - dt * 0.6; q.vz *= 1 - dt * 0.6; }
    }
    function fxRender() {
      let n = 0;
      for (const q of smokeP) { const k = q.t / q.life, s = (q.s0 + (q.s1 - q.s0) * Math.min(1, k * 1.4)) * (k > 0.75 ? (1 - k) / 0.25 : 1); GM.compose(GV.set(q.x, q.y, q.z), GQ.identity(), GS.set(s, s, s)); smokeMesh.setMatrixAt(n, GM); smokeMesh.setColorAt(n, GC.copy(q.dark ? SC0 : SC1).lerp(SC1, q.dark ? k * 0.7 : 0)); n++; }
      smokeMesh.count = n; smokeMesh.instanceMatrix.needsUpdate = true; if (smokeMesh.instanceColor) smokeMesh.instanceColor.needsUpdate = true;
      n = 0;
      for (const q of fireP) { const k = q.t / q.life, s = q.s0 + (q.s1 - q.s0) * k; GM.compose(GV.set(q.x, q.y, q.z), GQ.identity(), GS.set(s, s, s)); fireMesh.setMatrixAt(n, GM); fireMesh.setColorAt(n, k < 0.5 ? GC.copy(FC0).lerp(FC1, k * 2) : GC.copy(FC1).lerp(FC2, (k - 0.5) * 2)); n++; }
      fireMesh.count = n; fireMesh.instanceMatrix.needsUpdate = true; if (fireMesh.instanceColor) fireMesh.instanceColor.needsUpdate = true;
    }
    function hurt(c, amt) {   // een klap: schade, maar nooit twee keer binnen een halve seconde (dezelfde botsing)
      if (c.burn || c.dmgT > 0 || !(amt > 0)) return;
      c.dmgT = 0.5; c.hp = (c.hp ?? 100) - amt;
      if (c.hp <= 0) ignite(c);
    }
    function ignite(c) {   // vlam: hij rolt uit en blijft staan tot hij ontploft
      c.burn = { t: 0, T: 4.5 + Math.random() * 3 };
      if (!c.crash) { const ch = Math.cos(c.h), sh = Math.sin(c.h); c.crash = { t: 0, still: 0 }; c.cvx = ch * c.v; c.cvz = sh * c.v; c.w = 0; }
      c.slide = 1; c.held = false; c.fly = c.fly || null;
    }
    function explode(c) {
      const y = baseOf_(c) + 1.0;
      for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, sp = 1.5 + Math.random() * 5; puffFire(c.x + rnd() * 2, y + Math.random() * 0.8, c.z + rnd() * 2, true, Math.cos(a) * sp, Math.sin(a) * sp); }
      for (let i = 0; i < 16; i++) puffSmoke(c.x + rnd() * 2.5, y + Math.random() * 1.2, c.z + rnd() * 2.5, true, true);
      sound.fx('boom', c.x, 1, c.z, 1); sound.impact(1, c.x, 0.6, c.z, false);
      for (const a of people.agents) { const dx = a.x - c.x, dz = a.z - c.z, d = Math.hypot(dx, dz); if (d < 7 && (a.state === 'walk' || a.state === 'pause')) { sound.scream(a.x, 1.5, a.z, 'horror', a.kid ? 'k' : a.female ? 'v' : 'm'); people.hit(a, dx / (d || 1) * 7, dz / (d || 1) * 7); gore(c, a, dx / (d || 1) * 7, dz / (d || 1) * 7, 8); } }
      for (const o of list) if (o !== c && !o.burn && Math.hypot(o.x - c.x, o.z - c.z) < 5.5) hurt(o, 35);   // buurauto's lopen schade op: een kettingreactie kan
      c.burn = null; c.hp = 100; c.dmgT = 0; c.crash = null; c.slide = 0; c.v = 0; c.w = 0; c.cvx = c.cvz = 0; c.roll = 0; c.pitch = 0; c.rx = undefined; c.blood = 0; c.bloodTrail = 0; c.ghost = 0; c.stuck = 0; c.wait = 0;
      spawn(c);   // de wrakstukken zijn weg; elders in de stad begint een nieuwe auto
    }
    function carFx(c, dt, far) {
      if (c.dmgT > 0) c.dmgT -= dt;
      const hp = c.hp ?? 100; if (hp >= 65 && !c.burn) return;
      if (c.burn) { c.burn.t += dt; if (c.burn.t > c.burn.T) { explode(c); return; } }
      if (far) return;
      const rate = c.burn ? 26 : hp < 35 ? 9 : 4;
      c.fxA = (c.fxA || 0) + dt * rate;
      const ch = Math.cos(c.h), sh = Math.sin(c.h), y = baseOf_(c) + 1.1;
      while (c.fxA >= 1) {
        c.fxA -= 1; const px = c.x + ch * 1.5 + rnd() * 0.6, pz = c.z + sh * 1.5 + rnd() * 0.6;
        if (c.burn) { puffFire(px, y, pz, false); if (Math.random() < 0.6) puffSmoke(px, y + 0.5, pz, true, false); }
        else puffSmoke(px, y, pz, hp < 35, false);
      }
    }
    // Na een botsing zoekt de auto zelf de weg terug: hij pakt de dichtstbijzijnde rijstrook (liefst in zijn eigen richting),
    // rijdt er in een vloeiende bocht naartoe en gaat dan gewoon verder; geen teleportatie. Staat er een gebouw in de weg: dan pas opnieuw beginnen.
    const RJ = { ok: 0, fail: 0 };
    function rejoin(c) {
      if (!VG.edges.size) return false;
      const hx = Math.cos(c.h), hz = Math.sin(c.h), cand = [];
      for (const e of VG.edges.values()) {
        const nl = VLANE[e.t].length;
        for (const dir of (e.oneway ? [0] : [0, 1])) {
          const nA = dir ? e.b : e.a, nB = dir ? e.a : e.b;
          for (let lane = 0; lane < nl; lane++) {
            const pts = trimPts(lanePts(e, dir, laneOff(e, lane)), nodeTrim(nA), nodeTrim(nB)); if (!pts || pts.length < 2) continue;
            for (let i = 0; i < pts.length - 1; i++) {
              const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, tt = Math.max(0, Math.min(1, ((c.x - a[0]) * ex + (c.z - a[1]) * ez) / l2));
              const d = Math.hypot(a[0] + ex * tt - c.x, a[1] + ez * tt - c.z), sc = d - 5 * ((ex * hx + ez * hz) / Math.sqrt(l2));
              if (d < 60) cand.push({ sc, d, e, dir, lane, pts, i });
            }
          }
        }
      }
      cand.sort((x, y) => x.sc - y.sc);
      const seen = new Set();
      for (const best of cand) {   // de beste rijstrook eerst; staat er een gebouw in de weg, dan de volgende
        const key = best.e.id + '/' + best.dir + '/' + best.lane; if (seen.has(key)) continue; seen.add(key); if (seen.size > 6) break;
        const { pts, e, dir, lane } = best; let m = best.i + 1, run = 0;
        while (m < pts.length - 1 && run < 7) { run += Math.hypot(pts[m + 1][0] - pts[m][0], pts[m + 1][1] - pts[m][1]); m++; }
        const nB = dir ? e.a : e.b, join = bez([c.x, c.z], [hx, hz], pts[m], dirAt(pts, m), 0.42, 16);
        let free = true;
        for (let i = 3; i < join.length && free; i++) { const [q, r] = worldToCell(join[i][0], join[i][1]), T = modTop.get(q + ',' + r); if (columnTop(q, r) > 1.0 || (T && T.inst && modMeta(T.inst.m).bouw)) free = false; }
        if (!free) continue;
        const all = [[c.x - hx * WB, c.z - hz * WB]].concat(join, pts.slice(m + 1));   // begint bij de achteras: het midden van de auto blijft precies waar het was
        useLeg(c, { vec: true, eid: e.id, dir, lane, nodeEnd: nB, q: 100000 + nB, r: 1, inS: 0, outS: 3, kind: 'lane', path: mkPath(all), cx: 0, cz: 0, exitPt: all[all.length - 1], exitD: dirAt(all, all.length - 1) });
        c.prev = null; c.s = WB; c.ghost = 1.5; c.ease = 0; c.stuck = 0; c.wait = 0; c.v = 0;
        return true;
      }
      return false;
    }
    // iemand wordt geraakt: druppels, spatten op de grond, bloed op de auto, een plas als hij blijft liggen
    function gore(c, a, vx, vz, sp) {
      if (!GORE.on) return;
      sound.scream(a.x, (a.y || 0) + 1.2, a.z, 'bloed', a.kid ? 'k' : a.female ? 'v' : a.old ? 'o' : 'm');   // de kreet hoort bij het bloed
      const px = a.x, pz = a.z, py = (a.y || 0), k = Math.min(1, sp / 10), dl = Math.hypot(vx, vz) || 1, dx = vx / dl, dz = vz / dl;
      c.blood = Math.min(3, (c.blood || 0) + 1); c.bloodTrail = 6 + 4 * k;
      for (let i = 0; i < 10 + k * 12; i++) goreP.push({ x: px, y: py + 0.9, z: pz, vx: dx * (2 + Math.random() * 6 * (0.4 + k)) + (Math.random() - 0.5) * 3, vy: 1.5 + Math.random() * 4, vz: dz * (2 + Math.random() * 6 * (0.4 + k)) + (Math.random() - 0.5) * 3, t: 0, s: 0.6 + Math.random() * 0.8, g: py });
      if (goreP.length > GORE.PC) goreP.splice(0, goreP.length - GORE.PC);
      for (let i = 0; i < 3; i++) goreSplatAt(px + dx * (0.3 + i * 0.7) + (Math.random() - 0.5) * 0.6, py, pz + dz * (0.3 + i * 0.7) + (Math.random() - 0.5) * 0.6, 0.35 + Math.random() * 0.45, true);
      goreLater.push({ a, t: 1.1 });   // een plas onder wie blijft liggen
    }
    function goreTick(dt) {
      for (let i = goreLater.length - 1; i >= 0; i--) { const q = goreLater[i]; q.t -= dt; if (q.t > 0) continue; goreLater.splice(i, 1); const a = q.a, pr = a.rag && a.rag.p; const x = pr ? pr[6] : a.x, z = pr ? pr[8] : a.z; goreSplatAt(x, a.y || 0, z, 0.9 + Math.random() * 0.5, true); goreSplatAt(x + (Math.random() - 0.5) * 1.2, a.y || 0, z + (Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.3, true); }
      for (let i = goreP.length - 1; i >= 0; i--) { const q = goreP[i]; q.t += dt; q.vy -= 14 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; if (q.y <= q.g + 0.04 || q.t > 1.5) { if (q.t < 1.5 && goreI % 2 === 0) goreSplatAt(q.x, q.g, q.z, 0.12 + q.s * 0.14, true); goreP.splice(i, 1); } }
    }
    function goreRender() {
      let n = 0; const now = performance.now() / 1000;
      for (let i = 0; i < GORE.SC; i++) {
        const o = goreS[i]; if (!o) continue;
        if (o.t0 === undefined) o.t0 = now - o.t;
        const age = now - o.t0, fade = age > 150 ? Math.max(0, 1 - (age - 150) / 30) : 1; if (!fade) continue;
        GQ.setFromAxisAngle(GY, o.rot); GM.compose(GV.set(o.x, o.y, o.z), GQ, GS.set(o.s * o.sx * fade, 1, o.s * fade));
        goreSplat.setMatrixAt(n, GM); goreSplat.setColorAt(n, GC.set('#b3101c').lerp(GC2.set('#4a0b11'), Math.min(1, age / 45))); n++;
      }
      goreSplat.count = n; goreSplat.instanceMatrix.needsUpdate = true; if (goreSplat.instanceColor) goreSplat.instanceColor.needsUpdate = true;
      gorePart.count = goreP.length; goreP.forEach((q, i) => { GM.makeRotationFromEuler(GE.set(q.t * 9, q.t * 7, 0)).setPosition(q.x, q.y, q.z); GM.scale(GS.set(q.s, q.s, q.s)); gorePart.setMatrixAt(i, GM); }); gorePart.instanceMatrix.needsUpdate = true;
    }
    const GC2 = new THREE.Color(), GE = new THREE.Euler();
    function render() {
      goreRender(); fxRender();
      const all = tows.length ? list.concat(tows) : list, cnt = {}, bcnt = {}; for (const t of LP_TYPES) { cnt[t] = 0; bcnt[t] = [0, 0, 0]; }
      all.forEach((c, i) => {
        // model wijst langs +x; eerst kantelen (rollen, stampen), dan draaien, dan op de vering zetten
        M.makeRotationY(-c.h).multiply(Q.makeRotationZ(c.pitch || 0)).multiply(Q.makeRotationX(c.roll || 0)).setPosition(c.x, c.sy ?? ASPH_H, c.z);
        const ty = LPM[c.type] ? c.type : LP_TYPES[0], ti = cnt[ty]++, L = LPM[ty];
        L.body.setMatrixAt(ti, M); col.set(c.paint); L.body.setColorAt(ti, col);
        for (const k of ['glass', 'trim', 'lamp']) if (L[k]) L[k].setMatrixAt(ti, M);
        if (L.glow) { L.glow.setMatrixAt(ti, M); col.set(c.accent); L.glow.setColorAt(ti, col); }
        if (L.blood && c.blood) { for (let k = 0; k < Math.min(3, c.blood); k++) { const bm = L.blood[k]; if (bm) { bm.setMatrixAt(bcnt[ty][k]++, M); } } }
        if (c.bloodTrail > 0 && GORE.on && !c.fly && Math.hypot(c.x - (c.btx ?? 1e9), c.z - (c.btz ?? 1e9)) > 1.4) {   // bloedige bandensporen
          if (c.btx !== undefined) for (const j2 of [2, 3]) { const [wx2, wz2] = WHEELS[j2], [bx, bz] = wheelWorld(c, wx2, wz2); goreSplatAt(bx, c.g ? c.g[j2] : ASPH_H, bz, 0.28, true); }
          c.btx = c.x; c.btz = c.z; c.bloodTrail -= 0.5;
        }
        WHEELS.forEach(([wx, wz], j) => {
          // wielen staan op hun eigen stukje grond, los van de kanteling van de carrosserie
          const [wxW, wzW] = wheelWorld(c, wx, wz);
          if (c.fly || Math.abs(c.roll || 0) > 0.5) { W.copy(M).multiply(Q.makeTranslation(wx, WR - 0.6, wz)); W.multiply(Q.makeRotationZ(-c.spin)); meshes.tire.setMatrixAt(i * 4 + j, W); meshes.holes.setMatrixAt(i * 4 + j, W); meshes.rim.setMatrixAt(i * 4 + j, W); const side = wz > 0 ? 1 : -1; Q.makeTranslation(0, 0, side * 0.128); meshes.hub.setMatrixAt(i * 8 + j * 2, W.clone().multiply(Q)); Q.makeTranslation(0, 0, -side * 0.128); meshes.hub.setMatrixAt(i * 8 + j * 2 + 1, W.clone().multiply(Q)); col.set(c.accent); meshes.hub.setColorAt(i * 8 + j * 2, col); meshes.hub.setColorAt(i * 8 + j * 2 + 1, col); return; }   // in de lucht of op zijn kop: de wielen zitten aan de auto
          W.makeRotationY(-c.h).setPosition(wxW, (c.g ? c.g[j] : ASPH_H) + WR, wzW);
          if (wx > 0) W.multiply(Q.makeRotationY(-(c.steer || 0)));   // naar de binnenkant van de bocht
          W.multiply(Q.makeRotationZ(-c.spin));                         // bovenkant draait naar voren
          meshes.tire.setMatrixAt(i * 4 + j, W);
          meshes.holes.setMatrixAt(i * 4 + j, W);
          const side = wz > 0 ? 1 : -1;
          meshes.rim.setMatrixAt(i * 4 + j, W);
          Q.makeTranslation(0, 0, side * 0.128); meshes.hub.setMatrixAt(i * 8 + j * 2, W.clone().multiply(Q));
          Q.makeTranslation(0, 0, -side * 0.128); meshes.hub.setMatrixAt(i * 8 + j * 2 + 1, W.clone().multiply(Q));
          col.set(c.accent); meshes.hub.setColorAt(i * 8 + j * 2, col); meshes.hub.setColorAt(i * 8 + j * 2 + 1, col);
        });
      });
      for (const t of LP_TYPES) { const L = LPM[t]; (L.blood || []).forEach((bm, k) => { if (!bm) return; bm.count = bcnt[t][k]; bm.visible = bcnt[t][k] > 0; bm.instanceMatrix.needsUpdate = true; });
        for (const m of [L.body, L.glass, L.trim, L.glow, L.lamp]) if (m) { m.count = cnt[t]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
      for (const [k, pd] of Object.entries(PARTS)) {
        const m = meshes[k]; m.count = all.length * pd.per; m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    }
    // ---------- Aanrijdingen ----------
    // Wie geraakt wordt valt om; wie al ligt (of net opstaat) wordt weer meegesleurd of opzij geduwd.
    function hitPeople(c, dt, peds, lying, vx, vz) {
      const sp = Math.hypot(vx, vz);
      // de speler zelf (met een eigen lichaam): netjes rijdend verkeer raakt je niet op de stoep, een auto die je raakt laat je vallen
      if (sp > 2.5 && mode === 'walk' && !player.down && player.y - baseOf_(c) < (reckless ? 0.35 : 0.2) && player.y - baseOf_(c) > -1 && inside(c, player.x, player.z, 0.15, 0.2)) { people.hitPlayer(vx * 1.1, vz * 1.1); gore(c, { x: player.x, y: player.y, z: player.z }, vx, vz, sp); }
      for (const a of peds) {
        { const ly = lvlOf(a, c); if (ly >= (reckless ? 0.3 : 0.2) || ly < -1 || !inside(c, a.x, a.z, 0.15, 0.2)) continue; }   // netjes rijdend verkeer raakt niemand op de stoep
        if (sp > 2) { if (crashLog.length < 40) crashLog.push({ hit: 1, car: [+c.x.toFixed(1), +c.z.toFixed(1), +c.h.toFixed(2), c.eid, c.kind, +sp.toFixed(1), c.next && c.next.kind], ped: [+a.x.toFixed(1), +a.z.toFixed(1), +a.y.toFixed(2), a.node && a.node.key, a.wps.length, a.wps[0] && a.wps[0].map(v => +v.toFixed(1))] }); people.hit(a, vx * 1.1, vz * 1.1); gore(c, a, vx, vz, sp); sound.carHit(Math.min(1, (sp - 2) / 10), a.x, 0.8, a.z); sound.grunt(a.x, 0.9, a.z, Math.min(1, (sp - 2) / 10), a.kid ? 'k' : a.female ? 'v' : a.old ? 'o' : 'm'); }
        else {   // stapvoets: mensen worden zacht opzij geschoven
          const dx = a.x - c.x, dz = a.z - c.z, lat = -dx * Math.sin(c.h) + dz * Math.cos(c.h), sgn = lat >= 0 ? 1 : -1;
          a.x += -Math.sin(c.h) * sgn * dt * 1.5; a.z += Math.cos(c.h) * sgn * dt * 1.5;
        }
      }
      for (const a of lying) {
        const pr = a.rag.p;
        if (Math.hypot(pr[6] - c.x, pr[8] - c.z) > 4.2) continue;
        // over iemand heen die al ligt: een doffere klap (niet elk beeldje opnieuw)
        if (sp > 2 && (a.klapT || 0) < performance.now() - 700 && inside(c, pr[6], pr[8], 0.2, 0.2)) { a.klapT = performance.now(); sound.carHit(Math.min(0.4, sp / 25), pr[6], 0.4, pr[8]); }
        // geraakte delen krijgen de snelheid van de auto mee, plus een zetje opzij en omhoog
        people.kick(a, (px, pz, py) => py < 1.25 + (c.sy || 0) && py > (c.sy || 0) - 1.2 && inside(c, px, pz, 0.12, 0.12), vx * 1.1 + (pr[6] - c.x) * 0.4, sp > 2 ? 1 + sp * 0.12 : 0.4, vz * 1.1 + (pr[8] - c.z) * 0.4);
      }
    }
    // Twee auto's die elkaar raken: botsen (rechthoeken, impuls, wegglijden en tollen)
    const HL = 2.3, HW = 0.95, INERT = (4 * HL * HL + 4 * HW * HW) / 12;
    const velOf = c => c.crash ? [c.cvx, c.cvz] : [Math.cos(c.h) * c.v, Math.sin(c.h) * c.v];
    function collide() { collidePass(true); collidePass(false); }   // twee keer: drie auto's op een kluitje komen ook los
    function collidePass(first) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j], dx = B.x - A.x, dz = B.z - A.z;
        // spookstand: een auto die net opnieuw begint of vastzat. Rijdt hij op de lijn (netjes), dan mag hij door een stilstaande
        // auto heen schuiven; stuurt hij zelf (roekeloos) of glijdt hij, dan duwt de ander hem gewoon opzij (geen klap, geen schade).
        const gA = A.ghost > 0 && A.rx === undefined && !A.crash, gB = B.ghost > 0 && B.rx === undefined && !B.crash;
        if (gA || gB) continue;
        const soft = A.ghost > 0 || B.ghost > 0;
        if (dx * dx + dz * dz > 27 || Math.abs((A.sy ?? 0) - (B.sy ?? 0)) > 2) continue;   // een viaduct erboven: geen botsing
        const axes = [[Math.cos(A.h), Math.sin(A.h)], [-Math.sin(A.h), Math.cos(A.h)], [Math.cos(B.h), Math.sin(B.h)], [-Math.sin(B.h), Math.cos(B.h)]];
        const ext = (c, ax) => HL * Math.abs(Math.cos(c.h) * ax[0] + Math.sin(c.h) * ax[1]) + HW * Math.abs(-Math.sin(c.h) * ax[0] + Math.cos(c.h) * ax[1]);
        let best = 1e9, n = null;
        for (const ax of axes) {
          const d = dx * ax[0] + dz * ax[1], ov = ext(A, ax) + ext(B, ax) - Math.abs(d);
          if (ov <= 0) { n = null; best = -1; break; }
          if (ov < best) { best = ov; n = d >= 0 ? ax : [-ax[0], -ax[1]]; }
        }
        if (!n) continue;
        // uit elkaar duwen
        A.x -= n[0] * best / 2; A.z -= n[1] * best / 2; B.x += n[0] * best / 2; B.z += n[1] * best / 2;
        if (A.rx !== undefined) { A.rx -= n[0] * best / 2; A.rz -= n[1] * best / 2; }
        if (B.rx !== undefined) { B.rx += n[0] * best / 2; B.rz += n[1] * best / 2; }
        if (!first) continue;   // tweede ronde: alleen uit elkaar duwen
        const [ax, az] = velOf(A), [bx, bz] = velOf(B), vrel = (bx - ax) * n[0] + (bz - az) * n[1];
        if (vrel >= 0) continue;
        const impact = -vrel;
        if (soft) {   // spook: alleen uit elkaar en afremmen, geen klap
          for (const c of [A, B]) { if (c.crash) { const k = c === A ? -1 : 1, vn = c.cvx * n[0] + c.cvz * n[1]; if (vn * k < 0) { c.cvx -= n[0] * vn; c.cvz -= n[1] * vn; } } else c.v *= 0.5; }
          continue;
        }
        // zacht tikje (netjes rijdend verkeer schampt hooguit): afremmen, niet tollen
        if (impact < (reckless ? 1.2 : 5.0)) { A.v *= 0.6; B.v *= 0.6; continue; }   // netjes verkeer: een tikje onder 18 km/u is geen klap
        const jimp = (1 + 0.25) * impact / 2;
        sound.fx('crunch', (A.x + B.x) / 2, 0.7, (A.z + B.z) / 2, Math.min(1, impact / 12));
        if (crashLog.length < 40) crashLog.push({ impact: +impact.toFixed(1), A: [+A.x.toFixed(1), +A.z.toFixed(1), A.eid || A.q + ',' + A.r, A.kind, +A.v.toFixed(1), A.why], B: [+B.x.toFixed(1), +B.z.toFixed(1), B.eid || B.q + ',' + B.r, B.kind, +B.v.toFixed(1), B.why] });
        // klap: beide auto's gaan glijden en tollen
        const rx = dx / 2, rz = dz / 2;
        for (const [c, sgn, vx0, vz0, rrx, rrz] of [[A, -1, ax, az, rx, rz], [B, 1, bx, bz, -rx, -rz]]) {
          const fx = n[0] * jimp * sgn, fz = n[1] * jimp * sgn;
          c.crash = { t: 0, still: 0 }; c.cvx = vx0 + fx; c.cvz = vz0 + fz;
          c.w = (c.w || 0) + (rrx * fz - rrz * fx) / INERT * 0.9 + (Math.random() - 0.5) * 0.4;
          c.rx = undefined; c.held = false;
        }
        hurt(A, impact * 1.9); hurt(B, impact * 1.9);
        sound.impact(Math.min(1, impact / 8), (A.x + B.x) / 2, 0.6, (A.z + B.z) / 2, false);
        sound.carHit(Math.min(1, impact / 9), (A.x + B.x) / 2, 0.7, (A.z + B.z) / 2, true);
      }
    }
    // Weggeslingerd (door de Hulk): een boog door de lucht, tollend; bij de landing nog even glijden, daarna
    // ergens anders opnieuw beginnen
    function toss(c, dx, dz, up) {
      const l = Math.hypot(dx, dz) || 1; c.fly = { vx: dx / l * 7, vz: dz / l * 7, vy: up || 7, y: 0, t: 0, wr: 5 + Math.random() * 3, wp: (Math.random() - 0.5) * 2 }; c.crash = null; c.v = 0; c.held = false; c.ghost = 0; c.stuck = 0;
      c.fly.g0 = c.sy ?? ASPH_H;
    }
    function flyStep(c, dt) {
      const F = c.fly; F.t += dt; F.vy -= 9.81 * dt; F.y += F.vy * dt; c.x += F.vx * dt; c.z += F.vz * dt;
      c.roll = (c.roll || 0) + F.wr * dt; c.pitch = (c.pitch || 0) + F.wp * dt; c.sy = F.g0 + F.y + 0.6;
      if (F.y <= 0 && F.vy < 0) {   // landing: een klap, daarna op zijn kop of op zijn wielen blijven liggen en opnieuw beginnen
        sound.impact(1, c.x, 0.6, c.z, false); sound.carHit(0.8, c.x, 0.7, c.z, true); hurt(c, 30);
        c.fly = null; c.roll = Math.round((c.roll || 0) / Math.PI) * Math.PI; c.pitch = 0; c.sy = F.g0 + (Math.abs(Math.cos(c.roll)) < 0.5 ? 0.5 : Math.abs(Math.round(c.roll / Math.PI)) % 2 ? 0.9 : 0);
        c.crash = { t: 9, still: 0 }; c.cvx = F.vx * 0.3; c.cvz = F.vz * 0.3; c.w = 0;
        if (typeof people !== 'undefined') for (const a of people.agents) if ((a.state === 'walk' || a.state === 'pause') && Math.hypot(a.x - c.x, a.z - c.z) < 3.5) { people.hit(a, F.vx * 0.5, F.vz * 0.5); gore(c, a, F.vx, F.vz, 8); }
      }
    }
    function crashStep(c, dt, peds, lying) {
      const C = c.crash; C.t += dt;
      // banden glijden over de weg: afremmen met ~0,6 g, tollen dempt uit
      let sp = Math.hypot(c.cvx, c.cvz);
      const dec = Math.min(sp, (c.onCurb ? 9 : c.slide ? 3.6 : 6) * dt);   // een uit de bocht gevlogen auto glijdt verder
      if (sp > 1e-6) { c.cvx -= c.cvx / sp * dec; c.cvz -= c.cvz / sp * dec; }
      c.w *= Math.exp(-1.8 * dt);
      const nx = c.x + c.cvx * dt, nz = c.z + c.cvz * dt;
      // tegen een gebouw of blok: daar stopt het
      const [q, r] = worldToCell(nx, nz);
      const tb = sp > 0.5 && (terrGround(nx, nz) - baseOf_(c) > 0.9 || terrGround(nx + c.cvx / sp * 1.8, nz + c.cvz / sp * 1.8) - baseOf_(c) > 0.9);   // een berg of heuvel in de weg
      if (tb || columnTop(q, r) > 1.0 || (sp > 2.5 && collapse.probe(nx + c.cvx / sp * 1.7, nz + c.cvz / sp * 1.7, sp, c.cvx, c.cvz))) { c.cvx *= -0.25; c.cvz *= -0.25; c.w *= 0.5; if (sp > 3) hurt(c, sp * 1.2); sound.impact(Math.min(1, sp / 10), c.x, 0.6, c.z, false); }
      else { c.x = nx; c.z = nz; }
      c.h += c.w * dt;
      sp = Math.hypot(c.cvx, c.cvz); c.v = sp;
      c.steer *= 0.9;
      suspend(c, dt);
      c.spin += Math.min(sp / WR, SPIN_MAX) * dt;
      hitPeople(c, dt, peds, lying, c.cvx, c.cvz);
      C.still = sp < 0.3 && Math.abs(c.w) < 0.25 ? C.still + dt : 0;
      if (!c.burn && (C.still > 2.5 || C.t > 12)) {   // weer verder: terug naar de rijbaan (of ergens anders opnieuw)
        c.crash = null; c.slide = 0; c.v = 0; c.w = 0; c.rx = undefined; c.roll = 0; c.pitch = 0;
        const [px, pz] = posOn(c, c.s);
        const dd = Math.hypot(px - c.x, pz - c.z);
        if (dd > 1.5) { if (rejoin(c)) RJ.ok++; else { RJ.fail++; if (dd > 6) spawn(c); else c.ease = 2.5; } } else c.ease = 2.5;
      }
    }
    // Ligt punt (x, z) binnen de auto (plus marge)?
    function inside(c, x, z, mx, mz) {
      const dx = x - c.x, dz = z - c.z, ch = Math.cos(c.h), sh = Math.sin(c.h);
      const al = dx * ch + dz * sh, lat = -dx * sh + dz * ch;
      return Math.abs(al) < 2.35 + mx && Math.abs(lat) < 0.96 + mz;
    }
    return {
      vecGraph,
      // stoep langs een tak: de lijn opzij geschoven en bij kruisingen ingekort tot aan de stoeprand van de zijstraat
      vecWalk: (e, dir, off) => vecWalkPts(VG, e, dir, off),
      // meetpunten voor de simulatietest: auto's naast de weg, vastgelopen, ongeldige posities
      setForce(n) { forceN = n; carsDirty = true; },
      crashLog, toss,
      peek: () => list.map(c => ({ type: c.type, x: c.x, z: c.z, h: c.h, v: c.v, persona: c.persona, lat: c.latCur || 0, pass: c.passT > 0, dodge: c.dodgeT > 0, hunt: c.huntT > 0, crash: !!c.crash, rev: c.revT > 0, around: c.aroundT > 0, s: c.s, eid: c.eid, why: c.why, ahead: list.indexOf(c.aheadOf), revWait: c.revWait || 0, hold: !!c.hulkHold })),
      stall(i) { const c = list[i]; if (c) { c.hulkHold = true; c.v = 0; c.why = ''; c.held = false; } return !!c; },   // voor de test: een auto die niet meer rijdt   // voor de tests
      // files: groepjes auto's die al een tijd stilstaan (voor de Hulk)
      jams() {
        const slow = list.filter(c => c.path && !c.crash && !c.fly && c.v < 0.4 && (c.still || 0) > 6), out = [], used = new Set();
        for (const c of slow) { if (used.has(c)) continue; const grp = [c]; used.add(c); for (let i = 0; i < grp.length; i++) for (const o of slow) if (!used.has(o) && Math.hypot(o.x - grp[i].x, o.z - grp[i].z) < 22) { used.add(o); grp.push(o); } if (grp.length >= 5) out.push({ cars: grp, x: grp.reduce((s, o) => s + o.x, 0) / grp.length, z: grp.reduce((s, o) => s + o.z, 0) / grp.length }); }
        return out.sort((a, b) => b.cars.length - a.cars.length);
      },
      vecStats: () => {
        const G = vecGraph(); let off = 0, stuck = 0, nan = 0, crash = 0, slow = 0, n = 0, stuckL = null;
        const dist = (x, z) => { let d = 1e9; for (const e of G.edges.values()) for (let i = 0; i < e.pts.length - 1; i++) d = Math.min(d, distSeg(x, z, e.pts[i], e.pts[i + 1])); return d; };
        for (const c of list) {
          if (!c.vec || !c.path) continue; n++;
          if (!isFinite(c.x) || !isFinite(c.z) || !isFinite(c.h)) { nan++; continue; }
          const e = G.edges.get(c.eid), hw = e ? PATH_DEF[e.t].hw : 4.5;
          if (dist(c.x, c.z) > hw + 0.8) off++;
          if (c.crash) crash++;
          if ((c.stuck || 0) > 8) { stuck++; (stuckL = stuckL || []).push([c.id, +c.x.toFixed(1), +c.z.toFixed(1), c.eid, c.kind, c.why, c.aheadOf && c.aheadOf.id, +(c.path.len - c.s).toFixed(1), c.next && c.next.kind, c.next && c.next.eid, +c.stuck.toFixed(0), 'want', +(c.lastWant || 0).toFixed(2), 'held', !!c.held, 'creep', +(c.creepT || 0).toFixed(1), 'ghost', +(c.ghost || 0).toFixed(1), 'yieldTo', c.yieldTo, 'dh?', +c.h.toFixed(2)]); }
          if (c.v < 0.3) slow++;
        }
        return { n, off, stuck, stuckL, nan, crash, slow, why: list.filter(c => c.vec).map(c => c.why || '').reduce((m, w) => (m[w] = (m[w] || 0) + 1, m), {}) };
      },
      vecDbg: () => ({ nodes: VG.nodes.map(n => [+n.x.toFixed(1), +n.z.toFixed(1), n.edges.length]), edges: [...VG.edges.values()].map(e => [e.id, e.a, e.b, Math.round(e.len)]), cars: list.map(c => [+c.x.toFixed(1), +c.z.toFixed(1), c.eid || null, c.kind, +c.v.toFixed(1), c.why]) }),
      list,
      get on() { return on; },
      get reckless() { return reckless; },
      get gore() { return GORE.on; },
      setGore(v) { GORE.on = !!v; try { localStorage.setItem('hexstad-bloed', v ? '1' : '0'); } catch (e) { } if (!v) { goreS.length = 0; goreP.length = 0; for (const c of list) { c.blood = 0; c.bloodTrail = 0; } } },
      tows, rejoinStats: RJ,
      towTest: () => ({ n: tows.length, phases: tows.map(t => t.phase), towed: list.filter(c => c.towed).length }),
      goreTest: () => ({ splats: goreS.filter(Boolean).length, parts: goreP.length, bloody: list.filter(c => c.blood).length }),
      goreAt: (c, a, vx, vz, sp) => gore(c, a, vx, vz, sp),
      setReckless(v) {
        reckless = v;
        // Weer netjes: wie nog na een botsing ergens dwars staat, over een ander heen staat of van zijn rijstrook is
        // geraakt, begint ergens anders opnieuw (anders blijft de stad nog lang vaststaan)
        if (!v) for (const c of list) {
          const [px, pz] = posOn(c, c.s);
          const off = Math.hypot(px - c.x, pz - c.z) > 2;
          const over = list.some(o => o !== c && Math.hypot(o.x - c.x, o.z - c.z) < 4.2);
          if (c.crash || off || over) { c.crash = null; c.burn = null; c.hp = 100; spawn(c); }
          c.ghost = 0; c.stuck = 0; c.wait = 0;
        }
      },
      // kanonskogel (cameramodus): raakt hij een auto of iemand, dan vliegt die weg; geeft het geraakte terug
      ballHit(x, y, z, vx, vy, vz, rad) {
        const sp = Math.hypot(vx, vy, vz);
        for (const c of list) {
          if (c.fly || !c.path) continue;
          const by = baseOf_(c); if (y - rad > by + 1.8 || y + rad < by) continue;
          if (!inside(c, x, z, rad, rad)) continue;
          const [cvx, cvz] = velOf(c), m = rad > 0.9 ? 0.55 : 0.3;   // zware sloopkogel duwt harder
          if (sp * m > 9 && Math.random() < 0.6) { c.fly = { vx: cvx + vx * m * 0.5, vz: cvz + vz * m * 0.5, vy: 3 + sp * m * 0.25, y: 0, t: 0, wr: (Math.random() - 0.5) * 8, wp: (Math.random() - 0.5) * 4 }; c.fly.g0 = c.sy ?? ASPH_H; c.crash = null; c.v = 0; }
          else { c.crash = { t: 0, still: 0 }; c.cvx = cvx + vx * m; c.cvz = cvz + vz * m; c.w = (c.w || 0) + (Math.random() - 0.5) * 5; }
          c.rx = undefined; c.held = false; c.dmgT = 0; hurt(c, sp * (rad > 0.9 ? 2.4 : 1.4));
          sound.fx('crunch', c.x, 0.7, c.z, 1); sound.carHit(1, c.x, 0.7, c.z, true);
          return c;
        }
        for (const a of people.agents) {
          if (a.state !== 'walk' && a.state !== 'pause') continue;
          if (Math.hypot(a.x - x, a.z - z) > rad + 0.35 || y - rad > a.y + 1.9 * (a.scale || 1) || y + rad < a.y) continue;
          const hl = Math.hypot(vx, vz) || 1, k = Math.min(1, sp / 30) * (rad > 0.9 ? 1.4 : 1);
          people.hit(a, vx / hl * 9 * k, vz / hl * 9 * k); gore({}, a, vx, vz, 10); sound.grunt(a.x, 0.9, a.z, 1, a.kid ? 'k' : a.female ? 'v' : a.old ? 'o' : 'm');
          return a;
        }
        return null;
      },
      setOn(v) { on = v; label(); try { localStorage.setItem('hexstad-autos', on ? '1' : '0'); } catch (e) {} carsDirty = true; },
      blocks(x, z, y) { for (const c of list) { const dy = y - baseOf_(c); if (dy > 1.5 || dy < -1.5) continue; if (inside(c, x, z, 0.3, 0.3)) return true; } return false; },
      // Komt er een auto aan die binnen een paar seconden langs dit punt rijdt?
      approaching(x, z) {
        for (const c of list) {
          const dx = x - c.x, dz = z - c.z, ch = Math.cos(c.h), sh = Math.sin(c.h), al = dx * ch + dz * sh, lat = -dx * sh + dz * ch;
          if (Math.abs(lat) < 4 && al > -3 && al < 4 + c.v * 2.5) return true;
        }
        return false;
      },
      update(dt) {
        goreTick(Math.min(dt, 0.1)); fxTick(Math.min(dt, 0.1));
        if (carsDirty) { carsDirty = false; rebuild(); }
        if (!list.length) { render(); return; }   // alleen geparkeerde auto's
        dt = Math.min(dt, 0.1);
        const allPeds = people.agents.filter(a => (a.state === 'walk' || a.state === 'pause'));
        // raster van voetgangers (vakjes van 8 m): elke auto bekijkt alleen wie binnen zijn rem- en kijkafstand loopt
        const PG = new Map(); for (const a of allPeds) { const k = Math.floor(a.x / 8) * 100003 + Math.floor(a.z / 8); let L = PG.get(k); if (!L) PG.set(k, L = []); L.push(a); }
        const pedsNear = (x, z, R) => { if (allPeds.length < 24) return allPeds; const out = [], i0 = Math.floor((x - R) / 8), i1 = Math.floor((x + R) / 8), j0 = Math.floor((z - R) / 8), j1 = Math.floor((z + R) / 8); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const L = PG.get(i * 100003 + j); if (L) for (const a of L) out.push(a); } return out; };
        const lying = people.lying();
        const tNow = performance.now() / 1000;
        const camP = camera.position;
        for (const c of list) {
          carFx(c, dt, Math.hypot(c.x - camP.x, c.z - camP.z) > 260);
          const peds = pedsNear(c.x, c.z, Math.min(170, Math.max(18, c.v * 2.4, c.v * c.v / 9 + 8, Math.hypot(c.cvx || 0, c.cvz || 0) * 2.4) + 8));
          if (!c.path) continue;
          if (c.towed) continue;
          if (!c.path) continue;   // kon nergens beginnen: wacht op de volgende herbouw
          if (c.fly) { flyStep(c, dt); continue; }
          if (c.hulkHold) { c.v = 0; c.wait = (c.wait || 0) + dt; continue; }   // de Hulk komt eraan: blijven staan
          if (c.crash) { crashStep(c, dt, peds, lying); continue; }
          const ch = Math.cos(c.h), sh = Math.sin(c.h);
          // gewenste snelheid: 30 km/u, langzamer in bochten en bij het keren (roekeloos: 75 km/u en bochten op de rand)
          if (reckless && !c.persona) { const u = Math.random(); c.persona = u < 0.35 ? 'racer' : u < 0.75 ? 'ontwijker' : 'jager'; }
          // roekeloos: te hard een bocht of rotonde in is meer dwarskracht dan de banden aankunnen: dan glijdt de auto rechtdoor
          // (langs de raaklijn, hij mikt dus nergens op), op de rotonde vliegt hij er vaak over de rand uit
          if (reckless && c.v > 7 && !(c.ghost > 0) && (c.kind === 'turn' || c.kind === 'u' || (VG.edges.get(c.eid) || {}).t === 'ring')) {
            const [x1, z1, h1] = posAt(c, c.s), [x2, z2, h2] = posAt(c, Math.min(c.path.len, c.s + 6)); let dh = h2 - h1; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
            const grip = { racer: 6.5, jager: 7.5, ontwijker: 9.5 }[c.persona] || 8, ratio = c.v * c.v * (Math.abs(dh) / 6) / grip, onRing = (VG.edges.get(c.eid) || {}).t === 'ring';
            if (ratio > 1 && Math.random() < dt * (ratio - 1) * (onRing ? 2.2 : 1.1)) {
              const ch2 = Math.cos(c.h), sh2 = Math.sin(c.h), sv = c.v * 1.05;
              c.rx = undefined; c.held = false; c.w = (dh > 0 ? 1 : -1) * (0.8 + Math.random() * 1.6);
              if (onRing && Math.random() < 0.6) { c.fly = { vx: ch2 * sv, vz: sh2 * sv, vy: 2.5 + Math.random() * 3, y: 0, t: 0, wr: (Math.random() - 0.5) * 5, wp: (Math.random() - 0.5) * 2 }; c.fly.g0 = c.sy ?? ASPH_H; c.crash = null; c.v = 0; }   // over de rand de lucht in
              else { c.crash = { t: 0, still: 0 }; c.cvx = ch2 * sv; c.cvz = sh2 * sv; c.slide = 1; }
              sound.fx('squeal', c.x, 0.5, c.z, 1);
              if (c.fly) flyStep(c, dt); else crashStep(c, dt, peds, lying);
              continue;
            }
          }
          const longSt = reckless && c.kind === 'lane' && c.path.len > 30 && !(c.ghost > 0);   // lange rechte weg: vol gas
          let want = reckless ? (longSt ? ({ racer: 42, jager: 30 }[c.persona] || 32) : ({ racer: 26, jager: 17 }[c.persona] || 20)) : ({ snel: 36.1, klink: 4.5, ring: 6.5 }[(VG.edges.get(c.eid) || {}).t] ?? 8.3); c.why = ''; c.yieldTo = -1;   // snelweg 130 km/u, klinkers stapvoets, rotonde rustig
          { const lim = t => ({ snel: 36.1, klink: 4.5, ring: 6.5 }[t] ?? 8.3), vN = c.next ? Math.min(lim((VG.edges.get(c.next.eid) || {}).t), c.next.kind === 'turn' ? (reckless ? 9 : 5.5) : 99) : 99;   // van de snelweg af: op tijd afremmen tot de snelheid van wat komt
            if (vN < want) want = Math.min(want, Math.sqrt(vN * vN + 2 * (reckless ? 7.5 : 3.5) * (c.late || 1) * Math.max(0, c.path.len - c.s))); }   // late: een bestuurder die het remmen verkeerd inschat (te laat, dus te hard de bocht in)
          const [, , hAhead] = posOn(c, c.s + Math.max(7, c.v * 1.4));
          let dh = hAhead - c.h; dh = Math.abs(Math.atan2(Math.sin(dh), Math.cos(dh)));
          const straightNow = c.outS === (c.inS + 3) % 6 && dh < 0.15;   // rechtdoor, en er komt nog geen bocht
          if (c.outS !== (c.inS + 3) % 6 || dh > 0.15) want = Math.min(want, c.outS === c.inS ? (reckless ? 5 : 2.8) : (reckless ? 12 : 5.5));
          // remmen tot stilstand over afstand d: rustig (ca. 4,5 m/s²), het laatste stukje evenredig
          const brakeTo = d => d < 0.6 ? 0 : Math.min(d * 1.2, Math.sqrt(9 * d));
          // obstakels voor de auto: andere auto's, mensen op de rijbaan, de speler
          const ahead = (x, z, latW, gap, who) => {
            const dx = x - c.x, dz = z - c.z, al = dx * ch + dz * sh, lat = -dx * sh + dz * ch;
            if (al > 0 && al < Math.max(16, c.v * 2.4, c.v * c.v / 9 + 8) && Math.abs(lat) < latW) { const w = brakeTo(al - gap); if (w < want) { want = w; c.why = 'ahead'; c.aheadOf = who || null; } }
          };
          // verkeerslicht op de kruising waar je naartoe rijdt: stoppen bij rood, en bij oranje als het nog kan
          let held = false;
          if (c.outS !== c.inS && !reckless) {   // roekeloos: rood is voor watjes
            const ls = entryLight(c.next, tNow);
            if (ls && ls !== 'g') {
              const gap = c.path.len - c.s - 3.6;   // neus van de auto ruim een meter voor de rand van de kruising: afslaand verkeer kan erlangs
              if (gap > -0.6 && gap < 30 && (ls === 'r' || gap > c.v * c.v / 10 + 0.5)) {
                const w = gap < 0.3 ? 0 : brakeTo(gap);
                if (w < want) { want = w; held = true; c.why = 'light'; }
              }
            }
          }
          // de rotonde of de snelweg op: voorrang geven aan wie daar al rijdt en naar deze aansluiting toe komt
          const tNext = c.next && (VG.edges.get(c.next.eid) || {}).t, tNow2 = (VG.edges.get(c.eid) || {}).t;
          if (!reckless && (tNext === 'ring' || tNext === 'snel') && tNow2 !== tNext) {
            const N = VG.nodes[c.next.dir ? VG.edges.get(c.next.eid).b : VG.edges.get(c.next.eid).a], gap = c.path.len - c.s - 0.8, reach = tNext === 'snel' ? 95 : 13;
            if (N && gap > -0.6 && gap < 25) {
              const coming = list.some(o => o !== c && !o.crash && (VG.edges.get(o.eid) || {}).t === tNext && Math.hypot(o.x - N.x, o.z - N.z) < reach && ((N.x - o.x) * Math.cos(o.h) + (N.z - o.z) * Math.sin(o.h)) > -1.5);
              if (coming) { const w = gap < 0.3 ? 0 : brakeTo(gap); if (w < want) { want = w; held = true; c.why = 'voorrang'; } }
            }
          }
          // een keerlus is maar breed genoeg voor één auto tegelijk: wachten tot hij vrij is
          if (!reckless && c.next && c.next.outS === c.next.inS && !(c.q === c.next.q && c.r === c.next.r)) {
            const T = c.next, myGap = c.path.len - c.s;
            const busy = list.some(o => o !== c && ((o.q === T.q && o.r === T.r) ||
              (o.next && o.next.q === T.q && o.next.r === T.r && o.next.outS === o.next.inS && (o.path.len - o.s < myGap - 0.01 || (Math.abs(o.path.len - o.s - myGap) < 0.01 && o.id < c.id)))));
            if (busy) { const gap = c.path.len - c.s - 2.75; if (gap > -0.6) { const w = gap < 0.3 ? 0 : brakeTo(gap); if (w < want) { want = w; held = true; } } }
          }
          if (c.wait >= 4) c.creepT = 2.5;   // lang vastgestaan: even voorzichtig doorkruipen, wat er ook staat
          if (c.creepT > 0) c.creepT -= dt;
          const keerT = c.outS === c.inS ? c : null;   // ik sta zelf in een keerlus
          if (c.ghost > 0) {
            c.ghost -= dt; want = Math.min(want, 2.5);
            // pas weer 'vast' worden als hij nergens meer doorheen staat
            if (c.ghost <= 0 && list.some(o => o !== c && Math.hypot(o.x - c.x, o.z - c.z) < 4.6 && (inside(o, c.x, c.z, 1.4, 0.4) || inside(c, o.x, o.z, 1.4, 0.4)))) c.ghost = 0.5;
          }
          // doorkruipen of 'doorzichtig': nooit zomaar door een andere auto heen; wel dichter op elkaar dan normaal
          // (kruipen: tot 1,5 m; doorzichtig: alleen stilstaande auto's mogen gepasseerd worden, rijdende niet)
          if (c.creepT > 0 || c.ghost > 0) for (const o of list) { if (o === c || Math.abs((o.sy ?? 0) - (c.sy ?? 0)) >= 2) continue; if (c.ghost > 0 && o.v < 0.5 && !(o.ghost > 0)) continue; ahead(o.x, o.z, 1.6, 1.5, o); }
          const RL = Math.max(23, Math.max(16, c.v * 2.4, c.v * c.v / 9 + 8) + 4);   // verder weg doet geen auto ertoe (vooruitkijken en kruisen binnen 20 m)
          if (!(c.creepT > 0) && !(c.ghost > 0)) { for (const o of list) if (o !== c && Math.abs(o.x - c.x) < RL && Math.abs(o.z - c.z) < RL && Math.abs((o.sy ?? 0) - (c.sy ?? 0)) < 2) {
            // wie op mijn keerlus wacht, staat niet in de weg (anders wachten we op elkaar)
            if (keerT && o.next && o.next.q === c.q && o.next.r === c.r && o.next.outS === o.next.inS) continue;
            const before = want; ahead(o.x, o.z, reckless ? (c.passT > 0 || c.dodgeT > 0 ? 1.1 : 1.7) : 2.0, reckless ? 4.5 : 7, o);
            // een auto die schuin staat (afslaan, wachten in de middenberm): ook de voor- en achterkant tellen
            if (straightNow) { const oc = Math.cos(o.h), os = Math.sin(o.h);
              ahead(o.x + oc * 2.1, o.z + os * 2.1, 1.25, reckless ? 2.6 : 4.2, o); ahead(o.x - oc * 2.1, o.z - os * 2.1, 1.25, reckless ? 2.6 : 4.2, o); }
            // in de rij voor het licht: alleen achter een auto die dezelfde kant op rijdt (anders kan het vastlopen)
            if (o.held && want < before && want < 0.6 && Math.cos(o.h - c.h) > 0.7) held = true;
            // kruisend verkeer (afslaan op een kruising, keren): komen we elkaar zo tegen, dan wacht wie later bij
            // het kruispunt is (bij gelijk: vaste volgorde). Roekeloze bestuurders kijken niet uit.
            if (!reckless && !o.crash && Math.abs(Math.cos(o.h - c.h)) < 0.9) {   // (rechtdoor achter of langs elkaar: geen kruising)
              const [ovx, ovz] = velOf(o), dx = o.x - c.x, dz = o.z - c.z, wx = ovx - ch * c.v, wz = ovz - sh * c.v, w2 = wx * wx + wz * wz;
              if (w2 > 0.25 && dx * dx + dz * dz < 400) {
                const tc = -(dx * wx + dz * wz) / w2, mx = dx + wx * tc, mz = dz + wz * tc;
                if (tc > 0 && tc < 3.0 && mx * mx + mz * mz < 2.3 * 2.3) {
                  const myT = (dx * ch + dz * sh) > 0 ? 1 : 0;   // de ander rijdt vóór mij: ik ben later
                  const otherT = (-dx * Math.cos(o.h) - dz * Math.sin(o.h)) > 0 ? 1 : 0;
                  // op de laan heeft rechtdoorgaand verkeer voorrang op wie afslaat of keert
                  const yieldPri = (o.pri || 1) > (c.pri || 1);
                  if (yieldPri || myT > otherT || (myT === otherT && c.id > o.id)) { const w = tc < 1.2 ? 0 : 2; if (w < want) { want = w; c.why = 'yield' + o.id; } }
                }
              }
            }
          } }
          else if (!reckless) want = Math.min(want, 1.0);   // lang gewacht: voorzichtig verder kruipen (hooguit een tikje)
          // afslaan of keren: staat er een auto op de lijn die ik straks rijd? Dan daarvoor wachten
          // (behalve als die auto zelf op mij wacht)
          if (!reckless && !(c.creepT > 0) && !(c.ghost > 0) && (c.kind === 'turn' || c.kind === 'u' || c.kind === 'cross' || c.outS !== (c.inS + 3) % 6)) {
            for (let k = 1; k <= 7; k++) {
              const sa = k * 1.6, [px, pz] = posOn(c, c.s + 2.3 + sa);
              let hit = null;
              for (const o of list) {
                if (o === c || o.crash || Math.abs(o.x - px) > 4 || Math.abs(o.z - pz) > 4 || o.yieldTo === c.id || Math.abs((o.sy ?? 0) - (c.sy ?? 0)) > 2) continue;
                if (inside(o, px, pz, 0.6, 1.0)) { hit = o; break; }
              }
              if (hit) { const w = brakeTo(sa - 0.8); if (w < want) { want = w; c.why = 'path' + hit.id; c.yieldTo = hit.id; } break; }
              // iemand op of vlak naast de bocht die ik ga maken (oversteken op de kruising): wachten
              let ped = false; for (const a of peds) if (lvlOf(a, c) < 0.3 && lvlOf(a, c) > -1 && Math.abs(a.x - px) < 1.7 && Math.abs(a.z - pz) < 1.7) { ped = true; break; }
              if (ped) { const w = brakeTo(sa - 0.3); if (w < want) { want = w; c.why = 'ahead'; } break; }
            }
          }
          // laatste vangnet: staat de neus van een andere auto straks in mijn voorkant, dan stop ik (ook in een keerlus of bocht)
          if (!reckless && c.v > 0.3 && !(c.ghost > 0 && c.v < 1)) {
            const nz = 2.5 + c.v * 0.35;
            for (const o of list) {
              if (o === c || o.crash || o.fly || Math.abs((o.sy ?? 0) - (c.sy ?? 0)) >= 2 || Math.abs(o.x - c.x) > 9 || Math.abs(o.z - c.z) > 9) continue;
              if (c.ghost > 0 && o.v < 0.5) continue;
              if (inside(o, c.x + ch * nz, c.z + sh * nz, 0.15, 0.25) || inside(o, c.x + ch * nz * 0.55 + sh * 0.7, c.z + sh * nz * 0.55 - ch * 0.7, 0, 0) || inside(o, c.x + ch * nz * 0.55 - sh * 0.7, c.z + sh * nz * 0.55 + ch * 0.7, 0, 0)) { if (o.yieldTo !== c.id) { want = 0; c.why = 'ahead'; c.aheadOf = o; } break; }
            }
          }
          c.held = held;
          const patient = (c.pwait || 0) < 6;   // na 6 s wachten stapvoets verder; mensen stappen dan opzij
          // iemand ligt op straat: netjes remmen (roekeloos: gewoon doorrijden)
          if (!reckless) for (const a of lying) { const pr = a.rag.p, ly = pr[7] - baseOf_(c); if (ly < 0.6 && ly > -1) ahead(pr[6], pr[8], 2.4, 4.5); }
          if (!reckless) for (const a of peds) {
            const al_ = lvlOf(a, c); if (al_ < -1 || al_ > 2) continue;
            if (al_ < 0.2) { if (patient) ahead(a.x, a.z, 2.2, 4); else want = Math.min(want, 1.2); }   // iemand op de rijbaan: stoppen
            else if (al_ < 0.3) {   // mensen vlak naast de weg: vaart minderen, ze kunnen zomaar oversteken
              const dx = a.x - c.x, dz = a.z - c.z, al = dx * ch + dz * sh, lat = -dx * sh + dz * ch;
              if (al > -1 && al < 14 && Math.abs(lat) < 4.2 && a.spd > 0.3) want = Math.min(want, 4.5);
            }
          }
          if (mode === 'walk' && player.y < 1.0 && !reckless && !player.down) {   // in de gekkenhuis-stand sparen ze jou ook niet
            const before = want; ahead(player.x, player.z, 1.7, 4);
            // staat de auto op jou te wachten? na anderhalve seconde een vriendelijk signaaltje
            if (want < before && want < 1.5) { c.youWait = (c.youWait || 0) + dt; if (c.youWait > 1.5 && (c.lastChime || 0) < performance.now() - 7000) { c.lastChime = performance.now(); sound.chime(c.x, c.z); } }
            else c.youWait = 0;
          }
          c.wait = c.v < 0.2 && want < 0.5 && !held ? c.wait + dt : Math.max(0, c.wait - dt * 2);
          c.still = c.v < 0.3 ? (c.still || 0) + dt : 0;   // hoe lang hij al stilstaat, om welke reden ook (voor de file-teller en de Hulk)
          // Vangnet: wie heel lang muurvast staat (niet voor een rood licht), schuift er stapvoets even doorheen
          // (wie in een gewone rij staat voor een licht, een vrije plek of een gat in het verkeer, wacht gewoon)
          let legit = c.why === 'light' || c.why === 'space' || held;
          for (let o = c, n = 0; !legit && o && o.why === 'ahead' && n < 14; n++) { o = o.aheadOf; if (o && (o.why === 'light' || o.why === 'space' || o.why === 'gap' || o.held || o.kind === 'u' || (o.next && o.next.kind === 'u'))) legit = true; }   // wachten op iemand die keert is ook gewoon wachten
          c.stuck = c.v < 0.2 && !legit ? (c.stuck || 0) + dt : 0;
          if (c.stuck > (c.why === 'gap' || c.why === 'keer' ? 40 : 25)) { c.ghost = 4; c.stuck = 0; }
          c.pwait = held ? 0 : c.v < 0.2 ? (c.pwait || 0) + dt : (c.v > 2 ? 0 : (c.pwait || 0));
          if (c.pwait > 10) c.pwait = 0;
          if (c.wait > 6) c.wait = 0;
          // ---------- Vast achter een auto die niet meer rijdt: achteruit en er dan omheen ----------
          // Alleen achter de kop van de rij (een gebotste of muurvaste auto), niet in een gewone rij voor het licht. Eerst een paar
          // meter achteruit (als het achter vrij is; bestelbussen piepen), dan over de andere rijstrook erlangs. Netjes rijdend
          // verkeer wacht daarvoor tot er geen tegenligger aankomt; roekeloos verkeer doet het sneller en kijkt niet.
          {
            const blk = c.aheadOf && c.aheadOf.x !== undefined ? c.aheadOf : null;
            const head = blk && c.why === 'ahead' && (blk.crash || (blk.v < 0.3 && blk.why !== 'ahead' && !blk.held && blk.why !== 'light' && blk.why !== 'voorrang'));
            if (!(c.revT > 0) && !(c.aroundT > 0) && c.v < 1.2 && head && !held && Math.hypot(blk.x - c.x, blk.z - c.z) < 9) { c.revWait = (c.revWait || 0) + dt; c.creepT = 0; c.wait = 0; } else if (!(c.revT > 0)) c.revWait = 0;   // (niet doorkruipen: we gaan eromheen)
            if (c.revWait > (reckless ? 1.2 : 4)) { c.revWait = 0; c.revT = reckless ? 1.0 : 1.6; c.revFrom = blk; }
            if (c.revT > 0) {
              c.revT -= dt;
              let free = c.s > 1.2;
              for (const o of list) { if (o === c) continue; const dx = o.x - c.x, dz = o.z - c.z, al = dx * ch + dz * sh, lat = -dx * sh + dz * ch; if (al < 0 && al > -7.5 && Math.abs(lat) < 1.9) { free = false; break; } }
              if (!reckless) for (const a of peds) { const dx = a.x - c.x, dz = a.z - c.z, al = dx * ch + dz * sh, lat = -dx * sh + dz * ch; if (lvlOf(a, c) < 0.3 && al < 0 && al > -5 && Math.abs(lat) < 1.6) { free = false; break; } }
              want = free ? -(reckless ? 3 : 1.6) : 0; c.why = 'achteruit';
              if (!free) c.revT = 0;
              if (free && c.type === 'bestel' && sound.fx) sound.fx('beep', c.x, 0.8, c.z);
              if (c.revT <= 0) { c.aroundT = reckless ? 3.5 : 5; c.aroundOf = c.revFrom; c.aroundWait = 0; }
            } else if (c.aroundT > 0 && c.aroundOf) {
              const A = c.aroundOf, dx = A.x - c.x, dz = A.z - c.z, al = dx * ch + dz * sh;
              let clear = true;
              if (!reckless && Math.abs(c.latCur || 0) < 1.5) for (const o of list) { if (o === c || o === A) continue; const ox = o.x - c.x, oz = o.z - c.z, oal = ox * ch + oz * sh, olat = -ox * sh + oz * ch; if (Math.cos(o.h - c.h) < -0.5 && oal > -3 && oal < 32 && olat < -0.8 && olat > -5) { clear = false; break; } }
              if (!clear) { want = Math.min(want, 0); c.aroundWait += dt; if (c.aroundWait > 12) c.aroundT = 0; }   // tegenligger: even wachten
              else {
                c.aroundT -= dt; if (al > -6.5 && c.aroundT < 0.8) c.aroundT = 0.8;   // pas terug als hij er helemaal voorbij is
                if (c.aheadOf === A) want = Math.max(want, 1.5); want = Math.min(Math.max(want, 2.5), reckless ? 14 : 4.5); c.why = c.why || 'eromheen';
              }
            }
            if (c.revT > 0 || c.aroundT > 0) c.stuck = 0;
          }
          // ---------- Roekeloos: drie soorten bestuurders ----------
          // racer: scheurt en haalt in over de andere rijstrook; ontwijker: stuurt om auto's en mensen heen in plaats van te remmen;
          // jager: kiest iemand op of naast de weg (ook jou) en stuurt erop af, desnoods over de stoep. Ze rijden allemaal een stukje naast
          // hun rijlijn (latT: + is rechts); het stuur hieronder volgt die verschoven lijn.
          if (reckless) {
            let T = 0;
            for (const k of ['passT', 'dodgeT', 'huntT', 'huntCool']) if (c[k] > 0) c[k] -= dt;
            const rel = (x, z) => { const dx = x - c.x, dz = z - c.z; return [dx * ch + dz * sh, -dx * sh + dz * ch]; };
            // inhalen: een tragere auto voor me op een recht stuk
            const slow = c.why === 'ahead' && c.aheadOf && c.aheadOf.v !== undefined ? c.aheadOf : null;
            if (slow && !(c.passT > 0) && c.persona !== 'jager' && straightNow && c.v > 3 && slow.v < c.v - 0.5) {
              const [al, lat] = rel(slow.x, slow.z);
              if (al > 3 && al < 26) { c.passT = 3.5; c.passSide = c.persona === 'racer' ? -1 : (lat > 0 ? -1 : 1); c.passOf = slow; if (sound.horn) sound.horn(c.x, c.z); }
            }
            if (c.passT > 0 && c.passOf) { const [al, lat] = rel(c.passOf.x, c.passOf.z); if (al > -7 && Math.abs(lat) < 4.5 && c.passT < 0.6) c.passT = 0.6; }   // pas terug als hij er voorbij is
            if (c.passT > 0) { T = c.passSide * 2.7; want = Math.max(want, Math.min(c.v + 4, { racer: 26, jager: 17 }[c.persona] || 20)); }
            // ontwijken: iemand of een stilstaande auto recht voor me
            if (c.persona !== 'jager' && !(c.passT > 0)) {
              for (const a of peds) { const ly = lvlOf(a, c); if (ly > 0.3 || ly < -1) continue; const [al, lat] = rel(a.x, a.z); if (al > 3 && al < 6 + c.v * 0.9 && Math.abs(lat) < 1.6) { c.dodgeT = 1.4; c.dodgeSide = lat > 0 ? -1 : 1; break; } }
              if (c.why === 'ahead' && c.aheadOf && c.persona === 'ontwijker' && !(c.dodgeT > 0)) { const [al, lat] = rel(c.aheadOf.x, c.aheadOf.z); if (al > 3 && al < 14) { c.dodgeT = 1.6; c.dodgeSide = lat > 0 ? -1 : 1; } }
              if (c.dodgeT > 0) T = c.dodgeSide * 2.4;
            }
            // jagen: het dichtstbijzijnde doelwit vóór de auto, binnen een kegel
            if (c.persona === 'jager' && !(c.huntCool > 0)) {
              let best = null, bs = 1e9;
              const cand = peds.map(a => ({ x: a.x, z: a.z, ly: lvlOf(a, c) }));
              if (mode === 'walk' && !player.down && player.y < 1.2) cand.push({ x: player.x, z: player.z, ly: player.y - baseOf_(c) });
              for (const a of cand) { if (a.ly > 0.6 || a.ly < -1) continue; const [al, lat] = rel(a.x, a.z); if (al < 2.5 || al > 34 || Math.abs(lat) > 3 + al * 0.45) continue; const sc = al + Math.abs(lat) * 2; if (sc < bs) { bs = sc; best = [al, lat]; } }
              if (best) { if (!(c.huntT > 0)) { c.huntT = 6; if (sound.horn) sound.horn(c.x, c.z); } T = Math.max(-4.5, Math.min(5.5, (c.latCur || 0) + best[1])); want = Math.max(want, Math.min(c.v + 5, 16)); }
              if (c.huntT > 0 && c.huntT < 0.1) { c.huntCool = 5; c.huntT = 0; }   // na zes seconden even rustig verder
            }
            if (c.aroundT > 0 && !(c.revT > 0)) T = -2.7;   // om een vastgelopen auto heen
            c.latT = T;
            c.latCur = (c.latCur || 0) + (T - (c.latCur || 0)) * Math.min(1, dt * (c.persona === 'jager' ? 2.4 : 1.6));
          } else c.latCur = (c.latCur || 0) + ((c.aroundT > 0 && !(c.revT > 0) && c.v > 0.3 ? -2.7 : 0) - (c.latCur || 0)) * Math.min(1, dt * 1.2);   // netjes: alleen opzij om een vastgelopen auto heen
          c.lastWant = want;
          c.v += Math.max(-(reckless ? 9 : 6) * dt, Math.min((reckless ? (longSt ? (c.persona === 'racer' ? 12 : 9) : 7) : 2.5) * dt, want - c.v));
          c.v = Math.max(c.revT > 0 ? -3 : 0, c.v);   // achteruit mag alleen bij het losrijden
          // rijden langs de rijlijn
          c.s += c.v * dt;
          while (c.s > c.path.len) {
            const extra = c.s - c.path.len;
            // het geplande volgende vak, als dat nog klopt; anders opnieuw kiezen (of keren als de weg weg is)
            let L = c.next;
            if (!validLeg(L)) L = planNext(c);
            if (!L) { spawn(c); break; }   // geen uitweg meer (bijvoorbeeld een laan zonder keerplek): ergens anders verder
            c.prev = { path: c.path, cx: c.cx, cz: c.cz };
            useLeg(c, L);
            c.s = extra;
          }
          if (!c.path) continue;
          if (!reckless) {
            // Netjes rijden: voor- en achteras rijden allebei precies over de rijlijn; de carrosserie staat
            // ertussen en draait zo geleidelijk mee, ook over de grens van twee vakken.
            const [fx, fz, fh] = posOn(c, c.s + WB), [rx2, rz2] = posOn(c, c.s - WB);
            const h = Math.atan2(fz - rz2, fx - rx2), lo = c.latCur || 0, x = (fx + rx2) / 2 - Math.sin(h) * lo, z = (fz + rz2) / 2 + Math.cos(h) * lo;   // lo: opzij (om een vastgelopen auto heen)
            let st2 = fh - h; st2 = Math.atan2(Math.sin(st2), Math.cos(st2));
            c.steer += (Math.max(-0.55, Math.min(0.55, st2 * 1.6)) - c.steer) * Math.min(1, dt * 8);
            if (c.ease > 0) {   // net terug van roekeloos: rustig terug naar de rijlijn
              const k = Math.min(1, dt * 4); let dhh = h - c.h; dhh = Math.atan2(Math.sin(dhh), Math.cos(dhh));
              c.x += (x - c.x) * k; c.z += (z - c.z) * k; c.h += dhh * k; c.ease -= dt;
            } else { c.x = x; c.z = z; c.h = h; }
            c.rx = undefined;
            suspend(c, dt);
          } else {
          // Roekeloos: echt sturen (fietsmodel). De bestuurder kijkt vooruit en draait aan het stuur; de auto
          // rijdt zelf, met een draaicirkel, en snijdt bij die snelheid bochten af. Raakt een wiel de stoeprand,
          // dan veert de auto op, verliest snelheid en stuurt bij.
          c.ease = 1;
          if (c.rx === undefined) { c.rx = c.x - Math.cos(c.h) * WB; c.rz = c.z - Math.sin(c.h) * WB; c.delta = c.steer || 0; }
          // stuurhoek: de bocht die eraan komt (vooruitkijken) plus bijsturen op hoe ver het midden van de
          // auto naast de rijlijn zit (Stanley-regelaar)
          const L2 = 2 * WB;
          const [p0x, p0z] = posOn(c, c.s - 1.2), [p1x, p1z] = posOn(c, c.s + 1.2), [p2x, p2z] = posOn(c, c.s + 3.6);
          const hp = Math.atan2(p1z - p0z, p1x - p0x), hq = Math.atan2(p2z - p1z, p2x - p1x);
          let kap = hq - hp; kap = Math.atan2(Math.sin(kap), Math.cos(kap)) / 2.4;   // kromming van de rijlijn
          const [pcx, pcz] = posOn(c, c.s), mx2 = c.rx + Math.cos(c.h) * WB, mz2 = c.rz + Math.sin(c.h) * WB;
          const eLat = -(mx2 - pcx) * Math.sin(hp) + (mz2 - pcz) * Math.cos(hp);   // + = rechts van de lijn
          let eHead = hp - c.h; eHead = Math.atan2(Math.sin(eHead), Math.cos(eHead));
          const dMax = c.v < 4 ? 0.95 : 0.7;   // stapvoets (keren) mag het stuur verder om
          const dWant = Math.max(-dMax, Math.min(dMax, Math.atan(L2 * kap) + eHead + Math.atan(-1.6 * (eLat - (c.latCur || 0)) / (1.5 + c.v))));   // latCur: bewust naast de rijlijn (inhalen, ontwijken, jagen)
          c.delta += Math.max(-2.6 * dt, Math.min(2.6 * dt, dWant - c.delta));
          c.h += c.v / L2 * Math.tan(c.delta) * dt;
          { const lat = c.v * c.v / L2 * Math.abs(Math.tan(c.delta)), brake = (c.vPrevSq ?? c.v) - c.v; c.vPrevSq = c.v;   // dwarskracht of hard remmen: banden piepen
            if ((lat > 6.5 && c.v > 7) || brake > 8 * dt) { const now = performance.now(); if (now > (c.sqT || 0)) { c.sqT = now + 900; sound.fx('squeal', c.x, 0.4, c.z, Math.min(1, Math.max(lat / 14, brake / (14 * dt)))); } } }
          c.rx += Math.cos(c.h) * c.v * dt; c.rz += Math.sin(c.h) * c.v * dt;
          // voortgang langs de rijlijn bijhouden met waar de auto echt is
          {
            const [px, pz, ph] = posOn(c, c.s - WB), e = (c.rx - px) * Math.cos(ph) + (c.rz - pz) * Math.sin(ph);
            c.s += Math.max(-0.5, Math.min(0.5, e)) * Math.min(1, dt * 3);
            // te ver van de rijlijn (na een botsing of een vreemde sprong): terugzetten
            const dev = Math.hypot(c.rx - px, c.rz - pz), lim = 3 + Math.abs(c.latCur || 0);
            if (dev > lim) {   // te ver van de rijlijn: geen sprong, maar zijdelings terugschuiven en bijdraaien; echt kwijt (>14 m): zelf de weg terugzoeken
              if (dev > 14 && !c.crash) { c.rx = undefined; if (!rejoin(c)) { c.rx = px; c.rz = pz; c.h = ph; } }
              else { const st = Math.min(dev - lim + 0.05, 3.5 * dt), k = st / dev; c.rx += (px - c.rx) * k; c.rz += (pz - c.rz) * k; let dh = ph - c.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); c.h += dh * Math.min(1, dt * 1.5); }
            }
          }
          c.x = c.rx + Math.cos(c.h) * WB; c.z = c.rz + Math.sin(c.h) * WB;
          c.steer = c.delta;
          suspend(c, dt);
          if (c.onCurb) {   // stoeprand geraakt: wat snelheid kwijt en terug naar de rijlijn
            c.v *= 1 - Math.min(0.5, 1.2 * dt);
            const [px, pz] = posOn(c, c.s - WB);
            if (Math.abs(c.latCur || 0) < 1) { c.rx += (px - c.rx) * Math.min(1, dt * 1.5); c.rz += (pz - c.rz) * Math.min(1, dt * 1.5); }   // bewust op de stoep (jagen, ontwijken): niet terugtrekken
          }
          }
          c.spin += Math.min(c.v / WR, SPIN_MAX) * dt;
          hitPeople(c, dt, peds, lying, Math.cos(c.h) * c.v, Math.sin(c.h) * c.v);
        }
        const PTc = window.__PT; let pt0 = PTc ? performance.now() : 0;
        collide();
        if (PTc) { PTc.autoBotsing = (PTc.autoBotsing || 0) + performance.now() - pt0; pt0 = performance.now(); }
        render();
        if (PTc) PTc.autoTekenen = (PTc.autoTekenen || 0) + performance.now() - pt0;
      },
    };
  })();

