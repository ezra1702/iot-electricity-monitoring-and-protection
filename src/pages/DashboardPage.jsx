import { useState, useEffect, useRef } from 'react'
import { Zap, Activity, BatteryCharging, Shield, Gauge, AlertTriangle, TrendingUp, History, Download, Calendar, X, Loader2, Sparkles } from 'lucide-react'
import MetricCard from '../components/cards/MetricCard'
import VoltageLineChart from '../components/charts/VoltageLineChart'
import PowerRadarChart from '../components/charts/PowerRadarChart'
import Chart from 'react-apexcharts'
import { pageEntrance } from '../utils/animations'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Selamat Pagi'
  if (hour >= 12 && hour < 15) return 'Selamat Siang'
  if (hour >= 15 && hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
}


function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center' }}>{children}</div>
      {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, sub, children, actions, alert }) {
  return (
    <div className="a-chart glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionTitle sub={sub}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {title}
            {alert && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', animation: 'blink 1s ease infinite' }} />}
          </span>
        </SectionTitle>
        {actions}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

export default function DashboardPage({ addNotification, metrics, logs, deviceInfo, costToday, dailyKwh, monthlyKwh, latestEnergy }) {
  const userName = localStorage.getItem('voltEdge_userName') || 'Admin'

  useEffect(() => {
    pageEntrance('#dash-page')
  }, [])

  const downloadCSV = () => {
    const header = "Waktu,Tegangan (V),Arus (A),Daya (W),Energi (kWh),Status\n"
    const csv = logs.map(r => `${r.time},${r.voltage},${r.current},${r.power},${r.energy},${r.status}`).join("\n")
    const blob = new Blob([header + csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('href', url)
    a.setAttribute('download', 'volt_edge_log.csv')
    a.click()
  }



  const priceKwh = deviceInfo ? parseFloat(deviceInfo.price_per_kwh) : 1444.70
  
  const monthlyCost = monthlyKwh * priceKwh

  return (
    <div id="dash-page" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
        

        <div className="a-title" style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                {getGreeting()}, <span style={{ color: '#38BDF8' }}>{userName}</span>
              </h2>
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 3 }}>
                Monitoring Panel: <strong style={{color: '#fff'}}>{deviceInfo ? deviceInfo.name : 'Unknown Device'}</strong>
              </p>
            </div>
          </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {}
        <div className="a-metric" style={{
          padding: '1.5rem',
          background: 'rgba(34,197,94,0.07)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E', letterSpacing: '0.05em' }}>BIAYA HARI INI</span>
            {}
            <span style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#22C55E',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              opacity: 0.9,
              textShadow: '0 0 16px rgba(34,197,94,0.5)',
            }}>Rp</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#94A3B8' }}>Rp</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9' }}>{costToday.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Kalkulasi dari {dailyKwh.toFixed(4)} kWh hari ini</p>
          {}
          <span style={{
            position: 'absolute', right: -8, bottom: -10,
            fontSize: 90, fontWeight: 900, color: 'rgba(34,197,94,0.06)',
            lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          }}>Rp</span>
        </div>

        {}
        <div className="a-metric" style={{
          padding: '1.5rem',
          background: 'rgba(56,189,248,0.07)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(56,189,248,0.18)',
          borderRadius: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', letterSpacing: '0.05em' }}>TOTAL BULAN INI (BERJALAN)</span>
            {}
            <Calendar size={26} color="#38BDF8" style={{ opacity: 0.85, filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.5))' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#94A3B8' }}>Rp</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9' }}>{monthlyCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Akumulasi dari {monthlyKwh.toFixed(4)} kWh bulan ini</p>
          {}
          <div style={{ position: 'absolute', right: -4, bottom: -8, opacity: 0.06, pointerEvents: 'none' }}>
            <Calendar size={90} color="#38BDF8" />
          </div>
        </div>


      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
        <MetricCard label="Tegangan"     value={metrics.voltage}     unit="V"   icon={Activity}       accent="#38BDF8" trend={0.4}  decimals={1} />
        <MetricCard label="Arus Live"    value={metrics.current}     unit="A"   icon={Zap}            accent="#22D3EE" trend={-1.1} decimals={2} />
        <MetricCard label="Daya Aktif"   value={metrics.power}       unit="W"   icon={BatteryCharging} accent="#60A5FA" trend={2.0}  decimals={0} />
        <MetricCard label="Cos Phi (PF)" value={metrics.powerFactor} unit=""    icon={Shield}         accent="#0EA5E9" decimals={2} />
        <MetricCard label="Total Energi" value={latestEnergy}            unit="kWh" icon={History}        accent="#A78BFA" decimals={4} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '2 1 500px', minWidth: 320 }}>
          <ChartCard title="Gelombang Arus & Tegangan" sub="Monitoring fluktuasi parameter real-time">
            <div style={{ minHeight: 280, marginTop: 14 }}>
              <VoltageLineChart logs={logs} />
            </div>
          </ChartCard>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 320 }}>
          <ChartCard title="Kesehatan Sensor" sub="Area parameter normal (Radar)">
            <div style={{ minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PowerRadarChart voltage={metrics.voltage} current={metrics.current} power={metrics.power} powerFactor={metrics.powerFactor} />
            </div>
          </ChartCard>
        </div>
      </div>



      <div className="a-chart" style={{ gridColumn: '1 / -1' }}>
        <ChartCard 
          title="Raw Telemetry Data" 
          sub="Log histori dari MySQL (Live Update)"
          actions={
            <button onClick={downloadCSV} className="gradient-electric" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 700, color: '#020617', cursor: 'pointer', boxShadow: '0 0 16px rgba(56,189,248,0.3)' }}>
              <Download size={14} /> Download CSV
            </button>
          }
        >
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#64748B', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>WAKTU</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>TEGANGAN (V)</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>ARUS (A)</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>DAYA AKTIF (W)</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>TOTAL ENERGI (kWh)</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  let badge = { b: 'rgba(34,197,94,0.1)', c: '#22C55E' }
                  if (log.status === 'Overload') badge = { b: 'rgba(245,158,11,0.1)', c: '#F59E0B' }
                  
                  return (
                  <tr key={log.id} className="a-list" style={{ borderBottom: '1px dashed rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 8px', color: '#94A3B8', fontWeight: 500 }}>{log.time}</td>
                    <td style={{ padding: '12px 8px', color: '#38BDF8', fontWeight: 600 }}>{log.voltage}</td>
                    <td style={{ padding: '12px 8px', color: '#22D3EE', fontWeight: 600 }}>{log.current}</td>
                    <td style={{ padding: '12px 8px', color: '#e2e8f0' }}>{log.power}</td>
                    <td style={{ padding: '12px 8px', color: '#A78BFA', fontWeight: 700 }}>{log.energy}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ padding: '4px 8px', background: badge.b, color: badge.c, borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{log.status.toUpperCase()}</span>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
      </div>
    </div>
  )
}
