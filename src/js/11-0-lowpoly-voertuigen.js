  // ---------- Low-poly voertuigen voor in de stad ----------
  // Kantige auto's in dezelfde stijl als de gebouwen: vlakke vlakken, een zijprofiel dat over de breedte is uitgetrokken, en boven de
  // gordellijn een lichte tuimeling (de zijkanten lopen naar binnen), zodat de doorsnede een afgeknotte zeshoek is in plaats van een
  // rechthoek. Alle typen delen de maten van het rijmodel (4,7 m lang, wielbasis 2,9 m, wielen op x = ±1,45 en z = ±0,83), zodat
  // wegligging, remmen en botsingen gelijk blijven. Per type: carrosserie (lak, per auto een kleur), ruiten, donkere delen (bumpers,
  // strepen, bekleding), lichtlijnen in een accentkleur en lampen. Voorbeelden (eigen ontwerpen, geen merken): een hoekige sedan met
  // lichtlijnen, een lage wigvormige coupé met zwarte streep, een hoge SUV met donkere bekleding en een strakke wig-pickup van staal.
  const LP_PAINT = ['#e8c547', '#d9534f', '#4a90a4', '#f2f3f5', '#3d5a80', '#7bb356', '#e07a3f', '#2b2f36', '#b8a9c9', '#c9ced4', '#5a1f2a', '#b5a36a', '#1c1f24'];
  const LP_TYPES = ['sedan', 'coupe', 'suv', 'wedge', 'stad', 'bestel', 'taxi'];
  const LP_WEIGHT = { sedan: 0.2, coupe: 0.12, suv: 0.18, wedge: 0.1, stad: 0.2, bestel: 0.12, taxi: 0.08 };
  const LP_FIXED = { taxi: '#f2c230', wedge: '#cfd4d9' };   // vaste kleuren; de rest kiest uit LP_PAINT
  function lpBuildVehicle(type) {
    // zijprofiel (x vooruit, y omhoog) uitgetrokken over de breedte 2·hw; boven yb trekken de zijkanten tot tum naar binnen (tuimeling)
    const prof = (pts, hw, tum = 0, yb = 0.9) => {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))), { depth: 2 * hw, bevelEnabled: false }).toNonIndexed();
      g.translate(0, 0, -hw); const P = g.attributes.position, ymax = Math.max(...pts.map(p => p[1]));
      if (tum) for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > yb) P.setZ(i, P.getZ(i) * (1 - tum * (y - yb) / Math.max(0.01, ymax - yb))); }
      g.computeVertexNormals(); return g;
    };
    const box = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z).toNonIndexed();
    const P = { body: [], glass: [], trim: [], glow: [], lamp: [] }, lampCol = [];
    const lamp = (g, c) => { P.lamp.push(g); const n = g.attributes.position.count, cc = new THREE.Color(c); for (let i = 0; i < n; i++) lampCol.push(cc.r, cc.g, cc.b); };
    const WHITE = '#fff7d6', RED = '#ff3b30';
    let metal = false;
    if (type === 'sedan') {   // hoekige sedan: lange motorkap, schuine ruiten, lichtlijn langs de flank
      P.body.push(prof([[-2.25, 0.3], [2.2, 0.3], [2.34, 0.5], [2.28, 0.74], [1.35, 0.86], [0.6, 0.92], [-1.65, 0.96], [-2.3, 0.84], [-2.34, 0.55]], 0.9, 0.12, 0.62));
      P.glass.push(prof([[-1.55, 0.94], [0.62, 0.9], [-0.05, 1.36], [-1.05, 1.38]], 0.8, 0.18, 0.9));
      P.body.push(prof([[-1.1, 1.34], [0.0, 1.33], [-0.04, 1.43], [-1.06, 1.44]], 0.7), box(0.12, 0.42, 1.48, -0.45, 1.15, 0));
      for (const sg of [-1, 1]) P.glow.push(box(3.9, 0.035, 0.02, -0.05, 0.6, sg * 0.905));
      P.trim.push(box(4.1, 0.14, 1.82, 0, 0.37, 0), box(0.04, 0.16, 1.2, 2.33, 0.52, 0));
      for (const sg of [-1, 1]) lamp(box(0.06, 0.09, 0.42, 2.3, 0.66, sg * 0.56), WHITE);
      lamp(box(0.05, 0.07, 1.5, -2.33, 0.72, 0), RED);
    } else if (type === 'coupe') {   // lage wig: platte neus, steile achterkant, zwarte streep over de flanken
      P.body.push(prof([[-2.25, 0.3], [2.25, 0.3], [2.35, 0.5], [2.25, 0.66], [0.75, 0.88], [-1.95, 0.92], [-2.3, 0.82], [-2.35, 0.55]], 0.92, 0.08, 0.7));
      P.glass.push(prof([[0.8, 0.87], [-0.15, 1.25], [-1.2, 1.25], [-1.85, 0.93]], 0.82, 0.22, 0.88));
      P.body.push(prof([[-1.15, 1.23], [-0.18, 1.23], [-0.2, 1.3], [-1.12, 1.3]], 0.66));
      P.trim.push(box(4.2, 0.13, 1.87, 0, 0.5, 0), box(0.1, 0.16, 1.8, 2.33, 0.4, 0), box(0.1, 0.16, 1.8, -2.33, 0.4, 0));
      for (const sg of [-1, 1]) for (const z of [0.62, 0.4]) lamp(box(0.05, 0.1, 0.18, 2.3, 0.6, sg * z), WHITE);
      for (const sg of [-1, 1]) lamp(box(0.05, 0.08, 0.5, -2.36, 0.68, sg * 0.55), RED);
    } else if (type === 'suv') {   // hoge SUV: rechte kast, groot glasvlak, donkere onderkant en dakrails
      P.body.push(prof([[-2.3, 0.34], [2.2, 0.34], [2.34, 0.58], [2.3, 0.98], [1.6, 1.06], [1.05, 1.1], [-2.3, 1.12]], 0.94));
      P.glass.push(prof([[-2.15, 1.08], [1.08, 1.08], [0.6, 1.68], [-2.05, 1.7]], 0.89, 0.1, 1.08));
      P.body.push(prof([[-2.12, 1.66], [0.62, 1.64], [0.56, 1.76], [-2.1, 1.78]], 0.86), box(0.14, 0.58, 1.74, -0.65, 1.38, 0), box(0.18, 0.6, 1.72, -2.02, 1.39, 0));
      P.trim.push(box(4.5, 0.24, 1.92, 0, 0.46, 0), box(0.05, 0.22, 0.9, 2.33, 0.8, 0));
      for (const sg of [-1, 1]) P.trim.push(box(2.3, 0.06, 0.06, -0.75, 1.8, sg * 0.7));
      for (const sg of [-1, 1]) { lamp(box(0.05, 0.06, 0.45, 2.31, 0.9, sg * 0.62), WHITE); lamp(box(0.05, 0.08, 0.4, -2.32, 0.92, sg * 0.6), RED); }
    } else if (type === 'wedge') {   // stalen wig-pickup: één schuin vlak van neus tot dak, lichtbalk voor en achter
      metal = true;
      const Y = x => 0.8 + 0.36 * (2.3 - x);
      P.body.push(prof([[-2.3, 0.32], [2.3, 0.32], [2.36, 0.62], [2.32, 0.8], [-0.2, 1.7], [-2.32, 1.22]], 0.95));
      P.glass.push(prof([[1.7, Y(1.7)], [-0.05, Y(-0.05)], [-0.05, Y(-0.05) + 0.025], [1.7, Y(1.7) + 0.025]], 0.82));
      P.glass.push(prof([[1.45, 1.02], [1.45, Y(1.45) - 0.03], [-0.15, Y(-0.15) - 0.03], [-0.9, 1.48], [-0.9, 1.02]], 0.955));
      P.trim.push(box(4.6, 0.26, 1.94, 0, 0.45, 0));
      lamp(box(0.04, 0.04, 1.8, 2.33, 0.81, 0), WHITE); lamp(box(0.04, 0.05, 1.8, -2.33, 1.18, 0), RED);
    } else if (type === 'stad' || type === 'taxi') {   // kleine hatchback
      P.body.push(prof([[-2.1, 0.3], [2.1, 0.3], [2.3, 0.5], [2.28, 0.78], [1.2, 0.86], [0.55, 0.9], [-1.75, 0.92], [-2.25, 0.78], [-2.3, 0.5]], 0.88));
      P.body.push(prof([[-1.18, 1.36], [0.16, 1.36], [0.12, 1.47], [-1.14, 1.47]], 0.74));
      P.glass.push(prof([[-1.5, 0.9], [0.72, 0.9], [0.12, 1.38], [-1.16, 1.38]], 0.8, 0.2, 0.9));
      P.trim.push(box(0.1, 0.14, 1.7, 2.3, 0.38, 0), box(0.1, 0.14, 1.7, -2.3, 0.38, 0));
      if (type === 'taxi') lamp(box(0.32, 0.14, 0.62, -0.5, 1.56, 0), '#ffe08a');
      for (const sg of [-1, 1]) { lamp(box(0.1, 0.13, 0.3, 2.3, 0.64, sg * 0.58), WHITE); lamp(box(0.1, 0.13, 0.3, -2.3, 0.64, sg * 0.58), RED); }
    } else if (type === 'bestel') {   // bestelbus
      P.body.push(prof([[-2.3, 0.3], [2.2, 0.3], [2.33, 0.55], [2.25, 0.92], [1.5, 1.0], [1.12, 1.65], [0.95, 2.05], [-2.3, 2.05]], 0.93, 0.1, 1.0));
      P.glass.push(prof([[1.49, 1.04], [1.12, 1.62], [1.0, 1.62], [1.0, 1.04]], 0.935, 0.1, 1.0));
      P.body.push(box(3.25, 0.05, 1.7, -0.675, 2.08, 0));   // dakplaat boven de laadruimte
      P.trim.push(box(0.1, 0.16, 1.8, 2.3, 0.4, 0), box(0.1, 0.16, 1.8, -2.32, 0.4, 0));
      for (const sg of [-1, 1]) { lamp(box(0.1, 0.13, 0.3, 2.32, 0.64, sg * 0.58), WHITE); lamp(box(0.1, 0.13, 0.3, -2.32, 0.7, sg * 0.62), RED); }
    }
    const merge = list => list.length ? mergeGeos(list) : null;
    const lampG = merge(P.lamp); lampG.setAttribute('color', new THREE.Float32BufferAttribute(lampCol, 3));
    return { body: merge(P.body), glass: merge(P.glass), trim: merge(P.trim), glow: merge(P.glow), lamp: lampG, metal };
  }
  // voor de visuele test (test/visueel/voertuigen.js): alle typen naast elkaar op de grond
  window.__lpTest = sc => {
    const g = new THREE.Group(); g.name = 'lpTest';
    LP_TYPES.forEach((t, i) => {
      const G = lpBuildVehicle(t), z = (i - (LP_TYPES.length - 1) / 2) * 3, put = (geo, mat) => { if (geo) { const m = new THREE.Mesh(geo, mat); m.position.set(0, 0, z); m.castShadow = true; g.add(m); } };
      put(G.body, new THREE.MeshStandardMaterial({ color: LP_FIXED[t] || LP_PAINT[i * 3 % LP_PAINT.length], roughness: G.metal ? 0.35 : 0.55, metalness: G.metal ? 0.3 : 0.12, flatShading: true }));
      put(G.glass, new THREE.MeshStandardMaterial({ color: '#20303c', roughness: 0.25, metalness: 0.5, flatShading: true }));
      put(G.trim, new THREE.MeshStandardMaterial({ color: '#25282c', roughness: 0.8, flatShading: true }));
      put(G.glow, new THREE.MeshBasicMaterial({ color: '#ff2a3a' })); put(G.lamp, new THREE.MeshBasicMaterial({ vertexColors: true }));
      for (const [wx, wz] of [[1.45, 0.83], [1.45, -0.83], [-1.45, 0.83], [-1.45, -0.83]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1b1d20', flatShading: true })); w.position.set(wx, 0.36, z + wz); g.add(w); }
    });
    g.position.y = 0.12; sc.add(g); return LP_TYPES.length;
  };
