  // ---------- Stadspraat: spreekballonnen boven mensen ----------
  // Mensen zeggen wat ze van de stad vinden: wat mooi is en wat ze missen. De zinnen hangen af van wat er echt staat
  // (parken, water, huizen, kantoren, wegen, verkeer) en van het weer. Het zijn HTML-ballonnetjes die elk beeld
  // boven het hoofd van de spreker worden gezet; in een praatje komt elke beurt een ballon, en daarbuiten af en toe
  // een opmerking van iemand in de buurt van de camera.
  const chatterEl = document.createElement('div'); chatterEl.id = 'chatter'; document.body.appendChild(chatterEl);
  const chatter = (() => {
    const live = [];                    // { a, el, t, dur }
    let review = null, reviewT = -99, idleT = 3, recent = [];
    const MAXB = 6, RANGE = 38;
    const base = t => String(t).replace(/\d+$/, '');
    // Wat staat er in de stad? (elke paar seconden opnieuw geteld)
    function measure() {
      const n = { woning: 0, kantoor: 0, park: 0, water: 0, meer: 0, pad: 0, hoog: 0, cellen: 0, wegen: 0, fiets: 0, laan: 0, rotonde: 0 };
      for (const st of cells.values()) {
        if (!st || !st.length) continue;
        n.cellen++;
        for (const t of st) {
          const b = base(t);
          if (b === 'woning') n.woning++; else if (b === 'kantoor') n.kantoor++; else if (b === 'park') n.park++;
          else if (b === 'water') { if (String(t).endsWith('1')) n.meer++; else n.water++; }
          else if (b === 'pad') n.pad++; else if (b === 'fietspad') n.fiets++; else if (b === 'weg' || b === 'laan') n.wegen++;
        }
        if (st.length >= 4) n.hoog++;
      }
      for (const p of cells.paths || []) { if (p.t === 'fiets') n.fiets++; else if (p.t === 'pad') n.pad++; else if (p.t === 'ring') n.rotonde++; else n.wegen++; if (p.t === 'laan') n.laan++; }
      n.bouw = n.woning + n.kantoor;
      n.autos = cars.list ? cars.list.length : 0;
      n.mensen = people.agents ? people.agents.length : 0;
      return n;
    }
    // Zinnen: [tekst, voorwaarde]; sommige zijn lof, andere gemis. Het gewicht bepaalt hoe vaak.
    const LINES = [
      // lof
      ['Wat een mooie stad is dit!', n => n.cellen > 12],
      ['Ik woon hier echt graag.', n => n.woning > 3],
      ['Zo veel groen, heerlijk!', n => n.park > 6],
      ['Dat park is prachtig.', n => n.park > 0],
      ['Kijk, een meertje! Mooi.', n => n.meer > 0],
      ['Fijn dat het water hier door de stad loopt.', n => n.water > 0],
      ['Wat een mooie huizen.', n => n.woning > 6],
      ['Mooi, die hoge gebouwen.', n => n.hoog > 2],
      ['Je kunt hier lekker fietsen.', n => n.fiets > 0],
      ['Fijne wandelpaden hier.', n => n.pad > 2],
      ['Wat een mooie ronde weg.', n => n.rotonde > 0],
      ['Het is hier lekker rustig.', n => n.autos < 3 && n.cellen > 8],
      // gemis
      ['Hier mist wel wat groen...', n => n.park < n.bouw * 0.25 && n.bouw > 4],
      ['Een park zou mooi zijn.', n => n.park === 0 && n.cellen > 6],
      ['Waarom is er geen water?', n => n.water + n.meer === 0 && n.cellen > 10],
      ['Een meertje zou hier mooi staan.', n => n.meer === 0 && n.park > 1],
      ['Waar moet ik eigenlijk werken? Geen kantoren!', n => n.kantoor === 0 && n.woning > 4],
      ['Er wonen hier te weinig mensen.', n => n.kantoor > 3 && n.woning < n.kantoor],
      ['Ik mis fietspaden.', n => n.fiets === 0 && n.wegen > 6],
      ['Ik mis wandelpaden in het groen.', n => n.pad === 0 && n.park > 2],
      ['Wat is het hier leeg, bouw er nog wat bij!', n => n.cellen < 10],
      ['Meer woningen graag!', n => n.woning < 4 && n.cellen > 6],
      ['Heel veel verkeer hier.', n => n.autos > 12],
      ['Geen winkels... ik moet ver lopen voor brood.', n => n.woning > 8],
      ['Een rotonde zou het verkeer verbeteren.', n => n.rotonde === 0 && n.wegen > 10],
      ['Waar zijn de bankjes?', n => n.park > 2 || n.cellen > 15],
    ];
    const WET = ['Wat een rotweer...', 'Kon ik maar naar binnen!', 'Fijn, een buitje... niet.', 'Snel naar huis!'];
    const SNOW = ['Wat mooi, sneeuw!', 'Een witte stad, prachtig.'];
    const NIGHT = ['De stad is mooi bij nacht.', 'Zo stil in het donker.'];
    const NEUTRAL = ['Mooie dag voor een wandeling.', 'Even de benen strekken.', 'Ik vraag me af wat ze hier nog gaan bouwen.', 'Wat zou hier nog komen?'];
    const HI = ['Hoi!', 'Goedemorgen!', 'Hé, hallo!', 'Hallo daar!'];
    function pick(a) {
      const n = review;
      if (WXK.snow > 0.3 && Math.random() < 0.5) return SNOW[Math.floor(Math.random() * SNOW.length)];
      if (WXK.rain > 0.3 && Math.random() < 0.6) return WET[Math.floor(Math.random() * WET.length)];
      if (typeof nightK !== 'undefined' && nightK > 0.7 && Math.random() < 0.25) return NIGHT[Math.floor(Math.random() * NIGHT.length)];
      const ok = LINES.filter(([t, f]) => !recent.includes(t) && f(n));
      const t = ok.length ? ok[Math.floor(Math.random() * ok.length)][0] : NEUTRAL[Math.floor(Math.random() * NEUTRAL.length)];
      recent.push(t); if (recent.length > 8) recent.shift();
      return t;
    }
    function say(a, text, dur, cls) {
      if (!a || live.some(b => b.a === a)) return false;
      if (Math.hypot(a.x - camera.position.x, a.z - camera.position.z) > RANGE) return false;
      if (live.length >= MAXB) { const old = live.shift(); old.el.remove(); }
      const el = document.createElement('div'); el.className = 'bub' + (cls ? ' ' + cls : ''); el.textContent = text;
      chatterEl.appendChild(el);
      live.push({ a, el, t: 0, dur: dur || (2.2 + text.length * 0.06) });
      return true;
    }
    // Een zin over de stad laten zeggen door deze persoon; geeft de duur terug (voor het brabbelgeluid)
    function opine(a) {
      const now = performance.now();
      if (now - reviewT > 6000 || !review) { review = measure(); reviewT = now; }
      const text = pick(a); if (!text) return 0;
      const dur = Math.max(1.8, Math.min(4.8, 1.2 + text.length * 0.07));
      return say(a, text, dur) ? dur : 0;
    }
    function greet(a) { if (live.length >= MAXB - 2) return; say(a, HI[Math.floor(Math.random() * HI.length)], 1.4, 'hi'); }
    const v = new THREE.Vector3();
    function update(dt) {
      const cp = camera.position;
      // af en toe een opmerking van iemand dichtbij die toch niet in een praatje zit
      idleT -= dt;
      if (idleT <= 0 && live.length < 3 && people.agents && people.agents.length) {
        idleT = 4 + Math.random() * 5;
        const near = people.agents.filter(a => a.id && a.state === 'walk' && !a.chatT && Math.hypot(a.x - cp.x, a.z - cp.z) < RANGE * 0.75 && Math.abs(a.y - cp.y) < 60);
        if (near.length) {
          const a = near[Math.floor(Math.random() * near.length)];
          const dur = opine(a); if (dur) sound.talk(a.x, a.y + 1.5 * (a.scale || 1), a.z, dur * 0.8, a.voice || 1);
        }
      }
      const W = window.innerWidth, H = window.innerHeight, kc = CURVE.on ? CURVE.k.value : 0, cc = CURVE.c.value;
      for (let i = live.length - 1; i >= 0; i--) {
        const b = live[i], a = b.a; b.t += dt;
        if (b.t > b.dur || !people.agents.includes(a) || a.state === 'rag') { b.el.remove(); live.splice(i, 1); continue; }
        let wx = a.x, wy = a.y + (1.95 + 0.25) * (a.scale || 1), wz = a.z;
        if (kc) { const dx = wx - cc.x, dz = wz - cc.y; wy -= kc * (dx * dx + dz * dz); }
        v.set(wx, wy, wz).project(camera);
        const d = Math.hypot(a.x - cp.x, a.z - cp.z);
        const vis = v.z > -1 && v.z < 1 && Math.abs(v.x) < 1.1 && v.y > -1.1 && v.y < 1.1 && d < RANGE;
        const k = Math.min(1, b.t / 0.18, (b.dur - b.t) / 0.25);
        b.el.style.opacity = vis ? Math.max(0, Math.min(1, (RANGE - d) / 12)) * Math.max(0, k) : 0;
        if (vis) { const s = Math.max(0.7, Math.min(1.15, 14 / Math.max(6, d) + 0.35)); b.el.style.transform = `translate(-50%,-100%) translate(${((v.x + 1) / 2 * W).toFixed(1)}px,${((1 - v.y) / 2 * H).toFixed(1)}px) scale(${s.toFixed(2)})`; }
      }
    }
    return { say, opine, greet, update, live, measure: () => (review = measure()) };
  })();
