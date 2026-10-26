const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 for (const a of ['sample', 'blocks', 'layers', 'dorp1']) { await p.evaluate(a => window.__SC().doAct(a), a); await p.waitForTimeout(800);
  console.log(a, JSON.stringify(await p.evaluate(() => { const c = window.__SC().getCells(), o = {}; for (const [k, s] of c.entries()) if (s.some(t => /^(woning|kantoor|blok|zuilen|hof|tribune|tunnel)/.test(t))) { const key = s.join('>'); o[key] = (o[key] || 0) + 1; } return o; }))); }
 await b.close(); })();
