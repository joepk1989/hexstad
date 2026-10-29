  // ---------- Camera: bouwen (orbit) ----------
  const orbit = { target: new THREE.Vector3(0, 0, 0), theta: 0.75, phi: 0.92, dist: 190 };
  // ---------- Cameramodus: spatiebalk aan/uit in de bouwmodus ----------
  // Vrij rondvliegen zonder interface: de muis kijkt (aanwijzer vastgezet), W/A/S/D vliegt in de kijkrichting (met wat
  // vaart, zoals een drone), E en Q gaan omhoog en omlaag, Shift is sneller, Ctrl langzamer, het wiel zoomt (beeldhoek)
  // en F maakt een foto zonder knoppen erop. Spatie of Esc stopt; het draaipunt komt dan op wat je aankijkt.
  const flyCam = { on: false, x: 0, y: 60, z: 0, yaw: 0, pitch: -0.4, k: 1, fov: 45, near: 1, vx: 0, vy: 0, vz: 0, fovT: 65 };
  function flyStart() {
    if (flyCam.on || mode !== 'build') return false;
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    flyCam.on = true; flyCam.x = camera.position.x; flyCam.y = camera.position.y; flyCam.z = camera.position.z;
    flyCam.yaw = Math.atan2(-d.x, -d.z); flyCam.pitch = Math.asin(Math.max(-1, Math.min(1, d.y)));
    flyCam.fov = camera.fov; flyCam.near = camera.near; flyCam.fovT = 65; flyCam.vx = flyCam.vy = flyCam.vz = 0; camera.fov = 65; camera.near = 0.3; camera.rotation.order = 'YXZ'; camera.updateProjectionMatrix();
    document.body.classList.add('fly'); gridLines.visible = false; ghost.visible = false; ghostArrow.visible = false; ghostEdges.visible = false;
    try { const pr = canvas.requestPointerLock && canvas.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}); } catch (_) {}
    if (!flyCam.badge) { flyCam.badge = document.createElement('div'); flyCam.badge.className = 'flybadge'; document.body.appendChild(flyCam.badge); }
    flyCam.badge.innerHTML = '<b>Cameramodus</b> · muis kijkt · W A S D · E/Q hoger/lager · Shift snel · klik schiet (rechts: sloopkogel) · wiel zoomt · F foto · Spatie stopt';
    flyCam.badge.hidden = false; flyCam.badge.classList.remove('dim'); clearTimeout(flyCam.dimT); flyCam.dimT = setTimeout(() => { if (flyCam.badge) flyCam.badge.classList.add('dim'); }, 3500);
    return true;
  }
  function flyStop() {
    if (!flyCam.on) return;
    flyCam.on = false; document.body.classList.remove('fly'); gridLines.visible = mode === 'build' && gridOn; if (flyCam.badge) flyCam.badge.hidden = true;
    if (document.pointerLockElement) document.exitPointerLock();
    camera.fov = flyCam.fov; camera.near = flyCam.near; camera.updateProjectionMatrix();
    const cp = new THREE.Vector3(flyCam.x, flyCam.y, flyCam.z), d = new THREE.Vector3(-Math.sin(flyCam.yaw) * Math.cos(flyCam.pitch), Math.sin(flyCam.pitch), -Math.cos(flyCam.yaw) * Math.cos(flyCam.pitch));
    let tg = null;
    { const h = groundHit(window.innerWidth / 2, window.innerHeight / 2); if (h && h.distance > 8 && h.distance < 1500) tg = h.point.clone(); }
    if (!tg) { const s = d.y < -0.05 ? -cp.y / d.y : 120; tg = cp.clone().addScaledVector(d, Math.min(600, Math.max(20, s))); tg.y = Math.max(0, tg.y); }
    const dv = cp.clone().sub(tg), dist = Math.min(2200, Math.max(14, dv.length()));
    orbit.target.copy(tg); orbit.dist = dist; orbit.theta = Math.atan2(dv.x, dv.z); orbit.phi = Math.max(0.12, Math.min(1.5, Math.acos(Math.max(-1, Math.min(1, dv.y / (dv.length() || 1))))));
    applyOrbit();
  }
  function flyUpdate(dt) {
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), u = (keys.KeyE ? 1 : 0) - (keys.KeyQ ? 1 : 0);
    const cy = Math.cos(flyCam.pitch), fx = -Math.sin(flyCam.yaw) * cy, fy = Math.sin(flyCam.pitch), fz = -Math.cos(flyCam.yaw) * cy, rx = Math.cos(flyCam.yaw), rz = -Math.sin(flyCam.yaw);
    const speed = Math.max(12, flyCam.y * 0.9) * flyCam.k * (keys.ShiftLeft || keys.ShiftRight ? 3 : 1) * (keys.ControlLeft || keys.ControlRight ? 0.25 : 1) * (camera.fov / 65);   // ingezoomd: rustiger
    const kv = Math.min(1, dt * 3.5);   // vaart: optrekken en uitglijden zoals een drone
    flyCam.vx += ((fx * f + rx * s) * speed - flyCam.vx) * kv; flyCam.vy += ((fy * f + u) * speed - flyCam.vy) * kv; flyCam.vz += ((fz * f + rz * s) * speed - flyCam.vz) * kv;
    flyCam.x += flyCam.vx * dt; flyCam.y += flyCam.vy * dt; flyCam.z += flyCam.vz * dt;
    if (Math.abs(camera.fov - flyCam.fovT) > 0.05) { camera.fov += (flyCam.fovT - camera.fov) * Math.min(1, dt * 6); camera.updateProjectionMatrix(); }
    const [q, r] = worldToCell(flyCam.x, flyCam.z), floor = Math.max(terrGround(flyCam.x, flyCam.z), colTopW(q, r)) + 2;
    flyCam.y = Math.min(1800, Math.max(floor, flyCam.y));
    camera.position.set(flyCam.x, flyCam.y, flyCam.z); camera.rotation.set(flyCam.pitch, flyCam.yaw, 0, 'YXZ');
    orbit.target.set(flyCam.x, 0, flyCam.z); orbit.dist = Math.min(600, Math.max(30, flyCam.y * 1.6));   // grond, mist en detailniveau volgen mee
  }
  function flyPhoto() {   // foto zonder knoppen: het beeld zelf, als png
    try {
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL('image/png'), a = document.createElement('a'), d = new Date(), z = n => String(n).padStart(2, '0');
      a.href = url; a.download = `raatstad-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.png`; a.click();
      const fl = document.createElement('div'); fl.className = 'flyflash'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 450);
      if (typeof sound !== 'undefined') sound.fx('click');
    } catch (e) { toast('Foto maken lukte niet', 1600); }
  }
  document.addEventListener('pointerlockchange', () => { if (flyCam.on && document.pointerLockElement !== canvas) flyStop(); });
  function applyOrbit() {
    if (flyCam.on) return;
    const { target, theta, phi, dist } = orbit;
    camera.position.set(target.x + dist * Math.sin(phi) * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(target);
  }
  function pan(dx, dy) {
    const k = orbit.dist * 0.0019;
    const s = Math.sin(orbit.theta), c = Math.cos(orbit.theta);
    orbit.target.x += -c * dx * k - s * dy * k;
    orbit.target.z += s * dx * k - c * dy * k;
  }
  const zoom = f => { orbit.dist = Math.min(2200, Math.max(14, orbit.dist * f)); };

  // ---------- Camera: lopen ----------
  const player = { x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: 0, grounded: true };
  const keys = Object.create(null);
  const joyVec = { x: 0, y: 0 };
  // Van bouwen naar lopen: je valt recht naar beneden vanaf de camera (hoogstens 30 m) op wat daar ligt. Boven
  // water of buiten de wereld: het dichtstbijzijnde vrije vak, zoals vroeger.
  function dropPlayer() {
    // recht onder de camera: je valt verticaal naar wat daar ligt (dak, galerij, straat) en kijkt dezelfde kant op
    const x = camera.position.x, z = camera.position.z, d = Math.hypot(x, z); if (d > 440) return false;
    const rc = new THREE.Raycaster(new THREE.Vector3(x, camera.position.y + 1, z), new THREE.Vector3(0, -1, 0));
    const hits = rc.intersectObjects([ground, terrGroup, blocks, ...[...modGroups.values()].map(e => e.group)], true);
    const h = hits.find(x2 => x2.object.visible !== false && !(x2.object.material && x2.object.material.transparent && x2.object.material.opacity < 0.6));   // door glas heen
    const gy = h ? h.point.y : 0, [q, r] = worldToCell(x, z);
    if (baseOf(stackOf(q, r)[0]) === 'water' && gy < 0.5) return false;
    Object.assign(player, { x, z, y: Math.min(camera.position.y, gy + 30), vy: 0, yaw: orbit.theta, pitch: -0.55, grounded: false, dropping: true });
    return true;
  }
  // (vroeger: op de plek waar het midden van het scherm naar keek)
  function spawnPlayer() {
    if (dropPlayer()) return;
    const [cq, cr] = worldToCell(orbit.target.x, orbit.target.z);
    let found = [cq, cr];
    outer: for (let ring = 0; ring <= 22; ring++) {
      for (let dq = -ring; dq <= ring; dq++) for (let dr = -ring; dr <= ring; dr++) {
        if (hexDist(dq, dr) !== ring) continue;
        if (columnTop(cq + dq, cr + dr) <= 0.3 && baseOf(stackOf(cq + dq, cr + dr)[0]) !== 'water') { found = [cq + dq, cr + dr]; break outer; }
      }
    }
    const { x, z } = cellToWorld(found[0], found[1]);
    Object.assign(player, { x, z, y: columnTop(found[0], found[1]), vy: 0, yaw: orbit.theta, pitch: -0.05 });
  }
  function jump() { if (player.grounded && !player.down) { player.vy = 3.2; player.grounded = false; sound.fx('jump', player.x, player.y + 1, player.z); } }  // ca. 0,5 m
  // ---------- Wat je in je handen hebt tijdens het lopen: niets (kijken), het gekozen blok (bouwen) of een hamer ----------
  // De hamer hangt rechtsonder in beeld, aan de camera; een klik zwaait hem en sloopt wat je aankijkt.
  let hand = 'kijken';
  scene.add(camera);
  const handG = new THREE.Group(); handG.position.set(0.36, -0.32, -0.7); camera.add(handG); handG.visible = false;
  const hammer = new THREE.Group(); handG.add(hammer);
  // De arm die het gereedschap vasthoudt: een mouw met een hand, schuin van rechtsonder in beeld
  const armG = new THREE.Group(); handG.add(armG);
  { const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.7, 10), new THREE.MeshLambertMaterial({ color: '#2f6690' })); sl.position.set(0.1, -0.36, 0.2); sl.rotation.set(-0.55, 0, -0.2); armG.add(sl);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), new THREE.MeshLambertMaterial({ color: '#e8b994' })); hd.position.set(0.0, -0.01, 0.0); hd.scale.set(1, 0.9, 1.25); armG.add(hd); armG.userData = { sl, hd, set: false }; }
  { const steel = new THREE.MeshStandardMaterial({ color: '#8d949a', roughness: 0.45, metalness: 0.6 }), wood = new THREE.MeshStandardMaterial({ color: '#8f6440', roughness: 0.85 });
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.36, 10), wood); h.position.y = 0.0; hammer.add(h);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.055), steel); head.position.y = 0.2; hammer.add(head);
    const claw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.04), steel); claw.position.set(-0.075, 0.2, 0); hammer.add(claw);
    hammer.rotation.set(-0.55, 0.35, 0.25); }
  const handBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 6), new THREE.MeshStandardMaterial({ color: '#d9b48f' })); handBlock.rotation.set(-0.35, 0.3, 0.1); handBlock.position.set(-0.02, 0.02, 0); handG.add(handBlock);
  let swing = 0, bob = 0;
  function setHand(h) {
    hand = h; document.body.classList.remove('hand-kijken', 'hand-bouwen', 'hand-hamer'); document.body.classList.add('hand-' + h);
    document.querySelectorAll('#hands button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.hand === h)));
    hammer.visible = h === 'hamer'; handBlock.visible = h === 'bouwen'; handG.visible = h !== 'kijken' && mode === 'walk';
    const pb = document.getElementById('placeBtn'); pb.hidden = h === 'kijken'; pb.textContent = h === 'hamer' ? 'Sloop' : 'Bouw';
    ghost.visible = false; { const al = document.getElementById('aimLbl'); if (al) al.hidden = true; const ch = document.querySelector('.crosshair'); if (ch) ch.classList.remove('erase'); }
    try { localStorage.setItem('hexstad-hand', h); } catch (e) { /* geen opslag */ }
  }
  function swingHand() { swing = 1; }
  function updateHand(dt, moving) {
    if (!handG.visible) return;
    if (swing > 0) swing = Math.max(0, swing - dt * 4.5);
    bob += dt * (moving ? 7 : 2);
    const sw = Math.sin(swing * Math.PI);   // 0 → 1 → 0: naar voren slaan
    handG.position.set(0.36 + Math.sin(bob) * 0.006, -0.32 + Math.abs(Math.cos(bob)) * 0.01 - sw * 0.08, -0.7 - sw * 0.12);
    handG.rotation.set(-sw * 1.1, sw * 0.25, 0);
    if (!armG.userData.set && people.pbCols && people.pbCols()) { const c = people.pbCols(); armG.userData.sl.material.color.set(c.shirt); armG.userData.hd.material.color.set(c.skin); armG.userData.set = true; }
    if (hand === 'bouwen') { const c = (TYPES[toolBase(tool)] && TOOL_COL[toolBase(tool)]) || '#d9b48f'; handBlock.material.color.set(c); }
  }
  const TOOL_COL = { woning: '#d9b48f', kantoor: '#8fa6bd', dak: '#b5543c', park: '#5f9a4a', water: '#3a7ca5', meer: '#3f86b3', pad: '#9b5a45', fietspad: '#7c8a91', looppad: '#cfc6b0', trap: '#bdb5a5', trappad: '#bdb5a5', helling: '#bdb5a5', hofhelling: '#b9ad96', kuil: '#5f9a4a', heuvel: '#5f9a4a', randpad: '#cfc6b0', module: '#f2b233', gum: '#e0573e' };
  document.querySelectorAll('#hands button').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); setHand(b.dataset.hand); }));
  function updateWalk(dt) {
    if (player.down) { if (people.pbCamera(camera, dt)) return; player.down = false; }   // aangereden: de camera zit in het hoofd van het liggende lichaam
    let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joyVec.x;
    let mz = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - joyVec.y;
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    const speed = (keys.ShiftLeft || keys.ShiftRight || Math.hypot(joyVec.x, joyVec.y) > 0.95) ? 5.5 : 2.4;  // m/s: stevig wandelen / hardlopen
    const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
    const vx = (cy * mx - sy * mz) * speed, vz = (-sy * mx - cy * mz) * speed;
    const stuck = blockedAt(player.x, player.z, player.y);   // vastgebouwd? dan mag je eruit lopen
    const running = speed > 3, pb = (x, z) => (!running && !people.blocks(player.x, player.z, player.y) && people.blocks(x, z, player.y)) || (!cars.blocks(player.x, player.z, player.y) && cars.blocks(x, z, player.y));
    const nx = player.x + vx * dt; if (stuck || !(blockedAt(nx, player.z, player.y) || pb(nx, player.z))) player.x = nx;
    const nz = player.z + vz * dt; if (stuck || !(blockedAt(player.x, nz, player.y) || pb(player.x, nz))) player.z = nz;
    const d = Math.hypot(player.x, player.z); if (d > 450) { player.x *= 450 / d; player.z *= 450 / d; }   // de loopwereld: tot ruim buiten de ringweg
    const floor = floorAt(player.x, player.z, player.y);
    player.vy -= 9.81 * dt; player.y += player.vy * dt;
    if (player.y <= floor) { if (player.dropping) { player.dropping = false; player.landT = 0.35; sound.walked(1.2, floor < 0.02, true); } player.y = floor; player.vy = 0; player.grounded = true; } else player.grounded = false;
    if (player.landT > 0) { player.landT = Math.max(0, player.landT - dt); player.pitch += (-0.05 - player.pitch) * Math.min(1, dt * 5); }   // na de landing rustig weer vooruit kijken
    if (player.grounded) sound.walked(Math.hypot(vx, vz) * dt, floor < 0.02, speed > 3);
    updateHand(dt, Math.hypot(vx, vz) > 0.1);
    camera.position.set(player.x, player.y + EYE, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
  }

  // ---------- Modus ----------
  let mode = 'build';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (coarse) document.body.classList.add('coarse');
  const walkUI = document.getElementById('walkUI');
  const paletteEl = document.getElementById('palette');
  const menuBtn = document.getElementById('menuBtn');
  const modeLbl = document.getElementById('modeLbl');
  document.getElementById('walkHint').textContent = coarse
    ? 'Linkerduim lopen · rechterduim kijken · kies linksonder bouwen of hamer en tik op de knop'
    : 'Klik om de muis te vangen · WASD lopen · Q: kijken, bouwen of hamer · 1–9 of scrollwiel: blok uit de snelbalk · Tab: alle blokken';

  function setMode(m) {
    if (flyCam.on) flyStop();
    if (typeof vecChainEnd === 'function') vecChainEnd(true);
    if (mode !== m && typeof sound !== 'undefined') sound.fx('whoosh');
    mode = m;
    if (typeof people !== 'undefined') people.pbReset();
    const walking = m === 'walk';
    document.body.classList.toggle('walk', walking);
    walkUI.hidden = !walking;
    modeLbl.textContent = walking ? 'Bouwen' : 'Lopen';
    gridLines.visible = !walking && gridOn; ghost.visible = false; ghostArrow.visible = false; ghostEdges.visible = false; vecGhost.visible = false;
    toastEl.classList.add('fade');
    camera.fov = walking ? 72 : 45; camera.near = walking ? 0.1 : 1.0; camera.updateProjectionMatrix();
    if (walking) {
      spawnPlayer(); camera.rotation.order = 'YXZ'; let h0 = 'kijken'; try { h0 = localStorage.getItem('hexstad-hand') || 'kijken'; } catch (e) { /* geen opslag */ } setHand(['kijken', 'bouwen', 'hamer'].includes(h0) ? h0 : 'kijken');
      const hint = document.getElementById('walkHint');
      hint.hidden = false; clearTimeout(setMode.hintT); setMode.hintT = setTimeout(() => { hint.hidden = true; }, 7000);
    }
    else {
      handG.visible = false; document.body.classList.remove('hand-kijken', 'hand-bouwen', 'hand-hamer'); { const al = document.getElementById('aimLbl'); if (al) al.hidden = true; }
      if (document.pointerLockElement) document.exitPointerLock();
      applyOrbit();
    }
    resetPointers();
  }
  document.getElementById('modeBtn').addEventListener('click', () => setMode(mode === 'build' ? 'walk' : 'build'));

  // ---------- Geluid: atmosfeer, live gemaakt met Web Audio ----------
  // Wind (sterker op hoogte), vogels bij groen, klotsend water bij grachten, stadsruis bij straten, voetstappen.
  function indoorsAt(x, z, y) {   // sta je in een woning of kantoor?
    const [q, r] = worldToCell(x, z);
    let h = gH(q, r);
    for (const t of stackOf(q, r)) { const top = h + TY(t).h; if (y >= h - 0.1 && y < top - 0.5) return isBuilding(t); h = top; }
    return false;
  }
  const sound = (() => {
    let ctx = null, master = null, on = false;
    let birdBus, stepBus, noiseBuf, brownBuf, birdBed = null, indoorF, out;
    let rainBed = null, rainLow = null, windBed = null;
    let nextMix = 0, stepDist = 0, klapBuf = null, lastKlap = 0, gruntBuf = null, lastGrunt = 0, scrBuf = null, lastScr = 0, scrLive = 0;
    // stukken in grunts.mp3 (iemand die kreunt als hij geraakt wordt): [begin, duur] in seconden
    const GRUNT = [[0.47, 0.35], [1.51, 0.31], [3.28, 0.3], [4.55, 0.32], [5.59, 0.35], [6.87, 0.42], [8.06, 0.51], [9.41, 0.36], [11.03, 0.34], [12.13, 0.37], [13.32, 0.39], [14.49, 0.39], [15.79, 0.43], [17.09, 0.31], [18.12, 0.32], [19.14, 0.33], [20.31, 0.35], [21.45, 0.37], [22.54, 0.36], [23.62, 0.31], [24.79, 0.5], [25.87, 0.39], [27.16, 0.37], [28.23, 0.37], [30.14, 0.39], [31.12, 0.68], [32.4, 0.59], [33.82, 0.69], [35.29, 0.36], [36.48, 0.69], [37.87, 0.46], [39.05, 0.45], [40.31, 0.46]];
    // stukken in schreeuw.mp3 (totale chaos): paniek, korte kreten, één lange gruwelkreet en de kreet bij bloed
    const SCR = { paniek: [[0, 2.05], [2.3, 2.35], [4.9, 1.9], [7.05, 2.45], [9.75, 2.75], [12.75, 2.6]], kort: [[15.6, 0.5], [16.35, 0.32], [16.92, 0.45]], horror: [[17.62, 5.08]], bloed: [[22.958, 1.69]] };
    // stukken in klap.mp3: [begin, duur] in seconden
    const KLAP = { hard: [[0, 1.0], [1.08, 0.89], [2.05, 2.29], [4.42, 1.89], [6.39, 0.85], [7.32, 0.79], [8.19, 0.79], [9.06, 0.72]],
      light: [[9.86, 0.63], [10.57, 0.69], [11.34, 0.66], [12.08, 0.57], [12.73, 0.67], [13.48, 0.65]] };
    const btn = document.getElementById('soundBtn'), waves = document.getElementById('soundWaves');
    function init() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0;
      // alles loopt door één filter: binnen in een gebouw klinkt de buitenwereld gedempt
      indoorF = ctx.createBiquadFilter(); indoorF.type = 'lowpass'; indoorF.frequency.value = 18000; indoorF.Q.value = 0.5;
      out = ctx.createGain(); out.gain.value = 1;
      master.connect(indoorF); indoorF.connect(out); out.connect(ctx.destination);
      // vogelopname (ochtendkoor) als naadloze lus; wordt luider bij groen
      fetch('vogels.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then(buf => {
          const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
          src.loopStart = 0.03; src.loopEnd = buf.duration - 0.03;   // mp3-opvulling aan begin en eind overslaan
          birdBed = ctx.createGain(); birdBed.gain.value = 0;
          src.connect(birdBed); birdBed.connect(master);
          src.start(0, Math.random() * (buf.duration - 1));   // elke keer ergens anders in de opname beginnen
        }).catch(() => {});
      // aanrijdingen: opnames van iemand die op een motorkap klapt (harde en zachtere varianten)
      fetch('klap.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then(buf => { klapBuf = buf; }).catch(() => {});
      fetch('schreeuw.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then(buf => { scrBuf = buf; }).catch(() => {});
      fetch('grunts.mp3').then(r => r.ok ? r.arrayBuffer() : Promise.reject())
        .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then(buf => { gruntBuf = buf; }).catch(() => {});
      const len = ctx.sampleRate * 3;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      brownBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const w = noiseBuf.getChannelData(0), br = brownBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { w[i] = Math.random() * 2 - 1; last = (last + 0.02 * w[i]) / 1.02; br[i] = last * 3.5; }
      birdBus = ctx.createGain(); birdBus.gain.value = 0.5; birdBus.connect(master);
      // weer: ruis door filters. Regen = gesis (hoog), storm = aanzwellende wind (laag)
      const bed = (buf, type, f, q) => { const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = buf; src.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(master); src.start(0, Math.random() * 2); return { g, fl }; };
      rainBed = bed(noiseBuf, 'bandpass', 2600, 0.35); rainLow = bed(brownBuf, 'lowpass', 900, 0.5); windBed = bed(brownBuf, 'bandpass', 320, 0.8);
      stepBus = ctx.createGain(); stepBus.gain.value = 0.5; stepBus.connect(master);
    }
    // ---------- Autogeluid ----------
    // Een elektrische auto zoemt: twee zachte tonen die met de snelheid omhoog gaan (zoals het verplichte
    // waarschuwingsgeluid van stille auto's), plus bandengeruis. De 4 auto's het dichtst bij krijgen een stem;
    // die komt uit de goede richting en wordt zachter met de afstand. Naderen klinkt iets hoger (doppler).
    const voices = [];
    function makeVoice() {
      const v = { car: null, lastD: null };
      v.panner = ctx.createPanner();
      Object.assign(v.panner, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 4, rolloffFactor: 1.3, maxDistance: 400 });
      v.gain = ctx.createGain(); v.gain.gain.value = 0;
      v.gain.connect(v.panner); v.panner.connect(master);
      // zoem: zachte zaagtand door een laagdoorlaatfilter, met een zuivere toon een kwint hoger
      v.o1 = ctx.createOscillator(); v.o1.type = 'sawtooth'; v.o1.frequency.value = 120;
      v.o2 = ctx.createOscillator(); v.o2.type = 'sine'; v.o2.frequency.value = 180;
      v.lp = ctx.createBiquadFilter(); v.lp.type = 'lowpass'; v.lp.frequency.value = 700; v.lp.Q.value = 3;
      v.g1 = ctx.createGain(); v.g1.gain.value = 0.05; v.g2 = ctx.createGain(); v.g2.gain.value = 0.07;
      v.o1.connect(v.lp); v.lp.connect(v.g1); v.g1.connect(v.gain); v.o2.connect(v.g2); v.g2.connect(v.gain);
      // bandengeruis over het asfalt
      v.noise = ctx.createBufferSource(); v.noise.buffer = brownBuf; v.noise.loop = true;
      v.nf = ctx.createBiquadFilter(); v.nf.type = 'bandpass'; v.nf.frequency.value = 450; v.nf.Q.value = 0.5;
      v.ng = ctx.createGain(); v.ng.gain.value = 0;
      v.noise.connect(v.nf); v.nf.connect(v.ng); v.ng.connect(v.gain);
      v.o1.start(); v.o2.start(); v.noise.start(0, Math.random() * 2);
      return v;
    }
    function placeAt(node, x, y, z) {
      if (node.positionX) { node.positionX.value = x; node.positionY.value = y; node.positionZ.value = z; } else node.setPosition(x, y, z);
    }
    const camDir = new THREE.Vector3();
    function updateCars(dt) {
      if (!voices.length) for (let i = 0; i < 4; i++) voices.push(makeVoice());
      const L = ctx.listener, cp = camera.position;
      camera.getWorldDirection(camDir);
      if (L.positionX) { L.positionX.value = cp.x; L.positionY.value = cp.y; L.positionZ.value = cp.z; L.forwardX.value = camDir.x; L.forwardY.value = camDir.y; L.forwardZ.value = camDir.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
      else { L.setPosition(cp.x, cp.y, cp.z); L.setOrientation(camDir.x, camDir.y, camDir.z, 0, 1, 0); }
      const near = cars.list.map(c => [c, Math.hypot(c.x - cp.x, 0.6 - cp.y, c.z - cp.z)]).filter(([, d]) => d < 90).sort((a, b) => a[1] - b[1]).slice(0, voices.length).map(([c]) => c);
      for (const v of voices) if (v.car && !near.includes(v.car)) { v.car = null; v.lastD = null; }
      for (const c of near) if (!voices.some(v => v.car === c)) { const free = voices.find(v => !v.car); if (free) { free.car = c; free.lastD = null; } }
      const tc = ctx.currentTime;
      for (const v of voices) {
        if (!v.car) { v.gain.gain.setTargetAtTime(0, tc, 0.3); continue; }
        const c = v.car, d = Math.hypot(c.x - cp.x, 0.6 - cp.y, c.z - cp.z);
        const radial = v.lastD === null ? 0 : (d - v.lastD) / Math.max(dt, 1e-3);   // < 0: komt dichterbij
        v.lastD = d;
        const dop = 343 / (343 + Math.max(-40, Math.min(40, radial)));
        placeAt(v.panner, c.x, 0.6, c.z);
        const sp = c.v, base = (95 + sp * 22) * dop;
        v.o1.frequency.setTargetAtTime(base, tc, 0.08);
        v.o2.frequency.setTargetAtTime(base * 1.5, tc, 0.08);
        v.lp.frequency.setTargetAtTime(500 + sp * 120, tc, 0.1);
        // zoem is het duidelijkst bij lage snelheid; bandengeruis neemt het over als de auto harder rijdt
        v.g1.gain.setTargetAtTime(0.035 + 0.02 * Math.min(1, sp / 8), tc, 0.15);
        v.g2.gain.setTargetAtTime(sp < 0.3 ? 0.02 : 0.06 * (1 - 0.4 * Math.min(1, sp / 8)), tc, 0.15);
        v.ng.gain.setTargetAtTime(Math.min(1, sp / 8) * 0.55, tc, 0.15);
        v.gain.gain.setTargetAtTime(sp < 0.05 ? 0.25 : 0.6, tc, 0.2);
      }
    }
    // Twee korte, heldere toontjes: "pas op" (als een auto op jou staat te wachten)
    function chime(x, z) {
      const t0 = ctx.currentTime, p = ctx.createPanner();
      Object.assign(p, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 4, rolloffFactor: 1.3 });
      placeAt(p, x, 0.8, z); p.connect(master);
      [[880, 0], [1318.5, 0.16]].forEach(([f, dtt]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + dtt); g.gain.exponentialRampToValueAtTime(0.18, t0 + dtt + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dtt + 0.28);
        o.connect(g); g.connect(p); o.start(t0 + dtt); o.stop(t0 + dtt + 0.3);
      });
    }
    // Claxon: twee lage, lichtvals tegen elkaar in gestemde tonen (inhalen in de roekeloze stand)
    let lastHorn = 0;
    function horn(x, z) {
      if (ctx.currentTime - lastHorn < 0.8) return; lastHorn = ctx.currentTime;
      const t0 = ctx.currentTime, p = ctx.createPanner(), f = ctx.createBiquadFilter(), len = 0.35 + Math.random() * 0.3;
      Object.assign(p, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 5, rolloffFactor: 1.4 });
      placeAt(p, x, 0.8, z); f.type = 'lowpass'; f.frequency.value = 1800; f.connect(p); p.connect(master);
      for (const fr of [392, 466]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = fr * (0.97 + Math.random() * 0.06);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02); g.gain.setValueAtTime(0.07, t0 + len); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len + 0.06);
        o.connect(g); g.connect(f); o.start(t0); o.stop(t0 + len + 0.08);
      }
    }
    // ---------- Korte geluidseffecten (allemaal gesynthetiseerd, geen bestanden) ----------
    // fx(naam, x, y, z, sterkte): zonder plaats klinkt het 'in je oor' (bouwen, knoppen), met plaats ruimtelijk en zachter op afstand.
    const fxLast = {};
    function fxOut(x, y, z, ref = 5, roll = 1.2) {
      if (x === undefined) { const g = ctx.createGain(); g.gain.value = 1; g.connect(master); return g; }
      const p = ctx.createPanner(); Object.assign(p, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: ref, rolloffFactor: roll }); placeAt(p, x, y, z); p.connect(master); return p;
    }
    function fxTone(dest, type, f0, f1, t0, a, peak, d, det = 0) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + a + d); o.detune.value = det;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + a + d + 0.05); return o;
    }
    function fxNoise(dest, brown, ftype, f0, f1, q, t0, a, peak, d) {
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = brown ? brownBuf : noiseBuf;
      f.type = ftype; f.frequency.setValueAtTime(f0, t0); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + a + d); f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
      src.connect(f); f.connect(g); g.connect(dest); src.start(t0, Math.random() * 2, a + d + 0.05);
    }
    const HEX_NOTES = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];   // zestonige toonladder (zonder halve tonen): klinkt altijd vriendelijk
    function fx(name, x, y, z, k = 1) {
      const t0 = ctx.currentTime, now = performance.now();
      const gap = { place: 60, remove: 80, click: 40, deny: 250, squeal: 120, crunch: 90, boom: 400, door: 150, cricket: 0, jump: 150, gen: 600, whoosh: 200, undo: 120, rotate: 60, splash: 200, roar: 3000, coin: 300, beep: 600, toot: 2500 }[name] ?? 80;
      if (now - (fxLast[name] || 0) < gap) return; fxLast[name] = now;
      const r = 0.94 + Math.random() * 0.12;
      if (name === 'place') {   // houten 'tok' met een helder tikje erbovenop
        const d = fxOut(); fxTone(d, 'sine', 210 * r, 120 * r, t0, 0.004, 0.32, 0.13); fxTone(d, 'triangle', 640 * r, 420 * r, t0, 0.002, 0.08, 0.06); fxNoise(d, false, 'bandpass', 2600, 0, 1.5, t0, 0.001, 0.12, 0.03);
      } else if (name === 'rotate') { const d = fxOut(); fxTone(d, 'triangle', 900 * r, 1200 * r, t0, 0.002, 0.07, 0.05); fxNoise(d, false, 'highpass', 3000, 0, 0.7, t0, 0.001, 0.05, 0.025);
      } else if (name === 'remove') {   // brokkelend afbreken: lage plof en wat gruis
        const d = fxOut(); fxNoise(d, true, 'lowpass', 700, 180, 0.8, t0, 0.005, 0.45, 0.28); fxTone(d, 'sine', 120 * r, 55, t0, 0.003, 0.25, 0.2);
        for (let i = 0; i < 5; i++) fxNoise(d, false, 'bandpass', 2200 + Math.random() * 2500, 0, 3, t0 + 0.03 + i * (0.025 + Math.random() * 0.03), 0.002, 0.07, 0.04);
      } else if (name === 'deny') { const d = fxOut(); fxTone(d, 'square', 170, 0, t0, 0.005, 0.05, 0.08); fxTone(d, 'square', 130, 0, t0 + 0.11, 0.005, 0.05, 0.1);
      } else if (name === 'click') { const d = fxOut(); fxTone(d, 'sine', 1800 * r, 1500, t0, 0.001, 0.05, 0.03);
      } else if (name === 'undo') { const d = fxOut(); fxNoise(d, false, 'bandpass', 2600, 500, 2, t0, 0.02, 0.12, 0.22); fxTone(d, 'sine', 660, 330, t0, 0.01, 0.06, 0.2);
      } else if (name === 'whoosh') { const d = fxOut(); fxNoise(d, false, 'bandpass', 350, 1900, 1.4, t0, 0.12, 0.16, 0.26);
      } else if (name === 'gen') {   // nieuwe stad: oplopend akkoordje op de zestonige ladder plus een zachte zwiep
        const d = fxOut(); fxNoise(d, false, 'bandpass', 300, 2400, 1.2, t0, 0.25, 0.08, 0.4);
        [0, 2, 3, 5, 7].forEach((n, i) => fxTone(d, 'triangle', HEX_NOTES[n], 0, t0 + 0.08 + i * 0.07, 0.008, 0.09, 0.45));
      } else if (name === 'coin') { const d = fxOut(); fxTone(d, 'triangle', HEX_NOTES[4] * 2, 0, t0, 0.005, 0.07, 0.12); fxTone(d, 'triangle', HEX_NOTES[7] * 2, 0, t0 + 0.08, 0.005, 0.07, 0.25);
      } else if (name === 'jump') { const d = fxOut(x, y, z, 3); fxNoise(d, false, 'bandpass', 700, 1500, 1.2, t0, 0.02, 0.07 * k, 0.12);
      } else if (name === 'door') {   // deur: kort gekraak en een klik van de klink
        const d = fxOut(x, y, z, 3, 1.6), o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(95 * r, t0); o.frequency.linearRampToValueAtTime(150 * r, t0 + 0.4); lfo.frequency.value = 23; lg.gain.value = 18; lfo.connect(lg); lg.connect(o.frequency);
        f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 6; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
        o.connect(f); f.connect(g); g.connect(d); o.start(t0); lfo.start(t0); o.stop(t0 + 0.45); lfo.stop(t0 + 0.45);
        fxNoise(d, false, 'bandpass', 3200, 0, 4, t0, 0.001, 0.08, 0.03);
      } else if (name === 'squeal') {   // piepende banden
        const d = fxOut(x, y, z, 8, 1.1), len = 0.35 + 0.4 * k;
        fxNoise(d, false, 'bandpass', 1900 * r, 1500 * r, 14, t0, 0.04, 0.18 * k, len);
        const o = fxTone(d, 'sine', 1150 * r, 980 * r, t0, 0.05, 0.035 * k, len); o.detune.setValueAtTime(0, t0); o.detune.linearRampToValueAtTime(-60, t0 + len);
      } else if (name === 'crunch') {   // auto's botsen: dreun, scheurend metaal en wat rinkelend glas
        const d = fxOut(x, y, z, 7, 1.1), v = Math.min(1, 0.3 + k);
        fxNoise(d, true, 'lowpass', 500, 120, 0.8, t0, 0.004, 0.6 * v, 0.35); fxNoise(d, false, 'highpass', 1400, 0, 0.7, t0, 0.003, 0.35 * v, 0.22);
        for (const f of [1320, 2210, 3480, 4950]) fxNoise(d, false, 'bandpass', f * r, f * r * 0.92, 28, t0 + Math.random() * 0.03, 0.003, 0.22 * v, 0.5 + Math.random() * 0.3);
        if (k > 0.5) for (let i = 0; i < 6; i++) fxTone(d, 'sine', 3500 + Math.random() * 3000, 0, t0 + 0.08 + Math.random() * 0.25, 0.001, 0.03, 0.12);
      } else if (name === 'boom') {   // ontploffing: diepe dreun, vuurstoot en rinkelend metaal
        const d = fxOut(x, y, z, 14, 0.9);
        fxNoise(d, true, 'lowpass', 900, 70, 0.7, t0, 0.006, 0.9, 0.9); fxNoise(d, false, 'bandpass', 600, 180, 0.8, t0, 0.01, 0.4, 0.5); fxTone(d, 'sine', 90, 34, t0, 0.005, 0.7, 0.7);
        for (let i = 0; i < 5; i++) fxNoise(d, false, 'bandpass', 1800 + Math.random() * 2500, 0, 4, t0 + 0.12 + i * 0.06, 0.003, 0.09, 0.1);
      } else if (name === 'toot') {   // treinhoorn: twee tonen tegelijk, kort en dan lang
        const d = fxOut(x, y, z, 30, 1); for (const [f0, t1, dd] of [[311, 0, 0.35], [370, 0, 0.35], [311, 0.5, 0.9], [370, 0.5, 0.9]]) fxTone(d, 'sawtooth', f0, 0, t0 + t1, 0.03, 0.05, dd);
      } else if (name === 'beep') { const d = fxOut(x, y, z, 4, 1.4); fxTone(d, 'square', 1040, 0, t0, 0.005, 0.04, 0.16);
      } else if (name === 'cricket') {   // krekel: drie snelle tjirpjes
        const d = fxOut(x, y, z, 4, 1.4), f = 4300 + Math.random() * 600; for (let i = 0; i < 3; i++) fxTone(d, 'sine', f, 0, t0 + i * 0.055, 0.004, 0.025 * k, 0.03);
      } else if (name === 'splash') { const d = fxOut(x, y, z, 4); fxNoise(d, false, 'bandpass', 1400, 500, 0.8, t0, 0.01, 0.3 * k, 0.5); fxNoise(d, true, 'lowpass', 400, 0, 0.7, t0, 0.005, 0.25 * k, 0.2);
      } else if (name === 'roar') {   // brul (de Hulk)
        const d = fxOut(x, y, z, 12, 0.9), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700; f.connect(d);
        for (const [fr, det] of [[68, 0], [71, 12], [102, -8]]) { const o = fxTone(f, 'sawtooth', fr, fr * 0.8, t0, 0.18, 0.18, 1.1, det); }
        fxNoise(f, true, 'lowpass', 900, 300, 0.8, t0, 0.15, 0.35, 1.1);
      }
    }
    function step(grass) {   // voetstap: kort ruisje, dof op gras, harder op klinkers
      const t0 = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = grass ? 380 : 1100 + Math.random() * 300; f.Q.value = grass ? 0.8 : 1.4;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(grass ? 0.25 : 0.35, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (grass ? 0.11 : 0.07));
      src.connect(f); f.connect(g); g.connect(stepBus);
      src.start(t0, Math.random() * 2, 0.15);
    }
    function setOn(v) {
      on = v;
      btn.setAttribute('aria-pressed', String(on)); waves.setAttribute('opacity', on ? '1' : '0.35');
      try { localStorage.setItem('hexstad-geluid', on ? '1' : '0'); } catch (e) {}
      if (on) {
        if (!ctx) init();
        ctx.resume();
        master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.4);
      } else if (ctx) {
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      }
    }
    btn.addEventListener('click', () => setOn(!on));
    // Stond het geluid de vorige keer aan? Dan gaat het aan bij de eerste tik (browsers eisen een tik)
    let wanted = false; try { wanted = localStorage.getItem('hexstad-geluid') === '1'; } catch (e) {}
    if (wanted) window.addEventListener('pointerdown', function first(e) { window.removeEventListener('pointerdown', first); if (!on && e.target !== btn) setOn(true); });
    document.addEventListener('visibilitychange', () => { if (ctx) document.hidden ? ctx.suspend() : (on && ctx.resume()); });
    return {
      // elke ~0,4 s: wat ligt er rond de luisteraar?
      update(dt) {
        if (!on || !ctx) return;
        updateCars(dt);
        const now = performance.now();
        if (now > nextMix) {
          nextMix = now + 400;
          const lx = mode === 'walk' ? player.x : orbit.target.x, lz = mode === 'walk' ? player.z : orbit.target.z;
          const height = mode === 'walk' ? player.y : Math.min(60, orbit.dist * 0.25);
          const [cq, cr] = worldToCell(lx, lz);
          let green = 0;   // parken en hofjes in de buurt: voller vogelkoor
          for (let dq = -2; dq <= 2; dq++) for (let dr = -2; dr <= 2; dr++) {
            if (hexDist(dq, dr) > 2) continue;
            for (const t of stackOf(cq + dq, cr + dr)) { const b = baseOf(t); if (b === 'park' || b === 'hof' || b === 'hofhelling') green++; }
          }
          for (const I of cells.inst || []) if (I.m && hexDist(I.q - cq, I.r - cr) <= 2 && /^(Park|Bos|Tuin|Grasveld)/.test(I.m.name || '')) green += 2;   // groene modules tellen ook
          // 's nachts: krekels in het groen, op willekeurige plekjes om je heen
          if (nightK > 0.45 && Math.random() < 0.5 * nightK) { const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 14; fx('cricket', lx + Math.cos(a) * d, 0.3, lz + Math.sin(a) * d, nightK * (0.4 + Math.min(1, green / 5) * 0.8) * (1 - Math.min(1, WXK.rain))); }
          const far = mode === 'walk' ? 1 : Math.max(0.35, 1 - orbit.dist / 500);
          const tc = ctx.currentTime;
          // vogelkoor: altijd zacht aanwezig, voller bij parken en hofjes, iets minder hoog in de lucht
          if (birdBed) birdBed.gain.setTargetAtTime((0.25 + Math.min(1, green / 5) * 0.75) * far * (height > 25 ? 0.6 : 1) * (1 - 0.92 * nightK) * (1 - 0.85 * Math.min(1, WXK.rain + WXK.snow * 0.6)), tc, 1.5);
          // regen en storm: overal om je heen, iets zachter hoog in de lucht
          if (rainBed) { const r = Math.min(1.4, WXK.rain), hi = mode === 'walk' ? 1 : Math.max(0.45, 1 - orbit.dist / 600); rainBed.g.gain.setTargetAtTime(r * 0.16 * hi, tc, 0.8); rainLow.g.gain.setTargetAtTime(r * 0.22 * hi, tc, 0.8); windBed.g.gain.setTargetAtTime(Math.min(1, WXK.storm || 0) * 0.35 + WXK.snow * 0.06, tc, 1.2); windBed.fl.frequency.setTargetAtTime(260 + Math.random() * 160, tc, 2); }
          // binnen? dan klinkt alles van buiten dof en zachter
          const inside = mode === 'walk' && indoorsAt(player.x, player.z, player.y);
          indoorF.frequency.setTargetAtTime(inside ? 650 : 18000, tc, 0.25);
          out.gain.setTargetAtTime(inside ? 0.55 : 1, tc, 0.25);
        }
      },
      // Plof bij een val; plons in het water. Zachter naarmate het verder weg is.
      impact(strength, x, y, z, wet) {
        if (!on || !ctx) return;
        const dist = Math.hypot(camera.position.x - x, camera.position.y - y, camera.position.z - z);
        const vol = strength * 0.5 / (1 + dist / 12);
        if (vol < 0.01) return;
        const t0 = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        src.buffer = wet ? noiseBuf : brownBuf; f.type = wet ? 'bandpass' : 'lowpass'; f.frequency.value = wet ? 900 : 260; f.Q.value = wet ? 0.7 : 0.8;
        const len = wet ? 0.6 : 0.16;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        src.connect(f); f.connect(g); g.connect(master); src.start(t0, Math.random() * 2, len + 0.05);
      },
      chime(x, z) { if (on && ctx) chime(x, z); },
      horn(x, z) { if (on && ctx) horn(x, z); },
      fx(name, x, y, z, k) { if (on && ctx && noiseBuf) fx(name, x, y, z, k); },
      // Stemmen: brabbeltaal (zoals in Animal Crossing). Elke lettergreep is een korte toon door twee formantfilters
      // (klinker) met soms een ruisje ervoor (medeklinker); de toonhoogte zweeft per persoon en per zin. 'hi' = een kort
      // groetje dat omhoog gaat; anders een zin van dur seconden met woordpauzes. Zachter naarmate het verder weg is.
      talk(x, y, z, dur, pitch = 1, mood = 'chat') {
        if (!on || !ctx) return 0;
        const dist = Math.hypot(camera.position.x - x, camera.position.y - y, camera.position.z - z);
        const vol = 0.22 / (1 + dist / 7); if (vol < 0.012 || dist > 28) return 0;
        const t0 = ctx.currentTime + 0.02, base = 150 * pitch, g = ctx.createGain(); g.gain.value = 1; g.connect(master);
        let t = 0, n = 0, word = 2 + Math.floor(Math.random() * 4), drift = 1;
        const syl = (at, len, f0, strong) => {
          const o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), e = ctx.createGain();
          o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 0.96, at); o.frequency.linearRampToValueAtTime(f0 * (strong ? 1.06 : 1.0), at + len * 0.6);
          const v = [[600, 1100], [400, 2000], [300, 2400], [500, 900], [350, 700]][Math.floor(Math.random() * 5)];   // klinkers a, e, i, o, oe
          f1.type = 'bandpass'; f1.frequency.value = v[0]; f1.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = v[1]; f2.Q.value = 6;
          e.gain.setValueAtTime(0.0001, at); e.gain.exponentialRampToValueAtTime(vol * (strong ? 1 : 0.7), at + 0.02); e.gain.setValueAtTime(vol * (strong ? 1 : 0.7), at + len * 0.6); e.gain.exponentialRampToValueAtTime(0.0001, at + len);
          o.connect(f1); o.connect(f2); f1.connect(e); f2.connect(e); e.connect(g); o.start(at); o.stop(at + len + 0.02);
          if (Math.random() < 0.6) {   // medeklinker: een kort ruisje vooraf
            const src = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
            src.buffer = noiseBuf; nf.type = 'bandpass'; nf.frequency.value = 1800 + Math.random() * 3000; nf.Q.value = 1.2;
            ng.gain.setValueAtTime(vol * 0.5, at - 0.025); ng.gain.exponentialRampToValueAtTime(0.0001, at + 0.02);
            src.connect(nf); nf.connect(ng); ng.connect(g); src.start(at - 0.025, Math.random() * 2, 0.06);
          }
        };
        if (mood === 'hi') { syl(t0, 0.13, base * 1.1, true); syl(t0 + 0.14, 0.2, base * 1.45, true); return 0.4; }
        while (t < dur) {
          const len = 0.08 + Math.random() * 0.1, last = (n + 1) % word === 0;
          syl(t0 + t, len, base * drift * (0.9 + Math.random() * 0.3) * (last && Math.random() < 0.5 ? 1.25 : 1), n % word === 0);
          t += len + 0.02; n++;
          if (last) { t += 0.08 + Math.random() * 0.2; word = 2 + Math.floor(Math.random() * 4); drift = 0.9 + Math.random() * 0.25; }
        }
        return t;
      },
      // Donder: een lage rommel na de flits (later en zachter als het verder weg is)
      thunder(delay, vol) {
        if (!on || !ctx) return;
        const t0 = ctx.currentTime + delay, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), len = 3 + Math.random() * 2.5;
        src.buffer = brownBuf; src.loop = true; f.type = 'lowpass'; f.frequency.value = 110 + vol * 160; f.Q.value = 0.7;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.9 * vol, t0 + 0.08 + (1 - vol) * 0.4);
        g.gain.setTargetAtTime(0.5 * vol, t0 + 0.6, 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        src.connect(f); f.connect(g); g.connect(master); src.start(t0, Math.random() * 2); src.stop(t0 + len + 0.1);
      },
      // Aanrijding: een opname van een klap op de motorkap, uit de goede richting, harder bij meer snelheid.
      // Twee auto's die op elkaar klappen: dezelfde opname, lager afgespeeld.
      carHit(strength, x, y, z, cars2) {
        if (!on || !ctx || !klapBuf) return;
        const now = ctx.currentTime;
        if (now - lastKlap < 0.12) return;   // niet tien keer tegelijk
        lastKlap = now;
        const list = strength > 0.45 ? KLAP.hard : KLAP.light, [off, dur] = list[Math.floor(Math.random() * list.length)];
        const src = ctx.createBufferSource(), g = ctx.createGain(), pn = ctx.createPanner();
        Object.assign(pn, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 5, rolloffFactor: 1.2, maxDistance: 300 });
        placeAt(pn, x, y, z);
        src.buffer = klapBuf;
        src.playbackRate.value = (cars2 ? 0.72 : 1) * (0.92 + Math.random() * 0.16);
        g.gain.value = (cars2 ? 0.9 : 0.75) * (0.35 + 0.65 * Math.min(1, strength));
        src.connect(g); g.connect(pn); pn.connect(master);
        src.start(now, off, dur);
      },
      // Een kreun van iemand die geraakt wordt (door een auto of door een speler die tegen hem aan loopt), vlak na de klap.
      // wie: 'm' (man), 'v' (vrouw: hoger), 'k' (kind: nog hoger en korter), 'o' (oudere: lager en langzamer)
      grunt(x, y, z, strength, who) {
        if (!on || !ctx || !gruntBuf) return;
        const now = ctx.currentTime;
        if (now - lastGrunt < 0.25) return;   // niet alle omgevallen mensen tegelijk
        lastGrunt = now;
        const [off, dur] = GRUNT[Math.floor(Math.random() * GRUNT.length)];
        const src = ctx.createBufferSource(), g = ctx.createGain(), pn = ctx.createPanner();
        Object.assign(pn, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 4, rolloffFactor: 1.3, maxDistance: 250 });
        placeAt(pn, x, y, z);
        src.buffer = gruntBuf;
        const base = who === 'k' ? 1.45 : who === 'v' ? 1.18 : who === 'o' ? 0.8 : 0.92;
        src.playbackRate.value = base * (0.95 + Math.random() * 0.1);   // elke persoon een iets andere stem; vrouwen en kinderen hoger
        g.gain.value = 0.55 + 0.45 * Math.min(1, strength || 0.5);
        src.connect(g); g.connect(pn); pn.connect(master);
        src.start(now + 0.07, off, dur);
      },
      // Schreeuwen (totale chaos): hooguit drie tegelijk en niet vlak na elkaar, behalve de kreet bij bloed die gaat altijd voor
      scream(x, y, z, kind = 'paniek', who) {
        if (!on || !ctx || !scrBuf) return false;
        const now = ctx.currentTime;
        if (kind !== 'bloed' && (now - lastScr < 0.6 || scrLive >= 3)) return false;
        lastScr = now;
        let L = SCR[kind] || SCR.paniek; if (kind === 'paniek') { const u = Math.random(); if (u < 0.3) L = SCR.kort; else if (u < 0.36) L = SCR.horror; }
        const [off, dur] = L[Math.floor(Math.random() * L.length)];
        const src = ctx.createBufferSource(), g = ctx.createGain(), pn = ctx.createPanner();
        Object.assign(pn, { panningModel: 'equalpower', distanceModel: 'inverse', refDistance: 5, rolloffFactor: 1.2, maxDistance: 300 });
        placeAt(pn, x, y, z);
        src.buffer = scrBuf;
        const base = who === 'k' ? 1.35 : who === 'v' ? 1.2 : who === 'o' ? 0.86 : 1;
        src.playbackRate.value = base * (0.94 + Math.random() * 0.12);
        g.gain.value = kind === 'bloed' ? 1 : 0.75;
        src.connect(g); g.connect(pn); pn.connect(master);
        scrLive++; src.onended = () => { scrLive = Math.max(0, scrLive - 1); };
        src.start(now + 0.02, off, dur);
        return true;
      },
      walked(dist, grass, running) {
        if (!on || !ctx || dist <= 0) return;
        stepDist += dist;
        const stride = running ? 1.3 : 0.75;
        if (stepDist >= stride) { stepDist = 0; step(grass); }
      },
    };
  })();

