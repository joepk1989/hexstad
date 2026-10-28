// Raatbouwer: voorwerpen gaan met hun rug tegen de muur staan; het controle-bolletje kleurt na elke wijziging
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(800);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300); await p.mouse.move(640, 420); for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(60); } await p.waitForTimeout(400);
 const dot = () => p.evaluate(() => document.querySelector('#mm_edit .mm-check').dataset.st + ' | ' + document.querySelector('#mm_edit .mm-check').title);
 console.log('bij openen:', await dot());
 await p.keyboard.press('KeyB'); await p.waitForTimeout(200);
 const DW = await p.evaluate(() => window.__mv2.MV2.DIRW);
 const walls = await p.evaluate(() => { const L = window.__MME.m.lv[0]; return Object.keys(L.w).filter(id => !L.w[id].o); });
 const types = ['sofa', 'kitchen', 'desk', 'shelf', 'counter', 'bench', 'bed', 'screen'];
 const res = []; let flagged = 0, total = 0;
 for (let n = 0; n < types.length * 3; n++) {
   const t = types[n % types.length], id = walls[(n * 7) % walls.length];
   await p.evaluate(t => { window.__MME.obj = t; }, t);
   const pt = await p.evaluate(([id, DW]) => { const [i, j, d] = id.split(',').map(Number), D = DW[d], t = 2.25, P = (i, j) => [i * t * Math.sqrt(3) / 2, i * t / 2 + j * t], a = P(i, j), bb = P(i + D[0], j + D[1]), mx = (a[0] + bb[0]) / 2, mz = (a[1] + bb[1]) / 2, l = Math.hypot(mx, mz) || 1; return [mx - mx / l * 0.7, mz - mz / l * 0.7]; }, [id, DW]);
   const s = await p.evaluate(([x, z]) => window.__MME.toS(x, z), pt);
   const n0 = await p.evaluate(() => window.__MME.m.lv[0].o.length);
   await p.mouse.move(s[0], s[1]); await p.waitForTimeout(100); await p.mouse.click(s[0], s[1]); await p.waitForTimeout(150);
   const r = await p.evaluate(([n0, DW]) => { const E = window.__MME, L = E.m.lv[0]; if (L.o.length === n0) return null; const o = L.o[L.o.length - 1], t = 2.25, P = (i, j) => [i * t * Math.sqrt(3) / 2, i * t / 2 + j * t];
     const ck = E.checkModule().marks.filter(m => Math.abs(m.x - o.x) < 1e-6 && Math.abs(m.z - o.z) < 1e-6).map(m => m.msg);
     return { o, ck }; }, [n0, DW]);
   if (!r) { res.push(t + ' @' + id + ': niet neergezet'); continue; }
   total++; if (r.ck.length) flagged++;
   res.push(`${t.padEnd(8)} @${id.padEnd(8)} ${r.o.x.toFixed(2)},${r.o.z.toFixed(2)} ${Math.round(r.o.rot * 180 / Math.PI)}° ${r.ck.join('; ')}`);
   if (n < types.length * 3 - types.length) { await p.keyboard.press('Control+z'); await p.waitForTimeout(100); }
 }
 console.log(res.join('\n')); console.log('neergezet', total, '· in een muur', flagged);
 await p.waitForTimeout(600);
 const ck = await p.evaluate(() => { const r = window.__MME.checkModule(); return r.marks.map(m => m.msg); });
 console.log('controle-opmerkingen:', JSON.stringify(ck)); console.log('bolletje:', await dot());
 await p.screenshot({ path: OUT + '/muur_voorwerpen_2d.png', timeout: 120000 });
 await p.keyboard.press('Digit3'); await p.waitForTimeout(1500); await p.screenshot({ path: OUT + '/muur_voorwerpen.png', timeout: 120000 });
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 // met Ctrl midden op een muur: los, dus in de muur → rood bolletje
 await p.evaluate(() => { window.__MME.obj = 'sofa'; });
 const wm = await p.evaluate(id => { const [i, j, d] = id.split(',').map(Number), D = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]][d], t = 2.25, P = (i, j) => [i * t * Math.sqrt(3) / 2, i * t / 2 + j * t], a = P(i, j), bb = P(i + D[0], j + D[1]); return window.__MME.toS((a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2); }, walls[1]);
 await p.keyboard.down('Control'); await p.mouse.move(wm[0], wm[1]); await p.mouse.click(wm[0], wm[1]); await p.keyboard.up('Control'); await p.waitForTimeout(700);
 console.log('Ctrl op de muur:', await dot());
 await p.keyboard.press('Control+z'); await p.waitForTimeout(700); console.log('na Ctrl+Z:', await dot());
 await b.close(); })();
