// Seed-lus voor de stadsgenerator: bouwt per indeling en seed een stad en meldt gebouwen zonder deur of zonder stoep naar de deur.
// Gebruik: node test/visueel/generator.js [aantalSeeds=5]   (eerst: node build.js --site)
const { open } = require('./helper');
(async () => {
  const N = +process.argv[2] || 5, { b, p } = await open({ width: 800, height: 600 });
  let bad = 0;
  for (const lay of ['dorp', 'rotonde', 'kruis', 'ring']) for (let s = 1; s <= N; s++) {
    await p.evaluate(([l, s]) => window.__SC().doAct('gen:' + l + ':' + s), [lay, s]); await p.waitForTimeout(5000);
    const r = await p.evaluate(() => {
      const S = window.__SC(), g = S.people.graph(), c = S.getCells();
      const doors = [...g.values()].filter(n => n.kind && (n.kind.b === 'mdoor' || n.kind.b === 'door') && n.yr <= 0.41);
      const linked = d => [...d.edges.values()].some(e => e.vecDoor);
      const by = new Map(); for (const d of doors) { const k = Math.round(d.q) + ',' + Math.round(d.r); (by.get(k) || by.set(k, []).get(k)).push(d); }
      const rep = c.inst.map(I => { const L = by.get(I.q + ',' + I.r) || []; return { n: I.m.name, at: I.q + ',' + I.r, d: L.length, l: L.filter(linked).length }; });
      return { total: rep.length, nodoor: rep.filter(x => !x.d).map(x => x.n + '@' + x.at), unreach: rep.filter(x => x.d && !x.l).map(x => x.n + '@' + x.at) };
    });
    const gebouw = x => /^(Rijhuis|Stadswoning|Winkel|Horeca|Kantoor|Bibliotheek)/.test(x), tuin = r.unreach.filter(x => !gebouw(x)).length; r.unreach = r.unreach.filter(gebouw); const f = r.unreach.length; bad += f;
    console.log(lay, s, 'modules', r.total, 'onbereikbare gebouwen', f, '(tuinen/parken met losse deur genegeerd:', tuin + ')', f ? r.unreach.join(' ') : '');
  }
  console.log('totaal onbereikbaar:', bad); await b.close();
})();
