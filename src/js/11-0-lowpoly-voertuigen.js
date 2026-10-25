  // ---------- Low-poly voertuigen voor in de stad ----------
  // Kleine, kantige auto's in dezelfde stijl als de gebouwen: vlakke vlakken, een lichte tuimeling naar boven (een afgeknotte zeshoek-doorsnede
  // in plaats van een rechthoek) en kleine lampen. Alle typen delen de afmetingen van de elektrische auto (4,7 m lang, wielbasis 2,9 m, wielen
  // op x = ±1,45 en z = ±0,83), zodat de wegligging, het remmen en de botsingen hetzelfde blijven. Typen: stad (hatchback), bestel, pickup, taxi.
  const LP_PAINT = ['#e8c547', '#d9534f', '#4a90a4', '#f2f3f5', '#3d5a80', '#7bb356', '#e07a3f', '#2b2f36', '#b8a9c9', '#c9ced4'];
  const LP_TYPES = ['stad', 'bestel', 'pickup', 'taxi'];
  function lpBuildVehicle(type) {
    // zijprofiel (x vooruit, y omhoog) uitgetrokken over de breedte; boven y1 trekken de zijkanten k naar binnen: tuimeling
    const prof = (pts, hw, y1 = 99, k = 0.14, y0 = 0.9) => {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))), { depth: 2 * hw, bevelEnabled: false }).toNonIndexed();
      g.translate(0, 0, -hw); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > y0 && y1 > y0) P.setZ(i, P.getZ(i) * (1 - k * Math.min(1, (y - y0) / Math.max(0.01, Math.min(y1, 2.2) - y0)))); }
      g.computeVertexNormals(); return g;
    };
    const box = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z).toNonIndexed();
    const body = [], glass = [], lamp = [], lampCol = [];
    const addLamp = (g, c) => { lamp.push(g); const n = g.attributes.position.count, cc = new THREE.Color(c); for (let i = 0; i < n; i++) lampCol.push(cc.r, cc.g, cc.b); };
    if (type === 'stad' || type === 'taxi') {
      body.push(prof([[-2.1, 0.3], [2.1, 0.3], [2.3, 0.5], [2.28, 0.78], [1.2, 0.86], [0.55, 0.9], [-1.75, 0.92], [-2.25, 0.78], [-2.3, 0.5]], 0.88, 0.92, 0.0));
      body.push(prof([[-1.18, 1.36], [0.16, 1.36], [0.12, 1.47], [-1.14, 1.47]], 0.74, 99, 0));
      glass.push(prof([[-1.5, 0.9], [0.72, 0.9], [0.12, 1.38], [-1.16, 1.38]], 0.8, 1.38, 0.2, 0.9));
      if (type === 'taxi') { addLamp(box(0.32, 0.14, 0.62, -0.5, 1.56, 0), '#ffe08a'); }
    } else if (type === 'bestel') {
      body.push(prof([[-2.3, 0.3], [2.2, 0.3], [2.33, 0.55], [2.25, 0.92], [1.5, 1.0], [1.12, 1.65], [0.95, 2.05], [-2.3, 2.05]], 0.93, 2.05, 0.1, 1.0));
      glass.push(prof([[1.49, 1.04], [1.12, 1.62], [1.0, 1.62], [1.0, 1.04]], 0.935, 1.62, 0.1, 1.0));
      body.push(box(3.25, 0.05, 1.7, -0.675, 2.08, 0));   // dakplaat
    } else if (type === 'pickup') {
      body.push(prof([[-2.3, 0.3], [2.2, 0.3], [2.33, 0.55], [2.25, 0.9], [-2.3, 0.9]], 0.9, 0.9, 0));
      body.push(prof([[-0.45, 0.88], [1.4, 0.88], [1.0, 1.52], [-0.4, 1.52]], 0.86, 1.52, 0.14, 0.88));
      glass.push(prof([[-0.25, 1.0], [1.18, 1.0], [0.9, 1.44], [-0.22, 1.44]], 0.885, 1.44, 0.14, 0.88));
      for (const sg of [-1, 1]) body.push(box(1.85, 0.34, 0.06, -1.4, 1.07, sg * 0.88));
      body.push(box(0.06, 0.34, 1.76, -2.3, 1.07, 0), box(0.06, 0.34, 1.76, -0.48, 1.07, 0));
    }
    addLamp(box(0.1, 0.13, 0.3, type === 'bestel' ? 2.32 : 2.3, 0.64, 0.58), '#fff7d6'); addLamp(box(0.1, 0.13, 0.3, type === 'bestel' ? 2.32 : 2.3, 0.64, -0.58), '#fff7d6');
    addLamp(box(0.1, 0.13, 0.3, -2.3, 0.64, 0.58), '#ff3b30'); addLamp(box(0.1, 0.13, 0.3, -2.3, 0.64, -0.58), '#ff3b30');
    const merge = list => { const m = mergeGeos(list.map(g => { if (!g.attributes.normal) g.computeVertexNormals(); return g; })); return m; };
    const lampG = merge(lamp); lampG.setAttribute('color', new THREE.Float32BufferAttribute(lampCol, 3));
    return { body: merge(body), glass: glass.length ? merge(glass) : null, lamp: lampG };
  }
