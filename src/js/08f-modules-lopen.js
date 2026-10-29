  // ---------- Loopnetwerk door modules: zodat voetgangers winkels in lopen, trappen nemen en over galerijen gaan ----------
  // Per geplaatst exemplaar, per verdieping en per vak zes knopen: één per zijde (sector), op het zwaartepunt van de
  // vloerdriehoeken in die sector. Zo loopt iemand op een galerij netjes rondom en door een winkel langs de muren.
  // Twee knopen zijn verbonden als de rechte lijn ertussen geen muur kruist, of alleen muren met een deur, poort of
  // open doorgang (dan loopt het pad door het midden van die opening). Trappen, hellingen en de schans verbinden de
  // verdiepingen. Een opening in de buitenrand op de begane grond is een ingang (knoop 'mdoor'), die in 10-mensen aan
  // de stoep wordt gekoppeld zoals een voordeur.
  const modWalkDbg = {};   // voor tests: de muren zoals het loopnetwerk ze ziet
  function modWalkAdd(nodes, lk) {
    const insts = (cells.inst || []).filter(I => I.m && I.m.v === 2 && Number.isInteger(I.q) && Number.isInteger(I.r));
    if (!insts.length) return;
    const LH = MV2.LV_H, PASS = new Set(['door', 'gate', 'open']);
    const wallsAt = new Map();   // laag (wereld, geheel) → [{a, b, pass, mid}] met vak-sleutels voor snel zoeken
    const addWallIdx = (lv, w) => { const k = lv + '|' + worldToCell((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2).join(','); let L = wallsAt.get(k); if (!L) wallsAt.set(k, L = []); L.push(w); };
    const wallsNear = (lv, x, z) => { const [q, r] = worldToCell(x, z), out = []; for (const [dq, dr] of [[0, 0], ...NEIGH]) { const L = wallsAt.get(lv + '|' + (q + dq) + ',' + (r + dr)); if (L) out.push(...L); } return out; };
    modWalkDbg.wallsNear = wallsNear;
    const sectorOf = (c, x, z) => { const ang = Math.atan2(z - c.z, x - c.x); return ((Math.round(-ang / (Math.PI / 3)) % 6) + 6) % 6; };   // zijde k heeft zijn normaal op −k·60°
    const cross = (p, q, a, b) => { const d = (q[0] - p[0]) * (b[1] - a[1]) - (q[1] - p[1]) * (b[0] - a[0]); if (Math.abs(d) < 1e-9) return null; const t = ((a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])) / d, u = ((a[0] - p[0]) * (q[1] - p[1]) - (a[1] - p[1]) * (q[0] - p[0])) / d; return t > 0.02 && t < 0.98 && u > -0.02 && u < 1.02 ? t : null; };
    // kan je van p naar q (zelfde laag)? geeft de tussenpunten (openingen) terug, of null
    function passage(lv, p, q) {
      const via = [];
      for (const w of wallsNear(lv, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) {
        const t = cross(p, q, w.a, w.b); if (t === null) continue; if (!w.pass) return null; via.push([t, w.mid]); }
      via.sort((x, y) => x[0] - y[0]); const out = []; for (const [, m] of via) if (!out.length || Math.hypot(out[out.length - 1][0] - m[0], out[out.length - 1][1] - m[1]) > 0.3) out.push(m);
      return out;
    }
    // rechtdoor, en anders via een opening in de buurt (een deur zit zelden precies op de lijn tussen twee knopen)
    const distSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dz - p[1]); };
    const clearAt = (lv, m) => wallsNear(lv, m[0], m[1]).every(w => w.pass || distSeg(m, w.a, w.b) > 0.2);   // in een opening: alle muren hier (ook die van de buurmodule) open
    // ligt er overal vloer onder het pad? (een vide, een trapgat of een weggehaalde lichtkap is geen vloer)
    const floorIdx = new Map();
    const addFloor = (lv, W) => { const k = lv + '|' + worldToCell((W[0][0] + W[1][0] + W[2][0]) / 3, (W[0][1] + W[1][1] + W[2][1]) / 3).join(','); let L = floorIdx.get(k); if (!L) floorIdx.set(k, L = []); L.push(W); };
    const inTri = (x, z, T) => { const s1 = (T[1][0] - T[0][0]) * (z - T[0][1]) - (T[1][1] - T[0][1]) * (x - T[0][0]), s2 = (T[2][0] - T[1][0]) * (z - T[1][1]) - (T[2][1] - T[1][1]) * (x - T[1][0]), s3 = (T[0][0] - T[2][0]) * (z - T[2][1]) - (T[0][1] - T[2][1]) * (x - T[2][0]), e = 0.05; return (s1 >= -e && s2 >= -e && s3 >= -e) || (s1 <= e && s2 <= e && s3 <= e); };
    const onFloor = (lv, x, z) => { const [q, r] = worldToCell(x, z); for (const [dq, dr] of [[0, 0], ...NEIGH]) { const L = floorIdx.get(lv + '|' + (q + dq) + ',' + (r + dr)); if (L) for (const T of L) if (inTri(x, z, T)) return true; } return false; };
    const floored = (lv, pts) => { for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(l / 0.8)); for (let j = 1; j < n; j++) { const t = j / n; if (!onFloor(lv, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; } } return true; };
    function route(lv, p, q) {
      const v = passage(lv, p, q); if (v && floored(lv, [p, ...v, q])) return v;
      const mx = (p[0] + q[0]) / 2, mz = (p[1] + q[1]) / 2, cand = wallsNear(lv, mx, mz).filter(w => w.pass && Math.hypot(w.mid[0] - mx, w.mid[1] - mz) < 12).sort((a, b) => Math.hypot(a.mid[0] - mx, a.mid[1] - mz) - Math.hypot(b.mid[0] - mx, b.mid[1] - mz));
      for (const w of cand) { const m = w.mid; if (!clearAt(lv, m)) continue; const v1 = passage(lv, p, m), v2 = passage(lv, m, q); if (v1 && v2 && floored(lv, [p, ...v1, m, ...v2, q])) return [...v1, m, ...v2]; }
      return null;
    }
    const data = [];   // per exemplaar: tf, lagen met vloerdriehoeken en trappen in wereldcoördinaten
    insts.forEach((I, ii) => {
      const m = I.m, ts = mv2Ts(m), tf = mv2Tf(I.rot, I.q, I.r), base = gH(I.q, I.r) + (I.lv || 0) * LH, fl = modMeta(m).fl, mask = (modGroups.get(I) || {}).mask || null, rec = { I, ii, tf, base, layers: [] };
      for (let li = 0; li < m.lv.length; li++) {
        const roofLayer = li >= fl;   // een plat dak is beloopbaar waar niets op staat (dakterras, passage over de daken)
        const L = m.lv[li], lvW = (I.lv || 0) + li, y = base + li * LH + 0.02, tris = [], stairs = [];
        for (const P of mv2FloorPolys(m, li, ts)) { const v = P.v, cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!mv2InArea(m, cx, cz)) continue;   /* zonder trapgaten: geen pad over een gat */ if (roofLayer && mask) { const Wc = tf(cx, cz), c = mask(Wc[0], Wc[1]); if (c === 2) continue; } const W = v.map(p => tf(p[0], p[1])); tris.push(W); }
        if (roofLayer && !tris.length) continue;
        const skip = (modGroups.get(I) || {}).skip;
        for (const id in L.w) { const Wd = L.w[id]; if (!Wd) continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue; const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts); if (!mv2NearArea(m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue; const A = tf(a[0], a[1]), B = tf(b[0], b[1]); if (skip && skip.has(wallKeyW(lvW, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2))) continue; addWallIdx(lvW, { a: A, b: B, pass: PASS.has(Wd.o || ''), mid: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], o: Wd.o || '', outer: true, from: (m.name || '') + ' @' + I.q + ',' + I.r }); }
        // inrichting als hindernis: langwerpig (stelling, toonbank, bank, fietsenrek) als lijnstuk, rond als kruis
        { const OLEN = { shelf: 2.4, counter: 2.2, bench: 1.8, bike: 2.4, solar: 3.4, container: 2.4, goal: 3.7, boat: 4.2, shelter: 3.0, car: 4.3, bed: 2.0, sofa: 2.1, desk: 1.6, kitchen: 2.4, screen: 6.0, sign: 1.6 }, ORAD = { fountain: 1.9, table: 0.9, planter: 0.75, pillar: 0.35, tree: 0.3, bin: 0.25, pump: 0.5, charger: 0.25, turbine: 0.7, chimney: 1.25, grave: 0.4, slide: 0.8, sheep: 0.45, swing: 1.3 }, eg = modGroups.get(I) || {};
          for (const O0 of L.o || []) {
            let t = O0.t; const roofL = li >= fl;
            if (roofL && eg.mask) { const Wm = tf(O0.x, O0.z); if (eg.mask(Wm[0], Wm[1])) continue; }
            if (roofL && eg.style && eg.style !== 'top') { if (t === 'bush') continue; if (t === 'tree') t = eg.style === 'hall' ? 'fountain' : 'planter'; }
            const add = (ax, az, bx, bz) => { const A = tf(ax, az), B = tf(bx, bz); addWallIdx(lvW, { a: A, b: B, pass: false, mid: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], o: 'obj' }); };
            if (OLEN[t]) { const h = OLEN[t] / 2 + 0.25, cx = Math.cos(O0.rot || 0) * h, cz = Math.sin(O0.rot || 0) * h; add(O0.x - cx, O0.z - cz, O0.x + cx, O0.z + cz); }
            else if (ORAD[t]) { const r = ORAD[t] + 0.25; add(O0.x - r, O0.z, O0.x + r, O0.z); add(O0.x, O0.z - r, O0.x, O0.z + r); }
          } }
        for (const S of L.s || []) {
          if (S.k === 'hexramp') { const c = mv2CellXZ(S.q || 0, S.r || 0), f = FRAMES[(S.side || 0) % 6], ex = -f.nx, ez = -f.nz; const lo = tf(c[0] - ex * (INNER - 1.2), c[1] - ez * (INNER - 1.2)), hi = tf(c[0] + ex * (INNER - 1.2), c[1] + ez * (INNER - 1.2)); stairs.push({ lo, hi, q: S.q || 0, r: S.r || 0, ramp: true, side: ((S.side || 0) + (I.rot || 0)) % 6 }); continue; }   // zijde in de wereld: plus de draaiing
          const D = MV2.DIR6[S.d] || MV2.DIR6[0], a = mv2P(S.a[0], S.a[1], ts), len = (S.n || 2) * ts, w = S.w || 1.2, dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, off = S.off || 0;
          const at = (al, lat) => [a[0] + ux * al + nx * (lat + off), a[1] + uz * al + nz * (lat + off)];
          if (S.k === 'spiral') {   // wenteltrap: instappen bij de eerste tree (fase 15°), een rondje over de treden (straal 1,15 m), uitstappen bij de laatste (345°)
            const a0 = Math.atan2(uz, ux), sd = S.side || 1, pt = (deg, r) => [a[0] + Math.cos(a0 + sd * deg * Math.PI / 180) * r, a[1] + Math.sin(a0 + sd * deg * Math.PI / 180) * r];
            const lo = pt(6, 1.7), hi = pt(354, 1.7), via = []; for (let dg = 20; dg <= 340; dg += 20) via.push(tf(...pt(dg, 1.1)));
            // de leuning rondom (vijf zijden van de zeshoek) als muur in het netwerk: alleen langs de instapzijde kom je erin, niet dwars door de leuning
            for (let e = 0; e < 6; e++) { const A = tf(...(e ? pt(e * 60, 2.19) : pt(30, 1.9))), B = tf(...pt(e * 60 + 60, 2.19)); addWallIdx(lvW, { a: A, b: B, pass: false, mid: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], o: 'trap' }); }   // open is alleen de eerste tree (0°–30°)
            const [lq, lr] = mv2CellOf(lo[0], lo[1]), [hq, hr] = mv2CellOf(hi[0], hi[1]);
            stairs.push({ lo: tf(lo[0], lo[1]), hi: tf(hi[0], hi[1]), lq, lr, hq, hr, via, spir: tf(a[0], a[1]) }); continue;
          }
          const lo = at(-0.6, 0), hi = S.k === 'u' ? at(-0.6, (S.side || 1) * w) : at(len + 0.6, 0);
          const [lq, lr] = mv2CellOf(lo[0], lo[1]), [hq, hr] = mv2CellOf(hi[0], hi[1]);
          stairs.push({ lo: tf(lo[0], lo[1]), hi: tf(hi[0], hi[1]), lq, lr, hq, hr });
        }
        for (const W of tris) addFloor(lvW, W);
        rec.layers.push({ li, lvW, y, tris, stairs });
      }
      data.push(rec);
    });
    const key = (ii, li, q, r, k) => 'm' + ii + ':' + li + ':' + q + ',' + r + ':' + k;
    const mk = (k, x, z, y, kind, extra) => { const n = Object.assign({ key: k, x, z, y, kind, edges: new Map(), q: worldToCell(x, z)[0], r: worldToCell(x, z)[1] }, extra || {}); n.yr = n.y - gH(n.q, n.r); nodes.set(k, n); return n; };
    const conn = (a, b, via, climb) => { if (!a || !b || a === b || a.edges.has(b.key)) return; a.edges.set(b.key, { to: b, side: -1, climb: !!climb, mod: true, via: via && via.length ? via : undefined }); b.edges.set(a.key, { to: a, side: -1, climb: !!climb, mod: true, via: via && via.length ? via.slice().reverse() : undefined }); };
    const byCell = new Map();   // 'lvW|q,r' → { k: node } sectorknopen per vak per laag (over alle exemplaren)
    for (const rec of data) for (const Ly of rec.layers) {
      const sect = new Map();   // 'q,r' → [6 × { sx, sz, area }]
      for (const W of Ly.tris) {
        const cx = (W[0][0] + W[1][0] + W[2][0]) / 3, cz = (W[0][1] + W[1][1] + W[2][1]) / 3, [q, r] = worldToCell(cx, cz), c = cellToWorld(q, r), k = sectorOf(c, cx, cz), ar = Math.abs((W[1][0] - W[0][0]) * (W[2][1] - W[0][1]) - (W[2][0] - W[0][0]) * (W[1][1] - W[0][1])) / 2;
        const kk = q + ',' + r; let S = sect.get(kk); if (!S) sect.set(kk, S = [0, 1, 2, 3, 4, 5].map(() => ({ sx: 0, sz: 0, area: 0, pts: [] })));
        S[k].sx += cx * ar; S[k].sz += cz * ar; S[k].area += ar; if (ar > 0.4) S[k].pts.push([cx, cz]);
      }
      const open = Ly.li === rec.layers.length - 1 && (Ly.li >= modMeta(rec.I.m).fl || !(modGroups.get(rec.I) || {}).roofed);   // buiten: galerij, terras of dak
      for (const [kk, S] of sect) {
        const [q, r] = kk.split(',').map(Number), ck = Ly.lvW + '|' + kk; let C = byCell.get(ck); if (!C) byCell.set(ck, C = {});
        for (let k = 0; k < 6; k++) { const s = S[k]; if (s.area < 1.5) continue; let nx = s.sx / s.area, nz = s.sz / s.area;
          if (!onFloor(Ly.lvW, nx, nz) && s.pts.length) { let bd = 1e9, bp = null; for (const p2 of s.pts) { const d = Math.hypot(p2[0] - nx, p2[1] - nz); if (d < bd) { bd = d; bp = p2; } } [nx, nz] = bp; }   // zwaartepunt boven een trapgat of vide: het dichtstbijzijnde stuk vloer
          C[k] = mk(key(rec.ii, Ly.li, q, r, k), nx, nz, Ly.y, { b: 'mod', open }, { ii: rec.ii, li: Ly.li, lvW: Ly.lvW, sector: k }); }
        // binnen het vak: naast elkaar en tegenover elkaar
        const cc = cellToWorld(q, r);
        for (let k = 0; k < 6; k++) for (const dk of [1, 3]) {
          const A = C[k], B = C[(k + dk) % 6]; if (!A || !B) continue;
          let via = route(Ly.lvW, [A.x, A.z], [B.x, B.z]);
          if (!via && dk === 1) {   // op een ring (galerij, terras): om de hoek van de kern heen, niet dwars door de balustrade
            const ra = Math.hypot(A.x - cc.x, A.z - cc.z), rb = Math.hypot(B.x - cc.x, B.z - cc.z), am = Math.atan2(A.z - cc.z, A.x - cc.x), bm = Math.atan2(B.z - cc.z, B.x - cc.x); let d = bm - am; d = Math.atan2(Math.sin(d), Math.cos(d));
            // het hoekpunt op de ring, niet op of tegen een dichte muur: anders iets verder naar binnen of naar buiten
            const mid = am + d / 2, rr0 = (ra + rb) / 2;
            for (const dr of [0, -0.5, 0.5, -0.9, 0.9]) {
              const rr = rr0 + dr, P = [cc.x + Math.cos(mid) * rr, cc.z + Math.sin(mid) * rr];
              if (wallsNear(Ly.lvW, P[0], P[1]).some(w => !w.pass && distSeg(P, w.a, w.b) <= 0.3)) continue;
              const v1 = passage(Ly.lvW, [A.x, A.z], P), v2 = passage(Ly.lvW, P, [B.x, B.z]);
              if (v1 && v2 && floored(Ly.lvW, [[A.x, A.z], ...v1, P, ...v2, [B.x, B.z]])) { via = [...v1, P, ...v2]; break; }
            }
          }
          if (via) conn(A, B, via, false);
        }
      }
    }
    // tussen vakken (ook tussen twee verschillende modules): sector k ↔ sector k+3 van de buur op dezelfde laag
    for (const [ck, C] of byCell) {
      const [lvW, qr] = ck.split('|'), [q, r] = qr.split(',').map(Number);
      for (let k = 0; k < 6; k++) { const A = C[k]; if (!A) continue; const f = FRAMES[k], nq = q + NEIGH[k][0], nr = r + NEIGH[k][1]; void f; const NB = byCell.get(lvW + '|' + nq + ',' + nr); const B = NB && NB[(k + 3) % 6]; if (!B || A.edges.has(B.key)) continue; const via = route(+lvW, [A.x, A.z], [B.x, B.z]); if (via) conn(A, B, via, false); }
    }
    // trappen, hellingen, schans: onderste knoop op de laag zelf, bovenste op de laag erboven; beide aan de dichtstbijzijnde sectorknoop
    // dichtstbijzijnde sectorknoop vóór (sg −1) of ná (sg +1) de trap in de looprichting u: niet opzij, door de leuning
    const nearest = (lvW, x, z, q, r, u, sg) => { let best = null, bd = 1e9; for (const [dq, dr] of [[0, 0], ...NEIGH]) { const C = byCell.get(lvW + '|' + (q + dq) + ',' + (r + dr)); if (!C) continue; for (const k in C) { const n = C[k], d = Math.hypot(n.x - x, n.z - z), al = ((n.x - x) * u[0] + (n.z - z) * u[1]) * sg; if (al < 0.6 * d - 0.3) continue; if (d < bd && route(lvW, [x, z], [n.x, n.z])) { bd = d; best = n; } } } return best; };
    let si = 0;
    for (const rec of data) for (const Ly of rec.layers) for (const S of Ly.stairs) {
      const up = Ly.lvW + 1, yHi = Ly.y + LH, [lq, lr] = worldToCell(S.lo[0], S.lo[1]), [hq, hr] = worldToCell(S.hi[0], S.hi[1]);
      const lo = mk('ms' + (si++), S.lo[0], S.lo[1], Ly.y, { b: 'mod', stair: 'low' }, { lvW: Ly.lvW }), hi = mk('ms' + (si++), S.hi[0], S.hi[1], yHi, { b: 'mod', stair: 'high' }, { lvW: up });
      conn(lo, hi, S.via || null, true);
      if (S.spir) { const e1 = lo.edges.get(hi.key), e2 = hi.edges.get(lo.key); if (e1) e1.spir = S.spir; if (e2) e2.spir = S.spir; }   // wenteltrap: de lopers blijven tussen kern en leuning (10-mensen)
      if (S.ramp) {   // schans: onderaan hoort bij de buur over de instapzijde (op het vak zelf is geen vloer), bovenaan bij de buur over de uitstapzijde
        const c = cellToWorld(lq, lr), f = FRAMES[S.side], NB0 = byCell.get(Ly.lvW + '|' + (lq + NEIGH[S.side][0]) + ',' + (lr + NEIGH[S.side][1])), NB1 = byCell.get(up + '|' + (lq + NEIGH[(S.side + 3) % 6][0]) + ',' + (lr + NEIGH[(S.side + 3) % 6][1])); void c; void f;
        const A = NB0 && NB0[(S.side + 3) % 6], B = NB1 && NB1[S.side]; if (A) { const v = passage(Ly.lvW, [lo.x, lo.z], [A.x, A.z]); if (v) conn(lo, A, v, false); } if (B) { const v = passage(up, [hi.x, hi.z], [B.x, B.z]); if (v) conn(hi, B, v, false); }   // de helling zelf is geen vloer: alleen muren controleren
        const H0 = nodes.get(lk(lq + NEIGH[S.side][0], lr + NEIGH[S.side][1], Ly.lvW * LH)); if (!A && H0) conn(lo, H0, null, false);   // oude bouwblokken naast de schans
        if (!A && !H0 && Ly.lvW === 0) { const f2 = FRAMES[S.side], ent = mk('mde' + si, lo.x, lo.z, Ly.y, { b: 'mdoor', d: S.side, outside: [lo.x + f2.nx * 2.6, lo.z + f2.nz * 2.6] }); conn(ent, lo, null, false); }   // instap vanaf de straat
        continue;
      }
      const ul = Math.hypot(hi.x - lo.x, hi.z - lo.z) || 1, u = [(hi.x - lo.x) / ul, (hi.z - lo.z) / ul], A = nearest(Ly.lvW, lo.x, lo.z, lq, lr, u, -1), B = nearest(up, hi.x, hi.z, hq, hr, u, 1); if (A) conn(lo, A, route(Ly.lvW, [lo.x, lo.z], [A.x, A.z]), false); if (B) conn(hi, B, route(up, [hi.x, hi.z], [B.x, B.z]), false);
    }
    // ingangen: een opening (of geen muur) in de buitenrand van het gebied op de begane grond → knoop 'mdoor' net binnen,
    // gekoppeld aan de sectorknoop en aan oude bouwblokken ernaast (de stoep volgt in 10-mensen)
    for (const rec of data) {
      const Ly = rec.layers[0]; if (!Ly || (rec.I.lv || 0) !== 0) continue;
      const area = mv2Area(rec.I), inArea = (q, r) => area.some(([a, b]) => a === q && b === r);
      for (const [q, r] of area) {
        const C = byCell.get('0|' + q + ',' + r); if (!C) continue;
        for (let k = 0; k < 6; k++) {
          const nq = q + NEIGH[k][0], nr = r + NEIGH[k][1]; if (inArea(nq, nr) || !C[k] || modCellOccupied(nq, nr)) continue;   // tegen een andere module: die verbinding loopt via de sectorknopen
          if (stackOf(nq, nr).length && baseOf(stackOf(nq, nr)[0]) === 'water') continue;
          const c = cellToWorld(q, r), f = FRAMES[k], mx = c.x + f.nx * INNER, mz = c.z + f.nz * INNER, inside = [c.x + f.nx * (INNER - 1.3), c.z + f.nz * (INNER - 1.3)], outside = [c.x + f.nx * (INNER + 1.3), c.z + f.nz * (INNER + 1.3)];
          // de rand: welke muurstukken liggen op deze zijde, en is er één met een opening (of geen muur)?
          const ws = wallsNear(0, mx, mz).filter(w => Math.abs((w.mid[0] - c.x) * f.nx + (w.mid[1] - c.z) * f.nz - INNER) < 0.3 && Math.abs((w.mid[0] - c.x) * f.tx + (w.mid[1] - c.z) * f.tz) < R / 2 + 0.2);
          let pt = null;
          if (!ws.length) pt = [mx, mz]; else { const o = ws.find(w => w.pass); if (o) pt = o.mid; }
          if (!pt) continue;
          const ent = mk('md' + rec.ii + ':' + q + ',' + r + ':' + k, pt[0] + f.nx * -1.0, pt[1] + f.nz * -1.0, Ly.y, { b: 'mdoor', d: k, outside: [pt[0] + f.nx * 1.2, pt[1] + f.nz * 1.2] });
          void inside; void outside;
          conn(ent, C[k], null, false);
          const H = nodes.get(lk(nq, nr, 0)); if (H && H.kind.b !== 'door') conn(ent, H, [ent.kind.outside], false);   // naar het oude netwerk ernaast (stoep, plein, pad)
        }
      }
    }
    // trappenhuis-poot (08l): ingang op de grond, wenteltrap omhoog, bordes, door de deur naar de sectorknoop erachter
    if (typeof legTowers !== 'undefined') { let ti = 0; for (const [I, T] of legTowers) {
      const ii = insts.indexOf(I); if (ii < 0) continue; ti++;
      const step = Math.PI / 6, P = (th, r) => [T.c[0] + Math.cos(th) * r, T.c[1] + Math.sin(th) * r], t0 = T.phi - T.N * step;
      const eo = P(t0 - step / 2, 2.4), ent = mk('mtw' + ti, eo[0], eo[1], T.y0 + 0.02, { b: 'mdoor', d: T.k, outside: P(t0 - step / 2, 3.4) });
      const lo = mk('mtl' + ti, ...P(t0 + step / 2, 1.1), T.y0 + (T.yT - T.y0) / T.N, { b: 'mod', stair: 'low' }, { lvW: 0 });
      const hi = mk('mth' + ti, ...P(T.phi - step / 2, 1.1), T.yT, { b: 'mod', stair: 'high' }, { lvW: T.lvW });
      const via = []; for (let a = t0 + step; a < T.phi - step * 0.9; a += step * 0.67) via.push(P(a, 1.1));
      conn(ent, lo, null, false); conn(lo, hi, via, true); { const e1 = lo.edges.get(hi.key), e2 = hi.edges.get(lo.key); if (e1) e1.spir = T.c; if (e2) e2.spir = T.c; }
      const inN = mk('mti' + ti, T.inP[0], T.inP[1], T.yT, { b: 'mod' }, { lvW: T.lvW }); conn(hi, inN, [T.door], false);
      const C = byCell.get(T.lvW + '|' + T.q + ',' + T.r); if (C) { const S = C[T.k] || Object.values(C)[0]; if (S) conn(inN, S, route(T.lvW, [inN.x, inN.z], [S.x, S.z]) || null, false); }
    } }
  }
