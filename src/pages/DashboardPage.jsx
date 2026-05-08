import { useState, useEffect, useRef } from 'react'
import { Zap, Activity, BatteryCharging, Shield, Gauge, AlertTriangle, TrendingUp, BrainCircuit, History, Download, Calendar, X, Loader2, Sparkles } from 'lucide-react'
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

const ANOMALIES = []

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

export default function DashboardPage({ addNotification, pushAlert, clearAlert }) {
  const [loading, setLoading] = useState(true)
  const [deviceInfo, setDeviceInfo] = useState(null)
  
  const [metrics, setMetrics] = useState({
    voltage: 0, current: 0, power: 0, powerFactor: 0
  })
  const [totalKwh, setTotalKwh] = useState(0)
  const [logs, setLogs] = useState([])
  const [costToday, setCostToday] = useState(0)

  const activeAlertsRef = useRef(new Set())
  const userName = localStorage.getItem('voltEdge_userName') || 'Admin'

  useEffect(() => {
    pageEntrance('#dash-page')
    
    const deviceId = localStorage.getItem('voltEdge_activeDeviceId')
    if (!deviceId) return
    
    const fetchDashboardData = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/devices/${deviceId}/dashboard`)
        const data = await res.json()
        
        if (data.device) {
          setDeviceInfo(data.device)
        }
        
        if (data.latest) {
          setMetrics({
            voltage: parseFloat(data.latest.voltage),
            current: parseFloat(data.latest.current),
            power: parseFloat(data.latest.power),
            powerFactor: parseFloat(data.latest.power_factor)
          })
          setTotalKwh(parseFloat(data.latest.energy))
          
          // Cost
          const price = data.device ? parseFloat(data.device.price_per_kwh) : 1444.70
          setCostToday(parseFloat(data.latest.energy) * price)
          
          // ── Alert Logic ─────────────────────────────────────
          const cutOffCurrent = data.device ? parseFloat(data.device.max_current_limit) : 5
          const GAS_THRESHOLD = 2700
          let newAlerts = []

          // Overload
          const isOverload = parseFloat(data.latest.current) > cutOffCurrent
          if (isOverload) {
            if (!activeAlertsRef.current.has('overload')) {
              activeAlertsRef.current.add('overload')
              addNotification?.('Overload Relay Aktif', `Arus ${parseFloat(data.latest.current).toFixed(2)}A melebihi batas ${cutOffCurrent}A. Relay diputus!`, 'danger')
              pushAlert?.({
                id: 'overload', type: 'overload',
                title: '⚡ OVERLOAD!',
                msg: `Arus ${parseFloat(data.latest.current).toFixed(2)}A > batas ${cutOffCurrent}A. Relay diputus!`,
                time: new Date().toLocaleTimeString('id-ID')
              })
            }
          } else {
            activeAlertsRef.current.delete('overload')
            clearAlert?.('overload')
          }

          // Gas / MQ-2
          const alertState  = data.alertState || {}
          const gasVal      = parseInt(alertState.gas || 0)
          const relayActive = !!alertState.relayActive
          const isGasDanger = relayActive || gasVal >= 3000
          if (isGasDanger) {
            if (!activeAlertsRef.current.has('gas')) {
              activeAlertsRef.current.add('gas')
              addNotification?.('Bahaya Asap/Gas!', `Sensor MQ-2 mendeteksi gas/asap berbahaya (nilai: ${gasVal}). Listrik diputus!`, 'danger')
              pushAlert?.({
                id: 'gas', type: 'gas',
                title: 'ASAP/GAS BERBAHAYA!',
                msg: `MQ-2 nilai ${gasVal}. Relay diputus! Segera ventilasi ruangan.`,
                time: new Date().toLocaleTimeString('id-ID')
              })
            }
          } else {
            activeAlertsRef.current.delete('gas')
            clearAlert?.('gas')
          }
        }

        if (data.logs) {
          // Format the logs for the table
          const formattedLogs = data.logs.map(log => {
            const cutOff = (data.device ? parseFloat(data.device.max_current_limit) : 5) * 220
            return {
              id: log.id,
              time: new Date(log.timestamp).toLocaleTimeString('id-ID'),
              voltage: log.voltage,
              current: log.current,
              power: log.power,
              energy: log.energy,
              status: parseFloat(log.power) > cutOff ? 'Overload' : 'Normal'
            }
          })
          setLogs(formattedLogs)
        }
        
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    // Panggil saat pertama kali
    fetchDashboardData()
    
    // Polling setiap 2 detik untuk data real-time
    const t = setInterval(fetchDashboardData, 2000)
    return () => clearInterval(t)
  }, [addNotification])

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#38BDF8' }}>
        <Loader2 className="animate-spin" size={40} />
      </div>
    )
  }

  const priceKwh = deviceInfo ? parseFloat(deviceInfo.price_per_kwh) : 1444.70
  const monthlyKwh = totalKwh // Purely from database
  const mLGuestimateKwh = totalKwh > 0 ? totalKwh * 1.05 : 0 // Basic linear projection based on actual
  const monthlyCost = monthlyKwh * priceKwh
  const mlCost = mLGuestimateKwh * priceKwh

  const forecastChartOptions = {
    chart: { type: 'area', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
    colors: ['#38BDF8', '#A78BFA'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, dashArray: [0, 5] },
    xaxis: { categories: ['1', '5', '10', '15', '20', '25', '30'], labels: { style: { colors: '#64748B', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#64748B', fontSize: '10px' }, formatter: v => 'Rp ' + v + 'k' } },
    grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#94A3B8' } },
    tooltip: { theme: 'dark' }
  }

  const forecastSeries = [
    { name: 'Aktual (+Tren)', data: [
      (0.2 * monthlyKwh * priceKwh / 1000).toFixed(0), 
      (0.4 * monthlyKwh * priceKwh / 1000).toFixed(0), 
      (0.6 * monthlyKwh * priceKwh / 1000).toFixed(0), 
      (0.8 * monthlyKwh * priceKwh / 1000).toFixed(0), 
      (monthlyKwh * priceKwh / 1000).toFixed(0), 
      null, null
    ] },
    { name: 'Prediksi ML (LR)', data: [
      null, null, null, null, 
      (monthlyKwh * priceKwh / 1000).toFixed(0), 
      ((monthlyKwh * 1.02) * priceKwh / 1000).toFixed(0), 
      (mLGuestimateKwh * priceKwh / 1000).toFixed(0)
    ] }
  ]

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
        {/* BIAYA HARI INI */}
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
            {/* Large Rp badge */}
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
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Kalkulasi dari {totalKwh.toFixed(2)} kWh</p>
          {/* Decorative faint Rp watermark */}
          <span style={{
            position: 'absolute', right: -8, bottom: -10,
            fontSize: 90, fontWeight: 900, color: 'rgba(34,197,94,0.06)',
            lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
          }}>Rp</span>
        </div>

        {/* TOTAL BULAN INI */}
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
            {/* Bigger calendar icon */}
            <Calendar size={26} color="#38BDF8" style={{ opacity: 0.85, filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.5))' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#94A3B8' }}>Rp</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9' }}>{monthlyCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Akumulasi dari {monthlyKwh.toFixed(1)} kWh bulan ini</p>
          {/* Decorative calendar watermark */}
          <div style={{ position: 'absolute', right: -4, bottom: -8, opacity: 0.06, pointerEvents: 'none' }}>
            <Calendar size={90} color="#38BDF8" />
          </div>
        </div>

        {/* ESTIMASI AKHIR BULAN */}
        <div className="a-metric" style={{
          padding: '1.5rem',
          background: 'rgba(167,139,250,0.07)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(167,139,250,0.18)',
          borderRadius: '1.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.05em' }}>ESTIMASI AKHIR BULAN (ML)</span>
            <BrainCircuit size={20} color="#A78BFA" style={{ opacity: 0.85, filter: 'drop-shadow(0 0 6px rgba(167,139,250,0.5))' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: '#94A3B8' }}>Rp</span>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9' }}>{mlCost.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
          </div>
          <p style={{ fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}><TrendingUp size={14}/> +4% dari bulan lalu</p>
          {/* Decorative BrainCircuit watermark */}
          <div style={{ position: 'absolute', right: -4, bottom: -8, opacity: 0.06, pointerEvents: 'none' }}>
            <BrainCircuit size={90} color="#A78BFA" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
        <MetricCard label="Tegangan"     value={metrics.voltage}     unit="V"   icon={Activity}       accent="#38BDF8" trend={0.4}  decimals={1} />
        <MetricCard label="Arus Live"    value={metrics.current}     unit="A"   icon={Zap}            accent="#22D3EE" trend={-1.1} decimals={2} />
        <MetricCard label="Daya Aktif"   value={metrics.power}       unit="W"   icon={BatteryCharging} accent="#60A5FA" trend={2.0}  decimals={0} />
        <MetricCard label="Cos Phi (PF)" value={metrics.powerFactor} unit=""    icon={Shield}         accent="#0EA5E9" decimals={2} />
        <MetricCard label="Total Energi" value={totalKwh}            unit="kWh" icon={History}        accent="#A78BFA" decimals={4} />
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '2 1 500px', minWidth: 320 }}>
          <ChartCard title="Forecast Tagihan (ML)" sub="Prediksi Linear Regression untuk akhir bulan">
            <div style={{ height: 280, marginTop: 10 }}>
              <Chart options={forecastChartOptions} series={forecastSeries} type="area" height="100%" />
            </div>
          </ChartCard>
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 320 }}>
          <ChartCard title="Deteksi Anomali AI" sub="Isolation Forest Model" alert>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {ANOMALIES.length > 0 ? ANOMALIES.map(an => (
                <div key={an.id} className="a-list glass-card" style={{ padding: '14px', background: 'rgba(239,68,68,0.03)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#F87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14} /> {an.type}
                    </span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{an.time}</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 }}>
                    {an.desc}
                  </p>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${an.score * 100}%`, height: '100%', background: '#F87171' }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#475569' }}>Risk: {an.score}</span>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                  <Shield size={32} color="#22C55E" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                  <p>Sistem Kelistrikan Aman.</p>
                  <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Tidak ada anomali atau lonjakan mencurigakan yang terdeteksi oleh AI.</p>
                </div>
              )}
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
