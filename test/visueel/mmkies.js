// Raatmaker, gereedschap Kiezen: aanklikken (ruimte), Ctrl+klik, rechthoek, verplaatsen, draaien, kopiëren/plakken, weghalen
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { const m = window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')); window.__SC().openSchets(m); }); await p.waitForTimeout(1500);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(300);
 await p.mouse.move(640, 420); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(80); } await p.waitForTimeout(300);
 const cv = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: window.__MME.view.s, vx: window.__MME.view.x, vz: window.__MME.view.z, l: r.left, t: r.top, w: r.width, h: r.height }; });
 const at0 = (x, z) => [cv.x + (x - cv.vx) * cv.s, cv.y + (z - cv.vz) * cv.s]; void at0;
 const at = async (x, z) => p.evaluate(([x, z]) => window.__MME.toS(x, z), [x, z]);
 const st = async (lbl) => console.log(lbl.padEnd(22), await p.evaluate(() => { const E = window.__MME, S = E.sel || { f: [], w: [], s: [], o: [], r: [] }, L = E.m.lv[E.lv]; return JSON.stringify({ lv: E.lv, sel: [S.f.size, S.w.size, S.s.size, S.o.size, S.r.size], data: [Object.keys(L.f).length, Object.keys(L.w).length, L.s.length, L.o.length], msg: document.getElementById('mm_msg').textContent }); }));
 await p.keyboard.press('KeyV'); await p.waitForTimeout(200);
 await p.mouse.click(...(await at(-1.6, -3.2))); await p.waitForTimeout(300); await st('klik vloer');
 await p.screenshot({ path: OUT + '/kies_ruimte.png', clip: { x: cv.l, y: cv.t, width: cv.w, height: cv.h }, timeout: 120000 });
 // rechthoek over het hele vak
 const A = await at(-11, -11), B = await at(11, 11); await p.mouse.move(...A); await p.mouse.down(); await p.mouse.move(...B, { steps: 6 }); await p.waitForTimeout(200);
 await p.screenshot({ path: OUT + '/kies_rechthoek.png', clip: { x: cv.l, y: cv.t, width: cv.w, height: cv.h }, timeout: 120000 }); await p.mouse.up(); await p.waitForTimeout(300); await st('rechthoek');
 // keuken aanklikken en 2 rasterstappen verslepen
 const kit = await p.evaluate(() => { const o = window.__MME.m.lv[0].o.find(o => o.t === 'kitchen'); return [o.x, o.z]; });
 await p.mouse.click(...(await at(4, 4))); await p.waitForTimeout(150);   // leeg (deur?) om eerst niets te kiezen
 await p.keyboard.press('Escape');
 const k0 = await at(...kit), k1 = await at(kit[0], kit[1] + 4.5); await p.mouse.move(...k0); await p.mouse.down(); await p.mouse.move(...k1, { steps: 6 }); await p.waitForTimeout(200);
 await p.screenshot({ path: OUT + '/kies_slepen.png', clip: { x: cv.l, y: cv.t, width: cv.w, height: cv.h }, timeout: 120000 }); await p.mouse.up(); await p.waitForTimeout(300);
 console.log('keuken', JSON.stringify(kit), '→', await p.evaluate(() => JSON.stringify(window.__MME.m.lv[0].o.filter(o => o.t === 'kitchen').map(o => [o.x, o.z]))));
 // alles kiezen, draaien met E, kopiëren, naar boven, plakken op dezelfde plek
 await p.keyboard.press('Control+a'); await p.waitForTimeout(200); await st('Ctrl+A');
 const w0 = await p.evaluate(() => Object.keys(window.__MME.m.lv[0].w).sort().join('|'));
 await p.keyboard.press('KeyE'); await p.waitForTimeout(400); await st('E (draaien)');
 const w1 = await p.evaluate(() => Object.keys(window.__MME.m.lv[0].w).sort().join('|'));
 for (let i = 0; i < 5; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(250); }
 const w6 = await p.evaluate(() => Object.keys(window.__MME.m.lv[0].w).sort().join('|'));
 console.log('muren na 1×: anders', w0 !== w1, '· na 6× gelijk aan begin', w0 === w6);
 await p.screenshot({ path: OUT + '/kies_alles.png', clip: { x: cv.l, y: cv.t, width: cv.w, height: cv.h }, timeout: 120000 });
 await p.keyboard.press('Control+c'); await p.waitForTimeout(200);
 await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(300);
 await p.keyboard.press('Control+Shift+v'); await p.waitForTimeout(400); await st('plak op laag 2');
 await p.keyboard.press('Delete'); await p.waitForTimeout(300); await st('Delete');
 await p.keyboard.press('Control+z'); await p.waitForTimeout(300); await st('Ctrl+Z');
 await p.keyboard.press('Digit3'); await p.waitForTimeout(500); await p.evaluate(() => document.getElementById('mm_lvDn').click()); await p.waitForTimeout(300);
 await p.keyboard.press('KeyV'); await p.waitForTimeout(100);
 const c3 = await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
 await p.mouse.click(c3[0] + 40, c3[1] + 40); await p.waitForTimeout(500); await st('3D klik');
 await p.screenshot({ path: OUT + '/kies_3d.png', clip: { x: cv.l, y: cv.t, width: cv.w, height: cv.h }, timeout: 120000 });
 await b.close(); })();
