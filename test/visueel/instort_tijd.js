// Vaste proef: gebouw in stukken (prep), dan 3 keer een stuk weghalen (knock) en de val afspelen; tijd per beeld
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 const out = [];
 for (const nm of ['Winkelcentrum · klein', 'Flat · galerij', 'Stadswoning · wit · 3L', 'Sporthal']) {
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(200);
  out.push(await p.evaluate(nm => { const S = window.__SC(), C = S.collapse, c = S.getCells(), m = window.__mods.find(m => m.name.startsWith(nm)); c.inst = [{ mid: m.id, m: S.instData(m, false), q: 0, r: 0, rot: 0 }]; S.rebuildAll();
    let t0 = performance.now(); const st = C.prep(0, 0); const tPrep = performance.now() - t0; let worst = 0, tot = 0;
    const lvOf = q => Math.floor((q.c.y - q.hy - st.G + 0.3) / 3);
    for (const [ax, w] of [[1, 4], [-1, 4], [0, 9]]) { C.knock(st, q => !q.flat && lvOf(q) === 0 && (ax ? ax * q.c.x > w : Math.abs(q.c.z) < 3));
      for (let i = 0; i < 240; i++) { const t1 = performance.now(); C.update(1 / 30); const d = performance.now() - t1; worst = Math.max(worst, d); tot += d; } }
    return { nm, stukken: st.P.length, prep: Math.round(tPrep), langsteBeeld: Math.round(worst), totaal: Math.round(tot) }; }, nm)); }
 console.log(JSON.stringify(out)); await b.close(); })();
