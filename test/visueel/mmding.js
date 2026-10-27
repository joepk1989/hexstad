const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s, vx: window.__MME.view.x, vz: window.__MME.view.z }; });
 const at = (x, z) => [cv.x + (x - cv.vx) * cv.s, cv.y + (z - cv.vz) * cv.s];
 await p.keyboard.press('KeyG'); await p.mouse.click(cv.x, cv.y); await p.waitForTimeout(200);
 await p.keyboard.press('KeyB'); await p.waitForTimeout(200);
 await p.evaluate(() => { [...document.querySelectorAll('#mm_sw button')].find(b => b.textContent.includes('Bankje')).click(); });
 const c1 = at(-3, 0); await p.mouse.move(...c1); await p.waitForTimeout(300);
 await p.keyboard.press('KeyE'); await p.keyboard.press('KeyE'); await p.keyboard.press('KeyE'); await p.waitForTimeout(300);
 console.log('orot', await p.evaluate(() => window.__MME.orot), await p.evaluate(() => document.getElementById('mm_msg').textContent));
 await p.screenshot({ path: OUT + '/ding_2d.png', clip: { x: c1[0] - 200, y: c1[1] - 150, width: 400, height: 300 }, timeout: 120000 });
 await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300);
 // slepen om te richten
 const c2 = at(3, 2); await p.mouse.move(...c2); await p.mouse.down(); await p.mouse.move(c2[0] + 40, c2[1] - 40, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
 // klik op bestaand: 30° verder
 await p.mouse.move(...c1); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300);
 console.log(JSON.stringify(await p.evaluate(() => window.__MME.m.lv[0].o.map(o => ({ t: o.t, x: o.x, z: o.z, graden: Math.round(o.rot * 180 / Math.PI) })))));
 await p.keyboard.press('Digit3'); await p.waitForTimeout(500);
 const c3 = await p.evaluate(() => { const E = window.__MME; return null; });
 await p.evaluate(() => { [...document.querySelectorAll('#mm_sw button')].find(b => b.textContent.includes('Winkelstelling')).click(); });
 await p.mouse.move(cv.x + 30, cv.y + 120); await p.waitForTimeout(800);
 await p.screenshot({ path: OUT + '/ding_3d.png', timeout: 120000 });
 await b.close(); })();
