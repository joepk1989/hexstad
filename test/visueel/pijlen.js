// Modules-palet: pijlen om te bladeren (desktop) en de nieuwe indeling
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.keyboard.press('Tab'); await p.waitForTimeout(400);
 await p.evaluate(() => [...document.querySelectorAll('.palette .pal-tab')].find(x => /Modules/.test(x.textContent)).click()); await p.waitForTimeout(800);
 const st = () => p.evaluate(() => { const ts = document.querySelector('.tool-scroll'), ch = document.getElementById('modChips'), ar = [...document.querySelectorAll('.sarrow')].map(a => (a.closest('.mchips-wrap') ? 'chip' : 'tool') + a.className.slice(-1) + (a.hidden ? ':uit' : ':aan')); return { ar, tool: Math.round(ts.scrollLeft) + '/' + (ts.scrollWidth - ts.clientWidth), chips: Math.round(ch.scrollLeft) + '/' + (ch.scrollWidth - ch.clientWidth), cats: [...ch.querySelectorAll('.mchip')].map(x => x.textContent).join(' | ') }; });
 console.log('begin', JSON.stringify(await st()));
 await p.screenshot({ path: OUT + '/pijlen_1.png' });
 await p.click('.palette .pal-row .sarrow.r'); await p.waitForTimeout(700); await p.click('.mchips-wrap .sarrow.r'); await p.waitForTimeout(700);
 console.log('na pijl rechts', JSON.stringify(await st()));
 await p.screenshot({ path: OUT + '/pijlen_2.png' });
 await p.mouse.move(640, 600); await p.mouse.wheel(0, 400); await p.waitForTimeout(500);
 console.log('na scrollwiel', JSON.stringify((await st()).tool));
 for (const c of ['Horeca', 'Sport', 'Vervoer']) { await p.evaluate(c => [...document.querySelectorAll('#modChips .mchip')].find(x => x.textContent.startsWith(c)).click(), c); await p.waitForTimeout(300); console.log(c, await p.evaluate(() => [...document.querySelectorAll('.modcard')].map(x => x.title.split('\n')[0]).filter(Boolean).join(' | '))); }
 await b.close(); })();
