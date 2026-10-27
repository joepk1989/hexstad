const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(400);   // bovenaanzicht
 // vloer op twee verdiepingen: vul gereedschap, klik in het midden
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s }; });
 await p.keyboard.press('KeyG'); await p.mouse.click(cv.x, cv.y); await p.waitForTimeout(300);
 await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(200);
 await p.mouse.click(cv.x, cv.y); await p.waitForTimeout(300);
 await p.evaluate(() => document.getElementById('mm_lvDn').click()); await p.waitForTimeout(200);
 // trap: sleep vanaf iets links van het midden, 3 zijden (6,75 m) naar rechts-boven
 await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
 const s = cv.s, x0 = cv.x - 3.4 * s, y0 = cv.y + 1.9 * s;
 await p.mouse.move(x0, y0); await p.mouse.down();
 for (let k = 1; k <= 12; k++) { await p.mouse.move(x0 + k / 12 * 5.85 * s, y0 - k / 12 * 3.375 * s); await p.waitForTimeout(40); }
 const msg = await p.evaluate(() => document.getElementById('mm_msg').textContent + ' | ' + JSON.stringify(window.__MME.coverInfo));
 await p.screenshot({ path: OUT + '/mmtrap_slepen.png', timeout: 120000 });
 await p.mouse.up(); await p.waitForTimeout(400);
 const st = await p.evaluate(() => { const E = window.__MME; return { s0: E.m.lv[0].s.map(S => ({ k: S.k, n: S.n, w: S.w, off: S.off, d: S.d })), vloer1: Object.keys(E.m.lv[1].f).length }; });
 console.log('melding:', msg); console.log(JSON.stringify(st));
 await p.keyboard.press('Digit3'); await p.waitForTimeout(800);
 await p.screenshot({ path: OUT + '/mmtrap_3d.png', timeout: 120000 });
 await b.close(); })();
