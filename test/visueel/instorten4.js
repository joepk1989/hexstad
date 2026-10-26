const { open } = require('./helper');
const stad = process.env.STAD || 'start';
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  if (stad !== 'start') await p.evaluate(a => window.__SC().doAct(a), stad.replace(/_/g, ':')); await p.waitForTimeout(2000);
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(14); S.cars.setReckless(true); S.cars.update(0.05); });
  for (let k = 0; k < 2; k++) { const r = await p.evaluate(() => { const S = window.__SC(); let first = -1; for (let i = 0; i < 1200; i++) { S.cars.update(0.05); S.collapse.update(0.05); if (first < 0 && S.collapse.stats().modules) first = i * 0.05; } const st = S.collapse.stats(); return { cnt: S.collapse.cnt, first, modules: st.modules, standing: st.standing, pieces: st.pieces, debris: st.debris, crash: S.cars.list.filter(c => c.crash).length }; }); console.log((k + 1) * 60, 's', JSON.stringify(r)); }
  await b.close();
})();
