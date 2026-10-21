  // ---------- Standaardbibliotheek: honderd modules, gemaakt met dezelfde bouwstenen als de module maker ----------
  // Families die op elkaar passen: rijtjeshuizen met de deur aan zijde 0 en dichte zijmuren (ze delen de muur met de
  // buren), pleinen en parken met stoep of groen aan alle randen, winkels met een glazen pui aan zijde 0. Alles is
  // gewoon een module v2: je kunt ze in de module maker openen, aanpassen en als kopie bewaren.
  function libBuilder(name, cat, k = 0, n = 4) {
    const m = mv2New(name); m.cat = cat; m.k = k; m.n = n; const ts = R / n;
    const lv = i => { while (m.lv.length <= i) m.lv.push(mv2Level()); return m.lv[i]; };
    const vAt = (x, z) => { const fi = x / (ts * SQ3 / 2), fj = z / ts - fi / 2; return [Math.round(fi), Math.round(fj)]; };
    const inHex = (x, z, cx, cz, rad) => { for (let s = 0; s < 6; s++) { const a = -s * Math.PI / 3; if ((x - cx) * Math.cos(a) + (z - cz) * Math.sin(a) > rad * SQ3 / 2 + 1e-6) return false; } return true; };
    const dirOf = (dx, dz) => { let best = 0, bd = -2; for (let d = 0; d < 6; d++) { const D = MV2.DIR6[d], ux = D[0] * ts * SQ3 / 2, uz = D[0] * ts / 2 + D[1] * ts, l = Math.hypot(ux, uz), c = (dx * ux + dz * uz) / (l * Math.hypot(dx, dz)); if (c > bd) { bd = c; best = d; } } return best; };
    const segKey = (a, d6) => { const D = MV2.DIR6[d6], d3 = d6 % 3; return d6 < 3 ? [a[0], a[1], d3, [a[0] + D[0], a[1] + D[1]]] : [a[0] + D[0], a[1] + D[1], d3, [a[0] + D[0], a[1] + D[1]]]; };
    const ext = R * (1 + 2 * k) + ts;
    const B = {
      m,
      // alle driehoeken waarvan het zwaartepunt binnen de zeshoek (cx, cz, straal rad) ligt (en binnen het gebied)
      hex(li, cx, cz, rad, mat) {
        const L = lv(li), iM = Math.ceil(ext / (ts * SQ3 / 2)) + 1, jM = Math.ceil(ext / ts) + iM;
        for (let i = -iM; i <= iM; i++) for (let j = -jM; j <= jM; j++) for (const t of [0, 1]) { const v = mv2TriVerts(i, j, t, ts), x = (v[0][0] + v[1][0] + v[2][0]) / 3, z = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!mv2InArea(m, x, z) || !inHex(x, z, cx, cz, rad)) continue; if (mat) L.f[i + ',' + j + ',' + t] = mat; else delete L.f[i + ',' + j + ',' + t]; }
        return B;
      },
      cell(li, q, r, mat) { const c = mv2CellXZ(q, r); return B.hex(li, c[0], c[1], R - 0.01, mat); },
      all(li, mat) { for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) B.cell(li, q, r, mat); return B; },
      // muren langs de zeshoek (cx, cz, straal rad); sides: welke zijden (0..5); open: { zijde: 'door'|'window'|... of [opening, index] }; win: om de hoeveel ribben een raam
      ring(li, cx, cz, rad, mat, opts = {}) {
        const L = lv(li), sides = opts.sides || [0, 1, 2, 3, 4, 5], per = Math.round(rad / ts), open = opts.open || {}, win = opts.win || 0;
        for (const s of sides) {
          const a0 = (30 + 60 * s) * Math.PI / 180, a1 = (90 + 60 * s) * Math.PI / 180, p0 = [cx + rad * Math.cos(a0), cz + rad * Math.sin(a0)], p1 = [cx + rad * Math.cos(a1), cz + rad * Math.sin(a1)];
          let a = vAt(p0[0], p0[1]); const d6 = dirOf(p1[0] - p0[0], p1[1] - p0[1]);
          for (let i = 0; i < per; i++) {
            const [ki, kj, kd, nxt] = segKey(a, d6), key = ki + ',' + kj + ',' + kd; a = nxt;
            const [p, q] = [mv2P(ki, kj, ts), mv2P(ki + MV2.DIR3[kd][0], kj + MV2.DIR3[kd][1], ts)]; if (!mv2InArea(m, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) continue;
            let o = ''; const sp = open[s];
            if (sp) { if (typeof sp === 'string') { if (i === Math.floor((per - 1) / 2)) o = sp; } else for (const [oo, idx] of sp) if (i === idx) o = oo; }
            if (!o && win && (i % win === win - 1 || per === 1)) o = 'window';
            L.w[key] = { m: mat, o };
          }
        }
        return B;
      },
      cellRing(li, q, r, mat, opts) { const c = mv2CellXZ(q, r); return B.ring(li, c[0], c[1], R, mat, opts); },
      // een rechte muur vanaf (x, z) in richting d6, n ribben
      line(li, x, z, d6, n, mat, o = '') { const L = lv(li); let a = vAt(x, z); for (let i = 0; i < n; i++) { const [ki, kj, kd, nxt] = segKey(a, d6); a = nxt; L.w[ki + ',' + kj + ',' + kd] = { m: mat, o: typeof o === 'function' ? o(i) : o }; } return B; },
      stair(li, x, z, d6, n, w = 1.2, kind = 'stair') { lv(li).s.push({ a: vAt(x, z), d: d6, n, w, k: kind }); return B; },
      roof(li, q, r, kind = 'hip') { lv(li).r[q + ',' + r] = kind; return B; },
      roofAll(li, kind = 'hip') { for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) B.roof(li, q, r, kind); return B; },
      obj(li, t, x, z, rot = 0) { lv(li).o.push({ t, x: Math.round(x * 4) / 4, z: Math.round(z * 4) / 4, rot }); return B; },
      // voorwerpen in een kring
      circle(li, t, cx, cz, rad, cnt, a0 = 0) { for (let i = 0; i < cnt; i++) { const a = a0 + i * Math.PI * 2 / cnt; B.obj(li, t, cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, a + Math.PI / 2); } return B; },
      done() { mv2Fix(m); m.codes = modV2Codes(m); return m; },
    };
    return B;
  }
  function libStandard() {
    const out = [], add = b => {   // een bovenste laag met alleen betonvloer is een plat dak: dakbedekking
      const m = b.m, T = m.lv[m.lv.length - 1];
      if (m.lv.length > 1 && !Object.keys(T.w).length && !T.s.length && !T.o.length && Object.values(T.f).every(v => v === 'concrete')) for (const k in T.f) T.f[k] = 'roof';
      out.push(b.done());
    };
    const sideTo = (cx, cz) => (Math.round(Math.atan2(-cz, -cx) / (Math.PI / 3)) + 5 + 12) % 6;   // zijde van een vak die naar het midden kijkt
    const WIN = { brick: 2, plaster: 2, stone: 2, wood: 2, concrete: 4, glass: 0 };
    // ---------- Wonen: rijtjeshuizen (volle zeshoek, deur aan zijde 0), villa's met tuin, appartementen ----------
    const house = (name, mat, floors, roof, opts = {}) => {
      const b = libBuilder(name, 'Wonen');
      for (let f = 0; f < floors; f++) { b.cell(f, 0, 0, f ? 'wood' : 'tile'); b.cellRing(f, 0, 0, mat, { open: f ? {} : { 0: 'door' }, win: WIN[mat] || 2 }); }
      if (roof === 'hip') b.roof(floors - 1, 0, 0, 'hip'); else b.cell(floors, 0, 0, 'concrete');
      if (opts.obj) for (const o of opts.obj) b.obj(...o);
      add(b);
    };
    house('Rijtjeshuis baksteen', 'brick', 2, 'hip');
    house('Rijtjeshuis wit', 'plaster', 2, 'hip');
    house('Rijtjeshuis natuursteen', 'stone', 2, 'hip');
    house('Rijtjeshuis hout', 'wood', 2, 'hip');
    house('Rijtjeshuis 3 lagen', 'brick', 3, 'hip');
    house('Stadswoning plat dak', 'plaster', 3, 'flat');
    house('Bungalow', 'brick', 1, 'hip');
    house('Studio plat dak', 'wood', 1, 'flat');
    house('Herenhuis 4 lagen', 'stone', 4, 'flat');
    house('Appartementen 5 lagen', 'concrete', 5, 'flat');
    house('Appartementen glas 6 lagen', 'glass', 6, 'flat');
    house('Woontoren 7 lagen', 'glass', 7, 'flat');
    const villa = (name, mat, floors, roof, green) => {
      const b = libBuilder(name, 'Wonen'); b.cell(0, 0, 0, green ? 'grass' : 'paver');
      for (let f = 0; f < floors; f++) { b.hex(f, 0, 0, 6.75, f ? 'wood' : 'tile'); b.ring(f, 0, 0, 6.75, mat, { open: f ? {} : { 0: 'door' }, win: 2 }); }
      if (roof === 'hip') b.roof(floors - 1, 0, 0, 'hip'); else b.hex(floors, 0, 0, 6.75, 'concrete');
      if (green) { b.obj(0, 'tree', -7.2, 3.2); b.obj(0, 'bush', 7.2, -3.4); b.cellRing(0, 0, 0, 'hedge', { sides: [1, 2, 3, 4, 5] }); } else { b.obj(0, 'lamp', 7.4, 3.6); b.obj(0, 'planter', -7.4, -3.4); }
      add(b);
    };
    villa('Villa met tuin', 'plaster', 2, 'hip', true);
    villa('Villa baksteen met tuin', 'brick', 2, 'hip', true);
    villa('Bungalow met tuin', 'wood', 1, 'hip', true);
    villa('Stadsvilla plat', 'stone', 3, 'flat', false);
    villa('Tuinhuis', 'wood', 1, 'flat', true);
    { const b = libBuilder('Patiowoning', 'Wonen'); b.cell(0, 0, 0, 'tile').hex(0, 0, 0, 2.25, 'grass').cellRing(0, 0, 0, 'brick', { open: { 0: 'door' }, win: 2 }).ring(0, 0, 0, 2.25, 'glass', { open: { 3: 'door' } }); b.cell(1, 0, 0, 'concrete').hex(1, 0, 0, 2.25, null); b.obj(0, 'bush', 0, 0); add(b); }
    { const b = libBuilder('Woonerf 7 huizen', 'Wonen', 1); b.all(0, 'paver'); for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (mv2HexDist(q, r) === 1) { const c = mv2CellXZ(q, r); for (let f = 0; f < 2; f++) { b.hex(f, c[0], c[1], 6.75, f ? 'wood' : 'tile'); b.ring(f, c[0], c[1], 6.75, f % 2 ? 'plaster' : 'brick', { open: f ? {} : { [sideTo(c[0], c[1])]: 'door' }, win: 2 }); } b.hex(2, c[0], c[1], 6.75, 'concrete'); } b.circle(0, 'tree', 0, 0, 5, 3).obj(0, 'bench', 0, 0); add(b); }
    { const b = libBuilder('Hofje met 6 woningen', 'Wonen', 1); b.all(0, 'grass').cell(0, 0, 0, 'paver'); for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (mv2HexDist(q, r) === 1) { b.cell(0, q, r, 'tile'); b.cellRing(0, q, r, 'brick', { open: { [sideTo(...mv2CellXZ(q, r))]: 'door' }, win: 2 }); b.cell(1, q, r, 'wood'); b.cellRing(1, q, r, 'brick', { win: 2 }); b.roof(1, q, r, 'hip'); } b.obj(0, 'fountain', 0, 0).circle(0, 'bench', 0, 0, 4.5, 3); add(b); }
    // ---------- Werken ----------
    const office = (name, mat, floors) => { const b = libBuilder(name, 'Werken'); for (let f = 0; f < floors; f++) { b.cell(f, 0, 0, f ? 'carpet' : 'tile'); b.cellRing(f, 0, 0, mat, { open: f ? {} : { 0: 'door' }, win: WIN[mat] || 1 }); } b.cell(floors, 0, 0, 'concrete'); b.obj(0, 'lamp', 7.3, -3.6).obj(0, 'bike', 6.5, 4.2, Math.PI / 6); add(b); };
    office('Kantoor glas 3 lagen', 'glass', 3);
    office('Kantoor glas 5 lagen', 'glass', 5);
    office('Kantoor beton 4 lagen', 'concrete', 4);
    office('Kantoor baksteen 3 lagen', 'brick', 3);
    office('Kantoortoren 7 lagen', 'glass', 7);
    { const b = libBuilder('Werkplaats', 'Werken'); b.cell(0, 0, 0, 'concrete').cellRing(0, 0, 0, 'concrete', { open: { 0: 'gate', 3: 'door' }, win: 4 }).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Bedrijfshal', 'Werken', 1); b.all(0, 'concrete'); b.ring(0, 0, 0, 15.75, 'concrete', { open: { 0: 'gate', 3: 'gate' }, win: 5 }); b.hex(1, 0, 0, 15.75, 'concrete'); add(b); }
    { const b = libBuilder('Fabriek met schoorsteen', 'Werken', 1); b.all(0, 'asphalt'); b.ring(0, 0, 0, 15.75, 'brick', { open: { 0: 'gate' }, win: 3 }); b.hex(1, 0, 0, 15.75, 'concrete'); b.ring(1, 0, 0, 15.75, 'brick', { win: 2 }); b.hex(2, 0, 0, 15.75, 'concrete'); b.obj(2, 'pillar', 12, 0).obj(2, 'pillar', 12, 0); b.obj(0, 'bike', -18, 0); add(b); }
    { const b = libBuilder('Parkeergarage 2 lagen', 'Werken'); b.cell(0, 0, 0, 'asphalt').cell(1, 0, 0, 'asphalt').hex(1, 0, 0, 2.25, null); b.cellRing(0, 0, 0, 'concrete', { open: { 0: 'open', 3: 'open' }, sides: [1, 2, 4, 5] }).line(0, -3.9, -2.25, 1, 2, 'concrete').line(0, 3.9, -2.25, 1, 2, 'concrete'); b.stair(0, -1.95, -3.375, 1, 3, 2, 'ramp'); b.ring(1, 0, 0, 9, 'fence'); b.circle(0, 'pillar', 0, 0, 5.5, 6, Math.PI / 6); add(b); }
    { const b = libBuilder('Loods open', 'Werken'); b.cell(0, 0, 0, 'concrete').circle(0, 'pillar', 0, 0, 7.5, 6, Math.PI / 6).cell(1, 0, 0, 'concrete'); add(b); }
    // ---------- Winkels: glazen pui aan zijde 0 ----------
    const shop = (name, floors, mat, opts = {}) => { const b = libBuilder(name, 'Winkels'); b.cell(0, 0, 0, 'tile'); b.cellRing(0, 0, 0, mat, { sides: [1, 2, 3, 4, 5], win: 3 }).cellRing(0, 0, 0, 'glass', { sides: [0], open: { 0: 'door' } }); for (let f = 1; f < floors; f++) { b.cell(f, 0, 0, 'wood'); b.cellRing(f, 0, 0, mat, { win: 2 }); } if (opts.hip) b.roof(floors - 1, 0, 0, 'hip'); else b.cell(floors, 0, 0, 'concrete'); for (const o of opts.obj || []) b.obj(...o); add(b); };
    shop('Winkel met etalage', 2, 'brick', { hip: true });
    shop('Winkel met bovenwoning', 3, 'plaster', { hip: true });
    shop('Boetiek', 1, 'stone', { obj: [[0, 'planter', 7.6, 3.2], [0, 'planter', 7.6, -3.2]] });
    shop('Café met terras', 2, 'brick', { hip: true, obj: [[0, 'table', 9.5, 3.5], [0, 'table', 9.5, -3.5], [0, 'lamp', 10.5, 0]] });
    shop('Restaurant', 2, 'plaster', { obj: [[0, 'table', 9.5, 2.5], [0, 'table', 9.5, -2.5], [0, 'planter', 10.5, 5.2], [0, 'planter', 10.5, -5.2]] });
    shop('Bakkerij', 2, 'wood', { hip: true, obj: [[0, 'bench', 9.5, 3, Math.PI / 2]] });
    shop('Hotel 4 lagen', 4, 'stone', { obj: [[0, 'lamp', 9, 4], [0, 'lamp', 9, -4]] });
    { const b = libBuilder('Supermarkt', 'Winkels', 1); b.all(0, 'asphalt'); b.ring(0, 0, 0, 15.75, 'concrete', { sides: [1, 2, 3, 4, 5], win: 6 }).ring(0, 0, 0, 15.75, 'glass', { sides: [0], open: { 0: 'gate' } }); b.hex(1, 0, 0, 15.75, 'concrete'); b.obj(0, 'bike', 18, 6, Math.PI / 6).obj(0, 'bike', 18, -6, Math.PI / 6).obj(0, 'bin', 18.5, 0); add(b); }
    { const b = libBuilder('Markthal', 'Winkels', 1); b.all(0, 'paver'); b.circle(0, 'pillar', 0, 0, 12, 12); b.hex(1, 0, 0, 15.75, 'concrete'); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.obj(0, 'table', Math.cos(a) * 7, Math.sin(a) * 7, a); } add(b); }
    { const b = libBuilder('Kiosk', 'Winkels'); b.cell(0, 0, 0, 'paver').hex(0, 0, 0, 2.25, 'tile').ring(0, 0, 0, 2.25, 'wood', { open: { 0: 'window', 3: 'door' } }).hex(1, 0, 0, 2.25, 'concrete').obj(0, 'bench', -5.5, 0, Math.PI / 2).obj(0, 'bin', 4.5, 3); add(b); }
    { const b = libBuilder('Winkelpassage', 'Winkels'); b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'glass', { sides: [1, 2, 4, 5], win: 0 }).cellRing(0, 0, 0, 'glass', { sides: [0, 3], open: { 0: 'gate', 3: 'gate' } }).cell(1, 0, 0, 'wood').cellRing(1, 0, 0, 'plaster', { win: 2 }).cell(2, 0, 0, 'concrete'); add(b); }
    // ---------- Openbaar ----------
    { const b = libBuilder('Basisschool', 'Openbaar', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 15.75, 'tile'); b.ring(0, 0, 0, 15.75, 'brick', { open: { 0: 'door' }, win: 2 }); b.hex(1, 0, 0, 15.75, 'carpet'); b.ring(1, 0, 0, 15.75, 'brick', { win: 2 }); b.hex(2, 0, 0, 15.75, 'concrete'); b.obj(0, 'bike', 19, 4, Math.PI / 6).obj(0, 'tree', -19, 4).obj(0, 'bench', -18, -6); add(b); }
    { const b = libBuilder('Bibliotheek', 'Openbaar'); b.cell(0, 0, 0, 'wood').cellRing(0, 0, 0, 'glass', { open: { 0: 'door' } }).cell(1, 0, 0, 'wood').cellRing(1, 0, 0, 'stone', { win: 2 }).cell(2, 0, 0, 'concrete').obj(0, 'bench', 9.5, 3, Math.PI / 2); add(b); }
    { const b = libBuilder('Gemeentehuis', 'Openbaar', 1); b.all(0, 'paver'); for (let f = 0; f < 3; f++) { b.hex(f, 0, 0, 15.75, f ? 'carpet' : 'tile'); b.ring(f, 0, 0, 15.75, 'stone', { open: f ? {} : { 0: 'gate' }, win: 2 }); } b.hex(3, 0, 0, 15.75, 'concrete'); b.circle(0, 'lamp', 0, 0, 19, 6, Math.PI / 6); b.obj(0, 'fountain', 19.5, 0); add(b); }
    { const b = libBuilder('Kerk met toren', 'Openbaar'); b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'stone', { open: { 0: 'gate' }, win: 2 }).cell(1, 0, 0, null).cellRing(1, 0, 0, 'stone', { win: 2 }).roof(1, 0, 0, 'hip'); for (let f = 0; f < 6; f++) { b.hex(f, 7.8, 0, 2.25, f ? 'wood' : 'tile'); b.ring(f, 7.8, 0, 2.25, 'stone', { win: f > 1 ? 1 : 0 }); } b.hex(6, 7.8, 0, 2.25, 'concrete'); add(b); }
    { const b = libBuilder('Ziekenhuis', 'Openbaar', 1); b.all(0, 'asphalt'); for (let f = 0; f < 4; f++) { b.hex(f, 0, 0, 15.75, f ? 'carpet' : 'tile'); b.ring(f, 0, 0, 15.75, 'plaster', { open: f ? {} : { 0: 'gate', 3: 'door' }, win: 1 }); } b.hex(4, 0, 0, 15.75, 'concrete'); b.obj(0, 'lamp', 19, 3).obj(0, 'lamp', 19, -3); add(b); }
    { const b = libBuilder('Museum', 'Openbaar', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 15.75, 'tile'); b.ring(0, 0, 0, 15.75, 'concrete', { open: { 0: 'gate' }, win: 0 }); b.hex(1, 0, 0, 15.75, 'tile'); b.ring(1, 0, 0, 15.75, 'glass'); b.hex(2, 0, 0, 15.75, 'concrete'); b.circle(0, 'pillar', 0, 0, 18, 6); add(b); }
    { const b = libBuilder('Sporthal', 'Openbaar', 1); b.all(0, 'asphalt'); b.ring(0, 0, 0, 15.75, 'concrete', { open: { 0: 'gate' }, win: 0 }); b.ring(1, 0, 0, 15.75, 'concrete', { win: 1 }); b.hex(2, 0, 0, 15.75, 'concrete'); b.hex(0, 0, 0, 15.75, 'wood'); b.obj(0, 'bike', 19, 0, Math.PI / 2); add(b); }
    { const b = libBuilder('Brandweerkazerne', 'Openbaar'); b.cell(0, 0, 0, 'concrete').cellRing(0, 0, 0, 'brick', { open: { 0: [['gate', 0], ['gate', 3]] }, win: 3 }).cell(1, 0, 0, 'carpet').cellRing(1, 0, 0, 'brick', { win: 2 }).cell(2, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Politiebureau', 'Openbaar'); b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'concrete', { open: { 0: 'door' }, win: 2 }).cell(1, 0, 0, 'carpet').cellRing(1, 0, 0, 'glass').cell(2, 0, 0, 'concrete').obj(0, 'lamp', 9.5, 2.5).obj(0, 'lamp', 9.5, -2.5); add(b); }
    { const b = libBuilder('Busstation', 'Openbaar'); b.cell(0, 0, 0, 'asphalt').hex(0, 0, 0, 4.5, 'tile').circle(0, 'pillar', 0, 0, 3.9, 6).hex(1, 0, 0, 4.5, 'concrete').obj(0, 'bench', 0, 0).obj(0, 'bin', 2, 2.5).obj(0, 'lamp', -2, -2.5); add(b); }
    { const b = libBuilder('Station', 'Openbaar', 1); b.all(0, 'tile'); b.hex(0, 0, 0, 15.75, 'tile'); b.ring(0, 0, 0, 15.75, 'glass', { open: { 0: 'gate', 3: 'gate' } }); b.hex(1, 0, 0, 15.75, 'concrete'); b.circle(0, 'pillar', 0, 0, 13, 12); b.circle(0, 'bench', 0, 0, 8, 6); b.obj(0, 'bike', 18, 6, Math.PI / 6).obj(0, 'bike', 18, -6, Math.PI / 6); add(b); }
    // ---------- Groen ----------
    { const b = libBuilder('Park met bankjes', 'Groen'); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 2.25, 'paver').circle(0, 'tree', 0, 0, 6.5, 5).circle(0, 'bench', 0, 0, 3.2, 3).obj(0, 'bin', 2.5, 2.5); add(b); }
    { const b = libBuilder('Plantsoen', 'Groen'); b.cell(0, 0, 0, 'grass').circle(0, 'planter', 0, 0, 4, 4).obj(0, 'tree', 0, 0).circle(0, 'bush', 0, 0, 7, 6, Math.PI / 6); add(b); }
    { const b = libBuilder('Bos', 'Groen'); b.cell(0, 0, 0, 'grass'); for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 2.5 + (i % 3) * 2.2; b.obj(0, 'tree', Math.cos(a) * rr, Math.sin(a) * rr); } add(b); }
    { const b = libBuilder('Bos 7 vakken', 'Groen', 1); b.all(0, 'grass'); for (let i = 0; i < 40; i++) { const a = i * 2.39996, rr = 2 + Math.sqrt(i) * 3.6; if (rr < 24) b.obj(0, 'tree', Math.cos(a) * rr, Math.sin(a) * rr); } add(b); }
    { const b = libBuilder('Vijver', 'Groen'); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 4.5, 'water').circle(0, 'bush', 0, 0, 6, 4, 0.4).obj(0, 'bench', -7, 0, Math.PI / 2).obj(0, 'tree', 6.5, 3.5); add(b); }
    { const b = libBuilder('Stadspark', 'Groen', 1); b.all(0, 'grass'); b.hex(0, 0, 0, 6.75, 'water'); b.cell(0, 1, 0, 'paver').cell(0, -1, 0, 'paver'); b.circle(0, 'tree', 0, 0, 18, 12); b.circle(0, 'bench', 0, 0, 9.5, 6, Math.PI / 6); b.obj(0, 'fountain', 15.6, 0).obj(0, 'lamp', -15.6, 0); add(b); }
    { const b = libBuilder('Speeltuin', 'Groen'); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 4.5, 'paver').cellRing(0, 0, 0, 'fence', { open: { 0: 'open' } }).obj(0, 'bench', -6, 0, Math.PI / 2).obj(0, 'bench', 6, 0, Math.PI / 2).circle(0, 'planter', 0, 0, 3, 3).obj(0, 'tree', 0, 6.5); add(b); }
    { const b = libBuilder('Moestuin', 'Groen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'hedge', { open: { 0: 'open' } }); for (let i = -2; i <= 2; i++) b.obj(0, 'planter', i * 2.8, 2.2).obj(0, 'planter', i * 2.8, -2.2); b.obj(0, 'bin', 6, 5); add(b); }
    { const b = libBuilder('Boomgaard', 'Groen'); b.cell(0, 0, 0, 'grass'); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) b.obj(0, 'tree', i * 4.5 + j * 2.25, j * 3.9); b.cellRing(0, 0, 0, 'fence', { sides: [1, 2, 3, 4, 5] }); add(b); }
    { const b = libBuilder('Hondenpark', 'Groen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'fence', { open: { 0: 'door' } }).obj(0, 'bench', 0, 5, 0).obj(0, 'bin', -3, 5).obj(0, 'tree', 3, -4).obj(0, 'bush', -4, -3); add(b); }
    { const b = libBuilder('Rozentuin', 'Groen'); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 2.25, 'paver').circle(0, 'planter', 0, 0, 4.2, 6).circle(0, 'planter', 0, 0, 7, 6, Math.PI / 6).obj(0, 'fountain', 0, 0); add(b); }
    { const b = libBuilder('Grasveld', 'Groen'); b.cell(0, 0, 0, 'grass'); add(b); }
    { const b = libBuilder('Grasveld 7 vakken', 'Groen', 1); b.all(0, 'grass').obj(0, 'tree', 10, 10).obj(0, 'tree', -12, -4); add(b); }
    // ---------- Pleinen ----------
    { const b = libBuilder('Plein', 'Pleinen'); b.cell(0, 0, 0, 'paver').circle(0, 'lamp', 0, 0, 7, 3, Math.PI / 6).circle(0, 'bench', 0, 0, 4, 3).obj(0, 'bin', 5, 3); add(b); }
    { const b = libBuilder('Plein met fontein', 'Pleinen'); b.cell(0, 0, 0, 'paver').obj(0, 'fountain', 0, 0).circle(0, 'bench', 0, 0, 4.5, 6).circle(0, 'tree', 0, 0, 7.2, 3, Math.PI / 2); add(b); }
    { const b = libBuilder('Terras', 'Pleinen'); b.cell(0, 0, 0, 'tile'); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.obj(0, 'table', Math.cos(a) * 4.5, Math.sin(a) * 4.5, a); } b.obj(0, 'table', 0, 0).circle(0, 'planter', 0, 0, 7.5, 6, Math.PI / 6); add(b); }
    { const b = libBuilder('Markt', 'Pleinen', 1); b.all(0, 'paver'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = i % 2 ? 9 : 16; b.obj(0, 'table', Math.cos(a) * rr, Math.sin(a) * rr, a); } b.obj(0, 'fountain', 0, 0).circle(0, 'lamp', 0, 0, 21, 6, Math.PI / 6); add(b); }
    { const b = libBuilder('Parkeerplaats', 'Pleinen'); b.cell(0, 0, 0, 'asphalt').obj(0, 'lamp', 0, 0).obj(0, 'bin', 6, 3).line(0, -3.897, -6.75, 1, 6, 'hedge'); add(b); }
    { const b = libBuilder('Parkeerterrein', 'Pleinen', 1); b.all(0, 'asphalt').cell(0, 0, 0, 'grass').obj(0, 'tree', 0, 0).circle(0, 'lamp', 0, 0, 15.6, 6); add(b); }
    { const b = libBuilder('Fietsenstalling', 'Pleinen'); b.cell(0, 0, 0, 'tile'); for (let i = -2; i <= 2; i++) b.obj(0, 'bike', i * 2.6, 2.5).obj(0, 'bike', i * 2.6, -2.5); b.circle(0, 'pillar', 0, 0, 6, 6).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Kade', 'Pleinen'); b.cell(0, 0, 0, 'paver'); b.m.lv[0].f = Object.fromEntries(Object.entries(b.m.lv[0].f).filter(([id]) => { const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, R / 4); return (v[0][1] + v[1][1] + v[2][1]) / 3 > 0; })); b.hex(0, 0, -20, 23.5, 'water'); b.obj(0, 'bench', -4, 3, 0).obj(0, 'lamp', 4, 3).obj(0, 'bin', 0, 4.5); add(b); }
    { const b = libBuilder('Stadsplein', 'Pleinen', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 6.75, 'tile'); b.obj(0, 'fountain', 0, 0); b.circle(0, 'tree', 0, 0, 13, 6); b.circle(0, 'bench', 0, 0, 9, 6, Math.PI / 6); b.circle(0, 'lamp', 0, 0, 19, 6, Math.PI / 6); add(b); }
    { const b = libBuilder('Pleintje met kiosk', 'Pleinen'); b.cell(0, 0, 0, 'paver').hex(0, 4.5, 0, 2.25, 'tile').ring(0, 4.5, 0, 2.25, 'wood', { open: { 3: 'window', 0: 'door' } }).hex(1, 4.5, 0, 2.25, 'concrete').obj(0, 'bench', -4, 2, 0).obj(0, 'bench', -4, -2, 0).obj(0, 'lamp', -1, 5); add(b); }
    { const b = libBuilder('Zitkuil', 'Pleinen'); b.cell(0, 0, 0, 'paver').hex(0, 0, 0, 4.5, 'grass').circle(0, 'bench', 0, 0, 3, 6).obj(0, 'tree', 0, 0); add(b); }
    { const b = libBuilder('Leeg plein', 'Pleinen'); b.cell(0, 0, 0, 'paver'); add(b); }
    // ---------- Trappen en hoogte ----------
    { const b = libBuilder('Trap naar terras', 'Trappen'); b.cell(0, 0, 0, 'tile').cell(1, 0, 0, 'tile').hex(1, -4.5, 0, 2.25, null); b.stair(0, -7.794, 0, 0, 4, 2); b.ring(1, 0, 0, 9, 'fence'); add(b); }
    { const b = libBuilder('Helling naar terras', 'Trappen'); b.cell(0, 0, 0, 'tile').cell(1, 0, 0, 'tile').hex(1, -4.5, 0, 2.25, null); b.stair(0, -7.794, 0, 0, 4, 2, 'ramp'); b.ring(1, 0, 0, 9, 'fence'); add(b); }
    { const b = libBuilder('Trappenhuis 3 lagen', 'Trappen'); for (let f = 0; f < 3; f++) { b.cell(f, 0, 0, 'concrete'); if (f) b.hex(f, 0, 0, 2.25, null); b.cellRing(f, 0, 0, 'concrete', { open: f ? {} : { 0: 'door' }, win: 2 }); if (f < 2) b.stair(f, -3.897, 2.25, 5, 3, 1.5); } b.cell(3, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Tribune', 'Trappen'); b.cell(0, 0, 0, 'concrete'); for (const lat of [-3, 0, 3]) b.stair(0, -7.794, lat, 0, 5, 3); b.cell(1, 0, 0, null); add(b); }
    { const b = libBuilder('Terras op hoogte', 'Trappen'); b.cell(0, 0, 0, 'paver').cell(1, 0, 0, 'wood').ring(1, 0, 0, 9, 'fence').circle(0, 'pillar', 0, 0, 7, 6, Math.PI / 6).circle(1, 'table', 0, 0, 4, 3); b.hex(1, 5.6, 0, 2.25, null); b.stair(0, 3.897, 2.25, 5, 3, 1.5); add(b); }
    { const b = libBuilder('Uitkijktoren', 'Trappen'); for (let f = 0; f < 4; f++) { b.hex(f, 0, 0, 4.5, 'wood'); if (f) b.hex(f, 0, 0, 2.25, null); b.ring(f, 0, 0, 4.5, f < 3 ? 'wood' : 'fence', { open: f ? {} : { 0: 'door' }, win: f ? 1 : 0 }); if (f < 3) b.stair(f, -1.95, 1.125, 5, 2, 1.2); } b.cell(0, 0, 0, 'grass'); b.hex(0, 0, 0, 4.5, 'wood'); add(b); }
    { const b = libBuilder('Amfitheater', 'Trappen', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 6.75, 'tile'); for (let d = 0; d < 6; d++) { const a = (30 + 60 * d) * Math.PI / 180; b.stair(0, Math.cos(a) * 6.75, Math.sin(a) * 6.75, d, 4, 4); } b.hex(1, 0, 0, 20, 'concrete'); b.hex(1, 0, 0, 15.75, null); b.obj(0, 'fountain', 0, 0); add(b); }
    { const b = libBuilder('Brug (verhoogd pad)', 'Trappen'); b.cell(0, 0, 0, 'grass'); b.stair(0, -7.794, 0, 0, 3, 3, 'ramp'); b.stair(0, 7.794, 0, 3, 3, 3, 'ramp'); b.hex(1, 0, 0, 2.25, 'wood'); add(b); }
    // ---------- Bouwdelen ----------
    { const b = libBuilder('Blok', 'Bouwdelen'); b.cell(0, 0, 0, 'concrete').cellRing(0, 0, 0, 'concrete').cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Blok 2 hoog', 'Bouwdelen'); for (let f = 0; f < 2; f++) { b.cell(f, 0, 0, 'concrete').cellRing(f, 0, 0, 'concrete'); } b.cell(2, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Muur recht', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').line(0, 0, -9, 1, 8, 'brick'); add(b); }
    { const b = libBuilder('Muur halve zeshoek', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'brick', { sides: [1, 2, 3] }); add(b); }
    { const b = libBuilder('Zuilengalerij', 'Bouwdelen'); b.cell(0, 0, 0, 'tile').circle(0, 'pillar', 0, 0, 7.4, 6, Math.PI / 6).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Poort', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').cellRing(0, 0, 0, 'stone', { sides: [1, 2, 4, 5], win: 0 }).cell(1, 0, 0, 'concrete').cellRing(1, 0, 0, 'stone', { sides: [1, 2, 4, 5] }).cell(2, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Tunnel', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').cellRing(0, 0, 0, 'concrete', { sides: [1, 2, 4, 5], win: 0 }).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Hek rondom', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'fence', { open: { 0: 'door' } }); add(b); }
    { const b = libBuilder('Haag rondom', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'hedge', { open: { 0: 'open' } }); add(b); }
    { const b = libBuilder('Overkapping', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').circle(0, 'pillar', 0, 0, 5, 3, Math.PI / 2).hex(1, 0, 0, 6.75, 'concrete'); add(b); }
    { const b = libBuilder('Toren rond 6 lagen', 'Bouwdelen'); for (let f = 0; f < 6; f++) { b.hex(f, 0, 0, 4.5, f ? 'wood' : 'tile'); b.ring(f, 0, 0, 4.5, 'stone', { open: f ? {} : { 0: 'door' }, win: 2 }); } b.hex(6, 0, 0, 4.5, 'concrete'); b.ring(6, 0, 0, 4.5, 'stone'); b.cell(0, 0, 0, 'grass'); b.hex(0, 0, 0, 4.5, 'tile'); add(b); }
    { const b = libBuilder('Hof met muren', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').cellRing(0, 0, 0, 'brick', { open: { 0: 'gate', 3: 'gate' } }).obj(0, 'tree', 0, 0).circle(0, 'bench', 0, 0, 3.5, 3); add(b); }
    { const b = libBuilder('Tribune klein', 'Bouwdelen'); b.cell(0, 0, 0, 'concrete').stair(0, -3.897, -2.25, 0, 3, 3).stair(0, -3.897, 2.25, 0, 3, 3); add(b); }
    { const b = libBuilder('Pergola', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 4.5, 'paver').circle(0, 'pillar', 0, 0, 4, 6).hex(1, 0, 0, 4.5, 'concrete').obj(0, 'bench', 0, 0); add(b); }
    { const b = libBuilder('Waterbekken', 'Bouwdelen'); b.cell(0, 0, 0, 'tile').hex(0, 0, 0, 6.75, 'water').ring(0, 0, 0, 6.75, 'fence'); add(b); }
    { const b = libBuilder('Vlak beton', 'Bouwdelen'); b.cell(0, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Asfaltvlak', 'Bouwdelen'); b.cell(0, 0, 0, 'asphalt'); add(b); }
    { const b = libBuilder('Lantaarnrij', 'Bouwdelen'); b.cell(0, 0, 0, 'tile'); for (let i = -2; i <= 2; i++) b.obj(0, 'lamp', i * 3.5, 0); add(b); }
    { const b = libBuilder('Bomenrij', 'Bouwdelen'); b.cell(0, 0, 0, 'grass'); for (let i = -2; i <= 2; i++) b.obj(0, 'tree', i * 3.5, 0); add(b); }
    return out;
  }
  // Eenmalig aan de lijst toevoegen (en terug te zetten via de module maker)
  function libInstall(force) {
    const have = new Set(modules.map(m => m.name)); let n = 0;
    for (const m of libStandard()) { if (have.has(m.name) && !force) continue; if (have.has(m.name)) { const i = modules.findIndex(x => x.name === m.name); m.id = modules[i].id; modules[i] = m; } else modules.push(m); n++; }
    saveMods(); return n;
  }
  try { if (!localStorage.getItem('hexstad-lib2')) { libInstall(false); localStorage.setItem('hexstad-lib2', '1'); } } catch (e) { /* geen opslag */ }
