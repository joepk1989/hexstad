const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 390, height: 844 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(1500);
  const sc = async t => { await p.evaluate(() => document.getElementById('scoreBtn').click()); await p.waitForTimeout(200); const r = await p.evaluate(() => document.getElementById('scoreBig').textContent + ' ' + [...document.querySelectorAll('#scoreRows .srow')].map(x => x.querySelector('span').textContent.slice(0, 5) + x.querySelector('b').textContent).join(' ')); await p.evaluate(() => document.getElementById('scoreClose').click()); console.log(t, r); };
  await sc('gen');
  await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); c.inst = c.inst.filter((I, i) => i % 5 !== 0 || !I.m.bouw && I.m.cat !== 'Wonen' ? true : i % 5 !== 0); S.rebuildAll(); }); await p.waitForTimeout(1200); await sc('-20% gebouwen');
  await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); c.inst = c.inst.filter(I => I.m.cat !== 'Winkels' && I.m.cat !== 'Werken' && I.m.cat !== 'Groen'); S.rebuildAll(); }); await p.waitForTimeout(1200); await sc('geen winkels/werk/groen');
  await b.close();
})();
