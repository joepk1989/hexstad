// Raatbouwer: voorwerpen fijner selecteren (langwerpig = hele lengte telt mee) en vrij verplaatsen (niet aan het raster)
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(700);
 await p.keyboard.press('Digit2'); await p.waitForTimeout(200); await p.mouse.move(640, 420); for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(60); } await p.waitForTimeout(300);
 // een stelling (shelf, 2.4m lang) tegen een muur zetten zodat we bij het uiteinde kunnen klikken
 await p.keyboard.press('KeyB'); await p.waitForTimeout(150);
 await p.evaluate(() => { window.__MME.obj = 'shelf'; });
 const put = await p.evaluate(() => window.__MME.toS(0, 7.6));
 await p.mouse.click(put[0], put[1]); await p.waitForTimeout(200);
 const shelf = await p.evaluate(() => { const L = window.__MME.m.lv[0]; return L.o[L.o.length - 1]; });
 console.log('stelling op', shelf.x.toFixed(2), shelf.z.toFixed(2), 'draaiing', Math.round(shelf.rot * 180 / Math.PI));
 // klik op het uiteinde (1 m van het midden langs de lengte-as) met Kiezen
 await p.keyboard.press('KeyV'); await p.waitForTimeout(150);
 const ux = Math.cos(shelf.rot), uz = Math.sin(shelf.rot);
 const end = [shelf.x + ux * 1.0, shelf.z + uz * 1.0];
 const se = await p.evaluate(([x, z]) => window.__MME.toS(x, z), end);
 await p.mouse.click(se[0], se[1]); await p.waitForTimeout(300);
 console.log('klik op uiteinde: gekozen', await p.evaluate(() => { const S = window.__MME.sel; return S ? { f: S.f.size, w: S.w.size, s: S.s.size, o: S.o.size, r: S.r.size } : null; }));
 // nu fijn verplaatsen: sleep maar 0.3 m
 const from = await p.evaluate(([x, z]) => window.__MME.toS(x, z), [shelf.x, shelf.z]);
 const to = await p.evaluate(([x, z]) => window.__MME.toS(x, z), [shelf.x + 0.3, shelf.z]);
 await p.mouse.move(se[0], se[1]); await p.mouse.down(); await p.mouse.move(se[0] + (to[0] - from[0]), se[1] + (to[1] - from[1]), { steps: 6 }); await p.waitForTimeout(150);
 await p.screenshot({ path: OUT + '/fijn_slepen.png', clip: await p.evaluate(() => { const r = document.getElementById('mm_cv').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; }) });
 await p.mouse.up(); await p.waitForTimeout(300);
 const shelf2 = await p.evaluate(() => { const L = window.__MME.m.lv[0]; return L.o[L.o.length - 1]; });
 console.log('na 0,3 m slepen:', (shelf2.x - shelf.x).toFixed(3), (shelf2.z - shelf.z).toFixed(3), '(grid-stap is 2,25 m)');
 // nog fijner: 0,05 m
 const p0 = await p.evaluate(([x, z]) => window.__MME.toS(x, z), [shelf2.x, shelf2.z]);
 const p1 = await p.evaluate(([x, z]) => window.__MME.toS(x, z), [shelf2.x, shelf2.z + 0.05]);
 const s0 = await p.evaluate(() => window.__MME.toS(window.__MME.m.lv[0].o[window.__MME.m.lv[0].o.length-1].x, window.__MME.m.lv[0].o[window.__MME.m.lv[0].o.length-1].z));
 await p.mouse.move(p0[0], p0[1]); await p.mouse.down(); await p.mouse.move(p1[0], p1[1], { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(200);
 const shelf3 = await p.evaluate(() => { const L = window.__MME.m.lv[0]; return L.o[L.o.length - 1]; });
 console.log('na 0,05 m slepen:', (shelf3.z - shelf2.z).toFixed(3));
 // normale selectie (vloer/muur) blijft op het raster
 await p.keyboard.press('Control+a'); await p.waitForTimeout(150);
 const m0 = await p.evaluate(() => JSON.stringify(window.__MME.m.lv[0].f));
 const c0 = await p.evaluate(() => window.__MME.toS(0, 0)), c1 = await p.evaluate(() => window.__MME.toS(0.3, 0));
 await p.mouse.move(c0[0], c0[1] - 100); await p.mouse.down(); await p.mouse.move(c1[0], c1[1] - 100, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(200);
 console.log('alles-selectie 0,3m slepen: vloer ongewijzigd?', (await p.evaluate(() => JSON.stringify(window.__MME.m.lv[0].f))) === m0);
 await b.close(); })();
