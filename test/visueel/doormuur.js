const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('stad')); await p.waitForTimeout(2500);
 const r = await p.evaluate(() => { const S = window.__SC(); window.__noLod = true; S.cars.setReckless(true); window.__INC.reset(); for (let i = 0; i < 3600; i++) { S.people.update(1 / 60); S.cars.update(1 / 60); }
  return window.__INC.list.map(e => e.kind + ' ' + e.detail.slice(0, 150)); });
 console.log(r.length); for (const l of r.slice(0, 25)) console.log(l); await b.close(); })();
