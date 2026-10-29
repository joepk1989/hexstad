// Tabbladen van het palet: gereedschappen plus de modules die erbij horen
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.keyboard.press('Tab'); await p.waitForTimeout(400);
 for (const t of ['Wegen', 'Paden', 'Gebouwen', 'Groen en water', 'Terrein', 'Modules']) {
  if (await p.evaluate(() => document.getElementById('palette').hidden)) { await p.keyboard.press('Tab'); await p.waitForTimeout(400); }
  await p.evaluate(t => [...document.querySelectorAll('.palette .pal-tab')].find(x => x.textContent === t).click(), t); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const ts = document.querySelector('.tool-scroll'); const vis = [...ts.children].filter(x => !x.hidden && x.offsetParent); return { tools: vis.filter(x => x.classList.contains('tool') && !x.classList.contains('modcard')).map(x => x.textContent.trim()).join(', '), seps: vis.filter(x => x.classList.contains('modcard-sep')).map(x => x.textContent).join(' / '), mods: vis.filter(x => x.classList.contains('modcard') && !x.classList.contains('add')).length }; });
  console.log(t.padEnd(15), JSON.stringify(r).slice(0, 400));
  if (t === 'Gebouwen') { await p.screenshot({ path: OUT + '/tab_gebouwen.png' });
    await p.evaluate(() => [...document.querySelectorAll('.tool-scroll .modcard')].find(x => /Villa/.test(x.title)).click()); await p.waitForTimeout(300);
    console.log('na kiezen villa: tab', await p.evaluate(() => document.querySelector('.pal-tab[aria-pressed="true"]').textContent)); }
 }
 console.log('fouten', JSON.stringify(errs));
 await b.close(); })();
