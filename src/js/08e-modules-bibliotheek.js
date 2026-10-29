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
      // alle driehoeken in het gebied waarvan het zwaartepunt aan pred(x, z) voldoet
      where(li, pred, mat) {
        const L = lv(li), iM = Math.ceil(ext / (ts * SQ3 / 2)) + 1, jM = Math.ceil(ext / ts) + iM;
        for (let i = -iM; i <= iM; i++) for (let j = -jM; j <= jM; j++) for (const t of [0, 1]) { const v = mv2TriVerts(i, j, t, ts), x = (v[0][0] + v[1][0] + v[2][0]) / 3, z = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!mv2InArea(m, x, z) || !pred(x, z)) continue; if (mat) L.f[i + ',' + j + ',' + t] = mat; else delete L.f[i + ',' + j + ',' + t]; }
        return B;
      },
      // muur langs een muurrichting dw (0–2 langs de ribben, 3–5 haaks: 0°, 60°, 120°), n stukken vanaf (x, z)
      wline(li, x, z, dw, n, mat, o = '') { const L = lv(li), D = MV2.DIRW[dw]; let a = vAt(x, z); for (let i = 0; i < n; i++) { L.w[a[0] + ',' + a[1] + ',' + dw] = { m: mat, o: typeof o === 'function' ? o(i) : o }; a = [a[0] + D[0], a[1] + D[1]]; } return B; },
      hexramp(li, q, r, side) { lv(li).s.push({ a: [0, 0], d: 0, n: 1, w: 9, k: 'hexramp', q, r, side }); return B; },
      all(li, mat) { for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) B.cell(li, q, r, mat); return B; },
      // muren langs de zeshoek (cx, cz, straal rad); sides: welke zijden (0..5); open: { zijde: 'door'|'window'|... of [opening, index] }; win: om de hoeveel ribben een raam
      ring(li, cx, cz, rad, mat, opts = {}) {
        const L = lv(li), sides = opts.sides || [0, 1, 2, 3, 4, 5], per = Math.round(rad / ts), open = opts.open || {}, win = opts.win || 0;
        for (const s of sides) {
          const a0 = (30 + 60 * s) * Math.PI / 180, a1 = (90 + 60 * s) * Math.PI / 180, p0 = [cx + rad * Math.cos(a0), cz + rad * Math.sin(a0)], p1 = [cx + rad * Math.cos(a1), cz + rad * Math.sin(a1)];
          let a = vAt(p0[0], p0[1]); const d6 = dirOf(p1[0] - p0[0], p1[1] - p0[1]);
          for (let i = 0; i < per; i++) {
            const [ki, kj, kd, nxt] = segKey(a, d6), key = ki + ',' + kj + ',' + kd; a = nxt;
            const [p, q] = [mv2P(ki, kj, ts), mv2P(ki + MV2.DIRW[kd][0], kj + MV2.DIRW[kd][1], ts)]; if (!mv2NearArea(m, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) continue;
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
      // gat in de vloer van verdieping li boven een trap (zodat je er niet met je hoofd tegenaan loopt)
      hole(li, S) {
        if (S.k === 'spiral') {   // wenteltrap: de vloer erboven weg, behalve het stuk waar je op de verdieping uitstapt
          const L = lv(li), D = MV2.DIR6[S.d], a = mv2P(S.a[0], S.a[1], ts), dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, a0 = Math.atan2(dz, dx), sd = S.side || 1;
          for (const id in L.f) { const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts), cx = (v[0][0] + v[1][0] + v[2][0]) / 3 - a[0], cz = (v[0][1] + v[1][1] + v[2][1]) / 3 - a[1];
            if (Math.hypot(cx, cz) > 2.15) continue; const ph = ((sd * (Math.atan2(cz, cx) - a0)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); if (ph > Math.PI * 5 / 3) continue; delete L.f[id]; }   // het driehoekje boven de laatste treden blijft; mv2Build knipt het op de uitstaptree af
          return B;
        }
        const L = lv(li), D = MV2.DIR6[S.d], a = mv2P(S.a[0], S.a[1], ts), dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, len = S.n * ts, hw = (S.w || 1.2) / 2 + 0.3;
        const off = S.off || 0, inside = (x, z, alMax) => { const cx = x - a[0], cz = z - a[1], al = cx * ux + cz * uz, lat = cx * nx + cz * nz - off; return al > 0.3 * len && al < alMax && Math.abs(lat) < hw; };
        for (const id in L.f) { const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts); if (v.some(p => inside(p[0], p[1], len - 0.3)) || inside((v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3, len + 0.2)) delete L.f[id]; }
        return B;
      },
      // trap van verdieping li naar li + 1, met het gat erboven
      stairUp(li, x, z, d6, n, w = 1.2, kind = 'stair') { const S = { a: vAt(x, z), d: d6, n, w, k: kind }; lv(li).s.push(S); lv(li + 1); return B; },   // het trapgat erboven maakt mv2Build zelf (mv2StairHole: precies afgeknipt)
      // trappenhuis door alle verdiepingen: elke verdieping keert de trap om, zodat de trappen boven elkaar liggen
      stairwell(floors, x, z, d6, n, w = 1.2, ctr = [0, 0]) {   // wenteltrap, één omwenteling per verdieping; de volgende begint waar de vorige eindigt
        const dxc = ctr[0] - x, dzc = ctr[1] - z, dist = Math.hypot(dxc, dzc) || 1, pull = dist > 2.5 ? 1.4 : 0, cx = x + dxc / dist * pull, cz = z + dzc / dist * pull;
        let best = 0, bd = -2; MV2.DIR6.forEach((D, i) => { const ex = D[0] * ts * SQ3 / 2, ez = D[0] * ts / 2 + D[1] * ts, l = Math.hypot(ex, ez) || 1, dd = (ex * dxc + ez * dzc) / (l * dist); if (dd > bd) { bd = dd; best = i; } });
        for (let f = 0; f < floors - 1; f++) B.stairUp(f, cx, cz, best, 1, 1.5, 'spiral');
        return B;
      },
      roof(li, q, r, kind = 'hip') { lv(li).r[q + ',' + r] = kind; return B; },
      roofAll(li, kind = 'hip') { for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) B.roof(li, q, r, kind); return B; },
      obj(li, t, x, z, rot = 0) {   // altijd binnen het gebied: wat erbuiten valt schuift naar het midden (anders staat het op de straat of bij de buren)
        const ok = (x2, z2) => { const d = Math.hypot(x2, z2) || 1; return mv2InArea(m, x2, z2) && mv2InArea(m, x2 + x2 / d * 0.9, z2 + z2 / d * 0.9); };
        for (let g = 0; g < 60 && !ok(x, z); g++) { x *= 0.97; z *= 0.97; }
        lv(li).o.push({ t, x: Math.round(x * 4) / 4, z: Math.round(z * 4) / 4, rot }); return B; },
      // voorwerpen in een kring
      circle(li, t, cx, cz, rad, cnt, a0 = 0) { for (let i = 0; i < cnt; i++) { const a = a0 + i * Math.PI * 2 / cnt; B.obj(li, t, cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, a + Math.PI / 2); } return B; },
      done() {
        mv2Fix(m);
        const flo = (li, x, z) => { const fi = x / (ts * SQ3 / 2), fj = z / ts - fi / 2, i = Math.floor(fi), j = Math.floor(fj), t = (fi - i) + (fj - j) < 1 ? 0 : 1; return !!(m.lv[li] && m.lv[li].f[i + ',' + j + ',' + t]); };
        for (let li = 1; li < m.lv.length; li++) for (const id in m.lv[li].w) { const W = m.lv[li].w[id]; if (!W || (W.m !== 'fence' && W.m !== 'hedge')) continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d], a = mv2P(i, j, ts), bb = mv2P(i + D[0], j + D[1], ts), mx = (a[0] + bb[0]) / 2, mz = (a[1] + bb[1]) / 2, nx = -(bb[1] - a[1]), nz = bb[0] - a[0], l = Math.hypot(nx, nz) || 1;
          if (!flo(li, mx + nx / l * 0.4, mz + nz / l * 0.4) && !flo(li, mx - nx / l * 0.4, mz - nz / l * 0.4)) delete m.lv[li].w[id]; }   // een hek boven een gat of vide zonder vloer ernaast
        m.codes = modV2Codes(m); return m; },
    };
    return B;
  }
  // Logische namen: soort · variant (· bijzonderheid), met automatisch het aantal lagen (2L) en de maat (7v) erachter.
  // Links de naam in de bouwcode (en van vóór de hernoeming), rechts de naam die je ziet.
  const LIB_NAMES = { "Rijtjeshuis baksteen": "Rijhuis · baksteen", "Rijtjeshuis wit": "Rijhuis · wit", "Rijtjeshuis natuursteen": "Rijhuis · natuursteen", "Rijtjeshuis hout": "Rijhuis · hout", "Rijtjeshuis 3 lagen": "Rijhuis · baksteen", "Stadswoning plat dak": "Stadswoning · wit", "Bungalow": "Bungalow · baksteen", "Studio plat dak": "Studio · hout", "Herenhuis 4 lagen": "Herenhuis · natuursteen", "Appartementen 5 lagen": "Appartementen · beton", "Appartementen glas 6 lagen": "Appartementen · glas", "Woontoren 7 lagen": "Woontoren · glas", "Villa met tuin": "Villa · wit · tuin", "Villa baksteen met tuin": "Villa · baksteen · tuin", "Bungalow met tuin": "Bungalow · hout · tuin", "Stadsvilla plat": "Villa · natuursteen · plein", "Tuinhuis": "Tuinhuis · hout", "Patiowoning": "Patiowoning · baksteen", "Woonerf 7 huizen": "Woonerf · 6 huizen", "Hofje met 6 woningen": "Hofje · 6 woningen", "Kantoor glas 3 lagen": "Kantoor · glas", "Kantoor glas 5 lagen": "Kantoor · glas", "Kantoor beton 4 lagen": "Kantoor · beton", "Kantoor baksteen 3 lagen": "Kantoor · baksteen", "Kantoortoren 7 lagen": "Kantoortoren · glas", "Werkplaats": "Werkplaats · beton", "Bedrijfshal": "Bedrijfshal · beton", "Fabriek met schoorsteen": "Fabriek · baksteen", "Parkeergarage 2 lagen": "Parkeergarage · beton", "Loods open": "Loods · open", "Winkel met etalage": "Winkel · etalage", "Winkel met bovenwoning": "Winkel · bovenwoning", "Boetiek": "Winkel · boetiek", "Café met terras": "Horeca · café met terras", "Restaurant": "Horeca · restaurant", "Bakkerij": "Winkel · bakkerij", "Hotel 4 lagen": "Horeca · hotel", "Supermarkt": "Winkel · supermarkt", "Markthal": "Markthal · overdekt", "Kiosk": "Kiosk · hout", "Winkelpassage": "Winkelpassage · glas", "Basisschool": "School · baksteen", "Bibliotheek": "Bibliotheek · glas", "Gemeentehuis": "Gemeentehuis · natuursteen", "Kerk met toren": "Kerk · toren", "Ziekenhuis": "Ziekenhuis · wit", "Museum": "Museum · beton", "Sporthal": "Sporthal · beton", "Brandweerkazerne": "Hulpdienst · brandweer", "Politiebureau": "Hulpdienst · politie", "Busstation": "Vervoer · busstation", "Station": "Vervoer · treinstation", "Park met bankjes": "Park · bankjes", "Plantsoen": "Park · plantsoen", "Bos": "Bos · bomen", "Bos 7 vakken": "Bos · bomen", "Vijver": "Park · vijver", "Stadspark": "Park · stadspark", "Speeltuin": "Park · speeltuin", "Moestuin": "Tuin · moestuin", "Boomgaard": "Tuin · boomgaard", "Hondenpark": "Park · hondenveld", "Rozentuin": "Tuin · rozentuin", "Grasveld": "Grasveld · leeg", "Grasveld 7 vakken": "Grasveld · bomen", "Plein": "Plein · lantaarns", "Plein met fontein": "Plein · fontein", "Terras": "Plein · terras", "Markt": "Plein · markt", "Parkeerplaats": "Parkeerplaats · haag", "Parkeerterrein": "Parkeerplaats · lantaarns", "Fietsenstalling": "Fietsenstalling · overdekt", "Kade": "Kade · klinkers", "Stadsplein": "Plein · stadsplein", "Pleintje met kiosk": "Plein · kiosk", "Zitkuil": "Plein · zitkuil", "Leeg plein": "Plein · leeg", "Trap naar terras": "Trap · naar terras", "Helling naar terras": "Helling · naar terras", "Trappenhuis 3 lagen": "Trappenhuis · beton", "Tribune": "Tribune · groot", "Terras op hoogte": "Terras op palen · trap", "Uitkijktoren": "Toren · uitkijk", "Amfitheater": "Amfitheater · rond", "Brug (verhoogd pad)": "Brug · voetgangers", "Blok": "Blok · beton", "Blok 2 hoog": "Blok · beton", "Muur recht": "Muur · recht", "Muur halve zeshoek": "Muur · halve zeshoek", "Zuilengalerij": "Zuilen · galerij", "Poort": "Poort · natuursteen", "Tunnel": "Poort · tunnel", "Hek rondom": "Afscheiding · hek", "Haag rondom": "Afscheiding · haag", "Overkapping": "Overkapping · zuilen", "Toren rond 6 lagen": "Toren · natuursteen", "Hof met muren": "Hof · muren", "Tribune klein": "Tribune · klein", "Pergola": "Overkapping · pergola", "Waterbekken": "Water · bekken", "Vlak beton": "Vlak · beton", "Asfaltvlak": "Vlak · asfalt", "Lantaarnrij": "Rij · lantaarns", "Bomenrij": "Rij · bomen" };
  function libStandard() {
    const out = [], add = b => {   // een bovenste laag met alleen betonvloer is een plat dak: dakbedekking
      libOldDetails(b); pruneNearStairs(b);   // inrichting en bijzonderheden (08d9), niets bij de trappen
      const m = b.m, T = m.lv[m.lv.length - 1];
      if (m.lv.length > 1 && !Object.keys(T.w).length && !T.s.length && T.o.every(o => o.t === 'solar') && Object.values(T.f).every(v => v === 'concrete')) for (const k in T.f) T.f[k] = 'roof';   // met zonnepanelen blijft het een dak
      const d = b.done(); d.was = d.name; d.name = (LIB_NAMES[d.name] || d.name) + modSuffix(modMeta(d)); out.push(d);
    };
    const sideTo = (cx, cz) => (Math.round(Math.atan2(-cz, -cx) / (Math.PI / 3)) + 5 + 12) % 6;   // zijde van een vak die naar het midden kijkt
    const WIN = { brick: 2, plaster: 2, stone: 2, wood: 2, concrete: 4, glass: 0 };
    // ---------- Wonen: rijtjeshuizen (volle zeshoek, deur aan zijde 0), villa's met tuin, appartementen ----------
    const house = (name, mat, floors, roof, opts = {}) => {
      const b = libBuilder(name, 'Wonen');
      for (let f = 0; f < floors; f++) { b.cell(f, 0, 0, f ? 'wood' : 'tile'); b.cellRing(f, 0, 0, mat, { open: f ? {} : { 0: 'door' }, win: WIN[mat] || 2 }); }
      if (roof === 'hip') b.roof(floors - 1, 0, 0, 'hip'); else b.cell(floors, 0, 0, 'concrete');
      if (floors > 1) b.stairwell(floors, 0, 6.75, 3, 3, 1.2);   // langs de achterwand, tegenover de deur
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
      if (floors > 1) b.stairwell(floors, 0, 4.5, 3, 2, 1.2);
      if (green) { b.obj(0, 'tree', -7.2, 3.2); b.obj(0, 'bush', 5.4, 4.75); b.cellRing(0, 0, 0, 'hedge', { sides: [1, 2, 3, 4, 5] }); } else { b.obj(0, 'lamp', 7.4, 3.6); b.obj(0, 'planter', -7.4, -3.4); }
      add(b);
    };
    villa('Villa met tuin', 'plaster', 2, 'hip', true);
    villa('Villa baksteen met tuin', 'brick', 2, 'hip', true);
    villa('Bungalow met tuin', 'wood', 1, 'hip', true);
    villa('Stadsvilla plat', 'stone', 3, 'flat', false);
    villa('Tuinhuis', 'wood', 1, 'flat', true);
    { const b = libBuilder('Patiowoning', 'Wonen'); b.cell(0, 0, 0, 'tile').hex(0, 0, 0, 2.25, 'grass').cellRing(0, 0, 0, 'brick', { open: { 0: 'door' }, win: 2 }).ring(0, 0, 0, 2.25, 'glass', { open: { 3: 'door' } }); b.cell(1, 0, 0, 'concrete').hex(1, 0, 0, 2.25, null); b.obj(0, 'bush', 0, 0); add(b); }
    { const b = libBuilder('Woonerf 7 huizen', 'Wonen', 1); b.all(0, 'paver'); for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (mv2HexDist(q, r) === 1) { const c = mv2CellXZ(q, r); for (let f = 0; f < 2; f++) { b.hex(f, c[0], c[1], 6.75, f ? 'wood' : 'tile'); b.ring(f, c[0], c[1], 6.75, f % 2 ? 'plaster' : 'brick', { open: f ? {} : { [sideTo(c[0], c[1])]: 'door' }, win: 2 }); } b.hex(2, c[0], c[1], 6.75, 'concrete'); b.stairwell(2, c[0], c[1] + 4.5, 3, 2, 1.2, c); } b.circle(0, 'tree', 0, 0, 5, 3).obj(0, 'bench', 0, 0); add(b); }
    { const b = libBuilder('Hofje met 6 woningen', 'Wonen', 1); b.all(0, 'grass').cell(0, 0, 0, 'paver'); for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (mv2HexDist(q, r) === 1) { b.cell(0, q, r, 'tile'); b.cellRing(0, q, r, 'brick', { open: { [sideTo(...mv2CellXZ(q, r))]: 'door', [(sideTo(...mv2CellXZ(q, r)) + 3) % 6]: 'door' }, win: 2 }); b.cell(1, q, r, 'wood'); b.cellRing(1, q, r, 'brick', { win: 2 }); b.roof(1, q, r, 'hip'); const cc = mv2CellXZ(q, r); b.stairwell(2, cc[0], cc[1] + 6.75, 3, 3, 1.2, cc); } b.obj(0, 'fountain', 0, 0).circle(0, 'bench', 0, 0, 4.5, 3); add(b); }
    // ---------- Werken ----------
    const office = (name, mat, floors) => { const b = libBuilder(name, 'Werken'); for (let f = 0; f < floors; f++) { b.cell(f, 0, 0, f ? 'carpet' : 'tile'); b.cellRing(f, 0, 0, mat, { open: f ? {} : { 0: 'door' }, win: WIN[mat] || 1 }); } b.cell(floors, 0, 0, 'concrete'); if (floors > 1) b.stairwell(floors, 0, 6.75, 3, 3, 1.5); add(b); };
    office('Kantoor glas 3 lagen', 'glass', 3);
    office('Kantoor glas 5 lagen', 'glass', 5);
    office('Kantoor beton 4 lagen', 'concrete', 4);
    office('Kantoor baksteen 3 lagen', 'brick', 3);
    office('Kantoortoren 7 lagen', 'glass', 7);
    { const b = libBuilder('Werkplaats', 'Werken'); b.cell(0, 0, 0, 'concrete').cellRing(0, 0, 0, 'concrete', { open: { 0: 'gate', 3: 'door' }, win: 4 }).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Bedrijfshal', 'Werken', 1); b.all(0, 'concrete'); b.ring(0, 0, 0, 15.75, 'concrete', { open: { 0: 'gate', 3: 'gate' }, win: 5 }); b.hex(1, 0, 0, 15.75, 'concrete'); add(b); }
    { const b = libBuilder('Fabriek met schoorsteen', 'Werken', 1); b.all(0, 'asphalt'); b.ring(0, 0, 0, 15.75, 'brick', { open: { 0: 'gate' }, win: 3 }); b.hex(1, 0, 0, 15.75, 'concrete'); b.ring(1, 0, 0, 15.75, 'brick', { win: 2 }); b.hex(2, 0, 0, 15.75, 'concrete'); b.stairwell(2, 0, 11.25, 3, 3, 1.5); b.obj(0, 'bike', -18, 0); add(b); }
    { const b = libBuilder('Parkeergarage 2 lagen', 'Werken'); b.cell(0, 0, 0, 'asphalt').cell(1, 0, 0, 'asphalt').hex(1, 0, 0, 2.25, null); b.cellRing(0, 0, 0, 'concrete', { open: { 0: 'open', 3: 'open' }, sides: [1, 2, 4, 5] }).line(0, -3.9, -2.25, 1, 2, 'concrete').line(0, 3.9, -2.25, 1, 2, 'concrete'); b.stair(0, -1.95, -3.375, 1, 3, 2, 'ramp'); b.ring(1, 0, 0, 9, 'fence'); b.circle(0, 'pillar', 0, 0, 5.5, 6, Math.PI / 6); add(b); }
    { const b = libBuilder('Loods open', 'Werken'); b.cell(0, 0, 0, 'concrete').circle(0, 'pillar', 0, 0, 7.5, 6, Math.PI / 6).cell(1, 0, 0, 'concrete'); add(b); }
    // ---------- Winkels: glazen pui aan zijde 0 ----------
    const shop = (name, floors, mat, opts = {}) => {
      const b = libBuilder(name, 'Winkels'), rad = opts.core ? 6.75 : 9, rg = (li, mt, o) => opts.core ? b.ring(li, 0, 0, rad, mt, o) : b.cellRing(li, 0, 0, mt, o), fl = (li, mt) => opts.core ? b.hex(li, 0, 0, rad, mt) : b.cell(li, 0, 0, mt);
      if (opts.core) b.cell(0, 0, 0, 'paver');   // terras / stoep rondom
      fl(0, 'tile'); rg(0, mat, { sides: [1, 2, 3, 4, 5], win: 3 }); rg(0, 'glass', { sides: [0], open: { 0: 'door' } });
      for (let f = 1; f < floors; f++) { fl(f, 'wood'); rg(f, mat, { win: 2 }); }
      if (opts.hip) b.roof(floors - 1, 0, 0, 'hip'); else fl(floors, 'concrete');
      if (floors > 1) b.stairwell(floors, 0, rad * 0.75, 3, 3, 1.2);
      for (const o of opts.obj || []) b.obj(...o); add(b); };
    shop('Winkel met etalage', 2, 'brick', { hip: true });
    shop('Winkel met bovenwoning', 3, 'plaster', { hip: true });
    shop('Boetiek', 1, 'stone', { obj: [[0, 'planter', 2.6, 5.4], [0, 'planter', 5.6, 1.2]] });
    shop('Café met terras', 2, 'brick', { core: true, obj: [[0, 'table', 1.4, 7.6], [0, 'table', 5.6, 5.2], [0, 'lamp', 7.2, 3.2], [0, 'planter', -1.6, 7.6]] });
    shop('Restaurant', 2, 'plaster', { core: true, obj: [[0, 'table', 1.4, 7.6], [0, 'table', 5.6, 5.2], [0, 'planter', 7.6, 1.6], [0, 'planter', -1.6, 7.6]] });
    shop('Bakkerij', 2, 'wood', { hip: true });
    shop('Hotel 4 lagen', 4, 'stone');
    { const b = libBuilder('Supermarkt', 'Winkels', 1); b.all(0, 'asphalt'); b.ring(0, 0, 0, 15.75, 'concrete', { sides: [1, 2, 3, 4, 5], win: 6 }).ring(0, 0, 0, 15.75, 'glass', { sides: [0], open: { 0: 'gate' } }); b.hex(1, 0, 0, 15.75, 'concrete'); b.obj(0, 'bike', 18, 6, Math.PI / 6).obj(0, 'bike', 18, -6, Math.PI / 6).obj(0, 'bin', 18.5, 0); add(b); }
    { const b = libBuilder('Markthal', 'Winkels', 1); b.all(0, 'paver'); b.circle(0, 'pillar', 0, 0, 12, 12); b.hex(1, 0, 0, 15.75, 'concrete'); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.obj(0, 'table', Math.cos(a) * 7, Math.sin(a) * 7, a); } add(b); }
    { const b = libBuilder('Kiosk', 'Winkels'); b.cell(0, 0, 0, 'paver').hex(0, 0, 0, 2.25, 'tile').ring(0, 0, 0, 2.25, 'wood', { open: { 0: 'window', 3: 'door' } }).hex(1, 0, 0, 2.25, 'concrete').obj(0, 'bench', -5.5, 0, Math.PI / 2).obj(0, 'bin', 4.5, 3); add(b); }
    { const b = libBuilder('Winkelpassage', 'Winkels'); b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'glass', { sides: [1, 2, 4, 5], win: 0 }).cellRing(0, 0, 0, 'glass', { sides: [0, 3], open: { 0: 'gate', 3: 'gate' } }).cell(1, 0, 0, 'wood').cellRing(1, 0, 0, 'plaster', { win: 2 }).cell(2, 0, 0, 'concrete').stairwell(2, 0, 6.75, 3, 3, 1.2); add(b); }
    // ---------- Openbaar ----------
    { const b = libBuilder('Basisschool', 'Openbaar', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 15.75, 'tile'); b.ring(0, 0, 0, 15.75, 'brick', { open: { 0: 'door' }, win: 2 }); b.hex(1, 0, 0, 15.75, 'carpet'); b.ring(1, 0, 0, 15.75, 'brick', { win: 2 }); b.hex(2, 0, 0, 15.75, 'concrete'); b.stairwell(2, 0, 11.25, 3, 3, 2); b.obj(0, 'bike', 19, 4, Math.PI / 6).obj(0, 'tree', -19, 4).obj(0, 'bench', -18, -6); add(b); }
    { const b = libBuilder('Bibliotheek', 'Openbaar'); b.cell(0, 0, 0, 'wood').cellRing(0, 0, 0, 'glass', { open: { 0: 'door' } }).cell(1, 0, 0, 'wood').cellRing(1, 0, 0, 'stone', { win: 2 }).cell(2, 0, 0, 'concrete').stairwell(2, 0, 6.75, 3, 3, 1.2).obj(0, 'bench', 3.4, -4.6, Math.PI / 3).obj(0, 'shelf', -4.4, -2.2, Math.PI / 2).obj(0, 'shelf', -4.4, 2.2, Math.PI / 2); add(b); }
    { const b = libBuilder('Gemeentehuis', 'Openbaar', 1); b.all(0, 'paver'); for (let f = 0; f < 3; f++) { b.hex(f, 0, 0, 15.75, f ? 'carpet' : 'tile'); b.ring(f, 0, 0, 15.75, 'stone', { open: f ? {} : { 0: 'gate' }, win: 2 }); } b.hex(3, 0, 0, 15.75, 'concrete'); b.stairwell(3, 0, 11.25, 3, 3, 2); for (let i = 1; i < 6; i++) b.obj(0, 'lamp', Math.cos(i * Math.PI / 3) * 19, Math.sin(i * Math.PI / 3) * 19); b.obj(0, 'fountain', 19.5, 0).obj(0, 'lamp', 18.5, 3.6).obj(0, 'lamp', 18.5, -3.6); add(b); }
    { const b = libBuilder('Kerk met toren', 'Openbaar'); b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'stone', { open: { 0: 'gate' }, win: 2 }).cell(1, 0, 0, null).cellRing(1, 0, 0, 'stone', { win: 2 }).roof(1, 0, 0, 'hip'); const TX = -3.897; for (let f = 0; f < 6; f++) { b.hex(f, TX, 0, 2.25, f ? 'wood' : 'tile'); b.ring(f, TX, 0, 2.25, 'stone', { win: f > 1 ? 1 : 0, open: f ? {} : { 5: 'door' } }); } b.hex(6, TX, 0, 2.25, 'concrete'); b.ring(6, TX, 0, 2.25, 'fence');   // toren binnen het vak, achterin het schip
      for (let f = 0; f < 6; f++) b.stairUp(f, TX, 0, 0, 1, 1.5, 'spiral'); add(b); }
    { const b = libBuilder('Ziekenhuis', 'Openbaar', 1); b.all(0, 'asphalt'); for (let f = 0; f < 4; f++) { b.hex(f, 0, 0, 15.75, f ? 'carpet' : 'tile'); b.ring(f, 0, 0, 15.75, 'plaster', { open: f ? {} : { 0: 'gate', 3: 'door' }, win: 1 }); } b.hex(4, 0, 0, 15.75, 'concrete'); b.stairwell(4, 0, 11.25, 3, 3, 2); b.obj(0, 'lamp', 19, 3).obj(0, 'lamp', 19, -3); add(b); }
    { const b = libBuilder('Museum', 'Openbaar', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 15.75, 'tile'); b.ring(0, 0, 0, 15.75, 'concrete', { open: { 0: 'gate' }, win: 0 }); b.hex(1, 0, 0, 15.75, 'tile'); b.ring(1, 0, 0, 15.75, 'glass'); b.hex(2, 0, 0, 15.75, 'concrete'); b.stairwell(2, 0, 11.25, 3, 3, 2); b.circle(0, 'pillar', 0, 0, 18, 6); add(b); }
    { const b = libBuilder('Sporthal', 'Openbaar', 1); b.all(0, 'asphalt'); b.ring(0, 0, 0, 15.75, 'concrete', { open: { 0: 'gate' }, win: 0 }); b.ring(1, 0, 0, 15.75, 'concrete', { win: 1 }); b.hex(2, 0, 0, 15.75, 'concrete'); b.hex(0, 0, 0, 15.75, 'wood'); b.obj(0, 'bike', 19, 0, Math.PI / 2); add(b); }
    { const b = libBuilder('Brandweerkazerne', 'Openbaar'); b.cell(0, 0, 0, 'concrete').cellRing(0, 0, 0, 'brick', { open: { 0: [['gate', 0], ['gate', 3]] }, win: 3 }).cell(1, 0, 0, 'carpet').cellRing(1, 0, 0, 'brick', { win: 2 }).cell(2, 0, 0, 'concrete').stairwell(2, 0, -6.75, 0, 3, 1.2); add(b); }
    { const b = libBuilder('Politiebureau', 'Openbaar'); b.cell(0, 0, 0, 'tile').cellRing(0, 0, 0, 'concrete', { open: { 0: 'door' }, win: 2 }).cell(1, 0, 0, 'carpet').cellRing(1, 0, 0, 'glass').cell(2, 0, 0, 'concrete').stairwell(2, 0, 6.75, 3, 3, 1.2); add(b); }
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
    { const b = libBuilder('Markt', 'Pleinen', 1); b.all(0, 'paver'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, rr = i % 2 ? 9 : 16; b.obj(0, 'table', Math.cos(a) * rr, Math.sin(a) * rr, a); } b.obj(0, 'fountain', 0, 0).circle(0, 'lamp', 0, 0, 20.5, 6, 0); add(b); }
    { const b = libBuilder('Parkeerplaats', 'Pleinen'); b.cell(0, 0, 0, 'asphalt').obj(0, 'lamp', 0, 0).obj(0, 'bin', 6, 3).line(0, -3.897, -6.75, 1, 6, 'hedge'); add(b); }
    { const b = libBuilder('Parkeerterrein', 'Pleinen', 1); b.all(0, 'asphalt').cell(0, 0, 0, 'grass').obj(0, 'tree', 0, 0).circle(0, 'lamp', 0, 0, 15.6, 6); add(b); }
    { const b = libBuilder('Fietsenstalling', 'Pleinen'); b.cell(0, 0, 0, 'tile'); for (let i = -2; i <= 2; i++) b.obj(0, 'bike', i * 2.6, 2.5).obj(0, 'bike', i * 2.6, -2.5); b.circle(0, 'pillar', 0, 0, 6, 6).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Kade', 'Pleinen'); b.cell(0, 0, 0, 'paver'); b.m.lv[0].f = Object.fromEntries(Object.entries(b.m.lv[0].f).filter(([id]) => { const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, R / 4); return (v[0][1] + v[1][1] + v[2][1]) / 3 > 0; })); b.hex(0, 0, -20, 23.5, 'water'); b.obj(0, 'bench', -4, 3, 0).obj(0, 'lamp', 4, 3).obj(0, 'bin', 0, 4.5); add(b); }
    { const b = libBuilder('Stadsplein', 'Pleinen', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 6.75, 'tile'); b.obj(0, 'fountain', 0, 0); b.circle(0, 'tree', 0, 0, 13, 6); b.circle(0, 'bench', 0, 0, 9, 6, Math.PI / 6); b.circle(0, 'lamp', 0, 0, 19, 6, 0); add(b); }
    { const b = libBuilder('Pleintje met kiosk', 'Pleinen'); b.cell(0, 0, 0, 'paver').hex(0, 4.5, 0, 2.25, 'tile').ring(0, 4.5, 0, 2.25, 'wood', { open: { 3: 'window', 0: 'door' } }).hex(1, 4.5, 0, 2.25, 'concrete').obj(0, 'bench', -4, 2, 0).obj(0, 'bench', -4, -2, 0).obj(0, 'lamp', -1, 5); add(b); }
    { const b = libBuilder('Zitkuil', 'Pleinen'); b.cell(0, 0, 0, 'paver').hex(0, 0, 0, 4.5, 'grass').circle(0, 'bench', 0, 0, 3, 6).obj(0, 'tree', 0, 0); add(b); }
    { const b = libBuilder('Leeg plein', 'Pleinen'); b.cell(0, 0, 0, 'paver'); add(b); }
    // ---------- Trappen en hoogte ----------
    { const b = libBuilder('Trap naar terras', 'Verbindingen'); b.cell(0, 0, 0, 'tile').cell(1, 0, 0, 'tile'); b.stairUp(0, -7.794, 0, 0, 4, 2); b.ring(1, 0, 0, 9, 'fence'); add(b); }
    { const b = libBuilder('Helling naar terras', 'Verbindingen'); b.cell(0, 0, 0, 'tile').cell(1, 0, 0, 'tile'); b.stairUp(0, -7.794, 0, 0, 4, 2, 'ramp'); b.ring(1, 0, 0, 9, 'fence'); add(b); }
    { const b = libBuilder('Trappenhuis 3 lagen', 'Verbindingen'); for (let f = 0; f < 3; f++) { b.cell(f, 0, 0, 'concrete'); if (f) b.hex(f, 0, 0, 2.25, null); b.cellRing(f, 0, 0, 'concrete', { open: f ? {} : { 0: 'door' }, win: 2 }); if (f < 2) b.stair(f, -3.897, 2.25, 5, 3, 1.5); } b.cell(3, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Tribune', 'Verbindingen'); b.cell(0, 0, 0, 'concrete'); for (const lat of [-3, 0, 3]) b.stair(0, -7.794, lat, 0, 5, 3, 'trib'); b.cell(1, 0, 0, null); add(b); }
    { const b = libBuilder('Terras op hoogte', 'Verbindingen'); b.cell(0, 0, 0, 'paver').cell(1, 0, 0, 'wood').ring(1, 0, 0, 9, 'fence').circle(0, 'pillar', 0, 0, 7, 6, Math.PI / 6).circle(1, 'table', 0, 0, 4, 3, Math.PI / 2); b.stairUp(0, -0.25, 3.375, 5, 3, 1.5); add(b); }   // de trap komt onder het terras vandaan en eindigt in het gat
    { const b = libBuilder('Uitkijktoren', 'Verbindingen'); for (let f = 0; f < 4; f++) { b.hex(f, 0, 0, 4.5, 'wood'); if (f) b.hex(f, 0, 0, 2.25, null); b.ring(f, 0, 0, 4.5, f < 3 ? 'wood' : 'fence', { open: f ? {} : { 0: 'door' }, win: f ? 1 : 0 }); if (f < 3) b.stair(f, -1.95, 1.125, 5, 2, 1.2); } b.cell(0, 0, 0, 'grass'); b.hex(0, 0, 0, 4.5, 'wood'); add(b); }
    { const b = libBuilder('Amfitheater', 'Verbindingen', 1); b.all(0, 'paver'); b.hex(0, 0, 0, 6.75, 'tile'); for (let d = 0; d < 6; d++) { const a = (30 + 60 * d) * Math.PI / 180; b.stair(0, Math.cos(a) * 6.75, Math.sin(a) * 6.75, d, 4, 4, 'trib'); } b.hex(1, 0, 0, 20, 'concrete'); b.hex(1, 0, 0, 15.75, null); b.obj(0, 'fountain', 0, 0); add(b); }
    { const b = libBuilder('Brug (verhoogd pad)', 'Verbindingen'); b.cell(0, 0, 0, 'grass').cell(1, 0, 0, 'wood').ring(1, 0, 0, 9, 'fence'); for (const [x, z, d] of [[7.794, -4.5, 1], [-7.794, 4.5, 4]]) { const S = { a: [0, 0], d, n: 3, w: 1.95, k: 'ramp', off: 0.975 }; S.a = (() => { const ts = 2.25, fi = x / (ts * SQ3 / 2), fj = z / ts - fi / 2; return [Math.round(fi), Math.round(fj)]; })(); b.m.lv[0].s.push(S); } add(b); }   // verhoogd dek met twee hellingen langs de rand (evenwijdig aan de zijden van het vak)
    // ---------- Bouwdelen ----------
    { const b = libBuilder('Blok', 'Bouwdelen'); b.cell(0, 0, 0, 'concrete').cellRing(0, 0, 0, 'concrete').cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Blok 2 hoog', 'Bouwdelen'); for (let f = 0; f < 2; f++) { b.cell(f, 0, 0, 'concrete').cellRing(f, 0, 0, 'concrete'); } b.cell(2, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Muur recht', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').line(0, 0, -9, 1, 8, 'brick'); add(b); }
    { const b = libBuilder('Muur halve zeshoek', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'brick', { sides: [1, 2, 3] }); add(b); }
    { const b = libBuilder('Zuilengalerij', 'Bouwdelen'); b.cell(0, 0, 0, 'tile').circle(0, 'pillar', 0, 0, 7.4, 6, Math.PI / 6).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Poort', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').cellRing(0, 0, 0, 'stone', { sides: [1, 2, 4, 5], win: 0 }).cell(1, 0, 0, 'wood').cellRing(1, 0, 0, 'stone', { win: 2 }).cell(2, 0, 0, 'concrete').stairUp(0, 0, 4.5, 0, 1, 1.5, 'spiral'); add(b); }
    { const b = libBuilder('Tunnel', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').cellRing(0, 0, 0, 'concrete', { sides: [1, 2, 4, 5], win: 0 }).cell(1, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Hek rondom', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'fence', { open: { 0: 'door' } }); add(b); }
    { const b = libBuilder('Haag rondom', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').cellRing(0, 0, 0, 'hedge', { open: { 0: 'open' } }); add(b); }
    { const b = libBuilder('Overkapping', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').circle(0, 'pillar', 0, 0, 5, 3, Math.PI / 2).hex(1, 0, 0, 6.75, 'concrete'); add(b); }
    { const b = libBuilder('Toren rond 6 lagen', 'Bouwdelen'); for (let f = 0; f < 6; f++) { b.hex(f, 0, 0, 4.5, f ? 'wood' : 'tile'); b.ring(f, 0, 0, 4.5, 'stone', { open: f ? {} : { 0: 'door' }, win: 2 }); } b.hex(6, 0, 0, 4.5, 'concrete'); b.ring(6, 0, 0, 4.5, 'stone'); b.cell(0, 0, 0, 'grass'); b.hex(0, 0, 0, 4.5, 'tile'); b.stairwell(7, 0, 2.0, 3, 1, 1.0); add(b); }
    { const b = libBuilder('Hof met muren', 'Bouwdelen'); b.cell(0, 0, 0, 'paver').cellRing(0, 0, 0, 'brick', { open: { 0: 'gate', 3: 'gate' } }).obj(0, 'tree', 0, 0).circle(0, 'bench', 0, 0, 3.5, 3); add(b); }
    { const b = libBuilder('Tribune klein', 'Bouwdelen'); b.cell(0, 0, 0, 'concrete').stair(0, -3.897, -2.25, 0, 3, 3, 'trib').stair(0, -3.897, 2.25, 0, 3, 3, 'trib'); add(b); }
    { const b = libBuilder('Pergola', 'Bouwdelen'); b.cell(0, 0, 0, 'grass').hex(0, 0, 0, 4.5, 'paver').circle(0, 'pillar', 0, 0, 4, 6).hex(1, 0, 0, 4.5, 'concrete').obj(0, 'bench', 0, 0); add(b); }
    { const b = libBuilder('Waterbekken', 'Bouwdelen'); b.cell(0, 0, 0, 'tile').hex(0, 0, 0, 6.75, 'water').ring(0, 0, 0, 6.75, 'fence'); add(b); }
    { const b = libBuilder('Vlak beton', 'Bouwdelen'); b.cell(0, 0, 0, 'concrete'); add(b); }
    { const b = libBuilder('Asfaltvlak', 'Bouwdelen'); b.cell(0, 0, 0, 'asphalt'); add(b); }
    { const b = libBuilder('Lantaarnrij', 'Bouwdelen'); b.cell(0, 0, 0, 'tile'); for (let i = -2; i <= 2; i++) b.obj(0, 'lamp', i * 3.5, 0); add(b); }
    { const b = libBuilder('Bomenrij', 'Bouwdelen'); b.cell(0, 0, 0, 'grass'); for (let i = -2; i <= 2; i++) b.obj(0, 'tree', i * 3.5, 0); add(b); }
    // ---------- Winkelcentrum: de tien hex-modules uit de SketchUp-schets, elk met een functie. Ze staan op elkaar
    // (gelaagde stad): een plat dak met glazen lichtkap verdwijnt zodra er een module op staat. Zijde 0 (+x) is
    // de voorkant / passagekant; 'kern' is de zeshoek van ¾ (straal 6,75 m), de rand eromheen is 1,95 m breed. ----------
    // Let op: ring()/cellRing() tellen de zijden vanaf de hoek op 30° (zijde s heeft zijn normaal op 60° + 60°·s), de
    // meetkunde (FRAMES, nrm) telt vanaf +x (zijde k heeft zijn normaal op −60°·k). Ringzijde = (5 − k) mod 6.
    const WC = 'Winkelcentrum', CORE = 6.75, nrm = k => [Math.cos(-k * Math.PI / 3), Math.sin(-k * Math.PI / 3)], rs = k => (5 - k + 6) % 6, FRONT = rs(0), NOT_FRONT = [1, 2, 3, 4, 5].map(rs);
    const inCore = (x, z, rad = CORE) => { for (let k = 0; k < 6; k++) { const n = nrm(k); if (x * n[0] + z * n[1] > rad * SQ3 / 2 + 1e-6) return false; } return true; };
    // plat dak; met groen: een grasdak in de kern met een boom en struiken (onder een overdekte straat worden het struiken)
    const wcRoof = (b, li, green = true) => { b.cell(li, 0, 0, 'roof'); if (green) { b.hex(li, 0, 0, CORE, 'grass'); b.obj(li, 'tree', 0, 0).circle(li, 'bush', 0, 0, 3.8, 3, 0.5); } };
    const wcFront = (b, li, side, mat = 'curtain') => b.cellRing(li, 0, 0, mat, { sides: [side], open: { [side]: [['open', 1], ['open', 2]] } });   // brede open pui
    const wcSides = (b, li, sides, mat = 'panel') => b.cellRing(li, 0, 0, mat, { sides, open: { [rs(3)]: [['door', 1], ['door', 2]] } });   // achterdeuren tegenover de voorkant (twee, zodat ze bij rug-aan-rug winkels op elkaar vallen)
    { const b = libBuilder('Winkelcentrum · winkel', WC); b.cell(0, 0, 0, 'polished'); wcSides(b, 0, NOT_FRONT); wcFront(b, 0, FRONT); b.obj(0, 'shelf', -3, -3.2, Math.PI / 2).obj(0, 'shelf', -3, 3.2, Math.PI / 2).obj(0, 'shelf', -5.6, 0, 0).obj(0, 'counter', 3.2, -4.2, Math.PI / 2).obj(0, 'sign', 7.1, 0).obj(0, 'planter', 3, 4.5); wcRoof(b, 1); add(b); }
    { const b = libBuilder('Winkelcentrum · winkel · boeken', WC); b.cell(0, 0, 0, 'parquet'); wcSides(b, 0, NOT_FRONT); wcFront(b, 0, FRONT); for (const z of [-4.5, -1.5, 1.5, 4.5]) b.obj(0, 'shelf', -3.6, z, 0); b.obj(0, 'counter', 3.6, -3.6, Math.PI / 2).obj(0, 'table', 3.6, 3.4).obj(0, 'sign', 7.1, 0); wcRoof(b, 1); add(b); }
    { const b = libBuilder('Winkelcentrum · horeca', WC); b.cell(0, 0, 0, 'stonetile'); wcSides(b, 0, NOT_FRONT); wcFront(b, 0, FRONT); b.obj(0, 'counter', -5.4, 0, 0).circle(0, 'table', 1.5, 0, 3.6, 5, 0.3).obj(0, 'sign', 7.1, 0).obj(0, 'planter', 6.6, 4.2).obj(0, 'planter', 6.6, -4.2); wcRoof(b, 1); add(b); }
    { const b = libBuilder('Winkelcentrum · magazijn', WC); b.cell(0, 0, 0, 'concrete'); b.cellRing(0, 0, 0, 'concrete', { open: { [rs(3)]: 'gate' } }); for (const z of [-4.5, -1.5, 1.5, 4.5]) b.obj(0, 'shelf', 2.5, z, 0).obj(0, 'shelf', -2.5, z, 0); b.obj(0, 'bin', 6.2, 0); wcRoof(b, 1, false); add(b); }
    { // halfblok: de helft van het vak langs de lange diagonaal; de diagonaal is een glazen pui naar de passage
      const b = libBuilder('Winkelcentrum · café · half', WC), u = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)], side = (x, z) => u[0] * z - u[1] * x > 0.01;   // de helft aan de +z-kant van de diagonaal (hoek 210° → 30°)
      b.where(0, side, 'stonetile'); b.cellRing(0, 0, 0, 'panel', { sides: [3, 4, 5].map(rs), open: { [rs(4)]: [['door', 1], ['door', 2]] } }); b.line(0, -INNER, -4.5, 0, 8, 'curtain', i => (i === 3 || i === 4 ? 'open' : ''));
      b.obj(0, 'counter', -4.1, 4.5, Math.PI / 6 + Math.PI / 2).obj(0, 'table', 0.8, 5.2).obj(0, 'table', -3.2, 2.6).obj(0, 'table', 3.6, 3.4).obj(0, 'planter', -6.2, 2.5).obj(0, 'sign', 1, 2);
      b.where(1, side, 'roof'); add(b); }
    { // afgesneden: zijde 1 is tot halverwege teruggezet; de schuine pui is de ingang (bijvoorbeeld aan een passage of plein)
      const b = libBuilder('Winkelcentrum · winkel · afgesneden', WC), n1 = nrm(1), keep = (x, z) => x * n1[0] + z * n1[1] <= INNER / 2 + 0.01;
      b.where(0, keep, 'polished'); b.cellRing(0, 0, 0, 'panel', { sides: [3, 4, 5].map(rs) }); b.line(0, INNER, 0, 1, 2, 'panel'); b.line(0, -INNER, -4.5, 5, 2, 'panel');
      b.line(0, -INNER / 2, -6.75, 0, 6, 'curtain', i => (i === 2 || i === 3 ? 'open' : ''));
      b.obj(0, 'shelf', -4, 2.2, Math.PI / 2).obj(0, 'shelf', -3.4, 4.9, Math.PI / 2).obj(0, 'shelf', -1, 5.8, 0).obj(0, 'counter', 4.2, 3.4, Math.PI / 2).obj(0, 'sign', 2.2, -3.2).obj(0, 'planter', -6.2, -1.5);
      b.where(1, keep, 'roof'); b.hex(1, 0, 0, CORE * 0.7, 'grass'); b.obj(1, 'tree', -1, 0).obj(1, 'bush', 2.2, 1.5); add(b); }
    { // doorgang: een 9 m brede passage dwars door het blok (zijde 3 → 0), met een kiosk in elke punt (open naar de buren)
      const b = libBuilder('Winkelcentrum · doorgang', WC); b.where(0, (x, z) => Math.abs(z) < 4.5, 'paver'); b.where(0, (x, z) => Math.abs(z) >= 4.5, 'tile');
      b.wline(0, -INNER, -4.5, 3, 4, 'concrete', i => (i === 2 ? 'door' : '')); b.wline(0, -INNER, 4.5, 3, 4, 'concrete', i => (i === 1 ? 'door' : ''));   // de punten blijven open naar de buren
      b.obj(0, 'bench', -3, 3.8, 0).obj(0, 'bench', 3, -3.8, 0).obj(0, 'bin', 5.5, 3.7).obj(0, 'planter', -5.5, -3.3).obj(0, 'shelf', 0, 6.8, 0).obj(0, 'shelf', 0, -6.8, 0); wcRoof(b, 1, false); add(b); }
    { const b = libBuilder('Winkelcentrum · oprit', WC); b.hexramp(0, 0, 0, 3); add(b); }   // schans: onderaan in bij zijde 3, boven uit bij zijde 0 (de verdieping erboven)
    { // dakpaviljoen: teruggezette opbouw van ¾ met een terras van 1,95 m rondom
      const b = libBuilder('Winkelcentrum · dakpaviljoen', WC); b.cell(0, 0, 0, 'tile'); b.hex(0, 0, 0, CORE, 'wood'); b.ring(0, 0, 0, CORE, 'curtain', { open: { [FRONT]: 'gate' } }); b.cellRing(0, 0, 0, 'fence', { sides: NOT_FRONT });   // het terras is open aan de voorkant
      b.obj(0, 'counter', -4, 0, 0).obj(0, 'table', 1.5, 2.2).obj(0, 'table', 1.5, -2.2).obj(0, 'lamp', 7.4, 0);
      b.hex(1, 0, 0, CORE, 'roof'); add(b); }
    { // galerij: vloerring van 1,95 m rond een vide, met balustrade aan de binnenkant
      const b = libBuilder('Winkelcentrum · galerij', WC); b.where(0, (x, z) => !inCore(x, z), 'polished'); b.ring(0, 0, 0, CORE, 'fence'); b.obj(0, 'bench', 3.41, 5.91, Math.PI * 5 / 6).obj(0, 'bin', -3.41, -5.91); add(b); }
    // galerij met trap (trapring uit de schets): onderaan alleen de trap (de vloer is het dak eronder), erboven de
    // galerijring; de trap van 1,95 m ligt in de band langs één zijde. Gespiegeld plaatsen (F) geeft de trap aan de andere kant.
    for (const [nm, S] of [['Winkelcentrum · galerij · trap', { a: [-3, 3], d: 4, n: 3, w: 1.95, k: 'stair', off: -0.975 }]]) {   // gespiegeld: plaatsen met F
      const b = libBuilder(nm, WC); b.m.lv[0].s.push(S);
      b.where(1, (x, z) => !inCore(x, z), 'polished'); b.ring(1, 0, 0, CORE, 'fence'); b.obj(1, 'bench', 3.41, 5.91, Math.PI * 5 / 6).obj(1, 'bin', -3.41, -5.91); add(b);
    }
    { // trap (trapzijde uit de schets): 1,95 m breed langs de rand van het vak, van de hal naar de straat erboven,
      // met het bordes uit de schets: een strook langs de rand naar de galerij van het buurvak. Twee stuks gespiegeld
      // tegen elkaar (F) geven de brede trap tussen de twee halve blokken.
      const b = libBuilder('Winkelcentrum · trap', WC); b.m.lv[0].s.push({ a: [0.5, -4], d: 0, n: 3, w: 1.95, k: 'stair', off: 0.975 });
      const LAND = [[[6.819, -5.062], [7.794, 4.5], [7.794, -4.5]], [[7.794, 4.5], [6.819, -5.062], [5.845, 3.375]], [[5.845, 3.375], [6.819, -5.062], [5.845, -3.375]]];
      const inT = (x, z, T) => { const s1 = (T[1][0] - T[0][0]) * (z - T[0][1]) - (T[1][1] - T[0][1]) * (x - T[0][0]), s2 = (T[2][0] - T[1][0]) * (z - T[1][1]) - (T[2][1] - T[1][1]) * (x - T[1][0]), s3 = (T[0][0] - T[2][0]) * (z - T[2][1]) - (T[0][1] - T[2][1]) * (x - T[2][0]); return (s1 >= -0.3 && s2 >= -0.3 && s3 >= -0.3) || (s1 <= 0.3 && s2 <= 0.3 && s3 <= 0.3); };
      b.where(1, (x, z) => LAND.some(T => inT(x, z, T)), 'polished'); add(b); }
    libExtra(add);   // de 35 nieuwe basisgebouwen (08d9)
    return out;
  }
  // ---------- Voorbeeld: het winkelcentrum uit de SketchUp-schets (hex_mall), precies zoals getekend ----------
  // [module, q, r, laag, draaiing]; de bouwstenen staan op elkaar, de passage loopt diagonaal door de bovenlagen
  const MALL_NAMES = ["Winkelcentrum · café · half", "Winkelcentrum · dakpaviljoen", "Winkelcentrum · doorgang", "Winkelcentrum · galerij", "Winkelcentrum · galerij · trap", "Winkelcentrum · horeca", "Winkelcentrum · magazijn", "Winkelcentrum · oprit", "Winkelcentrum · trap", "Winkelcentrum · winkel", "Winkelcentrum · winkel · afgesneden", "Winkelcentrum · winkel · boeken"];
  const MALL = [[7,-1,-3,0,5],[9,0,-3,0,1],[9,1,-3,0,0],[5,-2,-2,0,2],[11,-1,-2,0,0],[11,0,-2,0,0],[9,1,-2,0,1],[9,2,-2,0,2],[7,-3,-1,0,0],[6,-2,-1,0,3],[9,-1,-1,0,0],[5,0,-1,0,0],[5,1,-1,0,0],[11,2,-1,0,1],[11,3,-1,0,2],[9,-3,0,0,4],[9,-2,0,0,0],[9,-1,0,0,0],[9,0,0,0,0],[9,1,0,0,0],[9,2,0,0,0],[5,3,0,0,1],[5,-3,1,0,5],[11,-2,1,0,4],[11,-1,1,0,0],[9,0,1,0,0],[9,1,1,0,0],[9,2,1,0,0],[9,3,1,0,1],[9,-2,2,0,3],[5,-1,2,0,4],[5,0,2,0,0],[11,1,2,0,0],[11,2,2,0,5],[9,-1,3,0,3],[9,0,3,0,4],[9,1,3,0,4],[11,0,-3,1,5],[9,1,-3,1,4],[9,-2,-2,1,1],[2,-1,-2,1,5],[4,0,-2,1,3,1],[5,1,-2,1,3],[11,2,-2,1,2],[2,-2,-1,1,0],[10,0,-1,1,3],[9,1,-1,1,5],[9,2,-1,1,4],[5,3,-1,1,2],[5,-3,0,1,0],[4,-2,0,1,2],[10,-1,0,1,0],[0,1,0,1,3],[8,1,0,1,5,1],[9,2,0,1,3],[9,3,0,1,1],[9,-3,1,1,1],[9,-2,1,1,2],[5,-1,1,1,0],[0,0,1,1,0],[8,0,1,1,0],[11,2,1,1,3],[9,3,1,1,1],[9,-2,2,1,3],[9,-1,2,1,1],[9,0,2,1,2],[9,1,2,1,2],[5,2,2,1,5],[9,-1,3,1,3],[9,0,3,1,4],[9,1,3,1,4],[5,0,-3,2,5],[5,1,-3,2,4],[9,-2,-2,2,1],[1,-1,-2,2,0],[9,1,-2,2,3],[1,2,-2,2,4],[1,-2,-1,2,5],[9,2,-1,2,4],[1,3,-1,2,4],[9,-3,0,2,0],[9,3,0,2,3],[9,-3,1,2,1],[9,-2,1,2,1],[3,1,1,2,0],[5,3,1,2,3],[1,-2,2,2,1],[9,-1,2,2,1],[9,2,2,2,3],[1,-1,3,2,1],[11,0,3,2,2],[11,1,3,2,2],[9,0,-3,3,5],[9,1,-3,3,4],[11,-2,-2,3,1],[11,-1,-2,3,5],[9,1,-2,3,3],[9,2,-2,3,2],[9,-2,-1,3,0],[10,0,-1,3,3],[11,1,-1,3,4],[11,2,-1,3,1],[9,3,-1,3,2],[9,-3,0,3,0],[10,-1,0,3,0],[0,1,0,3,3],[5,2,0,3,4],[5,3,0,3,1],[11,-3,1,3,1],[11,-2,1,3,2],[9,-1,1,3,1],[0,0,1,3,0],[9,2,1,3,3],[9,3,1,3,1],[5,-2,2,3,3],[5,-1,2,3,4],[11,0,2,3,1],[11,1,2,3,2],[9,2,2,3,5],[9,-1,3,3,3],[9,0,3,3,4],[5,1,3,3,4]];
  function mallCity() {
    const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), std = new Map(libStandard().map(m => [base(m.name), m])), byName = new Map(modules.map(m => [base(m.name), m]));   // zonder lagen/maat-achtervoegsel
    const c = new Map(); c.inst = [];
    for (const [ni, q, r, lv, rot, mir] of MALL) {
      const name = MALL_NAMES[ni], lib = byName.get(name) || std.get(name); if (!lib) continue;
      c.inst.push(Object.assign({ mid: lib.id, m: instData(lib, !!mir), q, r, rot }, lv ? { lv } : {}, mir ? { mir: true } : {}));
    }
    return c;
  }
  // Eenmalig aan de lijst toevoegen (en terug te zetten via de module maker)
  function libInstall(force) {
    const have = new Set(modules.map(m => m.name)); let n = 0;
    for (const m of libStandard()) { if (have.has(m.name) && !force) continue; if (have.has(m.name)) { const i = modules.findIndex(x => x.name === m.name); m.id = modules[i].id; modules[i] = m; } else modules.push(m); n++; }
    saveMods(); return n;
  }
  // Eén keer toevoegen; bij een nieuwe uitgave van de bibliotheek (lib3: trappen, muren op de rand) worden de
  // standaardmodules vernieuwd en de geplaatste exemplaren bijgewerkt. Eigen modules blijven staan.
  let libRefreshed = false;
  try {
    if (!localStorage.getItem('hexstad-lib3')) { libInstall(!!localStorage.getItem('hexstad-lib2')); localStorage.setItem('hexstad-lib2', '1'); localStorage.setItem('hexstad-lib3', '1'); libRefreshed = true; }
  } catch (e) { /* geen opslag */ }
  // Eenmalig: de standaardmodules krijgen hun nieuwe, logische naam (eigen aanpassingen blijven); Trappen heet nu Verbindingen
  try {
    if (!localStorage.getItem('hexstad-names1')) {
      const map = new Map(libStandard().map(m => [m.was, m])); let n = 0;
      for (const m of modules) { const st = m.v === 2 && map.get(m.name); if (st) { m.name = st.name; m.cat = st.cat; m._sig = Date.now(); n++; } else if (m.cat === 'Trappen') m.cat = 'Verbindingen'; }
      if (n) saveMods(); localStorage.setItem('hexstad-names1', '1');
    }
  } catch (e) { /* geen opslag */ }
  // Nieuwe uitgave (lib4: Winkelcentrum): ontbrekende standaardmodules erbij, eigen en bestaande blijven zoals ze zijn
  try { if (!localStorage.getItem('hexstad-lib4')) { libInstall(false); localStorage.setItem('hexstad-lib4', '1'); } } catch (e) { /* geen opslag */ }
  // lib5: de Winkelcentrum-familie volgens de schets (galerij met trap zonder winkel eronder, gespiegeld, brede trap):
  // die standaardmodules worden vervangen (zelfde id, zodat geplaatste exemplaren meegaan), de rest blijft staan
  try {
    if (!localStorage.getItem('hexstad-lib9')) {
      const base = n => (n || '').replace(/( · \d+[Lv])+$/, '');
      for (const old of ['Winkelcentrum · galerij · trap · gespiegeld', 'Winkelcentrum · trap · breed']) { const i = modules.findIndex(x => base(x.name) === old); if (i >= 0) modules.splice(i, 1); }   // vervangen door spiegelen
      for (const m of libStandard()) { if (m.cat !== 'Winkelcentrum') continue; const i = modules.findIndex(x => base(x.name) === base(m.name)); if (i >= 0) { m.id = modules[i].id; modules[i] = m; } else modules.push(m); }
      saveMods(); localStorage.setItem('hexstad-lib9', '1');
    }
  } catch (e) { /* geen opslag */ }
  // lib10: de hele bibliotheek opnieuw gebouwd en gecontroleerd (bereikbaarheid, trappen, inrichting) plus 35 nieuwe basisgebouwen.
  // Standaardmodules die je nooit in de Raatbouwer hebt bewaard (geen _sig) worden vervangen (zelfde id, dus geplaatste exemplaren
  // gaan mee, zie buildModNet), nieuwe komen erbij; wat je zelf hebt aangepast of gemaakt blijft staan.
  let libNews = 0;
  try {
    if (!localStorage.getItem('hexstad-lib10')) {
      const base = n => (n || '').replace(/( · \d+[Lv])+$/, '');
      const std = libStandard(), baseCount = new Map(); for (const m of std) baseCount.set(base(m.name), (baseCount.get(base(m.name)) || 0) + 1);
      const used = new Set();
      // bij welke bewaarde module hoort deze standaardmodule? eerst de precieze naam, dan de naam uit de bouwcode, dan de naam zonder
      // lagen/maat, maar alleen als die in de bibliotheek uniek is (Rijhuis · baksteen bestaat in 2L én 3L: die mogen elkaar niet vervangen)
      const match = m => { const ok = i => i >= 0 && !used.has(i) && modules[i].v === 2; let i = modules.findIndex(x => x.name === m.name); if (ok(i)) return i;
        if (m.was) { i = modules.findIndex(x => x.was === m.was); if (ok(i)) return i; }
        if (baseCount.get(base(m.name)) === 1) { i = modules.findIndex((x, j) => !used.has(j) && x.v === 2 && base(x.name) === base(m.name)); if (ok(i)) return i; }
        return -1; };
      for (const m of std) { m.lib = 10; const i = match(m); if (i >= 0) { used.add(i); if (modules[i]._sig) continue; m.id = modules[i].id; modules[i] = m; } else { modules.push(m); used.add(modules.length - 1); libNews++; } }
      saveMods(); localStorage.setItem('hexstad-lib10', '1'); libRefreshed = true;
    }
    // lib11: nieuwe standaardmodules erbij (klein winkelcentrum); wat er al is blijft zoals het is
    if (!localStorage.getItem('hexstad-lib11')) {
      const base = n => (n || '').replace(/( · \d+[Lv])+$/, ''), have = new Set(modules.map(m => base(m.name)));
      for (const m of libStandard()) if (!have.has(base(m.name))) { m.lib = 11; modules.push(m); libNews++; }
      saveMods(); localStorage.setItem('hexstad-lib11', '1'); libRefreshed = true;
    }
    // lib12: het kleine winkelcentrum hoort bij de Winkelcentrum-familie (ook in het filter Winkelcentrum)
    if (!localStorage.getItem('hexstad-lib12')) {
      for (const m of modules) if (m.v === 2 && /^Winkelcentrum · klein( · |$)/.test(m.name || '') && m.cat === 'Winkels') m.cat = 'Winkelcentrum';
      saveMods(); localStorage.setItem('hexstad-lib12', '1');
    }
  } catch (e) { /* geen opslag */ }
  // voor de tests (bibliotheekcontrole): de rekenhulpen van modules v2
  window.__mv2thumb = (m, rot, px) => mv2Thumb(m, rot, px);
  window.__mv2 = { mv2FloorPolys, mv2Build, mv2Tf, mv2TriVerts, mv2P, mv2Ts, mv2InArea, mv2NearArea, mv2CellXZ, modMeta, mv2StairHole, MV2, libStandard, libBuilder };
