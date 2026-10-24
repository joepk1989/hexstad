using UnityEngine;

// Weer, naar de browserversie: zon, bewolkt, regen, onweer, mist en sneeuw, wisselend (het ene weer volgt het
// andere vanzelf op) of vast met de toets R (rondje door de soorten). Regen en sneeuw zijn een wolk van kleine
// strepen/vlokken in een doos rond de camera die meebeweegt; mist is de mist van Unity; onweer flitst.
public class Weather : MonoBehaviour
{
    public static Weather I;
    public enum Kind { Zon, Bewolkt, Regen, Onweer, Mist, Sneeuw }
    public static readonly string[] Names = { "Zon", "Bewolkt", "Regen", "Onweer", "Mist", "Sneeuw" };
    public Kind Current = Kind.Zon; public bool Wissel = true;
    // de waarden waar alles op reageert (schuiven in een paar seconden naar het nieuwe weer)
    public static float Cloud, Fog, Rain, Snow, Storm, Flash;
    float tCloud, tFog, tRain, tSnow, tStorm, nextT = 60f, flashT;
    Mesh drops; Vector3[] pos; float[] spd; Transform dropsT; MeshRenderer dropsR; int N = 900; const float Box = 28f;

    void Awake() { I = this; }

    static readonly float[,] T = { { 0.04f, 0f, 0f, 0f, 0f }, { 0.75f, 0.08f, 0f, 0f, 0f }, { 0.92f, 0.28f, 1f, 0f, 0f }, { 1f, 0.35f, 1.5f, 0f, 1f }, { 0.5f, 1f, 0f, 0f, 0f }, { 0.85f, 0.4f, 0f, 1f, 0f } };

    void Start()
    {
        pos = new Vector3[N]; spd = new float[N];
        for (int i = 0; i < N; i++) { pos[i] = new Vector3(Random.Range(-Box, Box), Random.Range(-Box, Box), Random.Range(-Box, Box)); spd[i] = 0.8f + Random.value; }
        drops = new Mesh { indexFormat = UnityEngine.Rendering.IndexFormat.UInt32 };
        var go = new GameObject("Neerslag"); dropsT = go.transform; go.AddComponent<MeshFilter>().sharedMesh = drops;
        dropsR = go.AddComponent<MeshRenderer>(); dropsR.sharedMaterial = Raatstad.MakeMat(new Color(0.85f, 0.9f, 1f, 0.55f), true); dropsR.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; dropsR.enabled = false;
    }

    Kind Next(Kind k)
    {
        float r = Random.value;
        switch (k)
        {
            case Kind.Zon: return r < 0.65f ? Kind.Bewolkt : r < 0.9f ? Kind.Zon : Kind.Mist;
            case Kind.Bewolkt: return r < 0.35f ? Kind.Zon : r < 0.7f ? Kind.Regen : r < 0.82f ? Kind.Mist : r < 0.9f ? Kind.Sneeuw : Kind.Bewolkt;
            case Kind.Regen: return r < 0.5f ? Kind.Bewolkt : r < 0.7f ? Kind.Onweer : r < 0.85f ? Kind.Regen : Kind.Zon;
            case Kind.Onweer: return r < 0.7f ? Kind.Regen : Kind.Bewolkt;
            case Kind.Mist: return r < 0.6f ? Kind.Zon : Kind.Bewolkt;
            default: return r < 0.6f ? Kind.Bewolkt : r < 0.85f ? Kind.Sneeuw : Kind.Zon;
        }
    }

    public void Set(Kind k, bool fixedMode) { Current = k; Wissel = !fixedMode; nextT = 90f + Random.value * 120f; }

    void Update()
    {
        float dt = Time.deltaTime;
        if (Inp.Down(K.R)) { Kind k = (Kind)(((int)Current + 1) % 6); Set(k, true); }
        if (Wissel) { nextT -= dt; if (nextT <= 0f) { Current = Next(Current); nextT = 90f + Random.value * 150f; } }
        int c = (int)Current; tCloud = T[c, 0]; tFog = T[c, 1]; tRain = T[c, 2]; tSnow = T[c, 3]; tStorm = T[c, 4];
        float k2 = Mathf.Min(1f, dt * 0.35f);
        Cloud += (tCloud - Cloud) * k2; Fog += (tFog - Fog) * k2; Rain += (tRain - Rain) * k2; Snow += (tSnow - Snow) * k2; Storm += (tStorm - Storm) * k2;
        // onweer: af en toe een flits
        Flash = Mathf.Max(0f, Flash - dt * 4f);
        if (Storm > 0.5f) { flashT -= dt; if (flashT <= 0f) { Flash = 1f; flashT = 4f + Random.value * 12f; } }
        // mist van Unity
        var cam = Camera.main; if (cam == null) return;
        float fog = Fog + Cloud * 0.05f;
        RenderSettings.fog = fog > 0.02f; RenderSettings.fogMode = FogMode.Linear;
        RenderSettings.fogStartDistance = Mathf.Lerp(600f, 25f, fog); RenderSettings.fogEndDistance = Mathf.Lerp(3000f, 220f, fog);
        RenderSettings.fogColor = Color.Lerp(cam.backgroundColor, new Color(0.78f, 0.8f, 0.84f), Mathf.Clamp01(fog * 1.5f));
        // neerslag
        float amount = Mathf.Max(Rain, Snow);
        if (amount < 0.03f) { if (dropsR != null) dropsR.enabled = false; return; }
        Vector3 up = cam.transform.position.normalized; Vector3 right = Vector3.Cross(up, cam.transform.forward).normalized; Vector3 fwd = Vector3.Cross(right, up);
        bool snow = Snow > Rain; float fall = snow ? 1.6f : 11f; int n = Mathf.RoundToInt(N * Mathf.Clamp01(amount));
        var v = new Vector3[n * 4]; var idx = new int[n * 6];
        for (int i = 0; i < n; i++)
        {
            pos[i].y -= fall * spd[i] * dt; if (snow) pos[i].x += Mathf.Sin(Time.time * 1.3f + i) * dt * 0.6f;
            if (pos[i].y < -Box) pos[i].y += 2f * Box;
            Vector3 p = cam.transform.position + right * pos[i].x + up * pos[i].y + fwd * pos[i].z;
            float w = snow ? 0.07f : 0.012f, h = snow ? 0.07f : 0.35f * spd[i];
            v[i * 4] = p - right * w; v[i * 4 + 1] = p + right * w; v[i * 4 + 2] = p + right * w + up * h; v[i * 4 + 3] = p - right * w + up * h;
            idx[i * 6] = i * 4; idx[i * 6 + 1] = i * 4 + 2; idx[i * 6 + 2] = i * 4 + 1; idx[i * 6 + 3] = i * 4; idx[i * 6 + 4] = i * 4 + 3; idx[i * 6 + 5] = i * 4 + 2;
        }
        drops.Clear(); drops.vertices = v; drops.triangles = idx; drops.RecalculateBounds();
        dropsR.enabled = true; dropsR.sharedMaterial.color = snow ? new Color(1f, 1f, 1f, 0.9f) : new Color(0.8f, 0.86f, 1f, 0.5f);
    }

    void OnGUI()
    {
        var st = new GUIStyle(GUI.skin.label) { fontSize = 13, alignment = TextAnchor.UpperRight }; st.normal.textColor = DayNight.Night > 0.6f ? Color.white : Color.black;
        GUI.Label(new Rect(Screen.width - 190, 30, 180, 22), Names[(int)Current] + (Wissel ? " (wisselend)" : " (vast, R)"), st);
        if (Flash > 0.01f) { var old = GUI.color; GUI.color = new Color(1f, 1f, 1f, Flash * 0.6f); GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height), Texture2D.whiteTexture); GUI.color = old; }
    }
}
