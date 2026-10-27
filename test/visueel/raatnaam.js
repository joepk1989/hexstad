const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { document.getElementById('sheet').hidden = false; }); await p.waitForTimeout(400);
 console.log(await p.evaluate(() => document.querySelector('[data-act=sketch]').innerText));
 await p.screenshot({ path: OUT + '/raat_menu.png', timeout: 120000 });
 await p.evaluate(() => document.querySelector('[data-act=sketch]').click()); await p.waitForTimeout(1500);
 await p.screenshot({ path: OUT + '/raat_app.png', clip: { x: 960, y: 60, width: 320, height: 200 }, timeout: 120000 });
 await b.close(); })();
