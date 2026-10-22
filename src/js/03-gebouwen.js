  // ---------- Gebouwen met interieur ----------
  // Elk gebouwblok is hol: 6 muren van 25 cm met ramen, een vloer van 20 cm, een plafond,
  // een voordeur naar de straat, doorgangen naar aangrenzende gebouwen en een trap naar boven.
  const WALL_T = 0.25, FLOOR_T = 0.2;
  const STAIR = 4;                                   // trap op de begane grond ligt langs zijde 4
  // Trappen wisselen per verdieping van kant (4, 1, 4, …): zo staat de trap naar boven nooit in het trapgat
  // van de trap eronder, en kom je boven aan op een plek waar je kunt lopen.
  function stairSide(q, r, baseY) {
    const st = stackOf(q, r);
    let y = 0, j = 0;
    for (let i = 0; i < st.length; i++) {
      if (Math.abs(y - baseY) < 0.01) break;
      j = isBuilding(baseOf(st[i])) ? j + 1 : 0;
      y += TY(st[i]).h;
    }
    return j % 2 ? (STAIR + 3) % 6 : STAIR;
  }
  // ---------- Bordestrap langs een muur (zoals in de schets) ----------
  // Twee steken naast elkaar langs de binnenkant van één muur, met een bordes in de hoek: je loopt de binnenste steek
  // op (van links naar rechts, 1,5 m), keert op het bordes in de hoek, en loopt de buitenste steek langs de muur terug
  // omhoog naar de verdieping, waar je links uitkomt. Per verdieping ligt de trap tegen de overkant (zijde 4, 1, 4, …).
  // Assen per trap: zijde k van het gebouw; u langs de muur, p van het midden naar de muur (binnenkant muur 7,54).
  const UT = { u0: -3.0, u1: 2.0, pi0: 5.05, pi1: 6.25, po0: 6.33, po1: 7.53, steps: 10 };
  const utMax = p => (INNER - WALL_T - p / 2) / (SQ3 / 2);   // tot hier reikt de ruimte bij de hoek (rechts), op diepte p
  const utHole = k => { const f = FRAMES[k]; return [[UT.u0, UT.pi0 - 0.1], [utMax(UT.pi0 - 0.1) + 0.05, UT.pi0 - 0.1], [utMax(INNER - 0.15) + 0.05, INNER - 0.15], [UT.u0, INNER - 0.15]].map(([u, p]) => local(f, u, p)); };
  const utLanding = k => { const f = FRAMES[k]; return [[UT.u1, UT.pi0], [utMax(UT.pi0) - 0.05, UT.pi0], [utMax(UT.po1) - 0.05, UT.po1], [UT.u1, UT.po1]].map(([u, p]) => local(f, u, p)); };
  const DOOR = { w: 1.1, y0: FLOOR_T, y1: FLOOR_T + 2.2 };
  const PASS = { w: 1.6, y0: FLOOR_T, y1: FLOOR_T + 2.4 };
  const ST = { u0: -2.08, u1: 2.08, p0: INNER - WALL_T - 1.026, p1: INNER - WALL_T - 0.026, steps: 16 };   // 16 treden van 18,75 cm, 1 m breed
  const HOLE = { u0: -1.0, u1: 2.13, p0: ST.p0, p1: INNER - WALL_T + 0.02 };
  const RAIL_END = 1.2;
  const UP = new THREE.Vector3(0, 1, 0);
  const isBuilding = t => t === 'woning' || t === 'kantoor';
  // Zijde k: normaal (n) wijst naar NEIGH[k], t loopt langs de muur
  const FRAMES = [0, 1, 2, 3, 4, 5].map(k => {
    const a = -k * Math.PI / 3;
    return { nx: Math.cos(a), nz: Math.sin(a), tx: Math.sin(a), tz: -Math.cos(a), rot: Math.PI / 2 - a };
  });
  const local = (f, u, p) => [f.tx * u + f.nx * p, f.tz * u + f.nz * p];
  function buildingAt(q, r, baseY) {
    let y = 0;
    for (const t of stackOf(q, r)) { if (isBuilding(t) && Math.abs(y - baseY) < 0.01) return true; y += TY(t).h; }
    return false;
  }

  // Kun je vanaf dit buurvak op deze hoogte een gebouw in? 2 = pad, hof, weg of looppad; 1 = open terras
  function walkableAtLevel(q, r, y) {
    const st = stackOf(q, r);
    let h = 0;
    for (const t of st) {
      const b = baseOf(t);
      if (Math.abs(h - y) < 0.01 && ['weg', 'laan', 'pad', 'hof', 'looppad', 'tunnel'].includes(b)) return 2;
      h += TY(t).h;
    }
    if (!st.length && y <= 0.41 && vecCover.has(key(q, r))) return 2;   // vak van een getekende weg: daar ligt de stoep
    if (y > 0.41 && st.length && Math.abs(h - y) < 0.3 && ['blok', 'looppad', 'tunnel', 'park'].includes(baseOf(st[st.length - 1]))) return 1;
    return 0;
  }
  // Voordeur: naar een pad of straat op dezelfde hoogte, anders naar een open terras of (op maaiveld) het gras
  function doorFace(q, r, baseY) {
    const nb = NEIGH.map(([dq, dr]) => [q + dq, r + dr]);
    const ss = stairSide(q, r, baseY);   // niet in de muur waar de trap tegenaan staat
    const cand = [0, 1, 2, 3, 4, 5].filter(k => k !== ss && !buildingAt(nb[k][0], nb[k][1], baseY));
    let d = cand.find(k => walkableAtLevel(nb[k][0], nb[k][1], baseY) === 2);
    if (d === undefined) d = cand.find(k => walkableAtLevel(nb[k][0], nb[k][1], baseY) === 1);
    if (d === undefined && baseY <= 0.41) d = cand.find(k => columnTop(nb[k][0], nb[k][1]) <= 0.3 && baseOf(stackOf(nb[k][0], nb[k][1])[0]) !== 'water');
    return d === undefined ? -1 : d;
  }

  const geoCache = new Map();
  // Muurvlak van w breed en 3 m hoog met openingen (deur, doorgang, ramen); hole = één opening of een lijst
  function wallShape(w, hole) {
    const holes = !hole ? [] : Array.isArray(hole) ? hole : [hole];
    const k = 'w' + w.toFixed(3) + holes.map(h => [h.u || 0, h.w, h.y0, h.y1].map(v => v.toFixed(2)).join('/')).join('|');
    if (geoCache.has(k)) return geoCache.get(k);
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, 3); s.lineTo(-w / 2, 3); s.closePath();
    for (const ho of holes) {
      const u = ho.u || 0, h = new THREE.Path();
      h.moveTo(u - ho.w / 2, ho.y0); h.lineTo(u - ho.w / 2, ho.y1); h.lineTo(u + ho.w / 2, ho.y1); h.lineTo(u + ho.w / 2, ho.y0); h.closePath();
      s.holes.push(h);
    }
    const g = new THREE.ShapeGeometry(s); geoCache.set(k, g); return g;
  }
  function hexPlane(rad, withHole, up) {
    const k = 'h' + rad + (withHole && typeof withHole === 'object' ? 'ut' + withHole.side : withHole) + up;
    if (geoCache.has(k)) return geoCache.get(k);
    const sg = up ? -1 : 1;
    const s = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (30 + 60 * i) * Math.PI / 180, x = rad * Math.cos(a), z = rad * Math.sin(a);
      i ? s.lineTo(x, sg * z) : s.moveTo(x, sg * z);
    }
    s.closePath();
    if (withHole && typeof withHole === 'object') {   // trapgat van de bordestrap
      const path = new THREE.Path(); utHole(withHole.side).forEach(([x, z], j) => j ? path.lineTo(x, sg * z) : path.moveTo(x, sg * z)); path.closePath(); s.holes.push(path);
    } else if (withHole !== false && withHole !== undefined && withHole !== null) {
      const f = FRAMES[withHole === true ? STAIR : withHole], path = new THREE.Path();
      [[HOLE.u0, HOLE.p0], [HOLE.u1, HOLE.p0], [HOLE.u1, HOLE.p1], [HOLE.u0, HOLE.p1]].forEach(([u, p], j) => {
        const [x, z] = local(f, u, p); j ? path.lineTo(x, sg * z) : path.moveTo(x, sg * z);
      });
      path.closePath(); s.holes.push(path);
    }
    const g = new THREE.ShapeGeometry(s); g.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
    geoCache.set(k, g); return g;
  }
  function mergeGeos(list) {
    let n = 0;
    const gs = list.map(g => { const ng = g.index ? g.toNonIndexed() : g; n += ng.attributes.position.count; return ng; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    for (const g of gs) {
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }

  function makeBuilding(o, t, q, r, i, baseY, cx, cz, col) {
    const st = stackOf(q, r);
    const stairUp = isBuilding(st[i + 1]);
    const holeHere = i > 0 && isBuilding(st[i - 1]);
    const office = t === 'kantoor';
    const v = hash(q, r, 0) % 4;
    const parts = new Map();
    const put = (mat, geo) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
    const placed = (g, rot, x, y, z) => { const c = g.clone(); c.applyMatrix4(new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z)); return c; };
    const box = (f, u, p, y, su, sy, sp) => {
      const [x, z] = local(f, u, p);
      const g = G.unit.clone();
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, f.rot), new THREE.Vector3(su, sy, sp)));
      return g;
    };
    const wallSeg = (f, u0, p0, u1, p1, y0, y1, half) => {
      const [ax, az] = local(f, u0, p0), [bx, bz] = local(f, u1, p1);
      col.walls.push({ ax: cx + ax, az: cz + az, bx: cx + bx, bz: cz + bz, y0: baseY + y0, y1: baseY + y1, half });
    };

    // Welke zijden krijgen een opening?
    const nb = NEIGH.map(([dq, dr]) => [q + dq, r + dr]);
    const sSide = stairSide(q, r, baseY), hSide = (sSide + 3) % 6;   // trap naar boven / trapgat van de trap eronder
    const passage = nb.map(([nq, nr], k) => k !== STAIR && k !== (STAIR + 3) % 6 && buildingAt(nq, nr, baseY));
    const door = doorFace(q, r, baseY);
    const behindStair = (k, c) => { if (!stairUp) return false; const [x, z] = local(FRAMES[k], c, INNER - 0.3), f = FRAMES[sSide]; return x * f.nx + z * f.nz > UT.pi0 - 0.5 && x * f.tx + z * f.tz > UT.u0 - 0.8; };   // raam achter de trap of het bordes

    // Muren
    const lin = 2 * (INNER - WALL_T) / SQ3, pc = INNER - WALL_T / 2, ue = pc / SQ3;
    // Echte ramen: een gat in de muur met dagkanten, een kozijn, een ruit en een vensterbank.
    // Woning: drie ramen per gevel (1,2 x 1,4 m, borstwering 0,9 m) met roedes. Kantoor: een glazen pui
    // in vakken van 1,5 m tussen een dichte borstwering en latei. Tegen een buurgebouw: geen ramen.
    const windowsFor = (k, hole) => {
      const [nq, nr] = nb[k];
      if (buildingAt(nq, nr, baseY)) return [];
      const out = [];
      if (office) {
        for (let c = -3.75; c <= 3.76; c += 1.5) {
          let a = c - 0.7, b = c + 0.7;
          a = Math.max(a, -4.12); b = Math.min(b, 4.12);
          if (behindStair(k, a) || behindStair(k, b)) continue;
          if (hole && a < hole.w / 2 + 0.25 && b > -hole.w / 2 - 0.25) continue;
          out.push({ u: (a + b) / 2, w: b - a, y0: 0.55, y1: 2.72 });
        }
      } else {
        for (const c of [-3, 0, 3]) {
          if ((c === 0 && hole) || behindStair(k, c - 0.6) || behindStair(k, c + 0.6)) continue;
          out.push({ u: c, w: 1.2, y0: 0.9, y1: 2.3 });
        }
      }
      return out;
    };
    const addWindow = (f, wnd) => {
      const { u, w, y0, y1 } = wnd, hh = y1 - y0, cy = (y0 + y1) / 2, pf = INNER - 0.07, fr = office ? M.alu : M.winFrame[v];
      // dagkanten en vensterbank binnen
      put(office ? M.alu : M.reveal, box(f, u - w / 2 - 0.01, pc, cy, 0.02, hh, WALL_T));
      put(office ? M.alu : M.reveal, box(f, u + w / 2 + 0.01, pc, cy, 0.02, hh, WALL_T));
      put(office ? M.alu : M.reveal, box(f, u, pc, y1 + 0.01, w + 0.04, 0.02, WALL_T));
      put(M.trim, box(f, u, pc - 0.04, y0 - 0.015, w + 0.12, 0.03, WALL_T + 0.08));
      // waterslag buiten
      if (!office) put(M.sill, box(f, u, INNER + 0.03, y0 - 0.035, w + 0.16, 0.06, 0.14));
      // kozijn
      const t = office ? 0.06 : 0.07;
      put(fr, box(f, u - w / 2 + t / 2, pf, cy, t, hh, t));
      put(fr, box(f, u + w / 2 - t / 2, pf, cy, t, hh, t));
      put(fr, box(f, u, pf, y1 - t / 2, w, t, t));
      put(fr, box(f, u, pf, y0 + t / 2, w, t, t));
      if (!office) {   // roedes: een middenstijl en een kalf
        put(fr, box(f, u, pf, cy, 0.055, hh, 0.055));
        put(fr, box(f, u, pf, y1 - hh * 0.38, w, 0.055, 0.055));
      }
      put(M.pane, box(f, u, pf, cy, w - 0.02, hh - 0.02, 0.012));
    };
    for (let k = 0; k < 6; k++) {
      const f = FRAMES[k];
      const hole = k === door ? DOOR : passage[k] ? PASS : null;
      const wins = windowsFor(k, hole), holes = (hole ? [hole] : []).concat(wins);
      const outMat = office ? (k === door ? M.officeSkinDoor : M.officeSkin) : (k === door ? M.brickDoor[v] : M.brick[v]);
      const inMat = office ? M.officeIn : (hole ? M.plasterPlain : M.plaster);
      put(outMat, placed(wallShape(R, holes), f.rot, f.nx * INNER, 0, f.nz * INNER));
      put(inMat, placed(wallShape(lin, holes), f.rot + Math.PI, f.nx * (INNER - WALL_T), 0, f.nz * (INNER - WALL_T)));
      for (const wnd of wins) addWindow(f, wnd);
      if (hole) {
        const hh = hole.y1 - hole.y0, cy = (hole.y0 + hole.y1) / 2;
        put(M.trim, box(f, -hole.w / 2 - 0.01, pc, cy, 0.02, hh, WALL_T));
        put(M.trim, box(f, hole.w / 2 + 0.01, pc, cy, 0.02, hh, WALL_T));
        put(M.trim, box(f, 0, pc, hole.y1 + 0.01, hole.w + 0.04, 0.02, WALL_T));
        wallSeg(f, -ue, pc, -hole.w / 2, pc, 0, 3, WALL_T / 2);
        wallSeg(f, hole.w / 2, pc, ue, pc, 0, 3, WALL_T / 2);
        wallSeg(f, -hole.w / 2, pc, hole.w / 2, pc, hole.y1, 3, WALL_T / 2);
      } else {
        wallSeg(f, -ue, pc, ue, pc, 0, 3, WALL_T / 2);
      }
    }

    // Vloer, plafond en (als er niets bovenop staat) een plat dak
    put(office ? M.floorOffice : M.floorWood, placed(hexPlane(R - 0.01, holeHere ? { side: hSide } : false, true), 0, 0, FLOOR_T, 0));
    col.surfaces.push({ kind: 'hex', cx, cz, top: baseY + FLOOR_T, bottom: baseY, hole: false, holePoly: holeHere ? utHole(hSide) : null });
    put(M.ceiling, placed(hexPlane(R - 0.01, stairUp ? { side: sSide } : false, false), 0, 0, 2.999, 0));
    if (!stairUp && !isBuilding(st[i + 1])) {
      put(M.roofFlat, placed(hexPlane(R, false, true), 0, 0, 3, 0));
      col.surfaces.push({ kind: 'hex', cx, cz, top: baseY + 3, bottom: baseY + 2.95, hole: false });
    }

    // Bordestrap naar de volgende verdieping (zie SW)
    const slab = (f, u0, u1, p, lo0, lo1, hi0, hi1, t) => {   // dunne schuine plaat (leuning, tussenwand) van u0 naar u1
      const P = (u, pp, y) => { const [x, z] = local(f, u, pp); return [x, y, z]; }, a = p - t / 2, b = p + t / 2;
      const v = [P(u0, a, lo0), P(u1, a, lo1), P(u1, a, hi1), P(u0, a, hi0), P(u0, b, lo0), P(u1, b, lo1), P(u1, b, hi1), P(u0, b, hi0)];
      const F = [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]], pos = [];
      for (const q of F) for (const i of [q[0], q[1], q[2], q[0], q[2], q[3]]) pos.push(...v[i]);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); return g;
    };
    if (stairUp) {   // bordestrap langs muur sSide (zie UT)
      const f = FRAMES[sSide], n = UT.steps, L = UT.u1 - UT.u0, run = L / n, rise = 1.5 / n, y0 = FLOOR_T, yL = FLOOR_T + 1.5, yE = 3 + FLOOR_T;
      const pI = (UT.pi0 + UT.pi1) / 2, wI = UT.pi1 - UT.pi0, pO = (UT.po0 + UT.po1) / 2, wO = UT.po1 - UT.po0;
      for (let j = 0; j < n; j++) {
        const t1 = y0 + (j + 1) * rise; put(M.stairWood, box(f, UT.u0 + (j + 0.5) * run, pI, (y0 + t1) / 2, run, t1 - y0, wI));   // binnenste steek: dicht tot de vloer
        const t2 = yL + (j + 1) * rise; put(M.stairWood, box(f, UT.u1 - (j + 0.5) * run, pO, t2 - (rise + 0.15) / 2, run, rise + 0.15, wO));   // buitenste steek: treden op een schuine plaat
      }
      put(M.concrete, slab(f, UT.u1, UT.u0, pO, yL - 0.42, yE - 0.42, yL - 0.12, yE - 0.12, wO));
      { const sh = new THREE.Shape(); utLanding(sSide).forEach(([x, z], j) => j ? sh.lineTo(x, z) : sh.moveTo(x, z)); sh.closePath();   // bordes in de hoek
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); g.rotateX(Math.PI / 2); g.translate(0, yL, 0); put(M.stairWood, g); }
      // leuningen: langs de binnenste steek (kant van de kamer), tussen de steken, langs de open rand van het bordes
      put(M.trim, slab(f, UT.u0, UT.u1, UT.pi0 - 0.03, y0, yL, y0 + 1.0, yL + 1.0, 0.05)); wallSeg(f, UT.u0 + 0.4, UT.pi0 - 0.03, UT.u1, UT.pi0 - 0.03, y0 + 0.3, 3, 0.05);
      put(M.trim, slab(f, UT.u0, UT.u1, (UT.pi1 + UT.po0) / 2, y0, yL, yE + 0.9, yL + 1.0, 0.06)); wallSeg(f, UT.u0, (UT.pi1 + UT.po0) / 2, UT.u1, (UT.pi1 + UT.po0) / 2, y0, 3, 0.05);
      { const um = utMax(UT.pi0) - 0.05; put(M.trim, slab(f, UT.u1, um, UT.pi0 - 0.03, yL, yL, yL + 1.0, yL + 1.0, 0.05)); wallSeg(f, UT.u1, UT.pi0 - 0.03, um, UT.pi0 - 0.03, yL - 0.3, yL + 1.0, 0.05); }
      col.surfaces.push({ kind: 'slopeU', cx, cz, tx: f.tx, tz: f.tz, nx: f.nx, nz: f.nz, u0: UT.u0, u1: UT.u1, p0: UT.pi0, p1: UT.pi1, y0: baseY + y0, y1: baseY + yL, bottom: baseY });
      col.surfaces.push({ kind: 'slopeU', cx, cz, tx: f.tx, tz: f.tz, nx: f.nx, nz: f.nz, u0: UT.u0, u1: UT.u1, p0: UT.po0, p1: UT.po1 + 0.1, y0: baseY + yE, y1: baseY + yL, bottom: baseY });
      col.surfaces.push({ kind: 'poly', cx, cz, pts: utLanding(sSide), top: baseY + yL, bottom: baseY + yL - 0.3 });
    }
    // Trapgat (van de trap eronder) met een balustrade van 1 m, behalve aan de kant waar je boven uitkomt (langs de muur)
    if (holeHere) {
      const f = FRAMES[hSide], hy = FLOOR_T, top = FLOOR_T + 1.0, pe = UT.pi0 - 0.1, um = utMax(pe);
      put(M.trim, slab(f, UT.u0, um, pe, hy, hy, top, top, 0.06)); wallSeg(f, UT.u0, pe, um, pe, hy, top, 0.05);
      put(M.trim, slab(f, UT.u0, UT.u0 + 0.06, (pe + UT.pi1 + 0.04) / 2, hy, hy, top, top, UT.pi1 + 0.04 - pe)); wallSeg(f, UT.u0, pe, UT.u0, UT.pi1 + 0.04, hy, top, 0.05);   // boven het begin van de binnenste steek
    }

    for (const [mat, list] of parts) {
      const m = new THREE.Mesh(mergeGeos(list), mat);
      m.castShadow = mat !== M.pane; m.receiveShadow = mat !== M.pane; m.userData.own = true;
      if (mat === M.pane) m.renderOrder = 2;   // glas na de muren tekenen
      o.add(m);
    }
  }

