  // ---------- Loopnetwerk door modules: zodat voetgangers winkels in lopen, trappen nemen en over galerijen gaan ----------
  // Per geplaatst exemplaar, per verdieping en per vak zes knopen: één per zijde (sector), op het zwaartepunt van de
  // vloerdriehoeken in die sector. Zo loopt iemand op een galerij netjes rondom en door een winkel langs de muren.
  // Twee knopen zijn verbonden als de rechte lijn ertussen geen muur kruist, of alleen muren met een deur, poort of
  // open doorgang (dan loopt het pad door het midden van die opening). Trappen, hellingen en de schans verbinden de
  // verdiepingen. Een opening in de buitenrand op de begane grond is een ingang (knoop 'mdoor'), die in 10-mensen aan
  // de stoep wordt gekoppeld zoals een voordeur.
  function modWalkAdd(nodes, lk) {
    const insts = (cells.inst || []).filter(I => I.m && I.m.v === 2 && Number.isInteger(I.q) && Number.isInteger(I.r));
    if (!insts.length) return;
    const LH = MV2.LV_H, PASS = new Set(['door', 'gate', 'open']);
    const wallsAt = new Map();   // laag (wereld, geheel) → [{a, b, pass, mid}] met vak-sleutels voor snel zoeken
    const addWallIdx = (lv, w) => { const k = lv + '|' + worldToCell((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2).join(','); let L = wallsAt.get(k); if (!L) wallsAt.set(k, L = []); L.push(w); };
    const wallsNear = (lv, x, z) => { const [q, r] = worldToCell(x, z), out = []; for (const [dq, dr] of [[0, 0], ...NEIGH]) { const L = wallsAt.get(lv + '|' + (q + dq) + ',' + (r + dr)); if (L) out.push(...L); } return out; };
    const sectorOf = (c, x, z) => { const ang = Math.atan2(z - c.z, x - c.x); return ((Math.round(-ang / (Math.PI / 3)) % 6) + 6) % 6; };   // zijde k heeft zijn normaal op −k·60°
    const cross = (p, q, a, b) => { const d = (q[0] - p[0]) * (b[1] - a[1]) - (q[1] - p[1]) * (b[0] - a[0]); if (Math.abs(d) < 1e-9) return null; const t = ((a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])) / d, u = ((a[0] - p[0]) * (q[1] - p[1]) - (a[1] - p[1]) * (q[0] - p[0])) / d; return t > 0.02 && t < 0.98 && u > -0.02 && u < 1.02 ? t : null; };
    // kan je van p naar q (zelfde laag)? geeft de tussenpunten (openingen) terug, of null
    function passage(lv, p, q) {
      const via = [];
      for (const w of wallsNear(lv, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) { const t = cross(p, q, w.a, w.b); if (t === null) continue; if (!w.pass) return null; via.push([t, w.mid]); }
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
        for (const id in L.f) { const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!mv2InArea(m, cx, cz)) continue; if (roofLayer && mask) { const Wc = tf(cx, cz), c = mask(Wc[0], Wc[1]); if (c === 2 || (c === 1 && L.f[id] === 'glass')) continue; } const W = v.map(p => tf(p[0], p[1])); tris.push(W); }
        if (roofLayer && !tris.length) continue;
        for (const id in L.w) { const Wd = L.w[id]; if (!Wd) continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue; const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts); if (!mv2NearArea(m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue; const A = tf(a[0], a[1]), B = tf(b[0], b[1]); addWallIdx(lvW, { a: A, b: B, pass: PASS.has(Wd.o || ''), mid: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], o: Wd.o || '', outer: true }); }
        for (const S of L.s || []) {
          if (S.k === 'hexramp') { const c = mv2CellXZ(S.q || 0, S.r || 0), f = FRAMES[(S.side || 0) % 6], ex = -f.nx, ez = -f.nz; const lo = tf(c[0] - ex * (INNER - 1.2), c[1] - ez * (INNER - 1.2)), hi = tf(c[0] + ex * (INNER - 1.2), c[1] + ez * (INNER - 1.2)); stairs.push({ lo, hi, q: S.q || 0, r: S.r || 0, ramp: true, side: (S.side || 0) % 6 }); continue; }
          const D = MV2.DIR6[S.d] || MV2.DIR6[0], a = mv2P(S.a[0], S.a[1], ts), len = (S.n || 2) * ts, w = S.w || 1.2, dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, off = S.off || 0;
          const at = (al, lat) => [a[0] + ux * al + nx * (lat + off), a[1] + uz * al + nz * (lat + off)];
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
        const kk = q + ',' + r; let S = sect.get(kk); if (!S) sect.set(kk, S = [0, 1, 2, 3, 4, 5].map(() => ({ sx: 0, sz: 0, area: 0 })));
        S[k].sx += cx * ar; S[k].sz += cz * ar; S[k].area += ar;
      }
      const open = Ly.li === rec.layers.length - 1 && (Ly.li >= modMeta(rec.I.m).fl || !(modGroups.get(rec.I) || {}).roofed);   // buiten: galerij, terras of dak
      for (const [kk, S] of sect) {
        const [q, r] = kk.split(',').map(Number), ck = Ly.lvW + '|' + kk; let C = byCell.get(ck); if (!C) byCell.set(ck, C = {});
        for (let k = 0; k < 6; k++) { const s = S[k]; if (s.area < 1.5) continue; C[k] = mk(key(rec.ii, Ly.li, q, r, k), s.sx / s.area, s.sz / s.area, Ly.y, { b: 'mod', open }, { ii: rec.ii, li: Ly.li, lvW: Ly.lvW, sector: k }); }
        // binnen het vak: naast elkaar en tegenover elkaar
        const cc = cellToWorld(q, r);
        for (let k = 0; k < 6; k++) for (const dk of [1, 3]) {
          const A = C[k], B = C[(k + dk) % 6]; if (!A || !B) continue;
          let via = route(Ly.lvW, [A.x, A.z], [B.x, B.z]);
          if (!via && dk === 1) {   // op een ring (galerij, terras): om de hoek van de kern heen, niet dwars door de balustrade
            const ra = Math.hypot(A.x - cc.x, A.z - cc.z), rb = Math.hypot(B.x - cc.x, B.z - cc.z), am = Math.atan2(A.z - cc.z, A.x - cc.x), bm = Math.atan2(B.z - cc.z, B.x - cc.x); let d = bm - am; d = Math.atan2(Math.sin(d), Math.cos(d));
            const mid = am + d / 2, rr = (ra + rb) / 2, P = [cc.x + Math.cos(mid) * rr, cc.z + Math.sin(mid) * rr], v1 = passage(Ly.lvW, [A.x, A.z], P), v2 = passage(Ly.lvW, P, [B.x, B.z]);
            if (v1 && v2 && floored(Ly.lvW, [[A.x, A.z], ...v1, P, ...v2, [B.x, B.z]])) via = [...v1, P, ...v2];
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
    const nearest = (lvW, x, z, q, r) => { let best = null, bd = 1e9; for (const [dq, dr] of [[0, 0], ...NEIGH]) { const C = byCell.get(lvW + '|' + (q + dq) + ',' + (r + dr)); if (!C) continue; for (const k in C) { const n = C[k], d = Math.hypot(n.x - x, n.z - z); if (d < bd && route(lvW, [x, z], [n.x, n.z])) { bd = d; best = n; } } } return best; };
    let si = 0;
    for (const rec of data) for (const Ly of rec.layers) for (const S of Ly.stairs) {
      const up = Ly.lvW + 1, yHi = Ly.y + LH, [lq, lr] = worldToCell(S.lo[0], S.lo[1]), [hq, hr] = worldToCell(S.hi[0], S.hi[1]);
      const lo = mk('ms' + (si++), S.lo[0], S.lo[1], Ly.y, { b: 'mod', stair: 'low' }, { lvW: Ly.lvW }), hi = mk('ms' + (si++), S.hi[0], S.hi[1], yHi, { b: 'mod', stair: 'high' }, { lvW: up });
      conn(lo, hi, null, true);
      if (S.ramp) {   // schans: onderaan hoort bij de buur over de instapzijde (op het vak zelf is geen vloer), bovenaan bij de buur over de uitstapzijde
        const c = cellToWorld(lq, lr), f = FRAMES[S.side], NB0 = byCell.get(Ly.lvW + '|' + (lq + NEIGH[S.side][0]) + ',' + (lr + NEIGH[S.side][1])), NB1 = byCell.get(up + '|' + (lq + NEIGH[(S.side + 3) % 6][0]) + ',' + (lr + NEIGH[(S.side + 3) % 6][1])); void c; void f;
        const A = NB0 && NB0[(S.side + 3) % 6], B = NB1 && NB1[S.side]; if (A) { const v = route(Ly.lvW, [lo.x, lo.z], [A.x, A.z]); if (v) conn(lo, A, v, false); } if (B) { const v = route(up, [hi.x, hi.z], [B.x, B.z]); if (v) conn(hi, B, v, false); }
        const H0 = nodes.get(lk(lq + NEIGH[S.side][0], lr + NEIGH[S.side][1], Ly.lvW * LH)); if (!A && H0) conn(lo, H0, null, false);   // oude bouwblokken naast de schans
        if (!A && !H0 && Ly.lvW === 0) { const f2 = FRAMES[S.side], ent = mk('mde' + si, lo.x, lo.z, Ly.y, { b: 'mdoor', d: S.side, outside: [lo.x + f2.nx * 2.6, lo.z + f2.nz * 2.6] }); conn(ent, lo, null, false); }   // instap vanaf de straat
        continue;
      }
      const A = nearest(Ly.lvW, lo.x, lo.z, lq, lr), B = nearest(up, hi.x, hi.z, hq, hr); if (A) conn(lo, A, route(Ly.lvW, [lo.x, lo.z], [A.x, A.z]), false); if (B) conn(hi, B, route(up, [hi.x, hi.z], [B.x, B.z]), false);
    }
    // ingangen: een opening (of geen muur) in de buitenrand van het gebied op de begane grond → knoop 'mdoor' net binnen,
    // gekoppeld aan de sectorknoop en aan oude bouwblokken ernaast (de stoep volgt in 10-mensen)
    for (const rec of data) {
      const Ly = rec.layers[0]; if (!Ly || (rec.I.lv || 0) !== 0) continue;
      const area = mv2Area(rec.I), inArea = (q, r) => area.some(([a, b]) => a === q && b === r);
      for (const [q, r] of area) {
        const C = byCell.get('0|' + q + ',' + r); if (!C) continue;
        for (let k = 0; k < 6; k++) {
          const nq = q + NEIGH[k][0], nr = r + NEIGH[k][1]; if (inArea(nq, nr) || !C[k]) continue;
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
  }
