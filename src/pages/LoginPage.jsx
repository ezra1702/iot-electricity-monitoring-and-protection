import { useState } from "react";
import { Zap, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Card } from "../components/ui/Card";

/**
 * Login page with animated floating icon and demo credential notice.
 */
export function LoginPage({ onLogin }) {
  const [email, setEmail]     = useState("");
  const [pwd, setPwd]         = useState("");
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);

  const go = () => {
    if (!email || !pwd) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(email); }, 1200);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Grid bg */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "linear-gradient(var(--t1) 1px,transparent 1px),linear-gradient(90deg,var(--t1) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "#f97316", filter: "blur(90px)", opacity: 0.08, top: "10%", left: "-5%" }} />
      <div style={{ position: "absolute", width: 280, height: 280, borderRadius: "50%", background: "#3b82f6", filter: "blur(90px)", opacity: 0.07, bottom: "10%", right: "-5%" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 400, animation: "fadeDown .5s ease" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div style={{ padding: 16, borderRadius: 20, background: "#f97316", boxShadow: "0 0 40px rgba(249,115,22,.4)", animation: "floatUp 5s ease-in-out infinite", marginBottom: 14 }}>
            <Zap size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--t1)" }}>IoT Energy Monitor</h1>
          <p style={{ fontSize: 13, color: "var(--t3)", marginTop: 3 }}>ESP32 Smart Grid System</p>
        </div>

        <Card style={{ padding: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Selamat Datang</h2>
          <p style={{ fontSize: 13, color: "var(--t3)", marginBottom: 24 }}>Masuk ke panel monitoring IoT Anda</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@iot.dev"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14, background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }} />
            </div>
            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()}
                  style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: 10, fontSize: 14, background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }} />
                <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--t3)", display: "flex" }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button onClick={go} disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#f97316", border: "none", color: "#fff", boxShadow: "0 4px 20px rgba(249,115,22,.35)", opacity: loading ? 0.75 : 1, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? <><span style={{ animation: "spin .8s linear infinite", display: "flex" }}><RefreshCw size={15} /></span>Masuk...</> : "Masuk"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: 11, color: "var(--t4)", marginTop: 16 }}>Gunakan email &amp; password apapun untuk demo</p>
        </Card>
      </div>
    </div>
  );
}
