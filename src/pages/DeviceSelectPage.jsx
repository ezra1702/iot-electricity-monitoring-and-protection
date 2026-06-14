import React, { useState, useEffect } from 'react'
import { Zap, Plus, Cpu, Bluetooth, Wifi, MapPin, ChevronRight, Loader2, X, CheckCircle2, ArrowRight, ArrowLeft, Settings, AlertTriangle, Activity, LogOut, Trash2 } from 'lucide-react'
import { pageEntrance, staggerFadeIn } from '../utils/animations'

export default function DeviceSelectPage({ setPage }) {
  const [showAdd, setShowAdd] = useState(false)
  const [scanStep, setScanStep] = useState(0) 
  const [deviceName, setDeviceName] = useState('')
  const [deviceMac, setDeviceMac] = useState('')
  const [deviceLoc, setDeviceLoc] = useState('')
  const [limitCurrent, setLimitCurrent] = useState('5.0')
  const [priceKwh, setPriceKwh] = useState('1444.70')
  
  const [devices, setDevices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [scannedDevices, setScannedDevices] = useState([])
  const [isScanning, setIsScanning] = useState(false)

  
  const [deletingDevice, setDeletingDevice] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDevices = async () => {
    try {
      const userId = localStorage.getItem('voltEdge_userId')
      if (!userId) return setPage('login')

      const res = await fetch(`http://localhost:5000/api/users/${userId}/devices`)
      const data = await res.json()
      if (data.devices) {
        setDevices(data.devices)
        setTimeout(() => staggerFadeIn('.device-card', { stagger: 100, start: 200 }), 100)
      }
    } catch (err) {
      console.error("Gagal mengambil data perangkat:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDevice = async () => {
    if (deleteConfirmText !== 'HAPUS' || !deletingDevice) return;
    setIsDeleting(true);
    try {
      await fetch(`http://localhost:5000/api/devices/${deletingDevice.id}`, { method: 'DELETE' })
      setDeletingDevice(null)
      setDeleteConfirmText('')
      await fetchDevices()
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    pageEntrance()
    fetchDevices()
  }, [setPage])

  const handleDeviceClick = (id) => {
    localStorage.setItem('voltEdge_activeDeviceId', id)
    localStorage.setItem('voltEdge_deviceId', id)  
    setPage('dashboard')
  }

  const [scanCountdown, setScanCountdown] = useState(0)

  const startScan = () => {
    setScanStep(1)
    setIsScanning(true)
    setScannedDevices([])

    
    
    const MAX_ATTEMPTS = 15
    const INTERVAL_MS  = 2000
    setScanCountdown(MAX_ATTEMPTS * INTERVAL_MS / 1000)

    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      const remaining = Math.max(0, Math.round(((MAX_ATTEMPTS - attempts) * INTERVAL_MS) / 1000))
      setScanCountdown(remaining)

      try {
        const res  = await fetch('http://localhost:5000/api/discovery')
        const data = await res.json()
        if (data.devices && data.devices.length > 0) {
          setScannedDevices(data.devices)
          clearInterval(interval)
          setIsScanning(false)
          setScanCountdown(0)
        }
      } catch (e) { console.error("Discovery error:", e) }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval)
        setIsScanning(false)
        setScanCountdown(0)
      }
    }, INTERVAL_MS)
  }

  const handleConnect = async () => {
    setScanStep(4)
    localStorage.setItem('voltEdge_priceKwh', priceKwh)
    localStorage.setItem('voltEdge_maxCurrent', limitCurrent)
    
    try {
      const userId = localStorage.getItem('voltEdge_userId')
      if (userId) {
        const res = await fetch('http://localhost:5000/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            mac_address: deviceMac,
            name: deviceName || 'VoltEdge Node',
            location: deviceLoc || 'Utama',
            max_current_limit: parseFloat(limitCurrent),
            price_per_kwh: parseFloat(priceKwh)
          })
        })
        const data = await res.json()
        if (res.ok && data.deviceId) {
          localStorage.setItem('voltEdge_activeDeviceId', data.deviceId)
        }
      }
    } catch (err) {
      console.error("Gagal mendaftarkan perangkat:", err)
    }

    setTimeout(() => {
      setShowAdd(false)
      setScanStep(0)
      setDeviceName('')
      setDeviceMac('')
      setDeviceLoc('')
      setPage('dashboard')
    }, 2500)
  }

  const renderAddModal = () => {
    if (!showAdd) return null
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div 
          style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} 
          onClick={() => { setShowAdd(false); setScanStep(0); }} 
        />
        
        <div className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 460, padding: '2rem', display: 'flex', flexDirection: 'column', gap: 20, transform: 'translateY(0)', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          
          <button onClick={() => { setShowAdd(false); setScanStep(0); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
            <X size={20} />
          </button>
          
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bluetooth size={22} color="#38BDF8" /> {scanStep > 1 ? 'Registrasi Sistem IoT' : 'Tambah ESP32 Baru'}
          </h2>

          {}
          {scanStep > 0 && scanStep < 4 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -4, marginBottom: 10 }}>
              {[
                { id: 1, label: 'Pairing' },
                { id: 2, label: 'Kredensial' },
                { id: 3, label: 'Threshold' }
              ].map(step => (
                 <React.Fragment key={step.id}>
                   <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                     <div style={{ 
                       width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, transition: 'all 0.3s',
                       background: scanStep >= step.id ? '#38BDF8' : 'rgba(255,255,255,0.05)',
                       color: scanStep >= step.id ? '#020617' : '#64748B',
                       boxShadow: scanStep === step.id ? '0 0 15px rgba(56,189,248,0.4)' : 'none'
                     }}>
                       {step.id}
                     </div>
                     <span style={{ fontSize: 10, fontWeight: 700, color: scanStep >= step.id ? '#f1f5f9' : '#64748B', letterSpacing: '0.04em' }}>{step.label}</span>
                   </div>
                   {step.id < 3 && <div style={{ flex: 1, height: 2, background: scanStep > step.id ? '#38BDF8' : 'rgba(255,255,255,0.05)', margin: '0 8px', marginBottom: 16, transition: 'all 0.3s' }} />}
                 </React.Fragment>
              ))}
            </div>
          )}

          {}
          {scanStep === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                Nyalakan daya modul VoltEdge ESP32 dan pastikan berkedip biru (Siaga Pairing). Dekatkan HP Anda ke panel dalam jarak maksimal 5 meter.
              </p>
              <button onClick={startScan} className="gradient-electric" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px', borderRadius: 12, border: 'none', color: '#020617', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 0 20px rgba(56,189,248,0.3)', transition: 'transform 0.2s', marginTop: 8 }}>
                <Wifi size={20} /> Pairing
              </button>
            </div>
          )}

          {}
          {scanStep === 1 && (
            <div style={{ padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, minHeight: 320, position: 'relative' }}>
              
              {}
              <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                 {isScanning && (
                   <>
                     <div style={{ position: 'absolute', inset: -40, border: '1px solid rgba(56,189,248,0.4)', borderRadius: '50%', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                     <div style={{ position: 'absolute', inset: -80, border: '1px solid rgba(56,189,248,0.2)', borderRadius: '50%', animation: 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite', animationDelay: '0.5s' }} />
                     
                     <div style={{ position: 'absolute', inset: -80, borderRadius: '50%', background: 'conic-gradient(from 0deg, rgba(56,189,248,0) 0%, rgba(56,189,248,0.05) 60%, rgba(56,189,248,0.3) 100%)', animation: 'radar-sweep 2.5s linear infinite', clipPath: 'circle(50% at 50% 50%)' }} />
                   </>
                 )}
                 <div style={{ width: 80, height: 80, background: 'rgba(56,189,248,0.1)', border: '2px solid rgba(56,189,248,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(56,189,248,0.3)', zIndex: 5 }}>
                   <Wifi size={36} color="#38BDF8" style={{ animation: isScanning ? 'pulse 1.5s infinite' : 'none' }} />
                 </div>
              </div>

              {}
              {scannedDevices.map((d, i) => {
                 
                 const angle = (i * (360 / scannedDevices.length)) * (Math.PI / 180);
                 const x = Math.cos(angle) * 110;
                 const y = Math.sin(angle) * 110;
                 return (
                   <div 
                     key={i} 
                     onClick={() => { setDeviceMac(d.mac_address); setScanStep(2); }}
                     style={{ 
                       position: 'absolute', 
                       top: `calc(45% + ${y}px)`, 
                       left: `calc(50% + ${x}px)`, 
                       transform: 'translate(-50%, -50%)',
                       display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                       cursor: 'pointer', zIndex: 20, transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                     }}
                     onMouseEnter={e => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'}
                     onMouseLeave={e => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
                   >
                     <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(56,189,248,0.2) 0%, rgba(34,211,238,0.1) 100%)', border: '2px solid rgba(56,189,248,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(56,189,248,0.3)', backdropFilter: 'blur(5px)' }}>
                       <Cpu size={28} color="#f1f5f9" />
                     </div>
                     <div style={{ background: 'rgba(2,6,23,0.8)', padding: '4px 10px', borderRadius: 12, border: '1px solid rgba(56,189,248,0.3)', backdropFilter: 'blur(4px)' }}>
                       <p style={{ fontSize: 11, fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap' }}>Node Baru</p>
                       <p style={{ fontSize: 9, color: '#38BDF8', textAlign: 'center' }}>{d.mac_address}</p>
                     </div>
                   </div>
                 )
              })}

              {}
              <div style={{ position: 'absolute', bottom: 0, width: '100%', textAlign: 'center' }}>
                {isScanning ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    {}
                    <div style={{
                      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                      <span style={{ fontSize: 14 }}>⏱</span>
                      <p style={{ fontSize: 11, color: '#FCD34D', lineHeight: 1.5 }}>
                        ESP32 perlu <strong>~15 detik warmup</strong> MQ-2 sebelum terdeteksi
                      </p>
                    </div>
                    {}
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#38BDF8', animation: 'pulse 1.5s infinite' }}>
                      Mencari Perangkat... {scanCountdown > 0 && <span style={{ fontFamily: 'monospace', color: '#22D3EE' }}>({scanCountdown}d)</span>}
                    </p>
                    {}
                    <div style={{ width: '80%', height: 4, background: 'rgba(56,189,248,0.1)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        background: 'linear-gradient(90deg, #38BDF8, #22D3EE)',
                        width: `${Math.round((1 - scanCountdown / 30) * 100)}%`,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ) : scannedDevices.length > 0 ? (
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', animation: 'pulse 2s infinite' }}>Ketuk perangkat untuk menghubungkan.</p>
                ) : (
                  <div style={{ color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 14, color: '#EF4444', fontWeight: 700 }}>Tidak ada alat ditemukan.</p>
                    <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.5, maxWidth: 260 }}>
                      Pastikan ESP32 sudah menyala dan selesai warmup (~15 detik). Coba scan ulang.
                    </p>
                    <div style={{ marginTop: 4, display: 'flex', gap: 12, justifyContent: 'center' }}>
                      <button
                        onClick={startScan}
                        style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', color: '#38BDF8', padding: '8px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 800, fontSize: 13, transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background='rgba(56,189,248,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background='rgba(56,189,248,0.1)'}
                      >Scan Ulang (30 detik)</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {}
          {scanStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <CheckCircle2 size={32} color="#22C55E" />
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>Perangkat Ditemukan</h4>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Identitas MAC Address berhasil direkam</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>MAC ADDRESS</label>
                  <input 
                    type="text" value={deviceMac} readOnly
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px', borderRadius: 12, color: '#64748B', fontSize: 14, outline: 'none', cursor: 'not-allowed', letterSpacing: '0.05em' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>NAMA PERANGKAT</label>
                  <input 
                    type="text" placeholder="Cth: Panel Utama" value={deviceName} onChange={e => setDeviceName(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 12, color: 'white', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#38BDF8'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>LOKASI PANEL</label>
                  <input 
                    type="text" placeholder="Cth: Gudang Sektor B" value={deviceLoc} onChange={e => setDeviceLoc(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px', borderRadius: 12, color: 'white', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
                    onFocus={e => e.currentTarget.style.borderColor = '#38BDF8'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={() => setScanStep(0)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                  Batal
                </button>
                <button disabled={!deviceName || !deviceMac} onClick={() => setScanStep(3)} className="gradient-electric" style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', color: '#020617', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: (deviceName && deviceMac) ? 'pointer' : 'not-allowed', opacity: (deviceName && deviceMac) ? 1 : 0.5 }}>
                  Lanjut <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {}
          {scanStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <AlertTriangle size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: '#f1f5f9', lineHeight: 1.5 }}>
                  Atur ambang batas (Cut-off) arus untuk proteksi beban hardware, dan tetapkan tarif dasar per-kWh untuk mengkalkulasi biaya pemakaian aktual harian.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>MAKSIMAL ARUS (A)</span>
                    <span style={{ color: '#22D3EE' }}>Cut-off Relay</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Activity size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 14 }} />
                    <input 
                      type="number" value={limitCurrent} onChange={e => setLimitCurrent(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px 14px 44px', borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 700, outline: 'none' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#38BDF8'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>TARIF DASAR (Rp/kWh)</span>
                    <span style={{ color: '#22C55E' }}>Biaya Nyata</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 16, top: 13, fontSize: 15, fontWeight: 800, color: '#94A3B8' }}>Rp</span>
                    <input 
                      type="number" value={priceKwh} onChange={e => setPriceKwh(e.target.value)}
                      style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px 16px 14px 44px', borderRadius: 12, color: 'white', fontSize: 16, fontWeight: 700, outline: 'none' }}
                      onFocus={e => e.currentTarget.style.borderColor = '#38BDF8'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={() => setScanStep(2)} style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <ArrowLeft size={18} />
                </button>
                <button disabled={!limitCurrent || !priceKwh} onClick={handleConnect} className="gradient-electric" style={{ flex: 1, padding: '14px', borderRadius: 12, border: 'none', color: '#020617', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: (!limitCurrent || !priceKwh) ? 'not-allowed' : 'pointer', opacity: (!limitCurrent || !priceKwh) ? 0.5 : 1, transition: 'all 0.2s' }}>
                  Simpan Perangkat
                </button>
              </div>
            </div>
          )}

          {}
          {scanStep === 4 && (
            <div style={{ padding: '3rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <Loader2 size={40} color="#38BDF8" style={{ animation: 'spinSlow 1s linear infinite' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>Menyimpan Konfigurasi...</p>
                <p style={{ fontSize: 13, color: '#38BDF8', marginTop: 4 }}>Mengirim Payload MQTT ke ESP32</p>
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowX: 'hidden', overflowY: 'auto', backgroundColor: '#020617' }}>
      
      {}
      <div style={{ width: '100%', padding: '24px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="gradient-electric" style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#020617' }}>
            <Zap size={18} fill="currentColor" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em' }}>VoltEdge</span>
        </div>
        
        <button 
          onClick={() => {
            localStorage.removeItem('voltEdge_isAuth')
            localStorage.removeItem('voltEdge_userId')
            setPage('login')
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 99, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#EF4444' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94A3B8' }}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      {}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'floatOrb 12s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)', filter: 'blur(90px)', animation: 'floatOrb 15s ease-in-out infinite alternate-reverse' }} />
        
        {}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }} />
        
        <style>
          {`
            @keyframes floatOrb {
              0% { transform: translate(0px, 0px) scale(1); }
              100% { transform: translate(40px, 40px) scale(1.05); }
            }
            .danger-shake:hover {
              animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
            }
            @keyframes shake {
              10%, 90% { transform: translate3d(-1px, 0, 0); }
              20%, 80% { transform: translate3d(2px, 0, 0); }
              30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
              40%, 60% { transform: translate3d(3px, 0, 0); }
            }
          `}
        </style>
      </div>

      {}
      <div style={{ width: '100%', maxWidth: 650, position: 'relative', zIndex: 10, padding: '2rem 1.5rem 4rem 1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {}
        <div className="a-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 48 }}>
          <div className="gradient-electric" style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#020617', boxShadow: '0 0 30px rgba(56,189,248,0.4)', transform: 'rotate(-4deg)', marginBottom: 20 }}>
            <Cpu size={32} />
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>Inisialisasi Sistem</h1>
          <p style={{ fontSize: 14, color: 'rgba(148, 163, 184, 0.8)', marginTop: 10, maxWidth: '85%', lineHeight: 1.6 }}>Identifikasi dan pilih node panel distribusi kelistrikan untuk memulai agregasi data sensor secara real-time.</p>
        </div>

        {}
        <div className="a-title" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(56,189,248,0.5), transparent)' }} />
          <p style={{ fontSize: 12, fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            NODE TERSEDIA
          </p>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, rgba(56,189,248,0.5), transparent)' }} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B' }}>
              <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
              Memuat node kelistrikan...
            </div>
          ) : devices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 20 }}>
              Belum ada perangkat yang terdaftar.
            </div>
          ) : (
            devices.map(device => (
            <div 
              key={device.id} 
              className="device-card a-list"
              onClick={() => handleDeviceClick(device.id)}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, padding: '20px', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, background: 'linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(30,41,59,0.5) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(56,189,248,0.4)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.7) 100%)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(30,41,59,0.5) 100%)' }}
            >
              {}
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Wifi size={28} color={device.status === 'online' ? '#38BDF8' : '#475569'} style={{ filter: device.status === 'online' ? 'drop-shadow(0 0 12px rgba(56,189,248,0.7))' : 'none', transition: 'all 0.3s' }} />
              </div>
              
              {}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginBottom: 8, display: 'flex', alignItems: 'center', columnGap: 10, flexWrap: 'wrap', textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>
                  {device.name}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 99, background: device.status === 'online' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)', border: `1px solid ${device.status === 'online' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`, color: device.status === 'online' ? '#22C55E' : '#EF4444' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', animation: device.status === 'online' ? 'blink 2s ease infinite' : 'none' }} />
                    {device.status === 'online' ? 'LIVE' : 'OFFLINE'}
                  </div>
                </h3>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8', fontFamily: 'monospace' }}>
                  <MapPin size={13} /> <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{device.location}</span> &bull; {device.mac_address}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); setDeletingDevice(device); }}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'transparent', border: '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', transition: 'all 0.3s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#EF4444' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#64748B' }}
                >
                  <Trash2 size={18} />
                </button>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}>
                  <ChevronRight size={20} color="#f1f5f9" />
                </div>
              </div>
            </div>
          )))}
        </div>

        {}
        <button 
          onClick={() => setShowAdd(true)}
          className="gradient-electric a-title" 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px', borderRadius: 20, border: 'none', color: '#020617', fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'all 0.25s', boxShadow: '0 0 20px rgba(56,189,248,0.2)' }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(56,189,248,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(56,189,248,0.2)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          <Plus size={20} strokeWidth={3} /> Registrasi Node Kelistrikan Baru
        </button>

        <div style={{ flex: 1, minHeight: '40px' }} />

      </div>
      
      {}
      {renderAddModal()}

      {}
      {deletingDevice && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div 
            style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(8px)' }} 
            onClick={() => { setDeletingDevice(null); setDeleteConfirmText(''); }}
          />
          <div className="glass-card" style={{ position: 'relative', width: '100%', maxWidth: 400, padding: '2rem', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={28} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Hapus Perangkat</h2>
              <p style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5 }}>
                Kamu akan menghapus <b>{deletingDevice.name}</b> secara permanen. Seluruh history data pemakaian perangkat ini akan ikut terhapus.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Ketik "HAPUS" untuk konfirmasi</label>
              <input 
                type="text" 
                placeholder="HAPUS" 
                value={deleteConfirmText} 
                onChange={e => setDeleteConfirmText(e.target.value)}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 16px', borderRadius: 10, color: 'white', fontSize: 14, outline: 'none', textAlign: 'center', letterSpacing: '0.1em', fontWeight: 800 }}
                onFocus={e => e.currentTarget.style.borderColor = '#EF4444'} 
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              <button 
                onClick={() => { setDeletingDevice(null); setDeleteConfirmText(''); }} 
                disabled={isDeleting}
                style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button 
                disabled={deleteConfirmText !== 'HAPUS' || isDeleting}
                onClick={handleDeleteDevice} 
                className="danger-shake"
                style={{ flex: 1, padding: '12px', borderRadius: 10, background: '#EF4444', border: 'none', color: '#fff', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: (deleteConfirmText === 'HAPUS' && !isDeleting) ? 'pointer' : 'not-allowed', opacity: (deleteConfirmText === 'HAPUS' && !isDeleting) ? 1 : 0.5, transition: 'all 0.2s' }}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
