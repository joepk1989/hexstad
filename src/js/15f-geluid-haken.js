  // ---------- Geluid bij bouwen, slopen en knoppen ----------
  // Bouwen en slopen lopen langs veel wegen (blokken, modules, wegen, randen, driehoeken, de hamer in de loopstand). In plaats van
  // overal een geluid in te bouwen, vergelijken we vóór en na een bouwactie hoeveel er in de stad staat: meer = plaatsen, minder =
  // slopen, gelijk maar met een melding 'Gedraaid' of een dak = draaien, gelijk met een andere melding = kan niet.
  {
    const count = () => {
      let n = 0; for (const v of cells.values()) n += Array.isArray(v) ? v.length : 1;
      const cnt = o => !o ? 0 : Array.isArray(o) ? o.length : o instanceof Map ? o.size : typeof o === 'object' ? Object.keys(o).length : 0;
      return n + cnt(cells.inst) * 7 + cnt(cells.paths) * 13 + cnt(cells.edges) * 3 + cnt(cells.tris) * 5;
    };
    let lastToast = '';
    const toast0 = toast; toast = function (msg, ms) { lastToast = String(msg || ''); return toast0(msg, ms); };
    const wrap = fn => function (...args) {
      const before = count(); lastToast = '';
      const res = fn.apply(this, args);
      const after = count();
      if (after > before) sound.fx('place');
      else if (after < before) sound.fx('remove');
      else if (/Gedraaid|Dak|draai/i.test(lastToast)) sound.fx('rotate');
      else if (/kan |niet|al een|geen /i.test(lastToast)) sound.fx('deny');
      return res;
    };
    place = wrap(place); eraseAt = wrap(eraseAt); removeTop = wrap(removeTop); walkAction = wrap(walkAction);
    // nieuwe stad (start, generator, bestand): een oplopend akkoordje
    const doAct0 = doAct; doAct = function (act, ...rest) { const r = doAct0(act, ...rest); if (/^(gen:|start|stad|file|mall|empty|ringstad)/.test(String(act))) sound.fx('gen'); return r; };
    // knoppen in de interface: een zacht tikje
    document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button, .btn, [role="button"]')) sound.fx('click'); }, true);
  }
