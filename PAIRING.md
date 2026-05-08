# Panduan Pairing WiFi & Koneksi MQTT (Lokal)

Dokumen ini menjelaskan alur kerja (workflow) bagaimana hardware ESP32 terhubung ke jaringan WiFi rumah dan menyambung ke sistem Backend (MQTT Broker) secara lokal.

## 1. Konsep Dasar Pairing (WiFiManager)

Untuk menghindari menulis (hardcode) nama WiFi dan Password di dalam *source code* C++, kita menggunakan **WiFiManager**. Fitur ini membuat alat menjadi fleksibel dan siap dipasang di mana saja tanpa perlu mengubah kode (upload ulang).

### Skenario 1: ESP32 Belum Punya Akses Internet
Jika ESP32 baru pertama kali dinyalakan di tempat baru, atau WiFi rumah sebelumnya mati/berubah password:
1. ESP32 akan menyala dan mencoba mencari WiFi yang terakhir kali disimpan.
2. Karena tidak menemukan WiFi, ESP32 akan beralih mode menjadi **Access Point (AP)** (pemancar WiFi).
3. Layar OLED pada alat akan memunculkan tulisan `WIFI PAIRING MODE` beserta nama WiFi yang dipancarkan (misal: `VoltEdge_ESP32`).
4. **Tugas Pengguna (Kamu):**
   - Buka pengaturan WiFi di HP/Laptop kamu.
   - Hubungkan ke WiFi bernama `VoltEdge_ESP32`.
   - Biasanya akan otomatis muncul *pop-up browser* (Captive Portal). Jika tidak, buka browser dan ketik `192.168.4.1`.
   - Pilih jaringan WiFi rumah/kantormu dari daftar yang muncul, dan masukkan password WiFi tersebut.
   - Tekan **Save**.
5. ESP32 akan otomatis *restart* atau langsung mencoba terhubung ke WiFi rumahmu. 

### Skenario 2: ESP32 Sudah Punya Akses Internet
Jika ESP32 dimatikan lalu dinyalakan lagi (dan WiFi rumah tidak berubah):
1. ESP32 menyala.
2. Otomatis membaca memori internal dan terhubung kembali ke WiFi rumah.
3. Alat langsung masuk ke proses MQTT.

---

## 2. Koneksi MQTT Lokal

Setelah memiliki koneksi Internet (berada di jaringan WiFi rumah), tugas ESP32 selanjutnya adalah mengirim data.

Karena saat ini kita bekerja di tahap **Lokal**, alurnya adalah sebagai berikut:

### Persiapan di Sisi Software (PC/Laptop)
1. PC/Laptop dan ESP32 **WAJIB** terhubung ke jaringan WiFi yang sama (atau berada di jaringan LAN yang sama).
2. Proyek `docker-compose.yml` di PC dijalankan. Ini akan menyalakan **Eclipse Mosquitto (MQTT Broker)** di Port `1883`.
3. Kamu harus mencari **IP Address Komputer Lokalmu**. 
   - Di Windows: Buka CMD, ketik `ipconfig`, cari bagian *IPv4 Address* (misalnya: `192.168.1.15`).

### Persiapan di Sisi Hardware (ESP32)
1. Di dalam kode ESP32, atur alamat MQTT Server menuju IP Komputermu:
   ```cpp
   const char* mqtt_server = "192.168.1.15"; // Ganti dengan IPv4 komputermu
   const int mqtt_port = 1883;
   ```
2. Saat ESP32 berhasil terhubung ke WiFi, ia akan mencari alamat IP `192.168.1.15` di jaringan tersebut.
3. ESP32 mengetuk pintu Port `1883` (tempat Mosquitto berjaga).
4. Setelah terhubung (Koneksi MQTT Berhasil), ESP32 akan mulai mengirim data sensor secara berkala ke sebuah "saluran" (Topic), misalnya: `voltedge/sensor/data`.

### Penerimaan Data di Backend
1. Backend Node.js milikmu juga terhubung ke MQTT Broker (Mosquitto) yang sama.
2. Backend berlangganan (Subscribe) ke saluran `voltedge/sensor/data`.
3. Setiap kali ESP32 mengirim JSON data listrik, Backend menangkapnya, lalu menyimpannya ke MySQL, dan memberikannya ke Dashboard (Frontend) agar bisa kamu lihat di layar.

---

## Ringkasan Alur Kerja Lengkap

`ESP32 Nyala` -> `Punya WiFi?` 
  - **TIDAK** -> Pancarkan AP -> User Konek pakai HP -> Masukkan Password -> (Tersimpan) -> Ulangi.
  - **YA** -> Sambung ke WiFi -> Cari IP Komputer Lokal (MQTT) -> Konek MQTT -> Mulai Kirim Data -> Dashboard Menerima.
