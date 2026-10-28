// Waar een rechte trap boven uitkomt: hoe sluit het einde aan op de driehoeken van de vloer?
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const tag = process.argv[2] || 'voor';
 for (const [nm, li] of [['Winkelcentrum · klein', 0], ['Stadswoning · wit · 3L', null]]) {
  const ok = await p.evaluate(nm => { const m = window.__mods.find(m => m.name.startsWith(nm)); if (!m) return null; window.__SC().openSchets(m); return m.name; }, nm); if (!ok) continue;
  await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(700);
  const S = await p.evaluate(() => { const E = window.__MME; for (let li = 0; li < E.m.lv.length; li++) { const S = E.m.lv[li].s.find(s => !s.k || s.k === 'stair' || s.k === 'esc'); if (S) return { li, S }; } return null; });
  if (!S) { console.log(ok, 'geen rechte trap'); continue; }
  console.log(ok, JSON.stringify(S));
  // eindpunt van de trap in de wereld
  const end = await p.evaluate(({ S }) => { const X = window.__mv2, ts = 2.25, D = X.MV2.DIR6[S.S.d], a = X.mv2P(S.S.a[0], S.S.a[1], ts), dx = D[0] * ts * Math.sqrt(3) / 2, dz = D[0] * ts / 2 + D[1] * ts, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, len = S.S.n * ts, off = S.S.off || 0; return { x: a[0] + ux * len - uz * off, z: a[1] + uz * len + ux * off, ux, uz }; }, { S });
  const mid = await p.evaluate(({ S }) => { const X = window.__mv2, ts = 2.25, D = X.MV2.DIR6[S.S.d], a = X.mv2P(S.S.a[0], S.S.a[1], ts), dx = D[0] * ts * Math.sqrt(3) / 2, dz = D[0] * ts / 2 + D[1] * ts, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, len = S.S.n * ts, off = S.S.off || 0; return { a, x: a[0] + ux * len * 0.75 - uz * off, z: a[1] + uz * len * 0.75 + ux * off, ux, uz }; }, { S });
  console.log('trap', JSON.stringify(mid));
  await p.keyboard.press('Digit3'); await p.waitForTimeout(300);
  for (const [k, th, ph, fz, sc] of [['a', 0.2, 0.55, 1.0, 110], ['b', 3.0, 0.7, 1.0, 110], ['c', 1.6, 0.25, 1.0, 140]]) {
    await p.evaluate(({ li, mid, th, ph, fz, sc }) => { const E = window.__MME; E.lv = li + 1; E.upto = true; E.view.x = mid.x; E.view.z = mid.z + (mid.a[1] - mid.z) * 0 + mid.uz * 2.4 * fz; E.view.s = sc; E.th = th; E.ph = ph; document.getElementById('mm_lvUp').click(); document.getElementById('mm_lvDn').click(); E.lv = li + 1; }, { li: S.li, mid, th, ph, fz, sc });
    await p.mouse.move(5, 5); await p.waitForTimeout(1500);
    await p.screenshot({ path: OUT + `/trapeind_${ok.split(' ')[0]}_${k}_${tag}.png`, clip: { x: 0, y: 64, width: 980, height: 736 }, timeout: 120000 });
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
 }
 await b.close(); })();
