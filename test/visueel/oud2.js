const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 620 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  for (const a of ['sample', 'blocks']) {
    await p.evaluate(a => window.__SC().doAct(a), a); await p.waitForTimeout(1500);
    const pre = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); let n = 0; for (const s of c.values()) if (s.some(t => /^(woning|kantoor|blok|zuilen|hof|tribune|tunnel)/.test(t))) n++; return { n, inst: (c.inst || []).length }; });
    await p.screenshot({ path: OUT + '/oud-' + a + '-voor.png' });
    await p.evaluate(() => window.__SC().doAct('oud')); await p.waitForTimeout(2500);
    const post = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); let n = 0; for (const s of c.values()) if (s.some(t => /^(woning|kantoor|blok|zuilen|hof|tribune|tunnel)/.test(t))) n++; return { n, inst: c.inst.length, toast: (document.querySelector('.toast')||{}).textContent }; });
    console.log(a, JSON.stringify(pre), '->', JSON.stringify(post));
    await p.screenshot({ path: OUT + '/oud-' + a + '-na.png' });
  }
  await b.close();
})();
