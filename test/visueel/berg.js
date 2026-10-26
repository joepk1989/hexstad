const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 800, height: 500 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const r = await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(3); S.cars.update(0.05);
  const list = []; for (let dq = -3; dq <= 3; dq++) for (let dr = -3; dr <= 3; dr++) { const w0 = S.cellToWorld(0, 0); const [q, r] = S.worldToCell(110, 0); if (Math.abs(dq + dr) <= 3) list.push([q + dq, r + dr, 14]); }
  S.terrSet && S.terrSet(list); S.terrFlush && S.terrFlush();
  const c = S.cars.list[0]; c.x = 70; c.z = 0; c.h = 0; c.crash = { t: 0, still: 0 }; c.cvx = 14; c.cvz = 0; c.w = 0; c.v = 14; c.slide = 1; c.path && (c.sy = c.sy);
  let maxx = 0; for (let i = 0; i < 200; i++) { S.cars.update(0.05); maxx = Math.max(maxx, c.x); }
  return { maxx, hAt: S.terrainHeightAt ? S.terrainHeightAt(maxx + 2, 0) : null, hill: S.terrainHeightAt(110, 0), x: c.x, hp: c.hp }; });
 console.log(JSON.stringify(r)); await b.close(); })();
