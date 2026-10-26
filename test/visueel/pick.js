const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 560 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const run = async t => console.log(t, JSON.stringify(await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); S.selectTool('module'); S.orbit.dist = 90; S.orbit.phi = 0.8; const out = [];
    const I = c.inst.filter(I => I.m.cat === 'Wonen')[0]; const w = S.cellToWorld(I.q, I.r); S.orbit.target.set(w.x, 4, w.z); S.applyOrbit(); S.camera.updateMatrixWorld();
    const v = new (S.camera.position.constructor)(w.x, 5, w.z).project(S.camera), x = (v.x + 1) / 2 * innerWidth, y = (1 - v.y) / 2 * innerHeight;
    for (const [dx, dy] of [[0, 0], [8, 0], [-8, 4], [0, -10]]) { const h = S.pick(x + dx, y + dy); out.push(h ? { inst: !!h.inst, side: !!h.side, place: h.place } : null); } return { name: I.m.name, out }; })));
  await run('aan');
  await p.evaluate(() => { const S = window.__SC(); S.modBatch().on.v = false; S.modBatch().rebuild(); }); await p.waitForTimeout(600);
  await run('uit');
  await b.close();
})();
