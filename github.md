# VoltEdge IoT Energy Dashboard

Proyek ini adalah sistem pemantauan kelistrikan IoT berbasis ESP32. Proyek ini mencakup kode perangkat keras (IoT), backend, dan frontend dashboard.

## 🚀 Cara Menjalankan Proyek di Komputer Lain

Jika kamu melakukan *pull* atau mengunduh proyek ini di komputer/laptop yang berbeda, ikuti langkah-langkah di bawah ini untuk menjalankannya secara lokal.

### 1. Prasyarat (Prerequisites)
Pastikan laptop/komputer baru sudah terinstal aplikasi berikut:
- **[Node.js](https://nodejs.org/)** (Untuk menginstal library dan menjalankan frontend/backend)
- **[Git](https://git-scm.com/)** (Untuk clone repository)
- **[Docker](https://www.docker.com/)** (Jika ingin menjalankan database/MQTT via container)
- **[Arduino IDE](https://www.arduino.cc/en/software)** (Untuk mengedit dan mengunggah kode ke ESP32)

---

### 2. Mengunduh Proyek (Clone Repository)
Buka terminal / Command Prompt, lalu jalankan:
```bash
git clone https://github.com/username-kamu/energy-dashboard.git
cd energy-dashboard
```
*(Catatan: Ganti `username-kamu` dengan username GitHub milikmu atau link repository aslimu)*

---

### 3. Menginstal Dependency (Wajib)
Karena folder `node_modules` (yang berisi file instalasi library) ukurannya sangat besar, folder tersebut **tidak ikut di-push** ke GitHub (diblokir oleh `.gitignore`). 

Oleh karena itu, kamu harus mengunduh ulang library tersebut. Jalankan perintah ini di dalam folder proyek:
```bash
npm install
```

---

### 4. Konfigurasi Environment Variables (`.env`)
File `.env` yang berisi data sensitif (password database, API key, dll) juga tidak ikut di-push ke GitHub demi keamanan.
1. Buat file baru bernama `.env` di komputer baru.
2. Isi file tersebut dengan kredensial yang sesuai. Contoh isi `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password_rahasia
```
*(Sesuaikan dengan konfigurasi di sistem barumu).*

---

### 5. Menjalankan Web Dashboard
Setelah `npm install` selesai dan `.env` sudah diatur, jalankan perintah berikut untuk menyalakan server lokal:
```bash
npm run dev
```
Setelah jalan, buka browser dan akses link yang tertera di terminal (biasanya `http://localhost:5173` atau `http://localhost:3000`).

---

### 6. Menjalankan Database / MQTT via Docker
Sistem ini menyediakan konfigurasi `docker-compose.yml`. Untuk menjalankan *service* tersebut (seperti Mosquitto MQTT atau Database) di *background*, jalankan:
```bash
docker-compose up -d
```

---

### 7. Konfigurasi Hardware ESP32 (Arduino IDE)
Untuk menjalankan kode hardware ESP32 di laptop baru:
1. Buka folder `IoT` dan buka file `esp32_integration.ino` menggunakan Arduino IDE.
2. Pastikan kamu sudah menginstal *Board Manager* untuk ESP32.
3. Install ulang library yang dibutuhkan melalui **Library Manager** (contoh: `FreeRTOS`, `PubSubClient`, `PZEM004T`).
4. **Penting:** Pastikan kamu mengubah pengaturan koneksi Wi-Fi (SSID dan Password) serta IP MQTT broker di dalam kode agar sesuai dengan jaringan di lokasimu saat ini.
5. Colokkan ESP32 ke laptop dan klik **Upload**.

---

**💡 Aturan Main Kolaborasi di GitHub:** 
- Setiap kali kamu menginstal library baru (misal: `npm install axios`), file `package.json` akan otomatis terupdate. **Wajib push file `package.json` ini ke GitHub** agar laptop lain tahu bahwa ada library baru yang harus di-install.
- Laptop lain hanya perlu menjalankan `git pull` lalu `npm install` lagi untuk menyamakan library.
