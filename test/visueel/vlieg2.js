const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message)); p.on('crash', () => console.log('CRASH'));
 await p.keyboard.press('Space'); await p.waitForTimeout(500);
 for (let i = 0; i < 6; i++) { const t0 = Date.now(); await p.evaluate(() => { const f = window.__SC().flyCam; f.x += 40; f.z += 20; }); await p.waitForTimeout(400); console.log(i, Date.now() - t0, JSON.stringify(await p.evaluate(() => { const f = window.__SC().flyCam; return [f.on, +f.x.toFixed(0), +f.y.toFixed(0)]; }))); }
 await b.close(); })();
