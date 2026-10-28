// Instorten als dragende wanden weg zijn: haal muren van de begane grond weg en kijk wat er daarboven blijft staan
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1000, height: 620 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const names = ['Stadswoning · wit · 3L', 'Kantoor · glas · 3L', 'Rijhuis · baksteen · 2L'];
 const cases = [['muren BG oostkant weg', 'east'], ['alle muren BG weg', 'all'], ['muren BG en 1e oostkant weg', 'east2']];
 for (const nm of names) for (const [lab, mode] of cases) {
  await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(300);
  const ok = await p.evaluate(nm => { const S = window.__SC(), m = window.__mods.find(m => m.name.startsWith(nm)); if (!m) return null; const c = S.getCells(); c.inst = c.inst || []; c.inst.push({ mid: m.id || 't', m: S.instData(m, false), q: 0, r: 0, rot: 0 }); S.rebuildAll(); return m.name; }, nm);
  if (!ok) { console.log('geen', nm); continue; }
  const r = await p.evaluate(mode => { const S = window.__SC(), C = S.collapse, st = C.prep(0, 0); if (!st) return 'geen gebouw';
    const lvOf = q => Math.max(0, Math.floor((q.c.y - q.hy - st.G + 0.3) / 3)), tel = () => { const o = {}; for (const q of st.P) if (q.st === 'stand') { const l = lvOf(q); o[l] = (o[l] || 0) + 1; } return o; };
    const before = tel(), wall = q => !q.flat;
    const n = C.knock(st, q => wall(q) && (mode === 'all' ? lvOf(q) === 0 : mode === 'east' ? lvOf(q) === 0 && q.c.x > 0.5 : lvOf(q) <= 1 && q.c.x > 0.5));
    for (let i = 0; i < 300; i++) C.update(1 / 30);
    return { weg: n, voor: before, na: tel() }; }, mode);
  console.log(ok.padEnd(26), lab.padEnd(28), JSON.stringify(r));
  if (nm.startsWith('Stadswoning') ) { await p.evaluate(() => { const S = window.__SC(); S.orbit.target.set(0, 4, 0); S.orbit.dist = 45; S.orbit.phi = 1.05; S.orbit.theta = 0.7; S.applyOrbit(); }); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/dragers_' + mode + '.png', timeout: 120000 }); }
 }
 await b.close(); })();
