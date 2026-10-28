// Tekening (uit de gegevens) van het einde van een rechte trap: vloerdriehoeken, gat, trap en bordes
const { open, OUT } = require('./helper');
(async () => { const { b, p } = await open({ width: 900, height: 700 });
 const tag = process.argv[2] || 'x', nm = process.argv[3] || 'Winkelcentrum · klein';
 const svg = await p.evaluate(nm => { const X = window.__mv2, m = window.__mods.find(m => m.name.startsWith(nm)), ts = 2.25;
   let li = -1, S = null; for (let l = 0; l < m.lv.length; l++) { const s = m.lv[l].s.find(s => !s.k || s.k === 'stair' || s.k === 'esc' || s.k === 'ramp'); if (s) { li = l; S = s; break; } }
   const D = X.MV2.DIR6[S.d], a = X.mv2P(S.a[0], S.a[1], ts), dx = D[0] * ts * Math.sqrt(3) / 2, dz = D[0] * ts / 2 + D[1] * ts, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, nx = -uz, nz = ux, len = S.n * ts, w = S.w || 1.2, off = S.off || 0;
   const at = (al, lat) => [a[0] + ux * al + nx * (lat + off), a[1] + uz * al + nz * (lat + off)], end = at(len, 0);
   const polys = X.mv2FloorPolys(m, li + 1, ts), hole = X.mv2StairHole(S, ts), cut = [ux, uz, a[0] * ux + a[1] * uz + len];
   const fill = []; for (const id in m.lv[li + 1].f) { const [i, j, t] = id.split(',').map(Number), v = X.mv2TriVerts(i, j, t, ts), h = hole(v); if (!h || h.keep) continue; const pl = []; const f = q => q[0] * cut[0] + q[1] * cut[1] - cut[2]; for (let k = 0; k < 3; k++) { const A = v[k], B = v[(k + 1) % 3], fa = f(A), fb = f(B); if (fa >= 0) pl.push(A); if ((fa >= 0) !== (fb >= 0)) { const s = fa / (fa - fb); pl.push([A[0] + (B[0] - A[0]) * s, A[1] + (B[1] - A[1]) * s]); } } if (pl.length >= 3) fill.push(pl); }
   const sc = 70, W = 900, H = 700, T = q => [(q[0] - end[0]) * sc + W / 2, (q[1] - end[1]) * sc + H / 2], pth = pts => pts.map((q, i) => (i ? 'L' : 'M') + T(q).map(v => v.toFixed(1)).join(',')).join('') + 'Z';
   let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#1d231a"/>`;
   for (const P of polys) o += `<path d="${pth(P.v)}" fill="${P.part ? '#c9a24a' : '#d9dccf'}" stroke="#7d8573" stroke-width="1"/>`;
   for (const F of fill) o += `<path d="${pth(F)}" fill="#e2a13a" stroke="#8a5a10" stroke-width="2"/>`;
   const N = 16; for (let s2 = 0; s2 < N; s2++) { const r = [at(s2 * len / N, -w / 2), at((s2 + 1) * len / N, -w / 2), at((s2 + 1) * len / N, w / 2), at(s2 * len / N, w / 2)]; o += `<path d="${pth(r)}" fill="#5c87b8" stroke="#22364d" stroke-width="1"/>`; }
   o += `<text x="12" y="24" fill="#fff" font-family="sans-serif" font-size="16">${nm} · grijs: vloer, geel: afgeknipt vloerstuk, blauw: treden, oranje: bordes</text></svg>`;
   return o; }, nm);
 require('fs').writeFileSync(OUT + `/trapeind_${tag}.svg`, svg);
 await p.setContent(svg); await p.screenshot({ path: OUT + `/trapeind_${tag}.png` });
 await b.close(); })();
