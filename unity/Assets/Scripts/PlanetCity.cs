using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

// De stad op de planeet: per vak een stapel blokken; een vak waarvan het onderste blok "weg" is, is een wegvak.
// Wegvakken sluiten vanzelf op elkaar aan (asfalt van hart naar hart, stoep eromheen). Alles wordt in het
// assenstelsel van het vak gebouwd, zodat gebouwen overal recht op de bol staan. De bodem is één mesh per
// deel (1024 vakken); blokken en wegen worden per deel opnieuw gemaakt als er iets verandert.
[Serializable] public class PCellSave { public int i; public string[] items; }
[Serializable] public class PSaveData { public int m; public float r; public List<PCellSave> cells = new List<PCellSave>(); }

public static class PlanetCity
{
    public static Dictionary<int, List<string>> Cells = new Dictionary<int, List<string>>();
    public const int ChunkN = 1024;
    static Transform root, groundRoot;
    static readonly Dictionary<int, Transform> chunks = new Dictionary<int, Transform>();
    static readonly HashSet<int> dirty = new HashSet<int>();

    public static bool IsRoad(int i) => Cells.TryGetValue(i, out var l) && l.Count > 0 && l[0] == "weg";
    public static bool IsPath(int i) => Cells.TryGetValue(i, out var l) && l.Count == 1 && l[0] == "pad";
    public static bool IsWalk(int i) => IsRoad(i) || IsPath(i);
    public static float StackHeight(int i) { float h = 0f; if (Cells.TryGetValue(i, out var l)) foreach (var t in l) h += Blocks.Height(t); return h; }
    public static int RoadCount() { int n = 0; foreach (var kv in Cells) if (kv.Value.Count > 0 && kv.Value[0] == "weg") n++; return n; }

    public static Dictionary<int, List<string>> Clone(Dictionary<int, List<string>> src)
    {
        var d = new Dictionary<int, List<string>>(); foreach (var kv in src) d[kv.Key] = new List<string>(kv.Value); return d;
    }

    // plaatsen; geeft een melding terug als het niet kan (anders null)
    public static string Place(int i, string type)
    {
        if (!Cells.TryGetValue(i, out var l)) { l = new List<string>(); Cells[i] = l; }
        if (type == "weg") { if (l.Count > 0) return "Eerst het vak leegmaken (gum) voor een weg"; l.Add("weg"); Touch(i); return null; }
        if (l.Count > 0 && l[0] == "weg") return "Op een weg kun je niet bouwen; haal de weg eerst weg (gum)";
        if (l.Count >= 8) return "Hoger kan niet";
        if ((type == "water" || type == "meer") && l.Count > 0) l.Clear();
        if (l.Count > 0 && (l[l.Count - 1] == "water" || l[l.Count - 1] == "meer")) l.Clear();
        l.Add(type); Touch(i); return null;
    }

    public static bool RemoveTop(int i)
    {
        if (!Cells.TryGetValue(i, out var l) || l.Count == 0) return false;
        l.RemoveAt(l.Count - 1); if (l.Count == 0) Cells.Remove(i); Touch(i); return true;
    }

    public static void Touch(int i) { dirty.Add(i / ChunkN); foreach (int j in Planet.Cells[i].nb) dirty.Add(j / ChunkN); }
    public static void TouchAll() { for (int c = 0; c * ChunkN < Planet.Cells.Length; c++) dirty.Add(c); }

    public static int Slot = 1;   // drie opslagslots: planeet1.json, planeet2.json, planeet3.json
    static string FilePath => Path.Combine(Application.persistentDataPath, "planeet" + Slot + ".json");
    public static bool SlotExists(int n) => File.Exists(Path.Combine(Application.persistentDataPath, "planeet" + n + ".json"));

    public static void Save()
    {
        try
        {
            var sd = new PSaveData { m = Planet.M, r = Planet.R };
            foreach (var kv in Cells) if (kv.Value.Count > 0) sd.cells.Add(new PCellSave { i = kv.Key, items = kv.Value.ToArray() });
            File.WriteAllText(FilePath, JsonUtility.ToJson(sd));
        }
        catch (Exception e) { Debug.LogWarning("Opslaan mislukt: " + e.Message); }
    }

    public static bool Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return false;
            var sd = JsonUtility.FromJson<PSaveData>(File.ReadAllText(FilePath)); if (sd == null || sd.m != Planet.M) return false;
            Cells = new Dictionary<int, List<string>>();
            foreach (var c in sd.cells) if (c.items != null && c.items.Length > 0 && c.i >= 0 && c.i < Planet.Cells.Length) Cells[c.i] = new List<string>(c.items);
            TouchAll(); return true;
        }
        catch (Exception e) { Debug.LogWarning("Laden mislukt: " + e.Message); return false; }
    }

    // ---------- bodem ----------
    public static void Init(Transform parent)
    {
        root = new GameObject("Planeetstad").transform; root.SetParent(parent, false);
        groundRoot = new GameObject("Bodem").transform; groundRoot.SetParent(parent, false);
        int n = Planet.Cells.Length;
        for (int c0 = 0; c0 < n; c0 += ChunkN)
        {
            // De bodem per vak; de kleur loopt van gewoon gras (regelmatige zeshoek) naar fel oranje (het meest vervormd, naast een vijfhoek)
            const int Steps = 8; var ms = new MeshBuilder[Steps]; for (int k = 0; k < Steps; k++) ms[k] = new MeshBuilder();
            var pm = new MeshBuilder();   // de vijfhoeken zelf
            var sm = new MeshBuilder();   // de startplekken
            for (int i = c0; i < Mathf.Min(n, c0 + ChunkN); i++)
            {
                var c = Planet.Cells[i]; Vector3 mid = c.dir * Planet.R; bool pent = c.corners.Length == 5;
                float kk = Mathf.Pow(Mathf.Clamp01((c.distort - 0.04f) / 0.125f), 1.4f);
                bool start = System.Array.IndexOf(Planet.Starts, i) >= 0;
                var mb0 = pent ? pm : start ? sm : ms[Mathf.Clamp(Mathf.RoundToInt(kk * (Steps - 1)), 0, Steps - 1)];
                for (int k = 0; k < c.corners.Length; k++) mb0.Tri(mid, c.corners[k] * Planet.R, c.corners[(k + 1) % c.corners.Length] * Planet.R, c.dir);
                if (start)   // startplek: lichtblauw vak met een witte paal van 30 m en een vlaggetje
                {
                    Vector3 top = c.dir * (Planet.R + 30f);
                    for (int k = 0; k < 6; k++) { Vector3 a = Vector3.Lerp(c.corners[k], c.dir, 0.93f) * (Planet.R + 0.3f), b = Vector3.Lerp(c.corners[(k + 1) % 6], c.dir, 0.93f) * (Planet.R + 0.3f); sm.Tri(a, b, top, (a + b) * 0.5f - c.dir * Planet.R + c.dir * 0.05f); }
                    Vector3 fl = c.dir * (Planet.R + 27f) + c.east * 6f, fb = c.dir * (Planet.R + 24f);
                    sm.Tri(top, fl, fb, c.north); sm.Tri(top, fb, fl, -c.north);
                    for (int k = 0; k < 6; k++) { Vector3 a = c.corners[k], b = c.corners[(k + 1) % 6]; Vector3 am = (a + b) * 0.5f; Vector3 ai = Vector3.Lerp(a, c.dir, 0.08f), bi = Vector3.Lerp(b, c.dir, 0.08f); sm.Quad(a * Planet.R, b * Planet.R, bi * (Planet.R + 0.25f), ai * (Planet.R + 0.25f), am - c.dir); }
                }
                if (pent)   // baken: een slanke oranje punt van 60 m, zodat je de vijfhoeken ook vanuit de ruimte vindt
                {
                    Vector3 apex = c.dir * (Planet.R + 60f);
                    for (int k = 0; k < 5; k++) { Vector3 a = Vector3.Lerp(c.corners[k], c.dir, 0.7f) * (Planet.R + 0.3f), b = Vector3.Lerp(c.corners[(k + 1) % 5], c.dir, 0.7f) * (Planet.R + 0.3f); pm.Tri(a, b, apex, (a + b) * 0.5f - c.dir * Planet.R + c.dir * 0.05f); }
                }
                if (pent)   // opstaand randje rondom, zodat de vijfhoek ook van dichtbij opvalt
                    for (int k = 0; k < 5; k++) { Vector3 a = c.corners[k], b = c.corners[(k + 1) % 5]; Vector3 am = (a + b) * 0.5f; Vector3 ai = Vector3.Lerp(a, c.dir, 0.08f), bi = Vector3.Lerp(b, c.dir, 0.08f); pm.Quad(a * Planet.R, b * Planet.R, bi * (Planet.R + 0.25f), ai * (Planet.R + 0.25f), am - c.dir); }
            }
            if (pm.v.Count > 0)
            {
                var pg = new GameObject("Vijfhoeken " + (c0 / ChunkN)); pg.transform.SetParent(groundRoot, false);
                var pmesh = pm.Build(); pg.AddComponent<MeshFilter>().sharedMesh = pmesh; pg.AddComponent<MeshRenderer>().sharedMaterial = Mats.Get("p_vijfhoek", new Color(1f, 0.5f, 0.1f));
                pg.AddComponent<MeshCollider>().sharedMesh = pmesh;
            }
            if (sm.v.Count > 0)
            {
                var sg = new GameObject("Startplekken " + (c0 / ChunkN)); sg.transform.SetParent(groundRoot, false);
                var smesh = sm.Build(); sg.AddComponent<MeshFilter>().sharedMesh = smesh; sg.AddComponent<MeshRenderer>().sharedMaterial = Mats.Get("p_start", new Color(0.55f, 0.8f, 1f));
                sg.AddComponent<MeshCollider>().sharedMesh = smesh;
            }
            Color grass = new Color(0.64f, 0.78f, 0.45f), hot = new Color(1f, 0.6f, 0.2f);
            for (int k = 0; k < Steps; k++)
            {
                if (ms[k].v.Count == 0) continue;
                var go = new GameObject("Bodem " + (c0 / ChunkN) + " " + k); go.transform.SetParent(groundRoot, false);
                var mesh = ms[k].Build(); go.AddComponent<MeshFilter>().sharedMesh = mesh; go.AddComponent<MeshRenderer>().sharedMaterial = Mats.Get("p_bodem" + k, Color.Lerp(grass, hot, k / (float)(Steps - 1)));
                go.AddComponent<MeshCollider>().sharedMesh = mesh;
            }
        }
    }

    // ---------- blokken en wegen per deel ----------
    class Frame
    {
        public Vector3 o, e, u, n; public Vector2[] poly; public float rad;
        public Frame(int i) { var c = Planet.Cells[i]; u = c.dir; e = c.east; n = c.north; o = c.dir * Planet.R; poly = c.local; rad = c.radius; }
        public Vector3 P(float x, float y, float z) => o + e * x + u * y + n * z;
        public Vector3 D(float x, float y, float z) => e * x + u * y + n * z;
    }

    static Vector2 C(Frame f, int i, float k) => f.poly[i % f.poly.Length] * k;
    static void Wall(MeshBuilder m, Frame f, float k, float y0, float y1)
    {
        for (int i = 0; i < f.poly.Length; i++) { Vector2 a = C(f, i, k), b = C(f, i + 1, k), mid = (a + b) * 0.5f; m.Quad(f.P(a.x, y0, a.y), f.P(b.x, y0, b.y), f.P(b.x, y1, b.y), f.P(a.x, y1, a.y), f.D(mid.x, 0, mid.y)); }
    }
    static void Top(MeshBuilder m, Frame f, float k, float y)
    {
        for (int i = 0; i < f.poly.Length; i++) { Vector2 a = C(f, i, k), b = C(f, i + 1, k); m.Tri(f.P(0, y, 0), f.P(a.x, y, a.y), f.P(b.x, y, b.y), f.u); }
    }
    static void Windows(MeshBuilder m, Frame f, float k, float y0, float y1, float f0, float f1)
    {
        for (int i = 0; i < f.poly.Length; i++)
        {
            Vector2 a = C(f, i, k), b = C(f, i + 1, k), outw = ((a + b) * 0.5f).normalized;
            Vector2 p0 = Vector2.Lerp(a, b, f0) + outw * 0.04f, p1 = Vector2.Lerp(a, b, f1) + outw * 0.04f;
            m.Quad(f.P(p0.x, y0, p0.y), f.P(p1.x, y0, p1.y), f.P(p1.x, y1, p1.y), f.P(p0.x, y1, p0.y), f.D(outw.x, 0, outw.y));
        }
    }
    static void Cone(MeshBuilder m, Frame f, float cx, float cz, float r, float y0, float y1, float rTop)
    {
        for (int i = 0; i < 6; i++)
        {
            float a0 = i * Mathf.PI / 3f, a1 = (i + 1) * Mathf.PI / 3f, am = (a0 + a1) * 0.5f;
            Vector3 b0 = f.P(cx + Mathf.Cos(a0) * r, y0, cz + Mathf.Sin(a0) * r), b1 = f.P(cx + Mathf.Cos(a1) * r, y0, cz + Mathf.Sin(a1) * r);
            Vector3 outw = f.D(Mathf.Cos(am), (r - rTop) / Mathf.Max(0.01f, y1 - y0), Mathf.Sin(am));
            if (rTop <= 0.001f) m.Tri(b0, b1, f.P(cx, y1, cz), outw);
            else m.Quad(b0, b1, f.P(cx + Mathf.Cos(a1) * rTop, y1, cz + Mathf.Sin(a1) * rTop), f.P(cx + Mathf.Cos(a0) * rTop, y1, cz + Mathf.Sin(a0) * rTop), outw);
        }
    }
    static void Roof(MeshBuilder m, Frame f, float k, float y1)
    {
        Vector3 apex = f.P(0, y1 + 2.4f, 0);
        for (int i = 0; i < f.poly.Length; i++) { Vector2 a = C(f, i, k), b = C(f, i + 1, k), mid = (a + b) * 0.5f; m.Tri(f.P(a.x, y1, a.y), f.P(b.x, y1, b.y), apex, f.D(mid.x, 0.6f * mid.magnitude, mid.y)); }
    }
    static void Cap6(MeshBuilder m, Frame f, float r, float y)
    {
        for (int i = 0; i < 6; i++) { float a0 = i * Mathf.PI / 3f, a1 = (i + 1) * Mathf.PI / 3f; m.Tri(f.P(0, y, 0), f.P(Mathf.Cos(a0) * r, y, Mathf.Sin(a0) * r), f.P(Mathf.Cos(a1) * r, y, Mathf.Sin(a1) * r), f.u); }
    }
    static void Disc(MeshBuilder m, Frame f, float r, float y)
    {
        for (int i = 0; i < 12; i++) { float a0 = i * Mathf.PI / 6f, a1 = (i + 1) * Mathf.PI / 6f; m.Tri(f.P(0, y, 0), f.P(Mathf.Cos(a0) * r, y, Mathf.Sin(a0) * r), f.P(Mathf.Cos(a1) * r, y, Mathf.Sin(a1) * r), f.u); }
    }
    static void Skirt(MeshBuilder m, Frame f, float r, float y0, float y1)
    {
        for (int i = 0; i < 12; i++) { float a0 = i * Mathf.PI / 6f, a1 = (i + 1) * Mathf.PI / 6f, am = (a0 + a1) * 0.5f; m.Quad(f.P(Mathf.Cos(a0) * r, y0, Mathf.Sin(a0) * r), f.P(Mathf.Cos(a1) * r, y0, Mathf.Sin(a1) * r), f.P(Mathf.Cos(a1) * r, y1, Mathf.Sin(a1) * r), f.P(Mathf.Cos(a0) * r, y1, Mathf.Sin(a0) * r), f.D(Mathf.Cos(am), 0, Mathf.Sin(am))); }
    }
    static void Strip(MeshBuilder m, Frame f, Vector2 d, Vector2 r, float s0, float s1, float hw, float y)
    {
        Vector2 a = d * s0 - r * hw, b = d * s0 + r * hw, c = d * s1 + r * hw, e = d * s1 - r * hw;
        m.Quad(f.P(a.x, y, a.y), f.P(b.x, y, b.y), f.P(c.x, y, c.y), f.P(e.x, y, e.y), f.u);
    }
    static void StripSides(MeshBuilder m, Frame f, Vector2 d, Vector2 r, float s0, float s1, float hw, float y0, float y1)
    {
        for (int sg = -1; sg <= 1; sg += 2)
        {
            Vector2 a = d * s0 + r * (hw * sg), b = d * s1 + r * (hw * sg);
            m.Quad(f.P(a.x, y0, a.y), f.P(b.x, y0, b.y), f.P(b.x, y1, b.y), f.P(a.x, y1, a.y), f.D(r.x * sg, 0, r.y * sg));
        }
    }

    static void Road(Dictionary<string, MeshBuilder> mb, Frame fr, int i)
    {
        System.Func<string, MeshBuilder> M = k => { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; };
        Disc(M("stoep"), fr, 4.6f, 0.08f); Skirt(M("stoep"), fr, 4.6f, -0.35f, 0.08f);
        Disc(M("asfalt"), fr, 3.3f, 0.14f);
        int rn = 0; Vector2 freeDir = new Vector2(0, 1); float freeBest = -2f;
        foreach (int j in Planet.Cells[i].nb)
        {
            Vector3 d3 = Planet.Cells[j].dir * Planet.R - fr.o; Vector2 q = new Vector2(Vector3.Dot(d3, fr.e), Vector3.Dot(d3, fr.n)).normalized;
            if (IsRoad(j)) rn++;
            else { float sc = (i * 7 + j) % 13 / 13f; if (sc > freeBest) { freeBest = sc; freeDir = q; } }
        }
        if (rn >= 3) { Disc(M("gras"), fr, 1.4f, 0.2f); Skirt(M("stoep"), fr, 1.5f, 0.14f, 0.19f); }   // kruising: een klein rotonde-eiland
        if (freeBest > -1f)   // lantaarnpaal op de stoep aan een vrije kant
        {
            Vector2 lp = freeDir * 4.0f;
            Cone(M("paal"), fr, lp.x, lp.y, 0.08f, 0.08f, 5.2f, 0.06f);
            Cone(M("lamp"), fr, lp.x, lp.y, 0.28f, 4.9f, 5.35f, 0.2f); Cap6(M("lamp"), fr, 0.2f, 5.35f);
        }
        foreach (int j in Planet.Cells[i].nb)
        {
            if (!IsRoad(j)) continue;
            Vector3 d3 = Planet.Cells[j].dir * Planet.R - fr.o;
            Vector2 q = new Vector2(Vector3.Dot(d3, fr.e), Vector3.Dot(d3, fr.n)) * 0.5f;   // tot het midden van de gedeelde rand
            float L = q.magnitude; Vector2 d = q / L, r = new Vector2(d.y, -d.x);
            Strip(M("stoep"), fr, d, r, 0f, L, 4.6f, 0.095f); StripSides(M("stoep"), fr, d, r, 0f, L, 4.6f, -0.35f, 0.095f);
            Strip(M("asfalt"), fr, d, r, 0f, L, 2.5f, 0.155f);
            Strip(M("lijn"), fr, d, r, 3.3f, L, 0.08f, 0.165f);
        }
    }

    // Een meertje: zand aan de kant, water iets lager, riet langs de oever. Grenst een buurvak ook aan een meer,
    // dan loopt het water door tot de gedeelde rand, zodat meerdere vakken één meer vormen.
    static void Lake(Dictionary<string, MeshBuilder> mb, Frame fr, int i, float h, int hash)
    {
        System.Func<string, MeshBuilder> M = k => { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; };
        var c = Planet.Cells[i]; int n = fr.poly.Length;
        Top(M("zand"), fr, 1.0f, h + 0.03f); Wall(M("zand"), fr, 1.0f, -0.2f, h + 0.03f);
        // per rand: open naar een buurmeer? De buur met dezelfde richting als de rand (middelpunt van de rand ligt richting die buur)
        var open = new bool[n];
        for (int e = 0; e < n; e++)
        {
            Vector2 mid = (fr.poly[e] + fr.poly[(e + 1) % n]) * 0.5f; int best = -1; float bd = -1f;
            foreach (int j in c.nb) { Vector3 d3 = Planet.Cells[j].dir * Planet.R - fr.o; Vector2 q = new Vector2(Vector3.Dot(d3, fr.e), Vector3.Dot(d3, fr.n)).normalized; float d = Vector2.Dot(q, mid.normalized); if (d > bd) { bd = d; best = j; } }
            open[e] = best >= 0 && Cells.TryGetValue(best, out var l) && l.Count > 0 && l[0] == "meer";
        }
        // waterrand: hoekpunt op de rand als beide aangrenzende randen open zijn, anders naar binnen (golvend)
        var wp = new Vector2[n]; var rnd = new System.Random(hash);
        for (int k = 0; k < n; k++)
        {
            bool both = open[(k + n - 1) % n] && open[k];
            float kk = both ? 1.0f : (open[(k + n - 1) % n] || open[k]) ? 0.9f : 0.68f + (float)rnd.NextDouble() * 0.1f;
            wp[k] = fr.poly[k] * kk;
        }
        float wy = h - 0.35f;
        for (int k = 0; k < n; k++)
        {
            Vector2 a = wp[k], b = wp[(k + 1) % n], am = open[k] ? (fr.poly[k] + fr.poly[(k + 1) % n]) * 0.5f : (a + b) * 0.5f * 0.95f;
            M("water").Tri(fr.P(0, wy, 0), fr.P(a.x, wy, a.y), fr.P(am.x, wy, am.y), fr.u); M("water").Tri(fr.P(0, wy, 0), fr.P(am.x, wy, am.y), fr.P(b.x, wy, b.y), fr.u);
            // oever: een helling van het zand (h+0.03) naar onder water (wy-0.3), en riet op gesloten randen
            Vector2 oa = fr.poly[k] * 0.98f, ob = fr.poly[(k + 1) % n] * 0.98f;
            if (!open[k]) { M("modder").Quad(fr.P(a.x, wy - 0.3f, a.y), fr.P(b.x, wy - 0.3f, b.y), fr.P(ob.x, h + 0.03f, ob.y), fr.P(oa.x, h + 0.03f, oa.y), fr.D(-am.x, 0.5f * am.magnitude, -am.y));
                int reeds = 2 + rnd.Next(0, 3);
                for (int r = 0; r < reeds; r++) { float t = 0.15f + (float)rnd.NextDouble() * 0.7f; Vector2 rp = Vector2.Lerp(a, b, t) * (0.97f + (float)rnd.NextDouble() * 0.06f); Cone(M("riet"), fr, rp.x, rp.y, 0.12f, wy - 0.1f, h + 0.9f + (float)rnd.NextDouble() * 0.5f, 0f); } }
        }
    }

    // Een pad: smal, zandkleurig, sluit aan op buurpaden en wegen
    static void Footpath(Dictionary<string, MeshBuilder> mb, Frame fr, int i)
    {
        System.Func<string, MeshBuilder> M = k => { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; };
        Disc(M("pad"), fr, 1.3f, 0.1f); Skirt(M("pad"), fr, 1.3f, -0.3f, 0.1f);
        foreach (int j in Planet.Cells[i].nb)
        {
            if (!IsWalk(j)) continue;
            Vector3 d3 = Planet.Cells[j].dir * Planet.R - fr.o;
            Vector2 q = new Vector2(Vector3.Dot(d3, fr.e), Vector3.Dot(d3, fr.n)) * 0.5f; float L = q.magnitude; Vector2 d = q / L, r = new Vector2(d.y, -d.x);
            float L2 = IsRoad(j) ? L - 4.4f : L;   // tot aan de stoep van een weg
            Strip(M("pad"), fr, d, r, 0f, L2, 1.1f, 0.105f); StripSides(M("pad"), fr, d, r, 0f, L2, 1.1f, -0.3f, 0.105f);
        }
    }

    static Color ColorOf(string k)
    {
        switch (k)
        {
            case "muur": case "muur0": return new Color(0.93f, 0.86f, 0.72f); case "muur1": return new Color(0.72f, 0.42f, 0.32f); case "muur2": return new Color(0.88f, 0.88f, 0.84f); case "muur3": return new Color(0.55f, 0.5f, 0.45f);
            case "dak": case "dak0": return new Color(0.65f, 0.30f, 0.22f); case "dak1": return new Color(0.35f, 0.33f, 0.36f);
            case "paal": return new Color(0.25f, 0.27f, 0.3f); case "lamp": return new Color(0.85f, 0.85f, 0.8f);
            case "kantoor": return new Color(0.58f, 0.68f, 0.78f); case "glas": return new Color(0.20f, 0.30f, 0.40f);
            case "plat": return new Color(0.50f, 0.50f, 0.53f); case "gras": return new Color(0.52f, 0.74f, 0.33f);
            case "water": return new Color(0.20f, 0.50f, 0.78f); case "zand": return new Color(0.86f, 0.79f, 0.55f);
            case "pad": return new Color(0.82f, 0.76f, 0.63f); case "blad": return new Color(0.20f, 0.50f, 0.22f);
            case "steen": return new Color(0.62f, 0.60f, 0.58f); case "stoep": return new Color(0.88f, 0.84f, 0.72f);
            case "asfalt": return new Color(0.27f, 0.28f, 0.30f); case "lijn": return Color.white;
            case "modder": return new Color(0.45f, 0.38f, 0.26f); case "riet": return new Color(0.45f, 0.6f, 0.25f);
            default: return new Color(0.40f, 0.28f, 0.18f);
        }
    }

    public static void Rebuild()
    {
        if (dirty.Count == 0) return;
        foreach (int ch in dirty) BuildChunk(ch);
        dirty.Clear();
    }

    static void BuildChunk(int ch)
    {
        if (chunks.TryGetValue(ch, out var old) && old != null) UnityEngine.Object.Destroy(old.gameObject);
        chunks.Remove(ch);
        var mb = new Dictionary<string, MeshBuilder>();
        System.Func<string, MeshBuilder> M = k => { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; };
        int i0 = ch * ChunkN, i1 = Mathf.Min(Planet.Cells.Length, i0 + ChunkN);
        for (int i = i0; i < i1; i++)
        {
            if (!Cells.TryGetValue(i, out var list) || list.Count == 0) continue;
            var fr = new Frame(i);
            if (list[0] == "weg") { Road(mb, fr, i); continue; }
            if (list.Count == 1 && list[0] == "meer") { Lake(mb, fr, i, 0f, i * 73856093); continue; }
            if (list.Count == 1 && list[0] == "pad") { Footpath(mb, fr, i); continue; }
            float h = 0f; int hash = i * 73856093;
            for (int k = 0; k < list.Count; k++)
            {
                string t = list[k]; bool top = k == list.Count - 1; float h1 = h + Blocks.Height(t), h0 = k == 0 ? -0.2f : h;   // onderste blok iets de bodem in (de bol loopt af naar de hoeken)
                switch (t)
                {
                    case "woning":
                        { string mu = "muur" + ((hash >> 3) & 3), dk = "dak" + ((hash >> 7) & 1);
                        Wall(M(mu), fr, 0.78f, h0, h1); Windows(M("glas"), fr, 0.78f, h + 1.0f, h + 2.0f, 0.18f, 0.40f); Windows(M("glas"), fr, 0.78f, h + 1.0f, h + 2.0f, 0.60f, 0.82f);
                        if (top) { Roof(M(dk), fr, 0.84f, h1); Top(M(dk), fr, 0.84f, h1 - 0.02f); } else Top(M(mu), fr, 0.78f, h1); }
                        break;
                    case "kantoor":
                        Wall(M("kantoor"), fr, 0.9f, h0, h1); Windows(M("glas"), fr, 0.9f, h + 0.5f, h + 1.2f, 0.08f, 0.92f); Windows(M("glas"), fr, 0.9f, h + 1.7f, h + 2.4f, 0.08f, 0.92f);
                        Top(M("plat"), fr, 0.9f, h1); if (top) { Wall(M("plat"), fr, 0.9f, h1, h1 + 0.25f); Top(M("plat"), fr, 0.9f, h1 + 0.25f); }
                        break;
                    case "dak":
                        Cone(M("dak"), fr, 0, 0, fr.rad * 0.95f, h, h1, fr.rad * 0.5f); Top(M("dak"), fr, 0.5f, h1);
                        break;
                    case "park":
                        Top(M("gras"), fr, 0.98f, h + 0.05f); if (k == 0) Wall(M("gras"), fr, 0.98f, -0.2f, h + 0.05f);
                        for (int j = 0; j < 3; j++)
                        {
                            float a = ((hash >> (j * 5)) & 31) / 31f * 6.28f + j * 2.1f, rr = (0.25f + ((hash >> (j * 3 + 2)) & 7) / 7f * 0.45f) * fr.rad;
                            float tx = Mathf.Cos(a) * rr, tz = Mathf.Sin(a) * rr;
                            Cone(M("stam"), fr, tx, tz, 0.22f, h + 0.05f, h + 1.2f, 0.18f); Cone(M("blad"), fr, tx, tz, 1.5f, h + 1.0f, h + 4.0f, 0f);
                        }
                        break;
                    case "water":
                        Top(M("water"), fr, 1.0f, h + 0.03f); if (k == 0) Wall(M("water"), fr, 1.0f, -0.2f, h + 0.03f);
                        break;
                    case "meer":
                        Lake(mb, fr, i, h, hash);
                        break;
                    case "kuil":   // uitgraving: de bodem 3 m lager, grashellingen naar de rand
                        Cone(M("gras"), fr, 0, 0, fr.rad * 0.55f, h1, h, fr.rad * 1.0f); Cap6(M("gras"), fr, fr.rad * 0.55f, h1); Top(M("gras"), fr, 1.0f, h + 0.01f);
                        break;
                    case "pad":
                        Wall(M("pad"), fr, 0.72f, h0, h1); Top(M("pad"), fr, 0.72f, h1);
                        break;
                    case "heuvel":
                        Cone(M("gras"), fr, 0, 0, fr.rad * 1.0f, h0, h1, fr.rad * 0.55f); Cap6(M("gras"), fr, fr.rad * 0.55f, h1);
                        break;
                    case "blok":
                        Wall(M("steen"), fr, 0.96f, h0, h1); Top(M("steen"), fr, 0.96f, h1);
                        break;
                }
                h = h1;
            }
        }
        if (mb.Count == 0) return;
        var go = new GameObject("Deel " + ch); go.transform.SetParent(root, false); chunks[ch] = go.transform;
        foreach (var kv in mb)
        {
            if (kv.Value.v.Count == 0) continue;
            var child = new GameObject(kv.Key); child.transform.SetParent(go.transform, false);
            var mesh = kv.Value.Build(); child.AddComponent<MeshFilter>().sharedMesh = mesh; child.AddComponent<MeshRenderer>().sharedMaterial = kv.Key == "lamp" ? Mats.GetUnlit("p_lamp", ColorOf(kv.Key)) : Mats.Get("p_" + kv.Key, ColorOf(kv.Key));
            if (kv.Key != "water" && kv.Key != "zand" && kv.Key != "lijn" && kv.Key != "lamp" && kv.Key != "riet") child.AddComponent<MeshCollider>().sharedMesh = mesh;
        }
    }
}
