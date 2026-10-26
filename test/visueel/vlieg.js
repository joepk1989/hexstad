const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 560 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.waitForTimeout(500);
 await p.keyboard.press('Space'); await p.waitForTimeout(300);
 console.log('aan', await p.evaluate(() => window.__SC().flyCam.on));
 // pointerlock werkt headless niet altijd: pointerlockchange kan de modus meteen beëindigen
 const on = await p.evaluate(() => window.__SC().flyCam.on);
 if (!on) { await p.evaluate(() => window.__SC().flyCam.on = false); }
 await p.keyboard.down('KeyW'); await p.keyboard.down('Shift'); await p.waitForTimeout(1500); await p.keyboard.up('KeyW'); await p.keyboard.up('Shift');
 await p.evaluate(() => { const f = window.__SC().flyCam; f.pitch = -0.25; f.yaw += 0.6; });
 await p.keyboard.down('KeyQ'); await p.waitForTimeout(900); await p.keyboard.up('KeyQ'); await p.waitForTimeout(400);
 console.log(JSON.stringify(await p.evaluate(() => { const f = window.__SC().flyCam; return { on: f.on, x: +f.x.toFixed(0), y: +f.y.toFixed(1), z: +f.z.toFixed(0) }; })));
 await p.screenshot({ path: OUT + '/vlieg1.png' });
 await p.keyboard.press('Space'); await p.waitForTimeout(500);
 console.log(JSON.stringify(await p.evaluate(() => { const S = window.__SC(); return { on: S.flyCam.on, dist: +S.orbit.dist.toFixed(0), phi: +S.orbit.phi.toFixed(2), cam: S.camera.position.toArray().map(v => +v.toFixed(0)) }; })));
 await p.screenshot({ path: OUT + '/vlieg2.png' });
 await b.close(); })();
