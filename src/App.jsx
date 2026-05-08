import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, X, Check, XCircle } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import Topbar  from './components/layout/Topbar'
import DeviceSelectPage  from './pages/DeviceSelectPage'
import LoginPage         from './pages/LoginPage'
import RegisterPage      from './pages/RegisterPage'
import DashboardPage     from './pages/DashboardPage'
import MonitoringPage    from './pages/MonitoringPage'
import HistoryPage       from './pages/HistoryPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage      from './pages/SettingsPage'
import { NOTIFICATIONS_DATA } from './utils/mockData'

const PUBLIC = ['login', 'register']
const API    = 'http://localhost:5000'

export default function App() {
  const [isAuth,    setIsAuth]    = useState(() => localStorage.getItem('voltEdge_isAuth') === 'true')
  const [page,      setPage]      = useState(() => {
    if (localStorage.getItem('voltEdge_isAuth') !== 'true') return 'login'
    return localStorage.getItem('voltEdge_activePage') || 'devices'
  })
  const [collapsed, setCollapsed] = useState(false)
  const [notifs,    setNotifs]    = useState(NOTIFICATIONS_DATA)

  // ── Global user state — single source of truth ──
  const [user, setUser] = useState({
    id:    localStorage.getItem('voltEdge_userId')    || '',
    name:  localStorage.getItem('voltEdge_userName')  || '',
    email: localStorage.getItem('voltEdge_userEmail') || '',
    photo: null,
  })

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 900px)').matches || window.innerWidth <= 900
  })

  // ── Fetch fresh user data dari backend saat app load ──
  useEffect(() => {
    const userId = localStorage.getItem('voltEdge_userId')
    if (!userId || !isAuth) return

    fetch(`${API}/api/auth/profile/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          const fresh = {
            id:    data.user.id,
            name:  data.user.name  || '',
            email: data.user.email || '',
            photo: data.user.photo || null,
          }
          // Update global state & localStorage sekaligus
          setUser(fresh)
          localStorage.setItem('voltEdge_userName',  fresh.name)
          localStorage.setItem('voltEdge_userEmail', fresh.email)
        }
      })
      .catch(() => {}) // Fail silently, gunakan data cache
  }, [isAuth])

  // ── Global Alert System ──
  const [globalAlert, setGlobalAlert] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [userChecked, setUserChecked] = useState(false)
  const alarmRef = useRef(null)

  const playAlarm = () => {
    // Selalu buat instance Audio baru agar tidak ada masalah
    // replay setelah pause pada browser modern
    if (!alarmRef.current) {
      alarmRef.current = new Audio('/assets/alarm.mp3')
      alarmRef.current.loop = true
    }
    // Reset ke awal sebelum play, hindari NotAllowedError pada replay
    alarmRef.current.currentTime = 0
    alarmRef.current.play().catch((err) => {
      console.warn("Autoplay audio diblokir browser:", err)
    })
  }
  const stopAlarm = () => {
    if (alarmRef.current) {
      alarmRef.current.pause()
      alarmRef.current.currentTime = 0
      // ← Null-kan ref agar instance baru dibuat saat alert berikutnya
      // Ini mencegah browser menolak .play() pada instance bekas pause()
      alarmRef.current = null
    }
  }

  useEffect(() => {
    // showConfirm TIDAK ikut kondisi — alarm tetap bunyi saat dialog
    // konfirmasi terbuka. Hanya userChecked yang matikan alarm.
    if (globalAlert && !userChecked) {
      playAlarm()
    } else {
      stopAlarm()
    }
  }, [globalAlert, userChecked])

  useEffect(() => {
    if (!isAuth) return
    const pollAlerts = async () => {
      const deviceId = localStorage.getItem('voltEdge_activeDeviceId')
      if (!deviceId) return
      try {
        const res = await fetch(`${API}/api/devices/${deviceId}/alerts`)
        const data = await res.json()
        if (data.alertState) {
          const { gas, current, relayActive } = data.alertState
          const limit = data.limit || 5
          const gasVal = parseInt(gas || 0)
          const currVal = parseFloat(current || 0)
          
          const isDanger = relayActive || gasVal >= 3000 || currVal > limit
          
          if (isDanger) {
             const type = (gasVal >= 3000 || (relayActive && gasVal > 2000)) ? 'gas' : 'overload'
             setGlobalAlert(prev => {
                if (!prev) {
                  return { 
                    type, 
                    title: type === 'gas' ? 'ASAP/GAS BERBAHAYA!' : 'OVERLOAD TERDETEKSI!', 
                    msg: type === 'gas' ? `MQ-2 mendeteksi bahaya gas/asap (nilai: ${gasVal}). Relay telah diputus.` : `Arus listrik terdeteksi tinggi. Relay telah diputus otomatis.`, 
                    time: new Date().toLocaleTimeString('id-ID') 
                  }
                }
                return prev
             })
          } else {
             // Hardware normal
             setGlobalAlert(null)
             setShowConfirm(false)
             setUserChecked(false)
             stopAlarm()
          }
        }
      } catch (err) {}
    }
    const interval = setInterval(pollAlerts, 2000)
    return () => clearInterval(interval)
  }, [isAuth])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.matchMedia('(max-width: 900px)').matches || window.innerWidth <= 900)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const addNotification = (title, msg, type = 'info') => {
    setNotifs(prev => [{
      id: Date.now() + Math.random().toString(),
      title, msg, time: 'Baru saja', type, read: false
    }, ...prev])
  }

  const navigate = (p) => {
    if (!PUBLIC.includes(p) && !isAuth) {
      localStorage.setItem('voltEdge_activePage', 'login')
      setPage('login')
      return
    }
    localStorage.setItem('voltEdge_activePage', p)
    setPage(p)
  }

  // ── Dipanggil LoginPage/RegisterPage setelah sukses ──
  const handleLoginSuccess = (userData) => {
    const u = {
      id:    userData.id    || localStorage.getItem('voltEdge_userId')    || '',
      name:  userData.name  || localStorage.getItem('voltEdge_userName')  || '',
      email: userData.email || localStorage.getItem('voltEdge_userEmail') || '',
      photo: userData.photo || null,
    }
    setUser(u)
    localStorage.setItem('voltEdge_isAuth',    'true')
    localStorage.setItem('voltEdge_userId',    u.id)
    localStorage.setItem('voltEdge_userName',  u.name)
    localStorage.setItem('voltEdge_userEmail', u.email)
    setIsAuth(true)
    navigate('devices')
  }

  // ── Dipanggil Settings/Profile page saat update berhasil ──
  const updateUser = (updater) => {
    setUser(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next.name  !== undefined) localStorage.setItem('voltEdge_userName',  next.name)
      if (next.email !== undefined) localStorage.setItem('voltEdge_userEmail', next.email)
      return next
    })
  }

  const unread = notifs.filter(n => !n.read).length

  // ── Public pages (no layout) ──
  if (PUBLIC.includes(page)) {
    return (
      <>
        {page === 'login'    && <LoginPage    setPage={navigate} onLogin={handleLoginSuccess} />}
        {page === 'register' && <RegisterPage setPage={navigate} onRegister={handleLoginSuccess} />}
      </>
    )
  }

  // ── No-Layout Protected Pages ──
  if (page === 'devices') {
    return <DeviceSelectPage setPage={navigate} user={user} />
  }

  // ── Protected app shell ──
  return (
    <div style={{ position: 'relative', display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#020617', paddingBottom: isMobile ? 60 : 0 }}>
      {/* Background overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url("/assets/monitoring.avif")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.20, pointerEvents: 'none', zIndex: 0 }} />

      {/* ═══════════ GLOBAL ALERT MODAL (CENTER) ═══════════ */}
      {globalAlert && !userChecked && (() => {
        const isGas     = globalAlert.type === 'gas'
        const accent    = isGas ? '#F97316' : '#EF4444'
        const accentRgb = isGas ? '249,115,22' : '239,68,68'
        const accentBg  = `rgba(${accentRgb},0.12)`
        const accentBdr = `rgba(${accentRgb},0.35)`
        const accentGlw = `rgba(${accentRgb},0.25)`
        const label     = isGas ? 'GAS / ASAP' : 'OVERLOAD'
        const icon      = isGas ? '🔥' : '⚡'

        return (
          <>
            {/* Backdrop */}
            <div style={{
              position: 'fixed', inset: 0, zIndex: 99998,
              background: 'rgba(2,6,23,0.82)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'backdropIn 0.3s ease',
            }} />

            {/* Modal */}
            <div style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
              pointerEvents: 'none',
            }}>
              <div style={{
                pointerEvents: 'all',
                width: '100%', maxWidth: 480,
                background: 'linear-gradient(160deg, rgba(15,23,42,0.98) 0%, rgba(7,12,30,0.99) 100%)',
                border: `1px solid ${accentBdr}`,
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: `0 0 0 1px ${accentBdr}, 0 32px 80px rgba(0,0,0,0.7), 0 0 80px ${accentGlw}`,
                animation: 'modalIn 0.4s cubic-bezier(0.16,1,0.3,1)',
                position: 'relative',
              }}>

                {/* Animated top accent bar */}
                <div style={{
                  height: 4,
                  background: `linear-gradient(90deg, transparent, ${accent}, ${accent}, transparent)`,
                  animation: 'shimmer 2s linear infinite',
                  backgroundSize: '200% 100%',
                }} />

                {/* Pulsing glow behind icon */}
                <div style={{
                  position: 'absolute', top: 40, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${accentGlw} 0%, transparent 70%)`,
                  animation: 'glowPulse 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />

                {/* Body */}
                <div style={{ padding: '28px 28px 24px' }}>

                  {/* Icon + Badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: accentBg,
                      border: `2px solid ${accentBdr}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 30,
                      animation: 'ringPulse 1.2s ease-in-out infinite',
                      position: 'relative',
                      zIndex: 1,
                    }}>
                      {icon}
                    </div>

                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      background: accentBg, border: `1px solid ${accentBdr}`,
                      borderRadius: 100, padding: '4px 14px',
                    }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: accent, animation: 'blink 1s step-start infinite',
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: accent, letterSpacing: '0.12em' }}>
                        {label} TERDETEKSI
                      </span>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 20, fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        {globalAlert.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 4 }}>
                        Terdeteksi pukul <strong style={{ color: '#94A3B8' }}>{globalAlert.time}</strong> · VoltEdge Safety System
                      </p>
                    </div>
                  </div>

                  {/* Alert message box */}
                  <div style={{
                    background: accentBg,
                    border: `1px solid ${accentBdr}`,
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 16,
                  }}>
                    <p style={{ fontSize: 12.5, color: '#CBD5E1', lineHeight: 1.65 }}>
                      {globalAlert.msg}
                    </p>
                  </div>

                  {/* Action steps */}
                  {!showConfirm ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                        {[
                          { step: '01', text: 'Jauhi area sekitar perangkat segera' },
                          { step: '02', text: 'Tekan tombol fisik pada ESP32 untuk reset relay' },
                          { step: '03', text: 'Pastikan kondisi aman sebelum menyalakan kembali' },
                        ].map(({ step, text }) => (
                          <div key={step} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            borderRadius: 10, padding: '9px 14px',
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 900, color: accent,
                              fontFamily: 'monospace', minWidth: 20,
                            }}>{step}</span>
                            <span style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>{text}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowConfirm(true)}
                        style={{
                          width: '100%', padding: '13px 0', borderRadius: 12,
                          border: `1px solid ${accentBdr}`,
                          background: `linear-gradient(135deg, rgba(${accentRgb},0.2), rgba(${accentRgb},0.08))`,
                          color: accent, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          transition: 'all 0.2s', letterSpacing: '0.02em',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.25)`; e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, rgba(${accentRgb},0.2), rgba(${accentRgb},0.08))`; e.currentTarget.style.transform = 'translateY(0)' }}
                      >
                        <Check size={15} />
                        Sudah Cek Hardware — Matikan Alarm
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{
                        background: 'rgba(250,204,21,0.08)',
                        border: '1px solid rgba(250,204,21,0.25)',
                        borderRadius: 12, padding: '12px 16px',
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                      }}>
                        <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                        <p style={{ fontSize: 12.5, color: '#FDE68A', lineHeight: 1.6 }}>
                          Konfirmasi bahwa Anda sudah <strong>memeriksa hardware secara langsung</strong> dan kondisi sudah aman. Alarm akan dimatikan.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={() => { setUserChecked(true); setShowConfirm(false) }}
                          style={{
                            flex: 1, padding: '12px 0', borderRadius: 12,
                            border: `1px solid ${accentBdr}`,
                            background: `rgba(${accentRgb},0.18)`,
                            color: accent, fontWeight: 800, fontSize: 12.5, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = `rgba(${accentRgb},0.28)`}
                          onMouseLeave={e => e.currentTarget.style.background = `rgba(${accentRgb},0.18)`}
                        >
                          <Check size={14} /> Ya, Aman
                        </button>
                        <button
                          onClick={() => setShowConfirm(false)}
                          style={{
                            flex: 1, padding: '12px 0', borderRadius: 12,
                            border: '1px solid rgba(148,163,184,0.15)',
                            background: 'rgba(148,163,184,0.06)',
                            color: '#64748B', fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(148,163,184,0.12)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(148,163,184,0.06)'}
                        >
                          <XCircle size={14} /> Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )
      })()}

      <style>{`
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(20px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
          50%       { opacity: 1;   transform: translateX(-50%) scale(1.15); }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(var(--alert-rgb, 239,68,68), 0.4); }
          50%       { box-shadow: 0 0 0 14px rgba(var(--alert-rgb, 239,68,68), 0); }
        }
        @keyframes shimmer {
          from { background-position: 200% center; }
          to   { background-position: -200% center; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>


      <Sidebar
        page={page} setPage={navigate}
        collapsed={collapsed} setCollapsed={setCollapsed}
        notifCount={unread} isMobile={isMobile}
        user={user}
      />

      <div className="app-main-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar page={page} setPage={navigate} notifCount={unread} user={user} />

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: isMobile ? '1rem' : '1.25rem 1.5rem', scrollBehavior: 'smooth' }}>
          {page === 'dashboard'     && <DashboardPage addNotification={addNotification} />}
          {page === 'monitoring'    && <MonitoringPage />}
          {page === 'history'       && <HistoryPage />}
          {page === 'notifications' && <NotificationsPage notifs={notifs} setNotifs={setNotifs} />}
          {page === 'settings'      && <SettingsPage user={user} onUpdateUser={updateUser} />}
        </main>
      </div>
    </div>
  )
}