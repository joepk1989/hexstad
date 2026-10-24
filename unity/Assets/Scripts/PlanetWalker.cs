using UnityEngine;

// Eerste persoon op de planeet: de zwaartekracht wijst naar het middelpunt, dus "omlaag" draait mee terwijl je loopt.
// Geen CharacterController (die kent alleen de Y-as als boven), maar een eigen loper: grond zoeken met een straal
// naar het middelpunt, muren met een straal vooruit, opstapjes tot een halve meter, springen, rennen.
public class PlanetWalker : MonoBehaviour
{
    public Camera Cam;
    public float Sensitivity = 0.12f;
    const float Walk = 1.6f, Run = 5.5f, Accel = 10f, AirAccel = 2.5f, Gravity = 18f, JumpHeight = 1.0f, Eye = 1.65f, Fov = 72f, Step = 0.5f;
    Vector3 fwd = Vector3.forward, vel; float pitch, vy, lastGrounded = -1f, jumpPressed = -1f, bob; bool grounded;
    public Vector3 Forward => fwd;

    public void Enter(Vector3 pos, Vector3 forward)
    {
        gameObject.SetActive(true); transform.position = pos; fwd = forward; pitch = 5f; vy = 0f; vel = Vector3.zero;
        Cam.transform.SetParent(transform, false); Cam.transform.localPosition = new Vector3(0, Eye, 0); Cam.transform.localRotation = Quaternion.identity; Cam.nearClipPlane = 0.05f; Cam.fieldOfView = Fov;
        Lock(true);
    }
    public void Exit() { Cam.transform.SetParent(null); Cam.nearClipPlane = 0.3f; Cam.fieldOfView = 60f; gameObject.SetActive(false); Lock(false); }
    static void Lock(bool on) { Cursor.lockState = on ? CursorLockMode.Locked : CursorLockMode.None; Cursor.visible = !on; }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (Inp.Down(K.Esc)) Lock(false);
        if (Inp.LeftDown && Cursor.lockState != CursorLockMode.Locked) Lock(true);
        bool locked = Cursor.lockState == CursorLockMode.Locked;

        Vector3 pos = transform.position, up = pos.normalized;
        fwd = (fwd - up * Vector3.Dot(fwd, up)).normalized;
        if (locked) { Vector2 d = Inp.Delta; fwd = Quaternion.AngleAxis(d.x * Sensitivity, up) * fwd; pitch = Mathf.Clamp(pitch - d.y * Sensitivity, -88f, 88f); }
        Vector3 right = Vector3.Cross(up, fwd);

        // richting en snelheid
        Vector3 input = Vector3.zero;
        if (Inp.Held(K.W)) input += fwd; if (Inp.Held(K.S)) input -= fwd; if (Inp.Held(K.D)) input += right; if (Inp.Held(K.A)) input -= right;
        input = Vector3.ClampMagnitude(input, 1f);
        float speed = Inp.Held(K.Shift) ? Run : Walk;
        Vector3 want = input * speed;
        vel = Vector3.MoveTowards(vel, want, (grounded ? Accel : AirAccel) * dt * Mathf.Max(speed, 1f));
        vel -= up * Vector3.Dot(vel, up);

        // muren: een straal vooruit op knie- en borsthoogte; langs de muur glijden
        Vector3 move = vel * dt;
        if (move.sqrMagnitude > 1e-10f)
        {
            Vector3 dir = move.normalized; float len = move.magnitude + 0.35f;
            foreach (float hgt in new[] { 0.6f, 1.4f })
            {
                if (Physics.Raycast(pos + up * hgt, dir, out RaycastHit w, len, ~0, QueryTriggerInteraction.Ignore))
                {
                    Vector3 n = w.normal; n -= up * Vector3.Dot(n, up); if (n.sqrMagnitude < 1e-6f) continue; n.Normalize();
                    float into = Vector3.Dot(move, n); if (into < 0f) move -= n * into;
                    into = Vector3.Dot(vel, n); if (into < 0f) vel -= n * into;
                }
            }
        }
        pos += move;

        // springen (met een kleine marge na het verlaten van de grond)
        if (Inp.Down(K.Space)) jumpPressed = Time.time;
        if (grounded) lastGrounded = Time.time;
        if (Time.time - jumpPressed < 0.12f && Time.time - lastGrounded < 0.12f) { vy = Mathf.Sqrt(2f * Gravity * JumpHeight); grounded = false; jumpPressed = -1f; lastGrounded = -1f; }

        // grond: straal vanaf heuphoogte naar het middelpunt
        vy -= Gravity * dt; pos += up * (vy * dt);
        float probe = 1.0f;
        if (Physics.Raycast(pos + up * probe, -up, out RaycastHit g, probe + 0.25f + Mathf.Max(0f, -vy * dt), ~0, QueryTriggerInteraction.Ignore))
        {
            float above = probe - g.distance;   // hoe ver de grond boven de voeten ligt (negatief: eronder)
            if (vy <= 0f && above >= -0.25f && above <= Step) { pos = g.point; vy = 0f; grounded = true; }
            else grounded = false;
        }
        else grounded = false;
        // nooit door de planeet heen
        float rad = pos.magnitude; if (rad < Planet.R - 0.5f) { pos = pos.normalized * Planet.R; vy = 0f; grounded = true; }

        transform.position = pos; up = pos.normalized; fwd = (fwd - up * Vector3.Dot(fwd, up)).normalized;
        transform.rotation = Quaternion.LookRotation(fwd, up);
        // hoofd: lichte deining bij het lopen
        float sp = vel.magnitude; bob = grounded && sp > 0.2f ? bob + dt * (sp > 3f ? 11f : 7.5f) : Mathf.Lerp(bob, Mathf.Round(bob / Mathf.PI) * Mathf.PI, dt * 8f);
        Cam.transform.localPosition = new Vector3(0, Eye + Mathf.Sin(bob) * (grounded ? 0.035f : 0f), 0);
        Cam.transform.localRotation = Quaternion.Euler(pitch, 0, 0);
    }
}
