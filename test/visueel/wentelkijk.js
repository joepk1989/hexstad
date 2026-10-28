// Rondlopen op de bovenverdieping naast een wenteltrap: is het trapgat afgezet?
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const names = process.argv.slice(2).length ? process.argv.slice(2) : ['Rijhuis · baksteen · 2L', 'Kantoor · glas · 3L'];
 for (const nm of names) {
  const ok = await p.evaluate(nm => { const m = window.__mods.find(m => m.name.startsWith(nm)); if (!m) return null; window.__SC().openSchets(m); return m.name; }, nm); if (!ok) { console.log('geen', nm); continue; }
  await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(700);
  const sp = await p.evaluate(() => { const E = window.__MME, li = E.m.lv.findIndex(L => L.s.some(s => s.k === 'spiral')); if (li < 0) return null; const S = E.m.lv[li].s.find(s => s.k === 'spiral'), t = 2.25; return { li, a: [S.a[0] * t * Math.sqrt(3) / 2, S.a[0] * t / 2 + S.a[1] * t] }; });
  if (!sp) { console.log(ok, 'geen wenteltrap'); continue; }
  await p.evaluate(li => { window.__MME.lv = li + 1; }, sp.li);
  await p.keyboard.press('Digit4'); await p.waitForTimeout(500);
  for (const [k, ang] of [[0, 0], [1, 2.1], [2, 4.2]]) {
    await p.evaluate(([a, ang, li]) => { const w = window.__MME.walk, d = 3.4; w.x = a[0] + Math.cos(ang) * d; w.z = a[1] + Math.sin(ang) * d; w.y = (li + 1) * 3; w.yaw = Math.atan2(w.x - a[0], w.z - a[1]); w.pitch = -0.55; }, [sp.a, ang, sp.li]);
    await p.waitForTimeout(700);
    await p.screenshot({ path: OUT + `/wentelkijk_${ok.split(' ')[0]}_${k}.png`, timeout: 120000 });
  }
  // kun je het gat in lopen? recht op het midden af vanuit 12 richtingen
  const val = await p.evaluate(([a, li]) => { const T = window.__MME.walkTest, out = []; for (let k = 0; k < 12; k++) { const an = k * Math.PI / 6; let x = a[0] + Math.cos(an) * 3.2, z = a[1] + Math.sin(an) * 3.2, y = (li + 1) * 3; let fell = false;
      for (let s = 0; s < 40; s++) { const nx = x - Math.cos(an) * 0.08, nz = z - Math.sin(an) * 0.08; if (T.blocked(nx, nz, y)) break; x = nx; z = nz; const f = T.floor(x, z, y); if (f < y - 0.45) { fell = true; break; } y = f; }
      out.push(fell ? Math.round(an * 180 / Math.PI) : null); } return out.filter(v => v !== null); }, [sp.a, sp.li]);
  console.log(ok, '· in het gat gevallen vanuit (graden):', JSON.stringify(val));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
 }
 await b.close(); })();
