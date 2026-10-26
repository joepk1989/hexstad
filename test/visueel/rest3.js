const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 700, height: 450 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => { const S = window.__SC(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const by = {};
    S.scene.traverse(o => { if (!(o.isMesh && o.visible)) return; let a = o; while (a && a !== S.scene) { if (!a.visible) return; a = a.parent; } let top = o; while (top.parent && top.parent !== S.scene) top = top.parent; if (top.name === 'modBatch') return; const k = top.type + ' ' + (top.name || '') + ' ud:' + Object.keys(top.userData).join(',') + ' | ' + o.geometry.type + (o.isInstancedMesh ? ' inst' + o.count : '') + (o.castShadow ? ' sh' : '') + ' mat:' + o.material.type; by[k] = (by[k] || 0) + 1; });
    return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12); });
  console.log(JSON.stringify(r, null, 0)); await b.close();
})();
