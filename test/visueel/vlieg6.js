const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const R = (f, ms = 20000) => Promise.race([p.evaluate(f), new Promise(r => setTimeout(() => r('HANG'), ms))]);
 await p.keyboard.press('Space'); await p.waitForTimeout(1500);
 console.log(await R(() => { const S = window.__SC(), f = S.flyCam; f.x = 40; f.z = 100; f.y = 14; f.yaw = 0.3; f.pitch = -0.12; const t0 = performance.now(); const r = S.pick(300, 200); return { pick: performance.now() - t0, got: !!r }; }));
 await p.waitForTimeout(2000);
 console.log(await R(() => { const S = window.__SC(); const t0 = performance.now(); S.renderer.render(S.scene, S.camera); return { render: performance.now() - t0 }; }, 30000));
 await b.close(); })();
