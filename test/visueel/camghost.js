const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 800, height: 500 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.keyboard.press('Space'); await p.waitForTimeout(1500);
 await p.evaluate(() => { const f = window.__SC().flyCam; f.x = 120; f.z = 120; f.y = 20; f.yaw = 0.8; f.pitch = -0.5; });   // boven lege grond
 for (let i = 0; i < 6; i++) { await p.mouse.move(300 + i * 40, 200 + i * 20); await p.waitForTimeout(400); }
 const vis = await p.evaluate(() => { const S = window.__SC(), out = []; S.scene.traverse(o => { if (o.visible && o.material && (o.material.transparent) && o.parent && o.parent.visible && /ghost|preview/i.test((o.name || '') + (o.parent.name || ''))) out.push(o.name || o.parent.name); }); return out; });
 console.log('zichtbare voorbeelden', JSON.stringify(vis));
 await p.screenshot({ path: OUT + '/camghost.png', timeout: 120000 });
 await b.close(); })();
