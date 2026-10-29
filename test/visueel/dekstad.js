// Dek als grond: huis op een groot wegdek met een weg erover; bereikbaar vanaf de straat beneden
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 }); await p.evaluate(r => window.__ROT = r, +(process.env.ROT || 0));
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods;
   const W = (q, r) => { const w = S.cellToWorld(q, r); return [w.x, w.z]; };
   c.paths = [{ t: 'weg', l: 0, r: 0, p: [W(-9, 0), W(9, 0)] }]; S.rebuildAll();
   S.selectTool('module'); S.modSel(mods.findIndex(m => /^Wegdek · 7 vakken hoog/.test(m.name))); const d = S.place(0, 0);
   S.modSel(mods.findIndex(m => /^Stadswoning · wit/.test(m.name))); const h = S.place(0, 1); c.inst[1].rot = +(window.__ROT || 0); S.rebuildAll();   // op het dek, naast de weg
   return { dek: d, huis: h, inst: c.inst.map(I => [I.m.name, I.q, I.r, I.lv || 0]) }; });
 console.log(JSON.stringify(r));
 await p.waitForTimeout(3000);
 const g = await p.evaluate(() => { const S = window.__SC(), G = S.people.graph(); const nodes = [...G.values()];
   const huis = nodes.filter(n => n.kind.b === 'mod' && n.ii === 1 && n.li === 0);   // begane grond van het huis (6 m)
   if (!huis.length) return { huis: 0 };
   const seen = new Set([huis[0].key]), q = [huis[0]]; while (q.length) { const n = q.shift(); for (const e of n.edges.values()) if (!seen.has(e.to.key)) { seen.add(e.to.key); q.push(e.to); } }
   const laag = [...seen].filter(k => G.get(k).y < 0.6).length;
   return { huisknopen: huis.length, bereikbaar: seen.size, opDeGrond: laag }; });
 console.log(JSON.stringify(g));
 await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 5, 0); S.orbit.theta = 0.7; S.orbit.phi = 1.0; S.orbit.dist = 110; S.applyOrbit(); });
 await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/dekstad.png' });
 await b.close(); })();
