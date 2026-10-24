using UnityEngine;

// Rondlopen over de wegen (ook op hogere lagen) in eerste persoon, op ware grootte (1,8 m).
public class Walker : MonoBehaviour
{
    public Camera Cam; CharacterController cc; float yaw, pitch, vy;

    void Awake() { cc = gameObject.AddComponent<CharacterController>(); cc.height = 1.8f; cc.radius = 0.3f; cc.center = new Vector3(0, 0.9f, 0); cc.stepOffset = 0.35f; }

    public void Enter(Vector3 pos, float startYaw)
    {
        gameObject.SetActive(true); cc.enabled = false; transform.position = pos; cc.enabled = true; yaw = startYaw; pitch = 10f; vy = 0;
        Cam.transform.SetParent(transform, false); Cam.transform.localPosition = new Vector3(0, 1.65f, 0);
        Cursor.lockState = CursorLockMode.Locked; Cursor.visible = false;
    }

    public void Exit()
    {
        Cam.transform.SetParent(null); gameObject.SetActive(false); Cursor.lockState = CursorLockMode.None; Cursor.visible = true;
    }

    void Update()
    {
        Vector2 d = Inp.Delta; yaw += d.x * 0.15f; pitch = Mathf.Clamp(pitch - d.y * 0.15f, -85f, 85f);
        transform.rotation = Quaternion.Euler(0, yaw, 0); Cam.transform.localRotation = Quaternion.Euler(pitch, 0, 0);
        Vector3 mv = Vector3.zero;
        if (Inp.Held(K.W)) mv += transform.forward; if (Inp.Held(K.S)) mv -= transform.forward;
        if (Inp.Held(K.D)) mv += transform.right; if (Inp.Held(K.A)) mv -= transform.right;
        float speed = Inp.Held(K.Shift) ? 6f : 1.4f * 2.2f;
        if (cc.isGrounded) { vy = -1f; if (Inp.Down(K.Space)) vy = 5f; } else vy -= 20f * Time.deltaTime;
        cc.Move((mv.normalized * speed + Vector3.up * vy) * Time.deltaTime);
    }
}
