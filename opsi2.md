Viewed esp32_integration.ino:10-150
Edited esp32_integration.ino
Edited esp32_integration.ino
Viewed esp32_integration.ino:430-450
Viewed esp32_integration.ino:440-480
Edited esp32_integration.ino
Viewed server.js:300-340
Edited server.js

Bagus sekali! Opsi 2 (IoT Lanjutan) **sudah selesai saya *coding*!** 🔥

Sekarang sistem VoltEdge-mu sudah memiliki perlindungan ganda (Gas & Overload) yang 100% dinamis dan terkoneksi satu sama lain.

Berikut adalah fitur magis yang baru saja saya tambahkan ke dalam `esp32_integration.ino` dan `server.js`:

### 1. Subscriber Pintar di ESP32 🧠
ESP32 sekarang tidak hanya mengirim data (*Publish*), tapi dia juga akan **Mendengarkan (Subscribe)** ke Topik khusus: `voltedge/config/{MAC_ADDRESS}`.

Tiap kali ada angka batas Ampere yang masuk, ESP32 akan membaca dan memperbarui ambang batas `currentThreshold`-nya secara *real-time* tanpa perlu di-*restart*!

### 2. Fitur Retained Message (Anti Lupa) 💾
Ketika kamu menekan tombol "Selesaikan Registrasi" di Web, Server NodeJS akan menembakkan angka Batas Ampere (misalnya `10` Ampere) ke broker MQTT dengan bendera khusus bernama **`{ retain: true }`**.
Apa artinya?
Artinya Broker MQTT akan **menyimpan** angka `10A` tersebut secara permanen. Jika tiba-tiba mati lampu dan ESP32 *restart*, begitu dia menyala dan nyambung WiFi lagi, Broker akan langsung menyuapkan angka `10A` itu ke ESP32 tanpa perlu kamu pencet apa-apa dari Web!

### 3. Logika Overload yang Stabil ⚡
Di dalam fungsi `loop()` ESP32, saya menambahkan fitur pemutus relay yang stabil (menggunakan *Debounce*):
1. Jika Ampere yang ditarik alat > Batas Threshold, ESP32 tidak akan langsung memutus listrik (untuk menghindari *spike* sesaat dari kompresor kulkas/AC).
2. ESP32 akan menghitung. Jika terdeteksi lebih dari batas sebanyak **2 detik berturut-turut**, barulah fungsi `activateRelay("OVERLOAD")` ditembak!
3. **Layar OLED** akan langsung berubah memunculkan tulisan berkedip: **`OVERLOAD!`**.
4. **Tombol Reset Fisik** akan terkunci! Jika alat belum dicabut tapi kamu menekan tombol Reset di alat, relay tetap akan menolak menyala untuk mencegah kebakaran kabel.

Silakan *flash* (upload ulang) kode `esp32_integration.ino` ke Hardware ESP32-mu sekarang untuk menikmati fitur IoT tingkat dewa ini! 😎🚀 Bagaimana, gokil kan?