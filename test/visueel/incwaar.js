const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 await p.evaluate(() => { window.__DIST = 520; window.__SC().doAct('stad'); }); await p.waitForTimeout(2500);
 const r = await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = +(window.__DIST || 40); S.applyOrbit(); window.__INC.reset(); for (let i = 0; i < 1200; i++) { S.nearbyClear && S.nearbyClear(); S.people.update(0.05); S.cars.update(0.05); }
   return window.__INC.list.map(e => { const c = S.worldToCell(e.x, e.z), I = (S.getCells().inst || []).find(I => (I.m.k ? Math.abs(I.q - c[0]) + Math.abs(I.r - c[1]) <= 2 : I.q === c[0] && I.r === c[1])); return { kind: e.kind, x: +e.x.toFixed(1), y: +e.y.toFixed(1), z: +e.z.toFixed(1), what: e.what || e.info || '', mod: I ? I.m.name + ' rot' + I.rot : '-', cell: c }; }); });
 console.log(JSON.stringify(r, null, 0)); await b.close(); })();
