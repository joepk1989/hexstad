// Telt hoe vaak auto's door elkaar staan (botsdozen overlappen meer dan 0,2 m), met de oorzaak.
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const stad = process.env.STAD, rek = process.env.REK === '1', n = +(process.env.N || 16), T = +(process.env.T || 60);
 if (stad) { await p.evaluate(a => window.__SC().doAct(a), stad); await p.waitForTimeout(2000); }
 const r = await p.evaluate(([rek, n, T]) => { const S = window.__SC(); S.cars.setReckless(rek); S.cars.setForce(n); S.cars.update(0.05);
  const HL = 2.3, HW = 0.95, ext = (c, ax) => HL * Math.abs(Math.cos(c.h) * ax[0] + Math.sin(c.h) * ax[1]) + HW * Math.abs(-Math.sin(c.h) * ax[0] + Math.cos(c.h) * ax[1]);
  const depth = (A, B) => { const dx = B.x - A.x, dz = B.z - A.z; if (dx * dx + dz * dz > 27 || Math.abs((A.sy ?? 0) - (B.sy ?? 0)) > 2) return 0; let best = 1e9; for (const ax of [[Math.cos(A.h), Math.sin(A.h)], [-Math.sin(A.h), Math.cos(A.h)], [Math.cos(B.h), Math.sin(B.h)], [-Math.sin(B.h), Math.cos(B.h)]]) { const ov = ext(A, ax) + ext(B, ax) - Math.abs(dx * ax[0] + dz * ax[1]); if (ov <= 0) return 0; best = Math.min(best, ov); } return best; };
  const cause = {}; let frames = 0, ov = 0, maxD = 0; const pairs = new Map();
  for (let i = 0; i < T * 20; i++) { S.cars.update(0.05); S.people && S.people.update && 0; frames++;
   const L = S.cars.list; for (let a = 0; a < L.length; a++) for (let c = a + 1; c < L.length; c++) { const A = L[a], B = L[c]; if (A.fly || B.fly) continue; const d = depth(A, B); if (d < 0.2) continue; ov++; maxD = Math.max(maxD, d);
    const k = (A.ghost > 0 || B.ghost > 0) ? 'spook' : (A.crash || B.crash) ? 'botsing' : (A.burn || B.burn) ? 'brand' : rek ? 'roekeloos-rijdend' : 'netjes-rijdend'; cause[k] = (cause[k] || 0) + 1; const pk = A.id + '-' + B.id; pairs.set(pk, (pairs.get(pk) || 0) + 1); } }
  const long = [...pairs.values()].filter(v => v > 20).length;
  return { frames, overlapFrames: ov, perMin: +(ov / (T / 60)).toFixed(0), maxD: +maxD.toFixed(2), cause, paren: pairs.size, langer1s: long }; }, [rek, n, T]);
 console.log((stad || 'start') + (rek ? ' chaos' : ' netjes'), JSON.stringify(r)); await b.close(); })();
