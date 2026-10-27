// Eén standaardmodule los in een lege stad bekijken van een paar kanten: ALLEEN="naam" node bieb_kijk.js
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 700 });
 const nm = process.env.ALLEEN, tag = (process.env.TAG || nm).replace(/[^a-z0-9]+/gi, '_').toLowerCase();
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const info = await p.evaluate(nm => { const S = window.__SC(), m = window.__mv2.libStandard().find(m => m.name.includes(nm)); const c = S.getCells(); c.inst = [{ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }]; S.rebuildAll(); return { name: m.name, k: m.k || 0, h: m.lv.length * 3 }; }, nm);
 const views = (process.env.VIEWS || '0.6,0.95;2.6,0.8;4.4,1.25').split(';').map(s => s.split(',').map(Number));
 let i = 0; for (const [th, ph] of views) { await p.evaluate(([th, ph, k, h]) => { const S = window.__SC(); S.orbit.target.set(0, Math.min(h * 0.4, 8), 0); S.orbit.dist = (k ? 70 : 34) + h * 0.8; S.orbit.phi = ph; S.orbit.theta = th; S.applyOrbit(); }, [th, ph, info.k, info.h]); await p.waitForTimeout(900); await p.screenshot({ path: `${OUT}/kijk_${tag}_${i++}.png`, timeout: 120000 }); }
 console.log(info.name); await b.close(); })();
