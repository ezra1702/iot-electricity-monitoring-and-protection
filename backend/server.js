const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const mqtt = require('mqtt');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Dinaikan untuk mendukung upload foto Base64

const PORT = process.env.PORT || 5000;

// 1. Setup MySQL Connection
let db;
async function connectDB() {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'rootpassword',
      database: process.env.DB_NAME || 'iot-energy',
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('✅ Connected to MySQL Database');
  } catch (err) {
    console.error('❌ MySQL Connection Error:', err);
  }
}
connectDB();

// 2. Setup MQTT Client Connection
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');

const discoveredDevices  = new Map(); // Auto-Discovery (Map<macAddress, timestamp>)
const deviceAlertState   = new Map(); // Real-time alert state (Map<deviceId, {relayActive, gas}>)

mqttClient.on('connect', () => {
  console.log('✅ Connected to MQTT Broker');
  mqttClient.subscribe('voltedge/telemetry/#');
});

// Listener data masuk dari ESP32
mqttClient.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const macAddress = topic.split('/').pop();
    
    // Cari device berdasarkan mac_address
    let [devices] = await db.execute('SELECT id FROM devices WHERE mac_address = ?', [macAddress]);
    let deviceId;
    
    if (devices.length > 0) {
      deviceId = devices[0].id;
    } else {
      // Auto-register device under default user!
      const defaultUserUuid = 'default-user-uuid';
      
      // Pastikan default user ada di DB terlebih dahulu
      const [users] = await db.execute('SELECT id FROM users WHERE id = ?', [defaultUserUuid]);
      if (users.length === 0) {
        await db.execute(
          'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
          [defaultUserUuid, 'VoltEdge User', 'admin@voltedge.com', '$2a$12$7kP2LwR.V2.X4UvUeM/qOO6v8u70WnCgLecy78jWd/2oGg/K5PReO'] // default password 'admin123'
        );
      }
      
      deviceId = uuidv4();
      await db.execute(
        'INSERT INTO devices (id, user_id, mac_address, name, location, status, max_current_limit, price_per_kwh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [deviceId, defaultUserUuid, macAddress, `VoltEdge Panel (${macAddress})`, 'Panel Utama', 'online', 5.0, 1444.70]
      );
      console.log(`[MQTT] Auto-registered device ${macAddress} under default user.`);
    }

    // Masukkan ke tabel sensor_data
    await db.execute(`
      INSERT INTO sensor_data (device_id, voltage, current, power, energy, frequency, power_factor, gas, relay_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      deviceId,
      payload.voltage      || 0,
      payload.current      || 0,
      payload.power        || 0,
      payload.energy       || 0,
      payload.frequency    || 50,
      payload.power_factor || 1.0,
      payload.gas          || 0,
      payload.relayActive ? 1 : 0
    ]);

    // Simpan status relay & gas di RAM (tidak perlu kolom SQL baru!)
    deviceAlertState.set(deviceId, {
      relayActive: !!payload.relayActive,
      gas:         payload.gas || 0,
      current:     payload.current || 0,
      updatedAt:   Date.now()
    });

    console.log(`[MQTT] Data saved for device ${deviceId} | relay=${payload.relayActive} gas=${payload.gas}`);
  } catch (error) {
    console.error('[MQTT] Error parsing/saving message:', error);
  }
});

// ════════════════════════════════════════════════════════════════
// 3. API ROUTES UNTUK FRONTEND
// ════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// A0. API Discovery (Auto-Scan Alat Baru)
app.get('/api/discovery', (req, res) => {
  const now = Date.now();
  const activeDevices = [];
  
  for (const [mac, lastSeen] of discoveredDevices.entries()) {
    // Tampilkan hanya alat yang nge-ping dalam 30 detik terakhir
    if (now - lastSeen < 30000) { 
      activeDevices.push({ mac_address: mac });
    } else {
      discoveredDevices.delete(mac); // Bersihkan yang sudah mati
    }
  }
  
  res.json({ devices: activeDevices });
});

// A. API Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email tidak ditemukan.' });
    
    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Password salah.' });
    }

    res.json({
      message: 'Login berhasil',
      user: { id: user.id, name: user.name, email: user.email, photo: user.photo || null }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// B. API Register
app.post('/api/auth/register', async (req, res) => {
  const { full_name, email, password } = req.body;

  // Validasi input
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email tidak valid.' });
  }

  try {
    // Cek apakah email sudah terdaftar
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const id = uuidv4();

    // Simpan user baru ke database
    await db.execute(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [id, full_name, email, password_hash]
    );

    res.status(201).json({
      message: 'Akun berhasil dibuat.',
      user: { id, name: full_name, email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// C. API Ambil Profil User (termasuk foto)
app.get('/api/auth/profile/:userId', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, photo, created_at FROM users WHERE id = ?',
      [req.params.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan.' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// C2. API Upload / Update Foto Profil
app.put('/api/auth/photo', async (req, res) => {
  const { user_id, photo } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user_id wajib diisi.' });
  // photo boleh null (hapus foto)

  // Validasi: jika ada foto, harus base64 image
  if (photo && !photo.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Format foto tidak valid. Harus berupa base64 image.' });
  }

  try {
    await db.execute('UPDATE users SET photo = ? WHERE id = ?', [photo || null, user_id]);
    res.json({ message: photo ? 'Foto profil berhasil diperbarui.' : 'Foto profil berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// D. API Update Profil (nama & email)
app.put('/api/auth/profile', async (req, res) => {
  const { user_id, name, email } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user_id wajib diisi.' });
  if (!name?.trim()) return res.status(400).json({ error: 'Nama lengkap wajib diisi.' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email wajib diisi.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Format email tidak valid.' });

  try {
    // Cek apakah email sudah dipakai user lain
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email.trim().toLowerCase(), user_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah digunakan oleh akun lain.' });
    }

    await db.execute(
      'UPDATE users SET name = ?, email = ? WHERE id = ?',
      [name.trim(), email.trim().toLowerCase(), user_id]
    );

    res.json({ message: 'Profil berhasil diperbarui.', user: { name: name.trim(), email: email.trim().toLowerCase() } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// E. API Update Password
app.put('/api/auth/password', async (req, res) => {
  const { user_id, current_password, new_password } = req.body;

  if (!user_id)           return res.status(400).json({ error: 'user_id wajib diisi.' });
  if (!current_password)  return res.status(400).json({ error: 'Password saat ini wajib diisi.' });
  if (!new_password)      return res.status(400).json({ error: 'Password baru wajib diisi.' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });

  try {
    const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [user_id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan.' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Password saat ini salah.' });

    const newHash = await bcrypt.hash(new_password, 12);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user_id]);

    res.json({ message: 'Password berhasil diubah.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// F. API Ambil Daftar Alat (Devices) milik User
app.get('/api/users/:userId/devices', async (req, res) => {
  try {
    const [devices] = await db.execute('SELECT * FROM devices WHERE user_id = ? ORDER BY created_at DESC', [req.params.userId]);
    
    const now = Date.now();
    for (let i = 0; i < devices.length; i++) {
      const [latest] = await db.execute('SELECT timestamp FROM sensor_data WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1', [devices[i].id]);
      if (latest.length > 0) {
        const lastSeen = new Date(latest[0].timestamp).getTime();
        // Jika data terakhir kurang dari 30 detik yang lalu = online
        devices[i].status = (now - lastSeen < 30000) ? 'online' : 'offline';
      } else {
        devices[i].status = 'offline';
      }
    }
    
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// D. API Ambil Data Sensor Terkini untuk Dashboard
app.get('/api/devices/:deviceId/dashboard', async (req, res) => {
  try {
    // Ambil data sensor terbaru (sudah include gas & relay_active)
    const [latestSensor] = await db.execute('SELECT * FROM sensor_data WHERE device_id = ? ORDER BY timestamp DESC LIMIT 1', [req.params.deviceId]);
    
    // Ambil histori logs untuk tabel raw data (15 terakhir)
    const [logs] = await db.execute('SELECT * FROM sensor_data WHERE device_id = ? ORDER BY timestamp DESC LIMIT 15', [req.params.deviceId]);
    
    // Ambil info device (batas arus & tarif)
    const [deviceInfo] = await db.execute('SELECT * FROM devices WHERE id = ?', [req.params.deviceId]);
    
    if (deviceInfo.length > 0) {
      if (latestSensor.length > 0) {
        const lastSeen = new Date(latestSensor[0].timestamp).getTime();
        deviceInfo[0].status = (Date.now() - lastSeen < 30000) ? 'online' : 'offline';
      } else {
        deviceInfo[0].status = 'offline';
      }
    }
    
    // Ambil alert state dari RAM (tidak perlu SQL)
    const alertState = deviceAlertState.get(req.params.deviceId) || { relayActive: false, gas: 0 }

    res.json({
      device:      deviceInfo[0] || null,
      latest:      latestSensor[0] || null,
      logs:        logs,
      alertState:  alertState  // { relayActive, gas, current, updatedAt }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// D2. API Lightweight Khusus Polling Alert Global
app.get('/api/devices/:deviceId/alerts', async (req, res) => {
  try {
    const alertState = deviceAlertState.get(req.params.deviceId) || { relayActive: false, gas: 0, current: 0 }
    const [deviceInfo] = await db.execute('SELECT max_current_limit FROM devices WHERE id = ?', [req.params.deviceId]);
    
    res.json({
      alertState,
      limit: deviceInfo[0]?.max_current_limit || 5
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// G. API Registrasi Alat (Device) Baru
app.post('/api/devices', async (req, res) => {
  const { user_id, mac_address, name, location, max_current_limit, price_per_kwh } = req.body;

  if (!user_id || !name || !mac_address) {
    return res.status(400).json({ error: 'User ID, Nama Perangkat, dan MAC Address wajib diisi.' });
  }

  try {
    const id = uuidv4();
    // Gunakan MAC Address asli dari ESP32 (biasanya mengandung titik dua, biarkan saja agar cocok dengan MQTT Topic)
    const clean_mac = mac_address.trim().toUpperCase();

    await db.execute(
      'INSERT INTO devices (id, user_id, mac_address, name, location, status, max_current_limit, price_per_kwh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, user_id, clean_mac, name.trim(), location?.trim() || '', 'offline', max_current_limit || 5.0, price_per_kwh || 1444.70]
    );

    // Hapus dari radar Auto-Discovery
    discoveredDevices.delete(clean_mac);

    // Kirim konfigurasi Overload ke ESP32 secara Live
    const configTopic = `voltedge/config/${clean_mac}`;
    const overloadLimit = String(max_current_limit || 5.0);
    mqttClient.publish(configTopic, overloadLimit, { retain: true });
    console.log(`[MQTT] Published Overload Limit: ${overloadLimit}A to ${configTopic}`);

    res.status(201).json({ message: 'Perangkat berhasil diregistrasi.', deviceId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// H. API Hapus Alat (Unpair Device)
app.delete('/api/devices/:id', async (req, res) => {
  try {
    const deviceId = req.params.id;
    
    // Hapus sensor_data dari device ini
    await db.execute('DELETE FROM sensor_data WHERE device_id = ?', [deviceId]);
    
    // Hapus device
    await db.execute('DELETE FROM devices WHERE id = ?', [deviceId]);
    
    res.json({ message: 'Perangkat berhasil dihapus (unpaired).' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// I. API Update Threshold & Kirim ke ESP32 via MQTT
app.put('/api/devices/:id/threshold', async (req, res) => {
  try {
    const deviceId = req.params.id;
    const { max_current_limit, price_per_kwh } = req.body;

    if (!max_current_limit || parseFloat(max_current_limit) <= 0) {
      return res.status(400).json({ error: 'Batas arus harus lebih dari 0 Ampere.' });
    }

    // Update di database
    await db.execute(
      'UPDATE devices SET max_current_limit = ?, price_per_kwh = ? WHERE id = ?',
      [parseFloat(max_current_limit), parseFloat(price_per_kwh) || 1444.70, deviceId]
    );

    // Ambil MAC address device untuk publish ke MQTT
    const [rows] = await db.execute('SELECT mac_address FROM devices WHERE id = ?', [deviceId]);
    if (rows.length > 0) {
      const mac = rows[0].mac_address;
      const configTopic = `voltedge/config/${mac}`;
      mqttClient.publish(configTopic, String(max_current_limit), { retain: true });
      console.log(`[MQTT] Updated Overload Limit: ${max_current_limit}A → ${configTopic}`);
    }

    res.json({ message: 'Threshold berhasil diperbarui dan dikirim ke perangkat.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Backend Server running on port ${PORT}`);
});
