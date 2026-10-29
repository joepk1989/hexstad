// Terreinstap: ophogen/afgraven klikt vast op 3 m (en 1,5 m)
const { open, OUT } = require('./helper');
const ev = (p, type, x, y, button = 0) => p.evaluate(([type, x, y, button]) => { const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, pointerType: 'mouse', bubbles: true })); }, [type, x, y, button]);
(async () => { const { b, p } = await open({ width: 1000, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 0, 0); S.orbit.theta = 0.6; S.orbit.phi = 0.8; S.orbit.dist = 120; S.applyOrbit(); S.selectTool('tophoog'); });
 const hs = () => p.evaluate(() => { const S = window.__SC(), o = {}; for (const [k, v] of Object.entries(S.getCells().terr || {})) o[v] = (o[v] || 0) + 1; return o; });
 const hold = async (ms, btn = 0) => { await ev(p, 'pointermove', 500, 350); await ev(p, 'pointerdown', 500, 350, btn); await p.waitForTimeout(ms); await ev(p, 'pointerup', 500, 350, btn); await p.waitForTimeout(400); };
 await hold(50); console.log('klik ophogen', JSON.stringify(await hs()));
 await hold(2500); console.log('2,5 s ophogen', JSON.stringify(await hs()));
 await hold(50, 2); console.log('klik rechts (omlaag)', JSON.stringify(await hs()));
 await p.screenshot({ path: OUT + '/terreinstap.png' });
 await b.close(); })();
