const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 if (process.env.STAD) { await p.evaluate(a => window.__SC().doAct(a), process.env.STAD); await p.waitForTimeout(2500); }
 await p.evaluate(r => window.__SC().cars.setReckless(r), process.env.REK === '1');
 const r = await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 40; i++) { S.people.update(0.05); S.cars.update(0.05); }
  window.__PT = {}; let tm = 0, ta = 0; const N = 300; for (let i = 0; i < N; i++) { let t = performance.now(); S.people.update(0.05); tm += performance.now() - t; t = performance.now(); S.cars.update(0.05); ta += performance.now() - t; }
  const o = { mensen: +(tm / N).toFixed(2), autos: +(ta / N).toFixed(2), n: S.people.agents.length, c: S.cars.list.length }; for (const k in window.__PT) o[k] = +(window.__PT[k] / N).toFixed(2); return o; });
 console.log(process.env.STAD || 'start', JSON.stringify(r)); await b.close(); })();
