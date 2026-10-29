// Kogels op grote gebouwen (7 vakken): langste beeld
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 await p.evaluate(() => { const S = window.__SC(), c = S.getCells(); c.inst = [];
   const add = (nm, q, r) => { const m = window.__mods.find(m => m.name.startsWith(nm)); c.inst.push({ mid: m.id, m: S.instData(m, false), q, r, rot: 0 }); };
   add('Winkelcentrum · klein', 0, 0); add('Sporthal', 4, -2); add('Flat · galerij', -4, 2); S.rebuildAll(); });
 await p.keyboard.press('Space'); await p.waitForTimeout(800);
 const r = await p.evaluate(async () => { const S = window.__SC(), C = S.collapse, K = S.kogels, f = S.flyCam, out = [];
   for (const [q, r] of [[0, 0], [4, -2], [-4, 2]]) { const w = S.cellToWorld(q, r); let worst = 0, tot = 0;
     for (let s = 0; s < 4; s++) { f.x = w.x + 26; f.z = w.z + 14 + s * 3; f.y = 4 + s; const dx = w.x - f.x, dy = 2.5 - f.y, dz = w.z - f.z; f.yaw = Math.atan2(-dx, -dz); f.pitch = Math.atan2(dy, Math.hypot(dx, dz)); S.camera.position.set(f.x, f.y, f.z); S.camera.rotation.set(f.pitch, f.yaw, 0, 'YXZ'); S.camera.updateMatrixWorld();
       K.fire(s === 3); for (let i = 0; i < 150; i++) { const t0 = performance.now(); K.update(1 / 60); C.update(1 / 60); const ms = performance.now() - t0; worst = Math.max(worst, ms); tot += ms; } }
     out.push({ q, r, langste: Math.round(worst), totaal: Math.round(tot), stukken: C.stats().pieces }); }
   return out; });
 console.log(JSON.stringify(r)); await b.close(); })();
