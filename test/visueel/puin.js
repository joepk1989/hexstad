// Puinfysica: stukken blijven boven de grond, gaan niet door staande muren, stapelen op; rekentijd
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const NM = process.env.NM || 'Kantoor · glas · 5L';
 process.env.ALL && await p.evaluate(() => window.__ALL = 1); const r = await p.evaluate(NM => { const S = window.__SC(), c = S.getCells(), mods = window.__mods; c.inst = [];
   const m = mods.find(m => m.name.startsWith(NM)); c.inst.push({ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
   const w = S.cellToWorld(0, 0), B = S.collapse.prep(w.x, w.z);
   // klap van opzij op de begane grond: oostkant weg
   const n = S.collapse.knock(B, window.__ALL ? (q => q.c.y - B.G < 3.2 && !q.flat) : (q => q.c.x > w.x + 4 && q.c.y - B.G < 3.5 && !q.flat));
   let worst = 0, tot = 0, frames = 0; const t0 = performance.now();
   for (let i = 0; i < 360; i++) { const a = performance.now(); S.collapse.update(1 / 30); const ms = performance.now() - a; worst = Math.max(worst, ms); tot += ms; frames++; }
   const D = B.P.filter(q => q.st === 'fall' || q.st === 'rust'); const under = D.filter(q => q.mesh.position.y + q.hy < B.G - 0.3).length;
   const ys = D.map(q => q.mesh.position.y - B.G).sort((a, b) => a - b);
   // door een staande muur heen? midden van een brokstuk binnen een staand (niet-plat) stuk
   let inWall = 0; for (const q of D) for (const s of B.P) if (s.st === 'stand' && !s.flat && !s.weak && Math.abs(q.mesh.position.x - s.c.x) < s.hx - 0.1 && Math.abs(q.mesh.position.y - s.c.y) < s.hy - 0.1 && Math.abs(q.mesh.position.z - s.c.z) < s.hz - 0.1) { inWall++; break; }
   return { los: n, puin: D.length, rust: D.filter(q => q.st === 'rust').length, vallend: D.filter(q => q.st === 'fall').length, onderGrond: under, inMuur: inWall, hoogsteRust: +(ys[ys.length - 1] || 0).toFixed(2), mediaanY: +(ys[ys.length >> 1] || 0).toFixed(2), staand: B.P.filter(q => q.st === 'stand').length, msGem: +(tot / frames).toFixed(2), msMax: +worst.toFixed(1) }; }, NM); void 0;
 console.log(JSON.stringify(r));
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x + 2, 3, w.z); S.orbit.theta = 1.3; S.orbit.phi = 1.15; S.orbit.dist = 34; S.applyOrbit(); });
 await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/puin' + (process.env.ALL ? '_all' : '') + '.png' });
 await b.close(); })();
