// Kogels met Instorten UIT (standaard in de beta): de kogel moet op de gevel stuiteren, niet erdoorheen vliegen.
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 const uit = process.argv[2] !== 'aan';
 await p.evaluate(u => window.__SC().collapse.setOn(!u), uit);
 await p.keyboard.press('Space'); await p.waitForTimeout(800);
 const res = [];
 const huizen = await p.evaluate(() => { const S = window.__SC(); return S.getCells().inst.filter(I => /Rijhuis|Stadswoning|Herenhuis|Kantoor|Appartement/.test(I.m.name) && !I.lv).slice(0, 6).map(I => { const w = S.cellToWorld(I.q, I.r); return { name: I.m.name, x: w.x, z: w.z }; }); });
 for (const h of huizen) for (const zwaar of [false, true]) {
  res.push(await p.evaluate(({ h, zwaar }) => { const S = window.__SC(), f = S.flyCam;
   S.kogels.clear();
   f.x = h.x + 30; f.z = h.z + 12; f.y = 4; const dx = h.x - f.x, dy = 3 - f.y, dz = h.z - f.z; f.yaw = Math.atan2(-dx, -dz); f.pitch = Math.atan2(dy, Math.hypot(dx, dz)) + 0.03; f.vx = f.vy = f.vz = 0;
   S.camera.position.set(f.x, f.y, f.z); S.camera.lookAt(h.x, 3, h.z); S.camera.updateMatrixWorld();
   S.kogels.fire(zwaar); const o = S.kogels.list.at(-1); if (!o) return { h: h.name, fout: 'geen kogel' };
   const d0 = Math.hypot(o.x - h.x, o.z - h.z); let dmin = d0;
   for (let i = 0; i < 120; i++) { S.kogels.update(1 / 60); dmin = Math.min(dmin, Math.hypot(o.x - h.x, o.z - h.z)); }
   // voorbij het midden van het gebouw = erdoorheen; de lijn camera→gebouw doorgetrokken
   const ux = (h.x - f.x) / Math.hypot(h.x - f.x, h.z - f.z), uz = (h.z - f.z) / Math.hypot(h.x - f.x, h.z - f.z);
   const voorbij = (o.x - h.x) * ux + (o.z - h.z) * uz;
   return { h: h.name, zwaar, dmin: +dmin.toFixed(1), voorbij: +voorbij.toFixed(1), y: +o.y.toFixed(1) };
  }, { h, zwaar }));
  await p.evaluate(() => new Promise(r => setTimeout(r, 700)));
 }
 console.log(JSON.stringify(res, null, 0));
 const door = res.filter(r => !r.zwaar && r.voorbij > 2).length;
 console.log('Instorten ' + (uit ? 'uit' : 'aan') + ': ' + door + ' van ' + res.filter(r => !r.zwaar).length + ' lichte kogels door het gebouw heen');
 await p.screenshot({ path: OUT + '/kogel_uit.png', timeout: 120000 });
 await b.close(); })();
