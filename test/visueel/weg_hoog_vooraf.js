// Verhoogde weg alleen met de muis: weg kiezen, ▲ aanklikken (vóór het slepen), dan slepen. Ligt de weg hoger?
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1100, height: 700 });
 await p.evaluate(() => window.__SC().selectTool('vweg')); await p.waitForTimeout(400);
 const zicht = await p.evaluate(() => !document.getElementById('dragH').hidden);
 const up = await p.evaluate(() => { const r = document.querySelector('#dragH [data-d="1"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
 for (let i = 0; i < 4; i++) { await p.mouse.click(up[0], up[1]); await p.waitForTimeout(120); }
 const label = await p.evaluate(() => document.querySelector('#dragH span').textContent);
 await p.screenshot({ path: OUT + '/weg_vooraf_paneel.png', timeout: 120000 });
 const pts = await p.evaluate(() => { const S = window.__SC(), out = [];
   for (const [q, r] of [[-8, -4], [-4, -4], [0, -4]]) { const w = S.cellToWorld(q, r), v = new THREE.Vector3(w.x, S.terrainHeightAt(w.x, w.z), w.z).project(S.camera); out.push([(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]); }
   return { out, n: (S.getCells().paths || []).length }; });
 const [a, , e] = pts.out;
 await p.mouse.move(a[0], a[1]); await p.mouse.down();
 for (let i = 1; i <= 16; i++) { await p.mouse.move(a[0] + (e[0] - a[0]) * i / 16, a[1] + (e[1] - a[1]) * i / 16); await p.waitForTimeout(40); }
 await p.mouse.up(); await p.waitForTimeout(800);
 const na = await p.evaluate(n0 => { const S = window.__SC(), P = S.getCells().paths || [], vp = P[P.length - 1]; if (P.length === n0) return { fout: 'geen nieuwe weg' };
   const pr = S.pathProf(vp), w = S.cellToWorld(-4, -4); return { y: vp.y || null, maxH: +Math.max(...pr.h).toFixed(2), roadTopMidden: S.roadTop(w.x, w.z), paneelNogZichtbaar: !document.getElementById('dragH').hidden }; }, pts.n);
 console.log('paneel zichtbaar na kiezen:', zicht, '· label na 4× ▲:', label); console.log('na', JSON.stringify(na));
 await p.screenshot({ path: OUT + '/weg_vooraf_na.png', timeout: 120000 });
 await b.close(); })();
