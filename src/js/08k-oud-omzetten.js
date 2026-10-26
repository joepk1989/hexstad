  // ---------- Oude blokken omzetten naar modules ----------
  // Oude blokken (woning, kantoor, blok, zuilen, hof, tribune, tunnel, dak) zijn losse lagen van 3 m zonder deuren,
  // ramen of dak van eigen vorm. Dit zet ze om in modules uit de bibliotheek, zodat ze net als de rest meedoen:
  // deuren naar de straat, mensen die erin en eruit lopen, schoonheid en instorten. De hoogte blijft gelijk: een
  // kolom van 4 woonlagen wordt een herenhuis van 4 lagen, hogere kolommen worden opgestapeld. Kolommen met iets
  // anders ertussen (pad, weg, park) blijven zoals ze waren.
  const OUD_MAP = {
    woning: { 1: ['Bungalow · baksteen · 1L'], 2: ['Rijhuis · baksteen · 2L', 'Rijhuis · wit · 2L', 'Rijhuis · natuursteen · 2L', 'Rijhuis · hout · 2L'], 3: ['Rijhuis · baksteen · 3L', 'Stadswoning · wit · 3L'], 4: ['Herenhuis · natuursteen · 4L'], 5: ['Appartementen · beton · 5L'], 6: ['Appartementen · glas · 6L'], 7: ['Woontoren · glas · 7L'] },
    kantoor: { 1: ['Werkplaats · beton · 1L'], 3: ['Kantoor · baksteen · 3L'], 4: ['Kantoor · beton · 4L'], 5: ['Kantoor · glas · 5L'], 7: ['Kantoortoren · glas · 7L'] },
    blok: { 1: ['Blok · beton · 1L'], 2: ['Blok · beton · 2L'] },
    zuilen: { 1: ['Zuilen · galerij · 1L'] }, hof: { 1: ['Hof · muren · 1L'] }, tribune: { 1: ['Tribune · klein'] }, tunnel: { 1: ['Poort · tunnel · 1L'] },
  };
  function oudOmzetten(map) {
    const byName = new Map(libStandard().map(m => [m.name, m])); for (const m of modules) byName.set(m.name, m);
    const roads = (map.paths || []).filter(p => p.t !== 'rot' && PATH_DEF[p.t]).map(p => smoothPts(p.p));
    const isRoad = (q, r) => { const s = map.get(key(q, r)); return !!s && s.some(t => ['weg', 'laan'].includes(baseOf(t))); };
    const facing = (q, r) => {   // draaiing met de deur naar de dichtstbijzijnde straat (zoals in het startstadje)
      const w = cellToWorld(q, r); let best = null, bd = 1e9;
      for (const pts of roads) for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1e-9, t = Math.max(0, Math.min(1, ((w.x - a[0]) * ex + (w.z - a[1]) * ez) / l2)), px = a[0] + ex * t, pz = a[1] + ez * t, dd = Math.hypot(px - w.x, pz - w.z); if (dd < bd) { bd = dd; best = [px - w.x, pz - w.z]; } }
      for (const [dq, dr] of NEIGH) if (isRoad(q + dq, r + dr)) { const o = cellToWorld(q + dq, r + dr), dd = Math.hypot(o.x - w.x, o.z - w.z) - 12; if (dd < bd) { bd = dd; best = [o.x - w.x, o.z - w.z]; } }
      if (!best) best = [-w.x, -w.z];
      return ((Math.round(-Math.atan2(best[1], best[0]) / (Math.PI / 3)) % 6) + 6) % 6;
    };
    let done = 0, kept = 0, mods = 0; if (!map.inst) map.inst = [];
    for (const [k, st] of [...map.entries()]) {
      let s = st.map(baseOf); while (s.length && s[s.length - 1] === 'dak') s.pop();
      const kind = s[0]; if (!s.length || !OUD_MAP[kind] || s.some(t => t !== kind)) { if (s.some(t => OUD_MAP[t])) kept++; continue; }
      const [q, r] = k.split(',').map(Number), sizes = Object.keys(OUD_MAP[kind]).map(Number).sort((a, b) => b - a), h = (q * 7 + r * 13 + 99) % 17, rot = facing(q, r);
      let left = s.length, lv = 0, mir = false; const put = [];
      while (left > 0) { const f = sizes.find(x => x <= left); const nm = OUD_MAP[kind][f]; const m = byName.get(nm[(h + lv) % nm.length]); if (!m) break; put.push({ mid: m.id, m: instData(m, false), q, r, rot, ...(lv ? { lv } : {}) }); lv += f; left -= f; }
      if (left > 0) { kept++; continue; }
      map.delete(k); for (const I of put) map.inst.push(I); done++; mods += put.length;
    }
    return { done, kept, mods };
  }
