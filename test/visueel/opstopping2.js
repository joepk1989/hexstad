const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(40); S.cars.setReckless(true); S.cars.update(0.05); });
  const r = await p.evaluate(() => { const S = window.__SC(), L = S.cars.list; for (let i = 0; i < 6000; i++) S.cars.update(0.05);
    return L.filter(c => c.v < 0.2).map(c => ({ d: Math.round(Math.hypot(c.x, c.z)), crash: c.crash ? Math.round(c.crash.t) : 0, why: c.why, wait: Math.round(c.wait || 0), kind: c.kind, rev: c.revWait ? 1 : 0, fly: c.fly ? 1 : 0, roll: +(c.roll || 0).toFixed(1), held: c.held ? 1 : 0, st: Math.round(c.stuck || 0) })); });
  r.forEach(x => console.log(JSON.stringify(x))); await b.close();
})();
