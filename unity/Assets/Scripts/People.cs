using System.Collections.Generic;
using UnityEngine;

// Hulpjes om langs een weg te lopen of te rijden
public static class Nav
{
    public static float Length(RoadPath p) { float l = 0f; for (int i = 0; i < p.P.Count - 1; i++) l += Vector2.Distance(p.P[i], p.P[i + 1]); return l; }

    // punt en richting op afstand s langs de weg
    public static Vector2 At(RoadPath p, float s, out Vector2 dir)
    {
        dir = Vector2.up; if (p.P.Count < 2) return p.P[0];
        for (int i = 0; i < p.P.Count - 1; i++)
        {
            float L = Vector2.Distance(p.P[i], p.P[i + 1]); dir = (p.P[i + 1] - p.P[i]) / Mathf.Max(0.001f, L);
            if (s <= L || i == p.P.Count - 2) return p.P[i] + dir * Mathf.Clamp(s, 0f, L);
            s -= L;
        }
        return p.P[p.P.Count - 1];
    }

    // afstand langs de weg van het punt dat het dichtst bij q ligt
    public static float Nearest(RoadPath p, Vector2 q, out float dist)
    {
        float best = float.MaxValue, bs = 0f, acc = 0f;
        for (int i = 0; i < p.P.Count - 1; i++)
        {
            Vector2 a = p.P[i], b = p.P[i + 1], d = b - a; float L = d.magnitude, f = L < 1e-4f ? 0f : Mathf.Clamp01(Vector2.Dot(q - a, d) / (L * L));
            float dd = Vector2.Distance(a + d * f, q); if (dd < best) { best = dd; bs = acc + f * L; }
            acc += L;
        }
        dist = best; return bs;
    }

    // op het eind van een weg: op een andere weg overstappen (zelfde laag, vlakbij) of omkeren
    public static bool Hop(ref RoadPath path, ref float s, ref int dir, Vector2 at, bool keepDir)
    {
        var cand = new List<RoadPath>(); var ss = new List<float>();
        foreach (var q in City.Paths)
        {
            if (q == path || q.P.Count < 2 || q.Level != path.Level) continue;
            float st = Nearest(q, at, out float d); if (d < 6f) { cand.Add(q); ss.Add(st); }
        }
        if (cand.Count == 0) return false;
        int k = Random.Range(0, cand.Count); path = cand[k]; s = ss[k]; float len = Length(path);
        dir = s < 2f ? 1 : (s > len - 2f ? -1 : (Random.value < 0.5f ? 1 : -1));
        return true;
    }

    // vervang een weg die uit de lijst is verdwenen door de dichtstbijzijnde
    public static bool Rehome(ref RoadPath path, ref float s, Vector2 at)
    {
        float bd = float.MaxValue; RoadPath best = null; float bs = 0f;
        foreach (var q in City.Paths) { if (q.P.Count < 2) continue; float st = Nearest(q, at, out float d); if (d < bd) { bd = d; best = q; bs = st; } }
        if (best == null || bd > 25f) return false; path = best; s = bs; return true;
    }
}

public class Person
{
    public Transform root, legL, legR, armL, armR;
    public RoadPath path; public float s; public int dir = 1; public float speed, phase, scale = 1f;
    public bool lomp, friendly, kid, female; public float voice = 1f;
    public bool paused; public float pauseT, chatT, talkT, greetCool, socT, waveT, yaw;
    public Person partner; public Vector2 lookAt; public bool hasLook;
    public AudioSource audio;
    public int cellA = -1, cellB = -1, prevCell = -1; public float ct;   // op de planeet: van vak A naar vak B
    public Vector3 Head => root.position + root.up * (1.95f * scale);
}

// Lopende mensen: low-poly lichaam van driehoeken, lopen over de stoepen, groeten elkaar en doen een praatje
public class People : MonoBehaviour
{
    public static People I;
    public readonly List<Person> List = new List<Person>();
    static Mesh mTorso, mHead, mLimb, mLeg;
    float spawnT, idleT = 4f;
    Walker walker;

    // ---------- lichaam ----------
    // Omwentelingsvorm met 6 zijden; profiel van onder naar boven als (straal, hoogte)
    static Mesh Lathe(float[] prof, bool capBottom = true)
    {
        var m = new MeshBuilder(); int n = prof.Length / 2;
        for (int i = 0; i < n - 1; i++)
        {
            float r0 = prof[i * 2], y0 = prof[i * 2 + 1], r1 = prof[i * 2 + 2], y1 = prof[i * 2 + 3];
            for (int j = 0; j < 6; j++)
            {
                float a0 = j * Mathf.PI / 3f + Mathf.PI / 6f, a1 = (j + 1) * Mathf.PI / 3f + Mathf.PI / 6f, am = (a0 + a1) * 0.5f;
                Vector3 p00 = new Vector3(Mathf.Cos(a0) * r0, y0, Mathf.Sin(a0) * r0), p01 = new Vector3(Mathf.Cos(a1) * r0, y0, Mathf.Sin(a1) * r0);
                Vector3 p10 = new Vector3(Mathf.Cos(a0) * r1, y1, Mathf.Sin(a0) * r1), p11 = new Vector3(Mathf.Cos(a1) * r1, y1, Mathf.Sin(a1) * r1);
                Vector3 outw = new Vector3(Mathf.Cos(am) * (y1 - y0), -(r1 - r0), Mathf.Sin(am) * (y1 - y0));
                m.Tri(p00, p01, p11, outw); m.Tri(p00, p11, p10, outw);
            }
        }
        if (capBottom) for (int j = 0; j < 6; j++)
        {
            float a0 = j * Mathf.PI / 3f + Mathf.PI / 6f, a1 = (j + 1) * Mathf.PI / 3f + Mathf.PI / 6f, r = prof[0], y = prof[1];
            m.Tri(new Vector3(0, y, 0), new Vector3(Mathf.Cos(a0) * r, y, Mathf.Sin(a0) * r), new Vector3(Mathf.Cos(a1) * r, y, Mathf.Sin(a1) * r), Vector3.down);
        }
        return m.Build();
    }

    static void Meshes()
    {
        if (mTorso != null && mHead != null && mLimb != null && mLeg != null) return;
        mTorso = Lathe(new[] { 0.14f, 0f, 0.17f, 0.18f, 0.20f, 0.45f, 0.13f, 0.58f, 0.06f, 0.62f });
        mHead = Lathe(new[] { 0.0f, -0.11f, 0.075f, -0.09f, 0.105f, -0.03f, 0.10f, 0.05f, 0.07f, 0.11f, 0.0f, 0.135f });
        mLimb = Lathe(new[] { 0.045f, 0f, 0.05f, -0.2f, 0.038f, -0.55f, 0.03f, -0.6f }.Mirror());
        mLeg = Lathe(new[] { 0.07f, 0f, 0.075f, -0.4f, 0.05f, -0.85f, 0.05f, -0.92f }.Mirror());
    }

    static readonly Color[] Skin = { new Color(0.96f, 0.80f, 0.66f), new Color(0.88f, 0.68f, 0.5f), new Color(0.72f, 0.5f, 0.35f), new Color(0.5f, 0.33f, 0.22f), new Color(0.99f, 0.86f, 0.74f) };
    static readonly Color[] Shirt = { new Color(0.85f, 0.3f, 0.25f), new Color(0.25f, 0.5f, 0.8f), new Color(0.3f, 0.7f, 0.4f), new Color(0.95f, 0.75f, 0.2f), new Color(0.6f, 0.35f, 0.7f), new Color(0.9f, 0.9f, 0.9f), new Color(0.2f, 0.25f, 0.3f), new Color(0.95f, 0.55f, 0.25f) };
    static readonly Color[] Pants = { new Color(0.2f, 0.25f, 0.4f), new Color(0.25f, 0.25f, 0.28f), new Color(0.45f, 0.35f, 0.25f), new Color(0.3f, 0.4f, 0.3f), new Color(0.6f, 0.6f, 0.62f) };

    Person Spawn(RoadPath p)
    {
        var a = MakePerson(transform);
        a.path = p; a.s = Random.value * Nav.Length(p); a.dir = Random.value < 0.5f ? 1 : -1;
        Place(a, 0f); return a;
    }

    // Een mens met lichaam en stem, nog zonder plek (ook voor de planeet)
    public static Person MakePerson(Transform parent)
    {
        Meshes();
        var a = new Person { speed = 1.1f + Random.value * 0.5f, phase = Random.value * 6.28f };
        a.female = Random.value < 0.5f; a.kid = Random.value < 0.12f; a.lomp = Random.value < 0.28f; a.friendly = Random.value < 0.6f;
        a.scale = a.kid ? 0.68f : (0.92f + Random.value * 0.14f); if (a.kid) a.speed *= 0.85f;
        a.voice = (a.female ? 1.55f : 1f) * (a.kid ? 1.5f : 1f) * (0.85f + Random.value * 0.3f);
        var root = new GameObject("Mens").transform; root.SetParent(parent, false); a.root = root; root.localScale = Vector3.one * a.scale;
        int sk = Random.Range(0, Skin.Length), sh = Random.Range(0, Shirt.Length), pa = Random.Range(0, Pants.Length);
        Material mSkin = Mats.Get("skin" + sk, Skin[sk]), mShirt = Mats.Get("shirt" + sh, Shirt[sh]), mPants = Mats.Get("pants" + pa, Pants[pa]);
        Part(root, "romp", mTorso, mShirt, new Vector3(0, 0.88f, 0));
        Part(root, "hoofd", mHead, mSkin, new Vector3(0, 1.62f, 0));
        a.legL = Part(root, "beenL", mLeg, mPants, new Vector3(-0.09f, 0.9f, 0)); a.legR = Part(root, "beenR", mLeg, mPants, new Vector3(0.09f, 0.9f, 0));
        a.armL = Part(root, "armL", mLimb, mShirt, new Vector3(-0.25f, 1.42f, 0)); a.armR = Part(root, "armR", mLimb, mShirt, new Vector3(0.25f, 1.42f, 0));
        a.audio = root.gameObject.AddComponent<AudioSource>(); a.audio.spatialBlend = 1f; a.audio.rolloffMode = AudioRolloffMode.Linear; a.audio.minDistance = 2f; a.audio.maxDistance = 30f; a.audio.volume = 0.6f; a.audio.playOnAwake = false;
        return a;
    }

    static Transform Part(Transform parent, string n, Mesh m, Material mat, Vector3 pos)
    {
        var go = new GameObject(n); go.transform.SetParent(parent, false); go.transform.localPosition = pos;
        go.AddComponent<MeshFilter>().sharedMesh = m; go.AddComponent<MeshRenderer>().sharedMaterial = mat; return go.transform;
    }

    void Place(Person a, float dt)
    {
        Vector2 d; Vector2 c = Nav.At(a.path, a.s, out d); Vector2 fwd = d * a.dir;
        Vector2 right = new Vector2(fwd.y, -fwd.x);   // rechts van de looprichting
        Vector2 p = c + right * 3.5f; float y = a.path.Level * RoadRules.LAYER_H + 0.12f;
        a.root.position = new Vector3(p.x, y, p.y);
        float target = Mathf.Atan2(fwd.x, fwd.y) * Mathf.Rad2Deg;
        if (a.hasLook && a.paused) target = Mathf.Atan2(a.lookAt.x - p.x, a.lookAt.y - p.y) * Mathf.Rad2Deg;
        a.yaw = dt <= 0f ? target : Mathf.LerpAngle(a.yaw, target, Mathf.Min(1f, dt * 6f));
        a.root.rotation = Quaternion.Euler(0, a.yaw, 0);
    }

    public static void Animate(Person a, float dt, bool moving)
    {
        float sw = moving ? Mathf.Sin(a.phase) * 38f : 0f;
        a.legL.localRotation = Quaternion.Euler(sw, 0, 0); a.legR.localRotation = Quaternion.Euler(-sw, 0, 0);
        float armA = a.waveT > 0 ? 150f + Mathf.Sin(Time.time * 14f) * 20f : -sw * 0.8f;
        a.armR.localRotation = Quaternion.Euler(a.waveT > 0 ? armA : -sw * 0.8f, 0, a.waveT > 0 ? -10f : 0f);
        a.armL.localRotation = Quaternion.Euler(sw * 0.8f, 0, 0);
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (walker == null) walker = FindAnyObjectByType<Walker>(FindObjectsInactive.Include);
        // aantal mensen volgt de lengte van het wegennet
        int target = Mathf.Clamp(Mathf.RoundToInt(City.RoadLength() / 32f), 0, 28);
        var valid = new List<RoadPath>(); foreach (var p in City.Paths) if (p.P.Count >= 2) valid.Add(p);
        spawnT -= dt;
        if (valid.Count > 0 && List.Count < target && spawnT <= 0f) { List.Add(Spawn(valid[Random.Range(0, valid.Count)])); spawnT = 0.4f; }
        while (List.Count > target || (valid.Count == 0 && List.Count > 0)) { Destroy(List[List.Count - 1].root.gameObject); List.RemoveAt(List.Count - 1); }

        foreach (var a in List)
        {
            if (a.greetCool > 0) a.greetCool -= dt; if (a.waveT > 0) a.waveT -= dt;
            if (!City.Paths.Contains(a.path)) { Vector2 at = new Vector2(a.root.position.x, a.root.position.z); if (!Nav.Rehome(ref a.path, ref a.s, at)) { a.path = valid.Count > 0 ? valid[Random.Range(0, valid.Count)] : a.path; a.s = 0f; } }
            if (a.paused)
            {
                a.pauseT -= dt; if (a.pauseT <= 0f) { a.paused = false; a.hasLook = false; a.partner = null; a.chatT = 0f; }
                else if (a.partner != null && a.chatT > 0f)
                {
                    a.chatT -= dt; a.talkT -= dt;
                    if (a.talkT <= 0f) { float dur = Chatter.I != null ? Chatter.I.Opine(a) : 0f; float len = Babble.Say(a, dur > 0f ? dur : 0.8f + Random.value * 1.8f, a.voice, false); a.talkT = 1e6f; if (a.partner.chatT > 0f) a.partner.talkT = len + 0.3f + Random.value * 0.6f; }
                }
                Animate(a, dt, false); Place(a, dt); continue;
            }
            float len2 = Nav.Length(a.path); a.s += a.dir * a.speed * dt; a.phase += a.speed * dt * 5.2f;
            if (a.s < 0f || a.s > len2)
            {
                Vector2 at = Nav.At(a.path, Mathf.Clamp(a.s, 0f, len2), out _);
                if (!Nav.Hop(ref a.path, ref a.s, ref a.dir, at, false)) { a.dir = -a.dir; a.s = Mathf.Clamp(a.s, 0f, len2); }
            }
            Animate(a, dt, true); Place(a, dt);
            a.socT -= dt; if (a.socT <= 0f) { a.socT = 0.4f; Social(a); }
        }

        // af en toe een opmerking van iemand dichtbij de camera
        idleT -= dt;
        if (idleT <= 0f && Chatter.I != null && Camera.main != null)
        {
            idleT = 4f + Random.value * 5f; Vector3 cp = Camera.main.transform.position; var near = new List<Person>();
            foreach (var a in List) if (!a.paused && Vector3.Distance(a.root.position, cp) < 28f) near.Add(a);
            if (near.Count > 0 && Chatter.I.LiveCount < 3) { var a = near[Random.Range(0, near.Count)]; float dur = Chatter.I.Opine(a); if (dur > 0f) Babble.Say(a, dur * 0.8f, a.voice, false); }
        }
    }

    void Social(Person a)
    {
        if (a.greetCool > 0f) return;
        // de speler die langsloopt
        if (walker != null && walker.gameObject.activeInHierarchy && a.friendly)
        {
            if (Vector3.Distance(walker.transform.position, a.root.position) < 2.8f)
            {
                Babble.Say(a, 0f, a.voice, true); if (Chatter.I != null) Chatter.I.Greet(a); a.waveT = 1.4f; a.greetCool = 25f; return;
            }
        }
        foreach (var o in List)
        {
            if (o == a || o.paused || o.greetCool > 0f || Mathf.Abs(o.root.position.y - a.root.position.y) > 1f) continue;
            float d = Vector3.Distance(o.root.position, a.root.position); if (d > 2.4f || d < 0.4f) continue;
            if (Vector3.Dot(a.root.forward, o.root.forward) > -0.2f) continue;   // alleen als ze elkaar tegemoet lopen
            float r = Random.value;
            if (a.friendly && o.friendly && r < 0.15f)
            {
                float t = 3f + Random.value * 5f;
                foreach (var pq in new[] { (a, o), (o, a) }) { var p = pq.Item1; var q = pq.Item2; p.paused = true; p.pauseT = t; p.chatT = t; p.partner = q; p.hasLook = true; p.lookAt = new Vector2(q.root.position.x, q.root.position.z); p.greetCool = 40f + Random.value * 30f; p.waveT = 0.9f; p.talkT = p == a ? 0.3f : 1e6f; }
                return;
            }
            if (r < 0.6f)
            {
                a.waveT = o.waveT = 1.4f; a.greetCool = o.greetCool = 18f + Random.value * 20f;
                Babble.Say(a, 0f, a.voice, true); if (Chatter.I != null) Chatter.I.Greet(a);
                if (Chatter.I != null) Chatter.I.GreetLater(o, 0.45f);
                return;
            }
            a.greetCool = 6f; return;
        }
    }
}

static class ArrExt
{
    // profiel omkeren (van boven naar onder wordt van onder naar boven)
    public static float[] Mirror(this float[] p)
    {
        int n = p.Length / 2; var r = new float[p.Length];
        for (int i = 0; i < n; i++) { r[i * 2] = p[(n - 1 - i) * 2]; r[i * 2 + 1] = p[(n - 1 - i) * 2 + 1]; }
        return r;
    }
}
