const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s, vx: window.__MME.view.x, vz: window.__MME.view.z }; });
 const at = (x, z) => [cv.x + (x - cv.vx) * cv.s, cv.y + (z - cv.vz) * cv.s];
 await p.keyboard.press('KeyG'); await p.mouse.click(cv.x, cv.y);
 await p.keyboard.press('KeyW'); { const [a, b2] = [at(-3.9, 4.5), at(3.9, 4.5)]; await p.mouse.move(...a); await p.mouse.down(); await p.mouse.move(...b2, { steps: 8 }); await p.mouse.up(); }
 await p.keyboard.press('Digit3'); await p.waitForTimeout(800); await p.keyboard.press('KeyX');
 const hits = { muur: 0, vloer: 0, niets: 0 }; let shot = null;
 for (let gy = 0; gy < 16; gy++) for (let gx = 0; gx < 22; gx++) { const x = cv.x - 440 + gx * 40, y = cv.y - 300 + gy * 40; await p.mouse.move(x, y); const k = await p.evaluate(() => { const T = window.__MME.lastT; return T ? T.kind : 'niets'; }); hits[k] = (hits[k] || 0) + 1; if (k === 'muur' && !shot) shot = [x, y]; }
 console.log(JSON.stringify(hits));
 if (shot) { await p.mouse.move(shot[0] + 1, shot[1]); await p.waitForTimeout(500); await p.mouse.move(...shot); await p.waitForTimeout(900); console.log('shot', shot, await p.evaluate(() => JSON.stringify(window.__MME.lastT))); await p.screenshot({ path: OUT + '/gumwand.png', timeout: 120000 }); await p.mouse.down(); await p.mouse.up(); console.log('muren over', await p.evaluate(() => Object.keys(window.__MME.m.lv[0].w).length)); }
 await b.close(); })();
