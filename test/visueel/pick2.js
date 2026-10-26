const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 700, height: 450 });
  p.on('console', m => { if (/batchMods/.test(m.text())) console.log('WARN', m.text()); });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => { const S = window.__SC(), c = S.getCells(), before = S.modBatch(); const n0 = c.inst.length, m0 = before.meshes;
    const vis = () => { let v = 0, h = 0; S.scene.traverse(o => { if (o.isMesh && o.parent && o.parent.userData && o.parent.userData.inst) { if (o.visible) v++; else h++; } }); return { visOrig: v, hidOrig: h }; };
    const a = vis(); c.inst.splice(0, 5); S.buildModNet(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { n0, n1: c.inst.length, m0, m1: S.modBatch().meshes, a, b: vis(), calls: S.renderer.info.render.calls }; });
  console.log(JSON.stringify(r)); await b.close();
})();
