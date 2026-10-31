// Raatmaker: daken die de muren volgen (villa ¾) en een zadeldak met de nok naar de muis
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')));
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Villa · wit')))); await p.waitForFunction(() => window.__MME && window.__MME.m, null, {timeout: 20000}); await p.waitForTimeout(600); await p.evaluate(() => document.getElementById("mm_lvUp").click()); await p.waitForTimeout(400); await p.mouse.move(640, 420); for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(80); } await p.waitForTimeout(500);
 await p.screenshot({ path: OUT + '/dak_villa.png', timeout: 120000 });
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); await p.waitForTimeout(1500);
 await p.keyboard.press('KeyK'); await p.waitForTimeout(200);
 await p.evaluate(() => [...document.querySelectorAll('#mm_sw button')].find(b => b.textContent.includes('Zadeldak')).click());
 await p.evaluate(() => document.getElementById('mm_lvUp').click()); await p.waitForTimeout(400);
 const pt = await p.evaluate(() => window.__MME.toS(6.5, 3.6)); await p.mouse.click(...pt); await p.waitForTimeout(800);
 console.log(await p.evaluate(() => JSON.stringify(window.__MME.m.lv[1].r)), await p.evaluate(() => document.getElementById('mm_msg').textContent));
 await p.mouse.move(640, 420); for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(80); } await p.mouse.move(5, 790); await p.waitForTimeout(500);
 await p.screenshot({ path: OUT + '/dak_zadel.png', timeout: 120000 });
 await b.close(); })();
