  // ---------- Low-poly voertuigen voor in de stad ----------
  // Kantige auto's in dezelfde stijl als de gebouwen. Elke carrosserie is een romp van doorsneden langs de lengte; elke doorsnede is
  // een zeshoek: onderkant, gordellijn en dak. Onder de gordellijn lopen de flanken schuin naar binnen (tuck-under), erboven ook
  // (tuimeling), dus overal schuine vlakken in plaats van rechte zijkanten. Ruiten liggen als dunne platen op de romp, zodat de stijlen
  // en dakranden in lakkleur blijven staan. Alle typen delen de maten van het rijmodel (4,7 m lang, wielbasis 2,9 m, wielen op
  // x = ±1,45 en z = ±0,83), zodat wegligging, remmen en botsingen gelijk blijven. Per type: carrosserie (lak, per auto een kleur),
  // ruiten, donkere delen (bumpers, wielkasten, bekleding), lichtlijnen in een accentkleur en lampen. Eigen ontwerpen, geen merken:
  // een hoekige sedan met lichtlijn, een lage wig-coupé, een hoge SUV, een stalen wig-pickup, een stadsauto, een bestelbus en een taxi.
  const LP_PAINT = ['#e8c547', '#d9534f', '#4a90a4', '#f2f3f5', '#3d5a80', '#7bb356', '#e07a3f', '#2b2f36', '#b8a9c9', '#c9ced4', '#5a1f2a', '#b5a36a', '#1c1f24'];
  const LP_TYPES = ['sedan', 'coupe', 'suv', 'wedge', 'stad', 'bestel', 'taxi'];
  const LP_WEIGHT = { sedan: 0.2, coupe: 0.12, suv: 0.18, wedge: 0.1, stad: 0.2, bestel: 0.12, taxi: 0.08 };
  const LP_FIXED = { taxi: '#f2c230', wedge: '#d3d8dc' };   // vaste kleuren; de rest kiest uit LP_PAINT
  function lpBuildVehicle(type) {
    // ----- romp: doorsneden [x, yOnder, yGordel, yDak, bOnder, bGordel, bDak] (b = halve breedte), van achter naar voor of andersom -----
    const sec = s => [[s[0], s[1], -s[4]], [s[0], s[2], -s[5]], [s[0], s[3], -s[6]], [s[0], s[3], s[6]], [s[0], s[2], s[5]], [s[0], s[1], s[4]]];
    const tri = (pos, A, B, C, ref) => {
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (nx * nx + ny * ny + nz * nz < 1e-10) return;   // ontaarde driehoek
      const mx = (A[0] + B[0] + C[0]) / 3 - ref[0], my = (A[1] + B[1] + C[1]) / 3 - ref[1], mz = (A[2] + B[2] + C[2]) / 3 - ref[2];
      if (nx * mx + ny * my + nz * mz >= 0) pos.push(...A, ...B, ...C); else pos.push(...A, ...C, ...B);
    };
    const hull = S => {
      const pos = [];
      for (let i = 0; i < S.length - 1; i++) {
        const A = sec(S[i]), B = sec(S[i + 1]), c = [(S[i][0] + S[i + 1][0]) / 2, (S[i][1] + S[i][3] + S[i + 1][1] + S[i + 1][3]) / 4, 0];
        for (let k = 0; k < 6; k++) { const k2 = (k + 1) % 6; tri(pos, A[k], A[k2], B[k2], c); tri(pos, A[k], B[k2], B[k], c); }
      }
      for (const [j, o] of [[0, 1], [S.length - 1, S.length - 2]]) {   // kopse kanten: normaal weg van de buurdoorsnede
        const C = sec(S[j]), ref = [S[o][0], (S[j][1] + S[j][3]) / 2, 0];
        for (let k = 1; k < 5; k++) tri(pos, C[0], C[k], C[k + 1], ref);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
    };
    // doorsnede van een romp op lengte x (lineair tussen de doorsneden)
    const at = (S, x) => {
      for (let i = 0; i < S.length - 1; i++) { const a = S[i], b = S[i + 1], lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]); if (x >= lo - 1e-6 && x <= hi + 1e-6) { const t = (x - a[0]) / ((b[0] - a[0]) || 1); return a.map((v, k) => v + (b[k] - v) * t); } }
      return (Math.abs(x - S[0][0]) < Math.abs(x - S[S.length - 1][0]) ? S[0] : S[S.length - 1]).slice();
    };
    const wAt = (s, y) => y <= s[2] ? s[4] + (s[5] - s[4]) * (y - s[1]) / ((s[2] - s[1]) || 1) : s[5] + (s[6] - s[5]) * (y - s[2]) / ((s[3] - s[2]) || 1);
    const xsBetween = (S, x0, x1) => [x0, ...S.map(s => s[0]).filter(x => x > Math.min(x0, x1) + 0.01 && x < Math.max(x0, x1) - 0.01), x1].sort((a, b) => a - b);
    // zijruit: een plaatje net buiten de flank, tussen de fracties f0 en f1 van gordellijn tot dak
    const winSide = (S, x0, x1, f0, f1, out = 0.012) => hull(xsBetween(S, x0, x1).map(x => { const s = at(S, x), y0 = s[2] + (s[3] - s[2]) * f0, y1 = s[2] + (s[3] - s[2]) * f1, w0 = wAt(s, y0) + out, w1 = wAt(s, y1) + out; return [x, y0, y0, y1, w0, w0, w1]; }));
    // ruit op het dakvlak (voorruit, achterruit): een plaat net boven het dak, ins van de randen af
    const winTop = (S, x0, x1, inset, up = 0.014) => hull(xsBetween(S, x0, x1).map(x => { const s = at(S, x), w = Math.max(0.05, s[6] - inset); return [x, s[3] - 0.06, s[3] - 0.06, s[3] + up, w, w, w]; }));
    // strook over de flank tussen twee hoogtes, iets buiten de romp; volgt de knik op de gordellijn en blijft onder het dak
    const strip = (s, x, y0, y1, out) => { y0 = Math.max(s[1], y0); y1 = Math.max(y0 + 0.01, Math.min(s[3] - 0.05, y1)); const ym = Math.min(y1, Math.max(y0, s[2])); return [x, y0, ym, y1, wAt(s, y0) + out, wAt(s, ym) + out, wAt(s, y1) + out]; };
    // band over de romp (donkere onderkant, streep)
    const band = (S, x0, x1, y0, y1, out = 0.014) => hull(xsBetween(S, x0, x1).map(x => strip(at(S, x), x, y0, y1, out)));
    // wielkast: donker trapezium boven het wiel (halve zeshoek), over de flank
    const arch = (S, wx, top = 0.84) => hull([[wx - 0.74, 0.42], [wx - 0.5, top], [wx + 0.5, top], [wx + 0.74, 0.42]].map(([x, y1]) => strip(at(S, x), x, 0.3, y1, 0.018)));
    const box = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z).toNonIndexed();
    const P = { body: [], glass: [], trim: [], glow: [], lamp: [] }, lampCol = [];
    const lamp = (g, c) => { P.lamp.push(g); const n = g.attributes.position.count, cc = new THREE.Color(c); for (let i = 0; i < n; i++) lampCol.push(cc.r, cc.g, cc.b); };
    const WHITE = '#fff7d6', RED = '#ff3b30';
    // auto met een losse cabine: romp + cabine in lak, ruiten op de cabine
    const car = (B, C, win) => {
      P.body.push(hull(B), hull(C));
      if (win.front) P.glass.push(winTop(C, ...win.front, 0.07));
      if (win.rear) P.glass.push(winTop(C, ...win.rear, 0.07));
      if (win.side) P.glass.push(winSide(C, win.side[0], win.side[1], 0.1, 0.86));
      for (const wx of [-1.45, 1.45]) P.trim.push(arch(B, wx, win.arch || 0.8));
    };
    let metal = false;
    if (type === 'sedan') {   // hoekige sedan: lange motorkap, schuine ruiten, lichtlijn op de gordellijn
      const B = [[-2.36, 0.44, 0.64, 0.84, 0.66, 0.84, 0.72], [-2.15, 0.3, 0.64, 0.95, 0.76, 0.92, 0.8], [0.6, 0.3, 0.64, 0.93, 0.78, 0.93, 0.8], [2.2, 0.32, 0.6, 0.76, 0.74, 0.9, 0.72], [2.37, 0.42, 0.56, 0.66, 0.6, 0.78, 0.58]];
      const C = [[-1.62, 0.92, 0.92, 0.95, 0.79, 0.79, 0.77], [-1.08, 0.93, 0.93, 1.42, 0.79, 0.79, 0.6], [-0.05, 0.93, 0.93, 1.42, 0.79, 0.79, 0.6], [0.64, 0.92, 0.92, 0.94, 0.79, 0.79, 0.77]];
      car(B, C, { front: [0.6, -0.02], rear: [-1.58, -1.1], side: [-1.45, 0.45] });
      for (const sg of [-1, 1]) P.glow.push(box(3.95, 0.03, 0.02, -0.05, 0.64, sg * 0.935));
      P.trim.push(band(B, -2.2, 2.25, 0.3, 0.42));
      for (const sg of [-1, 1]) lamp(box(0.06, 0.07, 0.44, 2.31, 0.64, sg * 0.5), WHITE);
      lamp(box(0.05, 0.06, 1.4, -2.35, 0.74, 0), RED);
    } else if (type === 'coupe') {   // lage wig: platte neus, steile achterkant, donkere streep over de flanken
      const B = [[-2.36, 0.42, 0.62, 0.86, 0.7, 0.88, 0.76], [-2.1, 0.3, 0.6, 0.93, 0.8, 0.94, 0.82], [0.6, 0.3, 0.58, 0.88, 0.82, 0.95, 0.8], [2.0, 0.3, 0.55, 0.66, 0.8, 0.93, 0.76], [2.37, 0.38, 0.5, 0.56, 0.68, 0.86, 0.64]];
      const C = [[-1.92, 0.92, 0.92, 0.94, 0.8, 0.8, 0.78], [-1.2, 0.91, 0.91, 1.28, 0.8, 0.8, 0.6], [-0.15, 0.89, 0.89, 1.28, 0.8, 0.8, 0.6], [0.8, 0.87, 0.87, 0.89, 0.8, 0.8, 0.78]];
      car(B, C, { front: [0.75, -0.12], rear: [-1.88, -1.22], side: [-1.65, 0.6], arch: 0.74 });
      P.trim.push(band(B, -2.0, 1.7, 0.44, 0.52), band(B, -2.3, 2.3, 0.3, 0.36));
      for (const sg of [-1, 1]) for (const z of [0.6, 0.38]) lamp(box(0.05, 0.08, 0.17, 2.33, 0.5, sg * z), WHITE);
      for (const sg of [-1, 1]) lamp(box(0.05, 0.07, 0.5, -2.36, 0.7, sg * 0.5), RED);
    } else if (type === 'suv') {   // hoge SUV: brede kast, groot glasvlak, donkere onderkant en dakrails
      const B = [[-2.33, 0.38, 0.74, 1.1, 0.84, 0.95, 0.88], [-2.18, 0.34, 0.74, 1.13, 0.88, 0.97, 0.92], [1.0, 0.34, 0.74, 1.11, 0.88, 0.97, 0.92], [2.15, 0.36, 0.72, 1.0, 0.86, 0.95, 0.86], [2.37, 0.48, 0.7, 0.9, 0.78, 0.9, 0.76]];
      const C = [[-2.12, 1.1, 1.1, 1.72, 0.91, 0.91, 0.8], [0.52, 1.1, 1.1, 1.7, 0.91, 0.91, 0.8], [1.1, 1.08, 1.08, 1.1, 0.91, 0.91, 0.9]];
      car(B, C, { front: [1.02, 0.56], side: [-1.95, 0.85], arch: 0.92 });
      P.glass.push(hull([[-2.135, 1.2, 1.2, 1.62, 0.75, 0.75, 0.66], [-2.12, 1.2, 1.2, 1.62, 0.75, 0.75, 0.66]]));   // achterruit
      P.trim.push(band(B, -2.25, 2.2, 0.34, 0.56));
      for (const sg of [-1, 1]) P.trim.push(box(2.4, 0.06, 0.06, -0.8, 1.74, sg * 0.66));
      P.trim.push(box(0.05, 0.2, 0.9, 2.36, 0.78, 0));
      for (const sg of [-1, 1]) { lamp(box(0.05, 0.05, 0.42, 2.33, 0.9, sg * 0.6), WHITE); lamp(box(0.05, 0.07, 0.36, -2.34, 0.95, sg * 0.62), RED); }
    } else if (type === 'wedge') {   // stalen wig-pickup: één schuin vlak van neus tot dak, scherpe zeshoekige wielkasten, lichtbalken
      metal = true;
      const B = [[-2.37, 0.42, 0.98, 1.3, 0.84, 0.95, 0.84], [-2.22, 0.32, 1.0, 1.36, 0.88, 0.98, 0.86], [-0.15, 0.32, 1.02, 1.84, 0.88, 0.98, 0.6], [2.18, 0.32, 0.86, 0.94, 0.88, 0.98, 0.88], [2.38, 0.44, 0.74, 0.86, 0.8, 0.94, 0.86]];
      P.body.push(hull(B));
      P.glass.push(winTop(B, 1.78, -0.08, 0.1), winSide(B, 1.5, -0.95, 0.12, 0.8));
      for (const wx of [-1.45, 1.45]) P.trim.push(arch(B, wx, 0.98));
      P.trim.push(band(B, -2.3, 2.32, 0.32, 0.5));
      lamp(box(0.04, 0.045, 1.66, 2.395, 0.8, 0), WHITE); lamp(box(0.04, 0.05, 1.62, -2.385, 1.22, 0), RED);
    } else if (type === 'stad' || type === 'taxi') {   // kleine hatchback
      const B = [[-2.32, 0.4, 0.62, 0.84, 0.7, 0.86, 0.74], [-2.15, 0.3, 0.62, 0.92, 0.76, 0.88, 0.78], [0.55, 0.3, 0.62, 0.9, 0.78, 0.89, 0.78], [2.1, 0.3, 0.6, 0.8, 0.76, 0.87, 0.74], [2.33, 0.4, 0.56, 0.7, 0.64, 0.8, 0.64]];
      const C = [[-1.58, 0.9, 0.9, 0.93, 0.79, 0.79, 0.77], [-1.18, 0.91, 0.91, 1.42, 0.79, 0.79, 0.64], [0.12, 0.9, 0.9, 1.42, 0.79, 0.79, 0.64], [0.74, 0.88, 0.88, 0.9, 0.79, 0.79, 0.77]];
      car(B, C, { front: [0.7, 0.16], rear: [-1.55, -1.2], side: [-1.4, 0.5] });
      P.trim.push(band(B, -2.25, 2.2, 0.3, 0.42));
      if (type === 'taxi') lamp(box(0.3, 0.14, 0.6, -0.5, 1.5, 0), '#ffe08a');
      for (const sg of [-1, 1]) { lamp(box(0.06, 0.1, 0.3, 2.31, 0.64, sg * 0.55), WHITE); lamp(box(0.06, 0.1, 0.3, -2.33, 0.68, sg * 0.56), RED); }
    } else if (type === 'bestel') {   // bestelbus
      const B = [[-2.34, 0.36, 0.9, 2.0, 0.84, 0.93, 0.84], [-2.2, 0.3, 0.9, 2.05, 0.86, 0.95, 0.86], [0.95, 0.3, 0.9, 2.05, 0.86, 0.95, 0.86], [1.5, 0.3, 0.9, 1.04, 0.86, 0.95, 0.88], [2.2, 0.3, 0.82, 0.93, 0.84, 0.93, 0.84], [2.36, 0.4, 0.7, 0.82, 0.76, 0.88, 0.76]];
      P.body.push(hull(B));
      P.glass.push(winTop(B, 1.45, 1.0, 0.09), winSide(B, 1.0, 1.42, 0.12, 0.85));
      for (const wx of [-1.45, 1.45]) P.trim.push(arch(B, wx, 0.82));
      P.trim.push(band(B, -2.25, 2.25, 0.3, 0.44));
      for (const sg of [-1, 1]) { lamp(box(0.06, 0.12, 0.3, 2.3, 0.66, sg * 0.6), WHITE); lamp(box(0.06, 0.14, 0.24, -2.36, 0.75, sg * 0.66), RED); }
    }
    const merge = list => list.length ? mergeGeos(list.map(g => g.index ? g.toNonIndexed() : g)) : null;
    const lampG = merge(P.lamp); lampG.setAttribute('color', new THREE.Float32BufferAttribute(lampCol, 3));
    return { body: merge(P.body), glass: merge(P.glass), trim: merge(P.trim), glow: merge(P.glow), lamp: lampG, metal };
  }
  // voor de visuele test (test/visueel/voertuigen.js): alle typen naast elkaar op de grond
  window.__lpTest = sc => {
    const g = new THREE.Group(); g.name = 'lpTest';
    LP_TYPES.forEach((t, i) => {
      const G = lpBuildVehicle(t), z = (i - (LP_TYPES.length - 1) / 2) * 3, put = (geo, mat) => { if (geo) { const m = new THREE.Mesh(geo, mat); m.position.set(0, 0, z); m.castShadow = true; g.add(m); } };
      put(G.body, new THREE.MeshStandardMaterial({ color: LP_FIXED[t] || LP_PAINT[i * 3 % LP_PAINT.length], roughness: G.metal ? 0.35 : 0.55, metalness: G.metal ? 0.3 : 0.12, flatShading: true }));
      put(G.glass, new THREE.MeshStandardMaterial({ color: '#1d2b36', roughness: 0.6, metalness: 0.15, flatShading: true }));
      put(G.trim, new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.8, flatShading: true }));
      put(G.glow, new THREE.MeshBasicMaterial({ color: '#ff2a3a' })); put(G.lamp, new THREE.MeshBasicMaterial({ vertexColors: true }));
      for (const [wx, wz] of [[1.45, 0.83], [1.45, -0.83], [-1.45, 0.83], [-1.45, -0.83]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1b1d20', flatShading: true })); w.position.set(wx, 0.36, z + wz); g.add(w); }
    });
    g.position.y = 0.12; sc.add(g); return LP_TYPES.length;
  };
