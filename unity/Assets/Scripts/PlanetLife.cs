using System.Collections.Generic;
using UnityEngine;

// Leven op de planeet: mensen lopen over de stoepen van wegvak naar wegvak (rechts houden), groeten elkaar,
// doen een praatje (met brabbeltaal en spreekballon) en groeten de speler. Auto's rijden over het asfalt.
// Alles staat recht op de bol: "omhoog" is de richting vanuit het middelpunt.
public class PlanetLife : MonoBehaviour
{
    public static PlanetLife I;
    public readonly List<Person> People = new List<Person>();
    class Car { public Transform root; public int a, b, prev; public float t, speed; }
    readonly List<Car> cars = new List<Car>();
    public int CarCount => cars.Count;
    readonly List<int> roads = new List<int>();
    float roadsT, spawnT, idleT = 4f;
    PlanetWalker walker;
    static readonly Color[] Paint = { new Color(0.8f, 0.2f, 0.2f), new Color(0.2f, 0.4f, 0.75f), new Color(0.9f, 0.85f, 0.3f), new Color(0.9f, 0.9f, 0.92f), new Color(0.2f, 0.2f, 0.22f), new Color(0.25f, 0.6f, 0.4f) };

    void Awake() { I = this; }

    void RefreshRoads()
    {
        roads.Clear(); foreach (var kv in PlanetCity.Cells) if (kv.Value.Count > 0 && kv.Value[0] == "weg") roads.Add(kv.Key);
    }

    // volgend wegvak vanaf a, liefst niet terug naar prev
    static int NextRoad(int a, int prev)
    {
        var opts = new List<int>(6); foreach (int j in Planet.Cells[a].nb) if (PlanetCity.IsRoad(j) && j != prev) opts.Add(j);
        if (opts.Count == 0) return PlanetCity.IsRoad(prev) ? prev : a;
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
        a.cellA = roads[Random.Range(0, roads.Count)]; a.prevCell = -1; a.cellB = NextRoad(a.cellA, -1); a.ct = Random.value;
        PlacePerson(a, 0f); return a;
    }

    void PlacePerson(Person a, float dt)
    {
        Where(a.cellA, a.cellB, a.ct, 3.5f, 0.1f, out Vector3 pos, out Vector3 fwd, out Vector3 up);
        a.root.position = pos;
        if (a.paused && a.partner != null) { Vector3 to = a.partner.root.position - pos; to -= up * Vector3.Dot(to, up); if (to.sqrMagnitude > 1e-6f) fwd = to.normalized; }
        Quaternion target = Quaternion.LookRotation(fwd, up);
        a.root.rotation = dt <= 0f ? target : Quaternion.Slerp(a.root.rotation, target, Mathf.Min(1f, dt * 6f));
    }

    Car SpawnCar()
    {
        var c = new Car { a = roads[Random.Range(0, roads.Count)], prev = -1, speed = 6f + Random.value * 4f, t = Random.value };
        c.b = NextRoad(c.a, -1);
        var root = new GameObject("Auto").transform; root.SetParent(transform, false); c.root = root;
        int k = Random.Range(0, Paint.Length);
        Box(root, new Vector3(0, 0.55f, 0), new Vector3(1.8f, 0.6f, 4.2f), Mats.Get("auto" + k, Paint[k]));
        Box(root, new Vector3(0, 1.1f, -0.2f), new Vector3(1.5f, 0.5f, 2.2f), Mats.Get("autoglas", new Color(0.18f, 0.25f, 0.32f)));
        Box(root, new Vector3(0, 0.25f, 1.3f), new Vector3(1.9f, 0.3f, 0.5f), Mats.Get("autowiel", new Color(0.1f, 0.1f, 0.1f)));
        Box(root, new Vector3(0, 0.25f, -1.3f), new Vector3(1.9f, 0.3f, 0.5f), Mats.Get("autowiel", new Color(0.1f, 0.1f, 0.1f)));
        PlaceCar(c, 0f); return c;
    }

    static void Box(Transform parent, Vector3 pos, Vector3 size, Material m)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube); Destroy(go.GetComponent<Collider>());
        go.transform.SetParent(parent, false); go.transform.localPosition = pos; go.transform.localScale = size; go.GetComponent<MeshRenderer>().sharedMaterial = m;
    }

    void PlaceCar(Car c, float dt)
    {
        Where(c.a, c.b, c.t, 1.25f, 0.16f, out Vector3 pos, out Vector3 fwd, out Vector3 up);
        c.root.position = pos; Quaternion target = Quaternion.LookRotation(fwd, up);
        c.root.rotation = dt <= 0f ? target : Quaternion.Slerp(c.root.rotation, target, Mathf.Min(1f, dt * 8f));
    }

    // een stap langs de boog van a naar b; aan het eind het volgende vak kiezen
    static bool Advance(ref int a, ref int b, ref int prev, ref float t, float speed, float dt)
    {
        if (a == b || !PlanetCity.IsRoad(a) || !PlanetCity.IsRoad(b)) { if (!PlanetCity.IsRoad(a)) return false; b = NextRoad(a, prev); t = 0f; if (a == b) return true; }
        float len = Vector3.Distance(Planet.Cells[a].dir, Planet.Cells[b].dir) * Planet.R;
        t += speed * dt / Mathf.Max(0.1f, len);
        while (t >= 1f) { t -= 1f; prev = a; a = b; b = NextRoad(a, prev); if (a == b) { t = 0f; break; } }
        return true;
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (walker == null) walker = FindAnyObjectByType<PlanetWalker>(FindObjectsInactive.Include);
        roadsT -= dt; if (roadsT <= 0f) { roadsT = 2f; RefreshRoads(); }
        int targetP = Mathf.Clamp(roads.Count / 2, 0, 40), targetC = Mathf.Clamp(roads.Count / 6, 0, 16);
        spawnT -= dt;
        if (roads.Count > 0 && spawnT <= 0f)
        {
            if (People.Count < targetP) { People.Add(SpawnPerson()); spawnT = 0.4f; }
            else if (cars.Count < targetC) { cars.Add(SpawnCar()); spawnT = 0.7f; }
        }
        while (People.Count > targetP) { Destroy(People[People.Count - 1].root.gameObject); People.RemoveAt(People.Count - 1); }
        while (cars.Count > targetC) { Destroy(cars[cars.Count - 1].root.gameObject); cars.RemoveAt(cars.Count - 1); }

        for (int i = People.Count - 1; i >= 0; i--)
        {
            var a = People[i];
            if (a.greetCool > 0) a.greetCool -= dt; if (a.waveT > 0) a.waveT -= dt;
            if (!PlanetCity.IsRoad(a.cellA)) { Destroy(a.root.gameObject); People.RemoveAt(i); continue; }   // de weg is weg
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
            Advance(ref a.cellA, ref a.cellB, ref a.prevCell, ref a.ct, a.speed, dt); a.phase += a.speed * dt * 5.2f;
            global::People.Animate(a, dt, a.cellA != a.cellB); PlacePerson(a, dt);
            a.socT -= dt; if (a.socT <= 0f) { a.socT = 0.4f; Social(a); }
        }
        for (int i = cars.Count - 1; i >= 0; i--)
        {
            var c = cars[i];
            if (!Advance(ref c.a, ref c.b, ref c.prev, ref c.t, c.speed, dt)) { Destroy(c.root.gameObject); cars.RemoveAt(i); continue; }
            PlaceCar(c, dt);
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
