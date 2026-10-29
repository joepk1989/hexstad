// Sloopkogel recht door een gebouw: hoeveel stukken los en hoe ver komt hij
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(400);
 const out = [];
 for (const NM of ['Stadswoning · wit', 'Flat · galerij', 'Winkelcentrum · klein']) {
  out.push(await p.evaluate(NM => { const S = window.__SC(), c = S.getCells(); c.inst = []; const m = window.__mods.find(m => m.name.startsWith(NM)); c.inst.push({ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll(); S.collapse.reset();
   const w = S.cellToWorld(0, 0), f = S.flyCam; f.on = true; S.camera.position.set(w.x + 35, 2.2, w.z + 1); S.camera.lookAt(w.x - 10, 2.2, w.z + 1); S.camera.updateMatrixWorld(); S.kogels.fire(true);
   const o = S.kogels.list[S.kogels.list.length - 1]; let minx = 1e9;
   for (let i = 0; i < 240; i++) { S.kogels.update(1 / 60); S.collapse.update(1 / 60); if (S.kogels.list.includes(o)) minx = Math.min(minx, o.x - w.x); }
   const B = S.collapse.dbg(); f.on = false; return { NM, los: B ? B.P.filter(q => q.st !== 'stand').length : 0, stukken: B ? B.P.length : 0, verst: +minx.toFixed(1), hits: o.hits }; }, NM));
 }
 await p.evaluate(() => { const S = window.__SC(), w = S.cellToWorld(0, 0); S.orbit.target.set(w.x, 3, w.z); S.orbit.theta = 1.1; S.orbit.phi = 1.15; S.orbit.dist = 55; S.applyOrbit(); });
 await p.waitForTimeout(1200); await p.screenshot({ path: OUT + '/sloopkogel.png' });
 console.log(JSON.stringify(out, null, 0)); await b.close(); })();
