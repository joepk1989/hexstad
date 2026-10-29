// Beta: versie, feedback, credits, foutmelding, stad als bestand, standaardinstellingen, uitleg bij knoppen
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const { OUT } = require('./helper');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const ctx = await b.newContext({ viewport: { width: 1200, height: 800 }, acceptDownloads: true }); const p = await ctx.newPage();
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('three/build/three.min.js', { paths: [path.join(__dirname, '..')] })) }));
 await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
 await p.goto('file://' + path.resolve(__dirname, '../../site/index.html')); await p.waitForTimeout(2500);
 await p.screenshot({ path: OUT + '/beta_welkom.png' });
 await p.evaluate(() => document.querySelector('#welcomeGo')?.click()); await p.waitForTimeout(400);
 const def = await p.evaluate(() => { const S = window.__SC(); return { instorten: S.collapse.on, bloed: S.cars.gore, chaos: document.getElementById('recklessBtn').getAttribute('aria-pressed'), versie: document.querySelector('#sheet .ver').textContent, tipSpoor: document.getElementById('tool-spoor').title, tipTab: document.querySelector('.pal-tab').title }; });
 console.log(JSON.stringify(def));
 await p.evaluate(() => document.getElementById('menuBtn').click()); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/beta_menu.png' });
 // stad als bestand
 const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => document.querySelector('[data-act=savefile]').click())]);
 const fp = OUT + '/' + dl.suggestedFilename(); await dl.saveAs(fp); console.log('bestand', dl.suggestedFilename(), fs.statSync(fp).size, 'bytes');
 await p.evaluate(() => window.__SC().doAct('empty')); await p.waitForTimeout(500);
 const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.evaluate(() => { document.getElementById('menuBtn').click(); document.querySelector('[data-act=openfile]').click(); })]);
 await fc.setFiles(fp); await p.waitForTimeout(2000);
 console.log('geopend', JSON.stringify(await p.evaluate(() => { const c = window.__SC().getCells(); return { vakken: c.size, modules: (c.inst || []).length, wegen: (c.paths || []).length }; })));
 // feedback en credits
 await p.evaluate(() => { document.getElementById('menuBtn').click(); document.querySelector('[data-act=feedback]').click(); }); await p.waitForTimeout(400);
 console.log('feedback', JSON.stringify(await p.evaluate(() => ({ info: document.getElementById('fbInfo').textContent, link: document.getElementById('fbGo').href.slice(0, 60) }))));
 await p.screenshot({ path: OUT + '/beta_feedback.png' });
 await p.evaluate(() => { document.querySelector('#fbSheet [data-close]').click(); document.getElementById('menuBtn').click(); document.querySelector('[data-act=credits]').click(); }); await p.waitForTimeout(400);
 await p.screenshot({ path: OUT + '/beta_credits.png' });
 // een fout in het spel: melding, en het spel loopt door
 await p.evaluate(() => document.querySelector('#crSheet [data-close]').click()); await p.addScriptTag({ content: "setTimeout(() => { throw new Error('testfout'); }, 10);" }); await p.waitForTimeout(800);
 const f1 = await p.evaluate(() => ({ melding: !document.querySelector('.err-bar').hidden, n: document.querySelectorAll('.err-bar').length, zicht: getComputedStyle(document.querySelector('.err-bar')).display }));
 console.log('pageerrors', errs);
 const t0 = await p.evaluate(() => window.__SC().people.agents.length);
 await p.screenshot({ path: OUT + '/beta_fout.png' });
 console.log('fout', JSON.stringify(f1), 'pagina-fouten', errs.filter(e => !/testfout/.test(e)));
 await b.close(); })();
