const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s, vx: window.__MME.view.x, vz: window.__MME.view.z }; });
 const at = (x, z) => [cv.x + (x - cv.vx) * cv.s, cv.y + (z - cv.vz) * cv.s];
 await p.keyboard.press('KeyG'); await p.mouse.click(cv.x, cv.y);
 await p.keyboard.press('KeyW'); { const [a, b2] = [at(-3.9, 4.5), at(3.9, 4.5)]; await p.mouse.move(...a); await p.mouse.down(); await p.mouse.move(...b2, { steps: 8 }); await p.mouse.up(); }
 await p.keyboard.press('KeyT'); { const a = at(-3.4, -1.9); await p.mouse.move(...a); await p.mouse.down(); for (let k = 1; k <= 10; k++) await p.mouse.move(a[0] + k / 10 * 5.85 * cv.s, a[1] - k / 10 * 3.375 * cv.s); await p.mouse.up(); }
 await p.keyboard.press('Digit3'); await p.waitForTimeout(800); await p.keyboard.press('KeyX');
 // in 3D: zoek een schermpunt waar de gum een muur en een trap kiest (raster over het tekenvlak)
 const hits = {};
 for (let gy = 0; gy < 14 && Object.keys(hits).length < 2; gy++) for (let gx = 0; gx < 20 && Object.keys(hits).length < 2; gx++) {
  const x = cv.x - 400 + gx * 40, y = cv.y - 260 + gy * 40; await p.mouse.move(x, y);
  const lab = await p.evaluate(() => { const c = document.getElementById('mm_cv'), g = c.getContext('2d'); return null; });
  for (const k of ['muur', 'trap']) if (!hits[k]) { /* label staat op het canvas: we weten het niet direct; gebruik eraseTarget-achtige proef via de readout */ }
 }
 await p.mouse.move(cv.x + 20, cv.y + 120); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/gum3d_a.png', timeout: 120000 });
 await p.mouse.move(cv.x - 10, cv.y - 40); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/gum3d_b.png', timeout: 120000 });
 await b.close(); })();
