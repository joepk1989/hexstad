const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 800, height: 500 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  for (const stad of (process.env.STADEN || 'start,stad').split(',')) {
    if (stad !== 'start') { await p.evaluate(a => window.__SC().doAct(a), stad); await p.waitForTimeout(2500); }
    const n = await p.evaluate(() => window.__SC().getCells().inst.length);
    const bad = [];
    const step = Math.max(1, Math.floor(n / 40));
    for (let i = 0; i < n; i += step) {
      const r = await p.evaluate((i) => { const S = window.__SC(), I = S.getCells().inst[i], w = S.cellToWorld(I.q, I.r); S.selectTool && S.selectTool('gum'); S.orbit.target.set(w.x, (I.lv || 0) * 3 + 2, w.z); S.orbit.dist = 50; S.orbit.phi = 0.9; S.orbit.theta = 0.7; S.applyOrbit(); return { name: I.m.name, lv: I.lv || 0 }; }, i);
      await p.waitForTimeout(150);
      const res = await p.evaluate((i) => { const S = window.__SC(), I = S.getCells().inst[i]; const x = innerWidth / 2, y = innerHeight / 2; const h = S.pick(x, y); return { ok: !!(h && h.inst === I), got: h ? (h.inst ? h.inst.m.name : (h.erase ? 'klassiek' : 'grond')) : null }; }, i);
      if (!res.ok) bad.push([i, r.name, r.lv, res.got]);
    }
    console.log(stad, 'inst', n, 'fout', bad.length, JSON.stringify(bad.slice(0, 12)));
  }
  await b.close();
})();
