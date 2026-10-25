const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 640 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(30); S.cars.setReckless(true); S.cars.update(0.05); });
  for (const ph of ['swing', 'out']) {
    const r = await p.evaluate(ph => { const S = window.__SC(); for (let i = 0; i < 4000; i++) { S.cars.update(0.05); const T = S.cars.tows.find(t => t.phase === ph && (ph === 'swing' || t.dist > 3) && t.wreck); if (T) { S.orbit.target.set(T.x - T.fx * 2.5, 0.8, T.z - T.fz * 2.5); S.orbit.dist = 16; S.orbit.phi = 0.75; S.orbit.theta = -T.R + 2.3; S.applyOrbit(); window.__T = T; return i; } } return -1; }, ph);
    console.log(ph, r);
    await p.evaluate(() => { const S = window.__SC(), T = window.__T; S.orbit.target.set(T.x - T.fx * 2.5, 0.8, T.z - T.fz * 2.5); S.applyOrbit(); });
    await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/takel_' + ph + '.png' });
  }
  await b.close();
})();
