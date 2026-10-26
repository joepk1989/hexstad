const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(16); S.cars.setReckless(true); S.cars.update(0.05); });
 for (let k = 0; k < 2; k++) console.log(JSON.stringify(await p.evaluate(() => { const S = window.__SC(); let fly = 0, slide = 0, hits = 0; const was = new Map(); for (let i = 0; i < 1200; i++) { S.cars.update(0.05); S.collapse.update(0.05); for (const c of S.cars.list) { const st = c.fly ? 'f' : c.crash ? 'c' : ''; if (st && was.get(c) !== st) { if (st === 'f') fly++; else slide++; } was.set(c, st); } } const st = S.collapse.stats(); return { fly, slide, modules: st.modules, cnt: S.collapse.cnt, rj: S.cars.rejoinStats }; })));
 await b.close(); })();
