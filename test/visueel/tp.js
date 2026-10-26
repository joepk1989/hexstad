const { open } = require('./helper');
(async () => { const { b, p } = await open({ width: 600, height: 400 });
 p.on('pageerror', e => console.log('FOUT', e.message));
 const mode = process.env.REK === '0' ? 0 : 1;
 await p.evaluate((m) => { const S = window.__SC(); S.cars.setForce(16); S.cars.setReckless(!!m); S.cars.update(0.05); }, mode);
 const out = await p.evaluate(() => { const S = window.__SC(); const last = new Map(); const ev = []; let n = 0; for (let i = 0; i < 2400; i++) { S.cars.update(0.05); for (const c of S.cars.list) { const l = last.get(c); if (l && !c.fly) { const d = Math.hypot(c.x - l.x, c.z - l.z), lim = Math.max(1.2, l.v * 0.05 * 2.5 + 1); if (d > lim && l.hp > 0) { n++; if (ev.length < 10) ev.push({ d: +d.toFixed(1), v: +l.v.toFixed(1), p: l.persona, kind: l.kind + '>' + c.kind, pathSame: l.path === c.path, crash: l.crash + '>' + !!c.crash, s: +l.s.toFixed(1) + '>' + +c.s.toFixed(1), len: +(l.len).toFixed(1), ghost: l.ghost, why: c.why, lat: c.latCur }); } } last.set(c, { x: c.x, z: c.z, v: c.v, persona: c.persona, kind: c.kind, path: c.path, crash: !!c.crash, s: c.s, len: c.path ? c.path.len : 0, hp: c.hp ?? 100, ghost: c.ghost }); } } return { n, ev }; });
 console.log(out.n); for (const e of out.ev) console.log(JSON.stringify(e));
 await b.close(); })();
