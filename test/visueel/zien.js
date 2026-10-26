const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 620 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(14); S.cars.setReckless(true); S.cars.update(0.05); });
  const r = await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 6000; i++) { S.cars.update(0.05); S.collapse.update(0.05); if (i%400==0) console.log('x'); if (S.collapse.stats().modules) { const d = S.collapse.dbg(); const P = d.P.filter(p => p.c); const I = P.length ? {m:{name:'x'}} : null; if (I) { const w = {x: P.reduce((a,p)=>a+p.c.x,0)/P.length, z: P.reduce((a,p)=>a+p.c.z,0)/P.length}; S.orbit.target.set(w.x, 3, w.z); S.orbit.dist = 45; S.orbit.phi = 1.0; S.orbit.theta = 0.8; S.applyOrbit(); return { t: i * 0.05, w, name: I.m.name, st: S.collapse.stats() }; } } } return null; });
  console.log(JSON.stringify(r));
  if (r) { for (const k of [0, 1, 2]) { await p.waitForTimeout(600); await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 10; i++) { S.collapse.update(0.05); } }); await p.screenshot({ path: OUT + '/zien' + k + '.png' }); } }
  await b.close();
})();
