using UnityEngine;

// Eerste persoon op ware grootte: ooghoogte 1,65 m, lopen 1,6 m/s (ruim wandeltempo), rennen 5,5 m/s, bukken.
// Soepel optrekken en afremmen, springen met een kleine marge (coyote time en buffer), traptreden en hellingen,
// en de camera volgt een opstapje vloeiend in plaats van te schokken.
public class Walker : MonoBehaviour
{
    public Camera Cam;
    public float Sensitivity = 0.12f;           // graden per pixel muisbeweging
    const float Walk = 1.6f, Run = 5.5f, Crouch = 1.0f, Accel = 10f, AirAccel = 2.5f, Gravity = 18f, JumpHeight = 1.0f;
    const float Height = 1.8f, CrouchHeight = 1.15f, Eye = 1.65f, CrouchEye = 1.0f, Fov = 72f;

    CharacterController cc;
    float yaw, pitch, vy, lastGrounded = -1f, jumpPressed = -1f, eyeY, bob, fov;
    Vector3 vel;
    bool crouched;

    void Awake()
    {
        cc = gameObject.AddComponent<CharacterController>();
        cc.height = Height; cc.radius = 0.3f; cc.center = new Vector3(0, Height / 2f, 0);
        cc.stepOffset = 0.4f; cc.slopeLimit = 46f; cc.skinWidth = 0.03f; cc.minMoveDistance = 0f;
    }

    public void Enter(Vector3 pos, float startYaw)
    {
        gameObject.SetActive(true); cc.enabled = false; transform.position = pos; cc.enabled = true;
        yaw = startYaw; pitch = 5f; vy = 0f; vel = Vector3.zero; crouched = false; eyeY = Eye; fov = Fov;
        Cam.transform.SetParent(transform, false); Cam.transform.localPosition = new Vector3(0, Eye, 0); Cam.nearClipPlane = 0.05f; Cam.fieldOfView = Fov;
        Lock(true);
    }

    public void Exit()
    {
        Cam.transform.SetParent(null); Cam.nearClipPlane = 0.3f; Cam.fieldOfView = 60f; gameObject.SetActive(false); Lock(false);
    }

    static void Lock(bool on) { Cursor.lockState = on ? CursorLockMode.Locked : CursorLockMode.None; Cursor.visible = !on; }

    void Update()
    {
        float dt = Mathf.Min(Time.deltaTime, 0.05f);
        if (Inp.Down(K.Esc)) Lock(false);
        if (Inp.LeftDown && Cursor.lockState != CursorLockMode.Locked) Lock(true);
        bool locked = Cursor.lockState == CursorLockMode.Locked;

        // kijken
        if (locked) { Vector2 d = Inp.Delta; yaw += d.x * Sensitivity; pitch = Mathf.Clamp(pitch - d.y * Sensitivity, -88f, 88f); }
        transform.rotation = Quaternion.Euler(0, yaw, 0);

        // bukken (C ingedrukt houden); alleen weer rechtop als er ruimte boven het hoofd is
        bool wantCrouch = Inp.Held(K.C);
        if (!wantCrouch && crouched && Physics.SphereCast(transform.position + Vector3.up * (CrouchHeight - 0.3f), 0.28f, Vector3.up, out _, Height - CrouchHeight + 0.05f, ~0, QueryTriggerInteraction.Ignore)) wantCrouch = true;
        if (wantCrouch != crouched) { crouched = wantCrouch; float h = crouched ? CrouchHeight : Height; cc.height = h; cc.center = new Vector3(0, h / 2f, 0); }

        // richting
        Vector3 input = Vector3.zero;
        if (Inp.Held(K.W)) input += Vector3.forward; if (Inp.Held(K.S)) input += Vector3.back;
        if (Inp.Held(K.D)) input += Vector3.right; if (Inp.Held(K.A)) input += Vector3.left;
        input = Vector3.ClampMagnitude(input, 1f);
        bool running = Inp.Held(K.Shift) && !crouched && input.z > 0.1f;
        float speed = crouched ? Crouch : running ? Run : Walk;
        Vector3 target = transform.TransformDirection(input) * speed;

        bool grounded = cc.isGrounded;
        if (grounded) lastGrounded = Time.time;
        float a = grounded ? Accel : AirAccel;
        Vector3 flat = new Vector3(vel.x, 0, vel.z);
        flat = Vector3.MoveTowards(flat, target, a * speed * dt + (grounded && input == Vector3.zero ? 8f * dt : 0f));

        // springen: ook net na het verlaten van een rand (0,12 s) en als je net te vroeg drukt (0,12 s)
        if (Inp.Down(K.Space)) jumpPressed = Time.time;
        if (Time.time - jumpPressed < 0.12f && Time.time - lastGrounded < 0.12f && !crouched)
        {
            vy = Mathf.Sqrt(2f * Gravity * JumpHeight); jumpPressed = -1f; lastGrounded = -1f;
        }
        else if (grounded && vy < 0f) vy = -2f;      // tegen de grond aan houden (hellingen af, traptreden af)
        else vy -= Gravity * dt;

        vel = new Vector3(flat.x, vy, flat.z);
        CollisionFlags hit = cc.Move(vel * dt);
        if ((hit & CollisionFlags.Above) != 0 && vy > 0) vy = 0;

        // val je uit de wereld, dan terug naar het begin
        if (transform.position.y < -60f) { cc.enabled = false; transform.position = new Vector3(transform.position.x, 2f, transform.position.z); cc.enabled = true; vy = 0; }

        // camera: ooghoogte vloeiend (bukken en traptreden), licht deinen bij lopen, iets breder beeld bij rennen
        float h2 = new Vector2(vel.x, vel.z).magnitude;
        if (grounded && h2 > 0.2f) bob += dt * (running ? 11f : 7.5f); else bob = Mathf.Lerp(bob, Mathf.Round(bob / Mathf.PI) * Mathf.PI, dt * 6f);
        float targetEye = crouched ? CrouchEye : Eye;
        eyeY = Mathf.Lerp(eyeY, targetEye, dt * 12f);
        float bobY = Mathf.Sin(bob * 2f) * (running ? 0.045f : 0.025f), bobX = Mathf.Cos(bob) * (running ? 0.03f : 0.015f);
        Cam.transform.localPosition = new Vector3(bobX, eyeY + bobY, 0);
        Cam.transform.localRotation = Quaternion.Euler(pitch, 0, 0);
        fov = Mathf.Lerp(fov, running && h2 > 3f ? Fov + 7f : Fov, dt * 6f); Cam.fieldOfView = fov;
    }

    // vloeiend omhoog na een traptrede: de body springt (stepOffset), de camera loopt even achter
    void LateUpdate()
    {
        if (!cc.enabled) return;
        float dy = transform.position.y - lastY; lastY = transform.position.y;
        if (dy > 0.05f && dy < 0.45f && cc.isGrounded) eyeY -= dy;
    }
    float lastY;
}
