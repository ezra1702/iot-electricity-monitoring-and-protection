import { useState, useEffect } from 'react'
import { Bell, Clock } from 'lucide-react'

const PAGE_TITLES = {
  dashboard:     { title: 'Dashboard',          sub: 'Ringkasan Telemetry Perangkat' },
  history:       { title: 'History & Logs',     sub: 'Riwayat data sensor dan event sistem' },
  notifications: { title: 'Notifikasi',         sub: 'Alert dan pemberitahuan sistem' },
  settings:      { title: 'Pengaturan',         sub: 'Konfigurasi profil dan parameter sistem' },
}

export default function Topbar({ page, setPage, notifCount = 0, user }) {
  const { title, sub } = PAGE_TITLES[page] || PAGE_TITLES.dashboard
  const [time, setTime] = useState(new Date())
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?'

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '16px 24px',
      background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.05)', zIndex: 10
    }}>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>{title}</h1>
        <p style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</p>
      </div>

      {}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', color: '#94A3B8', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
        <Clock size={12} color="#38BDF8" />
        {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':')}
      </div>

      <button
        onClick={() => setPage('notifications')}
        style={{ position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '7px 8px', cursor: 'pointer', color: notifCount > 0 ? '#38BDF8' : '#475569', display: 'flex' }}
      >
        <Bell size={17} />
        {notifCount > 0 && (
          <span style={{ position: 'absolute', top: -4, right: -4, width: 15, height: 15, background: '#38BDF8', color: '#020617', fontSize: 9, fontWeight: 800, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {notifCount}
          </span>
        )}
      </button>

      {}
      <div className="gradient-electric" style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#020617', cursor: 'pointer', border: '1px solid rgba(15,23,42,0.9)', overflow: 'hidden' }}>
        {user?.photo ? <img src={user.photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
      </div>
    </header>
  )
}
