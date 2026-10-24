using System.Collections.Generic;
using UnityEngine;

// Bouwmodus: bovenaanzicht-camera, wegen klikken en slepen, voorbeeld bij hover, ongedaan maken. Tab = rondlopen.
public class Builder : MonoBehaviour
{
    public Camera Cam;
    List<RoadPath> paths = new List<RoadPath>();
    readonly List<List<RoadPath>> undo = new List<List<RoadPath>>();
    Transform committed, preview; LineRenderer outline;
    Vector3 focus = Vector3.zero; float yaw = 20f, pitch = 55f, dist = 90f;
    Vector2Int hover, startCell, lastPreviewCell = new Vector2Int(int.MinValue, 0); int level, lastPreviewLevel = -1;
    float pressT; bool dragging, previewOn; Vector2Int dragEnd;
    Walker walker; bool walking; string msg = ""; float msgT;

    void Start()
    {
        committed = new GameObject("Wegen").transform; preview = new GameObject("Voorbeeld").transform;
        outline = new GameObject("Hover").AddComponent<LineRenderer>(); outline.loop = true; outline.positionCount = 6; outline.widthMultiplier = 0.35f; outline.material = Raatstad.MatOutline; outline.useWorldSpace = true;
        walker = new GameObject("Wandelaar").AddComponent<Walker>(); walker.Cam = Cam; walker.gameObject.SetActive(false);
        Apply(); Say("Klik een vak voor een weg · lang vasthouden en slepen voor een lijn");
    }

    void Say(string s) { msg = s; msgT = Time.time + 4f; }

    void Apply() { RoadMesher.Build(committed, paths, true); }

    void Push() { undo.Add(RoadRules.CloneAll(paths)); if (undo.Count > 100) undo.RemoveAt(0); }

    void Update()
    {
        if (Inp.Down(K.Tab)) { ToggleWalk(); }
        if (walking) return;
        CameraControl();
        // aanwijzen op de grond
        var plane = new Plane(Vector3.up, Vector3.zero); Ray ray = Cam.ScreenPointToRay(Inp.Pos);
        if (!plane.Raycast(ray, out float t)) return;
        Vector3 hit = ray.GetPoint(t); hover = Hex.FromWorld(hit.x, hit.z);

        if (Inp.Down(K.E)) { level = Mathf.Min(level + 1, 6); Say("Laag " + level + " (" + level * RoadRules.LAYER_H + " m, los van het terrein)"); }
        if (Inp.Down(K.Q)) { level = Mathf.Max(level - 1, 0); Say(level == 0 ? "Laag 0: op de grond" : "Laag " + level + " (" + level * RoadRules.LAYER_H + " m)"); }
        if (Inp.Down(K.Z) && Inp.Held(K.Ctrl) && undo.Count > 0) { paths = undo[undo.Count - 1]; undo.RemoveAt(undo.Count - 1); Apply(); ClearPreview(); Say("Ongedaan gemaakt"); }
        if (Inp.Down(K.X)) { Push(); RoadRules.Erase(paths, new Vector2(hit.x, hit.z), level); Apply(); ClearPreview(); }

        if (Inp.LeftDown) { startCell = hover; pressT = Time.time; dragging = false; }
        if (Inp.LeftHeld && !dragging && Time.time - pressT > 0.3f) dragging = true;
        List<RoadPath> plan = null;
        if (dragging && Inp.LeftHeld)
        {
            dragEnd = RoadRules.AlignCell(startCell, hover);
            plan = RoadRules.Line(paths, startCell, dragEnd, level);
            ShowOutline(dragEnd);
            if (plan != null) ShowPreview(plan, true);
        }
        else if (!Inp.LeftHeld)
        {
            if (hover != lastPreviewCell || level != lastPreviewLevel) { lastPreviewCell = hover; lastPreviewLevel = level; var pl = RoadRules.Click(paths, hover, level); if (pl != null) ShowPreview(pl, true); else ClearPreview(); }
            ShowOutline(hover);
        }
        if (Inp.LeftUp)
        {
            if (dragging) { var res = RoadRules.Line(paths, startCell, RoadRules.AlignCell(startCell, hover), level); if (res != null) { Push(); paths = res; Apply(); } }
            else { var res = RoadRules.Click(paths, startCell, level); if (res != null) { Push(); paths = res; Apply(); } else Say("Hier ligt al weg"); }
            dragging = false; ClearPreview(); lastPreviewCell = new Vector2Int(int.MinValue, 0);
        }
    }

    void ShowPreview(List<RoadPath> plan, bool on)
    {
        committed.gameObject.SetActive(false); preview.gameObject.SetActive(true); RoadMesher.Build(preview, plan, false); previewOn = true;
    }
    void ClearPreview() { if (!previewOn) return; previewOn = false; committed.gameObject.SetActive(true); foreach (Transform c in preview) Destroy(c.gameObject); }

    void ShowOutline(Vector2Int c)
    {
        Vector2 m = Hex.Center(c); float y = level * RoadRules.LAYER_H + 0.3f;
        for (int i = 0; i < 6; i++) { Vector2 k = Hex.Corner(m, i); outline.SetPosition(i, new Vector3(k.x, y, k.y)); }
    }

    void CameraControl()
    {
        float dt = Time.deltaTime, sp = (Inp.Held(K.Shift) ? 3f : 1f) * dist * 0.8f;
        Quaternion yawRot = Quaternion.Euler(0, yaw, 0); Vector3 fwd = yawRot * Vector3.forward, right = yawRot * Vector3.right;
        if (Inp.Held(K.W)) focus += fwd * sp * dt; if (Inp.Held(K.S)) focus -= fwd * sp * dt;
        if (Inp.Held(K.D)) focus += right * sp * dt; if (Inp.Held(K.A)) focus -= right * sp * dt;
        dist = Mathf.Clamp(dist * (1f - Inp.Scroll * 0.1f), 15f, 400f);
        if (Inp.RightHeld) { Vector2 d = Inp.Delta; yaw += d.x * 0.2f; pitch = Mathf.Clamp(pitch - d.y * 0.2f, 20f, 89f); }
        Cam.transform.rotation = Quaternion.Euler(pitch, yaw, 0); Cam.transform.position = focus - Cam.transform.forward * dist;
    }

    void ToggleWalk()
    {
        walking = !walking;
        if (walking) { ClearPreview(); outline.enabled = false; Vector3 start = focus; start.y = 0.5f; foreach (var h in Physics.RaycastAll(new Vector3(focus.x, 60, focus.z), Vector3.down, 100f)) start.y = Mathf.Max(start.y, h.point.y + 0.3f); walker.Enter(start, yaw); }
        else { walker.Exit(); outline.enabled = true; }
    }

    void OnGUI()
    {
        var st = new GUIStyle(GUI.skin.label) { fontSize = 14 }; st.normal.textColor = Color.black;
        string help = walking ? "Wandelen: WASD lopen · muis kijken · Shift rennen · Spatie springen · C bukken · Esc muis los · Tab terug naar bouwen"
            : "Bouwen: klik vak = weg · vasthouden + slepen = lijn (30°-hoeken) · E/Q = laag omhoog/omlaag (nu " + level + ") · X = weg weghalen · Ctrl+Z = ongedaan · WASD = camera · rechtermuis = draaien · scroll = zoom · Tab = wandelen";
        GUI.Label(new Rect(10, 8, Screen.width - 20, 24), help, st);
        if (Time.time < msgT) GUI.Label(new Rect(10, 32, Screen.width - 20, 24), msg, st);
    }
}
