const path = require('path'), fs = require('fs'), { chromium } = require('playwright'), OUT = path.join(__dirname, 'uit'), ROOT = path.resolve(__dirname, '../..');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
 for (const [w, h, n] of [[1100, 760, 'desk'], [390, 800, 'tel']]) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const p = await ctx.newPage();
  await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('three/build/three.min.js', { paths: [path.join(ROOT, 'test')] })) }));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('file://' + path.join(ROOT, 'site/index.html')); await p.waitForTimeout(3500);
  await p.screenshot({ path: OUT + '/welkom_' + n + '.png', timeout: 120000 }); await ctx.close(); }
 await b.close(); })();
