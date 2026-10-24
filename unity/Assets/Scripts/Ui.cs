using UnityEngine;

// De interface, in de stijl van de browserversie: donkere afgeronde kaarten, ambergele accenten, witte tekst.
// Alles met IMGUI (OnGUI), met zelfgemaakte achtergrondjes (afgeronde hoeken via een 9-slice textuur).
public static class Ui
{
    public static readonly Color Amber = new Color(0.95f, 0.70f, 0.23f), Dark = new Color(0.11f, 0.16f, 0.2f, 0.9f), Ink = new Color(0.11f, 0.16f, 0.2f);
    static Texture2D round, white; static GUIStyle card, cardLight, title, label, labelDim, button, buttonOn, toast, big, swatch, help;
    public static bool Ready => card != null;

    static Texture2D Rounded(int size, int radius, Color inside)
    {
        var t = new Texture2D(size, size); var px = new Color[size * size];
        for (int y = 0; y < size; y++) for (int x = 0; x < size; x++)
        {
            float dx = Mathf.Max(0, Mathf.Max(radius - x, x - (size - 1 - radius))), dy = Mathf.Max(0, Mathf.Max(radius - y, y - (size - 1 - radius)));
            float d = Mathf.Sqrt(dx * dx + dy * dy); float a = Mathf.Clamp01(radius - d + 0.5f);
            px[y * size + x] = new Color(inside.r, inside.g, inside.b, inside.a * a);
        }
        t.SetPixels(px); t.filterMode = FilterMode.Bilinear; t.Apply(); return t;
    }

    public static void Init()
    {
        if (card != null) return;
        round = Rounded(40, 14, Color.white); white = Texture2D.whiteTexture;
        var ro = new RectOffset { left = 16, right = 16, top = 16, bottom = 16 };
        card = new GUIStyle { border = ro, padding = new RectOffset { left = 14, right = 14, top = 10, bottom = 10 } }; card.normal.background = round;
        title = new GUIStyle { fontSize = 20, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleLeft }; title.normal.textColor = Color.white;
        label = new GUIStyle { fontSize = 13, alignment = TextAnchor.MiddleLeft, wordWrap = true, richText = true }; label.normal.textColor = Color.white;
        labelDim = new GUIStyle(label); labelDim.normal.textColor = new Color(0.78f, 0.82f, 0.86f); labelDim.fontSize = 12;
        big = new GUIStyle { fontSize = 26, fontStyle = FontStyle.Bold, alignment = TextAnchor.MiddleCenter }; big.normal.textColor = Amber;
        button = new GUIStyle { border = ro, fontSize = 13, alignment = TextAnchor.MiddleCenter, fontStyle = FontStyle.Bold, richText = true, padding = new RectOffset { left = 8, right = 8, top = 4, bottom = 4 } };
        button.normal.background = round; button.normal.textColor = Color.white; button.hover.background = round; button.hover.textColor = Color.white; button.active.background = round; button.active.textColor = Color.white;
        buttonOn = new GUIStyle(button); buttonOn.normal.textColor = Ink; buttonOn.hover.textColor = Ink; buttonOn.active.textColor = Ink;
        toast = new GUIStyle(label) { alignment = TextAnchor.MiddleCenter, fontSize = 14 };
        swatch = new GUIStyle { border = new RectOffset { left = 8, right = 8, top = 8, bottom = 8 } }; swatch.normal.background = round;
        help = new GUIStyle(label) { fontSize = 13 };
    }

    // Een kaart (donker, afgerond). Geeft de binnenrechthoek terug.
    public static Rect Card(Rect r, float alpha = 0.9f)
    {
        Init(); var old = GUI.color; GUI.color = new Color(Dark.r, Dark.g, Dark.b, alpha); GUI.Box(r, "", card); GUI.color = old;
        return new Rect(r.x + 12, r.y + 8, r.width - 24, r.height - 16);
    }
    public static void Text(Rect r, string s) { Init(); GUI.Label(r, s, label); }
    public static void Dim(Rect r, string s) { Init(); GUI.Label(r, s, labelDim); }
    public static void Title(Rect r, string s) { Init(); GUI.Label(r, s, title); }
    public static void Big(Rect r, string s) { Init(); GUI.Label(r, s, big); }
    public static bool Button(Rect r, string s, bool on = false, Color? tint = null)
    {
        Init(); var old = GUI.color; GUI.color = on ? Amber : (tint ?? new Color(0.2f, 0.26f, 0.31f, 0.95f));
        bool hit = GUI.Button(r, s, on ? buttonOn : button); GUI.color = old; return hit;
    }
    // Gereedschapsknop: gekleurd vlakje met naam en toets
    public static bool Tool(Rect r, string name, string key, Color color, bool on)
    {
        Init(); var old = GUI.color;
        GUI.color = on ? Amber : new Color(0.14f, 0.19f, 0.23f, 0.95f); GUI.Box(r, "", card);
        GUI.color = color; GUI.Box(new Rect(r.x + 8, r.y + 7, r.width - 16, r.height - 30), "", swatch);
        GUI.color = Color.white; var st = new GUIStyle(label) { alignment = TextAnchor.MiddleCenter, fontSize = 12, fontStyle = FontStyle.Bold }; st.normal.textColor = on ? Ink : Color.white;
        GUI.Label(new Rect(r.x, r.y + r.height - 24, r.width, 20), name, st);
        if (key != null) { var ks = new GUIStyle(st) { fontSize = 10, alignment = TextAnchor.UpperLeft }; ks.normal.textColor = on ? Ink : new Color(0.85f, 0.88f, 0.9f); GUI.Label(new Rect(r.x + 12, r.y + 9, 20, 14), key, ks); }
        GUI.color = old;
        return GUI.Button(r, "", GUIStyle.none);
    }
    public static void Toast(string s, float alpha)
    {
        Init(); float w = Mathf.Min(Screen.width - 40, 560f); var r = new Rect((Screen.width - w) / 2f, Screen.height - 150, w, 40);
        var old = GUI.color; GUI.color = new Color(Dark.r, Dark.g, Dark.b, 0.92f * alpha); GUI.Box(r, "", card); GUI.color = new Color(1, 1, 1, alpha); GUI.Label(r, s, toast); GUI.color = old;
    }
    public static void Help(Rect r, string s) { Init(); GUI.Label(r, s, help); }

    public static Color ToolColor(string t)
    {
        switch (t)
        {
            case "weg": return new Color(0.3f, 0.32f, 0.35f); case "woning": return new Color(0.75f, 0.35f, 0.25f); case "kantoor": return new Color(0.55f, 0.65f, 0.78f);
            case "park": return new Color(0.4f, 0.68f, 0.3f); case "water": return new Color(0.22f, 0.5f, 0.78f); case "meer": return new Color(0.3f, 0.62f, 0.8f);
            case "pad": return new Color(0.82f, 0.76f, 0.63f); case "dak": return new Color(0.6f, 0.3f, 0.22f); case "heuvel": return new Color(0.5f, 0.7f, 0.35f);
            case "kuil": return new Color(0.35f, 0.5f, 0.28f); case "blok": return new Color(0.6f, 0.58f, 0.56f); case "gum": return new Color(0.9f, 0.5f, 0.6f);
            default: return Color.gray;
        }
    }
}
