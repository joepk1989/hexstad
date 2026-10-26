const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 800, height: 500 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const list = () => p.evaluate(() => { const S = window.__SC(), out = []; S.scene.traverse(o => { if (!o.visible) return; let v = true, q = o.parent; while (q) { if (!q.visible) { v = false; break; } q = q.parent; } if (!v) return; const n = (o.name || '') + '|' + (o.parent && o.parent.name || ''); if (/ghost|preview|hover|aim|sel|brush|ring/i.test(n) || (o.material && o.material.transparent && o.material.opacity < 0.7 && !o.isInstancedMesh)) out.push(n + ':' + o.type + ':' + (o.material ? (+o.material.opacity).toFixed(2) : '')); }); return out; });
 for (const tool of ['woning', 'module', 'vweg', 'tophoog']) {
  await p.evaluate(t => window.__SC().selectTool(t), tool); await p.waitForTimeout(500);
  await p.mouse.move(600, 420); await p.waitForTimeout(800); await p.mouse.move(620, 430); await p.waitForTimeout(800);
  const voor = await list();
  await p.keyboard.press('Space'); await p.waitForTimeout(1200);
  await p.mouse.move(500, 380); await p.waitForTimeout(800); await p.mouse.move(520, 390); await p.waitForTimeout(1200);
  const tijdens = await list();
  console.log(tool, '\n voor:', JSON.stringify(voor), '\n tijdens:', JSON.stringify(tijdens));
  if (tool === 'woning') await p.screenshot({ path: OUT + '/camswitch.png', timeout: 120000 });
  await p.keyboard.press('Space'); await p.waitForTimeout(1200);
 }
 await b.close(); })();
