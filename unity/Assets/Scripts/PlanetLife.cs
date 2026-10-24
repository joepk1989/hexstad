using System.Collections.Generic;
using UnityEngine;

// Leven op de planeet: mensen lopen over de stoepen van wegvak naar wegvak (rechts houden), groeten elkaar,
// doen een praatje (met brabbeltaal en spreekballon) en groeten de speler. Auto's rijden over het asfalt.
// Alles staat recht op de bol: "omhoog" is de richting vanuit het middelpunt.
public class PlanetLife : MonoBehaviour
{
    public static PlanetLife I;
    public readonly List<Person> People = new List<Person>();
    class Car { public Transform root; public int a, b, c, n; public float s, speed, v; public AudioSource audio; public Vector3 fwd; }   // rijdt over een boog: rand(a,b) → hart b → rand(b,c)
    readonly List<Car> cars = new List<Car>();
    public int CarCount => cars.Count;
    readonly List<int> roads = new List<int>(), walks = new List<int>();
    static AudioClip hum;
    public static void ResetStatics() { hum = null; }
    float roadsT, spawnT, idleT = 4f;
    PlanetWalker walker;
    static readonly Color[] Paint = { new Color(0.8f, 0.2f, 0.2f), new Color(0.2f, 0.4f, 0.75f), new Color(0.9f, 0.85f, 0.3f), new Color(0.9f, 0.9f, 0.92f), new Color(0.2f, 0.2f, 0.22f), new Color(0.25f, 0.6f, 0.4f) };

    void Awake() { I = this; }

    void RefreshRoads()
    {
        roads.Clear(); walks.Clear(); foreach (var kv in PlanetCity.Cells) { if (kv.Value.Count > 0 && kv.Value[0] == "weg") { roads.Add(kv.Key); walks.Add(kv.Key); } else if (kv.Value.Count == 1 && kv.Value[0] == "pad") walks.Add(kv.Key); }
    }

    // volgend wegvak vanaf a, liefst niet terug naar prev
    static int NextRoad(int a, int prev, bool walk = false)
    {
        var opts = new List<int>(6); foreach (int j in PlanetCity.Partners(a)) if ((walk ? PlanetCity.IsWalk(j) : PlanetCity.IsRoad(j)) && j != prev) opts.Add(j);
        if (opts.Count == 0) return prev >= 0 && (walk ? PlanetCity.LinkedWalk(a, prev) : PlanetCity.LinkedRoad(a, prev)) ? prev : a;
        return opts[Random.Range(0, opts.Count)];
    }

    // plek op de bol tussen vak a en b, met een zijwaartse afstand (rechts van de looprichting)
    static void Where(int a, int b, float t, float side, float h, out Vector3 pos, out Vector3 fwd, out Vector3 up)
    {
        Vector3 da = Planet.Cells[a].dir, db = Planet.Cells[b].dir;
        Vector3 d = a == b ? da : Vector3.Slerp(da, db, t); up = d.normalized;
        Vector3 chord = a == b ? Planet.Cells[a].north : (db - da) * Planet.R;
        fwd = (chord - up * Vector3.Dot(chord, up)); if (fwd.sqrMagnitude < 1e-8f) fwd = Planet.Cells[a].east; fwd.Normalize();
        Vector3 right = Vector3.Cross(up, fwd);
        pos = up * (Planet.R + h) + right * side;
    }

    Person SpawnPerson()
    {
        var a = global::People.MakePerson(transform);
        a.cellA = walks[Random.Range(0, walks.Count)]; a.prevCell = -1; a.cellB = NextRoad(a.cellA, -1, true); a.ct = Random.value;
        PlacePerson(a, 0f); return a;
    }

    void PlacePerson(Person a, float dt)
    {
        float side = PlanetCity.IsRoad(a.cellA) && PlanetCity.IsRoad(a.cellB) ? 3.5f : (PlanetCity.IsRoad(a.cellA) || PlanetCity.IsRoad(a.cellB)) ? 1.8f : 0.35f;
        Where(a.cellA, a.cellB, a.ct, side, 0.12f, out Vector3 pos, out Vector3 fwd, out Vector3 up);
        a.root.position = pos;
        if (a.paused && a.partner != null) { Vector3 to = a.partner.root.position - pos; to -= up * Vector3.Dot(to, up); if (to.sqrMagnitude > 1e-6f) fwd = to.normalized; }
        Quaternion target = Geo.Look(fwd, up);
        a.root.rotation = dt <= 0f ? target : Quaternion.Slerp(a.root.rotation, target, Mathf.Min(1f, dt * 6f));
    }

    Car SpawnCar()
    {
        var c = new Car { b = roads[Random.Range(0, roads.Count)], speed = 7f + Random.value * 4f, s = Random.value };
        c.a = NextRoad(c.b, -1); c.c = NextRoad(c.b, c.a); c.n = NextRoad(c.c, c.b); c.v = c.speed;
        var root = new GameObject("Auto").transform; root.SetParent(transform, false); c.root = root; root.gameObject.layer = Layers.Mens;
        int k = Random.Range(0, Paint.Length);
        Box(root, new Vector3(0, 0.55f, 0), new Vector3(1.8f, 0.6f, 4.2f), Mats.Get("auto" + k, Paint[k]));
        Box(root, new Vector3(0, 1.1f, -0.2f), new Vector3(1.5f, 0.5f, 2.2f), Mats.Get("autoglas", new Color(0.18f, 0.25f, 0.32f)));
        Box(root, new Vector3(0, 0.25f, 1.3f), new Vector3(1.9f, 0.3f, 0.5f), Mats.Get("autowiel", new Color(0.1f, 0.1f, 0.1f)));
        Box(root, new Vector3(0, 0.25f, -1.3f), new Vector3(1.9f, 0.3f, 0.5f), Mats.Get("autowiel", new Color(0.1f, 0.1f, 0.1f)));
        if (hum == null) hum = MakeHum();
        c.audio = root.gameObject.AddComponent<AudioSource>(); c.audio.clip = hum; c.audio.loop = true; c.audio.spatialBlend = 1f; c.audio.rolloffMode = AudioRolloffMode.Linear; c.audio.minDistance = 4f; c.audio.maxDistance = 70f; c.audio.volume = 0.35f; c.audio.pitch = 0.9f + c.speed / 25f; c.audio.Play();
        PlaceCar(c, 0f); return c;
    }

    // Elektrisch gezoem: zaagtand met een kwint erboven, laag gefilterd, plus wat bandengeruis
    static AudioClip MakeHum()
    {
        int sr = 22050, n = sr * 2; var d = new float[n]; var rnd = new System.Random(5); float ph1 = 0, ph2 = 0, lp = 0, nz = 0;
        for (int i = 0; i < n; i++)
        {
            ph1 += 110f / sr; if (ph1 > 1f) ph1 -= 1f; ph2 += 165f / sr; if (ph2 > 1f) ph2 -= 1f;
            float x = (ph1 * 2f - 1f) * 0.5f + Mathf.Sin(ph2 * 6.2832f) * 0.4f; lp += 0.06f * (x - lp);
            float w = (float)rnd.NextDouble() * 2f - 1f; nz += 0.12f * (w - nz);
            d[i] = lp * 0.8f + nz * 0.25f;
        }
        var clip = AudioClip.Create("zoem", n, 1, sr, false); clip.SetData(d, 0); return clip;
    }

    static void Box(Transform parent, Vector3 pos, Vector3 size, Material m)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube); Destroy(go.GetComponent<Collider>());
        go.transform.SetParent(parent, false); go.transform.localPosition = pos; go.transform.localScale = size; go.GetComponent<MeshRenderer>().sharedMaterial = m;
    }

    // Positie op de boog door vak b: een kwadratische Bézier van het midden van rand a-b, via het hart van b, naar het midden van rand b-c.
    // Rechtdoor is dat een rechte lijn; in een bocht van 60° een vloeiende boog. De auto houdt rechts (zijwaarts langs de raaklijn).
    // Rijrichting op de rand tussen x en y: langs de schuine weg als een van beide een schuin recht stuk is, anders van hart naar hart
    static Vector3 EdgeDir(int x, int y)
    {
        Vector3 cc = (Planet.Cells[y].dir - Planet.Cells[x].dir).normalized, w;
        if (PlanetCity.ChordDirWorld(y, out w) || PlanetCity.ChordDirWorld(x, out w)) return Vector3.Dot(w, cc) < 0f ? -w : w;
        return cc;
    }
    // Positie op de weg door vak b: een kubische Bézier van het midden van rand a-b naar het midden van rand b-c, met als
    // raaklijnen de rijrichting op die randen. Recht of schuin recht wordt een rechte lijn; een bocht een vloeiende boog die
    // precies op het asfalt blijft. De auto houdt rechts (zijwaarts langs de raaklijn).
    static void Arc(int a, int b, int cc, float s, float side, float h, out Vector3 pos, out Vector3 fwd, out Vector3 up)
    {
        Vector3 P0 = ((Planet.Cells[a].dir + Planet.Cells[b].dir) * 0.5f).normalized, P3 = ((Planet.Cells[b].dir + Planet.Cells[cc].dir) * 0.5f).normalized;
        Vector3 t0 = EdgeDir(a, b), t3 = EdgeDir(b, cc); float k = Vector3.Distance(P0, P3) * 0.4f;
        Vector3 P1 = P0 + t0 * k, P2 = P3 - t3 * k;
        if (a == cc) { P1 = Planet.Cells[b].dir + t0 * k * 0.5f; P2 = Planet.Cells[b].dir - t3 * k * 0.5f; }   // keren: lus door het hart
        float u = 1f - s;
        Vector3 d = P0 * (u * u * u) + P1 * (3f * u * u * s) + P2 * (3f * u * s * s) + P3 * (s * s * s); up = d.normalized;
        Vector3 tan = (P1 - P0) * (3f * u * u) + (P2 - P1) * (6f * u * s) + (P3 - P2) * (3f * s * s);
        fwd = tan - up * Vector3.Dot(tan, up); if (fwd.sqrMagnitude < 1e-12f) fwd = Planet.Cells[b].north; fwd.Normalize();
        Vector3 right = Vector3.Cross(up, fwd);
        pos = up * (Planet.R + h) + right * side;
    }
    static float ArcLen(int a, int b, int cc) => (Vector3.Distance(Planet.Cells[a].dir, Planet.Cells[b].dir) + Vector3.Distance(Planet.Cells[b].dir, Planet.Cells[cc].dir)) * 0.5f * Planet.R;
    static float Bend(int a, int b, int cc)   // 0 = rechtdoor, 1 = haakse of scherpere bocht
    {
        Vector3 d1 = (Planet.Cells[b].dir - Planet.Cells[a].dir).normalized, d2 = (Planet.Cells[cc].dir - Planet.Cells[b].dir).normalized;
        return Mathf.Clamp01(Mathf.Acos(Mathf.Clamp(Vector3.Dot(d1, d2), -1f, 1f)) * Mathf.Rad2Deg / 90f);
    }

    void PlaceCar(Car c, float dt)
    {
        Arc(c.a, c.b, c.c, c.s, 1.25f, 0.16f, out Vector3 pos, out Vector3 fwd, out Vector3 up);
        c.root.position = pos; c.fwd = fwd; Quaternion target = Geo.Look(fwd, up);
        c.root.rotation = dt <= 0f ? target : Quaternion.Slerp(c.root.rotation, target, Mathf.Min(1f, dt * 10f));
    }

    // Snelheid: afremmen voor een bocht en voor een auto vlak vooruit; weer optrekken op een recht stuk
    void DriveCar(Car c, float dt)
    {
        float want = c.speed * Mathf.Lerp(1f, 0.45f, Mathf.Max(Bend(c.a, c.b, c.c) * (c.s < 0.6f ? 1f : 0.3f), c.s > 0.6f ? Bend(c.b, c.c, c.n) : 0f));
        foreach (var o in cars)
        {
            if (o == c) continue; Vector3 d = o.root.position - c.root.position; float ahead = Vector3.Dot(d, c.fwd);
            if (ahead < 0.5f || ahead > 11f) continue; float lat = (d - c.fwd * ahead).magnitude; if (lat > 2.2f) continue;
            want = Mathf.Min(want, Mathf.Max(0f, (ahead - 4.5f) * 1.2f));
        }
        c.v = Mathf.MoveTowards(c.v, want, (want > c.v ? 4f : 9f) * dt);
        float len = Mathf.Max(1f, ArcLen(c.a, c.b, c.c)); c.s += c.v * dt / len;
        while (c.s >= 1f) { c.s -= 1f; c.a = c.b; c.b = c.c; c.c = PlanetCity.IsRoad(c.n) ? c.n : NextRoad(c.b, c.a); c.n = NextRoad(c.c, c.b); }
        if (c.audio != null) c.audio.pitch = 0.85f + c.v / 22f;
    }

    // een stap langs de boog van a naar b; aan het eind het volgende vak kiezen
    static bool Advance(ref int a, ref int b, ref int prev, ref float t, float speed, float dt, bool walk = false)
    {
        System.Func<int, bool> ok = walk ? (System.Func<int, bool>)PlanetCity.IsWalk : PlanetCity.IsRoad;
        if (a == b || !ok(a) || !ok(b)) { if (!ok(a)) return false; b = NextRoad(a, prev, walk); t = 0f; if (a == b) return true; }
        float len = Vector3.Distance(Planet.Cells[a].dir, Planet.Cells[b].dir) * Planet.R;
        t += speed * dt / Mathf.Max(0.1f, len);
        while (t >= 1f) { t -= 1f; prev = a; a = b; b = NextRoad(a, prev, walk); if (a == b) { t = 0f; break; } }
        return true;
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (walker == null) walker = FindAnyObjectByType<PlanetWalker>(FindObjectsInactive.Include);
        roadsT -= dt; if (roadsT <= 0f) { roadsT = 2f; RefreshRoads(); }
        int targetP = Mathf.Clamp(walks.Count / 2, 0, 40), targetC = Mathf.Clamp(roads.Count / 6, 0, 16);
        spawnT -= dt;
        if (spawnT <= 0f)
        {
            if (walks.Count > 0 && People.Count < targetP) { People.Add(SpawnPerson()); spawnT = 0.4f; }
            else if (roads.Count > 0 && cars.Count < targetC) { cars.Add(SpawnCar()); spawnT = 0.7f; }
        }
        while (People.Count > targetP) { Destroy(People[People.Count - 1].root.gameObject); People.RemoveAt(People.Count - 1); }
        while (cars.Count > targetC) { Destroy(cars[cars.Count - 1].root.gameObject); cars.RemoveAt(cars.Count - 1); }

        for (int i = People.Count - 1; i >= 0; i--)
        {
            var a = People[i];
            if (a.greetCool > 0) a.greetCool -= dt; if (a.waveT > 0) a.waveT -= dt;
            if (!PlanetCity.IsWalk(a.cellA)) { Destroy(a.root.gameObject); People.RemoveAt(i); continue; }   // de weg is weg
            if (a.paused)
            {
                a.pauseT -= dt; if (a.pauseT <= 0f) { a.paused = false; a.partner = null; a.chatT = 0f; }
                else if (a.partner != null && a.chatT > 0f)
                {
                    a.chatT -= dt; a.talkT -= dt;
                    if (a.talkT <= 0f) { float dur = Chatter.I != null ? Chatter.I.Opine(a) : 0f; float len = Babble.Say(a, dur > 0f ? dur : 0.8f + Random.value * 1.8f, a.voice, false); a.talkT = 1e6f; if (a.partner.chatT > 0f) a.partner.talkT = len + 0.3f + Random.value * 0.6f; }
                }
                global::People.Animate(a, dt, false); PlacePerson(a, dt); continue;
            }
            Advance(ref a.cellA, ref a.cellB, ref a.prevCell, ref a.ct, a.speed, dt, true); a.phase += a.speed * dt * 5.2f;
            global::People.Animate(a, dt, a.cellA != a.cellB); PlacePerson(a, dt);
            a.socT -= dt; if (a.socT <= 0f) { a.socT = 0.4f; Social(a); }
        }
        for (int i = cars.Count - 1; i >= 0; i--)
        {
            var c = cars[i];
            if (!PlanetCity.IsRoad(c.b)) { Destroy(c.root.gameObject); cars.RemoveAt(i); continue; }
            if (!PlanetCity.IsRoad(c.a)) c.a = c.b; if (!PlanetCity.IsRoad(c.c)) { c.c = NextRoad(c.b, c.a); c.n = NextRoad(c.c, c.b); }
            DriveCar(c, dt);
            PlaceCar(c, dt); if (c.audio != null) c.audio.volume = Ambience.Muted ? 0f : 0.35f;
        }

        // af en toe een opmerking van iemand dichtbij de camera
        idleT -= dt;
        if (idleT <= 0f && Chatter.I != null && Camera.main != null)
        {
            idleT = 4f + Random.value * 5f; Vector3 cp = Camera.main.transform.position; var near = new List<Person>();
            foreach (var a in People) if (!a.paused && Vector3.Distance(a.root.position, cp) < 28f) near.Add(a);
            if (near.Count > 0 && Chatter.I.LiveCount < 3) { var a = near[Random.Range(0, near.Count)]; float dur = Chatter.I.Opine(a); if (dur > 0f) Babble.Say(a, dur * 0.8f, a.voice, false); }
        }
    }

    void Social(Person a)
    {
        if (a.greetCool > 0f) return;
        if (walker != null && walker.gameObject.activeInHierarchy && a.friendly && Vector3.Distance(walker.transform.position, a.root.position) < 2.8f)
        {
            Babble.Say(a, 0f, a.voice, true); if (Chatter.I != null) Chatter.I.Greet(a); a.waveT = 1.4f; a.greetCool = 25f; return;
        }
        foreach (var o in People)
        {
            if (o == a || o.paused || o.greetCool > 0f) continue;
            float d = Vector3.Distance(o.root.position, a.root.position); if (d > 2.4f || d < 0.4f) continue;
            if (Vector3.Dot(a.root.forward, o.root.forward) > -0.2f) continue;   // alleen tegemoet
            float r = Random.value;
            if (a.friendly && o.friendly && r < 0.15f)
            {
                float t = 3f + Random.value * 5f;
                foreach (var pq in new[] { (a, o), (o, a) }) { var p = pq.Item1; var q = pq.Item2; p.paused = true; p.pauseT = t; p.chatT = t; p.partner = q; p.greetCool = 40f + Random.value * 30f; p.waveT = 0.9f; p.talkT = p == a ? 0.3f : 1e6f; }
                return;
            }
            if (r < 0.6f)
            {
                a.waveT = o.waveT = 1.4f; a.greetCool = o.greetCool = 18f + Random.value * 20f;
                Babble.Say(a, 0f, a.voice, true); if (Chatter.I != null) { Chatter.I.Greet(a); Chatter.I.GreetLater(o, 0.45f); }
                return;
            }
            a.greetCool = 6f; return;
        }
    }
}
