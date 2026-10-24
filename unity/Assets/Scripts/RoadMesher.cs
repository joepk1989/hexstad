using System.Collections.Generic;
using UnityEngine;

// Bouwt de meshes van het wegennet: stoep onder, asfalt erop (kruisingen sluiten dus vanzelf aan), middenstrepen,
// ronde koppen en bij een hogere laag een wand tot aan de grond.
public static class RoadMesher
{
    class MB
    {
        public List<Vector3> v = new List<Vector3>(); public List<int> t = new List<int>();
        public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, bool both = false)   // a-b-c-d tegen de klok in gezien van boven
        {
            int i = v.Count; v.Add(a); v.Add(b); v.Add(c); v.Add(d);
            t.AddRange(new[] { i, i + 1, i + 2, i, i + 2, i + 3 });
            if (both) t.AddRange(new[] { i, i + 2, i + 1, i, i + 3, i + 2 });
        }
        public Mesh Build() { var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; m.SetVertices(v); m.SetTriangles(t, 0); m.RecalculateNormals(); m.RecalculateBounds(); return m; }
    }

    static Vector3 V(Vector2 p, float y) => new Vector3(p.x, y, p.y);

    static void Ribbon(MB mb, List<Vector2> P, float a, float b, float y)
    {
        int n = P.Count; if (n < 2) return;
        var A = new Vector3[n]; var B = new Vector3[n];
        for (int i = 0; i < n; i++)
        {
            Vector2 dPrev = i > 0 ? (P[i] - P[i - 1]).normalized : (P[1] - P[0]).normalized;
            Vector2 dNext = i < n - 1 ? (P[i + 1] - P[i]).normalized : dPrev;
            Vector2 nPrev = new Vector2(-dPrev.y, dPrev.x), nNext = new Vector2(-dNext.y, dNext.x);
            Vector2 m = (nPrev + nNext); m = m.sqrMagnitude < 1e-6f ? nPrev : m.normalized;
            float s = 1f / Mathf.Max(0.4f, Vector2.Dot(m, nPrev));
            A[i] = V(P[i] + m * (a * s), y); B[i] = V(P[i] + m * (b * s), y);
        }
        for (int i = 0; i < n - 1; i++) mb.Quad(A[i], B[i], B[i + 1], A[i + 1]);
    }

    static void Disc(MB mb, Vector2 c, float r, float y, int seg = 28)
    {
        for (int i = 0; i < seg; i++)
        {
            float a0 = i * Mathf.PI * 2 / seg, a1 = (i + 1) * Mathf.PI * 2 / seg;
            Vector2 p0 = c + new Vector2(Mathf.Cos(a0), Mathf.Sin(a0)) * r, p1 = c + new Vector2(Mathf.Cos(a1), Mathf.Sin(a1)) * r;
            int k = mb.v.Count; mb.v.Add(V(c, y)); mb.v.Add(V(p1, y)); mb.v.Add(V(p0, y)); mb.t.AddRange(new[] { k, k + 1, k + 2 });
        }
    }

    static void RingWall(MB mb, Vector2 c, float r, float y, int seg = 28)
    {
        for (int i = 0; i < seg; i++)
        {
            float a0 = i * Mathf.PI * 2 / seg, a1 = (i + 1) * Mathf.PI * 2 / seg;
            Vector2 p0 = c + new Vector2(Mathf.Cos(a0), Mathf.Sin(a0)) * r, p1 = c + new Vector2(Mathf.Cos(a1), Mathf.Sin(a1)) * r;
            mb.Quad(V(p0, y), V(p1, y), V(p1, 0f), V(p0, 0f), true);
        }
    }

    static void SideWall(MB mb, List<Vector2> P, float off, float y)
    {
        int n = P.Count; if (n < 2) return;
        var T = new Vector3[n];
        for (int i = 0; i < n; i++)
        {
            Vector2 dPrev = i > 0 ? (P[i] - P[i - 1]).normalized : (P[1] - P[0]).normalized;
            Vector2 dNext = i < n - 1 ? (P[i + 1] - P[i]).normalized : dPrev;
            Vector2 nPrev = new Vector2(-dPrev.y, dPrev.x), nNext = new Vector2(-dNext.y, dNext.x);
            Vector2 m = nPrev + nNext; m = m.sqrMagnitude < 1e-6f ? nPrev : m.normalized;
            T[i] = V(P[i] + m * (off / Mathf.Max(0.4f, Vector2.Dot(m, nPrev))), y);
        }
        for (int i = 0; i < n - 1; i++) mb.Quad(T[i], T[i + 1], new Vector3(T[i + 1].x, 0f, T[i + 1].z), new Vector3(T[i].x, 0f, T[i].z), true);
    }

    public static void Build(Transform parent, List<RoadPath> paths, bool colliders)
    {
        foreach (Transform c in parent) Object.Destroy(c.gameObject);
        var walk = new MB(); var asph = new MB(); var dash = new MB(); var wall = new MB();
        float hw = RoadRules.HW, ow = hw + RoadRules.WALK, hr = RoadRules.HeadR, ho = hr + RoadRules.WALK;
        foreach (var p in paths)
        {
            float lv = p.Level * RoadRules.LAYER_H, yW = lv + 0.12f, yA = lv + 0.15f, yD = lv + 0.17f;
            if (p.IsLone)
            {
                Disc(walk, p.P[0], ho, yW); Disc(asph, p.P[0], hr, yA);
                if (p.Level > 0) RingWall(wall, p.P[0], ho, yW);
                continue;
            }
            Ribbon(walk, p.P, -ow, ow, yW); Ribbon(asph, p.P, -hw, hw, yA);
            if (p.HeadS) { Disc(walk, p.P[0], ho, yW); Disc(asph, p.P[0], hr, yA); if (p.Level > 0) RingWall(wall, p.P[0], ho, yW); }
            if (p.HeadE) { Disc(walk, p.P[p.P.Count - 1], ho, yW); Disc(asph, p.P[p.P.Count - 1], hr, yA); if (p.Level > 0) RingWall(wall, p.P[p.P.Count - 1], ho, yW); }
            if (p.Level > 0) { SideWall(wall, p.P, ow, yW); SideWall(wall, p.P, -ow, yW); }
            // streepjes in het midden, niet bij kruisingen
            float acc = 0f;
            for (int i = 0; i < p.P.Count - 1; i++)
            {
                Vector2 a = p.P[i], b = p.P[i + 1]; float L = Vector2.Distance(a, b); Vector2 d = (b - a) / L, nrm = new Vector2(-d.y, d.x);
                for (float s = 1.5f; s + 3f < L - 1.5f; s += 6f)
                {
                    Vector2 s0 = a + d * s, s1 = a + d * (s + 3f); bool skip = false;
                    foreach (var q in paths) { if (q == p || q.Level != p.Level) continue; if (RoadRules.DistToPath(q, s0) < ow + 1f || RoadRules.DistToPath(q, s1) < ow + 1f) { skip = true; break; } }
                    if (skip) continue;
                    dash.Quad(V(s0 - nrm * 0.08f, yD), V(s0 + nrm * 0.08f, yD), V(s1 + nrm * 0.08f, yD), V(s1 - nrm * 0.08f, yD));
                }
                acc += L;
            }
        }
        Make(parent, "stoep", walk, Raatstad.MatWalk, colliders); Make(parent, "asfalt", asph, Raatstad.MatAsphalt, colliders);
        Make(parent, "strepen", dash, Raatstad.MatLine, false); Make(parent, "wand", wall, Raatstad.MatWall, colliders);
    }

    static void Make(Transform parent, string name, MB mb, Material mat, bool collider)
    {
        if (mb.v.Count == 0) return;
        var go = new GameObject(name); go.transform.SetParent(parent, false);
        var mesh = mb.Build(); go.AddComponent<MeshFilter>().sharedMesh = mesh; go.AddComponent<MeshRenderer>().sharedMaterial = mat;
        if (collider) go.AddComponent<MeshCollider>().sharedMesh = mesh;
    }
}
