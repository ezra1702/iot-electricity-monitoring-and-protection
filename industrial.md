# Standar Industrial IoT untuk VoltEdge (ESP32)

Dokumen ini berisi daftar evaluasi dan rekomendasi arsitektur perangkat lunak untuk meningkatkan firmware ESP32 (VoltEdge) dari level prototipe tingkat lanjut menjadi standar produksi massal (*Industrial-Grade*).

## Fitur Industrial yang Sudah Diterapkan
1. **Multi-Threading (FreeRTOS):** Menggunakan sistem operasi waktu nyata dengan pembagian *Task* (Gas, PZEM, UI, MQTT) untuk mencegah *blocking*.
2. **Mutex & Semaphore:** Melindungi sumber daya bersama (I2C OLED, Data Global, Serial) dari tabrakan memori (*race condition*).
3. **Task Watchdog Timer (TWDT):** Fitur *Self-Healing* yang akan me-restart ESP32 secara otomatis jika mendeteksi *Task* yang *hang* atau macet.
4. **Data Filtering & Debouncing:** Menggunakan *Moving Average* untuk membaca sensor gas dan mekanisme *debounce* (penundaan konfirmasi) sebelum memicu alarm/relay untuk mencegah *false-positive*.
5. **WiFi Provisioning:** Menggunakan `WiFiManager` untuk koneksi jaringan yang dinamis tanpa perlunya *hardcode* kredensial WiFi.

---

## Rekomendasi Peningkatan untuk Produksi Massal

Berikut adalah 8 langkah krusial yang perlu diimplementasikan sebelum perangkat diproduksi secara massal:

### 1. Hardcoded MQTT Server Dinamis (Prioritas Tinggi)
- **Masalah:** Alamat server broker MQTT saat ini di-*hardcode* (`192.168.1.5`). Jika IP berubah atau alat dipasang di lingkungan/pabrik pelanggan yang berbeda, perangkat harus di-reflash.
- **Solusi:** Integrasikan kolom konfigurasi (IP MQTT, Port, Username, Password) ke dalam halaman portal `WiFiManager` saat *pairing* awal.

### 2. Manajemen Memori Bebas Fragmentasi (ArduinoJson)
- **Masalah:** Penyusunan payload JSON saat ini menggunakan penggabungan tipe data `String`. Penggunaan `String` di C++ secara terus-menerus dapat menyebabkan *Heap Fragmentation* (memori berlubang) yang berpotensi membuat *crash* setelah alat beroperasi berhari-hari.
- **Solusi:** Gunakan pustaka yang mengelola memori statis/dinamis secara efisien dan aman seperti **ArduinoJson** untuk merakit struktur data JSON.

### 3. OTA (Over-The-Air) Updates
- **Masalah:** Sangat merepotkan (atau bahkan mustahil) melakukan perbaikan *bug* secara fisik menggunakan kabel USB pada ribuan perangkat yang sudah tersebar di lokasi pelanggan.
- **Solusi:** Integrasikan pustaka `ArduinoOTA` agar firmware mikrokontroler dapat didistribusikan dan diperbarui melalui jaringan WiFi secara nirkabel.

### 4. Data Logging & Buffering Offline
- **Masalah:** Jika router atau koneksi internet terputus, data pembacaan sensor pada rentang waktu tersebut akan menguap.
- **Solusi:** Manfaatkan sistem partisi penyimpanan internal ESP32 (seperti `LittleFS` atau `SPIFFS`) untuk menyimpan data (*Store and Forward*). Begitu jaringan kembali normal, antrean data yang tertunda baru dipublikasikan ke *broker*.

### 5. Keamanan Transport Data (Enkripsi MQTTS)
- **Masalah:** Koneksi MQTT standar (Port 1883) mengirim data berbentuk teks polos (*plaintext*). Rentan terhadap penyadapan (paket *sniffing*) dan intervensi jaringan (seperti injeksi perintah *Relay*).
- **Solusi:** Beralih ke standar industri **MQTTS** (Port 8883) dengan memvalidasi *Certificate Authority (CA)* dari server untuk menegakkan enkripsi TLS/SSL.

### 6. Kalibrasi Cerdas Sensor Gas (Ro/Rs Ratio)
- **Masalah:** Mengacu pada pembacaan *Raw ADC* (seperti menetapkan angka *threshold* baku di `3000`) memiliki celah ketidakakuratan karena bahan kimia dalam sensor akan mengalami *drift* (pergeseran) akibat usia pakai, suhu, dan kelembapan udara lingkungan.
- **Solusi:** Sistem pengukuran industri menggunakan rasio hambatan (Ro/Rs). Firmware harus diprogram dengan siklus *Self-Calibration* (autokalibrasi) rutin setiap sistem berada di kondisi "udara segar".

### 7. Sinkronisasi Waktu Akurat (NTP)
- **Masalah:** Firmware ESP32 tidak merekam penanda waktu *(timestamp)* kejadian. Pengaturan waktu diserahkan sepenuhnya kepada *backend* saat pesan diterima. Ini merusak urutan riwayat data jika terjadi delay jaringan besar.
- **Solusi:** Lakukan sinkronisasi waktu akurat via internet dengan protokol NTP setiap alat menyala. Sertakan *timestamp* (contoh: ISO 8601) langsung di tingkat mikrokontroler setiap kali menerbitkan JSON.

### 8. Kualitas Pengiriman Data (MQTT QoS 1)
- **Masalah:** Pustaka `PubSubClient` beroperasi dengan **QoS 0** *(Fire and Forget)* secara bawaan. ESP32 tidak meminta konfirmasi apakah server berhasil menerima sinyal tersebut.
- **Solusi:** Migrasi ke profil jaringan **QoS 1** *(At Least Once)*. ESP32 akan terus mencoba mentransmisikan paket data penting yang sama sampai *broker* mengonfirmasi penerimaan (PUBACK). Penggunaan pustaka asinkronus seperti `AsyncMqttClient` lebih diutamakan untuk menangani hal ini.
