// Foto's van de rotonde en een aansluiting van dichtbij (stoep, schuine rand). Resultaat in ./uit
const { open, OUT } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 900, height: 700 });
  for (const [n, x, z, dist, phi, th] of [['boven', 0, -14, 16, 0.05, 0], ['schuin', 0, -14, 9, 0.6, 0.3], ['geheel', 0, 0, 22, 0.6, 0.5]]) {
    await p.evaluate(([x, z, dist, phi, th]) => { const s = window.__SC(); s.orbit.target.set(x, 0, z); s.orbit.dist = dist; s.orbit.phi = phi; s.orbit.theta = th; s.applyOrbit(); }, [x, z, dist, phi, th]);
    await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/rotonde-${n}.png` });
  }
  await b.close();
})();
