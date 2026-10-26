const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 400, height: 300 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const R = (f, arg, ms = 60000) => Promise.race([p.evaluate(f, arg), new Promise(r => setTimeout(() => r('HANG'), ms))]);
 await p.keyboard.press('Space'); await p.waitForTimeout(1500);
 for (const [y, pitch] of [[133, -0.4], [60, -0.4], [30, -0.4], [14, -0.4], [14, -0.12]]) {
  console.log(y, pitch, await R((a) => { const S = window.__SC(), f = S.flyCam; f.x = 40; f.z = 100; f.y = a[0]; f.yaw = 0.3; f.pitch = a[1]; return new Promise(res => { requestAnimationFrame(() => requestAnimationFrame(() => { const t0 = performance.now(); S.renderer.render(S.scene, S.camera); res(Math.round(performance.now() - t0)); })); }); }, [y, pitch], 60000));
 }
 await b.close(); })();
