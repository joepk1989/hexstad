  // ---------- Stadsgrens en wijzer naar het centrum ----------
  // De camera (en de wandelaar) blijven binnen een cirkel rond je stad: de straal is de stad zelf plus 160 m
  // (minstens 220 m). Staat het centrum niet in beeld, dan wijst een pijl aan de rand van het scherm ernaartoe;
  // klik erop en de camera vliegt terug.
  const CITY = { cx: 0, cz: 0, rad: 0, lim: 220, t: 0, fly: null, warned: 0 };
  function cityMeasure() {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0;
    const add = (x, z) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; n++; };
    for (const k of cells.keys()) { const [q, r] = k.split(',').map(Number); if (!isFinite(q)) continue; const c = cellToWorld(q, r); add(c.x, c.z); }
    for (const p of cells.paths || []) for (const pt of p.p || []) add(pt[0], pt[1]);
    for (const I of cells.inst || []) if (isFinite(I.q)) { const c = cellToWorld(I.q, I.r); add(c.x, c.z); }
    for (const r of cells.rails || []) for (const pt of r.p || []) add(pt[0], pt[1]);   // het getekende stuk spoor (niet de doorloop)
    if (!n) { CITY.cx = 0; CITY.cz = 0; CITY.rad = 0; }
    else {
      CITY.cx = (x0 + x1) / 2; CITY.cz = (z0 + z1) / 2; CITY.rad = 0;
      const chk = (x, z) => { const d = Math.hypot(x - CITY.cx, z - CITY.cz); if (d > CITY.rad) CITY.rad = d; };
      for (const k of cells.keys()) { const [q, r] = k.split(',').map(Number); if (!isFinite(q)) continue; const c = cellToWorld(q, r); chk(c.x, c.z); }
      for (const p of cells.paths || []) for (const pt of p.p || []) chk(pt[0], pt[1]);
      for (const r of cells.rails || []) for (const pt of r.p || []) chk(pt[0], pt[1]);
      CITY.rad += R;
    }
    CITY.lim = Math.max(220, CITY.rad + 160);
  }
  const cityArrow = document.createElement('button');
  cityArrow.type = 'button'; cityArrow.className = 'city-arrow'; cityArrow.hidden = true; cityArrow.title = 'Terug naar het centrum van je stad';
  cityArrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span></span>';
  document.body.appendChild(cityArrow);
  cityArrow.addEventListener('click', e => { e.stopPropagation(); if (mode === 'walk') return; CITY.fly = { x: CITY.cx, z: CITY.cz, t: 0, fx: orbit.target.x, fz: orbit.target.z }; });
  const cityV = new THREE.Vector3();
  function cityTick(dt) {
    if ((CITY.t -= dt) <= 0) { CITY.t = 1; cityMeasure(); }
    // terugvliegen na een klik op de pijl
    if (CITY.fly && mode !== 'walk') {
      const F = CITY.fly; F.t = Math.min(1, F.t + dt / 0.8); const s = F.t * F.t * (3 - 2 * F.t);
      orbit.target.x = F.fx + (F.x - F.fx) * s; orbit.target.z = F.fz + (F.z - F.fz) * s; applyOrbit();
      if (F.t >= 1) CITY.fly = null;
    }
    // niet te ver weg: zacht terugveren naar de rand van het gebied
    if (mode === 'walk') {
      const dx = player.x - CITY.cx, dz = player.z - CITY.cz, d = Math.hypot(dx, dz), L = CITY.lim + 40;
      if (d > L) { player.x = CITY.cx + dx / d * L; player.z = CITY.cz + dz / d * L; if (performance.now() - CITY.warned > 4000) { CITY.warned = performance.now(); toast('Hier houdt het op: verder van je stad kun je niet', 1800); } }
    } else {
      const dx = orbit.target.x - CITY.cx, dz = orbit.target.z - CITY.cz, d = Math.hypot(dx, dz);
      if (d > CITY.lim) { const k = Math.min(1, dt * 6), nx = CITY.cx + dx / d * CITY.lim, nz = CITY.cz + dz / d * CITY.lim; orbit.target.x += (nx - orbit.target.x) * k; orbit.target.z += (nz - orbit.target.z) * k; applyOrbit(); }
    }
    // pijl naar het centrum als dat niet in beeld is
    cityV.set(CITY.cx, 0, CITY.cz).project(camera);
    const W = window.innerWidth, H = window.innerHeight, behind = cityV.z > 1;
    let sx = (cityV.x + 1) / 2 * W, sy = (1 - cityV.y) / 2 * H;
    const M = 70, inView = !behind && sx > M && sx < W - M && sy > M && sy < H - M;
    if (inView || (CITY.rad === 0 && Math.hypot(orbit.target.x, orbit.target.z) < 30)) { cityArrow.hidden = true; return; }
    if (behind) { sx = W - sx; sy = H - sy; }
    let vx = sx - W / 2, vy = sy - H / 2; if (behind && Math.hypot(vx, vy) < 1) vy = 1;
    const mT = 120, mB = 130, mS = 90;   // vrij van de balk bovenaan en het palet onderaan
    const sc = Math.min((vx > 0 ? W / 2 - mS : W / 2 - mS) / Math.max(1e-6, Math.abs(vx)), (vy > 0 ? H / 2 - mB : H / 2 - mT) / Math.max(1e-6, Math.abs(vy)));
    const px = W / 2 + vx * sc, py = H / 2 + vy * sc, ang = Math.atan2(vy, vx) * 180 / Math.PI;
    cityArrow.hidden = false; cityArrow.style.left = px + 'px'; cityArrow.style.top = py + 'px';
    cityArrow.querySelector('svg').style.transform = `rotate(${ang}deg)`;
    const fx = mode === 'walk' ? player.x : orbit.target.x, fz = mode === 'walk' ? player.z : orbit.target.z;
    cityArrow.querySelector('span').textContent = 'Centrum · ' + Math.round(Math.hypot(fx - CITY.cx, fz - CITY.cz)) + ' m';
  }
