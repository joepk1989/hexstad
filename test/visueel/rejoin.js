const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(16); S.cars.setReckless(true); S.cars.update(0.05); });
 for (let k = 0; k < 3; k++) console.log(JSON.stringify(await p.evaluate(() => { const S = window.__SC(); const last = new Map(); let jumps = 0, big = []; for (let i = 0; i < 1200; i++) { S.cars.update(0.05); for (const c of S.cars.list) { const l = last.get(c); if (l && !c.burn && !c.ghostSkip) { const d = Math.hypot(c.x - l[0], c.z - l[1]); if (d > 3 && !(c.fly) && l[6] > 0) { jumps++; if (big.length < 8) big.push([+d.toFixed(1), c.kind, l[2], +l[3].toFixed(1), l[4], l[5], l[6] && Math.round(l[6]), c.hp && Math.round(c.hp)]); } } last.set(c, [c.x, c.z, !!c.crash, c.v, c.persona, c.ghost, c.hp]); } }
  return { rj: S.cars.rejoinStats, jumps, big, still: S.cars.list.filter(c => c.v < 0.3 && !c.burn).length }; })));
 await b.close(); })();
