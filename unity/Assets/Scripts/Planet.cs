using System.Collections.Generic;
using UnityEngine;

// Een echte planeet: een bol betegeld met zeshoeken, plus de 12 vijfhoeken die op een bol onvermijdelijk zijn.
// Gemaakt als Goldberg-veelvlak: een icosaëder wordt in M×M driehoeken verdeeld, op de bol geprojecteerd,
// en elk hoekpunt van dat net wordt een vak (de duale vorm). Vakken liggen hart-op-hart ongeveer 15,6 m,
// net als het platte raster. Elk vak heeft een eigen assenstelsel (oost, noord, omhoog) waarin gebouwd wordt.
public static class Planet
{
    public const float R = 600f;      // straal in meters (omtrek 3,8 km; rondlopen duurt een klein uur)
    public const int M = 46;          // verdeling: 10·M²+2 vakken

    public class Cell
    {
        public Vector3 dir;           // eenheidsvector van het middelpunt (middelpunt = dir * R)
        public Vector3[] corners;     // hoekpunten als eenheidsvectoren, op volgorde rondom
        public int[] nb;              // buurvakken (5 of 6)
        public Vector3 east, north;   // raakvlak-assen
        public Vector2[] local;       // hoekpunten in het raakvlak (oost, noord) in meters
        public float radius;          // gemiddelde afstand middelpunt-hoekpunt
    }
    public static Cell[] Cells;
    public static bool Ready => Cells != null;

    static Dictionary<int, List<int>> buckets;
    const float BucketDeg = 1.5f; const int LatN = 120, LonN = 240;

    public static Vector3 Pos(int i, float h) => Cells[i].dir * (R + h);
    public static Vector3 ToWorld(int i, Vector2 local, float h) { var c = Cells[i]; return c.dir * (R + h) + c.east * local.x + c.north * local.y; }
    // vlak-coördinaten (oost, noord) van een wereldpunt gezien vanuit vak i
    public static Vector2 ToLocal(int i, Vector3 world) { var c = Cells[i]; Vector3 d = world - c.dir * R; return new Vector2(Vector3.Dot(d, c.east), Vector3.Dot(d, c.north)); }

    public static void Build()
    {
        if (Cells != null) return;
        float t = (1f + Mathf.Sqrt(5f)) / 2f;
        Vector3[] iv = {
            new Vector3(-1, t, 0), new Vector3(1, t, 0), new Vector3(-1, -t, 0), new Vector3(1, -t, 0),
            new Vector3(0, -1, t), new Vector3(0, 1, t), new Vector3(0, -1, -t), new Vector3(0, 1, -t),
            new Vector3(t, 0, -1), new Vector3(t, 0, 1), new Vector3(-t, 0, -1), new Vector3(-t, 0, 1) };
        for (int i = 0; i < 12; i++) iv[i].Normalize();
        int[,] f = { {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},{1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
                     {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},{4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1} };

        // hoekpunten van het driehoekennet, gedeeld langs de randen van de icosaëdervlakken
        var verts = new List<Vector3>(); var index = new Dictionary<(int, int, int), int>();
        System.Func<Vector3, int> Vid = p =>
        {
            p.Normalize();
            var key = (Mathf.RoundToInt(p.x * 20000f), Mathf.RoundToInt(p.y * 20000f), Mathf.RoundToInt(p.z * 20000f));
            if (index.TryGetValue(key, out int id)) return id;
            id = verts.Count; verts.Add(p); index[key] = id; return id;
        };
        var tris = new List<int>();
        var grid = new int[M + 1, M + 1];
        for (int face = 0; face < 20; face++)
        {
            Vector3 A = iv[f[face, 0]], B = iv[f[face, 1]], C = iv[f[face, 2]];
            for (int i = 0; i <= M; i++) for (int j = 0; j <= M - i; j++) grid[i, j] = Vid(A * (M - i - j) + B * i + C * j);
            for (int i = 0; i < M; i++) for (int j = 0; j < M - i; j++)
            {
                AddTri(tris, verts, grid[i, j], grid[i + 1, j], grid[i, j + 1]);
                if (i + j < M - 1) AddTri(tris, verts, grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]);
            }
        }

        int nV = verts.Count, nT = tris.Count / 3;
        var vTris = new List<int>[nV]; var vNb = new List<int>[nV];
        for (int v = 0; v < nV; v++) { vTris[v] = new List<int>(6); vNb[v] = new List<int>(6); }
        for (int k = 0; k < nT; k++)
        {
            int a = tris[k * 3], b = tris[k * 3 + 1], c = tris[k * 3 + 2];
            vTris[a].Add(k); vTris[b].Add(k); vTris[c].Add(k);
            Link(vNb, a, b); Link(vNb, b, c); Link(vNb, c, a);
        }

        Cells = new Cell[nV];
        for (int v = 0; v < nV; v++)
        {
            var c = new Cell { dir = verts[v], nb = vNb[v].ToArray() };
            Vector3 up = c.dir;
            Vector3 refAxis = Mathf.Abs(up.y) > 0.9f ? Vector3.right : Vector3.up;
            c.east = Vector3.Cross(refAxis, up).normalized; c.north = Vector3.Cross(up, c.east).normalized;
            var list = vTris[v]; var cs = new List<(float, Vector3)>(list.Count);
            foreach (int k in list)
            {
                Vector3 cen = (verts[tris[k * 3]] + verts[tris[k * 3 + 1]] + verts[tris[k * 3 + 2]]).normalized;
                Vector3 d = cen - up; float ang = Mathf.Atan2(Vector3.Dot(d, c.north), Vector3.Dot(d, c.east));
                cs.Add((ang, cen));
            }
            cs.Sort((p, q) => p.Item1.CompareTo(q.Item1));
            c.corners = new Vector3[cs.Count]; c.local = new Vector2[cs.Count]; float rs = 0f;
            for (int k = 0; k < cs.Count; k++)
            {
                c.corners[k] = cs[k].Item2;
                Vector3 d = cs[k].Item2 * R - up * R;
                c.local[k] = new Vector2(Vector3.Dot(d, c.east), Vector3.Dot(d, c.north)); rs += c.local[k].magnitude;
            }
            c.radius = rs / cs.Count;
            Cells[v] = c;
        }

        // opzoektabel op breedte- en lengtegraad
        buckets = new Dictionary<int, List<int>>();
        for (int v = 0; v < nV; v++) { int key = BucketKey(Cells[v].dir); if (!buckets.TryGetValue(key, out var l)) { l = new List<int>(2); buckets[key] = l; } l.Add(v); }
    }

    static void AddTri(List<int> tris, List<Vector3> verts, int a, int b, int c)
    {
        Vector3 n = Vector3.Cross(verts[b] - verts[a], verts[c] - verts[a]);
        if (Vector3.Dot(n, verts[a] + verts[b] + verts[c]) < 0f) { int tmp = b; b = c; c = tmp; }
        tris.Add(a); tris.Add(b); tris.Add(c);
    }
    static void Link(List<int>[] nb, int a, int b) { if (!nb[a].Contains(b)) nb[a].Add(b); if (!nb[b].Contains(a)) nb[b].Add(a); }

    static void LatLon(Vector3 d, out int la, out int lo)
    {
        float lat = Mathf.Asin(Mathf.Clamp(d.y, -1f, 1f)) * Mathf.Rad2Deg, lon = Mathf.Atan2(d.z, d.x) * Mathf.Rad2Deg;
        la = Mathf.Clamp(Mathf.FloorToInt((lat + 90f) / BucketDeg), 0, LatN - 1);
        lo = ((Mathf.FloorToInt((lon + 180f) / BucketDeg) % LonN) + LonN) % LonN;
    }
    static int BucketKey(Vector3 d) { LatLon(d, out int la, out int lo); return la * LonN + lo; }

    // het vak waar een wereldpunt (of richting) het dichtst bij ligt
    public static int Nearest(Vector3 world)
    {
        Vector3 d = world.normalized; LatLon(d, out int la, out int lo);
        float lat = Mathf.Asin(Mathf.Clamp(d.y, -1f, 1f));
        int span = Mathf.Min(LonN / 2, Mathf.CeilToInt(2f / Mathf.Max(0.02f, Mathf.Cos(lat))));
        int best = 0; float bestDot = -2f;
        for (int dl = -2; dl <= 2; dl++)
        {
            int la2 = la + dl; if (la2 < 0 || la2 >= LatN) continue;
            for (int dL = -span; dL <= span; dL++)
            {
                int lo2 = ((lo + dL) % LonN + LonN) % LonN;
                if (!buckets.TryGetValue(la2 * LonN + lo2, out var l)) continue;
                foreach (int v in l) { float dot = Vector3.Dot(Cells[v].dir, d); if (dot > bestDot) { bestDot = dot; best = v; } }
            }
        }
        return best;
    }
}
