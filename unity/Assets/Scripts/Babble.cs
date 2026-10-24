using UnityEngine;

// Brabbeltaal: lettergrepen uit een zaagtand door twee klankfilters (klinkers) met een ruisje ervoor (medeklinker).
// Alles wordt live berekend, er zijn geen opnames. Elke persoon heeft een eigen toonhoogte.
public static class Babble
{
    public static bool Muted;
    const int SR = 22050;
    static readonly float[,] Vow = { { 800, 1200 }, { 500, 1800 }, { 300, 2300 }, { 500, 900 }, { 320, 800 } };   // a e i o oe

    // laat iemand praten; geeft de duur terug in seconden
    public static float Say(Person who, float dur, float pitch, bool hi)
    {
        if (who == null || who.audio == null) return 0f;
        AudioClip clip = Make(dur, pitch, hi, Random.Range(0, 100000));
        if (!Muted) who.audio.PlayOneShot(clip);
        Object.Destroy(clip, clip.length + 2f);
        return clip.length;
    }

    public static AudioClip Make(float dur, float pitch, bool hi, int seed)
    {
        var rnd = new System.Random(seed);
        float total = hi ? 0.38f : Mathf.Clamp(dur, 0.4f, 5f);
        int n = (int)(total * SR) + SR / 10; var data = new float[n]; int pos = 0;
        float base0 = 125f * pitch; int wordSyl = 0;
        while (pos < (int)(total * SR) - SR / 20)
        {
            float syl = (hi ? 0.15f : 0.1f + (float)rnd.NextDouble() * 0.09f);
            int vi = rnd.Next(0, 5); bool cons = rnd.NextDouble() < 0.6;
            float f0 = base0 * (1f + ((float)rnd.NextDouble() - 0.5f) * 0.35f) * (hi ? 1.0f + (pos / (float)SR) * 1.2f : 1f);
            int start = pos; if (cons) { int cn = (int)(0.025f * SR); for (int i = 0; i < cn && start + i < n; i++) data[start + i] += ((float)rnd.NextDouble() * 2f - 1f) * 0.25f * (1f - i / (float)cn); start += cn; }
            Syllable(data, start, (int)(syl * SR), f0, Vow[vi, 0] * (0.9f + (float)rnd.NextDouble() * 0.2f), Vow[vi, 1] * (0.9f + (float)rnd.NextDouble() * 0.2f), rnd);
            pos = start + (int)(syl * SR); wordSyl++;
            if (wordSyl >= 2 + rnd.Next(0, 4)) { pos += (int)((0.09f + (float)rnd.NextDouble() * 0.12f) * SR); wordSyl = 0; } else pos += (int)(0.012f * SR);
        }
        float mx = 0.001f; for (int i = 0; i < n; i++) mx = Mathf.Max(mx, Mathf.Abs(data[i])); for (int i = 0; i < n; i++) data[i] = data[i] / mx * 0.7f;
        var clip = AudioClip.Create("brabbel", n, 1, SR, false); clip.SetData(data, 0); return clip;
    }

    static void Syllable(float[] d, int start, int len, float f0, float f1, float f2, System.Random rnd)
    {
        // twee resonatoren (tweepolig) op de klinkerfrequenties
        float r1 = Mathf.Exp(-Mathf.PI * 90f / SR), r2 = Mathf.Exp(-Mathf.PI * 140f / SR);
        float c1 = 2f * r1 * Mathf.Cos(2f * Mathf.PI * f1 / SR), c2 = 2f * r2 * Mathf.Cos(2f * Mathf.PI * f2 / SR);
        float y1a = 0, y1b = 0, y2a = 0, y2b = 0, ph = 0f;
        for (int i = 0; i < len && start + i < d.Length; i++)
        {
            float t = i / (float)len, env = Mathf.Min(1f, t / 0.12f) * Mathf.Min(1f, (1f - t) / 0.35f);
            float f = f0 * (1f + 0.06f * Mathf.Sin(t * 9f)) * (1f - 0.1f * t); ph += f / SR; if (ph > 1f) ph -= 1f;
            float x = (ph * 2f - 1f) * 0.5f;
            float y1 = x * (1f - r1) + c1 * y1a - r1 * r1 * y1b; y1b = y1a; y1a = y1;
            float y2 = x * (1f - r2) + c2 * y2a - r2 * r2 * y2b; y2b = y2a; y2a = y2;
            d[start + i] += (y1 * 3.5f + y2 * 2.2f) * env;
        }
    }
}
