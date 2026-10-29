// Een weg over een bestaand wegdek slepen: het dek blijft, de weg gaat erover
const { open, OUT } = require('./helper');
const ev = (p, type, x, y) => p.evaluate(([type, x, y]) => { const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, pointerType: 'mouse', bubbles: true })); }, [type, x, y]);
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 await p.evaluate(() => { const S = window.__SC(), mods = window.__mods; S.modSel(mods.findIndex(m => /^Wegdek · laag/.test(m.name))); S.selectTool('module'); S.place(-4, 3);
   const w = S.cellToWorld(-4, 3); S.orbit.target.set(w.x, 0, w.z); S.orbit.theta = 0; S.orbit.phi = 0.25; S.orbit.dist = 200; S.applyOrbit(); S.selectTool('vweg'); });
 await p.waitForTimeout(800);
 const scr = (q, r) => p.evaluate(([q, r]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new (S.camera.position.constructor)(w.x, 0, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r]);
 const A = await scr(-9, 3), B = await scr(1, 3);
 await ev(p, 'pointermove', ...A); await ev(p, 'pointerdown', ...A);
 for (let i = 1; i <= 12; i++) { await ev(p, 'pointermove', A[0] + (B[0] - A[0]) * i / 12, A[1] + (B[1] - A[1]) * i / 12); await p.waitForTimeout(120); }
 await ev(p, 'pointerup', ...B); await p.waitForTimeout(800);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); return { inst: (c.inst || []).map(I => I.m.name), wegen: (c.paths || []).map(p => ({ n: p.p.length, max: +Math.max(...S.pathProf(p).h).toFixed(2) })) }; });
 console.log(JSON.stringify(r));
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(-4, 3); S.orbit.target.set(w.x, 2, w.z); S.orbit.theta = 2.6; S.orbit.phi = 1.15; S.orbit.dist = 70; S.applyOrbit(); });
 await p.waitForTimeout(2000); await p.screenshot({ path: OUT + '/wegdek_slepen.png' });
 await b.close(); })();
