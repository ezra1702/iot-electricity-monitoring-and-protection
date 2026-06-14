import { useState, useEffect, useRef } from 'react'
import { Zap, ChevronRight, ArrowRight, Shield, Activity, BarChart3, Wifi, Github } from 'lucide-react'
import { pageEntrance, btnPress } from '../utils/animations'

const FEATURES = [
  { icon: Activity,  title: 'Real-Time Monitoring', desc: 'Pantau voltage, arus, daya, dan energi setiap 2 detik langsung dari sensor PZEM-004T & MQ-2.', color: '#38BDF8' },
  { icon: Shield,    title: 'Proteksi Otomatis',    desc: 'Trip relay otomatis saat overload atau asap terdeteksi. Sistem alert berlapis untuk keamanan maksimal.', color: '#22D3EE' },
  { icon: BarChart3, title: 'Analitik & Riwayat',     desc: 'Grafik pemantauan tegangan, arus, daya, dan riwayat kumulatif pemakaian energi listrik harian dan bulanan.', color: '#60A5FA' },
  { icon: Wifi,      title: 'IoT via ESP32',         desc: 'Integrasi penuh dengan ESP32 menggunakan protokol MQTT untuk data realtime yang andal.', color: '#A78BFA' },
]

const STATS = [
  { val: '99.9%', label: 'Uptime' },
  { val: '<2s',   label: 'Latency' },
  { val: '50+',   label: 'Metrik' },
  { val: '24/7',  label: 'Monitor' },
]

export default function LandingPage({ setPage }) {
  const [tick, setTick] = useState(0)
  const btnRef = useRef(null)

  useEffect(() => {
    pageEntrance('#landing-page')
    const t = setInterval(() => setTick(p => p + 1), 2000)
    return () => clearInterval(t)
  }, [])

  const handleCTA = (target) => {
    btnPress(btnRef.current)
    setTimeout(() => setPage(target), 150)
  }

  return (
    <div id="landing-page" style={{ minHeight: '100vh', background: '#020617', overflowY: 'auto', position: 'relative' }}>

      {}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', top: '45%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%)' }} />
      </div>

      {}
      <nav className="a-title" style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="gradient-electric animate-pulse-glow" style={{ width: 38, height: 38, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={19} color="#fff" />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#f1f5f9' }}>VoltEdge</span>
            <span style={{ fontSize: 10, color: '#38BDF8', marginLeft: 8.8 }}>IoT v2.0</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setPage('login')} style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 9, transition: 'color 0.18s' }} onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>Login</button>
          <button onClick={() => setPage('register')} className="gradient-electric" style={{ fontSize: 13, fontWeight: 700, color: '#020617', border: 'none', cursor: 'pointer', padding: '8px 20px', borderRadius: 10, boxShadow: '0 0 16px rgba(56,189,248,0.35)' }}>Daftar Gratis</button>
        </div>
      </nav>

      {}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '6rem 1.5rem 4rem', maxWidth: 900, margin: '0 auto' }}>
        <div className="a-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38BDF8', fontSize: 12, fontWeight: 600, marginBottom: 28 }}>
          <Zap size={11} />
          IoT Electricity Monitoring System · ESP32 + PZEM-004T + MQ-2
        </div>

        <h1 className="a-title" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 900, lineHeight: 1.08, color: '#f1f5f9', marginBottom: 24 }}>
          Monitor Listrik<br />
          <span className="text-gradient-electric">Lebih Cerdas</span>
        </h1>

        <p className="a-title" style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: '#64748B', lineHeight: 1.75, maxWidth: 600, margin: '0 auto 40px' }}>
          Dashboard IoT real-time untuk monitoring <strong style={{ color: '#94A3B8' }}>tegangan, arus, daya, dan energi</strong>. Dilengkapi proteksi otomatis dan visualisasi grafik fluktuasi real-time.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 64 }}>
          <button ref={btnRef} onClick={() => handleCTA('dashboard')} className="a-metric" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, fontSize: 15, fontWeight: 700, color: '#020617', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #38BDF8, #22D3EE)', boxShadow: '0 0 24px rgba(56,189,248,0.4)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            Lihat Dashboard <ArrowRight size={17} />
          </button>
          <button onClick={() => setPage('login')} className="a-metric" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, fontSize: 15, fontWeight: 600, color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#f1f5f9' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' }}>
            Login <ChevronRight size={16} />
          </button>
        </div>

        {}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 600, margin: '0 auto 80px' }}>
          {STATS.map(s => (
            <div key={s.label} className="a-metric glass-card" style={{ padding: '1rem', textAlign: 'center' }}>
              <div className="text-gradient-electric" style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, textAlign: 'left' }}>
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="a-chart glass-card" style={{ padding: '1.5rem', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${f.color}18` }} onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon size={20} color={f.color} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            )
          })}
        </div>

        {}
        <div className="a-chart glass-card" style={{ padding: '2.5rem', marginTop: 48, textAlign: 'center' }}>
          <h3 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>Siap Mulai Monitoring?</h3>
          <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 24 }}>Sambungkan ESP32 Anda ke MQTT broker dan mulai pantau instalasi listrik secara real-time.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setPage('register')} className="gradient-electric" style={{ fontSize: 13, fontWeight: 700, color: '#020617', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 12, boxShadow: '0 0 20px rgba(56,189,248,0.35)' }}>Buat Akun Gratis</button>
            <button onClick={() => setPage('dashboard')} style={{ fontSize: 13, fontWeight: 600, color: '#38BDF8', border: '1px solid rgba(56,189,248,0.3)', cursor: 'pointer', padding: '12px 28px', borderRadius: 12, background: 'rgba(56,189,248,0.06)' }}>Demo Dashboard</button>
          </div>
        </div>

        {}
        <p style={{ marginTop: 40, fontSize: 11, color: '#334155' }}>VoltEdge IoT Monitor · ESP32 + PZEM-004T + MQ-2 · Data Simulator Mode</p>
      </div>
    </div>
  )
}
