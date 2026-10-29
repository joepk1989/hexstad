const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods; c.inst = [];
   for (const [nm, q, r] of [['Brug · voetgangers', 0, 0], ['Wegdek · hoog', 3, 0], ['Wegdek · 7 vakken laag', -3, 3]]) { const m = mods.find(m => m.name.startsWith(nm)); c.inst.push({ mid: m.id, m: S.instData(m, false), q, r, rot: 0 }); } S.rebuildAll(); });
 const shot = async (n, q, r, th, ph, d, y = 1) => { await p.evaluate(([q, r, th, ph, d, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r); S.orbit.target.set(w.x, y, w.z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [q, r, th, ph, d, y]); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/bm_' + n + '.png' }); };
 for (let i = 0; i < 6; i++) await shot('ramp' + i, 0, 0, i * Math.PI / 3, 1.5, 13, 1.2);
 await b.close(); })();
