const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const [tag, nm] = [process.argv[2] || 'x', process.argv[3] || 'Trappenhuis · beton'];
 await p.evaluate(nm => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith(nm))), nm); await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(700);
 const g = await p.evaluate(() => { const X = window.__mv2, m = window.__MME.m, ts = 2.25; let li = -1, S = null; for (let l = 0; l < m.lv.length; l++) { const s = m.lv[l].s.find(s => !s.k || s.k === 'stair'); if (s) { li = l; S = s; break; } }
   const D = X.MV2.DIR6[S.d], a = X.mv2P(S.a[0], S.a[1], ts), dx = D[0] * ts * Math.sqrt(3) / 2, dz = D[0] * ts / 2 + D[1] * ts, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, len = S.n * ts, off = S.off || 0; return { li, ex: a[0] + ux * len - uz * off, ez: a[1] + uz * len + ux * off, ux, uz }; });
 await p.evaluate(li => { window.__MME.lv = li + 1; }, g.li); await p.keyboard.press('Digit4'); await p.waitForTimeout(500);
 for (const [k, back, side, pitch] of [['1', 3.2, 0.8, -0.62], ['2', -2.6, 1.6, -0.5]]) {
  await p.evaluate(([g, back, side, pitch]) => { const w = window.__MME.walk; w.x = g.ex + g.ux * back - g.uz * side; w.z = g.ez + g.uz * back + g.ux * side; w.y = (g.li + 1) * 3 + 0.4; const dx = g.ex - w.x, dz = g.ez - w.z; w.yaw = Math.atan2(-dx, -dz); w.pitch = pitch; }, [g, back, side, pitch]); await p.waitForTimeout(900);
  await p.screenshot({ path: OUT + `/trapeind3_${k}_${tag}.png`, clip: { x: 0, y: 64, width: 980, height: 736 }, timeout: 120000 }); }
 await b.close(); })();
