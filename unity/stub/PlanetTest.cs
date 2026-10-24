using System;
using UnityEngine;
public static class PlanetTest {
  public static void Main() {
    var sw = System.Diagnostics.Stopwatch.StartNew();
    Planet.Build();
    Console.WriteLine("vakken " + Planet.Cells.Length + " (verwacht " + (10 * Planet.M * Planet.M + 2) + ") in " + sw.ElapsedMilliseconds + " ms");
    int pent = 0, hex = 0, bad = 0; double rsum = 0, rmin = 1e9, rmax = 0, dmin = 1e9, dmax = 0;
    foreach (var c in Planet.Cells) {
      if (c.nb.Length == 5) pent++; else if (c.nb.Length == 6) hex++; else bad++;
      if (c.corners.Length != c.nb.Length) bad++;
      rsum += c.radius; rmin = Math.Min(rmin, c.radius); rmax = Math.Max(rmax, c.radius);
      foreach (int j in c.nb) { double d = Vector3.Distance(c.dir, Planet.Cells[j].dir) * Planet.R; dmin = Math.Min(dmin, d); dmax = Math.Max(dmax, d); }
    }
    Console.WriteLine("vijfhoeken " + pent + " zeshoeken " + hex + " fout " + bad);
    Console.WriteLine("straal gem " + (rsum / Planet.Cells.Length).ToString("F2") + " min " + rmin.ToString("F2") + " max " + rmax.ToString("F2"));
    Console.WriteLine("hart-op-hart min " + dmin.ToString("F2") + " max " + dmax.ToString("F2"));
    // Nearest: willekeurige punten, vergelijk met brute force
    var rnd = new System.Random(1); int wrong = 0; sw.Restart();
    for (int k = 0; k < 2000; k++) {
      var p = new Vector3((float)rnd.NextDouble() * 2 - 1, (float)rnd.NextDouble() * 2 - 1, (float)rnd.NextDouble() * 2 - 1).normalized * Planet.R;
      int n = Planet.Nearest(p); int best = 0; float bd = -2;
      for (int i = 0; i < Planet.Cells.Length; i++) { float d = Vector3.Dot(Planet.Cells[i].dir, p.normalized); if (d > bd) { bd = d; best = i; } }
      if (n != best) wrong++;
    }
    Console.WriteLine("Nearest fout " + wrong + "/2000, " + sw.ElapsedMilliseconds + " ms incl. brute force");
    // hoekpunten op volgorde: opeenvolgende hoeken moeten dicht bij elkaar liggen
    int order = 0; foreach (var c in Planet.Cells) for (int k = 0; k < c.corners.Length; k++) { double d = Vector3.Distance(c.corners[k], c.corners[(k + 1) % c.corners.Length]) * Planet.R; if (d > 14) order++; }
    Console.WriteLine("hoekvolgorde-problemen " + order);
    // startplekken: afstand tot de dichtstbijzijnde vijfhoek
    foreach (int st in Planet.Starts) { float bd = -2; foreach (var c in Planet.Cells) if (c.nb.Length == 5) bd = Math.Max(bd, Vector3.Dot(c.dir, Planet.Cells[st].dir)); Console.Write(((float)Math.Acos(bd) * Planet.R).ToString("F0") + " "); }
    Console.WriteLine("m tot dichtstbijzijnde vijfhoek (per startplek); zeshoek? " + (Planet.Cells[Planet.Starts[0]].nb.Length == 6));
    // vlak-coördinaten: lokale hoekpunten rond nul
    var c0 = Planet.Cells[1234]; Console.Write("lokale hoeken vak 1234:"); foreach (var l in c0.local) Console.Write(" (" + l.x.ToString("F1") + "," + l.y.ToString("F1") + ")"); Console.WriteLine();
  }
}
