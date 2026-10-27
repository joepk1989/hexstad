const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 }); await p.evaluate(() => { window.__noLod = true; });
 p.on('pageerror', e => console.log('FOUT', e.message));
 for (const st of ['start', 'stad']) { if (st !== 'start') { await p.evaluate(a => window.__SC().doAct(a), st); await p.waitForTimeout(2500); }
  for (const cam of ['dichtbij', 'ver']) {
   const r = await p.evaluate(cam => { const S = window.__SC(); S.orbit.dist = cam === 'ver' ? 520 : 40; S.applyOrbit(); for (let i = 0; i < 1200; i++) { S.nearbyClear && S.nearbyClear(); S.people.update(0.05); S.cars.update(0.05); } const V = S.people.vecStats(); return { inc: document.getElementById('incBtn').textContent, idle: V.idle, nan: V.nan, fall: V.fall }; }, cam);
   console.log(st, cam, JSON.stringify(r)); await p.evaluate(() => { const b = document.querySelector('#incReset'); }); }
 }
 await b.close(); })();
