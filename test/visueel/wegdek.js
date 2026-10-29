// Gelaagde stad: weg over een wegdek, een module boven de weg op poten
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1200, height: 760 }); if (process.env.RB) await p.evaluate(() => window.__RB = 1);
 p.on('console', m => { if (/poten|wegdek|Error/i.test(m.text())) console.log('LOG', m.text()); });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods;
   const W = (q, r) => { const w = S.cellToWorld(q, r); return [w.x, w.z]; };
   c.paths = [{ t: 'weg', l: 0, r: 0, p: [W(-8, 0), W(8, 0)] }, { t: 'weg', l: 0, r: 0, p: [W(0, -8), W(0, 8)] }];
   S.rebuildAll();
   const out = { deks: mods.filter(m => /^Wegdek/.test(m.name)).map(m => m.name) };
   // wegdek op de eerste weg zetten met het gereedschap
   const di = mods.findIndex(m => /^Wegdek · hoog/.test(m.name)); S.modSel(di); S.selectTool('module'); out.dek = S.place(4, 0);
   const P = S.pathProf(c.paths[0]); const hAt = x => { let bi = 0, bd = 1e9; P.pts.forEach((q, i) => { const d = Math.abs(q[0] - x) + Math.abs(q[1]); if (d < bd) { bd = d; bi = i; } }); return +P.h[bi].toFixed(2); };
   out.profiel = [-100, 0, 20, 40, 50, 62, 70, 80, 100, 124].map(x => [x, hAt(x)]);
   // een huis boven de tweede weg (automatische laag)
   const hi = mods.findIndex(m => /^Stadswoning · wit/.test(m.name)); S.modSel(hi);
   out.autoLv = S.overRoadLv(mods[hi], 0, 0, 4); S.place(0, 4);
   out.inst = c.inst.map(I => [I.m.name, I.q, I.r, I.lv || 0]);
   out.poten = [...S.buildLegs().values()].map(L => L.length); if (window.__RB) S.rebuildAll();
   return out; });
 console.log(JSON.stringify(r));
 await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(30, 3, 30); S.orbit.theta = 0.5; S.orbit.phi = 1.05; S.orbit.dist = 120; S.applyOrbit(); });
 await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/wegdek1.png' });
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(4, 0); S.orbit.target.set(w.x, 5, w.z); S.orbit.theta = 2.2; S.orbit.phi = 1.25; S.orbit.dist = 45; S.applyOrbit(); });
 await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/wegdek2.png' });
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 4); S.orbit.target.set(w.x, 4, w.z); S.orbit.theta = 1.2; S.orbit.phi = 1.3; S.orbit.dist = 40; S.applyOrbit(); });
 await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/wegdek3.png' });
 await b.close(); })();
