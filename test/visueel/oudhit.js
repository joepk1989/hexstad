const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 800, height: 500 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('sample')); await p.waitForTimeout(2000);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); let k = null; for (const [kk, st] of c.entries()) if (st.length && st.every(t => /^(woning|dak)/.test(t)) && st.some(t => /^woning/.test(t))) { k = kk; break; }
  if (!k) return 'geen'; const [q, r] = k.split(',').map(Number), w = S.cellToWorld(q, r); const before = (c.inst||[]).length;
  const ok = S.collapse.hit(w.x, w.z, 20, 1, 0); for (let i = 0; i < 60; i++) S.collapse.update(0.05);
  return { k, ok, before, after: S.getCells().inst.length, st: S.collapse.stats() }; });
 console.log(JSON.stringify(r)); await b.close(); })();
