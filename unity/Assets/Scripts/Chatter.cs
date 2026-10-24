using System;
using System.Collections.Generic;
using UnityEngine;

// Spreekballonnen boven mensen: ze zeggen wat ze van de stad vinden (wat mooi is en wat ze missen) en wat de game nog mist.
// Lichtgroen = positief, lichtrood = negatief, oranje = vraag of zachte wens. Een deel van de mensen is lomp, de rest subtiel.
public class Chatter : MonoBehaviour
{
    public static Chatter I;
    class Bub { public Person who; public string text; public int mood; public bool lomp; public float t, dur; }
    readonly List<Bub> live = new List<Bub>();
    public int LiveCount => live.Count;
    const int MaxB = 6; const float Range = 38f;
    readonly List<string> recent = new List<string>();

    class Review { public int woning, kantoor, park, water, meer, pad, hoog, cellen, wegen, fiets, rotonde, bouw, autos, mensen; }
    Review rv; float rvT = -99f;

    struct Line { public string text; public Func<Review, bool> ok; public Line(string t, Func<Review, bool> f) { text = t; ok = f; } }
    static readonly Line[] Lines = {
        // lof (de eerste 12)
        new Line("Wat een mooie stad is dit!", n => n.cellen > 12), new Line("Ik woon hier echt graag.", n => n.woning > 3), new Line("Zo veel groen, heerlijk!", n => n.park > 6),
        new Line("Dat park is prachtig.", n => n.park > 0), new Line("Kijk, een meertje! Mooi.", n => n.meer > 0), new Line("Fijn dat het water hier door de stad loopt.", n => n.water > 0),
        new Line("Wat een mooie huizen.", n => n.woning > 6), new Line("Mooi, die hoge gebouwen.", n => n.hoog > 2), new Line("Je kunt hier lekker fietsen.", n => n.fiets > 0),
        new Line("Fijne wandelpaden hier.", n => n.pad > 2), new Line("Wat een mooie ronde weg.", n => n.rotonde > 0), new Line("Het is hier lekker rustig.", n => n.autos < 3 && n.cellen > 8),
        // gemis
        new Line("Hier mist wel wat groen...", n => n.park < n.bouw * 0.25f && n.bouw > 4), new Line("Een park zou mooi zijn.", n => n.park == 0 && n.cellen > 6),
        new Line("Waarom is er geen water?", n => n.water + n.meer == 0 && n.cellen > 10), new Line("Een meertje zou hier mooi staan.", n => n.meer == 0 && n.park > 1),
        new Line("Waar moet ik eigenlijk werken? Geen kantoren!", n => n.kantoor == 0 && n.woning > 4), new Line("Er wonen hier te weinig mensen.", n => n.kantoor > 3 && n.woning < n.kantoor),
        new Line("Ik mis fietspaden.", n => n.fiets == 0 && n.wegen > 6), new Line("Ik mis wandelpaden in het groen.", n => n.pad == 0 && n.park > 2),
        new Line("Wat is het hier leeg, bouw er nog wat bij!", n => n.cellen < 10), new Line("Meer woningen graag!", n => n.woning < 4 && n.cellen > 6),
        new Line("Heel veel verkeer hier.", n => n.autos > 12), new Line("Geen winkels... ik moet ver lopen voor brood.", n => n.woning > 8),
        new Line("Een rotonde zou het verkeer verbeteren.", n => n.rotonde == 0 && n.wegen > 10), new Line("Waar zijn de bankjes?", n => n.park > 2 || n.cellen > 15),
    };
    const int GoodLines = 12;

    static readonly Func<string, string>[] GenBlunt = {
        x => "Geen " + Mass(x) + "?! Wie heeft deze stad bedacht?", x => "Een stad zonder " + Mass(x) + "? Dat is toch geen stad.", x => "Jullie vergaten " + Mass(x) + ". Weer.",
        x => "Geen " + Mass(x) + ". Dit is gewoon een schande.", x => "Zonder " + Mass(x) + " word ik hier echt niet gelukkig.", x => "Ik mis " + Mass(x) + " enorm. Doe er wat aan!" };
    static readonly Func<string, string>[] GenSoft = {
        x => "Zou er ooit " + Art(x) + " komen...", x => "Met " + Art(x) + " zou het hier nog fijner zijn...", x => "Ik denk soms aan " + Art(x) + ", zou dat hier kunnen...",
        x => "Stilletjes hoop ik op " + Art(x) + "...", x => "Misschien is er ergens " + Art(x) + ", ik heb nog niet gezocht..." };
    static string Mass(string x) => x[0] == '*' ? x.Substring(1) : x;
    static string Art(string x) => x[0] == '*' ? x.Substring(1) : "een " + x;

    void Awake() { I = this; }

    Review Measure()
    {
        var n = new Review();
        if (Raatstad.PlanetMode)
        {
            foreach (var kv in PlanetCity.Cells)
            {
                if (kv.Value.Count > 0 && kv.Value[0] == "weg") { n.wegen++; continue; }
                n.cellen++;
                foreach (var t in kv.Value) switch (t) { case "woning": n.woning++; break; case "kantoor": n.kantoor++; break; case "park": n.park++; break; case "water": n.water++; break; case "meer": n.meer++; break; case "pad": n.pad++; break; }
                if (kv.Value.Count >= 4) n.hoog++;
            }
            n.bouw = n.woning + n.kantoor; n.autos = PlanetLife.I != null ? PlanetLife.I.CarCount : 0; n.mensen = PlanetLife.I != null ? PlanetLife.I.People.Count : 0;
            return n;
        }
        foreach (var kv in City.Cells)
        {
            n.cellen++;
            foreach (var t in kv.Value)
            {
                switch (t) { case "woning": n.woning++; break; case "kantoor": n.kantoor++; break; case "park": n.park++; break; case "water": n.water++; break; case "meer": n.meer++; break; case "pad": n.pad++; break; }
            }
            if (kv.Value.Count >= 4) n.hoog++;
        }
        foreach (var p in City.Paths) n.wegen++;
        n.bouw = n.woning + n.kantoor;
        var cars = FindAnyObjectByType<Cars>(); n.autos = cars != null ? cars.Count : 0;
        n.mensen = People.I != null ? People.I.List.Count : 0;
        return n;
    }

    string Pick(Person a, out int mood)
    {
        var n = rv; mood = 2;
        if (DayNight.Night > 0.7f && UnityEngine.Random.value < 0.25f) { mood = 0; return Rand(ChatterData.Night); }
        if (UnityEngine.Random.value < 0.4f)
        {
            string t;
            if (UnityEngine.Random.value < 0.18f)
            {
                var g = new List<string[]>(); foreach (var x in ChatterData.Game) if (!recent.Contains(x[0])) g.Add(x);
                if (g.Count > 0) { var pr = g[UnityEngine.Random.Range(0, g.Count)]; Remember(pr[0]); t = a.lomp ? pr[0] : pr[1]; mood = MoodOf(t); return t; }
            }
            if (UnityEngine.Random.value < 0.4f)
            {
                var f = new List<string[]>(); foreach (var x in ChatterData.Funny) if (!recent.Contains(x[0])) f.Add(x);
                if (f.Count > 0) { var pr = f[UnityEngine.Random.Range(0, f.Count)]; Remember(pr[0]); t = a.lomp ? pr[0] : pr[1]; mood = MoodOf(t); return t; }
            }
            string item = ChatterData.Missing[UnityEngine.Random.Range(0, ChatterData.Missing.Length)];
            var gen = a.lomp ? GenBlunt : GenSoft; t = gen[UnityEngine.Random.Range(0, gen.Length)](item); Remember(t); mood = MoodOf(t); return t;
        }
        var ok = new List<int>(); for (int i = 0; i < Lines.Length; i++) if (!recent.Contains(Lines[i].text) && Lines[i].ok(n)) ok.Add(i);
        if (ok.Count == 0) { mood = 2; return Rand(ChatterData.Neutral); }
        int k = ok[UnityEngine.Random.Range(0, ok.Count)]; Remember(Lines[k].text); mood = k < GoodLines ? 0 : MoodOf(Lines[k].text); return Lines[k].text;
    }

    static string Rand(string[] a) => a[UnityEngine.Random.Range(0, a.Length)];
    void Remember(string t) { recent.Add(t); if (recent.Count > 40) recent.RemoveAt(0); }
    static int MoodOf(string t) => (t.EndsWith("?") || t.EndsWith("...")) ? 2 : 1;

    // een zin over de stad laten zeggen door deze persoon; geeft de duur terug
    public float Opine(Person a)
    {
        if (Time.time - rvT > 6f || rv == null) { rv = Measure(); rvT = Time.time; }
        string text = Pick(a, out int mood);
        float dur = Mathf.Clamp(1.2f + text.Length * 0.07f, 1.8f, 4.8f);
        return Say(a, text, dur, mood) ? dur : 0f;
    }

    public void Greet(Person a) { if (live.Count >= MaxB - 2) return; Say(a, Rand(ChatterData.Hi), 1.4f, 0); }
    public void GreetLater(Person a, float delay) { StartCoroutine(Later(a, delay)); }
    System.Collections.IEnumerator Later(Person a, float d) { yield return new WaitForSeconds(d); if (a != null && a.root != null) { Babble.Say(a, 0f, a.voice, true); Greet(a); } }

    bool Say(Person a, string text, float dur, int mood)
    {
        if (a == null || a.root == null || Camera.main == null) return false;
        foreach (var b in live) if (b.who == a) return false;
        if (Vector3.Distance(a.root.position, Camera.main.transform.position) > Range) return false;
        if (live.Count >= MaxB) live.RemoveAt(0);
        live.Add(new Bub { who = a, text = text, mood = mood, lomp = a.lomp, dur = dur }); return true;
    }

    void Update()
    {
        for (int i = live.Count - 1; i >= 0; i--) { live[i].t += Time.deltaTime; if (live[i].t > live[i].dur || live[i].who == null || live[i].who.root == null) live.RemoveAt(i); }
    }

    static Texture2D tex;
    static Texture2D Tex() { if (tex == null) { tex = new Texture2D(1, 1); tex.SetPixel(0, 0, Color.white); tex.Apply(); } return tex; }
    GUIStyle style;

    void OnGUI()
    {
        var cam = Camera.main; if (cam == null || live.Count == 0) return;
        if (style == null) { style = new GUIStyle(GUI.skin.label) { wordWrap = true, alignment = TextAnchor.MiddleCenter, fontSize = 13, richText = false }; style.normal.textColor = new Color(0.11f, 0.16f, 0.2f); }
        Color[] bg = { new Color(0.89f, 0.96f, 0.91f), new Color(0.99f, 0.90f, 0.89f), new Color(1f, 0.94f, 0.85f) };
        Color[] bd = { new Color(0.53f, 0.78f, 0.58f), new Color(0.90f, 0.55f, 0.51f), new Color(0.94f, 0.71f, 0.41f) };
        var old = GUI.color;
        foreach (var b in live)
        {
            Vector3 sp = cam.WorldToScreenPoint(b.who.Head + b.who.root.up * 0.3f); if (sp.z < 0.5f) continue;
            float d = sp.z; if (d > Range) continue;
            float fade = Mathf.Clamp01((Range - d) / 12f) * Mathf.Clamp01(Mathf.Min(b.t / 0.18f, (b.dur - b.t) / 0.25f));
            style.fontStyle = b.lomp ? FontStyle.Bold : FontStyle.Normal; style.fontSize = Mathf.RoundToInt(Mathf.Clamp(14f / Mathf.Max(6f, d) * 13f + 7f, 10f, 15f));
            float w = 190f, h = style.CalcHeight(new GUIContent(b.text), w - 16f) + 12f;
            var r = new Rect(sp.x - w / 2f, Screen.height - sp.y - h - 8f, w, h);
            GUI.color = new Color(bd[b.mood].r, bd[b.mood].g, bd[b.mood].b, fade); GUI.DrawTexture(new Rect(r.x - 1.5f, r.y - 1.5f, r.width + 3f, r.height + 3f), Tex());
            GUI.color = new Color(bg[b.mood].r, bg[b.mood].g, bg[b.mood].b, fade * 0.97f); GUI.DrawTexture(r, Tex());
            GUI.color = new Color(1f, 1f, 1f, fade); GUI.Label(new Rect(r.x + 8f, r.y + 2f, r.width - 16f, r.height - 4f), b.text, style);
        }
        GUI.color = old;
    }
}
