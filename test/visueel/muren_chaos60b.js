const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 for (const st of ['start', 'stad']) { if (st !== 'start') { await p.evaluate(a => window.__SC().doAct(a), st); await p.waitForTimeout(2500); }
  for (const cam of ['dichtbij', 'ver']) {
   const r = await p.evaluate(cam => { const S = window.__SC(); S.orbit.dist = cam === 'ver' ? 520 : 40; S.applyOrbit(); S.cars.setReckless(true); for (let i = 0; i < 3600; i++) { S.people.update(1 / 60); S.cars.update(1 / 60); } S.cars.setReckless(false); const V = S.people.vecStats(); const L = window.__INC.list.filter(e => e.kind === "muur" || e.kind === "voorwerp").slice(0, 6).map(e => e.kind + " " + e.detail.slice(0, 120)); return { L, inc: document.getElementById("incBtn").textContent, idle: V.idle, nan: V.nan, fall: V.fall }; }, cam);
   console.log(st, cam, JSON.stringify(r)); await p.evaluate(() => { const b = document.querySelector('#incReset'); }); }
 }
 await b.close(); })();
