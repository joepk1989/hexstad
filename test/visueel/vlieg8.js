const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 400, height: 300 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => { window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; f(); });
 const q = async (l) => { const t0 = Date.now(); const r = await Promise.race([p.evaluate(() => window.__fr), new Promise(r => setTimeout(() => r('HANG'), 15000))]); console.log(l, r, Date.now() - t0); };
 await p.keyboard.press('Space');
 await p.evaluate(() => { const S = window.__SC(), f = S.flyCam; f.x = 40; f.z = 100; f.y = 14; f.yaw = 0.3; f.pitch = -0.12; });
 for (let i = 0; i < 8; i++) { await p.waitForTimeout(1000); await q('t' + i); }
 await b.close(); })();
