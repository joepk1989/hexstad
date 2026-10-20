  // ---------- Wegnetwerk ----------
  // Het netwerk wordt voor de hele stad tegelijk bepaald. Verbindingen die rechtdoor lopen
  // gaan voor; een verbinding die een driehoek van drie onderling verbonden tegels zou sluiten
  // wordt overgeslagen. Zo ontstaan er nooit asfaltdriehoeken met stoepeilandjes.
  let roadLinks = new Map();   // "q,r,y" -> 6-bit masker
  const lk = (q, r, y) => q + ',' + r + ',' + (Math.abs(y) < 0.005 ? 0 : y).toFixed(2);
  function computeRoadLinks() {
    const tiles = [];
    for (const [k, st] of cells) {
      const [q, r] = k.split(',').map(Number);
      let y = 0;
      for (const t of st) { if (baseOf(t) === 'weg') tiles.push({ q, r, y }); y += TY(t).h; }
    }
    const edges = [];
    for (const a of tiles) {
      for (let k = 0; k < 3; k++) {                       // elke verbinding één keer
        const [dq, dr] = NEIGH[k], bq = a.q + dq, br = a.r + dr;
        if (!roadAt(bq, br, a.y)) continue;
        const [oq, or] = NEIGH[k + 3];
        const score = (roadAt(a.q + oq, a.r + or, a.y) ? 1 : 0) + (roadAt(bq + dq, br + dr, a.y) ? 1 : 0);
        edges.push({ a, k, bq, br, score });
      }
    }
    edges.sort((e, f) => f.score - e.score || e.a.q - f.a.q || e.a.r - f.a.r || e.a.y - f.a.y || e.k - f.k);
    const adj = new Map();
    const linked = (k1, k2) => adj.has(k1) && adj.get(k1).has(k2);
    const link = (k1, k2) => { if (!adj.has(k1)) adj.set(k1, new Set()); adj.get(k1).add(k2); };
    const masks = new Map();
    for (const e of edges) {
      const { a, k, bq, br } = e, ka = lk(a.q, a.r, a.y), kb = lk(bq, br, a.y);
      let closesTriangle = false;
      for (const kk of [(k + 1) % 6, (k + 5) % 6]) {    // de twee tegels die naast A én B liggen
        const kc = lk(a.q + NEIGH[kk][0], a.r + NEIGH[kk][1], a.y);
        if (linked(ka, kc) && linked(kb, kc)) { closesTriangle = true; break; }
      }
      if (closesTriangle) continue;
      link(ka, kb); link(kb, ka);
      masks.set(ka, (masks.get(ka) || 0) | (1 << k));
      masks.set(kb, (masks.get(kb) || 0) | (1 << (k + 3)));
    }
    const L = computeLaan(masks);
    masks.laan = L.info; masks.laanSig = L.sig;
    return masks;
  }
  function roadLinked(q, r, k, y) { return ((roadLinks.get(lk(q, r, y)) || 0) >> k) & 1; }
  // Herbereken en geef de kolommen terug waarvan de wegaansluitingen veranderd zijn
  function updateRoadLinks() {
    const old = roadLinks, next = computeRoadLinks(), changed = new Set();
    for (const k of new Set([...old.keys(), ...next.keys()])) {
      if ((old.get(k) || 0) !== (next.get(k) || 0)) changed.add(k.split(',').slice(0, 2).join(','));
    }
    // lanen: elk vak waarvan de vorm verandert (aansluitingen, partners, openingen in de middenberm)
    const os = old.laanSig || new Map(), ns = next.laanSig;
    for (const k of new Set([...os.keys(), ...ns.keys()])) if (os.get(k) !== ns.get(k)) changed.add(k);
    roadLinks = next;
    return changed;
  }

  // ---------- Laan ----------
  // Een laan ligt over twee rijen vakken naast elkaar: samen een rechte strook van 22,5 m.
  // Dwars gemeten (p) vanaf de buitenste stoeprand: stoep 2,5 · fietspad 2 · parkeerstrook 2 · rijstrook 3,25 ·
  // middenberm 3 · en dan gespiegeld voor de andere rij. Elk vak heeft een as (0..2) en een kant (0/1), en dus
  // één rijrichting: de ene rij rijdt heen, de andere terug (rechts houden). In een vak loopt p van -4,5 (punt
  // aan de buitenkant) via 4,5 (midden) tot 13,5 (punt naar de partnerrij); daarbuiten ligt de partnerrij.
  const LAAN = { stoep: 2.5, fiets: 4.5, park: 6.5, lane: 9.75, mid: 12.75, laneC: 8.125, otherC: 14.375, midC: 11.25 };
  const FIETS_H = 0.17, LAAN_PITCH = R * SQ3;   // 15,6 m van vak tot vak langs de as
  const laanD = t => { const m = /^laan([0-5]?)$/.exec(t || ''); return m ? +(m[1] || 0) : -1; };
  const laanCell = (q, r) => { const st = cells.get(key(q, r)); return st && st.length ? laanD(st[0]) : -1; };
  // Vaste maten per richting d = as + 3 × kant: dwarsrichting n (naar de partnerrij), rijrichting f,
  // de zijden vooruit (F) en achteruit (Bk), de partnerzijden vóór en achter (pf, pb) en de buitenzijden (of, ob)
  const LAAN_G = [0, 1, 2, 3, 4, 5].map(d => {
    const a = d % 3, s = d >= 3 ? 1 : 0, U = FRAMES[a], u = [U.nx, U.nz];
    const n = s ? [u[1], -u[0]] : [-u[1], u[0]], f = [-n[1], n[0]];
    const dot = k => FRAMES[k].nx * f[0] + FRAMES[k].nz * f[1];
    const F = [0, 1, 2, 3, 4, 5].find(k => dot(k) > 0.99);
    const ps = s ? [(a + 1) % 6, (a + 2) % 6] : [(a + 4) % 6, (a + 5) % 6];
    const os = s ? [(a + 4) % 6, (a + 5) % 6] : [(a + 1) % 6, (a + 2) % 6];
    return { d, a, s, u, n, f, F, Bk: (F + 3) % 6, pf: ps.find(k => dot(k) > 0), pb: ps.find(k => dot(k) < 0),
      of: os.find(k => dot(k) > 0), ob: os.find(k => dot(k) < 0), partnerD: a + 3 * (1 - s), sgn: f[0] * u[0] + f[1] * u[1] };
  });
  const laanAt = (q, r) => (roadLinks.laan && roadLinks.laan.get(key(q, r))) || null;
  function computeLaan(masks) {
    const info = new Map(), sig = new Map(), arms = new Map();
    const tiles = [];
    for (const [k, st] of cells) { const d = st.length ? laanD(st[0]) : -1; if (d >= 0) { const [q, r] = k.split(',').map(Number); tiles.push({ k, q, r, d }); } }
    if (!tiles.length) return { info, sig };
    const dAt = (q, r) => laanCell(q, r);
    // Woonstraten sluiten aan op een buitenzijde, liefst die schuin achter (dan is rechtsaf de laan op een flauwe bocht)
    for (const [k, st] of cells) {
      if (!st.length || baseOf(st[0]) !== 'weg') continue;
      const [q, r] = k.split(',').map(Number);
      for (let j = 0; j < 6; j++) {
        const nq = q + NEIGH[j][0], nr = r + NEIGH[j][1], d = dAt(nq, nr);
        if (d < 0) continue;
        const G = LAAN_G[d], kb = (j + 3) % 6;
        let ok = kb === G.ob;
        if (kb === G.of) ok = dAt(nq + NEIGH[G.F][0], nr + NEIGH[G.F][1]) !== d;   // anders hoort hij bij het vak ervoor
        if (!ok) continue;
        const wk = lk(q, r, 0);
        masks.set(wk, (masks.get(wk) || 0) | (1 << j));
        arms.set(key(nq, nr), (arms.get(key(nq, nr)) || 0) | (1 << kb));
      }
    }
    for (const T of tiles) {
      const G = LAAN_G[T.d], nb = k => [T.q + NEIGH[k][0], T.r + NEIGH[k][1]];
      const is = (k, d) => { const [a, b] = nb(k); return dAt(a, b) === d; };
      const c = cellToWorld(T.q, T.r), v = [-G.u[1], G.u[0]];
      const perp = c.x * v[0] + c.z * v[1] + (G.s ? -6.75 : 6.75);   // dwarspositie van de middenlijn van de strook
      const I = { q: T.q, r: T.r, d: T.d, G, pf: is(G.pf, G.partnerD), pb: is(G.pb, G.partnerD), contF: is(G.F, T.d), contB: is(G.Bk, T.d),
        arms: arms.get(T.k) || 0, S: c.x * G.u[0] + c.z * G.u[1], strip: G.a * 100000 + Math.round(perp * 10) };
      info.set(T.k, I);
    }
    const at = (I, k) => info.get(key(I.q + NEIGH[k][0], I.r + NEIGH[k][1]));
    for (const I of info.values()) {
      const nx = I.contF ? at(I, I.G.F) : null, pf = I.pf ? at(I, I.G.pf) : null;
      I.U = I.pf && (!I.contF || !nx.pf);                  // hier keren: de laatste plek waar de partnerrij er nog is
      I.ctrl = !!I.arms || !!(pf && pf.arms);              // stoplicht bij het binnenrijden van dit vak
    }
    // Middenberm: open bij kruisingen (een vak lang aan weerszijden) en bij de keerlus aan het eind
    const gaps = new Map();
    const addGap = (strip, a, b) => { if (!gaps.has(strip)) gaps.set(strip, []); gaps.get(strip).push([Math.min(a, b), Math.max(a, b)]); };
    for (const I of info.values()) {
      if (I.arms) addGap(I.strip, I.S - 7.5, I.S + 7.5);
      if (I.U) addGap(I.strip, I.S - I.G.sgn * 1.6, I.S + I.G.sgn * 60);
    }
    // Kop van de laan: waar nooit een auto komt, wordt het een plein (stoeptegels) in plaats van een stomp stuk asfalt
    for (const I of info.values()) {
      const pfI = I.pf ? at(I, I.G.pf) : null;
      I.capF = !I.contF && !I.pf && !I.arms && !I.U ? 'all' : (I.U && !I.contF ? 6.8 : null);
      I.capB = !I.contB && !I.pb && !I.arms && !(pfI && pfI.arms) ? 1.0 : null;
    }
    for (const I of info.values()) {
      const nx = I.contF ? at(I, I.G.F) : null;
      I.nextCtrl = !!(nx && nx.ctrl);
      const gl = (gaps.get(I.strip) || []).filter(([a, b]) => b > I.S - 12 && a < I.S + 12).map(([a, b]) => [Math.round((a - I.S) * 10) / 10, Math.round((b - I.S) * 10) / 10]);
      I.gaps = gl;
      const ring = [0, 1, 2, 3, 4, 5].map(k => { const [a, b] = nb2(I, k); const st = cells.get(key(a, b)); return st && st.length ? st[0] + (st.length > 1 ? '+' : '') : ''; });
      I.shapeKey = JSON.stringify([I.d, I.pf, I.pb, I.arms, I.nextCtrl, I.capF, I.capB, gl]);   // alles waar de vorm van afhangt
      sig.set(key(I.q, I.r), JSON.stringify([I.shapeKey, I.contF, I.contB, I.U, I.ctrl, ring]));
    }
    return { info, sig };
  }
  const nb2 = (I, k) => [I.q + NEIGH[k][0], I.r + NEIGH[k][1]];
  // Verkeerslichten op de laan: alle kruisingen van één strook lopen gelijk (groene golf). Eerst de laan groen,
  // dan de zijstraten. Wie van de laan linksaf slaat, wacht op tegenliggers.
  // (na de zijstraten langer alles rood: wie daar linksaf slaat, rijdt een flink stuk over de kruising)
  const LT = { G: 12, A: 2.5, AR: 2, SG: 8, AR2: 3.5 };
  const LT_PER = LT.G + LT.A + LT.AR + LT.SG + LT.A + LT.AR2;
  function laanLight(q, r, arm, t) {
    const I = laanAt(q, r); if (!I) return null;
    let side;
    if (arm === I.G.Bk) { if (!I.ctrl) return null; side = false; }
    else if ((I.arms >> arm) & 1) side = true;
    else return null;
    const off = (hash(I.strip, 17, 3) % 997) / 997 * LT_PER, tt = ((t + off) % LT_PER + LT_PER) % LT_PER;
    if (!side) return tt < LT.G ? 'g' : tt < LT.G + LT.A ? 'a' : 'r';
    const t2 = tt - (LT.G + LT.A + LT.AR);
    return t2 >= 0 && t2 < LT.SG ? 'g' : t2 >= LT.SG && t2 < LT.SG + LT.A ? 'a' : 'r';
  }

  // ---------- Wegen ----------
  // Elke wegtegel krijgt een bovenvlak dat getekend wordt uit zijn aansluitingen (6 bits).
  // Een straat is 6 m breed: dat is precies de breedte van een zeshoekzijde, dus de stoep
  // loopt over elke tegelgrens recht door. Rijbaan 4,2 m, stoep 0,9 m, band 15 cm.
  const STREET_W = R, ASPH_W = 5.0;   // straat 9 m: rijbaan 5 m (2 x 2,5 m), stoepen 2 m
  const COL = { walk: '#cbc8bd', joint: 'rgba(90,86,76,0.22)', kerb: '#9b988e', asphalt: '#3c4045', mark: '#f1efe6' };
  const KEER = { asph: 5.5, walk: 7.5 };          // keerlus: 11 m draaicirkel voor auto's
  const ZEBRA = [INNER * 0.5, INNER * 0.72];      // zebrapad net buiten de kruising
  const roadMats = new Map();
  // Stoeptegels 30 x 30 cm; de textuur beslaat 0,6 x 0,6 m en herhaalt zich
  M.walkTop = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = COL.walk; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(90,86,76,0.28)';
    g.fillRect(0, 0, 128, 2); g.fillRect(0, 64, 128, 2); g.fillRect(0, 0, 2, 128); g.fillRect(64, 0, 2, 128);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.6, 1 / 0.6); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.95 });
  })();
  M.kerb = std({ color: '#a7a499', roughness: 0.9 });
  // Klinkers 20 x 10 cm in halfsteens verband; textuur beslaat 0,6 x 0,6 m
  M.paver = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), bw = 128 / 3, bh = 128 / 6;
    g.fillStyle = '#7d4a3a'; g.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 6; row++) for (let i = -1; i < 4; i++) {
      const x = i * bw + (row % 2) * bw / 2, v = Math.abs(Math.sin(i * 91.7 + row * 37.3) * 4375.85) % 1;
      g.fillStyle = `hsl(${12 + v * 8}, ${38 + v * 10}%, ${36 + v * 9}%)`;
      g.fillRect(x + 1.2, row * bh + 1.2, bw - 2.4, bh - 2.4);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 0.6, 1 / 0.6); t.anisotropy = aniso;
    return std({ map: t, roughness: 0.95 });
  })();
  M.paverPlain = std({ color: '#8a5141' });
  M.stone = std({ color: '#bdb5a5' });
  M.rail = std({ color: '#3b4248', roughness: 0.5, metalness: 0.4 });
  M.hofWall = std({ color: '#93503b' });
  M.bench = std({ color: '#7a5a3c' });
  M.blockSide = std({ color: '#b9ad96' });
  M.blockTop = std({ color: '#c9bfab' });
  M.asphaltSide = std({ color: '#34383c' });

  // ---------- 3D-straat ----------
  // Asfalt 12 cm en stoep 25 cm boven het maaiveld. De vormen worden exact berekend uit de
  // aansluitingen: per arm een strook vanuit het midden, met binnenhoeken waar armen elkaar raken
  // en een boog aan de buitenkant van een bocht. De stoep bestaat uit losse stroken tussen de armen.
  const WALK_H = 0.25, ASPH_H = 0.12; let ASPH_HALF = ASPH_W / 2, WALK_HALF = STREET_W / 2;
  const roadGeoCache = new Map();
  function roadGeo(mask) {
    if (roadGeoCache.has(mask)) return roadGeoCache.get(mask);
    const arms = [0, 1, 2, 3, 4, 5].filter(k => mask & (1 << k))
      .map(k => ({ k, th: Math.atan2(FRAMES[k].nz, FRAMES[k].nx) })).sort((a, b) => a.th - b.th);
    const out = buildRoadGeo(arms, INNER, false);
    roadGeoCache.set(mask, out);
    return out;
  }
  // Wegvorm voor een willekeurige set armen (hoeken th, lengte L); vert = op een hoekpunt tussen vakken, zonder bermen
  function buildRoadGeo(arms, L, vert) {
    const at = (th, sAlong, wLeft) => { const c = Math.cos(th), sn = Math.sin(th); return [c * sAlong - sn * wLeft, sn * sAlong + c * wLeft]; };
    // Ronde hoeken. Een bocht (2 armen) is een echte boog: alle randen (stoep, band, rijbaan, middenstreep)
    // hebben hetzelfde middelpunt, met een middenstraal van 9 m. Op een kruising krijgt de trottoirband een
    // straal van 4,5 m, en de stoeprand eromheen een straal die 2 m kleiner is (concentrisch).
    const nArms = arms.length;
    const TAU = Math.PI * 2;
    const angOf = (x, z) => Math.atan2(z, x);
    function arcPts(cx, cz, r, A, Bp) {   // korte boog van A naar Bp rond (cx, cz)
      let a0 = angOf(A[0] - cx, A[1] - cz), a1 = angOf(Bp[0] - cx, Bp[1] - cz), d = a1 - a0;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const n = Math.max(2, Math.ceil(Math.abs(d) / (Math.PI / 24))), out = [];
      for (let i = 1; i < n; i++) { const an = a0 + d * i / n; out.push([cx + Math.cos(an) * r, cz + Math.sin(an) * r]); }
      return out;
    }
    // middenstraal Rc voor een binnenhoek g: in een bocht vast 9 m, op een kruising band-straal + halve rijbaan
    const rcFor = g => {
      const maxRc = 0.97 * L * Math.tan(g / 2);   // raakpunt moet binnen het vak blijven
      return nArms === 2 ? Math.min(9, maxRc) : Math.min(ASPH_HALF + 4.5, maxRc);
    };
    function gapPath(w, a, b) {       // van de linkerrand van arm a naar de rechterrand van arm b (tegen de klok in)
      let g = b.th - a.th; if (g <= 1e-6) g += TAU;
      const pts = [at(a.th, L, w)];
      if (g < Math.PI - 1e-3) {
        // binnenkant van een hoek: afronden (of een punt als er geen ruimte is)
        const Rc = rcFor(g), r = Rc - w, bis = a.th + g / 2;
        if (r < 0.25) {
          const d = w / Math.sin(g / 2);
          pts.push([Math.cos(bis) * d, Math.sin(bis) * d]);
        } else {
          const D = Rc / Math.sin(g / 2), st = Rc / Math.tan(g / 2), cx = Math.cos(bis) * D, cz = Math.sin(bis) * D;
          const A = at(a.th, st, w), Bp = at(b.th, st, -w);
          pts.push(A, ...arcPts(cx, cz, r, A, Bp), Bp);
        }
      } else if (g > Math.PI + 1e-3) {
        if (nArms === 2) {
          // buitenkant van een bocht: zelfde middelpunt als de binnenkant, straal Rc + w
          const g1 = TAU - g, Rc = rcFor(g1), bis = a.th + g / 2 + Math.PI;
          const D = Rc / Math.sin(g1 / 2), st = Rc / Math.tan(g1 / 2), cx = Math.cos(bis) * D, cz = Math.sin(bis) * D;
          const A = at(a.th, st, w), Bp = at(b.th, st, -w);
          pts.push(A, ...arcPts(cx, cz, Rc + w, A, Bp), Bp);
        } else {
          const a0 = a.th + Math.PI / 2, a1 = a.th + g - Math.PI / 2, n = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 16)));
          for (let i = 0; i <= n; i++) { const an = a0 + (a1 - a0) * i / n; pts.push([Math.cos(an) * w, Math.sin(an) * w]); }
        }
      }
      pts.push(at(b.th, L, -w));
      return pts;
    }
    // middenlijn van een bocht (voor de streepjes)
    function centerLine() {
      if (nArms !== 2) return null;
      let g = arms[1].th - arms[0].th; if (g <= 1e-6) g += TAU;
      let a = arms[0], b = arms[1];
      if (g > Math.PI) { a = arms[1]; b = arms[0]; g = TAU - g; }
      if (Math.abs(g - Math.PI) < 1e-3) return null;
      const Rc = rcFor(g), bis = a.th + g / 2, D = Rc / Math.sin(g / 2), st = Rc / Math.tan(g / 2);
      const cx = Math.cos(bis) * D, cz = Math.sin(bis) * D, A = at(a.th, st, 0), Bp = at(b.th, st, 0);
      return [at(a.th, L, 0), A, ...arcPts(cx, cz, Rc, A, Bp), Bp, at(b.th, L, 0)];
    }
    function deadPath(w, rk, a) {     // doodlopend: strook met keerlus
      const al = Math.asin(w / rk), s0 = Math.sqrt(rk * rk - w * w), pts = [at(a.th, L, w), at(a.th, s0, w)];
      const n = 28;
      for (let i = 1; i < n; i++) { const an = a.th + al + (Math.PI * 2 - 2 * al) * i / n; pts.push([Math.cos(an) * rk, Math.sin(an) * rk]); }
      pts.push(at(a.th, s0, -w), at(a.th, L, -w));
      return pts;
    }
    const extrude = (pts, h) => {
      const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const out = { asph: null, asphPoly: null, walk: [], walkPolys: [] };
    const n = arms.length;
    if (n === 0) {
      const hex = []; for (let i = 0; i < 6; i++) { const a = (30 + 60 * i) * Math.PI / 180; hex.push([R * Math.cos(a), R * Math.sin(a)]); }
      out.walkPolys.push(hex);
    } else if (n === 1) {
      const kA = vert ? ASPH_HALF + 0.5 : KEER.asph, kW = vert ? WALK_HALF + 0.5 : KEER.walk;
      out.asphPoly = deadPath(ASPH_HALF, kA, arms[0]);
      out.walkPolys.push(deadPath(WALK_HALF, kW, arms[0]).concat(deadPath(ASPH_HALF, kA, arms[0]).reverse()));
    } else {
      out.asphPoly = [];
      for (let i = 0; i < n; i++) {
        const a = arms[i], b = arms[(i + 1) % n];
        out.asphPoly.push(...gapPath(ASPH_HALF, a, b));
        out.walkPolys.push(gapPath(WALK_HALF, a, b).concat(gapPath(ASPH_HALF, a, b).reverse()));
      }
    }
    if (out.asphPoly) out.asph = extrude(out.asphPoly, ASPH_H);
    out.walk = out.walkPolys.map(p => extrude(p, WALK_H));
    out.center = centerLine();
    // Bermen: de hoeken van het vak buiten de stoep. Elke berm grenst aan de zijden tussen twee armen in;
    // wat daar ligt (park, huis, kantoor) bepaalt straks hoe de berm wordt ingevuld.
    out.verges = [];
    if (n >= 1 && !vert) {
      const TAU2 = Math.PI * 2, norm = x => ((x % TAU2) + TAU2) % TAU2;
      const corner = i => { const an = (30 + 60 * i) * Math.PI / 180; return [R * Math.cos(an), R * Math.sin(an)]; };
      for (let i = 0; i < n; i++) {
        const a = arms[i], b = n === 1 ? arms[0] : arms[(i + 1) % n];
        const g = n === 1 ? TAU2 : (norm(b.th - a.th) || TAU2);
        const inner = n === 1 ? deadPath(WALK_HALF, KEER.walk, a) : gapPath(WALK_HALF, a, b);
        const cs = [];
        for (let j = 0; j < 6; j++) { const ca = norm((30 + 60 * j) * Math.PI / 180 - a.th); if (ca > 1e-6 && ca < g - 1e-6) cs.push([ca, corner(j)]); }
        cs.sort((x, y) => x[0] - y[0]);
        const poly = [at(a.th, L, WALK_HALF), ...cs.map(c => c[1]), at(b.th, L, -WALK_HALF), ...inner.slice(1, -1).reverse()];
        let area = 0; for (let j = 0; j < poly.length; j++) { const [x1, z1] = poly[j], [x2, z2] = poly[(j + 1) % poly.length]; area += x1 * z2 - x2 * z1; }
        if (Math.abs(area) / 2 < 1.5) continue;
        const sides = [0, 1, 2, 3, 4, 5].filter(k => { const ra = norm(Math.atan2(FRAMES[k].nz, FRAMES[k].nx) - a.th); return ra > 1e-3 && ra < g - 1e-3; });
        let cx2 = 0, cz2 = 0; for (const [x, z] of poly) { cx2 += x; cz2 += z; }
        out.verges.push({ poly, sides, inner, area: Math.abs(area) / 2, c: [cx2 / poly.length, cz2 / poly.length] });
      }
    }
    return out;
  }
  function inPoly(x, z, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, zi] = pts[i], [xj, zj] = pts[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }
  function roadMat(mask) {
    if (roadMats.has(mask)) return roadMats.get(mask);
    const S = 1024, sc = S / (2 * R), P = x => (x + R) * sc;   // meters → pixels; vak beslaat -R..R m
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    // De vorm van de rijbaan komt uit de geometrie; deze textuur is alleen het asfalt met de markering erop
    g.fillStyle = COL.asphalt; g.fillRect(0, 0, S, S);
    const arms = [0, 1, 2, 3, 4, 5].filter(k => mask & (1 << k));
    if (arms.length) {
      // Markering: middenstreep in streepjes van 1,3 m, met een streep precies over de tegelrand
      const dash = (k, s0, s1, w) => {
        const f = FRAMES[k];
        g.strokeStyle = COL.mark; g.lineWidth = w * sc; g.lineCap = 'butt';
        g.beginPath(); g.moveTo(P(f.nx * s0), P(f.nz * s0)); g.lineTo(P(f.nx * s1), P(f.nz * s1)); g.stroke();
      };
      const pitch = INNER / 2, cl = roadGeo(mask).center;
      if (cl) {
        // bocht: gestreepte middenlijn langs de boog, met een streep precies op beide tegelranden
        let len = 0; for (let i = 1; i < cl.length; i++) len += Math.hypot(cl[i][0] - cl[i - 1][0], cl[i][1] - cl[i - 1][1]);
        const per = len / Math.max(1, Math.round(len / (2 * pitch / 2)));
        g.strokeStyle = COL.mark; g.lineWidth = 0.12 * sc; g.lineCap = 'butt';
        g.setLineDash([1.3 * sc, (per - 1.3) * sc]); g.lineDashOffset = -(per - 0.65) * sc;
        g.beginPath(); cl.forEach(([x, z], i) => g[i ? 'lineTo' : 'moveTo'](P(x), P(z))); g.stroke();
        g.setLineDash([]);
      } else {
        arms.forEach(k => {
          dash(k, INNER - 0.65, INNER + 0.65, 0.12);
          if (arms.length <= 2) dash(k, pitch - 0.65, pitch + 0.65, 0.12);
        });
      }
      // Zebrapad op elke arm van een kruising, als de armen ernaast vrij zijn
      if (arms.length >= 3) {
        arms.forEach(k => {
          if (mask & (1 << ((k + 1) % 6)) || mask & (1 << ((k + 5) % 6))) return;
          const f = FRAMES[k];
          g.strokeStyle = COL.mark; g.lineWidth = 0.45 * sc; g.lineCap = 'butt';
          for (let w = -ASPH_W / 2 + 0.35; w < ASPH_W / 2 - 0.2; w += 0.9) {
            const ax = f.nx * ZEBRA[0] + f.tx * w, az = f.nz * ZEBRA[0] + f.tz * w;
            const bx = f.nx * ZEBRA[1] + f.tx * w, bz = f.nz * ZEBRA[1] + f.tz * w;
            g.beginPath(); g.moveTo(P(ax), P(az)); g.lineTo(P(bx), P(bz)); g.stroke();
          }
        });
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.repeat.set(1 / (2 * R), 1 / (2 * R)); tex.offset.set(0.5, 0.5);   // UV in meters → 0..1
    tex.anisotropy = aniso;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    roadMats.set(mask, mat);
    return mat;
  }

