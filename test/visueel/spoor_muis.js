const { open, OUT } = require('./helper');
const tap = (p, x, y, button = 0) => p.evaluate(([x, y, button]) => { const c = document.querySelector('canvas'), o = { clientX: x, clientY: y, button, buttons: 1, pointerId: 1, pointerType: 'mouse', bubbles: true }; c.dispatchEvent(new PointerEvent('pointermove', o)); c.dispatchEvent(new PointerEvent('pointerdown', o)); c.dispatchEvent(new PointerEvent('pointerup', o)); }, [x, y, button]);
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, -200); S.orbit.theta = 0; S.orbit.phi = 0.5; S.orbit.dist = 260; S.applyOrbit(); });
 await p.evaluate(() => [...document.querySelectorAll('.palette .pal-tab')].find(x => /Wegen/.test(x.textContent)).click());
 await p.evaluate(() => document.getElementById('tool-spoor').click()); await p.waitForTimeout(500);
 for (const [x, y] of [[300, 250], [700, 260]]) { await p.mouse.move(x, y); await p.waitForTimeout(200); await tap(p, x, y); await p.waitForTimeout(400); }
 await p.mouse.move(1000, 450); await p.waitForTimeout(500);
 await p.screenshot({ path: OUT + '/spoor_muis1.png' });
 await tap(p, 1000, 450); await p.waitForTimeout(300);
 await tap(p, 1000, 450, 2); await p.waitForTimeout(500);
 console.log(JSON.stringify(await p.evaluate(() => { const S = window.__SC(); return { chain: S.spoor.chain.on, rails: S.getCells().rails.map(r => r.p) }; })));
 await p.screenshot({ path: OUT + '/spoor_muis2.png' });
 await b.close(); })();
