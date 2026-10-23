  // ---------- Weer ----------
  // Zon, bewolkt, regen, onweer, mist, sneeuw, of wisselend (dan volgt het ene weer het andere vanzelf op).
  // De waarden in WXK (02) schuiven in een paar seconden naar het nieuwe weer; dag en nacht (DN.apply) mengen ze in
  // lucht en licht. Regen en sneeuw zijn deeltjes in een doos rond de camera, helemaal op de grafische kaart berekend.
  // Een hoogtekaart van bovenaf (elke halve seconde, alleen bij nat weer) zegt waar iets boven je zit: daar valt geen
  // regen en blijft de grond droog en sneeuwvrij (onder een dak, een galerij, een boom).
  const weather = (() => {
    const TYPES = {
      zon:     { name: 'Zon',     cloud: 0.04, fog: 0,    rain: 0,   snow: 0, storm: 0 },
      bewolkt: { name: 'Bewolkt', cloud: 0.75, fog: 0.08, rain: 0,   snow: 0, storm: 0 },
      regen:   { name: 'Regen',   cloud: 0.92, fog: 0.28, rain: 1,   snow: 0, storm: 0 },
      onweer:  { name: 'Onweer',  cloud: 1,    fog: 0.35, rain: 1.5, snow: 0, storm: 1 },
      mist:    { name: 'Mist',    cloud: 0.5,  fog: 1,    rain: 0,   snow: 0, storm: 0 },
      sneeuw:  { name: 'Sneeuw',  cloud: 0.85, fog: 0.4,  rain: 0,   snow: 1, storm: 0 },
    };
    const ORDER = ['zon', 'bewolkt', 'regen', 'onweer', 'mist', 'sneeuw', 'wissel'];
    // wisselend weer: wat volgt er meestal op wat (gewichten)
    const NEXT = { zon: [['bewolkt', 5], ['zon', 2], ['mist', 0.6]], bewolkt: [['zon', 3], ['regen', 3], ['mist', 1], ['sneeuw', 0.7], ['bewolkt', 1]], regen: [['bewolkt', 4], ['onweer', 1.2], ['zon', 1]], onweer: [['regen', 3], ['bewolkt', 1]], mist: [['bewolkt', 2], ['zon', 2]], sneeuw: [['bewolkt', 3], ['sneeuw', 1]] };
    const KEY = 'hexstad.weer';
    const st = { mode: 'zon' };
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && ORDER.includes(v.mode)) st.mode = v.mode; } catch (e) { /* geen opslag: zon */ }
    let cur = st.mode === 'wissel' ? 'bewolkt' : st.mode, switchIn = 90;
    const now = Object.assign({}, TYPES[cur]);   // bij het opstarten meteen het bewaarde weer, zonder overgang
    let wet = now.rain > 0 ? 1 : 0, cover = now.snow > 0 ? 1 : 0, applyT = 0, flashT = -1, bolt = 8, occT = 0, time = 0;
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* mag niet */ } };

    // ---------- hoogtekaart van bovenaf ----------
    const OCC_N = 1024, OCC_Y = 460, OCC_FAR = 760;
    const occRT = new THREE.WebGLRenderTarget(OCC_N, OCC_N, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    const occCam = new THREE.OrthographicCamera(-80, 80, 80, -80, 1, OCC_FAR); occCam.up.set(0, 0, -1);
    const occMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
    WXU.uWxOcc.value = occRT.texture; WXU.uWxOccNF.value.set(1, OCC_FAR);
    const clearCol = new THREE.Color();
    function skipOcc(o) {   // niet in de hoogtekaart: lucht, wolken, lijnen, mensen, auto's, spookblokken en markeringen
      if (!o.visible) return false;
      if (o.renderOrder < 0 || o.isPoints || o.isLine || o.isSprite || o.userData.noOcc || o.userData.wxPrecip) return true;
      const m = o.material || (o.children && o.children[0] && o.children[0].material);
      return !!(m && !Array.isArray(m) && m.isMeshBasicMaterial && m.transparent);
    }
    function renderOcc(cx, cz, S) {
      const hidden = []; for (const o of scene.children) if (skipOcc(o)) { o.visible = false; hidden.push(o); }
      const bg = scene.background, fog = scene.fog, au = renderer.shadowMap.autoUpdate, rt = renderer.getRenderTarget(), ca = renderer.getClearAlpha();
      renderer.getClearColor(clearCol);
      scene.background = null; scene.fog = null; scene.overrideMaterial = occMat; renderer.shadowMap.autoUpdate = false;
      Object.assign(occCam, { left: -S / 2, right: S / 2, top: S / 2, bottom: -S / 2 }); occCam.updateProjectionMatrix();
      occCam.position.set(cx, OCC_Y, cz); occCam.lookAt(cx, OCC_Y - 1, cz); occCam.updateMatrixWorld();
      renderer.setRenderTarget(occRT); renderer.setClearColor('#ffffff', 1); renderer.clear(); renderer.render(scene, occCam);
      renderer.setRenderTarget(rt); renderer.setClearColor(clearCol, ca);
      scene.background = bg; scene.fog = fog; scene.overrideMaterial = null; renderer.shadowMap.autoUpdate = au;
      for (const o of hidden) o.visible = true;
      WXU.uWxOccP.value.set(cx - S / 2, cz + S / 2, S, OCC_Y); WXU.uWxOccOn.value = 1;
    }
    // ---------- neerslag ----------
    const PU = {
      uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uBox: { value: new THREE.Vector3(70, 36, 70) }, uSpeed: { value: 10 }, uWind: { value: new THREE.Vector2(1.5, 0.6) },
      uLen: { value: 0.7 }, uAmount: { value: 0 }, uOpacity: { value: 0.5 }, uColor: { value: new THREE.Color('#c8d2dc') }, uPx: { value: 600 }, uSize: { value: 0.06 }, uSway: { value: 0 },
      uWxOcc: WXU.uWxOcc, uWxOccP: WXU.uWxOccP, uWxOccNF: WXU.uWxOccNF, uWxOccOn: WXU.uWxOccOn,
    };
    const VS_COMMON = `#include <packing>
      uniform vec3 uCam; uniform float uTime; uniform vec3 uBox; uniform float uSpeed; uniform vec2 uWind; uniform float uAmount; uniform float uSway;
      uniform sampler2D uWxOcc; uniform vec4 uWxOccP; uniform vec2 uWxOccNF; uniform float uWxOccOn;
      attribute float aSeed; varying float vA;
      vec3 dropPos(out float hide) {
        vec3 vel = vec3(uWind.x, -uSpeed, uWind.y);
        vec3 p = position * uBox + vel * uTime;
        vec3 base = uCam - uBox * 0.5, w = base + mod(p - base, uBox);
        w.x += sin(uTime * 1.3 + aSeed * 41.0) * uSway; w.z += cos(uTime * 1.1 + aSeed * 29.0) * uSway;
        hide = step(uAmount, aSeed);
        if (uWxOccOn > 0.5) {
          vec2 uv = vec2((w.x - uWxOccP.x) / uWxOccP.z, (uWxOccP.y - w.z) / uWxOccP.z);
          if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) {
            float top = uWxOccP.w - (uWxOccNF.x + unpackRGBAToDepth(texture2D(uWxOcc, uv)) * (uWxOccNF.y - uWxOccNF.x));
            if (w.y < top - 0.05) hide = 1.0;   // onder een dak of onder de grond
          }
        }
        vec3 rel = w - uCam;
        vA = (1.0 - smoothstep(0.7, 1.0, length(rel.xz) / (uBox.x * 0.5))) * smoothstep(0.5, 2.0, length(rel)) * (1.0 - smoothstep(0.75, 1.0, abs(rel.y) / (uBox.y * 0.5))) * (1.0 - hide);
        return w;
      }`;
    const N_RAIN = 9000, N_SNOW = 7000;
    function geo(n, perDrop) {
      const pos = new Float32Array(n * perDrop * 3), seed = new Float32Array(n * perDrop), end = new Float32Array(n * perDrop);
      for (let i = 0; i < n; i++) { const x = Math.random(), y = Math.random(), z = Math.random(), s = Math.random(); for (let k = 0; k < perDrop; k++) { const j = i * perDrop + k; pos.set([x, y, z], j * 3); seed[j] = s; end[j] = k; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); return g;
    }
    const rain = new THREE.LineSegments(geo(N_RAIN, 2), new THREE.ShaderMaterial({
      uniforms: PU, transparent: true, depthWrite: false, fog: false,
      vertexShader: VS_COMMON + `
        uniform float uLen; attribute float aEnd;
        void main() {
          float hide; vec3 w = dropPos(hide);
          vec3 vel = normalize(vec3(uWind.x, -uSpeed, uWind.y));
          w -= vel * uLen * aEnd * (0.7 + aSeed * 0.6);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
          if (hide > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vA; void main() { gl_FragColor = vec4(uColor, uOpacity * vA); }`,
    }));
    const snow = new THREE.Points(geo(N_SNOW, 1), new THREE.ShaderMaterial({
      uniforms: PU, transparent: true, depthWrite: false, fog: false,
      vertexShader: VS_COMMON + `
        uniform float uPx; uniform float uSize;
        void main() {
          float hide; vec3 w = dropPos(hide);
          vec4 mv = viewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(uSize * (0.6 + aSeed * 0.8) * uPx / max(0.5, -mv.z), 1.0, 9.0);
          if (hide > 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        }`,
      fragmentShader: `uniform float uOpacity; varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(1.0, 1.0, 1.0, uOpacity * vA * smoothstep(0.5, 0.15, d)); }`,
    }));
    for (const o of [rain, snow]) { o.frustumCulled = false; o.renderOrder = 3; o.visible = false; o.userData.wxPrecip = true; scene.add(o); }

    // ---------- overgang, wisselen, bliksem ----------
    function pickNext() { const L = NEXT[cur], tot = L.reduce((a, [, w]) => a + w, 0); let x = Math.random() * tot; for (const [k, w] of L) { x -= w; if (x <= 0) return k; } return L[0][0]; }
    function set(mode) {
      if (!ORDER.includes(mode)) return;
      st.mode = mode; save();
      if (mode === 'wissel') { switchIn = 60 + Math.random() * 60; } else cur = mode;
      ui();
    }
    function step(dt) {
      time += dt;
      const sp = DN.st.auto ? DN.st.speed : 0;
      if (st.mode === 'wissel' && sp > 0) { switchIn -= dt * sp; if (switchIn <= 0) { cur = pickNext(); switchIn = 70 + Math.random() * 130; ui(); } }
      const T = TYPES[cur], k = 1 - Math.exp(-dt / 6);
      let moved = 0;
      for (const f of ['cloud', 'fog', 'rain', 'snow', 'storm']) { const d = (T[f] - now[f]) * k; now[f] += d; moved += Math.abs(d); }
      // de straat wordt nat bij regen en droogt daarna op; sneeuw blijft liggen en smelt langzaam (sneller in de regen)
      const ff = Math.max(1, sp);
      if (now.rain > 0.15) wet = Math.min(1, wet + dt * now.rain / 12); else wet = Math.max(0, wet - dt * ff / 80);
      if (now.snow > 0.15) cover = Math.min(1, cover + dt * now.snow / 40); else cover = Math.max(0, cover - dt * ff * (now.rain > 0.15 ? 1 / 25 : 1 / 110));
      Object.assign(WXK, { cloud: now.cloud, fog: now.fog, rain: now.rain, snow: now.snow, storm: now.storm, wet });
      WXU.uWxWet.value = wet * (1 - cover * 0.8); WXU.uWxSnow.value = cover;
      // bliksem: twee of drie flitsen kort na elkaar, de donder volgt later (verder weg = later en zachter)
      if (now.storm > 0.5) { bolt -= dt; if (bolt <= 0) { bolt = 5 + Math.random() * 12; flashT = 0; const delay = 0.3 + Math.random() * 3.2; sound.thunder(delay, Math.max(0.25, 1 - delay / 4)); } }
      let fl = 0;
      if (flashT >= 0) { flashT += dt; const t = flashT; fl = t < 0.08 ? 1 : t < 0.14 ? 0.15 : t < 0.22 ? 0.8 : t < 0.5 ? 0.8 * (1 - (t - 0.22) / 0.28) : 0; if (t > 0.5) flashT = -1; }
      const flashing = fl > 0 || WXK.flash > 0; WXK.flash = fl;
      applyT -= dt;
      if (flashing || (moved > 1e-4 && applyT <= 0)) { applyT = 0.12; DN.apply(); }
    }
    function update(dt) {
      step(dt);
      const walk = mode === 'walk', cam = camera.position;
      // mist: dichterbij (in bouwmodus nooit zo dicht dat je je eigen stad niet meer ziet)
      if (now.fog > 0.001) {
        const kn = 1 - 0.95 * now.fog, kf = 1 - 0.8 * now.fog;
        scene.fog.near *= kn; scene.fog.far *= kf;
        if (!walk) scene.fog.far = Math.max(scene.fog.far, orbit.dist * 1.25 + 60);
        scene.fog.near = Math.min(scene.fog.near, scene.fog.far * 0.6);
      }
      // regen en sneeuw rond de camera: dichtbij als je loopt, een grotere doos boven de stad als je bouwt
      const d = walk ? 0 : orbit.dist, bx = walk ? 70 : Math.min(420, Math.max(90, d * 0.9)), by = walk ? 36 : Math.min(260, Math.max(45, d * 0.6));
      PU.uBox.value.set(bx, by, bx); PU.uCam.value.copy(cam); PU.uTime.value = time % 2000;
      PU.uPx.value = renderer.domElement.height * 0.5 / Math.tan(camera.fov * Math.PI / 360);
      const r = now.rain, s = now.snow, night = nightK;
      rain.visible = r > 0.02; snow.visible = s > 0.02;
      if (rain.visible) { PU.uSpeed.value = 11; PU.uSway.value = 0; PU.uLen.value = walk ? 0.75 : 0.9 + d * 0.006; PU.uAmount.value = Math.min(1, r / 1.5 * (walk ? 1 : 0.8)); PU.uWind.value.set(1.2 + now.storm * 4, 0.5 + now.storm * 1.5); }
      PU.uOpacity.value = (rain.visible ? 0.35 + 0.15 * Math.min(1, r) : 0.85) * (1 - 0.55 * night) + WXK.flash * 0.4;
      PU.uColor.value.set(night > 0.5 ? '#7d8a99' : '#c7d1db');
      if (snow.visible) { PU.uSpeed.value = 1.15; PU.uSway.value = 0.45; PU.uSize.value = walk ? 0.07 : 0.07 + d * 0.0012; PU.uAmount.value = Math.min(1, s * (walk ? 0.8 : 1)); PU.uWind.value.set(0.5, 0.2); }
      // hoogtekaart: alleen nodig bij regen, sneeuw of een natte stad; elke halve seconde of als je ver bent verschoven
      const needOcc = r > 0.02 || s > 0.02 || wet > 0.01 || cover > 0.01;
      if (needOcc) {
        occT -= dt;
        const fx = walk ? player.x : orbit.target.x, fz = walk ? player.z : orbit.target.z, S = walk ? 170 : Math.min(800, Math.max(180, orbit.dist * 1.7)), P = WXU.uWxOccP.value;
        const off = Math.hypot(fx - (P.x + P.z / 2), fz - (P.y - P.z / 2)) > S * 0.2 || Math.abs(S - P.z) > S * 0.25;
        if (occT <= 0 || off || !WXU.uWxOccOn.value) { occT = 0.5; renderOcc(fx, fz, S); }
      } else WXU.uWxOccOn.value = 0;
    }
    // ---------- knop in de balk, sneltoets O, instellingen ----------
    const ICON = {
      zon: '<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
      bewolkt: '<path d="M4.6 12.5h6.9a2.6 2.6 0 0 0 .2-5.2 3.6 3.6 0 0 0-6.9 1A2.1 2.1 0 0 0 4.6 12.5z"/>',
      regen: '<path d="M4.6 9.5h6.9a2.4 2.4 0 0 0 .2-4.8 3.4 3.4 0 0 0-6.6.9 2 2 0 0 0-.5 3.9z"/><path d="M5.5 11.5l-.8 2M8.3 11.5l-.8 2M11.1 11.5l-.8 2"/>',
      onweer: '<path d="M4.6 9.5h6.9a2.4 2.4 0 0 0 .2-4.8 3.4 3.4 0 0 0-6.6.9 2 2 0 0 0-.5 3.9z"/><path d="M8.6 10.2l-1.7 2.4h2l-1.4 2.2"/>',
      mist: '<path d="M2.5 5.5h11M1.5 8.5h13M3 11.5h10"/>',
      sneeuw: '<path d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6M6.6 2.8L8 4l1.4-1.2M6.6 13.2L8 12l1.4 1.2"/>',
      wissel: '<path d="M12.8 6.2A5 5 0 0 0 3.6 5M3.2 9.8a5 5 0 0 0 9.2 1.2"/><path d="M3.3 2.6v2.6h2.6M12.7 13.4v-2.6h-2.6"/>',
    };
    const NAME = Object.assign({ wissel: 'Wisselend' }, ...Object.entries(TYPES).map(([k, v]) => ({ [k]: v.name })));
    const svg = k => `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
    const seg = document.getElementById('optWx'), lbl = document.getElementById('optWxName');
    if (seg) {
      seg.innerHTML = ORDER.map(k => `<button type="button" data-wx="${k}" aria-label="${NAME[k]}" title="${NAME[k]}">${svg(k)}</button>`).join('');
      seg.addEventListener('click', e => { const b = e.target.closest('[data-wx]'); if (b) { set(b.dataset.wx); toast(NAME[b.dataset.wx], 900); } });
    }
    function ui() {
      if (seg) seg.querySelectorAll('[data-wx]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wx === st.mode)));
      if (lbl) lbl.textContent = st.mode === 'wissel' ? NAME[cur].toLowerCase() : '';
    }
    window.addEventListener('keydown', e => {
      if (e.code !== 'KeyO' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const i = ORDER.indexOf(st.mode), n = ORDER[(i + (e.shiftKey ? ORDER.length - 1 : 1)) % ORDER.length]; set(n); toast('Weer: ' + NAME[n], 900);
    });
    ui();
    DN.apply();
    const api = {
      update, set, ORDER, NAME,
      get mode() { return st.mode; }, get now() { return cur; },
      debug: () => ({ mode: st.mode, cur, now: Object.assign({}, now), wet, cover, occ: WXU.uWxOccOn.value }),
      // tests: meteen het eindbeeld, zonder overgang
      snap(mode, w, c) { if (mode) set(mode); Object.assign(now, TYPES[cur]); if (w !== undefined) wet = w; if (c !== undefined) cover = c; step(0.001); DN.apply(); },
    };
    window.__WX = api;
    return api;
  })();
