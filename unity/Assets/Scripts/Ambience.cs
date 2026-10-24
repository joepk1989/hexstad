using UnityEngine;

// Sfeergeluid, naar de browserversie: vogels (opname, luider bij groen, stil 's nachts), wind (ruis door een filter,
// sterker als je hoog kijkt), en zachte stadsruis bij wegen. Voetstappen zitten in de wandelaar (Footsteps).
// De vogelopname staat in Assets/Resources/vogels.mp3; ontbreekt die, dan zijn er alleen de berekende geluiden.
public class Ambience : MonoBehaviour
{
    public static bool Muted;
    AudioSource birds, wind, city;
    float mixT;

    static AudioClip Noise(int seconds, float lowpass)
    {
        // bruine ruis (laag, zacht) met een eenvoudig eenpolig filter
        int sr = 22050, n = sr * seconds; var d = new float[n]; float last = 0f; var rnd = new System.Random(7);
        for (int i = 0; i < n; i++) { float w = (float)rnd.NextDouble() * 2f - 1f; last += lowpass * (w - last); d[i] = last; }
        float mx = 0.001f; for (int i = 0; i < n; i++) mx = Mathf.Max(mx, Mathf.Abs(d[i])); for (int i = 0; i < n; i++) d[i] = d[i] / mx * 0.8f;
        var clip = AudioClip.Create("ruis", n, 1, sr, false); clip.SetData(d, 0); return clip;
    }

    static AudioSource Loop(GameObject go, AudioClip clip, float vol)
    {
        var a = go.AddComponent<AudioSource>(); a.clip = clip; a.loop = true; a.volume = vol; a.spatialBlend = 0f; a.playOnAwake = false; if (clip != null) a.Play(); return a;
    }

    void Start()
    {
        var vogels = Resources.Load<AudioClip>("vogels");
        birds = Loop(gameObject, vogels, 0f);
        wind = Loop(gameObject, Noise(4, 0.02f), 0f);
        city = Loop(gameObject, Noise(4, 0.08f), 0f);
    }

    void Update()
    {
        mixT -= Time.deltaTime; if (mixT > 0f) return; mixT = 0.5f;
        var cam = Camera.main; if (cam == null || !Planet.Ready) return;
        float night = DayNight.Night;
        // wat staat er in de buurt van de camera? (vakken binnen ~80 m)
        int c0 = Planet.Nearest(cam.transform.position); int green = 0, roads = 0;
        foreach (int j in Planet.Cells[c0].nb)
        {
            Count(j, ref green, ref roads);
            foreach (int k in Planet.Cells[j].nb) Count(k, ref green, ref roads);
        }
        Count(c0, ref green, ref roads);
        float height = cam.transform.position.magnitude - Planet.R;
        float far = Mathf.Clamp01(1f - (height - 40f) / 200f);   // hoog boven de stad hoor je weinig
        float up = Mathf.Clamp01(Vector3.Dot(cam.transform.forward, cam.transform.position.normalized));   // omhoog kijken = wind
        float vol = Muted ? 0f : 1f;
        if (birds != null) birds.volume = vol * (0.15f + Mathf.Min(1f, green / 6f) * 0.5f) * far * (1f - 0.92f * night);
        if (wind != null) wind.volume = vol * (0.08f + 0.25f * up + 0.3f * Mathf.Clamp01(height / 200f));
        if (city != null) city.volume = vol * Mathf.Min(1f, roads / 8f) * 0.18f * far;
    }

    static void Count(int i, ref int green, ref int roads)
    {
        if (!PlanetCity.Cells.TryGetValue(i, out var l) || l.Count == 0) return;
        if (l[0] == "weg") roads++; else if (l[0] == "park" || l[0] == "meer") green++;
    }
}

// Voetstappen: korte ruisjes, om de zoveel meter, harder bij rennen. Op asfalt klinkt het droger dan op gras.
public static class Footsteps
{
    static AudioClip[] clips; static float dist;
    static void Make()
    {
        clips = new AudioClip[4]; var rnd = new System.Random(3); int sr = 22050;
        for (int c = 0; c < 4; c++)
        {
            int n = (int)(sr * 0.09f); var d = new float[n]; float last = 0f, k = 0.15f + c * 0.08f;
            for (int i = 0; i < n; i++) { float w = (float)rnd.NextDouble() * 2f - 1f; last += k * (w - last); float env = Mathf.Min(1f, i / (sr * 0.004f)) * Mathf.Exp(-i / (sr * 0.03f)); d[i] = last * env * 2.5f; }
            clips[c] = AudioClip.Create("stap" + c, n, 1, sr, false); clips[c].SetData(d, 0);
        }
    }
    public static void Walked(AudioSource src, float metres, bool running, bool hard)
    {
        if (src == null || Ambience.Muted) return; if (clips == null) Make();
        dist += metres; float step = running ? 1.1f : 0.72f;
        if (dist < step) return; dist = 0f;
        src.pitch = (hard ? 1.15f : 0.85f) * (0.95f + Random.value * 0.1f);
        src.PlayOneShot(clips[Random.Range(0, hard ? 2 : 4)], running ? 0.5f : 0.3f);
    }
}
