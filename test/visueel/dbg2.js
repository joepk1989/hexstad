const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const S = window.__SC(), I = S.getCells().inst.filter(I => I.m.cat === 'Wonen' && !I.lv)[0]; const w = S.cellToWorld(I.q, I.r);
    const out = {}; out.cell = S.worldToCell(w.x, w.z); out.q = [I.q, I.r];
    S.collapse.hit(w.x, w.z, 5, 1, 0); const st = S.collapse.dbg(); out.n = st.P.length; out.G = st.G;
    const walls = st.P.filter(p => !p.flat && p.hy > 0.9); out.walls = walls.length; out.sample = walls.slice(0, 3).map(p => [p.c.x - w.x, p.c.y, p.c.z - w.z, p.hx, p.hy, p.hz].map(v => +v.toFixed(1)));
    out.kinds = { flat: st.P.filter(p => p.flat).length, tall: st.P.filter(p => p.hy > 0.9).length, small: st.P.filter(p => p.hy < 0.5 && !p.flat).length };
    return out; });
  console.log(JSON.stringify(r)); await b.close();
})();
