const { open, OUT } = require('./helper');
(async () => {
  const W = +(process.env.W || 390), H = +(process.env.H || 780);
  const { b, p } = await open({ width: W, height: H }, { hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.evaluate(() => { const S = window.__SC(); S.openSchets && S.openSchets(); }); await p.waitForTimeout(1200);
  await p.screenshot({ path: OUT + '/mm-' + W + 'x' + H + '-a.png' });
  await p.evaluate(() => document.getElementById('mm_sheet').click()); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/mm-' + W + 'x' + H + '-b.png' });
  console.log(await p.evaluate(() => { const a = document.getElementById('mmApp'); return a ? !a.hidden : 'geen'; }));
  await b.close();
})();
