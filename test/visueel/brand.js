const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(16); S.cars.setReckless(true); S.cars.update(0.05); });
 for (let k = 0; k < 3; k++) {
  const r = await p.evaluate(() => { const S = window.__SC(); const was = new Map(); let expl = 0, maxBurn = 0, shot = null; for (let i = 0; i < 1200; i++) { S.cars.update(0.05); S.collapse.update(0.05); let nb = 0; for (const c of S.cars.list) { const b = !!c.burn; if (b) nb++; if (was.get(c) && !b) expl++; was.set(c, b); if (b && !shot && c.burn.t > 1.5) { shot = { x: c.x, z: c.z }; S.orbit.target.set(c.x, 1, c.z); S.orbit.dist = 26; S.orbit.phi = 1.0; S.orbit.theta = 0.7; S.applyOrbit(); window.__shot = 1; } } maxBurn = Math.max(maxBurn, nb); if (shot && window.__shot === 1) { window.__shot = 2; return { shot, early: true, i }; } }
   const hp = S.cars.list.map(c => c.hp ?? 100); return { expl, maxBurn, rook: hp.filter(h => h < 65).length, hpMin: Math.min(...hp), n: S.cars.list.length, tows: S.cars.tows.length }; });
  console.log(JSON.stringify(r));
  if (r.early) { await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/brand1.png' }); await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 25; i++) { S.cars.update(0.05); } }); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/brand2.png' }); }
 }
 await b.close(); })();
