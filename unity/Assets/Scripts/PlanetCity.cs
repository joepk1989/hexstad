using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

// De stad op de planeet: per vak een stapel blokken; een vak waarvan het onderste blok "weg" is, is een wegvak.
// Wegvakken sluiten vanzelf op elkaar aan (asfalt van hart naar hart, stoep eromheen). Alles wordt in het
// assenstelsel van het vak gebouwd, zodat gebouwen overal recht op de bol staan. De bodem is één mesh per
// deel (1024 vakken); blokken en wegen worden per deel opnieuw gemaakt als er iets verandert.
[Serializable] public class PCellSave { public int i; public string[] items; }
[Serializable] public class PSaveData { public int m; public float r; public List<PCellSave> cells = new List<PCellSave>(); public List<int> links = new List<int>(); }

public static class PlanetCity
{
    public static Dictionary<int, List<string>> Cells = new Dictionary<int, List<string>>();
    public const int ChunkN = 1024;
    static Transform root, groundRoot;
    static readonly Dictionary<int, Transform> chunks = new Dictionary<int, Transform>();
    static readonly HashSet<int> dirty = new HashSet<int>();

    public static void ResetAll() { Cells = new Dictionary<int, List<string>>(); Links.Clear(); partners.Clear(); chunks.Clear(); groundChunks.Clear(); dirty.Clear(); root = null; groundRoot = null; grid = null; GridOn = true; Slot = 1; }
    public static bool IsRoad(int i) => Cells.TryGetValue(i, out var l) && l.Count > 0 && l[0] == "weg";
    public static bool IsPath(int i) => Cells.TryGetValue(i, out var l) && l.Count == 1 && l[0] == "pad";
    public static bool IsWalk(int i) => IsRoad(i) || IsPath(i);

    // Verbindingen tussen weg- en padvakken. Twee wegvakken naast elkaar zijn alleen verbonden als ze in dezelfde lijn
    // gesleept zijn of met een klik aan elkaar gezet; zo kunnen twee wegen naast elkaar lopen zonder in elkaar over te gaan.
    public static readonly HashSet<long> Links = new HashSet<long>();
    static readonly Dictionary<int, List<int>> partners = new Dictionary<int, List<int>>();
    static readonly List<int> none = new List<int>();
    static long Key(int i, int j) => i < j ? ((long)i << 20) | (uint)j : ((long)j << 20) | (uint)i;
    public static bool Linked(int i, int j) => Links.Contains(Key(i, j));
    // de vakken waarmee i verbonden is (buren, of vakken op afstand 2 recht door de hoek: dan loopt de weg over twee halve vakken)
    public static List<int> Partners(int i) => partners.TryGetValue(i, out var l) ? l : none;
    public static bool Adjacent2(int i, int j) => System.Array.IndexOf(Planet.Cells[i].nb, j) >= 0 || System.Array.IndexOf(Planet.Cells[i].across, j) >= 0;
    public static void Link(int i, int j)
    {
        if (i == j || !Adjacent2(i, j) || !Links.Add(Key(i, j))) return;
        if (!partners.TryGetValue(i, out var a)) partners[i] = a = new List<int>(6); a.Add(j);
        if (!partners.TryGetValue(j, out var b)) partners[j] = b = new List<int>(6); b.Add(i);
    }
    public static void Unlink(int i)
    {
        if (!partners.TryGetValue(i, out var a)) return;
        foreach (int j in a) { Links.Remove(Key(i, j)); if (partners.TryGetValue(j, out var b)) b.Remove(i); if (!IsNeighbour(i, j)) ClearHalves(i, j); }
        partners.Remove(i);
    }
    static bool IsNeighbour(int i, int j) => System.Array.IndexOf(Planet.Cells[i].nb, j) >= 0;
    // de twee vakken tussen i en j (afstand 2): de gemeenschappelijke buren
    public static List<int> Between(int i, int j) { var l = new List<int>(2); foreach (int x in Planet.Cells[i].nb) if (IsNeighbour(j, x)) l.Add(x); return l; }
    public static bool IsHalf(int i) => Cells.TryGetValue(i, out var l) && l.Count == 1 && l[0] == "wegdeel";
    static void ClearHalves(int i, int j) { foreach (int h in Between(i, j)) if (IsHalf(h)) { Cells.Remove(h); Touch(h); } }
    public static bool LinkedRoad(int i, int j) => IsRoad(j) && Linked(i, j);
    public static bool LinkedWalk(int i, int j) => IsWalk(j) && Linked(i, j);
    public static int LinkCount(int i) { int n = 0; foreach (int j in Partners(i)) if (IsWalk(j)) n++; return n; }
    // een heel vak leegmaken (rechtermuisknop)
    public static bool Clear(int i) { if (!Cells.ContainsKey(i) || IsHalf(i)) return false; Cells.Remove(i); Unlink(i); Touch(i); return true; }
    public static float StackHeight(int i) { float h = 0f; if (Cells.TryGetValue(i, out var l)) foreach (var t in l) h += Blocks.Height(t); return h; }
    public static int RoadCount() { int n = 0; foreach (var kv in Cells) if (kv.Value.Count > 0 && kv.Value[0] == "weg") n++; return n; }

    public static Dictionary<int, List<string>> Clone(Dictionary<int, List<string>> src)
    {
        var d = new Dictionary<int, List<string>>(); foreach (var kv in src) d[kv.Key] = new List<string>(kv.Value); return d;
    }

    // plaatsen; geeft een melding terug als het niet kan (anders null)
    public static string Place(int i, string type, bool autoLink = true)
    {
        if (!Cells.TryGetValue(i, out var l)) { l = new List<string>(); Cells[i] = l; }
        if (type == "weg") { if (l.Count == 1 && l[0] == "wegdeel") l.Clear(); if (l.Count > 0 && !(l.Count == 1 && l[0] == "weg")) return "Eerst het vak leegmaken (rechtermuisknop) voor een weg"; if (l.Count == 0) l.Add("weg"); if (autoLink) foreach (int j in Planet.Cells[i].nb) if (IsWalk(j)) Link(i, j); Touch(i); return null; }
        if (type == "pad" && l.Count == 0) { l.Add("pad"); if (autoLink) foreach (int j in Planet.Cells[i].nb) if (IsWalk(j)) Link(i, j); Touch(i); return null; }
        if (type == "pad" && l.Count == 1 && l[0] == "pad") { if (autoLink) foreach (int j in Planet.Cells[i].nb) if (IsWalk(j)) Link(i, j); Touch(i); return null; }
        if (l.Count > 0 && l[0] == "weg") return "Op een weg kun je niet bouwen; haal de weg eerst weg (rechtermuisknop)";
        if (l.Count > 0 && l[0] == "wegdeel") return "Hier loopt een weg overheen; haal die weg eerst weg (rechtermuisknop op een wegvak)";
        if (l.Count >= 8) return "Hoger kan niet";
        if ((type == "water" || type == "meer") && l.Count > 0) l.Clear();
        if (l.Count > 0 && (l[l.Count - 1] == "water" || l[l.Count - 1] == "meer")) l.Clear();
        l.Add(type); Touch(i); return null;
    }

    // Een gesleepte lijn: de vakken worden weg (of pad) en alleen onderling verbonden, in volgorde
    public static int PlaceLine(List<int> line, string type)
    {
        int ok = 0;
        for (int k = 0; k < line.Count; k++) { if (Place(line[k], type, false) == null) ok++; }
        for (int k = 1; k < line.Count; k++)
        {
            int a = line[k - 1], b = line[k]; if (!IsWalk(a) || !IsWalk(b)) continue;
            Link(a, b);
            if (!IsNeighbour(a, b)) foreach (int h in Between(a, b)) { if (!Cells.ContainsKey(h) || Cells[h].Count == 0) { Cells[h] = new List<string> { "wegdeel" }; Touch(h); } }
        }
        foreach (int i in line) Touch(i);
        return ok;
    }

    public static bool RemoveTop(int i)
    {
        if (!Cells.TryGetValue(i, out var l) || l.Count == 0) return false;
        if (IsHalf(i)) return false;
        l.RemoveAt(l.Count - 1); if (l.Count == 0) { Cells.Remove(i); Unlink(i); } Touch(i); return true;
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
            foreach (long k in Links) { sd.links.Add((int)(k >> 20)); sd.links.Add((int)(k & 0xFFFFF)); }
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
            Links.Clear();
            if (sd.links != null && sd.links.Count > 0) { for (int k = 0; k + 1 < sd.links.Count; k += 2) Link(sd.links[k], sd.links[k + 1]); }
            else foreach (var kv in Cells) if (IsWalk(kv.Key)) foreach (int j in Planet.Cells[kv.Key].nb) if (IsWalk(j)) Link(kv.Key, j);   // oude opslag: alles naast elkaar verbonden
            TouchAll(); return true;
        }
        catch (Exception e) { Debug.LogWarning("Laden mislukt: " + e.Message); return false; }
    }

    // Een rechte lijn van vakken van a naar b: de richting wordt op een veelvoud van 30° gelegd (zoals in de browser) en de lijn
    // volgt de grootcirkel; elke stap kiest de buur die het dichtst bij die cirkel blijft. In de 6 buurrichtingen is dat een
    // kaarsrechte rij, in de 6 tussenrichtingen een lichte trap.
    public static List<int> LinePlan(int a, int b)
    {
        var A = Planet.Cells[a]; Vector3 da = A.dir, db = Planet.Cells[b].dir;
        Vector3 t = db - da; t -= da * Vector3.Dot(t, da); if (t.sqrMagnitude < 1e-8f) return null; t.Normalize();
        // de 12 richtingen: naar de buren (6) en daar precies tussenin (6); op een vijfhoek 5 + 5
        var dirs = new List<Vector3>();
        foreach (int j in A.nb) { Vector3 d = Planet.Cells[j].dir - da; d -= da * Vector3.Dot(d, da); dirs.Add(d.normalized); }
        foreach (int j in A.across) { if (j < 0) continue; Vector3 d = Planet.Cells[j].dir - da; d -= da * Vector3.Dot(d, da); dirs.Add(d.normalized); }   // door de hoek: over twee halve vakken
        Vector3 ray = dirs[0]; float bestDot = -2f; foreach (var d in dirs) { float v = Vector3.Dot(d, t); if (v > bestDot) { bestDot = v; ray = d; } }
        Vector3 n = Vector3.Cross(da, ray).normalized;
        float total = Mathf.Acos(Mathf.Clamp(Vector3.Dot(da, db), -1f, 1f));
        var plan = new List<int> { a }; int cur = a;
        for (int step = 0; step < 120; step++)
        {
            Vector3 dc = Planet.Cells[cur].dir, fwd = Vector3.Cross(n, dc).normalized; int best = -1; float bs = -1e9f;
            var cc = Planet.Cells[cur]; var cand = new List<int>(cc.nb); foreach (int x in cc.across) if (x >= 0) cand.Add(x);
            foreach (int j in cand)
            {
                Vector3 dj = Planet.Cells[j].dir; float prog = Vector3.Dot(dj - dc, fwd); if (prog <= 1e-6f) continue;
                float off = Mathf.Abs(Vector3.Dot(dj, n)) * Planet.R;   // afstand tot de grootcirkel in meters
                float sc = -off * 4f + prog * 0.5f; if (sc > bs) { bs = sc; best = j; }   // vooral: op de lijn blijven
            }
            if (best < 0) break;
            float along = Mathf.Acos(Mathf.Clamp(Vector3.Dot(da, Planet.Cells[best].dir), -1f, 1f));
            if (along > total + 0.4f * 15.6f / Planet.R) break;
            plan.Add(best); cur = best; if (cur == b) break;
        }
        return plan;
    }


    // Een voorbeeldstadje rond vak s: een ringweg, twee hoofdwegen erdoorheen, huizen en kantoren langs de wegen,
    // parken, een meertje en een paar paden. Vast bepaald (zelfde stad bij elke keer).
    public static void Sample(int s)
    {
        var S = Planet.Cells[s]; var rnd = new System.Random(7);
        // afstanden (in vakken) vanaf s
        var dist = new Dictionary<int, int> { { s, 0 } }; var q = new Queue<int>(); q.Enqueue(s);
        while (q.Count > 0) { int c = q.Dequeue(); if (dist[c] >= 7) continue; foreach (int j in Planet.Cells[c].nb) if (!dist.ContainsKey(j)) { dist[j] = dist[c] + 1; q.Enqueue(j); } }
        System.Func<Vector3, int> at = dir => Planet.Nearest(dir * Planet.R);
        System.Func<float, float, int> cellAt = (ang, r) => at((S.dir * Mathf.Cos(r / Planet.R) + (S.east * Mathf.Cos(ang) + S.north * Mathf.Sin(ang)) * Mathf.Sin(r / Planet.R)).normalized);
        // twee hoofdwegen door het midden: in de richting van buur 0 en haaks daarop
        Vector3 n0 = Planet.Cells[S.nb[0]].dir - S.dir; n0 -= S.dir * Vector3.Dot(n0, S.dir); float a0 = Mathf.Atan2(Vector3.Dot(n0, S.north), Vector3.Dot(n0, S.east));
        foreach (float ang in new[] { a0, a0 + Mathf.PI / 2f })
        {
            var line = LinePlan(cellAt(ang + Mathf.PI, 6.2f * 15.6f), cellAt(ang, 6.2f * 15.6f)); if (line != null) PlaceLine(line, "weg");
        }
        // ringweg op afstand 4: de vakken op afstand 4, rondom gesorteerd, als gesloten lijn
        var ring = new List<int>(); foreach (var kv in dist) if (kv.Value == 4) ring.Add(kv.Key);
        ring.Sort((x, y) => Ang(S, x).CompareTo(Ang(S, y)));
        var ringLine = new List<int>(ring); ringLine.Add(ring[0]); PlaceLine(ringLine, "weg");
        // bebouwing: langs de wegen huizen (buiten) en kantoren (binnen de ring), parken in de rest, een meertje aan één kant
        float lakeAng = a0 + Mathf.PI / 4f; int lakeC = cellAt(lakeAng, 2.3f * 15.6f);
        foreach (var kv in dist)
        {
            int c = kv.Key, d = kv.Value; if (Cells.ContainsKey(c) || d == 0) continue;
            bool nearRoad = false; foreach (int j in Planet.Cells[c].nb) if (IsRoad(j)) { nearRoad = true; break; }
            float lakeD = Vector3.Distance(Planet.Cells[c].dir, Planet.Cells[lakeC].dir) * Planet.R;
            if (lakeD < 19f) { Place(c, "meer"); continue; }
            if (d > 6) continue;
            if (nearRoad)
            {
                if (d <= 2) { int fl = 2 + rnd.Next(0, 2); for (int f = 0; f < fl; f++) Place(c, "kantoor"); }
                else if (d <= 5 && rnd.NextDouble() < 0.8) { Place(c, "woning"); if (rnd.NextDouble() < 0.3) Place(c, "woning"); }
                else if (rnd.NextDouble() < 0.5) Place(c, "park");
            }
            else if (d <= 5 && rnd.NextDouble() < 0.55) Place(c, "park");
        }
        // een paar paden van de ring naar binnen door het groen
        for (int k = 0; k < 3; k++)
        {
            float ang = a0 + Mathf.PI / 3f + k * Mathf.PI * 2f / 3f; var pl = LinePlan(cellAt(ang, 3.6f * 15.6f), cellAt(ang, 1.4f * 15.6f));
            if (pl != null) { var free = new List<int>(); foreach (int c in pl) if (!Cells.ContainsKey(c) || IsPath(c) || (Cells[c].Count == 1 && Cells[c][0] == "park")) { if (Cells.ContainsKey(c) && Cells[c][0] == "park") Cells.Remove(c); free.Add(c); } PlaceLine(free, "pad"); foreach (int c in free) foreach (int j in Planet.Cells[c].nb) if (IsRoad(j)) Link(c, j); }
        }
        TouchAll();
    }
    static float Ang(Planet.Cell S, int c) { Vector3 d = Planet.Cells[c].dir - S.dir; return Mathf.Atan2(Vector3.Dot(d, S.north), Vector3.Dot(d, S.east)); }

    // ---------- bodem ----------
    static readonly Dictionary<int, List<GameObject>> groundChunks = new Dictionary<int, List<GameObject>>();
    public static void Init(Transform parent)
    {
        root = new GameObject("Planeetstad").transform; root.SetParent(parent, false);
        groundRoot = new GameObject("Bodem").transform; groundRoot.SetParent(parent, false);
        chunks.Clear(); groundChunks.Clear();
        for (int c0 = 0; c0 < Planet.Cells.Length; c0 += ChunkN) BuildGround(c0 / ChunkN);
        BuildGrid(parent);
    }

    // Rasterlijnen langs alle vakranden (één lijnenmesh, 6 cm boven de bodem). G = aan/uit; in wandelmodus verborgen.
    static GameObject grid; public static bool GridOn = true;
    static void BuildGrid(Transform parent)
    {
        var v = new List<Vector3>(); var idx = new List<int>();
        foreach (var c in Planet.Cells)
            for (int k = 0; k < c.corners.Length; k++) { idx.Add(v.Count); v.Add(c.corners[k] * (Planet.R + 0.06f)); idx.Add(v.Count); v.Add(c.corners[(k + 1) % c.corners.Length] * (Planet.R + 0.06f)); }
        var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; m.SetVertices(v); m.SetIndices(idx, MeshTopology.Lines, 0); m.RecalculateBounds();
        grid = new GameObject("Raster"); grid.transform.SetParent(parent, false); grid.AddComponent<MeshFilter>().sharedMesh = m;
        var mr = grid.AddComponent<MeshRenderer>(); mr.sharedMaterial = Raatstad.MatGrid; mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; mr.receiveShadows = false;
    }
    public static void ShowGrid(bool on) { if (grid != null) grid.SetActive(on); }

    // De bodem van één deel. Vakken met een meer of een uitgraving krijgen geen bodem (die zit er anders doorheen).
    static void BuildGround(int ch)
    {
        if (groundChunks.TryGetValue(ch, out var olds)) { foreach (var g in olds) if (g != null) UnityEngine.Object.Destroy(g); }
        var made = new List<GameObject>(); groundChunks[ch] = made;
        int n = Planet.Cells.Length, c0 = ch * ChunkN;
        {
            // De bodem per vak; de kleur loopt van gewoon gras (regelmatige zeshoek) naar fel oranje (het meest vervormd, naast een vijfhoek)
            const int Steps = 8; var ms = new MeshBuilder[Steps]; for (int k = 0; k < Steps; k++) ms[k] = new MeshBuilder();
            var pm = new MeshBuilder();   // de vijfhoeken zelf
            var sm = new MeshBuilder();   // de startplekken
            for (int i = c0; i < Mathf.Min(n, c0 + ChunkN); i++)
            {
                if (Cells.TryGetValue(i, out var stack) && stack.Count > 0 && (stack[0] == "meer" || stack[0] == "kuil")) continue;
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
                var pg = new GameObject("Vijfhoeken " + (c0 / ChunkN)); pg.transform.SetParent(groundRoot, false); made.Add(pg); pg.layer = Layers.Bodem;
                var pmesh = pm.Build(); pg.AddComponent<MeshFilter>().sharedMesh = pmesh; pg.AddComponent<MeshRenderer>().sharedMaterial = Mats.Get("p_vijfhoek", new Color(1f, 0.5f, 0.1f));
                pg.AddComponent<MeshCollider>().sharedMesh = pmesh;
            }
            if (sm.v.Count > 0)
            {
                var sg = new GameObject("Startplekken " + (c0 / ChunkN)); sg.transform.SetParent(groundRoot, false); made.Add(sg); sg.layer = Layers.Bodem;
                var smesh = sm.Build(); sg.AddComponent<MeshFilter>().sharedMesh = smesh; sg.AddComponent<MeshRenderer>().sharedMaterial = Mats.Get("p_start", new Color(0.55f, 0.8f, 1f));
                sg.AddComponent<MeshCollider>().sharedMesh = smesh;
            }
            Color grass = new Color(0.64f, 0.78f, 0.45f), hot = new Color(1f, 0.6f, 0.2f);
            for (int k = 0; k < Steps; k++)
            {
                if (ms[k].v.Count == 0) continue;
                var go = new GameObject("Bodem " + (c0 / ChunkN) + " " + k); go.transform.SetParent(groundRoot, false); made.Add(go); go.layer = Layers.Bodem;
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

    // Een wegvak: één nette omtrek per laag (stoep, asfalt) in plaats van losse schijven en stroken. De omtrek wordt
    // rondom bemonsterd: in elke richting de verste rand van de armen naar de buurwegen, met een kern die bochten
    // afrondt. Daarop: stoeprand, middenstreepjes op rechte armen, een eilandje op kruisingen en een lantaarn.
    // De richting van de weg door een buurvak dat zelf een "schuin recht stuk" is (twee aansluitingen die 120° of 180° maken),
    // uitgedrukt in het assenstelsel van dit vak en wijzend dit vak in. Geeft false als de buur gewoon via zijn hart gaat.
    // Wereldrichting van de weg door een schuin recht wegvak (zie ChordDirOf); false als het vak via zijn hart gaat
    public static bool ChordDirWorld(int j, out Vector3 dir)
    {
        dir = Vector3.zero; var arms = new List<Vector3>();
        foreach (int k in Partners(j)) if (IsRoad(k)) arms.Add(((Planet.Cells[j].dir + Planet.Cells[k].dir) * 0.5f).normalized);
        if (arms.Count != 2) return false;
        Vector3 cj = Planet.Cells[j].dir; if (Vector3.Dot((arms[0] - cj).normalized, (arms[1] - cj).normalized) >= -0.3f) return false;
        dir = (arms[1] - arms[0]).normalized; return true;
    }

    static bool ChordDirOf(int j, Frame fr, Vector2 e, out Vector2 dir)
    {
        dir = (-e).normalized; var arms = new List<Vector3>();
        foreach (int k in Partners(j)) if (IsRoad(k)) arms.Add(((Planet.Cells[j].dir + Planet.Cells[k].dir) * 0.5f).normalized * Planet.R);
        if (arms.Count != 2) return false;
        Vector3 cj = Planet.Cells[j].dir * Planet.R; Vector3 a0 = arms[0] - cj, a1 = arms[1] - cj;
        if (Vector3.Dot(a0.normalized, a1.normalized) >= -0.3f) return false;
        Vector3 w = arms[1] - arms[0]; Vector2 d = new Vector2(Vector3.Dot(w, fr.e), Vector3.Dot(w, fr.n)).normalized;
        if (Vector2.Dot(d, -e) < 0f) d = -d; dir = d; return true;
    }

    // Een wegvak dat geen recht stuk is: een ronde kern met armen naar de aangesloten buren. Een arm naar een schuin recht
    // buurstuk loopt in de richting van dát stuk (dus schuin door dit vak) zodat de weg zonder knik doorloopt; de arm wordt
    // aan de rand langs de vakrand afgesneden, precies waar het buurstuk ophoudt. Hoogtes verschillen een paar millimeter
    // zodat kern en armen elkaar netjes bedekken.
    static void Road(Dictionary<string, MeshBuilder> mb, Frame fr, int i)
    {
        System.Func<string, MeshBuilder> M = k => { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; };
        var ends = new List<Vector2>(); var dirs = new List<Vector2>(); Vector2 freeDir = new Vector2(0, 1); float freeBest = -2f;
        foreach (int j in Partners(i))
        {
            if (!IsRoad(j)) continue;
            Vector3 d3 = Planet.Cells[j].dir * Planet.R - fr.o; Vector2 q = new Vector2(Vector3.Dot(d3, fr.e), Vector3.Dot(d3, fr.n)) * 0.5f;
            ends.Add(q); ChordDirOf(j, fr, q, out Vector2 dir); dirs.Add(dir);
        }
        foreach (int j in Planet.Cells[i].nb)   // lantaarn: aan een kant zonder weg
        {
            if (IsRoad(j) && Linked(i, j)) continue;
            Vector3 d3 = Planet.Cells[j].dir * Planet.R - fr.o; Vector2 q = new Vector2(Vector3.Dot(d3, fr.e), Vector3.Dot(d3, fr.n));
            bool under = false; foreach (int p2 in Partners(i)) if (!IsNeighbour(i, p2) && Between(i, p2).Contains(j)) under = true;   // onder een schuine arm: geen lantaarn
            if (under) continue;
            float sc = (i * 7 + j) % 13 / 13f; if (sc > freeBest) { freeBest = sc; freeDir = q.normalized; }
        }
        int na = ends.Count;
        if (na == 2 && Vector2.Dot(ends[0].normalized, ends[1].normalized) < -0.3f) { Chord(M, fr, ends[0], ends[1]); LampAt(M, fr, freeBest, freeDir); return; }
        // kern: groot genoeg om alle armen te raken
        float coreA = na == 0 ? 3.3f : na == 1 ? 2.5f : na == 2 ? 3.0f : 3.4f;
        for (int a = 0; a < na; a++) { float along = Vector2.Dot(-ends[a], dirs[a]); float perp = (ends[a] + dirs[a] * along).magnitude; coreA = Mathf.Max(coreA, perp + 1.2f); }
        float coreS = coreA + 2.1f;
        // armen
        var armLen = new float[na];
        for (int a = 0; a < na; a++)
        {
            Vector2 e = ends[a], d = dirs[a], r = new Vector2(d.y, -d.x), en = e.normalized; float den = Vector2.Dot(d, en);
            float along = Vector2.Dot(-e, d); float perp = (e + d * along).magnitude; float L = along + Mathf.Sqrt(Mathf.Max(0f, coreA * coreA - perp * perp)) - 0.3f; armLen[a] = L;
            System.Func<float, float, Vector2[]> quad = (hw, len) =>
            {
                var q = new Vector2[4];
                for (int sd = 0; sd < 2; sd++) { Vector2 p0 = e + r * (sd == 0 ? -hw : hw); float t = Mathf.Abs(den) < 1e-4f ? 0f : Vector2.Dot(e - p0, en) / den; q[sd] = p0 + d * t; q[2 + sd] = p0 + d * len; }
                return q;
            };
            var st = quad(4.6f, L + 1.2f); var asf = quad(2.5f, L);
            M("stoep").Quad(fr.P(st[0].x, 0.095f, st[0].y), fr.P(st[1].x, 0.095f, st[1].y), fr.P(st[3].x, 0.095f, st[3].y), fr.P(st[2].x, 0.095f, st[2].y), fr.u);
            M("stoep").Quad(fr.P(st[0].x, -0.35f, st[0].y), fr.P(st[2].x, -0.35f, st[2].y), fr.P(st[2].x, 0.095f, st[2].y), fr.P(st[0].x, 0.095f, st[0].y), fr.D(-r.x, 0, -r.y));
            M("stoep").Quad(fr.P(st[1].x, -0.35f, st[1].y), fr.P(st[3].x, -0.35f, st[3].y), fr.P(st[3].x, 0.095f, st[3].y), fr.P(st[1].x, 0.095f, st[1].y), fr.D(r.x, 0, r.y));
            M("asfalt").Quad(fr.P(asf[0].x, 0.155f, asf[0].y), fr.P(asf[1].x, 0.155f, asf[1].y), fr.P(asf[3].x, 0.155f, asf[3].y), fr.P(asf[2].x, 0.155f, asf[2].y), fr.u);
            // stoeprand langs de zijkanten, alleen buiten de kern
            for (int sd = 0; sd < 2; sd++)
            {
                Vector2 p = asf[sd], q2 = asf[2 + sd], o = r * (sd == 0 ? -0.22f : 0.22f); float len = Vector2.Distance(p, q2); Vector2 dd = (q2 - p) / Mathf.Max(0.01f, len);
                for (float s0 = 0f; s0 < len; s0 += 0.5f)
                {
                    float s1 = Mathf.Min(len, s0 + 0.5f); Vector2 a0 = p + dd * s0, a1 = p + dd * s1; if (((a0 + a1) * 0.5f).magnitude < coreA - 0.2f) continue;
                    M("rand").Quad(fr.P(a0.x, 0.155f, a0.y), fr.P(a1.x, 0.155f, a1.y), fr.P(a1.x + o.x, 0.23f, a1.y + o.y), fr.P(a0.x + o.x, 0.23f, a0.y + o.y), fr.D(-o.x, 1f, -o.y));
                }
            }
            // middenstreepjes op de arm (niet bij een kruising) en een zebrapad vlak voor een kruising
            if (na <= 2) for (float s0 = 0.6f; s0 + 1.2f < L - 0.5f; s0 += 2.6f) { Vector2 a0 = e + d * s0, a1 = e + d * (s0 + 1.4f); M("lijn").Quad(fr.P(a0.x - r.x * 0.07f, 0.165f, a0.y - r.y * 0.07f), fr.P(a0.x + r.x * 0.07f, 0.165f, a0.y + r.y * 0.07f), fr.P(a1.x + r.x * 0.07f, 0.165f, a1.y + r.y * 0.07f), fr.P(a1.x - r.x * 0.07f, 0.165f, a1.y - r.y * 0.07f), fr.u); }
            if (na >= 3 && L > 4.5f) for (int z = -2; z <= 2; z++) { Vector2 off = r * (z * 0.95f); Vector2 a0 = e + d * 0.6f + off - r * 0.28f, b0 = e + d * 0.6f + off + r * 0.28f, c0 = e + d * 2.6f + off + r * 0.28f, e0 = e + d * 2.6f + off - r * 0.28f; M("lijn").Quad(fr.P(a0.x, 0.165f, a0.y), fr.P(b0.x, 0.165f, b0.y), fr.P(c0.x, 0.165f, c0.y), fr.P(e0.x, 0.165f, e0.y), fr.u); }
        }
        // kern: stoepschijf met schuine rand, asfaltschijf, stoeprand alleen waar geen arm zit
        const int S = 48;
        Disc(M("stoep"), fr, coreS, 0.085f); Skirt(M("stoep"), fr, coreS, -0.35f, 0.085f);
        for (int k = 0; k < S; k++)
        {
            float a0 = k * Mathf.PI * 2f / S, a1 = (k + 1) * Mathf.PI * 2f / S, am = (a0 + a1) * 0.5f;
            Vector2 p0 = new Vector2(Mathf.Cos(a0), Mathf.Sin(a0)) * coreA, p1 = new Vector2(Mathf.Cos(a1), Mathf.Sin(a1)) * coreA, pm = new Vector2(Mathf.Cos(am), Mathf.Sin(am)) * coreA;
            M("asfalt").Tri(fr.P(0, 0.150f, 0), fr.P(p0.x, 0.150f, p0.y), fr.P(p1.x, 0.150f, p1.y), fr.u);
            bool covered = false;
            for (int a = 0; a < na && !covered; a++) { Vector2 e = ends[a], d = dirs[a]; float along = Vector2.Dot(pm - e, d); float perp = Mathf.Abs(Vector2.Dot(pm - e, new Vector2(d.y, -d.x))); if (along > -0.5f && along < armLen[a] + 0.5f && perp < 2.5f + 0.3f) covered = true; }
            if (!covered) { Vector2 o0 = p0.normalized * 0.22f, o1 = p1.normalized * 0.22f; M("rand").Quad(fr.P(p0.x, 0.150f, p0.y), fr.P(p1.x, 0.150f, p1.y), fr.P(p1.x + o1.x, 0.23f, p1.y + o1.y), fr.P(p0.x + o0.x, 0.23f, p0.y + o0.y), fr.D(-pm.x, coreA, -pm.y)); }
        }
        if (na >= 3) { Disc(M("gras"), fr, 1.3f, 0.21f); Skirt(M("rand"), fr, 1.4f, 0.155f, 0.21f); }
        LampAt(M, fr, freeBest, freeDir);
    }

    static void LampAt(System.Func<string, MeshBuilder> M, Frame fr, float freeBest, Vector2 freeDir)
    {
        if (freeBest <= -1f) return; Vector2 lp = freeDir * 4.0f;
        Cone(M("paal"), fr, lp.x, lp.y, 0.08f, 0.09f, 5.2f, 0.06f);
        Cone(M("lamp"), fr, lp.x, lp.y, 0.28f, 4.9f, 5.35f, 0.2f); Cap6(M("lamp"), fr, 0.2f, 5.35f);
    }

    // Een recht stuk van rand naar rand (ook als de twee armen 120° maken: dan loopt de weg schuin door het vak, en vormt
    // een rij van zulke vakken een kaarsrechte weg in een 30°-tussenrichting). De uiteinden worden langs de vakrand afgesneden.
    static void Chord(System.Func<string, MeshBuilder> M, Frame fr, Vector2 e0, Vector2 e1)
    {
        Vector2 d = (e1 - e0).normalized, r = new Vector2(d.y, -d.x), mid = (e0 + e1) * 0.5f;   // de strook loopt door mid, niet door het hart van het vak
        // zijlijnen van de strook snijden met de randlijn (loodrecht op de arm) aan elk uiteinde
        System.Func<float, Vector2[]> quad = hw =>
        {
            var q = new Vector2[4];
            for (int end = 0; end < 2; end++)
            {
                Vector2 e = end == 0 ? e0 : e1, en = e.normalized;   // randlijn: punten p met dot(p - e, en) = 0
                for (int sd = 0; sd < 2; sd++)
                {
                    Vector2 p0 = mid + r * (sd == 0 ? -hw : hw); float den = Vector2.Dot(d, en);
                    float t = Mathf.Abs(den) < 1e-4f ? 0f : Vector2.Dot(e - p0, en) / den;
                    q[end * 2 + sd] = p0 + d * t;
                }
            }
            return q;
        };
        var st = quad(4.6f); var asf = quad(2.5f);
        // stoep: vlak (als twee driehoeken) + schuine randen omlaag aan de zijkanten
        M("stoep").Quad(fr.P(st[0].x, 0.095f, st[0].y), fr.P(st[1].x, 0.095f, st[1].y), fr.P(st[3].x, 0.095f, st[3].y), fr.P(st[2].x, 0.095f, st[2].y), fr.u);
        M("stoep").Quad(fr.P(st[0].x, -0.35f, st[0].y), fr.P(st[2].x, -0.35f, st[2].y), fr.P(st[2].x, 0.095f, st[2].y), fr.P(st[0].x, 0.095f, st[0].y), fr.D(-r.x, 0, -r.y));
        M("stoep").Quad(fr.P(st[1].x, -0.35f, st[1].y), fr.P(st[3].x, -0.35f, st[3].y), fr.P(st[3].x, 0.095f, st[3].y), fr.P(st[1].x, 0.095f, st[1].y), fr.D(r.x, 0, r.y));
        // asfalt + stoeprand
        M("asfalt").Quad(fr.P(asf[0].x, 0.155f, asf[0].y), fr.P(asf[1].x, 0.155f, asf[1].y), fr.P(asf[3].x, 0.155f, asf[3].y), fr.P(asf[2].x, 0.155f, asf[2].y), fr.u);
        for (int sd = 0; sd < 2; sd++)
        {
            Vector2 a = asf[sd], b = asf[2 + sd], o = r * (sd == 0 ? -0.22f : 0.22f);
            M("rand").Quad(fr.P(a.x, 0.155f, a.y), fr.P(b.x, 0.155f, b.y), fr.P(b.x + o.x, 0.23f, b.y + o.y), fr.P(a.x + o.x, 0.23f, a.y + o.y), fr.D(-o.x, 1f, -o.y));
        }
        // middenstreepjes
        float len = Vector2.Distance(e0, e1);
        for (float s0 = -len / 2f + 0.6f; s0 + 1.2f < len / 2f; s0 += 2.6f) { Vector2 a = mid + d * s0, b = mid + d * (s0 + 1.4f); M("lijn").Quad(fr.P(a.x - r.x * 0.07f, 0.165f, a.y - r.y * 0.07f), fr.P(a.x + r.x * 0.07f, 0.165f, a.y + r.y * 0.07f), fr.P(b.x + r.x * 0.07f, 0.165f, b.y + r.y * 0.07f), fr.P(b.x - r.x * 0.07f, 0.165f, b.y - r.y * 0.07f), fr.u); }
    }

    // Een meertje: zand aan de kant, water iets lager, riet langs de oever. Grenst een buurvak ook aan een meer,
    // dan loopt het water door tot de gedeelde rand, zodat meerdere vakken één meer vormen.
    static void Lake(Dictionary<string, MeshBuilder> mb, Frame fr, int i, float h, int hash)
    {
        System.Func<string, MeshBuilder> M = k => { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; };
        var c = Planet.Cells[i]; int n = fr.poly.Length;
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
            if (!open[k]) {
                // buitenrand (zand, iets de bodem in) en de oever: van de rand schuin omlaag tot onder water
                Vector2 pa = fr.poly[k], pb = fr.poly[(k + 1) % n], pm = (pa + pb) * 0.5f;
                M("zand").Quad(fr.P(pa.x, -0.25f, pa.y), fr.P(pb.x, -0.25f, pb.y), fr.P(pb.x, h + 0.03f, pb.y), fr.P(pa.x, h + 0.03f, pa.y), fr.D(pm.x, 0, pm.y));
                M("zand").Quad(fr.P(pa.x, h + 0.03f, pa.y), fr.P(pb.x, h + 0.03f, pb.y), fr.P(ob.x, h + 0.02f, ob.y), fr.P(oa.x, h + 0.02f, oa.y), fr.u);
                M("zand").Quad(fr.P(oa.x, h + 0.02f, oa.y), fr.P(ob.x, h + 0.02f, ob.y), fr.P(b.x, wy - 0.3f, b.y), fr.P(a.x, wy - 0.3f, a.y), fr.D(-am.x, 0.5f * am.magnitude, -am.y));
                int reeds = 2 + rnd.Next(0, 3);
                for (int r = 0; r < reeds; r++) { float t = 0.15f + (float)rnd.NextDouble() * 0.7f; Vector2 rp = Vector2.Lerp(a, b, t) * (0.97f + (float)rnd.NextDouble() * 0.06f); Cone(M("riet"), fr, rp.x, rp.y, 0.12f, wy - 0.1f, h + 0.9f + (float)rnd.NextDouble() * 0.5f, 0f); } }
        }
    }

    // Een pad: smal, zandkleurig, sluit aan op buurpaden en wegen
    static void Footpath(Dictionary<string, MeshBuilder> mb, Frame fr, int i)
    {
        System.Func<string, MeshBuilder> M = k => { if (!mb.TryGetValue(k, out var x)) { x = new MeshBuilder(); mb[k] = x; } return x; };
        Disc(M("pad"), fr, 1.3f, 0.1f); Skirt(M("pad"), fr, 1.3f, -0.3f, 0.1f);
        foreach (int j in Partners(i))
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
            case "paal": return new Color(0.25f, 0.27f, 0.3f); case "rand": return new Color(0.7f, 0.68f, 0.62f); case "lamp": return new Color(0.85f, 0.85f, 0.8f);
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
        BuildGround(ch);
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
            if (list[0] == "wegdeel") { Top(M("zand"), fr, 0.97f, 0.06f); Wall(M("zand"), fr, 0.97f, -0.2f, 0.06f); continue; }   // bezet vak naast een schuine weg: zandkleurige vloer, zoals in de browser (het asfalt komt van de wegvakken ernaast)
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
                    case "kuil":   // uitgraving: de bodem 3 m lager, zeshoekige grashellingen van de rand naar beneden
                        for (int e2 = 0; e2 < fr.poly.Length; e2++)
                        {
                            Vector2 a2 = C(fr, e2, 1.0f), b2 = C(fr, e2 + 1, 1.0f), a3 = C(fr, e2, 0.55f), b3 = C(fr, e2 + 1, 0.55f), m2 = (a2 + b2) * 0.5f;
                            M("gras").Quad(fr.P(a2.x, h, a2.y), fr.P(b2.x, h, b2.y), fr.P(b3.x, h1, b3.y), fr.P(a3.x, h1, a3.y), fr.D(-m2.x, 2f, -m2.y));
                        }
                        Top(M("gras"), fr, 0.55f, h1);
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
            child.layer = (kv.Key == "asfalt" || kv.Key == "stoep" || kv.Key == "rand" || kv.Key == "lijn" || kv.Key == "paal" || kv.Key == "lamp" || kv.Key == "pad") ? Layers.Weg : Layers.Gebouw;
            var mesh = kv.Value.Build(); child.AddComponent<MeshFilter>().sharedMesh = mesh; child.AddComponent<MeshRenderer>().sharedMaterial = kv.Key == "lamp" ? Mats.GetUnlit("p_lamp", ColorOf(kv.Key)) : Mats.Get("p_" + kv.Key, ColorOf(kv.Key));
            if (kv.Key != "water" && kv.Key != "zand" && kv.Key != "lijn" && kv.Key != "lamp" && kv.Key != "riet") child.AddComponent<MeshCollider>().sharedMesh = mesh;
        }
    }
}
