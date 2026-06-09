import { useState, useEffect, useRef } from 'react'
import { Save, AlertTriangle, Zap, Activity, Shield, Cpu, RefreshCw, X } from 'lucide-react'
import { pageEntrance } from '../utils/animations'

export default function SettingsPage({ deviceInfo, onUpdateSettings, onClose }) {
  const pageRef = useRef(null)

  const [mac, setMac] = useState(deviceInfo.mac_address || '20E7C8674D3C')
  const [maxCurrent, setMaxCurrent] = useState(deviceInfo.max_current_limit || 5.0)
  const [priceKwh, setPriceKwh] = useState(deviceInfo.price_per_kwh || 1444.70)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('')

  useEffect(() => {
    pageEntrance('#settings-page')
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!mac.trim()) {
      setMsg('MAC Address wajib diisi!')
      setMsgType('error')
      return
    }
    const limit = parseFloat(maxCurrent)
    if (!limit || limit <= 0) {
      setMsg('Batas arus harus lebih dari 0 A!')
      setMsgType('error')
      return
    }

    onUpdateSettings({
      mac_address: mac.trim().toUpperCase(),
      max_current_limit: limit,
      price_per_kwh: parseFloat(priceKwh) || 1444.70
    })

    setMsg('Pengaturan berhasil disimpan dan dikirim ke ESP32!')
    setMsgType('success')
    setTimeout(() => {
      setMsg('')
      if (onClose) onClose()
    }, 2500)
  }

  return (
    <div id="settings-page" ref={pageRef} style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', right: 0, top: 0, background: 'none', border: 'none',
            color: '#94A3B8', cursor: 'pointer', display: 'flex', padding: 4
          }}
        >
          <X size={20} />
        </button>
      )}

      <div className="a-title">
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cpu size={22} color="#38BDF8" /> Pengaturan Perangkat IoT
        </h2>
        <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
          Kelola parameter operasional sirkuit ESP32 & PZEM-004T kamu secara live.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', background: 'rgba(15, 23, 42, 0.45)' }}>
        {msg && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
            marginBottom: 20, fontSize: 13, fontWeight: 600,
            background: msgType === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${msgType === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: msgType === 'success' ? '#4ade80' : '#f87171'
          }}>
            {msgType === 'success' ? '✅' : '❌'} {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              MAC Address Perangkat ESP32
            </label>
            <div style={{ position: 'relative' }}>
              <Cpu size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="text"
                className="input-field"
                value={mac}
                onChange={e => setMac(e.target.value)}
                placeholder="Contoh: 20E7C8674D3C"
                style={{ paddingLeft: 38, background: 'rgba(15,23,42,0.8)' }}
              />
            </div>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
              MAC Address hardware chip ESP32 yang terhubung ke jaringan internet.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Batas Aman Cut-off Arus Listrik (Overload)
            </label>
            <div style={{ position: 'relative' }}>
              <Activity size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="input-field"
                value={maxCurrent}
                onChange={e => setMaxCurrent(e.target.value)}
                style={{ paddingLeft: 38, paddingRight: 60, background: 'rgba(15,23,42,0.8)' }}
              />
              <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#64748B', fontWeight: 700 }}>AMP</span>
            </div>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
              Batas arus maksimum (A) sebelum relay otomatis memutus aliran listrik.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
              Tarif Dasar Listrik kWh
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 800, color: '#64748B' }}>Rp</span>
              <input
                type="number"
                step="0.1"
                min="0"
                className="input-field"
                value={priceKwh}
                onChange={e => setPriceKwh(e.target.value)}
                style={{ paddingLeft: 38, background: 'rgba(15,23,42,0.8)' }}
              />
            </div>
            <p style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>
              Tarif rupiah dasar per kWh listrik untuk menghitung proyeksi estimasi biaya sirkuit.
            </p>
          </div>

          <button
            type="submit"
            className="gradient-electric"
            style={{
              border: 'none', borderRadius: 10, padding: '14px', fontSize: 13, fontWeight: 800,
              color: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, cursor: 'pointer', boxShadow: '0 0 20px rgba(56,189,248,0.2)', marginTop: 10
            }}
          >
            <Save size={15} /> Simpan & Kirim Konfigurasi
          </button>
        </form>
      </div>
    </div>
  )
}
