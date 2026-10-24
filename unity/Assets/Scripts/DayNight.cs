using UnityEngine;

// Dag en nacht: de zon draait, de lucht en het licht kleuren mee. N = zon stilzetten of weer laten lopen. Een dag duurt 20 minuten.
public class DayNight : MonoBehaviour
{
    public static float Night;          // 0 = dag, 1 = nacht
    public static float Hour = 10f;
    Light sun; Camera cam; bool frozen;
    const float DayLen = 1200f;   // een dag duurt 20 minuten

    void Update()
    {
        if (sun == null) { foreach (var l in FindObjectsByType<Light>(FindObjectsSortMode.None)) if (l.type == LightType.Directional) { sun = l; break; } }
        if (cam == null) cam = Camera.main;
        if (Inp.Down(K.N)) frozen = !frozen;
        if (!frozen) Hour = (Hour + Time.deltaTime * 24f / DayLen) % 24f;
        float ang = (Hour - 6f) / 24f * 360f;                      // 6 uur: zon op de horizon, 12 uur: hoogste punt
        float elev = Mathf.Sin(ang * Mathf.Deg2Rad);               // -1..1
        Night = Mathf.Clamp01(0.5f - elev * 2.2f);
        if (sun != null)
        {
            sun.transform.rotation = Quaternion.Euler(Mathf.Clamp(ang, 5f, 175f), -30f, 0f);
            sun.intensity = Mathf.Lerp(1.15f, 0.05f, Night); sun.color = Color.Lerp(Color.Lerp(new Color(1f, 0.62f, 0.4f), new Color(1f, 0.96f, 0.9f), Mathf.Clamp01(elev * 3f)), new Color(0.3f, 0.35f, 0.6f), Night);
        }
        Color day = new Color(0.68f, 0.84f, 0.95f), dusk = new Color(0.95f, 0.6f, 0.4f), night = new Color(0.04f, 0.06f, 0.14f);
        Color sky = Color.Lerp(Color.Lerp(dusk, day, Mathf.Clamp01(elev * 3f)), night, Night);
        if (cam != null) cam.backgroundColor = sky;
        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat; RenderSettings.ambientLight = Color.Lerp(new Color(0.55f, 0.58f, 0.62f), new Color(0.08f, 0.1f, 0.18f), Night);
        RenderSettings.fog = false;
    }

    void OnGUI()
    {
        int h = Mathf.FloorToInt(Hour), m = Mathf.FloorToInt((Hour - h) * 60f);
        var st = new GUIStyle(GUI.skin.label) { fontSize = 16, alignment = TextAnchor.UpperRight, fontStyle = FontStyle.Bold }; st.normal.textColor = Night > 0.6f ? Color.white : Color.black;
        GUI.Label(new Rect(Screen.width - 190, 8, 180, 26), h.ToString("00") + ":" + m.ToString("00") + (frozen ? " (stil)" : ""), st);
    }
}
