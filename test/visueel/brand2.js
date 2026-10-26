const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(16); S.cars.setReckless(true); S.cars.update(0.05); });
 for (let k = 0; k < 3; k++) console.log(JSON.stringify(await p.evaluate(() => { const S = window.__SC(); const was = new Map(); let expl = 0, maxBurn = 0; for (let i = 0; i < 1200; i++) { S.cars.update(0.05); let nb = 0; for (const c of S.cars.list) { const b = !!c.burn; if (b) nb++; if (was.get(c) && !b) expl++; was.set(c, b); } maxBurn = Math.max(maxBurn, nb); }
  const hp = S.cars.list.map(c => c.hp ?? 100); return { expl, maxBurn, rook: hp.filter(h => h < 65).length, n: S.cars.list.length, tows: S.cars.tows.length, still: S.cars.list.filter(c => c.v < 0.3).length }; })));
 await b.close(); })();
