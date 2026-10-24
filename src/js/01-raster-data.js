  // ---------- Raster ----------
  const R = 9;                   // midden tot hoekpunt, meter (vak is 15,6 m breed, zijde 9 m = straatbreedte)
  const SQ3 = Math.sqrt(3);
  const INNER = R * SQ3 / 2;     // midden tot vlakke kant
  const GRID_RINGS = 30;         // de bouwgrond is oneindig; zoveel ringen rasterlijnen tonen we rond waar je kijkt
  const MAX_H = 60;              // maximale hoogte in meter (20 verdiepingen)
  const NEIGH = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const FLAT = 0.15;             // stoeprand / maaiveldtegel
  const ROAD_W = 5;              // breedte rijbaan, meter
  const EYE = 1.65;              // ooghoogte, meter

  const TYPES = {
    weg:     { name: 'Weg',     h: 0.25 },
    laan:    { name: 'Laan',    h: 0.25 },   // brede laan over twee rijen vakken
    woning:  { name: 'Woning',  h: 3 },
    kantoor: { name: 'Kantoor', h: 3 },
    dak:     { name: 'Dak',     h: 2.5 },   // afgesneden schildak
    park:    { name: 'Park',    h: FLAT },
    water:   { name: 'Water',   h: 0 },   // verzonken: waterspiegel 1,4 m onder straatniveau
    pad:     { name: 'Pad',     h: 0.15 },
    trap:    { name: 'Trap',    h: 3 },
    zuilen:  { name: 'Zuilen',  h: 3 },
    hof:     { name: 'Hof',     h: 3 },
    looppad: { name: 'Looppad', h: 3 },
    blok:    { name: 'Blok',    h: 3 },
    helling: { name: 'Helling', h: 3 },
    tunnel:  { name: 'Tunnel',  h: 3 },
    muur:    { name: 'Muur',    h: 3 },
    trappad: { name: 'Trappad', h: 3 },
    tribune: { name: 'Tribune', h: 3 },
    hofhelling: { name: 'Opgang', h: 3 },
    kuil:    { name: 'Uitgraving', h: -3 },   // uitgraving: de bodem ligt 3 m onder straatniveau, met grashellingen naar de rand
    heuvel:  { name: 'Verhogen', h: 3 },    // verhoogd terrein: plateau van 3 m met grashellingen
    brug:    { name: 'Brug', h: 3 },        // dek over een uitgraving (komt vanzelf onder een weg)
    brugp:   { name: 'Brug', h: 3 - 0.15 }, // idem, over een pad op de bodem
    fietspad: { name: 'Fietspad', h: 0.15 },
    randweg: { name: 'Randweg', h: 0 },   // alleen als gereedschap: een weg over de rand tussen twee vakken
    randbreed: { name: 'Brede weg', h: 0 },   // alleen als gereedschap: vierbaans weg over de rand (13 m)
    randpad: { name: 'Randpad', h: 0 },
    vweg: { name: 'Weg', h: 0 },        // alleen als gereedschap: getekende weg (vrije lijn, sleep van vak naar vak)
    vbrd: { name: 'Brede weg', h: 0 },  // idem, vier rijstroken
    vlaan: { name: 'Laan', h: 0 },      // idem, met middenberm en bomen
    vsnel: { name: 'Snelweg', h: 0 }, vklink: { name: 'Klinkerstraat', h: 0 }, vfiets: { name: 'Fietspad', h: 0 },   // idem
    vrot: { name: 'Rotonde', h: 0 },    // klik op een vak: rotonde; wegen die erin uitkomen sluiten erop aan
    tophoog: { name: 'Ophogen', h: 0 }, tafgraaf: { name: 'Afgraven', h: 0 }, tvlak: { name: 'Egaliseren', h: 0 },   // terrein boetseren (zie 14b)
    tglad: { name: 'Gladstrijken', h: 0 }, thelling: { name: 'Helling trekken', h: 0 },
    module: { name: 'Module', h: 0 },   // alleen als gereedschap: een bewaarde schets plaatsen   // alleen als gereedschap: bewaard als breed pad (pad32)
  };
  // Het palet is in groepen verdeeld; het scrollwiel loopt ze allemaal door
  const CATS = [
    { name: 'Wegen', tools: ['vweg', 'vbrd', 'vlaan', 'vsnel', 'vklink', 'vfiets', 'vrot'], todo: ['Spoor', 'Parkeren'] },   // getekende wegen; de oude vakwegen zijn uit het palet (bestaande steden tonen ze nog)
    { name: 'Paden', tools: ['pad', 'fietspad', 'looppad', 'randpad', 'trap', 'trappad'], todo: ['Brugpad', 'Plein'] },
    { name: 'Gebouwen', tools: ['woning', 'kantoor', 'dak'], todo: ['Winkel', 'School', 'Fabriek'] },
    { name: 'Groen en water', tools: ['park', 'water'], todo: ['Bomen', 'Hagen', 'Vijver', 'Fontein'] },
    { name: 'Terrein', tools: ['tophoog', 'tafgraaf', 'tvlak', 'tglad', 'thelling', 'kuil', 'helling', 'hofhelling'], todo: ['Water', 'Klif'] },
    { name: 'Modules', tools: ['module'], todo: ['Brug', 'Poort', 'Toren'] },   // blok, muur, tunnel, tribune, zuilen en hof zijn modules geworden (zie 08b); bestaande steden tonen ze nog
  ];
  const TOOLS = [...CATS.flatMap(c => c.tools), 'gum'];
  const VEC_TOOLS = new Set(['vweg', 'vbrd', 'vlaan', 'vsnel', 'vklink', 'vfiets']), VEC_T = { vweg: 'weg', vbrd: 'brd', vlaan: 'laan', vsnel: 'snel', vklink: 'klink', vfiets: 'fiets' };   // getekende wegen: lijnen, geen vakken
  const TOOL_LABEL = {};
  const DIRECTIONAL = new Set(['trap', 'helling', 'muur', 'trappad', 'tribune', 'hofhelling']);   // met een richting, bewaard als trap0…5 enz.
  const dirOf = t => +t.replace(/\D/g, '');
  // Een trap bewaart zijn looprichting in de naam: trap0 … trap5
  const baseOf = t => t ? t.replace(/\d+$/, '') : t;
  const TY = t => TYPES[baseOf(t)];
  // ---------- Bouwregels: waarop mag elk blok staan? ----------
  // grond = leeg vak, dakvlak = plat dak van een gebouw, gebouw = verdieping op een gebouw, zuilen = dek op zuilen
  const RULES = {
    weg:     ['grond', 'water', 'kuil', 'kuilpad', 'brug'],   // op water of een uitgraving wordt het een brug
    laan:    ['grond'],
    water:   ['grond'],
    pad:     ['grond', 'dakvlak', 'zuilen', 'water', 'kuil', 'heuvel'],
    park:    ['grond', 'dakvlak', 'zuilen'],
    trap:    ['grond', 'dakvlak', 'zuilen', 'kuil', 'heuvel'],
    hof:     ['grond', 'dakvlak', 'zuilen', 'heuvel'],
    kuil:    ['grond'],
    heuvel:  ['grond', 'heuvel'],   // verhogingen op elkaar: hoger terrein
    brug:    ['kuil'],
    brugp:   ['kuilpad'],
    zuilen:  ['grond', 'zuilen', 'blok'],
    looppad: ['grond', 'blok'],
    blok:    ['grond', 'blok'],
    helling: ['grond', 'blok'],
    tunnel:  ['grond', 'blok'],
    muur:    ['grond', 'blok'],
    trappad: ['grond', 'blok'],
    tribune: ['grond', 'blok'],
    hofhelling: ['grond', 'blok'],
    woning:  ['grond', 'gebouw', 'zuilen', 'blok', 'heuvel'],   // ook op een terras van blokken
    kantoor: ['grond', 'gebouw', 'zuilen', 'blok', 'heuvel'],
    dak:     ['gebouw'],
  };
  const SUPPORT_LABEL = { grond: 'de grond', dakvlak: 'een plat dak', gebouw: 'een gebouw', zuilen: 'zuilen', blok: 'een blok of looppad', water: 'water (als brug)', kuil: 'een uitgraving', kuilpad: 'een pad in een uitgraving', heuvel: 'verhoogd terrein', brug: 'een brug' };
  const NOUN = {
    weg: ['Een weg', 'een weg'], laan: ['Een laan', 'een laan'], pad: ['Een pad', 'een pad'], trap: ['Een trap', 'een trap'], zuilen: ['Zuilen', 'zuilen'],
    hof: ['Een hof', 'een hof'], woning: ['Een woning', 'een woning'], kantoor: ['Een kantoor', 'een kantoor'],
    dak: ['Een dak', 'een dak'], park: ['Een park', 'een park'], water: ['Water', 'water'],
    looppad: ['Een looppad', 'een looppad'], blok: ['Een blok', 'een blok'], helling: ['Een helling', 'een helling'],
    tunnel: ['Een tunnel', 'een tunnel'], muur: ['Een muur', 'een muur'], trappad: ['Een trappad', 'een trappad'],
    tribune: ['Een tribune', 'een tribune'], hofhelling: ['Een opgang', 'een opgang'],
    kuil: ['Een uitgraving', 'een uitgraving'], heuvel: ['Een verhoging', 'verhoogd terrein'], brug: ['Een brug', 'een brug'], brugp: ['Een brug', 'een brug'], fietspad: ['Een fietspad', 'een fietspad'],
  };
  // Gereedschap en blok zijn niet altijd hetzelfde: het fietspad is een breed pad, en een weg over een uitgraving krijgt een brug
  const toolBase = t => t === 'fietspad' ? 'pad' : t;
  function itemsFor(q, r, tl, dirIdx) {
    const st = stackOf(q, r), top = st[st.length - 1];
    if (tl === 'fietspad') return [padName(0, 0, 1)];
    if (tl === 'weg' && st.length && baseOf(st[0]) === 'kuil' && baseOf(top) !== 'weg') return [baseOf(top) === 'pad' ? 'brugp' : 'brug', 'weg'];
    return [DIRECTIONAL.has(tl) ? tl + dirIdx : tl];
  }
  function supportsOf(top, under) {
    const b = baseOf(top);
    if (!b) return ['grond'];
    if (b === 'kuil') return ['kuil'];
    if (b === 'heuvel') return ['heuvel'];
    if (b === 'brug' || b === 'brugp') return ['brug'];
    if (b === 'pad' && baseOf(under) === 'kuil') return ['kuilpad'];
    if (b === 'woning' || b === 'kantoor') return ['dakvlak', 'gebouw'];
    if (b === 'zuilen') return ['zuilen'];
    if (b === 'water') return ['water'];
    if (b === 'looppad' || b === 'blok' || b === 'tunnel') return ['blok', 'dakvlak'];
    return [];
  }
  const allowedOn = (t, top, under) => supportsOf(top, under).some(sp => RULES[baseOf(t)].includes(sp));
  function whyNot(t, top) {
    const b = baseOf(t), verb = b === 'zuilen' ? 'kunnen' : 'kan';
    const where = top ? NOUN[baseOf(top)][1] : 'de grond';
    const ok = [...new Set(RULES[b].map(sp => SUPPORT_LABEL[sp]))];
    const list = ok.length > 1 ? ok.slice(0, -1).join(', ') + ' of ' + ok[ok.length - 1] : ok[0];
    return `${NOUN[b][0]} ${verb} niet op ${where}. Wel op ${list}.`;
  }
  // Haalt blokken weg die op een onlogische plek staan (en alles wat erop staat)
  function sanitize(map) {
    let removed = 0;
    for (const [k, st] of [...map]) {
      let i = 0;
      while (i < st.length && allowedOn(st[i], st[i - 1], st[i - 2])) i++;
      if (i < st.length) { removed += st.length - i; st.length = i; }
      if (!st.length) map.delete(k);
    }
    return removed;
  }

  const key = (q, r) => q + ',' + r;
  const cellToWorld = (q, r) => ({ x: R * SQ3 * (q + r / 2), z: R * 1.5 * r });
  function worldToCell(x, z) {
    const q = (SQ3 / 3 * x - z / 3) / R, r = (2 / 3 * z) / R, s = -q - r;
    let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return [rq, rr];
  }
  const hexDist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  function hash(q, r, i) {
    let h = (Math.imul(q, 374761393) + Math.imul(r, 668265263) + Math.imul(i, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ---------- Data ----------
  let cells = new Map();
  // Twee bewaarplekken: "mijn stad" (wat jij zelf bouwt, raakt nooit kwijt) en de stad die nu open staat.
  // Zolang "mijn stad" open staat, wordt elke wijziging daarin bewaard. Een gegenereerde stad, de voorbeeldstad
  // of lege bouwgrond is een losse kladstad: daar mag je in rommelen zonder dat je eigen stad verandert.
  const STORE = 'hexstad-v2', MINE = 'hexstad-mijnstad', SLOT = 'hexstad-plek';
  let slot = 'mijn', slotName = 'Mijn stad';
  const serialize = m => { const o = Object.fromEntries(m); if (m.edges && m.edges.size) o.__e = [...m.edges]; if (m.paths && m.paths.length) o.__p = m.paths; if (m.tris && m.tris.length) o.__t = m.tris; if (m.inst && m.inst.length) o.__i = m.inst; if (m.druk > 1) o.__d = m.druk; if (m.sec) { const g = {}; for (const k in m.sec) if (m.sec[k] > 0 && m.sec[k] < 63 && m.has(k)) g[k] = m.sec[k]; if (Object.keys(g).length) o.__s = g; } if (m.terr) { const g = {}; for (const k in m.terr) if (m.terr[k] > 0.004) g[k] = Math.round(m.terr[k] * 100) / 100; if (Object.keys(g).length) o.__g = g; } return JSON.stringify(o); };
  function save() {
    const snap = serialize(cells);
    if (typeof hudSnap === 'function') hudSnap(snap);   // ongedaan maken (15d)
    try {
      localStorage.setItem(STORE, snap);
      localStorage.setItem(SLOT, JSON.stringify({ slot, slotName }));
      if (slot === 'mijn') localStorage.setItem(MINE, serialize(cells));
    } catch (e) {}
  }
  function load(key = STORE) {
    let raw = null; try { raw = localStorage.getItem(key); } catch (e) { return null; }
    return raw ? parseCity(raw) : null;
  }
  function parseCity(raw) {
    try {
      const obj = JSON.parse(raw);
      const m = new Map();
      if (Array.isArray(obj.__e)) m.edges = new Map(obj.__e.filter(e => Array.isArray(e) && typeof e[0] === 'string' && (e[1] === 'weg' || e[1] === 'brd' || e[1] === 'pad')));
      if (Array.isArray(obj.__p)) m.paths = obj.__p.filter(p => p && ['weg', 'brd', 'laan', 'pad', 'snel', 'klink', 'fiets', 'rot'].includes(p.t) && Array.isArray(p.p) && p.p.length > (p.t === 'rot' ? 0 : 1) && p.p.every(a => Array.isArray(a) && isFinite(a[0]) && isFinite(a[1])));
      if (Array.isArray(obj.__i)) m.inst = obj.__i.filter(x => x && x.m && Array.isArray(x.m.edges) && isFinite(x.q) && isFinite(x.r) && isFinite(x.rot));
      if (obj.__g && typeof obj.__g === 'object') { m.terr = {}; for (const k in obj.__g) { const v = +obj.__g[k]; if (/^-?\d+,-?\d+$/.test(k) && isFinite(v) && v > 0) m.terr[k] = Math.min(TERR_TOP, v); } }
      if (obj.__s && typeof obj.__s === 'object') { m.sec = {}; for (const k in obj.__s) { const v = +obj.__s[k]; if (/^-?\d+,-?\d+$/.test(k) && v >= 1 && v < 63) m.sec[k] = v | 0; } }
      if (isFinite(+obj.__d) && +obj.__d > 1) m.druk = Math.min(4, +obj.__d);
      if (Array.isArray(obj.__t)) m.tris = obj.__t.filter(t => t && TRI_STY[t.k] && Array.isArray(t.v) && t.v.length === 6 && t.v.every(isFinite));
      for (const k in obj) if (k !== '__e' && k !== '__p' && k !== '__t' && k !== '__i' && Array.isArray(obj[k]) && obj[k].every(t => typeof t === 'string' && TY(t))) m.set(k, obj[k]);
      return m;
    } catch (e) { return null; }
  }
  // ---------- Willekeurige stad ----------
  function mulberry32(a) {
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // Labyrint van looppaden door massieve blokken, op een bepaald niveau (0 = maaiveld, 1 = 3 m, …).
  // region: vakken waar op dit niveau gebouwd mag worden; starts: [q, r, richting] waar paden beginnen.
  // Op hogere niveaus blijft een deel open als dakterras, zodat de gangen daarop uitkomen.
  const BLOK_BASES = new Set(['blok', 'looppad', 'tunnel']);
  function fillBlocks(c, region, rnd, starts, level = 0, layered = false) {
    const pickInt = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const stackAt = (q, r) => c.get(key(q, r)) || [];
    const getL = (q, r) => stackAt(q, r)[level];
    const setL = (q, r, arr) => c.set(key(q, r), stackAt(q, r).slice(0, level).concat(arr));
    // alleen vakken die precies tot dit niveau reiken en een blok als ondergrond hebben
    const ok = ([q, r]) => { const st = stackAt(q, r); return st.length === level && (level === 0 || BLOK_BASES.has(baseOf(st[level - 1]))); };
    const inR = new Set(region.filter(ok).map(([q, r]) => key(q, r)));
    const free = (q, r) => inR.has(key(q, r)) && !getL(q, r);
    const PATHY = new Set(['looppad', 'tunnel']);
    const isPath = (q, r) => PATHY.has(baseOf(getL(q, r)));
    const isEntry = (q, r) => level === 0 ? (getL(q, r) || '') === 'weg' : false;
    const pathN = (q, r) => NEIGH.filter(([a, b]) => isPath(q + a, r + b)).length;
    const cellsR = region.filter(([q, r]) => inR.has(key(q, r)));
    if (!cellsR.length) return;
    // 1. Paden groeien als een boom vanuit het netwerk: steeds een stukje gang van 2 tot 5 vakken,
    //    meestal rechtdoor, soms 60° afbuigend. Een nieuw pad mag alleen aan zijn voorganger grenzen,
    //    zodat er altijd minstens één blok tussen twee gangen blijft (heel soms een rondje).
    const pathCells = [];
    for (const [q, r] of starts) {
      if (!inR.has(key(q, r))) continue;
      if (!getL(q, r)) setL(q, r, ['looppad']);
      if (isPath(q, r)) pathCells.push([q, r]);
    }
    let budget = Math.max(4, Math.round(cellsR.length * (level ? 0.4 : 0.4)));
    for (let tries = 0; tries < 900 && budget > 0 && pathCells.length; tries++) {
      let [q, r] = pathCells[Math.floor(rnd() * pathCells.length)];
      let dir = pickInt(0, 5);
      const len = pickInt(2, 5);
      for (let step = 0; step < len && budget > 0; step++) {
        const nq = q + NEIGH[dir][0], nr = r + NEIGH[dir][1];
        if (!free(nq, nr)) break;
        const n = pathN(nq, nr);
        if (n > 1 && !(n === 2 && rnd() < 0.06)) break;
        setL(nq, nr, ['looppad']); pathCells.push([nq, nr]); budget--;
        q = nq; r = nr;
        if (rnd() < 0.25) dir = (dir + (rnd() < 0.5 ? 1 : 5)) % 6;
      }
    }
    const paths = cellsR.filter(([q, r]) => isPath(q, r));
    // 2. Doodlopende paden: helling/trappad omhoog naar het volgende niveau, of een hofje / opgang
    for (const [q, r] of paths) {
      const nb = NEIGH.map(([a, b]) => [q + a, r + b]);
      const links = nb.map(([a, b]) => isPath(a, b) || isEntry(a, b));
      if (links.filter(Boolean).length !== 1) continue;
      const k = links.indexOf(true), d = (k + 3) % 6, [hq, hr] = nb[d];
      const x = rnd();
      if (x < 0.6 && free(hq, hr)) { setL(q, r, [(rnd() < 0.5 ? 'helling' : 'trappad') + d]); setL(hq, hr, ['blok']); }
      else if (x < 0.82) setL(q, r, ['hof']);
      else {
        const up = [0, 1, 2, 3, 4, 5].find(j => j !== k && free(nb[j][0], nb[j][1]));
        if (up !== undefined) { setL(q, r, ['hofhelling' + up]); setL(nb[up][0], nb[up][1], ['blok']); }
        else setL(q, r, ['hof']);
      }
    }
    // 3. Rechte stukken worden soms een tunnel
    for (const [q, r] of paths) {
      if (getL(q, r) !== 'looppad') continue;
      const ks = NEIGH.map(([a, b], j) => isPath(q + a, r + b) ? j : -1).filter(j => j >= 0);
      if (ks.length === 2 && (ks[1] - ks[0]) === 3 && rnd() < 0.3) setL(q, r, ['tunnel']);
    }
    // 4. De rest: blokken (op maaiveld) of een mix van blokken en open dakterras (hoger)
    for (const [q, r] of cellsR) {
      if (getL(q, r)) continue;
      const nb = NEIGH.map(([a, b]) => [q + a, r + b]);
      const hofK = nb.findIndex(([a, b]) => getL(a, b) === 'hof');
      const x = rnd();
      if (hofK >= 0 && x < 0.5) { setL(q, r, ['tribune' + ((hofK + 3) % 6)]); continue; }
      if (level === 0) {
        const deco = layered ? 0.4 : 1;   // in een gelaagde stad minder daktuinen: daar komt de volgende laag
        if (x < 0.1 * deco) setL(q, r, ['blok', 'park']);
        else if (x < 0.18 * deco) setL(q, r, ['blok', 'muur' + pickInt(0, 5)]);
        else setL(q, r, ['blok']);
      } else {
        if (x < 0.4) setL(q, r, ['blok']);
        else if (x < 0.52) setL(q, r, ['park']);
        else if (x < 0.62) setL(q, r, ['muur' + pickInt(0, 5)]);
        // anders: open dakterras
      }
    }
  }
  function blockCity(seed, levels = 1) {
    const rnd = mulberry32(seed), pickInt = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const RAD = 6, c = new Map();
    for (let L = 0; L < levels; L++) {
      // elk niveau hoger beslaat een kleiner gebied rond het midden
      const rad = L === 0 ? RAD : Math.max(2, RAD - L), region = [];
      for (let q = -rad; q <= rad; q++) for (let r = -rad; r <= rad; r++) if (hexDist(q, r) <= rad) region.push([q, r]);
      const eligible = region.filter(([q, r]) => { const st = c.get(key(q, r)) || []; return st.length === L && (L === 0 || BLOK_BASES.has(baseOf(st[L - 1]))); });
      if (!eligible.length) break;
      const starts = [];
      for (let i = 0; i < (L === 0 ? 6 : 8); i++) { const [q, r] = eligible[Math.floor(rnd() * eligible.length)]; starts.push([q, r, pickInt(0, 5)]); }
      if (L === 0) starts.unshift([0, 0, pickInt(0, 5)]);
      fillBlocks(c, region, rnd, starts, L, levels > 1);
    }
    return c;
  }

  // Gelaagde stad: een ontworpen, getrapte opbouw in ringen met zesvoudige symmetrie.
  //  buitenste ring: gracht met bruggen op de zes assen
  //  daarbinnen: wandelring op maaiveld
  //  dan T terrassen, elk 3 m hoger: binnenring = pad langs de muur, buitenrand = tuinen
  //  op drie assen trappen die alle terrassen verbinden, op de andere drie hofjes
  //  bovenop: een centraal hof; soms tunnels onder de hofjes-assen door naar een plein onder de top
  function terraceCity(seed) {
    const rnd = mulberry32(seed);
    const T = rnd() < 0.5 ? 2 : 3;
    const stairOdd = rnd() < 0.5, moat = rnd() < 0.8, tunnels = rnd() < 0.5, gardenHof = rnd() < 0.5, roofStyle = rnd() < 0.7;
    const c = new Map();
    const blocks = n => Array(n).fill('blok');
    const axisOf = (q, r) => { const d = hexDist(q, r); if (!d) return -1; return NEIGH.findIndex(([a, b]) => a * d === q && b * d === r); };
    const isStairAxis = k => k >= 0 && (k % 2 === 1) === stairOdd;
    const ground = 2 * T + 1, moatD = 2 * T + 2;
    // aanlooppaden buiten de gracht, zodat de bruggen ergens heen leiden
    for (let k = 0; k < 6; k++) c.set(key(NEIGH[k][0] * (moatD + 1), NEIGH[k][1] * (moatD + 1)), ['pad']);
    for (let q = -moatD; q <= moatD; q++) for (let r = -moatD; r <= moatD; r++) {
      const d = hexDist(q, r);
      if (d > moatD) continue;
      const k = axisOf(q, r), K = key(q, r);
      if (d === moatD) { if (moat) c.set(K, k >= 0 ? ['water', 'pad'] : ['water']); else if (k >= 0) c.set(K, ['pad']); continue; }
      if (d === ground) { c.set(K, ['pad']); continue; }
      if (d === 0) { c.set(K, (tunnels ? ['looppad', ...blocks(T - 1)] : blocks(T)).concat('hof')); continue; }
      // terras t: ringen dOut = 2(T-t)+2 (buitenrand) en dIn = 2(T-t)+1 (pad langs de muur)
      const t = T - Math.floor((d - 1) / 2), outer = d % 2 === 0;
      const under = (tunnels && k >= 0 && !isStairAxis(k)) ? ['tunnel', ...blocks(t - 1)] : blocks(t);
      if (!outer) { c.set(K, under.concat('pad')); continue; }
      if (isStairAxis(k)) {   // trap vanaf het terras eronder naar dit terras, de stad in
        const inward = (k + 3) % 6;
        c.set(K, under.slice(0, t - 1).concat('trap' + inward));
        continue;
      }
      if (k >= 0) { c.set(K, under.concat('hof')); continue; }
      // Tuinrand: tuin en gebouw wisselen elkaar af, gemeten vanaf de dichtstbijzijnde as (zesvoudig symmetrisch).
      // Gebouwen kijken uit over het lagere terras en hebben hun voordeur aan het pad erachter.
      const m = Math.min(...NEIGH.map(([a, b]) => hexDist(q - a * d, r - b * d)));
      if (d === 2) {   // kroon van kantoren rond de top
        c.set(K, under.concat(T > 2 ? ['kantoor', 'kantoor', 'kantoor'] : ['kantoor', 'kantoor']));
      } else if (m % 2 === 0) {   // woningen; op het onderste terras met een kap
        c.set(K, under.concat(t === 1 && roofStyle ? ['woning', 'woning', 'dak'] : ['woning', 'woning']));
      } else {
        c.set(K, under.concat(gardenHof && m === 1 && (q * 7 + r * 13) % 3 === 0 ? 'hof' : 'park'));
      }
    }
    return c;
  }

  function randomCity(seed) {
    const rnd = mulberry32(seed), pickInt = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const RAD = 7, c = new Map();
    const inside = (q, r) => hexDist(q, r) <= RAD;
    const get = (q, r) => c.get(key(q, r));
    const set = (q, r, arr) => { if (inside(q, r)) c.set(key(q, r), arr); };
    const isRoad = (q, r) => (get(q, r) || []).includes('weg');
    const lineCells = (axis, v, from = -RAD, to = RAD) => {
      const out = [];
      for (let i = from; i <= to; i++) {
        const qr = axis === 'r' ? [i, v] : axis === 'q' ? [v, i] : [i, -v - i];
        if (inside(qr[0], qr[1])) out.push(qr);
      }
      return out;
    };

    // 1. Stratenplan: doorgaande hoofdstraten (r vast), dwarsstraten (q vast) die op hoofdstraten eindigen
    const rVals = [];
    for (let v = -RAD + pickInt(1, 2); v <= RAD - 1; v += pickInt(3, 4)) rVals.push(v);
    rVals.forEach(v => lineCells('r', v).forEach(([q, r]) => set(q, r, ['weg'])));
    for (let v = -RAD + pickInt(1, 3); v <= RAD - 1; v += pickInt(4, 5)) {
      let i = pickInt(0, Math.max(0, rVals.length - 2)), j = pickInt(i + 1, rVals.length - 1);
      const from = rnd() < 0.3 ? -RAD : rVals[i], to = rnd() < 0.3 ? RAD : rVals[Math.min(j, rVals.length - 1)];
      lineCells('q', v, from, to).forEach(([q, r]) => set(q, r, ['weg']));
    }
    // 2. Een diagonale laan, of anders een gracht
    const diag = pickInt(-2, 2);
    if (rnd() < 0.45) lineCells('s', diag).forEach(([q, r]) => set(q, r, ['weg']));
    else if (rnd() < 0.75) lineCells('s', diag).forEach(([q, r]) => set(q, r, isRoad(q, r) ? ['water', 'weg'] : ['water']));   // gracht, met bruggen waar een straat kruist

    // 3. Loopbrug: pad → trap omhoog → zuilen → hof of pad bovenop
    for (let tries = 0; tries < 60; tries++) {
      const q = pickInt(-4, 4), r = pickInt(-4, 4), k = pickInt(0, 5);
      const [dq, dr] = NEIGH[k], L = [q - dq, r - dr], N = [q + dq, r + dr], N2 = [q + 2 * dq, r + 2 * dr];
      const free = ([a, b]) => inside(a, b) && !get(a, b);
      if (!free([q, r]) || !free(N) || !free(N2) || !(free(L) || isRoad(L[0], L[1]))) continue;
      if (!isRoad(L[0], L[1])) set(L[0], L[1], ['pad']);
      set(q, r, ['trap' + k]); set(N[0], N[1], ['zuilen']);
      set(N2[0], N2[1], ['zuilen', rnd() < 0.6 ? 'hof' : 'pad']);
      break;
    }

    // 3b. Vaak een blokkenwijk: looppaden door massieve blokken, met ingangen vanaf de straat
    if (rnd() < 0.75) {
      const cq = pickInt(-4, 4), cr = pickInt(-4, 4), rad = pickInt(2, 3), region = [];
      for (let q = cq - rad; q <= cq + rad; q++) for (let r = cr - rad; r <= cr + rad; r++)
        if (hexDist(q - cq, r - cr) <= rad && inside(q, r) && !get(q, r)) region.push([q, r]);
      const starts = [];
      for (const [q, r] of region) {
        const k = NEIGH.findIndex(([a, b]) => isRoad(q + a, r + b));
        if (k >= 0 && rnd() < 0.35) starts.push([q, r, (k + 3) % 6]);
      }
      if (!starts.length && region.length) starts.push([...region[0], pickInt(0, 5)]);
      if (region.length >= 5) {
        fillBlocks(c, region, rnd, starts.slice(0, 4), 0);
        if (rnd() < 0.6) {   // soms een tweede laag bovenop de blokkenwijk
          const top = region.filter(([q, r]) => { const st = get(q, r) || []; return st.length === 1 && BLOK_BASES.has(baseOf(st[0])); });
          if (top.length >= 3) fillBlocks(c, region, rnd, [[...top[Math.floor(rnd() * top.length)], pickInt(0, 5)]], 1);
        }
      }
    }
    // 4. Wijken invullen: centrum hoogbouw, daaromheen woonblokken, aan de rand huizen met kap
    const roadNear = (q, r) => NEIGH.some(([dq, dr]) => isRoad(q + dq, r + dr));
    const walkNear = (q, r) => NEIGH.some(([dq, dr]) => { const t = (get(q + dq, r + dr) || [])[0]; return t === 'weg' || t === 'pad'; });
    const order = [];
    for (let q = -RAD; q <= RAD; q++) for (let r = -RAD; r <= RAD; r++) if (inside(q, r) && !get(q, r)) order.push([q, r]);
    // eerst langs de straten, dan de binnenterreinen (zodat hofjes en paden kunnen aansluiten)
    order.sort((a, b) => (roadNear(b[0], b[1]) ? 1 : 0) - (roadNear(a[0], a[1]) ? 1 : 0));
    for (const [q, r] of order) {
      const d = hexDist(q, r) / RAD, x = rnd();
      if (roadNear(q, r)) {
        if (d < 0.35) {
          const floors = Math.min(15, pickInt(3, 6) + Math.floor(rnd() * 9 * (1 - d / 0.35)));
          const st = Array(floors).fill(x < 0.75 ? 'kantoor' : 'woning');
          if (rnd() < 0.15) st.push('park');
          set(q, r, st);
        } else if (d < 0.7) {
          if (x < 0.08) { set(q, r, ['park']); continue; }
          const floors = pickInt(1, d < 0.5 ? 5 : 3);
          const st = Array(floors).fill(rnd() < 0.15 ? 'kantoor' : 'woning');
          if (floors <= 3 && rnd() < 0.55) st.push('dak');
          set(q, r, st);
        } else {
          if (x < 0.15) { set(q, r, ['park']); continue; }
          if (x < 0.2) continue;   // een open plek
          const st = Array(pickInt(1, 2)).fill('woning');
          if (rnd() < 0.85) st.push('dak');
          set(q, r, st);
        }
      } else {
        // binnenterrein
        if (x < 0.3 && d < 0.8 && walkNear(q, r)) set(q, r, ['hof']);
        else if (x < 0.5) set(q, r, ['park']);
        else if (x < 0.65) set(q, r, ['pad']);
        else if (x < 0.72 && d > 0.5) set(q, r, ['water']);
        else if (x < 0.9) { const st = Array(pickInt(1, 2)).fill('woning'); if (rnd() < 0.6) st.push('dak'); set(q, r, st); }
      }
    }
    // 5. Een gebouw dat helemaal is ingesloten door andere gebouwen of water wordt een binnenhofje,
    //    zodat de huizen eromheen daar hun voordeur kunnen hebben
    const OPEN = new Set(['weg', 'pad', 'hof', 'park']);
    for (const [k, st] of [...c]) {
      if (!isBuilding(st[0])) continue;
      const [q, r] = k.split(',').map(Number);
      const open = NEIGH.some(([a, b]) => { const n = get(q + a, r + b); return !n || OPEN.has(baseOf(n[0])); });
      if (!open) c.set(k, ['hof']);
    }
    return c;
  }

  // Ringstad: een stad van 2 km doorsnee, met een buitenring (bomen, park, gracht), binnenringen en wegen naar het centrum
  function ringStad(seed = 2026) {
    const rnd = mulberry32(seed), pickInt = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const PITCH_ = R * SQ3, RING = 64, c = new Map(), road = new Map();
    const set = (q, r, arr) => c.set(key(q, r), arr);
    const cdist = (q, r) => { const w = cellToWorld(q, r); return Math.hypot(w.x, w.z) / PITCH_; };
    const isRoad = (q, r) => road.has(key(q, r));
    // rechte lijn van vakken tussen twee vakken (kubuscoördinaten afronden)
    function hexLine(a, b) {
      const n = hexDist(b[0] - a[0], b[1] - a[1]), out = [];
      for (let i = 0; i <= n; i++) {
        const t = n ? i / n : 0, fq = a[0] + (b[0] - a[0]) * t + 1e-6, fr = a[1] + (b[1] - a[1]) * t + 1e-6, fs = -fq - fr;
        let rq = Math.round(fq), rr = Math.round(fr); const rs = Math.round(fs);
        const dq = Math.abs(rq - fq), dr = Math.abs(rr - fr), ds = Math.abs(rs - fs);
        if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
        out.push([rq, rr]);
      }
      return out;
    }
    // vakken die een weg van A naar B vormen, zonder driehoekjes (een vak overslaan als zijn buren al aansluiten)
    function thin(path, closed) {
      let ch = true;
      while (ch) {
        ch = false;
        for (let i = 0; i < path.length; i++) {
          const a = path[(i - 1 + path.length) % path.length], b = path[(i + 1) % path.length];
          if (!closed && (i === 0 || i === path.length - 1)) continue;
          if (path.length > 4 && hexDist(a[0] - b[0], a[1] - b[1]) === 1) { path.splice(i, 1); ch = true; break; }
        }
      }
      return path;
    }
    function circle(rad) {
      const pts = [], steps = Math.ceil(Math.PI * 2 * rad * 4);
      let prev = null;
      for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2, [q, r] = worldToCell(Math.cos(a) * rad * PITCH_, Math.sin(a) * rad * PITCH_);
        if (prev && prev[0] === q && prev[1] === r) continue;
        if (prev && hexDist(q - prev[0], r - prev[1]) > 1) hexLine(prev, [q, r]).slice(1).forEach(p => pts.push(p)); else pts.push([q, r]);
        prev = [q, r];
      }
      if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
      return thin(pts, true);
    }
    const cellAt = (rad, ang) => worldToCell(Math.cos(ang) * rad * PITCH_, Math.sin(ang) * rad * PITCH_);
    const road1 = (q, r, t) => { road.set(key(q, r), t); };
    // 1. Ringen: een kleine om het stadsplein, twee binnenringen en de buitenring met bomen
    [[4, 'weg'], [16, 'weg1'], [36, 'weg1'], [RING, 'weg1']].forEach(([rad, t]) => circle(rad).forEach(([q, r]) => road1(q, r, t)));
    // 2. Zes hoofdwegen langs de rasterassen (met bomen) en zes diagonale wegen naar het centrum, tot buiten de ring
    for (let k = 0; k < 6; k++) {
      const [dq, dr] = NEIGH[k];
      for (let i = 5; i <= RING + 10; i++) road1(dq * i, dr * i, 'weg1');
      const ang = -Math.PI / 3 * k - Math.PI / 6;   // tussen twee assen in
      const path = hexLine(cellAt(15, ang), cellAt(RING + 3, ang));
      thin(path, false).forEach(([q, r]) => { if (!isRoad(q, r)) road1(q, r, 'weg'); });
    }
    // 3. Een gracht buiten de ring met bruggen waar de hoofdwegen doorheen gaan, en een parkband tussen ring en gracht
    const canal = new Set();
    circle(RING + 3.2).forEach(([q, r]) => canal.add(key(q, r)));
    // de gracht moet dicht zijn: vul vakken die tussen twee grachtvakken en buiten de ring liggen
    for (const k2 of [...canal]) { const [q, r] = k2.split(',').map(Number); for (const [a, b] of NEIGH) { const k3 = key(q + a, r + b); if (!canal.has(k3) && cdist(q + a, r + b) > RING + 3.2 && cdist(q + a, r + b) < RING + 3.9 && NEIGH.filter(([x, y]) => canal.has(key(q + a + x, r + b + y))).length >= 3) canal.add(k3); } }
    // 4. Bebouwing
    const roadNear = (q, r) => NEIGH.some(([a, b]) => isRoad(q + a, r + b));
    for (const [k2, t] of road) {
      const [q, r] = k2.split(',').map(Number);
      set(q, r, canal.has(k2) ? ['water', t === 'weg1' ? 'weg' : t] : [t === 'weg1' ? 'weg1' : 'weg']);
    }
    for (const k2 of canal) { if (c.has(k2)) continue; const [q, r] = k2.split(',').map(Number); set(q, r, ['water']); }
    for (let q = -RING - 14; q <= RING + 14; q++) for (let r = Math.max(-RING - 14, -q - RING - 14); r <= Math.min(RING + 14, -q + RING + 14); r++) {
      if (c.has(key(q, r))) continue;
      const D = cdist(q, r), d = D / RING, x = rnd(), near = roadNear(q, r);
      if (D > RING + 3.9) { if (D < RING + 6 && x < (near ? 0.3 : 0.04)) set(q, r, [x < 0.1 ? 'woning' : 'park']); continue; }   // buiten de gracht: wat groen
      if (D > RING + 0.9) { if (x < 0.3) set(q, r, ['park']); continue; }                                                      // parkband langs de ring
      if (D < 3) { set(q, r, x < 0.4 ? ['park'] : ['hof']); continue; }                                                           // stadsplein
      if (d < 0.14) {   // centrum: hoogbouw
        if (near || x < 0.8) set(q, r, Array(Math.min(15, pickInt(5, 8) + Math.floor(rnd() * 9 * (1 - d / 0.14)))).fill(x < 0.72 ? 'kantoor' : 'woning'));
        else set(q, r, ['park']);
        continue;
      }
      if (near) {
        if (d < 0.32) { if (x < 0.06) { set(q, r, ['park']); continue; } set(q, r, Array(pickInt(3, 8)).fill(x < 0.55 ? 'kantoor' : 'woning')); }
        else if (d < 0.78) { if (x < 0.1) { set(q, r, ['park']); continue; } if (d > 0.55 && x < 0.45) continue; const f = pickInt(1, d < 0.5 ? 5 : 3); set(q, r, Array(f).fill(x > 0.93 ? 'kantoor' : 'woning')); }
        else { if (x < 0.12) { set(q, r, ['park']); continue; } if (x < 0.7) continue; set(q, r, Array(pickInt(1, 2)).fill('woning')); }
      } else if (d < 0.45 && x < 0.15) set(q, r, ['woning', 'woning']);   // binnenterrein van een bouwblok: alleen in de binnenstad
        
    }
    sanitize(c); roofHouses(c);
    return c;
  }

  function sampleCity() {
    const c = new Map();
    const set = (q, r, arr) => c.set(key(q, r), arr);
    for (let q = -6; q <= 6; q++) set(q, 0, ['weg']);
    for (let r = -6; r <= 6; r++) if (r) set(0, r, ['weg']);
    [[1,-1],[2,-1],[3,-1],[4,-1],[5,-1]].forEach(([q, r], k) => set(q, r, k % 2 ? ['woning','dak'] : ['woning','woning','dak']));
    [[1,-2],[2,-2],[-1,-2],[-1,-3]].forEach(([q, r]) => set(q, r, ['woning','dak']));
    [[-1,1],[-2,1],[-3,1],[-4,1]].forEach(([q, r], k) => set(q, r, k % 2 ? ['woning','woning','woning','dak'] : ['woning','dak']));
    set(-1, -1, Array(7).fill('kantoor'));
    set(-2, -1, Array(5).fill('kantoor'));
    set(-3, -1, ['kantoor','kantoor','kantoor']);
    set(-4, -1, ['kantoor','kantoor','park']);
    [[1,1],[2,1],[1,2],[2,2],[3,1]].forEach(([q, r]) => set(q, r, ['park']));
    [[4,1],[5,1],[3,2],[4,2],[3,3]].forEach(([q, r]) => set(q, r, ['water']));
    // Voetgangers: pad naar een binnenhof, trap omhoog naar een loopbrug op zuilen met een hof erbovenop
    set(1, 4, ['pad']); set(2, 4, ['pad']); set(1, 5, ['hof']);
    set(3, 4, ['trap0']);
    set(4, 4, ['zuilen']); set(5, 4, ['zuilen']); set(5, 3, ['zuilen']); set(6, 3, ['zuilen', 'hof']);
    // Looppaden door massieve blokken, met een helling omhoog naar het tweede niveau
    [[-1,2],[-2,2],[-3,2],[-4,2],[-1,4],[-2,4],[-4,4],[-1,5],[-4,5]].forEach(([q, r]) => set(q, r, ['blok']));
    [[-1,3],[-2,3],[-3,3]].forEach(([q, r]) => set(q, r, ['looppad']));
    set(-4, 3, ['hof']); set(-3, 4, ['helling5']); set(-3, 5, ['blok']); set(-2, 5, ['blok', 'park']);
    set(-2, 3, ['tunnel']); set(-4, 4, ['tribune5']); set(-1, 4, ['blok', 'muur1']);
    return c;
  }
  const stackOf = (q, r) => cells.get(key(q, r)) || [];
  // Kleine dorpjes met verschillende wegopzetten (gewone wegen, randwegen en brede wegen)
  function dorp(v) {
    const c = new Map(), E = new Map(), set = (q, r, a) => c.set(key(q, r), a), has = (q, r) => c.has(key(q, r));
    const hx = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));
    let n = 0;
    const huis = (q, r) => { if (has(q, r)) return; n++; set(q, r, [['woning'], ['woning', 'woning'], ['woning'], ['woning', 'woning', 'woning']][(n + q + 2 * r) & 3].slice()); };
    const tuin = (q, r) => { if (!has(q, r)) set(q, r, ['park']); };
    const vrij = () => { for (const k of E.keys()) { const [q, r, kk] = k.split(',').map(Number); tuin(q, r); if (kk < 6) tuin(q + NEIGH[kk][0], r + NEIGH[kk][1]); } };
    const vul = (rad, huisKans) => {
      vrij();   // alles binnen de straal dat nog leeg is: huis of tuin
      for (let q = -rad; q <= rad; q++) for (let r = -rad; r <= rad; r++) {
        if (hx(q, r) > rad || has(q, r)) continue;
        ((q * 5 + r * 11 + (q * r)) & 7) < huisKans ? huis(q, r) : tuin(q, r);
      }
    };
    const rij = (r, q0, q1, t) => { for (let q = q0; q <= q1; q++) set(q, r, t.slice()); };
    // rechte noord-zuidweg over de rand/door de vakken heen, door de zijde 0,0,0 omhoog en omlaag
    const noordzuid = (type, omhoog, omlaag) => {
      const up = ['0,0,0', '1,-1,8', '1,-2,0', '2,-3,8', '2,-4,0', '3,-5,8', '3,-6,0'], dn = ['0,1,8', '-1,2,0', '-1,3,8', '-2,4,0', '-2,5,8', '-3,6,0'];
      up.slice(0, omhoog).concat(dn.slice(0, omlaag)).forEach(k => E.set(k, type));
    };
    if (v === 1) {          // Dorpsstraat met zijstraat
      rij(0, -5, 5, ['weg']); for (let r = 1; r <= 4; r++) set(0, -r, ['weg']);
      set(3, 2, ['water']); set(4, 2, ['water']); set(3, 3, ['water']); set(-3, 1, ['hof']); set(-3, 2, ['park']);
      vul(5, 3);
    } else if (v === 2) {   // Kruising met rechte hoeken
      rij(0, -5, 6, ['weg']);
      noordzuid('weg', 5, 4);
      set(-1, -1, ['hof']); set(2, 1, ['hof']);
      vul(5, 3);
    } else if (v === 3) {   // Rotonde met drie uitvalswegen
      for (let k = 0; k < 6; k++) { const [q, r, kk] = [[0, 0, 0], [0, 0, 1], [0, 0, 2], [-1, 0, 0], [-1, 1, 1], [0, 1, 2]][k]; E.set(q + ',' + r + ',' + kk, 'weg'); }
      set(0, 0, ['park', 'park']);
      for (let k = 1; k <= 6; k++) { set(k, 0, ['weg']); set(0, -k, ['weg']); set(-k, k, ['weg']); }
      for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (hx(q, r) === 1) tuin(q, r);
      set(2, 2, ['water']); set(3, 2, ['water']);
      vul(5, 3);
    } else {                // Brede hoofdweg met twee kruisingen
      rij(0, -5, 6, ['weg']); rij(2, -6, 4, ['weg']);
      noordzuid('brd', 6, 5);
      set(3, -1, ['hof']); set(-2, 1, ['hof']); set(2, 4, ['water']); set(3, 4, ['water']); set(3, 3, ['water']);
      vul(6, 3);
    }
    // wat op de rand/over een randweg valt, wordt tuin
    c.edges = E;
    return c;
  }
  // Elk huis krijgt standaard een dak: een kolom die met een woning eindigt krijgt er een dak op
  function roofHouses(map) {
    for (const st of map.values()) {
      if (!st.length || baseOf(st[st.length - 1]) !== 'woning') continue;
      const h = st.reduce((a, t) => a + TY(t).h, 0);
      if (h + TY('dak').h <= MAX_H + 0.01) st.push('dak');
    }
    return map;
  }
  // Woningen en kantoren tellen per verdieping
  function cityCounts() {
    let homes = 0, offices = 0;
    for (const st of cells.values()) for (const t of st) { const b = baseOf(t); if (b === 'woning') homes++; else if (b === 'kantoor') offices++; }
    return { homes, offices };
  }
  const columnTop = (q, r) => stackOf(q, r).reduce((s, t) => s + TY(t).h, 0);
  // Terreinhoogte van een vak (m). Alles op het vak (blokken, paden, gebouwen) staat op deze hoogte; columnTop is
  // daarboven gerekend (relatief), colTopW is de echte hoogte in de wereld.
  const gH = (q, r) => (cells.terr && cells.terr[q + ',' + r]) || 0;
  const colTopW = (q, r) => gH(q, r) + columnTop(q, r);

