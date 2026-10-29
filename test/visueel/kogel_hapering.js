// Cameramodus: veel kogels op verschillende gebouwen; hoe lang duurt het langste beeld en waar zit de tijd?
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.keyboard.press('Space'); await p.waitForTimeout(800);
 const r = await p.evaluate(async () => { const S = window.__SC(), C = S.collapse, K = S.kogels, f = S.flyCam;
   // meet per functie
   const T = {}, wrap = (o, k, nm) => { const fn = o[k]; o[k] = function (...a) { const t0 = performance.now(); try { return fn.apply(this, a); } finally { const d = performance.now() - t0; const e = T[nm] || (T[nm] = { n: 0, tot: 0, max: 0 }); e.n++; e.tot += d; e.max = Math.max(e.max, d); } }; };
   wrap(C, 'shoot', 'shoot'); wrap(C, 'update', 'collapse.update'); wrap(K, 'update', 'kogels.update');
   const targets = S.getCells().inst.filter(I => I.m && !I.lv && true).slice(0, 12); if (!targets.length) return { geen: S.getCells().inst.slice(0, 5).map(I => I.m && I.m.name) };
   const frames = []; let worst = { ms: 0 };
   for (let t = 0; t < targets.length; t++) { const I = targets[t], w = S.cellToWorld(I.q, I.r);
     f.x = w.x + 30; f.z = w.z + 18; f.y = 6; const dx = w.x - f.x, dy = 3 - f.y, dz = w.z - f.z; f.yaw = Math.atan2(-dx, -dz); f.pitch = Math.atan2(dy, Math.hypot(dx, dz)) + 0.04;
     S.camera.position.set(f.x, f.y, f.z); S.camera.rotation.set(f.pitch, f.yaw, 0, 'YXZ'); S.camera.updateMatrixWorld();
     for (let s = 0; s < 3; s++) { K.fire(s === 2); await new Promise(r => setTimeout(r, 650));
       for (let i = 0; i < 90; i++) { const t0 = performance.now(); K.update(1 / 60); C.update(1 / 60); const ms = performance.now() - t0; frames.push(ms); if (ms > worst.ms) worst = { ms, t, s, i, name: I.m.name }; } } }
   frames.sort((a, b) => b - a);
   return { PT: window.__collPT, T, worst, top: frames.slice(0, 8).map(v => +v.toFixed(1)), p50: +frames[frames.length >> 1].toFixed(2), n: frames.length, stats: C.stats() }; });
 console.log(JSON.stringify(r, null, 1));
 await b.close(); })();
