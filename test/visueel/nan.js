const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 await p.evaluate(() => { window.__noLod = !!0; });
 await p.evaluate(() => window.__SC().doAct('stad')); await p.waitForTimeout(2500);
 const r = await p.evaluate(() => { const S = window.__SC(); const snap = new Map();
  for (let i = 0; i < 2400; i++) { for (const a of S.people.agents) snap.set(a, JSON.stringify({ st: a.state, x: a.x, z: a.z, y: a.y, h: a.heading, spd: a.spd, wps: (a.wps || []).slice(0, 3), node: a.node && a.node.key, lod: a.lodAcc, rag: !!a.rag })); S.people.update(0.05); S.cars.update(0.05);
   const bad = S.people.agents.find(a => !isFinite(a.x) || !isFinite(a.z) || !isFinite(a.y)); if (bad) return { i, voor: snap.get(bad), na: JSON.stringify({ st: bad.state, x: bad.x, z: bad.z, y: bad.y, h: bad.heading, spd: bad.spd, wps: (bad.wps || []).slice(0, 3) }) }; }
  return 'geen NaN'; });
 console.log(JSON.stringify(r, null, 1)); await b.close(); })();
