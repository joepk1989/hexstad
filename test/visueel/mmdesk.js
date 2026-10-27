const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1280, height: 800 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 await p.evaluate(() => window.__SC().openSchets()); await p.waitForTimeout(1500);
 const shots = (process.env.TOOLS || 'wall,stair').split(',');
 for (const t of shots) { await p.evaluate(t => { const b = [...document.querySelectorAll('#mm_tools button')].find(x => (x.title || '').toLowerCase().startsWith({ wall: 'muur', stair: 'trap (t)', ustair: 'bordestrap', floor: 'vloer' }[t] || t)); b && b.click(); }, t); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/mmdesk_' + t + '.png', timeout: 120000 }); }
 console.log(await p.evaluate(() => [...document.querySelectorAll('#mm_tools button, #mm_edit button, #mm_view button')].map(b => b.title.split(':')[0]).join(' | ')));
 await b.close(); })();
