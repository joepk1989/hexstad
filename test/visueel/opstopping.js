const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(40); S.cars.setReckless(true); S.cars.update(0.05); });
  for (let k = 0; k < 8; k++) {
    const r = await p.evaluate(() => { const S = window.__SC(), L = S.cars.list; for (let i = 0; i < 1200; i++) S.cars.update(0.05);
      const near = L.filter(c => Math.hypot(c.x, c.z) < 60), slow = near.filter(c => c.v < 0.4), why = {};
      for (const c of slow) why[(c.crash ? 'crash' : c.why || '?')] = (why[(c.crash ? 'crash' : c.why || '?')] || 0) + 1;
      return { n: L.length, near: near.length, slow: slow.length, why, stuck: L.filter(c => c.v < 0.2).length, tow: JSON.stringify(S.cars.towTest()), ghost: L.filter(c => c.ghost > 0).length }; });
    console.log(k * 60 + 60, 's', JSON.stringify(r));
  }
  await b.close();
})();
