const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 1000, height: 700 });
  for (const act of ['start', 'gen:honingraat:7']) {
    await p.evaluate(a => window.__SC().doAct(a), act); await p.waitForTimeout(800);
    const r = await p.evaluate(() => {
      const S = window.__SC(), c = S.getCells(), out = {};
      for (const I of c.inst || []) { const k = (I.m.cat || '?') + ' | ' + I.m.name; out[k] = (out[k] || 0) + 1; }
      const g = S.people.graph(); const md = [...g.values ? g.values() : g.nodes || []].filter(n => n.kind && n.kind.b === 'mdoor').slice(0, 2).map(n => ({ key: n.key, kind: Object.keys(n.kind), out: n.kind.outside }));
      return { cells: c.size, inst: (c.inst || []).length, out, md, gtype: g.constructor.name, keys: Object.keys(g).slice(0, 8) };
    });
    console.log(act, JSON.stringify(r, null, 1));
  }
  await b.close();
})();
