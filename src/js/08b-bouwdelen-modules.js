  // ---------- Bouwdelen als modules ----------
  // De zes bouwdelen (blok, muur, tunnel, tribune, zuilen, hof) als gewone schetsmodules, in dezelfde maten als de
  // bouwdelen zelf. Het zijn getekende driehoeken (alleen uiterlijk): je loopt er niet overheen en er zijn geen
  // trappen. Eenmalig bij het eerste openen aan de lijst toegevoegd; daarna zijn het gewone modules die je kunt
  // aanpassen of weghalen.
  function bouwdeelModules() {
    const N8 = 8, ts8 = R / N8, tris = (fn) => {   // fn(x, z, u, v) → [soort, laag?] of null; u = langs de kijkrichting (zijde 0), v = dwars
      const f = FRAMES[0], out = [];
      for (let i = -14; i <= 14; i++) for (let j = -18; j <= 18; j++) for (const t of [0, 1]) {
        const vs = triVerts(i, j, t, ts8), x = (vs[0][0] + vs[1][0] + vs[2][0]) / 3, z = (vs[0][1] + vs[1][1] + vs[2][1]) / 3, [q, r] = worldToCell(x, z);
        if (q !== 0 || r !== 0) continue;
        const res = fn(x, z, x * f.nx + z * f.nz, -x * f.nz + z * f.nx); if (!res) continue;
        out.push(res.length > 1 ? [i, j, t, res[0], res[1]] : [i, j, t, res[0]]);
      }
      return out;
    };
    const edgeGap = (x, z) => { let d = 1e9; for (let k = 0; k < 6; k++) d = Math.min(d, INNER - (x * FRAMES[k].nx + z * FRAMES[k].nz)); return d; };
    const mk = (name, fn) => { const m = { name, n: N8, k: 0, fine: 0, edges: [], cells: [], paths: [], tris: tris(fn) }; m.codes = moduleCodes(m); return m; };
    const pillars = [0, 1, 2, 3, 4, 5].map(k => { const a = (30 + 60 * k) * Math.PI / 180; return [Math.cos(a) * (R - 0.8), Math.sin(a) * (R - 0.8)]; });
    return [
      mk('Blok', () => ['muur']),
      mk('Muur', (x, z, u) => u > 0 ? ['muur'] : null),
      mk('Tunnel', (x, z, u, v) => Math.abs(v) < CH_HALF ? ['vloer'] : ['muur']),
      mk('Tribune', (x, z, u) => ['muur', Math.floor((u + INNER) / (2 * INNER / 8)) / 8 + 0.125]),
      mk('Zuilen', (x, z) => pillars.some(([px, pz]) => Math.hypot(x - px, z - pz) < ts8 * 0.55) ? ['muur', 0.9] : ['vloer']),
      mk('Hof', (x, z) => {
        const gap = edgeGap(x, z); if (gap > 1.2) return Math.hypot(x, z) < 1.7 ? ['gras'] : ['vloer'];
        for (let k = 0; k < 6; k++) { const F = FRAMES[k]; if (INNER - (x * F.nx + z * F.nz) < 1.2 && Math.abs(-x * F.nz + z * F.nx) < CH_HALF) return ['vloer']; }
        return ['muur'];
      }),
    ];
  }
  try {
    if (!localStorage.getItem('raatstad-bouwdelen1')) {
      const have = new Set(modules.map(m => m.name));
      for (const m of bouwdeelModules()) if (!have.has(m.name)) modules.push(m);
      saveMods(); localStorage.setItem('raatstad-bouwdelen1', '1');
    }
  } catch (e) { /* geen opslag */ }
