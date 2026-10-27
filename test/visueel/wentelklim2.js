const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 640 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
 const r = await p.evaluate(() => { const S = window.__SC(), LB = window.__libBuilder;
  const b = LB('Test · wentel · 3L', 'Wonen'); for (let li = 0; li < 3; li++) b.hex(li, 0, 0, 8.99, 'concrete');
  const m = b.m; const out = {};
  for (const [li, sd, d, a] of [[0, 1, 0, [0, 0]], [1, 1, 0, [0, 0]]]) m.lv[li].s.push({ a, d, n: 1, w: 1.5, k: 'spiral', side: sd });
  const c = S.getCells(); c.inst = c.inst || []; c.inst.push({ mid: 'test', m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
  const ts = 2.25;
  const climb = (S0, li) => { const D = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]][S0.d], a0 = Math.atan2(D[0] * ts / 2 + D[1] * ts, D[0] * ts * Math.sqrt(3) / 2), sd = S0.side;
    const A = [S0.a[0] * ts * Math.sqrt(3) / 2, S0.a[1] * ts + S0.a[0] * ts / 2]; let feet = li * 3 + 0.02, maxStep = 0, blocked = [], path = [];
    for (let deg = -40; deg <= 420; deg += 3) { const rr = deg < 0 ? 2.6 + (-deg / 40) : deg > 360 ? 1.15 + (deg - 360) / 20 : 1.15, an = a0 + sd * (deg < 0 ? 15 : deg > 360 ? 345 : deg) * Math.PI / 180;
      const pt = deg < 0 ? [Math.cos(an) * (1.15 + (-deg / 40) * 2.5), Math.sin(an) * (1.15 + (-deg / 40) * 2.5)] : deg > 360 ? [Math.cos(a0 + sd * (345 + (deg - 360)) * Math.PI / 180) * (1.15 + (deg - 360) / 25), Math.sin(a0 + sd * (345 + (deg - 360)) * Math.PI / 180) * (1.15 + (deg - 360) / 25)] : [Math.cos(an) * 1.15, Math.sin(an) * 1.15];
      pt[0] += A[0]; pt[1] += A[1]; const f = S.floorAt(pt[0], pt[1], feet); maxStep = Math.max(maxStep, f - feet); if (S.blockedAt(pt[0], pt[1], f)) blocked.push(deg + ':' + JSON.stringify(window.__modDbg().whyBlocked(pt[0], pt[1], f).slice(0, 1))); feet = f; path.push(deg + '=' + f.toFixed(2)); }
    return { eind: +feet.toFixed(2), maxStep: +maxStep.toFixed(2), geblokkeerd: blocked.length, eerste: blocked.filter((_, i) => i % 6 === 0).slice(0, 14), pad: path.filter((_, i) => i % 10 === 0).join(' ') }; };
  return { onder: climb(m.lv[0].s[0], 0), boven: climb(m.lv[1].s[0], 1) }; });
 console.log(JSON.stringify(r, null, 1));
 await b.close(); })();
