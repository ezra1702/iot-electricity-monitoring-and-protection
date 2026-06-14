import { useState, useEffect, useRef, useCallback } from 'react'
import { Zap, Mail, Lock, Loader2, ArrowRight, AlertTriangle, Activity, Shield, Cpu } from 'lucide-react'
import {
  animateLoginEntrance,
  animateHeroEntrance,
  animateBtnPress,
  animateBtnRelease,
  animateBtnLoading,
  animateFormShake,
} from '../utils/animations'

export default function LoginPage({ setPage, onLogin }) {
  const [form, setForm]    = useState({ email: '', password: '' })
  const [loading, setLoad] = useState(false)
  const [error, setError]  = useState('')
  const btnRef    = useRef(null)
  const loadAnim  = useRef(null)

  useEffect(() => {
    animateLoginEntrance('.login-form-wrap')
    animateHeroEntrance('.login-hero-panel')
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Akses ditolak: Kredensial tidak lengkap.')
      animateFormShake('.login-form')
      setTimeout(() => setError(''), 4000)
      return
    }
    setLoad(true)
    setError('')
    loadAnim.current = animateBtnLoading(btnRef.current)
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login gagal')
      localStorage.setItem('voltEdge_userId',    data.user.id)
      localStorage.setItem('voltEdge_userName',  data.user.name)
      localStorage.setItem('voltEdge_userEmail', data.user.email)
      loadAnim.current?.cancel()
      setLoad(false)
      onLogin(data.user)
    } catch (err) {
      loadAnim.current?.cancel()
      setLoad(false)
      setError(err.message)
      animateFormShake('.login-form')
      setTimeout(() => setError(''), 4000)
    }
  }

  const onBtnDown = useCallback(() => animateBtnPress(btnRef.current), [])
  const onBtnUp   = useCallback(() => animateBtnRelease(btnRef.current), [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .lp-root {
          display: flex;
          width: 100vw;
          height: 100vh;
          background: #020617;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          position: relative;
        }

        /* ── LEFT PANEL ── */
        .login-form-wrap {
          position: relative;
          z-index: 10;
          flex: 0 0 46%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0;
          padding: 3.5rem 4rem;
          background: #020617;
          border-right: 1px solid rgba(56,189,248,0.10);
          box-shadow: 12px 0 60px rgba(0,0,0,0.6);
          overflow: hidden;
          opacity: 0;
        }

        .lp-form-inner {
          display: flex;
          flex-direction: column;
          gap: 2.2rem;
          max-width: 380px;
          width: 100%;
          margin: 0 auto;
        }

        /* Subtle top accent line */
        .login-form-wrap::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #38bdf8, #22d3ee, transparent);
          opacity: 0.5;
        }

        /* ── Brand ── */
        .lp-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 0.2rem;
        }
        .lp-brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #38bdf8, #22d3ee);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #020617;
          box-shadow: 0 0 24px rgba(56,189,248,0.4);
          flex-shrink: 0;
        }
        .lp-brand-text { display: flex; flex-direction: column; gap: 1px; }
        .lp-brand-name { font-size: 13px; font-weight: 900; letter-spacing: 0.18em; color: #f1f5f9; line-height: 1; }
        .lp-brand-sub  { font-size: 9.5px; font-weight: 600; letter-spacing: 0.1em; color: #38bdf8; text-transform: uppercase; opacity: 0.8; }

        /* ── Heading ── */
        .lp-heading { display: flex; flex-direction: column; gap: 6px; }
        .lp-title {
          font-size: 2.1rem;
          font-weight: 800;
          color: #f1f5f9;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin: 0;
        }
        .lp-title span { color: #38bdf8; }
        .lp-subtitle { font-size: 13px; color: #475569; font-weight: 400; margin: 0; line-height: 1.5; }

        /* ── Divider ── */
        .lp-divider {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lp-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
        .lp-divider-dot  { width: 4px; height: 4px; border-radius: 50%; background: rgba(56,189,248,0.4); }

        /* ── Form ── */
        .login-form { display: flex; flex-direction: column; gap: 14px; width: 100%; }

        /* ── Input ── */
        .lp-field { display: flex; flex-direction: column; gap: 6px; }
        .lp-label {
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
        }
        .lp-input-wrap { position: relative; }
        .lp-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #334155;
          pointer-events: none;
          transition: color 0.2s;
        }
        .lp-input {
          width: 100%;
          background: rgba(15,23,42,0.80);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 14px 16px 14px 44px;
          color: #f1f5f9;
          font-size: 14px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
        }
        .lp-input::placeholder { color: #334155; }
        .lp-input:focus {
          border-color: rgba(56,189,248,0.50);
          background: rgba(15,23,42,0.95);
          box-shadow: 0 0 0 3px rgba(56,189,248,0.10);
        }
        .lp-input-wrap:focus-within .lp-input-icon { color: #38bdf8; }

        /* ── Submit ── */
        .lp-submit {
          border: none;
          padding: 15px;
          border-radius: 10px;
          background: linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%);
          color: #020617;
          font-size: 13.5px;
          font-weight: 800;
          letter-spacing: 0.07em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          transition: filter 0.2s, box-shadow 0.2s;
          box-shadow: 0 6px 24px rgba(56,189,248,0.30);
          will-change: transform;
        }
        .lp-submit:hover:not(:disabled) {
          filter: brightness(1.08);
          box-shadow: 0 10px 32px rgba(56,189,248,0.45);
        }
        .lp-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        /* ── Footer ── */
        .lp-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .lp-footer-label { font-size: 12.5px; color: #475569; }
        .lp-footer-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 700;
          color: #38bdf8;
          font-family: 'Inter', sans-serif;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s;
        }
        .lp-footer-btn:hover { color: #7dd3fc; }

        /* ── Toast Error ── */
        @keyframes lp-toast-in {
          from { transform: translate(-50%, -120%); opacity: 0; }
          to   { transform: translate(-50%, 0);     opacity: 1; }
        }
        .lp-toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          padding: 13px 22px;
          border-radius: 12px;
          background: rgba(220,38,38,0.90);
          backdrop-filter: blur(16px);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 8px 28px rgba(220,38,38,0.4);
          border: 1px solid rgba(255,255,255,0.12);
          animation: lp-toast-in 0.38s cubic-bezier(0.16,1,0.3,1) forwards;
          white-space: nowrap;
        }

        /* ══════════════════════════════════════
           RIGHT PANEL — Energy Visualization
        ══════════════════════════════════════ */
        .login-hero-panel {
          flex: 1;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(ellipse 80% 70% at 50% 40%, rgba(14,165,233,0.12) 0%, transparent 70%),
            linear-gradient(160deg, #071428 0%, #020617 60%, #030a1e 100%);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Grid lines */
        .lp-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 85% 85% at 50% 50%, #000 50%, transparent 100%);
        }

        /* Center orb glow */
        .lp-orb {
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56,189,248,0.13) 0%, rgba(34,211,238,0.05) 45%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: lp-orb-pulse 4s ease-in-out infinite;
        }

        @keyframes lp-orb-pulse {
          0%,100% { transform: translate(-50%,-50%) scale(1);    opacity: 0.8; }
          50%      { transform: translate(-50%,-50%) scale(1.1); opacity: 1; }
        }

        /* Central icon cluster */
        .lp-center-cluster {
          position: relative;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .lp-main-icon {
          width: 96px;
          height: 96px;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(56,189,248,0.15), rgba(34,211,238,0.08));
          border: 1.5px solid rgba(56,189,248,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 60px rgba(56,189,248,0.20), 0 0 120px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.07);
          animation: lp-icon-float 3.5s ease-in-out infinite;
          backdrop-filter: blur(12px);
        }

        @keyframes lp-icon-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }

        .lp-center-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          color: rgba(56,189,248,0.7);
          text-transform: uppercase;
        }

        /* Rotating rings */
        .lp-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(56,189,248,0.12);
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
          pointer-events: none;
        }
        .lp-ring-1 { width: 200px; height: 200px; animation: lp-ring-spin 18s linear infinite; }
        .lp-ring-2 { width: 300px; height: 300px; border-color: rgba(34,211,238,0.08); animation: lp-ring-spin 28s linear infinite reverse; }
        .lp-ring-3 { width: 410px; height: 410px; border-color: rgba(56,189,248,0.05); animation: lp-ring-spin 38s linear infinite; }

        @keyframes lp-ring-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }

        /* Orbit dots */
        .lp-orbit-dot {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 10px rgba(56,189,248,0.8);
          top: 50%;
          transform-origin: 0 -100px;
          margin-top: -3.5px;
          margin-left: -3.5px;
          left: 50%;
          animation: lp-dot-orbit 18s linear infinite;
        }
        .lp-orbit-dot-2 {
          width: 5px;
          height: 5px;
          background: #22d3ee;
          box-shadow: 0 0 8px rgba(34,211,238,0.9);
          transform-origin: 0 -150px;
          margin-top: -2.5px;
          margin-left: -2.5px;
          animation: lp-dot-orbit2 28s linear infinite reverse;
          animation-delay: -8s;
        }

        @keyframes lp-dot-orbit  { to { transform: rotate(360deg)  translateX(-100px); } }
        @keyframes lp-dot-orbit2 { to { transform: rotate(-360deg) translateX(-150px); } }

        /* Stat cards floating */
        .lp-stat {
          position: absolute;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 12px;
          background: rgba(15,23,42,0.75);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(56,189,248,0.14);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 6;
        }
        .lp-stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp-stat-body { display: flex; flex-direction: column; gap: 2px; }
        .lp-stat-val  { font-size: 15px; font-weight: 800; color: #f1f5f9; line-height: 1; }
        .lp-stat-lbl  { font-size: 9.5px; font-weight: 600; letter-spacing: 0.09em; color: #475569; text-transform: uppercase; }

        .lp-stat-tl { top: 18%; left: 8%; animation: lp-stat-float 4s ease-in-out infinite; }
        .lp-stat-tr { top: 22%; right: 8%; animation: lp-stat-float 5s ease-in-out infinite; animation-delay: -1.5s; }
        .lp-stat-bl { bottom: 22%; left: 8%; animation: lp-stat-float 4.5s ease-in-out infinite; animation-delay: -2.5s; }
        .lp-stat-br { bottom: 18%; right: 8%; animation: lp-stat-float 5.5s ease-in-out infinite; animation-delay: -1s; }

        @keyframes lp-stat-float {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }

        /* Bottom tag */
        .lp-tag {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 20px;
          border-radius: 99px;
          background: rgba(56,189,248,0.07);
          border: 1px solid rgba(56,189,248,0.15);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: rgba(56,189,248,0.75);
          white-space: nowrap;
          z-index: 6;
          backdrop-filter: blur(8px);
        }
        .lp-tag-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #38bdf8;
          animation: lp-blink 1.5s ease-in-out infinite;
        }
        @keyframes lp-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.2; }
        }

        /* Misc */
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 0.9s linear infinite; }
        .anim-item { opacity: 0; }

        @media (max-width: 900px) {
          .login-hero-panel { display: none; }
          .login-form-wrap  { flex: 1; padding: 2.5rem 1.75rem; }
        }
        @media (max-width: 480px) {
          .lp-title        { font-size: 1.7rem; }
          .login-form-wrap { padding: 2rem 1.25rem; }
        }
      `}</style>

      <div className="lp-root">
        {error && (
          <div className="lp-toast">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {}
        <div className="login-form-wrap">
          <div className="lp-form-inner">

            {}
            <div className="lp-brand anim-item">
              <div className="lp-brand-icon"><Zap size={20} /></div>
              <div className="lp-brand-text">
                <span className="lp-brand-name">VOLTEDGE</span>
                <span className="lp-brand-sub">Energy Monitor</span>
              </div>
            </div>

            {}
            <div className="lp-heading anim-item">
              <h1 className="lp-title">Selamat <span>Datang</span><br/>Kembali</h1>
              <p className="lp-subtitle">Masuk untuk memantau konsumsi energi dan keamanan sistem Anda.</p>
            </div>

            <div className="lp-divider anim-item">
              <div className="lp-divider-line" />
              <div className="lp-divider-dot" />
              <div className="lp-divider-line" />
            </div>

            {}
            <form className="login-form" onSubmit={handleSubmit}>

              <div className="lp-field anim-item">
                <label className="lp-label" htmlFor="login-email">Email</label>
                <div className="lp-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    placeholder="nama@contoh.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="lp-input"
                    autoComplete="email"
                  />
                  <Mail size={16} className="lp-input-icon" />
                </div>
              </div>

              <div className="lp-field anim-item">
                <label className="lp-label" htmlFor="login-password">Password</label>
                <div className="lp-input-wrap">
                  <input
                    id="login-password"
                    type="password"
                    placeholder="Masukkan password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="lp-input"
                    autoComplete="current-password"
                  />
                  <Lock size={16} className="lp-input-icon" />
                </div>
              </div>

              <button
                ref={btnRef}
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="lp-submit anim-item"
                onMouseDown={onBtnDown}
                onMouseUp={onBtnUp}
                onMouseLeave={onBtnUp}
              >
                {loading
                  ? <Loader2 size={17} className="animate-spin" />
                  : <>MASUK <ArrowRight size={16} /></>
                }
              </button>

              <div className="lp-footer anim-item">
                <span className="lp-footer-label">Belum punya akun?</span>
                <button
                  id="go-to-register-btn"
                  type="button"
                  className="lp-footer-btn"
                  onClick={() => setPage('register')}
                >
                  Daftar Sekarang
                </button>
              </div>

            </form>
          </div>
        </div>

        {}
        <div className="login-hero-panel">
          <div className="lp-grid" />
          <div className="lp-orb" />

          {}
          <div className="lp-ring lp-ring-1" />
          <div className="lp-ring lp-ring-2" />
          <div className="lp-ring lp-ring-3" />

          {}
          <div className="lp-orbit-dot" />
          <div className="lp-orbit-dot lp-orbit-dot-2" />

          {}
          <div className="lp-center-cluster">
            <div className="lp-main-icon">
              <Zap size={44} color="#38bdf8" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 18px rgba(56,189,248,0.7))' }} />
            </div>
            <span className="lp-center-label">VoltEdge System</span>
          </div>

          {}
          <div className="lp-stat lp-stat-tl">
            <div className="lp-stat-icon" style={{ background: 'rgba(56,189,248,0.12)' }}>
              <Activity size={16} color="#38bdf8" />
            </div>
            <div className="lp-stat-body">
              <span className="lp-stat-val">220V</span>
              <span className="lp-stat-lbl">Tegangan</span>
            </div>
          </div>

          <div className="lp-stat lp-stat-tr">
            <div className="lp-stat-icon" style={{ background: 'rgba(34,211,238,0.12)' }}>
              <Zap size={16} color="#22d3ee" />
            </div>
            <div className="lp-stat-body">
              <span className="lp-stat-val">4.8A</span>
              <span className="lp-stat-lbl">Arus</span>
            </div>
          </div>

          <div className="lp-stat lp-stat-bl">
            <div className="lp-stat-icon" style={{ background: 'rgba(167,139,250,0.12)' }}>
              <Shield size={16} color="#a78bfa" />
            </div>
            <div className="lp-stat-body">
              <span className="lp-stat-val" style={{ color: '#22c55e' }}>Aman</span>
              <span className="lp-stat-lbl">Status</span>
            </div>
          </div>

          <div className="lp-stat lp-stat-br">
            <div className="lp-stat-icon" style={{ background: 'rgba(96,165,250,0.12)' }}>
              <Cpu size={16} color="#60a5fa" />
            </div>
            <div className="lp-stat-body">
              <span className="lp-stat-val">1.05 kWh</span>
              <span className="lp-stat-lbl">Konsumsi</span>
            </div>
          </div>

          {}
          <div className="lp-tag">
            <div className="lp-tag-dot" />
            MONITORING REAL-TIME AKTIF
          </div>
        </div>

      </div>
    </>
  )
}
