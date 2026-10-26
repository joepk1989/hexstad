const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  await p.evaluate(() => window.__SC().doAct('gen:ring:5')); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => { const S = window.__SC(); S.modBatch().on.v = false; S.modBatch().rebuild(); const mats = new Map(); let n = 0; S.scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.geometry.attributes.position && o.parent && o.parent.userData && o.parent.userData.inst) { n++; const m = o.material; const k = m.uuid; mats.set(k, m); } });
    const by = {}; for (const m of mats.values()) { const key = (m.type) + ' ' + (m.color ? m.color.getHexString() : '') + (m.map ? ' map' : '') + (m.transparent ? ' tr' : ''); by[key] = (by[key] || 0) + 1; }
    return { meshes: n, materials: mats.size, top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8) }; });
  console.log(JSON.stringify(r)); await b.close();
})();
