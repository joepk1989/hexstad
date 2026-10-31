// Startdorp: welke voorzieningen staan erin, alles bereikbaar, en een overzicht
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1300, height: 860 });
 await p.waitForTimeout(3000);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); const cnt = {}; for (const I of c.inst) { const n = I.m.name.replace(/( · \d+[Lv])+$/, ''); cnt[n] = (cnt[n] || 0) + 1; }
   const G = S.people.graph(), nodes = [...G.values()]; const md = nodes.filter(n => n.kind.b === 'mdoor'); const linked = md.filter(n => [...n.edges.values()].some(e => e.vecDoor || e.to.kind.b === 'vec')).length;
   return { modules: c.inst.length, wegen: c.paths.length, soorten: cnt, ingangen: md.length, aanDeStoep: linked, goals: S.people.goals().B.reduce((o, x) => (o[x[1]] = (o[x[1]] || 0) + 1, o), {}) }; });
 console.log(JSON.stringify(r));
 const shot = async (n, x, z, th, ph, d) => { await p.evaluate(([x, z, th, ph, d]) => { const S = window.__SC(); S.orbit.target.set(x, 0, z); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [x, z, th, ph, d]); await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/startdorp_' + n + '.png' }); };
 await shot('boven', 0, 15, 0.35, 0.55, 330);
 await shot('kern', 18, 18, 0.9, 1.0, 120);
 await shot('rand', -10, -40, 2.6, 0.95, 200);
 await b.close(); })();
