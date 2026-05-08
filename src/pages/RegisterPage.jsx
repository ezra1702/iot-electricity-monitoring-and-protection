import { useState, useEffect, useRef, useCallback } from 'react'
import { Zap, User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  animateLoginEntrance,
  animateHeroEntrance,
  animateBtnPress,
  animateBtnRelease,
  animateBtnLoading,
  animateFormShake,
} from '../utils/animations'
import { createESP32Scene } from '../utils/esp32Scene'

/* ═══════════════════════════════════════════════════════════════════════════
   REGISTER PAGE — split layout, mirror of LoginPage
   ═══════════════════════════════════════════════════════════════════════════ */
export default function RegisterPage({ setPage, onRegister }) {
  const [form, setForm]   = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [show, setShow]   = useState({ pwd: false, cfm: false })
  const [loading, setLoad] = useState(false)
  const [done, setDone]   = useState(false)
  const [error, setError] = useState('')
  const [fieldErr, setFieldErr] = useState({})

  const canvasRef = useRef(null)
  const sceneRef  = useRef(null)
  const btnRef    = useRef(null)
  const loadAnim  = useRef(null)

  /* ── Three.js scene (right panel) ── */
  useEffect(() => {
    if (!canvasRef.current) return
    const { dispose } = createESP32Scene(canvasRef.current)
    sceneRef.current = { dispose }
    return () => sceneRef.current?.dispose()
  }, [])

  /* ── Entrance animations ── */
  useEffect(() => {
    animateLoginEntrance('.reg-form-wrap')
    animateHeroEntrance('.reg-hero-panel')
  }, [])

  /* ── Validation ── */
  const validate = () => {
    const errs = {}
    if (!form.full_name.trim())   errs.full_name = 'Nama lengkap wajib diisi.'
    if (!form.email.trim())       errs.email    = 'Email wajib diisi.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Format email tidak valid.'
    if (!form.password)           errs.password = 'Password wajib diisi.'
    else if (form.password.length < 6) errs.password = 'Password minimal 6 karakter.'
    if (!form.confirm)            errs.confirm  = 'Konfirmasi password wajib diisi.'
    else if (form.password !== form.confirm) errs.confirm = 'Password tidak cocok.'
    return errs
  }

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setFieldErr(errs)
      animateFormShake('.reg-form')
      return
    }
    setFieldErr({})
    setError('')
    setLoad(true)
    loadAnim.current = animateBtnLoading(btnRef.current)

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email:     form.email.trim().toLowerCase(),
          password:  form.password,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Registrasi gagal.')

      loadAnim.current?.cancel()
      setLoad(false)
      setDone(true)

      // Arahkan ke form login setelah sukses (1.8s)
      setTimeout(() => {
        setPage('login')
      }, 1800)

    } catch (err) {
      loadAnim.current?.cancel()
      setLoad(false)
      setError(err.message)
      animateFormShake('.reg-form')
      setTimeout(() => setError(''), 4000)
    }
  }

  const onBtnDown = useCallback(() => animateBtnPress(btnRef.current), [])
  const onBtnUp   = useCallback(() => animateBtnRelease(btnRef.current), [])

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        /* ── Root shell ── */
        .rp-root {
          display: flex;
          width: 100vw;
          height: 100vh;
          background: #020617;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          position: relative;
        }
        .rp-bg-glow {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background:
            radial-gradient(ellipse 60% 50% at 30% 50%, rgba(56,189,248,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 90% 20%, rgba(99,102,241,0.05) 0%, transparent 60%);
        }

        /* ══════════════════════════════════════════
           LEFT PANEL — Form
        ══════════════════════════════════════════ */
        .reg-form-wrap {
          position: relative;
          z-index: 10;
          flex: 0 0 44%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2rem;
          padding: 2.5rem 4rem;
          border-right: 1px solid rgba(56,189,248,0.12);
          box-shadow: 14px 0 50px rgba(0,0,0,0.65);
          overflow: hidden;
          opacity: 0; /* revealed by anime.js */
        }

        /* Same background overlay as LoginPage */
        .reg-form-wrap::before {
          content: '';
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background-image: url('/assets/login.gif');
          background-size: cover;
          background-position: center;
          opacity: 0.40;
        }
        .reg-form-wrap::after {
          content: '';
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background: linear-gradient(
            135deg,
            rgba(2,6,23,0.80) 0%,
            rgba(2,6,23,0.65) 55%,
            rgba(9,20,50,0.80) 100%
          );
        }
        .reg-form-wrap > * { position: relative; z-index: 1; }

        /* ── Brand ── */
        .rp-brand       { display: flex; align-items: center; gap: 10px; }
        .rp-brand-icon  {
          width: 42px; height: 42px; border-radius: 11px;
          background: linear-gradient(135deg, #38bdf8, #22d3ee);
          display: flex; align-items: center; justify-content: center;
          color: #020617; box-shadow: 0 0 22px rgba(56,189,248,0.45);
          flex-shrink: 0;
        }
        .rp-brand-name  { font-size: 14px; font-weight: 900; letter-spacing: 0.14em; color: #f1f5f9; }

        /* ── Heading ── */
        .rp-form-body   { display: flex; flex-direction: column; gap: 1.2rem; }
        .rp-title       { font-size: 2.1rem; font-weight: 900; color: #f1f5f9; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 0.3rem; }
        .rp-subtitle    { font-size: 13px; color: #64748b; font-weight: 500; margin: 0; }
        .rp-sep         { height: 1px; background: linear-gradient(90deg, rgba(56,189,248,0.3), transparent); }

        /* ── Toast error ── */
        @keyframes toast-slide-down {
          0%   { transform: translate(-50%, -100%); opacity: 0; }
          100% { transform: translate(-50%, 0); opacity: 1; }
        }
        .rp-toast-error {
          position: fixed; top: 24px; left: 50%; transform: translateX(-50%);
          z-index: 9999;
          padding: 14px 24px; border-radius: 12px;
          background: rgba(220, 38, 38, 0.85);
          backdrop-filter: blur(16px);
          color: #fff; font-size: 13.5px; font-weight: 700;
          box-shadow: 0 10px 30px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; gap: 12px;
          animation: toast-slide-down 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        /* ── Form ── */
        .reg-form    { display: flex; flex-direction: column; gap: 13px; width: 100%; }

        /* ── Labels ── */
        .rp-label {
          display: block; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.09em;
          color: #475569; margin-bottom: 5px;
        }

        /* ── Inputs ── */
        .rp-input-wrap  { position: relative; }
        .rp-input-icon  {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%); color: #475569;
          pointer-events: none; transition: color 0.2s;
        }
        .rp-input {
          width: 100%;
          background: rgba(15,23,42,0.70);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 14px 16px 14px 44px;
          color: #f1f5f9; font-size: 14px; font-weight: 500;
          font-family: 'Inter', sans-serif; outline: none;
          transition: border-color 0.22s, background 0.22s, box-shadow 0.22s;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.4);
          box-sizing: border-box;
        }
        .rp-input.has-toggle { padding-right: 44px; }
        .rp-input::placeholder { color: #475569; }
        .rp-input:focus {
          border-color: rgba(56,189,248,0.55);
          background: rgba(15,23,42,0.92);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.12), inset 0 2px 6px rgba(0,0,0,0.4);
        }
        .rp-input.is-error { border-color: rgba(239,68,68,0.5); }
        .rp-input.is-error:focus {
          border-color: rgba(239,68,68,0.7);
          box-shadow: 0 0 0 3px rgba(239,68,68,0.10), inset 0 2px 6px rgba(0,0,0,0.4);
        }
        .rp-input-wrap:focus-within .rp-input-icon { color: #38bdf8; }
        .rp-input.is-error ~ .rp-input-icon { color: #f87171 !important; }

        /* ── Field error message ── */
        .rp-field-err {
          font-size: 11px; color: #f87171; font-weight: 500;
          margin-top: 4px; display: flex; align-items: center; gap: 4px;
        }

        /* ── Show/hide password toggle ── */
        .rp-toggle-btn {
          position: absolute; right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #475569; display: flex; align-items: center;
          padding: 2px; transition: color 0.2s;
        }
        .rp-toggle-btn:hover { color: #38bdf8; }

        /* ── Submit ── */
        .rp-submit {
          border: none; padding: 15px; border-radius: 12px;
          background: linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%);
          color: #020617; font-size: 14px; font-weight: 900;
          letter-spacing: 0.06em; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 2px;
          transition: filter 0.2s, box-shadow 0.2s;
          box-shadow: 0 8px 24px rgba(56,189,248,0.28);
          will-change: transform;
        }
        .rp-submit:hover:not(:disabled) {
          filter: brightness(1.08);
          box-shadow: 0 12px 34px rgba(56,189,248,0.44);
        }
        .rp-submit:disabled { opacity: 0.7; cursor: not-allowed; }

        /* ── Login link ── */
        .rp-login-row {
          display: flex; align-items: center; justify-content: center;
          gap: 6px; margin-top: 6px;
        }
        .rp-login-label { font-size: 12.5px; color: #475569; }
        .rp-login-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12.5px; font-weight: 700; color: #38bdf8;
          font-family: 'Inter', sans-serif;
          padding: 0; text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s;
        }
        .rp-login-btn:hover { color: #7dd3fc; }

        /* ── Success state ── */
        .rp-success {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; padding: 2rem 0;
          text-align: center;
        }
        .rp-success-icon { animation: rp-success-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes rp-success-pop {
          0%   { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .rp-success-title { font-size: 17px; font-weight: 800; color: #22c55e; margin: 0; }
        .rp-success-sub   { font-size: 12px; color: #475569; margin: 0; }

        /* ══════════════════════════════════════════
           RIGHT PANEL — 3D Hero
        ══════════════════════════════════════════ */
        .reg-hero-panel {
          flex: 1; position: relative; overflow: hidden;
          background:
            radial-gradient(ellipse 70% 70% at 50% 40%, rgba(14,165,233,0.13) 0%, transparent 65%),
            linear-gradient(160deg, #0f2747 0%, #020617 55%, #03051a 100%);
          opacity: 0; /* revealed by anime.js */
        }
        .rp-canvas {
          width: 100%; height: 100%;
          position: absolute; inset: 0;
          cursor: grab; display: block;
        }
        .rp-esp-glow {
          position: absolute; width: 360px; height: 360px; border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.20) 0%, transparent 68%);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          pointer-events: none; z-index: 1;
          animation: rp-glow-pulse 3.2s ease-in-out infinite;
        }
        .rp-scanline {
          position: absolute; inset: 0; pointer-events: none; z-index: 2;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px
          );
        }
        .rp-hint {
          position: absolute; bottom: 2rem; left: 50%;
          transform: translateX(-50%);
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(56,189,248,0.08);
          border: 1px solid rgba(56,189,248,0.18);
          border-radius: 99px; padding: 8px 22px;
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em;
          color: #38bdf8; white-space: nowrap;
          pointer-events: none; backdrop-filter: blur(8px); z-index: 6;
        }

        /* ══ KEYFRAMES ══ */
        @keyframes rp-glow-pulse {
          0%,100% { opacity: 0.7; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 1;   transform: translate(-50%,-50%) scale(1.14); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.9s linear infinite; }

        /* anime.js: elements start hidden */
        .anim-item { opacity: 0; }

        /* responsive */
        @media (max-width: 900px) {
          .reg-hero-panel { display: none; }
          .reg-form-wrap  { flex: 1; padding: 2.5rem 1.75rem; gap: 1.75rem; }
        }
        @media (max-width: 480px) {
          .rp-title        { font-size: 1.75rem; }
          .reg-form-wrap   { padding: 2rem 1.25rem; }
        }
      `}</style>

      <div className="rp-root">
        {/* Toast error */}
        {error && (
          <div className="rp-toast-error">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        <div className="rp-bg-glow" />

        {/* ══ LEFT — Form ══ */}
        <div className="reg-form-wrap">

          {/* Brand */}
          <div className="rp-brand anim-item">
            <div className="rp-brand-icon"><Zap size={20} /></div>
            <span className="rp-brand-name">VOLTEDGE</span>
          </div>

          <div className="rp-form-body">

            <div className="anim-item">
              <h1 className="rp-title">BUAT AKUN</h1>
              <p className="rp-subtitle">Daftarkan diri Anda untuk mulai monitoring listrik.</p>
            </div>

            <div className="rp-sep anim-item" />

            {/* ── Success State ── */}
            {done ? (
              <div className="rp-success anim-item">
                <CheckCircle size={56} color="#22c55e" className="rp-success-icon" />
                <p className="rp-success-title">Akun Berhasil Dibuat!</p>
                <p className="rp-success-sub">Mengarahkan ke dashboard…</p>
              </div>
            ) : (
              <form className="reg-form" onSubmit={handleSubmit} noValidate>

                {/* Full Name */}
                <div className="anim-item">
                  <label className="rp-label" htmlFor="reg-fullname">Nama Lengkap</label>
                  <div className="rp-input-wrap">
                    <input
                      id="reg-fullname"
                      type="text"
                      placeholder="Contoh: John Doe"
                      value={form.full_name}
                      onChange={e => { setForm(p => ({ ...p, full_name: e.target.value })); setFieldErr(p => ({ ...p, full_name: '' })) }}
                      className={`rp-input${fieldErr.full_name ? ' is-error' : ''}`}
                      autoComplete="name"
                    />
                    <User size={16} className="rp-input-icon" />
                  </div>
                  {fieldErr.full_name && <p className="rp-field-err">⚠ {fieldErr.full_name}</p>}
                </div>

                {/* Email */}
                <div className="anim-item">
                  <label className="rp-label" htmlFor="reg-email">Email</label>
                  <div className="rp-input-wrap">
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="nama@contoh.com"
                      value={form.email}
                      onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setFieldErr(p => ({ ...p, email: '' })) }}
                      className={`rp-input${fieldErr.email ? ' is-error' : ''}`}
                      autoComplete="email"
                    />
                    <Mail size={16} className="rp-input-icon" />
                  </div>
                  {fieldErr.email && <p className="rp-field-err">⚠ {fieldErr.email}</p>}
                </div>

                {/* Password */}
                <div className="anim-item">
                  <label className="rp-label" htmlFor="reg-password">Password</label>
                  <div className="rp-input-wrap">
                    <input
                      id="reg-password"
                      type={show.pwd ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={form.password}
                      onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setFieldErr(p => ({ ...p, password: '' })) }}
                      className={`rp-input has-toggle${fieldErr.password ? ' is-error' : ''}`}
                      autoComplete="new-password"
                    />
                    <Lock size={16} className="rp-input-icon" />
                    <button
                      id="reg-toggle-pwd"
                      type="button"
                      className="rp-toggle-btn"
                      onClick={() => setShow(p => ({ ...p, pwd: !p.pwd }))}
                      aria-label={show.pwd ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {show.pwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErr.password && <p className="rp-field-err">⚠ {fieldErr.password}</p>}
                </div>

                {/* Confirm Password */}
                <div className="anim-item">
                  <label className="rp-label" htmlFor="reg-confirm">Konfirmasi Password</label>
                  <div className="rp-input-wrap">
                    <input
                      id="reg-confirm"
                      type={show.cfm ? 'text' : 'password'}
                      placeholder="Ulangi password Anda"
                      value={form.confirm}
                      onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); setFieldErr(p => ({ ...p, confirm: '' })) }}
                      className={`rp-input has-toggle${fieldErr.confirm ? ' is-error' : ''}`}
                      autoComplete="new-password"
                    />
                    <Lock size={16} className="rp-input-icon" />
                    <button
                      id="reg-toggle-cfm"
                      type="button"
                      className="rp-toggle-btn"
                      onClick={() => setShow(p => ({ ...p, cfm: !p.cfm }))}
                      aria-label={show.cfm ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {show.cfm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErr.confirm && <p className="rp-field-err">⚠ {fieldErr.confirm}</p>}
                </div>

                {/* Submit */}
                <button
                  ref={btnRef}
                  id="reg-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="rp-submit anim-item"
                  onMouseDown={onBtnDown}
                  onMouseUp={onBtnUp}
                  onMouseLeave={onBtnUp}
                >
                  {loading
                    ? <Loader2 size={17} className="animate-spin" />
                    : <>BUAT AKUN <ArrowRight size={16} /></>
                  }
                </button>

                {/* Login link */}
                <div className="rp-login-row anim-item">
                  <span className="rp-login-label">Sudah punya akun?</span>
                  <button
                    id="go-to-login-btn"
                    type="button"
                    className="rp-login-btn"
                    onClick={() => setPage('login')}
                  >
                    Login Sekarang
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>

        {/* ══ RIGHT — 3D ESP32 ══ */}
        <div className="reg-hero-panel">
          <div className="rp-esp-glow" />
          <div className="rp-scanline" />
          <canvas ref={canvasRef} className="rp-canvas" />
          <div className="rp-hint">
            ❖ KLIK, TARIK &amp; SCROLL (ZOOM) UNTUK INSPEKSI FISIK ESP-32 ❖
          </div>
        </div>

      </div>
    </>
  )
}
