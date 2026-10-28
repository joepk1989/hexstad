const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 for (const st of ['start', 'stad']) { if (st !== 'start') { await p.evaluate(a => window.__SC().doAct(a), st); await p.waitForTimeout(2500); }
  for (const cam of ['dichtbij', 'ver']) {
   const r = await p.evaluate(cam => { const S = window.__SC(); S.orbit.dist = cam === "ver" ? 520 : 40; S.applyOrbit(); window.__INC.dbg = true; for (let i = 0; i < 1200; i++) { S.nearbyClear && S.nearbyClear(); S.people.update(0.05); S.cars.update(0.05); } const V = S.people.vecStats(); return { inc: document.getElementById("incBtn").textContent, lijst: window.__INC.list.map(e => { const c = S.worldToCell(e.x, e.z), I = (S.getCells().inst || []).find(I => Math.abs(I.q - c[0]) + Math.abs(I.r - c[1]) <= (I.m.k ? 2 : 0)); return [e.kind, +e.x.toFixed(1), +e.y.toFixed(1), +e.z.toFixed(1), I ? I.m.name : "-", (e.detail || "").slice(0, 700)]; }) }; }, cam);
   console.log(st, cam, JSON.stringify(r)); await p.evaluate(() => { const b = document.querySelector('#incReset'); }); }
 }
 await b.close(); })();
