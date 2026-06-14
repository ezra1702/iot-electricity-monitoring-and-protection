


export const getLiveMetrics = (status) => {
  const s = status || (Math.random() > 0.94 ? (Math.random() > 0.5 ? 'overload' : 'smoke') : 'normal')
  const isOverload = s === 'overload'
  const voltage    = +(218 + Math.random() * 18).toFixed(1)
  const current    = isOverload ? +(10 + Math.random() * 3).toFixed(2) : +(0.8 + Math.random() * 6).toFixed(2)
  const pf         = +(0.86 + Math.random() * 0.12).toFixed(2)
  const power      = +(voltage * current * pf).toFixed(0)
  const freq       = +(49.7 + Math.random() * 0.6).toFixed(2)
  const energy     = +(0.001 + Math.random() * 0.006).toFixed(4)
  return { voltage, current, power, energy, powerFactor: pf, frequency: freq, status: s, timestamp: new Date() }
}


const walk = (start, min, max, step) => {
  let v = start
  return Array.from({ length: 30 }, (_, i) => {
    v += (Math.random() - 0.5) * step
    v = Math.max(min, Math.min(max, v))
    const t = new Date(); t.setMinutes(t.getMinutes() - (29 - i) * 2)
    return { x: t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), y: +v.toFixed(2) }
  })
}

export const genVoltageTimeSeries  = () => walk(226, 210, 242, 6)
export const genCurrentTimeSeries  = () => walk(3.2, 0.5, 9.5, 1.2)
export const genPowerTimeSeries    = () => walk(740, 200, 2300, 180)


export const genEnergyHistory = (days = 14) => {
  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now); d.setDate(d.getDate() - (days - 1 - i))
    const kwh = +(2.5 + Math.random() * 4.5).toFixed(2)
    return {
      date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      kwh,
      cost: Math.round(kwh * 1444),
    }
  })
}


export const DEVICES = [
  { id: 'ESP32-3E01', name: 'Panel Utama',    location: 'Ruang Server', status: 'online',  ip: '192.168.1.101', fw: 'v2.1.4', rssi: -42, uptime: '3d 14h' },
  { id: 'ESP32-9F12', name: 'Panel Lantai 2', location: 'Lantai 2',     status: 'online',  ip: '192.168.1.102', fw: 'v2.1.4', rssi: -61, uptime: '1d 6h'  },
  { id: 'ESP32-2A33', name: 'Panel Workshop', location: 'Workshop',      status: 'offline', ip: '192.168.1.103', fw: 'v2.0.9', rssi: -82, uptime: '—'      },
]


export const NOTIFICATIONS_DATA = [
  { id: 1, type: 'danger',  title: 'Overload Terdeteksi',    msg: 'Arus 11.4A melebihi batas 10A di Panel Utama',       time: '2 mnt lalu',  read: false },
  { id: 2, type: 'warning', title: 'Tegangan Tidak Stabil',  msg: 'Fluktuasi ±12V terdeteksi di Panel Lantai 2',         time: '18 mnt lalu', read: false },
  { id: 3, type: 'success', title: 'Relay Dipulihkan',        msg: 'Aliran listrik kembali normal di Panel Utama',         time: '45 mnt lalu', read: true  },
  { id: 4, type: 'info',    title: 'Perangkat Terhubung',    msg: 'ESP32-9F12 berhasil tersambung ke MQTT broker',        time: '2 jam lalu',  read: true  },
  { id: 5, type: 'warning', title: 'Asap Terdeteksi',         msg: 'MQ-2 ADC=1820 melebihi threshold di Workshop',        time: '3 jam lalu',  read: true  },
  { id: 6, type: 'info',    title: 'Server Restart',          msg: 'Backend server melakukan scheduled restart',           time: '5 jam lalu',  read: true  },
  { id: 7, type: 'danger',  title: 'Device Offline',         msg: 'ESP32-2A33 tidak merespon selama 15 menit',            time: '6 jam lalu',  read: true  },
  { id: 8, type: 'success', title: 'Firmware Update',        msg: 'ESP32-3E01 berhasil update ke firmware v2.1.4',        time: '1 hari lalu', read: true  },
]


export const HISTORY_LOGS = Array.from({ length: 60 }, (_, i) => {
  const statuses = ['normal', 'normal', 'normal', 'overload', 'smoke']
  const st = statuses[Math.floor(Math.random() * statuses.length)]
  const devices = ['ESP32-3E01', 'ESP32-9F12']
  const d = new Date(); d.setMinutes(d.getMinutes() - i * 12)
  const v = +(218 + Math.random() * 18).toFixed(1)
  const a = +(0.8 + Math.random() * 7).toFixed(2)
  const pf = +(0.86 + Math.random() * 0.12).toFixed(2)
  return {
    id: i + 1,
    timestamp: d.toLocaleString('id-ID'),
    device: devices[i % 2],
    voltage: v,
    current: a,
    power: +(v * a * pf).toFixed(0),
    energy: +(Math.random() * 0.008 + 0.001).toFixed(4),
    powerFactor: pf,
    status: st,
  }
})


export const LOAD_DISTRIBUTION = {
  labels: ['Panel Utama', 'Lantai 2', 'Workshop', 'Cadangan'],
  series: [47, 29, 17, 7],
}


export const RADAR_MAX = { voltage: 250, current: 10, power: 2500, powerFactor: 1, frequency: 60, energy: 10 }
