# 🚀 VoltEdge IoT System Configuration - Phase 2 (Checkout 2)

Dokumen ini mencatat seluruh konfigurasi, arsitektur, dan protokol komunikasi yang telah berhasil dibangun dan diintegrasikan pada sistem VoltEdge Smart Energy Monitor.

---

## 1. Arsitektur Komunikasi Utama
Sistem menggunakan dua jalur komunikasi yang bekerja secara simultan:
1. **MQTT (Message Queuing Telemetry Transport)**: Digunakan khusus untuk lalu lintas data sensor berkecepatan tinggi dari Hardware (ESP32) ke Backend (Node.js). Sangat ringan dan responsif.
2. **HTTP (REST API)**: Digunakan untuk komunikasi antara Frontend (React Web) dan Backend (Node.js) untuk urusan Registrasi, Autentikasi, dan Pengambilan Data Historis/Dashboard.

---

## 2. Konfigurasi Protokol MQTT (Real-Time Sensor)

Semua proses transmisi data kelistrikan sepenuhnya ditangani melalui protokol MQTT tanpa delay.

### A. Konfigurasi Dasar
* **Broker**: Eclipse Mosquitto
* **Host / IP**: `192.168.1.5` (Local Network IP)
* **Port**: `1883`
* **Interval Transmisi**: Setiap `2000 ms` (2 detik sekali).

### B. Struktur Topik (Topic Structure)
* **Publisher (ESP32)** mengirim ke: `voltedge/telemetry/{MAC_ADDRESS}`
  *(Note: Karakter titik dua `:` pada MAC Address dihilangkan. Contoh: `voltedge/telemetry/A1B2C3D4E5`)*
* **Subscriber (Node.js)** mendengarkan ke: `voltedge/telemetry/#`
  *(Menggunakan hashtag wildcard agar backend dapat menangkap data dari ratusan ESP32 secara bersamaan).*

### C. Payload Data (Format JSON)
Payload yang dikirimkan oleh ESP32 setiap 2 detik memuat parameter kelistrikan dan parameter keamanan (sensor gas & relay):
```json
{
  "voltage": 220.5,
  "current": 1.25,
  "power": 275.6,
  "energy": 0.1500,
  "frequency": 50.0,
  "power_factor": 0.95,
  "gas": 450,
  "relayActive": true
}
```

---

## 3. Sistem Auto-Discovery & Pairing (Keamanan & UX)

Sistem menggunakan alur logika **Device Binding** (Kepemilikan Perangkat) untuk mencegah pembajakan alat oleh akun yang tidak berhak.

* **Alur Penemuan Alat Baru (Radar):**
  1. Jika ESP32 aktif, ia terus mengirim MQTT Payload.
  2. Backend mengecek: Jika `MAC_ADDRESS` **belum ada** di MySQL (`devices`), maka MAC Address dimasukkan ke dalam RAM Backend (`discoveredDevices`).
  3. Frontend Web melakukan *polling* ke endpoint `/api/discovery`.
  4. Web menampilkan UI Radar (AirDrop style) untuk alat yang siap di-*pairing*.
* **Keamanan Eksklusif:**
  Jika sebuah alat sudah di-*pairing* oleh Akun A, alat tersebut otomatis **hilang dari radar** akun manapun. Mengetik input manual MAC Address pun akan ditolak oleh sistem.

---

## 4. Konfigurasi HTTP REST API

Berikut adalah rangkuman API yang menjembatani Frontend Web dan Backend Database MySQL:

| Metode | Endpoint URL | Fungsi Utama |
| :--- | :--- | :--- |
| **GET** | `/api/discovery` | Memindai (Radar) perangkat ESP32 terdekat yang belum di-*pairing*. |
| **GET** | `/api/users/:userId/devices` | Mengambil daftar perangkat (Device Card) yang dimiliki oleh user tersebut. |
| **POST** | `/api/devices` | Mengeksekusi *Pairing*. Menyimpan profil alat baru dan batas Relay (Threshold) ke database. |
| **DELETE** | `/api/devices/:id` | **Fitur Unpair:** Menghapus kepemilikan alat beserta seluruh data historis listriknya (sensor_data) secara permanen. |

---

## 5. UI/UX Frontend (React Dashboard)

Pembaruan masif telah dilakukan pada halaman **Inisialisasi Sistem** (`DeviceSelectPage.jsx`) untuk memberikan pengalaman kelas Enterprise (Smart Home Product):
* **Top Bar Modern**: Terdapat logo VoltEdge dan tombol **Logout** (*Ghost Button*) di sudut kanan atas.
* **Layout Proporsional**: Container diatur dengan lebar maksimum 650px agar simetris di layar Desktop. Opacity background jaring *Cyberpunk* dibuat lebih *soft* (1.5%).
* **Device Card Interaktif**: Kartu alat memiliki *padding* lega, indikator **LIVE / OFFLINE** berbentuk *pill*, dan animasi *glow* serta *translate-Y* saat di-hover.
* **Fitur Hapus Perangkat (Danger Zone)**: 
  Terdapat ikon Tong Sampah (`Trash2`) pada setiap kartu perangkat. Apabila diklik, pengguna akan disajikan **Modal Konfirmasi Danger**. Pengguna diwajibkan untuk mengetik kata kunci `"HAPUS"` secara sadar sebelum data benar-benar dilenyapkan dari database.
* **Primary CTA Solid**: Tombol Registrasi Node kini menggunakan *Solid Cyan Gradient* yang tegas, mewakili fungsi utamanya.

---
*Dokumentasi ini adalah representasi dari kondisi final sistem backend, frontend, dan IoT firmware yang sudah siap dijalankan.*
