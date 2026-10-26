const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 400; i++) { S.cars.update(0.05); } });
 console.log(JSON.stringify(await p.evaluate(() => { const S = window.__SC(); const c = S.getCells(); return { cars: S.cars.list.length, people: S.people.agents.length, pc: S.people.count, inst: c.inst.length }; })));
 await b.close(); })();
