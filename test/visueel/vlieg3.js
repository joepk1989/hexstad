const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message)); p.on('console', m => console.log('LOG', m.text().slice(0, 200)));
 await p.evaluate(() => { const S = window.__SC(); window.__t = []; const orig = S.flyCam; });
 console.log('voor', await p.evaluate(() => 1));
 await p.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true })); });
 console.log('na toets', await Promise.race([p.evaluate(() => window.__SC().flyCam.on), new Promise(r => setTimeout(() => r('HANG'), 5000))]));
 await b.close(); })();
