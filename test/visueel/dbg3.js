const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); return c.inst.map(I => { const w = S.cellToWorld(I.q, I.r); return [I.m.name.slice(0, 22), Math.round(Math.hypot(w.x, w.z))]; }).filter(x => /Rij|Stads|Kantoor|Winkel|Biblio/.test(x[0])).sort((a, b) => a[1] - b[1]).slice(0, 10); });
  console.log(JSON.stringify(r)); await b.close();
})();
