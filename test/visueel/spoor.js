// Spoor: startstadje heeft een lijn met station; doorloop tot voorbij de mist, treinen rijden en stoppen, opslaan/laden
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 await p.waitForTimeout(1500);
 const info = await p.evaluate(() => { const S = window.__SC(), L = S.spoor.lines(); const c = S.getCells();
   return { rails: (c.rails || []).length, lines: L.length, len: L.map(l => Math.round(l.len)), stops: L.map(l => l.stops.map(Math.round)), lim: Math.round(S.CITY.lim), saved: /"__r"/.test(S.serialize(c)) }; });
 console.log('info', JSON.stringify(info));
 // overzicht van boven, dan van laag langs het spoor naar de horizon
 const shot = async (n, t, th, ph, d) => { await p.evaluate(([t, th, ph, d]) => { const S = window.__SC(); S.orbit.target.set(t[0], 0, t[1]); S.orbit.theta = th; S.orbit.phi = ph; S.orbit.dist = d; S.applyOrbit(); }, [t, th, ph, d]); await p.waitForTimeout(900); await p.screenshot({ path: OUT + '/spoor_' + n + '.png' }); };
 await shot('boven', [0, 100], 0.6, 0.85, 260);
 await shot('horizon', [150, 148], Math.PI / 2, 1.42, 60);
 await shot('horizon2', [-100, 140], -Math.PI / 2 + 0.2, 1.38, 80);
 // treinen: even doorrekenen en kijken waar ze zijn
 const tr = await p.evaluate(() => { const S = window.__SC(), L = S.spoor.lines()[0]; const out = []; for (let i = 0; i < 2400; i++) { S.spoor.tick(0.05); if (i % 200 === 0) out.push(L.trains.map(T => [T.dir, Math.round(T.u), Math.round(T.v), Math.round(T.wait || 0), T.obj.visible])); } return out; });
 console.log('treinen', JSON.stringify(tr));
 // trein bij het station in beeld zetten
 await p.evaluate(() => { const S = window.__SC(), L = S.spoor.lines()[0]; const T = L.trains.find(T => T.dir > 0); T.u = L.stops[0] + 4 * 16.6 / 2 - 80; T.v = 10; T.wait = 0; T.done.clear(); for (let i = 0; i < 60; i++) S.spoor.tick(0.05); });
 await shot('trein', [-10, 140], 0.9, 1.1, 90);
 const st = await p.evaluate(() => { const S = window.__SC(), L = S.spoor.lines()[0]; for (let i = 0; i < 600; i++) S.spoor.tick(0.05); return L.trains.map(T => [T.dir, Math.round(T.u), +T.v.toFixed(2), +(T.wait || 0).toFixed(1)]); });
 console.log('na 30 s', JSON.stringify(st), 'stop op', await p.evaluate(() => window.__SC().spoor.lines()[0].stops[0] + 33.2));
 await shot('station', [-10, 140], 0.9, 1.1, 90);
 // opslaan en laden
 const rt = await p.evaluate(() => { const S = window.__SC(); const m = S.parseCity(S.serialize(S.getCells())); return m && m.rails && m.rails.length; });
 console.log('opnieuw geladen sporen', rt);
 // tekenen met het gereedschap
 const dr = await p.evaluate(() => { const S = window.__SC(); S.selectTool('spoor'); S.place(-8, -4); S.place(-2, -4); S.place(2, -6); S.spoor.end(); const c = S.getCells(); return { n: c.rails.length, p: c.rails[c.rails.length - 1].p }; });
 console.log('getekend', JSON.stringify(dr));
 await shot('getekend', [-60, -60], 0.3, 0.9, 220);
 await b.close(); })();
