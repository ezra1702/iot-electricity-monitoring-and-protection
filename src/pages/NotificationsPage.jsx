import { useState, useRef, useEffect } from 'react'
import { Bell, Info, AlertTriangle, ShieldCheck, CheckCheck, Filter } from 'lucide-react'
import { pageEntrance, staggerFadeIn } from '../utils/animations'

export default function NotificationsPage({ notifs, setNotifs }) {
  const [filter, setFilter] = useState('all')
  const pageRef = useRef(null)

  useEffect(() => { pageEntrance('#notif-page') }, [])

  const filtered = notifs.filter(n => filter === 'all' || n.type === filter)

  const markAllRead = () => {
    setNotifs(p => p.map(n => ({ ...n, read: true })))
  }

  const ICONS = {
    danger:  <AlertTriangle size={16} color="#EF4444" />,
    warning: <AlertTriangle size={16} color="#F59E0B" />,
    success: <ShieldCheck   size={16} color="#22C55E" />,
    info:    <Info          size={16} color="#38BDF8" />
  }

  const BGS = {
    danger:  'rgba(239,68,68,0.1)',
    warning: 'rgba(245,158,11,0.1)',
    success: 'rgba(34,197,94,0.1)',
    info:    'rgba(56,189,248,0.1)'
  }

  return (
    <div id="notif-page" ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {}
      <div className="a-title" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Notifikasi Sistem</h2>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>Log Peringatan dan Aktivitas Terbaru</p>
        </div>
        <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#38BDF8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>
          <CheckCheck size={14} /> Tandai semua dibaca
        </button>
      </div>

      {}
      <div className="a-metric" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { id: 'all',     label: 'Semua',   c: '#94A3B8' },
          { id: 'danger',  label: 'Kritis',  c: '#EF4444' },
          { id: 'warning', label: 'Warning', c: '#F59E0B' },
          { id: 'info',    label: 'Info',    c: '#38BDF8' },
        ].map(f => (
          <button 
            key={f.id} 
            onClick={() => setFilter(f.id)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, 
              padding: '6px 14px', borderRadius: 99, cursor: 'pointer',
              border: filter === f.id ? `1px solid ${f.c}60` : '1px solid rgba(255,255,255,0.05)',
              background: filter === f.id ? `${f.c}15` : 'transparent',
              color: filter === f.id ? f.c : '#64748B', whiteSpace: 'nowrap'
            }}
          >
            {f.id === 'all' && <Filter size={12} />}
            {f.label}
          </button>
        ))}
      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(n => (
          <div 
            key={n.id} 
            onClick={() => setNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x))}
            className="a-list glass-card" 
            style={{ display: 'flex', gap: 14, padding: '1rem', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', opacity: n.read ? 0.7 : 1 }}
          >
            {}
            {!n.read && <div style={{ position: 'absolute', top: 12, right: 12, width: 6, height: 6, borderRadius: '50%', background: '#38BDF8', boxShadow: '0 0 6px rgba(56,189,248,0.6)' }} />}
            
            {}
            <div style={{ width: 34, height: 34, borderRadius: 10, background: BGS[n.type], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {ICONS[n.type]}
            </div>
            
            {}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: !n.read ? '#f1f5f9' : '#e2e8f0' }}>{n.title}</h4>
                <span style={{ fontSize: 10, color: '#475569' }}>{n.time}</span>
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
                {n.msg}
              </p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ padding: '2rem', textAlign: 'center', fontSize: 13, color: '#475569', gridColumn: '1 / -1' }}>
            Tidak ada notifikasi dalam kategori ini.
          </p>
        )}
      </div>
    </div>
  )
}
