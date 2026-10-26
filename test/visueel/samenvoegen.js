// vergelijkt tekenopdrachten met en zonder het samenvoegen van modules, en controleert dat aanwijzen nog werkt
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 560 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const info = async t => p.evaluate(async t => { const S = window.__SC(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const i = S.renderer.info; return { t, calls: i.render.calls, tris: i.render.triangles, batch: S.modBatch().batches, batchMeshes: S.modBatch().meshes }; }, t);
  console.log(JSON.stringify(await info('aan')));
  await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 5, 0); S.orbit.dist = 120; S.orbit.phi = 0.9; S.applyOrbit(); }); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/samen_aan.png' });
  const pk = await p.evaluate(() => { const S = window.__SC(); S.selectTool('module'); const r = []; for (const [x, y] of [[450, 280], [300, 300], [600, 300], [450, 200]]) { const h = S.pick(x, y); r.push(h ? { inst: !!h.inst, side: !!h.side, place: h.place } : null); } return r; });
  console.log('pick', JSON.stringify(pk));
  await p.evaluate(() => { const S = window.__SC(); S.modBatch().on.v = false; S.modBatch().rebuild(); }); await p.waitForTimeout(800);
  console.log(JSON.stringify(await info('uit')));
  await p.screenshot({ path: OUT + '/samen_uit.png' });
  await b.close();
})();
