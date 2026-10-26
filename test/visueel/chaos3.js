const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { document.getElementById('recklessBtn').click(); });
 await p.evaluate(() => { const S = window.__SC(); const a0 = S.people.agents.find(a => a.state === 'walk'); S.orbit.target.set(a0.x, 0, a0.z); S.orbit.dist = 34; S.orbit.phi = 0.85; S.applyOrbit(); for (let i = 0; i < 120; i++) { S.people.update(0.05); S.cars.update(0.05); S.chatter.update(0.05); } });
 await p.waitForTimeout(1500);
 await p.screenshot({ path: OUT + '/chaos.png', timeout: 120000 });
 await b.close(); })();
