// Beeldreeks van één persoon van opzij: gewoon lopen en rennen (chaos)
const { open, OUT } = require('./helper');
const { execSync } = require('child_process');
(async () => { const { b, p } = await open({ width: 360, height: 360 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { document.querySelectorAll('.hud-top,#dockM,#dockL,#modeBtn,#layerPick,.perf-fps,#perf,.city-arrow,#toast').forEach(e => e.style.visibility = 'hidden'); });
 const naam = process.env.NAAM || 'loop';
 for (const rek of (process.env.MODI || 'false,true').split(',').map(s => s === 'true')) {
  await p.evaluate(rek => { const S = window.__SC(); S.cars.setReckless(rek); S.cars.setOn(false); window.__noLod = true; for (let i = 0; i < 90; i++) S.people.update(1 / 60);
   const A = S.people.agents.filter(a => a.state === 'walk' && !a.kid && a.spd > (rek ? 2 : 0.8)); window.__A = A[0]; }, rek);
  const files = [];
  for (let k = 0; k < 8; k++) {
   await p.evaluate(() => { const S = window.__SC(), a = window.__A; for (let i = 0; i < 3; i++) S.people.update(1 / 60); S.orbit.target.set(a.x, a.y + 0.9, a.z); S.orbit.dist = 3.4; S.orbit.phi = 1.5; S.orbit.theta = a.heading + Math.PI / 2; S.applyOrbit(); S.camera.near = 0.1; S.camera.updateProjectionMatrix(); });
   await p.waitForTimeout(150);
   const f = OUT + `/${naam}_${rek ? 'ren' : 'loop'}_${k}.png`; await p.screenshot({ path: f, timeout: 120000 }); files.push(f);
  }
  execSync(`ffmpeg -y -v error ${files.map(f => '-i ' + f).join(' ')} -filter_complex "${files.map((_, i) => `[${i}:v]scale=180:180[v${i}]`).join(';')};${files.map((_, i) => `[v${i}]`).join('')}hstack=inputs=${files.length}" ${OUT}/${naam}_${rek ? 'ren' : 'loop'}_strip.png`);
 }
 await b.close(); })();
