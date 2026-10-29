// Bestaande speler: de nieuwe bibliotheek (lib10) komt erbij, eigen aanpassingen blijven, geplaatste exemplaren krijgen de nieuwe versie
const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 800, height: 600 });
 await p.evaluate(() => { const L = JSON.parse(localStorage.getItem('raatstad-modules'));
   const extra = new Set(window.__mv2.libStandard().slice(116).map(m => m.name.replace(/( · \d+[Lv])+$/, '')));
   const old = L.filter(m => !extra.has((m.name || '').replace(/( · \d+[Lv])+$/, ''))).map(m => { const c = JSON.parse(JSON.stringify(m)); delete c.lib; return c; });
   const ed = old.find(m => m.name.startsWith('Rijhuis · wit')); ed._sig = 123; ed.lv[0].o = [{ t: 'tree', x: 0, z: 0, rot: 0 }];   // zelf aangepast
   const rh = old.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')); rh.lv[0].o = [];   // oude versie zonder inrichting
   localStorage.setItem('raatstad-modules', JSON.stringify(old)); localStorage.removeItem('raatstad-lib10');
   // een opgeslagen stad met een oud exemplaar van het rijhuis
   window.__rhId = rh.id; localStorage.setItem('test-rh', rh.id); });
 await p.reload(); await p.waitForTimeout(3000);
 const r = await p.evaluate(() => { const L = window.__mods, rh = L.find(m => m.id === localStorage.getItem('test-rh')), ed = L.find(m => m.name.startsWith('Rijhuis · wit'));
   return { aantal: L.length, nieuw: L.filter(m => /Tankstation|Watertoren|Roltrap/.test(m.name)).length, rijhuisInrichting: rh && rh.lv[0].o.map(o => o.t).join(','), rijhuisLib: rh && rh.lib, eigenBlijft: ed && ed.lv[0].o.length === 1 && ed._sig === 123, toast: document.getElementById('toast').textContent }; });
 console.log(JSON.stringify(r)); await b.close(); })();
