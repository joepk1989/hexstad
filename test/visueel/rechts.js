const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 1200, height: 700 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const vis = () => p.evaluate(() => ['#menuBtn', '#layerPick', '.actions', '#palette', '#dockM', '#modeBtn', '#keysBtn', '#recklessBtn', '.hud-top'].map(s => { const e = document.querySelector(s); if (!e) return s + ':geen'; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return s + ':' + cs.visibility + '/' + cs.opacity + '/' + (e.hidden ? 'H' : '') + '/' + Math.round(r.x) + ',' + Math.round(r.y) + ',' + Math.round(r.width); }).join('  '));
 console.log('voor', await vis());
 await p.screenshot({ path: OUT + '/rechts0.png', timeout: 120000 });
 await b.close(); })();
