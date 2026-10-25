const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 390, height: 844 });
  const acts = ['start', 'gen:honingraat:7', 'gen:honingraat:3', 'gen:ring:5', 'gen:spaken:2'];
  for (const act of acts) {
    await p.evaluate(a => window.__SC().doAct(a), act); await p.waitForTimeout(1500);
    await p.evaluate(() => document.getElementById('scoreBtn').click()); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ s: document.getElementById('scoreBig').textContent, l: document.getElementById('scoreLabel').textContent, pop: document.getElementById('scorePop').textContent, rows: [...document.querySelectorAll('#scoreRows .srow')].map(x => x.querySelector('span').textContent + ' ' + x.querySelector('b').textContent + ' · ' + x.querySelector('small').textContent) }));
    console.log(act, r.s, r.l, '|', r.pop); r.rows.forEach(x => console.log('   ', x));
    await p.evaluate(() => document.getElementById('scoreClose').click());
  }
  await p.evaluate(() => document.getElementById('scoreBtn').click()); await p.screenshot({ path: __dirname + '/uit/score.png' });
  await b.close();
})();
