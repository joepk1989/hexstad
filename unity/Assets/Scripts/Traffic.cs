using System.Collections.Generic;
using UnityEngine;

// Verkeerslichten op kruisingen (een wegvak met 3 of meer wegen). De wegen vallen in twee groepen die om beurten groen
// krijgen, met een seconde alles-rood ertussen. De lampjes zijn gekleurde blokjes op de palen (gepoold, alleen bij de
// camera); de auto's remmen voor rood en geel (PlanetLife.DriveCar).
public class Traffic : MonoBehaviour
{
    public enum S { Groen, Geel, Rood }
    const float Cycle = 19f;

    public static bool IsJunction(int j)
    {
        if (!PlanetCity.Lights || !PlanetCity.IsRoad(j)) return false;
        int n = 0; foreach (int p in PlanetCity.Partners(j)) if (PlanetCity.IsRoad(p)) n++;
        return n >= 3;
    }

    // groep 0 = de wegen in de lijn van de eerste weg, groep 1 = de rest
    static int Group(int j, int p)
    {
        Vector3 cj = Planet.Cells[j].dir, first = Vector3.zero; bool got = false;
        foreach (int q in PlanetCity.Partners(j))
        {
            if (!PlanetCity.IsRoad(q)) continue;
            Vector3 v = (Planet.Cells[q].dir - cj).normalized; if (!got) { first = v; got = true; }
            if (q == p) return Mathf.Abs(Vector3.Dot(v, first)) > 0.6f ? 0 : 1;
        }
        return 0;
    }

    // licht voor verkeer dat vanuit buur p het kruisingsvak j in wil
    public static S State(int j, int p)
    {
        float t = (Time.time + (j * 37 % 17)) % Cycle, tg = Group(j, p) == 0 ? t : (t + 9.5f) % Cycle;   // groen 7 s, geel 1,5 s, dan rood
        return tg < 7f ? S.Groen : tg < 8.5f ? S.Geel : S.Rood;
    }

    readonly List<Transform> pool = new List<Transform>(); readonly List<MeshRenderer> poolR = new List<MeshRenderer>();
    Material[] mats; float t;

    void Update()
    {
        t -= Time.deltaTime; if (t > 0f) return; t = 0.2f;
        var cam = Camera.main; int used = 0;
        if (cam != null && Planet.Ready && PlanetCity.Lights)
        {
            if (mats == null) mats = new[] { Mats.GetUnlit("p_lgroen", new Color(0.2f, 1f, 0.35f)), Mats.GetUnlit("p_lgeel", new Color(1f, 0.8f, 0.1f)), Mats.GetUnlit("p_lrood", new Color(1f, 0.15f, 0.1f)) };
            Vector3 cp = cam.transform.position; float lim = 150f * 150f;
            foreach (var kv in PlanetCity.Cells)
            {
                int j = kv.Key; if (kv.Value.Count == 0 || kv.Value[0] != "weg") continue;
                if ((Planet.Cells[j].dir * Planet.R - cp).sqrMagnitude > lim || !IsJunction(j)) continue;
                foreach (int p in PlanetCity.Partners(j))
                {
                    if (!PlanetCity.IsRoad(p) || !PlanetCity.CanDrive(p, j) || !PlanetCity.PolePos(j, p, out Vector3 pos)) continue;
                    if (used >= 160) break;
                    if (used >= pool.Count)
                    {
                        var go = GameObject.CreatePrimitive(PrimitiveType.Cube); Destroy(go.GetComponent<Collider>()); go.name = "Verkeerslicht"; go.transform.SetParent(transform, false); go.transform.localScale = new Vector3(0.3f, 0.3f, 0.3f);
                        var mr = go.GetComponent<MeshRenderer>(); mr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off; pool.Add(go.transform); poolR.Add(mr);
                    }
                    pool[used].gameObject.SetActive(true); pool[used].position = pos; pool[used].rotation = Geo.Look(Planet.Cells[j].north, pos.normalized); poolR[used].sharedMaterial = mats[(int)State(j, p)]; used++;
                }
            }
        }
        for (int k = used; k < pool.Count; k++) pool[k].gameObject.SetActive(false);
    }
}
