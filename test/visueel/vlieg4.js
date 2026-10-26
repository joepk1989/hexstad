const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message)); p.on('crash', () => console.log('CRASH'));
 await p.evaluate(() => { window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; f(); });
 const q = async (l) => console.log(l, await Promise.race([p.evaluate(() => [window.__fr, window.__SC().flyCam.on, window.__SC().flyCam.y]), new Promise(r => setTimeout(() => r('HANG'), 6000))]));
 await q('start'); await p.keyboard.press('Space'); await q('na space'); await p.waitForTimeout(1000); await q('1s later');
 await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await q('W'); await p.keyboard.up('KeyW');
 await b.close(); })();
