using UnityEngine;

// Hexagonraster zoals in Raatstad: vlakken met "pointy top", R = 9 m (hoekpunt), afstand middelpunt-middelpunt = R * wortel 3.
public static class Hex
{
    public const float R = 9f;
    public static readonly float S3 = Mathf.Sqrt(3f);
    public static readonly float Pitch = R * S3;   // 15,59 m

    public static Vector2 Center(int q, int r) => new Vector2(Pitch * (q + r * 0.5f), 1.5f * R * r);
    public static Vector2 Center(Vector2Int c) => Center(c.x, c.y);

    public static Vector2Int FromWorld(float x, float z)
    {
        float fq = (S3 / 3f * x - z / 3f) / R, fr = (2f / 3f * z) / R;
        float fx = fq, fz = fr, fy = -fx - fz;
        int rx = Mathf.RoundToInt(fx), ry = Mathf.RoundToInt(fy), rz = Mathf.RoundToInt(fz);
        float dx = Mathf.Abs(rx - fx), dy = Mathf.Abs(ry - fy), dz = Mathf.Abs(rz - fz);
        if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
        return new Vector2Int(rx, rz);
    }

    // hoekpunt i (0-5) van het vak met middelpunt c
    public static Vector2 Corner(Vector2 c, int i)
    {
        float a = (30f + 60f * i) * Mathf.Deg2Rad;
        return c + new Vector2(Mathf.Cos(a), Mathf.Sin(a)) * R;
    }
}
