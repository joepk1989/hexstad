// Meet de looptechniek: voeten die verspringen, voeten die achterblijven, gestrekte benen, en de snelheid van lichaam en voeten
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 500, height: 320 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 for (const rek of [false, true]) {
  const r = await p.evaluate(rek => { const S = window.__SC(); S.cars.setReckless(rek); window.__noLod = true;
   const A = S.people.agents; for (let i = 0; i < 60; i++) S.people.update(1 / 60);
   const prev = new Map(); let frames = 0, pops = 0, popSum = 0, over = 0, both = 0, lag = 0, spdSum = 0, n = 0, steps = 0; const lastSw = new Map();
   for (let i = 0; i < 1800; i++) { S.people.update(1 / 60);
    for (const a of A) { if (a.state !== 'walk' || !a.feet) continue; frames++; spdSum += Math.hypot(a.vx || 0, a.vz || 0); n++;
     const P = prev.get(a); const sc = a.scale || 1;
     a.feet.forEach((f, k) => { if (P && !f.swing && !P[k].sw) { const d = Math.hypot(f.x - P[k].x, f.z - P[k].z); if (d > 0.01) { pops++; popSum += d; } }
      const side = k ? 1 : -1, hx = a.x, hz = a.z, dist = Math.hypot(Math.hypot(f.cx - hx, f.cz - hz), a.hipY - f.cy); if (dist > 0.88 * sc * 0.985 * 1.0 + 0.03 * sc) over++;
      if (P && f.swing && !P[k].sw) steps++;
      const lon = (f.x - a.x) * Math.sin(a.heading) + (f.z - a.z) * Math.cos(a.heading); if (!f.swing && lon < -0.45 * sc) lag++; });
     if (a.feet[0].swing && a.feet[1].swing) both++;
     prev.set(a, a.feet.map(f => ({ x: f.x, z: f.z, sw: f.swing }))); } }
   const T = 30, ppl = n / 1800;
   return { mode: rek ? 'chaos (rennen)' : 'gewoon lopen', mensen: +ppl.toFixed(0), snelheid: +(spdSum / n).toFixed(2), 'stappen/s per persoon': +(steps / T / ppl).toFixed(2), 'voet verspringt per min p.p.': +(pops / (T / 60) / ppl).toFixed(1), 'gem sprong m': +(popSum / Math.max(1, pops)).toFixed(2), 'been te lang %': +(over / (frames * 2) * 100).toFixed(1), 'voet ver achter %': +(lag / (frames * 2) * 100).toFixed(1), 'zweefmoment %': +(both / frames * 100).toFixed(1) }; }, rek);
  console.log(JSON.stringify(r)); }
 await b.close(); })();
