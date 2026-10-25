// Roekeloos verkeer: laat een gegenereerde stad een halve minuut draaien met de roekeloze stand aan en telt inhalen, ontwijken,
// jagen, botsingen en fouten. Gebruik: node test/visueel/roekeloos.js   (eerst: node build.js --site)
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 600 });
  let fouten = 0; p.on('pageerror', () => fouten++);
  await p.evaluate(() => window.__SC().doAct('gen:kruis:3')); await p.waitForTimeout(6000);
  await p.evaluate(() => { const S = window.__SC(); S.cars.setForce(30); S.cars.setReckless(true); });
  const tel = { pass: 0, dodge: 0, hunt: 0, crash: 0, maxLat: 0 }, personas = {};
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(500);
    const L = await p.evaluate(() => window.__SC().cars.peek());
    for (const c of L) { if (c.pass) tel.pass++; if (c.dodge) tel.dodge++; if (c.hunt) tel.hunt++; if (c.crash) tel.crash++; tel.maxLat = Math.max(tel.maxLat, Math.abs(c.lat)); personas[c.persona] = (personas[c.persona] || 0) + 1; if (!isFinite(c.x) || !isFinite(c.z)) fouten++; }
  }
  const st = await p.evaluate(() => window.__SC().cars.vecStats ? window.__SC().cars.vecStats() : null);
  console.log('bestuurders (auto-tellingen)', personas); console.log('tellingen (auto × halve seconde)', tel); console.log('vecStats', JSON.stringify(st)); console.log('fouten', fouten);
  await p.screenshot({ path: OUT + '/roekeloos.png' }); await b.close();
})();
