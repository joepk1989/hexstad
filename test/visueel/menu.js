const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1200, height: 700 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.click('#menuBtn'); await p.waitForTimeout(1500);
 console.log(await p.evaluate(() => { const s = document.getElementById('sheet'); const c = s.querySelector('.sheet-card'); const r = c.getBoundingClientRect(); return [s.hidden, getComputedStyle(s).display, getComputedStyle(s).visibility, getComputedStyle(c).opacity, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
 await p.screenshot({ path: OUT + '/menu.png', timeout: 120000 });
 await b.close(); })();
