// Raatbouwer: rondlopen (4). Begint op een vrije plek, W loopt, muren houden je tegen, en via de trappen kom je op elke verdieping.
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const names = ['Rijhuis · baksteen · 2L', 'Villa', 'Trappenhuis', 'Kantoor · glas · 3L', 'Winkelcentrum', 'Woontoren'];
 for (const nm of names) {
  const ok = await p.evaluate(nm => { const m = window.__mods.find(m => m.name.startsWith(nm)); if (!m) return null; window.__SC().openSchets(m); return m.name; }, nm); if (!ok) { console.log('geen', nm); continue; }
  await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(700);
  await p.keyboard.press('Digit4'); await p.waitForTimeout(400);
  const w0 = await p.evaluate(() => Object.assign({}, window.__MME.walk));
  const f0 = await p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
  await p.evaluate(() => { const w = window.__MME.walk; w.yaw += Math.PI / 2; });   // langs de gevel, niet ertegenaan
  await p.keyboard.down('KeyW'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW');
  const w1 = await p.evaluate(() => Object.assign({}, window.__MME.walk));
  // bereikbaarheid met dezelfde botsing: stapjes van 0,3 m in 12 richtingen vanaf het startpunt
  const reach = await p.evaluate(([x0, z0, y0]) => { const T = window.__MME.walkTest, LH = 3, seen = new Set(), q = [[x0, z0, y0]], lvls = new Set(), k = (x, z, y) => Math.round(x / 0.3) + ',' + Math.round(z / 0.3) + ',' + Math.round(y / 0.5);
   let n = 0; while (q.length && n < 60000) { const [x, z, y] = q.shift(); n++; lvls.add(Math.round(y / LH));
    for (let a = 0; a < 12; a++) { const nx = x + 0.3 * Math.cos(a * Math.PI / 6), nz = z + 0.3 * Math.sin(a * Math.PI / 6); if (T.blocked(nx, nz, y)) continue; let ny = T.floor(nx, nz, y); const kk = k(nx, nz, ny); if (seen.has(kk)) continue; seen.add(kk); q.push([nx, nz, ny]); } }
   return { lvls: [...lvls].sort(), n }; }, [w0.x, w0.z, w0.y]);
  const nLv = await p.evaluate(() => window.__MME.m.lv.length);
  console.log(ok.padEnd(28), 'start', [w0.x, w0.z, w0.y].map(v => v.toFixed(1)).join(','), '· na 1,5 s W', Math.hypot(w1.x - w0.x, w1.z - w0.z).toFixed(1), 'm (', f0, 'fps) · bereikbaar verdiepingen', JSON.stringify(reach.lvls), 'van', nLv, '(', reach.n, 'stappen)');
  if (nm === 'Villa') await p.screenshot({ path: OUT + '/lopen_villa.png', timeout: 120000 });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  if (await p.evaluate(() => !!window.__MME.walk)) console.log('  Esc stopte niet');
 }
 // binnen in een woning, op de verdieping
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); await p.waitForTimeout(900);
 await p.evaluate(() => { document.getElementById('mm_lvUp').click(); }); await p.waitForTimeout(300); await p.keyboard.press('Digit4'); await p.waitForTimeout(800);
 console.log('op 1e verdieping begonnen:', await p.evaluate(() => JSON.stringify(window.__MME.walk)), await p.evaluate(() => document.getElementById('mm_walkHud').textContent.slice(0, 40)));
 await p.screenshot({ path: OUT + '/lopen_binnen.png', timeout: 120000 });
 await p.keyboard.press('KeyG'); console.log('tool na G tijdens lopen:', await p.evaluate(() => window.__MME.tool));
 await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('KeyG'); console.log('tool na Esc + G:', await p.evaluate(() => window.__MME.tool));
 await b.close(); })();
