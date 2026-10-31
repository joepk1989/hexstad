// Domino: puin van een kantoortoren raakt het huis ernaast
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods; c.inst = [];
   const add = (nm, q, r) => { const m = mods.find(m => m.name.startsWith(nm)); c.inst.push({ mid: m.id, m: S.instData(m, false), q, r, rot: 0 }); };
   add('Kantoortoren · glas', 0, 0); add('Rijhuis · baksteen · 2L', 1, 0); S.rebuildAll();
   const w = S.cellToWorld(0, 0), B = S.collapse.prep(w.x, w.z), w2 = S.cellToWorld(1, 0), B2 = S.collapse.prep(w2.x, w2.z);
   const st0 = B2.P.filter(q => q.st === 'stand').length;
   // de toren: de hele westkant van de onderste drie lagen weg, zodat hij naar het oosten (het huis) omvalt
   const n = S.collapse.knock(B, q => q.c.x < w.x - 2 && q.c.y - B.G < 9.5 && !q.flat);
   for (let i = 0; i < 420; i++) S.collapse.update(1 / 30);
   return { los: n, torenStaand: B.P.filter(q => q.st === 'stand').length, huisVoor: st0, huisNa: B2.P.filter(q => q.st === 'stand').length, puin: S.collapse.stats().pieces }; });
 console.log(JSON.stringify(r));
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x + 8, 4, w.z); S.orbit.theta = 0.4; S.orbit.phi = 1.1; S.orbit.dist = 60; S.applyOrbit(); });
 await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/domino.png' });
 await b.close(); })();
