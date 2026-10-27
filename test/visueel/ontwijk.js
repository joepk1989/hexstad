// Meet hoe goed mensen elkaar ontwijken: te dichtbij (< 0,45 m), duwen, plots afremmen en zigzaggen
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const stad = process.env.STAD; if (stad) { await p.evaluate(a => window.__SC().doAct(a), stad); await p.waitForTimeout(2500); }
 const r = await p.evaluate(rek => { const S = window.__SC(); S.cars.setReckless(rek); S.cars.setOn(false); window.__noLod = true; const A = S.people.agents; for (let i = 0; i < 120; i++) S.people.update(1 / 60);
  let close = 0, enc = 0, frames = 0, brake = 0, turn = 0, walkF = 0; const hp = new Map(), sp = new Map(); let minD = 9;
  for (let i = 0; i < 3600; i++) { S.people.update(1 / 60); frames++;
   const W = A.filter(a => a.state === 'walk'); walkF += W.length;
   for (let x = 0; x < W.length; x++) for (let y = x + 1; y < W.length; y++) { const a = W[x], o = W[y]; if (Math.abs(a.y - o.y) > 1) continue; const d = Math.hypot(a.x - o.x, a.z - o.z); if (d < 2) enc++; if (d < 0.45) { close++; minD = Math.min(minD, d); } }
   for (const a of W) { const h0 = hp.get(a), s0 = sp.get(a); if (h0 !== undefined) { let dh = a.heading - h0; dh = Math.abs(Math.atan2(Math.sin(dh), Math.cos(dh))); if (dh > 0.06) turn++; if (s0 - a.spd > 0.05) brake++; } hp.set(a, a.heading); sp.set(a, a.spd); } }
  const ppl = walkF / frames, mins = frames / 3600;
  return { lopers: +ppl.toFixed(0), 'te dichtbij (paar-beelden/min)': +(close / mins).toFixed(0), 'dichtste m': +minD.toFixed(2), 'ontmoetingen <2m': +(enc / mins).toFixed(0), 'scherpe draai %': +(turn / walkF * 100).toFixed(2), 'hard remmen %': +(brake / walkF * 100).toFixed(2) }; }, process.env.REK === '1');
 console.log((stad || 'start') + (process.env.REK === '1' ? ' chaos' : ''), JSON.stringify(r)); await b.close(); })();
