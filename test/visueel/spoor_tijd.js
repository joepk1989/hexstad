const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 700 });
 await p.waitForTimeout(1000);
 console.log(await p.evaluate(() => { const S = window.__SC(); let t = performance.now(); for (let i = 0; i < 5; i++) { S.spoor.lines()[0].src.p[0][0] += 0.01; S.spoor.build(); } const tb = (performance.now() - t) / 5; t = performance.now(); for (let i = 0; i < 200; i++) S.spoor.tick(0.016); return { build: tb.toFixed(1), tick: ((performance.now() - t) / 200).toFixed(3) }; }));
 await b.close(); })();
