using System.Collections.Generic;
using UnityEngine;

// Auto's rijden over de wegen (rechts houden), draaien aan het eind om of nemen een aansluitende weg
public class Cars : MonoBehaviour
{
    class Car { public Transform root; public RoadPath path; public float s, speed; public int dir = 1; public float yaw; }
    readonly List<Car> list = new List<Car>();
    public int Count => list.Count;
    float spawnT;
    static readonly Color[] Paint = { new Color(0.8f, 0.2f, 0.2f), new Color(0.2f, 0.4f, 0.75f), new Color(0.9f, 0.85f, 0.3f), new Color(0.9f, 0.9f, 0.92f), new Color(0.2f, 0.2f, 0.22f), new Color(0.25f, 0.6f, 0.4f) };

    Car Spawn(RoadPath p)
    {
        var c = new Car { path = p, s = Random.value * Nav.Length(p), dir = Random.value < 0.5f ? 1 : -1, speed = 6f + Random.value * 4f };
        var root = new GameObject("Auto").transform; root.SetParent(transform, false); c.root = root;
        int k = Random.Range(0, Paint.Length);
        Box(root, new Vector3(0, 0.55f, 0), new Vector3(1.8f, 0.6f, 4.2f), Mats.Get("auto" + k, Paint[k]));
        Box(root, new Vector3(0, 1.1f, -0.2f), new Vector3(1.5f, 0.5f, 2.2f), Mats.Get("autoglas", new Color(0.18f, 0.25f, 0.32f)));
        Box(root, new Vector3(0, 0.25f, 1.3f), new Vector3(1.9f, 0.3f, 0.5f), Mats.Get("autowiel", new Color(0.1f, 0.1f, 0.1f)));
        Box(root, new Vector3(0, 0.25f, -1.3f), new Vector3(1.9f, 0.3f, 0.5f), Mats.Get("autowiel", new Color(0.1f, 0.1f, 0.1f)));
        Place(c, 0f); return c;
    }

    static void Box(Transform parent, Vector3 pos, Vector3 size, Material m)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube); Object.Destroy(go.GetComponent<Collider>());
        go.transform.SetParent(parent, false); go.transform.localPosition = pos; go.transform.localScale = size; go.GetComponent<MeshRenderer>().sharedMaterial = m;
    }

    void Place(Car c, float dt)
    {
        Vector2 d; Vector2 p = Nav.At(c.path, c.s, out d); Vector2 fwd = d * c.dir, right = new Vector2(fwd.y, -fwd.x);
        Vector2 q = p + right * 1.25f; c.root.position = new Vector3(q.x, c.path.Level * RoadRules.LAYER_H + 0.15f, q.y);
        float target = Mathf.Atan2(fwd.x, fwd.y) * Mathf.Rad2Deg; c.yaw = dt <= 0f ? target : Mathf.LerpAngle(c.yaw, target, Mathf.Min(1f, dt * 8f));
        c.root.rotation = Quaternion.Euler(0, c.yaw, 0);
    }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        var valid = new List<RoadPath>(); foreach (var p in City.Paths) if (p.P.Count >= 2) valid.Add(p);
        int target = Mathf.Clamp(Mathf.RoundToInt(City.RoadLength() / 90f), 0, 14); spawnT -= dt;
        if (valid.Count > 0 && list.Count < target && spawnT <= 0f) { list.Add(Spawn(valid[Random.Range(0, valid.Count)])); spawnT = 0.7f; }
        while (list.Count > target || (valid.Count == 0 && list.Count > 0)) { Destroy(list[list.Count - 1].root.gameObject); list.RemoveAt(list.Count - 1); }
        foreach (var c in list)
        {
            if (!City.Paths.Contains(c.path)) { Vector2 at = new Vector2(c.root.position.x, c.root.position.z); if (!Nav.Rehome(ref c.path, ref c.s, at)) { c.path = valid[Random.Range(0, valid.Count)]; c.s = 0f; } }
            float len = Nav.Length(c.path); c.s += c.dir * c.speed * dt;
            if (c.s < 0f || c.s > len)
            {
                Vector2 at = Nav.At(c.path, Mathf.Clamp(c.s, 0f, len), out _);
                if (!Nav.Hop(ref c.path, ref c.s, ref c.dir, at, false)) { c.dir = -c.dir; c.s = Mathf.Clamp(c.s, 0f, len); }
            }
            Place(c, dt);
        }
    }
}
