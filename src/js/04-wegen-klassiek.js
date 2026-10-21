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
