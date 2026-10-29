  // ---------- Beta: versie, feedback, foutmelding, stad als bestand, credits ----------
  // Alles wat nodig is voor de besloten test (zie het beta-plan): een zichtbaar versienummer, een feedbackknop die het
  // formulier opent (met de gegevens van je apparaat en de laatste fout om te plakken), een melding bij een fout in plaats
  // van een vastgelopen scherm, je stad bewaren en openen als bestand, en een credits-scherm.
  const beta = (() => {
    const VERSIE = '0.1.0-beta';
    // Het formulier voor de testers. Leeg: dan gaat Feedback naar een nieuw bericht op GitHub (daar is een account voor nodig).
    const FEEDBACK_URL = '';
    const FALLBACK_URL = 'https://github.com/joepk1989/raatstad/issues/new';
    let lastErr = '', lastShow = -1e9;
    const device = () => {
      const ua = navigator.userAgent, b = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'onbekende browser';
      const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
      return b + (os ? ' op ' + os : '') + ' · scherm ' + window.innerWidth + '×' + window.innerHeight + ' · ' + (document.body.classList.contains('coarse') ? 'aanraken' : 'muis');
    };
    const info = () => 'Raatstad ' + ((document.querySelector('#sheet .ver') || {}).textContent || VERSIE) + '\n' + device() + (lastErr ? '\nLaatste fout: ' + lastErr : '');
    // ---------- vensters ----------
    function makeSheet(id, html) {
      let el = document.getElementById(id); if (el) return el;
      el = document.createElement('div'); el.className = 'sheet'; el.id = id; el.hidden = true;
      el.innerHTML = '<div class="sheet-card" role="dialog">' + html + '</div>';
      el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) el.hidden = true; });
      document.body.appendChild(el); return el;
    }
    function feedback() {
      const el = makeSheet('fbSheet', `<h2>Feedback</h2>
        <p>Wat ging er mis, waar liep je vast, of wat vond je leuk? Alles helpt. Plak in het formulier ook de gegevens hieronder, dan weet ik op welk apparaat het was.</p>
        <pre class="fb-info" id="fbInfo"></pre>
        <div class="welcome-btns" style="grid-template-columns:1fr 1fr">
          <button class="btn mbtn" type="button" id="fbCopy"><span class="lbl"><b>Gegevens kopiëren</b><small>Versie, apparaat, laatste fout</small></span></button>
          <a class="btn mine" id="fbGo" target="_blank" rel="noopener"><span class="lbl"><span>Naar het formulier</span><small>Opent in een nieuw tabblad</small></span></a>
        </div>
        <button class="btn" type="button" data-close>Sluiten</button>`);
      el.querySelector('#fbInfo').textContent = info();
      const url = FEEDBACK_URL || (FALLBACK_URL + '?title=' + encodeURIComponent('Feedback ' + VERSIE) + '&body=' + encodeURIComponent('Wat gebeurde er?\n\n\n---\n' + info()));
      el.querySelector('#fbGo').href = url;
      el.querySelector('#fbCopy').onclick = () => { try { navigator.clipboard.writeText(info()).then(() => toast('Gekopieerd', 1200), () => toast('Kopiëren mislukt', 1600)); } catch (e) { toast('Kopiëren mislukt', 1600); } };
      el.hidden = false;
    }
    function credits() {
      const el = makeSheet('crSheet', `<h2>Credits</h2>
        <p class="welcome-sub">Raatstad ${VERSIE}</p>
        <p><b>Ontwerp en idee</b><br>Joep, Eindhoven. Het ontwerp, de maten en de modules zijn eigen werk.</p>
        <p><b>Code</b><br>Geschreven met hulp van AI (Claude, van Anthropic). Er zitten geen door AI gemaakte afbeeldingen, stemmen of teksten in het spel.</p>
        <p><b>Gebruikt</b><br>three.js (MIT-licentie) voor de 3D-weergave · lettertypen Big Shoulders Display en Atkinson Hyperlegible (SIL Open Font License, via Google Fonts).</p>
        <p><b>Geluiden</b><br>Bijna alle geluiden worden in het spel zelf gemaakt (Web Audio). Opnames: vogels, klap, kreunen en schreeuwen (vogels.mp3, klap.mp3, grunts.mp3, schreeuw.mp3); bron en licentie volgen.</p>
        <p><b>Testers</b><br>Iedereen die meespeelt in de beta: dank je wel!</p>
        <button class="btn" type="button" data-close>Sluiten</button>`);
      el.hidden = false;
    }
    // ---------- stad als bestand ----------
    function saveFile() {
      const d = new Date(), pad = n => String(n).padStart(2, '0'), name = 'raatstad-stad-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
      const blob = new Blob([serialize(cells)], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Stad opgeslagen als ' + name, 2400);
    }
    function openFile() {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,text/plain';
      inp.onchange = () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        f.text().then(t => {
          const m = parseCity((t || '').trim());
          if (!m || !m.size && !(m.paths && m.paths.length) && !(m.inst && m.inst.length)) return toast('Dit bestand is geen Raatstad-stad', 2400);
          INC.reset(); collapse.reset(); cells = roofHouses(m); document.getElementById('sheet').hidden = true; rebuildAll(); changed(); buildPathNet();
          toast('Stad geopend: ' + f.name, 2200);
        }, () => toast('Openen mislukt', 2000));
      };
      inp.click();
    }
    // ---------- fouten: een melding in plaats van een vastgelopen scherm ----------
    const bar = document.createElement('div'); bar.className = 'err-bar'; bar.hidden = true;
    bar.innerHTML = '<span>Er ging iets mis. Meld het via Feedback, dan los ik het op.</span><button class="btn" type="button" data-f>Feedback</button><button class="btn icon-btn" type="button" data-x aria-label="Sluiten">✕</button>';
    document.body.appendChild(bar);
    bar.querySelector('[data-f]').onclick = () => { bar.hidden = true; feedback(); };
    bar.querySelector('[data-x]').onclick = () => { bar.hidden = true; };
    function report(e) {
      const msg = e && (e.stack || e.message) ? String(e.message || e) + (e.stack ? ' @ ' + String(e.stack).split('\n').slice(1, 3).map(s => s.trim()).join(' · ') : '') : String(e);
      lastErr = msg.slice(0, 400); try { console.error('Raatstad', e); } catch (e2) { }
      const now = performance.now(); if (now - lastShow < 30000) return; lastShow = now; bar.hidden = false;
    }
    window.addEventListener('error', ev => report(ev.error || ev.message));
    window.addEventListener('unhandledrejection', ev => report(ev.reason));
    // ---------- korte uitleg bij elke knop (muisaanwijzer, of lang aanraken) ----------
    const TIPS = {
      'tool-vrot': 'Rotonde: klik op een vak; wegen die erin uitkomen sluiten erop aan',
      'tool-spoor': 'Spoor: klik vak na vak; de uiteinden lopen door tot voorbij de horizon. Een treinstation ernaast wordt een halte',
      'tool-pad': 'Pad: sleep een voetpad over de vakken', 'tool-fietspad': 'Fietspad: sleep over de vakken', 'tool-looppad': 'Looppad: een verhoogd pad van 3 m, slepen',
      'tool-randpad': 'Randpad: een pad over de rand tussen twee vakken', 'tool-trap': 'Trap: klik nog eens om te draaien (R)', 'tool-trappad': 'Trappad: een pad met een trap omhoog',
      'tool-woning': 'Woning: tik op een vak; nog eens tikken stapelt een verdieping', 'tool-kantoor': 'Kantoor: tik op een vak; nog eens tikken stapelt een verdieping',
      'tool-dak': 'Dak: op een woning of kantoor; nog eens tikken geeft een dakkapel', 'tool-park': 'Park: tik op een park voor een andere inrichting',
      'tool-meer': 'Meer: water met natuurlijke oevers, slepen', 'tool-water': 'Gracht: water met kades, slepen',
      'tool-tophoog': 'Ophogen: ingedrukt houden; per 3 m (Instellingen → Terreinstap). Rechts of Shift: andersom', 'tool-tafgraaf': 'Afgraven: ingedrukt houden; per 3 m. Rechts of Shift: andersom',
      'tool-tvlak': 'Egaliseren: links naar het gemiddelde, rechts naar de hoogte van het startvak', 'tool-tglad': 'Gladstrijken: scherpe overgangen worden zacht',
      'tool-thelling': 'Helling trekken: sleep van de hoge naar de lage kant', 'tool-kuil': 'Uitgraving: 3 m omlaag', 'tool-helling': 'Helling: een oprit van 3 m', 'tool-hofhelling': 'Opgang: een brede oprit van 3 m',
      menuBtn: 'Menu: steden, opslaan, Raatbouwer, instellingen, feedback', optPeople: 'Mensen aan of uit', optCars: "Auto's aan of uit",
      recklessBtn: 'Totale chaos: roekeloze auto’s en paniek (met geweld, standaard uit)', jumpBtn: 'Springen (spatie)', placeBtn: 'Bouwen op het puntje in het midden', undoBtn: 'Ongedaan maken (Ctrl+Z)', todAutoBtn: 'De tijd loopt vanzelf door, of staat stil',
    };
    function applyTips() {
      for (const id in TIPS) { const el = document.getElementById(id); if (el && (!el.title || el.title === (el.textContent || '').trim() || /^[A-Z][a-z ']+$/.test(el.title))) el.title = TIPS[id]; }
      for (const b of document.querySelectorAll('.pal-tab')) if (!b.title) b.title = 'Tabblad ' + b.textContent.trim() + ': gereedschap en modules';
      const tod = document.querySelectorAll('[data-tod]'); for (const b of tod) if (!b.title) b.title = 'Zet de tijd op ' + b.textContent.trim().toLowerCase();
    }
    applyTips(); setTimeout(applyTips, 1500);
    return { VERSIE, feedback, credits, saveFile, openFile, report, info };
  })();
