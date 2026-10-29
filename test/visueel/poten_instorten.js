// Module boven de weg: poten wegslaan, dan valt hij
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods;
   const W = (q, r) => { const w = S.cellToWorld(q, r); return [w.x, w.z]; }; c.paths = [{ t: 'weg', l: 0, r: 0, p: [W(0, -6), W(0, 6)] }]; S.rebuildAll();
   S.modSel(mods.findIndex(m => /^Stadswoning · wit/.test(m.name))); S.selectTool('module'); S.place(0, 0);
   const w = S.cellToWorld(0, 0), B = S.collapse.prep(w.x, w.z); const legs = B.P.filter(q => q.leg).length, gy = B.gy;
   const n = S.collapse.knock(B, q => q.leg); for (let i = 0; i < 200; i++) S.collapse.update(1 / 30);
   return { lv: c.inst[0].lv, poten: legs, grond: gy, los: n, staand: B.P.filter(q => q.st === 'stand').length, totaal: B.P.length }; });
 console.log(JSON.stringify(r));
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 3, w.z); S.orbit.theta = 1.2; S.orbit.phi = 1.2; S.orbit.dist = 45; S.applyOrbit(); });
 await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/poten_instorten.png' });
 await b.close(); })();
