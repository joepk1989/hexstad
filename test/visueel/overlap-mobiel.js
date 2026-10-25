// Meet of bedieningselementen op een telefoonscherm over elkaar of buiten beeld liggen, per stand.
// Gebruik: node overlap-mobiel.js 390x844   (ook: 360x640, 320x568, 844x390). Screenshots komen in ./uit
const { open, click, OUT } = require('./helper');
(async () => {
  const [w, h] = (process.argv[2] || '390x844').split('x').map(Number);
  const { b, p } = await open({ width: w, height: h }, { hasTouch: true, isMobile: true });
  for (const mode of ['bouwmodus', 'kijken', 'bouwen', 'hamer']) {
    if (mode !== 'bouwmodus') { if (mode === 'kijken') { await click(p, '#modeBtn'); await p.waitForTimeout(500); } await click(p, `#hands button[data-hand="${mode}"]`); }
    await p.waitForTimeout(600);
    const res = await p.evaluate(() => {
      const sel = ['.hud-left', '#todBtn', '#soundBtn', '#menuBtn', '.dockl .hands', '.rtools', '.catopen', '.hotbar', '.modeswitch', '.layerpick', '.joy', '.jump', '.place', '#perf', '.city-arrow', '.undo', '.aimlbl'];
      const els = []; for (const s of sel) for (const e of document.querySelectorAll(s)) { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden || r.width < 2 || r.height < 2 || +cs.opacity < 0.05) continue; els.push([s, r]); }
      const out = [];
      for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i][1], c = els[j][1], ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top); if (ox > 3 && oy > 3) out.push(`${els[i][0]} x ${els[j][0]} (${Math.round(ox)}x${Math.round(oy)})`); }
      return [...out, ...els.filter(([, r]) => r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1).map(([s]) => s + ' buiten beeld')];
    });
    console.log(`${w}x${h} ${mode}: ${res.join(' | ') || 'ok'}`);
    await p.screenshot({ path: `${OUT}/mobiel-${w}x${h}-${mode}.png` });
  }
  await b.close();
})();
