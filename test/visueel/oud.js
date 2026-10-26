const { open } = require('./helper');
(async () => {
  const { b, p } = await open({ width: 600, height: 400 });
  const r = await p.evaluate(() => { const S = window.__SC(); const mods = S.libStandard().map(m => [m.name, m.cat, (m.lv || []).length]); return { keys: Object.keys(S).join(','), mods }; });
  console.log(r.keys); console.log(JSON.stringify(r.mods));
  await b.close();
})();
