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
    // Wat de game zelf nog mist: [lomp, subtiel]. Elke persoon heeft een eigen aard: een deel is lomp, de rest drukt het zachter uit.
    const GAME = [
      ['Geen treinen of metro? Echt niet serieus.', 'Het zou fijn zijn als er ooit een trein kwam...'],
      ['Waar zijn de bussen en trams? Ik moet lopen!', 'Ik vraag me af of er ooit een tram komt.'],
      ['Geen fietsers. Wie heeft dat bedacht?', 'Het zou gezellig zijn met wat fietsers op straat.'],
      ['Er zit geen enkele boot op dat water. Saai.', 'Een bootje op het water zou mooi zijn.'],
      ['Nergens een vliegtuig aan de lucht. Wat een dooie boel.', 'Soms hoop ik een vliegtuig te horen.'],
      ['Ik mag niet eens een gebouw in!', 'Ik ben benieuwd hoe het binnen in die huizen is...'],
      ['Geen honden, geen katten. Wat is dit voor stad?', 'Een hond aan de lijn zou hier mooi staan.'],
      ['Die stad draait om niks: geen geld, geen doel.', 'Soms mis ik een beetje richting in het spel.'],
      ['Waar zijn de winkels, de school, het ziekenhuis?', 'Een winkel op de hoek zou fijn zijn.'],
      ['Er is niks te doen. Geen voetbalveld, geen zwembad.', 'Een sportveld in de buurt zou leuk zijn.'],
      ['Geen standbeeld of iets herkenbaars. Saai.', 'Een mooi standbeeld op het plein, wie weet...'],
      ['Waarom kan ik niet met anderen bouwen?', 'Samen bouwen zou nog leuker zijn.'],
      ['Geen strand? Een stad zonder strand is niks.', 'Ik zou graag een strandje zien.'],
      ['Waar is het geluid van de stad? Het is zo stil.', 'Een beetje muziek op het plein zou fijn zijn.'],
      ['Er zijn geen seizoenen. Altijd hetzelfde.', 'Ik hou van herfstkleuren; die zie ik hier niet.'],
      ['Je hoeft niets te regelen, geen burgemeester? Gek.', 'Zou er een burgemeester zijn voor ons?'],
    ];
    const tone = a => a.tone || (a.tone = ((Math.sin((a.id || 1) * 12.9898) * 43758.5453) % 1 + 1) % 1 < 0.28 ? 'lomp' : 'zacht');
    // Handgeschreven gemis [lomp, subtiel], met de grappigste bovenaan
    const FUNNY = [
      ['Waar haal ik nu mijn flat white? Geen koffietentje hier!', 'Een flat white op het hoekje, dat zou het hem zijn...'],
      ['Er is geen supermarkt hier, moet ik gras gaan eten dan?', 'Ik zocht net een supermarkt... misschien is het gras wel lekker?'],
      ['Waar haal ik de aardappelen nu zonder de markt?', 'Zou er ooit een markt komen voor de aardappelen...'],
      ['Geen bakker. Ik ruik nergens brood. Wat een ellende.', 'Het ruikt hier nergens naar vers brood...'],
      ['Geen frietkot?! Hoe overleef ik de vrijdagavond?', 'Een frietje na een lange dag, dat zou heerlijk zijn...'],
      ['Geen kapper. Ik zie eruit als een hooiberg.', 'Mijn haar zou best een kapper kunnen gebruiken...'],
      ['Waar is de pinautomaat? Ik heb alleen maar bladeren.', 'Ik heb geen contant geld... en geen pinautomaat te zien...'],
      ['Geen toilet te vinden. Dit loopt slecht af.', 'Weet iemand waar hier een toilet is...'],
      ['Geen WiFi. Hoe moet ik nu mijn mails checken?', 'Ik zoek nog steeds een stukje bereik...'],
      ['Waar is mijn pakketje? Geen postbode in deze stad!', 'Ik wacht op een pakketje, maar zie nergens een postbode...'],
      ['Geen fietsenmaker. Mijn band is al drie weken lek.', 'Mijn band is lek, zou hier ergens een fietsenmaker zijn...'],
      ['Geen parkeerplek en geen parkeergarage. Prachtig.', 'Parkeren is hier nog wat lastig...'],
      ['Geen laadpaal. Mijn auto is al zo lang leeg als mijn portemonnee.', 'Een laadpaal zou fijn zijn voor mijn auto...'],
      ['Waar is de Hema? Ik moet worst en een tompouce.', 'Een tompouce, dat zou ik nu wel willen...'],
      ['Waar kan ik een rondje bier halen? Geen kroeg!', 'Een biertje op het terras, dat mis ik nog...'],
      ['Geen terrasje. Waar moet ik dan zitten met mijn kop koffie?', 'Een terrasje zou het perfect maken...'],
      ['Geen snackbar, dus geen frikandel speciaal. Dit is een misdaad.', 'Een frikandel speciaal... zou dat hier ergens zijn...'],
      ['Geen kermis. Hoe krijg ik dan mijn oliebollen?', 'Oliebollen... maar zonder kermis, zucht...'],
      ['Geen bibliotheek, dus geen boeken. Wat denken jullie wel.', 'Een bibliotheek zou hier goed passen...'],
      ['Geen bioscoop. Dan maar kijken naar de muur.', 'Een avondje bioscoop zou best leuk zijn...'],
      ['Geen speeltuin. Mijn kinderen klimmen nu op alles.', 'Mijn kinderen zouden dol zijn op een speeltuin...'],
      ['Geen dierenarts. Mijn kat gaat nu naar de buurman.', 'Mijn kat zou een dierenarts kunnen gebruiken...'],
      ['Geen belastingdienst, dat vind ik nog het enige goede.', 'Eigenlijk best fijn, geen belastingdienst... of toch niet...'],
      ['Geen politie. Wie schrijft mijn parkeerboete uit?', 'Het is wel erg stil zonder politie...'],
      ['Geen brandweer. Ik hoop dat niemand een kaars aansteekt.', 'Ik hoop dat er hier nooit brand uitbreekt...'],
      ['Waar is de glasbak? Ik zit tot mijn nek in lege flessen.', 'Een glasbak zou hier mooi staan...'],
      ['Geen afval ophalen. Ik moet mijn vuilniszak zelf begraven.', 'Mijn vuilnis staat al weken, zou er een vuilniswagen komen...'],
      ['Geen kerstmarkt. December wordt droevig.', 'Ik denk al aan de kerstmarkt, helaas...'],
      ['Geen speciaalbier. Alleen water uit de gracht.', 'Een lokaal biertje, daar zou ik voor in de rij staan...'],
      ['Waar zijn de ijsjes? Het is toch zomer?', 'Een ijsje, dat zou ik nu willen...'],
      ['Geen carnaval. Nu kan ik mijn pak niet kwijt.', 'Mijn carnavalspak hangt nog in de kast...'],
      ['Geen tankstation. Ik loop leeg, net als mijn humeur.', 'Ik zoek nog een plek om te tanken...'],
      ['Waar is het openbaar vervoer? Mijn benen zijn op.', 'Mijn benen zijn moe, zou er een bus rijden...'],
      ['Geen tuincentrum. Mijn plantjes zijn dood.', 'Mijn plantjes zouden een tuincentrum waarderen...'],
      ['Een stad zonder IKEA. Hoe moet ik mijn kast in elkaar zetten?', 'Hier ergens een IKEA zou ik lang rondlopen...'],
      ['Geen pannenkoekenhuis. Wat een stad.', 'Pannenkoeken met spek en stroop, dat zou ik nu willen...'],
      ['Geen stroopwafels! Wat een barbarij.', 'Een warme stroopwafel is hier te vinden, hoop ik...'],
      ['Waar is de bruine kroeg? Ik wil klagen met een biertje.', 'Een bruine kroeg zou de stad zo gezellig maken...'],
      ['Geen postkantoor. Hoe verstuur ik mijn brief naar tante Ria?', 'Mijn brief aan tante Ria ligt nog klaar...'],
      ['Waar zijn de eendjes? Geen vijver zonder eendjes!', 'Eendjes in de vijver, dat zou mooi zijn...'],
      ['Geen tandarts. Ik blijf maar op mijn kiezen bijten.', 'Mijn kies zeurt een beetje, zou hier een tandarts zijn...'],
      ['Geen kledingwinkel. Ik loop al weken in dezelfde broek.', 'Ik zou graag een nieuwe jas willen, maar waar...'],
    ];
    // Generator: dingen die een stad nodig heeft; '*' = zonder lidwoord (meervoud of stofnaam)
    const MISSING = ('koffietentje|kapper|bakker|slager|groenteboer|supermarkt|markt|*stroopwafels|*bitterballen|*verse croissants|*haring|cafetaria|snackbar|frietkot|ijssalon|pannenkoekenhuis|pizzeria|sushirestaurant|shoarmazaak|döner-tent|vegaburgertent|pinautomaat|bankfiliaal|postkantoor|apotheek|huisarts|tandarts|dierenarts|ziekenhuis|school|kinderopvang|bibliotheek|museum|theater|bioscoop|karaokebar|discotheek|bruine kroeg|biercafé|wijnbar|terras|*terrasjes|speeltuin|skatepark|voetbalveld|tennisbaan|zwembad|sauna|sportschool|yogastudio|klimhal|bowlingbaan|casino|kermis|pretpark|dierentuin|kinderboerderij|vijver met eendjes|eendenkooi|hondenuitlaatplek|dierenwinkel|bloemist|tuincentrum|bouwmarkt|ijzerhandel|schoenmaker|stomerij|wasserette|kringloopwinkel|tweedehandsboekwinkel|platenzaak|speelgoedwinkel|fietsenmaker|autogarage|tankstation|laadpaal|parkeergarage|taxistandplaats|busstation|treinstation|tramhalte|metrolijn|veerpont|haven|*bootjes|jachthaven|vliegveld|helikopterplatform|fietsenstalling|*bankjes|*prullenbakken|glasbak|openbaar toilet|drinkfontein|fontein|standbeeld|kunstwerk|muurschildering|*graffiti|bandstand|muziektent|marktkraam|bakkerij met vers brood|bezorger|pakketpunt|*zebrapaden|rotonde met kunst|verkeersagent|politiebureau|brandweerkazerne|ambulance|gemeentehuis|burgemeester|stadsomroeper|stadswacht|hoveniers-bedrijf|straatveger|vuilnisman|*wifi|*5G-bereik|telefooncel|kerk|moskee|synagoge|tempel|begraafplaats|crematorium|huwelijksbootje|trouwlocatie|camping|hotel|hostel|bed & breakfast|toeristeninformatie|souvenirwinkel|ansichtkaart|kermisbotsauto|draaimolen|reuzenrad|rodelbaan|schaatsbaan|*ijsvloer|strandje|*palmbomen|*bloemperken|*kerstverlichting|kerstboom|sinterklaasintocht|oranjefeest|carnavalsoptocht|bakfiets|*steegjes|*fietspaden met bloemen|*meeuwen|*duiven|*eekhoorns|kat in het raam|hond aan de lijn|brug met slotjes|*zwanen|kaasboer|poffertjeskraam|oliebollenkraam|kebabkraam|ijscoman|bloemenkiosk|krantenkiosk|*kranten|tabakszaak|*sigaren|slijterij|drogist|opticien|juwelier|horlogemaker|naaiatelier|stoffenwinkel|breiwinkel|hobbywinkel|spellenwinkel|stripwinkel|comicshop|computerwinkel|telefoonwinkel|elektronicazaak|koffiebranderij|theewinkel|chocolatier|banketbakker|notarisbureau|makelaar|verzekeringskantoor|uitzendbureau|coworking-ruimte|startup-hub|hackerspace|repair café|buurthuis|jongerencentrum|seniorencomplex|wijkcentrum|speeltuinvereniging|schaakclub|biljartclub|*vogelhuisjes|*nestkastjes|imker|*bijenhotels|moestuin|kasteel|windmolen|watertoren|vuurtoren|brandtrap|dakterras|zonnepaneel-veld|*bomen langs de weg|speelweide|picknickplek|barbecueplek|*stoplichten die altijd groen zijn|parkeerwachter|bushokje|*regenbogen|*wolken die ook echt regenen|zonsopgang-uitkijkpunt|sterrenwacht|planetarium|aquarium|*vlinders|*kikkers|ijsbaan|skipiste|*bergen|*strandstoelen|duinen|*schapen op het gras|*koeien in de wei|kippenhok').split('|');
    const art = x => x[0] === '*' ? x.slice(1) : 'een ' + x;
    const mass = x => x[0] === '*' ? x.slice(1) : x;
    const GEN_BLUNT = [x => `Geen ${mass(x)}?! Wie heeft deze stad bedacht?`, x => `Een stad zonder ${mass(x)}? Dat is toch geen stad.`, x => `Jullie vergaten ${mass(x)}. Weer.`, x => `Geen ${mass(x)}. Dit is gewoon een schande.`, x => `Zonder ${mass(x)} word ik hier echt niet gelukkig.`, x => `Ik mis ${mass(x)} enorm. Doe er wat aan!`];
    const GEN_SOFT = [x => `Zou er ooit ${art(x)} komen...`, x => `Met ${art(x)} zou het hier nog fijner zijn...`, x => `Ik denk soms aan ${art(x)}, zou dat hier kunnen...`, x => `Stilletjes hoop ik op ${art(x)}...`, x => `Misschien is er ergens ${art(x)}, ik heb nog niet gezocht...`];
    function funnyPick(a) {
      const lomp = tone(a) === 'lomp';
      if (Math.random() < 0.4) { const f = FUNNY.filter(([l]) => !recent.includes(l)); if (f.length) { const [l, z] = f[Math.floor(Math.random() * f.length)]; recent.push(l); return lomp ? l : z; } }
      const x = MISSING[Math.floor(Math.random() * MISSING.length)], g = lomp ? GEN_BLUNT : GEN_SOFT;
      return g[Math.floor(Math.random() * g.length)](x);
    }
    const WET = ['Wat een rotweer...', 'Kon ik maar naar binnen!', 'Fijn, een buitje... niet.', 'Snel naar huis!'];
    const SNOW = ['Wat mooi, sneeuw!', 'Een witte stad, prachtig.'];
    const NIGHT = ['De stad is mooi bij nacht.', 'Zo stil in het donker.'];
    const NEUTRAL = ['Mooie dag voor een wandeling.', 'Even de benen strekken.', 'Ik vraag me af wat ze hier nog gaan bouwen.', 'Wat zou hier nog komen?'];
    const HI = ['Hoi!', 'Goedemorgen!', 'Hé, hallo!', 'Hallo daar!'];
    // Totale chaos: paniek en verwarring. Een deel hangt af van wat er echt gebeurt (brand, instortingen, gewonden).
    const PANIC = ['HELP!', 'Rennen!!', 'Wat gebeurt er?!', 'Pas op, een auto!', 'Ze rijden gewoon door rood!', 'Mama!!', 'Bel de politie!', 'Weg hier!', 'Waar moet ik heen?!',
      'Links! Nee, rechts! Nee...', 'Iedereen naar binnen!', 'Is dit een film?', 'Ik had vandaag thuis moeten blijven.', 'Wie rijdt er nou zo?!', 'Mijn boodschappen!',
      'Ik ben mijn hond kwijt!', 'Is dit normaal hier?', 'Waar is de stoep gebleven?', 'Ik dacht dat dit een rustige buurt was.', 'Niet weer...', 'Wat is dit voor stad?!',
      'Wie heeft deze stad ontworpen?!', 'Ik wil naar huis!', 'Waar is de uitgang van deze stad?', 'Is er iemand gewond?', 'Help, ik zie niks!', 'Was dat nou een vrachtwagen?',
      'Iemand moet hier iets aan doen!', 'Ik weet niet meer welke kant op!', 'AAAAH!', 'Ren voor je leven!', 'Waar is mijn fiets?', 'Het is het einde van de wereld!'];
    const PANIC_FIRE = ['Brand! Er staat een auto in brand!', 'Ik ruik rook...', 'Daar ontplofte iets!', 'Blijf weg bij die auto, hij gaat ontploffen!'];
    const PANIC_FALL = ['Dat huis stort in!', 'Mijn huis! MIJN HUIS!', 'Waarom staat dat gebouw scheef?', 'Pas op, vallende stenen!'];
    const chaosOn = () => typeof cars !== 'undefined' && cars.reckless;
    function panicPick() {
      const extra = [];
      if (cars.list && cars.list.some(c => c.burn || (c.hp ?? 100) < 35)) extra.push(...PANIC_FIRE);
      if (typeof collapse !== 'undefined' && collapse.stats().modules) extra.push(...PANIC_FALL);
      const pool = extra.length && Math.random() < 0.45 ? extra : PANIC, ok = pool.filter(t => !recent.includes(t)), L = ok.length ? ok : pool;
      const t = L[Math.floor(Math.random() * L.length)]; recent.push(t); if (recent.length > 40) recent.shift(); return t;
    }
    function pick(a) {
      const n = review;
      if (chaosOn()) return panicPick();
      if (WXK.snow > 0.3 && Math.random() < 0.5) return SNOW[Math.floor(Math.random() * SNOW.length)];
      if (WXK.rain > 0.3 && Math.random() < 0.6) return WET[Math.floor(Math.random() * WET.length)];
      if (typeof nightK !== 'undefined' && nightK > 0.7 && Math.random() < 0.25) return NIGHT[Math.floor(Math.random() * NIGHT.length)];
      if (Math.random() < 0.4) { if (Math.random() < 0.18) { const g = GAME.filter(([l, z]) => !recent.includes(l)); if (g.length) { const [l, z] = g[Math.floor(Math.random() * g.length)]; recent.push(l); if (recent.length > 40) recent.shift(); return tone(a) === 'lomp' ? l : z; } } const t0 = funnyPick(a); recent.push(t0); if (recent.length > 40) recent.shift(); return t0; }
      const ok = LINES.filter(([t, f]) => !recent.includes(t) && f(n));
      const t = ok.length ? ok[Math.floor(Math.random() * ok.length)][0] : NEUTRAL[Math.floor(Math.random() * NEUTRAL.length)];
      recent.push(t); if (recent.length > 40) recent.shift();
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
    const GOOD = new Set([...LINES.slice(0, 12).map(l => l[0]), ...SNOW, ...NIGHT, ...HI]);
    const moodOf = t => GOOD.has(t) ? 'pos' : (/(\?|\.\.\.)$/.test(t) || NEUTRAL.includes(t)) ? 'mid' : 'neg';
    function opine(a) {
      const now = performance.now();
      if (now - reviewT > 6000 || !review) { review = measure(); reviewT = now; }
      const text = pick(a); if (!text) return 0;
      const dur = Math.max(1.8, Math.min(4.8, 1.2 + text.length * 0.07));
      return say(a, text, dur, (chaosOn() && (PANIC.includes(text) || PANIC_FIRE.includes(text) || PANIC_FALL.includes(text)) ? 'neg panic' : moodOf(text)) + (tone(a) === 'lomp' ? ' lomp' : '')) ? dur : 0;
    }
    function greet(a) { if (live.length >= MAXB - 2) return; if (chaosOn()) { say(a, panicPick(), 1.8, 'neg panic'); return; } say(a, HI[Math.floor(Math.random() * HI.length)], 1.4, 'hi pos'); }
    const v = new THREE.Vector3();
    function update(dt) {
      const cp = camera.position;
      // af en toe een opmerking van iemand dichtbij die toch niet in een praatje zit
      idleT -= dt;
      const chaosNow = chaosOn();
      if (idleT <= 0 && live.length < (chaosNow ? 5 : 3) && people.agents && people.agents.length) {
        idleT = chaosNow ? 0.8 + Math.random() * 1.6 : 4 + Math.random() * 5;   // in de chaos roept iedereen door elkaar
        const near = people.agents.filter(a => a.id && a.state === 'walk' && !a.chatT && Math.hypot(a.x - cp.x, a.z - cp.z) < RANGE * 0.75 && Math.abs(a.y - cp.y) < 60);
        if (near.length) {
          const a = near[Math.floor(Math.random() * near.length)];
          const dur = opine(a); if (dur && chaosNow) sound.scream(a.x, a.y + 1.6 * (a.scale || 1), a.z, 'kort', a.kid ? 'k' : a.female ? 'v' : a.old ? 'o' : 'm'); else if (dur) sound.talk(a.x, a.y + 1.5 * (a.scale || 1), a.z, dur * 0.8, a.voice || 1);
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
