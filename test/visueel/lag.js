const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('layers')); await p.waitForTimeout(3000);
 await p.screenshot({ path: OUT + '/lagen.png' }); await b.close(); })();
