const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 const wat = process.env.WAT || 'cars';
 await p.evaluate(() => window.__SC().doAct('stad')); await p.waitForTimeout(2500);
 await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 40; i++) { S.people.update(0.05); S.cars.update(0.05); } });
 const cdp = await p.context().newCDPSession(p);
 await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 50 }); await cdp.send('Profiler.start');
 await p.evaluate(w => { const S = window.__SC(); for (let i = 0; i < 300; i++) { if (w === 'cars') S.cars.update(0.05); else S.people.update(0.05); } }, wat);
 const { profile } = await cdp.send('Profiler.stop');
 const lines = new Map(); let tot = 0;
 for (const n of profile.nodes) { if (!n.positionTicks) continue; for (const pt of n.positionTicks) { const k = (n.callFrame.functionName || 'anon') + ':' + pt.line; lines.set(k, (lines.get(k) || 0) + pt.ticks); tot += pt.ticks; } }
 const src = require('fs').readFileSync(require('path').join(__dirname, '../../site/index.html'), 'utf8').split('\n');
 for (const [k, c] of [...lines].sort((a, b) => b[1] - a[1]).slice(0, 18)) { const ln = +k.split(':').pop(); console.log(((c / tot) * 100).toFixed(1).padStart(5) + '%', k.padEnd(22), (src[ln - 1] || '').trim().slice(0, 110)); }
 await b.close(); })();
