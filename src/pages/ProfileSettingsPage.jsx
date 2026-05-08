import { useState, useRef, useEffect } from "react";
import { User, Mail, Lock, Camera, X, Save, UserCircle, Sliders, Eye, EyeOff, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Zap, Activity } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Avatar } from "../components/ui/Avatar";
import { Rp } from "../utils/formatters";

const API = "http://localhost:5000";

/* ── Inline feedback toast ── */
function InlineToast({ msg, type }) {
  if (!msg) return null;
  const ok = type === "success";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "10px 14px", borderRadius: 10, marginBottom: 14,
      background: ok ? "rgba(34,197,94,0.09)"  : "rgba(239,68,68,0.09)",
      border: `1px solid ${ok ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`,
      fontSize: 12.5, fontWeight: 600,
      color: ok ? "#4ade80" : "#f87171",
      animation: "fadeSlideUp .28s ease",
    }}>
      {ok ? <CheckCircle size={14}/> : <XCircle size={14}/>}
      {msg}
    </div>
  );
}

/**
 * Profile & system settings page — fully connected to backend API.
 */
export function ProfileSettingsPage({ settings, onSave, user, onUpdateUser, addToast }) {
  const [tab, setTab] = useState("profile");
  const fileRef       = useRef(null);

  // ── Profile state (seeded from localStorage/prop) ──
  const userId = localStorage.getItem("voltEdge_userId") || "";
  const [profileForm, setP]   = useState({ name: user?.name || "", email: user?.email || localStorage.getItem("voltEdge_userEmail") || "" });
  const [pwdForm, setPwdForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [showPwd, setShowPwd] = useState({ current: false, newPwd: false, confirm: false });
  const [sysForm, setSysForm] = useState({ ...settings });

  // ── Loading & feedback ──
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd,     setSavingPwd]     = useState(false);
  const [savingPhoto,   setSavingPhoto]   = useState(false);
  const [profileMsg,    setPMsg]          = useState({ msg: "", type: "" });
  const [pwdMsg,        setPwdMsg]        = useState({ msg: "", type: "" });

  // ── Fetch fresh profile on mount ──
  useEffect(() => {
    if (!userId) return;
    fetch(`${API}/api/auth/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setP({ name: data.user.name || "", email: data.user.email || "" });
          localStorage.setItem("voltEdge_userName",  data.user.name  || "");
          localStorage.setItem("voltEdge_userEmail", data.user.email || "");
          // Sync parent state
          onUpdateUser?.(u => ({ ...u, name: data.user.name, email: data.user.email }));
          // Load foto dari DB
          if (data.user.photo) {
            onUpdateUser?.(u => ({ ...u, photo: data.user.photo }));
          }
        }
      })
      .catch(() => {});
  }, [userId]);

  const flash = (setter, msg, type, delay = 4000) => {
    setter({ msg, type });
    setTimeout(() => setter({ msg: "", type: "" }), delay);
  };

  /* ── Photo ── */
  const savePhoto = async (base64OrNull) => {
    if (!userId) return;
    setSavingPhoto(true);
    try {
      const res = await fetch(`${API}/api/auth/photo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, photo: base64OrNull }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan foto.");
      onUpdateUser?.(u => ({ ...u, photo: base64OrNull }));
      addToast?.(base64OrNull ? "Foto berhasil disimpan ke database!" : "Foto berhasil dihapus.", "success");
    } catch (err) {
      addToast?.(err.message, "error");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { addToast?.("File harus berupa gambar", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => savePhoto(reader.result);
    reader.readAsDataURL(file);
  };

  /* ── Save Profile ── */
  const saveProfile = async () => {
    if (!profileForm.name.trim())  { flash(setPMsg, "Nama lengkap wajib diisi.", "error"); return; }
    if (!profileForm.email.trim()) { flash(setPMsg, "Email wajib diisi.", "error"); return; }
    if (!userId) { flash(setPMsg, "Sesi tidak valid, silakan login ulang.", "error"); return; }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, name: profileForm.name.trim(), email: profileForm.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan profil.");

      // Sync localStorage & parent state
      localStorage.setItem("voltEdge_userName",  data.user.name);
      localStorage.setItem("voltEdge_userEmail", data.user.email);
      setP({ name: data.user.name, email: data.user.email });
      onUpdateUser?.(u => ({ ...u, name: data.user.name, email: data.user.email }));

      flash(setPMsg, "Profil berhasil diperbarui!", "success");
      addToast?.("Profil berhasil diperbarui", "success");
    } catch (err) {
      flash(setPMsg, err.message, "error");
      addToast?.(err.message, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  /* ── Save Password ── */
  const savePwd = async () => {
    if (!pwdForm.current)                   { flash(setPwdMsg, "Masukkan password saat ini.", "error"); return; }
    if (pwdForm.newPwd.length < 6)          { flash(setPwdMsg, "Password baru minimal 6 karakter.", "error"); return; }
    if (pwdForm.newPwd !== pwdForm.confirm) { flash(setPwdMsg, "Konfirmasi password tidak cocok.", "error"); return; }
    if (!userId)                            { flash(setPwdMsg, "Sesi tidak valid, silakan login ulang.", "error"); return; }

    setSavingPwd(true);
    try {
      const res = await fetch(`${API}/api/auth/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, current_password: pwdForm.current, new_password: pwdForm.newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah password.");

      setPwdForm({ current: "", newPwd: "", confirm: "" });
      flash(setPwdMsg, "Password berhasil diubah!", "success");
      addToast?.("Password berhasil diubah", "success");
    } catch (err) {
      flash(setPwdMsg, err.message, "error");
      addToast?.(err.message, "error");
    } finally {
      setSavingPwd(false);
    }
  };

  const saveSys = () => { onSave?.(sysForm); addToast?.("Pengaturan sistem berhasil disimpan", "success"); };

  const TABS = [
    { id: "profile", label: "Info Pribadi", icon: <UserCircle size={15}/> },
    { id: "system",  label: "Sistem",       icon: <Sliders size={15}/> },
  ];

  const PwdToggle = ({ k }) => (
    <button
      type="button"
      onClick={() => setShowPwd(p => ({ ...p, [k]: !p[k] }))}
      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
        background: "none", border: "none", cursor: "pointer", color: "var(--t3)",
        display: "flex", padding: 2 }}
    >
      {showPwd[k] ? <EyeOff size={14}/> : <Eye size={14}/>}
    </button>
  );

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--t1)", marginBottom: 4 }}>Pengaturan</h3>
        <p style={{ fontSize: 13, color: "var(--t3)" }}>Kelola profil pribadi dan konfigurasi sistem</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, background: "var(--card2)", borderRadius: 12, padding: 4, border: "1px solid var(--bd)", marginBottom: 24, width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", transition: "all .18s", background: tab === t.id ? "#f97316" : "transparent", color: tab === t.id ? "#fff" : "var(--t3)", boxShadow: tab === t.id ? "0 3px 12px rgba(249,115,22,.3)" : "none" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: INFO PRIBADI ══ */}
      {tab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Foto Profil */}
          <Card style={{ padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Foto Profil</p>
            <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 20 }}>Foto ditampilkan di seluruh dashboard</p>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div
                className="avatar-wrap"
                style={{ width: 88, height: 88, borderRadius: "50%", flexShrink: 0, border: "3px solid rgba(249,115,22,.35)", overflow: "hidden", position: "relative", cursor: "pointer" }}
                onClick={() => fileRef.current?.click()}
              >
                {user?.photo
                  ? <img src={user.photo} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#fb923c,#c2410c)", fontSize: 32, fontWeight: 700, color: "#fff" }}>{user?.name?.[0]?.toUpperCase() || "?"}</div>
                }
                <div className="cam-overlay"><Camera size={22} color="#fff"/></div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto}/>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={savingPhoto}
                  style={{ padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: savingPhoto ? "not-allowed" : "pointer", background: "#f97316", border: "none", color: "#fff", boxShadow: "0 3px 12px rgba(249,115,22,.28)", display: "flex", alignItems: "center", gap: 7, opacity: savingPhoto ? 0.7 : 1 }}
                >
                  {savingPhoto ? <Loader2 size={14} style={{ animation: "spin .9s linear infinite" }}/> : <Camera size={14}/>}
                  {savingPhoto ? "Menyimpan…" : "Unggah Foto"}
                </button>
                {user?.photo && (
                  <button
                    onClick={() => savePhoto(null)}
                    disabled={savingPhoto}
                    style={{ padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: savingPhoto ? "not-allowed" : "pointer", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", display: "flex", alignItems: "center", gap: 7 }}
                  >
                    <X size={14}/> Hapus Foto
                  </button>
                )}
                <p style={{ fontSize: 11, color: "var(--t4)" }}>
                  JPG, PNG, GIF · maks 5 MB
                </p>
                <p style={{ fontSize: 10, color: "var(--t4)", fontStyle: "italic" }}>
                  📦 Tersimpan di database · sync semua perangkat
                </p>
              </div>
            </div>
          </Card>

          {/* Informasi Pribadi */}
          <Card style={{ padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Informasi Pribadi</p>
            <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 20 }}>Perbarui nama dan alamat email Anda</p>
            <InlineToast msg={profileMsg.msg} type={profileMsg.type}/>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field
                id="profile-name"
                label="Nama Lengkap"
                icon={<User size={14}/>}
                value={profileForm.name}
                onChange={e => setP(p => ({ ...p, name: e.target.value }))}
                placeholder="Masukkan nama lengkap"
              />
              <Field
                id="profile-email"
                label="Email"
                icon={<Mail size={14}/>}
                type="email"
                value={profileForm.email}
                onChange={e => setP(p => ({ ...p, email: e.target.value }))}
                placeholder="nama@contoh.com"
              />
            </div>
            <button
              id="profile-save-btn"
              onClick={saveProfile}
              disabled={savingProfile}
              style={{ width: "100%", padding: "12px", borderRadius: 12, marginTop: 22, fontSize: 14, fontWeight: 700, cursor: savingProfile ? "not-allowed" : "pointer", background: "#f97316", border: "none", color: "#fff", boxShadow: "0 4px 16px rgba(249,115,22,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: savingProfile ? 0.7 : 1 }}
            >
              {savingProfile ? <Loader2 size={15} style={{ animation: "spin .9s linear infinite" }}/> : <Save size={15}/>}
              {savingProfile ? "Menyimpan…" : "Simpan Profil"}
            </button>
          </Card>

          {/* Ubah Password */}
          <Card style={{ padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Ubah Password</p>
            <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 20 }}>Gunakan password yang kuat dan unik</p>
            <InlineToast msg={pwdMsg.msg} type={pwdMsg.type}/>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { key: "current", label: "Password Saat Ini",      ph: "••••••••",           ac: "current-password" },
                { key: "newPwd",  label: "Password Baru",           ph: "Min. 6 karakter",    ac: "new-password", hint: "Kombinasikan huruf, angka, dan simbol" },
                { key: "confirm", label: "Konfirmasi Password Baru", ph: "Ulangi password baru", ac: "new-password" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t3)", marginBottom: 6 }}>{f.label}</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }}/>
                    <input
                      id={`pwd-${f.key}`}
                      type={showPwd[f.key] ? "text" : "password"}
                      placeholder={f.ph}
                      value={pwdForm[f.key]}
                      onChange={e => setPwdForm(p => ({ ...p, [f.key]: e.target.value }))}
                      autoComplete={f.ac}
                      className="input-field"
                      style={{ paddingLeft: 38, paddingRight: 40 }}
                    />
                    <PwdToggle k={f.key}/>
                  </div>
                  {f.hint && <p style={{ fontSize: 10, color: "var(--t4)", marginTop: 4 }}>{f.hint}</p>}
                </div>
              ))}
            </div>
            <button
              id="pwd-save-btn"
              onClick={savePwd}
              disabled={savingPwd}
              style={{ width: "100%", padding: "12px", borderRadius: 12, marginTop: 22, fontSize: 14, fontWeight: 700, cursor: savingPwd ? "not-allowed" : "pointer", background: "var(--input)", border: "1px solid var(--bd)", color: "var(--t1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: savingPwd ? 0.7 : 1 }}
            >
              {savingPwd ? <Loader2 size={15} style={{ animation: "spin .9s linear infinite" }}/> : <Lock size={15}/>}
              {savingPwd ? "Mengubah…" : "Ubah Password"}
            </button>
          </Card>
        </div>
      )}

      {/* ══ TAB: SISTEM ══ */}
      {tab === "system" && (
        <Card style={{ padding: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Parameter Monitoring</p>
          <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 24 }}>Konfigurasi tarif dan batas arus sistem</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 7 }}>Tarif Listrik</label>
              <div style={{ position: "relative" }}>
                <Zap size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }}/>
                <input
                  id="sys-tariff"
                  type="number"
                  min="0"
                  step="0.01"
                  value={sysForm.tariff}
                  onChange={e => setSysForm(p => ({ ...p, tariff: +e.target.value }))}
                  className="input-field"
                  style={{ width: "100%", padding: "11px 70px 11px 40px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }}
                />
                <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--t3)", fontWeight: 600, pointerEvents: "none" }}>Rp/kWh</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--t4)", marginTop: 5 }}>Tarif PLN non-subsidi: Rp 1.444/kWh</p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 7 }}>Batas Arus Maksimum</label>
              <div style={{ position: "relative" }}>
                <Activity size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }}/>
                <input
                  id="sys-max-current"
                  type="number"
                  min="0"
                  step="0.1"
                  value={sysForm.maxCurrent}
                  onChange={e => setSysForm(p => ({ ...p, maxCurrent: +e.target.value }))}
                  className="input-field"
                  style={{ width: "100%", padding: "11px 70px 11px 40px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }}
                />
                <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--t3)", fontWeight: 600, pointerEvents: "none" }}>Ampere</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--t4)", marginTop: 5 }}>Alert overload jika arus melewati nilai ini</p>
            </div>
            {/* Preview */}
            <div style={{ padding: 16, borderRadius: 12, background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.2)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#f97316", marginBottom: 10 }}>Pratinjau Biaya</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[["Biaya per kWh", Rp(sysForm.tariff)], ["Batas Arus", `${sysForm.maxCurrent} A`],
                  ["Est. Harian", Rp(Math.round(sysForm.tariff * 0.5))], ["Est. Bulanan", Rp(Math.round(sysForm.tariff * 0.5 * 30))]
                ].map(([k, v]) => (
                  <div key={k}>
                    <p style={{ fontSize: 10, color: "var(--t4)", marginBottom: 2 }}>{k}</p>
                    <p className="mono" style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
            <button
              id="sys-save-btn"
              onClick={saveSys}
              style={{ width: "100%", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#f97316", border: "none", color: "#fff", boxShadow: "0 4px 16px rgba(249,115,22,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <Save size={15}/> Simpan Pengaturan
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
