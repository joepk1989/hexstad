  // ---------- Wegen: restanten van het oude vakwegsysteem die andere delen nog gebruiken ----------
  // De vakwegen zelf zijn getekende wegen geworden (zie 07). Hier blijven alleen de sleutelfunctie voor het
  // padnetwerk, de standaardhoogtes van rijbaan en stoep, en een punt-in-veelhoek-test.
  const lk = (q, r, y) => q + ',' + r + ',' + (Math.abs(y) < 0.005 ? 0 : y).toFixed(2);
  const WALK_H = 0.25, ASPH_H = 0.12;
  function inPoly(x, z, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, zi] = pts[i], [xj, zj] = pts[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }
  // Materialen van stoeptegels, klinkers en steen: gebruikt door paden, looppaden, blokken, tunnels, tribunes en hoven
  // Stoeptegels 30 x 30 cm; de textuur beslaat 0,6 x 0,6 m en herhaalt zich
  M.walkTop = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#cbc8bd'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(90,86,76,0.28)';
    g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 2); g.fillRect(0, 0, 2, 128); g.fillRect(64, 0, 2, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.6, 1 / 0.6); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.95 });
  })();
  M.kerb = std({ color: '#a7a499', roughness: 0.9 });
  // Klinkers 20 x 10 cm in halfsteens verband; textuur beslaat 0,6 x 0,6 m
  M.paver = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), bw = 128 / 3, bh = 128 / 6;
    g.fillStyle = '#7d4a3a'; g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 6; row++) for (let i = -1; i < 4; i++) {
      const x = i * bw + (row % 2) * bw / 2, v = Math.abs(Math.sin(i * 91.7 + row * 37.3) * 4375.85) % 1;
      g.fillStyle = `hsl(${12 + v * 8}, ${38 + v * 10}%, ${36 + v * 9}%)`;
      g.fillRect(x + 1.2, row * bh + 1.2, bw - 2.4, bh - 2.4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.6, 1 / 0.6); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.95 });
  })();
  M.paverPlain = std({ color: '#8a5141' });
  M.stone = std({ color: '#bdb5a5' });
  M.rail = std({ color: '#3b4248', roughness: 0.5, metalness: 0.4 });
  M.hofWall = std({ color: '#93503b' });
  M.bench = std({ color: '#7a5a3c' });
  M.blockSide = std({ color: '#b9ad96' });
  M.blockTop = std({ color: '#c9bfab' });
