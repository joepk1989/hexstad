// Bouwt dist/raatstad.html uit src/: één bestand, precies zoals de gepubliceerde versie.
const fs = require('fs'), path = require('path');
const root = __dirname, src = p => fs.readFileSync(path.join(root, 'src', p), 'utf8');
const js = fs.readdirSync(path.join(root, 'src/js')).filter(f => f.endsWith('.js')).sort().map(f => src('js/' + f).replace(/\n$/, '')).join('\n');
// Syntaxcontrole vóór het schrijven: een kapotte pagina laadt anders helemaal niet
try { new Function('(() => {\n' + js + '\n})();'); } catch (e) { console.error('Syntaxfout in de code: ' + e.message); process.exit(1); }
const html = src('index.html').replace('/*__CSS__*/', src('style.css').replace(/\n$/, '')).replace('/*__JS__*/', js).replace('/*__VERSIE__*/', (() => { let h = ''; try { h = require('child_process').execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch (e) { } const d = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); return d + (h ? ' · ' + h : ''); })());
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/raatstad.html'), html);
for (const f of fs.readdirSync(path.join(root, 'assets'))) fs.copyFileSync(path.join(root, 'assets', f), path.join(root, 'dist', f));
console.log('dist/raatstad.html', html.split('\n').length, 'regels');
// --site: een volledige pagina voor GitHub Pages (de artifact-versie krijgt de omhulling van de publicatie zelf).
// Zonder doctype, charset en viewport toont een telefoon de pagina als een uitgezoomde desktoppagina.
if (process.argv.includes('--site')) {
  const site = '<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="theme-color" content="#1d2a33">\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
  fs.mkdirSync(path.join(root, 'site'), { recursive: true });
  fs.writeFileSync(path.join(root, 'site/index.html'), site);
  for (const f of fs.readdirSync(path.join(root, 'assets'))) fs.copyFileSync(path.join(root, 'assets', f), path.join(root, 'site', f));
  console.log('site/index.html (volledige pagina voor GitHub Pages)');
}
