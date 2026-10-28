// Slopen mag niet knipperen: in elk beeld staat elk kapot gebouw er precies één keer (losse stukken, een set per gebouw of de
// gezamenlijke set; nooit geen van drieën en nooit twee tegelijk). Ook bij twee kapotte gebouwen en het samenvoegen daarna.
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.keyboard.press('Space'); await p.waitForTimeout(800);
 const targets = await p.evaluate(() => { const S = window.__SC(); return S.getCells().inst.filter(I => /Rijhuis|Stadswoning|Herenhuis/.test(I.m.name) && !I.lv).slice(0, 2).map(I => { const w = S.cellToWorld(I.q, I.r); return [w.x, w.z, I.m.name]; }); });
 const aim = t => p.evaluate(([x, z]) => { const S = window.__SC(), f = S.flyCam; f.x = x + 40; f.z = z + 22; f.y = 9; const dx = x - f.x, dy = 4 - f.y, dz = z - f.z; f.yaw = Math.atan2(-dx, -dz); f.pitch = Math.atan2(dy, Math.hypot(dx, dz)) + 0.07; f.vx = f.vy = f.vz = 0; }, t);
 const run = (steps) => p.evaluate(steps => { const S = window.__SC(); let gap = 0, dbl = 0, n = 0, merged = 0;
    for (let i = 0; i < steps; i++) { S.kogels.update(1 / 60); S.collapse.update(1 / 60); n++;
      const st = S.collapse.stats(); if (!st.modules) continue; if (st.inG >= 2) merged = 1;
      // per gebouw: niet samengevoegd → alle staande stukken zichtbaar; samengevoegd → geen losse stukken zichtbaar en een set (eigen of gezamenlijk)
      if (st.baked < st.modules && st.liveMeshes === 0 && st.standing > 0) gap++;
      if (st.baked > 0 && st.gm === 0) gap++;
      if (st.dup) dbl++; }
    return { gap, dbl, n, merged }; }, steps);
 let T = { gap: 0, dbl: 0, n: 0, merged: 0 }; const add = r => { T.gap += r.gap; T.dbl += r.dbl; T.n += r.n; T.merged = Math.max(T.merged, r.merged); };
 console.log('doelen', JSON.stringify(targets.map(t => t[2])));
 await aim(targets[0]); await p.waitForTimeout(600);
 for (let s = 0; s < 4; s++) { await p.evaluate(h => window.__SC().kogels.fire(h), s === 3); add(await run(200)); }
 await aim(targets[1]); await p.waitForTimeout(600);
 for (let s = 0; s < 3; s++) { await p.evaluate(h => window.__SC().kogels.fire(h), false); add(await run(200)); }
 add(await run(300));   // stil: samenvoegen tot één set
 const st1 = await p.evaluate(() => window.__SC().collapse.stats());
 await aim(targets[0]); await p.waitForTimeout(600);
 for (let s = 0; s < 3; s++) { await p.evaluate(h => window.__SC().kogels.fire(h), s === 2); add(await run(200)); }
 add(await run(300));
 const st2 = await p.evaluate(() => window.__SC().collapse.stats());
 console.log('beelden', T.n, '· weg', T.gap, '· dubbel', T.dbl, '· samengevoegd geweest', !!T.merged);
 console.log('na stil 1:', JSON.stringify({ modules: st1.modules, baked: st1.baked, inG: st1.inG, gGlobal: st1.gGlobal, gm: st1.gm, live: st1.liveMeshes }));
 console.log('na stil 2:', JSON.stringify({ modules: st2.modules, baked: st2.baked, inG: st2.inG, gGlobal: st2.gGlobal, gm: st2.gm, live: st2.liveMeshes }));
 await b.close(); })();
