const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { l: r.left, t: r.top, x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s, vx: window.__MME.view.x, vz: window.__MME.view.z }; });
 const at = (x, z) => [cv.x + (x - cv.vx) * cv.s, cv.y + (z - cv.vz) * cv.s];
 await p.keyboard.press('KeyG'); await p.mouse.click(cv.x, cv.y);
 await p.keyboard.press('KeyW'); { const [a, b2] = [at(-3.9, 4.5), at(3.9, 4.5)]; await p.mouse.move(...a); await p.mouse.down(); await p.mouse.move(...b2, { steps: 8 }); await p.mouse.up(); }
 await p.keyboard.press('Digit3'); await p.waitForTimeout(800); await p.keyboard.press('KeyX');
 const grid = await p.evaluate(() => { const E = window.__MME, out = []; for (let y = 0; y < 720; y += 30) { let row = ''; for (let x = 0; x < 960; x += 20) row += E.wallRay(x, y) ? '#' : '.'; out.push(row); } return out; });
 console.log(grid.join('\n').split('\n').length);
 await p.mouse.move(cv.l + 360, cv.t + 420); await p.waitForTimeout(600); console.log(await p.evaluate(() => JSON.stringify(window.__MME.lastT))); await p.screenshot({ path: OUT + '/gumwand.png', timeout: 120000 });
 await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(300); console.log('muren na klik', await p.evaluate(() => Object.keys(window.__MME.m.lv[0].w).length));
 await b.close(); })();
