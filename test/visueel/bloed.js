const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 640 });
  await p.evaluate(() => window.__SC().doAct('start')); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const S = window.__SC(), cars = S.cars, ppl = S.people;
    const types = {}; for (const c of cars.list) types[c.type] = (types[c.type] || 0) + 1;
    const c = cars.list.find(c => !c.crash) || cars.list[0], a = ppl.agents[0];
    a.x = c.x + Math.cos(c.h) * 2; a.z = c.z + Math.sin(c.h) * 2;
    for (let i = 0; i < 4; i++) cars.goreAt(c, a, Math.cos(c.h) * 8, Math.sin(c.h) * 8, 8);
    cars.update(0.05);
    S.orbit.target.set(c.x, 0.8, c.z); S.orbit.dist = 7; S.orbit.phi = 1.1; S.orbit.theta = -c.h + 0.5; S.applyOrbit();
    window.__c = c; return { t: c.type, types, blood: c.blood };
  });
  console.log(JSON.stringify(r));
  for (let i = 0; i < 40; i++) await p.evaluate(() => window.__SC().cars.update(0.05));
  await p.evaluate(() => { const S = window.__SC(), c = window.__c; S.orbit.target.set(c.x, 0.8, c.z); S.orbit.dist = 8; S.applyOrbit(); });
  await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/bloed1.png' });
  console.log(JSON.stringify(await p.evaluate(() => window.__SC().cars.goreTest())));
  await b.close();
})();
