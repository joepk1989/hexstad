// Meet per stad: tekenopdrachten, driehoeken, objecten, en CPU-tijd (ms) per onderdeel per beeld.
// Headless draait op software-rendering: render-ms is dus een maat voor werk, geen echte videokaarttijd.
const { open } = require('./helper');
const steden = (process.env.STEDEN || 'start,gen:ring:5,gen:honingraat:7').split(',').map(s => s.replace(/_/g, ':'));
(async () => {
  const { b, p } = await open({ width: 800, height: 500 });
  const uit = {};
  for (const act of steden) {
    await p.evaluate(a => { const S = window.__SC(); S.doAct(a); S.cars.setReckless(true); }, act); await p.waitForTimeout(2500);
    const r = await p.evaluate(async () => {
      const S = window.__SC(), T = {}; const wrap = (o, k, n) => { const f = o[k]; o[k] = function () { const t = performance.now(); const x = f.apply(this, arguments); T[n] = (T[n] || 0) + performance.now() - t; return x; }; };
      wrap(S.cars, 'update', 'autos'); wrap(S.people, 'update', 'mensen'); wrap(S.renderer, 'render', 'render(cpu)');
      let objs = 0, meshes = 0, inst = 0, vis = 0; S.scene.traverse(o => { objs++; if (o.isMesh) { meshes++; if (o.visible) vis++; } if (o.isInstancedMesh) inst++; });
      const F = 90, t0 = performance.now();
      await new Promise(res => { let n = 0; const f = () => { if (++n >= F) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
      const tot = performance.now() - t0, i = S.renderer.info;
      const out = { frames: F, ms_per_frame: +(tot / F).toFixed(1), calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, texs: i.memory.textures, objs, meshes, visMeshes: vis, instMeshes: inst, cars: S.cars.list.length, people: S.people.agents.length };
      for (const k in T) out[k] = +(T[k] / F).toFixed(2);
      return out;
    });
    uit[act] = r; console.log(act, JSON.stringify(r));
  }
  await b.close();
})();
