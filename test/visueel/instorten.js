const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 620 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  await p.evaluate(() => { const S = window.__SC(), I = S.getCells().inst.filter(I => I.m.cat === 'Wonen' && !I.lv)[0]; const w = S.cellToWorld(I.q, I.r); S.collapse.hit(w.x, w.z, 5, 1, 0); });
  const info = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); const I = c.inst.filter(I => I.m.cat === 'Wonen' && !I.lv)[0]; const w = S.cellToWorld(I.q, I.r);
    window.__I = I; window.__w = w; S.orbit.target.set(w.x, 3, w.z); S.orbit.dist = 55; S.orbit.phi = 1.0; S.orbit.theta = 0.8; S.applyOrbit(); return { name: I.m.name, w }; });
  console.log(JSON.stringify(info)); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + '/instort0.png' });
  const t0 = Date.now();
  const r = await p.evaluate(() => { const S = window.__SC(), w = window.__w; const st = S.collapse.dbg(); const W = st.P.filter(p => !p.flat && p.hy > 0.9 && p.c.y < st.G + 2.5).sort((a, b) => Math.hypot(b.c.x - w.x, b.c.z - w.z) - Math.hypot(a.c.x - w.x, a.c.z - w.z))[0]; const dx = W.c.x - w.x, dz = W.c.z - w.z, l = Math.hypot(dx, dz); const ok = S.collapse.hit(W.c.x - dx / l * 0.7, W.c.z - dz / l * 0.7, 22, -dx / l, -dz / l); S.orbit.target.set(W.c.x, 3, W.c.z); S.orbit.dist = 32; S.orbit.phi = 1.15; S.orbit.theta = Math.atan2(dx / l, dz / l); S.applyOrbit(); return { ok, stats: S.collapse.stats() }; });
  console.log('na klap', JSON.stringify(r), Date.now() - t0, 'ms');
  await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/instort0b.png' });
  for (let k = 0; k < 4; k++) { await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 12; i++) S.collapse.update(0.05); }); console.log('t', (k + 1) * 0.6, JSON.stringify(await p.evaluate(() => window.__SC().collapse.stats()))); if (k === 1) { await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/instort1.png' }); } }
  await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 160; i++) S.collapse.update(0.05); }); await p.waitForTimeout(500);
  console.log('later', JSON.stringify(await p.evaluate(() => window.__SC().collapse.stats())));
  await p.screenshot({ path: OUT + '/instort2.png' });
  await b.close();
})();
