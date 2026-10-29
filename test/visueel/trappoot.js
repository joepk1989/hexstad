// Trappenhuis-poot: een module boven de weg is te bereiken (loopnetwerk) en de treden dragen (botsing)
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods;
   const W = (q, r) => { const w = S.cellToWorld(q, r); return [w.x, w.z]; }; c.paths = [{ t: 'weg', l: 0, r: 0, p: [W(0, -6), W(0, 6)] }, { t: 'weg', l: 0, r: 0, p: [W(-6, 6), W(6, 6)] }]; S.rebuildAll();
   S.modSel(mods.findIndex(m => /^Stadswoning · wit/.test(m.name))); S.selectTool('module'); S.place(0, 0);
   return { inst: c.inst.map(I => [I.m.name, I.lv]) }; });
 console.log(JSON.stringify(r));
 await p.waitForTimeout(3000);
 const g = await p.evaluate(() => { const S = window.__SC(), G = S.people.graph(); if (!G) return 'geen graaf';
   const nodes = [...G.values()], tw = nodes.find(n => /^mtw/.test(n.key)); if (!tw) return { towers: 0, mdoors: nodes.filter(n => n.kind.b === 'mdoor').length };
   // vanaf de ingang: welke knopen zijn bereikbaar, en zit daar iets op 6 m bij?
   const seen = new Set([tw.key]), q = [tw]; while (q.length) { const n = q.shift(); for (const e of n.edges.values()) if (!seen.has(e.to.key)) { seen.add(e.to.key); q.push(e.to); } }
   const ys = [...seen].map(k => G.get(k).y); const top = Math.max(...ys);
   const stoep = [...seen].some(k => G.get(k).kind.b === 'vec' || !/^m/.test(k));
   // treden: hoogte van de vloer op een paar punten rond de trap
   const T = [...nodes].filter(n => /^mt[lh]/.test(n.key)).map(n => [n.key, +n.y.toFixed(2)]);
   return { towers: 1, bereikbaar: seen.size, hoogste: +top.toFixed(2), aanStoep: stoep, trap: T }; });
 console.log(JSON.stringify(g));
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 3, w.z); S.orbit.theta = 0.6; S.orbit.phi = 1.2; S.orbit.dist = 40; S.applyOrbit(); });
 await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/trappoot1.png' });
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.theta = 0.6 + Math.PI; S.applyOrbit(); });
 await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/trappoot2.png' });
 await b.close(); })();
