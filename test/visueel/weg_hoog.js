// Verhoogde weg met de muis: slepen, tijdens het slepen E (of ▲) indrukken, loslaten. Ligt de weg daarna hoger?
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => { const S = window.__SC(); S.selectTool('vweg'); });
 const pts = await p.evaluate(() => { const S = window.__SC(), out = [];
   for (const [q, r] of [[-8, -4], [-4, -4], [0, -4]]) { const w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); out.push([(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]); }
   return { out, n: (S.getCells().paths || []).length }; });
 console.log('punten', JSON.stringify(pts));
 const [a, m, e] = pts.out;
 await p.mouse.move(a[0], a[1]); await p.mouse.down();
 for (let i = 1; i <= 10; i++) { await p.mouse.move(a[0] + (m[0] - a[0]) * i / 10, a[1] + (m[1] - a[1]) * i / 10); await p.waitForTimeout(40); }
 const tijdens = await p.evaluate(() => { const el = document.getElementById('dragH'); return { knoppenZichtbaar: el && !el.hidden }; });
 for (let i = 0; i < 4; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(120); }
 for (let i = 1; i <= 10; i++) { await p.mouse.move(m[0] + (e[0] - m[0]) * i / 10, m[1] + (e[1] - m[1]) * i / 10); await p.waitForTimeout(40); }
 for (let i = 0; i < 4; i++) { await p.keyboard.press('KeyE'); await p.waitForTimeout(120); }
 await p.screenshot({ path: OUT + '/weg_hoog_tijdens.png', timeout: 120000 });
 await p.mouse.up(); await p.waitForTimeout(800);
 const na = await p.evaluate(n0 => { const S = window.__SC(), P = S.getCells().paths || [], vp = P[P.length - 1]; if (P.length === n0) return { fout: 'geen nieuwe weg' };
   const pr = S.pathProf(vp); const w = S.cellToWorld(-4, -4), w2 = S.cellToWorld(0, -4);
   return { y: vp.y || null, abs: !!vp.abs, maxH: +Math.max(...pr.h).toFixed(2), roadTopMidden: S.roadTop(w.x, w.z), roadTopEind: S.roadTop(w2.x, w2.z) }; }, pts.n);
 console.log('tijdens', JSON.stringify(tijdens)); console.log('na', JSON.stringify(na));
 await p.screenshot({ path: OUT + '/weg_hoog_na.png', timeout: 120000 });
 await b.close(); })();
