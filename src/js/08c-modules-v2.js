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
    floors: { paver: 'Klinkers', tile: 'Stoeptegels', wood: 'Houten vloer', parquet: 'Visgraat parket', carpet: 'Kantoorvloer', concrete: 'Beton', polished: 'Gepolijst beton', stonetile: 'Natuursteen tegels', grass: 'Gras', water: 'Water', asphalt: 'Asfalt', roof: 'Dakbedekking', glass: 'Glazen dak' },
    walls: { brick: 'Baksteen', darkbrick: 'Donkere steen', plaster: 'Wit stucwerk', concrete: 'Schoon beton', panel: 'Gevelpanelen', slats: 'Houten lamellen', corten: 'Cortenstaal', curtain: 'Glasgevel', glass: 'Glaswand', wood: 'Hout', stone: 'Natuursteen', hedge: 'Haag', fence: 'Hek' },
    openings: { '': 'Dicht', door: 'Deur', window: 'Raam', gate: 'Poort', open: 'Open' },
    objects: { tree: 'Boom', bush: 'Struik', bench: 'Bankje', lamp: 'Lantaarn', pillar: 'Zuil', table: 'Tafel', planter: 'Plantenbak', fountain: 'Fontein', bin: 'Prullenbak', bike: 'Fietsenrek', shelf: 'Winkelstelling', counter: 'Toonbank', sign: 'Lichtreclame' },
    cats: ['Wonen', 'Werken', 'Winkels', 'Winkelcentrum', 'Openbaar', 'Groen', 'Pleinen', 'Verbindingen', 'Bouwdelen', 'Overig'],
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
  function mv2Build(m, tf, origin = [0, 0], opts = {}) {
    mv2Fix(m);
    const Mt = mv2Mats(), ts = mv2Ts(m), LH = MV2.LV_H, bags = new Map(), group = new THREE.Group(), surfaces = [], walls = [];
    const nLv = m.lv.length, stacked = !!opts.stacked, roofLi = m.lv.length > 1 && modRoofOnly(m) ? m.lv.length - 1 : -1, mask = opts.roofMask || null;
    const put = (mat, g) => { let L = bags.get(mat); if (!L) bags.set(mat, L = []); L.push(g); };
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
      const byMat = {}, edgeCnt = new Map(), eid = (p, q) => [p.join(','), q.join(',')].sort().join('|');
      for (const id in L.f) {
        const [i, j, t] = id.split(',').map(Number), v = mv2TriVerts(i, j, t, ts), mat = L.f[id];
        if (!mv2InArea(m, (v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3)) continue;
        if (li === roofLi && mask) { const W = tf((v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3), c = mask(W[0], W[1]); if (c === 2 || (c === 1 && mat === 'glass')) continue; }   // 2: onder een vloer erboven, 1: op een bebouwd vak
        (byMat[mat] || (byMat[mat] = [])).push(v);
        for (const [p, q] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) { const k = eid(p, q); edgeCnt.set(k, (edgeCnt.get(k) || 0) + 1); }
        const top = lifted ? y0 + 0.02 : 0.05; pushWalk(v[0], v[1], v[2], top, top, top);
      }
      for (const mat in byMat) {
        const top = lifted ? y0 + 0.02 : (mat === 'water' ? -0.25 : 0.05);
        put(Mt.fl[mat] || Mt.fl.concrete, triGeo(byMat[mat], top));
        if (lifted && mat !== 'glass') put(Mt.ceiling, triGeo(byMat[mat], y0 - MV2.FLOOR_T, false));
      }
      if (lifted) {   // randen van de vloerplaat: een zijkant van 22 cm waar geen buurdriehoek ligt
        for (const mat in byMat) for (const v of byMat[mat]) for (const [p, q] of [[v[0], v[1]], [v[1], v[2]], [v[2], v[0]]]) if (edgeCnt.get(eid(p, q)) === 1) wallBox(Mt.slab, p, q, y0 - MV2.FLOOR_T, y0 + 0.02, 0.06);
      }
      // --- hoeken: waar twee muren onder een hoek samenkomen, een ronde hoekpost van dezelfde dikte, zodat de muren
      // zonder kier of uitstekend hoekje op elkaar aansluiten (muren zijn rechte blokken van punt tot punt) ---
      { const ends = new Map(), add = (k, dir, W) => { let L2 = ends.get(k); if (!L2) ends.set(k, L2 = []); L2.push({ dir, W }); };
        for (const id in L.w) { const W = L.w[id]; if (!W || W.m === 'fence' || W.m === 'glass') continue; const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; if (!D) continue;
          const a = mv2P(i, j, ts), b = mv2P(i + D[0], j + D[1], ts); if (!mv2NearArea(m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
          const l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
          add(i + ',' + j, u, W); add((i + D[0]) + ',' + (j + D[1]), [-u[0], -u[1]], W); }
        for (const [k, L2] of ends) {
          if (L2.length < 2) continue;
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
        const mat = Mt.wl[W.m] || Mt.wl.brick, T = MV2.WALL_T;
        if (W.m === 'hedge') { wallBox(mat, a, b, y0, y0 + 1.4, 0.6); addWall(a, b, y0, y0 + 1.4, 0.3); continue; }
        if (W.m === 'fence') {
          for (const f of [0, 0.5, 1]) { const p = lerp(a, b, f), q = lerp(a, b, Math.min(1, f + 0.02)); wallBox(Mt.metal, p, q, y0, y0 + 1.1, 0.08); }
          wallBox(Mt.metal, a, b, y0 + 0.5, y0 + 0.55, 0.05); wallBox(Mt.metal, a, b, y0 + 1.05, y0 + 1.1, 0.05); addWall(a, b, y0, y0 + 1.1, 0.06); continue;
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
        if (o === 'door') { wallBox(Mt.trim, p0, p1, y0 + oy1 - 0.06, y0 + oy1, T + 0.08); for (const p of [p0, p1]) wallBox(Mt.trim, p, lerp(p, p === p0 ? p1 : p0, 0.06 / ow), y0, y0 + oy1, T + 0.08); }
        if (o === 'gate') { wallBox(Mt.trim, p0, p1, y0 + oy1 - 0.1, y0 + oy1, T + 0.1); }
      }
      // --- trappen en hellingen ---
      for (const S of L.s || []) {
        const D = MV2.DIR6[S.d] || MV2.DIR6[0], a = mv2P(S.a[0], S.a[1], ts), len = (S.n || 2) * ts, w = S.w || 2;
        const dx = D[0] * ts * SQ3 / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux;
        const rise = S.h || LH, off = S.off || 0, at = (al, lat) => [a[0] + ux * al + nx * (lat + off), a[1] + uz * al + nz * (lat + off)];   // off: zijwaarts verschoven (trap in een galerijband)
        const landing = (al, y) => { pushWalk(at(al, -w / 2), at(al + 1, w / 2), at(al, w / 2), y, y, y); pushWalk(at(al, -w / 2), at(al + 1, -w / 2), at(al + 1, w / 2), y, y, y); };   // onzichtbare overloop van 1 m: geen gat naar de vloer
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
          for (const [A, B] of [[pt(INNER, 4.5), pt(INNER, -4.5)], [pt(0, 9), pt(INNER, 4.5)], [pt(INNER, -4.5), pt(0, -9)], [pt(-INNER, 4.5), pt(0, 9)], [pt(0, -9), pt(-INNER, -4.5)]]) addWall(A, B, y0, top + 1, 0.08);   // randen: niet vanaf de helling vallen
          continue;
        }
        if (S.k === 'u') {   // bordestrap: steek 1 (1,5 m) vooruit, bordes, steek 2 ernaast terug naar boven
          const sd = S.side || 1, h1 = rise / 2, N = Math.max(2, Math.round(len / 0.28)), run = len / N, rs = h1 / N, c2 = sd * w;
          for (let s = 0; s < N; s++) {
            const t1 = y0 + (s + 1) * rs; wallBox(Mt.step, at(s * run, 0), at((s + 1) * run, 0), y0, t1, w);
            pushWalk(at(s * run, -w / 2), at((s + 1) * run, w / 2), at(s * run, w / 2), t1, t1, t1); pushWalk(at(s * run, -w / 2), at((s + 1) * run, -w / 2), at((s + 1) * run, w / 2), t1, t1, t1);
            const t2 = y0 + h1 + (s + 1) * rs, ua = len - s * run, ub = len - (s + 1) * run; wallBox(Mt.step, at(ua, c2), at(ub, c2), t2 - rs - 0.15, t2, w);
            pushWalk(at(ua, c2 - w / 2), at(ub, c2 + w / 2), at(ua, c2 + w / 2), t2, t2, t2); pushWalk(at(ua, c2 - w / 2), at(ub, c2 - w / 2), at(ub, c2 + w / 2), t2, t2, t2);
          }
          const l0 = Math.min(-w / 2, c2 - w / 2), l1 = Math.max(w / 2, c2 + w / 2), yl = y0 + h1;
          wallBox(Mt.step, at(len + w / 2, l0), at(len + w / 2, l1), yl - 0.25, yl, w);   // bordes
          { const yt = y0 + rise; pushWalk(at(-1, c2 - w / 2), at(0, c2 + w / 2), at(-1, c2 + w / 2), yt, yt, yt); pushWalk(at(-1, c2 - w / 2), at(0, c2 - w / 2), at(0, c2 + w / 2), yt, yt, yt); }   // overloop boven
          pushWalk(at(len, l0), at(len + w, l1), at(len, l1), yl, yl, yl); pushWalk(at(len, l0), at(len + w, l0), at(len + w, l1), yl, yl, yl);
          // leuningen (schuine stang op palen): buitenkant steek 1, tussen de steken, buitenkant steek 2, rand van het bordes
          const bar = (A, ya, B, yb) => { const pa = tfp(A), pb = tfp(B), va = new THREE.Vector3(pa[0], ya, pa[1]), vb = new THREE.Vector3(pb[0], yb, pb[1]), L2 = va.distanceTo(vb); if (L2 < 0.01) return; const g = new THREE.BoxGeometry(0.05, 0.05, L2); g.applyMatrix4(new THREE.Matrix4().lookAt(va, vb, new THREE.Vector3(0, 1, 0))); g.translate((va.x + vb.x) / 2, (ya + yb) / 2, (va.z + vb.z) / 2); put(Mt.metal, g); };
          const post = (A, yb, yt) => { const p2 = tfp(A), g = new THREE.CylinderGeometry(0.03, 0.03, yt - yb, 6); g.translate(p2[0], (yb + yt) / 2, p2[1]); put(Mt.metal, g); };
          const out1 = -sd * (w / 2 - 0.05), mid = sd * w / 2, out2 = c2 + sd * (w / 2 - 0.05);
          bar(at(0, out1), y0 + 0.95, at(len, out1), yl + 0.95); bar(at(0, mid), y0 + rise + 0.95, at(len, mid), yl + 0.95); bar(at(0, out2), y0 + rise + 0.95, at(len, out2), yl + 0.95); bar(at(len + w - 0.05, l0), yl + 0.95, at(len + w - 0.05, l1), yl + 0.95);
          for (const f of [0, 0.5, 1]) { post(at(f * len, out1), y0 + f * h1, y0 + f * h1 + 0.95); post(at(f * len, out2), yl + (1 - f) * h1, yl + (1 - f) * h1 + 0.95); }
          addWall(at(0, out1), at(len, out1), y0, yl + 0.95, 0.05); addWall(at(0, mid), at(len, mid), y0, y0 + rise + 0.9, 0.05); addWall(at(0, out2), at(len, out2), y0 + 0.3, y0 + rise + 0.95, 0.05); addWall(at(len + w - 0.05, l0), at(len + w - 0.05, l1), yl - 0.3, yl + 0.95, 0.05);
        } else if (S.k === 'ramp') {
          const g = new THREE.BufferGeometry(), P = [at(0, -w / 2), at(0, w / 2), at(len, w / 2), at(len, -w / 2)].map(tfp), yb = y0 + 0.05, yt = y0 + rise;
          const pos = [P[0][0], yb, P[0][1], P[2][0], yt, P[2][1], P[1][0], yb, P[1][1], P[0][0], yb, P[0][1], P[3][0], yt, P[3][1], P[2][0], yt, P[2][1]];
          // zijkanten en onderkant: dichte wig
          const side = (i0, i1, y0a, y1a) => pos.push(P[i0][0], y0, P[i0][1], P[i1][0], y0, P[i1][1], P[i1][0], y1a, P[i1][1], P[i0][0], y0, P[i0][1], P[i1][0], y1a, P[i1][1], P[i0][0], y0a, P[i0][1]);
          side(0, 3, yb, yt); side(2, 1, yt, yb); side(3, 2, yt, yt);
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(pos.length / 3 * 2).fill(0), 2)); g.computeVertexNormals(); put(Mt.rampTop, g);
          pushWalk(at(0, -w / 2), at(len, w / 2), at(0, w / 2), yb, yt, yb); pushWalk(at(0, -w / 2), at(len, -w / 2), at(len, w / 2), yb, yt, yt);
          landing(len, yt); landing(-1, y0 + 0.02);
          addWall(at(0, -w / 2), at(len, -w / 2), y0, yt, 0.05); addWall(at(0, w / 2), at(len, w / 2), y0, yt, 0.05);
        } else {
          const N = Math.max(2, Math.round(len / 0.28)), run = len / N, rs = rise / N;
          for (let s = 0; s < N; s++) { const top = y0 + (s + 1) * rs; wallBox(Mt.step, at(s * run, 0), at((s + 1) * run, 0), y0, top, w); pushWalk(at(s * run, -w / 2), at((s + 1) * run, w / 2), at(s * run, w / 2), top, top, top); pushWalk(at(s * run, -w / 2), at((s + 1) * run, -w / 2), at((s + 1) * run, w / 2), top, top, top); }
          landing(len, y0 + rise); landing(-1, y0 + 0.02);
          // leuning aan beide kanten
          for (const sg of [-1, 1]) { wallBox(Mt.metal, at(0, sg * (w / 2 - 0.05)), at(len, sg * (w / 2 - 0.05)), y0 + 0.9, y0 + 0.95, 0.05); for (const f of [0, 0.5, 1]) wallBox(Mt.metal, at(f * len, sg * (w / 2 - 0.05)), at(f * len + 0.02, sg * (w / 2 - 0.05)), y0 + f * rise, y0 + f * rise + 0.95, 0.04); addWall(at(0, sg * w / 2), at(len, sg * w / 2), y0, y0 + rise + 0.9, 0.05); }
        }
      }
      // --- daken per vak ---
      for (const id in L.r) {
        const [q, r] = id.split(',').map(Number), c = mv2CellXZ(q, r), kind = L.r[id];
        if (kind === 'hip') { const g = new THREE.ConeGeometry(R, 5, 6); const W = tf(c[0], c[1]), W2 = tf(c[0] + 1, c[1]); g.rotateY(Math.atan2(-(W2[1] - W[1]), W2[0] - W[0])); g.translate(W[0], y0 + LH + 2.5, W[1]); put(Mt.roof, g); }
        else if (kind === 'flat') { const g = new THREE.CylinderGeometry(R - 0.1, R - 0.1, 0.3, 6); const W = tf(c[0], c[1]), W2 = tf(c[0] + 1, c[1]); g.rotateY(Math.atan2(-(W2[1] - W[1]), W2[0] - W[0])); g.translate(W[0], y0 + LH + 0.15, W[1]); put(Mt.slab, g); }
      }
      // --- voorwerpen ---
      for (const O of L.o || []) {
        const W = tf(O.x, O.z), W2 = tf(O.x + Math.cos(O.rot || 0), O.z + Math.sin(O.rot || 0)), ang = Math.atan2(-(W2[1] - W[1]), W2[0] - W[0]);
        const place = (mat, g) => { g.rotateY(ang); g.translate(W[0], y0, W[1]); put(mat, g); };
        const box = (mat, sx, sy, sz, x, y, z) => place(mat, new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
        const col = (mat, rt, rb, h, x, y, z, n = 8) => place(mat, new THREE.CylinderGeometry(rt, rb, h, n).translate(x, y + h / 2, z));
        const hj = (Math.round(O.x * 7) * 31 + Math.round(O.z * 13) * 17) & 1023;
        const solid = (r, h) => walls.push({ ax: W[0], az: W[1], bx: W[0], bz: W[1], y0, y1: y0 + h, half: r });
        switch (O.t) {
          case 'tree': { const sc = 0.8 + (hj % 4) * 0.08; col(Mt.trunk, 0.18, 0.26, 2.8, 0, 0, 0, 6); place(Mt.leaf[hj % 3], new THREE.IcosahedronGeometry(2.1 * sc, 0).translate(0, 2.8 + 1.6 * sc, 0)); solid(0.3, 3); break; }
          case 'bush': place(Mt.leaf[(hj + 1) % 3], new THREE.IcosahedronGeometry(0.9, 0).scale(1, 0.8, 1).translate(0, 0.7, 0)); solid(0.6, 1.3); break;
          case 'bench': box(Mt.bench, 1.8, 0.06, 0.45, 0, 0.45, 0); box(Mt.bench, 1.8, 0.45, 0.06, 0, 0.72, -0.22); box(Mt.metal, 0.06, 0.45, 0.4, -0.8, 0.22, 0); box(Mt.metal, 0.06, 0.45, 0.4, 0.8, 0.22, 0); solid(0.5, 0.9); break;
          case 'lamp': col(Mt.lamp, 0.05, 0.08, 4, 0, 0, 0); place(Mt.lampGlow, new THREE.SphereGeometry(0.22, 8, 6).translate(0, 4.05, 0)); solid(0.15, 4); break;
          case 'pillar': col(Mt.wl.stone, 0.3, 0.35, LH, 0, 0, 0, 10); box(Mt.wl.stone, 0.9, 0.12, 0.9, 0, LH - 0.06, 0); solid(0.35, LH); break;
          case 'table': col(Mt.metal, 0.04, 0.06, 0.72, 0, 0, 0, 6); col(Mt.bench, 0.6, 0.6, 0.04, 0, 0.72, 0, 12); for (let i = 0; i < 3; i++) { const a = i * 2.1, x = Math.cos(a) * 0.9, z = Math.sin(a) * 0.9; col(Mt.metal, 0.2, 0.2, 0.45, x, 0, z, 8); } solid(0.9, 0.8); break;
          case 'planter': col(Mt.slab, 0.75, 0.65, 0.5, 0, 0, 0, 8); place(Mt.leaf[2], new THREE.IcosahedronGeometry(0.55, 0).scale(1.2, 0.7, 1.2).translate(0, 0.75, 0)); for (let i = 0; i < 5; i++) { const a = i * 1.26, c = ['#e64a3c', '#f2b233', '#e9e6dc', '#d05a9a', '#f28c33'][i]; place(new THREE.MeshBasicMaterial({ color: c }), new THREE.SphereGeometry(0.09, 5, 4).translate(Math.cos(a) * 0.4, 0.95, Math.sin(a) * 0.4)); } solid(0.75, 1); break;
          case 'fountain': col(Mt.wl.stone, 1.8, 1.9, 0.5, 0, 0, 0, 12); col(Mt.water, 1.6, 1.6, 0.1, 0, 0.42, 0, 12); col(Mt.wl.stone, 0.12, 0.18, 1.3, 0, 0.4, 0, 8); col(Mt.wl.stone, 0.6, 0.5, 0.12, 0, 1.6, 0, 10); solid(1.9, 0.6); break;
          case 'bin': col(Mt.bin, 0.25, 0.22, 0.9, 0, 0, 0, 8); solid(0.25, 0.9); break;
          case 'shelf': { box(Mt.wl.panel, 2.4, 1.9, 0.5, 0, 0.95, 0); for (const y of [0.45, 0.95, 1.45]) box(Mt.slab, 2.3, 0.04, 0.46, 0, y, 0.02); for (let i = 0; i < 6; i++) { const k = (hj + i * 37) % 5; box(new THREE.MeshStandardMaterial({ color: ['#d94b3a', '#3a7fd9', '#e9c04a', '#48a35a', '#e6e1d8'][k], roughness: 0.8 }), 0.32, 0.26, 0.3, -1 + i * 0.4, 0.45 + 0.5 * (i % 3) + 0.13, 0.04); } solid(1.2, 1.9); break; }
          case 'counter': box(Mt.wl.slats, 2.2, 1.0, 0.7, 0, 0.5, 0); box(Mt.slab, 2.3, 0.05, 0.8, 0, 1.02, 0); box(Mt.metal, 0.35, 0.3, 0.3, 0.6, 1.2, 0); solid(1.1, 1.05); break;
          case 'sign': { col(Mt.metal, 0.05, 0.06, 2.6, 0, 0, 0, 6); box(Mt.metal, 1.6, 0.6, 0.08, 0, 2.6, 0); box(new THREE.MeshBasicMaterial({ color: ['#ff4f6d', '#39b6ff', '#ffd23f', '#5de07a'][hj % 4] }), 1.5, 0.5, 0.1, 0, 2.6, 0); solid(0.1, 2.9); break; }
          case 'bike': for (let i = -2; i <= 2; i++) { box(Mt.metal, 0.04, 0.6, 0.6, i * 0.5, 0.3, 0); } box(Mt.metal, 2.3, 0.04, 0.04, 0, 0.6, 0.28); box(Mt.metal, 2.3, 0.04, 0.04, 0, 0.6, -0.28); solid(1.2, 0.7); break;
        }
      }
      if (walkPos.length) {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(walkPos, 3));
        surfaces.push({ kind: 'tris', cx: origin[0], cz: origin[1], B: triBuckets(g), base: 0, bottom: lifted ? y0 - MV2.FLOOR_T : -0.3 });
      }
    }
    for (const [mat, list] of bags) { const mesh = new THREE.Mesh(mergeGeos(list), mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.own = true; group.add(mesh); }
    return { group, surfaces, walls };
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
  // Wat staat er op dit exemplaar? Geeft een masker (x, z) → 0 niets, 1 op een bebouwd vak, 2 onder een vloer van de
  // module erboven; plus een handtekening om te zien of het veranderd is
  function instCover(I) {
    const t = instTopLv(I), A = mv2Area(I), ups = [];
    for (const J of cells.inst || []) if (J !== I && J.m && J.m.v === 2 && instLv(J) === t && mv2Area(J).some(([q, r]) => A.some(([a, b]) => a === q && b === r))) ups.push(J);
    if (!ups.length) return { sig: '', mask: null };
    const tris = [], cellsUp = new Set();
    for (const J of ups) {
      const ts = mv2Ts(J.m), tf = mv2Tf(J.rot, J.q, J.r), L0 = J.m.lv[0];
      for (const [q, r] of mv2Area(J)) cellsUp.add(q + ',' + r);
      for (const id in L0.f) { const [i, j, tt] = id.split(',').map(Number), v = mv2TriVerts(i, j, tt, ts); if (!mv2InArea(J.m, (v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3)) continue; tris.push(v.map(p => tf(p[0], p[1]))); }
    }
    const inTri = (x, z, T) => { const s1 = (T[1][0] - T[0][0]) * (z - T[0][1]) - (T[1][1] - T[0][1]) * (x - T[0][0]), s2 = (T[2][0] - T[1][0]) * (z - T[1][1]) - (T[2][1] - T[1][1]) * (x - T[1][0]), s3 = (T[0][0] - T[2][0]) * (z - T[2][1]) - (T[0][1] - T[2][1]) * (x - T[2][0]); return (s1 >= -1e-6 && s2 >= -1e-6 && s3 >= -1e-6) || (s1 <= 1e-6 && s2 <= 1e-6 && s3 <= 1e-6); };
    const mask = (x, z) => { for (const T of tris) if (inTri(x, z, T)) return 2; return cellsUp.has(worldToCell(x, z).join(',')) ? 1 : 0; };
    return { sig: ups.map(J => (cells.inst.indexOf(J)) + ':' + J.mid + ':' + J.rot + ':' + (J.m._sig || 0)).join('|'), mask };
  }
  function buildModNet() {
    const live = new Set((cells.inst || []).filter(I => I.m && I.m.v === 2));
    let touched = false;
    for (const [I, e] of modGroups) if (!live.has(I)) { e.group.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); scene.remove(e.group); modGroups.delete(I); touched = true; }
    const before = new Set(modCellSet);
    modCols.clear(); modCellSet.clear(); modTop.clear();
    for (const I of live) for (const [q, r] of mv2Area(I)) { const k = q + ',' + r, t = instTopLv(I), e = modTop.get(k); if (!e || t > e.top || (t === e.top && instLv(I) > instLv(e.inst))) modTop.set(k, { top: t, inst: I, kap: modMeta(I.m).top === 'kap' }); }
    for (const I of live) {
      const cov = instCover(I);
      let e = modGroups.get(I);
      if (e && e.sig === cov.sig) { /* ongewijzigd */ } else {
        if (e) { e.group.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); scene.remove(e.group); }
        const o = cellToWorld(I.q, I.r), G = gH(I.q, I.r) + instLv(I) * MV2.LV_H, b = mv2Build(I.m, mv2Tf(I.rot, I.q, I.r), [o.x, o.z], { stacked: instLv(I) > 0, roofMask: cov.mask });
        b.group.position.y += G; b.group.userData.inst = I; e = { group: b.group, col: shiftCol({ surfaces: b.surfaces, walls: b.walls }, G), sig: cov.sig, roofed: !!cov.mask, mask: cov.mask }; scene.add(e.group); modGroups.set(I, e); touched = true;
      }
      for (const [q, r] of mv2Area(I)) { const k = q + ',' + r; if (!instLv(I)) modCellSet.add(k); let L = modCols.get(k); if (!L) modCols.set(k, L = []); L.push(e.col); }
    }
    // het terrein onder een module is een plateau: bij een nieuwe of weggehaalde module de stukken eromheen bijwerken
    const diff = []; for (const k of modCellSet) if (!before.has(k)) diff.push(k.split(',').map(Number)); for (const k of before) if (!modCellSet.has(k)) diff.push(k.split(',').map(Number));
    if (diff.length && cells.terr && Object.keys(cells.terr).length) { terrDirty(diff); terrFlush(); }
    if (touched) { peopleDirty = true; peopleLocalEdit = true; }   // het loopnetwerk door de modules is veranderd
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
  // ---------- Modulegegevens (voor bladeren en, straks, stapelen) ----------
  // fl: verdiepingen (een bovenste laag met alleen dakvloer telt niet mee), k/n: maat (1 of 7 vakken), h: hoogte in m,
  // top: 'kap' (schuin dak), 'plat' (beloopbaar plat dak: hier kan later een module op), 'open' (niets erboven),
  // bouw: is het een gebouw (muren of meer lagen), deur/weg: aantal randen met een deur of weg
  const modRoofOnly = m => { const L = m.lv, T = L[L.length - 1]; return L.length > 1 && !Object.keys(T.w).length && !T.s.length && !T.o.length && !Object.keys(T.r || {}).length && Object.keys(T.f).length > 0; };
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
