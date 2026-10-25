const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => { const S = window.__SC(); const out = []; S.scene.traverse(o => { if (o.isInstancedMesh && o.geometry.type === 'CircleGeometry' && o.material.polygonOffsetFactor === -3) out.push({ n: o.count, ic: o.instanceColor && Array.from(o.instanceColor.array.slice(0, 6)), col: o.material.color.getHexString() }); }); return JSON.stringify(out); }));
  await b.close();
})();
