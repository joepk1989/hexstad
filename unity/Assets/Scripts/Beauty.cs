using System.Collections.Generic;
using UnityEngine;

// Schoonheidsscore van de planeetstad, naar de browserversie: groen, bereikbaarheid, wegennet, afwisseling,
// levendigheid, water en samenhang wegen mee. Geeft een cijfer (0-100), een woord en een tip voor het zwakste punt.
public static class Beauty
{
    public class Row { public string name, detail, tip; public float w; public float v = -1f; }
    public class Result { public int score; public string label, tip; public List<Row> rows = new List<Row>(); public int blocks; public float top; }

    static bool IsBld(string t) => t == "woning" || t == "kantoor";
    static float C01(float v) => Mathf.Clamp01(v);

    public static Result Compute()
    {
        var cells = PlanetCity.Cells; var res = new Result();
        int N = 0, roads = 0, parks = 0, water = 0, pads = 0, deadEnds = 0, isolated = 0, bld = 0, bldOK = 0, roofGreen = 0, holes = 0, loose = 0, pedSpots = 0;
        var types = new HashSet<string>(); var heights = new HashSet<int>(); var seen = new HashSet<int>();
        foreach (var kv in cells)
        {
            var st = kv.Value; if (st.Count == 0) continue; int i = kv.Key; var cell = Planet.Cells[i];
            res.blocks += st.Count;
            if (st[0] == "wegdeel") { if (st.Count == 1) continue; st = st.GetRange(1, st.Count - 1); }   // half vak: telt mee voor wat erop staat
            if (st[0] == "weg")
            {
                roads++; int rn = 0; foreach (int j in PlanetCity.Partners(i)) if (PlanetCity.IsRoad(j)) rn++;
                if (rn == 1) deadEnds++; if (rn == 0) isolated++;
                continue;
            }
            N++; float h = 0f; bool hasB = false;
            for (int k = 0; k < st.Count; k++)
            {
                string b = st[k]; types.Add(b);
                if (k > 0 && b == "park") roofGreen++;
                if (IsBld(b) && (k == 0 || !IsBld(st[k - 1])))
                {
                    bld++; bool ok = false;
                    foreach (int j in cell.nb) { if (PlanetCity.IsRoad(j)) { ok = true; break; } if (cells.TryGetValue(j, out var o) && o.Count > 0 && o[0] == "pad") { ok = true; break; } }
                    if (ok) bldOK++;
                }
                if (IsBld(b)) hasB = true;
                if (b == "pad") pedSpots++;
                h += Blocks.Height(b);
            }
            res.top = Mathf.Max(res.top, h);
            if (hasB) heights.Add(Mathf.RoundToInt(h / 3f));
            if (st[0] == "park") parks++; if (st[0] == "water" || st[0] == "meer") water++; if (st[0] == "pad") pads++;
            int nb = 0;
            foreach (int j in cell.nb)
            {
                if (cells.ContainsKey(j)) { nb++; continue; }
                if (!seen.Add(j)) continue;
                int c = 0; foreach (int e in Planet.Cells[j].nb) if (cells.ContainsKey(e)) c++;
                if (c >= 4) holes++;
            }
            if (nb == 0) loose++;
        }
        res.blocks += roads;
        if (N + roads == 0) { res.score = 0; res.label = "Nog te klein"; res.tip = "Bouw eerst wat: een weg, een paar huizen en een park."; return res; }
        float green = parks + roofGreen + pads * 0.3f, roadShare = roads / Mathf.Max(N, roads + 1f);
        var rows = res.rows;
        rows.Add(new Row { name = "Groen", w = 0.2f, v = C01(green / Mathf.Max(1f, N * 0.22f)), detail = parks + " park(en), " + roofGreen + " daktuin(en)", tip = "Leg een park aan, of zet een park op een plat dak." });
        rows.Add(new Row { name = "Bereikbaar", w = 0.2f, v = bld > 0 ? bldOK / (float)bld : -1f, detail = bld > 0 ? bldOK + " van de " + bld + " gebouwen liggen aan een weg of pad" : "Nog geen gebouwen", tip = "Zet gebouwen naast een weg of pad, zodat je er via de voordeur kunt komen." });
        rows.Add(new Row { name = "Wegennet", w = 0.14f, v = roads > 0 ? C01(1f - (deadEnds * 0.6f + isolated * 1.5f) / roads) * (roadShare > 0.5f ? C01(1f - (roadShare - 0.5f) * 2.5f) : 1f) : -1f, detail = roads > 0 ? roads + " vakken weg, " + deadEnds + " doodlopende einden" + (isolated > 0 ? ", " + isolated + " los" : "") + (roadShare > 0.5f ? ", erg veel asfalt" : "") : "Nog geen wegen", tip = "Verbind doodlopende wegen tot rondjes, en laat niet de halve stad uit asfalt bestaan." });
        rows.Add(new Row { name = "Afwisseling", w = 0.14f, v = 0.6f * C01((types.Count - 2) / 7f) + 0.4f * (heights.Count > 0 ? C01((heights.Count - 1) / 4f) : 0f), detail = types.Count + " soorten blokken, " + heights.Count + " bouwhoogtes", tip = "Wissel af: hoog en laag, parken, paden en water." });
        rows.Add(new Row { name = "Levendig", w = 0.12f, v = bld > 0 ? C01(pedSpots / (bld * 0.35f)) : -1f, detail = bld > 0 ? pedSpots + " plekken voor voetgangers (paden)" : "Nog geen gebouwen", tip = "Leg paden tussen de gebouwen, daar lopen mensen graag." });
        rows.Add(new Row { name = "Water", w = 0.08f, v = water > 0 ? C01(0.7f - Mathf.Max(0f, water / (float)N - 0.25f) * 3f) + 0.3f * C01(water / 3f) : 0.35f, detail = water > 0 ? water + " watervakken" : "Geen water", tip = "Een meertje of gracht maakt een stad meteen mooier." });
        rows.Add(new Row { name = "Samenhang", w = 0.16f, v = C01(1f - (holes * 0.7f + loose) / Mathf.Max(4f, N * 0.12f)), detail = holes + " lege gaten tussen de bebouwing, " + loose + " losse blokken", tip = "Vul lege gaten tussen gebouwen op en haal losse blokken weg." });
        float sw = 0f, sv = 0f; Row weakest = null;
        foreach (var r in rows) { if (r.v < 0f) continue; sw += r.w; sv += r.w * r.v; if (weakest == null || r.v * r.w < weakest.v * weakest.w) weakest = r; }
        res.score = Mathf.RoundToInt(Mathf.Pow(sv / Mathf.Max(0.01f, sw), 1.4f) * 100f);
        res.label = res.score >= 85 ? "Prachtig" : res.score >= 70 ? "Mooi" : res.score >= 55 ? "Gezellig" : res.score >= 35 ? "Gewoon" : "Rommelig";
        res.tip = weakest != null && weakest.v < 0.9f ? weakest.tip : "Een prachtige stad. Loop er eens doorheen!";
        return res;
    }
}
