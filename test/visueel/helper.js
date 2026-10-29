// Gedeelde hulp voor de visuele tests: start de gebouwde site (`node build.js --site`) in een headless Chromium,
// met three.js r128 lokaal (de CDN is in de sandbox niet bereikbaar). Eenmalig: `cd test && npm i three@0.128.0 playwright`.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const OUT = process.env.UIT || path.join(__dirname, 'uit');
fs.mkdirSync(OUT, { recursive: true });
async function open(viewport, opts = {}) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport, ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('FOUT', e.message));
  await p.route('**/three.min.js', r => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(require.resolve('three/build/three.min.js', { paths: [path.join(ROOT, 'test')] })) }));
  await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('file://' + path.join(ROOT, 'site/index.html')); await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelector('#welcomeGo')?.click()); await p.waitForTimeout(300);
  await p.evaluate(() => window.__SC().doAct('start'));   // het startstadje: rotonde met drie wegen
  await p.evaluate(() => { const S = window.__SC(); S.collapse.setOn(true); S.cars.setGore(true); });   // tests: instorten en bloed aan (in het spel standaard uit)
  return { b, p };
}
const click = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);
module.exports = { open, click, OUT };
