const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s, vx: window.__MME.view.x, vz: window.__MME.view.z }; });
 const at = (x, z) => [cv.x + (x - cv.vx) * cv.s, cv.y + (z - cv.vz) * cv.s];
 await p.keyboard.press('KeyG'); await p.mouse.click(cv.x, cv.y); await p.waitForTimeout(200);
 await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.mouse.click(cv.x, cv.y); await p.waitForTimeout(200);
 await p.evaluate(() => document.getElementById('mm_lvDn').click()); await p.waitForTimeout(200);
 const clip = c => ({ x: c[0] - 230, y: c[1] - 190, width: 460, height: 380 });
 // trap: alleen wijzen
 await p.keyboard.press('KeyT'); await p.waitForTimeout(200);
 const c1 = at(0.8, 0.5); await p.mouse.move(...c1); await p.waitForTimeout(400);
 console.log('trap hover', await p.evaluate(() => JSON.stringify(window.__MME.coverInfo)));
 await p.screenshot({ path: OUT + '/hover_trap.png', clip: clip(c1), timeout: 120000 });
 await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300);
 console.log('na klik', await p.evaluate(() => JSON.stringify(window.__MME.m.lv[0].s)));
 // wenteltrap: wijzen
 await p.keyboard.press('KeyJ'); await p.waitForTimeout(200);
 const c2 = at(-4.2, -1.6); await p.mouse.move(...c2); await p.waitForTimeout(400);
 console.log('wentel hover', await p.evaluate(() => JSON.stringify(window.__MME.coverInfo)));
 await p.screenshot({ path: OUT + '/hover_wentel.png', clip: clip(c2), timeout: 120000 });
 await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300);
 console.log('na klik', await p.evaluate(() => JSON.stringify(window.__MME.m.lv[0].s)));
 await p.keyboard.press('Digit3'); await p.waitForTimeout(400);
 await p.mouse.move(1100, 700); await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(900);
 await p.screenshot({ path: OUT + '/hover_3d.png', clip: { x: 250, y: 220, width: 380, height: 260 }, timeout: 120000 });
 await b.close(); })();
