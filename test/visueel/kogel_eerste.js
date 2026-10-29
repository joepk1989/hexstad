// Eerste klap op een gebouw in de cameramodus: met voorbereiden (richten, even wachten) tegen zonder
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(300);
 await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); c.inst = []; const add = (nm, q, r) => { const m = window.__mods.find(m => m.name.startsWith(nm)); c.inst.push({ mid: m.id, m: S.instData(m, false), q, r, rot: 0 }); };
   add('Winkelcentrum · klein', 0, 0); add('Winkelcentrum · klein', 6, -3); S.rebuildAll(); });
 await p.keyboard.press('Space'); await p.waitForTimeout(600);
 const shot = (q, r, wait) => p.evaluate(async ([q, r, wait]) => { const S = window.__SC(), C = S.collapse, K = S.kogels, f = S.flyCam, w = S.cellToWorld(q, r);
   f.x = w.x + 30; f.z = w.z + 6; f.y = 3; const dx = w.x - f.x, dy = 2 - f.y, dz = w.z - f.z; f.yaw = Math.atan2(-dx, -dz); f.pitch = Math.atan2(dy, Math.hypot(dx, dz)); f.vx = f.vy = f.vz = 0;
   await new Promise(r => setTimeout(r, wait));
   K.fire(false); let worst = 0; for (let i = 0; i < 120; i++) { const t0 = performance.now(); K.update(1 / 60); C.update(1 / 60); worst = Math.max(worst, performance.now() - t0); }
   return { langste: Math.round(worst), geraakt: C.stats().modules }; }, [q, r, wait]);
 console.log('zonder voorbereiden (meteen schieten)', JSON.stringify(await shot(6, -3, 0)));
 console.log('met voorbereiden (1,5 s gericht)     ', JSON.stringify(await shot(0, 0, 1500)));
 await b.close(); })();
