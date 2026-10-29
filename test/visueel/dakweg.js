// Dakweg: een weg die je op het dak van het winkelcentrum begint te slepen ligt erop (het winkelcentrum blijft staan)
const { open, OUT } = require('./helper');
const ev = (p, type, x, y) => p.evaluate(([type, x, y]) => { const c = document.querySelector('canvas'); c.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerId: 1, pointerType: 'mouse', bubbles: true })); }, [type, x, y]);
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods; c.inst = [];
   const m = mods.find(m => /^Winkelcentrum · klein/.test(m.name)); c.inst.push({ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
   S.orbit.target.set(0, 6, 0); S.orbit.theta = 0; S.orbit.phi = 0.2; S.orbit.dist = 230; S.applyOrbit(); S.selectTool('vweg'); });
 await p.waitForTimeout(800);
 const scr = (q, r, y) => p.evaluate(([q, r, y]) => { const S = window.__SC(), w = S.cellToWorld(q, r), v = new (S.camera.position.constructor)(w.x, y, w.z).project(S.camera); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; }, [q, r, y]);
 const top = await p.evaluate(() => { const S = window.__SC(), I = S.getCells().inst[0]; return S.gH(0, 0) + (I.lv || 0) * 3 + window.__SC().MV2.LV_H * 0 ; });
 const A = await scr(1, 0, 6), B = await scr(9, 0, 6);
 await ev(p, 'pointermove', ...A); await ev(p, 'pointerdown', ...A);
 for (let i = 1; i <= 12; i++) { await ev(p, 'pointermove', A[0] + (B[0] - A[0]) * i / 12, A[1] + (B[1] - A[1]) * i / 12); await p.waitForTimeout(120); }
 await ev(p, 'pointerup', ...B); await p.waitForTimeout(1000);
 const r = await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); return { inst: (c.inst || []).map(I => I.m.name), wegen: (c.paths || []).map(p => { const pr = S.pathProf(p); return { dak: !!p.dak, p: p.p.map(a => a.map(Math.round)), h: [pr.h[0], pr.h[Math.floor(pr.h.length / 2)], pr.h[pr.h.length - 1]].map(v => +v.toFixed(2)) }; }) }; });
 console.log(JSON.stringify(r));
 await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(30, 4, 0); S.orbit.theta = 2.4; S.orbit.phi = 1.0; S.orbit.dist = 90; S.applyOrbit(); });
 await p.waitForTimeout(2500); await p.screenshot({ path: OUT + '/dakweg.png' });
 await b.close(); })();
