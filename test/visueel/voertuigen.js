// opstelling: alle typen naast elkaar, los van het verkeer
const { open } = require('./helper');
const D = require('./helper').OUT + '/';
(async () => { const { b, p } = await open({ width: 1200, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(3000);
 const n = await p.evaluate(() => { const S = window.__SC(), T = window.__lpTest; return T ? T(S.scene) : -1; });
 console.log('n', n);
 await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0.8, 0); S.orbit.dist = 14; S.orbit.phi = 1.15; S.orbit.theta = 0.6; S.applyOrbit(); });
 await p.waitForTimeout(2500); await p.screenshot({ path: D + 'lineup.png' });
 await p.evaluate(() => { const S = window.__SC(); S.orbit.theta = 2.4; S.applyOrbit(); });
 await p.waitForTimeout(2000); await p.screenshot({ path: D + 'lineup2.png' });
 await b.close(); })();
