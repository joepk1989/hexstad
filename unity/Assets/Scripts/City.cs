using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

// De stad: per vak een stapel blokken (zoals in de browserversie), plus de wegen. Opslaan en laden als JSON.
public static class Blocks
{
    // volgorde = toetsen 1-9 in de bouwmodus
    public static readonly string[] Tools = { "weg", "woning", "kantoor", "park", "water", "meer", "pad", "dak", "heuvel", "blok", "gum" };
    public static readonly string[] Names = { "Weg", "Woning", "Kantoor", "Park", "Gracht", "Meer", "Pad", "Dak", "Heuvel", "Blok", "Gum" };
    public static float Height(string t)
    {
        switch (t) { case "woning": case "kantoor": case "heuvel": case "blok": return 3f; case "dak": return 2.5f; case "pad": return 0.15f; case "park": return 0.05f; default: return 0f; }
    }
}

[Serializable] public class CellSave { public int q, r; public string[] items; }
[Serializable] public class PathSave { public float[] x, y; public int level; public bool hs, he; }
[Serializable] public class SaveData { public List<CellSave> cells = new List<CellSave>(); public List<PathSave> paths = new List<PathSave>(); }

public static class City
{
    public static Dictionary<Vector2Int, List<string>> Cells = new Dictionary<Vector2Int, List<string>>();
    public static List<RoadPath> Paths = new List<RoadPath>();

    public static Dictionary<Vector2Int, List<string>> CloneCells(Dictionary<Vector2Int, List<string>> src)
    {
        var d = new Dictionary<Vector2Int, List<string>>();
        foreach (var kv in src) d[kv.Key] = new List<string>(kv.Value);
        return d;
    }

    public static float StackHeight(Vector2Int c)
    {
        float h = 0f; if (Cells.TryGetValue(c, out var l)) foreach (var t in l) h += Blocks.Height(t); return h;
    }

    public static void Place(Vector2Int c, string type)
    {
        if (!Cells.TryGetValue(c, out var l)) { l = new List<string>(); Cells[c] = l; }
        if (l.Count >= 8) return;
        // water en meer vervangen elkaar; op water kan niets gestapeld worden
        if ((type == "water" || type == "meer") && l.Count > 0) { l.Clear(); }
        if (l.Count > 0 && (l[l.Count - 1] == "water" || l[l.Count - 1] == "meer")) l.Clear();
        l.Add(type);
    }

    public static bool RemoveTop(Vector2Int c)
    {
        if (!Cells.TryGetValue(c, out var l) || l.Count == 0) return false;
        l.RemoveAt(l.Count - 1); if (l.Count == 0) Cells.Remove(c); return true;
    }

    static string FilePath => Path.Combine(Application.persistentDataPath, "raatstad.json");

    public static void Save()
    {
        try
        {
            var sd = new SaveData();
            foreach (var kv in Cells) sd.cells.Add(new CellSave { q = kv.Key.x, r = kv.Key.y, items = kv.Value.ToArray() });
            foreach (var p in Paths)
            {
                var ps = new PathSave { level = p.Level, hs = p.HeadS, he = p.HeadE, x = new float[p.P.Count], y = new float[p.P.Count] };
                for (int i = 0; i < p.P.Count; i++) { ps.x[i] = p.P[i].x; ps.y[i] = p.P[i].y; }
                sd.paths.Add(ps);
            }
            File.WriteAllText(FilePath, JsonUtility.ToJson(sd));
        }
        catch (Exception e) { Debug.LogWarning("Opslaan mislukt: " + e.Message); }
    }

    public static bool Load()
    {
        try
        {
            if (!File.Exists(FilePath)) return false;
            var sd = JsonUtility.FromJson<SaveData>(File.ReadAllText(FilePath)); if (sd == null) return false;
            Cells = new Dictionary<Vector2Int, List<string>>();
            foreach (var c in sd.cells) if (c.items != null && c.items.Length > 0) Cells[new Vector2Int(c.q, c.r)] = new List<string>(c.items);
            Paths = new List<RoadPath>();
            foreach (var ps in sd.paths)
            {
                var p = new RoadPath { Level = ps.level, HeadS = ps.hs, HeadE = ps.he };
                for (int i = 0; i < ps.x.Length; i++) p.P.Add(new Vector2(ps.x[i], ps.y[i]));
                if (p.P.Count > 0) Paths.Add(p);
            }
            return true;
        }
        catch (Exception e) { Debug.LogWarning("Laden mislukt: " + e.Message); return false; }
    }

    public static float RoadLength()
    {
        float l = 0f; foreach (var p in Paths) for (int i = 0; i < p.P.Count - 1; i++) l += Vector2.Distance(p.P[i], p.P[i + 1]); return l;
    }
}

// Materialen op naam, lui aangemaakt (en opnieuw als ze na een hercompilatie weg zijn)
public static class Mats
{
    static readonly Dictionary<string, Material> cache = new Dictionary<string, Material>();
    public static Material Get(string name, Color c)
    {
        if (cache.TryGetValue(name, out var m) && m != null) return m;
        m = Raatstad.MakeMat(c); cache[name] = m; return m;
    }
}

// Plat gearceerde (low-poly) meshes: elke driehoek krijgt zijn eigen normaal
public class MeshBuilder
{
    public List<Vector3> v = new List<Vector3>(), n = new List<Vector3>(); public List<int> t = new List<int>();
    // outward: richting waarin de voorkant moet wijzen
    public void Tri(Vector3 a, Vector3 b, Vector3 c, Vector3 outward)
    {
        Vector3 nr = Vector3.Cross(b - a, c - a); if (nr.sqrMagnitude < 1e-10f) return;
        if (Vector3.Dot(nr, outward) < 0f) { Vector3 tmp = b; b = c; c = tmp; nr = -nr; }
        nr.Normalize(); int i = v.Count; v.Add(a); v.Add(b); v.Add(c); n.Add(nr); n.Add(nr); n.Add(nr); t.Add(i); t.Add(i + 1); t.Add(i + 2);
    }
    public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector3 outward) { Tri(a, b, c, outward); Tri(a, c, d, outward); }
    public Mesh Build()
    {
        var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
        m.SetVertices(v); m.SetNormals(n); m.SetTriangles(t, 0); m.RecalculateBounds(); return m;
    }
}

// Bouwt alle blokken van de stad: één mesh per materiaal
public static class BlockMesher
{
    static Vector3 P(Vector2 c, float k, int i, float y, Vector2 centre)
    {
        Vector2 a = Hex.Corner(centre, i % 6); Vector2 q = centre + (a - centre) * k; return new Vector3(q.x, y, q.y);
    }

    static void Wall(MeshBuilder m, Vector2 c, float k, float y0, float y1)
    {
        for (int i = 0; i < 6; i++)
        {
            Vector3 a0 = P(c, k, i, y0, c), b0 = P(c, k, i + 1, y0, c), a1 = P(c, k, i, y1, c), b1 = P(c, k, i + 1, y1, c);
            Vector3 mid = (a0 + b0) * 0.5f - new Vector3(c.x, y0, c.y);
            m.Quad(a0, b0, b1, a1, mid);
        }
    }
    static void Top(MeshBuilder m, Vector2 c, float k, float y)
    {
        Vector3 mid = new Vector3(c.x, y, c.y);
        for (int i = 0; i < 6; i++) m.Tri(mid, P(c, k, i, y, c), P(c, k, i + 1, y, c), Vector3.up);
    }
    static void Windows(MeshBuilder m, Vector2 c, float k, float y0, float y1, float f0, float f1)
    {
        for (int i = 0; i < 6; i++)
        {
            Vector3 a = P(c, k, i, 0, c), b = P(c, k, i + 1, 0, c); Vector3 outw = (a + b) * 0.5f - new Vector3(c.x, 0, c.y); outw.y = 0; outw.Normalize();
            Vector3 p0 = Vector3.Lerp(a, b, f0) + outw * 0.04f, p1 = Vector3.Lerp(a, b, f1) + outw * 0.04f;
            m.Quad(new Vector3(p0.x, y0, p0.z), new Vector3(p1.x, y0, p1.z), new Vector3(p1.x, y1, p1.z), new Vector3(p0.x, y1, p0.z), outw);
        }
    }
    static void Cone(MeshBuilder m, Vector2 c, float r, float y0, float y1, bool apex = true, float rTop = 0f)
    {
        for (int i = 0; i < 6; i++)
        {
            float a0 = i * Mathf.PI / 3f, a1 = (i + 1) * Mathf.PI / 3f;
            Vector3 b0 = new Vector3(c.x + Mathf.Cos(a0) * r, y0, c.y + Mathf.Sin(a0) * r), b1 = new Vector3(c.x + Mathf.Cos(a1) * r, y0, c.y + Mathf.Sin(a1) * r);
            Vector3 t0 = new Vector3(c.x + Mathf.Cos(a0) * rTop, y1, c.y + Mathf.Sin(a0) * rTop), t1 = new Vector3(c.x + Mathf.Cos(a1) * rTop, y1, c.y + Mathf.Sin(a1) * rTop);
            float am = (a0 + a1) * 0.5f; Vector3 outw = new Vector3(Mathf.Cos(am), (r - rTop) / Mathf.Max(0.01f, y1 - y0), Mathf.Sin(am));
            if (rTop <= 0.001f) m.Tri(b0, b1, new Vector3(c.x, y1, c.y), outw); else m.Quad(b0, b1, t1, t0, outw);
        }
    }

    public static void Build(Transform parent, Dictionary<Vector2Int, List<string>> cells, bool colliders)
    {
        foreach (Transform ch in parent) UnityEngine.Object.Destroy(ch.gameObject);
        var mb = new Dictionary<string, MeshBuilder>();
        MeshBuilder M(string k) { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; }

        foreach (var kv in cells)
        {
            Vector2 c = Hex.Center(kv.Key); float h = 0f; var list = kv.Value; int hash = kv.Key.x * 73856093 ^ kv.Key.y * 19349663;
            for (int i = 0; i < list.Count; i++)
            {
                string t = list[i]; bool top = i == list.Count - 1; float h1 = h + Blocks.Height(t);
                switch (t)
                {
                    case "woning":
                        Wall(M("muur"), c, 0.78f, h, h1); Windows(M("glas"), c, 0.78f, h + 1.0f, h + 2.0f, 0.18f, 0.40f); Windows(M("glas"), c, 0.78f, h + 1.0f, h + 2.0f, 0.60f, 0.82f);
                        if (top) { Vector3 apex = new Vector3(c.x, h1 + 2.4f, c.y); for (int j = 0; j < 6; j++) { Vector3 a = P(c, 0.84f, j, h1, c), b = P(c, 0.84f, j + 1, h1, c); M("dak").Tri(a, b, apex, (a + b) * 0.5f - new Vector3(c.x, h1, c.y) + Vector3.up * 0.6f); } Top(M("dak"), c, 0.84f, h1 - 0.02f); }
                        else Top(M("muur"), c, 0.78f, h1);
                        break;
                    case "kantoor":
                        Wall(M("kantoor"), c, 0.9f, h, h1); Windows(M("glas"), c, 0.9f, h + 0.5f, h + 1.2f, 0.08f, 0.92f); Windows(M("glas"), c, 0.9f, h + 1.7f, h + 2.4f, 0.08f, 0.92f);
                        Top(M("plat"), c, 0.9f, h1); if (top) { Wall(M("plat"), c, 0.9f, h1, h1 + 0.25f); Top(M("plat"), c, 0.9f, h1 + 0.25f); }
                        break;
                    case "dak":
                        Cone(M("dak"), c, Hex.R * 0.95f, h, h1, false, Hex.R * 0.5f); Top(M("dak"), c, 0.5f, h1);
                        break;
                    case "park":
                        Top(M("gras"), c, 0.98f, h + 0.05f);
                        for (int j = 0; j < 3; j++)
                        {
                            float a = ((hash >> (j * 5)) & 31) / 31f * 6.28f + j * 2.1f, rr = (0.25f + ((hash >> (j * 3 + 2)) & 7) / 7f * 0.45f) * Hex.R;
                            Vector2 tc = c + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * rr;
                            Cone(M("stam"), tc, 0.22f, h + 0.05f, h + 1.2f, false, 0.18f); Cone(M("blad"), tc, 1.5f, h + 1.0f, h + 4.0f);
                        }
                        break;
                    case "water":
                        Top(M("water"), c, 1.0f, h + 0.03f);
                        break;
                    case "meer":
                        Top(M("zand"), c, 1.0f, h + 0.03f); Top(M("water"), c, 0.8f, h + 0.045f);
                        break;
                    case "heuvel":
                        Cone(M("gras"), c, Hex.R * 1.0f, h, h1, false, Hex.R * 0.55f); Top(M("gras"), c, 0.55f, h1);
                        break;
                    case "blok":
                        Wall(M("steen"), c, 0.96f, h, h1); Top(M("steen"), c, 0.96f, h1);
                        break;
                    case "pad":
                        Wall(M("pad"), c, 0.72f, h, h1); Top(M("pad"), c, 0.72f, h1);
                        break;
                }
                h = h1;
            }
        }
        foreach (var kv in mb)
        {
            if (kv.Value.v.Count == 0) continue;
            Color col; switch (kv.Key)
            {
                case "muur": col = new Color(0.93f, 0.86f, 0.72f); break; case "dak": col = new Color(0.65f, 0.30f, 0.22f); break;
                case "kantoor": col = new Color(0.58f, 0.68f, 0.78f); break; case "glas": col = new Color(0.20f, 0.30f, 0.40f); break;
                case "plat": col = new Color(0.50f, 0.50f, 0.53f); break; case "gras": col = new Color(0.52f, 0.74f, 0.33f); break;
                case "water": col = new Color(0.20f, 0.50f, 0.78f); break; case "zand": col = new Color(0.86f, 0.79f, 0.55f); break;
                case "pad": col = new Color(0.82f, 0.76f, 0.63f); break; case "steen": col = new Color(0.62f, 0.60f, 0.58f); break; case "blad": col = new Color(0.20f, 0.50f, 0.22f); break;
                default: col = new Color(0.40f, 0.28f, 0.18f); break;
            }
            var go = new GameObject(kv.Key); go.transform.SetParent(parent, false);
            var mesh = kv.Value.Build(); go.AddComponent<MeshFilter>().sharedMesh = mesh; go.AddComponent<MeshRenderer>().sharedMaterial = Mats.Get("b_" + kv.Key, col);
            if (colliders && kv.Key != "water" && kv.Key != "zand") go.AddComponent<MeshCollider>().sharedMesh = mesh;
        }
    }
}
