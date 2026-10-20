// Bouwt dist/hexstad.html uit src/: één bestand, precies zoals de gepubliceerde versie.
const fs = require('fs'), path = require('path');
const root = __dirname, src = p => fs.readFileSync(path.join(root, 'src', p), 'utf8');
const js = fs.readdirSync(path.join(root, 'src/js')).filter(f => f.endsWith('.js')).sort().map(f => src('js/' + f).replace(/\n$/, '')).join('\n');
const html = src('index.html').replace('/*__CSS__*/', src('style.css').replace(/\n$/, '')).replace('/*__JS__*/', js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/hexstad.html'), html);
for (const f of fs.readdirSync(path.join(root, 'assets'))) fs.copyFileSync(path.join(root, 'assets', f), path.join(root, 'dist', f));
console.log('dist/hexstad.html', html.split('\n').length, 'regels');
