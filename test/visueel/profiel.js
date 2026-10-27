// CPU-profiel van een onderdeel (mensen of auto's): welke functies kosten de meeste tijd
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 const wat = process.env.WAT || 'people', rek = process.env.REK === '1';
 if (process.env.STAD) { await p.evaluate(a => window.__SC().doAct(a), process.env.STAD); await p.waitForTimeout(2000); }
 await p.evaluate(r => { const S = window.__SC(); S.cars.setReckless(r); }, rek);
 const cdp = await p.context().newCDPSession(p);
 await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start');
 const ms = await p.evaluate(w => { const S = window.__SC(), t0 = performance.now(); for (let i = 0; i < 400; i++) { if (w === 'people' || w === 'all') S.people.update(0.05); if (w === 'cars' || w === 'all') S.cars.update(0.05); } return (performance.now() - t0) / 400; }, wat);
 const { profile } = await cdp.send('Profiler.stop');
 const self = new Map(), dt = profile.timeDeltas, byId = new Map(profile.nodes.map(n => [n.id, n]));
 const cnt = new Map(); for (const s of profile.samples) cnt.set(s, (cnt.get(s) || 0) + 1);
 let tot = 0; for (const [id, c] of cnt) { const n = byId.get(id), f = n.callFrame, k = (f.functionName || '(anon)') + ':' + (f.lineNumber + 1); self.set(k, (self.get(k) || 0) + c); tot += c; }
 console.log(wat, (rek ? 'chaos' : 'netjes'), 'ms per update', ms.toFixed(2));
 for (const [k, c] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 22)) console.log(((c / tot) * 100).toFixed(1).padStart(5) + '%', k);
 await b.close(); })();
