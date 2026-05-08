import { useState, useRef, useEffect } from 'react'
import { Key, Save, Camera, Activity, AlertTriangle, Zap, Eye, EyeOff, Loader2, CheckCircle, XCircle, Lock } from 'lucide-react'
import { pageEntrance } from '../utils/animations'

const API = 'http://localhost:5000'

/* ── Mini toast helper ── */
function Toast({ msg, type }) {
  if (!msg) return null
  const isOk = type === 'success'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 16px', borderRadius: 11, marginBottom: 16,
      background: isOk ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
      border: `1px solid ${isOk ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}`,
      fontSize: 13, fontWeight: 600,
      color: isOk ? '#4ade80' : '#f87171',
      animation: 'fadeSlideUp .3s ease',
    }}>
      {isOk ? <CheckCircle size={15}/> : <XCircle size={15}/>}
      {msg}
    </div>
  )
}

export default function SettingsPage({ user, onUpdateUser }) {
  const pageRef     = useRef(null)
  const fileInputRef = useRef(null)

  // ── User data from props / localStorage ──
  const userId      = user?.id || localStorage.getItem('voltEdge_userId') || ''
  const cachedName  = user?.name || localStorage.getItem('voltEdge_userName') || ''
  const cachedEmail = user?.email || localStorage.getItem('voltEdge_userEmail') || ''

  // ── Profile state ──
  const [form, setForm]     = useState({ name: cachedName, email: cachedEmail })
  const [profileMsg, setPMsg] = useState({ msg: '', type: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  // ── Password state ──
  const [pwd, setPwd]       = useState({ current: '', newPwd: '', confirm: '' })
  const [showPwd, setShow]  = useState({ current: false, newPwd: false, confirm: false })
  const [pwdMsg, setPwdMsg] = useState({ msg: '', type: '' })
  const [savingPwd, setSavingPwd] = useState(false)

  // ── Threshold state ──
  const [threshold, setThreshold] = useState({
    priceKwh:   localStorage.getItem('voltEdge_priceKwh')   || '1444.70',
    maxCurrent: localStorage.getItem('voltEdge_maxCurrent') || '5.0',
  })
  const [threshMsg, setThreshMsg] = useState({ msg: '', type: '' })
  const [savingThresh, setSavingThresh] = useState(false)
  const deviceId = localStorage.getItem('voltEdge_deviceId') || ''

  // ── Avatar ──
  const [avatar, setAvatar] = useState(null)
  const [savingPhoto, setSavingPhoto] = useState(false)

  useEffect(() => {
    pageEntrance('#settings-page')
    // Fetch fresh profile from backend
    if (userId) {
      fetch(`${API}/api/auth/profile/${userId}`)
        .then(r => r.json())
        .then(data => {
          if (data.user) {
            setForm({ name: data.user.name || '', email: data.user.email || '' })
            localStorage.setItem('voltEdge_userName',  data.user.name  || '')
            localStorage.setItem('voltEdge_userEmail', data.user.email || '')
            // Load foto dari DB jika ada
            if (data.user.photo) setAvatar(data.user.photo)
          }
        })
        .catch(() => {}) // Fail silently, use cached
    }
  }, [userId])

  const flash = (setter, msg, type, delay = 4000) => {
    setter({ msg, type })
    setTimeout(() => setter({ msg: '', type: '' }), delay)
  }

  /* ── Save Profile ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!form.name.trim())  { flash(setPMsg, 'Nama lengkap wajib diisi.', 'error'); return }
    if (!form.email.trim()) { flash(setPMsg, 'Email wajib diisi.', 'error'); return }

    setSavingProfile(true)
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, name: form.name.trim(), email: form.email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan profil.')
      // Update localStorage & global state
      localStorage.setItem('voltEdge_userName',  data.user.name)
      localStorage.setItem('voltEdge_userEmail', data.user.email)
      setForm({ name: data.user.name, email: data.user.email })
      onUpdateUser?.({ name: data.user.name, email: data.user.email })
      flash(setPMsg, 'Profil berhasil diperbarui!', 'success')
    } catch (err) {
      flash(setPMsg, err.message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  /* ── Save Password ── */
  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (!pwd.current)               { flash(setPwdMsg, 'Masukkan password saat ini.', 'error'); return }
    if (pwd.newPwd.length < 6)      { flash(setPwdMsg, 'Password baru minimal 6 karakter.', 'error'); return }
    if (pwd.newPwd !== pwd.confirm) { flash(setPwdMsg, 'Konfirmasi password tidak cocok.', 'error'); return }

    setSavingPwd(true)
    try {
      const res = await fetch(`${API}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, current_password: pwd.current, new_password: pwd.newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah password.')
      setPwd({ current: '', newPwd: '', confirm: '' })
      flash(setPwdMsg, 'Password berhasil diubah!', 'success')
    } catch (err) {
      flash(setPwdMsg, err.message, 'error')
    } finally {
      setSavingPwd(false)
    }
  }

  /* ── Save Threshold → Backend → MQTT → ESP32 ── */
  const handleSaveThreshold = async (e) => {
    e.preventDefault()
    const limit = parseFloat(threshold.maxCurrent)
    if (!limit || limit <= 0) {
      flash(setThreshMsg, 'Batas arus harus lebih dari 0 Ampere!', 'error')
      return
    }
    if (!deviceId) {
      flash(setThreshMsg, 'Device ID tidak ditemukan. Pastikan alat sudah di-pairing.', 'error')
      return
    }
    setSavingThresh(true)
    try {
      const res = await fetch(`${API}/api/devices/${deviceId}/threshold`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_current_limit: limit,
          price_per_kwh: parseFloat(threshold.priceKwh) || 1444.70
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui threshold.')
      localStorage.setItem('voltEdge_priceKwh',   threshold.priceKwh)
      localStorage.setItem('voltEdge_maxCurrent', threshold.maxCurrent)
      flash(setThreshMsg, `Threshold ${limit}A berhasil dikirim ke ESP32!`, 'success')
    } catch (err) {
      flash(setThreshMsg, err.message, 'error')
    } finally {
      setSavingThresh(false)
    }
  }

  /* ── Avatar ── */
  const savePhoto = async (base64OrNull) => {
    setSavingPhoto(true)
    try {
      const res = await fetch(`${API}/api/auth/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, photo: base64OrNull }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan foto.')
      setAvatar(base64OrNull)
      onUpdateUser?.(prev => ({ ...prev, photo: base64OrNull }))
    } catch (err) {
      flash(setPMsg, err.message, 'error')
    } finally {
      setSavingPhoto(false)
    }
  }

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => savePhoto(reader.result)
    reader.readAsDataURL(file)
  }

  const TogglePwd = ({ k }) => (
    <button
      type="button"
      onClick={() => setShow(p => ({ ...p, [k]: !p[k] }))}
      style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
        display: 'flex', padding: 2 }}
    >
      {showPwd[k] ? <EyeOff size={15}/> : <Eye size={15}/>}
    </button>
  )

  return (
    <div id="settings-page" ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="a-title">
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>Pengaturan</h2>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Kelola identitas profil dan ambang batas sensor.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>

        {/* ═══════════ KOLOM 1: PROFIL & SANDI ═══════════ */}
        <div className="a-chart glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ position: 'relative' }}>
              <div className="gradient-electric" style={{ width: 70, height: 70, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#020617', boxShadow: '0 0 20px rgba(56,189,248,0.3)', overflow: 'hidden', opacity: savingPhoto ? 0.5 : 1, transition: 'opacity .2s' }}>
                {avatar
                  ? <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : (form.name?.[0]?.toUpperCase() || '?')
                }
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleAvatarSelect} style={{ display: 'none' }}/>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={savingPhoto}
                style={{ position: 'absolute', bottom: -5, right: -5, width: 28, height: 28, borderRadius: '50%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: savingPhoto ? 'not-allowed' : 'pointer', zIndex: 10 }}
              >
                {savingPhoto ? <Loader2 size={12} style={{ animation: 'spin .9s linear infinite' }}/> : <Camera size={13}/>}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Foto Profil</h3>
              <p style={{ fontSize: 11, color: '#64748B' }}>
                {savingPhoto ? ' Menyimpan ke database…' : ''}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={savingPhoto}
                  style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: savingPhoto ? 'not-allowed' : 'pointer', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Camera size={11}/> Ganti Foto
                </button>
                {avatar && (
                  <button
                    onClick={() => savePhoto(null)}
                    disabled={savingPhoto}
                    style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: savingPhoto ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.28)', color: '#f87171', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    Hapus Foto
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed rgba(255,255,255,0.05)' }}/>

          {/* ── Form Profil ── */}
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Toast msg={profileMsg.msg} type={profileMsg.type}/>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Nama Lengkap</label>
              <input
                id="settings-name"
                type="text"
                className="input-field"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                style={{ background: 'rgba(15,23,42,0.8)', padding: '12px 14px' }}
                placeholder="Nama lengkap Anda"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Email</label>
              <input
                id="settings-email"
                type="email"
                className="input-field"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                style={{ background: 'rgba(15,23,42,0.8)', padding: '12px 14px' }}
                placeholder="nama@contoh.com"
              />
            </div>
            <button
              id="settings-save-profile-btn"
              type="submit"
              disabled={savingProfile}
              className="gradient-electric"
              style={{ border: 'none', borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 800, color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: savingProfile ? 'not-allowed' : 'pointer', boxShadow: '0 0 20px rgba(56,189,248,0.2)', opacity: savingProfile ? 0.7 : 1 }}
            >
              {savingProfile ? <Loader2 size={15} style={{ animation: 'spin .9s linear infinite' }}/> : <Save size={15}/>}
              {savingProfile ? 'Menyimpan…' : 'Simpan Profil'}
            </button>
          </form>

          <hr style={{ border: 'none', borderTop: '1px dashed rgba(255,255,255,0.05)' }}/>

          {/* ── Form Password ── */}
          <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={14} color="#A78BFA"/> Keamanan Sandi
            </h3>
            <Toast msg={pwdMsg.msg} type={pwdMsg.type}/>
            {[
              { key: 'current', label: 'Password Saat Ini',     ph: '••••••••' },
              { key: 'newPwd',  label: 'Password Baru',          ph: 'Min. 6 karakter' },
              { key: 'confirm', label: 'Konfirmasi Password Baru', ph: 'Ulangi password baru' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>{f.label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id={`settings-pwd-${f.key}`}
                    type={showPwd[f.key] ? 'text' : 'password'}
                    placeholder={f.ph}
                    value={pwd[f.key]}
                    onChange={e => setPwd(p => ({ ...p, [f.key]: e.target.value }))}
                    className="input-field"
                    style={{ background: 'rgba(15,23,42,0.8)', padding: '12px 44px 12px 14px' }}
                    autoComplete="new-password"
                  />
                  <TogglePwd k={f.key}/>
                </div>
              </div>
            ))}
            <button
              id="settings-save-password-btn"
              type="submit"
              disabled={savingPwd}
              style={{ marginTop: 2, border: '1px solid rgba(167,139,250,0.4)', background: 'rgba(167,139,250,0.1)', borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 700, color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: savingPwd ? 'not-allowed' : 'pointer', opacity: savingPwd ? 0.7 : 1 }}
            >
              {savingPwd ? <Loader2 size={15} style={{ animation: 'spin .9s linear infinite' }}/> : <Lock size={15}/>}
              {savingPwd ? 'Mengubah…' : 'Ubah Password'}
            </button>
          </form>
        </div>

        {/* ═══════════ KOLOM 2: THRESHOLD ═══════════ */}
        <div className="a-list glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="#F59E0B"/>
            </div>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>Batas Peringatan (Threshold)</h3>
              <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Tentukan batas maksimal beban (Overload).</p>
            </div>
          </div>

          <form onSubmit={handleSaveThreshold} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Toast msg={threshMsg.msg} type={threshMsg.type}/>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Batas Aman Cut-off Arus (A)</label>
              <div style={{ position: 'relative' }}>
                <Activity size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}/>
                <input
                  id="settings-max-current"
                  type="number"
                  step="0.1"
                  min="0"
                  className="input-field"
                  value={threshold.maxCurrent}
                  onChange={e => setThreshold({ ...threshold, maxCurrent: e.target.value })}
                  style={{ paddingLeft: 38, background: 'rgba(15,23,42,0.8)', padding: '14px 60px 14px 38px' }}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748B', fontWeight: 600 }}>AMP</span>
              </div>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>Parameter kritis pemutus relay sirkuit pada PZEM-004T.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8 }}>Tarif Dasar Listrik (Rp/kWh)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>Rp</span>
                <input
                  id="settings-price-kwh"
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field"
                  value={threshold.priceKwh}
                  onChange={e => setThreshold({ ...threshold, priceKwh: e.target.value })}
                  style={{ paddingLeft: 38, background: 'rgba(15,23,42,0.8)', padding: '14px 14px 14px 38px' }}
                />
              </div>
              <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>Patokan untuk kalkulasi laporan biaya tagihan aktual Anda.</p>
            </div>

            <button
              id="settings-save-threshold-btn"
              type="submit"
              disabled={savingThresh}
              style={{ marginTop: 'auto', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: savingThresh ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: savingThresh ? 0.7 : 1 }}
              onMouseEnter={e => { if (!savingThresh) e.currentTarget.style.background = 'rgba(245,158,11,0.2)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
            >
              <Save size={16}/> {savingThresh ? 'Mengirim ke ESP32…' : 'Perbarui Threshold Sistem'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
