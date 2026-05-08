import { Zap, LayoutDashboard, Settings, Bell, LogOut, ChevronLeft, Cpu } from 'lucide-react'

export default function Sidebar({ page, setPage, collapsed, setCollapsed, notifCount, isMobile, user }) {
  const MENU = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'notifications', icon: Bell, label: 'Notifikasi', badge: notifCount },
    { id: 'settings', icon: Settings, label: 'Pengaturan' },
  ]
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?'

  // If Mobile, force a strictly sized bottom layout that escapes flex rules!
  const sidebarStyle = isMobile 
    ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 64, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.05)',
        zIndex: 50, display: 'flex', flexDirection: 'column'
      }
    : {
        width: collapsed ? 80 : 250, height: '100vh',
        background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRight: '1px solid rgba(255,255,255,0.05)',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 40
      }

  return (
    <aside style={sidebarStyle}>
      
      {/* DESKTOP LOGO */}
      {!isMobile && (
        <div 
          onClick={() => collapsed && setCollapsed(false)}
          style={{ padding: '1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', cursor: collapsed ? 'pointer' : 'default' }}
          title={collapsed ? "Buka Sidebar" : ""}
        >
          <div className="gradient-electric" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={17} color="#fff" />
          </div>
          {!collapsed && (
            <div style={{ flexShrink: 0 }}>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.1 }}>VoltEdge</h1>
              <p style={{ fontSize: 10, color: '#38BDF8', fontWeight: 600 }}>IoT Monitor</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="glass-card" style={{ marginLeft: 'auto', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', color: '#64748B' }}>
              <ChevronLeft size={14} />
            </button>
          )}
        </div>
      )}

      {/* MAGIC NAVIGATION (FLEX ROW ON MOBILE, COLUMN ON DESKTOP) */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'row' : 'column', justifyContent: isMobile ? 'space-around' : 'flex-start', padding: isMobile ? 0 : '1rem 0.5rem', gap: isMobile ? 0 : 6 }}>
        {MENU.map(({ id, icon: Icon, label, badge }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              style={{
                position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: isMobile ? 'center' : (collapsed ? 'center' : 'flex-start'),
                gap: isMobile ? 4 : 10, padding: isMobile ? '8px 0' : '10px 14px', borderRadius: isMobile ? 0 : 12, border: 'none', background: active && !isMobile ? 'rgba(56,189,248,0.1)' : 'transparent',
                color: active ? '#38BDF8' : '#475569', cursor: 'pointer', flex: isMobile ? 1 : 'none', height: isMobile ? '100%' : 'auto', minHeight: isMobile ? 'auto' : 42,
                transition: 'all 0.2s', overflow: 'hidden'
              }}
            >
              {/* Active Indicator Line matches orientation */}
              {active && isMobile && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 24, height: 4, background: '#38BDF8', borderRadius: '0 0 4px 4px', boxShadow: '0 0 10px rgba(56,189,248,0.6)' }} />}
              {active && !isMobile && <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 4, height: 26, background: '#38BDF8', borderRadius: '0 4px 4px 0', boxShadow: '0 0 10px rgba(56,189,248,0.6)' }} />}

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Icon size={isMobile ? 20 : 18} />
                {badge > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#38BDF8', color: '#020617', fontSize: 8, fontWeight: 800, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0f172a' }}>
                    {badge}
                  </span>
                )}
              </div>
              
              {(!collapsed || isMobile) && (
                <span style={{ fontSize: isMobile ? 10 : 13, fontWeight: isMobile ? 700 : 600, color: active ? '#f1f5f9' : '#64748B', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* DESKTOP USER PROFILE & LOGOUT */}
      {!isMobile && (
        <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0.75rem', borderRadius: 12, background: 'rgba(255,255,255,0.03)' }}>
              <div className="gradient-electric" style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#020617', overflow: 'hidden' }}>
                {user?.photo ? <img src={user.photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name || 'Loading...'}</p>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: 4 }}>
            <button
              onClick={() => setPage('login')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 12, border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent' }}
              title="Logout"
            >
              <LogOut size={16} />
              {!collapsed && <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Logout</span>}
            </button>
            <button
              onClick={() => setPage('devices')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 12, border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#38BDF8'; e.currentTarget.style.background = 'rgba(56,189,248,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'transparent' }}
              title="Pairing Node"
            >
              <Cpu size={16} />
              {!collapsed && <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>Pairing</span>}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
