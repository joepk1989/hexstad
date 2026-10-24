using UnityEngine;

// Opstart: er is geen scene-opbouw nodig. Maak een lege scene, zet dit script (alle scripts) in het project en druk op Play.
public class Raatstad : MonoBehaviour
{
    public static bool PlanetMode = true;   // true: een echte bol van zeshoeken; false: het platte raster met getekende wegen

    // Materialen worden bij het eerste gebruik gemaakt (en opnieuw als ze na een hercompilatie tijdens Play weg zijn)
    static Material mWalk, mAsph, mLine, mWall, mGround, mGrid, mOutline;
    public static Material MatWalk => mWalk ? mWalk : (mWalk = MakeMat(new Color(0.88f, 0.84f, 0.72f)));
    public static Material MatAsphalt => mAsph ? mAsph : (mAsph = MakeMat(new Color(0.27f, 0.28f, 0.30f)));
    public static Material MatLine => mLine ? mLine : (mLine = MakeMat(Color.white));
    public static Material MatWall => mWall ? mWall : (mWall = MakeMat(new Color(0.55f, 0.55f, 0.52f)));
    public static Material MatGround => mGround ? mGround : (mGround = MakeMat(new Color(0.64f, 0.78f, 0.45f)));
    public static Material MatGrid => mGrid ? mGrid : (mGrid = MakeMat(new Color(1f, 1f, 1f, 0.5f), true));
    public static Material MatOutline => mOutline ? mOutline : (mOutline = MakeMat(new Color(1f, 0.75f, 0.1f), true));

    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void Boot()
    {
        if (FindAnyObjectByType<Raatstad>() != null) return;
        var go = new GameObject("Raatstad"); go.AddComponent<Raatstad>();
    }

    public static Material MakeMat(Color c, bool unlit = false)
    {
        Shader s = unlit ? Shader.Find("Universal Render Pipeline/Unlit") : Shader.Find("Universal Render Pipeline/Lit");
        if (s == null) s = Shader.Find(unlit ? "Unlit/Color" : "Standard");
        if (s == null) s = Shader.Find("Sprites/Default");
        var m = new Material(s) { color = c };
        if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
        if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.1f);
        return m;
    }

    void Awake()
    {
        if (FindAnyObjectByType<Light>() == null)
        {
            var l = new GameObject("Zon").AddComponent<Light>(); l.type = LightType.Directional; l.transform.rotation = Quaternion.Euler(50, -30, 0); l.shadows = LightShadows.Soft;
        }
        var cam = Camera.main; if (cam == null) { var c = new GameObject("Camera"); c.tag = "MainCamera"; cam = c.AddComponent<Camera>(); c.AddComponent<AudioListener>(); }
        cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = new Color(0.68f, 0.84f, 0.95f); cam.farClipPlane = PlanetMode ? 5000f : 2000f;
        if (PlanetMode)
        {
            Planet.Build(); PlanetCity.Init(transform); PlanetCity.Load(); PlanetCity.Rebuild();
            var pb = gameObject.AddComponent<PlanetBuilder>(); pb.Cam = cam;
            gameObject.AddComponent<DayNight>(); gameObject.AddComponent<Chatter>(); PlanetLife.I = gameObject.AddComponent<PlanetLife>();
            return;
        }

        // grond met rasterlijnen
        var ground = GameObject.CreatePrimitive(PrimitiveType.Cube); ground.name = "Grond"; ground.transform.localScale = new Vector3(2000, 1, 2000); ground.transform.position = new Vector3(0, -0.5f, 0);
        ground.GetComponent<MeshRenderer>().sharedMaterial = MatGround;
        BuildGrid(12);

        var b = gameObject.AddComponent<Builder>(); b.Cam = cam;
        gameObject.AddComponent<DayNight>(); gameObject.AddComponent<Chatter>(); People.I = gameObject.AddComponent<People>(); gameObject.AddComponent<Cars>();
    }

    void BuildGrid(int radius)
    {
        var v = new System.Collections.Generic.List<Vector3>(); var idx = new System.Collections.Generic.List<int>();
        for (int r = -radius; r <= radius; r++) for (int q = -radius - r / 2 - 1; q <= radius - r / 2 + 1; q++)
        {
            Vector2 c = Hex.Center(q, r); if (c.magnitude > radius * Hex.Pitch) continue;
            for (int i = 0; i < 6; i++) { Vector2 a = Hex.Corner(c, i), b = Hex.Corner(c, (i + 1) % 6); idx.Add(v.Count); v.Add(new Vector3(a.x, 0.02f, a.y)); idx.Add(v.Count); v.Add(new Vector3(b.x, 0.02f, b.y)); }
        }
        var m = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 }; m.SetVertices(v); m.SetIndices(idx, MeshTopology.Lines, 0);
        var go = new GameObject("Raster"); go.transform.SetParent(transform, false); go.AddComponent<MeshFilter>().sharedMesh = m; go.AddComponent<MeshRenderer>().sharedMaterial = MatGrid;
    }
}
