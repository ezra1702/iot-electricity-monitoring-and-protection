import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";




export function Field({ label, icon, type = "text", value, onChange, placeholder, suffix, hint, readOnly }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";

  return (
    <div>
      {label && (
        <label style={{
          display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 1, color: "var(--t3)", marginBottom: 7,
        }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {icon && (
          <span style={{ position: "absolute", left: 13, color: "var(--t3)", display: "flex", pointerEvents: "none" }}>
            {icon}
          </span>
        )}
        <input
          type={isPass ? (show ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className="input-field"
          style={{
            width: "100%",
            padding: icon ? "11px 44px 11px 40px" : suffix ? "11px 52px 11px 14px" : "11px 14px",
            borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: readOnly ? "var(--card2)" : "var(--input)",
            border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none",
            cursor: readOnly ? "default" : "text",
          }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: 13, fontSize: 11, color: "var(--t3)", fontWeight: 600, pointerEvents: "none" }}>
            {suffix}
          </span>
        )}
        {isPass && (
          <button
            onClick={() => setShow(s => !s)}
            style={{ position: "absolute", right: 13, background: "none", border: "none", cursor: "pointer", color: "var(--t3)", display: "flex" }}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {hint && <p style={{ fontSize: 11, color: "var(--t4)", marginTop: 5 }}>{hint}</p>}
    </div>
  );
}
