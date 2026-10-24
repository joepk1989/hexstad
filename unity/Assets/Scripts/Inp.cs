using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

// Invoer die zowel met het nieuwe Input System als met de oude Input Manager werkt.
public enum K { W, A, S, D, Q, E, X, Z, Tab, Shift, Ctrl, Space, Esc }

public static class Inp
{
#if ENABLE_INPUT_SYSTEM
    static Key Map(K k)
    {
        switch (k)
        {
            case K.W: return Key.W; case K.A: return Key.A; case K.S: return Key.S; case K.D: return Key.D;
            case K.Q: return Key.Q; case K.E: return Key.E; case K.X: return Key.X; case K.Z: return Key.Z;
            case K.Tab: return Key.Tab; case K.Shift: return Key.LeftShift; case K.Ctrl: return Key.LeftCtrl;
            case K.Space: return Key.Space; default: return Key.Escape;
        }
    }
    public static bool Held(K k) => Keyboard.current != null && Keyboard.current[Map(k)].isPressed;
    public static bool Down(K k) => Keyboard.current != null && Keyboard.current[Map(k)].wasPressedThisFrame;
    public static Vector2 Pos => Mouse_() != null ? Mouse_().position.ReadValue() : Vector2.zero;
    static UnityEngine.InputSystem.Mouse Mouse_() => UnityEngine.InputSystem.Mouse.current;
    public static bool LeftDown => Mouse_() != null && Mouse_().leftButton.wasPressedThisFrame;
    public static bool LeftHeld => Mouse_() != null && Mouse_().leftButton.isPressed;
    public static bool LeftUp => Mouse_() != null && Mouse_().leftButton.wasReleasedThisFrame;
    public static bool RightHeld => Mouse_() != null && Mouse_().rightButton.isPressed;
    public static Vector2 Delta => Mouse_() != null ? Mouse_().delta.ReadValue() : Vector2.zero;
    public static float Scroll { get { if (Mouse_() == null) return 0f; float y = Mouse_().scroll.ReadValue().y; return Mathf.Abs(y) > 10f ? y / 120f : y; } }   // per klikje ±1 (oude Input System-versies geven ±120)
#else
    static KeyCode Map(K k)
    {
        switch (k)
        {
            case K.W: return KeyCode.W; case K.A: return KeyCode.A; case K.S: return KeyCode.S; case K.D: return KeyCode.D;
            case K.Q: return KeyCode.Q; case K.E: return KeyCode.E; case K.X: return KeyCode.X; case K.Z: return KeyCode.Z;
            case K.Tab: return KeyCode.Tab; case K.Shift: return KeyCode.LeftShift; case K.Ctrl: return KeyCode.LeftControl;
            case K.Space: return KeyCode.Space; default: return KeyCode.Escape;
        }
    }
    public static bool Held(K k) => Input.GetKey(Map(k));
    public static bool Down(K k) => Input.GetKeyDown(Map(k));
    public static Vector2 Pos => Input.mousePosition;
    public static bool LeftDown => Input.GetMouseButtonDown(0);
    public static bool LeftHeld => Input.GetMouseButton(0);
    public static bool LeftUp => Input.GetMouseButtonUp(0);
    public static bool RightHeld => Input.GetMouseButton(1);
    public static Vector2 Delta => new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")) * 10f;
    public static float Scroll => Input.mouseScrollDelta.y;
#endif
}
