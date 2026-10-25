  // ---------- De Hulk ----------
  // Staat er een file (vijf of meer auto's die al een tijd stilstaan, bij elkaar), dan komt er een reus van 4,5 m
  // aangelopen, die de auto's één voor één optilt en wegslingert. De file lost op (de auto's beginnen ergens anders
  // opnieuw), de omstanders schrikken, en de Hulk loopt weer weg. Hooguit één keer per anderhalve minuut.
  // Een eenvoudige pop van blokken, groen, met een eigen loop- en gooianimatie (geen onderdeel van de mensen).
  const hulk = (() => {
    const g = new THREE.Group(); g.visible = false; g.userData.noOcc = true; scene.add(g);
    const skin = std({ color: '#4f9a3c', roughness: 0.8 }), pants = std({ color: '#5a3f8c' }), hair = std({ color: '#1a1a1a' });
    const box = (w, h, d, m, x, y, z, parent) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mm.position.set(x, y, z); mm.castShadow = true; (parent || g).add(mm); return mm; };
    const S = 2.5;   // schaal: 1,78 m × 2,5 ≈ 4,5 m
    const torso = box(0.62 * S, 0.62 * S, 0.34 * S, skin, 0, 1.2 * S, 0); torso.geometry.translate(0, 0.31 * S, 0);
    const head = box(0.26 * S, 0.28 * S, 0.26 * S, skin, 0, 1.86 * S, 0.02 * S); head.geometry.translate(0, 0.12 * S, 0);
    box(0.28 * S, 0.08 * S, 0.28 * S, hair, 0, 0.26 * S, -0.01 * S, head);
    box(0.05 * S, 0.03 * S, 0.02 * S, hair, -0.07 * S, 0.17 * S, 0.13 * S, head); box(0.05 * S, 0.03 * S, 0.02 * S, hair, 0.07 * S, 0.17 * S, 0.13 * S, head);   // boze wenkbrauwen
    const mkLimb = (w, len, d, m, x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); g.add(p); const b = box(w, len, d, m, 0, -len / 2, 0, p); void b; return p; };
    const armL = mkLimb(0.2 * S, 0.72 * S, 0.2 * S, skin, -0.42 * S, 1.78 * S, 0), armR = mkLimb(0.2 * S, 0.72 * S, 0.2 * S, skin, 0.42 * S, 1.78 * S, 0);
    box(0.24 * S, 0.2 * S, 0.24 * S, skin, 0, -0.78 * S, 0, armL); box(0.24 * S, 0.2 * S, 0.24 * S, skin, 0, -0.78 * S, 0, armR);   // vuisten
    const legL = mkLimb(0.24 * S, 1.18 * S, 0.26 * S, pants, -0.17 * S, 1.2 * S, 0), legR = mkLimb(0.24 * S, 1.18 * S, 0.26 * S, pants, 0.17 * S, 1.2 * S, 0);
    const st = { on: false, x: 0, z: 0, h: 0, t: 0, phase: 'af', target: null, cars: [], hold: null, cool: 0, next: 0, carry: null };
    const SPEED = 4.2, REACH = 3.2;
    function start(jam) {
      const ang = Math.random() * Math.PI * 2, d = 55;
      Object.assign(st, { on: true, x: jam.x + Math.cos(ang) * d, z: jam.z + Math.sin(ang) * d, t: 0, phase: 'loop', cars: jam.cars.slice(0, 6), target: null, hold: null, carry: null, done: 0 });
      g.visible = true; st.h = Math.atan2(jam.x - st.x, jam.z - st.z);
      for (const c of st.cars) c.hulkHold = true;   // de file blijft staan tot de Hulk er is
      toast('Een file! Daar komt de Hulk …', 2600);
      if (typeof sound !== 'undefined' && sound.thunder) sound.thunder(0.1, 0.5);
      if (typeof sound !== 'undefined') setTimeout(() => sound.fx('roar', st.x, 3, st.z), 600);
    }
    function pickCar() {
      const live = st.cars.filter(c => c.path && !c.fly && !c.crash);
      if (!live.length || st.done >= 5) { for (const c of st.cars) c.hulkHold = false; st.phase = 'weg'; const ang = Math.random() * Math.PI * 2; st.target = [st.x + Math.cos(ang) * 90, st.z + Math.sin(ang) * 90]; return; }
      live.sort((a, b) => Math.hypot(a.x - st.x, a.z - st.z) - Math.hypot(b.x - st.x, b.z - st.z));
      st.hold = live[0]; st.target = [st.hold.x, st.hold.z]; st.phase = 'loop';
    }
    function update(dt) {
      if (!st.on) {
        st.cool -= dt; if (st.cool > 0 || typeof cars === 'undefined' || !cars.on) return;
        st.next -= dt; if (st.next > 0) return; st.next = 4;
        const jams = cars.jams(); if (jams.length) { start(jams[0]); st.cool = 90; }
        return;
      }
      st.t += dt;
      if (st.phase === 'loop' && !st.target) pickCar();
      if (st.phase === 'loop' || st.phase === 'weg') {
        const tx = st.target[0], tz = st.target[1], dx = tx - st.x, dz = tz - st.z, d = Math.hypot(dx, dz);
        if (st.hold && (st.hold.fly || st.hold.crash)) { st.target = null; st.hold = null; return; }   // de auto is ondertussen weg
        if (st.hold) { st.target = [st.hold.x, st.hold.z]; }
        const want = Math.atan2(dx, dz); let e = want - st.h; e = Math.atan2(Math.sin(e), Math.cos(e)); st.h += e * Math.min(1, dt * 4);
        if (d > (st.phase === 'weg' ? 2 : REACH)) { const step = Math.min(d, SPEED * dt); st.x += Math.sin(st.h) * step; st.z += Math.cos(st.h) * step; }
        else if (st.phase === 'weg') { st.on = false; g.visible = false; for (const c of st.cars) c.hulkHold = false; toast('De Hulk is weer weg. De file is opgelost.', 2200); return; }
        else { st.phase = 'til'; st.t = 0; }
        // voetstappen: bij elke stap een bons
        if (st.phase !== 'til' && Math.floor(st.t * 2.2) !== Math.floor((st.t - dt) * 2.2) && typeof sound !== 'undefined') sound.impact(0.5, st.x, 0, st.z, false);
        // mensen schrikken van de reus
        if (typeof people !== 'undefined' && Math.floor(st.t) !== Math.floor(st.t - dt)) for (const a of people.agents) if (a.state === 'walk' && Math.hypot(a.x - st.x, a.z - st.z) < 12 && !(a.startleT > 0)) { a.startleT = 1.4; a.lookAt = [st.x, st.z]; }
      } else if (st.phase === 'til') {
        const c = st.hold;
        if (!c || c.fly) { st.phase = 'loop'; st.target = null; st.hold = null; return; }
        // optillen (1 s), dan weggooien in de richting weg van de Hulk, iets opzij
        c.v = 0; c.held = true;
        if (st.t < 1.0) { c.sy = (c.sy0 ?? (c.sy0 = c.sy ?? 0.12)) + st.t * 3.2; c.roll = st.t * 0.6; }
        else { const ang = st.h + (Math.random() - 0.5) * 1.2; c.hulkHold = false; cars.toss(c, Math.sin(ang), Math.cos(ang), 8); c.sy0 = undefined; st.done++; st.phase = 'loop'; st.target = null; st.hold = null;
          if (typeof people !== 'undefined') for (const a of people.agents) if ((a.state === 'walk' || a.state === 'pause') && Math.hypot(a.x - st.x, a.z - st.z) < 25) { a.startleT = 1.6; a.lookAt = [st.x, st.z]; }
          if (typeof sound !== 'undefined') sound.impact(0.8, st.x, 2, st.z, false); }
      }
      // pose
      g.position.set(st.x, terrGround(st.x, st.z), st.z); g.rotation.y = st.h;
      const walking = st.phase !== 'til', sw = walking ? Math.sin(st.t * 7) * 0.7 : 0;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      if (st.phase === 'til') { const k = Math.min(1, st.t); armL.rotation.x = -0.6 - 2.0 * k; armR.rotation.x = -0.6 - 2.0 * k; armL.rotation.z = 0.4; armR.rotation.z = -0.4; }
      else { armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8; armL.rotation.z = 0.25; armR.rotation.z = -0.25; }
      torso.rotation.x = walking ? 0.12 : -0.1;
    }
    function summon() {   // test en knop: de Hulk komt naar de dichtstbijzijnde file, of anders naar het midden van het beeld
      const jams = typeof cars !== 'undefined' ? cars.jams() : [];
      if (jams.length) { start(jams[0]); return true; }
      const list = typeof cars !== 'undefined' ? cars.list.filter(c => c.path) : []; if (!list.length) return false;
      const tx = mode === 'walk' ? player.x : orbit.target.x, tz = mode === 'walk' ? player.z : orbit.target.z;
      list.sort((a, b) => Math.hypot(a.x - tx, a.z - tz) - Math.hypot(b.x - tx, b.z - tz));
      start({ x: list[0].x, z: list[0].z, cars: list.slice(0, 5) }); return true;
    }
    return { update, summon, get on() { return st.on; }, st };
  })();
  window.__hulk = hulk;
