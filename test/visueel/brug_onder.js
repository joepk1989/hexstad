// Bruggen van onderen en opzij bekijken: viaduct over snelweg, brug over water, weg over een wegdek
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods;
   const W = (q, r) => { const w = S.cellToWorld(q, r); return [w.x, w.z]; };
   c.paths = [{ t: 'snel', l: 0, r: 0, p: [W(-12, 0), W(12, 0)] }, { t: 'weg', l: 0, r: 0, p: [W(0, -8), W(0, 8)] }, { t: 'weg', l: 0, r: 0, p: [W(-10, 10), W(6, 10)] }];
   for (const [q, r] of [[-3, 10], [-2, 10], [-3, 11], [-2, 9], [-4, 11]]) c.set(q + ',' + r, ['water']);
   S.rebuildAll(); S.modSel(mods.findIndex(m => /^Wegdek · hoog/.test(m.name))); S.selectTool('module'); S.place(3, 10); });
 await p.waitForTimeout(1500);
 const shot = async (n, q, r, th, ph, d, y = 1) => { await p.evaluate(([q, r, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, th, ph, d, y]); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/brug_' + n + '.png' }); };
 await shot('viaduct', 0, 0, 1.2, 1.45, 40, 3);
 await shot('water', -2.5, 10, 0.3, 1.45, 35, 0);
 await shot('dek', 3, 10, 0.4, 1.45, 35, 3);
 await b.close(); })();
