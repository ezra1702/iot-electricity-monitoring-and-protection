# 📋 REME — Catatan Proyek IoT Electricity Monitoring & Protection

> Dibuat: 2026-04-18 | Terakhir diperbarui: 2026-04-18 (audit dashboard + rekomendasi)

---

## 🗂️ Apa Proyek Ini?

**IoT Electricity Monitoring & Protection Dashboard** — sistem monitoring listrik real-time berbasis:
- **Hardware:** ESP32 + sensor PZEM-004T (listrik) + MQ-2 (asap) + DS3231 (RTC)
- **Frontend:** React + Vite (dashboard web)
- **Backend (rencana):** Python + FastAPI + MQTT
- **Database:** MySQL

### Fitur Utama
- Monitoring tegangan, arus, daya, energi, power factor secara real-time
- Deteksi status: `normal` / `overload` / `smoke` / `danger`
- Trip relay otomatis saat kondisi bahaya
- Riwayat alert & konsumsi energi
- Estimasi biaya listrik harian & bulanan (tarif Rp/kWh)
- Multi-device, multi-user dengan login

---

## ✅ Sudah Dikerjakan

### 📁 Struktur Direktori Saat Ini

```
energy-dashboard/
├── IoT/
│   └── esp32_integration.ino     ⚠️ PLACEHOLDER — belum diimplementasi
│
├── database/
│   └── schema.sql                ✅ Skema lengkap 11 tabel + views + stored proc
│
├── src/
│   ├── styles/
│   │   └── global.css            ✅ CSS variabel tema (dark/light), animasi
│   │
│   ├── constants/
│   │   ├── theme.js              ✅ STATUS map, TBGMAP (warna per status)
│   │   └── devices.js            ✅ Array DEVICES (data perangkat dummy)
│   │
│   ├── data/
│   │   └── sensorSimulator.js    ✅ Simulasi MQTT — genSensor(), nextStatus()
│   │
│   ├── utils/
│   │   └── formatters.js         ✅ Rp(), fmtTime(), fmtDate(), fmtDateTime(), clamp()
│   │
│   ├── hooks/
│   │   ├── useSensorData.js      ✅ Hook — sensor state, chart, history, alerts (interval 2 detik)
│   │   └── useToast.js           ✅ Hook — toast notification state + addToast()
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Card.jsx          ✅ Container card standar
│   │   │   ├── Pill.jsx          ✅ Badge/label status
│   │   │   ├── Avatar.jsx        ✅ Komponen avatar user
│   │   │   ├── Field.jsx         ✅ Input field dengan label
│   │   │   ├── Toast.jsx         ✅ Komponen notifikasi toast
│   │   │   └── index.js          ✅ Barrel export semua UI
│   │   │
│   │   ├── charts/
│   │   │   ├── Gauge.jsx         ✅ Gauge chart (SVG arc) untuk volt/arus/daya
│   │   │   └── ChartTip.jsx      ✅ Custom tooltip untuk chart
│   │   │
│   │   ├── dashboard/
│   │   │   ├── MetricCard.jsx    ✅ Kartu metrik (nilai sensor + satuan)
│   │   │   ├── CostCard.jsx      ✅ Kartu estimasi biaya harian/bulanan
│   │   │   ├── AlertCard.jsx     ✅ Kartu daftar alert aktif
│   │   │   ├── HistoryTable.jsx  ✅ Tabel riwayat pembacaan sensor
│   │   │   └── DashboardContent.jsx ✅ Assembler semua komponen dashboard
│   │   │
│   │   └── layout/
│   │       ├── Sidebar.jsx       ✅ Sidebar navigasi (Dashboard/Settings/System Info)
│   │       ├── Topbar.jsx        ✅ Header bar (nama device, status, dark mode toggle)
│   │       └── DashboardShell.jsx ✅ Layout wrapper (sidebar + topbar + content)
│   │
│   ├── pages/
│   │   ├── LoginPage.jsx         ✅ Halaman login (email + password)
│   │   ├── DeviceListPage.jsx    ✅ Halaman pilih perangkat (daftar device + status)
│   │   ├── ProfileSettingsPage.jsx ✅ Halaman pengaturan profil + tarif listrik
│   │   └── SystemInfoPage.jsx    ✅ Halaman info sistem (versi firmware, uptime, dll)
│   │
│   ├── App.jsx                   ✅ Root router (~50 baris) — dark mode, page state
│   ├── App.css                   ✅
│   ├── main.jsx                  ✅ Entry point React
│   ├── index.css                 ✅ Import global.css
│   └── tes.html                  📝 File tes standalone HTML
│
├── db_schema_docs.md             ✅ Dokumentasi skema database (ERD + query contoh)
├── implementation_plan.md        ✅ Rencana refactor App.jsx → multi-file
├── reme.md                       📋 File ini
├── package.json                  ✅ Vite + React dependencies
└── vite.config.js                ✅
```

### 🔄 Refactor yang Sudah Selesai
Kode asli 1 file `App.jsx` (±1329 baris) sudah dipecah ke struktur folder industri standar.
Semua file di `src/` sudah terpisah dan terhubung via import/export.

---

## ⚠️ Yang Belum Dikerjakan

| Item | Status | Catatan |
|------|--------|---------|
| `esp32_integration.ino` | ❌ Belum | Masih `Hello World`, perlu implementasi PZEM-004T + MQ-2 + MQTT |
| Backend Python/FastAPI | ❌ Belum | MQTT subscriber + REST API + ML pipeline |
| Koneksi database nyata | ❌ Belum | Frontend masih pakai `sensorSimulator.js` (data dummy) |
| MQTT Broker setup | ❌ Belum | Perlu Mosquitto/HiveMQ/EMQX |
| Deploy | ❌ Belum | — |

---

## 🤖 Rencana Machine Learning (Non-Overkill)

### Stack
```
pip install scikit-learn pandas numpy
```
Tidak butuh GPU. Tidak butuh TensorFlow/PyTorch. Cukup scikit-learn.

---

### 1. 🔍 Isolation Forest — Anomaly Detection

**Tujuan:** Mendeteksi pola listrik yang tidak wajar secara otomatis, lebih cerdas
dari threshold manual yang kaku.

**Cara Kerja:**
- Dilatih dari histori `sensor_readings` (voltage, current, power, power_factor)
- Tidak butuh data berlabel — **unsupervised**
- Re-train otomatis seminggu sekali via scheduler/cron

**Contoh Implementasi:**
```python
# backend/ml/anomaly.py
from sklearn.ensemble import IsolationForest
import pandas as pd
import pickle

def train(conn):
    df = pd.read_sql("""
        SELECT voltage, current, power, power_factor
        FROM sensor_readings
        ORDER BY recorded_at DESC
        LIMIT 5000
    """, conn)

    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(df)

    with open("models/anomaly_detector.pkl", "wb") as f:
        pickle.dump(model, f)

    print(f"[OK] Anomaly model trained on {len(df)} samples")

def predict(model, voltage, current, power, power_factor):
    X = [[voltage, current, power, power_factor]]
    score  = model.decision_function(X)[0]   # makin negatif = makin anomali
    is_anom = model.predict(X)[0] == -1       # True = anomali
    return { "is_anomaly": is_anom, "score": round(score, 4) }
```

**Dipanggil dari:**
```python
# Di MQTT subscriber, tiap pesan data sensor masuk:
result = predict(model, volt, curr, pwr, pf)
if result["is_anomaly"]:
    create_alert(device_id, "anomaly", result["score"])
```

**Output di Dashboard:**
- Badge `⚠️ Pola tidak biasa` di kartu MetricCard
- Alert masuk ke tabel `alerts` dengan `alert_type = 'anomaly'`
- Score ditampilkan di tooltip

**Kapan Train?**
- Pertama kali: setelah 7 hari data terkumpul
- Selanjutnya: otomatis tiap Senin jam 02.00 (cron)

---

### 2. 📈 Linear Regression — Prediksi Tagihan Akhir Bulan

**Tujuan:** Menampilkan estimasi biaya listrik bulan ini berdasarkan tren 
konsumsi hari-hari yang sudah berlalu.

**Cara Kerja:**
- Feature: hari ke-N dalam bulan (1, 2, 3, ...)
- Target: `energy_kwh_used` per hari dari tabel `energy_daily`
- Prediksi kWh untuk sisa bulan → kalikan tarif → total estimasi

**Contoh Implementasi:**
```python
# backend/ml/forecaster.py
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import date

def predict_monthly_cost(conn, device_id, tariff_per_kwh):
    today = date.today()
    year, month = today.year, today.month

    rows = conn.execute("""
        SELECT DAY(date) AS day_num, energy_kwh_used
        FROM energy_daily
        WHERE device_id = %s AND YEAR(date) = %s AND MONTH(date) = %s
        ORDER BY date ASC
    """, (device_id, year, month)).fetchall()

    if len(rows) < 3:
        return None  # Data belum cukup (minimal 3 hari)

    X = np.array([r[0] for r in rows]).reshape(-1, 1)
    y = np.array([r[1] for r in rows])

    model = LinearRegression().fit(X, y)

    # Prediksi sisa hari dalam bulan
    days_in_month = 30  # atau hitung dari calendar
    day_today = today.day
    remaining = np.arange(day_today + 1, days_in_month + 1).reshape(-1, 1)

    kwh_sudah = y.sum()
    kwh_prediksi = model.predict(remaining).clip(min=0).sum()
    total_kwh = kwh_sudah + kwh_prediksi
    total_cost = total_kwh * tariff_per_kwh

    return {
        "kwh_so_far":       round(kwh_sudah, 3),
        "kwh_predicted":    round(kwh_prediksi, 3),
        "kwh_total_est":    round(total_kwh, 3),
        "cost_estimate":    int(total_cost),     # dalam Rupiah
        "days_used":        len(rows),
        "confidence":       "high" if len(rows) >= 14 else "medium" if len(rows) >= 7 else "low"
    }
```

**Output di Dashboard:**
```
CostCard → "Estimasi Tagihan Bulan Ini"
┌─────────────────────────────┐
│ Rp 127.500                  │
│ Berdasarkan 12 hari terakhir│
│ Proyeksi: 38.4 kWh/bulan   │
│ Confidence: medium ●●○     │
└─────────────────────────────┘
```

**Kapan Dijalankan?**
- Dipanggil via REST API dari frontend setiap load halaman dashboard
- Atau di-cache di Redis/database tiap jam (lebih efisien)

---

### 📁 Struktur Backend ML (Rencana)

```
backend/
├── ml/
│   ├── anomaly.py        ← Isolation Forest (~50 baris)
│   ├── forecaster.py     ← Linear Regression (~50 baris)
│   └── smart_alert.py    ← Z-Score rolling (~20 baris) — tidak butuh training
│
├── models/               ← File .pkl hasil training (git-ignored)
│   ├── anomaly_detector.pkl
│   └── .gitkeep
│
├── api/
│   └── ml_endpoints.py   ← FastAPI routes: /ml/anomaly, /ml/forecast
│
└── scheduler/
    └── retrain_jobs.py   ← Auto-retrain mingguan
```

---

### ⚡ Urutan Implementasi ML

```
[1] Selesaikan firmware ESP32 (PZEM-004T + MQ-2 → MQTT publish)
      ↓
[2] Setup backend: MQTT subscriber → INSERT ke database
      ↓
[3] Kumpulkan data minimal 7 hari
      ↓
[4] Pasang smart_alert.py (Z-Score) — zero training, langsung jalan
      ↓
[5] Train & deploy anomaly.py (Isolation Forest)
      ↓
[6] Deploy forecaster.py (Linear Regression, aktif setelah hari ke-3 bulan berjalan)
      ↓
[7] Integrasikan hasil ML ke frontend (CostCard + MetricCard + AlertCard)
```

---

## 🎯 Rekomendasi Dashboard — Fitur yang Perlu Ditambah, Dipertahankan & Dihapus

> Berdasarkan audit kode aktual semua komponen di `src/`

---

### ✅ PERTAHANKAN (Sudah Bagus, Tidak Perlu Diubah)

| Komponen | Alasan Dipertahankan |
|---|---|
| `Gauge.jsx` (SVG arc) | Visual real-time voltage & current sangat informatif |
| `AlertCard.jsx` + konfirmasi dismiss | Konfirmasi sebelum dismiss alert = UX safety yang baik |
| `CostCard.jsx` (harian + bulanan) | Dua card biaya gradient orange sudah jelas & menarik |
| `DeviceListPage` — pairing wizard 4 langkah | Flow scan WiFi → konfigurasi → connecting → sukses sudah solid |
| Dark/light mode toggle | Wajib untuk dashboard monitoring 24 jam |
| Toast notification system | Non-blocking alert sudah tepat |

---

### ➕ TAMBAHKAN (Fitur yang Kurang tapi Penting)

#### 🔴 Prioritas Tinggi

**1. Gauge untuk Power Factor**
- Saat ini PF hanya tampil di `MetricCard` (angka + bar biasa)
- PF adalah indikator kesehatan sistem — layak dapat Gauge tersendiri
- `DashboardContent.jsx` baris 53: PF pakai `MetricCard`, bukan `Gauge`

**2. Indikator Smoke / MQ-2 di Dashboard**
- ❌ Tidak ada visualisasi nilai `smoke_raw` sama sekali di dashboard!
- PZEM sudah punya 2 gauge (voltage + current), tapi MQ-2 tidak ada representasinya
- Tambahkan: progress bar atau gauge `Smoke Level` dengan warna hijau→kuning→merah

**3. Status Relay (ON/OFF) yang Terlihat Jelas**
- Saat ini status hanya dari `Pill` label (`normal`/`overload`/`smoke`)
- Perlu **tombol / indikator relay** yang eksplisit menunjukkan apakah aliran listrik sedang diputus atau tidak
- Contoh: toggle switch besar dengan label `Relay: ON` / `Relay: TRIPPED`

**4. Notifikasi ML Anomaly di Dashboard**
- Saat ML backend aktif, hasil anomaly detection perlu ditampilkan
- Tambahkan badge `⚠️ Pola Tidak Normal` di `MetricCard` atau area status bar
- `AlertCard` saat ini hanya handle `overload` dan `smoke` — perlu tipe `anomaly`

#### 🟡 Prioritas Sedang

**5. Mini Trend Indicator per MetricCard**
- Setiap `MetricCard` (voltage, current, power, PF) hanya tampil nilai instant
- Tambahkan panah ↑↓ atau sparkline kecil (3-5 titik terakhir) di pojok card
- Bisa dihitung dari `history` yang sudah ada di `useSensorData.js`

**6. Estimasi Tagihan Bulan Ini (dari ML Linear Regression)**
- `CostCard` monthly saat ini hanya `monthly_cost = daily_cost × 30` (perkiraan kasar)
- Setelah ML aktif, ganti dengan hasil `forecaster.py` yang lebih akurat
- Tambahkan label confidence: `●●○ Confidence: Medium`

**7. Tombol Trip Relay Manual**
- User seharusnya bisa memutus/memulihkan aliran listrik dari dashboard
- Berguna saat debugging atau kondisi darurat
- Tampilkan sebagai tombol `"Putus Aliran"` / `"Pulihkan Aliran"` dengan konfirmasi modal

**8. Export Data History**
- `HistoryTable` sudah ada, tapi tidak ada tombol export
- Tambahkan tombol `"Export CSV"` untuk download data history

#### 🟢 Prioritas Rendah (Nice to Have)

**9. Notifikasi Push / Bunyi**
- Saat overload/asap terdeteksi, hanya ada toast + AlertCard
- Pertimbangkan: Web Notification API atau suara alert sederhana

**10. Chart Kumulatif Energi (Bar Chart Harian)**
- Chart saat ini hanya Area Chart real-time (Power + Energy)
- Tambahkan tab kedua: Bar chart konsumsi energi 7/30 hari terakhir
- Data sudah ada di tabel `energy_daily`

---

### ❌ HAPUS / SEDERHANAKAN (Overengineered atau Tidak Relevan)

**1. `DeviceListPage.jsx` — File Terlalu Besar (1017 baris!)**
- Hampir semua kode CSS animasi pairing wizard ada inline di satu file
- Rekomendasi: pecah jadi beberapa file:
  - `PairingModal.jsx` → wizard 4 langkah
  - `WiFiScanner.jsx` → komponen scan radar
  - `DeviceCard.jsx` → kartu device di list

**2. Trend `CostCard` yang Hardcoded**
- `<CostCard trend={2.4} />` dan `<CostCard trend={-1.8} />` — nilai hardcoded!
- Ini menyesatkan karena bukan data nyata
- Hapus atau hitung dari `energy_daily` aktual

**3. `tes.html` di dalam `src/`**
- File `src/tes.html` (18 KB) tidak dipakai oleh Vite build system
- Pindahkan ke folder `docs/` atau hapus kalau sudah tidak dipakai

**4. `MOCK_NEARBY` Data Statis di `DeviceListPage`**
- Scan WiFi masih pakai 3 device dummy yang hardcoded
- Tidak masalah untuk demo, tapi harus diganti saat backend nyata jalan
- Beri komentar `// TODO: replace with real API call`

**5. Chart `Energy ×100` — Label Membingungkan**
- Di `DashboardContent.jsx` baris 90: `name="Energy ×100"`
- Mengalikan energi ×100 hanya supaya kelihatan di chart — ini misleading
- Lebih baik: pakai dual Y-axis (kiri Power/W, kanan Energy/kWh) dari Recharts

---

### 📊 Ringkasan Rekomendasi

```
🔴 WAJIB ditambah (keamanan & fungsional):
   [1] Visualisasi smoke MQ-2 di dashboard
   [2] Indikator status relay yang jelas
   [3] Tipe alert 'anomaly' di AlertCard (untuk ML)

🟡 SEBAIKNYA ditambah (UX lebih baik):
   [4] Mini trend per MetricCard
   [5] CostCard bulanan dari ML forecast
   [6] Tombol trip relay manual + konfirmasi
   [7] Export CSV dari HistoryTable

🟢 OPTIONAL:
   [8] Gauge untuk Power Factor
   [9] Bar chart konsumsi 7/30 hari
   [10] Web Notification / suara alert

❌ HAPUS / PERBAIKI:
   [A] Nilai trend CostCard yang hardcoded
   [B] Label 'Energy ×100' yang misleading → dual Y-axis
   [C] Pecah DeviceListPage.jsx (1017 baris) jadi 3+ file
   [D] Hapus / pindahkan src/tes.html
   [E] Beri TODO comment pada MOCK_NEARBY
```

---

## 📌 Catatan Penting

- Sensor `energy` di PZEM-004T bersifat **akumulatif** — jangan di-reset.
  Pemakaian harian = `energy_end - energy_start` (dihitung di `energy_daily`).
- `smoke_raw` dari MQ-2 bersifat **analog** (ADC 0–4095) — threshold default 1500,
  bisa diubah via `device_settings.smoke_threshold`.
- `recorded_at` diambil dari **DS3231 RTC** (akurat), bukan dari ESP32 internal clock.
- `password_hash` di seed data wajib diganti sebelum deploy production.
