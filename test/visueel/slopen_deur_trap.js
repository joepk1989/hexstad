// Slopen: deuren en trappen breken mee, vloeren zijn van opzij dicht
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const NM = process.env.NM || 'Stadswoning · wit';
 const info = await p.evaluate(NM => { const S = window.__SC(), c = S.getCells(); c.inst = [];
   const m = window.__mods.find(m => m.name.startsWith(NM)); c.inst.push({ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
   const before = window.__doors.count; const w = S.cellToWorld(0, 0); const B = S.collapse.prep(w.x, w.z);
   const step = B.P.filter(q => /step|wood/.test(q.mesh.material.name || '') || q.mesh.material === S.MV2 && 0);
   const mats = {}; for (const q of B.P) { const k = q.door ? 'deur' : (q.mesh.material.color ? '#' + q.mesh.material.color.getHexString() : '?'); mats[k] = (mats[k] || 0) + 1; }
   return { naam: m.name, deurenVoor: before, deurenNa: window.__doors.count, stukken: B.P.length, deurStukken: B.P.filter(q => q.door).length }; }, NM);
 console.log(JSON.stringify(info));
 // alles binnen 3 m van het midden en onder 6 m loskloppen (trap zit meestal daar), plus de deuren
 const r = await p.evaluate(() => { const S = window.__SC(), B = S.collapse.dbg(), w = S.cellToWorld(0, 0);
   const n1 = S.collapse.knock(B, q => q.door); const n0 = S.collapse.knock(B, q => q.c.x > w.x + 3.5 && !q.flat); const n2 = S.collapse.knock(B, q => Math.hypot(q.c.x - w.x, q.c.z - w.z) < 3.5 && q.c.y - B.G < 5.5 && q.hy < 1);
   for (let i = 0; i < 300; i++) S.collapse.update(1 / 30); return { zijkant: n0, deurLos: n1, middenLos: n2, staand: B.P.filter(q => q.st === 'stand').length }; });
 console.log(JSON.stringify(r));
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 3, w.z); S.orbit.theta = Math.PI / 2; S.orbit.phi = 1.2; S.orbit.dist = 22; S.applyOrbit(); });
 await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/slopen_dt.png' });
 await b.close(); })();
