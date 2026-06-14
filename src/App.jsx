import { useState, useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import { AlertTriangle, X, Check, XCircle, Loader2 } from 'lucide-react'
import Sidebar from './components/layout/Sidebar'
import Topbar  from './components/layout/Topbar'
import DashboardPage     from './pages/DashboardPage'
import MonitoringPage    from './pages/MonitoringPage'
import HistoryPage       from './pages/HistoryPage'
import NotificationsPage from './pages/NotificationsPage'
import SettingsPage      from './pages/SettingsPage'
export default function App() {
  const [page,      setPage]      = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [notifs,    setNotifs]    = useState(() => {
    const saved = localStorage.getItem('voltEdge_notifications')
    if (saved) return JSON.parse(saved)
    return [
      {
        id: 'welcome-notification',
        type: 'info',
        title: 'Sistem VoltEdge Aktif',
        msg: 'Selamat datang! Sistem monitoring VoltEdge Anda siap bekerja.',
        time: new Date().toLocaleTimeString('id-ID'),
        read: false
      }
    ]
  })

  
  const [firstRun, setFirstRun] = useState(() => !localStorage.getItem('voltEdge_setupDone'))
  const [setupForm, setSetupForm] = useState({
    max_current: localStorage.getItem('voltEdge_maxCurrent') || '',
    price_kwh:   localStorage.getItem('voltEdge_priceKwh')   || ''
  })
  const [setupError, setSetupError] = useState('')
  const [skipWaiting, setSkipWaiting] = useState(() => !!localStorage.getItem('voltEdge_setupDone'))

  
  const [deviceInfo, setDeviceInfo] = useState({
    name: 'VoltEdge Panel Utama',
    mac_address: localStorage.getItem('voltEdge_macAddress') || '20E7C8674D3C',
    location: 'Panel Utama',
    status: 'offline',
    max_current_limit: parseFloat(localStorage.getItem('voltEdge_maxCurrent') || '5.0'),
    price_per_kwh: parseFloat(localStorage.getItem('voltEdge_priceKwh') || '1444.70')
  })

  
  const [metrics, setMetrics] = useState({
    voltage: 0,
    current: 0,
    power: 0,
    powerFactor: 1.0,
    frequency: 50,
    gas: 0,
    relayActive: false
  })

  
  const [logs, setLogs] = useState([])

  
  const [user, setUser] = useState({
    id:    'default-user-uuid',
    name:  'VoltEdge User',
    email: 'admin@voltedge.com',
    photo: null,
  })

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 900px)').matches || window.innerWidth <= 900
  })

  const mqttClientRef   = useRef(null)
  const gasAlertArmed   = useRef(true)   
  const [mqttConnected, setMqttConnected] = useState(false)

  
  useEffect(() => {
    const mac = deviceInfo.mac_address.trim().toUpperCase()
    
    const brokerUrl = `wss://broker.hivemq.com:8884/mqtt`

    console.log(`[MQTT] Connecting to ${brokerUrl} | topic: voltedge/telemetry/${mac}`)
    const client = mqtt.connect(brokerUrl, {
      clientId:        `voltedge-web-${Math.random().toString(16).slice(2, 8)}`,
      keepalive:       60,
      reconnectPeriod: 3000,
      connectTimeout:  30 * 1000,
    })

    client.on('connect', () => {
      console.log('[MQTT] Connected directly to broker')
      setMqttConnected(true)
      setDeviceInfo(prev => ({ ...prev, status: 'online' }))
      client.subscribe(`voltedge/telemetry/${mac}`)

      
      const configTopic = `voltedge/config/${mac}`
      const configVal = String(parseFloat(localStorage.getItem('voltEdge_maxCurrent') || '5.0'))
      client.publish(configTopic, configVal, { retain: true })
      console.log(`[MQTT] Auto-published current limit: ${configVal}A to ${configTopic}`)
    })

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString())
        
        const newMetrics = {
          voltage: parseFloat(payload.voltage || 0),
          current: parseFloat(payload.current || 0),
          power: parseFloat(payload.power || 0),
          powerFactor: parseFloat(payload.pf || payload.powerFactor || 1.0),
          frequency: parseFloat(payload.frequency || 50),
          gas: parseInt(payload.gas || 0),
          relayActive: payload.relay === 'true' || payload.relay === true,
          alertType: payload.alert || ''
        }

        setMetrics(newMetrics)
        setDeviceInfo(prev => ({ ...prev, status: 'online' }))

        
        const newLogEntry = {
          id: Date.now() + Math.random().toString(),
          time: new Date().toLocaleTimeString('id-ID'),
          voltage: newMetrics.voltage,
          current: newMetrics.current,
          power: newMetrics.power,
          energy: parseFloat(payload.energy || 0),
          powerFactor: newMetrics.powerFactor,
          frequency: newMetrics.frequency,
          gas: newMetrics.gas,
          status: newMetrics.power > (deviceInfo.max_current_limit * 220) ? 'Overload' : 'Normal'
        }

        setLogs(prev => {
          const next = [newLogEntry, ...prev]
          if (next.length > 25) next.pop()
          return next
        })

        
        const isOverload   = newMetrics.alertType === 'overload' || (newMetrics.current > deviceInfo.max_current_limit)
        const isGasDanger  = newMetrics.alertType === 'gas' || (newMetrics.gas >= 2000)
        
        const isRelayTrip  = !newMetrics.relayActive && newMetrics.voltage < 1 && !isGasDanger && !isOverload

        
        if (!gasAlertArmed.current && newMetrics.gas < 1500) {
          gasAlertArmed.current = true
          console.log('[GAS] Sensor gas re-armed (gas sudah turun ke aman)')
        }

        if (isGasDanger && gasAlertArmed.current) {
          setGlobalAlert(prev => {
            if (!prev) {
              addNotification('Bahaya Asap/Gas!', `MQ-2 nilai ${newMetrics.gas}. Relay diputus!`, 'danger')
              return {
                type: 'gas',
                title: 'ASAP/GAS BERBAHAYA!',
                msg: `MQ-2 mendeteksi bahaya gas/asap (nilai: ${newMetrics.gas}). Relay telah diputus.`,
                time: new Date().toLocaleTimeString('id-ID')
              }
            }
            return prev
          })
        } else if (isOverload) {
          setGlobalAlert(prev => {
            if (!prev) {
              addNotification('Overload Terdeteksi', `Arus ${newMetrics.current.toFixed(2)}A melebihi batas ${deviceInfo.max_current_limit}A.`, 'danger')
              return {
                type: 'overload',
                title: 'OVERLOAD TERDETEKSI!',
                msg: `Arus listrik terdeteksi tinggi (${newMetrics.current.toFixed(2)}A). Relay telah diputus otomatis.`,
                time: new Date().toLocaleTimeString('id-ID')
              }
            }
            return prev
          })
        } else if (isRelayTrip) {
          
          gasAlertArmed.current = true
          setGlobalAlert(prev => {
            if (!prev) {
              addNotification('Daya Terputus!', 'Relay ESP32 diputus — semua nilai 0. Periksa sensor.', 'danger')
              return {
                type: 'gas',  
                title: 'DAYA TERPUTUS!',
                msg: `Relay ESP32 diputus dan semua nilai menjadi 0. Kemungkinan gas/asap terdeteksi. MQ-2: ${newMetrics.gas}. Periksa perangkat!`,
                time: new Date().toLocaleTimeString('id-ID')
              }
            }
            return prev
          })
        } else {
          
          
          setGlobalAlert(prev => {
            if (!prev) return null
            if (prev.type === 'gas') return prev  
            return null  
          })
          setShowConfirm(false)
          setUserChecked(false)
        }

      } catch (err) {
        console.error('[MQTT] Message parsing error:', err)
      }
    })

    client.on('close', () => {
      console.log('[MQTT] Connection closed')
      setMqttConnected(false)
      setDeviceInfo(prev => ({ ...prev, status: 'offline' }))
    })

    mqttClientRef.current = client

    return () => {
      if (client) {
        client.end()
      }
    }
  }, [deviceInfo.mac_address])

  
  const handleUpdateSettings = (newSettings) => {
    localStorage.setItem('voltEdge_macAddress', newSettings.mac_address)
    localStorage.setItem('voltEdge_maxCurrent', newSettings.max_current_limit.toString())
    localStorage.setItem('voltEdge_priceKwh', newSettings.price_per_kwh.toString())

    setDeviceInfo(prev => ({
      ...prev,
      mac_address: newSettings.mac_address,
      max_current_limit: newSettings.max_current_limit,
      price_per_kwh: newSettings.price_per_kwh
    }))

    
    if (mqttClientRef.current && mqttConnected) {
      const configTopic = `voltedge/config/${newSettings.mac_address.toUpperCase()}`
      const configVal = String(newSettings.max_current_limit)
      mqttClientRef.current.publish(configTopic, configVal, { retain: true })
      console.log(`[MQTT] Published new overload limit: ${configVal}A to ${configTopic}`)
    }
  }

  
  const [globalAlert, setGlobalAlert] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [userChecked, setUserChecked] = useState(false)
  const alarmRef = useRef(null)

  const playAlarm = () => {
    if (!alarmRef.current) {
      alarmRef.current = new Audio('/assets/alarm.mp3')
      alarmRef.current.loop = true
    }
    alarmRef.current.currentTime = 0
    alarmRef.current.play().catch((err) => {
      console.warn("Autoplay audio diblokir browser:", err)
    })
  }
  const stopAlarm = () => {
    if (alarmRef.current) {
      alarmRef.current.pause()
      alarmRef.current.currentTime = 0
      alarmRef.current = null
    }
  }

  useEffect(() => {
    if (globalAlert && !userChecked) {
      playAlarm()
    } else {
      stopAlarm()
    }
  }, [globalAlert, userChecked])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.matchMedia('(max-width: 900px)').matches || window.innerWidth <= 900)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const addNotification = (title, msg, type = 'info') => {
    setNotifs(prev => [{
      id: Date.now() + Math.random().toString(),
      title, msg, time: new Date().toLocaleTimeString('id-ID'), type, read: false
    }, ...prev])
  }

  useEffect(() => {
    localStorage.setItem('voltEdge_notifications', JSON.stringify(notifs))
  }, [notifs])

  const navigate = (p) => {
    setPage(p)
  }

  const unread = notifs.filter(n => !n.read).length

  
  const latestEnergy = logs.length > 0 ? logs[0].energy : 0

  const getBaselineEnergy = (currentEnergy) => {
    const todayStr = new Date().toLocaleDateString('id-ID'); 
    const monthStr = new Date().getMonth() + '-' + new Date().getFullYear(); 

    let storedDay = localStorage.getItem('voltEdge_baselineDayDate');
    let storedDayKwh = localStorage.getItem('voltEdge_baselineDayKwh');
    let storedMonth = localStorage.getItem('voltEdge_baselineMonthDate');
    let storedMonthKwh = localStorage.getItem('voltEdge_baselineMonthKwh');

    const currentEnergyNum = parseFloat(currentEnergy || 0);

    
    if (!storedDay || storedDay !== todayStr || !storedDayKwh || parseFloat(storedDayKwh) > currentEnergyNum) {
      localStorage.setItem('voltEdge_baselineDayDate', todayStr);
      localStorage.setItem('voltEdge_baselineDayKwh', currentEnergyNum.toString());
      storedDayKwh = currentEnergyNum.toString();
    }

    
    if (!storedMonth || storedMonth !== monthStr || !storedMonthKwh || parseFloat(storedMonthKwh) > currentEnergyNum) {
      localStorage.setItem('voltEdge_baselineMonthDate', monthStr);
      localStorage.setItem('voltEdge_baselineMonthKwh', currentEnergyNum.toString());
      storedMonthKwh = currentEnergyNum.toString();
    }

    const dayBaseline = parseFloat(storedDayKwh);
    const monthBaseline = parseFloat(storedMonthKwh);

    const dailyKwh = Math.max(0, currentEnergyNum - dayBaseline);
    const monthlyKwh = Math.max(0, currentEnergyNum - monthBaseline);

    return { dailyKwh, monthlyKwh };
  }

  const { dailyKwh, monthlyKwh } = getBaselineEnergy(latestEnergy);
  const costToday = dailyKwh * deviceInfo.price_per_kwh;


  
  const handleSetupSubmit = () => {
    const amp  = parseFloat(setupForm.max_current)
    const tarif = parseFloat(setupForm.price_kwh)
    if (!setupForm.max_current || isNaN(amp) || amp <= 0)
      return setSetupError('Masukkan batas arus yang valid (contoh: 5)')
    if (!setupForm.price_kwh || isNaN(tarif) || tarif <= 0)
      return setSetupError('Masukkan tarif listrik yang valid (contoh: 1444.70)')
    localStorage.setItem('voltEdge_maxCurrent', amp.toString())
    localStorage.setItem('voltEdge_priceKwh',   tarif.toString())
    localStorage.setItem('voltEdge_setupDone',  'true')
    setDeviceInfo(prev => ({ ...prev, max_current_limit: amp, price_per_kwh: tarif }))
    setFirstRun(false)
    setSetupError('')

    
    if (mqttClientRef.current && mqttConnected) {
      const configTopic = `voltedge/config/${deviceInfo.mac_address.toUpperCase()}`
      const configVal = String(amp)
      mqttClientRef.current.publish(configTopic, configVal, { retain: true })
      console.log(`[MQTT] Published initial limit: ${configVal}A to ${configTopic}`)
    }
  }

  
  if (firstRun) {
    const inp = {
      width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, fontWeight: 500,
      background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(56,189,248,0.2)',
      color: '#F1F5F9', outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.2s'
    }
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#020617',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        {}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(56,189,248,0.12) 0%, transparent 70%)'
        }} />

        <div style={{
          width: '100%', maxWidth: 460, position: 'relative', zIndex: 1,
          animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)'
        }}>
          {}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(34,211,238,0.1))',
              border: '1px solid rgba(56,189,248,0.3)',
              marginBottom: 16, fontSize: 28
            }}></div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#F1F5F9', margin: '0 0 6px', letterSpacing: '-0.03em' }}>
              Selamat Datang di <span style={{ color: '#38BDF8' }}>VoltEdge</span>
            </h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
              Sistem monitoring listrik IoT berbasis ESP32.<br/>Atur konfigurasi dasar sebelum memulai.
            </p>
          </div>

          {}
          <div style={{
            background: 'linear-gradient(160deg, rgba(15,23,42,0.95), rgba(7,12,30,0.98))',
            border: '1px solid rgba(56,189,248,0.15)',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(56,189,248,0.08)'
          }}>
            {}
            <div style={{ height: 3, background: 'linear-gradient(90deg, #38BDF8, #22D3EE, #38BDF8)', backgroundSize: '200%', animation: 'shimmer 3s linear infinite' }} />

            <div style={{ padding: '28px 28px 24px' }}>
              {}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                   Batas Arus Maksimum
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" min="0.1" step="0.1"
                    placeholder="Contoh: 5"
                    value={setupForm.max_current}
                    onChange={e => { setSetupForm(p => ({ ...p, max_current: e.target.value })); setSetupError('') }}
                    style={inp}
                    onFocus={e => e.target.style.borderColor = 'rgba(56,189,248,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(56,189,248,0.2)'}
                  />
                  <span style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 12, fontWeight: 700, color: '#38BDF8'
                  }}>A</span>
                </div>
                <p style={{ fontSize: 11, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                  Relay &amp; buzzer akan aktif otomatis jika arus melebihi nilai ini.
                </p>
              </div>

              {}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#22D3EE', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                   Tarif Dasar Listrik
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 12, fontWeight: 700, color: '#22D3EE'
                  }}>Rp</span>
                  <input
                    type="number" min="0" step="0.01"
                    placeholder="Contoh: 1444.70"
                    value={setupForm.price_kwh}
                    onChange={e => { setSetupForm(p => ({ ...p, price_kwh: e.target.value })); setSetupError('') }}
                    style={{ ...inp, paddingLeft: 38 }}
                    onFocus={e => e.target.style.borderColor = 'rgba(34,211,238,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(56,189,248,0.2)'}
                  />
                  <span style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 12, fontWeight: 700, color: '#22D3EE'
                  }}>/kWh</span>
                </div>
                <p style={{ fontSize: 11, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                  Digunakan untuk estimasi biaya listrik harian. (PLN: Rp 1.444,70/kWh)
                </p>
              </div>

              {}
              {setupError && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                  fontSize: 12, color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  {setupError}
                </div>
              )}

              {}
              <button
                onClick={handleSetupSubmit}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #38BDF8, #22D3EE)',
                  color: '#020617', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', letterSpacing: '0.02em',
                  boxShadow: '0 0 24px rgba(56,189,248,0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(56,189,248,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(56,189,248,0.35)' }}
              >
                 Mulai Monitoring
              </button>
            </div>
          </div>

          {}
          <p style={{ textAlign: 'center', fontSize: 11, color: '#334155', marginTop: 16 }}>
            Pengaturan dapat diubah kapan saja di halaman Settings.
          </p>
        </div>

        <style>{`
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            from { background-position: 200% center; }
            to   { background-position: -200% center; }
          }
        `}</style>
      </div>
    )
  }

  
  if (logs.length === 0 && !skipWaiting) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', backgroundColor: '#020617', gap: 20,
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        {}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(56,189,248,0.08) 0%, transparent 70%)'
        }} />

        {}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', width: 90, height: 90, borderRadius: '50%',
            border: '2px solid rgba(56,189,248,0.15)',
            animation: 'ringPulse 1.8s ease-out infinite'
          }} />
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(56,189,248,0.08)',
            border: '1px solid rgba(56,189,248,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Loader2 size={28} style={{ color: '#38BDF8', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>

        {}
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 380 }}>
          <h3 style={{ color: '#F1F5F9', fontSize: 18, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Menunggu Sinyal ESP32...
          </h3>
          <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 6px', lineHeight: 1.6 }}>
            Pastikan ESP32 kamu <strong style={{ color: '#94A3B8' }}>sudah menyala</strong> dan terhubung ke WiFi.
          </p>
          <p style={{ color: '#334155', fontSize: 11, margin: 0 }}>
            Data akan tampil otomatis saat perangkat mulai mengirim.
          </p>
        </div>

        {}
        <div style={{
          background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(56,189,248,0.1)',
          borderRadius: 14, padding: '14px 22px',
          display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Batas Arus</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#38BDF8' }}>{deviceInfo.max_current_limit}<span style={{ fontSize: 12, color: '#64748B', marginLeft: 2 }}>A</span></div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Tarif Listrik</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#22D3EE' }}>Rp {deviceInfo.price_per_kwh.toLocaleString('id-ID')}<span style={{ fontSize: 11, color: '#64748B', marginLeft: 2 }}>/kWh</span></div>
          </div>
        </div>

        {}
        <button
          onClick={() => setSkipWaiting(true)}
          style={{
            padding: '10px 28px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'linear-gradient(135deg, #38BDF8, #22D3EE)',
            border: 'none', color: '#020617', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(56,189,248,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(56,189,248,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(56,189,248,0.3)' }}
        >
          Masuk ke Dashboard
        </button>
        <p style={{ fontSize: 11, color: '#334155', margin: 0 }}>
          ESP32 belum konek? Dashboard tetap bisa dibuka, data masuk otomatis nanti.
        </p>

        <style>{`
          @keyframes ringPulse {
            0%   { transform: scale(0.85); opacity: 0.8; }
            100% { transform: scale(1.7);  opacity: 0; }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  
  return (
    <div style={{ position: 'relative', display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#020617', paddingBottom: isMobile ? 60 : 0 }}>
      {}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url("/assets/monitoring.avif")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.20, pointerEvents: 'none', zIndex: 0 }} />

      {}
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
            {}
            <div style={{
              position: 'fixed', inset: 0, zIndex: 99998,
              background: 'rgba(2,6,23,0.82)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              animation: 'backdropIn 0.3s ease',
            }} />

            {}
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

                {}
                <div style={{
                  height: 4,
                  background: `linear-gradient(90deg, transparent, ${accent}, ${accent}, transparent)`,
                  animation: 'shimmer 2s linear infinite',
                  backgroundSize: '200% 100%',
                }} />

                {}
                <div style={{
                  position: 'absolute', top: 40, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${accentGlw} 0%, transparent 70%)`,
                  animation: 'glowPulse 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />

                {}
                <div style={{ padding: '28px 28px 24px' }}>

                  {}
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

                  {}
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

                  {}
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
                          onClick={() => {
                            
                            gasAlertArmed.current = false
                            setGlobalAlert(null)
                            setUserChecked(true)
                            setShowConfirm(false)

                            
                            if (mqttClientRef.current && mqttConnected) {
                              const resetTopic = `voltedge/reset/${deviceInfo.mac_address.toUpperCase()}`
                              mqttClientRef.current.publish(resetTopic, "reset")
                              console.log(`[MQTT] Published remote reset command to ${resetTopic}`)
                            }
                          }}
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
          {page === 'dashboard'     && <DashboardPage addNotification={addNotification} metrics={metrics} logs={logs} deviceInfo={deviceInfo} costToday={costToday} dailyKwh={dailyKwh} monthlyKwh={monthlyKwh} latestEnergy={latestEnergy} />}
          {page === 'monitoring'    && <MonitoringPage metrics={metrics} history={logs} deviceInfo={deviceInfo} />}
          {page === 'history'       && <HistoryPage logs={logs} />}
          {page === 'notifications' && <NotificationsPage notifs={notifs} setNotifs={setNotifs} />}
          {page === 'settings'      && <SettingsPage deviceInfo={deviceInfo} onUpdateSettings={handleUpdateSettings} />}
        </main>
      </div>
    </div>
  )
}