using System.Collections.Generic;
using UnityEngine;

// Bouwen op de planeet: de camera hangt boven een punt op de bol en schuift over het oppervlak (WASD),
// draait (rechtermuis) en zoomt (scroll). Klik een vak om het gekozen blok te plaatsen; een weg is ook een blok.
// Tab = rondlopen op de planeet.
public class PlanetBuilder : MonoBehaviour
{
    public Camera Cam;
    Vector3 focus = new Vector3(0.2f, 0.75f, -0.6f).normalized, fwd = Vector3.forward;
    float pitch = 55f, dist = 90f;
    int tool = 1, hover = -1; bool hasHover;
    readonly List<Dictionary<int, List<string>>> undo = new List<Dictionary<int, List<string>>>();
    LineRenderer outline; PlanetWalker walker; bool walking; string msg = ""; float msgT;

    void Start()
    {
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
        if (Inp.Down(K.M)) { Babble.Muted = !Babble.Muted; Say(Babble.Muted ? "Stemmen uit (M)" : "Stemmen aan (M)"); }
        if (walking) return;
        CameraControl();

        K[] dk = { K.D1, K.D2, K.D3, K.D4, K.D5, K.D6, K.D7, K.D8, K.D9 };
        for (int i = 0; i < dk.Length; i++) if (Inp.Down(dk[i])) { tool = i; Say("Gereedschap: " + Blocks.Names[i]); }
        if (Inp.Down(K.Z) && Inp.Held(K.Ctrl) && undo.Count > 0) { PlanetCity.Cells = undo[undo.Count - 1]; undo.RemoveAt(undo.Count - 1); PlanetCity.TouchAll(); Changed(); Say("Ongedaan gemaakt"); }

        // aanwijzen: het vak onder de muis
        hasHover = false;
        if (!OverBar && Physics.Raycast(Cam.ScreenPointToRay(Inp.Pos), out RaycastHit hit, 5000f, ~0, QueryTriggerInteraction.Ignore))
        {
            hover = Planet.Nearest(hit.point); hasHover = true;
            ShowOutline(hover);
            if (Inp.Down(K.X)) { Push(); if (PlanetCity.RemoveTop(hover)) Changed(); }
            if (Inp.LeftDown)
            {
                Push();
                string t = Blocks.Tools[tool];
                if (t == "gum") { if (PlanetCity.RemoveTop(hover)) Changed(); else Say("Hier staat niets"); }
                else { string err = PlanetCity.Place(hover, t); if (err != null) Say(err); else Changed(); }
            }
        }
        outline.enabled = hasHover;
    }

    bool OverBar => Inp.Pos.y < 54f;

    void ShowOutline(int i)
    {
        var c = Planet.Cells[i]; float h = PlanetCity.StackHeight(i) + 0.3f;
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
        dist = Mathf.Clamp(dist * (1f - Inp.Scroll * 0.1f), 12f, 900f);
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
        var st = new GUIStyle(GUI.skin.label) { fontSize = 14 }; st.normal.textColor = DayNight.Night > 0.6f ? Color.white : Color.black;
        string help = walking ? "Wandelen op de planeet: WASD lopen · muis kijken · Shift rennen · Spatie springen · Esc muis los · Tab terug naar bouwen"
            : "Planeet: klik een vak = blok plaatsen (1-9 of de balk) · X = bovenste blok weg · Ctrl+Z = ongedaan · WASD = schuiven · rechtermuis = draaien · scroll = zoom · Tab = wandelen";
        GUI.Label(new Rect(10, 8, Screen.width - 20, 24), help, st);
        if (Time.time < msgT) GUI.Label(new Rect(10, 32, Screen.width - 20, 24), msg, st);
        if (!walking)
        {
            float bw = 84f, x0 = (Screen.width - bw * Blocks.Tools.Length) / 2f;
            for (int i = 0; i < Blocks.Tools.Length; i++)
            {
                var r = new Rect(x0 + i * bw, Screen.height - 46, bw - 4, 40);
                var prev = GUI.color; GUI.color = i == tool ? new Color(1f, 0.8f, 0.2f) : Color.white;
                if (GUI.Button(r, (i < 9 ? (i + 1) + "  " : "") + Blocks.Names[i])) tool = i;
                GUI.color = prev;
            }
        }
    }
}
