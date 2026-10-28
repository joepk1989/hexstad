// Raatbouwer: keuze spiegelen (M / Shift+M) en materiaal van een keuze wisselen
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const canon = () => p.evaluate(() => { const E = window.__MME; return JSON.stringify(E.m.lv.map(L => ({ f: Object.keys(L.f).sort().map(k => k + '=' + L.f[k]), w: Object.keys(L.w).sort().map(k => k + '=' + JSON.stringify(L.w[k])), s: L.s.map(s => ((s.k === 'spiral' || s.k === 'u') && !s.side ? Object.assign({}, s, { side: 1 }) : s)).map(s => JSON.stringify(Object.keys(s).sort().reduce((a, k) => (a[k] = s[k], a), {}))).sort(), o: L.o.map(o => [o.t, o.x, o.z, Math.round(((o.rot || 0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) * 100) % 628].join()).sort(), r: Object.keys(L.r || {}).sort().map(k => k + '=' + L.r[k]) }))); });
 const tel = () => p.evaluate(() => { const E = window.__MME; return E.m.lv.map(L => [Object.keys(L.f).length, Object.keys(L.w).length, L.s.length, L.o.length, Object.keys(L.r || {}).length].join('/')).join(' '); });
 const bad = () => p.evaluate(() => { const r = window.__MME.checkModule(); let n = 0; for (const v of r.bad.values()) n += v.size || v.length || 0; return n + ' rood, ' + r.marks.length + ' opm'; });
 const names = ['Rijhuis · baksteen · 2L', 'Villa', 'Winkelcentrum', 'Trappenhuis', 'Woontoren', 'Kantoor'];
 for (const nm of names) {
   const ok = await p.evaluate(nm => { const m = window.__mods.find(m => m.name.startsWith(nm)); if (!m) return null; window.__SC().openSchets(m); return m.name; }, nm); if (!ok) { console.log('geen', nm); continue; }
   await p.waitForFunction(() => window.__MME && window.__MME.m); await p.waitForTimeout(700); await p.keyboard.press('KeyV');
   const c0 = await canon(), t0 = await tel(), b0 = await bad(); const res = [];
   const nLv = await p.evaluate(() => window.__MME.m.lv.length);
   for (let lv = 0; lv < nLv; lv++) {
     await p.evaluate(lv => { window.__MME.lv = lv; }, lv);
     await p.keyboard.press('Control+a'); await p.keyboard.press('KeyM'); const tm = await tel(), bm = await bad(); await p.keyboard.press('Control+a'); await p.keyboard.press('KeyM');
     const back = (await canon()) === c0;
     await p.keyboard.press('Control+a'); await p.keyboard.press('Shift+KeyM'); await p.keyboard.press('Control+a'); await p.keyboard.press('KeyM'); const cxz = await canon();
     await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z');
     await p.keyboard.press('Control+a'); for (let i = 0; i < 3; i++) await p.keyboard.press('KeyE'); const crot = await canon(); for (let i = 0; i < 3; i++) await p.keyboard.press('Control+z');
     res.push(`v${lv}: M·M terug ${back} · M+Shift+M = 180° ${cxz === crot} · tellen ${tm === t0 ? 'gelijk' : tm} · controle na M ${bm}`);
   }
   console.log(ok, '| tellen', t0, '| controle', b0); for (const r of res) console.log('   ', r);
   console.log('    na undo terug:', (await canon()) === c0);
 }
 // materiaal wisselen: rijhuis, alles op de begane grond, muren naar hout, vloer naar beton
 await p.evaluate(() => window.__SC().openSchets(window.__mods.find(m => m.name.startsWith('Rijhuis · baksteen · 2L')))); await p.waitForTimeout(900);
 await p.keyboard.press('KeyV'); await p.evaluate(() => { window.__MME.lv = 0; }); await p.keyboard.press('Control+a'); await p.waitForTimeout(200);
 const subs = await p.evaluate(() => [...document.querySelectorAll('#mm_sw .mm-sub')].map(d => d.textContent));
 await p.evaluate(() => { const bs = [...document.querySelectorAll('#mm_sw button')]; bs.find(x => x.textContent === 'Hout').click(); });
 await p.waitForTimeout(200); await p.evaluate(() => { const bs = [...document.querySelectorAll('#mm_sw button')]; bs.find(x => x.textContent === 'Beton').click(); }); await p.waitForTimeout(300);
 console.log('materiaal', JSON.stringify(subs), await p.evaluate(() => { const L = window.__MME.m.lv[0]; return JSON.stringify({ w: [...new Set(Object.values(L.w).map(w => w.m))], f: [...new Set(Object.values(L.f))], open: Object.values(L.w).filter(w => w.o).length }); }), await p.evaluate(() => document.getElementById('mm_msg').textContent));
 await p.keyboard.press('Digit3'); await p.waitForTimeout(1200);
 await p.screenshot({ path: OUT + '/kies_materiaal.png', timeout: 120000 });
 await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); await p.keyboard.press('Control+a'); await p.keyboard.press('KeyM'); await p.waitForTimeout(1200);
 await p.screenshot({ path: OUT + '/kies_spiegel.png', timeout: 120000 });
 await b.close(); })();
