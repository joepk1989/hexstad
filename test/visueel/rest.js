const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 700, height: 450 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => { const S = window.__SC(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const by = {}; let tot = 0;
    S.scene.traverse(o => { if ((o.isMesh || o.isLine || o.isPoints) && o.visible) { let a = o, chain = []; while (a && a !== S.scene) { if (!a.visible) { chain = null; break; } a = a.parent; } if (!chain) return; let top = o; while (top.parent && top.parent !== S.scene) top = top.parent; const k = (top.name || top.type) + (o.isInstancedMesh ? ' [inst]' : ''); by[k] = (by[k] || 0) + 1; tot++; } });
    return { calls: S.renderer.info.render.calls, tot, top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 14) }; });
  console.log(JSON.stringify(r)); await b.close();
})();
