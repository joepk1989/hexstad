const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.keyboard.press('Space'); await p.waitForTimeout(800);
 // richt op een woning van ~45 m afstand, iets boven de grond
 const doel = await p.evaluate(() => { const S = window.__SC(), I = S.getCells().inst.find(I => /Rijhuis|Stadswoning|Herenhuis/.test(I.m.name) && !I.lv); const w = S.cellToWorld(I.q, I.r); const f = S.flyCam;
  f.x = w.x + 40; f.z = w.z + 22; f.y = 9; const dx = w.x - f.x, dy = 4 - f.y, dz = w.z - f.z; f.yaw = Math.atan2(-dx, -dz); f.pitch = Math.atan2(dy, Math.hypot(dx, dz)) + 0.07; f.vx = f.vy = f.vz = 0; return { name: I.m.name, w }; });
 console.log('doel', JSON.stringify(doel));
 await p.waitForTimeout(1500);
 await p.screenshot({ path: OUT + '/kogel0.png', timeout: 120000 });
 const r = [];
 for (let s = 0; s < 4; s++) {
  await p.evaluate(h => { const S = window.__SC(); S.kogels.fire(h); }, s === 3);
  r.push(await p.evaluate(() => { const S = window.__SC(); for (let i = 0; i < 60; i++) { S.kogels.update(1 / 60); S.collapse.update(1 / 60); S.cars.update(1 / 60); } const st = S.collapse.stats(); return { kogels: S.kogels.list.length, k: S.kogels.list.map(o => [+o.x.toFixed(1), +o.y.toFixed(1), +o.z.toFixed(1), o.hits]), modules: st.modules, standing: st.standing, debris: st.debris }; }));
  await p.evaluate(() => new Promise(r => setTimeout(r, 650)));
 }
 console.log(JSON.stringify(r));
 await p.waitForTimeout(800); await p.screenshot({ path: OUT + '/kogel1.png', timeout: 120000 });
 // auto en mensen raken: kogel recht op een auto / persoon
 const raak = await p.evaluate(() => { const S = window.__SC(), out = {}; const c = S.cars.list.find(c => !c.crash && c.path); if (c) { const before = c.hp ?? 100; for (let i = 0; i < 3; i++) S.cars.ballHit(c.x, (c.sy ?? 0.25) + 0.5, c.z, 40, -5, 0, 0.45); out.auto = { hp0: before, hp: Math.round(c.hp), crash: !!c.crash, fly: !!c.fly }; }
  const a = S.people.agents.find(a => a.state === 'walk'); if (a) { const h = S.cars.ballHit(a.x, a.y + 1, a.z, 40, -5, 0, 0.45); out.mens = { geraakt: !!h, state: a.state }; } return out; });
 console.log('raak', JSON.stringify(raak));
 await b.close(); })();
