  // ---------- Module maker: teken gebouwen en pleinen per verdieping, met gereedschap zoals in SketchUp ----------
  // Bovenaanzicht op het fijne driehoekraster. Vloer schilder je per driehoek, muren trek je langs de ribben van het
  // raster, een deur, raam of poort zet je in een muur, een trap of helling trek je van een rasterpunt in een van zes
  // richtingen. Voorwerpen zet je als laatste neer. Elke verdieping is 3 m; je wisselt met ▲ ▼. De 3D-weergave gebruikt
  // dezelfde bouwer als de stad, dus wat je ziet is wat je krijgt.
  (() => {
    const app = document.getElementById('mmApp'); if (!app) return;
    const $ = id => document.getElementById('mm_' + id);
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
      zoomIn: '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5M11 8v6M8 11h6"/>',
      zoomOut: '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5M8 11h6"/>',
      fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
      brush: '<path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z"/><path d="M12 12l7.8-4.5M12 12v9M12 12L4.2 7.5" opacity=".5"/>',
      grid: '<path d="M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18"/>',
    };
    const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
    const TOOLS = [
      ['select', 'Kiezen en verschuiven (V): sleep om te schuiven', 'V'], ['hand', 'Schuiven (H)', 'H'],
      ['floor', 'Vloer (F): schilder driehoeken; rechtermuisknop wist', 'F'], ['fill', 'Vullen (G): vult een ruimte tot aan de muren met vloer; rechtermuisknop maakt leeg', 'G'], ['wall', 'Muur (W): sleep van punt naar punt langs het raster', 'W'], ['room', 'Kamer (M): muren rondom een heel vak', 'M'],
      ['door', 'Deur (D): klik op een muur', 'D'], ['window', 'Raam (R): klik op een muur', 'R'], ['gate', 'Poort (P): klik op een muur', 'P'], ['open', 'Open doorgang (O): klik op een muur', 'O'], ['close', 'Dicht (C): klik op een muur om de opening weg te halen', 'C'],
      ['stair', 'Trap (T): sleep van onderaan omhoog, in een van zes richtingen', 'T'], ['ustair', 'Bordestrap (U): sleep de eerste steek; op het bordes keer je en loopt de tweede steek ernaast terug omhoog', 'U'], ['ramp', 'Helling (L): sleep van onderaan omhoog', 'L'],
      ['roof', 'Dak (K): klik op een vak; nog eens voor een plat dak, nog eens om weg te halen', 'K'], ['object', 'Voorwerp (B): klik om neer te zetten; klik erop om te draaien', 'B'],
      ['erase', 'Gum (X): haalt weg wat eronder ligt', 'X'],
    ];
    const toolBtns = {};
    for (const [k, title, key] of TOOLS) { const b = document.createElement('button'); b.type = 'button'; b.title = title; b.innerHTML = svg(k) + `<kbd>${key}</kbd>`; b.addEventListener('click', () => setTool(k)); $('tools').appendChild(b); toolBtns[k] = b; }
    const mkBtn = (host, k, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.title = title; b.innerHTML = svg(k); b.addEventListener('click', fn); $(host).appendChild(b); return b; };
    const bUndo = mkBtn('edit', 'undo', 'Ongedaan maken (Ctrl+Z)', () => undo()), bRedo = mkBtn('edit', 'redo', 'Opnieuw (Ctrl+Y)', () => redo());
    const bBrush = mkBtn('edit', 'brush', 'Penseel: zeshoek van 6 driehoeken of één driehoek', () => { E.brush = E.brush === 'hex' ? 'tri' : 'hex'; bBrush.setAttribute('aria-pressed', String(E.brush === 'hex')); say(E.brush === 'hex' ? 'Penseel: zeshoek' : 'Penseel: één driehoek'); }); bBrush.setAttribute('aria-pressed', 'true');
    mkBtn('edit', 'copyUp', 'Verdieping kopiëren naar de verdieping erboven', () => copyUp());
    const b2d = mkBtn('view', 'v2d', 'Bovenaanzicht (2)', () => setView('2d')), b3d = mkBtn('view', 'v3d', '3D (3): teken op de verdieping waar je bent; draaien met de middelste muisknop, Alt of het handje, schuiven met Shift', () => setView('3d'));
    const bUpto = mkBtn('view', 'upto', 'In 3D alleen tot en met de huidige verdieping tonen', () => { E.upto = !E.upto; bUpto.setAttribute('aria-pressed', String(E.upto)); dirty3(); });
    mkBtn('view', 'zoomIn', 'Inzoomen', () => zoom(1.25)); mkBtn('view', 'zoomOut', 'Uitzoomen', () => zoom(0.8)); mkBtn('view', 'fit', 'Passend maken', () => fit());
    function setTool(k) { E.tool = k; for (const t in toolBtns) toolBtns[t].setAttribute('aria-pressed', String(t === k)); E.drag = null; renderCtx(); cv.style.cursor = k === 'hand' || k === 'select' ? 'grab' : 'crosshair'; draw(); }
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
    function stairGeom(S) {
      const D = MV2.DIR6[S.d] || MV2.DIR6[0], a = P(S.a[0], S.a[1]), t = ts(), dx = D[0] * t * SQ3 / 2, dz = D[0] * t / 2 + D[1] * t, dl = Math.hypot(dx, dz) || 1, ux = dx / dl, uz = dz / dl, nx = -uz, nz = ux, len = (S.n || 1) * t, w = S.w || 1.2;
      const at = (al, lat) => [a[0] + ux * al + nx * lat, a[1] + uz * al + nz * lat];
      if (S.k === 'u') { const sd = S.side || 1, l0 = sd > 0 ? -w / 2 : -1.5 * w, l1 = sd > 0 ? 1.5 * w : w / 2; return { a, ux, uz, nx, nz, len, w, at, sd, poly: [at(0, l0), at(0, l1), at(len + w, l1), at(len + w, l0)] }; }   // bordestrap: twee steken naast elkaar plus het bordes
      return { a, ux, uz, nx, nz, len, w, at, poly: [at(0, -w / 2), at(0, w / 2), at(len, w / 2), at(len, -w / 2)] };
    }
    function objectAt(x, z, r = 0.9) { const L = lvl(); let best = -1, bd = r; L.o.forEach((o, i) => { const d = Math.hypot(o.x - x, o.z - z); if (d < bd) { bd = d; best = i; } }); return best; }
    const cellAt = (x, z) => mv2CellOf(x, z);
    const lvl = () => E.m.lv[E.lv];
    // ---------- geschiedenis ----------
    const snap = () => { E.undo.push(JSON.stringify(E.m)); if (E.undo.length > 80) E.undo.shift(); E.redo = []; E.dirty = true; };
    const undo = () => { if (!E.undo.length) return; E.redo.push(JSON.stringify(E.m)); E.m = mv2Fix(JSON.parse(E.undo.pop())); E.lv = Math.min(E.lv, E.m.lv.length - 1); changed(); say('Ongedaan gemaakt', 900); };
    const redo = () => { if (!E.redo.length) return; E.undo.push(JSON.stringify(E.m)); E.m = mv2Fix(JSON.parse(E.redo.pop())); E.lv = Math.min(E.lv, E.m.lv.length - 1); changed(); };
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
      darkbrick: '#3d3a36', panel: '#4b5157', slats: '#a8743f', corten: '#97512e', curtain: '#6d8ea6', parquet: '#9a6a3e', polished: '#c9c8c3', stonetile: '#d9d0bf' };
    const OBJ_GLYPH = { tree: '🌳', bush: '🌿', bench: '🪑', lamp: '💡', pillar: '🏛', table: '☕', planter: '🌷', fountain: '⛲', bin: '🗑', bike: '🚲' };
    function renderCtx() {
      const sw = $('sw'), title = $('ctxTitle'), hint = $('ctxHint'); sw.innerHTML = '';
      const mk = (items, cur, set, glyph) => { for (const k in items) { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(cur === k)); b.innerHTML = (glyph ? `<span class="sw" style="border:0;font-size:16px;line-height:18px;text-align:center">${glyph[k] || ''}</span>` : `<span class="sw" style="background:${COL[k] || '#888'}"></span>`) + items[k]; b.addEventListener('click', () => { set(k); renderCtx(); }); sw.appendChild(b); } };
      if (E.tool === 'floor') { title.textContent = 'Vloer'; mk(MV2.floors, E.fmat, k => { E.fmat = k; }); hint.textContent = 'Schilder driehoeken. Op een verdieping wordt de vloer ook het plafond eronder. Rechtermuisknop wist.'; }
      else if (E.tool === 'fill') { title.textContent = 'Vullen'; mk(MV2.floors, E.fmat, k => { E.fmat = k; }); hint.textContent = 'Klik in een ruimte: alle driehoeken tot aan de muren (en de rand van het gebied) krijgen deze vloer.'; }
      else if (E.tool === 'room') { title.textContent = 'Kamer'; mk(MV2.walls, E.wmat, k => { E.wmat = k; }); hint.textContent = 'Klik op een vak: er komen muren op alle zes zijden. Bestaande muren blijven staan.'; }
      else if (E.tool === 'wall') { title.textContent = 'Muur'; mk(MV2.walls, E.wmat, k => { E.wmat = k; }); hint.textContent = 'Sleep van rasterpunt naar rasterpunt. Haag en hek zijn laag; glas is een glaswand. Een muur op een bestaande muur wisselt het materiaal.'; }
      else if (['door', 'window', 'gate', 'open', 'close'].includes(E.tool)) { title.textContent = MV2.openings[E.tool === 'close' ? '' : E.tool]; hint.textContent = E.tool === 'close' ? 'Klik op een muur om de opening dicht te maken.' : 'Klik op een muur. Deur 1,2 m breed en 2,2 m hoog; raam vanaf 0,9 m; poort tot 2,8 m; open laat alleen een latei staan.'; }
      else if (E.tool === 'ustair') { title.textContent = 'Bordestrap'; mk({ 1.2: 'Smal 1,2 m', 2: 'Breed 2 m' }, String(E.sw || 1.2), k => { E.sw = +k; }); mk({ 1: 'Keert naar links', '-1': 'Keert naar rechts' }, String(E.usd || 1), k => { E.usd = +k; }); hint.textContent = 'Sleep de eerste steek, van onderaan in de looprichting. Aan het eind komt een bordes (halverwege, 1,5 m); de tweede steek loopt ernaast terug en komt boven uit naast waar je begon. Laat daar een gat in de vloer van de verdieping erboven.'; }
      else if (E.tool === 'stair' || E.tool === 'ramp') { title.textContent = E.tool === 'stair' ? 'Trap' : 'Helling'; mk({ 1.2: 'Smal 1,2 m', 2: 'Breed 2 m', 3: 'Extra breed 3 m' }, String(E.sw || 1.2), k => { E.sw = +k; }); hint.textContent = 'Sleep van het laagste punt omhoog. De trap stijgt 3 m naar de volgende verdieping; laat daar een gat in de vloer. Hoe langer, hoe flauwer.'; }
      else if (E.tool === 'roof') { title.textContent = 'Dak'; hint.textContent = 'Klik op een vak: puntdak, nog eens: plat dak, nog eens: weg. Het dak ligt bovenop deze verdieping.'; }
      else if (E.tool === 'object') { title.textContent = 'Voorwerp'; mk(MV2.objects, E.obj, k => { E.obj = k; }, OBJ_GLYPH); hint.textContent = 'Klik om neer te zetten. Klik op een voorwerp om het 60° te draaien; rechtermuisknop haalt het weg.'; }
      else if (E.tool === 'erase') { title.textContent = 'Gum'; hint.textContent = 'Klik of sleep: voorwerp, muur, trap, dak of vloer onder de muis wordt weggehaald.'; }
      else { title.textContent = E.tool === 'hand' ? 'Schuiven' : 'Kiezen'; hint.textContent = 'Sleep om te schuiven, scroll om te zoomen. Middelste muisknop of spatie schuift altijd.'; }
    }
    // ---------- bewerkingen ----------
    function paintFloor(x, z, erase) {
      const L = lvl(), list = (E.brush === 'hex' ? around(...vertexAt(x, z)) : [triAt(x, z)]).filter(okTri); let n = 0;
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
    function eraseAt(x, z, firstOnly) {
      const L = lvl(); const oi = objectAt(x, z, 0.8); if (oi >= 0) { L.o.splice(oi, 1); return 'voorwerp'; }
      const w = nearestWall(x, z, 0.45); if (w) { delete L.w[w.id]; return 'muur'; }
      const si = stairAt(x, z); if (si >= 0) { L.s.splice(si, 1); return 'trap'; }
      const [q, r] = cellAt(x, z); if (L.r[q + ',' + r] && !firstOnly) { delete L.r[q + ',' + r]; return 'dak'; }
      return paintFloor(x, z, true) ? 'vloer' : null;
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
    const ptr = new Map();
    let spaceDown = false;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const rect = cv.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top, [x, z] = toW(sx, sy);
      if (E.vm === '3d' && (e.button === 1 || e.altKey || spaceDown || E.tool === 'hand' || (ptr.size > 1))) { E.pan = { kind: 'orbit', sx: e.clientX, sy: e.clientY, th: E.th, ph: E.ph }; return; }   // draaien
      if (E.vm === '3d' && (e.shiftKey || E.tool === 'select')) { E.pan = { kind: 'pan3', w: [x, z] }; cv.style.cursor = 'grabbing'; return; }   // schuiven over de verdieping
      if (e.button === 1 || spaceDown || E.tool === 'hand' || E.tool === 'select' || ptr.size > 1) { E.pan = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: E.view.x, vz: E.view.z }; cv.style.cursor = 'grabbing'; return; }
      const right = e.button === 2;
      if (E.tool === 'floor') { snap(); paintFloor(x, z, right); E.drag = { kind: 'floor', erase: right }; changed(); return; }
      if (E.tool === 'fill') { snap(); const n = fillFrom(x, z, right); changed(); say(n ? n + ' driehoeken' : 'Niets gevuld', 900); return; }
      if (E.tool === 'room') { snap(); const n = roomAt(x, z); changed(); say(n ? n + ' muurdelen' : 'Klik binnen het gebied', 900); return; }
      if (E.tool === 'wall') { if (right) { const w = nearestWall(x, z); if (w) { snap(); delete lvl().w[w.id]; changed(); } return; } E.drag = { kind: 'wall', a: vertexAt(x, z), d: 0, n: 0 }; draw(); return; }
      if (['door', 'window', 'gate', 'open', 'close'].includes(E.tool)) { const before = JSON.stringify(E.m); if (setOpening(x, z, E.tool === 'close' ? '' : E.tool)) { E.undo.push(before); E.redo = []; E.dirty = true; changed(); } return; }
      if (E.tool === 'stair' || E.tool === 'ramp' || E.tool === 'ustair') { if (right) { const si = stairAt(x, z); if (si >= 0) { snap(); lvl().s.splice(si, 1); changed(); } return; } E.drag = { kind: 'stair', a: vertexAt(x, z), d: 0, n: 0 }; draw(); return; }
      if (E.tool === 'roof') { if (!inArea(x, z)) return; const [q, r] = cellAt(x, z), k = q + ',' + r, L = lvl(); snap(); L.r[k] = right ? undefined : L.r[k] === 'hip' ? 'flat' : L.r[k] === 'flat' ? undefined : 'hip'; if (!L.r[k]) delete L.r[k]; changed(); return; }
      if (E.tool === 'object') { const L = lvl(), oi = objectAt(x, z, 0.8); snap(); if (oi >= 0) { if (right) L.o.splice(oi, 1); else L.o[oi].rot = ((L.o[oi].rot || 0) + Math.PI / 3) % (Math.PI * 2); } else if (!right && inArea(x, z)) L.o.push({ t: E.obj, x: Math.round(x * 4) / 4, z: Math.round(z * 4) / 4, rot: 0 }); changed(); return; }
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
      E.hover = [x, z]; $('readout').textContent = `x ${x.toFixed(1)}  z ${z.toFixed(1)} m · ${E.lv === 0 ? 'begane grond' : E.lv + 'e verdieping'}`;
      if (E.drag) {
        if (E.drag.kind === 'floor') { if (paintFloor(x, z, E.drag.erase)) dirty3(); }
        else if (E.drag.kind === 'wall' || E.drag.kind === 'stair') { const ds = dirSteps(E.drag.a, x, z, E.drag.kind === 'wall'); E.drag.d = ds.d; E.drag.n = Math.max(E.drag.kind === 'stair' ? 1 : 0, ds.n); if (Math.hypot(x - P(...E.drag.a)[0], z - P(...E.drag.a)[1]) < ts() * 0.5) E.drag.n = 0; }
        else if (E.drag.kind === 'erase') { if (eraseAt(x, z, true)) dirty3(); }
      }
      draw();
    });
    const end = e => {
      ptr.delete(e.pointerId);
      if (E.pan) { if (!ptr.size) { E.pan = null; cv.style.cursor = E.tool === 'hand' || E.tool === 'select' ? 'grab' : 'crosshair'; } return; }
      const D = E.drag; E.drag = null; if (!D) return;
      if (D.kind === 'wall' && D.n > 0) { snap(); const n = addWalls(D.a, D.d, D.n); if (n) say(n + (n === 1 ? ' muurdeel' : ' muurdelen'), 800); changed(); }
      else if (D.kind === 'stair' && D.n > 0) { snap(); lvl().s.push(Object.assign({ a: D.a, d: D.d, n: D.n, w: E.sw || 1.2, k: E.tool === 'ramp' ? 'ramp' : E.tool === 'ustair' ? 'u' : 'stair' }, E.tool === 'ustair' ? { side: E.usd || 1 } : {})); changed(); }
      else draw();
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => { e.preventDefault(); const rect = cv.getBoundingClientRect(), sx = e.clientX - rect.left, sy = e.clientY - rect.top; if (E.vm === '3d') { E.view.s = Math.max(3, Math.min(80, E.view.s * (e.deltaY < 0 ? 1.12 : 0.9))); dirty3(); return; } const [wx, wz] = toW(sx, sy); E.view.s = Math.max(3, Math.min(80, E.view.s * (e.deltaY < 0 ? 1.12 : 0.9))); const [nx, nz] = toW(sx, sy); E.view.x += wx - nx; E.view.z += wz - nz; draw(); }, { passive: false });
    function zoom(f) { E.view.s = Math.max(3, Math.min(80, E.view.s * f)); if (E.vm === '3d') dirty3(); draw(); }
    function fit() { const ext = R * (1 + 2 * (E.m.k || 0)) * 1.1; E.view.x = 0; E.view.z = 0; E.view.s = Math.min(W, H) / (2 * ext); if (E.vm === '3d') dirty3(); draw(); }
    document.addEventListener('keydown', e => {
      if (app.hidden) return; if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') { spaceDown = true; e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
      if (e.key === 'PageUp') { e.preventDefault(); $('lvUp').click(); return; } if (e.key === 'PageDown') { e.preventDefault(); $('lvDn').click(); return; }
      if (e.key === 'Escape') { E.drag = null; draw(); return; }
      if (e.key === '2') setView('2d'); if (e.key === '3') setView('3d');
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
      const stairDraw = (S, ghost) => {
        const g = stairGeom(S), pts = g.poly.map(p => toS(p[0], p[1]));
        ctx.beginPath(); pts.forEach((p, n) => n ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
        ctx.fillStyle = ghost ? 'rgba(242,178,51,0.25)' : (S.k === 'ramp' ? 'rgba(170,140,100,0.55)' : 'rgba(190,180,165,0.6)'); ctx.fill(); ctx.strokeStyle = ghost ? '#f2b233' : '#e9ecdf'; ctx.lineWidth = 1.2; ctx.stroke();
        if (S.k === 'u') {   // twee steken met treden en pijlen: heen en, ernaast, terug
          const N = Math.max(2, Math.round(g.len / 0.28)); ctx.beginPath(); for (const c of [0, g.sd * g.w]) for (let n = 1; n <= N; n++) { const a = toS(...g.at(n * g.len / N, c - g.w / 2)), b = toS(...g.at(n * g.len / N, c + g.w / 2)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.strokeStyle = 'rgba(40,40,30,0.5)'; ctx.lineWidth = 1; ctx.stroke();
          ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2; ctx.beginPath(); const p0 = toS(...g.at(g.len * 0.1, 0)), p1 = toS(...g.at(g.len + g.w / 2, 0)), p2 = toS(...g.at(g.len + g.w / 2, g.sd * g.w)), p3 = toS(...g.at(g.len * 0.1, g.sd * g.w)); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.stroke(); return;
        }
        if (S.k !== 'ramp') { const N = Math.max(2, Math.round(g.len / 0.28)); ctx.beginPath(); for (let n = 1; n < N; n++) { const a = toS(...g.at(n * g.len / N, -g.w / 2)), b = toS(...g.at(n * g.len / N, g.w / 2)); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } ctx.strokeStyle = 'rgba(40,40,30,0.5)'; ctx.lineWidth = 1; ctx.stroke(); }
        const a0 = toS(...g.at(g.len * 0.15, 0)), a1 = toS(...g.at(g.len * 0.9, 0)); ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
        const ang = Math.atan2(a1[1] - a0[1], a1[0] - a0[0]); ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a1[0] - 8 * Math.cos(ang - 0.5), a1[1] - 8 * Math.sin(ang - 0.5)); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a1[0] - 8 * Math.cos(ang + 0.5), a1[1] - 8 * Math.sin(ang + 0.5)); ctx.stroke();
      };
      if (in3) { paintHover(); heightMeter(); return; }   // in 3D toont het model zelf vloeren, muren en trappen
      // verdieping eronder: vaag
      if (E.lv > 0) { const U = m.lv[E.lv - 1]; ctx.globalAlpha = 0.35; for (const id in U.f) tri(id, COL[U.f[id]] || '#888'); ctx.globalAlpha = 1; for (const id in U.w) wallLine(id, U.w[id], true); }
      // huidige verdieping
      for (const id in L.f) tri(id, COL[L.f[id]] || '#888');
      for (const id in L.r) { const [q, r] = id.split(',').map(Number), c = mv2CellXZ(q, r); hexPath(c[0], c[1], R - 0.3); ctx.fillStyle = L.r[id] === 'hip' ? 'rgba(168,71,58,0.35)' : 'rgba(141,143,138,0.35)'; ctx.fill(); ctx.strokeStyle = L.r[id] === 'hip' ? '#a8473a' : '#8d8f8a'; ctx.lineWidth = 2; ctx.stroke(); if (L.r[id] === 'hip') { ctx.beginPath(); const C = toS(c[0], c[1]); for (let i = 0; i < 6; i++) { const a = (30 + 60 * i) * Math.PI / 180, S2 = toS(c[0] + (R - 0.3) * Math.cos(a), c[1] + (R - 0.3) * Math.sin(a)); ctx.moveTo(C[0], C[1]); ctx.lineTo(S2[0], S2[1]); } ctx.lineWidth = 1; ctx.stroke(); } }
      for (const S of L.s) stairDraw(S, false);
      for (const id in L.w) wallLine(id, L.w[id], false);
      for (const o of L.o) { const S2 = toS(o.x, o.z); ctx.fillStyle = 'rgba(23,27,20,0.7)'; ctx.beginPath(); ctx.arc(S2[0], S2[1], Math.max(8, 0.5 * s), 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#9aa38c'; ctx.lineWidth = 1; ctx.stroke(); ctx.font = `${Math.max(11, Math.min(26, 0.8 * s))}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(OBJ_GLYPH[o.t] || '•', S2[0], S2[1] + 1); if (o.rot) { ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(S2[0], S2[1]); ctx.lineTo(S2[0] + Math.cos(o.rot) * 0.9 * s, S2[1] + Math.sin(o.rot) * 0.9 * s); ctx.stroke(); } }
      // randcodes op de begane grond
      if (E.lv === 0) { const codes = modV2Codes(m); for (const kk in codes) { const [q, r, sd] = kk.split(',').map(Number), c = mv2CellXZ(q, r), f = FRAMES[sd], mx = c[0] + f.nx * (INNER - 0.4), mz = c[1] + f.nz * (INNER - 0.4), A = toS(mx - f.tx * 2.2, mz - f.tz * 2.2), B = toS(mx + f.tx * 2.2, mz + f.tz * 2.2); ctx.strokeStyle = CODE_COL[codes[kk]] || 'rgba(0,0,0,0)'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } }
      paintHover(); heightMeter();
      // schaalbalk
      ctx.fillStyle = css('--muted'); ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillRect(W - 12 - 10 * s, H - 16, 10 * s, 2); ctx.fillText('10 m', W - 12 - 10 * s, H - 20);
      function paintHover() {
      // voorbeeld van wat je doet
      const hv = E.hover, D = E.drag;
      if (D && D.kind === 'wall' && D.n > 0) { for (const [i, j, d] of segsBetween(D.a, D.d, D.n)) wallLine(wallKey(i, j, d), { m: E.wmat, o: '' }, false); }
      else if (D && D.kind === 'stair' && D.n > 0) stairDraw({ a: D.a, d: D.d, n: D.n, w: E.sw || 1.2, k: E.tool === 'ramp' ? 'ramp' : E.tool === 'ustair' ? 'u' : 'stair', side: E.usd || 1 }, true);
      else if (hv && !E.pan) {
        const [x, z] = hv; ctx.strokeStyle = '#f2b233'; ctx.lineWidth = 2;
        if (E.tool === 'floor') { for (const id of (E.brush === 'hex' ? around(...vertexAt(x, z)) : [triAt(x, z)]).filter(okTri)) { const v = mv2TriVerts(id[0], id[1], id[2], t); ctx.beginPath(); v.forEach((p, n) => { const S3 = toS(p[0], p[1]); n ? ctx.lineTo(S3[0], S3[1]) : ctx.moveTo(S3[0], S3[1]); }); ctx.closePath(); ctx.stroke(); } }
        else if (E.tool === 'wall' || E.tool === 'stair' || E.tool === 'ramp' || E.tool === 'ustair') { const v = vertexAt(x, z), p = toS(...P(v[0], v[1])); ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.stroke(); }
        else if (['door', 'window', 'gate', 'open', 'close', 'erase'].includes(E.tool)) { const w = nearestWall(x, z); if (w) { const [i, j, d] = w.id.split(',').map(Number), [a, b] = segOf(i, j, d), A = toS(a[0], a[1]), B = toS(b[0], b[1]); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); } }
        else if (E.tool === 'roof' || E.tool === 'room') { if (inArea(x, z)) { const [q, r] = cellAt(x, z), c = mv2CellXZ(q, r); hexPath(c[0], c[1], R - 0.3); ctx.stroke(); } }
        else if (E.tool === 'object') { const S4 = toS(Math.round(x * 4) / 4, Math.round(z * 4) / 4); ctx.beginPath(); ctx.arc(S4[0], S4[1], Math.max(8, 0.5 * s), 0, Math.PI * 2); ctx.stroke(); }
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
      const m = E.m; m.name = ($('name').value || '').trim() || 'Module ' + (modules.length + 1); m.cat = catSel.value; m.codes = modV2Codes(m); m._sig = Date.now();
      if (asCopy || E.editing < 0 || !modules[E.editing]) { m.id = uid(); modules.push(JSON.parse(JSON.stringify(m))); E.editing = modules.length - 1; }
      else { modules[E.editing] = JSON.parse(JSON.stringify(m)); const n = syncModule(modules[E.editing]); if (n) say('"' + m.name + '" bewaard · ' + n + ' in de stad bijgewerkt', 2500); }
      E.dirty = false; saveMods(); renderStrip(); renderLib(); if (!asCopy) say('"' + m.name + '" bewaard'); else say('Kopie bewaard als "' + m.name + '"');
    }
    $('bSave').onclick = () => save(false); $('bDup').onclick = () => { $('name').value = ($('name').value || E.m.name) + ' (kopie)'; save(true); };
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
      const list = modules.map((m, i) => [m, i]).filter(([m]) => !q || (m.name || '').toLowerCase().includes(q) || (m.cat || '').toLowerCase().includes(q));
      $('libN').textContent = list.length + (list.length === modules.length ? '' : ' van ' + modules.length);
      for (const [m, i] of list) {
        const d = document.createElement('div'); d.className = 'mod'; d.setAttribute('aria-current', String(i === E.editing));
        const c = m.v === 2 ? mv2Thumb(m, 0, 18) : modThumb(m, 0, 18); d.appendChild(c);
        const sp = document.createElement('span'); sp.innerHTML = `${m.name}<small>${m.v === 2 ? (m.cat || 'Overig') + ' · ' + m.lv.length + (m.lv.length === 1 ? ' laag' : ' lagen') : 'oude schets'}</small>`; d.appendChild(sp);
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
    $('bClose').onclick = () => { if (E.dirty && !sure('close', 'Niet-bewaarde wijzigingen weggooien?')) return; app.hidden = true; renderStrip(); };
    // ---------- openen ----------
    openMakerFn = (m) => {
      app.hidden = false; resize();
      if (m && m.v === 2) loadModule(m, modules.indexOf(m)); else if (!E.m) newModule(); else { renderLib(); changed(); }
      setTool(E.tool); setView(E.vm); renderCtx(); fit();
    };
    bUpto.setAttribute('aria-pressed', String(E.upto));
  })();
