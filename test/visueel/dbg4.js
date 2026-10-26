const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(14); S.cars.setReckless(true); S.cars.update(0.05); });
  const r = await p.evaluate(() => { const S = window.__SC(), c0 = S.getCells(), B = c0.inst.filter(I => /Rij|Stads|Kantoor|Winkel|Biblio/.test(I.m.name)).map(I => S.cellToWorld(I.q, I.r));
    const ev = new Map(), out = [];
    for (let i = 0; i < 3600; i++) { S.cars.update(0.05); for (const c of S.cars.list) { if (c.slide && c.crash) { let e = ev.get(c); if (!e) ev.set(c, e = { x0: c.x, z0: c.z, v0: Math.hypot(c.cvx, c.cvz), n: 0 }); e.x = c.x; e.z = c.z; } else if (ev.has(c) && !c.slide) { const e = ev.get(c); ev.delete(c); const d = Math.min(...B.map(w => Math.hypot(w.x - e.x, w.z - e.z))); out.push({ v0: +e.v0.toFixed(1), trav: +Math.hypot(e.x - e.x0, e.z - e.z0).toFixed(1), at: [Math.round(e.x0), Math.round(e.z0)], endD: Math.round(d) }); } } }
    return out; });
  console.log(r.length, JSON.stringify(r.slice(0, 12))); await b.close();
})();
