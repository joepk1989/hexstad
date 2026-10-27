const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 }); await p.evaluate(() => window.__SC().doAct('stad')); await p.waitForTimeout(2500);
 console.log(await p.evaluate(() => { const S = window.__SC(); S.people.update(0.05); S.cars.update(0.05); return { mensen: S.people.agents.length, autos: S.cars.list.length, inst: S.getCells().inst.length }; })); await b.close(); })();
