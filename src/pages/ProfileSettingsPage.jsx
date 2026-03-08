import { useState, useRef } from "react";
import { User, Mail, Lock, Camera, X, Save, UserCircle, Sliders } from "lucide-react";
import { Zap, Activity } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Field";
import { Avatar } from "../components/ui/Avatar";
import { Rp } from "../utils/formatters";

/**
 * Profile & system settings page with tabs: Info Pribadi and Sistem.
 */
export function ProfileSettingsPage({ settings, onSave, user, onUpdateUser, addToast }) {
  const [tab, setTab]         = useState("profile");
  const fileRef               = useRef(null);
  const [profileForm, setP]   = useState({ name: user.name || "", email: user.email || "" });
  const [pwdForm, setPwdForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [sysForm, setSysForm] = useState({ ...settings });

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { addToast("File harus berupa gambar", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => onUpdateUser(u => ({ ...u, photo: reader.result }));
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    if (!profileForm.name.trim())  { addToast("Nama lengkap wajib diisi", "error"); return; }
    if (!profileForm.email.trim()) { addToast("Email wajib diisi", "error"); return; }
    onUpdateUser(u => ({ ...u, name: profileForm.name.trim(), email: profileForm.email.trim() }));
    addToast("Profil berhasil diperbarui", "success");
  };

  const savePwd = () => {
    if (!pwdForm.current)                    { addToast("Masukkan password saat ini", "error"); return; }
    if (pwdForm.newPwd.length < 6)           { addToast("Password baru minimal 6 karakter", "error"); return; }
    if (pwdForm.newPwd !== pwdForm.confirm)  { addToast("Konfirmasi password tidak cocok", "error"); return; }
    setPwdForm({ current: "", newPwd: "", confirm: "" });
    addToast("Password berhasil diubah", "success");
  };

  const saveSys = () => { onSave(sysForm); addToast("Pengaturan sistem berhasil disimpan", "success"); };

  const TABS = [
    { id: "profile", label: "Info Pribadi", icon: <UserCircle size={15} /> },
    { id: "system",  label: "Sistem",       icon: <Sliders size={15} /> },
  ];

  return (
    <div style={{ width: "100%", maxWidth: "100%" }}>
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

      {/* ── TAB: INFO PRIBADI ── */}
      {tab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Foto */}
          <Card style={{ padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Foto Profil</p>
            <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 20 }}>Foto ditampilkan di seluruh dashboard</p>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div className="avatar-wrap" style={{ width: 88, height: 88, borderRadius: "50%", flexShrink: 0, border: "3px solid rgba(249,115,22,.35)", overflow: "hidden", position: "relative", cursor: "pointer" }} onClick={() => fileRef.current?.click()}>
                {user.photo
                  ? <img src={user.photo} alt="foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#fb923c,#c2410c)", fontSize: 32, fontWeight: 700, color: "#fff" }}>{user.name?.[0]?.toUpperCase() || "?"}</div>
                }
                <div className="cam-overlay"><Camera size={22} color="#fff" /></div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <button onClick={() => fileRef.current?.click()} style={{ padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#f97316", border: "none", color: "#fff", boxShadow: "0 3px 12px rgba(249,115,22,.28)", display: "flex", alignItems: "center", gap: 7 }}>
                  <Camera size={14} /> Unggah Foto
                </button>
                {user.photo && (
                  <button onClick={() => onUpdateUser(u => ({ ...u, photo: null }))} style={{ padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171", display: "flex", alignItems: "center", gap: 7 }}>
                    <X size={14} /> Hapus Foto
                  </button>
                )}
                <p style={{ fontSize: 11, color: "var(--t4)" }}>JPG, PNG, GIF · maks 5 MB</p>
              </div>
            </div>
          </Card>

          {/* Info pribadi */}
          <Card style={{ padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Informasi Pribadi</p>
            <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 20 }}>Perbarui nama dan alamat email Anda</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field label="Nama Lengkap" icon={<User size={14} />} value={profileForm.name} onChange={e => setP(p => ({ ...p, name: e.target.value }))} placeholder="Masukkan nama lengkap" />
              <Field label="Email" icon={<Mail size={14} />} type="email" value={profileForm.email} onChange={e => setP(p => ({ ...p, email: e.target.value }))} placeholder="nama@contoh.com" />
            </div>
            <button onClick={saveProfile} style={{ width: "100%", padding: "12px", borderRadius: 12, marginTop: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#f97316", border: "none", color: "#fff", boxShadow: "0 4px 16px rgba(249,115,22,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Save size={15} /> Simpan Profil
            </button>
          </Card>

          {/* Ubah password */}
          <Card style={{ padding: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Ubah Password</p>
            <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 20 }}>Gunakan password yang kuat dan unik</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Field label="Password Saat Ini" icon={<Lock size={14} />} type="password" value={pwdForm.current} onChange={e => setPwdForm(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
              <Field label="Password Baru" icon={<Lock size={14} />} type="password" value={pwdForm.newPwd} onChange={e => setPwdForm(p => ({ ...p, newPwd: e.target.value }))} placeholder="Min. 6 karakter" hint="Kombinasikan huruf, angka, dan simbol" />
              <Field label="Konfirmasi Password Baru" icon={<Lock size={14} />} type="password" value={pwdForm.confirm} onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))} placeholder="Ulangi password baru" />
            </div>
            <button onClick={savePwd} style={{ width: "100%", padding: "12px", borderRadius: 12, marginTop: 22, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "var(--input)", border: "1px solid var(--bd)", color: "var(--t1)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Lock size={15} /> Ubah Password
            </button>
          </Card>
        </div>
      )}

      {/* ── TAB: SISTEM ── */}
      {tab === "system" && (
        <Card style={{ padding: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)", marginBottom: 3 }}>Parameter Monitoring</p>
          <p style={{ fontSize: 11, color: "var(--t3)", marginBottom: 24 }}>Konfigurasi tarif dan batas arus sistem</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* Tarif */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 7 }}>Tarif Listrik</label>
              <div style={{ position: "relative" }}>
                <Zap size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
                <input type="number" value={sysForm.tariff} onChange={e => setSysForm(p => ({ ...p, tariff: +e.target.value }))} className="input-field"
                  style={{ width: "100%", padding: "11px 70px 11px 40px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }} />
                <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--t3)", fontWeight: 600, pointerEvents: "none" }}>Rp/kWh</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--t4)", marginTop: 5 }}>Tarif PLN non-subsidi: Rp 1.444/kWh</p>
            </div>
            {/* Arus */}
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--t3)", marginBottom: 7 }}>Batas Arus Maksimum</label>
              <div style={{ position: "relative" }}>
                <Activity size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--t3)", pointerEvents: "none" }} />
                <input type="number" value={sysForm.maxCurrent} onChange={e => setSysForm(p => ({ ...p, maxCurrent: +e.target.value }))} className="input-field"
                  style={{ width: "100%", padding: "11px 70px 11px 40px", borderRadius: 10, fontSize: 14, fontWeight: 500, background: "var(--input)", border: "1px solid var(--bdinput)", color: "var(--t1)", outline: "none" }} />
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
            <button onClick={saveSys} style={{ width: "100%", padding: "12px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", background: "#f97316", border: "none", color: "#fff", boxShadow: "0 4px 16px rgba(249,115,22,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Save size={15} /> Simpan Pengaturan
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
