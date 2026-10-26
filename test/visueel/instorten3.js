const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 560 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => { const S = window.__SC(), c = S.getCells(), I = c.inst.filter(I => I.m.cat === 'Wonen' && !I.lv)[0], w = S.cellToWorld(I.q, I.r);
    S.collapse.hit(w.x, w.z, 5, 1, 0); const st = S.collapse.dbg(); const W = st.P.filter(p => !p.flat && p.hy > 0.9)[0];
    S.collapse.hit(W.c.x * 0.9 + w.x * 0.1, W.c.z * 0.9 + w.z * 0.1, 20, 1, 0);
    for (let i = 0; i < 200; i++) S.collapse.update(0.05);
    const a = S.collapse.stats(); S.collapse.setOn(false); const bb = S.collapse.stats(); S.collapse.setOn(true);
    return { na: a, uit: bb, collapsedFlag: !!S.modBatch && true }; });
  console.log(JSON.stringify(r)); await b.close();
})();
