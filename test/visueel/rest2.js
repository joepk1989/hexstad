const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 700, height: 450 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const r = await p.evaluate(async () => { const S = window.__SC(); const gs = S.scene.children.filter(o => o.type === 'Group' && !o.name); const kinds = {};
    for (const g of gs) { const vis = []; g.traverse(o => { if (o.isMesh && o.visible) vis.push(o); }); const k = 'ch' + g.children.length + ' vis' + vis.length + ' ud:' + Object.keys(g.userData).join(',') + ' ' + (vis[0] ? vis[0].geometry.type + (vis[0].castShadow ? ' sh' : '') : ''); kinds[k] = (kinds[k] || 0) + 1; }
    return { n: gs.length, kinds: Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 10), children: S.scene.children.length }; });
  console.log(JSON.stringify(r)); await b.close();
})();
