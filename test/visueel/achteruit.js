// Vastzitten: een paar auto's met een auto erachter krijgen pech en blijven staan; de auto's erachter moeten achteruit en er dan
// omheen rijden. De headless browser tekent maar een paar beelden per seconde, dus de test spoelt het verkeer zelf vooruit
// (cars.update met vaste stapjes). Gebruik: node test/visueel/achteruit.js [roekeloos]   (eerst: node build.js --site)
const { open, OUT } = require('./helper');
(async () => {
  const reck = process.argv[2] === 'roekeloos', { b, p } = await open({ width: 600, height: 400 });
  let fouten = 0; p.on('pageerror', e => { fouten++; console.log('FOUT', e.message); });
  await p.evaluate(() => window.__SC().doAct('gen:dorp:2')); await p.waitForTimeout(6000);
  const r = await p.evaluate(reck => {
    const S = window.__SC(), C = S.cars; C.setForce(24); C.setReckless(reck);
    const run = sec => { for (let i = 0; i < sec / 0.05; i++) C.update(0.05); };
    run(10);
    const stalled = [];
    for (let t = 0; t < 40 && stalled.length < 3; t++) { run(0.5); const L = C.peek(); for (const c of L) if (c.ahead >= 0 && !L[c.ahead].hold) { C.stall(c.ahead); stalled.push(c.ahead); break; } }
    const rev = new Set(), around = new Set(), passed = new Set(); let maxBack = 0;
    for (let t = 0; t < 120; t++) { run(0.25); C.peek().forEach((c, k) => { if (c.rev) rev.add(k); if (c.around) around.add(k); if (c.v < 0) maxBack = Math.max(maxBack, -c.v); }); }
    return { stalled: stalled.length, rev: rev.size, around: around.size, maxBack, st: C.vecStats() };
  }, reck);
  console.log(reck ? 'roekeloos' : 'netjes', '| stilgezet:', r.stalled, '| achteruit gereden:', r.rev, '| eromheen:', r.around, '| hoogste snelheid achteruit', r.maxBack.toFixed(1), 'm/s');
  console.log('vecStats', JSON.stringify(r.st), '| fouten', fouten);
  await b.close();
})();
