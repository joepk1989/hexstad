const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const tag = process.argv[2] || 'x';
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Winkelcentrum · klein')))); await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(700);
 await p.evaluate(() => { window.__MME.lv = 1; }); await p.keyboard.press('Digit4'); await p.waitForTimeout(500);
 // bovenkant trap bij (-6.82, -3.375); kijk er vanaf de galerij naar, iets erachter en hoger
 for (const [k, x, z, yaw, pitch, y] of [['1', -6.8, -3.4, 0, -1.56, 5.2], ['2', -4.3, -5.4, Math.PI * 0.62, -0.7, 3]]) {
  await p.evaluate(([x, z, yaw, pitch, y]) => { const w = window.__MME.walk; w.x = x; w.z = z; w.y = y; w.yaw = yaw; w.pitch = pitch; }, [x, z, yaw, pitch, y]); await p.waitForTimeout(800);
  await p.screenshot({ path: OUT + `/trapeind_loop${k}_${tag}.png`, clip: { x: 0, y: 64, width: 980, height: 736 }, timeout: 120000 }); }
 await b.close(); })();
