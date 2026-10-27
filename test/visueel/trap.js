const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 640 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
 const r = await p.evaluate(() => { const S = window.__SC(), LB = window.__libBuilder;
  const b = LB('Test · trappen · 3L', 'Wonen'); for (let li = 0; li < 3; li++) b.hex(li, 0, 0, 8.99, 'concrete');
  const m = b.m, vAt = (x, z) => { const ts = 2.25, fi = x / (ts * Math.sqrt(3) / 2), fj = z / ts - fi / 2; return [Math.round(fi), Math.round(fj)]; };
  m.lv[0].s.push({ a: vAt(-3, -1.7), d: 0, n: 3, w: 1.95, k: 'stair', off: 1.95 / 2 });
  m.lv[1].s.push({ a: vAt(-1, -6.4), d: 0, n: 2, w: 1.95, k: 'u', side: 1, off: 1.95 / 2 });
  window.__TM = m; const c = S.getCells(); c.inst = c.inst || []; c.inst.push({ mid: 'test', m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
  // beklimmen: volg de trap van onder naar boven met floorAt
  const ts = 2.25, D = [1, 0], dx = D[0] * ts * Math.sqrt(3) / 2, dz = D[0] * ts / 2 + D[1] * ts, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux;
  const climb = (S0, li) => { const a0 = S0.a, A = [a0[0] * ts * Math.sqrt(3) / 2, a0[1] * ts + a0[0] * ts / 2]; let feet = li * 3 + 0.02, path = [];
   const len = S0.n * ts, pts = [];
   if (S0.k === 'stair') { for (let al = -0.6; al <= len + 1.2; al += 0.1) pts.push([A[0] + ux * al + nx * S0.off, A[1] + uz * al + nz * S0.off]); }
   else { const c2 = S0.side * S0.w; for (let al = -0.6; al <= len + 0.35; al += 0.1) pts.push([A[0] + ux * al + nx * S0.off, A[1] + uz * al + nz * S0.off]); for (let lat = 0; lat <= c2; lat += 0.1) pts.push([A[0] + ux * (len + 0.35) + nx * (S0.off + lat), A[1] + uz * (len + 0.9) + nz * (S0.off + lat)]); for (let al = len + 0.35; al >= -0.8; al -= 0.1) pts.push([A[0] + ux * al + nx * (S0.off + c2), A[1] + uz * al + nz * (S0.off + c2)]); }
   let maxStep = 0, blocked = 0; for (const [x, z] of pts) { const f = S.floorAt(x, z, feet); maxStep = Math.max(maxStep, f - feet); if (S.blockedAt(x, z, f)) blocked++; feet = f; path.push(+f.toFixed(2)); }
   return { eind: +feet.toFixed(2), maxStep: +maxStep.toFixed(3), geblokkeerd: blocked, n: pts.length }; };
  return { trap: climb(m.lv[0].s[0], 0), bordes: climb(m.lv[1].s[0], 1) }; });
 console.log(JSON.stringify(r));
 for (const [th, ph, dist, n] of [[0.6, 1.0, 26, 'a'], [2.6, 0.9, 24, 'b'], [4.2, 1.15, 20, 'c']]) {
  await p.evaluate(([th, ph, dist]) => { const S = window.__SC(); S.orbit.target.set(0, 3.5, 0); S.setLayerView && 0; S.orbit.dist = dist; S.orbit.phi = ph; S.orbit.theta = th; S.applyOrbit(); S.setLayer && 0; }, [th, ph, dist]);
  await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/trap_' + n + '.png', timeout: 120000 }); }
 await b.close(); })();
