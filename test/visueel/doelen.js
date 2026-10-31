// Mensen met doelen: wie is er buiten per uur, hoeveel komen er aan, hoe lang duurt een route plannen
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 600 });
 await p.waitForTimeout(2000);
 const r = await p.evaluate(() => { const S = window.__SC(), P = S.people; window.__noLod = true;
   const DN = window.__DN; DN.st.tod = 6; DN.st.auto = true; DN.st.speed = 1;
   window.__lv = []; const per = {}, cats = {}; let arr = 0, lost = 0; const lens = []; const A0 = P.agents; for (const a of A0) a.__g = null; let t0 = performance.now(), steps = 0;
   for (let i = 0; i < 48000; i++) { DN.update(0.05); P.update(0.05); steps++;
     for (const a of P.agents) { if (a.__st === 'inside' && a.state !== 'inside' && window.__lv.length < 12) window.__lv.push([+DN.st.tod.toFixed(2), a.untilH && +a.untilH.toFixed(2), +(a.timer || 0).toFixed(1), a.inB, a.state]); a.__st = a.state; if (a.goal && a.goal !== a.__g) { a.__g = a.goal; a.__g0 = a.t; if (a.path && a.path.length) { let L = 0; let pn = a.node; for (const n of a.path) { L += Math.hypot(n.x - pn.x, n.z - pn.z); pn = n; } lens.push(L); } } if (!a.goal && a.__g) { if (a.state === 'inside' || a.state === 'pause') { arr++; cats[a.__g.cat + ':' + a.state] = (cats[a.__g.cat + ':' + a.state] || 0) + 1; } else { lost++; cats['kwijt:' + a.__g.cat + ':' + a.state] = (cats['kwijt:' + a.__g.cat + ':' + a.state] || 0) + 1; } a.__g = null; } }
     if (i % 400 === 0) { const h = Math.floor(DN.st.tod); const A = P.agents; const out = A.filter(a => a.state === 'walk' || a.state === 'pause').length, inn = A.filter(a => a.state === 'inside').length, doel = A.filter(a => a.goal).length; per[h] = per[h] || []; if (i >= 24000) per[h].push([out, inn, doel]);
       for (const a of A) if (a.state === 'inside' && a.inB) { const k = a.inB[0] + ':' + h; } } }
   const ms = (performance.now() - t0) / steps;
   const sum = {}; for (const h in per) { const L = per[h]; sum[h] = L[L.length - 1]; }
   const A = P.agents; lens.sort((x, y) => x - y); return { lv: window.__lv, cats, aangekomen: arr, kwijt: lost, routes: lens.length, mediaanM: Math.round(lens[lens.length >> 1] || 0), p90M: Math.round(lens[Math.floor(lens.length * 0.9)] || 0), mensen: A.length, metHuis: A.filter(a => a.home).length, metWerk: A.filter(a => a.job).length, msPerStap: +ms.toFixed(2), perUur: sum }; });
 console.log(JSON.stringify(r));
 await b.close(); })();
