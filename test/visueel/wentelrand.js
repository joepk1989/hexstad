// Wenteltrap: is het gat in de vloer erboven nu rondom afgezet (geen leuningvrije val)?
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 700 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(800);
 await p.evaluate(() => { const S = window.__SC(), LB = window.__libBuilder;
  const b = LB('Test · wentel · 2L', 'Wonen'); for (let li = 0; li < 2; li++) b.hex(li, 0, 0, 8.99, 'concrete');
  const m = b.m; m.lv[0].s.push({ a: [0, 0], d: 0, n: 1, w: 1.5, k: 'spiral', side: 1 });
  const c = S.getCells(); c.inst = c.inst || []; c.inst.push({ mid: 'test', m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll();
 });
 await p.waitForTimeout(600);
 // kijk van bovenaf in het gat (op de bovenverdieping, dichtbij)
 await p.evaluate(() => { const S = window.__SC(), f = S.flyCam; f.x = 2; f.z = 2; f.y = 5.5; f.yaw = Math.PI * 0.85; f.pitch = -0.75; f.vx = f.vy = f.vz = 0; });
 await p.keyboard.press('Space'); await p.waitForTimeout(1200);
 await p.screenshot({ path: OUT + '/wentel_boven.png', timeout: 120000 });
 // botsing testen: op de bovenverdieping lopend, een cirkel rond het gat afgelopen op 2,3 m van het midden (net buiten de rand-balustrade)
 const r = await p.evaluate(() => { const S = window.__SC(); const out = [];
   for (let deg = 0; deg < 360; deg += 10) { const a = deg * Math.PI / 180, x = Math.cos(a) * 2.3, z = Math.sin(a) * 2.3, feet = 3.02;
     out.push([deg, S.blockedAt(x, z, feet)]); }
   return out; });
 console.log('rand op 2,3 m (zou overal muur/leuning moeten zijn, behalve bij de uitstap):', JSON.stringify(r));
 const val = await p.evaluate(() => { const S = window.__SC(); const out = [];
   for (let deg = 0; deg < 360; deg += 15) { const a = deg * Math.PI / 180, x = Math.cos(a) * 1.5, z = Math.sin(a) * 1.5;
     out.push([deg, S.floorAt(x, z, 3.02).toFixed(2)]); }
   return out; });
 console.log('vloerhoogte op 1,5 m (zou bij een gat laag moeten zijn, niet 3,02):', JSON.stringify(val));
 await b.close(); })();
