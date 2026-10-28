// Raatbouwer: Controleren op alle standaardmodules (moet schoon zijn) en op een kapotte module (moet rood geven)
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.v === 2))); await p.waitForTimeout(1500);
 const r = await p.evaluate(() => { const E = window.__MME, out = []; for (const m of window.__mods.filter(m => m.v === 2)) { E.m = JSON.parse(JSON.stringify(m)); const c = E.checkModule(); const nb = [...c.bad.values()].reduce((s, S) => s + S.size, 0); if (nb || c.marks.length) out.push(m.name + ': ' + nb + ' onbereikbaar' + (c.marks.length ? ' · ' + c.marks.map(k => k.msg).join('; ') : '') + ' [' + [...c.bad.keys()].join(',') + ']'); } return out; });
 console.log('met opmerkingen:', r.length); for (const l of r) console.log('  ' + l);
 // kapot: rijhuis zonder deur, keuken in de muur
 await p.evaluate(() => { const m = JSON.parse(JSON.stringify(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); for (const id in m.lv[0].w) m.lv[0].w[id].o = m.lv[0].w[id].o === 'door' ? '' : m.lv[0].w[id].o; m.lv[0].o.push({ t: 'shelf', x: 7.6, z: 0, rot: Math.PI / 2 }); window.__SC().openSchets(Object.assign(m, { id: 'test' })); });
 await p.waitForTimeout(1200); await p.keyboard.press('Shift+C'); await p.waitForTimeout(600);
 console.log('kapot:', await p.evaluate(() => document.getElementById('mm_msg').textContent));
 await p.screenshot({ path: OUT + '/controle.png', timeout: 120000 });
 await b.close(); })();
