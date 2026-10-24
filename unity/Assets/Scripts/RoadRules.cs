using System.Collections.Generic;
using UnityEngine;

// Een weg: een lijn door vakmiddens. Eén punt = één vak met een rondje (zoals bij een pad).
public class RoadPath
{
    public List<Vector2> P = new List<Vector2>();
    public int Level;               // vaste laag: hoogte = Level * 3 m, los van het terrein
    public bool HeadS = true, HeadE = true;   // ronde kop aan begin/eind (weg als het eind op een andere weg aansluit)
    public bool IsLone => P.Count == 1;
    public RoadPath Clone() { var c = new RoadPath { Level = Level, HeadS = HeadS, HeadE = HeadE }; c.P.AddRange(P); return c; }
}

public static class RoadRules
{
    public const float HW = 2.5f, WALK = 2.0f, HEAD_EXT = 2.1f, LAYER_H = 3f;
    public static float HeadR => HW + HEAD_EXT + 0.3f;
    static readonly float Lim = Hex.Pitch * 1.05f;

    public static List<RoadPath> CloneAll(List<RoadPath> src) { var l = new List<RoadPath>(src.Count); foreach (var p in src) l.Add(p.Clone()); return l; }

    public static float DistToPath(RoadPath p, Vector2 q)
    {
        float best = float.MaxValue;
        if (p.P.Count == 1) return Vector2.Distance(p.P[0], q);
        for (int i = 0; i < p.P.Count - 1; i++) best = Mathf.Min(best, DistToSeg(p.P[i], p.P[i + 1], q));
        return best;
    }
    static float DistToSeg(Vector2 a, Vector2 b, Vector2 q)
    {
        Vector2 d = b - a; float l2 = d.sqrMagnitude; float f = l2 < 1e-9f ? 0 : Mathf.Clamp01(Vector2.Dot(q - a, d) / l2);
        return Vector2.Distance(a + d * f, q);
    }

    // Wegen lopen alleen onder hoeken van het raster: veelvouden van 30 graden (dus 60 en 90 graden bochten).
    public static bool Aligned(Vector2 from, Vector2 to)
    {
        Vector2 d = to - from; float a = Mathf.Atan2(d.y, d.x) * Mathf.Rad2Deg;
        return Mathf.Abs(a / 30f - Mathf.Round(a / 30f)) * 30f < 2.5f;
    }

    // het eindvak schuift naar het dichtstbijzijnde vak op een 30°-lijn vanaf het beginvak
    public static Vector2Int AlignCell(Vector2Int from, Vector2Int cell)
    {
        if (from == cell) return cell;
        Vector2 f = Hex.Center(from), c = Hex.Center(cell); Vector2Int best = cell; float bd = float.MaxValue;
        for (int dq = -3; dq <= 3; dq++) for (int dr = -3; dr <= 3; dr++)
        {
            var k = new Vector2Int(cell.x + dq, cell.y + dr); if (k == from) continue;
            Vector2 w = Hex.Center(k); if (!Aligned(f, w)) continue;
            float d = Vector2.Distance(w, c); if (d < bd) { bd = d; best = k; }
        }
        return best;
    }

    // Aansluiten op een andere weg, alleen langs een rasterrichting vanaf het vorige punt.
    public static bool Snap(Vector2 from, Vector2 W, RoadPath self, List<RoadPath> all, int level, out Vector2 snapped)
    {
        snapped = W; float bd = float.MaxValue; bool found = false;
        for (int i = 0; i < 12; i++)
        {
            float a = i * Mathf.PI / 6f; Vector2 d = new Vector2(Mathf.Cos(a), Mathf.Sin(a));
            foreach (var q in all)
            {
                if (q == self || q.P.Count < 2 || q.Level != level) continue;
                for (int j = 0; j < q.P.Count - 1; j++)
                {
                    Vector2 s = q.P[j], e = q.P[j + 1] - s; float den = d.x * e.y - d.y * e.x; if (Mathf.Abs(den) < 1e-6f) continue;
                    float t = ((s.x - from.x) * e.y - (s.y - from.y) * e.x) / den, u = ((s.x - from.x) * d.y - (s.y - from.y) * d.x) / den;
                    if (t < 3f || u < 0f || u > 1f) continue;
                    Vector2 p = from + d * t; float dd = Vector2.Distance(p, W);
                    if (dd < Lim && dd < bd) { bd = dd; snapped = p; found = true; }
                }
            }
        }
        return found;
    }

    // Eén klik op een vak: een weg in een buurvak loopt door; anders begint hier een rondje. Geeft null als er niets verandert.
    public static List<RoadPath> Click(List<RoadPath> src, Vector2Int cell, int level)
    {
        Vector2 W = Hex.Center(cell);
        foreach (var q in src) if (q.Level == level) foreach (var pt in q.P) if (Vector2.Distance(pt, W) < 3f) return null;   // ligt er al
        var all = CloneAll(src); RoadPath best = null; bool atStart = false; float bd = float.MaxValue;
        foreach (var p in all)
        {
            if (p.Level != level) continue;
            for (int k = 0; k < 2; k++)
            {
                Vector2 e = k == 0 ? p.P[0] : p.P[p.P.Count - 1]; float d = Vector2.Distance(e, W);
                if (d < 1f || d > Lim) continue;
                if (p.P.Count == 1 && k == 1) continue;
                if (d < bd) { bd = d; best = p; atStart = k == 0; }
            }
        }
        if (best == null) { all.Add(new RoadPath { Level = level, P = { W } }); return all; }
        Vector2 prev = atStart ? best.P[0] : best.P[best.P.Count - 1];
        bool snapped = Snap(prev, W, best, all, level, out Vector2 S);
        if (snapped) W = S;
        if (atStart) { best.P.Insert(0, W); best.HeadS = !snapped; } else { best.P.Add(W); best.HeadE = !snapped; }
        return all;
    }

    // Lang vasthouden en slepen: een rechte lijn tussen twee vakken, onder een rasterhoek.
    public static List<RoadPath> Line(List<RoadPath> src, Vector2Int a, Vector2Int b, int level)
    {
        if (a == b) return null;
        var all = CloneAll(src); var p = new RoadPath { Level = level }; p.P.Add(Hex.Center(a)); Vector2 W = Hex.Center(b);
        if (Snap(p.P[0], W, p, all, level, out Vector2 S)) { W = S; p.HeadE = false; }
        p.P.Add(W); all.Add(p); return all;
    }

    public static void Erase(List<RoadPath> all, Vector2 at, int level)
    {
        RoadPath best = null; float bd = HW + WALK + 1f;
        foreach (var p in all) { if (p.Level != level) continue; float d = DistToPath(p, at); if (d < bd) { bd = d; best = p; } }
        if (best != null) all.Remove(best);
    }
}
