const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 800, height: 500 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const cnt = () => p.evaluate(() => { const c = window.__SC().getCells(); return c.size + '/' + (c.inst || []).length + '/' + (c.paths || []).length; });
 console.log('voor', await cnt());
 await p.keyboard.press('Space'); await p.waitForTimeout(1500);
 for (const [x, y, btn] of [[400, 300, 'left'], [420, 320, 'right'], [380, 280, 'left']]) { await p.mouse.click(x, y, { button: btn }); await p.waitForTimeout(800); }
 await p.keyboard.press('Digit3'); await p.mouse.click(400, 300); await p.waitForTimeout(800);
 console.log('in cameramodus', await cnt(), await p.evaluate(() => window.__SC().flyCam.on));
 await b.close(); })();
