const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 for (const [st, d] of [['start', 40], ['start', 520], ['stad', 40], ['stad', 520]]) {
 if (st === 'stad') { await p.evaluate(() => window.__SC().doAct('stad')); await p.waitForTimeout(2500); }
 const r = await p.evaluate(d => { const S = window.__SC(); S.orbit.dist = d; S.applyOrbit(); const snap = new Map(); const keys = a => ({ st: a.state, x: a.x, z: a.z, y: a.y, h: a.heading, spd: a.spd, wps: (a.wps || []).slice(0, 2), node: a.node && a.node.key, prev: a.prev && a.prev.key, lod: a.lodAcc, ve: !!a.vedges, goIn: a.goingIn, prog: a.prog });
  for (let i = 0; i < 1200; i++) { for (const a of S.people.agents) snap.set(a, keys(a)); S.people.update(0.05); S.cars.update(0.05);
   const bad = S.people.agents.find(a => a.vedges && (!isFinite(a.x) || !isFinite(a.z))); if (bad) return { i, voor: snap.get(bad), na: keys(bad) }; }
  return 'geen'; }, d);
 console.log(st, d, JSON.stringify(r)); if (r !== 'geen') break; }
 await b.close(); })();
