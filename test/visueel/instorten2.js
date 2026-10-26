const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(1500);
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(30); S.cars.setReckless(true); S.cars.update(0.05); });
  for (let k = 0; k < 3; k++) { const r = await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 1200; i++) { S.cars.update(0.05); S.collapse.update(0.05); } const st = S.collapse.stats(); st.calls = S.renderer.info.render.calls; st.baked = 0; S.scene.traverse(o => {}); return st; }); console.log((k + 1) * 60, 's', JSON.stringify(r)); }
  await b.close();
})();
