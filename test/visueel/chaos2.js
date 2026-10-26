const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { document.getElementById('recklessBtn').click(); });
 const r = await p.evaluate(() => { const S = window.__SC(); const A = S.people.agents; const a0 = A.find(a => a.state === 'walk'); S.orbit.target.set(a0.x, 0, a0.z); S.orbit.dist = 30; S.orbit.phi = 0.9; S.applyOrbit();
  const seen = []; for (let i = 0; i < 300; i++) { S.people.update(0.05); S.chatter.update(0.05); for (const b of S.chatter.live) { const s = b.el.className + ': ' + b.el.textContent; if (!seen.includes(s)) seen.push(s); }; }
  const W = A.filter(a => a.state === 'walk'); return { pk: A.filter(a => a.panicK).length, n: A.length, spd: +(W.reduce((s, a) => s + a.spd, 0) / W.length).toFixed(2), max: Math.max(...W.map(a => a.spd)).toFixed(2), pause: A.filter(a => a.state === 'pause').length, seen }; });
 console.log(JSON.stringify(r, null, 1)); await b.close(); })();
