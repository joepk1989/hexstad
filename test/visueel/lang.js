const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const rek = process.env.REK !== '0';
 const r = await p.evaluate((rek) => { const S = window.__SC(); S.doAct('empty'); const c = S.getCells(); c.paths = c.paths || []; const L = 156;
  c.paths.push({ t: 'weg', l: 0, r: 0, p: [[-L / 2, 0], [L / 2, 0]] }); S.rebuildAll(); S.cars.setReckless(rek); S.cars.setForce(4); S.cars.update(0.05);
  let mx = 0, per = []; for (let i = 0; i < 1600; i++) { S.cars.update(0.05); for (const a of S.cars.list) { if (a.v > mx) mx = a.v; } if (i % 200 === 0) per.push(+Math.max(...S.cars.list.map(a => a.v)).toFixed(1)); }
  return { mx, per, n: S.cars.list.length, kinds: S.cars.list.map(a => a.kind + ':' + (a.path ? Math.round(a.path.len) : '-')).join(' ') }; }, rek);
 console.log(JSON.stringify(r)); await b.close(); })();
