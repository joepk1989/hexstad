  // ---------- Raatbouwer (vroeger module maker / schets): teken gebouwen en pleinen per verdieping, met gereedschap zoals in SketchUp ----------
  // Bovenaanzicht op het fijne driehoekraster. Vloer schilder je per driehoek, muren trek je langs de ribben van het
  // raster, een deur, raam of poort zet je in een muur, een trap of helling trek je van een rasterpunt in een van zes
  // richtingen. Voorwerpen zet je als laatste neer. Elke verdieping is 3 m; je wisselt met ▲ ▼. De 3D-weergave gebruikt
  // dezelfde bouwer als de stad, dus wat je ziet is wat je krijgt.
  (() => {
    const app = document.getElementById('mmApp'); if (!app) return;
    const $ = id => document.getElementById('mm_' + id);
    { const sb = document.getElementById('mm_sheet'), sd = document.getElementById('mm_side');   // op de telefoon: de zijbalk is een uitklapbaar paneel onderin
      if (sb && sd) sb.addEventListener('click', () => { const o = !sd.classList.contains('mm-open'); sd.classList.toggle('mm-open', o); sb.setAttribute('aria-expanded', String(o)); window.dispatchEvent(new Event('resize')); }); }
    const cv = $('cv'), ctx = cv.getContext('2d'), cv3 = $('cv3'), stage = $('stage');
    const E = window.__MME = { m: null, lv: 0, tool: 'wall', wmat: 'brick', fmat: 'paver', open: 'door', obj: 'tree', skind: 'stair', brush: 'hex', view: { x: 0, z: 0, s: 14 }, vm: '3d', th: 0.6, ph: 0.85, upto: true, undo: [], redo: [], hover: null, drag: null, editing: -1, dirty: false, pan: null };
    let W = 0, H = 0, dpr = 1, drawReq = false, msgT = 0;
    // Bevestigen met een tweede klik (een venster als confirm() werkt niet overal, bijvoorbeeld in een ingesloten pagina)
    let sureKey = null, sureT = 0;
    const sure = (key, msg) => { const now = performance.now(); if (sureKey === key && now - sureT < 4000) { sureKey = null; return true; } sureKey = key; sureT = now; say(msg + ' · klik nog eens om te bevestigen', 4000); return false; };
    const say = (t, ms = 1800) => { $('msg').textContent = t; clearTimeout(msgT); if (ms) msgT = setTimeout(() => { $('msg').textContent = ''; }, ms); };
    // ---------- gereedschap met iconen ----------
    const I = {
      select: '<path d="M5 3l14 9-6 1.5L16 20l-3 1-3-6.5L5 18z"/>',
      hand: '<path d="M8 11V5a1.5 1.5 0 013 0v6M11 10V4a1.5 1.5 0 013 0v7M14 10.5V6a1.5 1.5 0 013 0v8c0 4-2.5 7-6 7s-5-2-7-6l-1.5-3a1.5 1.5 0 012.5-1.5L8 13"/>',
      floor: '<path d="M4 18L12 5l8 13z" fill="currentColor" stroke="none" opacity=".35"/><path d="M4 18L12 5l8 13z"/>',
      wall: '<path d="M3 8h18M3 12h18M3 16h18M8 8v4M14 8v4M11 12v4M17 12v4M5 12v4M3 6v12M21 6v12"/>',
      door: '<path d="M6 21V4h12v17M6 21h12M18 4a14 14 0 00-12 12"/>',
      window: '<path d="M5 5h14v14H5zM12 5v14M5 12h14"/>',
      gate: '<path d="M4 21V11a8 8 0 0116 0v10M4 21h16M8 21v-9M16 21v-9"/>',
      open: '<path d="M3 12h3M9 12h2M14 12h2M19 12h2M3 6v12M21 6v12" stroke-dasharray="none"/>',
      close: '<path d="M3 12h18M3 7v10M21 7v10"/>',
      stair: '<path d="M3 20h4v-4h4v-4h4V8h4V4"/>',
      spiral: '<path d="M12 12m-1.5 0a1.5 1.5 0 1 1 3 0a3.5 3.5 0 1 1-7 0a5.5 5.5 0 1 1 11 0a7.5 7.5 0 0 1-7.5 7.5"/>',
      ustair: '<path d="M4 21V5h7v16M13 21V5h7v16M4 5h16"/><path d="M4 9h7M4 13h7M4 17h7M13 9h7M13 13h7M13 17h7" opacity=".55"/>',
      ramp: '<path d="M3 20h18L21 6zM3 20V14"/>',
      roof: '<path d="M3 12l9-8 9 8M6 10v10h12V10"/>',
      object: '<path d="M12 21v-5M12 16c-4 0-6-2.5-6-5.5S9 5 12 3c3 2 6 4.5 6 7.5S16 16 12 16z"/>',
      erase: '<path d="M4 15l9-9 6 6-6 6H8zM13 21h8M6 13l5 5"/>',
      fill: '<path d="M5 11l7-7 7 7-7 7zM12 4V2M19 11c0 2 2 3 2 5a2 2 0 01-4 0c0-2 2-3 2-5z"/><path d="M5 11h14" opacity=".5"/>',
      room: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 7l4.3 2.5v5L12 17l-4.3-2.5v-5z" opacity=".5"/>',
      undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3"/>',
      redo: '<path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3"/>',
      v2d: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>',
      v3d: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
      upto: '<path d="M4 18h16M4 13h10M4 8h6M18 8l-3 3M18 8l3 3M18 8v6"/>',
      copyUp: '<path d="M5 20h14M5 15h14M12 11V3M8 7l4-4 4 4"/>',
      check: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M8.4 12.2l2.6 2.6 4.8-5.2"/>',
      zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5M11 8v6M8 11h6"/>',
      zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5M8 11h6"/>',
      fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
      brush: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 12l7.8-4.5M12 12v9M12 12L4.2 7.5" opacity=".5"/>',
      hexramp: '<path d="M3 17L21 7v10z"/><path d="M3 17h18M7 15l10-5" opacity=".5"/><path d="M5 12l4-2M9 10l-1 3" opacity=".8"/>',
      grid: '<path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>',
    };
    const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
    const TOOLS = [
      ['select', 'Kiezen (V): klik of sleep een rechthoek; sleep om te verplaatsen, Q/E draait, Ctrl+C/V kopieert', 'V'], ['hand', 'Schuiven (H)', 'H'],
      ['floor', 'Vloer (F): schilder driehoeken; rechtermuisknop wist', 'F'], ['fill', 'Vullen (G): vult een ruimte tot aan de muren met vloer; rechtermuisknop maakt leeg', 'G'], ['wall', 'Muur (W): sleep van punt naar punt langs het raster', 'W'], ['room', 'Kamer (M): muren rondom een heel vak', 'M'],
      ['door', 'Deur (D): klik op een muur', 'D'], ['window', 'Raam (R): klik op een muur', 'R'], ['gate', 'Poort (P): klik op een muur', 'P'], ['open', 'Open doorgang (O): klik op een muur', 'O'], ['close', 'Dicht (C): klik op een muur om de opening weg te halen', 'C'],
      ['stair', 'Trap (T): sleep van onderaan omhoog, in een van zes richtingen', 'T'], ['ustair', 'Bordestrap (U): sleep de eerste steek; op het bordes keer je en loopt de tweede steek ernaast terug omhoog', 'U'], ['spiral', 'Wenteltrap (J): klik op een rasterpunt (het midden van de trap); sleep naar de kant waar je onderaan instapt', 'J'], ['ramp', 'Helling (L): sleep van onderaan omhoog', 'L'], ['hexramp', 'Schans (S): het hele vak wordt een helling naar de verdieping erboven; klik bij de zijde waar je onderaan instapt', 'S'],
      ['roof', 'Dak (K): klik op een vak; nog eens voor een plat dak, nog eens om weg te halen', 'K'], ['object', 'Voorwerp (B): klik om neer te zetten; klik erop om te draaien', 'B'],
      ['erase', 'Gum (X): haalt weg wat eronder ligt', 'X'],
    ];
    { const vw = $('view'), st = $('stage'); if (vw && st) { vw.classList.add('mm-viewtools'); st.appendChild(vw); } }
    const toolBtns = {};
    // korte naam onder elk icoon, en groepen (kiezen · vloer · muren en openingen · trappen · dak en voorwerpen · gum)
    const SHORT = { select: 'Kies', hand: 'Schuif', floor: 'Vloer', fill: 'Vul', wall: 'Muur', room: 'Kamer', door: 'Deur', window: 'Raam', gate: 'Poort', open: 'Open', close: 'Dicht', stair: 'Trap', ustair: 'Bordes', spiral: 'Wentel', ramp: 'Helling', hexramp: 'Schans', roof: 'Dak', object: 'Ding', erase: 'Gum' };
    const GROUP_START = new Set(['floor', 'wall', 'stair', 'roof', 'erase']);
    for (const [k, title, key] of TOOLS) {
      if (GROUP_START.has(k)) { const s = document.createElement('span'); s.className = 'mm-sep'; s.setAttribute('aria-hidden', 'true'); $('tools').appendChild(s); }
      const b = document.createElement('button'); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title.split(':')[0]); b.innerHTML = svg(k) + `<kbd>${key}</kbd><span class="lab">${SHORT[k] || ''}</span>`; b.addEventListener('click', () => setTool(k)); $('tools').appendChild(b); toolBtns[k] = b; }
    const mkBtn = (host, k, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.title = title; b.innerHTML = svg(k); b.addEventListener('click', fn); $(host).appendChild(b); return b; };
    const bUndo = mkBtn('edit', 'undo', 'Ongedaan maken (Ctrl+Z)', () => undo()), bRedo = mkBtn('edit', 'redo', 'Opnieuw (Ctrl+Y)', () => redo());
    const BRUSHES = [['hex', 'zeshoek van 6 driehoeken'], ['tri', 'één driehoek'], ['cell', 'heel vak'], ['core', 'kern van het vak (¾)'], ['ring', 'rand van het vak (galerij, 1,95 m)']];
    const bBrush = mkBtn('edit', 'brush', 'Penseel (N): zeshoek · driehoek · heel vak · kern · rand', () => { const i = BRUSHES.findIndex(b => b[0] === E.brush); E.brush = BRUSHES[(i + 1) % BRUSHES.length][0]; bBrush.setAttribute('aria-pressed', String(E.brush !== 'tri')); say('Penseel: ' + BRUSHES.find(b => b[0] === E.brush)[1], 1200); }); bBrush.setAttribute('aria-pressed', 'true');
    // driehoeken van het penseel rond (x, z): zeshoek rond het rasterpunt, één driehoek, of (delen van) het vak
    function brushTris(x, z) {
      if (E.brush === 'hex') return around(...vertexAt(x, z)); if (E.brush === 'tri') return [triAt(x, z)];
      const [q, r] = cellAt(x, z), c = mv2CellXZ(q, r), t = ts(), out = [], iM = Math.ceil(R / (t * SQ3 / 2)) + 2, jM = Math.ceil(R / t) + iM;
      const ci = Math.round(c[0] / (t * SQ3 / 2)), cj = Math.round(c[1] / t - ci / 2);
      const inHex = (px, pz, rad) => { for (const f of FRAMES) if ((px - c[0]) * f.nx + (pz - c[1]) * f.nz > rad + 1e-6) return false; return true; };
      for (let i = ci - iM; i <= ci + iM; i++) for (let j = cj - jM; j <= cj + jM; j++) for (const tt of [0, 1]) { const v = mv2TriVerts(i, j, tt, t), px = (v[0][0] + v[1][0] + v[2][0]) / 3, pz = (v[0][1] + v[1][1] + v[2][1]) / 3; if (!inHex(px, pz, INNER)) continue; const core = inHex(px, pz, INNER * 0.75); if (E.brush === 'cell' || (E.brush === 'core' ? core : !core)) out.push([i, j, tt]); }
      return out;
    }
    mkBtn('edit', 'copyUp', 'Verdieping kopiëren naar de verdieping erboven', () => copyUp());
    mkBtn('edit', 'check', 'Controleren: kun je overal komen, komen trappen uit, staan voorwerpen goed? (Shift+C)', () => runCheck());
    const b2d = mkBtn('view', 'v2d', 'Bovenaanzicht (2)', () => setView('2d')), b3d = mkBtn('view', 'v3d', '3D (3): teken op de verdieping waar je bent; draaien met de middelste muisknop, Alt of het handje, schuiven met Shift', () => setView('3d'));
    const bUpto = mkBtn('view', 'upto', 'In 3D alleen tot en met de huidige verdieping tonen', () => { E.upto = !E.upto; bUpto.setAttribute('aria-pressed', String(E.upto)); dirty3(); });
    mkBtn('view', 'zoomIn', 'Inzoomen', () => zoom(1.25)); mkBtn('view', 'zoomOut', 'Uitzoomen', () => zoom(0.8)); mkBtn('view', 'fit', 'Passend maken', () => fit());
    function setTool(k) { if (k !== 'select') { E.sel = null; E.paste = false; } E.tool = k; for (const t in toolBtns) toolBtns[t].setAttribute('aria-pressed', String(t === k)); E.drag = null; renderCtx(); cv.style.cursor = k === 'hand' ? 'grab' : k === 'select' ? 'default' : 'crosshair'; draw(); }
    function setView(v) { E.vm = v; b2d.setAttribute('aria-pressed', String(v === '2d')); b3d.setAttribute('aria-pressed', String(v === '3d')); cv3.style.display = v === '3d' ? 'block' : 'none'; if (v === '3d') { ensure3(); camSync(); rebuild3(); } draw(); }
    // ---------- raster ----------
    const ts = () => mv2Ts(E.m);
    const P = (i, j) => mv2P(i, j, ts());
    const triAt = (x, z) => { const t = ts(), fi = x / (t * SQ3 / 2), fj = z / t - fi / 2, i = Math.floor(fi), j = Math.floor(fj); return [i, j, (fi - i) + (fj - j) < 1 ? 0 : 1]; };
    function vertexAt(x, z) {
      const t = ts(), fi = x / (t * SQ3 / 2), fj = z / t - fi / 2; let b = null;
      for (let a = 0; a <= 1; a++) for (let c = 0; c <= 1; c++) { const i = Math.floor(fi) + a, j = Math.floor(fj) + c, p = P(i, j), d = Math.hypot(p[0] - x, p[1] - z); if (!b || d < b.d) b = { i, j, d }; }
      return [b.i, b.j];
    }
    const around = (i, j) => [[i, j, 0], [i - 1, j, 0], [i, j - 1, 0], [i - 1, j, 1], [i, j - 1, 1], [i - 1, j - 1, 1]];
    const centroid = ([i, j, t]) => { const v = mv2TriVerts(i, j, t, ts()); return [(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3]; };
    const inArea = (x, z) => mv2InArea(E.m, x, z);
    const okTri = id => { const c = centroid(id); return inArea(c[0], c[1]); };
    const wallKey = (i, j, d) => i + ',' + j + ',' + d;
    const segOf = (i, j, d) => { const D = MV2.DIRW[d]; return [P(i, j), P(i + D[0], j + D[1])]; };
    // ribben tussen twee rasterpunten op één lijn (richting d12, n stappen): 0–5 langs het raster, 6–11 haaks erop
    function segsBetween(a, d12, n) {
      const out = [], D = MV2.DIR12[d12]; let [i, j] = a;
      const k = d12 < 6 ? d12 % 3 : 3 + (d12 - 6) % 3, fw = d12 < 6 ? d12 < 3 : d12 < 9;
      for (let s = 0; s < n; s++) { const ni = i + D[0], nj = j + D[1]; out.push(fw ? [i, j, k] : [ni, nj, k]); i = ni; j = nj; }
      return out;
    }
    // vanuit rasterpunt a naar punt (x, z): beste richting en het aantal stappen. Muren: twaalf richtingen (elke 30°,
    // dus ook haaks op elkaar); trappen: de zes langs het raster
    function dirSteps(a, x, z, twelve) {
      const p = P(a[0], a[1]); let best = null;
      for (let d = 0; d < (twelve ? 12 : 6); d++) { const D = MV2.DIR12[d], q = P(a[0] + D[0], a[1] + D[1]), ux = q[0] - p[0], uz = q[1] - p[1], l = Math.hypot(ux, uz), al = ((x - p[0]) * ux + (z - p[1]) * uz) / l, lat = Math.abs(((x - p[0]) * -uz + (z - p[1]) * ux) / l); if (al < 0) continue; const sc = lat - al * 0.05; if (!best || sc < best.sc) best = { d, n: Math.max(1, Math.round(al / l)), sc }; }
      return best || { d: 0, n: 1 };
    }
    function nearestWall(x, z, maxD = 0.7) {   // dichtstbijzijnde muurrib op deze verdieping
      const L = lvl(); let best = null;
      for (const id in L.w) { const [i, j, d] = id.split(',').map(Number), [a, b] = segOf(i, j, d), dd = distSeg(x, z, a, b); if (dd < maxD && (!best || dd < best.d)) best = { id, d: dd }; }
      return best;
    }
    const distSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(a[0] + t * dx - x, a[1] + t * dz - z); };
    function stairAt(x, z) {
      const L = lvl();
      for (let s = L.s.length - 1; s >= 0; s--) { const S = L.s[s], g = stairGeom(S); if (inPoly(x, z, g.poly)) return s; }
      return -1;
    }
    // trapbreedte in rijen van het fijne driehoekraster (2,25 m zijde): 1 rij = 1,95 m, 2 rijen = 3,9 m
    const STAIR_W = { 1.95: '1 rij · 1,95 m', 3.9: '2 rijen · 3,9 m' };
    const stairW = () => (E.sw === 1.95 || E.sw === 3.9) ? E.sw : 1.95;
    const newStair = D => { const k = E.tool === 'ramp' ? 'ramp' : E.tool === 'ustair' ? 'u' : 'stair', w = k === 'ramp' ? (E.sw || 1.2) : stairW(), S = { a: D.a, d: D.d, n: D.n, w, k };
      if (k === 'u') { S.side = E.usd || 1; S.off = S.side * w / 2; } else if (k === 'stair') { const sd = E.ssd ?? 1; if (sd) S.off = sd * w / 2; }
      return S; };
    const newSpiral = D => ({ a: D.a, d: D.d, n: 1, w: 1.5, k: 'spiral', side: E.wsd || 1 });
    function stairGeom(S) {
      const D = MV2.DIR6[S.d] || MV2.DIR6[0], a = P(S.a[0], S.a[1]), t = ts(), dx = D[0] * t * SQ3 / 2, dz = D[0] * t / 2 + D[1] * t, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, len = (S.n || 1) * t, w = S.w || 1.2;
      const off = S.off || 0, at = (al, lat) => [a[0] + ux * al + nx * (lat + off), a[1] + uz * al + nz * (lat + off)];
      if (S.k === 'hexramp') { const c = mv2CellXZ(S.q || 0, S.r || 0), f = FRAMES[(S.side || 0) % 6], ex = -f.nx, ez = -f.nz, lx = -ez, lz = ex, pt = (u, lat) => [c[0] + ex * u + lx * lat, c[1] + ez * u + lz * lat]; return { a: pt(-INNER, 0), ux: ex, uz: ez, nx: lx, nz: lz, len: 2 * INNER, w: 9, at: (al, lat) => pt(al - INNER, lat), poly: [pt(-INNER, -4.5), pt(0, -9), pt(INNER, -4.5), pt(INNER, 4.5), pt(0, 9), pt(-INNER, 4.5)] }; }
      if (S.k === 'spiral') { const rr = 1.9 / Math.cos(Math.PI / 6), poly = []; for (let i = 0; i < 6; i++) { const an = Math.atan2(uz, ux) + i * Math.PI / 3; poly.push([a[0] + Math.cos(an) * rr, a[1] + Math.sin(an) * rr]); } return { a, ux, uz, nx, nz, len: 1.75, w: 1.5, at, poly, spiral: true, sd: S.side || 1 }; }   // zeshoek om het midden
      if (S.k === 'u') { const sd = S.side || 1, oA = -sd * w / 2, oB = sd * w + sd * w / 2, cut = 2 * w / SQ3; return { a, ux, uz, nx, nz, len, w, at, sd, poly: [at(0, oA), at(0, oB), at(len + 0.25 + cut, oB), at(len + 0.25, oA)] }; }   // twee steken + schuin bordes
      if (S.k === 'stair') return { a, ux, uz, nx, nz, len, w, at, poly: [at(0, -w / 2), at(0, w / 2), at(len, w / 2), at(len + w * SQ3 / 2, 0), at(len, -w / 2)] };   // met driehoekig bordes
      return { a, ux, uz, nx, nz, len, w, at, poly: [at(0, -w / 2), at(0, w / 2), at(len, w / 2), at(len, -w / 2)] };
    }
    // Richting uit het driehoekje onder de muis: om rasterpunt a liggen zes driehoeken (sector d .. d+1, elk 60°). Een trap links van
    // zijn lijn (sd 1) loopt langs de eerste rib van die sector, rechts (sd −1) langs de tweede, zodat de trap altijd over dát driehoekje begint.
    function sectorDir(a, x, z, sd) {
      const p = P(a[0], a[1]), S60 = Math.PI / 3; let ph = Math.atan2(z - p[1], x - p[0]) - Math.PI / 6; ph = ((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const d0 = Math.floor(ph / S60) % 6, fr = ph / S60 - Math.floor(ph / S60);
      return sd > 0 ? d0 : sd < 0 ? (d0 + 1) % 6 : (fr < 0.5 ? d0 : (d0 + 1) % 6);
    }
    const stairSide = () => E.tool === 'ramp' ? 0 : E.tool === 'ustair' ? (E.usd || 1) : E.tool === 'spiral' ? (E.wsd || 1) : (E.ssd ?? 1);
    function hoverStair(x, z) {   // de trap die er komt als je hier klikt (3 zijden lang = één verdieping)
      const a = vertexAt(x, z), d = sectorDir(a, x, z, stairSide());
      return E.tool === 'spiral' ? newSpiral({ a, d }) : newStair({ a, d, n: 3 });
    }
    // welke driehoeken van het raster een (bolle) veelhoek bedekt, met het bedekte deel (0–1) per driehoek
    function clipConvex(subj, clip) {
      let a2 = 0; for (let i = 0; i < clip.length; i++) { const A = clip[i], B = clip[(i + 1) % clip.length]; a2 += A[0] * B[1] - B[0] * A[1]; }
      const sg = a2 >= 0 ? 1 : -1; let out = subj;
      for (let i = 0; i < clip.length && out.length; i++) {
        const A = clip[i], B = clip[(i + 1) % clip.length], f = q => sg * ((B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0])), inp = out; out = [];
        for (let k = 0; k < inp.length; k++) { const C = inp[k], Dd = inp[(k + 1) % inp.length], fc = f(C), fd = f(Dd); if (fc >= 0) out.push(C); if ((fc >= 0) !== (fd >= 0)) { const u = fc / (fc - fd); out.push([C[0] + (Dd[0] - C[0]) * u, C[1] + (Dd[1] - C[1]) * u]); } }
      }
      return out;
    }
    const polyArea = v => { let a2 = 0; for (let i = 0; i < v.length; i++) { const A = v[i], B = v[(i + 1) % v.length]; a2 += A[0] * B[1] - B[0] * A[1]; } return Math.abs(a2) / 2; };
    function coverTris(poly) {
      const t = ts(), triA = t * t * SQ3 / 4, out = []; let i0 = 1e9, i1 = -1e9, j0 = 1e9, j1 = -1e9;
      for (const q of poly) { const fi = q[0] / (t * SQ3 / 2), fj = q[1] / t - fi / 2; i0 = Math.min(i0, fi); i1 = Math.max(i1, fi); j0 = Math.min(j0, fj); j1 = Math.max(j1, fj); }
      for (let i = Math.floor(i0) - 1; i <= Math.ceil(i1) + 1; i++) for (let j = Math.floor(j0) - 1; j <= Math.ceil(j1) + 1; j++) for (let tt = 0; tt < 2; tt++) {
        const v = mv2TriVerts(i, j, tt, t), c = clipConvex(v, poly); if (c.length < 3) continue; const fr = polyArea(c) / triA; if (fr > 0.04) out.push({ id: [i, j, tt], v, fr: Math.min(1, fr) });
      }
      return out;
    }
    // voorwerpen draaien: in stappen van 30° (twaalf richtingen, zoals de muren), of vrij met Ctrl tijdens het slepen
    const ROT_STEP = Math.PI / 6, normRot = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const snapRot = (a, free) => normRot(free ? a : Math.round(a / ROT_STEP) * ROT_STEP), degOf = a => Math.round(normRot(a) * 180 / Math.PI) % 360;
    const aimRot = (ox, oz, x, z, free) => snapRot(Math.atan2(-(x - ox), z - oz), free);   // de voorkant (lokaal +z, in de wereld (−sin, cos)) wijst naar (x, z)
    const snapObj = v => Math.round(v * 4) / 4;
    const OBJ_FOOT = { bench: [1.8, 0.5], shelf: [2.4, 0.5], counter: [2.3, 0.8], bike: [2.4, 0.64], sign: [1.6, 0.12], solar: [3.4, 1.6], container: [2.4, 1.4], goal: [3.7, 1.0], boat: [4.2, 1.7], shelter: [3.0, 1.4], car: [4.3, 1.9], bed: [2.0, 1.6], sofa: [2.1, 0.9], desk: [1.6, 0.8], kitchen: [2.4, 0.65], screen: [6.0, 0.2], swing: [2.7, 1.2] }, OBJ_R = { tree: 1.7, bush: 0.9, lamp: 0.2, pillar: 0.45, table: 1.1, planter: 0.75, fountain: 1.9, bin: 0.25, pump: 0.6, charger: 0.3, turbine: 1.0, chimney: 1.3, grave: 0.5, slide: 1.0, sheep: 0.6 };
    function objectAt(x, z, r = 0.9) { const L = lvl(); let best = -1, bd = r; L.o.forEach((o, i) => { const d = Math.hypot(o.x - x, o.z - z); if (d < bd) { bd = d; best = i; } }); return best; }
    const cellAt = (x, z) => mv2CellOf(x, z);
    const lvl = () => E.m.lv[E.lv];
    // ---------- geschiedenis ----------
    const snap = () => { E.check = null; E.undo.push(JSON.stringify(E.m)); if (E.undo.length > 80) E.undo.shift(); E.redo = []; E.dirty = true; };
    const undo = () => { if (!E.undo.length) return; E.sel = null; E.redo.push(JSON.stringify(E.m)); E.m = mv2Fix(JSON.parse(E.undo.pop())); E.lv = Math.min(E.lv, E.m.lv.length - 1); changed(); say('Ongedaan gemaakt', 900); };
    const redo = () => { if (!E.redo.length) return; E.sel = null; E.undo.push(JSON.stringify(E.m)); E.m = mv2Fix(JSON.parse(E.redo.pop())); E.lv = Math.min(E.lv, E.m.lv.length - 1); changed(); };
    function changed() { bUndo.disabled = !E.undo.length; bRedo.disabled = !E.redo.length; renderLevels(); rebuild3(); draw(); }
    // ---------- verdiepingen ----------
    function renderLevels() { $('lvName').textContent = E.lv === 0 ? 'Begane grond' : E.lv + 'e verdieping'; $('lvUp').disabled = E.lv >= MV2.MAX_LV - 1; $('lvDn').disabled = E.lv === 0; }
    $('lvUp').onclick = () => { if (E.lv >= MV2.MAX_LV - 1) return; E.lv++; while (E.m.lv.length <= E.lv) E.m.lv.push(mv2Level()); changed(); };
    $('lvDn').onclick = () => { if (E.lv === 0) return; const top = E.m.lv.length - 1; E.lv--; if (top > E.lv && isEmptyLevel(E.m.lv[top]) && top === E.m.lv.length - 1 && top > 0) E.m.lv.pop(); changed(); };
    const isEmptyLevel = L => !Object.keys(L.f).length && !Object.keys(L.w).length && !L.s.length && !Object.keys(L.r).length && !L.o.length;
    function copyUp() { snap(); const L = lvl(); while (E.m.lv.length <= E.lv + 1) E.m.lv.push(mv2Level()); const U = E.m.lv[E.lv + 1]; U.f = Object.assign({}, L.f, U.f); U.w = Object.assign({}, JSON.parse(JSON.stringify(L.w)), U.w); E.lv++; changed(); say('Verdieping gekopieerd naar boven'); }
    // ---------- zijpaneel: materiaal of keuze bij het gereedschap ----------
    const COL = { paver: '#8a5141', tile: '#cbc8bd', wood: '#a97c52', carpet: '#8b9397', concrete: '#c4c6c2', grass: '#6fa356', water: '#2d5a66', asphalt: '#3c4045', roof: '#5a5d59',
      brick: '#9a5b45', plaster: '#ece8e0', glass: '#a8cbd8', stone: '#bdb5a5', hedge: '#5a9440', fence: '#3b4248',
      glass: '#bfe0f0', darkbrick: '#3d3a36', panel: '#4b5157', slats: '#a8743f', corten: '#97512e', curtain: '#6d8ea6', parquet: '#9a6a3e', polished: '#c9c8c3', stonetile: '#d9d0bf' };
    const OBJ_GLYPH = { tree: '🌳', bush: '🌿', bench: '🪑', lamp: '💡', pillar: '🏛', table: '☕', planter: '🌷', fountain: '⛲', bin: '🗑', bike: '🚲', shelf: '🗄', counter: '🛒', sign: '🪧', bed: '🛏', sofa: '🛋', desk: '🖥', kitchen: '🍳', screen: '🎬', car: '🚗', pump: '⛽', charger: '🔌', solar: '🔆', turbine: '🌬', chimney: '🏭', container: '♻', goal: '🥅', grave: '🪦', boat: '🛥', shelter: '🚏', slide: '🛝', swing: '🎡', sheep: '🐑' };
    function renderCtx() {
      const sw = $('sw'), title = $('ctxTitle'), hint = $('ctxHint'); sw.innerHTML = '';
      const mk = (items, cur, set, glyph) => { const opt = !glyph && !Object.keys(items).some(k => COL[k]); let host = sw; if (opt) { host = document.createElement('div'); host.className = 'mm-opts'; host.setAttribute('role', 'group'); sw.appendChild(host); }   // keuzes zonder kleur: een rij keuzeknoppen
        for (const k in items) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(cur === k)); b.innerHTML = opt ? items[k] : (glyph ? `<span class="sw" style="border:0;font-size:16px;line-height:18px;text-align:center">${glyph[k] || ''}</span>` : `<span class="sw" style="background:${COL[k] || '#888'}"></span>`) + items[k]; b.addEventListener('click', () => { set(k); renderCtx(); }); host.appendChild(b); } };
      if (E.tool === 'floor') { title.textContent = 'Vloer'; mk(MV2.floors, E.fmat, k => { E.fmat = k; }); hint.textContent = 'Schilder driehoeken. Op een verdieping wordt de vloer ook het plafond eronder. Rechtermuisknop wist.'; }
      else if (E.tool === 'fill') { title.textContent = 'Vullen'; mk(MV2.floors, E.fmat, k => { E.fmat = k; }); hint.textContent = 'Klik in een ruimte: alle driehoeken tot aan de muren (en de rand van het gebied) krijgen deze vloer.'; }
      else if (E.tool === 'room') { title.textContent = 'Kamer'; mk(MV2.walls, E.wmat, k => { E.wmat = k; }); hint.textContent = 'Klik op een vak: er komen muren op alle zes zijden. Bestaande muren blijven staan.'; }
      else if (E.tool === 'wall') { title.textContent = 'Muur'; mk(MV2.walls, E.wmat, k => { E.wmat = k; }); hint.textContent = 'Sleep van rasterpunt naar rasterpunt. Haag en hek zijn laag; glas is een glaswand. Een muur op een bestaande muur wisselt het materiaal.'; }
      else if (['door', 'window', 'gate', 'open', 'close'].includes(E.tool)) { title.textContent = MV2.openings[E.tool === 'close' ? '' : E.tool]; hint.textContent = E.tool === 'close' ? 'Klik op een muur om de opening dicht te maken.' : 'Klik op een muur. Deur 1,2 m breed en 2,2 m hoog; raam vanaf 0,9 m; poort tot 2,8 m; open laat alleen een latei staan.'; }
      else if (E.tool === 'ustair') { title.textContent = 'Bordestrap'; mk(STAIR_W, String(stairW()), k => { E.sw = +k; }); mk({ 1: 'Keert naar links', '-1': 'Keert naar rechts' }, String(E.usd || 1), k => { E.usd = +k; }); hint.textContent = 'Wijs een driehoekje aan en klik, of sleep langs een rasterlijn de eerste steek, van onderaan in de looprichting (3 driehoekzijden is het mooist). Beide steken liggen naast de lijn, elk één rij breed; aan het eind een bordes op 1,5 m met een schuine kant, de tweede steek loopt ernaast terug omhoog. Het gat in de vloer erboven komt vanzelf.'; }
      else if (E.tool === 'stair') { title.textContent = 'Trap'; mk(STAIR_W, String(stairW()), k => { E.sw = +k; }); mk({ 1: 'Links van de lijn', 0: 'Op de lijn', '-1': 'Rechts van de lijn' }, String(E.ssd ?? 1), k => { E.ssd = +k; }); hint.textContent = 'Wijs een driehoekje aan en klik: daar begint een trap van 3 zijden (oranje: de driehoeken die hij bezet, rood gestippeld: het gat erboven). Of sleep langs een rasterlijn van het laagste punt omhoog: 16 treden naar de verdieping erboven (3 m), met een driehoekig bordes bovenaan. 3 driehoekzijden lang (6,75 m) is de goede helling. Het gat in de vloer erboven komt vanzelf.'; }
      else if (E.tool === 'spiral') { title.textContent = 'Wenteltrap'; mk({ 1: 'Linksom omhoog', '-1': 'Rechtsom omhoog' }, String(E.wsd || 1), k => { E.wsd = +k; }); hint.textContent = 'Wijs een driehoekje aan: het rasterpunt ernaast wordt het midden, in dat driehoekje stap je onderaan in (slepen draait hem per 60°). De zeshoek valt precies over de zes driehoeken om het punt. Zeshoekige wenteltrap, 12 treden van 25 cm per verdieping, één rondje (3 m); het gat in de vloer erboven komt vanzelf, op het stuk waar je uitstapt na.'; }
      else if (E.tool === 'ramp') { title.textContent = 'Helling'; mk({ 1.2: 'Smal 1,2 m', 2: 'Breed 2 m', 3: 'Extra breed 3 m' }, String(E.sw || 1.2), k => { E.sw = +k; }); hint.textContent = 'Sleep van het laagste punt omhoog. De helling stijgt 3 m naar de volgende verdieping. Hoe langer, hoe flauwer.'; }
      else if (E.tool === 'hexramp') { title.textContent = 'Schans'; hint.textContent = 'Klik in een vak, vlak bij de zijde waar de helling onderaan begint. Het hele vak wordt een oprit die aan de overkant 3 m hoger uitkomt (de verdieping erboven). Rechtermuisknop haalt hem weg.'; }
      else if (E.tool === 'roof') { title.textContent = 'Dak'; mk(ROOF_NAME, E.rkind || 'hip', k => { E.rkind = k; }); hint.textContent = 'Klik op een vak: het dak ligt bovenop deze verdieping en volgt de muren van dat vak (een gebouw van ¾ krijgt een dak van ¾, met overstek). Zadeldak: de nok wijst naar de hoek bij de muis. Nog eens klikken met hetzelfde dak, of rechtermuisknop: weg.'; }
      else if (E.tool === 'object') { title.textContent = 'Voorwerp'; mk(MV2.objects, E.obj, k => { E.obj = k; }, OBJ_GLYPH); mk({ l: '↺ 30°', n: degOf(E.orot || 0) + '° · terug naar 0°', r: '↻ 30°' }, '', k => { if (k === 'n') { E.orot = 0; draw(); } else rotStep(k === 'l' ? -1 : 1); });
        hint.textContent = 'Je ziet het voorwerp al staan voor je klikt. Klik om neer te zetten, of houd ingedrukt en sleep om het te richten (per 30°, met Ctrl vrij). Draaien: Q en E, Shift+scroll of de knoppen; op een voorwerp: klik draait 30° (Shift-klik terug), slepen richt het, rechtermuisknop haalt het weg. Het pijltje is de voorkant.'; }
      else if (E.tool === 'erase') { title.textContent = 'Gum'; hint.textContent = 'Klik of sleep: voorwerp, muur, trap, dak of vloer onder de muis wordt weggehaald.'; }
      else if (E.tool === 'select') { title.textContent = 'Kiezen'; const S = sel(), n = selCount(S);
        mk({ l: '↺ 60°', r: '↻ 60°', c: 'Kopiëren', v: 'Plakken', x: 'Weghalen', u: '↑ Verdieping', d: '↓ Verdieping', a: 'Alles' }, '', k => ({ l: () => selRotate(-1), r: () => selRotate(1), c: () => selCopy(false), v: () => selPaste(false), x: () => selDelete(), u: () => selToLevel(1), d: () => selToLevel(-1), a: () => selAll() })[k]());
        hint.textContent = (n ? selSay('Gekozen') + '. ' : '') + 'Klik op iets om het te kiezen (een vloer: de hele ruimte tot aan de muren), sleep een rechthoek voor meer; Ctrl+klik voegt toe of haalt eraf. Sleep wat gekozen is om het te verplaatsen (langs het raster). Q/E draait 60°, Delete haalt weg, Ctrl+C / X / V kopieert, knipt en plakt (Ctrl+Shift+V: op dezelfde plek, ook op een andere verdieping), Ctrl+D dupliceert, Ctrl+A kiest alles, Esc kiest niets. Schuiven met het beeld: Shift+slepen of de middelste knop.'; }
      else { title.textContent = E.tool === 'hand' ? 'Schuiven' : 'Kiezen'; hint.textContent = 'Sleep om te schuiven, scroll om te zoomen. Middelste muisknop of spatie schuift altijd.'; }
    }
    // ---------- bewerkingen ----------
    function paintFloor(x, z, erase) {
      const L = lvl(), list = brushTris(x, z).filter(okTri); let n = 0;
      for (const id of list) { const k = id.join(','); if (erase) { if (L.f[k]) { delete L.f[k]; n++; } } else if (L.f[k] !== E.fmat) { L.f[k] = E.fmat; n++; } }
      return n;
    }
    // vullen: driehoeken bereikbaar vanaf (x, z) zonder een muur te kruisen
    const triEdges = ([i, j, t]) => t ? [[wallKey(i + 1, j, 1), [i + 1, j, 0]], [wallKey(i, j + 1, 0), [i, j + 1, 0]], [wallKey(i + 1, j, 2), [i, j, 0]]] : [[wallKey(i, j, 0), [i, j - 1, 1]], [wallKey(i, j, 1), [i - 1, j, 1]], [wallKey(i + 1, j, 2), [i, j, 1]]];
    function fillFrom(x, z, erase) {
      const L = lvl(), start = triAt(x, z); if (!okTri(start)) return 0;
      const seen = new Set([start.join(',')]), queue = [start]; let n = 0;
      while (queue.length) {
        const id = queue.pop(), k = id.join(',');
        if (erase) { if (L.f[k]) { delete L.f[k]; n++; } } else if (L.f[k] !== E.fmat) { L.f[k] = E.fmat; n++; }
        for (const [wk, nb] of triEdges(id)) { const nk = nb.join(','); if (seen.has(nk) || L.w[wk] || !okTri(nb)) continue; seen.add(nk); queue.push(nb); if (seen.size > 20000) return n; }
      }
      return n;
    }
    function roomAt(x, z) {   // muren rondom het vak: per zijde n ribben
      if (!inArea(x, z)) return 0; const [q, r] = cellAt(x, z), c = mv2CellXZ(q, r), L = lvl(), n = E.m.n || 4; let cnt = 0;
      for (let k = 0; k < 6; k++) {
        const a0 = (30 + 60 * k) * Math.PI / 180, a1 = (90 + 60 * k) * Math.PI / 180, p0 = [c[0] + R * Math.cos(a0), c[1] + R * Math.sin(a0)], p1 = [c[0] + R * Math.cos(a1), c[1] + R * Math.sin(a1)];
        const v0 = vertexAt(p0[0], p0[1]), ds = dirSteps(v0, p1[0], p1[1]);
        for (const [i, j, d] of segsBetween(v0, ds.d, n)) { const key = wallKey(i, j, d); if (!L.w[key]) { L.w[key] = { m: E.wmat, o: '' }; cnt++; } }
      }
      return cnt;
    }
    function addWalls(a, d6, n) { const L = lvl(); let c = 0; for (const [i, j, d] of segsBetween(a, d6, n)) { const [p, q] = segOf(i, j, d); if (!mv2NearArea(E.m, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) continue; const k = wallKey(i, j, d); const had = L.w[k]; L.w[k] = { m: E.wmat, o: had ? had.o : '' }; c++; } return c; }
    function setOpening(x, z, o) { const w = nearestWall(x, z); if (!w) { say('Klik op een muur'); return false; } lvl().w[w.id].o = o; return true; }
    // In 3D: raakt de straal vanuit de camera een wand van deze verdieping vóór hij de vloer raakt? Dan is dat de muur onder de muis
    // (anders kijk je langs de wand naar de vloer erachter).
    function wallRay(sx, sy) {
      if (E.vm !== '3d' || !cam) return null;
      const y0 = E.lv * MV2.LV_H, L = lvl(); nd3.set(sx / W * 2 - 1, -(sy / H) * 2 + 1); rc3.setFromCamera(nd3, cam);
      const o = rc3.ray.origin, d = rc3.ray.direction, tFloor = Math.abs(d.y) > 1e-6 ? (y0 + 0.03 - o.y) / d.y : 1e9;
      let best = null, bt = tFloor > 0 ? tFloor : 1e9;
      for (const id in L.w) {
        const [i, j, dd] = id.split(',').map(Number), [a, b] = segOf(i, j, dd), ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1, nx = -ez / l, nz = ex / l;
        const den = d.x * nx + d.z * nz; if (Math.abs(den) < 1e-6) continue;
        const t = ((a[0] - o.x) * nx + (a[1] - o.z) * nz) / den; if (t <= 0 || t >= bt) continue;
        const px = o.x + d.x * t, py = o.y + d.y * t, pz = o.z + d.z * t, u = ((px - a[0]) * ex + (pz - a[1]) * ez) / (l * l);
        const h = L.w[id].m === 'hedge' ? 1.4 : L.w[id].m === 'fence' ? 1.1 : MV2.LV_H;
        if (u < -0.02 || u > 1.02 || py < y0 - 0.05 || py > y0 + h + 0.05) continue;
        bt = t; best = { id };
      }
      return best;
    }
    E.wallRay = wallRay;   // voor tests
    // Wat de gum hier zou weghalen (zelfde volgorde als eraseAt): voor het oplichten vóór je klikt
    function eraseTarget(x, z, firstOnly) {
      const L = lvl(); const oi = objectAt(x, z, 0.8); if (oi >= 0) return { kind: 'voorwerp', oi };
      const w = (E.hoverS && wallRay(E.hoverS[0], E.hoverS[1])) || nearestWall(x, z, 0.45); if (w) return { kind: 'muur', id: w.id };
      const si = stairAt(x, z); if (si >= 0) return { kind: L.s[si].k === 'ramp' || L.s[si].k === 'hexramp' ? 'helling' : 'trap', si };
      const [q, r] = cellAt(x, z); if (L.r[q + ',' + r] && !firstOnly) return { kind: 'dak', rk: q + ',' + r, q, r };
      const tris = brushTris(x, z).filter(okTri).filter(id => L.f[id.join(',')]); if (tris.length) return { kind: 'vloer', tris };
      return null;
    }
    function eraseAt(x, z, firstOnly) {
      const L = lvl(), T = eraseTarget(x, z, firstOnly); if (!T) return null;
      if (T.oi !== undefined) L.o.splice(T.oi, 1); else if (T.id) delete L.w[T.id]; else if (T.si !== undefined) L.s.splice(T.si, 1); else if (T.rk) delete L.r[T.rk]; else paintFloor(x, z, true);
      return T.kind;
    }
    // ---------- Kiezen (V): aanklikken of een rechthoek slepen, dan verplaatsen, draaien per 60°, kopiëren, plakken, weghalen ----------
    // Een selectie hoort bij één verdieping: vloerdriehoeken, muren, trappen, voorwerpen en daken. Verplaatsen en draaien gaan langs het
    // raster (stappen van een driehoekzijde, draaien om een rasterpunt), zodat alles op de driehoeken blijft liggen. Daken en schansen
    // horen bij een heel vak: die gaan alleen mee als de verplaatsing (of het draaipunt) precies op een vak valt.
    const selEmpty = (lv = E.lv) => ({ lv, f: new Set(), w: new Set(), s: new Set(), o: new Set(), r: new Set() });
    const sel = () => (E.sel && E.sel.lv === E.lv ? E.sel : (E.sel = selEmpty()));
    const selCount = S => S.f.size + S.w.size + S.s.size + S.o.size + S.r.size;
    const triVertsIdx = (i, j, t) => t ? [[i + 1, j], [i + 1, j + 1], [i, j + 1]] : [[i, j], [i + 1, j], [i, j + 1]];
    function keyFromSeg(a, b) { const dx = b[0] - a[0], dz = b[1] - a[1]; for (let d = 0; d < 6; d++) { const D = MV2.DIRW[d]; if (D[0] === dx && D[1] === dz) return wallKey(a[0], a[1], d); if (D[0] === -dx && D[1] === -dz) return wallKey(b[0], b[1], d); } return null; }
    const cellStep = (di, dj) => { const n = Math.round(R / ts()); return (di - dj) % (3 * n) === 0 && (di + 2 * dj) % (3 * n) === 0 ? [(di - dj) / (3 * n), (di + 2 * dj) / (3 * n)] : null; };   // verplaatsing in hele vakken, of null
    function selClip(S = sel()) {
      const L = E.m.lv[S.lv];
      return { f: [...S.f].filter(id => L.f[id]).map(id => [...id.split(',').map(Number), L.f[id]]), w: [...S.w].filter(id => L.w[id]).map(id => [...id.split(',').map(Number), JSON.parse(JSON.stringify(L.w[id]))]),
        s: [...S.s].filter(i => L.s[i]).map(i => JSON.parse(JSON.stringify(L.s[i]))), o: [...S.o].filter(i => L.o[i]).map(i => Object.assign({}, L.o[i])), r: [...S.r].filter(k => L.r[k]).map(k => [...k.split(',').map(Number), L.r[k]]) };
    }
    function selRemove(S = sel()) { const L = E.m.lv[S.lv]; for (const id of S.f) delete L.f[id]; for (const id of S.w) delete L.w[id]; for (const k of S.r) delete L.r[k]; L.s = L.s.filter((_, i) => !S.s.has(i)); L.o = L.o.filter((_, i) => !S.o.has(i)); }
    function clipInsert(c, li = E.lv) {
      while (E.m.lv.length <= li) E.m.lv.push(mv2Level()); const L = E.m.lv[li], S = selEmpty(li);
      for (const [i, j, t, mat] of c.f) { const id = i + ',' + j + ',' + t; if (!okTri([i, j, t])) continue; L.f[id] = mat; S.f.add(id); }
      for (const [i, j, d, Wd] of c.w) { const id = wallKey(i, j, d), [a, b] = segOf(i, j, d); if (!mv2NearArea(E.m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue; L.w[id] = Wd; S.w.add(id); }
      for (const [q, r, kind] of c.r) { if (mv2HexDist(q, r) > (E.m.k || 0)) continue; const k = q + ',' + r; L.r[k] = kind; S.r.add(k); }
      for (const St of c.s) { L.s.push(St); S.s.add(L.s.length - 1); }
      for (const o of c.o) { if (!inArea(o.x, o.z)) continue; L.o.push(o); S.o.add(L.o.length - 1); }
      return S;
    }
    // verschuiven over (di, dj) rasterstappen: wat bij een heel vak hoort (dak, schans) blijft staan als het geen hele vakken zijn
    function clipShift(c, di, dj) {
      const cs = cellStep(di, dj), off = P(di, dj), off0 = P(0, 0), ox = off[0] - off0[0], oz = off[1] - off0[1], stay = { f: [], w: [], s: [], o: [], r: [] };
      const out = { f: c.f.map(([i, j, t, m]) => [i + di, j + dj, t, m]), w: c.w.map(([i, j, d, W2]) => [i + di, j + dj, d, W2]), o: c.o.map(o => Object.assign({}, o, { x: Math.round((o.x + ox) * 4) / 4, z: Math.round((o.z + oz) * 4) / 4 })), s: [], r: [] };
      for (const St of c.s) { if (St.k === 'hexramp') { if (cs) out.s.push(Object.assign({}, St, { q: (St.q || 0) + cs[0], r: (St.r || 0) + cs[1] })); else stay.s.push(St); } else out.s.push(Object.assign({}, St, { a: [St.a[0] + di, St.a[1] + dj] })); }
      for (const R0 of c.r) { if (cs) out.r.push([R0[0] + cs[0], R0[1] + cs[1], R0[2]]); else stay.r.push(R0); }
      return { out, stay };
    }
    // draaien om rasterpunt pv, k keer 60° (met de klok mee in het bovenaanzicht als k > 0)
    function clipRot(c, k, pv) {
      k = ((k % 6) + 6) % 6; const rotI = ([i, j]) => { let a = i - pv[0], b = j - pv[1]; for (let n = 0; n < k; n++) [a, b] = [-b, a + b]; return [a + pv[0], b + pv[1]]; };
      const pw = P(pv[0], pv[1]), ang = k * Math.PI / 3, cs = Math.cos(ang), sn = Math.sin(ang), rotW = (x, z) => [pw[0] + (x - pw[0]) * cs - (z - pw[1]) * sn, pw[1] + (x - pw[0]) * sn + (z - pw[1]) * cs];
      const n0 = Math.round(R / ts()), pc = cellStep(pv[0], pv[1]), stay = { f: [], w: [], s: [], o: [], r: [] }, out = { f: [], w: [], s: [], o: [], r: [] };
      for (const [i, j, t, m] of c.f) { const V = triVertsIdx(i, j, t).map(rotI).map(([a, b]) => P(a, b)), cx = (V[0][0] + V[1][0] + V[2][0]) / 3, cz = (V[0][1] + V[1][1] + V[2][1]) / 3; out.f.push([...triAt(cx, cz), m]); }
      for (const [i, j, d, W2] of c.w) { const D = MV2.DIRW[d], key = keyFromSeg(rotI([i, j]), rotI([i + D[0], j + D[1]])); if (key) out.w.push([...key.split(',').map(Number), W2]); }
      for (const o of c.o) { const [x, z] = rotW(o.x, o.z); out.o.push(Object.assign({}, o, { x: Math.round(x * 4) / 4, z: Math.round(z * 4) / 4, rot: ((o.rot || 0) + ang) % (Math.PI * 2) })); }
      for (const St of c.s) { if (St.k === 'hexramp') { stay.s.push(St); continue; } out.s.push(Object.assign({}, St, { a: rotI(St.a), d: ((St.d || 0) + k) % 6 })); }
      for (const R0 of c.r) { if (!pc) { stay.r.push(R0); continue; } let a = R0[0] - pc[0], b = R0[1] - pc[1]; for (let n = 0; n < k; n++) [a, b] = [-b, a + b]; const g = /^gable(\d)$/.exec(R0[2] || ''); out.r.push([a + pc[0], b + pc[1], g ? 'gable' + ((+g[1] + k) % 3) : R0[2]]); }
      void n0; return { out, stay };
    }
    const clipJoin = (A, B) => ({ f: [...A.f, ...B.f], w: [...A.w, ...B.w], s: [...A.s, ...B.s], o: [...A.o, ...B.o], r: [...A.r, ...B.r] });
    const clipSize = c => c.f.length + c.w.length + c.s.length + c.o.length + c.r.length;
    // middelpunt (rasterpunt) van een stuk: het draaipunt en het aangrijppunt bij plakken
    function clipPivot(c) {
      const pts = []; for (const [i, j, t] of c.f) for (const v of triVertsIdx(i, j, t)) pts.push(P(...v)); for (const [i, j, d] of c.w) { const [a, b] = segOf(i, j, d); pts.push(a, b); }
      for (const St of c.s) pts.push(St.k === 'hexramp' ? mv2CellXZ(St.q || 0, St.r || 0) : P(St.a[0], St.a[1])); for (const o of c.o) pts.push([o.x, o.z]); for (const [q, r] of c.r) pts.push(mv2CellXZ(q, r));
      if (!pts.length) return [0, 0]; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
      return vertexAt((x0 + x1) / 2, (z0 + z1) / 2);
    }
    // een ruimte op de vloer: aaneengesloten driehoeken met dezelfde vloer, niet over een muur heen
    function floorRegion(id0) {
      const L = lvl(), mat = L.f[id0]; if (!mat) return [];
      const seen = new Set([id0]), q = [id0];
      while (q.length && seen.size < 6000) { const [i, j, t] = q.shift().split(',').map(Number);
        const nb = t ? [[[i + 1, j], [i + 1, j + 1], [i + 1, j, 0]], [[i, j + 1], [i + 1, j + 1], [i, j + 1, 0]], [[i + 1, j], [i, j + 1], [i, j, 0]]] : [[[i, j], [i + 1, j], [i, j - 1, 1]], [[i, j], [i, j + 1], [i - 1, j, 1]], [[i + 1, j], [i, j + 1], [i, j, 1]]];
        for (const [a, b, n] of nb) { const id = n.join(','); if (seen.has(id) || L.f[id] !== mat) continue; const wk = keyFromSeg(a, b); if (wk && L.w[wk] && !(L.w[wk].o && L.w[wk].o !== 'window')) continue; seen.add(id); q.push(id); } }
      return [...seen];
    }
    // wat ligt er onder de muis (zelfde volgorde als de gum), als losse selectie
    function selHit(x, z) {
      const T = eraseTarget(x, z, false), S = selEmpty(); if (!T) return null;
      if (T.oi !== undefined) S.o.add(T.oi); else if (T.id) S.w.add(T.id); else if (T.si !== undefined) S.s.add(T.si); else if (T.rk) S.r.add(T.rk);
      else { const id = triAt(x, z).join(','); for (const f of (lvl().f[id] ? floorRegion(id) : (T.tris || []).map(t => t.join(',')))) S.f.add(f); }
      return S;
    }
    const selHas = (S, H) => [...H.f].some(k => S.f.has(k)) || [...H.w].some(k => S.w.has(k)) || [...H.s].some(k => S.s.has(k)) || [...H.o].some(k => S.o.has(k)) || [...H.r].some(k => S.r.has(k));
    const selToggle = (S, H) => { for (const kk of ['f', 'w', 's', 'o', 'r']) for (const v of H[kk]) S[kk].has(v) ? S[kk].delete(v) : S[kk].add(v); };
    // alles binnen een rechthoek op het scherm
    function selRect(s0, s1) {
      const L = lvl(), S = selEmpty(), x0 = Math.min(s0[0], s1[0]), x1 = Math.max(s0[0], s1[0]), y0 = Math.min(s0[1], s1[1]), y1 = Math.max(s0[1], s1[1]), inR = (x, z) => { const p = toS(x, z); return p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1; };
      for (const id in L.f) { const v = mv2TriVerts(...id.split(',').map(Number), ts()); if (inR((v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3)) S.f.add(id); }
      for (const id in L.w) { const [a, b] = segOf(...id.split(',').map(Number)); if (inR((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) S.w.add(id); }
      L.s.forEach((St, i) => { const p = St.k === 'hexramp' ? mv2CellXZ(St.q || 0, St.r || 0) : P(St.a[0], St.a[1]); if (inR(p[0], p[1])) S.s.add(i); });
      L.o.forEach((o, i) => { if (inR(o.x, o.z)) S.o.add(i); });
      for (const k in L.r) { const [q, r] = k.split(',').map(Number), c = mv2CellXZ(q, r); if (inR(c[0], c[1])) S.r.add(k); }
      return S;
    }
    function selSay(pre) { const S = sel(), parts = []; if (S.f.size) parts.push(S.f.size + ' vloerdriehoek' + (S.f.size === 1 ? '' : 'en')); if (S.w.size) parts.push(S.w.size + (S.w.size === 1 ? ' muur' : ' muren')); if (S.s.size) parts.push(S.s.size + (S.s.size === 1 ? ' trap' : ' trappen')); if (S.o.size) parts.push(S.o.size + (S.o.size === 1 ? ' voorwerp' : ' voorwerpen')); if (S.r.size) parts.push(S.r.size + (S.r.size === 1 ? ' dak' : ' daken')); return (pre ? pre + ': ' : '') + (parts.join(', ') || 'niets gekozen'); }
    // bewerkingen
    function selApply(fn, msg) { const S = sel(); if (!selCount(S)) { say('Niets gekozen', 900); return; } snap(); const c = selClip(S); selRemove(S); const { out, stay } = fn(c); clipInsert(stay, S.lv); E.sel = clipInsert(out, S.lv); changed(); renderCtx(); const left = clipSize(stay); say(msg + (left ? ' · ' + left + ' dak/schans bleef staan (die horen bij een heel vak)' : ''), 1400); }
    const selMove = (di, dj) => selApply(c => clipShift(c, di, dj), 'Verplaatst');
    const selRotate = k => selApply(c => clipRot(c, k, clipPivot(c)), k > 0 ? 'Gedraaid 60° rechtsom' : 'Gedraaid 60° linksom');
    function selDelete() { const S = sel(); if (!selCount(S)) return; snap(); selRemove(S); E.sel = selEmpty(); changed(); renderCtx(); say('Weggehaald', 900); }
    function selCopy(cut) { const S = sel(); if (!selCount(S)) { say('Niets gekozen om te kopiëren', 1000); return; } const c = selClip(S); E.clip = { c, pv: clipPivot(c) }; if (cut) selDelete(); say(selSay(cut ? 'Geknipt' : 'Gekopieerd') + ' · Ctrl+V: plakken waar je klikt, Ctrl+Shift+V: op dezelfde plek', 2600); }
    function selPaste(inPlace) { if (!E.clip) { say('Eerst iets kopiëren (Ctrl+C)', 1200); return; } if (inPlace) { snap(); E.sel = clipInsert(clipShift(E.clip.c, 0, 0).out); changed(); renderCtx(); say('Geplakt op dezelfde plek', 1000); return; } setTool('select'); E.paste = true; say('Klik waar het moet komen (Esc stopt)', 2000); draw(); }
    function selToLevel(dl) { const S = sel(), to = S.lv + dl; if (!selCount(S)) { say('Niets gekozen', 900); return; } if (to < 0 || to >= MV2.MAX_LV) return; snap(); const c = selClip(S); selRemove(S); E.sel = clipInsert(c, to); E.lv = to; changed(); renderCtx(); say(selSay(to > S.lv ? 'Naar boven' : 'Naar beneden'), 1400); }
    function selAll() { const L = lvl(), S = selEmpty(); for (const id in L.f) S.f.add(id); for (const id in L.w) S.w.add(id); L.s.forEach((_, i) => S.s.add(i)); L.o.forEach((_, i) => S.o.add(i)); for (const k in L.r) S.r.add(k); E.sel = S; renderCtx(); draw(); say(selSay('Alles'), 1200); }
    // ---------- Controleren: kun je overal komen, komen trappen ergens uit, staan voorwerpen goed? ----------
    // Alleen op de gegevens (geen stad nodig): een graaf van vloerdriehoeken per verdieping (buren over een gedeelde rib, niet door een muur
    // zonder opening), trappen als verbinding naar de verdieping erboven, en 'buiten' (het maaiveld rond de begane grond). Wat je vanaf buiten
    // niet kunt bereiken wordt rood; voorwerpen die zweven, in een muur of buiten het gebied staan, en zwevende muren krijgen een rode stip.
    const CK_RAD = { tree: 0.35, bush: 0.7, bench: 0.3, lamp: 0.15, pillar: 0.35, table: 0.9, planter: 0.75, fountain: 1.9, bin: 0.25, bike: 0.35, shelf: 0.3, counter: 0.4, sign: 0.1, bed: 0.1, sofa: 0.45, desk: 0.4, kitchen: 0.3, screen: 0.1, car: 0.9, pump: 0.5, charger: 0.2, solar: 0.7, turbine: 0.7, chimney: 1.25, container: 0.7, goal: 0.1, grave: 0.35, boat: 0.8, shelter: 0.1, slide: 0.8, swing: 0.6, sheep: 0.45 };
    const CK_LEN = { bench: 1.8, shelf: 2.4, counter: 2.2, bike: 2.4, sign: 1.6, bed: 1.8, sofa: 2.0, desk: 1.6, kitchen: 2.4, screen: 6.0, car: 4.3, solar: 3.4, container: 2.4, goal: 3.7, boat: 4.2, shelter: 3.0, swing: 2.7 };
    const ROOF_NAME = { hip: 'Schilddak', gable: 'Zadeldak', flat: 'Plat dak' };
    function roofKindAt(x, z) { const k = E.rkind || 'hip'; if (k !== 'gable') return k; const [q, r] = cellAt(x, z), c = mv2CellXZ(q, r), deg = Math.atan2(z - c[1], x - c[0]) * 180 / Math.PI; return 'gable' + ((((Math.round((deg - 30) / 60) % 6) + 6) % 6) % 3); }
    function checkModule() {
      const m = E.m, t = ts(), res = { bad: new Map(), marks: [] }, D2 = Math.PI / 180, flo = [];
      for (let li = 0; li < m.lv.length; li++) {
        const L = m.lv[li], holes = li > 0 ? (m.lv[li - 1].s || []).map(S => mv2StairHole(S, t)) : [], set = new Set();
        for (const id in L.f) { if (L.f[id] === 'water') continue; const ijt = id.split(',').map(Number); if (!okTri(ijt)) continue; const v = mv2TriVerts(...ijt, t); if (holes.some(h => { const r = h(v); return r && !r.keep; })) continue; set.add(id); }
        flo.push(set);
      }
      const fl = modMeta(m).fl, adj = new Map(), link = (a, b) => { if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []); adj.get(a).push(b); adj.get(b).push(a); };
      const blocks = (L, a, b) => { const wk = keyFromSeg(a, b), W2 = wk && L.w[wk]; return !!W2 && !(W2.o && W2.o !== 'window'); };
      for (let li = 0; li < m.lv.length; li++) { const L = m.lv[li];
        for (const id of flo[li]) { const [i, j, tt] = id.split(',').map(Number);
          const nb = tt ? [[[i + 1, j], [i + 1, j + 1], [i + 1, j, 0]], [[i, j + 1], [i + 1, j + 1], [i, j + 1, 0]], [[i + 1, j], [i, j + 1], [i, j, 0]]] : [[[i, j], [i + 1, j], [i, j - 1, 1]], [[i, j], [i, j + 1], [i - 1, j, 1]], [[i + 1, j], [i, j + 1], [i, j, 1]]];
          for (const [a, b, n] of nb) { if (blocks(L, a, b)) continue; const nid = n.join(','); if (flo[li].has(nid)) link(li + '|' + id, li + '|' + nid); else if (li === 0) link('0|' + id, 'OUT'); } } }
      const node = (li, x, z) => { const id = triAt(x, z).join(','); if (flo[li] && flo[li].has(id)) return li + '|' + id; return li === 0 ? 'OUT' : null; };
      for (let li = 0; li < m.lv.length; li++) for (const St of m.lv[li].s) {
        if (St.k === 'hexramp') continue; const g = stairGeom(St); let lo, hi;
        if (St.k === 'spiral') { const a0 = Math.atan2(g.uz, g.ux), sd = St.side || 1, pt = (deg, r) => [g.a[0] + Math.cos(a0 + sd * deg * D2) * r, g.a[1] + Math.sin(a0 + sd * deg * D2) * r]; lo = pt(10, 1.7); hi = pt(350, 1.7); }
        else if (St.k === 'u') { lo = g.at(-0.6, 0); hi = g.at(-0.6, (St.side || 1) * g.w); }
        else { lo = g.at(-0.6, 0); hi = g.at(g.len + 0.6, 0); }
        let A = node(li, lo[0], lo[1]); const B = li + 1 < m.lv.length ? node(li + 1, hi[0], hi[1]) : null;
        if (!A && St.k === 'spiral' && li > 0 && (m.lv[li - 1].s || []).some(S0 => S0.k === 'spiral' && S0.a[0] === St.a[0] && S0.a[1] === St.a[1])) { const a0 = Math.atan2(g.uz, g.ux), sd = St.side || 1; A = node(li, g.a[0] + Math.cos(a0 - sd * 10 * D2) * 1.7, g.a[1] + Math.sin(a0 - sd * 10 * D2) * 1.7); }   // wenteltrappen boven elkaar: je loopt van de ene zo de volgende op
        if (!A) res.marks.push({ li, x: lo[0], z: lo[1], msg: 'trap begint niet op een vloer' });
        if (!B && St.k !== 'trib') res.marks.push({ li: li + 1, x: hi[0], z: hi[1], msg: 'trap komt hier niet op een vloer uit' });
        if (A && B) link(A, B);
      }
      const seen = new Set(['OUT']), q = ['OUT']; while (q.length) { const a = q.shift(); for (const b of adj.get(a) || []) if (!seen.has(b)) { seen.add(b); q.push(b); } }
      for (let li = 0; li < Math.min(fl, m.lv.length); li++) { const bad = new Set(); for (const id of flo[li]) if (!seen.has(li + '|' + id)) bad.add(id); if (bad.size) res.bad.set(li, bad); }
      // voorwerpen en muren
      const segsOf = L => { const o2 = []; for (const id in L.w) { if (!L.w[id]) continue; o2.push([...segOf(...id.split(',').map(Number)), L.w[id]]); } return o2; };
      const dSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)); return Math.hypot(a[0] + u * dx - x, a[1] + u * dz - z); };
      const hasF = (li, x, z) => !!(m.lv[li] && m.lv[li].f[triAt(x, z).join(',')]);
      m.lv.forEach((L, li) => { const W = segsOf(L);
        L.o.forEach((o, oi) => {
          const nm = MV2.objects[o.t] || o.t;
          if (!inArea(o.x, o.z)) { res.marks.push({ li, x: o.x, z: o.z, msg: nm + ' buiten het gebied' }); return; }
          if (li > 0 && !hasF(li, o.x, o.z)) res.marks.push({ li, x: o.x, z: o.z, msg: nm + ' zweeft' });
          const ln = CK_LEN[o.t] || 0, ux = Math.cos(o.rot || 0), uz = Math.sin(o.rot || 0), pr = ln ? [-0.5, -0.25, 0, 0.25, 0.5].map(f => [o.x + ux * ln * f, o.z + uz * ln * f]) : [[o.x, o.z]];
          if (W.some(([a, b, Wd]) => Wd.o !== 'open' && Wd.o !== 'gate' && pr.some(([x, z]) => dSeg(x, z, a, b) < (CK_RAD[o.t] || 0.3) + 0.1))) res.marks.push({ li, x: o.x, z: o.z, msg: nm + ' staat in een muur' });
          L.o.forEach((o2, oj) => { if (oj <= oi || CK_LEN[o.t] || CK_LEN[o2.t]) return; if (Math.hypot(o.x - o2.x, o.z - o2.z) < Math.max(0.5, ((CK_RAD[o.t] || 0.3) + (CK_RAD[o2.t] || 0.3)) * 0.7)) res.marks.push({ li, x: o.x, z: o.z, msg: nm + ' en ' + (MV2.objects[o2.t] || o2.t) + ' op elkaar' }); });
        });
        if (li > 0) for (const [a, b] of W) { const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]), nz = b[0] - a[0], l = Math.hypot(nx, nz) || 1; if (!hasF(li, mx + nx / l * 0.5, mz + nz / l * 0.5) && !hasF(li, mx - nx / l * 0.5, mz - nz / l * 0.5) && !hasF(li - 1, mx, mz) && !segsOf(m.lv[li - 1]).some(([A, B2]) => dSeg(mx, mz, A, B2) < 0.2)) res.marks.push({ li, x: mx, z: mz, msg: 'muur zweeft' }); }
      });
      return res;
    }
    E.checkModule = () => checkModule();   // voor de tests
    function runCheck() {
      const r = checkModule(), lvName = li => li === 0 ? 'begane grond' : li + 'e verdieping'; E.check = r;
      const nBad = [...r.bad.values()].reduce((s2, S2) => s2 + S2.size, 0), where = [...new Set([...r.bad.keys(), ...r.marks.map(k => k.li)])].sort((a, b) => a - b);
      if (!nBad && !r.marks.length) say('Controle: alles in orde · overal te bereiken, trappen komen uit, voorwerpen staan goed', 3500);
      else say('Controle: ' + [nBad ? nBad + ' vloerdriehoek' + (nBad === 1 ? '' : 'en') + ' niet te bereiken' : '', r.marks.length ? r.marks.length + ' opmerking' + (r.marks.length === 1 ? '' : 'en') + ' (' + [...new Set(r.marks.map(k => k.msg))].slice(0, 3).join('; ') + ')' : ''].filter(Boolean).join(' · ') + ' · op ' + where.map(lvName).join(', ') + ' · rood in de tekening', 6500);
      draw(); if (E.vm === '3d') dirty3();
    }
    // ---------- muisinvoer ----------
    // Bovenaanzicht: schaal en verschuiving. In 3D: een straal vanuit de camera, gesneden met het vlak van de verdieping
    // waar je bent; zo werkt al het gereedschap in beide weergaven hetzelfde.
    const lvY = () => E.lv * MV2.LV_H + 0.03;
    const v3a = new THREE.Vector3(), rc3 = new THREE.Raycaster(), pl3 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), nd3 = new THREE.Vector2();
    const toW = (sx, sz) => {
      if (E.vm !== '3d' || !cam) return [(sx - W / 2) / E.view.s + E.view.x, (sz - H / 2) / E.view.s + E.view.z];
      nd3.set(sx / W * 2 - 1, -(sz / H) * 2 + 1); rc3.setFromCamera(nd3, cam); pl3.constant = -lvY();
      const hit = rc3.ray.intersectPlane(pl3, v3a); return hit ? [hit.x, hit.z] : [1e5, 1e5];
    };
    const toS = (x, z, y) => {
      if (E.vm !== '3d' || !cam) return [W / 2 + (x - E.view.x) * E.view.s, H / 2 + (z - E.view.z) * E.view.s];
      v3a.set(x, y === undefined ? lvY() : y, z).project(cam); return [(v3a.x + 1) / 2 * W, (1 - v3a.y) / 2 * H];
    };
    E.toS = (x, z, y) => { const r = cv.getBoundingClientRect(), q = toS(x, z, y); return [r.left + q[0], r.top + q[1]]; };   // voor de tests: wereld → scherm
    const ptr = new Map();
    let spaceDown = false;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const rect = cv.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top, [x, z] = toW(sx, sy); E.hoverS = [sx, sy];
      if (E.vm === '3d' && (e.button === 1 || e.altKey || spaceDown || E.tool === 'hand' || (ptr.size > 1))) { E.pan = { kind: 'orbit', sx: e.clientX, sy: e.clientY, th: E.th, ph: E.ph }; return; }   // draaien
      if (E.vm === '3d' && e.shiftKey) { E.pan = { kind: 'pan3', w: [x, z] }; cv.style.cursor = 'grabbing'; return; }   // schuiven over de verdieping
      if (e.button === 1 || spaceDown || E.tool === 'hand' || (E.tool === 'select' && e.shiftKey) || ptr.size > 1) { E.pan = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: E.view.x, vz: E.view.z }; cv.style.cursor = 'grabbing'; return; }
      const right = e.button === 2;
      if (E.tool === 'select') {
        if (right) { E.sel = selEmpty(); E.paste = false; renderCtx(); draw(); return; }
        if (E.paste && E.clip) { const v = vertexAt(x, z), pv = E.clip.pv; snap(); E.sel = clipInsert(clipShift(E.clip.c, v[0] - pv[0], v[1] - pv[1]).out); E.paste = false; changed(); renderCtx(); say(selSay('Geplakt'), 1200); return; }
        const add = e.ctrlKey || e.metaKey, Hh = selHit(x, z), S = sel();
        if (Hh && selCount(Hh)) { if (add) { selToggle(S, Hh); renderCtx(); draw(); say(selSay(), 900); return; } if (!selHas(S, Hh)) { E.sel = Hh; renderCtx(); say(selSay(), 900); } E.drag = { kind: 'selmove', a: vertexAt(x, z), di: 0, dj: 0 }; draw(); return; }
        E.drag = { kind: 'marq', s0: [sx, sy], s1: [sx, sy], add }; draw(); return;
      }
      if (E.tool === 'floor') { snap(); paintFloor(x, z, right); E.drag = { kind: 'floor', erase: right }; changed(); return; }
      if (E.tool === 'fill') { snap(); const n = fillFrom(x, z, right); changed(); say(n ? n + ' driehoeken' : 'Niets gevuld', 900); return; }
      if (E.tool === 'room') { snap(); const n = roomAt(x, z); changed(); say(n ? n + ' muurdelen' : 'Klik binnen het gebied', 900); return; }
      if (E.tool === 'wall') { if (right) { const w = nearestWall(x, z); if (w) { snap(); delete lvl().w[w.id]; changed(); } return; } E.drag = { kind: 'wall', a: vertexAt(x, z), d: 0, n: 0 }; draw(); return; }
      if (['door', 'window', 'gate', 'open', 'close'].includes(E.tool)) { const before = JSON.stringify(E.m); if (setOpening(x, z, E.tool === 'close' ? '' : E.tool)) { E.undo.push(before); E.redo = []; E.dirty = true; changed(); } return; }
      if (E.tool === 'stair' || E.tool === 'ramp' || E.tool === 'ustair') { if (right) { const si = stairAt(x, z); if (si >= 0) { snap(); lvl().s.splice(si, 1); changed(); } return; } { const H0 = hoverStair(x, z); E.drag = { kind: 'stair', a: H0.a, d: H0.d, n: 0 }; } draw(); return; }
      if (E.tool === 'spiral') { if (right) { const si = stairAt(x, z); if (si >= 0) { snap(); lvl().s.splice(si, 1); changed(); } return; } { const H0 = hoverStair(x, z); E.drag = { kind: 'spiral', a: H0.a, d: H0.d, n: 1 }; } draw(); return; }
      if (E.tool === 'hexramp') { const L = lvl(); if (right) { const si = stairAt(x, z); if (si >= 0) { snap(); L.s.splice(si, 1); changed(); } return; } if (!inArea(x, z)) return; const [q, r] = cellAt(x, z), c = mv2CellXZ(q, r); let side = 0, bd = -1e9; FRAMES.forEach((f, k) => { const d = (x - c[0]) * f.nx + (z - c[1]) * f.nz; if (d > bd) { bd = d; side = k; } }); snap(); const old = L.s.findIndex(S => S.k === 'hexramp' && S.q === q && S.r === r); if (old >= 0) L.s.splice(old, 1); L.s.push({ a: [0, 0], d: 0, n: 1, w: 9, k: 'hexramp', q, r, side }); changed(); say('Schans: instap aan zijde ' + (side + 1), 1000); return; }
      if (E.tool === 'roof') { if (!inArea(x, z)) return; const [q, r] = cellAt(x, z), k = q + ',' + r, L = lvl(), kind = roofKindAt(x, z); snap(); if (right || L.r[k] === kind) delete L.r[k]; else L.r[k] = kind; changed(); say(L.r[k] ? ROOF_NAME[E.rkind || 'hip'] + (mv2RoofFit(E.m, E.lv, q, r) < R ? ' · volgt de muren' : '') : 'Dak weg', 900); return; }
      if (E.tool === 'object') { const L = lvl(), oi = objectAt(x, z, 0.8);
        if (right) { if (oi >= 0) { snap(); L.o.splice(oi, 1); changed(); } return; }
        if (oi >= 0) { snap(); E.drag = { kind: 'obj', oi, x: L.o[oi].x, z: L.o[oi].z, rot: L.o[oi].rot || 0, moved: false, back: e.shiftKey }; return; }   // bestaand voorwerp: klik draait 30°, slepen richt het
        if (!inArea(x, z)) return;
        E.drag = { kind: 'obj', oi: -1, x: snapObj(x), z: snapObj(z), rot: E.orot || 0, moved: false }; draw(); return; }
      if (E.tool === 'erase') { snap(); const what = eraseAt(x, z); E.drag = { kind: 'erase' }; changed(); if (what) say(what + ' weggehaald', 700); return; }
    });
    cv.addEventListener('pointermove', e => {
      const rect = cv.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top, [x, z] = toW(sx, sy);
      if (ptr.has(e.pointerId)) ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (E.pan) {
        if (E.pan.kind === 'orbit') { E.th = E.pan.th - (e.clientX - E.pan.sx) * 0.008; E.ph = Math.max(0.15, Math.min(1.45, E.pan.ph + (e.clientY - E.pan.sy) * 0.006)); dirty3(); return; }
        if (E.pan.kind === 'pan3') { E.view.x += E.pan.w[0] - x; E.view.z += E.pan.w[1] - z; dirty3(); return; }
        if (ptr.size > 1) {   // knijpen: zoomen
          const pts = [...ptr.values()]; if (!E.pan.pd) E.pan.pd = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y); if (E.pan.pd) { E.view.s = Math.max(3, Math.min(80, E.view.s * d / E.pan.pd)); E.pan.pd = d; } draw(); return;
        }
        E.view.x = E.pan.vx - (e.clientX - E.pan.sx) / E.view.s; E.view.z = E.pan.vz - (e.clientY - E.pan.sy) / E.view.s; draw(); return;
      }
      E.hover = [x, z]; E.hoverS = [sx, sy]; $('readout').textContent = `x ${x.toFixed(1)}  z ${z.toFixed(1)} m · ${E.lv === 0 ? 'begane grond' : E.lv + 'e verdieping'}`;
      if (E.drag) {
        if (E.drag.kind === 'floor') { if (paintFloor(x, z, E.drag.erase)) dirty3(); }
        else if (E.drag.kind === 'spiral') { const pa = P(...E.drag.a); if (Math.hypot(x - pa[0], z - pa[1]) > ts() * 0.35) E.drag.d = sectorDir(E.drag.a, x, z, E.wsd || 1); say('Wenteltrap · 12 treden van 25 cm · ' + ((E.wsd || 1) > 0 ? 'linksom' : 'rechtsom') + ' omhoog · instap aan de kant van de muis', 1500); }
        else if (E.drag.kind === 'wall' || E.drag.kind === 'stair') { const ds = dirSteps(E.drag.a, x, z, E.drag.kind === 'wall'), near = Math.hypot(x - P(...E.drag.a)[0], z - P(...E.drag.a)[1]) < ts() * 0.5; if (!near || E.drag.kind === 'wall') E.drag.d = ds.d; E.drag.n = near ? 0 : Math.max(E.drag.kind === 'stair' ? 1 : 0, ds.n);
          if (E.drag.kind === 'stair' && E.drag.n > 0 && E.tool !== 'ramp') {   // meting tijdens het slepen: lengte, treden en of de helling goed is
            const n = E.drag.n, len = n * ts(), u = E.tool === 'ustair', N = u ? 8 : 16, run = len / N, f = s => s.toFixed(2).replace('.', ',');
            const up = E.m.lv[E.lv + 1] && Object.keys(E.m.lv[E.lv + 1].f).length;
            say(`${n} ${n === 1 ? 'zijde' : 'zijden'} · ${f(len)} m · ${u ? '2 × 8' : '16'} treden van ${Math.round(run * 100)} cm · ${run < 0.25 ? 'te steil' : run > 0.5 ? 'erg flauw' : 'goede trap'}${up ? ' · rood: gat in de vloer erboven' : ' · nog geen vloer erboven'}`, 1500);
          } }
        else if (E.drag.kind === 'erase') { if (eraseAt(x, z, true)) dirty3(); }
        else if (E.drag.kind === 'selmove') { const v = vertexAt(x, z); E.drag.di = v[0] - E.drag.a[0]; E.drag.dj = v[1] - E.drag.a[1]; }
        else if (E.drag.kind === 'marq') E.drag.s1 = [sx, sy];
        else if (E.drag.kind === 'obj') { const D = E.drag; if (Math.hypot(x - D.x, z - D.z) > 0.6) { const free = e.ctrlKey || e.metaKey, r2 = aimRot(D.x, D.z, x, z, free); D.moved = true; if (r2 !== D.rot) { D.rot = r2; if (D.oi >= 0) { lvl().o[D.oi].rot = r2; rebuild3(); } } say('Draaiing ' + degOf(D.rot) + '°' + (free ? ' · vrij' : ' · per 30°, Ctrl: vrij'), 1200); } }
      }
      draw();
    });
    const end = e => {
      ptr.delete(e.pointerId);
      if (E.pan) { if (!ptr.size) { E.pan = null; cv.style.cursor = E.tool === 'hand' || E.tool === 'select' ? 'grab' : 'crosshair'; } return; }
      const D = E.drag; E.drag = null; if (!D) return;
      if (D.kind === 'wall' && D.n > 0) { snap(); const n = addWalls(D.a, D.d, D.n); if (n) say(n + (n === 1 ? ' muurdeel' : ' muurdelen'), 800); changed(); }
      else if (D.kind === 'stair' && D.n > 0) { snap(); lvl().s.push(newStair(D)); changed(); }
      else if (D.kind === 'stair') { snap(); lvl().s.push(newStair({ a: D.a, d: D.d, n: 3 })); changed(); say(E.tool === 'ramp' ? 'Helling geplaatst' : 'Trap geplaatst · sleep voor een andere lengte of richting', 1200); }
      else if (D.kind === 'spiral') { snap(); lvl().s.push(newSpiral(D)); changed(); say('Wenteltrap geplaatst', 900); }
      else if (D.kind === 'selmove') { if (D.di || D.dj) selMove(D.di, D.dj); else draw(); }
      else if (D.kind === 'marq') { if (Math.hypot(D.s1[0] - D.s0[0], D.s1[1] - D.s0[1]) < 5) { if (!D.add) E.sel = selEmpty(); } else { const R2 = selRect(D.s0, D.s1); if (D.add) { const S = sel(); for (const kk of ['f', 'w', 's', 'o', 'r']) for (const v of R2[kk]) S[kk].add(v); } else E.sel = R2; } renderCtx(); draw(); if (selCount(sel())) say(selSay(), 1200); }
      else if (D.kind === 'obj') { const L = lvl();
        if (D.oi >= 0) { const o = L.o[D.oi]; if (!D.moved) o.rot = normRot((o.rot || 0) + (D.back ? -ROT_STEP : ROT_STEP)); E.orot = o.rot; }
        else { snap(); if (D.moved) E.orot = D.rot; L.o.push({ t: E.obj, x: D.x, z: D.z, rot: D.moved ? D.rot : (E.orot || 0) }); }
        say('Draaiing ' + degOf(E.orot || 0) + '°', 900); changed(); renderCtx(); }
      else draw();
    };
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !E.drag) { E.hover = null; draw(); } });   // muis van het tekenvlak af: geen voorbeeld meer
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => { e.preventDefault(); if (E.tool === 'object' && (e.shiftKey || e.altKey)) { const dv = e.deltaY || e.deltaX; if (dv) rotStep(dv > 0 ? 1 : -1); return; } const rect = cv.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top; if (E.vm === '3d') { E.view.s = Math.max(3, Math.min(80, E.view.s * (e.deltaY < 0 ? 1.12 : 0.9))); dirty3(); return; } const [wx, wz] = toW(sx, sy); E.view.s = Math.max(3, Math.min(80, E.view.s * (e.deltaY < 0 ? 1.12 : 0.9))); const [nx, nz] = toW(sx, sy); E.view.x += wx - nx; E.view.z += wz - nz; draw(); }, { passive: false });
    function rotStep(sg) {   // Q/E, Shift+scroll of de knoppen: het voorwerp onder de muis, anders het volgende dat je neerzet
      const hv = E.hover, oi = hv && E.tool === 'object' ? objectAt(hv[0], hv[1], 0.8) : -1;
      if (oi >= 0) { snap(); const o = lvl().o[oi]; o.rot = normRot((o.rot || 0) + sg * ROT_STEP); E.orot = o.rot; changed(); } else { E.orot = normRot((E.orot || 0) + sg * ROT_STEP); draw(); }
      renderCtx(); say('Draaiing ' + degOf(E.orot) + '°', 800);
    }
    function zoom(f) { E.view.s = Math.max(3, Math.min(80, E.view.s * f)); if (E.vm === '3d') dirty3(); draw(); }
    function fit() { if (!E.m) return; const ext = R * (1 + 2 * (E.m.k || 0)) * 1.1; E.view.x = 0; E.view.z = 0; E.view.s = Math.min(W, H) / (2 * ext); if (E.vm === '3d') dirty3(); draw(); }
    document.addEventListener('keydown', e => {
      if (app.hidden) return; if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { spaceDown = true; e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      if (e.key === 'PageUp') { e.preventDefault(); $('lvUp').click(); return; } if (e.key === 'PageDown') { e.preventDefault(); $('lvDn').click(); return; }
      { const ctl = e.ctrlKey || e.metaKey, kl = e.key.toLowerCase();
        if (ctl && kl === 'c') { e.preventDefault(); selCopy(false); return; }
        if (!ctl && e.shiftKey && kl === 'c') { e.preventDefault(); runCheck(); return; }
        if (ctl && kl === 'x') { e.preventDefault(); selCopy(true); return; }
        if (ctl && kl === 'v') { e.preventDefault(); selPaste(e.shiftKey); return; }
        if (ctl && kl === 'a') { e.preventDefault(); setTool('select'); selAll(); return; }
        if (ctl && kl === 'd') { e.preventDefault(); selCopy(false); selPaste(false); return; }
        if (E.tool === 'select' && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); selDelete(); return; }
        if (E.tool === 'select' && !ctl && (kl === 'q' || kl === 'e')) { selRotate(kl === 'q' ? -1 : 1); return; } }
      if (e.key === 'Escape') { if (E.paste) E.paste = false; else if (E.tool === 'select') { E.sel = selEmpty(); renderCtx(); } E.drag = null; draw(); return; }
      if (e.key === '2') setView('2d'); if (e.key === '3') setView('3d'); if (e.key === 'n' || e.key === 'N') { bBrush.click(); return; }
      if (E.tool === 'object' && (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E')) { rotStep(e.key.toLowerCase() === 'q' ? -1 : 1); return; }
      const t = TOOLS.find(x => x[2].toLowerCase() === e.key.toLowerCase()); if (t) setTool(t[0]);
    });
    document.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
    // ---------- tekenen (bovenaanzicht) ----------
    function resize() { const r = stage.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height)); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); if (rnd) { rnd.setSize(W, H, false); cv3.width = W * dpr; cv3.height = H * dpr; rnd.setPixelRatio(dpr); dirty3(); } draw(); }
    window.addEventListener('resize', () => { if (!app.hidden) resize(); });
    const css = n => getComputedStyle(app).getPropertyValue(n).trim();
    function draw() { if (drawReq) return; drawReq = true; requestAnimationFrame(() => { drawReq = false; if (!app.hidden) paint(); }); }
    function hexPath(cx, cz, rad) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (30 + 60 * i) * Math.PI / 180, [sx, sz] = toS(cx + rad * Math.cos(a), cz + rad * Math.sin(a)); i ? ctx.lineTo(sx, sz) : ctx.moveTo(sx, sz); } ctx.closePath(); }
    function paint() {
      const m = E.m; if (!m) return; const L = lvl(), k = m.k || 0, t = ts(), s = E.view.s;
      const in3 = E.vm === '3d';
      if (in3) { camSync(); ctx.clearRect(0, 0, W, H); } else { ctx.fillStyle = css('--paper'); ctx.fillRect(0, 0, W, H); }
      // gebied (in 3D alleen de rand, op de hoogte van de verdieping)
      ctx.fillStyle = css('--area'); ctx.strokeStyle = in3 ? 'rgba(242,178,51,0.65)' : css('--grid2'); ctx.lineWidth = 1.5;
      for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) { const c = mv2CellXZ(q, r); hexPath(c[0], c[1], R); if (!in3) ctx.fill(); ctx.stroke(); }
      // raster: elke rib binnen of op de rand van het gebied (ook als het beginpunt erbuiten valt)
      if (s * t > 6) {
        ctx.strokeStyle = in3 ? 'rgba(20,24,16,0.45)' : css('--grid'); ctx.lineWidth = in3 ? 1.1 : 0.7; ctx.beginPath();   // in 3D donker: zichtbaar op lichte en donkere vloeren
        const ext = R * (1 + 2 * k) + t, iM = Math.ceil(ext / (t * SQ3 / 2)) + 1, jM = Math.ceil(ext / t) + iM;
        for (let i = -iM; i <= iM; i++) for (let j = -jM; j <= jM; j++) { const a = P(i, j); for (const D of MV2.DIR3) { const b = P(i + D[0], j + D[1]); if (!mv2NearArea(E.m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue; const A = toS(a[0], a[1]), B = toS(b[0], b[1]); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); } }
        ctx.stroke();
      }
      const tri = (id, fill) => { const [i, j, tt] = id.split(',').map(Number), v = mv2TriVerts(i, j, tt, t); ctx.beginPath(); v.forEach((p, n) => { const S = toS(p[0], p[1]); n ? ctx.lineTo(S[0], S[1]) : ctx.moveTo(S[0], S[1]); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
      const wallLine = (id, Wd, ghost) => {
        const [i, j, d] = id.split(',').map(Number), [a, b] = segOf(i, j, d), A = toS(a[0], a[1]), B = toS(b[0], b[1]), o = Wd.o || '';
        ctx.lineCap = 'butt'; ctx.strokeStyle = ghost ? 'rgba(233,236,223,0.25)' : (COL[Wd.m] || '#888'); ctx.lineWidth = ghost ? 2 : Math.max(3, (Wd.m === 'hedge' ? 0.6 : Wd.m === 'fence' ? 0.12 : 0.25) * s);
        if (!o || ghost) { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); if (!ghost && Wd.m === 'glass') { ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } return; }
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ow = o === 'door' ? Math.min(1.2, len - 0.6) : o === 'window' ? Math.max(0.6, len - 0.8) : o === 'gate' ? Math.max(1.5, len - 0.5) : len - 0.3, f0 = (len - ow) / 2 / len, f1 = 1 - f0;
        const lp = (f) => toS(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), P0 = lp(f0), P1 = lp(f1);
        if (o === 'window') { ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.lineWidth = Math.max(2, 0.12 * s); ctx.strokeStyle = '#bfe3f7'; ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke(); return; }   // raam: muur loopt door, met een lichte band
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(P0[0], P0[1]); ctx.moveTo(P1[0], P1[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        if (o === 'door') { ctx.lineWidth = 1.5; ctx.strokeStyle = '#f2b233'; const ang = Math.atan2(P1[1] - P0[1], P1[0] - P0[0]), rr = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]); ctx.beginPath(); ctx.arc(P0[0], P0[1], rr, ang, ang + Math.PI / 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P0[0] + Math.cos(ang + Math.PI / 2) * rr, P0[1] + Math.sin(ang + Math.PI / 2) * rr); ctx.stroke(); }
        else if (o === 'gate') { ctx.lineWidth = 2; ctx.strokeStyle = '#f2b233'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke(); ctx.setLineDash([]); }
        else { ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(233,236,223,0.5)'; ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke(); ctx.setLineDash([]); }
      };
      // voorwerp: omtrek (langwerpig: rechthoek langs de lengte; rond: cirkel) en een pijltje naar de voorkant
      const objShape = (o, fill, stroke, y) => {
        const Lf = OBJ_FOOT[o.t], rot = o.rot || 0, ux = Math.cos(rot), uz = Math.sin(rot), fx = -uz, fz = ux; ctx.beginPath();
        if (Lf) [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], n) => { const S5 = toS(o.x + ux * a * Lf[0] / 2 + fx * b * Lf[1] / 2, o.z + uz * a * Lf[0] / 2 + fz * b * Lf[1] / 2, y); n ? ctx.lineTo(S5[0], S5[1]) : ctx.moveTo(S5[0], S5[1]); });
        else { const r = OBJ_R[o.t] || 0.5; for (let k2 = 0; k2 <= 24; k2++) { const a = k2 / 24 * Math.PI * 2, S5 = toS(o.x + Math.cos(a) * r, o.z + Math.sin(a) * r, y); k2 ? ctx.lineTo(S5[0], S5[1]) : ctx.moveTo(S5[0], S5[1]); } }
        ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
        const reach = Math.max(1.1, (Lf ? Lf[1] / 2 : OBJ_R[o.t] || 0.5) + 0.6), A = toS(o.x, o.z, y), B = toS(o.x + fx * reach, o.z + fz * reach, y), an = Math.atan2(B[1] - A[1], B[0] - A[0]);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] - 8 * Math.cos(an - 0.5), B[1] - 8 * Math.sin(an - 0.5)); ctx.moveTo(B[0], B[1]); ctx.lineTo(B[0] - 8 * Math.cos(an + 0.5), B[1] - 8 * Math.sin(an + 0.5)); ctx.stroke();
      };
      const stairDraw = (S, ghost) => {
        const g = stairGeom(S), pts = g.poly.map(p => toS(p[0], p[1]));
        ctx.beginPath(); pts.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
        ctx.fillStyle = ghost ? 'rgba(242,178,51,0.25)' : (S.k === 'ramp' || S.k === 'hexramp' ? 'rgba(170,140,100,0.55)' : 'rgba(190,180,165,0.6)'); ctx.fill(); ctx.strokeStyle = ghost ? '#f2b233' : '#e9ecdf'; ctx.lineWidth = 1.2; ctx.stroke();
        if (S.k === 'spiral') {
          const c = g.a, a0 = Math.atan2(g.uz, g.ux), sd = g.sd; ctx.strokeStyle = ghost ? '#f2b233' : 'rgba(40,40,30,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
          for (let k2 = 0; k2 <= 12; k2++) { const an = a0 + sd * k2 * Math.PI / 6, p0 = toS(c[0] + Math.cos(an) * 0.37, c[1] + Math.sin(an) * 0.37), p1 = toS(c[0] + Math.cos(an) * 1.9, c[1] + Math.sin(an) * 1.9); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); }
          ctx.stroke(); ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2; ctx.beginPath();
          for (let k2 = 0; k2 <= 22; k2++) { const an = a0 + sd * (0.2 + k2 / 22 * 5.4), p = toS(c[0] + Math.cos(an) * 1.25, c[1] + Math.sin(an) * 1.25); k2 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke();
          { const an = a0 + sd * 5.6, tip = toS(c[0] + Math.cos(an) * 1.25, c[1] + Math.sin(an) * 1.25), bk = toS(c[0] + Math.cos(an - sd * 0.35) * 1.25, c[1] + Math.sin(an - sd * 0.35) * 1.25), ang = Math.atan2(tip[1] - bk[1], tip[0] - bk[0]); ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] - 8 * Math.cos(ang - 0.5), tip[1] - 8 * Math.sin(ang - 0.5)); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] - 8 * Math.cos(ang + 0.5), tip[1] - 8 * Math.sin(ang + 0.5)); ctx.stroke(); }
          return;
        }
        if (S.k === 'u') {   // twee steken met treden en pijlen: heen en, ernaast, terug
          const N = Math.max(2, Math.round(g.len / 0.28)); ctx.beginPath(); for (const c of [0, g.sd * g.w]) for (let n = 1; n <= N; n++) { const a = toS(...g.at(n * g.len / N, c - g.w / 2)), b = toS(...g.at(n * g.len / N, c + g.w / 2)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.strokeStyle = 'rgba(40,40,30,0.5)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2; ctx.beginPath(); const p0 = toS(...g.at(g.len * 0.1, 0)), p1 = toS(...g.at(g.len + g.w / 2, 0)), p2 = toS(...g.at(g.len + g.w / 2, g.sd * g.w)), p3 = toS(...g.at(g.len * 0.1, g.sd * g.w)); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.stroke(); return;
        }
        if (S.k === 'hexramp') { ctx.strokeStyle = 'rgba(40,40,30,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); for (let n = 1; n < 7; n++) { const a = toS(...g.at(n * g.len / 7, -4.5)), b = toS(...g.at(n * g.len / 7, 4.5)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.stroke(); }
        if (S.k !== 'ramp' && S.k !== 'hexramp') { const N = Math.max(2, Math.round(g.len / 0.28)); ctx.beginPath(); for (let n = 1; n < N; n++) { const a = toS(...g.at(n * g.len / N, -g.w / 2)), b = toS(...g.at(n * g.len / N, g.w / 2)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.strokeStyle = 'rgba(40,40,30,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
        const a0 = toS(...g.at(g.len * 0.15, 0)), a1 = toS(...g.at(g.len * 0.9, 0)); ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
        const ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]); ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a1[0] - 8 * Math.cos(ang - 0.5), a1[1] - 8 * Math.sin(ang - 0.5)); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a1[0] - 8 * Math.cos(ang + 0.5), a1[1] - 8 * Math.sin(ang + 0.5)); ctx.stroke();
      };
      if (in3) { ghostWant = null; paintHover(); objGhost(ghostWant); heightMeter(); return; }   // in 3D toont het model zelf vloeren, muren en trappen
      // verdieping eronder: vaag
      if (E.lv > 0) { const U = m.lv[E.lv - 1]; ctx.globalAlpha = 0.35; for (const id in U.f) tri(id, COL[U.f[id]] || '#888'); ctx.globalAlpha = 1; for (const id in U.w) wallLine(id, U.w[id], true); }
      // huidige verdieping
      for (const id in L.f) tri(id, COL[L.f[id]] || '#888');
      for (const id in L.r) { const [q, r] = id.split(',').map(Number); roofDraw(q, r, L.r[id], false); }
      for (const S of L.s) stairDraw(S, false);
      for (const id in L.w) wallLine(id, L.w[id], false);
      for (const o of L.o) { ctx.lineWidth = 1.2; objShape(o, 'rgba(23,27,20,0.25)', '#9aa38c'); const S2 = toS(o.x, o.z); ctx.fillStyle = 'rgba(23,27,20,0.7)'; ctx.beginPath(); ctx.arc(S2[0], S2[1], Math.max(8, 0.5 * s), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#9aa38c'; ctx.lineWidth = 1; ctx.stroke(); ctx.font = `${Math.max(11, Math.min(26, 0.8 * s))}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(OBJ_GLYPH[o.t] || '•', S2[0], S2[1] + 1); }
      // randcodes op de begane grond
      if (E.lv === 0) { const codes = modV2Codes(m); for (const kk in codes) { const [q, r, sd] = kk.split(',').map(Number), c = mv2CellXZ(q, r), f = FRAMES[sd], mx = c[0] + f.nx * (INNER - 0.4), mz = c[1] + f.nz * (INNER - 0.4), A = toS(mx - f.tx * 2.2, mz - f.tz * 2.2), B = toS(mx + f.tx * 2.2, mz + f.tz * 2.2); ctx.strokeStyle = CODE_COL[codes[kk]] || 'rgba(0,0,0,0)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } }
      ghostWant = null; paintHover(); objGhost(null); heightMeter();
      // schaalbalk
      ctx.fillStyle = css('--muted'); ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillRect(W - 12 - 10 * s, H - 16, 10 * s, 2); ctx.fillText('10 m', W - 12 - 10 * s, H - 20);
      // tijdens het slepen van een trap: welke vloervlakken de trap bedekt (oranje) en welk gat er in de vloer erboven komt (rood gestippeld)
      function stairPreviewCover(S1) {
        const g = stairGeom(S1), L = lvl(), U = E.m.lv[E.lv + 1], yUp = (E.lv + 1) * MV2.LV_H + 0.03;
        const triPath = (v, y) => { ctx.beginPath(); v.forEach((p, n) => { const S5 = toS(p[0], p[1], y); n ? ctx.lineTo(S5[0], S5[1]) : ctx.moveTo(S5[0], S5[1]); }); ctx.closePath(); };
        ctx.save(); let nCov = 0, nHole = 0;
        // de driehoeken die de trap bezet: vol = helemaal, lichter = deels (oranje omlijnd)
        for (const c of coverTris(g.poly)) { triPath(c.v); ctx.fillStyle = `rgba(242,178,51,${(0.1 + 0.4 * c.fr).toFixed(2)})`; ctx.fill(); ctx.strokeStyle = 'rgba(242,178,51,0.95)'; ctx.lineWidth = 1.4; ctx.stroke(); if (c.fr > 0.5) nCov++; }
        stairDraw(S1, true);
        if (U) { const h = mv2StairHole(S1, t); ctx.strokeStyle = '#ff5a4d'; ctx.fillStyle = 'rgba(255,90,77,0.22)'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
          for (const id in U.f) { const [i, j, tt] = id.split(',').map(Number), v = mv2TriVerts(i, j, tt, t), hk = h(v); if (!hk) continue; nHole++; triPath(v, in3 ? yUp : undefined); ctx.stroke(); if (hk.keep) { const pl = mv2ClipKeep(v, [-hk.keep[0], -hk.keep[1], -hk.keep[2]]); if (pl.length >= 3) { triPath(pl, in3 ? yUp : undefined); ctx.fill(); } } else ctx.fill(); }
          ctx.setLineDash([]); }
        ctx.restore();
        E.coverInfo = { bedekt: nCov, gat: nHole, boven: !!U };
      }
      // plaatsingsvoorbeeld: in 3D het echte voorwerp half doorzichtig, in beide weergaven de omtrek en de voorkant
      function objPreview(o) {
        ghostWant = o; ctx.lineWidth = 2; objShape(o, 'rgba(242,178,51,0.22)', '#f2b233', in3 ? lvY() + 0.05 : undefined);
        if (!in3) { const S2 = toS(o.x, o.z); ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.85; ctx.font = `${Math.max(12, Math.min(28, 0.9 * s))}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(OBJ_GLYPH[o.t] || '•', S2[0], S2[1] + 1); ctx.globalAlpha = 1; }
      }
      // selectie: blauw; tijdens verplaatsen of plakken het nieuwe stuk oranje; de rechthoek gestippeld
      function clipPaint(c, col, fill, lw) {
        ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = fill; ctx.lineWidth = lw || 2; const yb = lvY();
        for (const [i, j, t] of c.f) { const v = mv2TriVerts(i, j, t, ts()); ctx.beginPath(); v.forEach((p, n) => { const S5 = toS(p[0], p[1]); n ? ctx.lineTo(S5[0], S5[1]) : ctx.moveTo(S5[0], S5[1]); }); ctx.closePath(); ctx.fill(); }
        for (const [i, j, d] of c.w) { const [a, b] = segOf(i, j, d); if (in3) { const P4 = [[a, yb], [b, yb], [b, yb + MV2.LV_H], [a, yb + MV2.LV_H]].map(([p, y]) => toS(p[0], p[1], y)); ctx.beginPath(); P4.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); } else { const A = toS(a[0], a[1]), B = toS(b[0], b[1]); ctx.save(); ctx.lineWidth = Math.max(5, 0.32 * s); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.restore(); } }
        for (const St of c.s) { const g = stairGeom(St), pts = g.poly.map(p => toS(p[0], p[1])); ctx.beginPath(); pts.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); }
        for (const o of c.o) objShape(o, fill, col, in3 ? yb + 0.05 : undefined);
        for (const [q, r] of c.r) { const cc = mv2CellXZ(q, r); hexPath(cc[0], cc[1], R - 0.3); ctx.stroke(); }
        ctx.restore();
      }
      function selPaint() {
        const S = sel(), D = E.drag;
        if (selCount(S)) { const c = selClip(S); if (D && D.kind === 'selmove' && (D.di || D.dj)) { clipPaint(c, 'rgba(79,176,255,0.55)', 'rgba(79,176,255,0.10)', 1.5); clipPaint(clipShift(c, D.di, D.dj).out, '#f2b233', 'rgba(242,178,51,0.32)', 2.5); } else clipPaint(c, '#4fb0ff', 'rgba(79,176,255,0.28)', 2.5); }
        if (E.paste && E.clip && E.hover) { const v = vertexAt(E.hover[0], E.hover[1]); clipPaint(clipShift(E.clip.c, v[0] - E.clip.pv[0], v[1] - E.clip.pv[1]).out, '#f2b233', 'rgba(242,178,51,0.32)', 2.5); }
        if (D && D.kind === 'marq') { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#4fb0ff'; ctx.fillStyle = 'rgba(79,176,255,0.10)'; ctx.lineWidth = 1.5; const a = D.s0, b = D.s1, rx = Math.min(a[0], b[0]), ry = Math.min(a[1], b[1]), rw = Math.abs(b[0] - a[0]), rh = Math.abs(b[1] - a[1]); ctx.fillRect(rx, ry, rw, rh); ctx.strokeRect(rx, ry, rw, rh); ctx.restore(); }
      }
      // dak in het bovenaanzicht: zeshoek op de straal van het dak (volgt de muren), schilddak met graten, zadeldak met de nok
      function roofDraw(q, r, kind, ghost) {
        const c = mv2CellXZ(q, r), rr = mv2RoofFit(E.m, E.lv, q, r) + (mv2RoofFit(E.m, E.lv, q, r) < R ? 0.35 : -0.3), red = kind !== 'flat', V = k => toS(c[0] + rr * Math.cos((30 + 60 * k) * Math.PI / 180), c[1] + rr * Math.sin((30 + 60 * k) * Math.PI / 180));
        hexPath(c[0], c[1], rr); ctx.fillStyle = ghost ? 'rgba(242,178,51,0.18)' : red ? 'rgba(168,71,58,0.35)' : 'rgba(141,143,138,0.35)'; ctx.fill(); ctx.strokeStyle = ghost ? '#f2b233' : red ? '#a8473a' : '#8d8f8a'; ctx.lineWidth = 2; ctx.stroke();
        const g = /^gable(\d)$/.exec(kind || ''); ctx.beginPath(); ctx.lineWidth = g ? 2.5 : 1;
        if (g) { const a = +g[1] % 3, A = V(a), B = V(a + 3); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); }
        else if (kind === 'hip') { const C = toS(c[0], c[1]); for (let k = 0; k < 6; k++) { const S2 = V(k); ctx.moveTo(C[0], C[1]); ctx.lineTo(S2[0], S2[1]); } }
        ctx.stroke();
      }
      function checkPaint() {
        const r = E.check; if (!r) return; const bad = r.bad.get(E.lv); ctx.save();
        if (bad) { ctx.fillStyle = 'rgba(255,72,56,0.42)'; ctx.strokeStyle = 'rgba(255,72,56,0.9)'; ctx.lineWidth = 1; for (const id of bad) { const v = mv2TriVerts(...id.split(',').map(Number), ts()); ctx.beginPath(); v.forEach((p, n) => { const S5 = toS(p[0], p[1]); n ? ctx.lineTo(S5[0], S5[1]) : ctx.moveTo(S5[0], S5[1]); }); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
        ctx.font = '600 12px system-ui, sans-serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        for (const k of r.marks) { if (k.li !== E.lv) continue; const S5 = toS(k.x, k.z); ctx.fillStyle = '#ff4838'; ctx.beginPath(); ctx.arc(S5[0], S5[1], 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); const tw = ctx.measureText(k.msg).width; ctx.fillStyle = 'rgba(23,27,20,0.88)'; ctx.fillRect(S5[0] + 11, S5[1] - 10, tw + 12, 20); ctx.fillStyle = '#ff8a7d'; ctx.fillText(k.msg, S5[0] + 17, S5[1]); }
        const other = [...new Set([...r.bad.keys(), ...r.marks.map(k => k.li)])].filter(li => li !== E.lv); if (other.length) { const txt = 'Ook rood op: ' + other.map(li => li === 0 ? 'BG' : li + 'e').join(', ') + ' (Page Up/Down)'; ctx.font = '600 12px system-ui, sans-serif'; const tw = ctx.measureText(txt).width; ctx.fillStyle = 'rgba(23,27,20,0.88)'; ctx.fillRect(W / 2 - tw / 2 - 8, 12, tw + 16, 24); ctx.fillStyle = '#ff8a7d'; ctx.textAlign = 'center'; ctx.fillText(txt, W / 2, 24); }
        ctx.restore();
      }
      function paintHover() {
      checkPaint();
      if (E.tool === 'select') selPaint();
      // voorbeeld van wat je doet
      const hv = E.hover, D = E.drag;
      if (D && D.kind === 'wall' && D.n > 0) { for (const [i, j, d] of segsBetween(D.a, D.d, D.n)) wallLine(wallKey(i, j, d), { m: E.wmat, o: '' }, false); }
      else if (D && D.kind === 'stair') { stairPreviewCover(D.n > 0 ? newStair(D) : newStair({ a: D.a, d: D.d, n: 3 })); }
      else if (D && D.kind === 'spiral') stairPreviewCover(newSpiral(D));
      else if (D && D.kind === 'obj' && D.oi < 0) objPreview({ t: E.obj, x: D.x, z: D.z, rot: D.rot });
      else if (D && D.kind === 'obj') { const o = lvl().o[D.oi]; if (o) { ctx.lineWidth = 2.5; objShape(o, 'rgba(242,178,51,0.18)', '#f2b233', in3 ? lvY() + 0.05 : undefined); } }
      else if (hv && !E.pan) {
        const [x, z] = hv; ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2;
        if (E.tool === 'floor') { for (const id of brushTris(x, z).filter(okTri)) { const v = mv2TriVerts(id[0], id[1], id[2], t); ctx.beginPath(); v.forEach((p, n) => { const S3 = toS(p[0], p[1]); n ? ctx.lineTo(S3[0], S3[1]) : ctx.moveTo(S3[0], S3[1]); }); ctx.closePath(); ctx.stroke(); } }
        else if (E.tool === 'stair' || E.tool === 'ramp' || E.tool === 'ustair' || E.tool === 'spiral') stairPreviewCover(hoverStair(x, z));   // al vóór het klikken: de trap en de driehoeken die hij bezet
        else if (E.tool === 'wall') { const v = vertexAt(x, z), p = toS(...P(v[0], v[1])); ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.stroke(); }
        else if (E.tool === 'erase') {   // gum: wat er onder de muis weggaat, rood oplichten (zelfde keus als bij het klikken)
          const T = eraseTarget(x, z, !!(D && D.kind === 'erase')), RED = '#ff5a4d', fillR = 'rgba(255,90,77,0.35)'; E.lastT = T;
          if (T) {
            ctx.save(); ctx.strokeStyle = RED; ctx.fillStyle = fillR; ctx.lineWidth = 3;
            const y0 = lvY(), poly3 = P3 => { ctx.beginPath(); P3.forEach((q, n) => { const S5 = toS(q[0], q[1], q[2]); n ? ctx.lineTo(S5[0], S5[1]) : ctx.moveTo(S5[0], S5[1]); }); ctx.closePath(); ctx.fill(); ctx.stroke(); };
            if (T.kind === 'voorwerp') { const o = lvl().o[T.oi], S2 = toS(o.x, o.z, in3 ? y0 + 0.6 : undefined); ctx.beginPath(); ctx.arc(S2[0], S2[1], Math.max(11, 0.65 * s), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
            else if (T.kind === 'muur') {   // in 3D de hele wand, van onder tot boven
              const [i, j, d] = T.id.split(',').map(Number), [a, b] = segOf(i, j, d);
              if (in3) poly3([[a[0], a[1], y0], [b[0], b[1], y0], [b[0], b[1], y0 + MV2.LV_H], [a[0], a[1], y0 + MV2.LV_H]]);
              else { const A = toS(a[0], a[1]), B = toS(b[0], b[1]); ctx.lineWidth = Math.max(6, 0.35 * s); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); }
            }
            else if (T.si !== undefined) {   // in 3D het schuine trapvlak (en het bordes), anders de omtrek
              const S0 = lvl().s[T.si], g = stairGeom(S0), w = g.w, rise = MV2.LV_H;
              if (in3 && S0.k === 'u') { const c2 = g.sd * w; poly3([[...g.at(0, -w / 2), y0], [...g.at(0, w / 2), y0], [...g.at(g.len, w / 2), y0 + rise / 2], [...g.at(g.len, -w / 2), y0 + rise / 2]]); poly3([[...g.at(g.len, c2 - w / 2), y0 + rise / 2], [...g.at(g.len, c2 + w / 2), y0 + rise / 2], [...g.at(0, c2 + w / 2), y0 + rise], [...g.at(0, c2 - w / 2), y0 + rise]]); }
              else if (in3 && S0.k !== 'hexramp' && S0.k !== 'spiral') { poly3([[...g.at(0, -w / 2), y0], [...g.at(0, w / 2), y0], [...g.at(g.len, w / 2), y0 + rise], [...g.at(g.len, -w / 2), y0 + rise]]); if (S0.k === 'stair') poly3([[...g.at(g.len, -w / 2), y0 + rise], [...g.at(g.len, w / 2), y0 + rise], [...g.at(g.len + w * SQ3 / 2, 0), y0 + rise]]); }
              else { const pts = g.poly.map(p => toS(p[0], p[1])); ctx.beginPath(); pts.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); }
            }
            else if (T.kind === 'dak') { const c = mv2CellXZ(T.q, T.r); hexPath(c[0], c[1], R - 0.3); ctx.fill(); ctx.stroke(); }
            else if (T.tris) { for (const id of T.tris) { const v = mv2TriVerts(id[0], id[1], id[2], t); ctx.beginPath(); v.forEach((p, n) => { const S3 = toS(p[0], p[1]); n ? ctx.lineTo(S3[0], S3[1]) : ctx.moveTo(S3[0], S3[1]); }); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
            const M = toS(x, z), lab = 'Weghalen: ' + T.kind; ctx.font = '600 12px system-ui, sans-serif'; const tw = ctx.measureText(lab).width;
            ctx.fillStyle = 'rgba(23,27,20,0.88)'; ctx.fillRect(M[0] + 14, M[1] - 30, tw + 14, 22); ctx.fillStyle = RED; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lab, M[0] + 21, M[1] - 19);
            ctx.restore();
          }
        }
        else if (['door', 'window', 'gate', 'open', 'close'].includes(E.tool)) { const w = nearestWall(x, z); if (w) { const [i, j, d] = w.id.split(',').map(Number), [a, b] = segOf(i, j, d), A = toS(a[0], a[1]), B = toS(b[0], b[1]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } }
        else if (E.tool === 'hexramp') { if (inArea(x, z)) { const [q, r] = cellAt(x, z), c = mv2CellXZ(q, r); let side = 0, bd = -1e9; FRAMES.forEach((f, k) => { const d = (x - c[0]) * f.nx + (z - c[1]) * f.nz; if (d > bd) { bd = d; side = k; } }); stairDraw({ k: 'hexramp', q, r, side, a: [0, 0], d: 0, n: 1 }, true); } }
        else if (E.tool === 'roof') { if (inArea(x, z)) { const [q, r] = cellAt(x, z); roofDraw(q, r, roofKindAt(x, z), true); } }
        else if (E.tool === 'room') { if (inArea(x, z)) { const [q, r] = cellAt(x, z), c = mv2CellXZ(q, r); hexPath(c[0], c[1], R - 0.3); ctx.stroke(); } }
        else if (E.tool === 'object') {
          const oi = objectAt(x, z, 0.8);
          if (oi >= 0) { const o = lvl().o[oi]; ctx.lineWidth = 2.5; objShape(o, 'rgba(242,178,51,0.18)', '#f2b233', in3 ? lvY() + 0.05 : undefined); const M = toS(x, z), lab = 'Klik: 30° draaien · slepen: richten · ' + degOf(o.rot || 0) + '°'; ctx.font = '600 12px system-ui, sans-serif'; const tw = ctx.measureText(lab).width; ctx.fillStyle = 'rgba(23,27,20,0.88)'; ctx.fillRect(M[0] + 14, M[1] - 30, tw + 14, 22); ctx.fillStyle = '#f2b233'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(lab, M[0] + 21, M[1] - 19); }
          else if (inArea(x, z)) objPreview({ t: E.obj, x: snapObj(x), z: snapObj(z), rot: E.orot || 0 });
        }
      }
      }
      // Hoogtemeter op het noorden: een paal met een streep per verdieping (3 m); waar je tekent is oranje
      function heightMeter() {
        const ext = R * (1 + 2 * k) + 3, top = Math.max(E.m.lv.length, E.lv + 1) + 1, px = 0, pz = -ext;
        ctx.save(); ctx.font = '600 12px system-ui, sans-serif'; ctx.textBaseline = 'middle';
        if (in3) {
          const B = toS(px, pz, 0), T = toS(px, pz, top * MV2.LV_H);
          ctx.strokeStyle = 'rgba(233,236,223,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(T[0], T[1]); ctx.stroke();
          for (let l = 0; l <= top; l++) {
            const y = l * MV2.LV_H, A = toS(px, pz, y), C = toS(px + 1.6, pz, y), cur = l === E.lv;
            ctx.strokeStyle = cur ? '#f2b233' : 'rgba(233,236,223,0.8)'; ctx.lineWidth = cur ? 4 : 2; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(C[0], C[1]); ctx.stroke();
            if (l < top) { ctx.fillStyle = cur ? '#f2b233' : 'rgba(233,236,223,0.85)'; ctx.textAlign = 'left'; ctx.fillText((l === 0 ? 'BG' : l + 'e') + ' · ' + y + ' m', C[0] + 6, C[1]); }
          }
          // lijn van de paal naar de rand van het gebied op de huidige hoogte, en een N
          const A = toS(px, pz, lvY()), Z = toS(0, -(R * (1 + 2 * k) - 1), lvY()); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(242,178,51,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Z[0], Z[1]); ctx.stroke(); ctx.setLineDash([]);
          const N = toS(px, pz - 3, 0); ctx.fillStyle = '#e9ecdf'; ctx.font = '800 16px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('N', N[0], N[1]);
        } else {
          // bovenaanzicht: een ladder boven het gebied (noorden is boven)
          const S0 = toS(px, pz), x0 = S0[0], y0 = Math.max(70, S0[1]) - 6, step = 13;
          ctx.textAlign = 'center'; ctx.fillStyle = '#e9ecdf'; ctx.font = '800 14px system-ui, sans-serif'; ctx.fillText('N', x0, y0 - top * step - 12); ctx.font = '600 11px system-ui, sans-serif';
          for (let l = 0; l < top; l++) { const cur = l === E.lv, yy = y0 - l * step; ctx.fillStyle = cur ? '#f2b233' : 'rgba(233,236,223,0.25)'; ctx.fillRect(x0 - 14, yy - 5, 28, 10); ctx.fillStyle = cur ? '#1d1a10' : '#e9ecdf'; ctx.fillText(l === 0 ? 'BG' : String(l), x0, yy); }
          ctx.textAlign = 'left'; ctx.fillStyle = '#f2b233'; ctx.fillText((E.lv === 0 ? 'begane grond' : E.lv + 'e verdieping') + ' · ' + E.lv * MV2.LV_H + ' m', x0 + 20, y0 - E.lv * step);
        }
        ctx.restore();
      }
    }
    // ---------- 3D-weergave ----------
    let rnd = null, scn = null, grp = null, t3 = 0, cam = null, sun = null, base = null;
    let ghost = null, ghostKey = '', ghostWant = null;
    function objGhost(o) {   // het voorwerp dat je gaat neerzetten, half doorzichtig in de 3D-weergave
      if (!scn) return; const key = o && E.vm === '3d' ? o.t + '|' + o.rot.toFixed(3) : ''; let ch = false;
      if (key !== ghostKey) {
        ch = true; ghostKey = key;
        if (ghost) { scn.remove(ghost); ghost.traverse(c => { if (c.isMesh) { c.geometry.dispose(); (Array.isArray(c.material) ? c.material : [c.material]).forEach(mt => mt.dispose()); } }); ghost = null; }
        if (key) { const gm = mv2Fix({ v: 2, name: 'voorbeeld', cat: 'Overig', k: 0, n: E.m.n || 4, lv: [{ f: {}, w: {}, s: [], r: {}, o: [{ t: o.t, x: 0, z: 0, rot: o.rot }] }] });
          try { ghost = mv2Build(gm, (x2, z2) => [x2, z2]).group; } catch (err) { ghost = null; }
          if (ghost) { ghost.traverse(c => { if (c.isMesh) { c.material = (Array.isArray(c.material) ? c.material : [c.material]).map(mt => { const q = mt.clone(); q.transparent = true; q.opacity = 0.6; q.depthWrite = false; return q; }); if (c.material.length === 1) c.material = c.material[0]; c.castShadow = false; } }); scn.add(ghost); } }
      }
      if (ghost && o) { const y = lvY(); if (ghost.position.x !== o.x || ghost.position.z !== o.z || ghost.position.y !== y) { ghost.position.set(o.x, y, o.z); ch = true; } }
      if (ch && E.vm === '3d' && rnd) { camSync(); rnd.render(scn, cam); }
    }
    function ensure3() {
      if (rnd) return;
      rnd = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, alpha: true }); rnd.outputEncoding = renderer.outputEncoding; rnd.shadowMap.enabled = true; rnd.setPixelRatio(dpr); rnd.setSize(W, H, false);
      scn = new THREE.Scene(); scn.add(new THREE.HemisphereLight('#dfe8ff', '#5f6650', 0.85)); sun = new THREE.DirectionalLight('#fff4dc', 0.95); sun.position.set(40, 70, 30); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 300 }); scn.add(sun);
      cam = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
      base = new THREE.Mesh(new THREE.CircleGeometry(200, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2b3324' })); base.position.y = -0.02; base.receiveShadow = true; scn.add(base);
    }
    // camera volgt E.view (midden en zoom) en E.th / E.ph (draaien); het doel ligt op de verdieping waar je tekent
    function camSync() {
      if (!cam) return; const d = Math.max(12, (H / 2) / (E.view.s * Math.tan(cam.fov * Math.PI / 360))), cy = E.lv * MV2.LV_H;
      cam.aspect = W / H; cam.position.set(E.view.x + d * Math.sin(E.ph) * Math.sin(E.th), cy + d * Math.cos(E.ph), E.view.z + d * Math.sin(E.ph) * Math.cos(E.th)); cam.lookAt(E.view.x, cy, E.view.z); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    // dirty3: het model is veranderd (opnieuw bouwen, iets later); camera bewogen: alleen opnieuw tekenen (volgende frame)
    let rq3 = false;
    function dirty3() { if (E.vm !== '3d') return; if (!rq3) { rq3 = true; requestAnimationFrame(() => { rq3 = false; render3(); draw(); }); } }
    function rebuild3() { if (E.vm !== '3d') return; clearTimeout(t3); t3 = setTimeout(() => { buildGrp(); render3(); }, 40); }
    function render3() { if (app.hidden || E.vm !== '3d') return; ensure3(); if (!grp) buildGrp(); camSync(); rnd.render(scn, cam); }
    function buildGrp() {
      if (app.hidden || E.vm !== '3d') return; ensure3();
      if (grp) { grp.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); scn.remove(grp); grp = null; }
      const mm = E.upto ? Object.assign({}, E.m, { lv: E.m.lv.slice(0, E.lv + 1) }) : E.m;
      try { grp = mv2Build(mm, (x, z) => [x, z]).group; scn.add(grp); } catch (e) { say('3D kan niet: ' + e.message, 3000); }
      // gebied als zeshoeken op de grond
      const k = E.m.k || 0; const area = new THREE.Group(); for (let q = -k; q <= k; q++) for (let r = -k; r <= k; r++) if (mv2HexDist(q, r) <= k) { const c = mv2CellXZ(q, r), h = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.15, R - 0.15, 0.06, 6), new THREE.MeshStandardMaterial({ color: '#4d5a3e' })); h.position.set(c[0], 0.0, c[1]); h.receiveShadow = true; h.userData.own = true; area.add(h); } if (grp) grp.add(area); else scn.add(area);
    }
    // ---------- module: laden, bewaren, bibliotheek ----------
    const catSel = $('cat'); for (const c of MV2.cats) { const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o); }
    function loadModule(m, idx) { E.m = mv2Fix(JSON.parse(JSON.stringify(m))); E.editing = idx; E.lv = 0; E.undo = []; E.redo = []; E.dirty = false; $('name').value = E.m.name; catSel.value = E.m.cat || 'Overig'; $('area').value = String(E.m.k || 0); $('grid').value = String(E.m.n || 4); fit(); changed(); renderLib(); }
    function newModule() { loadModule(mv2New('Nieuwe module'), -1); $('name').value = ''; say('Nieuwe module: begin met vloer of muren', 2500); }
    function save(asCopy) {
      const m = E.m; m.name = ($('name').value || '').trim() || 'Module ' + (modules.length + 1); m.cat = catSel.value; m.codes = modV2Codes(m); m._sig = Date.now(); m.name = m.name.replace(/( · \d+[Lv])+$/, '') + modSuffix(modMeta(m)); $('name').value = m.name;   // lagen en maat altijd achteraan, kloppend
      if (asCopy || E.editing < 0 || !modules[E.editing]) { m.id = uid(); modules.push(JSON.parse(JSON.stringify(m))); E.editing = modules.length - 1; }
      else { modules[E.editing] = JSON.parse(JSON.stringify(m)); const n = syncModule(modules[E.editing]); if (n) say('"' + m.name + '" bewaard · ' + n + ' in de stad bijgewerkt', 2500); }
      E.dirty = false; saveMods(); renderStrip(); renderLib(); if (!asCopy) say('"' + m.name + '" bewaard'); else say('Kopie bewaard als "' + m.name + '"');
    }
    $('bSave').onclick = () => save(false); $('bDup').onclick = () => { $('name').value = ($('name').value || E.m.name).replace(/( · \d+[Lv])+$/, '') + ' · kopie'; save(true); };
    $('bNew').onclick = () => { if (E.dirty && !sure('new', 'Niet-bewaarde wijzigingen weggooien?')) return; newModule(); };
    $('name').addEventListener('input', () => { E.dirty = true; });
    catSel.addEventListener('change', () => { E.m.cat = catSel.value; E.dirty = true; });
    $('area').addEventListener('change', () => { snap(); E.m.k = +$('area').value; fit(); changed(); });
    $('grid').addEventListener('change', () => {
      const n = +$('grid').value, old = E.m.n || 4; if (n === old) return;
      if (n < old) { const empty = E.m.lv.every(isEmptyLevel); if (!empty) { $('grid').value = String(old); say('Grover raster kan alleen bij een lege module', 2500); return; } snap(); E.m.n = n; changed(); return; }
      snap(); refineModule(E.m, n / old); changed(); say('Raster verfijnd naar ' + (R / n).toLocaleString('nl', { maximumFractionDigits: 2 }) + ' m');
    });
    function refineModule(m, f) {   // f = 2: elk rasterpunt (i,j) wordt (2i,2j); driehoeken en ribben splitsen
      for (const L of m.lv) {
        const nf = {}; for (const id in L.f) { const [i, j, t] = id.split(',').map(Number), mat = L.f[id]; const I2 = i * f, J = j * f; if (f === 2) { if (!t) [[I2, J, 0], [I2 + 1, J, 0], [I2, J + 1, 0], [I2, J, 1]].forEach(k => { nf[k.join(',')] = mat; }); else [[I2 + 1, J, 1], [I2, J + 1, 1], [I2 + 1, J + 1, 1], [I2 + 1, J + 1, 0]].forEach(k => { nf[k.join(',')] = mat; }); } else nf[id] = mat; } L.f = nf;
        const nw = {}; for (const id in L.w) { const [i, j, d] = id.split(',').map(Number), D = MV2.DIRW[d]; for (let s = 0; s < f; s++) nw[wallKey(i * f + D[0] * s, j * f + D[1] * s, d)] = Object.assign({}, L.w[id]); } L.w = nw;
        for (const S of L.s) { S.a = [S.a[0] * f, S.a[1] * f]; S.n = S.n * f; }
      }
      m.n = (m.n || 4) * f;
    }
    function renderLib() {
      const el = $('lib'), q = ($('filter').value || '').trim().toLowerCase(); el.innerHTML = '';
      const ord = c => { const k = MV2.cats.indexOf(c || 'Overig'); return k < 0 ? 99 : k; }, coll = new Intl.Collator('nl', { numeric: true, sensitivity: 'base' });
      const list = modules.map((m, i) => [m, i]).filter(([m]) => !q || q.split(/\s+/).every(w => ((m.name || '') + ' ' + (m.cat || '')).toLowerCase().includes(w))).sort(([a], [b]) => ord(a.cat) - ord(b.cat) || coll.compare(a.name || '', b.name || ''));
      $('libN').textContent = list.length + (list.length === modules.length ? '' : ' van ' + modules.length);
      for (const [m, i] of list) {
        const d = document.createElement('div'); d.className = 'mod'; d.setAttribute('aria-current', String(i === E.editing));
        const c = m.v === 2 ? mv2Thumb(m, 0, 18) : modThumb(m, 0, 18); d.appendChild(c);
        const sp = document.createElement('span'); const M = modMeta(m); sp.innerHTML = `${m.name}<small>${m.v === 2 ? (m.cat || 'Overig') + ' · ' + (M.n === 7 ? '7 vakken' : '1 vak') + (M.bouw ? ' · ' + M.fl + (M.fl === 1 ? ' laag' : ' lagen') : '') + (M.stack ? ' · plat dak' : '') : 'oude schets'}</small>`; d.appendChild(sp);
        const del = document.createElement('button'); del.type = 'button'; del.textContent = '×'; del.title = 'Verwijderen'; del.addEventListener('click', ev => { ev.stopPropagation(); if (!sure('del' + m.id, '"' + m.name + '" verwijderen? Geplaatste exemplaren gaan ook weg')) { del.textContent = 'Zeker?'; del.classList.add('warn'); return; } say('"' + m.name + '" verwijderd'); dropModule(m); modules.splice(i, 1); if (E.editing === i) { E.editing = -1; } else if (E.editing > i) E.editing--; saveMods(); renderStrip(); renderLib(); });
        d.appendChild(del);
        d.addEventListener('click', () => { if (m.v !== 2) { say('Een oude schets-module kun je hier niet bewerken; wel plaatsen of verwijderen', 3000); return; } if (E.dirty && !sure('load' + m.id, 'Niet-bewaarde wijzigingen weggooien?')) return; loadModule(m, i); });
        el.appendChild(d);
      }
    }
    $('filter').addEventListener('input', renderLib);
    // delen
    async function download(name, text) {
      try { const dl = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('downloads') : null; if (dl) { try { await dl.save({ filename: name, data: text }); say('Bestand bewaard'); } catch (e) { say(e && e.code === 'declined' ? 'Niet bewaard' : 'Bewaren lukt hier niet'); } return; } } catch (e) { /* geen artifact-omgeving */ }
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    $('bExport').onclick = () => { const m = E.m; download((m.name || 'module').replace(/[^\w\-]+/g, '_') + '.json', JSON.stringify(m)); };
    $('bExportAll').onclick = () => download('hexstad-modules.json', JSON.stringify(modules));
    $('bFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; f.text().then(t => { try { const o = JSON.parse(t), list = Array.isArray(o) ? o : [o]; let n = 0; for (const m of list) { if (!m || typeof m !== 'object') continue; if (m.v === 2) mv2Fix(m); else if (!Array.isArray(m.edges)) continue; m.id = uid(); modules.push(m); n++; } saveMods(); renderStrip(); renderLib(); say(n + ' module(s) geladen'); } catch (err) { say('Geen geldig bestand'); } e.target.value = ''; }); };
        $('bStd').onclick = () => { if (!sure('std', 'Standaardmodules terugzetten? Aangepaste standaardmodules worden overschreven; je eigen modules blijven staan')) return; const n = libInstall(true); for (const m of modules) if (m.v === 2) syncModule(m); renderStrip(); renderLib(); say(n + ' standaardmodules teruggezet'); };
    // Vloeiend wisselen tussen stad en ontwerper: de camera vliegt eerst naar de plek (de stad blijft draaien), de ontwerper
    // schuift er dan zacht overheen; terug gaat andersom. Zolang de ontwerper open is staat de stad stil en kost hij niets.
    const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let flyId = 0;
    function flyDist(to, ms, done) {
      const id = ++flyId, d0 = orbit.dist, t0 = performance.now();
      const step = now => { if (id !== flyId) return; const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); orbit.dist = d0 + (to - d0) * e; applyOrbit(); if (k < 1) requestAnimationFrame(step); else if (done) done(); };
      requestAnimationFrame(step);
    }
    function leave() {
      wxBack();
      if (reduced()) { app.hidden = true; renderStrip(); return; }
      app.classList.remove('mm-enter'); app.classList.add('mm-leave');
      setTimeout(() => {
        app.hidden = true; app.classList.remove('mm-leave'); renderStrip();
        if (E.fromDist && typeof mode !== 'undefined' && mode === 'build') { const back = E.fromDist; E.fromDist = 0; requestAnimationFrame(() => flyDist(back, 450)); }
      }, 220);
    }
    $('bClose').onclick = () => { if (E.dirty && !sure('close', 'Niet-bewaarde wijzigingen weggooien?')) return; leave(); };
    // ---------- openen ----------
    // zolang je ontwerpt: helder weer en middag (sneeuw of regen bedekt anders je vloer); bij het sluiten komt het weer terug
    let wxKeep = null;
    const wxClear = () => { try { if (wxKeep) return; wxKeep = { mode: weather.mode, tod: DN.st.tod, auto: DN.st.auto }; weather.snap('zon', 0, 0); DN.set(13, false); DN.apply(); } catch (e) { wxKeep = null; } };
    const wxBack = () => { try { if (!wxKeep) return; const k = wxKeep; wxKeep = null; DN.st.auto = k.auto; DN.set(k.tod); DN.apply(); weather.set(k.mode); } catch (e) { } };
    const openNow = (m) => {
      wxClear();
      app.classList.remove('mm-leave'); if (!reduced()) { app.classList.remove('mm-enter'); void app.offsetWidth; app.classList.add('mm-enter'); }
      app.hidden = false; resize();
      if (m && m.v === 2) loadModule(m, modules.indexOf(m)); else if (!E.m) newModule(); else { renderLib(); changed(); }
      setTool(E.tool); setView(E.vm); renderCtx(); fit();
    };
    openMakerFn = (m) => {
      if (!app.hidden) return openNow(m);
      if (reduced() || typeof mode === 'undefined' || mode !== 'build') { E.fromDist = 0; return openNow(m); }
      E.fromDist = orbit.dist; flyDist(Math.max(16, orbit.dist * 0.5), 380, () => openNow(m));
    };
    bUpto.setAttribute('aria-pressed', String(E.upto));
  })();
