const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1100, height: 650 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.evaluate(() => { const S = window.__SC(); S.orbit.dist = 120; S.applyOrbit(); }); await p.waitForTimeout(600);
  const st = () => p.evaluate(() => { const S = window.__SC(), a = document.getElementById('mmApp'); return { dist: +S.orbit.dist.toFixed(1), hidden: a.hidden, cls: a.className, anim: getComputedStyle(a).animationName, op: +getComputedStyle(a).opacity }; });
  console.log('start', JSON.stringify(await st()));
  await p.evaluate(() => window.__SC().doAct('sketch'));
  await p.waitForTimeout(150); console.log('vlucht', JSON.stringify(await st()));
  await p.waitForTimeout(1500); console.log('open', JSON.stringify(await st()));
  await p.screenshot({ path: OUT + '/ontwerper_open.png' });
  await p.evaluate(() => document.getElementById('mm_bClose').click()); await p.waitForTimeout(100); console.log('sluit', JSON.stringify(await st()));
  await p.waitForTimeout(1800); console.log('terug', JSON.stringify(await st()));
  await b.close();
})();
