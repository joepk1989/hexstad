using System.Collections.Generic;
using UnityEngine;

// Bouwen op de planeet: de camera hangt boven een punt op de bol en schuift over het oppervlak (WASD),
// draait (rechtermuis) en zoomt (scroll). Klik een vak om het gekozen blok te plaatsen; een weg is ook een blok.
// Tab = rondlopen op de planeet.
public class PlanetBuilder : MonoBehaviour
{
    public Camera Cam;
    Vector3 focus = Vector3.up, fwd = Vector3.forward;
    float pitch = 55f, dist = 260f;
    int tool = 1, hover = -1; bool hasHover;
    readonly List<Dictionary<int, List<string>>> undo = new List<Dictionary<int, List<string>>>();
    LineRenderer outline; PlanetWalker walker; bool walking; string msg = ""; float msgT;
    int lastPainted = -1; bool painting;
    int lineStart = -1; List<int> linePlan; readonly List<LineRenderer> planLines = new List<LineRenderer>();   // weg slepen: een rechte lijn van vakken (30°-richtingen)                 // slepen: elk nieuw vak onder de muis krijgt het blok
    Beauty.Result beauty; float beautyT = -99f, fps; int fpsN; float fpsT;
    Vector3 centre; float centreT = -99f; bool hasCentre;   // middelpunt van de stad, voor de pijl
    bool showHelp;

    void Start()
    {
        int s0 = Planet.Starts[Random.Range(0, Planet.Starts.Length)]; focus = Planet.Cells[s0].dir; fwd = Planet.Cells[s0].north;   // elke speler begint op een startplek: zo ver mogelijk van de vijfhoeken
        outline = new GameObject("Hover").AddComponent<LineRenderer>(); outline.loop = true; outline.positionCount = 6; outline.widthMultiplier = 0.35f; outline.material = Raatstad.MatOutline; outline.useWorldSpace = true;
        walker = new GameObject("Wandelaar").AddComponent<PlanetWalker>(); walker.Cam = Cam; walker.gameObject.SetActive(false);
        Say("Planeet: " + Planet.Cells.Length + " vakken, omtrek " + Mathf.RoundToInt(2f * Mathf.PI * Planet.R) + " m · toets 1-9 of de balk kiest een blok · klik een vak");
    }

    void Say(string s) { msg = s; msgT = Time.time + 4f; }
    void Push() { undo.Add(PlanetCity.Clone(PlanetCity.Cells)); if (undo.Count > 100) undo.RemoveAt(0); }
    void Changed() { PlanetCity.Rebuild(); PlanetCity.Save(); }

    void Update()
    {
        if (Inp.Down(K.Tab)) ToggleWalk();
        if (Inp.Down(K.M)) { Babble.Muted = !Babble.Muted; Ambience.Muted = Babble.Muted; Say(Babble.Muted ? "Geluid uit (M)" : "Geluid aan (M)"); }
        if (walking) return;
        CameraControl();

        K[] dk = { K.D1, K.D2, K.D3, K.D4, K.D5, K.D6, K.D7, K.D8, K.D9 };
        for (int i = 0; i < dk.Length; i++) if (Inp.Down(dk[i])) { tool = i; Say("Gereedschap: " + Blocks.Names[i]); }
        if (Inp.Down(K.D0) || Inp.Down(K.G)) { tool = System.Array.IndexOf(Blocks.Tools, "gum"); Say("Gum: klik of sleep over blokken om ze weg te halen (X doet hetzelfde zonder van gereedschap te wisselen)"); }
        if (Inp.Down(K.H)) { CityCentre(); if (hasCentre) { focus = centre; Say("Naar het midden van de stad (H)"); } }
        if (Inp.Down(K.Z) && Inp.Held(K.Ctrl) && undo.Count > 0) { PlanetCity.Cells = undo[undo.Count - 1]; undo.RemoveAt(undo.Count - 1); PlanetCity.TouchAll(); Changed(); Say("Ongedaan gemaakt"); }

        // aanwijzen: het vak onder de muis
        hasHover = false;
        if (!OverBar && Physics.Raycast(Cam.ScreenPointToRay(Inp.Pos), out RaycastHit hit, 5000f, ~0, QueryTriggerInteraction.Ignore))
        {
            hover = Planet.Nearest(hit.point); hasHover = true;
            ShowOutline(hover);
            if (Inp.Down(K.X)) { Push(); if (PlanetCity.RemoveTop(hover)) Changed(); }
            bool roadTool = Blocks.Tools[tool] == "weg" || Blocks.Tools[tool] == "pad";
            if (Inp.LeftDown) { Push(); painting = !roadTool; lastPainted = -1; lineStart = roadTool ? hover : -1; linePlan = null; }
            if (lineStart >= 0 && Inp.LeftHeld) { linePlan = hover == lineStart ? null : LinePlan(lineStart, hover); ShowPlan(linePlan); }
            if (painting && Inp.LeftHeld && hover != lastPainted)
            {
                lastPainted = hover; string t = Blocks.Tools[tool];
                if (t == "gum") { if (PlanetCity.RemoveTop(hover)) Changed(); else if (!Inp.LeftHeld || lastPainted == hover) Say("Hier staat niets"); }
                else { string err = PlanetCity.Place(hover, t); if (err != null) Say(err); else Changed(); }
            }
        }
        if (Inp.LeftUp)
        {
            if (lineStart >= 0)
            {
                var cellsToDo = linePlan ?? new List<int> { lineStart }; string t = Blocks.Tools[tool]; int ok = 0; string err = null;
                foreach (int i in cellsToDo) { string e = PlanetCity.Place(i, t); if (e == null) ok++; else err = e; }
                if (ok > 0) Changed(); else if (err != null) Say(err);
                if (linePlan != null && ok > 0) Say(ok + " vakken " + Blocks.Names[tool].ToLower());
                lineStart = -1; linePlan = null; ShowPlan(null);
            }
            painting = false;
        }
        outline.enabled = hasHover;
    }

    bool OverBar => Inp.Pos.y < 96f || (Inp.Pos.y > Screen.height - 70f) || showHelp;

    void SwitchSlot(int n)
    {
        if (n == PlanetCity.Slot) return;
        PlanetCity.Save(); PlanetCity.Slot = n; undo.Clear();
        if (!PlanetCity.Load()) { PlanetCity.Cells = new Dictionary<int, List<string>>(); PlanetCity.TouchAll(); }
        PlanetCity.Rebuild(); beautyT = -99f; Say("Stad " + n + (PlanetCity.Cells.Count == 0 ? " (leeg)" : ""));
    }

    void CityCentre()
    {
        if (Time.time - centreT < 2f) return; centreT = Time.time;
        Vector3 sum = Vector3.zero; int n = 0; foreach (var kv in PlanetCity.Cells) { sum += Planet.Cells[kv.Key].dir; n++; }
        hasCentre = n > 0 && sum.sqrMagnitude > 1e-6f; if (hasCentre) centre = sum.normalized;
    }

    // Een rechte lijn van vakken van a naar b: de richting wordt op een veelvoud van 30° gelegd (zoals in de browser) en de lijn
    // volgt de grootcirkel; elke stap kiest de buur die het dichtst bij die cirkel blijft. In de 6 buurrichtingen is dat een
    // kaarsrechte rij, in de 6 tussenrichtingen een lichte trap.
    static List<int> LinePlan(int a, int b)
    {
        var A = Planet.Cells[a]; Vector3 da = A.dir, db = Planet.Cells[b].dir;
        Vector3 t = db - da; t -= da * Vector3.Dot(t, da); if (t.sqrMagnitude < 1e-8f) return null; t.Normalize();
        // de 12 richtingen: naar de buren (6) en daar precies tussenin (6); op een vijfhoek 5 + 5
        var dirs = new List<Vector3>(); foreach (int j in A.nb) { Vector3 d = Planet.Cells[j].dir - da; d -= da * Vector3.Dot(d, da); dirs.Add(d.normalized); }
        dirs.Sort((p, q) => Mathf.Atan2(Vector3.Dot(p, A.north), Vector3.Dot(p, A.east)).CompareTo(Mathf.Atan2(Vector3.Dot(q, A.north), Vector3.Dot(q, A.east))));   // op volgorde rondom
        int nd = dirs.Count; for (int k = 0; k < nd; k++) { Vector3 m = dirs[k] + dirs[(k + 1) % nd]; if (m.sqrMagnitude > 1e-6f) dirs.Add(m.normalized); }
        Vector3 ray = dirs[0]; float bestDot = -2f; foreach (var d in dirs) { float v = Vector3.Dot(d, t); if (v > bestDot) { bestDot = v; ray = d; } }
        Vector3 n = Vector3.Cross(da, ray).normalized;
        float total = Mathf.Acos(Mathf.Clamp(Vector3.Dot(da, db), -1f, 1f));
        var plan = new List<int> { a }; int cur = a;
        for (int step = 0; step < 120; step++)
        {
            Vector3 dc = Planet.Cells[cur].dir, fwd = Vector3.Cross(n, dc).normalized; int best = -1; float bs = -1e9f;
            foreach (int j in Planet.Cells[cur].nb)
            {
                Vector3 dj = Planet.Cells[j].dir; float prog = Vector3.Dot(dj - dc, fwd); if (prog <= 1e-6f) continue;
                float off = Mathf.Abs(Vector3.Dot(dj, n)) * Planet.R;   // afstand tot de grootcirkel in meters
                float sc = prog * 10f - off; if (sc > bs) { bs = sc; best = j; }
            }
            if (best < 0) break;
            float along = Mathf.Acos(Mathf.Clamp(Vector3.Dot(da, Planet.Cells[best].dir), -1f, 1f));
            if (along > total + 0.4f * 15.6f / Planet.R) break;
            plan.Add(best); cur = best; if (cur == b) break;
        }
        return plan;
    }

    void ShowPlan(List<int> plan)
    {
        int n = plan == null ? 0 : plan.Count;
        while (planLines.Count < n) { var l = new GameObject("Plan").AddComponent<LineRenderer>(); l.loop = true; l.widthMultiplier = 0.3f; l.material = Raatstad.MatOutline; l.useWorldSpace = true; planLines.Add(l); }
        for (int k = 0; k < planLines.Count; k++)
        {
            if (k >= n) { planLines[k].enabled = false; continue; }
            var c = Planet.Cells[plan[k]]; float h = PlanetCity.StackHeight(plan[k]) + 0.35f; planLines[k].enabled = true;
            if (planLines[k].positionCount != c.corners.Length) planLines[k].positionCount = c.corners.Length;
            for (int q = 0; q < c.corners.Length; q++) planLines[k].SetPosition(q, c.corners[q] * (Planet.R + h));
        }
    }

    void ShowOutline(int i)
    {
        var c = Planet.Cells[i]; float h = PlanetCity.StackHeight(i) + 0.3f;
        if (c.corners.Length == 5 && Time.time > msgT) Say("Dit is een van de 12 vijfhoeken (oranje): op een bol passen niet alleen zeshoeken");
        else if (Time.time > msgT && System.Array.IndexOf(Planet.Starts, i) >= 0) Say("Startplek (een van de 20): zo ver mogelijk van de vijfhoeken, hier is het raster het netst");
        if (outline.positionCount != c.corners.Length) outline.positionCount = c.corners.Length;
        for (int k = 0; k < c.corners.Length; k++) outline.SetPosition(k, c.corners[k] * (Planet.R + h));
    }

    void CameraControl()
    {
        float dt = Time.deltaTime, sp = (Inp.Held(K.Shift) ? 3f : 1f) * dist * 0.8f;
        Vector3 up = focus; fwd = (fwd - up * Vector3.Dot(fwd, up)).normalized; Vector3 right = Vector3.Cross(up, fwd);
        Vector3 move = Vector3.zero;
        if (Inp.Held(K.W)) move += fwd; if (Inp.Held(K.S)) move -= fwd; if (Inp.Held(K.D)) move += right; if (Inp.Held(K.A)) move -= right;
        if (move != Vector3.zero) { focus = (focus + move.normalized * (sp * dt / Planet.R)).normalized; up = focus; fwd = (fwd - up * Vector3.Dot(fwd, up)).normalized; }
        dist = Mathf.Clamp(dist * (1f - Inp.Scroll * 0.1f), 12f, 2600f);
        if (Inp.RightHeld) { Vector2 d = Inp.Delta; fwd = Quaternion.AngleAxis(d.x * 0.2f, up) * fwd; pitch = Mathf.Clamp(pitch - d.y * 0.2f, 15f, 89f); }
        float h = PlanetCity.StackHeight(Planet.Nearest(focus));
        Vector3 target = focus * (Planet.R + h);
        Vector3 pos = target + (-fwd * Mathf.Cos(pitch * Mathf.Deg2Rad) + up * Mathf.Sin(pitch * Mathf.Deg2Rad)) * dist;
        Cam.transform.position = pos; Cam.transform.rotation = Quaternion.LookRotation(target - pos, up);
    }

    void ToggleWalk()
    {
        walking = !walking;
        if (walking)
        {
            outline.enabled = false;
            int i = Planet.Nearest(focus); float h = PlanetCity.StackHeight(i);
            if (PlanetCity.IsRoad(i)) h = 0.16f;
            walker.Enter(focus * (Planet.R + h + 0.3f), fwd);
        }
        else { walker.Exit(); focus = walker.transform.position.normalized; fwd = walker.Forward; }
    }

    void OnGUI()
    {
        Ui.Init(); float W = Screen.width, H = Screen.height;
        if (Time.time - beautyT > 3f) { beauty = Beauty.Compute(); beautyT = Time.time; }
        fpsN++; if (Time.time - fpsT > 0.5f) { fps = fpsN / (Time.time - fpsT); fpsN = 0; fpsT = Time.time; }

        // ---- bovenbalk links: naam, stad, blokken, score
        var r = Ui.Card(new Rect(12, 12, 330, 58));
        Ui.Title(new Rect(r.x, r.y, 160, 24), "RAATSTAD");
        Ui.Dim(new Rect(r.x, r.y + 24, 300, 18), (beauty != null ? beauty.blocks + " blokken · hoogste punt " + beauty.top.ToString("0.#") + " m" : "") + " · stad " + PlanetCity.Slot);
        if (beauty != null)
        {
            bool over = new Rect(342, 12, 160, 58).Contains(Inp.Pos.x > 0 ? new Vector2(Inp.Pos.x, H - Inp.Pos.y) : Vector2.zero);
            var sr = Ui.Card(new Rect(348, 12, 160, 58));
            Ui.Big(new Rect(sr.x, sr.y - 2, 50, 30), beauty.score > 0 ? beauty.score.ToString() : "–");
            Ui.Dim(new Rect(sr.x + 52, sr.y + 2, 110, 18), "<b>" + beauty.label + "</b>");
            Ui.Dim(new Rect(sr.x, sr.y + 24, 110, 16), "schoonheid");
            if (over && beauty.score > 0)
            {
                string txt = ""; foreach (var row in beauty.rows) txt += "<b>" + row.name + "</b>  " + (row.v < 0f ? "–" : Mathf.RoundToInt(row.v * 100f) + "%") + "   <color=#c8d0d8>" + row.detail + "</color>\n";
                txt += "\n<color=#f3b43b>" + beauty.tip + "</color>";
                var tr = Ui.Card(new Rect(348, 76, 440, 215), 0.95f); Ui.Text(new Rect(tr.x, tr.y, tr.width, tr.height), txt);
            }
        }
        // ---- bovenbalk rechts: klok, weer, geluid, hulp
        float x = W - 12;
        if (Ui.Button(new Rect(x - 40, 12, 40, 40), "?", showHelp)) showHelp = !showHelp; x -= 48;
        if (Ui.Button(new Rect(x - 76, 12, 76, 40), Babble.Muted ? "Stil" : "Geluid")) { Babble.Muted = !Babble.Muted; Ambience.Muted = Babble.Muted; } x -= 84;
        if (Weather.I != null) { if (Ui.Button(new Rect(x - 120, 12, 120, 40), Weather.Names[(int)Weather.I.Current] + (Weather.I.Wissel ? "" : " ·"))) { Weather.I.Set((Weather.Kind)(((int)Weather.I.Current + 1) % 6), true); } x -= 128; }
        var dn = GetComponent<DayNight>();
        if (Ui.Button(new Rect(x - 96, 12, 96, 40), DayNight.Clock + (dn != null && dn.Frozen ? " ·" : ""))) { Inp.Fake(K.N); }
        // fps linksonder boven de balk
        Ui.Dim(new Rect(16, H - 92, 200, 16), Mathf.RoundToInt(fps) + " fps · " + (PlanetLife.I != null ? PlanetLife.I.People.Count + " mensen · " + PlanetLife.I.CarCount + " auto's" : ""));

        // ---- melding
        if (Time.time < msgT) Ui.Toast(msg, Mathf.Clamp01((msgT - Time.time) / 0.5f));

        // ---- onderbalk: gereedschap, modus, slots
        if (!walking)
        {
            int n = Blocks.Tools.Length; float bw = Mathf.Min(74f, (W - 420f) / n), x0 = 12f;
            for (int i = 0; i < n; i++)
            {
                string key = i < 9 ? (i + 1).ToString() : Blocks.Tools[i] == "gum" ? "0" : null;
                if (Ui.Tool(new Rect(x0 + i * bw, H - 68, bw - 6, 58), Blocks.Names[i], key, Ui.ToolColor(Blocks.Tools[i]), i == tool)) tool = i;
            }
            float sx = W - 12;
            if (Ui.Button(new Rect(sx - 110, H - 56, 110, 44), "Lopen  <size=10>Tab</size>", false, Ui.Amber)) ToggleWalk(); sx -= 118;
            for (int k = 3; k >= 1; k--) { if (Ui.Button(new Rect(sx - 64, H - 56, 64, 44), "Stad " + k, k == PlanetCity.Slot)) SwitchSlot(k); sx -= 70; }
        }
        else
        {
            var wr = Ui.Card(new Rect(W / 2 - 230, H - 52, 460, 40), 0.8f);
            Ui.Dim(new Rect(wr.x, wr.y, wr.width, 24), "WASD lopen · muis kijken · Shift rennen · Spatie springen · Esc muis los · Tab terug naar bouwen");
        }

        // ---- hulp
        if (showHelp)
        {
            var hr = Ui.Card(new Rect(W / 2 - 260, 90, 520, 300), 0.95f);
            Ui.Title(new Rect(hr.x, hr.y, 300, 26), "Bediening");
            Ui.Help(new Rect(hr.x, hr.y + 32, hr.width, 250),
                "<b>Bouwen</b>  klik of sleep over vakken (1-9 kiest een blok, 0 of G de gum, X haalt het bovenste blok weg, Ctrl+Z maakt ongedaan)\n" +
                "<b>Wegen en paden slepen</b>  klik een vak en sleep: een rechte lijn in een van de 12 richtingen (30°), loslaten plaatst hem\n" +
                "<b>Wegen en paden</b>  zijn ook blokken: zet ze op aangrenzende vakken en ze sluiten vanzelf aan\n" +
                "<b>Camera</b>  WASD schuiven (Shift sneller) · rechtermuis draaien · scroll zoomen · H naar het midden van je stad\n" +
                "<b>Wandelen</b>  Tab · WASD · Shift rennen · Spatie springen · Esc muis los\n" +
                "<b>Weer en tijd</b>  R volgend weer (vast) · N zon stilzetten · M geluid aan/uit\n" +
                "<b>Planeet</b>  21.162 vakken, omtrek 3,8 km. Oranje: de 12 vijfhoeken. Lichtblauw: de 20 startplekken.");
        }

        // ---- pijl naar het midden van de stad als je er ver vandaan bent
        CityCentre();
        if (hasCentre)
        {
            Vector3 here = (walking ? walker.transform.position : focus * Planet.R).normalized;
            float dist = Mathf.Acos(Mathf.Clamp(Vector3.Dot(here, centre), -1f, 1f)) * Planet.R;
            if (dist > 120f)
            {
                Vector3 sp = Cam.WorldToScreenPoint(centre * (Planet.R + 20f)); Vector2 c2 = new Vector2(W / 2f, H / 2f);
                Vector2 dir = (new Vector2(sp.x, sp.y) - c2).normalized; if (sp.z < 0f) dir = -dir;
                bool onScreen = sp.z > 0f && sp.x > 0 && sp.x < W && sp.y > 0 && sp.y < H;
                Vector2 pos = onScreen ? new Vector2(sp.x, H - sp.y) : c2 + new Vector2(dir.x, -dir.y) * Mathf.Min(W, H) * 0.38f;
                float ang = Mathf.Atan2(-dir.y, dir.x) * Mathf.Rad2Deg;
                var m = GUI.matrix; GUIUtility.RotateAroundPivot(ang, pos);
                var ast = new GUIStyle { fontSize = 26, alignment = TextAnchor.MiddleCenter }; ast.normal.textColor = Ui.Amber;
                GUI.Label(new Rect(pos.x - 20, pos.y - 14, 40, 28), "➤", ast); GUI.matrix = m;
                var cr = Ui.Card(new Rect(pos.x - 70, pos.y + 16, 140, 30), 0.85f); Ui.Dim(new Rect(cr.x, cr.y - 2, cr.width, 18), "Centrum · " + Mathf.RoundToInt(dist) + " m");
            }
        }
    }
}
