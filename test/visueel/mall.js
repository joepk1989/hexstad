const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('mall')); await p.waitForTimeout(2500);
 const r = await p.evaluate(() => { const S = window.__SC(); window.__INC.reset(); for (let i = 0; i < 2400; i++) { S.people.update(1 / 60); } const A = S.people.agents; return { mensen: A.length, hoog: A.filter(a => a.y > 2.5).length, inc: document.getElementById('incBtn').textContent, vast: S.people.vecStats() }; });
 console.log('winkelcentrum', JSON.stringify(r)); await b.close(); })();
