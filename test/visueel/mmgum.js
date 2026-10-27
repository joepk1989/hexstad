const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s }; });
 const s = cv.s; let VX = 0, VZ = 0; const at = (x, z) => [cv.x + (x - VX) * s, cv.y + (z - VZ) * s];
 await p.keyboard.press('KeyG'); await p.mouse.click(cv.x, cv.y); await p.waitForTimeout(200);
 // muur
 await p.keyboard.press('KeyW'); { const [a, b2] = [at(-3.9, 4.5), at(3.9, 4.5)]; await p.mouse.move(...a); await p.mouse.down(); await p.mouse.move(...b2, { steps: 8 }); await p.mouse.up(); }
 // trap
 await p.keyboard.press('KeyT'); { const a = at(-3.4, -1.9); await p.mouse.move(...a); await p.mouse.down(); for (let k = 1; k <= 10; k++) await p.mouse.move(a[0] + k / 10 * 5.85 * s, a[1] - k / 10 * 3.375 * s); await p.mouse.up(); }
 // voorwerp
 await p.keyboard.press('KeyB'); await p.mouse.click(...at(-4.5, -5)); await p.waitForTimeout(200);
 const st = await p.evaluate(() => { const L = window.__MME.m.lv[0]; return { muren: Object.keys(L.w).length, trappen: L.s.length, dingen: L.o.length }; }); console.log(JSON.stringify(st));
 await p.keyboard.press('KeyX'); await p.waitForTimeout(200);
 const tr = await p.evaluate(() => { const E = window.__MME, S = E.m.lv[0].s[0]; return S ? { a: S.a, d: S.d, n: S.n } : null; }); console.log('trap', JSON.stringify(tr));
 const sc = await p.evaluate(() => { const E = window.__MME, S = E.m.lv[0].s[0], t = 2.25, P = (i, j) => [i * t * Math.sqrt(3) / 2, j * t + i * t / 2], DIR6 = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]], D = DIR6[S.d], dx = D[0] * t * Math.sqrt(3) / 2, dz = D[0] * t / 2 + D[1] * t, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, a = P(S.a[0], S.a[1]), al = S.n * t / 2; return [a[0] + ux * al - uz * (S.off || 0), a[1] + uz * al + ux * (S.off || 0)]; });
 const tow = await p.evaluate(() => [window.__MME.view.x, window.__MME.view.z]);
 VX = tow[0]; VZ = tow[1];
 for (const [n, x, z] of [['muur', 0, 4.5], ['trap', sc[0], sc[1]], ['vloer', 4, -4]]) { await p.mouse.move(...at(x, z)); await p.waitForTimeout(250); await p.screenshot({ path: OUT + '/gum_' + n + '.png', clip: { x: cv.x - 330, y: cv.y - 260, width: 660, height: 520 }, timeout: 120000 }); }
 await b.close(); })();
