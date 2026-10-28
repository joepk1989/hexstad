  // ---------- Modules v2: gebouwen met vloeren, muren, openingen, trappen, daken en voorwerpen ----------
  // Een module v2 is een gebied van zeshoekvakken (straal k) met verdiepingen van 3 m. Alles ligt op het fijne
  // driehoekraster van de schets (zijde R/n): vloeren zijn driehoeken, muren liggen op de ribben tussen twee
  // rasterpunten, trappen en hellingen lopen van een rasterpunt in een van zes richtingen omhoog naar de volgende
  // verdieping. De module wordt in de stad echt gebouwd: je kunt erdoorheen en erop lopen.
  //
  //   { v: 2, id, name, cat, k, n, lv: [ { f: { 'i,j,t': vloer }, w: { 'i,j,d': { m: materiaal, o: opening } },
  //                                        s: [ { a: [i, j], d, n, w, k } ], r: { 'q,r': 'hip' }, o: [ { t, x, z, rot } ] } ],
  //     edges: [], cells: [], tris: [], paths: [], codes }
  //
  // Rasterpunt (i, j) ligt op P(i, j) = (i·ts·√3/2, i·ts/2 + j·ts). Ribrichtingen d: 0 = (1,0) op 30°, 1 = (0,1) op 90°,
  // 2 = (−1,1) op 150°. Zes looprichtingen voor trappen: 30°, 90°, 150°, 210°, 270°, 330°.
  const MV2 = {
    LV_H: 3, WALL_T: 0.25, FLOOR_T: 0.2, MAX_LV: 8,
    DIR3: [[1, 0], [0, 1], [-1, 1]],
    // muurrichtingen: 0–2 langs de ribben van het raster, 3–5 haaks daarop (0°, 60°, 120°; √3 × zo lang), zodat je
    // muren onder 90° op elkaar kunt laten aansluiten
    DIRW: [[1, 0], [0, 1], [-1, 1], [2, -1], [1, 1], [-1, 2]],
    DIR12: [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1], [2, -1], [1, 1], [-1, 2], [-2, 1], [-1, -1], [1, -2]],
    DIR6: [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]],
    floors: { paver: 'Klinkers', tile: 'Stoeptegels', wood: 'Houten vloer', parquet: 'Visgraat parket', carpet: 'Kantoor\u00ADvloer', concrete: 'Beton', polished: 'Gepolijst beton', stonetile: 'Natuur\u00ADsteen tegels', grass: 'Gras', water: 'Water', asphalt: 'Asfalt', roof: 'Dak\u00ADbedekking', glass: 'Glazen dak' },
    walls: { brick: 'Baksteen', darkbrick: 'Donkere steen', plaster: 'Wit stucwerk', concrete: 'Schoon beton', panel: 'Gevel\u00ADpanelen', slats: 'Houten lamel\u00ADlen', corten: 'Corten\u00ADstaal', curtain: 'Glasgevel', glass: 'Glaswand', wood: 'Hout', stone: 'Natuur\u00ADsteen', hedge: 'Haag', fence: 'Hek' },
    openings: { '': 'Dicht', door: 'Deur', window: 'Raam', gate: 'Poort', open: 'Open' },
    objects: { tree: 'Boom', bush: 'Struik', bench: 'Bankje', lamp: 'Lantaarn', pillar: 'Zuil', table: 'Tafel', planter: 'Plantenbak', fountain: 'Fontein', bin: 'Prullenbak', bike: 'Fietsenrek', shelf: 'Winkelstelling', counter: 'Toonbank', sign: 'Lichtreclame',
      bed: 'Bed', sofa: 'Bank (binnen)', desk: 'Bureau', kitchen: 'Keukenblok', screen: 'Filmdoek', car: 'Auto', pump: 'Tankpomp', charger: 'Laadpaal', solar: 'Zonnepanelen', turbine: 'Windmolen', chimney: 'Schoorsteen', container: 'Container', goal: 'Doel', grave: 'Grafsteen', boat: 'Boot', shelter: 'Abri', slide: 'Glijbaan', swing: 'Schommel', sheep: 'Schaap' },
    cats: ['Wonen', 'Werken', 'Winkels', 'Winkelcentrum', 'Openbaar', 'Voorzieningen', 'Groen', 'Pleinen', 'Verbindingen', 'Bouwdelen', 'Overig'],
  };
  const mv2Ts = m => R / ([1, 2, 4, 8].includes(m.n) ? m.n : 4);
  const mv2P = (i, j, ts) => [i * ts * SQ3 / 2, i * ts / 2 + j * ts];
  const mv2TriVerts = (i, j, t, ts) => { const A = mv2P(i, j, ts), B = mv2P(i + 1, j, ts), C = mv2P(i, j + 1, ts), D = mv2P(i + 1, j + 1, ts); return t ? [B, D, C] : [A, B, C]; };
  const mv2HexDist = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
  function mv2CellOf(x, z) {   // vak (q, r) waarin een lokaal punt ligt
    const fq = (x * SQ3 / 3 - z / 3) / R, fr = (2 / 3 * z) / R; let q = Math.round(fq), r = Math.round(fr), s = Math.round(-fq - fr);
    const dq = Math.abs(q - fq), dr = Math.abs(r - fr), ds = Math.abs(s + fq + fr);
    if (dq > dr && dq > ds) q = -r - s; else if (dr > ds) r = -q - s;
    return [q, r];
  }
  const mv2CellXZ = (q, r) => [R * SQ3 * (q + r / 2), 1.5 * R * r];
  const mv2InArea = (m, x, z) => { const [q, r] = mv2CellOf(x, z); return mv2HexDist(q, r) <= (m.k || 0); };
  // Voor muren: een rib op de buitenrand van het gebied ligt precies op de grens; die hoort erbij (marge 10 cm)
  function mv2NearArea(m, x, z) {
    const k = m.k || 0, [q0, r0] = mv2CellOf(x, z); if (mv2HexDist(q0, r0) <= k) return true;
    for (const [dq, dr] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) { const q = q0 + dq, r = r0 + dr; if (mv2HexDist(q, r) > k) continue; const c = mv2CellXZ(q, r); let inside = true; for (const f of FRAMES) if ((x - c[0]) * f.nx + (z - c[1]) * f.nz > INNER + 0.1) { inside = false; break; } if (inside) return true; }
    return false;
  }
  function mv2New(name) {
    return { v: 2, id: uid(), name: name || 'Nieuwe module', cat: 'Overig', k: 0, n: 4, lv: [mv2Level()], edges: [], cells: [], tris: [], paths: [] };
  }
  const mv2Level = () => ({ f: {}, w: {}, s: [], r: {}, o: [] });
  const mv2Fix = m => {   // oude of onvolledige modules aanvullen
    if (!Array.isArray(m.lv) || !m.lv.length) m.lv = [mv2Level()];
    for (let i = 0; i < m.lv.length; i++) { const L = m.lv[i] || (m.lv[i] = mv2Level()); L.f = L.f || {}; L.w = L.w || {}; L.s = L.s || []; L.r = L.r || {}; L.o = L.o || []; }
    m.edges = m.edges || []; m.cells = m.cells || []; m.tris = m.tris || []; m.paths = m.paths || []; if (!m.id) m.id = uid();
    return m;
  };
  // Moderne gevels en vloeren: textuur op ware schaal (uv in meters), herhalend. mvTex(breedte, hoogte in m, tekenfunctie)
  function mvTex(wm, hm, draw, ppm = 96, floor = false) {
    const c = document.createElement('canvas'); c.width = Math.max(8, Math.round(wm * ppm)); c.height = Math.max(8, Math.round(hm * ppm));
    const g = c.getContext('2d'); draw(g, c.width, c.height, ppm);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    t.repeat.set((floor ? 2 : 1) / wm, (floor ? 2 : 1) / hm);   // vloer-uv loopt in stappen van 2 m (zie triGeo)
    return t;
  }
  const hash01 = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  const noise = (g, w, h, base, amt, n = 900) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const x = hash01(i, 1) * w, y = hash01(i, 2) * h, r = 1 + hash01(i, 3) * 3, k = hash01(i, 4); g.fillStyle = k > 0.5 ? `rgba(255,255,255,${(amt * (k - 0.5)).toFixed(3)})` : `rgba(0,0,0,${(amt * (0.5 - k)).toFixed(3)})`; g.fillRect(x, y, r, r); } };
  function modernMats() {
    const mk = (tex, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: 0.85 }, o)); m.userData.mUV = true; return m; };
    const brick = (bc, mc, bw, bh, jw, wm, hm, vary) => mvTex(wm, hm, (g, w, h, p) => { g.fillStyle = mc; g.fillRect(0, 0, w, h); const rows = Math.round(hm / bh), cols = Math.round(wm / bw);
      for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) { const x = (c + (r % 2) * 0.5) * bw * p, y = r * bh * p, k = hash01(r, c); g.fillStyle = bc; g.fillRect(x + jw * p / 2, y + jw * p / 2, bw * p - jw * p, bh * p - jw * p); g.fillStyle = `rgba(${k > 0.5 ? '255,255,255' : '0,0,0'},${(Math.abs(k - 0.5) * vary).toFixed(3)})`; g.fillRect(x + jw * p / 2, y + jw * p / 2, bw * p - jw * p, bh * p - jw * p); } });
    const wl = {
      brick: mk(brick('#8f4a37', '#9e968a', 0.21, 0.0625, 0.01, 2.1, 0.625, 0.35)),
      darkbrick: mk(brick('#3a3734', '#8e8a83', 0.49, 0.05, 0.008, 1.96, 0.5, 0.25)),
      plaster: mk(mvTex(2, 2, (g, w, h) => noise(g, w, h, '#f1eee8', 0.05, 1400)), { roughness: 0.95 }),
      concrete: mk(mvTex(2.4, 1.2, (g, w, h, p) => { noise(g, w, h, '#b8b7b0', 0.08, 1600); g.fillStyle = 'rgba(60,60,55,0.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h); for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) { g.beginPath(); g.arc(fx * w, fy * h, 0.015 * p, 0, Math.PI * 2); g.fill(); } })),
      panel: mk(mvTex(3.6, 3, (g, w, h, p) => { for (let i = 0; i < 3; i++) { const k = hash01(i, 7); g.fillStyle = `hsl(210, 6%, ${30 + k * 6}%)`; g.fillRect(i * 1.2 * p, 0, 1.2 * p, h); } g.fillStyle = '#1d2023'; for (let i = 0; i <= 3; i++) g.fillRect(i * 1.2 * p - 2, 0, 4, h); g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3); }, 64), { roughness: 0.55, metalness: 0.15 }),
      slats: mk(mvTex(0.9, 3, (g, w, h, p) => { g.fillStyle = '#2a1f17'; g.fillRect(0, 0, w, h); for (let i = 0; i < 10; i++) { const k = hash01(i, 9); g.fillStyle = `hsl(${26 + k * 6}, ${42 + k * 10}%, ${40 + k * 10}%)`; g.fillRect(i * 0.09 * p, 0, 0.07 * p, h); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(i * 0.09 * p, 0, 0.015 * p, h); } }, 100), { roughness: 0.8 }),
      corten: mk(mvTex(2, 3, (g, w, h, p) => { const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#8d4b2b'); grd.addColorStop(1, '#a35a32'); g.fillStyle = grd; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const k = hash01(i, 11); g.fillStyle = k > 0.5 ? 'rgba(190,110,60,0.25)' : 'rgba(60,25,10,0.25)'; g.fillRect(hash01(i, 12) * w, hash01(i, 13) * h, 1 + k * 3, 1 + k * 2); } g.fillStyle = 'rgba(40,18,8,0.6)'; for (let y = 0; y < 3; y++) g.fillRect(0, y * p - 1, w, 2); }, 64), { roughness: 0.9, metalness: 0.2 }),
      curtain: mk(mvTex(1.5, 3, (g, w, h, p) => { const grd = g.createLinearGradient(0, 0, w * 0.4, h); grd.addColorStop(0, '#9fbfd3'); grd.addColorStop(0.55, '#5f7f97'); grd.addColorStop(1, '#3d5468'); g.fillStyle = grd; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(0.1 * w, h); g.lineTo(0.55 * w, 0); g.lineTo(0.7 * w, 0); g.lineTo(0.25 * w, h); g.fill(); g.fillStyle = '#2b3a46'; g.fillRect(0, h - 0.9 * p, w, 0.9 * p); g.fillStyle = '#cfd4d7'; g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h); g.fillRect(0, 0, w, 5); g.fillRect(0, h - 0.9 * p - 2, w, 4); }, 64), { roughness: 0.15, metalness: 0.35 }),
    };
    const fl = {
      polished: mk(mvTex(2, 2, (g, w, h) => { noise(g, w, h, '#c9c8c3', 0.07, 2200); }, 96, true), { roughness: 0.35 }),
      stonetile: mk(mvTex(1.2, 1.2, (g, w, h, p) => { g.fillStyle = '#9c968a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const k = hash01(i + 3, j + 5); g.fillStyle = `hsl(40, ${12 + k * 6}%, ${74 + k * 8}%)`; g.fillRect(i * 0.6 * p + 1, j * 0.6 * p + 1, 0.6 * p - 2, 0.6 * p - 2); } }, 96, true), { roughness: 0.6 }),
      parquet: mk(mvTex(1.2, 1.2, (g, w, h, p) => { g.fillStyle = '#6e4a2c'; g.fillRect(0, 0, w, h); const pl = 0.48 * p, pw = 0.08 * p;
        for (let col = 0; col < 4; col++) { g.save(); g.beginPath(); g.rect(col * 0.3 * p, 0, 0.3 * p, h); g.clip(); const sgn = col % 2 ? 1 : -1;
          for (let i = -10; i < 30; i++) { const k = hash01(col, i); g.save(); g.translate(col * 0.3 * p + 0.15 * p, i * pw * Math.SQRT2); g.rotate(sgn * Math.PI / 4); g.fillStyle = `hsl(${30 + k * 6}, ${45 + k * 10}%, ${45 + k * 12}%)`; g.fillRect(-pl / 2, -pw / 2 + 0.5, pl - 1, pw - 1); g.restore(); }
          g.restore(); } }, 96, true), { roughness: 0.55 }),
    };
    return { wl, fl };
  }
  // Materialen (gedeeld met de stad)
  let MV2M = null;
  function mv2Mats() {
    if (MV2M) return MV2M;
    const MM = modernMats();
    const fl = Object.assign({ paver: M.paver, tile: M.walkTop, wood: M.floorWood, carpet: M.floorOffice, concrete: M.concrete, grass: M.grass, water: M.water, asphalt: M.asphalt, roof: M.roofFlat, glass: new THREE.MeshStandardMaterial({ color: '#a9d3ea', transparent: true, opacity: 0.45, roughness: 0.12, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }) }, MM.fl);
    const wl = Object.assign({ glass: M.pane, wood: M.stairWood, stone: M.stone, hedge: M.leaf[1], fence: M.rail }, MM.wl);
    MV2M = { fl, wl, ceiling: M.ceiling, slab: M.concrete, frame: M.alu, trim: M.trim, roof: M.roofTile, step: M.stone, rampTop: M.paverPlain, trunk: M.trunk, leaf: M.leaf, bench: M.bench, lamp: M.lampOff, lampGlow: new THREE.MeshBasicMaterial({ color: '#ffe6a8' }), water: M.water, bin: M.tlBody, metal: M.alu };
    return MV2M;
  }
  // ---------- Bouwen: geometrie en botsing voor één module ----------
  // tf(x, z) zet lokale coördinaten om naar de plek in de wereld (gedraaid en verschoven). Teruggegeven worden een
  // groep (al in wereldcoördinaten), loopvlakken per verdieping (kind 'tris') en muren voor de botsing.
  // opts.stacked: de module staat op een andere module (begane grond krijgt een plafond eronder en geen maaiveld-
  // details); opts.roofMask(x, z): daar staat een module op, dus daar geen dakvloer (een glazen lichtkap verdwijnt
  // zodra er iets op het vak staat, de dakbedekking alleen onder de vloer van de module erboven)
  const OFF_ROAD = new Set(['tree', 'bush', 'bench', 'bin', 'table', 'bike', 'planter']);
  const OBJ_MAT = new Map(), om = (c, r = 0.75) => { const k = c + '|' + r; let m = OBJ_MAT.get(k); if (!m) OBJ_MAT.set(k, m = new THREE.MeshStandardMaterial({ color: c, roughness: r })); return m; };   // één materiaal per kleur (minder tekenbeurten)   // zie offSpot
  const onRoadNow = (x, z) => typeof roadTop === 'function' && roadTop(x, z, 0) !== null;
  // Staat op dit punt (met kruin erbij) een weg, stoep of een gebouw van een ander vak? Dan komt er geen boom of bankje.
  const GREENISH = /^(Park|Bos|Tuin|Grasveld|Plein|Water|Vlak|Parkeer|Rij|Afscheiding|Kade)/;
  const areaCache = new WeakMap();
  function offSpot(I, x, z) {
    if (onRoadNow(x, z)) return true;
    let own = areaCache.get(I); if (!own || own.sig !== I.q + ',' + I.r + ',' + I.rot) { own = new Set(mv2Area(I).map(([q, r]) => q + ',' + r)); own.sig = I.q + ',' + I.r + ',' + I.rot; areaCache.set(I, own); }
    for (let k = -1; k < 6; k++) {
      const px = k < 0 ? x : x + Math.cos(k * Math.PI / 3) * 2.3, pz = k < 0 ? z : z + Math.sin(k * Math.PI / 3) * 2.3, [q, r] = worldToCell(px, pz), kk = q + ',' + r;
      if (own.has(kk)) continue;
      const t = modTop.get(kk); if (t && t.inst !== I && t.inst.m && !GREENISH.test(t.inst.m.name || '')) return true;
      const b = cells.get(kk); if (Array.isArray(b) && b.some(n => !/^(park|water|pad|weg|laan|vlak)/.test(String(n)))) return true;
    }
    return false;
  }
  // Trapgat: welke vloerdriehoeken (op de verdieping boven trap S) weg moeten, en welk stuk ervan blijft liggen.
  // Geeft per driehoek null (blijft) of { keep: [nx, nz, c] | null }: alleen het deel waar x·nx + z·nz >= c blijft, zodat de vloer
  // precies tot de bovenste tree (of tot de schuine rand van het bordes) doorloopt in plaats van een kier te laten.
  function mv2StairHole(S, ts) {
    const D = MV2.DIR6[S.d] || MV2.DIR6[0], a = mv2P(S.a[0], S.a[1], ts), len = (S.n || 2) * ts, w = S.w || 2, dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, off = S.off || 0;
    const loc = (x, z) => { const cx = x - a[0], cz = z - a[1]; return [cx * ux + cz * uz, cx * nx + cz * nz - off]; };
    const cen = v => loc((v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3);
    const keepAl = (al0, sign) => [ux * sign, uz * sign, sign * (a[0] * ux + a[1] * uz + al0)];   // houd al >= al0 (sign 1) of al <= al0 (sign −1)
    if (S.k === 'spiral') {
      const dx0 = D[0] * ts * SQ3 / 2, dz0 = D[0] * ts / 2 + D[1] * ts, a0 = Math.atan2(dz0, dx0), sd = S.side || 1;
      return v => { const cx = (v[0][0] + v[1][0] + v[2][0]) / 3 - a[0], cz = (v[0][1] + v[1][1] + v[2][1]) / 3 - a[1]; if (Math.hypot(cx, cz) > 2.15) return null; const ph = ((sd * (Math.atan2(cz, cx) - a0)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (ph < Math.PI * 5 / 3) return { keep: null };
        // het driehoekje boven de laatste twee treden: alleen de helft boven de uitstaptree (330°–360°) blijft, anders stoot je je hoofd op tree 10
        const th = a0 + sd * Math.PI * 11 / 6, nx2 = Math.cos(th + sd * Math.PI / 2), nz2 = Math.sin(th + sd * Math.PI / 2); return { keep: [nx2, nz2, a[0] * nx2 + a[1] * nz2] }; };
    }
    if (S.k === 'u') {
      const sd = S.side || 1, c2 = sd * w, cut = 2 * w / SQ3, oA = -sd * w / 2, oB = c2 + sd * w / 2;
      // schuine rand van het bordes: van (len + 0,25, oA) naar (len + 0,25 + cut, oB); houd wat erachter ligt
      const P0 = [a[0] + ux * (len + 0.25) + nx * (oA + off), a[1] + uz * (len + 0.25) + nz * (oA + off)], P1 = [a[0] + ux * (len + 0.25 + cut) + nx * (oB + off), a[1] + uz * (len + 0.25 + cut) + nz * (oB + off)];
      let ex = P1[0] - P0[0], ez = P1[1] - P0[1]; const el = Math.hypot(ex, ez) || 1; let qx = -ez / el, qz = ex / el; if (qx * ux + qz * uz < 0) { qx = -qx; qz = -qz; }
      const beyond = [qx, qz, P0[0] * qx + P0[1] * qz], end = len + 0.25 + cut + 0.6;
      return v => { const [al, lat] = cen(v);
        if (Math.abs(lat) < w / 2 + 0.05 && al > 0.3 * len && al < end) return { keep: beyond };
        if (Math.abs(lat - c2) < w / 2 + 0.05 && al > -0.7 && al < end) return { keep: al < len / 2 ? keepAl(0, -1) : beyond };
        return null; };
    }
    // rechte steek of helling: een driehoek hoort bij het gat als zijn zwaartepunt in de baan van de trap ligt, of (bij een trap die niet precies
    // op een rij driehoeken valt, zoals 2 m breed midden op een rasterlijn) als er een hoekpunt echt binnen de baan ligt; anders kreeg je een zigzag van gaatjes
    if (S.k === 'stair' || S.k === 'ramp' || S.k === 'esc' || !S.k) return v => { const [al, lat] = cen(v); if (!(al > 0.3 * len && al < len + 0.7)) return null; const inBand = Math.abs(lat) < w / 2 + 0.05 || v.some(p => Math.abs(loc(p[0], p[1])[1]) < w / 2 - 0.05); return inBand ? { keep: keepAl(len, 1) } : null; };
    return () => null;
  }
  // een driehoek afknippen op een halfvlak (x·nx + z·nz >= c): geeft de overgebleven veelhoek (0, 3 of 4 punten)
  function mv2ClipKeep(v, k) {
    const [nx, nz, c] = k, out = [], f = p => p[0] * nx + p[1] * nz - c;
    for (let i = 0; i < v.length; i++) { const A = v[i], B = v[(i + 1) % v.length], fa = f(A), fb = f(B); if (fa >= 0) out.push(A); if ((fa >= 0) !== (fb >= 0)) { const s = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s]); } }
    return out;
  }
  // de vloerdriehoeken van een verdieping zoals ze echt liggen: zonder de trapgaten, afgeknipte stukken als losse driehoeken
  // (voor het loopnetwerk en de balustrades; mv2Build doet hetzelfde voor de vloer zelf)
  function mv2FloorPolys(m, li, ts) {
    const L = m.lv[li], holes = li > 0 ? ((m.lv[li - 1] || {}).s || []).map(S => mv2StairHole(S, ts)) : [], out = [];
    for (const id in L.f) {
      const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts); let hk = null; for (const h of holes) { hk = h(v); if (hk) break; }
      if (!hk) { out.push({ id, v, mat: L.f[id] }); continue; } if (!hk.keep) continue;
      const pl = mv2ClipKeep(v, hk.keep); for (let k = 1; k + 1 < pl.length; k++) { const T = [pl[0], pl[k], pl[k + 1]], ar = Math.abs((T[1][0] - T[0][0]) * (T[2][1] - T[0][1]) - (T[2][0] - T[0][0]) * (T[1][1] - T[0][1])) / 2; if (ar > 0.02) out.push({ id, v: T, mat: L.f[id], part: true }); }   // geen platgedrukte driehoekjes (die lijken overal 'binnen')
    }
    return out;
  }
  // straal van het dak op vak (q, r) van verdieping li: de kleinste zeshoek (in stappen van een rasterzijde) om de muren van dat vak heen
  function mv2RoofFit(m, li, q, r) {
    const L = m.lv[li], ts = mv2Ts(m), c = mv2CellXZ(q, r); let ap = 0;
    const hn = (x, z) => { let mx = -1e9; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; mx = Math.max(mx, (x - c[0]) * Math.cos(a) + (z - c[1]) * Math.sin(a)); } return mx; };
    for (const id in (L && L.w) || {}) { const W = L.w[id]; if (!W || W.m === 'fence' || W.m === 'hedge') continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue; const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts); if (Math.hypot((a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1]) > R) continue; ap = Math.max(ap, hn(a[0], a[1]), hn(b[0], b[1])); }
    if (!ap) return R; return Math.min(R, Math.max(ts, Math.ceil(ap / (SQ3 / 2) / ts - 0.05) * ts));
  }
  function mv2Build(m, tf, origin = [0, 0], opts = {}) {
    mv2Fix(m);
    const Mt = mv2Mats(), ts = mv2Ts(m), LH = MV2.LV_H, bags = new Map(), group = new THREE.Group(), surfaces = [], walls = [];
    const cand = [], nLv = m.lv.length, stacked = !!opts.stacked, roofLi = m.lv.length > 1 && modRoofOnly(m) ? m.lv.length - 1 : -1, mask = opts.roofMask || null;
    const pieceList = opts.pieces ? [] : null;   // instorten: elk stuk apart (muur, vloertegel, dakdeel, voorwerp) in plaats van per materiaal samengevoegd
    const put = (mat, g) => { if (pieceList) { pieceList.push({ mat, g }); return; } let L = bags.get(mat); if (!L) bags.set(mat, L = []); L.push(g); };
    const tilesOf = tris => { const o = new Map(); for (const v of tris) { const cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3, k = Math.floor(cx / 4.5) + ',' + Math.floor(cz / 4.5); let L = o.get(k); if (!L) o.set(k, L = []); L.push(v); } return [...o.values()]; };
    const tfp = p => tf(p[0], p[1]);
    // doos tussen twee punten a en b (op de grond), dik t, van y0 tot y1; off schuift hem dwars
    const wallBox = (mat, a, b, y0, y1, t, off = 0) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1e-6, nx = -dz / l, nz = dx / l;
      const g = new THREE.BoxGeometry(l, y1 - y0, t); const mx = (a[0] + b[0]) / 2 + nx * off, mz = (a[1] + b[1]) / 2 + nz * off;
      if (mat.userData && mat.userData.mUV) {   // uv in meters: de textuur loopt door over aangrenzende stukken en verdiepingen
        const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, along = mx * dx / l + mz * dz / l, yc = (y0 + y1) / 2;
        for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); if (Math.abs(N.getY(i)) > 0.5) U.setXY(i, x + along, z); else if (Math.abs(N.getX(i)) > 0.5) U.setXY(i, z, y + yc); else U.setXY(i, x + along, y + yc); }
      }
      const W = tf(mx, mz), W2 = tf(mx + dx / l, mz + dz / l), ang = Math.atan2(-(W2[1] - W[1]), W2[0] - W[0]);
      g.rotateY(ang); g.translate(W[0], (y0 + y1) / 2, W[1]); put(mat, g);
    };
    // plaat met een (bolle) veelhoek als bovenvlak, van yb tot yt (bordes, overloop)
    const slabPoly = (mat, P, yb, yt) => {
      const Wd = P.map(tfp), n = Wd.length, cx = Wd.reduce((s, p) => s + p[0], 0) / n, cz = Wd.reduce((s, p) => s + p[1], 0) / n, cy = (yb + yt) / 2, pos = [], v = (p, y) => [p[0], y, p[1]];
      const tri = (A, B, C) => { const nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
        const mx = (A[0] + B[0] + C[0]) / 3 - cx, my = (A[1] + B[1] + C[1]) / 3 - cy, mz = (A[2] + B[2] + C[2]) / 3 - cz; if (nx * mx + ny * my + nz * mz >= 0) pos.push(...A, ...B, ...C); else pos.push(...A, ...C, ...B); };
      for (let i = 1; i < n - 1; i++) { tri(v(Wd[0], yt), v(Wd[i], yt), v(Wd[i + 1], yt)); tri(v(Wd[0], yb), v(Wd[i], yb), v(Wd[i + 1], yb)); }
      for (let i = 0; i < n; i++) { const A = Wd[i], B = Wd[(i + 1) % n]; tri(v(A, yb), v(B, yb), v(B, yt)); tri(v(A, yb), v(B, yt), v(A, yt)); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); put(mat, g);
    };
    const railBar = (mat, A, ya, B, yb, t = 0.05) => { const pa = tfp(A), pb = tfp(B), va = new THREE.Vector3(pa[0], ya, pa[1]), vb = new THREE.Vector3(pb[0], yb, pb[1]), L2 = va.distanceTo(vb); if (L2 < 0.01) return; const g = new THREE.BoxGeometry(t, t, L2); g.lookAt(vb.clone().sub(va)); g.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2); put(mat, g); };
    const railPost = (mat, A, yb, yt) => { const p2 = tfp(A), g = new THREE.CylinderGeometry(0.03, 0.03, yt - yb, 6); g.translate(p2[0], (yb + yt) / 2, p2[1]); put(mat, g); };
    const doorsOut = [];   // deurbladen (09b), in wereld-xz, y nog zonder de hoogte van het exemplaar
    const addWall = (a, b, y0, y1, half = MV2.WALL_T / 2) => { const A = tfp(a), B = tfp(b); walls.push({ ax: A[0], az: A[1], bx: B[0], bz: B[1], y0, y1, half }); };
    const lerp = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    // vlakke driehoeken (wereld) in een BufferGeometry met uv in meters
    const triGeo = (tris, y, up = true) => {
      const pos = [], uv = [];
      for (const v of tris) { const W = v.map(tfp); const o = up ? [0, 2, 1] : [0, 1, 2]; for (const i of o) { pos.push(W[i][0], y, W[i][1]); uv.push(W[i][0] / 2, W[i][1] / 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
    };
    for (let li = 0; li < nLv; li++) {
      const L = m.lv[li], y0 = li * LH, walkPos = [], lifted = li > 0 || stacked;   // lifted: vloerplaat met plafond eronder   // loopvlak: driehoeken (wereld, absolute hoogte) voor de botsing
      const pushWalk = (a, b, c, ya, yb, yc) => { const A = tfp(a), B = tfp(b), C = tfp(c); walkPos.push(A[0] - origin[0], ya, A[1] - origin[1], B[0] - origin[0], yb, B[1] - origin[1], C[0] - origin[0], yc, C[1] - origin[1]); };
      // --- vloeren ---
      const byMat = {}, edgeCnt = new Map(), eid = (p, q) => [p.join(','), q.join(',')].sort().join('|'), holes = li > 0 ? (m.lv[li - 1].s || []).map(S => mv2StairHole(S, ts)) : [];
      for (const id in L.f) {
        const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts); let mat = L.f[id];
        if (!mv2InArea(m, (v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3)) continue;
        if (holes.length) {   // trapgat: de driehoek valt weg, maar het stuk naast de trap blijft liggen (tot de bovenste tree)
          let hk = null; for (const h of holes) { hk = h(v); if (hk) break; }
          if (hk) { if (hk.keep) { const pl = mv2ClipKeep(v, hk.keep); if (pl.length >= 3) { const top = y0 + 0.02; for (let n = 1; n < pl.length - 1; n++) { const tv = [pl[0], pl[n], pl[n + 1]]; if (Math.abs((tv[1][0] - tv[0][0]) * (tv[2][1] - tv[0][1]) - (tv[1][1] - tv[0][1]) * (tv[2][0] - tv[0][0])) < 1e-4) continue; (byMat[mat] || (byMat[mat] = [])).push(tv); pushWalk(tv[0], tv[1], tv[2], top, top, top); } } } continue; }
        }
        if (li === roofLi && mask) { const W = tf((v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3), c = mask(W[0], W[1]); if (c === 2) continue; }   // 2: onder een vloer erboven, 1: op een bebouwd vak
        if (li === roofLi && mat === 'grass' && opts.roofStyle && opts.roofStyle !== 'top') { const cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3, c0 = mv2CellXZ(...mv2CellOf(cx, cz)); if (Math.hypot(cx - c0[0], cz - c0[1]) > 3.2) mat = 'stonetile'; }   // binnen: het groen wordt een klein eiland in een plein
        (byMat[mat] || (byMat[mat] = [])).push(v);
        for (const [p, q] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) { const k = eid(p, q); edgeCnt.set(k, (edgeCnt.get(k) || 0) + 1); }
        const top = lifted ? y0 + 0.02 : 0.05; pushWalk(v[0], v[1], v[2], top, top, top);
      }
      for (const mat in byMat) {
        const top = lifted ? y0 + 0.02 : (mat === 'water' ? -0.25 : 0.05);
        if (pieceList) { for (const T of tilesOf(byMat[mat])) { put(Mt.fl[mat] || Mt.fl.concrete, triGeo(T, top)); if (lifted && mat !== 'glass') put(Mt.ceiling, triGeo(T, y0 - MV2.FLOOR_T, false)); } continue; }
        put(Mt.fl[mat] || Mt.fl.concrete, triGeo(byMat[mat], top));
        if (lifted && mat !== 'glass') put(Mt.ceiling, triGeo(byMat[mat], y0 - MV2.FLOOR_T, false));
      }
      if (lifted) {   // randen van de vloerplaat: een zijkant van 22 cm waar geen buurdriehoek ligt
        for (const mat in byMat) for (const v of byMat[mat]) for (const [p, q] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) if (edgeCnt.get(eid(p, q)) === 1) wallBox(Mt.slab, p, q, y0 - MV2.FLOOR_T, y0 + 0.02, 0.06);
      }
      const triAll = Object.values(byMat).flat(), floorAtL = (x, z) => triAll.some(v => { const s0 = (v[1][0] - v[0][0]) * (z - v[0][1]) - (v[1][1] - v[0][1]) * (x - v[0][0]), s1 = (v[2][0] - v[1][0]) * (z - v[1][1]) - (v[2][1] - v[1][1]) * (x - v[1][0]), s2 = (v[0][0] - v[2][0]) * (z - v[2][1]) - (v[0][1] - v[2][1]) * (x - v[2][0]); return (s0 >= 0 && s1 >= 0 && s2 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0); });   // ligt hier (lokaal) vloer op deze laag?
      // --- hoeken: waar twee muren onder een hoek samenkomen, een ronde hoekpost van dezelfde dikte, zodat de muren
      // zonder kier of uitstekend hoekje op elkaar aansluiten (muren zijn rechte blokken van punt tot punt) ---
      { const ends = new Map(), add = (k, dir, W) => { let L2 = ends.get(k); if (!L2) ends.set(k, L2 = []); L2.push({ dir, W }); };
        for (const id in L.w) { const W = L.w[id]; if (!W || W.m === 'fence' || W.m === 'glass') continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue;
          const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts); if (!mv2NearArea(m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
          add(i + ',' + j, u, W); add((i + D[0]) + ',' + (j + D[1]), [-u[0], -u[1]], W); }
        for (const [k, L2] of ends) {
          if (L2.length < 2) continue;
          if (opts.skip) { const [i0, j0] = k.split(',').map(Number), c0 = mv2P(i0, j0, ts), Wc = tf(c0[0], c0[1]); if (opts.skip.has('p' + wallKeyW((opts.baseLv || 0) + li, Wc[0], Wc[1]))) continue; }
          let bent = false; for (let x = 0; x < L2.length && !bent; x++) for (let y = x + 1; y < L2.length; y++) if (L2[x].dir[0] * L2[y].dir[0] + L2[x].dir[1] * L2[y].dir[1] > -0.99) { bent = true; break; }
          if (!bent) continue;   // rechtdoor: de blokken sluiten al aan
          const [i, j] = k.split(',').map(Number), c = mv2P(i, j, ts), hedge = L2.every(e => e.W.m === 'hedge'), W0 = L2.find(e => e.W.m !== 'hedge') || L2[0];
          const mat = hedge ? (Mt.wl.hedge) : (Mt.wl[W0.W.m] || Mt.wl.brick), r = hedge ? 0.3 : MV2.WALL_T / 2, h = hedge ? 1.4 : LH;
          const g = new THREE.CylinderGeometry(r * 1.02, r * 1.02, h, 12);
          if (mat.userData && mat.userData.mUV) { const P2 = g.attributes.position, U = g.attributes.uv; for (let n = 0; n < P2.count; n++) U.setXY(n, Math.atan2(P2.getZ(n), P2.getX(n)) * r + c[0] + c[1], P2.getY(n) + y0 + h / 2); }
          const Wp = tf(c[0], c[1]); g.translate(Wp[0], y0 + h / 2, Wp[1]); put(mat, g);
        } }
      // --- muren ---
      for (const id in L.w) {
        const W = L.w[id]; if (!W) continue;
        const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue;
        const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (!mv2NearArea(m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
        if (opts.skip) { const Wm = tf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); if (opts.skip.has(wallKeyW((opts.baseLv || 0) + li, Wm[0], Wm[1]))) continue; }   // dezelfde muur van de buurmodule staat er al
        const mat = Mt.wl[W.m] || Mt.wl.brick, T = MV2.WALL_T;
        // haag en hek: een deur, poort of open doorgang is een gat (vroeger bleef die dicht en kon je een omheind park niet in)
        if (W.m === 'hedge' || W.m === 'fence') {
          const og = W.o && W.o !== 'window' ? W.o : '', gw = og === 'door' ? Math.min(1.4, len - 0.6) : og === 'gate' ? Math.max(1.5, len - 0.5) : og ? len - 0.3 : 0, g0 = (len - gw) / 2 / len;
          const parts = gw > 0.1 ? [[a, lerp(a, b, g0)], [lerp(a, b, 1 - g0), b]] : [[a, b]];
          for (const [pa, pb] of parts) {
            if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) < 0.05) continue;
            if (W.m === 'hedge') { wallBox(mat, pa, pb, y0, y0 + 1.4, 0.6); addWall(pa, pb, y0, y0 + 1.4, 0.3); continue; }
            for (const f of [0, 0.5, 1]) { const p = lerp(pa, pb, f), q = lerp(pa, pb, Math.min(1, f + 0.02)); wallBox(Mt.metal, p, q, y0, y0 + 1.1, 0.08); }
            wallBox(Mt.metal, pa, pb, y0 + 0.5, y0 + 0.55, 0.05); wallBox(Mt.metal, pa, pb, y0 + 1.05, y0 + 1.1, 0.05); addWall(pa, pb, y0, y0 + 1.1, 0.06);
          }
          if (gw > 0.1 && W.m === 'fence') for (const pp of [lerp(a, b, g0), lerp(a, b, 1 - g0)]) wallBox(Mt.metal, pp, lerp(pp, b, 0.01), y0, y0 + 1.25, 0.12);   // stevige palen naast de doorgang
          continue;
        }
        const o = W.o || '', isGlass = W.m === 'glass';
        if (!o) { wallBox(mat, a, b, y0, y0 + LH, isGlass ? 0.06 : T); if (isGlass) { wallBox(Mt.frame, a, b, y0, y0 + 0.12, T); wallBox(Mt.frame, a, b, y0 + LH - 0.12, y0 + LH, T); } addWall(a, b, y0, y0 + LH); continue; }
        // opening: breedte en hoogte, posten links en rechts, latei erboven, bij een raam ook een borstwering
        const ow = o === 'door' ? Math.min(1.2, len - 0.6) : o === 'window' ? Math.max(0.6, len - 0.8) : o === 'gate' ? Math.max(1.5, len - 0.5) : len - 0.3;
        const oy0 = o === 'window' ? 0.9 : 0, oy1 = o === 'door' ? 2.2 : o === 'window' ? 2.15 : o === 'gate' ? 2.8 : LH - 0.3;
        const f0 = (len - ow) / 2 / len, f1 = 1 - f0, p0 = lerp(a, b, f0), p1 = lerp(a, b, f1);
        if (f0 > 0.01) { wallBox(mat, a, p0, y0, y0 + LH, T); wallBox(mat, p1, b, y0, y0 + LH, T); addWall(a, p0, y0, y0 + LH); addWall(p1, b, y0, y0 + LH); }
        if (oy1 < LH - 0.01) { wallBox(mat, p0, p1, y0 + oy1, y0 + LH, T); addWall(p0, p1, y0 + oy1, y0 + LH); }
        if (oy0 > 0.01) { wallBox(mat, p0, p1, y0, y0 + oy0, T); addWall(p0, p1, y0, y0 + oy0); }
        if (o === 'window') { wallBox(Mt.frame, p0, p1, y0 + oy0 - 0.04, y0 + oy0 + 0.04, T + 0.1); wallBox(Mt.frame, p0, p1, y0 + oy1 - 0.04, y0 + oy1 + 0.04, T); for (const p of [p0, p1]) wallBox(Mt.frame, p, lerp(p, p === p0 ? p1 : p0, 0.04 / ow), y0 + oy0, y0 + oy1, T); wallBox(M.pane, p0, p1, y0 + oy0, y0 + oy1, 0.02); }
        if (o === 'door') {   // deurblad (09b): alleen in een buitenmuur (vloer aan één kant), naar binnen draaiend; deuren tussen kamers krijgen geen blad
          const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, nlx = -(p1[1] - p0[1]) / ow, nlz = (p1[0] - p0[0]) / ow, sA = floorAtL(mx + nlx * 0.7, mz + nlz * 0.7), sB = floorAtL(mx - nlx * 0.7, mz - nlz * 0.7);
          if (sA !== sB) { const A = tfp(p0), B = tfp(p1), tl = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, Mw = tfp([mx, mz]), Nw = tfp([mx + nlx * (sA ? 1 : -1), mz + nlz * (sA ? 1 : -1)]), nl = Math.hypot(Nw[0] - Mw[0], Nw[1] - Mw[1]) || 1;
            doorsOut.push({ hx: A[0], hz: A[1], y: y0, w: tl, h: oy1, tx: (B[0] - A[0]) / tl, tz: (B[1] - A[1]) / tl, inx: (Nw[0] - Mw[0]) / nl, inz: (Nw[1] - Mw[1]) / nl, col: W.m === 'glass' || W.m === 'curtain' ? '#2b3a44' : W.m === 'wood' || W.m === 'slats' ? '#4a2e18' : '#5a3a22' }); }
          wallBox(Mt.trim, p0, p1, y0 + oy1 - 0.06, y0 + oy1, T + 0.08); for (const p of [p0, p1]) wallBox(Mt.trim, p, lerp(p, p === p0 ? p1 : p0, 0.06 / ow), y0, y0 + oy1, T + 0.08); }
        if (o === 'gate') { wallBox(Mt.trim, p0, p1, y0 + oy1 - 0.1, y0 + oy1, T + 0.1); }
      }
      // --- trappen en hellingen ---
      for (const S of L.s || []) {
        const D = MV2.DIR6[S.d] || MV2.DIR6[0], a = mv2P(S.a[0], S.a[1], ts), len = (S.n || 2) * ts, w = S.w || 2;
        const dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux;
        const rise = S.h || LH, off = S.off || 0, at = (al, lat) => [a[0] + ux * al + nx * (lat + off), a[1] + uz * al + nz * (lat + off)];   // off: zijwaarts verschoven (trap in een galerijband)
        const landing = (al, y) => { pushWalk(at(al, -w / 2), at(al + 1, w / 2), at(al, w / 2), y, y, y); pushWalk(at(al, -w / 2), at(al + 1, -w / 2), at(al + 1, w / 2), y, y, y); };   // onzichtbare overloop van 1 m: geen gat naar de vloer
        if (S.k === 'spiral') {   // zeshoekige wenteltrap: 12 trapezium-treden om een zeshoekige kern, één omwenteling per verdieping
          const sd = S.side || 1, a0 = Math.atan2(uz, ux), NS = 12, Ap = 1.9, Ac = 0.32, hs = rise / NS, th = k => a0 + sd * k * Math.PI / 6, TH = 0.26;
          const rad = (t, Aa) => { let d = (((t - a0 - Math.PI / 6) % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3); if (d > Math.PI / 6) d -= Math.PI / 3; return Aa / Math.cos(d); };   // zeshoek: Aa is de apothema; hoekpunten op de rasterlijnen (a0 + 60°·n), zijmiddens daartussen, net als de zes driehoeken om het rasterpunt
          const Pt = (t, Aa) => { const r = rad(t, Aa); return [a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]; };
          const posTop = [], posSide = [];
          const prism = (P4, yb, yt) => {
            const Wd = P4.map(tfp), cx = (Wd[0][0] + Wd[1][0] + Wd[2][0] + Wd[3][0]) / 4, cz = (Wd[0][1] + Wd[1][1] + Wd[2][1] + Wd[3][1]) / 4, cy = (yb + yt) / 2, v = (p, y) => [p[0], y, p[1]];
            const tri = (arr, A, B, C) => { const nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]), ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]), nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
              const mx = (A[0] + B[0] + C[0]) / 3 - cx, my = (A[1] + B[1] + C[1]) / 3 - cy, mz = (A[2] + B[2] + C[2]) / 3 - cz; if (nx * mx + ny * my + nz * mz >= 0) arr.push(...A, ...B, ...C); else arr.push(...A, ...C, ...B); };
            tri(posTop, v(Wd[0], yt), v(Wd[1], yt), v(Wd[2], yt)); tri(posTop, v(Wd[0], yt), v(Wd[2], yt), v(Wd[3], yt));
            tri(posSide, v(Wd[0], yb), v(Wd[1], yb), v(Wd[2], yb)); tri(posSide, v(Wd[0], yb), v(Wd[2], yb), v(Wd[3], yb));
            for (let i = 0; i < 4; i++) { const A = Wd[i], B = Wd[(i + 1) % 4]; tri(posSide, v(A, yb), v(B, yb), v(B, yt)); tri(posSide, v(A, yb), v(B, yt), v(A, yt)); }
          };
          const bar = (A, ya, B, yb) => { const pa = tfp(A), pb = tfp(B), va = new THREE.Vector3(pa[0], ya, pa[1]), vb = new THREE.Vector3(pb[0], yb, pb[1]), L2 = va.distanceTo(vb); if (L2 < 0.01) return; const g = new THREE.BoxGeometry(0.05, 0.05, L2); g.applyMatrix4(new THREE.Matrix4().lookAt(va, vb, new THREE.Vector3(0, 1, 0)).setPosition(va.clone().add(vb).multiplyScalar(0.5))); put(Mt.metal, g); };
          for (let st = 0; st < NS; st++) {
            const t0 = th(st), t1 = th(st + 1), i0 = Pt(t0, Ac), o0 = Pt(t0, Ap), o1 = Pt(t1, Ap), i1 = Pt(t1, Ac), top = y0 + (st + 1) * hs;
            prism([i0, o0, o1, i1], top - TH, top);
            pushWalk(i0, o0, o1, top, top, top); pushWalk(i0, o1, i1, top, top, top);
            if (st >= 1 && st <= NS - 2) addWall(o0, o1, top - 0.5, top + 0.95, 0.05);   // buitenrand; de eerste en laatste tree blijven open (in- en uitstap)
            addWall(i0, i1, y0, y0 + rise + 1.0, 0.05);
          }
          const mk = (arr, mat) => { if (!arr.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(arr.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); put(mat, g); };
          mk(posTop, Mt.wl.wood); mk(posSide, Mt.step);
          { const pc = tfp(a), rc = Ac / 0.866, g = new THREE.CylinderGeometry(rc, rc, rise + 1.05, 6); g.translate(pc[0], y0 + (rise + 1.05) / 2, pc[1]); put(Mt.metal, g); }   // zeshoekige kern
          for (let kk = 1; kk <= NS - 1; kk++) {   // leuning op palen langs de buitenkant, van tree 1 tot en met 10
            const A = Pt(th(kk), Ap), yk = y0 + kk * hs; { const p2 = tfp(A), g = new THREE.CylinderGeometry(0.03, 0.03, 0.95 + TH, 6); g.translate(p2[0], yk - TH + (0.95 + TH) / 2, p2[1]); put(Mt.metal, g); }
            if (kk < NS - 1) bar(A, yk + 0.95, Pt(th(kk + 1), Ap), yk + hs + 0.95);
          }
          // balustrade rond het gat in de vloer erboven, op vloerhoogte: het stuk muur per tree (hierboven, addWall) loopt schuin
          // mee omhoog en blokkeert het gat alleen vlak bij de uitstap op de goede hoogte — verderop (30°–210°) ligt die veel
          // te laag voor de bovenverdieping en kon je er zo in lopen. Deze rand (addWall, dus ook echt tegenhouden) staat vast
          // op vloerhoogte en dekt dezelfde boog als het gat (0°–330°); het laatste stuk (330°–360°) is waar de vloer heel blijft.
          { const topY = y0 + rise;
            for (let kk = 0; kk <= NS - 3; kk++) { const A = Pt(th(kk), Ap), B = Pt(th(kk + 1), Ap); const p2 = tfp(A), g = new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6); g.translate(p2[0], topY + 0.475, p2[1]); put(Mt.metal, g); bar(A, topY + 0.95, B, topY + 0.95); addWall(A, B, topY, topY + 0.95, 0.05); }
            for (let kk = NS - 2; kk <= NS - 1; kk++) { const A = Pt(th(kk), Ap), p2 = tfp(A), g = new THREE.CylinderGeometry(0.03, 0.03, 0.95, 6); g.translate(p2[0], topY + 0.475, p2[1]); put(Mt.metal, g); }   // laatste twee treden: hier blijft de vloer heel, dat is de uitstap
          }
          continue;
        }
        if (S.k === 'hexramp') {   // schans: het hele vak is een helling van de instapzijde (maaiveld) naar de overkant (3 m)
          const c = mv2CellXZ(S.q || 0, S.r || 0), f = FRAMES[(S.side || 0) % 6], ex = -f.nx, ez = -f.nz, lx = -ez, lz = ex;   // e: richting van de helling (instapzijde → uitstapzijde), l: dwars
          const pt = (u, lat) => [c[0] + ex * u + lx * lat, c[1] + ez * u + lz * lat], hz = u => y0 + rise * (u + INNER) / (2 * INNER);
          // bovenvlak: middenstrook (vlak) en twee gewrongen zijdriehoeken tot aan de punten (die liggen op 3 m)
          const tri = (A, ya, B, yb, C, yc) => [[A, ya], [B, yb], [C, yc]];
          const faces = [tri(pt(-INNER, -4.5), hz(-INNER), pt(INNER, 4.5), hz(INNER), pt(-INNER, 4.5), hz(-INNER)), tri(pt(-INNER, -4.5), hz(-INNER), pt(INNER, -4.5), hz(INNER), pt(INNER, 4.5), hz(INNER)),
            tri(pt(-INNER, 4.5), y0, pt(INNER, 4.5), y0 + rise, pt(0, 9), y0 + rise), tri(pt(-INNER, -4.5), y0, pt(0, -9), y0 + rise, pt(INNER, -4.5), y0 + rise)];
          const pos = [], uv = [];
          for (const F of faces) {
            const W3 = F.map(([p, y]) => { const Wp = tfp(p); return [Wp[0], y, Wp[1]]; }), ny = (W3[1][2] - W3[0][2]) * (W3[2][0] - W3[0][0]) - (W3[1][0] - W3[0][0]) * (W3[2][2] - W3[0][2]);
            for (const i of (ny < 0 ? [0, 2, 1] : [0, 1, 2])) { pos.push(W3[i][0], W3[i][1], W3[i][2]); uv.push(W3[i][0] / 2, W3[i][2] / 2); }   // normaal omhoog
            pushWalk(F[0][0], F[1][0], F[2][0], F[0][1], F[1][1], F[2][1]);
          }
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); put(Mt.rampTop, g);
          // zijkanten: onder de uitstapzijde en de twee zijden ernaast een volle wand, naast de instap een driehoek
          const quad = (A, ya0, ya1, B, yb0, yb1) => { const P1 = tfp(A), P2 = tfp(B); return [P1[0], ya0, P1[1], P2[0], yb0, P2[1], P2[0], yb1, P2[1], P1[0], ya0, P1[1], P2[0], yb1, P2[1], P1[0], ya1, P1[1]]; };
          const sp = [], top = y0 + rise;
          sp.push(...quad(pt(INNER, 4.5), y0, top, pt(INNER, -4.5), y0, top));                 // uitstapzijde (onder de bovenrand)
          sp.push(...quad(pt(0, 9), y0, top, pt(INNER, 4.5), y0, top), ...quad(pt(INNER, -4.5), y0, top, pt(0, -9), y0, top));   // zijden naast de uitstap
          sp.push(...quad(pt(-INNER, 4.5), y0, y0, pt(0, 9), y0, top), ...quad(pt(0, -9), y0, top, pt(-INNER, -4.5), y0, y0));   // driehoeken naast de instap
          const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(sp.length / 3 * 2).fill(0), 2)); g2.computeVertexNormals(); put(Mt.slab, g2);
          const g3 = g2.clone(); const idx = []; for (let i = 0; i < sp.length / 3; i += 3) idx.push(i, i + 2, i + 1); g3.setIndex(idx); put(Mt.slab, g3.toNonIndexed());   // ook van binnen zichtbaar
          { const rail = (A, ya, B, yb) => { for (const [h, t] of [[1.0, 0.05], [0.47, 0.03]]) { const pa = tfp(A), pb = tfp(B), va = new THREE.Vector3(pa[0], ya + h, pa[1]), vb = new THREE.Vector3(pb[0], yb + h, pb[1]), L2 = va.distanceTo(vb); const g = new THREE.BoxGeometry(t, t, L2); g.applyMatrix4(new THREE.Matrix4().lookAt(va, vb, new THREE.Vector3(0, 1, 0))); g.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2); put(Mt.metal, g); } for (const [P, yy] of [[A, ya], [B, yb]]) { const p2 = tfp(P), g = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6); g.translate(p2[0], yy + 0.5, p2[1]); put(Mt.metal, g); } };
            for (const sg of [1, -1]) { rail(pt(-INNER, sg * 4.5), y0, pt(0, sg * 9), top); rail(pt(0, sg * 9), top, pt(INNER, sg * 4.5), top); } }   // zichtbare leuning langs de zijranden
          addWall(pt(INNER, 4.5), pt(INNER, -4.5), y0, top - 0.15, 0.08);   // uitstapzijde: dicht van onderen, maar bovenaan loop je eraf de verdieping op
          for (const [A, B] of [[pt(0, 9), pt(INNER, 4.5)], [pt(INNER, -4.5), pt(0, -9)], [pt(-INNER, 4.5), pt(0, 9)], [pt(0, -9), pt(-INNER, -4.5)]]) addWall(A, B, y0, top + 1, 0.08);   // zijranden: niet van de helling vallen
          continue;
        }
        if (S.k === 'u') {   // bordestrap (naar trappen.dae): twee steken naast elkaar, elk één rij breed, met een bordes over beide rijen
          // dat aan het eind schuin (60°) is afgesneden, zoals de rand van een zeshoek. Treden van 0,1875 m, 0,3 m dik, zwevend.
          const sd = S.side || 1, h1 = rise / 2, NH = Math.max(2, Math.round(h1 / 0.1875)), run = len / NH, rs = h1 / NH, TH = 0.3, c2 = sd * w, yl = y0 + h1, yt = y0 + rise;
          for (let s = 0; s < NH; s++) {
            const t1 = y0 + (s + 1) * rs; wallBox(Mt.step, at(s * run, 0), at((s + 1) * run, 0), Math.max(y0, t1 - rs - TH), t1, w);
            pushWalk(at(s * run, -w / 2), at((s + 1) * run, w / 2), at(s * run, w / 2), t1, t1, t1); pushWalk(at(s * run, -w / 2), at((s + 1) * run, -w / 2), at((s + 1) * run, w / 2), t1, t1, t1);
            const t2 = yl + (s + 1) * rs, ua = len - s * run, ub = len - (s + 1) * run; wallBox(Mt.step, at(ua, c2), at(ub, c2), t2 - rs - TH, t2, w);
            pushWalk(at(ua, c2 - w / 2), at(ub, c2 + w / 2), at(ua, c2 + w / 2), t2, t2, t2); pushWalk(at(ua, c2 - w / 2), at(ub, c2 - w / 2), at(ub, c2 + w / 2), t2, t2, t2);
          }
          const oA = -sd * w / 2, oB = c2 + sd * w / 2, cut = 2 * w / SQ3, LP = [at(len, oA), at(len, oB), at(len + 0.25 + cut, oB), at(len + 0.25, oA)];
          slabPoly(Mt.step, LP, yl - TH, yl); pushWalk(LP[0], LP[1], LP[2], yl, yl, yl); pushWalk(LP[0], LP[2], LP[3], yl, yl, yl);
          pushWalk(at(-1, c2 - w / 2), at(0, c2 + w / 2), at(-1, c2 + w / 2), yt, yt, yt); pushWalk(at(-1, c2 - w / 2), at(0, c2 - w / 2), at(0, c2 + w / 2), yt, yt, yt);   // overloop boven
          // leuningen: buitenkant steek 1, tussen de steken, buitenkant steek 2, rond het bordes
          const eA = oA + sd * 0.05, eB = oB - sd * 0.05, mid = sd * w / 2, LPi = [at(len + 0.2, eA), at(len + 0.2 + cut, eB)];
          railBar(Mt.metal, at(0, eA), y0 + 0.95, at(len, eA), yl + 0.95); railBar(Mt.metal, at(0, mid), yt + 0.95, at(len, mid), yl + 0.95); railBar(Mt.metal, at(0, eB), yt + 0.95, at(len, eB), yl + 0.95);
          railBar(Mt.metal, at(len, eA), yl + 0.95, LPi[0], yl + 0.95); railBar(Mt.metal, LPi[0], yl + 0.95, LPi[1], yl + 0.95); railBar(Mt.metal, LPi[1], yl + 0.95, at(len, eB), yl + 0.95);
          for (const f of [0, 0.5, 1]) { railPost(Mt.metal, at(f * len, eA), y0 + f * h1, y0 + f * h1 + 0.95); railPost(Mt.metal, at(f * len, eB), yl + (1 - f) * h1, yl + (1 - f) * h1 + 0.95); }
          for (const p of LPi) railPost(Mt.metal, p, yl, yl + 0.95);
          addWall(at(0, eA), at(len, eA), y0, yl + 0.95, 0.05); addWall(at(0, mid), at(len, mid), y0, yt + 0.9, 0.05); addWall(at(0, eB), at(len, eB), y0 + 0.3, yt + 0.95, 0.05);
          addWall(at(len, eA), LPi[0], yl - 0.3, yl + 0.95, 0.05); addWall(LPi[0], LPi[1], yl - 0.3, yl + 0.95, 0.05); addWall(LPi[1], at(len, eB), yl - 0.3, yl + 0.95, 0.05);
        } else if (S.k === 'ramp') {
          const g = new THREE.BufferGeometry(), P = [at(0, -w / 2), at(0, w / 2), at(len, w / 2), at(len, -w / 2)].map(tfp), yb = y0 + 0.05, yt = y0 + rise;
          const pos = [P[0][0], yb, P[0][1], P[2][0], yt, P[2][1], P[1][0], yb, P[1][1], P[0][0], yb, P[0][1], P[3][0], yt, P[3][1], P[2][0], yt, P[2][1]];
          // zijkanten en onderkant: dichte wig
          const side = (i0, i1, y0a, y1a) => pos.push(P[i0][0], y0, P[i0][1], P[i1][0], y0, P[i1][1], P[i1][0], y1a, P[i1][1], P[i0][0], y0, P[i0][1], P[i1][0], y1a, P[i1][1], P[i0][0], y0a, P[i0][1]);
          side(0, 3, yb, yt); side(2, 1, yt, yb); side(3, 2, yt, yt);
          { const ny = (pos[4] - pos[1]) * 0 + ((pos[5] - pos[2]) * (pos[6] - pos[0]) - (pos[3] - pos[0]) * (pos[8] - pos[2])); if (ny < 0) for (let t = 0; t < pos.length; t += 9) for (let c = 0; c < 3; c++) { const q = pos[t + 3 + c]; pos[t + 3 + c] = pos[t + 6 + c]; pos[t + 6 + c] = q; } }   // bovenvlak naar boven (anders zag je de helling van onderen: donker)
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); put(Mt.rampTop, g);
          pushWalk(at(0, -w / 2), at(len, w / 2), at(0, w / 2), yb, yt, yb); pushWalk(at(0, -w / 2), at(len, -w / 2), at(len, w / 2), yb, yt, yt);
          landing(len, yt); landing(-1, y0 + 0.02);
          addWall(at(0, -w / 2), at(len, -w / 2), y0, yt, 0.05); addWall(at(0, w / 2), at(len, w / 2), y0, yt, 0.05);
        } else if (S.k === 'esc') {   // roltrap: metalen treden in een schuine bak, glazen zijkanten met een zwarte leuning erop
          const N = Math.max(2, Math.round(rise / 0.2)), run = len / N, rs = rise / N, yt = y0 + rise, hw = w / 2 - 0.15;
          for (let s = 0; s < N; s++) { const top = y0 + (s + 1) * rs; wallBox(Mt.metal, at(s * run, 0), at((s + 1) * run, 0), top - 0.1, top, w - 0.3); pushWalk(at(s * run, -hw), at((s + 1) * run, hw), at(s * run, hw), top, top, top); pushWalk(at(s * run, -hw), at((s + 1) * run, -hw), at((s + 1) * run, hw), top, top, top); }
          { const pa = tfp(at(0, 0)), pb = tfp(at(len, 0)), va = new THREE.Vector3(pa[0], y0 - 0.35, pa[1]), vb = new THREE.Vector3(pb[0], yt - 0.35, pb[1]), L2 = va.distanceTo(vb), g = new THREE.BoxGeometry(w, 0.55, L2); g.applyMatrix4(new THREE.Matrix4().lookAt(va, vb, new THREE.Vector3(0, 1, 0))); g.translate((va.x + vb.x) / 2, (va.y + vb.y) / 2, (va.z + vb.z) / 2); put(Mt.trim, g); }   // de bak
          for (const sg of [-1, 1]) {
            const A = tfp(at(-0.4, sg * (w / 2 - 0.05))), B = tfp(at(len + 0.4, sg * (w / 2 - 0.05))), pos = [A[0], y0 + 0.05, A[1], B[0], yt + 0.05, B[1], B[0], yt + 1.0, B[1], A[0], y0 + 0.05, A[1], B[0], yt + 1.0, B[1], A[0], y0 + 1.0, A[1]];
            for (let i = 0; i < 18; i += 9) pos.push(pos[i], pos[i + 1], pos[i + 2], pos[i + 6], pos[i + 7], pos[i + 8], pos[i + 3], pos[i + 4], pos[i + 5]);   // van beide kanten zichtbaar
            const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); put(Mt.wl.glass, g);
            railBar(Mt.trim, at(-0.4, sg * (w / 2 - 0.05)), y0 + 1.0, at(len + 0.4, sg * (w / 2 - 0.05)), yt + 1.0);
            addWall(at(0.3, sg * (w / 2 - 0.05)), at(len, sg * (w / 2 - 0.05)), y0 + 0.2, yt + 1.0, 0.05);
          }
          landing(len, yt); landing(-1, y0 + 0.02);
        } else if (S.k === 'trib') {   // tribune: volle zitrijen van ± 0,85 m diep (geen zwevende treden), leuning langs de bovenrand
          const N = Math.max(2, Math.round(len / 0.85)), run = len / N, rs = rise / N, yt = y0 + rise;
          for (let s = 0; s < N; s++) { const top = y0 + (s + 1) * rs; wallBox(Mt.step, at(s * run, 0), at((s + 1) * run, 0), y0, top, w); wallBox(Mt.wl.wood || Mt.step, at(s * run + run * 0.55, 0), at((s + 1) * run - 0.05, 0), top, top + 0.04, w - 0.2);   // zitplank achterop elke rij
            pushWalk(at(s * run, -w / 2), at((s + 1) * run, w / 2), at(s * run, w / 2), top, top, top); pushWalk(at(s * run, -w / 2), at((s + 1) * run, -w / 2), at((s + 1) * run, w / 2), top, top, top); }
          landing(-1, y0 + 0.02);
          railBar(Mt.metal, at(len - 0.05, -w / 2), yt + 1.0, at(len - 0.05, w / 2), yt + 1.0); for (const f of [0, 0.5, 1]) railPost(Mt.metal, at(len - 0.05, -w / 2 + f * w), yt, yt + 1.0); addWall(at(len - 0.05, -w / 2), at(len - 0.05, w / 2), yt, yt + 1.0, 0.05);
        } else {   // rechte steek (naar trappen.dae): 16 treden per 3 m (0,1875 m), zwevend (0,3 m dik), met een driehoekig bordes boven
          const N = Math.max(2, Math.round(rise / 0.1875)), run = len / N, rs = rise / N, TH = 0.3, yt = y0 + rise;
          for (let s = 0; s < N; s++) { const top = y0 + (s + 1) * rs; wallBox(Mt.step, at(s * run, 0), at((s + 1) * run, 0), Math.max(y0, top - rs - TH), top, w); pushWalk(at(s * run, -w / 2), at((s + 1) * run, w / 2), at(s * run, w / 2), top, top, top); pushWalk(at(s * run, -w / 2), at((s + 1) * run, -w / 2), at((s + 1) * run, w / 2), top, top, top); }
          const TP = [at(len, -w / 2), at(len, w / 2), at(len + w * SQ3 / 2, 0)];   // gelijkzijdige driehoek op de bovenste tree
          slabPoly(Mt.step, TP, yt - TH, yt - 0.005); pushWalk(TP[0], TP[2], TP[1], yt, yt, yt);
          landing(len, yt); landing(-1, y0 + 0.02);
          // leuning aan beide kanten: schuine stang op palen, tot de verdieping erboven
          for (const sg of [-1, 1]) { const e = sg * (w / 2 - 0.05); railBar(Mt.metal, at(0, e), y0 + 0.95, at(len, e), yt + 0.95); for (const f of [0, 0.5, 1]) railPost(Mt.metal, at(f * len, e), y0 + f * rise, y0 + f * rise + 0.95); addWall(at(0.6, e), at(len, e), y0 + 0.3, yt + 0.95, 0.05); }
        }
      }
      // --- daken per vak ---
      for (const id in L.r) {
        const [q, r] = id.split(',').map(Number), c = mv2CellXZ(q, r), kind = L.r[id];
        // het dak volgt de muren van dat vak op deze verdieping (een gebouw van ¾ krijgt een dak van ¾), met 35 cm overstek
        const rr = mv2RoofFit(m, li, q, r), ro = rr + (rr < R ? 0.35 : 0), yb = y0 + LH, h = 5 * rr / R;
        if (kind === 'flat') { const g = new THREE.CylinderGeometry(rr + (rr < R ? 0.15 : -0.1), rr + (rr < R ? 0.15 : -0.1), 0.3, 6); const W = tf(c[0], c[1]), W2 = tf(c[0] + 1, c[1]); g.rotateY(Math.atan2(-(W2[1] - W[1]), W2[0] - W[0])); g.translate(W[0], yb + 0.15, W[1]); put(Mt.slab, g); continue; }
        const V = k => { const a = (30 + 60 * k) * Math.PI / 180, p = tf(c[0] + Math.cos(a) * ro, c[1] + Math.sin(a) * ro); return [p[0], yb, p[1]]; }, up = (P3, y) => [P3[0], y, P3[2]], top = [...(() => { const p = tf(c[0], c[1]); return [p[0], yb + h, p[1]]; })()];
        const pos = [], under = [], tri3 = (A, B, C) => { const ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]); if (ny >= 0) { pos.push(...A, ...B, ...C); under.push(...A, ...C, ...B); } else { pos.push(...A, ...C, ...B); under.push(...A, ...B, ...C); } };   // onderkant: alleen naar beneden gekeerd
        const g6 = /^gable(\d)$/.exec(kind || '');
        if (g6) {   // zadeldak: de nok loopt van hoek a naar de overstaande hoek; twee dakvlakken, en boven de muur bij die hoeken een driehoek muur
          const a = +g6[1] % 3, Va = up(V(a), yb + h), Vb = up(V(a + 3), yb + h);
          tri3(Va, V(a + 1), V(a + 2)); tri3(Va, V(a + 2), Vb); tri3(Vb, V(a + 4), V(a + 5)); tri3(Vb, V(a + 5), Va);
          let wm = null; { const cnt = {}; for (const wid in L.w) { const Wd = L.w[wid]; if (!Wd || Wd.m === 'fence' || Wd.m === 'hedge') continue; cnt[Wd.m] = (cnt[Wd.m] || 0) + 1; } let best = 0; for (const k2 in cnt) if (cnt[k2] > best) { best = cnt[k2]; wm = k2; } }
          const Wl = k => { const an = (30 + 60 * k) * Math.PI / 180, p = tf(c[0] + Math.cos(an) * rr, c[1] + Math.sin(an) * rr); return [p[0], yb, p[1]]; }, gp = [];
          for (const k of [a, a + 3]) { const T = up(Wl(k), yb + h * rr / ro); for (const [P1, P2] of [[Wl(k - 1 + 6), Wl(k)], [Wl(k), Wl(k + 1)]]) gp.push(...P1, ...T, ...P2, ...P1, ...P2, ...T); }
          const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(gp.map((v, i) => i % 3 === 1 ? v / 3 : 0).filter((_, i) => i % 3 !== 2), 2)); gg.computeVertexNormals(); put(Mt.wl[wm] || Mt.wl.brick, gg);
        } else for (let k = 0; k < 6; k++) tri3(top, V(k), V(k + 1));   // schilddak (piramide)
        for (const arr of [pos, under]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(arr.map((v, i) => (i % 3 === 0 ? v : i % 3 === 2 ? v : null)).filter(v => v !== null).map(v => v / 3), 2)); g.computeVertexNormals(); put(arr === pos ? Mt.roof : Mt.ceiling || Mt.roof, g); }
      }
      // --- voorwerpen ---
      for (const O0 of L.o || []) {
        let O = O0;
        if (li === roofLi && mask) { const Wm = tf(O.x, O.z); if (mask(Wm[0], Wm[1])) continue; }   // op een dak waar een module op staat: niets
        if (li === roofLi && opts.roofStyle && opts.roofStyle !== 'top') {   // binnen in een gebouw (hal, overdekte straat): klein groen
          if (O.t === 'bush') continue;
          if (O.t === 'tree') O = Object.assign({}, O, { t: opts.roofStyle === 'hall' ? 'fountain' : 'planter' });
        }
        const W = tf(O.x, O.z), W2 = tf(O.x + Math.cos(O.rot || 0), O.z + Math.sin(O.rot || 0)), ang = Math.atan2(-(W2[1] - W[1]), W2[0] - W[0]);
        if ((opts.baseLv || 0) + li === 0 && OFF_ROAD.has(O.t)) { cand.push([W[0], W[1]]); if (opts.offRoad && opts.offRoad(W[0], W[1])) continue; }   // bomen, struiken en bankjes nooit op een weg of stoep
        const place = (mat, g) => { g.rotateY(ang); g.translate(W[0], y0, W[1]); put(mat, g); };
        const box = (mat, sx, sy, sz, x, y, z) => place(mat, new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
        const col = (mat, rt, rb, h, x, y, z, n = 8) => place(mat, new THREE.CylinderGeometry(rt, rb, h, n).translate(x, y + h / 2, z));
        const hj = (Math.round(O.x * 7) * 31 + Math.round(O.z * 13) * 17) & 1023;
        const solid = (r, h) => walls.push({ ax: W[0], az: W[1], bx: W[0], bz: W[1], y0, y1: y0 + h, half: r });
        // langwerpig voorwerp (stelling, toonbank, bank): een lijnstuk langs de lengte, niet een grote cirkel die de doorgang dichtzet
        const solidLen = (len, half, h) => { const ux = Math.cos(ang) * len / 2, uz = -Math.sin(ang) * len / 2; walls.push({ ax: W[0] - ux, az: W[1] - uz, bx: W[0] + ux, bz: W[1] + uz, y0, y1: y0 + h, half }); };
        switch (O.t) {
          case 'tree': { const sc = 0.8 + (hj % 4) * 0.08; col(Mt.trunk, 0.18, 0.26, 2.8, 0, 0, 0, 6); place(Mt.leaf[hj % 3], new THREE.IcosahedronGeometry(2.1 * sc, 0).translate(0, 2.8 + 1.6 * sc, 0)); solid(0.3, 3); break; }
          case 'bush': place(Mt.leaf[(hj + 1) % 3], new THREE.IcosahedronGeometry(0.9, 0).scale(1, 0.8, 1).translate(0, 0.7, 0)); solid(0.6, 1.3); break;
          case 'bench': box(Mt.bench, 1.8, 0.06, 0.45, 0, 0.45, 0); box(Mt.bench, 1.8, 0.45, 0.06, 0, 0.72, -0.22); box(Mt.metal, 0.06, 0.45, 0.4, -0.8, 0.22, 0); box(Mt.metal, 0.06, 0.45, 0.4, 0.8, 0.22, 0); solidLen(1.8, 0.25, 0.9); break;
          case 'lamp': col(Mt.lamp, 0.05, 0.08, 4, 0, 0, 0); place(Mt.lampGlow, new THREE.SphereGeometry(0.22, 8, 6).translate(0, 4.05, 0)); solid(0.15, 4); break;
          case 'pillar': col(Mt.wl.stone, 0.3, 0.35, LH, 0, 0, 0, 10); box(Mt.wl.stone, 0.9, 0.12, 0.9, 0, LH - 0.06, 0); solid(0.35, LH); break;
          case 'table': col(Mt.metal, 0.04, 0.06, 0.72, 0, 0, 0, 6); col(Mt.bench, 0.6, 0.6, 0.04, 0, 0.72, 0, 12); for (let i = 0; i < 3; i++) { const a = i * 2.1, x = Math.cos(a) * 0.9, z = Math.sin(a) * 0.9; col(Mt.metal, 0.2, 0.2, 0.45, x, 0, z, 8); } solid(0.9, 0.8); break;
          case 'planter': col(Mt.slab, 0.75, 0.65, 0.5, 0, 0, 0, 8); place(Mt.leaf[2], new THREE.IcosahedronGeometry(0.55, 0).scale(1.2, 0.7, 1.2).translate(0, 0.75, 0)); for (let i = 0; i < 5; i++) { const a = i * 1.26, c = ['#e64a3c', '#f2b233', '#e9e6dc', '#d05a9a', '#f28c33'][i]; place(new THREE.MeshBasicMaterial({ color: c }), new THREE.SphereGeometry(0.09, 5, 4).translate(Math.cos(a) * 0.4, 0.95, Math.sin(a) * 0.4)); } solid(0.75, 1); break;
          case 'fountain': col(Mt.wl.stone, 1.8, 1.9, 0.5, 0, 0, 0, 12); col(Mt.water, 1.6, 1.6, 0.1, 0, 0.42, 0, 12); col(Mt.wl.stone, 0.12, 0.18, 1.3, 0, 0.4, 0, 8); col(Mt.wl.stone, 0.6, 0.5, 0.12, 0, 1.6, 0, 10); solid(1.9, 0.6); break;
          case 'bin': col(Mt.bin, 0.25, 0.22, 0.9, 0, 0, 0, 8); solid(0.25, 0.9); break;
          case 'shelf': { box(Mt.wl.panel, 2.4, 1.9, 0.5, 0, 0.95, 0); for (const y of [0.45, 0.95, 1.45]) box(Mt.slab, 2.3, 0.04, 0.46, 0, y, 0.02); for (let i = 0; i < 6; i++) { const k = (hj + i * 37) % 5; box(new THREE.MeshStandardMaterial({ color: ['#d94b3a', '#3a7fd9', '#e9c04a', '#48a35a', '#e6e1d8'][k], roughness: 0.8 }), 0.32, 0.26, 0.3, -1 + i * 0.4, 0.45 + 0.5 * (i % 3) + 0.13, 0.04); } solidLen(2.4, 0.27, 1.9); break; }
          case 'counter': box(Mt.wl.slats, 2.2, 1.0, 0.7, 0, 0.5, 0); box(Mt.slab, 2.3, 0.05, 0.8, 0, 1.02, 0); box(Mt.metal, 0.35, 0.3, 0.3, 0.6, 1.2, 0); solidLen(2.2, 0.37, 1.05); break;
          case 'sign': { col(Mt.metal, 0.05, 0.06, 2.6, 0, 0, 0, 6); box(Mt.metal, 1.6, 0.6, 0.08, 0, 2.6, 0); box(new THREE.MeshBasicMaterial({ color: ['#ff4f6d', '#39b6ff', '#ffd23f', '#5de07a'][hj % 4] }), 1.5, 0.5, 0.1, 0, 2.6, 0); solid(0.1, 2.9); break; }
          case 'bike': for (let i = -2; i <= 2; i++) { box(Mt.metal, 0.04, 0.6, 0.6, i * 0.5, 0.3, 0); } box(Mt.metal, 2.3, 0.04, 0.04, 0, 0.6, 0.28); box(Mt.metal, 2.3, 0.04, 0.04, 0, 0.6, -0.28); solidLen(2.4, 0.32, 0.7); break;
          // ---- uitbreiding (lib10): voorzieningen, sport, buiten en inrichting ----
          case 'pump': box(om('#e9ece8'), 0.9, 1.5, 0.55, 0, 0.75, 0); box(om('#d9412e'), 0.95, 0.35, 0.6, 0, 1.55, 0); box(om('#2b3138'), 0.5, 0.35, 0.05, 0, 1.0, 0.3); box(om('#2b3138'), 0.06, 0.6, 0.06, 0.52, 0.8, 0.1); solid(0.5, 1.8); break;
          case 'charger': box(om('#2f3a44'), 0.32, 1.35, 0.25, 0, 0.68, 0); box(new THREE.MeshBasicMaterial({ color: '#4fe08a' }), 0.2, 0.05, 0.27, 0, 1.15, 0); box(om('#1c2228'), 0.05, 0.4, 0.05, 0.2, 0.7, 0.1); solid(0.25, 1.4); break;
          case 'solar': { const pv = om('#203a63', 0.35), g = new THREE.BoxGeometry(3.4, 0.05, 1.6); g.rotateX(-0.42); g.translate(0, 0.95, 0); place(pv, g); const gl = new THREE.BoxGeometry(3.42, 0.02, 0.04); gl.rotateX(-0.42); gl.translate(0, 0.98, 0); place(om('#c9ced3'), gl); for (const x of [-1.4, 1.4]) { box(Mt.metal, 0.06, 1.3, 0.06, x, 0.65, -0.55); box(Mt.metal, 0.06, 0.6, 0.06, x, 0.3, 0.55); } solidLen(3.4, 0.7, 1.2); break; }
          case 'turbine': { const wt = om('#eef0ee'); col(wt, 0.35, 0.65, 22, 0, 0, 0, 10); box(wt, 1.0, 1.0, 2.6, 0, 22, 0.2); col(wt, 0.3, 0.45, 0.6, 0, 21.7, 1.75, 8); for (let k = 0; k < 3; k++) { const g = new THREE.BoxGeometry(0.45, 9.5, 0.12); g.translate(0, 4.9, 0); g.rotateZ(k * Math.PI * 2 / 3 + hj * 0.01); g.translate(0, 22, 1.65); place(wt, g); } solid(0.7, 22); break; }
          case 'chimney': col(Mt.wl.brick || Mt.bench, 0.85, 1.25, 16, 0, 0, 0, 12); col(om('#3a3a38'), 0.9, 0.9, 0.5, 0, 16, 0, 12); solid(1.25, 16); break;
          case 'container': { const cc = ['#3f7d4f', '#2f5f9a', '#7d7f80', '#a8552f'][hj % 4]; box(om(cc), 2.4, 1.3, 1.4, 0, 0.7, 0); box(om('#2a2e30'), 2.45, 0.08, 1.45, 0, 1.38, 0); solidLen(2.4, 0.75, 1.45); break; }
          case 'goal': { const wg = om('#f3f4f1'); for (const x of [-1.8, 1.8]) box(wg, 0.1, 2.0, 0.1, x, 1.0, 0); box(wg, 3.7, 0.1, 0.1, 0, 2.0, 0); const net = om('#d8dcd6', 0.9); net.transparent = true; net.opacity = 0.45; const g = new THREE.BoxGeometry(3.6, 2.0, 0.02); g.rotateX(0.5); g.translate(0, 1.0, -0.5); place(net, g); solidLen(3.7, 0.1, 2.0); break; }
          case 'grave': box(Mt.wl.stone || Mt.step, 0.65, 0.85, 0.14, 0, 0.42, -0.6); box(om('#8a8f86'), 0.75, 0.08, 1.7, 0, 0.04, 0.2); solid(0.4, 0.9); break;
          case 'boat': { const hull = om(['#f1f1ec', '#2f5f9a', '#a8402f'][hj % 3]); box(hull, 4.0, 0.6, 1.6, 0, 0.05, 0); box(hull, 3.4, 0.25, 1.3, 0, -0.35, 0); box(om('#9b6a3c'), 3.6, 0.04, 1.4, 0, 0.36, 0); box(om('#eef0ee'), 1.4, 0.8, 1.1, -0.6, 0.78, 0); box(Mt.wl.glass, 1.42, 0.3, 1.12, -0.6, 0.95, 0); solidLen(4.2, 0.85, 1.2); break; }
          case 'shelter': { box(Mt.wl.glass, 3.0, 2.2, 0.04, 0, 1.15, 0); for (const x of [-1.5, 1.5]) box(Mt.metal, 0.08, 2.4, 0.08, x, 1.2, 0); box(om('#2b3138'), 3.3, 0.1, 1.5, 0, 2.45, 0.55); box(Mt.bench, 2.2, 0.06, 0.4, 0, 0.5, 0.3); box(new THREE.MeshBasicMaterial({ color: '#ffd23f' }), 0.5, 0.5, 0.05, 1.35, 2.15, 0.05); solidLen(3.0, 0.1, 2.4); break; }
          case 'slide': { const sl = om('#e8453c'); box(Mt.metal, 0.06, 1.6, 0.06, -0.5, 0.8, -0.4); box(Mt.metal, 0.06, 1.6, 0.06, 0.5, 0.8, -0.4); box(om('#f2b233'), 1.1, 0.08, 0.9, 0, 1.6, -0.4); const g = new THREE.BoxGeometry(0.7, 0.06, 2.8); g.rotateX(0.62); g.translate(0, 0.85, 0.75); place(sl, g); solid(0.8, 2.0); break; }
          case 'swing': { for (const x of [-1.3, 1.3]) for (const z of [-0.6, 0.6]) { const g = new THREE.BoxGeometry(0.08, 2.4, 0.08); g.rotateX(z > 0 ? -0.25 : 0.25); g.translate(x, 1.15, z * 0.6); place(Mt.metal, g); } box(Mt.metal, 2.7, 0.08, 0.08, 0, 2.3, 0); for (const x of [-0.6, 0.6]) { box(om('#2b3138'), 0.03, 1.8, 0.03, x - 0.2, 1.4, 0); box(om('#2b3138'), 0.03, 1.8, 0.03, x + 0.2, 1.4, 0); box(om('#e8453c'), 0.5, 0.05, 0.25, x, 0.5, 0); } walls.push({ ax: W[0], az: W[1], bx: W[0], bz: W[1], y0, y1: y0 + 2.4, half: 0.2 }); break; }
          case 'sheep': { const wl = om('#ecebe2', 0.95); place(wl, new THREE.SphereGeometry(0.42, 8, 6).scale(1.5, 1, 1).translate(0, 0.65, 0)); place(om('#2b2b28'), new THREE.SphereGeometry(0.18, 6, 5).scale(1.2, 1, 1).translate(0.68, 0.78, 0)); for (const [x, z] of [[-0.35, -0.2], [-0.35, 0.2], [0.35, -0.2], [0.35, 0.2]]) box(om('#2b2b28'), 0.08, 0.4, 0.08, x, 0.2, z); solid(0.45, 1.0); break; }
          case 'car': { const cc = om(['#c8372d', '#2f5f9a', '#e9ece8', '#2b3138', '#3f7d4f', '#d9a12e'][hj % 6], 0.45); box(cc, 4.2, 0.7, 1.8, 0, 0.55, 0); box(cc, 2.2, 0.6, 1.6, -0.2, 1.15, 0); box(Mt.wl.glass, 2.22, 0.45, 1.62, -0.2, 1.17, 0); for (const x of [-1.35, 1.35]) for (const z of [-0.85, 0.85]) place(om('#151719'), new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10).rotateX(Math.PI / 2).translate(x, 0.34, z)); solidLen(4.3, 0.95, 1.5); break; }
          case 'bed': box(Mt.bench, 2.0, 0.35, 1.6, 0, 0.18, 0); box(om('#f2f1ec'), 1.9, 0.2, 1.5, 0.05, 0.45, 0); box(om(['#4a6fa5', '#b55a4a', '#5f8f62'][hj % 3]), 1.2, 0.08, 1.52, 0.35, 0.58, 0); box(Mt.bench, 0.1, 0.9, 1.6, -1.0, 0.45, 0); solidLen(2.0, 0.85, 0.6); break;
          case 'sofa': { const sc = om(['#556b7a', '#8a5a44', '#3f5f4a'][hj % 3]); box(sc, 2.0, 0.45, 0.9, 0, 0.22, 0); box(sc, 2.0, 0.5, 0.22, 0, 0.7, -0.34); for (const x of [-0.95, 0.95]) box(sc, 0.18, 0.6, 0.9, x, 0.3, 0); solidLen(2.1, 0.5, 0.9); break; }
          case 'desk': box(om('#c9b28a'), 1.6, 0.05, 0.8, 0, 0.74, 0); for (const x of [-0.75, 0.75]) for (const z of [-0.35, 0.35]) box(Mt.metal, 0.04, 0.72, 0.04, x, 0.36, z); box(om('#1c2228'), 0.6, 0.38, 0.04, 0, 1.0, -0.25); box(new THREE.MeshBasicMaterial({ color: '#8fc3e8' }), 0.55, 0.32, 0.01, 0, 1.0, -0.22); solidLen(1.6, 0.45, 0.8); break;
          case 'kitchen': box(om('#f1f1ec'), 2.4, 0.88, 0.6, 0, 0.44, 0); box(om('#2b3138'), 2.45, 0.04, 0.64, 0, 0.9, 0); box(om('#c9ced3'), 0.5, 0.02, 0.4, -0.6, 0.93, 0); box(om('#f1f1ec'), 2.4, 0.6, 0.35, 0, 1.75, -0.12); solidLen(2.4, 0.35, 0.95); break;
          case 'screen': box(om('#f4f4f0', 0.9), 6.0, 3.0, 0.06, 0, 2.0, 0); box(om('#1c1c1c'), 6.2, 3.2, 0.04, 0, 2.0, -0.04); solidLen(6.0, 0.1, 3.5); break;
        }
      }
      if (walkPos.length) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(walkPos, 3));
        surfaces.push({ kind: 'tris', cx: origin[0], cz: origin[1], B: triBuckets(g), base: 0, bottom: lifted ? y0 - MV2.FLOOR_T : -0.3 });
      }
    }
    for (const [mat, list] of bags) { const mesh = new THREE.Mesh(mergeGeos(list), mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.own = true; group.add(mesh); }
    return { group, surfaces, walls, doors: doorsOut, cand, pieces: pieceList };
  }
  // zelfde uiterlijk = zelfde sleutel (veel modules maken eigen, gelijke materialen)
  const matKey = (mm, cast, recv) => [mm.type, mm.color && mm.color.getHex(), mm.map && mm.map.uuid, mm.transparent, mm.opacity, mm.side, mm.flatShading, mm.roughness, mm.metalness, mm.emissive && mm.emissive.getHex(), mm.emissiveIntensity, mm.vertexColors, mm.alphaTest, mm.depthWrite, mm.polygonOffset, cast, recv].join('|');
  const modBatchRefresh = () => batchMods(new Set((cells.inst || []).filter(I => I.m && I.m.v === 2)));
  // stukken van een module (voor het instorten): zelfde bouw als in de stad, maar elk stuk apart
  function modPiecesOf(I) {
    const e = modGroups.get(I); if (!e) return null; const o = cellToWorld(I.q, I.r), G = gH(I.q, I.r) + instLv(I) * MV2.LV_H;
    const b = mv2Build(I.m, mv2Tf(I.rot, I.q, I.r), [o.x, o.z], { stacked: instLv(I) > 0, roofMask: e.mask, roofStyle: e.style, skip: e.skip, baseLv: instLv(I), offRoad: (x, z) => offSpot(I, x, z), pieces: true });
    return { e, G, pieces: b.pieces };
  }
  // ---------- Samenvoegen per buurt ----------
  // Elke module bestaat uit een stuk of twaalf meshes (een per materiaal). Een stad met honderd modules is dan al ruim
  // tweeduizend tekenopdrachten, en elke opdracht kost de processor tijd (dat is op een telefoon het knelpunt). Daarom worden
  // de modules per buurt van 6×6 vakken per materiaal samengevoegd tot één mesh. De losse meshes van de modules blijven
  // staan (onzichtbaar) voor aanwijzen, wisselen en weghalen; alleen de samengevoegde buurtmeshes worden getekend en
  // opnieuw opgebouwd als er in die buurt iets verandert.
  const modBatchGroup = new THREE.Group(); modBatchGroup.name = 'modBatch'; scene.add(modBatchGroup);
  const modBatches = new Map();   // buurt → { sig, meshes }
  const BATCH_ON = { v: true };
  function batchMods(live) {
    const by = new Map();
    for (const I of live) { const e = modGroups.get(I); if (!e || !e.group || e.collapsed) continue; const k = Math.floor(I.q / 6) + ',' + Math.floor(I.r / 6); let L = by.get(k); if (!L) by.set(k, L = []); L.push(e); }
    for (const [k, B] of modBatches) if (!by.has(k)) { for (const m of B.meshes) { modBatchGroup.remove(m); m.geometry.dispose(); } modBatches.delete(k); }
    for (const [k, L] of by) {
      const sig = BATCH_ON.v ? L.map(e => e.group.uuid).sort().join('|') : 'uit', old = modBatches.get(k);
      if (old && old.sig === sig) continue;
      if (old) { for (const m of old.meshes) { modBatchGroup.remove(m); m.geometry.dispose(); } modBatches.delete(k); }
      if (!BATCH_ON.v) { for (const e of L) e.group.traverse(o => { if (o.isMesh) o.visible = true; }); modBatches.set(k, { sig, meshes: [] }); continue; }
      const bags = new Map(), MM = new THREE.Matrix4();
      for (const e of L) {
        e.group.updateMatrixWorld(true);
        e.group.traverse(o => {
          if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.geometry.attributes.position || !o.geometry.attributes.normal || o.renderOrder) return;
          const mm = o.material, key = matKey(mm, o.castShadow, o.receiveShadow);
          let b = bags.get(key); if (!b) bags.set(key, b = { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [], src: [] });
          const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(MM.copy(o.matrixWorld));
          if (MM.determinant() < 0) { const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv; for (let v = 0; v + 2 < P.count; v += 3) for (const A of [P, N, U]) if (A) for (let c = 0; c < A.itemSize; c++) { const t = A.array[(v + 1) * A.itemSize + c]; A.array[(v + 1) * A.itemSize + c] = A.array[(v + 2) * A.itemSize + c]; A.array[(v + 2) * A.itemSize + c] = t; } }
          b.list.push(g); b.src.push(o);
        });
      }
      const meshes = [];
      for (const b of bags.values()) {
        const mesh = new THREE.Mesh(mergeGeos(b.list), b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.userData.batch = true; mesh.matrixAutoUpdate = false;
        modBatchGroup.add(mesh); meshes.push(mesh);
        for (const o of b.src) o.visible = false;   // het origineel blijft alleen voor aanwijzen
      }
      modBatches.set(k, { sig, meshes });
    }
  }
  // ---------- In de stad ----------
  const mv2Tf = (rot, q0, r0) => { const th = -rot * Math.PI / 3, c = Math.cos(th), s = Math.sin(th), o = cellToWorld(q0, r0); return (x, z) => [o.x + x * c - z * s, o.z + x * s + z * c]; };
  const mv2Area = I => { const k = I.m.k || 0, out = []; for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) { let [a, b] = [q, r]; for (let i = 0; i < (I.rot || 0) % 6; i++) [a, b] = [a + b, -a]; out.push([a + I.q, b + I.r]); } return out; };
  const modGroups = new Map();   // instantie → { group, col, roofed }
  const modCols = new Map();     // 'q,r' → [col] voor de botsing
  const modCellSet = new Set();  // vakken die door een module v2 bezet zijn (op de grond)
  const modCellOccupied = (q, r) => modCellSet.has(q + ',' + r);
  // ---------- Gelaagde stad: modules op elkaar ----------
  // Een exemplaar heeft een laag lv (0 = op de grond, 1 = op 3 m, …). Het staat op de bovenkant van wat eronder staat:
  // alle vakken van het gebied moeten op dezelfde hoogte eindigen. De bovenkant van een exemplaar is lv + aantal
  // verdiepingen (een bovenste laag met alleen dakvloer telt niet mee: die wordt verborgen zodra er iets op staat).
  const instLv = I => I.lv || 0, instTopLv = I => instLv(I) + modMeta(I.m).fl;
  const modTop = new Map();   // 'q,r' → { top (laag), inst (bovenste exemplaar), kap }
  const cellModTop = (q, r) => modTop.get(q + ',' + r) || null;
  // bovenste module per vak opnieuw bepalen (ook vóór het opnieuw neerzetten van een exemplaar dat net uit de lijst is gehaald)
  function modTopRefresh(live) {
    modTop.clear(); if (!live) live = (cells.inst || []).filter(I => I.m && I.m.v === 2);
    for (const I of live) for (const [q, r] of mv2Area(I)) { const k = q + ',' + r, t = instTopLv(I), e = modTop.get(k); if (!e || t > e.top || (t === e.top && instLv(I) > instLv(e.inst))) modTop.set(k, { top: t, inst: I, kap: modMeta(I.m).top === 'kap' }); }
  }
  // Wat staat er op dit exemplaar? Geeft een masker (x, z) → 0 niets, 1 op een bebouwd vak, 2 onder een vloer van de
  // module erboven; plus een handtekening om te zien of het veranderd is
  function instCover(I) {
    const t = instTopLv(I), A = mv2Area(I), ups = [];
    for (const J of cells.inst || []) if (J !== I && J.m && J.m.v === 2 && instLv(J) === t && mv2Area(J).some(([q, r]) => A.some(([a, b]) => a === q && b === r))) ups.push(J);
    const low = (cells.inst || []).some(J => J !== I && J.m && J.m.v === 2 && instLv(J) > t && mv2Area(J).some(([q, r]) => A.some(([a, b]) => a === q && b === r)));   // overdekt: weinig hoogte op het dak
    // binnen: naast het dak staat op die hoogte een andere module (de dakvloer is dan een hal of straat in een gebouw)
    const inside = !low && (cells.inst || []).some(J => J !== I && J.m && J.m.v === 2 && instLv(J) <= t && instTopLv(J) > t && mv2Area(J).some(([q, r]) => A.some(([a, b]) => mv2HexDist(q - a, r - b) <= 1)));
    const style = low ? 'street' : inside ? 'hall' : 'top';
    if (!ups.length) return { sig: style, mask: null, low, style };
    const tris = [], cellsUp = new Set();
    for (const J of ups) {
      const ts = mv2Ts(J.m), tf = mv2Tf(J.rot, J.q, J.r), L0 = J.m.lv[0];
      for (const [q, r] of mv2Area(J)) cellsUp.add(q + ',' + r);
      for (const id in L0.f) { const [i, j, tt] = id.split(',').map(Number), v = mv2TriVerts(i, j, tt, ts); if (!mv2InArea(J.m, (v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3)) continue; tris.push(v.map(p => tf(p[0], p[1]))); }
    }
    const inTri = (x, z, T) => { const s1 = (T[1][0] - T[0][0]) * (z - T[0][1]) - (T[1][1] - T[0][1]) * (x - T[0][0]), s2 = (T[2][0] - T[1][0]) * (z - T[1][1]) - (T[2][1] - T[1][1]) * (x - T[1][0]), s3 = (T[0][0] - T[2][0]) * (z - T[2][1]) - (T[0][1] - T[2][1]) * (x - T[2][0]); return (s1 >= -1e-6 && s2 >= -1e-6 && s3 >= -1e-6) || (s1 <= 1e-6 && s2 <= 1e-6 && s3 <= 1e-6); };
    const mask = (x, z) => { for (const T of tris) if (inTri(x, z, T)) return 2; return cellsUp.has(worldToCell(x, z).join(',')) ? 1 : 0; };
    return { sig: style + ups.map(J => (cells.inst.indexOf(J)) + ':' + J.mid + ':' + J.rot + ':' + (J.m._sig || 0)).join('|'), mask, low, style };
  }
  // Twee modules naast elkaar hebben vaak allebei een muur op dezelfde rand: dan staan er twee muren in elkaar
  // (flikkerende texturen) en blokkeert de dichte muur de deur van de ander. Per rand blijft er één over: een
  // opening wint van een raam, een raam van een dichte muur, verder de eerst geplaatste. Zo ook voor hoekposten.
  const wallKeyW = (lv, x, z) => lv + '|' + Math.round(x * 5) + ',' + Math.round(z * 5);
  function wallSkips(live) {
    const best = new Map(), per = new Map(), PASS = new Set(['door', 'gate', 'open']);
    const offer = (key, I, rank, idx) => { const b = best.get(key); if (!b || rank > b.rank || (rank === b.rank && idx < b.idx)) best.set(key, { I, rank, idx }); let L = per.get(I); if (!L) per.set(I, L = []); L.push(key); };
    let idx = 0;
    for (const I of live) {
      const m = I.m, ts = mv2Ts(m), tf = mv2Tf(I.rot, I.q, I.r), b0 = instLv(I); idx++;
      m.lv.forEach((L, li) => {
        const ends = new Map();
        for (const id in L.w) { const W = L.w[id]; if (!W) continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue; const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts); if (!mv2NearArea(m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
          const Wm = tf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), o = W.o || ''; offer(wallKeyW(b0 + li, Wm[0], Wm[1]), I, PASS.has(o) ? 2 : o === 'window' ? 1 : 0, idx);
          for (const p of [[i, j], [i + D[0], j + D[1]]]) { const pk = p.join(','); ends.set(pk, (ends.get(pk) || 0) + 1); } }
        for (const [pk, n] of ends) { if (n < 2) continue; const [pi, pj] = pk.split(',').map(Number), c = mv2P(pi, pj, ts), Wc = tf(c[0], c[1]); offer('p' + wallKeyW(b0 + li, Wc[0], Wc[1]), I, 0, idx); }
      });
    }
    const out = new Map();
    for (const [I, keys] of per) { const sk = new Set(); for (const k of keys) if (best.get(k).I !== I) sk.add(k); out.set(I, sk); }
    return out;
  }
  function buildModNet() {
    nearbyClear();
    // een vernieuwde standaardmodule (lib10 en later): geplaatste exemplaren in elke stad krijgen de nieuwe versie
    if (typeof modules !== 'undefined' && (cells.inst || []).length) { let byId = null; for (const I of cells.inst) { if (!I.mid || !I.m || I.m.v !== 2) continue; byId = byId || new Map(modules.map(m => [m.id, m])); const M = byId.get(I.mid); if (M && M.v === 2 && M.lib && (I.m.lib || 0) < M.lib) { I.m = instData(M, I.mir); I.m.lib = M.lib; } } }
    const live = new Set((cells.inst || []).filter(I => I.m && I.m.v === 2));
    let touched = false;
    for (const [I, e] of modGroups) if (!live.has(I)) { e.group.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); scene.remove(e.group); modGroups.delete(I); doors.clear(I); touched = true; }
    const before = new Set(modCellSet);
    modCols.clear(); modCellSet.clear(); modTopRefresh(live);
    const skips = wallSkips(live);
    for (const I of live) {
      const cov = instCover(I), skip = skips.get(I) || new Set(), sig = cov.sig + '#' + [...skip].sort().join(';');
      let e = modGroups.get(I);
      if (e && e.cand && e.sig === sig && e.off !== e.cand.map(c => offSpot(I, c[0], c[1]) ? 1 : 0).join('')) e.sig = '';   // er ligt nu een weg onder een boom of bankje (of juist niet meer)
      if (e && e.sig === sig) { /* ongewijzigd */ } else {
        if (e) { e.group.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); scene.remove(e.group); }
        const o = cellToWorld(I.q, I.r), G = gH(I.q, I.r) + instLv(I) * MV2.LV_H, b = mv2Build(I.m, mv2Tf(I.rot, I.q, I.r), [o.x, o.z], { stacked: instLv(I) > 0, roofMask: cov.mask, roofStyle: cov.style, skip, baseLv: instLv(I), offRoad: (x, z) => offSpot(I, x, z) });
        b.group.position.y += G; b.group.userData.inst = I; doors.clear(I); for (const d of b.doors) { d.y += G; doors.add(I, d); } e = { cand: b.cand, off: b.cand.map(c => offSpot(I, c[0], c[1]) ? 1 : 0).join(''), group: b.group, col: shiftCol({ surfaces: b.surfaces, walls: b.walls }, G), sig, roofed: !!cov.mask, mask: cov.mask, skip, style: cov.style }; scene.add(e.group); modGroups.set(I, e); touched = true;
      }
      e.col.tag = (I.m.name || '') + ' @' + I.q + ',' + I.r + ' lv' + instLv(I) + ' rot' + I.rot + (I.mir ? ' mir' : '');
      for (const [q, r] of mv2Area(I)) { const k = q + ',' + r; if (!instLv(I)) modCellSet.add(k); let L = modCols.get(k); if (!L) modCols.set(k, L = []); L.push(e.col); }
    }
    try { batchMods(live); } catch (e) { console.warn('batchMods', e); }
    // het terrein onder een module is een plateau: bij een nieuwe of weggehaalde module de stukken eromheen bijwerken
    const diff = []; for (const k of modCellSet) if (!before.has(k)) diff.push(k.split(',').map(Number)); for (const k of before) if (!modCellSet.has(k)) diff.push(k.split(',').map(Number));
    if (diff.length && cells.terr && Object.keys(cells.terr).length) { terrDirty(diff); terrFlush(); }
    if (touched) { buildRails(live); peopleDirty = true; peopleLocalEdit = true; }   // het loopnetwerk door de modules is veranderd
    else for (const [k, col] of railCols) { let L = modCols.get(k); if (!L) modCols.set(k, L = []); L.push(col); }
  }
  // ---------- Balustrades: overal waar je van een vloer of dak naar beneden kunt vallen ----------
  // Alle loopvlakken (vloeren en zichtbare dakvloeren) van alle modules per hoogte; een rand die maar bij één driehoek
  // hoort is een buitenrand. Staat daar geen muur en ligt er net buiten geen vloer op (ongeveer) dezelfde hoogte (ook
  // geen trap, helling of maaiveld), dan komt er een hek van 1,05 m, met botsing.
  const railGroup = new THREE.Group(); scene.add(railGroup);
  let railCols = new Map();
  function buildRails(live) {
    for (const c of railGroup.children) c.geometry.dispose(); railGroup.clear(); railCols = new Map();
    const LH = MV2.LV_H, edges = new Map(), r2 = v => Math.round(v * 100);
    for (const I of live) {
      const m = I.m, ts = mv2Ts(m), tf = mv2Tf(I.rot, I.q, I.r), e = modGroups.get(I) || {}, mask = e.mask, fl = modMeta(m).fl, G = gH(I.q, I.r) + instLv(I) * LH;
      m.lv.forEach((L, li) => {
        const y = G + li * LH + 0.02; if (li >= fl && !Object.keys(L.f).length) return;
        for (const P of mv2FloorPolys(m, li, ts)) {   // zonder de trapgaten: rond een gat komt een hek
          const v = P.v, cx = (v[0][0] + v[1][0] + v[2][0]) / 3, cz = (v[0][1] + v[1][1] + v[2][1]) / 3;
          if (!mv2InArea(m, cx, cz) || P.mat === 'water') continue;
          if (li >= fl && mask) { const W = tf(cx, cz); if (mask(W[0], W[1]) === 2) continue; }
          const W = v.map(p => tf(p[0], p[1])), Wc = tf(cx, cz);
          for (const [A, B] of [[W[0], W[1]], [W[1], W[2]], [W[2], W[0]]]) {
            const k = Math.round(y * 10) + '|' + [r2(A[0]) + ',' + r2(A[1]), r2(B[0]) + ',' + r2(B[1])].sort().join('|');
            const E = edges.get(k); if (E) E.n++; else edges.set(k, { n: 1, A, B, y, c: Wc });
          }
        }
      });
    }
    const wallOn = (x, z, y) => { for (const c of nearby(x, z)) for (const w of c.walls) if (w.y0 <= y + 0.3 && w.y1 >= y + 0.6 && segDist(x, z, w) <= w.half + 0.15) return true; return false; };   // ook een borstwering onder een raam (0,9 m) telt als muur: geen hek in het raam
    const geos = [], posts = new Set(), bar = (A, B, y0, y1, t) => { const dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz); if (l < 0.01) return; const g = new THREE.BoxGeometry(l, y1 - y0, t); g.rotateY(-Math.atan2(dz, dx)); g.translate((A[0] + B[0]) / 2, (y0 + y1) / 2, (A[1] + B[1]) / 2); geos.push(g); };
    for (const E of edges.values()) {
      if (E.n !== 1 || E.y < 0.5) continue;
      const mx = (E.A[0] + E.B[0]) / 2, mz = (E.A[1] + E.B[1]) / 2, ex = E.B[0] - E.A[0], ez = E.B[1] - E.A[1], l = Math.hypot(ex, ez) || 1;
      let nx = -ez / l, nz = ex / l; if ((mx - E.c[0]) * nx + (mz - E.c[1]) * nz < 0) { nx = -nx; nz = -nz; }   // naar buiten
      if (wallOn(mx, mz, E.y)) continue;
      // Per stukje van de rand kijken of je er net buiten gewoon door kunt lopen (vloer, trap, overloop, helling): alleen
      // waar dat niet zo is komt een hek. Zo blijft de voet van een trap die bij een trapgat begint vrij, en staat er
      // wel een hek langs de rest van het gat.
      const NS = Math.max(2, Math.ceil(l / 0.4)), open0 = [];
      for (let i = 0; i < NS; i++) { const f = (i + 0.5) / NS, px = E.A[0] + ex * f + nx * 0.35, pz = E.A[1] + ez * f + nz * 0.35;
        open0.push(floorAt(px, pz, E.y + 0.3) >= E.y - 0.35 || floorAt(px, pz, E.y - 0.9) >= E.y - 1.4); }   // ook een trap die hier net onder de rand omhoogkomt: daar loop je zo de vloer op
      const open = open0.map((o, i) => o || open0[i - 1] || open0[i + 1]);   // een stukje speling naast de doorgang, zodat je er niet langs schuurt
      if (open.every(o => o)) continue;   // overal loop je gewoon door
      const y0 = E.y, [q, r] = worldToCell(mx, mz), ck = q + ',' + r; let col = railCols.get(ck); if (!col) railCols.set(ck, col = { surfaces: [], walls: [] });
      for (let i = 0; i < NS;) {
        if (open[i]) { i++; continue; }
        let j = i; while (j < NS && !open[j]) j++;
        const f0 = i / NS, f1 = j / NS, A = [E.A[0] + ex * f0 - nx * 0.04, E.A[1] + ez * f0 - nz * 0.04], B = [E.A[0] + ex * f1 - nx * 0.04, E.A[1] + ez * f1 - nz * 0.04];
        bar(A, B, y0 + 0.98, y0 + 1.05, 0.05); bar(A, B, y0 + 0.45, y0 + 0.49, 0.03);
        for (const P of [A, B]) { const pk = Math.round(P[0] * 10) + ',' + Math.round(P[1] * 10) + ',' + Math.round(y0 * 10); if (posts.has(pk)) continue; posts.add(pk); const g = new THREE.CylinderGeometry(0.03, 0.03, 1.05, 6); g.translate(P[0], y0 + 0.525, P[1]); geos.push(g); }
        col.walls.push({ ax: A[0], az: A[1], bx: B[0], bz: B[1], y0, y1: y0 + 1.05, half: 0.06 });
        i = j;
      }
    }
    for (const [k, col] of railCols) { let L = modCols.get(k); if (!L) modCols.set(k, L = []); L.push(col); }
    if (geos.length) { const mesh = new THREE.Mesh(mergeGeos(geos), mv2Mats().metal); mesh.castShadow = true; railGroup.add(mesh); }
  }
  // Kan de module hier, op laag lv? Op de grond: geen blokken, weg of module. Hoger: op elk vak moet precies op die
  // laag een module eindigen (geen schuin dak), zodat hij er vlak op staat.
  function mv2CanPlace(mod, rot, q0, r0, lv = 0) {
    for (const [q, r] of mv2Area({ m: mod, rot, q: q0, r: r0 })) {
      if (stackOf(q, r).length) return 'Hier staat al iets';
      if (vecCover.has(key(q, r))) return 'Hier ligt een weg';
      const t = cellModTop(q, r);
      if (!lv) { if (t) return 'Hier staat al een module (klik op het dak om erop te bouwen)'; continue; }
      if (!t) return 'Hier staat niets om op te bouwen';
      if (t.top !== lv) return t.top > lv ? 'Hier staat al een module' : 'Niet overal even hoog: ' + (lv - t.top) + ' laag lager';
      if (t.kap) return 'Op een schuin dak kun je niet bouwen';
    }
    if (lv + modMeta(mod).fl > MV2.MAX_LV + 1) return 'Te hoog';
    return null;
  }
  // de laag waarop de gekozen module terechtkomt als je op dit vak klikt: bovenop wat er staat (0 op de grond)
  const stackLvAt = (q, r) => { const t = cellModTop(q, r); return t ? t.top : 0; };
  // Randcodes: per buitenrand van het gebied wat er op de begane grond aan die rand ligt
  function modV2Codes(m) {
    mv2Fix(m);
    const codes = {}, ts = mv2Ts(m), L0 = m.lv[0], k = m.k || 0;
    const wallsMid = []; for (const id in L0.w) { const W = L0.w[id]; if (!W) continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue; const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts); wallsMid.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, o: W.o || '', m: W.m }); }
    const floors = []; for (const id in L0.f) { const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts); floors.push({ x: (v[0][0] + v[1][0] + v[2][0]) / 3, z: (v[0][1] + v[1][1] + v[2][1]) / 3, m: L0.f[id] }); }
    for (const [q, r, s] of moduleBoundary(k)) {
      const c = mv2CellXZ(q, r), f = FRAMES[s], mx = c[0] + f.nx * INNER, mz = c[1] + f.nz * INNER;   // midden van de rand
      const near = (p, d) => { const dx = p.x - mx, dz = p.z - mz; return Math.abs(dx * f.nx + dz * f.nz) < d && Math.abs(dx * f.tx + dz * f.tz) < R / 2 + 0.2; };
      const w = wallsMid.filter(p => near(p, 0.4));
      let code;
      if (w.length) code = w.some(p => p.o === 'door' || p.o === 'gate' || p.o === 'open') ? 'deur' : (w.every(p => p.m === 'hedge') ? 'groen' : 'muur');
      else { const fl = floors.filter(p => near(p, 1.6)); if (!fl.length) code = 'leeg'; else { const cnt = {}; for (const p of fl) { const cd = p.m === 'grass' ? 'groen' : p.m === 'water' ? 'water' : p.m === 'asphalt' ? 'weg' : 'stoep'; cnt[cd] = (cnt[cd] || 0) + 1; } code = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0]; } }
      codes[q + ',' + r + ',' + s] = code;
    }
    return codes;
  }
  // ---------- Spiegelen: een module in spiegelbeeld (z → −z in de module), als gewone moduledata ----------
  // Rasterpunt P(i, j) wordt P(i, −i−j). Driehoek (i, j, 0) → (i, −i−j−1, 0), (i, j, 1) → (i, −i−j−2, 1). Een muur
  // (i, j, d) loopt van P(i, j) naar P(i+dx, j+dy); gespiegeld begint hij (behalve richting 3) aan het andere eind.
  // Trappen: richting d → (6 − 1 − d), zijwaartse verschuiving en draairichting tegengesteld. Vakken (q, r) → (q + r, −r).
  function mv2Mirror(m0) {
    const m = JSON.parse(JSON.stringify(m0)); mv2Fix(m);
    const mp = (i, j) => [i, -i - j], WMAP = { 0: 2, 1: 1, 2: 0, 4: 5, 5: 4 }, D6 = [5, 4, 3, 2, 1, 0];
    for (const L of m.lv) {
      const f = {}; for (const id in L.f) { const [i, j, t] = id.split(',').map(Number); f[i + ',' + (t ? -i - j - 2 : -i - j - 1) + ',' + t] = L.f[id]; } L.f = f;
      const w = {}; for (const id in L.w) { const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue; if (d === 3) { const [a, b] = mp(i, j); w[a + ',' + b + ',3'] = L.w[id]; } else { const [a, b] = mp(i + D[0], j + D[1]); w[a + ',' + b + ',' + WMAP[d]] = L.w[id]; } } L.w = w;
      for (const S of L.s) {
        if (S.k === 'hexramp') { const q = S.q || 0, r = S.r || 0; S.q = q + r; S.r = -r; S.side = (6 - (S.side || 0)) % 6; continue; }
        S.a = mp(S.a[0], S.a[1]); S.d = D6[S.d || 0]; if (S.off) S.off = -S.off; if (S.k === 'spiral' || S.k === 'u') S.side = -(S.side || 1); else if (S.side) S.side = -S.side;   // zonder side is het 1: ook dan keert de draairichting om
      }
      const r = {}; for (const id in L.r) { const [q, rr] = id.split(',').map(Number), g = /^gable(\d)$/.exec(L.r[id] || ''); r[(q + rr) + ',' + (-rr)] = g ? 'gable' + [2, 1, 0][+g[1] % 3] : L.r[id]; } L.r = r;   // zadeldak: de nok spiegelt mee
      for (const o of L.o) { o.z = -o.z; o.rot = -(o.rot || 0); }
    }
    m.codes = modV2Codes(m); m._sig = (m._sig || 0) + 0.5; m.mir = true;
    return m;
  }
  // de moduledata voor een exemplaar (een kopie, gespiegeld als dat zo geplaatst is)
  const instData = (mod, mir) => mir && mod.v === 2 ? mv2Mirror(mod) : JSON.parse(JSON.stringify(mod));
  // ---------- Modulegegevens (voor bladeren en, straks, stapelen) ----------
  // fl: verdiepingen (een bovenste laag met alleen dakvloer telt niet mee), k/n: maat (1 of 7 vakken), h: hoogte in m,
  // top: 'kap' (schuin dak), 'plat' (beloopbaar plat dak: hier kan later een module op), 'open' (niets erboven),
  // bouw: is het een gebouw (muren of meer lagen), deur/weg: aantal randen met een deur of weg
  const ROOF_GREEN = new Set(['tree', 'bush', 'planter', 'solar']);   // zonnepanelen op een plat dak: het blijft een dak   // groen op een dak: het blijft een (plat) dak
  const modRoofOnly = m => { const L = m.lv, T = L[L.length - 1]; return L.length > 1 && !Object.keys(T.w).length && !T.s.length && T.o.every(o => ROOF_GREEN.has(o.t)) && !Object.keys(T.r || {}).length && Object.keys(T.f).length > 0; };
  function modMeta(m) {
    if (!m || m.v !== 2) return { fl: 0, k: 0, n: 1, h: 0, top: 'open', stack: false, bouw: false, deur: 0, weg: 0 };
    mv2Fix(m);
    const L = m.lv, T = L[L.length - 1], k = m.k || 0;
    const roofOnly = modRoofOnly(m);
    const fl = L.length - (roofOnly ? 1 : 0);
    const solidWall = L.some(l => Object.values(l.w).some(w => w && w.m !== 'fence' && w.m !== 'hedge'));
    const bouw = L.length > 1 || solidWall;
    const top = L.some(l => Object.keys(l.r || {}).length) ? 'kap' : roofOnly ? 'plat' : 'open';
    const codes = m.codes || modV2Codes(m), cv = Object.values(codes);
    return { fl, k, n: k ? 7 : 1, h: fl * MV2.LV_H, top, stack: top === 'plat', bouw, deur: cv.filter(c => c === 'deur').length, weg: cv.filter(c => c === 'weg').length };
  }
  // vaste achtervoegsels van een naam: aantal lagen (gebouwen) en maat
  const modSuffix = M => (M.bouw ? ' · ' + M.fl + 'L' : '') + (M.k ? ' · ' + M.n + 'v' : '');
  // Miniatuur: de module in 3D, klein gerenderd (per module en draaiing onthouden)
  const thumbCache = new Map(); let thumbR = null;
  function mv2Thumb(m, rot, px) {
    const k = m.id + ':' + rot + ':' + px + ':' + (m._sig || 0);
    if (thumbCache.has(k)) return thumbCache.get(k);
    const c = document.createElement('canvas'); c.width = c.height = px * 2; const g2 = c.getContext('2d');
    try {
      if (!thumbR) { thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); thumbR.setSize(192, 192); thumbR.outputEncoding = renderer.outputEncoding; }
      const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#dfe8ff', '#6a6a55', 0.9)); const sun = new THREE.DirectionalLight('#fff4dc', 0.9); sun.position.set(30, 50, 20); sc.add(sun);
      const b = mv2Build(m, mv2Tf(rot, 0, 0)); sc.add(b.group);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(R * (1 + 2 * (m.k || 0)) * 0.98, R * (1 + 2 * (m.k || 0)) * 0.98, 0.1, 6), new THREE.MeshStandardMaterial({ color: '#c8dca4' })); base.position.y = -0.05; sc.add(base);
      const ext = R * (1 + 2 * (m.k || 0)) * 1.05, h = m.lv.length * 3 + 2, d = Math.max(ext * 1.9, h * 1.6);
      const cam = new THREE.OrthographicCamera(-d / 2, d / 2, d / 2, -d / 2, 1, 1000); cam.position.set(d * 0.8, d * 0.75, d * 0.8); cam.lookAt(0, h * 0.3, 0);
      thumbR.render(sc, cam); g2.drawImage(thumbR.domElement, 0, 0, c.width, c.height);
      b.group.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); });
    } catch (e) { g2.fillStyle = '#c8dca4'; g2.fillRect(0, 0, c.width, c.height); }
    if (thumbCache.size > 400) thumbCache.clear();
    thumbCache.set(k, c); return c;
  }
