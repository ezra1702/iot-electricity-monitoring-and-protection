import { useState, useEffect, useRef } from 'react'
import { pageEntrance } from '../utils/animations'
import ReactApexChart from 'react-apexcharts'
import { Wifi, WifiOff, Zap, Activity, Shield, Gauge, BatteryCharging, Flame } from 'lucide-react'

function GaugeCard({ label, value, max, unit, color }) {
  const pct = Math.min(100, (parseFloat(value) / max) * 100)
  const r = 44, cx = 56, cy = 56
  const circum = 2 * Math.PI * r
  const arc = circum * 0.75
  const offset = arc - (pct / 100) * arc
  const startAngle = 135 * (Math.PI / 180)
  const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle)
  return (
    <div className="glass-card-sm" style={{ padding: '1rem', textAlign: 'center', flex: '1 1 130px' }}>
      <svg width={112} height={90} viewBox="0 0 112 80" style={{ overflow: 'visible' }}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} strokeDasharray={`${arc} ${circum - arc}`} strokeDashoffset={-circum * 0.125} strokeLinecap="round" />
        {/* Value arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={`${arc} ${circum - arc}`} strokeDashoffset={offset - circum * 0.125} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color}80)`, transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#f1f5f9" fontSize={14} fontWeight={700}>{parseFloat(value).toFixed(1)}</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill={color} fontSize={9} fontWeight={600}>{unit}</text>
      </svg>
      <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: -8 }}>{label}</p>
    </div>
  )
}

export default function MonitoringPage({ metrics, history, deviceInfo }) {
  const pageRef = useRef(null)

  useEffect(() => {
    pageEntrance('#monitor-page')
  }, [])

  const STATUS = {
    normal:   { label: 'NORMAL',   color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
    overload: { label: 'OVERLOAD', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    smoke:    { label: 'ASAP',     color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  }
  const status = metrics.power > ((deviceInfo?.max_current_limit || 5) * 220) ? 'overload' : 'normal'
  const sc = STATUS[status] || STATUS.normal

  const sparkOpts = (color) => ({
    chart: { type: 'line', background: 'transparent', toolbar: { show: false }, sparkline: { enabled: true }, animations: { enabled: true, dynamicAnimation: { enabled: true, speed: 600 } } },
    colors: [color],
    stroke: { curve: 'smooth', width: 2 },
    tooltip: { enabled: false },
    grid: { show: false }, xaxis: { labels: { show: false } }, yaxis: { show: false },
  })

  const PARAMS = [
    { label: 'Voltage',      value: metrics.voltage,     unit: 'V',   max: 250,  color: '#38BDF8', icon: Zap,            key: 'voltage' },
    { label: 'Current',      value: metrics.current,     unit: 'A',   max: 10,   color: '#22D3EE', icon: Activity,       key: 'current' },
    { label: 'Power',        value: metrics.power,       unit: 'W',   max: 2500, color: '#60A5FA', icon: BatteryCharging, key: 'power' },
    { label: 'Power Factor', value: metrics.powerFactor, unit: 'PF',  max: 1,    color: '#A78BFA', icon: Shield,         key: 'powerFactor' },
    { label: 'Frequency',    value: metrics.frequency,   unit: 'Hz',  max: 60,   color: '#F472B6', icon: Gauge,          key: 'frequency' },
  ]

  return (
    <div id="monitor-page" ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="a-title" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Real-Time Monitoring</h2>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
            Pembacaan langsung {deviceInfo ? deviceInfo.name : 'PZEM-004T + MQ-2'} · Interval: 2 detik
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, background: sc.bg, border: `1px solid ${sc.color}30` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: sc.color, animation: 'blink 1.2s ease infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: sc.color, letterSpacing: '0.08em' }}>{sc.label}</span>
          </div>
        </div>
      </div>

      {/* Gauge Row */}
      <div className="a-chart glass-card" style={{ padding: '1.25rem' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Analog Gauge Meters</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {PARAMS.map(p => <GaugeCard key={p.key} label={p.label} value={p.value} max={p.max} unit={p.unit} color={p.color} />)}
        </div>
      </div>

      {/* Parameter Cards with sparklines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {PARAMS.map(p => {
          const Icon = p.icon
          const sparkData = history.map(h => h[p.key] || 0)
          const pct = Math.min(100, (parseFloat(p.value) / p.max) * 100)
          return (
            <div key={p.key} className="a-metric glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${p.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={p.color} />
                </div>
                <div>
                  <p style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2 }}>
                    {typeof p.value === 'number' ? p.value.toFixed(p.unit === 'W' || p.unit === 'Hz' ? p.unit === 'W' ? 0 : 2 : 2) : p.value}
                    <span style={{ fontSize: 11, color: p.color, marginLeft: 4 }}>{p.unit}</span>
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}aa)`, borderRadius: 2, transition: 'width 0.8s ease', boxShadow: `0 0 6px ${p.color}60` }} />
              </div>
              {/* Sparkline */}
              <ReactApexChart
                type="line"
                series={[{ name: p.label, data: sparkData }]}
                options={sparkOpts(p.color)}
                height={50}
              />
            </div>
          )
        })}
      </div>

      {/* Device list */}
      {deviceInfo && (
        <div className="a-chart glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Status Perangkat IoT</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            <div className="glass-card-sm" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: deviceInfo.status === 'online' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {deviceInfo.status === 'online' ? <Wifi size={18} color="#22C55E" /> : <WifiOff size={18} color="#EF4444" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{deviceInfo.name}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, background: deviceInfo.status === 'online' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: deviceInfo.status === 'online' ? '#22C55E' : '#EF4444' }}>{deviceInfo.status.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: 10, color: '#475569' }}>{deviceInfo.location} · {deviceInfo.mac_address}</p>
                <p style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>Limit Arus: {deviceInfo.max_current_limit}A · Rp {parseFloat(deviceInfo.price_per_kwh).toLocaleString('id-ID')}/kWh</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
