  // ---------- Deuren die opengaan ----------
  // Elke voordeur (huizen, kantoren, modules met een deuropening) krijgt een deurblad dat naar binnen openzwaait
  // zodra jij of een voetganger erbij komt (binnen 2,2 m), en weer dichtgaat als iedereen weg is. Eén InstancedMesh
  // voor alle deurbladen; de deur blokkeert niet (de opening in de muur blijft vrij), dus niemand loopt ertegenaan.
  // Deuren horen bij een eigenaar (een vak of een module-exemplaar) en gaan weg als die herbouwd wordt.
  const doors = (() => {   // (window.__doors voor tests)
    const MAXD = 2400;
    const geo = new THREE.BoxGeometry(1, 1, 0.05).translate(0.5, 0.5, 0);   // scharnier op x=0, onderkant op y=0; per deur geschaald
    const knob = new THREE.SphereGeometry(0.03, 6, 5).translate(0.88, 0.47, 0.045), knob2 = new THREE.SphereGeometry(0.03, 6, 5).translate(0.88, 0.47, -0.045);
    const geoAll = mergeGeos([geo, knob, knob2]);
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 });
    // Binnen onder een dak valt geen zonlicht; net als de binnenmuren licht het blad zichzelf zacht bij (in zijn eigen kleur)
    mat.onBeforeCompile = function (sh) { wxPatch(sh, this); sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.42;'); };
    mat.customProgramCacheKey = () => 'wx-door';
    const mesh = new THREE.InstancedMesh(geoAll, mat, MAXD); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXD * 3).fill(1), 3);   // zelf aanmaken: r128 maakt hem anders zo groot als count (0)
    const list = [], byOwner = new Map(), cellMap = new Map(), M4 = new THREE.Matrix4(), Q4 = new THREE.Matrix4(), C = new THREE.Color();
    let dirty = true, frame = 0;
    const ck = (x, z) => worldToCell(x, z).join(',');
    // hx,hz: scharnier; tx,tz: richting van het dichte blad; inx,inz: naar binnen; y: onderkant; w, h; col: kleur
    function add(owner, d) {
      if (list.length >= MAXD) return;
      d.owner = owner; d.open = 0; d.hot = 0;
      { const th = Math.atan2(-d.tz, d.tx), px = -Math.sin(th), pz = -Math.cos(th); d.sgn = (px * d.inx + pz * d.inz) >= 0 ? 1 : -1; }   // welke draairichting naar binnen is
      list.push(d); let L = byOwner.get(owner); if (!L) byOwner.set(owner, L = []); L.push(d);
      const k = ck(d.hx + d.tx * d.w / 2, d.hz + d.tz * d.w / 2); d.ck = k; let Lc = cellMap.get(k); if (!Lc) cellMap.set(k, Lc = []); Lc.push(d);
      dirty = true;
    }
    function clear(owner) {
      const L = byOwner.get(owner); if (!L) return; byOwner.delete(owner);
      for (const d of L) { const i = list.indexOf(d); if (i >= 0) list.splice(i, 1); const Lc = cellMap.get(d.ck); if (Lc) { const j = Lc.indexOf(d); if (j >= 0) Lc.splice(j, 1); if (!Lc.length) cellMap.delete(d.ck); } }
      dirty = true;
    }
    function touch(x, z, y) {   // iemand staat hier: deuren in dit vak en de buurvakken binnen 2,2 m gaan open
      const [q, r] = worldToCell(x, z);
      for (const [dq, dr] of [[0, 0], ...NEIGH]) {
        const L = cellMap.get((q + dq) + ',' + (r + dr)); if (!L) continue;
        for (const d of L) { const cx = d.hx + d.tx * d.w / 2, cz = d.hz + d.tz * d.w / 2; if (Math.abs(y - d.y) < 2 && Math.hypot(cx - x, cz - z) < 2.2) d.hot = frame; }
      }
    }
    function update(dt) {
      frame++;
      if (mode === 'walk') touch(player.x, player.z, player.y);
      if (typeof people !== 'undefined') for (const a of people.agents) if (a.state === 'walk' || a.state === 'pause') touch(a.x, a.z, a.y);
      let changed = dirty;
      for (const d of list) { const tgt = d.hot === frame ? 1 : 0; if (Math.abs(tgt - d.open) > 0.001) { d.open += (tgt - d.open) * Math.min(1, dt * (tgt ? 7 : 3)); if (Math.abs(tgt - d.open) < 0.01) d.open = tgt; changed = true; } }
      if (!changed) return;
      list.forEach((d, i) => {
        const th = Math.atan2(-d.tz, d.tx) + d.sgn * d.open * 1.5;
        M4.makeRotationY(th).setPosition(d.hx, d.y, d.hz).multiply(Q4.makeScale(d.w, d.h, 1));
        mesh.setMatrixAt(i, M4); if (dirty) { C.set(d.col || '#5a3a22'); mesh.setColorAt(i, C); }
      });
      mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true; if (dirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true; dirty = false;
    }
    function lift(owner, dy) { if (!dy) return; const L = byOwner.get(owner); if (L) for (const d of L) d.y += dy; dirty = true; }   // het vak staat op het terrein: de deuren mee omhoog
    function clearCells() { for (const o of [...byOwner.keys()]) if (typeof o === 'string') clear(o); }   // alle deuren van vakken (nieuwe stad)
    const api = { add, clear, clearCells, lift, update, get count() { return list.length; }, list };
    window.__doors = api; return api;
  })();
