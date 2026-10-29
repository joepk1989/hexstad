// Bibliotheekcontrole: bouwt elke standaardmodule los in een lege stad en kijkt na:
//  - bereikbaarheid: welke verdiepingen kun je lopend (met de echte botsing: floorAt/blockedAt) vanaf de straat halen
//  - voorwerpen: zweven (geen vloer eronder), in een muur, buiten het gebied, op elkaar
//  - muren: zwevend op een verdieping zonder vloer ernaast
//  - trappen: komen ze uit op een vloer van de verdieping erboven
// Schrijft uit/bieb_audit.json en een overzichtsplaat per categorie (uit/bieb_<cat>.png).
const { open, OUT } = require('./helper'); const fs = require('fs');
const ONLY = process.env.ALLEEN || '', GEN = +(process.env.GEN || 0), GEN0 = +(process.env.GEN0 || 1);   // GEN=40: 40 gegenereerde winkelcentra (seed GEN0…)   // deel van een naam: alleen die modules
(async () => {
  const { b, p } = await open({ width: 900, height: 700 });
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(600);
  const names = GEN ? Array.from({ length: GEN }, (_, i) => 'gen:' + (GEN0 + i)) : await p.evaluate(only => window.__mv2.libStandard().filter(m => !only || m.name.includes(only)).map(m => m.name), ONLY);
  const all = [];
  for (const nm of names) {
    const r = await p.evaluate(nm => {
      const S = window.__SC(), X = window.__mv2, D = window.__modDbg(), m = nm.startsWith('gen:') ? window.__mallGen(+nm.slice(4)) : X.libStandard().find(m => m.name === nm);
      const c = S.getCells(); c.inst = [{ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }]; S.rebuildAll();
      const ts = X.mv2Ts(m), LH = X.MV2.LV_H, k = m.k || 0, ext = 9 * (1 + 2 * k) + 3, M = X.modMeta(m), issues = [];
      const cen = id => { const [i, j, t] = id.split(',').map(Number), v = X.mv2TriVerts(i, j, t, ts); return [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3]; };
      // --- lopen: vloedvulling vanaf de straat ---
      const G = 0.45, n = Math.ceil(ext / G), seen = new Map(), q = [];
      const keyOf = (ix, iz, f) => ix + ',' + iz + ',' + Math.round(f * 4);
      for (let ix = -n; ix <= n; ix++) for (let iz = -n; iz <= n; iz++) { const x = ix * G, z = iz * G; if (Math.hypot(x, z) > ext - 0.5 || X.mv2InArea(m, x, z) || Math.hypot(x, z) < ext - 2.5) continue; const f = S.floorAt(x, z, 0.02); if (S.blockedAt(x, z, f)) continue; const kk = keyOf(ix, iz, f); if (!seen.has(kk)) { seen.set(kk, [x, z, f]); q.push([ix, iz, f]); } }
      let steps = 0;
      while (q.length && steps < 160000) { const [ix, iz, f0] = q.shift(); steps++;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const jx = ix + dx, jz = iz + dz, x = jx * G, z = jz * G; if (Math.hypot(x, z) > ext) continue;
          const f = S.floorAt(x, z, f0); if (f < f0 - 0.6) continue; if (S.blockedAt(x, z, f)) continue; const kk = keyOf(jx, jz, f); if (seen.has(kk)) continue; seen.set(kk, [x, z, f]); q.push([jx, jz, f]); } }
      const pts = [...seen.values()];
      const reach = (x, z, y) => pts.some(P => Math.abs(P[2] - y) < 0.35 && Math.hypot(P[0] - x, P[1] - z) < 0.75);
      const lv = [];
      for (let li = 0; li < m.lv.length; li++) {
        const holes = li > 0 ? (m.lv[li - 1].s || []).map(S0 => X.mv2StairHole(S0, ts)) : [], inHole = id => { const [i, j, t] = id.split(',').map(Number), v = X.mv2TriVerts(i, j, t, ts); return holes.some(h => { const r = h(v); return r && !r.keep; }); };
        const L = m.lv[li], ids = Object.keys(L.f).filter(id => { const c2 = cen(id); return X.mv2InArea(m, c2[0], c2[1]) && !inHole(id); });
        const walkable = ids.filter(id => !['water'].includes(L.f[id]));
        const roofLayer = li >= M.fl; if (!walkable.length) continue;
        let ok = 0; const sample = walkable.filter((_, i) => i % Math.max(1, Math.floor(walkable.length / 60)) === 0);
        for (const id of sample) { const c2 = cen(id); if (reach(c2[0], c2[1], li * LH + 0.02)) ok++; }
        const frac = ok / sample.length; lv.push({ li, frac: +frac.toFixed(2), roof: roofLayer });
        const L0 = m.lv[0], closed = Object.values(L0.w).length && !Object.values(L0.w).some(w => w && w.o && w.o !== 'window') && !L0.s.length;   // dicht blok zonder deur (bouwdeel): niet om in te lopen
        if (!roofLayer && frac < (/Zonnepark/.test(m.name) ? 0.75 : 0.85) && !closed) issues.push(`laag ${li}: maar ${Math.round(frac * 100)}% bereikbaar`);
      }
      // --- voorwerpen ---
      const RAD = { tree: 0.35, bush: 0.7, bench: 0.3, lamp: 0.15, pillar: 0.35, table: 0.9, planter: 0.75, fountain: 1.9, bin: 0.25, bike: 0.35, shelf: 0.3, counter: 0.4, sign: 0.1, bed: 0.1, sofa: 0.45, desk: 0.4, kitchen: 0.3, screen: 0.1, car: 0.9, pump: 0.5, charger: 0.2, solar: 0.7, turbine: 0.7, chimney: 1.25, container: 0.7, goal: 0.1, grave: 0.35, boat: 0.8, shelter: 0.1, slide: 0.8, swing: 0.6, sheep: 0.45 }, LEN = { bench: 1.8, shelf: 2.4, counter: 2.2, bike: 2.4, sign: 1.6, bed: 1.8, sofa: 2.0, desk: 1.6, kitchen: 2.4, screen: 6.0, car: 4.3, solar: 3.4, container: 2.4, goal: 3.7, boat: 4.2, shelter: 3.0, swing: 2.7 };
      const segs = li => { const L = m.lv[li], out = []; for (const id in L.w) { if (!L.w[id]) continue; const [i, j, d] = id.split(',').map(Number), Dd = X.MV2.DIRW[d], a = X.mv2P(i, j, ts), bb = X.mv2P(i + Dd[0], j + Dd[1], ts); out.push([a, bb, L.w[id]]); } return out; };
      const dSeg = (x, z, a, bb) => { const dx = bb[0] - a[0], dz = bb[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(a[0] + t * dx - x, a[1] + t * dz - z); };
      const floorAtLv = (li, x, z) => Object.keys(m.lv[li].f).some(id => { const [i, j, t] = id.split(',').map(Number), v = X.mv2TriVerts(i, j, t, ts); const s = (A, B) => (B[0] - A[0]) * (z - A[1]) - (B[1] - A[1]) * (x - A[0]); const s1 = s(v[0], v[1]), s2 = s(v[1], v[2]), s3 = s(v[2], v[0]); return (s1 >= -1e-6 && s2 >= -1e-6 && s3 >= -1e-6) || (s1 <= 1e-6 && s2 <= 1e-6 && s3 <= 1e-6); });
      m.lv.forEach((L, li) => {
        const W = segs(li);
        L.o.forEach((o, oi) => {
          if (!X.mv2InArea(m, o.x, o.z)) issues.push(`laag ${li}: ${o.t} buiten het gebied (${o.x}, ${o.z})`);
          if (li > 0 && !floorAtLv(li, o.x, o.z)) issues.push(`laag ${li}: ${o.t} zweeft (${o.x}, ${o.z})`);
          const ln = LEN[o.t] || 0, ux = Math.cos(o.rot || 0), uz = Math.sin(o.rot || 0), probe = ln ? [-0.5, -0.25, 0, 0.25, 0.5].map(f => [o.x + ux * ln * f, o.z + uz * ln * f]) : [[o.x, o.z]];
          for (const [a, bb, Wd] of W) { if (Wd.o === 'open' || Wd.o === 'gate') continue; if (probe.some(([x, z]) => dSeg(x, z, a, bb) < (RAD[o.t] || 0.3) + 0.1)) { issues.push(`laag ${li}: ${o.t} in een muur (${o.x}, ${o.z})`); break; } }
          L.o.forEach((o2, oj) => { if (oj <= oi) return; const d = Math.hypot(o.x - o2.x, o.z - o2.z); if (d < Math.max(0.5, ((RAD[o.t] || 0.3) + (RAD[o2.t] || 0.3)) * 0.7) && !(LEN[o.t] || LEN[o2.t])) issues.push(`laag ${li}: ${o.t} en ${o2.t} op elkaar`); });
        });
        if (li > 0) for (const [a, bb, Wd] of W) { const mx = (a[0] + bb[0]) / 2, mz = (a[1] + bb[1]) / 2, nx = -(bb[1] - a[1]), nz = bb[0] - a[0], l = Math.hypot(nx, nz) || 1; const s1 = floorAtLv(li, mx + nx / l * 0.5, mz + nz / l * 0.5), s2 = floorAtLv(li, mx - nx / l * 0.5, mz - nz / l * 0.5), below = floorAtLv(li - 1, mx, mz) || segs(li - 1).some(([A, B2]) => dSeg(mx, mz, A, B2) < 0.2); if (!s1 && !s2 && !below) { issues.push(`laag ${li}: zwevende muur bij (${mx.toFixed(1)}, ${mz.toFixed(1)})`); break; } }
      });
      // --- trappen: uitkomst ---
      m.lv.forEach((L, li) => L.s.forEach(St => { if (St.k === 'hexramp' || St.k === 'trib') return; const ex = St.k === 'spiral' ? null : (() => { const Dd = X.MV2.DIR6[St.d], a = X.mv2P(St.a[0], St.a[1], ts), dx = Dd[0] * ts * Math.sqrt(3) / 2, dz = Dd[0] * ts / 2 + Dd[1] * ts, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, len = (St.n || 2) * ts, off = St.off || 0, lat = St.k === 'u' ? (St.side || 1) * (St.w || 1.2) : 0, al = St.k === 'u' ? 0.4 : len + (St.k === 'stair' ? (St.w || 1.2) * 0.87 + 0.3 : 0.4); return [a[0] + ux * al + nx * (lat + off), a[1] + uz * al + nz * (lat + off)]; })();
        if (ex && !reach(ex[0], ex[1], (li + 1) * LH + 0.02)) issues.push(`laag ${li}: ${St.k === 'u' ? 'bordestrap' : St.k === 'ramp' ? 'helling' : 'trap'} komt boven niet bereikbaar uit (${ex[0].toFixed(1)}, ${ex[1].toFixed(1)})`); }));
      return { naam: m.name, cat: m.cat, lagen: m.lv.length, fl: M.fl, lv, issues, punten: pts.length };
    }, nm);
    all.push(r); console.log((r.issues.length ? '✗ ' : '✓ ') + (nm.startsWith('gen:') ? nm + ' ' : '') + r.naam + (r.issues.length ? '\n     ' + r.issues.slice(0, 6).join('\n     ') + (r.issues.length > 6 ? '\n     … +' + (r.issues.length - 6) : '') : ''));
  }
  fs.writeFileSync(OUT + '/bieb_audit.json', JSON.stringify(all, null, 1));
  console.log('\nmodules', all.length, '· met opmerkingen', all.filter(r => r.issues.length).length);
  await b.close();
})();
