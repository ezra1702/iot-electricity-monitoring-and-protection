# ✅ Checkpoint 3 — VoltEdge IoT Dashboard
**Tanggal:** 26 April 2026  
**Sesi:** Malam (20:25 – 21:10 WIB)

---

## 🔧 Apa yang Dikerjakan Hari Ini

### 1. Fitur Overload Dinamis via MQTT (Opsi 2 — IoT Lanjutan)
**File:** `IoT/esp32_integration.ino`, `backend/server.js`

- ESP32 sekarang **Subscribe** ke topik `voltedge/config/{MAC}` untuk menerima batas Ampere secara *live* dari Web tanpa flash ulang.
- Fungsi `mqttCallback()` ditambahkan: menerima pesan → update `currentThreshold` secara real-time.
- Di `loop()`: ESP32 cek arus setiap 2 detik. Jika arus > threshold selama 2x berturut-turut → `activateRelay("OVERLOAD")` → relay diputus + buzzer.
- Backend (`server.js`): saat device berhasil dipairing, otomatis kirim batas Ampere ke broker MQTT dengan flag `{ retain: true }` (jika ESP32 restart, tetap ingat threshold).

### 2. Fix Tombol Reset ESP32 (Tanpa Kunci)
**File:** `IoT/esp32_integration.ino`

- Sebelumnya: tombol terkunci jika gas/arus masih berbahaya.
- Sekarang: **tekan tombol = langsung reset**, relay nyala kembali, monitoring lanjut normal tanpa syarat apapun.
- Semua counter (`gasHighCount`, `overloadCount`, `alertReason`) di-reset bersih.

### 3. Fix Kompilasi Arduino: Forward Declaration
**File:** `IoT/esp32_integration.ino`

- Error: `'serialDivider' was not declared in this scope` → karena `mqttCallback` ditulis sebelum helper functions.
- Fix: tambahkan Forward Declaration di bagian atas sebelum fungsi MQTT:
  ```cpp
  void serialLog(String tag, String msg);
  void serialDivider(char c = '-', int len = 52);
  void activateRelay(String reason, int gasValue = 0);
  void drawData();
  ```
- Fix tambahan: hapus default argument dari **definisi** fungsi (hanya boleh ada di deklarasi/forward declaration).

### 4. Fix Settings Page — Threshold Dikirim ke ESP32
**File:** `src/pages/SettingsPage.jsx`, `backend/server.js`

- **Masalah lama:** Tombol "Perbarui Threshold" hanya simpan ke `localStorage`, tidak pernah kirim ke backend/MQTT.
- **Fix:** `handleSaveThreshold` sekarang call `PUT /api/devices/:id/threshold` → backend update DB + publish ke `voltedge/config/{MAC}` dengan `retain: true`.
- Tambah validasi: nilai 0A ditolak (harus > 0).
- Tambah loading state: tombol berubah jadi `"Mengirim ke ESP32…"` saat proses.
- Device ID kini disimpan ke `voltEdge_deviceId` saat klik kartu device agar SettingsPage bisa menggunakannya.
- **Endpoint baru Backend:** `PUT /api/devices/:id/threshold`

### 5. Fitur Alarm + Notifikasi Pop-Out Premium
**File:** `src/pages/DashboardPage.jsx`, `backend/server.js`, `database/schema.sql`

- **Database:** Tambah kolom `gas INT` dan `relay_active TINYINT` ke tabel `sensor_data`.
- **Backend:** MQTT message handler sekarang menyimpan `gas` dan `relay_active` ke DB.
- **Dashboard:** 
  - Deteksi **Overload** (arus > threshold) DAN **Gas/Asap** (nilai MQ-2 > 2700 atau `relay_active = 1`).
  - Saat bahaya terdeteksi → `alarm.mp3` diputar otomatis secara looping (`/public/assets/alarm.mp3`).
  - Alarm berhenti otomatis jika kondisi normal kembali atau semua popup ditutup.
  - **Pop-Out Notification** muncul di pojok kanan bawah layar (fixed position):
    - 🟠 Gas/Asap: border oranye, glow oranye.
    - 🔴 Overload: border merah, glow merah.
    - Animasi slide-in dari kanan dengan efek scale.
    - Tombol **X** untuk menutup popup (alarm tetap berbunyi jika masih ada kondisi bahaya di hardware).
    - Keterangan waktu deteksi + label "VoltEdge Alert System".

### 6. Dokumentasi
- **`mqtt.md`** diperbarui: menambahkan dokumentasi topic `voltedge/config/{MAC}`, Retained Message, dan alur overload end-to-end.
- **`opsi2.md`** dibuat: berisi ringkasan penjelasan Opsi 2 (Dynamic Overload via MQTT).

---

## 📁 File yang Diubah

| File | Perubahan |
|---|---|
| `IoT/esp32_integration.ino` | Forward declaration, mqttCallback, overload detection, button reset tanpa kunci |
| `backend/server.js` | Simpan gas+relay ke DB, endpoint `PUT /api/devices/:id/threshold`, publish config MQTT |
| `src/pages/DashboardPage.jsx` | Alarm audio, gas detection, premium pop-out notification |
| `src/pages/SettingsPage.jsx` | Fix threshold: kirim ke backend+MQTT, bukan hanya localStorage |
| `src/pages/DeviceSelectPage.jsx` | Simpan `voltEdge_deviceId` saat klik device |
| `database/schema.sql` | Tambah kolom `gas` dan `relay_active` ke `sensor_data` |
| `mqtt.md` | Update dokumentasi topik config dan retained message |

---

## ⚙️ Topik MQTT Aktif

| Topik | Arah | Keterangan |
|---|---|---|
| `voltedge/telemetry/{MAC}` | ESP32 → Server | Data sensor tiap 2 detik |
| `voltedge/config/{MAC}` | Server → ESP32 | Batas Ampere (retain: true) |

---

## 🛢️ Skema DB Terbaru (sensor_data)
```sql
-- Jalankan ini jika DB sudah ada sebelumnya:
ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS gas INT DEFAULT 0;
ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS relay_active TINYINT(1) DEFAULT 0;
```

---

## 🚨 Penting untuk Sesi Berikutnya
1. **Jalankan ALTER TABLE** di atas di phpMyAdmin/MySQL sebelum testing fitur alarm.
2. **Restart backend** (`node server.js`) agar endpoint threshold baru aktif.
3. **Upload ulang firmware** ESP32 agar `mqttCallback`, `configTopic`, dan logika overload baru aktif.
4. File alarm: pastikan `public/assets/alarm.mp3` ada dan dapat diputar browser.
