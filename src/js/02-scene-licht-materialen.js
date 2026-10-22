  // ---------- Three.js ----------
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const GROUND_COL = '#8eab69';
  const HORIZON = '#dde5e1';
  scene.background = new THREE.Color(HORIZON);
  scene.fog = new THREE.Fog(HORIZON, 380, 1150);
  // Hemelkoepel: een bol rond de camera met een verloop naar de kijkhoogte (horizon → zenit), een gloed rond de zon
  // en wat nevel onder de horizon. Kleuren komen van de tijd van de dag (zie DN.apply).
  const skyU = { top: { value: new THREE.Color('#4f86c6') }, mid: { value: new THREE.Color('#a9cbe3') }, hor: { value: new THREE.Color(HORIZON) }, sunDir: { value: new THREE.Vector3(0.3, 0.6, 0.3) }, sunCol: { value: new THREE.Color('#fff2d0') }, glow: { value: 1 } };
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 20), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float glow; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir); float h = d.y;
        vec3 c = mix(hor, mid, smoothstep(0.0, 0.22, h));
        c = mix(c, top, smoothstep(0.18, 0.85, h));
        c = mix(c, hor * 0.92, smoothstep(0.0, -0.15, h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunCol * (pow(s, 900.0) * 1.2 + pow(s, 24.0) * 0.28 * glow + pow(s, 5.0) * 0.12 * glow) * smoothstep(-0.12, 0.05, sunDir.y);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  skyDome.frustumCulled = false; skyDome.renderOrder = -10; scene.add(skyDome);
  // Wolken: zachte stapelwolken van een paar vlokken elk, op 380–580 m hoogte, die met de wind meedrijven en rond de
  // camera doorlopen (wat er aan de ene kant uit drijft, komt aan de andere kant terug). Kleur volgt de dag.
  const clouds = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    for (let i = 0; i < 14; i++) {   // één vlok: een paar zachte bollen over elkaar
      const x = 64 + (Math.random() - 0.5) * 50, y = 70 + (Math.random() - 0.5) * 34, r = 22 + Math.random() * 20, grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,255,255,0.55)'); grd.addColorStop(0.6, 'rgba(255,255,255,0.25)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    const group = new THREE.Group(), list = [], SPAN = 4000, mats = [];
    for (let n = 0; n < 40; n++) {
      const cl = new THREE.Group(), size = 110 + Math.random() * 170, puffs = 4 + Math.floor(Math.random() * 5);
      for (let i = 0; i < puffs; i++) {
        const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9, color: '#ffffff' }); mats.push({ m, shade: 0.82 + Math.random() * 0.18 });
        const sp = new THREE.Sprite(m), k = size * (0.55 + Math.random() * 0.6); sp.scale.set(k * 1.6, k, 1);
        sp.position.set((Math.random() - 0.5) * size * 1.6, (Math.random() - 0.3) * size * 0.25, (Math.random() - 0.5) * size * 0.9); sp.renderOrder = -5; cl.add(sp);
      }
      cl.position.set((Math.random() - 0.5) * SPAN, 380 + Math.random() * 200, (Math.random() - 0.5) * SPAN); cl.renderOrder = -5;
      group.add(cl); list.push(cl);
    }
    scene.add(group);
    const wind = new THREE.Vector3(3.2, 0, 1.1), col = new THREE.Color();
    return {
      update(dt, cam) {
        for (const cl of list) {
          cl.position.addScaledVector(wind, dt);
          for (const ax of ['x', 'z']) { let d = cl.position[ax] - cam[ax]; if (d > SPAN / 2) cl.position[ax] -= SPAN; else if (d < -SPAN / 2) cl.position[ax] += SPAN; }
          const dist = Math.hypot(cl.position.x - cam.x, cl.position.z - cam.z), fade = (1 - Math.max(0, Math.min(1, (dist - 1200) / 700)))
            * Math.max(0, Math.min(1, (cl.position.y - cam.y - 60) / 140));   // alleen boven je: van hoog boven de stad kijk je er niet doorheen
          for (const sp of cl.children) sp.material.opacity = sp.userData.base * fade;
        }
      },
      setOn(v) { group.visible = !!v; },
      get on() { return group.visible; },
      tint(c, opacity) { for (const { m, shade } of mats) { col.copy(c).multiplyScalar(shade); m.color.copy(col); } for (const cl of list) for (const sp of cl.children) sp.userData.base = opacity; },
    };
  })();

  const camera = new THREE.PerspectiveCamera(45, 1, 1.0, 5000);
  camera.rotation.order = 'YXZ';

  const hemi = new THREE.HemisphereLight('#e9f0f5', '#5d6b45', 0.62);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d8', 0.95);
  const SUN_OFS = new THREE.Vector3(110, 170, 75);
  sun.position.copy(SUN_OFS);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -175, right: 175, top: 175, bottom: -175, near: 1, far: 600 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  // De schaduwkaart (350 m breed) schuift mee met waar je kijkt, zodat de hele bouwgrond schaduw kan krijgen.
  // Verschuiven in hele texels voorkomt dat schaduwranden trillen.
  let sunHalf = 175;
  function followSun(fx, fz, dist) {
    const half = Math.min(320, Math.max(150, dist * 0.75));
    if (Math.abs(half - sunHalf) > 8) {
      sunHalf = half;
      Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
      sun.shadow.camera.updateProjectionMatrix();
    }
    const texel = (2 * sunHalf) / sun.shadow.mapSize.x * 4;
    const sx = Math.round(fx / texel) * texel, sz = Math.round(fz / texel) * texel;
    sun.target.position.set(sx, 0, sz);
    sun.position.set(sx + SUN_OFS.x, SUN_OFS.y, sz + SUN_OFS.z);
  }


  // ---------- Dag en nacht ----------
  // tod = uur van de dag (0–24). De zon gaat om 5:30 op en om 20:30 onder; daarna schijnt de maan.
  const litMats = [];   // binnenruimtes: 's nachts branden de lampen (eigen licht omhoog)
  let nightK = 0;       // 0 = dag, 1 = nacht (ook voor het geluid: 's nachts geen vogels)
  const DN = (() => {
    const KEY = 'hexstad.tod';
    const st = { tod: 14, auto: true, speed: 1 };
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && isFinite(v.tod)) { st.tod = ((v.tod % 24) + 24) % 24; st.auto = v.auto !== false; if ([1, 4, 12].includes(v.speed)) st.speed = v.speed; } } catch (e) { /* geen opslag: dan de standaard */ }
    const SPEED = 24 / 300;   // een etmaal duurt vijf minuten
    const moon = new THREE.DirectionalLight('#8fa6ff', 0); scene.add(moon);
    const mix = (a, b, t) => { const A = new THREE.Color(a), B = new THREE.Color(b); return A.lerp(B, t); };
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    // sterren en schijven voor zon en maan (volgen de camera, dus altijd even ver weg)
    const starGeo = new THREE.BufferGeometry(), sp = [];
    for (let i = 0; i < 650; i++) { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * r * 2000, Math.abs(u) * 2000 * 0.9 + 80, Math.sin(a) * r * 2000); }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    stars.frustumCulled = false; stars.renderOrder = -8; scene.add(stars);
    const disc = (col, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ color: col, fog: false, depthWrite: false, transparent: true })); m.frustumCulled = false; m.renderOrder = -7; scene.add(m); return m; };
    const sunDisc = disc('#fff3c4', 70), moonDisc = disc('#e8eefc', 52);
    const dir = new THREE.Vector3();
    let lastSave = 0, lastK = -1;
    function apply() {
      const a = (st.tod - 5.5) / 15 * Math.PI, elev = Math.sin(a);               // zonshoogte: 1 = middag, 0 = horizon, <0 = onder
      const day = sm(-0.12, 0.35, elev), dusk = Math.exp(-Math.pow(elev / 0.2, 2)), night = 1 - sm(-0.25, 0.05, elev);
      nightK = night;
      // lucht
      const top = mix(mix('#050913', '#3f7bc4', day), '#34457a', dusk * 0.7);
      const mid = mix(mix('#0c1530', '#9cc3e4', day), '#e58e72', dusk * 0.85);
      const hor = mix(mix('#18223d', HORIZON, day), '#f6bf8c', dusk * 0.9);
      skyU.top.value.copy(top); skyU.mid.value.copy(mid); skyU.hor.value.copy(hor); scene.background.copy(hor);
      skyU.sunDir.value.set(Math.cos(a) * -1, elev * 0.8 + 0.1, 0.35); skyU.sunCol.value.copy(mix('#ff7a3a', '#fff2d0', sm(0.0, 0.45, elev))); skyU.glow.value = 0.6 + dusk * 1.6;
      // wolken: wit overdag, roze en oranje bij zonsopgang en -ondergang, grijsblauw en zwakker 's nachts
      clouds.tint(mix(mix('#3b4560', '#ffffff', day), '#ffb08a', dusk * 0.8), 0.92 - night * 0.55);
      scene.fog.color.copy(hor);
      // licht
      SUN_OFS.set(Math.cos(a) * -170 + 55, Math.max(40, elev * 170), 95);
      sun.intensity = 0.95 * sm(-0.02, 0.3, elev);
      sun.color.copy(mix('#ff9a5a', '#fff0d8', sm(0.0, 0.45, elev)));
      hemi.intensity = 0.4 + 0.22 * day + 0.12 * dusk;
      hemi.color.copy(mix(mix('#5a6aa0', '#e9f0f5', day), '#ffc59a', dusk * 0.55)); hemi.groundColor.copy(mix('#1c2230', '#5d6b45', day));
      moon.color.set('#8fa6ff'); moon.intensity = 0.7 * night;
      moon.position.set(Math.cos(a) * 170 * 1, Math.max(60, -elev * 190), -75);
      // binnenverlichting: lampen gaan aan als het donker wordt
      const lamp = Math.min(1, night * 1.15 + dusk * 0.3);
      for (const [m, base] of litMats) m.emissiveIntensity = Math.min(1.2, base * (1 + lamp * 3.2));
      stars.material.opacity = Math.min(1, night * 1.2);
      // zon en maan aan de hemel
      sunDisc.userData.dir = [Math.cos(a) * -1, Math.max(-0.2, elev * 0.8 + 0.1), 0.35];
      moonDisc.userData.dir = [Math.cos(a), Math.max(-0.2, -elev * 0.8 + 0.1), -0.35];
      sunDisc.material.opacity = sm(-0.15, 0.05, elev); moonDisc.material.opacity = night;
      sunDisc.material.color.copy(mix('#ff8a4a', '#fff3c4', sm(0.0, 0.4, elev)));
      document.body.classList.toggle('night', night > 0.55);
    }
    function place(camPos) {
      for (const d of [sunDisc, moonDisc]) { const v = d.userData.dir; if (!v) continue; dir.set(v[0], v[1], v[2]).normalize(); d.position.copy(camPos).addScaledVector(dir, 1900); d.lookAt(camPos); }
      stars.position.copy(camPos); skyDome.position.copy(camPos);
    }
    function save(force) { const t = performance.now(); if (!force && t - lastSave < 3000) return; lastSave = t; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* mag niet: jammer */ } }
    return {
      st, apply, place, save,
      update(dt) { if (st.auto) { st.tod = (st.tod + dt * SPEED * st.speed) % 24; save(false); } const k = Math.round(st.tod * 60); if (k !== lastK) { lastK = k; apply(); ui(); } },
      set(t, keepAuto) { st.tod = ((t % 24) + 24) % 24; if (keepAuto === false) st.auto = false; lastK = -1; save(true); },
    };
  })();

  // De grond wordt niet getekend waar water ligt: elk watervak tekent eerst een onzichtbaar masker (stencil)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({
    color: GROUND_COL, roughness: 1,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  }));
  const holeMat = new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
  });
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // Rasterlijnen van de bouwgrond
  let gridOn = true;   // raster tonen (optiebalk)
  const gridLines = (() => {
    const pts = [];
    const corner = (cx, cz, i) => { const a = (30 + 60 * i) * Math.PI / 180; return [cx + R * Math.cos(a), cz + R * Math.sin(a)]; };
    for (let q = -GRID_RINGS; q <= GRID_RINGS; q++) for (let r = -GRID_RINGS; r <= GRID_RINGS; r++) {
      if (hexDist(q, r) > GRID_RINGS) continue;
      const { x, z } = cellToWorld(q, r);
      for (let i = 0; i < 6; i++) { const a = corner(x, z, i), b = corner(x, z, i + 1); pts.push(a[0], 0.04, a[1], b[0], 0.04, b[1]); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#f4f7ef', transparent: true, opacity: 0.26, depthWrite: false }));
  })();
  scene.add(gridLines);

  // ---------- Texturen & materialen ----------
  const aniso = renderer.capabilities.getMaxAnisotropy();
  // Texturen op ware schaal: 32 pixels per meter. Eén gevelvlak = 6 m breed, 3 m hoog.
  const PX = 32, FACE_W = R * PX, FLOOR_H = 3 * PX;
  function canvasTex(draw) {
    const c = document.createElement('canvas'); c.width = FACE_W; c.height = FLOOR_H;
    draw(c.getContext('2d'), FACE_W, FLOOR_H);
    const t = new THREE.CanvasTexture(c);
    // UV van een gevelvlak loopt in meters (x: -3..3, y: 0..3); dit zet dat om naar de textuur
    t.repeat.set(1 / R, 1 / 3); t.offset.set(0.5, 0); t.anisotropy = aniso;
    return t;
  }
  function brickTex(brick, mortar, frame, withDoor) {
    return canvasTex((g, w, h) => {
      g.fillStyle = mortar; g.fillRect(0, 0, w, h);
      const bh = 4, bw = 10;
      for (let y = 0, row = 0; y < h; y += bh, row++) {
        for (let x = -(row % 2) * bw / 2; x < w; x += bw) {
          g.fillStyle = brick; g.fillRect(x + 0.6, y + 0.6, bw - 1.2, bh - 1.2);
          const v = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
          g.fillStyle = `rgba(0,0,0,${(v * 0.14).toFixed(3)})`; g.fillRect(x + 0.6, y + 0.6, bw - 1.2, bh - 1.2);
        }
      }
      // De ramen zijn echte openingen in de muur; op de textuur staat alleen het kozijn rond de voordeur
      if (withDoor) {
        const cx = R / 2 * PX, dw = 1.1 * PX, top = h - 2.4 * PX, bot = h - 0.2 * PX, x0 = cx - dw / 2;
        g.fillStyle = frame; g.fillRect(x0 - 4, top - 4, dw + 8, bot - top + 4);
        g.fillStyle = '#cfcac0'; g.fillRect(x0 - 8, bot, dw + 16, h - bot);
      }
    });
  }
  function glassTex(withDoor) {
    return canvasTex((g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#a6c6da'); grd.addColorStop(1, '#4d6e86');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.moveTo(10, h); g.lineTo(80, 10); g.lineTo(120, 10); g.lineTo(50, h); g.fill();
      g.fillStyle = '#2e3b45'; for (let x = 0; x <= w; x += 1.5 * PX) g.fillRect(x - 2, 0, 4, h);   // stijlen om de 1,5 m
      g.fillStyle = '#cdd2d4'; g.fillRect(0, 0, w, 0.3 * PX);                                       // vloerrand 30 cm
      if (withDoor) { g.fillStyle = '#1f282f'; g.fillRect(w / 2 - 0.55 * PX - 4, h - 2.4 * PX - 4, 1.1 * PX + 8, 2.2 * PX + 4); }
    });
  }
  // Binnenkant: stucwerk met dezelfde ramen, plint onderaan
  function plasterTex(withMiddle) {
    return canvasTex((g, w, h) => {
      g.fillStyle = '#ece7dc'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d3cabb'; g.fillRect(0, h - 0.3 * PX, w, 0.1 * PX);   // plint
    });
  }
  const officeInTex = canvasTex((g, w, h) => {
    g.fillStyle = '#e8eae9'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9cdcd'; g.fillRect(0, h - 0.12 * PX, w, 0.12 * PX);   // plint
  });
  // Kantoorgevel: borstwering en lateien van donker aluminium; het glas zit er als echte ruiten tussen
  function officeSkinTex(withDoor) {
    return canvasTex((g, w, h) => {
      g.fillStyle = '#4a5964'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x <= w; x += 1.5 * PX) g.fillRect(x - 1, 0, 2, h);
      g.fillStyle = '#cdd2d4'; g.fillRect(0, 0, w, 0.25 * PX);                                       // dakrand
      if (withDoor) { g.fillStyle = '#1f282f'; g.fillRect(w / 2 - 0.55 * PX - 4, h - 2.4 * PX - 4, 1.1 * PX + 8, 2.2 * PX + 4); }
    });
  }

  const std = o => new THREE.MeshStandardMaterial(Object.assign({ flatShading: true, roughness: 0.85 }, typeof o === 'string' ? { color: o } : o));
  // Binnenruimtes liggen in de schaduw; een beetje eigen licht houdt ze leesbaar
  const inner = (o) => { const m = std(Object.assign({ emissive: '#ffffff', emissiveIntensity: 0.28 }, o)); litMats.push([m, m.emissiveIntensity]); return m; };
  const innerTex = (tex) => { const m = std({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.48 }); litMats.push([m, m.emissiveIntensity]); return m; };
  const BRICKS = [
    ['#9c4a33', '#cdbfae', '#efe9dc'],
    ['#c39248', '#e5dac8', '#ffffff'],
    ['#e6e1d4', '#bdb8aa', '#33404a'],
    ['#6e5148', '#c9bdb0', '#e9e4d8'],
  ];
  const M = {
    sidewalk: std('#bdbcb2'), asphalt: std('#3c4045'), dash: std('#f1efe6'),
    grass: std('#6fa356'), water: std({ color: '#2d5a66', roughness: 0.12, metalness: 0.3, flatShading: false }),
    kade: std({ color: '#6a3a2b' }), kadeSteen: std({ color: '#8f8b82' }), brug: std({ color: '#7d4a38' }),
    roofFlat: std('#8d8f8a'), roofTile: std('#8a3b2a'), kapel: std('#ece6da'), kapelDak: std('#3d434a'), concrete: std('#c4c6c2'),
    lampOff: std('#23282d'), tlBody: std({ color: '#1d2226', roughness: 0.6 }),
    lampOn: { r: new THREE.MeshBasicMaterial({ color: '#ff3b2f' }), a: new THREE.MeshBasicMaterial({ color: '#ffb020' }), g: new THREE.MeshBasicMaterial({ color: '#39e07a' }) },
    trunk: std('#6b4a32'), leaf: [std('#3f7d3a'), std('#5a9440'), std('#2f6b3f')],
    glass: std({ map: glassTex(false), roughness: 0.3, metalness: 0.15 }),
    glassDoor: std({ map: glassTex(true), roughness: 0.3, metalness: 0.15 }),
    officeSkin: std({ map: officeSkinTex(false), roughness: 0.5, metalness: 0.3 }),
    officeSkinDoor: std({ map: officeSkinTex(true), roughness: 0.5, metalness: 0.3 }),
    // Ruiten: doorzichtig, met een lichte blauwgroene glans; je kijkt erdoor naar binnen en naar buiten
    pane: new THREE.MeshStandardMaterial({ color: '#a8cbd8', transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    winFrame: BRICKS.map(([, , f]) => std(f)), alu: std({ color: '#2e3b45', roughness: 0.45, metalness: 0.4 }),
    sill: std('#d6d1c4'), reveal: std('#e2dccf'), darkGlass: std({ color: '#33444f', roughness: 0.2, metalness: 0.3 }),
    brick: BRICKS.map(([b, m, f]) => std({ map: brickTex(b, m, f, false) })),
    brickDoor: BRICKS.map(([b, m, f]) => std({ map: brickTex(b, m, f, true) })),
    plaster: innerTex(plasterTex(true)), plasterPlain: innerTex(plasterTex(false)),
    officeIn: innerTex(officeInTex),
    floorWood: inner({ color: '#a97c52', emissive: '#a97c52', emissiveIntensity: 0.2 }),
    floorOffice: inner({ color: '#8b9397', emissive: '#8b9397', emissiveIntensity: 0.2 }),
    ceiling: inner({ color: '#f1eee7', emissive: '#f1eee7', emissiveIntensity: 0.72 }),
    trim: inner({ color: '#f4f2ec', emissive: '#f4f2ec', emissiveIntensity: 0.25 }),
    stairWood: inner({ color: '#8f6440', emissive: '#8f6440', emissiveIntensity: 0.2 }),
  };

  const G = {
    full: new THREE.CylinderGeometry(R, R, 3, 6).translate(0, 1.5, 0),
    flat: new THREE.CylinderGeometry(R, R, FLAT, 6).translate(0, FLAT / 2, 0),
    water: new THREE.CylinderGeometry(R, R, 0.1, 6).translate(0, 0.05, 0),
    roof: new THREE.ConeGeometry(R, 5, 6).translate(0, 2.5, 0),
    junction: new THREE.CylinderGeometry(ROAD_W / SQ3, ROAD_W / SQ3, 0.02, 6).translate(0, 0.01, 0),
    arm: new THREE.BoxGeometry(INNER, 0.02, ROAD_W).translate(INNER / 2, 0.01, 0),
    dash: new THREE.BoxGeometry(2.4, 0.026, 0.12).translate(INNER * 0.55, 0.013, 0),
    trunk: new THREE.CylinderGeometry(0.18, 0.26, 2.8, 6).translate(0, 1.4, 0),
    crown: new THREE.IcosahedronGeometry(2.1, 0),
    unit: new THREE.BoxGeometry(1, 1, 1),
    // Dakkapel op het dakvlak: voorkant op 5,4 m uit het midden, plat dakje op 2,9 m; de rest zit in het dak
    kapelBox: new THREE.BoxGeometry(2.6, 2.2, 2.3).translate(0, 1.8, 4.25),
    kapelTop: new THREE.BoxGeometry(3.0, 0.14, 2.75).translate(0, 2.97, 4.3),
    kapelWin: new THREE.BoxGeometry(1.7, 0.95, 0.06).translate(0, 2.2, 5.42),
    kapelSill: new THREE.BoxGeometry(1.9, 0.08, 0.16).translate(0, 1.68, 5.45),
    tlPole: new THREE.CylinderGeometry(0.055, 0.07, 3.45, 8).translate(0, 1.725, 0),
    tlHead: new THREE.BoxGeometry(0.34, 1.0, 0.34),
    tlLamp: new THREE.CylinderGeometry(0.105, 0.105, 0.06, 14).rotateX(Math.PI / 2),
    roadGhost: new THREE.CylinderGeometry(R, R, 0.25, 6).translate(0, 0.125, 0),
    padGhost: new THREE.CylinderGeometry(R, R, 0.15, 6).translate(0, 0.075, 0),
  };
  const geoFor = t => t === 'weg' || baseOf(t) === 'laan' ? G.roadGhost : t === 'pad' || t === 'fietspad' ? G.padGhost : t === 'park' ? G.flat : t === 'water' ? G.water : t === 'dak' ? G.roof : G.full;

