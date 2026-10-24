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
    int lastPainted = -1; bool painting;                 // slepen: elk nieuw vak onder de muis krijgt het blok
    Beauty.Result beauty; float beautyT = -99f, fps; int fpsN; float fpsT;
    Vector3 centre; float centreT = -99f; bool hasCentre;   // middelpunt van de stad, voor de pijl
    GUIStyle card, small, big;

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
            if (Inp.LeftDown) { Push(); painting = true; lastPainted = -1; }
            if (painting && Inp.LeftHeld && hover != lastPainted)
            {
                lastPainted = hover; string t = Blocks.Tools[tool];
                if (t == "gum") { if (PlanetCity.RemoveTop(hover)) Changed(); else if (!Inp.LeftHeld || lastPainted == hover) Say("Hier staat niets"); }
                else { string err = PlanetCity.Place(hover, t); if (err != null) Say(err); else Changed(); }
            }
        }
        if (Inp.LeftUp) painting = false;
        outline.enabled = hasHover;
    }

    bool OverBar => Inp.Pos.y < 54f || (Inp.Pos.y > Screen.height - 60f && Inp.Pos.x > Screen.width - 230f) || (Inp.Pos.y > Screen.height - 120f && Inp.Pos.x < 330f);

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
        if (card == null)
        {
            card = new GUIStyle(GUI.skin.box) { alignment = TextAnchor.UpperLeft, fontSize = 13, richText = true, wordWrap = true }; card.normal.textColor = Color.white;
            small = new GUIStyle(GUI.skin.label) { fontSize = 12 }; small.normal.textColor = Color.white;
            big = new GUIStyle(GUI.skin.label) { fontSize = 22, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter }; big.normal.textColor = new Color(1f, 0.8f, 0.2f);
        }
        var st = new GUIStyle(GUI.skin.label) { fontSize = 14 }; st.normal.textColor = DayNight.Night > 0.6f ? Color.white : Color.black;
        string help = walking ? "Wandelen op de planeet: WASD lopen · muis kijken · Shift rennen · Spatie springen · Esc muis los · Tab terug naar bouwen"
            : "Planeet: klik of sleep over vakken = blok plaatsen (1-9 of de balk) · X of 0/G = weghalen (gum) · Ctrl+Z = ongedaan · WASD = schuiven · rechtermuis = draaien · scroll = zoom · Tab = wandelen · M = geluid · R = weer · H = naar de stad";
        GUI.Label(new Rect(10, 8, Screen.width - 20, 24), help, st);
        if (Time.time < msgT) GUI.Label(new Rect(10, 32, Screen.width - 20, 24), msg, st);

        // stadskaart linksonder: score, blokken, hoogste punt, fps
        if (Time.time - beautyT > 3f) { beauty = Beauty.Compute(); beautyT = Time.time; }
        fpsN++; if (Time.time - fpsT > 0.5f) { fps = fpsN / (Time.time - fpsT); fpsN = 0; fpsT = Time.time; }
        var old = GUI.color; GUI.color = new Color(0.08f, 0.1f, 0.12f, 0.85f);
        GUI.Box(new Rect(10, Screen.height - 112, 320, 62), ""); GUI.color = old;
        if (beauty != null)
        {
            GUI.Label(new Rect(18, Screen.height - 108, 70, 50), beauty.score > 0 ? beauty.score.ToString() : "–", big);
            GUI.Label(new Rect(90, Screen.height - 108, 230, 20), "<b>" + beauty.label + "</b> · stad " + PlanetCity.Slot, small);
            GUI.Label(new Rect(90, Screen.height - 90, 230, 20), beauty.blocks + " blokken · hoogste punt " + beauty.top.ToString("0.#") + " m", small);
            GUI.Label(new Rect(90, Screen.height - 72, 230, 20), Mathf.RoundToInt(fps) + " fps · " + (PlanetLife.I != null ? PlanetLife.I.People.Count + " mensen, " + PlanetLife.I.CarCount + " auto's" : ""), small);
        }
        if (!walking)
        {
            float bw = Mathf.Min(84f, (Screen.width - 250f) / Blocks.Tools.Length), x0 = 10f;   // past altijd op het scherm, ook met de gum erbij
            for (int i = 0; i < Blocks.Tools.Length; i++)
            {
                var r = new Rect(x0 + i * bw, Screen.height - 46, bw - 4, 40);
                var prev = GUI.color; GUI.color = i == tool ? new Color(1f, 0.8f, 0.2f) : Color.white;
                if (GUI.Button(r, (i < 9 ? (i + 1) + " " : Blocks.Tools[i] == "gum" ? "0 " : "") + Blocks.Names[i])) tool = i;
                GUI.color = prev;
            }
            // opslagslots rechtsonder
            for (int n = 1; n <= 3; n++)
            {
                var r = new Rect(Screen.width - 230 + (n - 1) * 72, Screen.height - 46, 68, 40);
                var prev = GUI.color; GUI.color = n == PlanetCity.Slot ? new Color(1f, 0.8f, 0.2f) : Color.white;
                if (GUI.Button(r, "Stad " + n + (PlanetCity.SlotExists(n) || n == PlanetCity.Slot ? "" : " ·"))) SwitchSlot(n);
                GUI.color = prev;
            }
            if (beauty != null && beauty.score > 0 && Inp.Pos.y < 120f && Inp.Pos.x < 330f)
            {
                string txt = ""; foreach (var row in beauty.rows) txt += "<b>" + row.name + "</b> " + (row.v < 0f ? "–" : Mathf.RoundToInt(row.v * 100f) + "%") + "  " + row.detail + "\n";
                txt += "\n<i>" + beauty.tip + "</i>";
                GUI.color = new Color(0.08f, 0.1f, 0.12f, 0.92f); GUI.Box(new Rect(10, Screen.height - 320, 420, 200), ""); GUI.color = Color.white;
                GUI.Label(new Rect(18, Screen.height - 314, 404, 190), txt, card);
            }
        }
        // pijl naar het midden van de stad als je er ver vandaan bent
        CityCentre();
        if (hasCentre)
        {
            Vector3 here = (walking ? walker.transform.position : focus * Planet.R).normalized;
            float dist = Mathf.Acos(Mathf.Clamp(Vector3.Dot(here, centre), -1f, 1f)) * Planet.R;
            if (dist > 120f)
            {
                Vector3 sp = Cam.WorldToScreenPoint(centre * (Planet.R + 20f)); Vector2 dir;
                Vector2 c2 = new Vector2(Screen.width / 2f, Screen.height / 2f);
                if (sp.z > 0f) dir = (new Vector2(sp.x, sp.y) - c2).normalized; else dir = -(new Vector2(sp.x, sp.y) - c2).normalized;
                bool onScreen = sp.z > 0f && sp.x > 0 && sp.x < Screen.width && sp.y > 0 && sp.y < Screen.height;
                Vector2 pos = onScreen ? new Vector2(sp.x, Screen.height - sp.y) : c2 + new Vector2(dir.x, -dir.y) * Mathf.Min(Screen.width, Screen.height) * 0.38f;
                float ang = Mathf.Atan2(-dir.y, dir.x) * Mathf.Rad2Deg;
                var m = GUI.matrix; GUIUtility.RotateAroundPivot(ang, pos);
                GUI.color = new Color(1f, 0.8f, 0.2f); GUI.Label(new Rect(pos.x - 20, pos.y - 14, 40, 28), "➤", new GUIStyle(GUI.skin.label) { fontSize = 26, alignment = TextAnchor.MiddleCenter });
                GUI.matrix = m; GUI.color = Color.white;
                GUI.Label(new Rect(pos.x - 60, pos.y + 14, 120, 20), "Centrum · " + Mathf.RoundToInt(dist) + " m", new GUIStyle(GUI.skin.label) { alignment = TextAnchor.MiddleCenter, fontSize = 12 });
            }
        }
    }
}
