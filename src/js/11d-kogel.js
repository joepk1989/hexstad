  // ---------- Kanonskogel (cameramodus) ----------
  // In de cameramodus schiet een klik een kogel in de kijkrichting (linkermuisknop: snelle kogel, rechts: zware sloopkogel).
  // Zwaartekracht, stuiteren op grond, wegen en daken; raakt hij een gebouw dan breekt dat rond de inslag (collapse.shoot),
  // een auto vliegt of tolt weg en loopt schade op, iemand valt om (met bloed). Na 8 s, of als hij stilligt, verdwijnt hij.
  const kogels = (() => {
    const MAX = 16, list = [];
    const mats = { licht: new THREE.MeshStandardMaterial({ color: '#2b2d30', metalness: 0.75, roughness: 0.35, flatShading: true }), zwaar: new THREE.MeshStandardMaterial({ color: '#3a3f45', metalness: 0.85, roughness: 0.3, flatShading: true }) };
    const geo = new THREE.IcosahedronGeometry(1, 1);   // laag-poly bol (80 driehoeken)
    let lastShot = 0;
    function fire(heavy) {
      const now = performance.now(); if (now - lastShot < (heavy ? 600 : 220)) return; lastShot = now;
      if (list.length >= MAX) { const o = list.shift(); scene.remove(o.mesh); }
      const d = new THREE.Vector3(); camera.getWorldDirection(d);
      const rad = heavy ? 1.2 : 0.45, sp = heavy ? 36 : 48;
      const mesh = new THREE.Mesh(geo, heavy ? mats.zwaar : mats.licht); mesh.scale.setScalar(rad); mesh.castShadow = true;
      const p = camera.position.clone().addScaledVector(d, 1.8 + rad);
      mesh.position.copy(p); scene.add(mesh);
      list.push({ mesh, x: p.x, y: p.y, z: p.z, vx: d.x * sp, vy: d.y * sp + 1.5, vz: d.z * sp, rad, heavy, t: 0, still: 0, hits: 0, spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize() });
      try { sound.fx('whoosh'); sound.impact(heavy ? 0.9 : 0.5, p.x, p.y, p.z, false); } catch (e) { }
    }
    const groundY = (x, z) => { const [q, r] = worldToCell(x, z); let g = Math.max(terrGround(x, z), 0, colTopW(q, r)); const rt = roadTop(x, z, 0.5); if (rt != null) g = Math.max(g, rt); return g; };
    function step(o, dt) {
      o.t += dt;
      o.vy -= 9.81 * dt;
      const nx = o.x + o.vx * dt, ny = o.y + o.vy * dt, nz = o.z + o.vz * dt, sp = Math.hypot(o.vx, o.vy, o.vz);
      // gebouw: in kleine stapjes langs de baan (een snelle kogel gaat ~0,8 m per beeld)
      const n = Math.max(1, Math.ceil(sp * dt / (o.rad * 0.8)));
      for (let i = 1; i <= n; i++) {
        const f = i / n, x = o.x + (nx - o.x) * f, y = o.y + (ny - o.y) * f, z = o.z + (nz - o.z) * f;
        if (sp > 3 && !(o.lh && Math.hypot(x - o.lh[0], y - o.lh[1], z - o.lh[2]) < o.rad * 1.5) && collapse.shoot(x, y, z, o.vx, o.vy, o.vz, o.rad, o.heavy)) {
          o.hits++;
          // de sloopkogel ramt door: elke muur kost vaart, pas als hij te traag is stuitert hij terug
          if (o.heavy && sp > 6) { o.lh = [x, y, z]; const k = 0.93; o.vx *= k; o.vz *= k; o.vy *= k; continue; }
          o.x = x - o.vx * dt / n; o.y = y; o.z = z - o.vz * dt / n;   // raak: terugstuiteren met veel minder vaart
          o.vx *= -0.22; o.vz *= -0.22; o.vy *= 0.3; return;
        }
        const hit = sp > 2 && cars.ballHit(x, y, z, o.vx, o.vy, o.vz, o.rad);
        if (hit) { o.x = x; o.y = y; o.z = z; const k = o.heavy ? 0.75 : 0.45; o.vx *= k; o.vz *= k; o.vy = Math.abs(o.vy) * 0.3 + 1; return; }
      }
      o.x = nx; o.y = ny; o.z = nz;
      const g = groundY(o.x, o.z) + o.rad;
      if (o.y < g) {
        if (g - o.y > 1.4 && o.y < g - o.rad) {   // tegen een muur of steile helling: terug
          o.x -= o.vx * dt; o.z -= o.vz * dt; o.vx *= -0.35; o.vz *= -0.35;
        }
        o.y = g;
        if (o.vy < -2.5) { try { sound.impact(Math.min(1, -o.vy / 14) * (o.heavy ? 1 : 0.6), o.x, o.y, o.z, false); } catch (e) { } }
        o.vy = o.vy < -1 ? -o.vy * 0.42 : 0;
        const fr = Math.pow(o.vy ? 0.82 : 0.35, dt * (o.vy ? 1 : 4)); o.vx *= fr; o.vz *= fr;   // rollen remt af
      }
      o.still = Math.hypot(o.vx, o.vz) < 0.4 && Math.abs(o.vy) < 0.5 ? o.still + dt : 0;
      o.mesh.position.set(o.x, o.y, o.z);
      o.mesh.rotateOnAxis(o.spin, Math.hypot(o.vx, o.vz) / o.rad * dt);
    }
    function update(dt) {
      if (!list.length) return;
      dt = Math.min(dt, 0.05);
      for (let i = list.length - 1; i >= 0; i--) {
        const o = list[i]; step(o, dt);
        const out = o.t > 8 || o.still > 1.5 || o.y < -60;
        if (out) { o.mesh.scale.multiplyScalar(0.85); if (o.mesh.scale.x < 0.05) { scene.remove(o.mesh); list.splice(i, 1); } }
      }
    }
    function clear() { for (const o of list) scene.remove(o.mesh); list.length = 0; }
    return { fire, update, clear, list };
  })();
