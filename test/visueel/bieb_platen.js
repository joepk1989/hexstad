// Overzichtsplaten: per categorie een raster van 3D-miniaturen (mv2Thumb) met de naam eronder → uit/bieb_<cat>.png
const { open, OUT } = require('./helper'); const fs = require('fs');
const ONLY = process.env.ALLEEN || '', NIEUW = +(process.env.NIEUW || 0);
(async () => {
  const { b, p } = await open({ width: 900, height: 700 });
  const cats = NIEUW ? ['nieuw'] : await p.evaluate(only => [...new Set(window.__mv2.libStandard().filter(m => !only || m.name.includes(only) || m.cat === only).map(m => m.cat))], ONLY);
  for (const cat of cats) {
    const url = await p.evaluate(([cat, only]) => {
      const L = cat === 'nieuw' ? window.__mv2.libStandard().slice(116) : window.__mv2.libStandard().filter(m => m.cat === cat && (!only || m.name.includes(only) || m.cat === only)), C = 5, W = 260, H = 290, rows = Math.ceil(L.length / C);
      const cv = document.createElement('canvas'); cv.width = C * W; cv.height = rows * H + 50; const g = cv.getContext('2d');
      g.fillStyle = '#1b2026'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#f2b233'; g.font = '700 26px sans-serif'; g.fillText(cat + ' · ' + L.length, 16, 34);
      L.forEach((m, i) => { const x = (i % C) * W, y = 50 + Math.floor(i / C) * H; const th = window.__mv2thumb(m, 0, 120); g.drawImage(th, x + 10, y, 240, 240); g.fillStyle = '#eef1ec'; g.font = '14px sans-serif'; const nm = m.name; g.fillText(nm.length > 34 ? nm.slice(0, 33) + '…' : nm, x + 12, y + 262); });
      return cv.toDataURL('image/png');
    }, [cat, ONLY]);
    fs.writeFileSync(OUT + '/bieb_' + cat.toLowerCase() + '.png', Buffer.from(url.split(',')[1], 'base64')); console.log('plaat', cat);
  }
  await b.close();
})();
