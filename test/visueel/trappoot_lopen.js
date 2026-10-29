// Lopen mensen de trappenhuis-poot op? (en niemand door een muur)
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 600 });
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 await p.evaluate(() => { const S = window.__SC(), c = S.getCells(), mods = window.__mods;
   const W = (q, r) => { const w = S.cellToWorld(q, r); return [w.x, w.z]; }; c.paths = [{ t: 'weg', l: 0, r: 0, p: [W(0, -6), W(0, 6)] }, { t: 'weg', l: 0, r: 0, p: [W(-6, 6), W(6, 6)] }]; S.rebuildAll();
   S.modSel(mods.findIndex(m => /^Stadswoning · wit/.test(m.name))); S.selectTool('module'); S.place(0, 0); });
 await p.waitForTimeout(2500);
 const r = await p.evaluate(() => { const S = window.__SC(); let opTrap = 0, boven = 0, max = 0;
   for (let i = 0; i < 2400; i++) { S.people.update(0.05); if (i % 10) continue; for (const a of S.people.agents) { if (a.y > 1 && a.y < 5.8 && a.spir) opTrap++; if (a.y > 5.8) boven++; max = Math.max(max, a.y); } }
   return { opTrap, boven, max: +max.toFixed(2), inc: document.querySelector('#incBox, .inc')?.textContent || '' }; });
 console.log(JSON.stringify(r));
 await b.close(); })();
