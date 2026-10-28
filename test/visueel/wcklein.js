// Klein winkelcentrum: controle in de Raatbouwer, beelden (bovenaanzicht per laag, 3D, rondlopen) en in de stad
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const nm = await p.evaluate(() => { const m = window.__mods.find(m => m.name.startsWith('Winkelcentrum · klein')); if (!m) return null; window.__SC().openSchets(m); return m.name; });
 console.log('module', nm); if (!nm) { await b.close(); return; }
 await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(900);
 console.log('controle', JSON.stringify(await p.evaluate(() => { const r = window.__MME.checkModule(); return { rood: [...r.bad.entries()].map(([k, v]) => [k, v.size]), opm: r.marks.map(m => m.li + ': ' + m.msg) }; })));
 console.log('telling', await p.evaluate(() => window.__MME.m.lv.map(L => [Object.keys(L.f).length, Object.keys(L.w).length, L.s.length, L.o.length].join('/')).join(' ')));
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await p.evaluate(() => { window.__MME.lv = 0; }); await p.keyboard.press('KeyV'); await p.waitForTimeout(400);
 await p.screenshot({ path: OUT + '/wck_bg.png', timeout: 120000 });
 await p.evaluate(() => { window.__MME.lv = 1; document.getElementById('mm_lvUp').click(); document.getElementById('mm_lvDn').click(); }); await p.waitForTimeout(400);
 await p.screenshot({ path: OUT + '/wck_1e.png', timeout: 120000 });
 await p.keyboard.press('Digit3'); await p.evaluate(() => { const E = window.__MME; E.lv = 1; E.upto = false; }); await p.waitForTimeout(1500);
 await p.screenshot({ path: OUT + '/wck_3d.png', timeout: 120000 });
 // rondlopen: in de hal
 await p.evaluate(() => { window.__MME.lv = 0; }); await p.keyboard.press('Digit4'); await p.waitForTimeout(500);
 await p.evaluate(() => { const w = window.__MME.walk; w.x = 0; w.z = 7.2; w.y = 0; w.yaw = 0.0; w.pitch = 0.12; }); await p.waitForTimeout(900);
 await p.screenshot({ path: OUT + '/wck_hal.png', timeout: 120000 });
 // kun je overal komen (met de botsing van rondlopen): vanaf de ingang naar elke unit en via de trap naar de galerij
 const bereik = await p.evaluate(() => { const T = window.__MME.walkTest, w = window.__MME.walk, seen = new Set(), q = [[w.x, w.z, w.y]], k = (x, z, y) => Math.round(x / 0.45) + ',' + Math.round(z / 0.45) + ',' + Math.round(y); let hi = 0, n = 0;
   while (q.length && n < 80000) { const [x, z, y] = q.shift(); n++; hi = Math.max(hi, y); for (let a = 0; a < 8; a++) { const nx = x + 0.45 * Math.cos(a * Math.PI / 4), nz = z + 0.45 * Math.sin(a * Math.PI / 4); if (T.blocked(nx, nz, y)) continue; const ny = T.floor(nx, nz, y); const kk = k(nx, nz, ny); if (seen.has(kk)) continue; seen.add(kk); q.push([nx, nz, ny]); } }
   const lv1 = [...seen].filter(s => +s.split(',')[2] >= 3).length;
   const pts = [...seen].map(s => s.split(',').map(Number)), units = []; for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) { if (Math.abs(q + r) > 1 || (!q && !r)) continue; const c = [q * 15.588 * Math.sqrt(3) / 2 * 0 + 0, 0]; }
   const S = window.__SC ? null : null; const C = window.__mv2.mv2CellXZ; const out = [];
   for (const [q, r] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]) { const c = C(q, r); for (const lv of [0, 3]) { const hit = pts.some(([x, z, y]) => Math.hypot(x * 0.45 - c[0], z * 0.45 - c[1]) < 3.5 && Math.abs(y - lv) < 0.6); out.push(q + ',' + r + (lv ? ' boven' : ' bg') + ':' + (hit ? 'ja' : 'NEE')); } }
   return { stappen: n, hoogste: +hi.toFixed(2), opGalerij: lv1, units: out.join(' ') }; });
 console.log('lopen', JSON.stringify(bereik));
 await p.keyboard.press('Escape'); await b.close(); })();
