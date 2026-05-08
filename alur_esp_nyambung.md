# Alur Logika ESP32 Menyambung ke WiFi & VPS via QR Code

Dokumen ini menjelaskan alur konsep ("Sihir IoT") bagaimana sebuah ESP32 yang belum memiliki akses internet bisa mendapatkan WiFi rumah hanya dengan bantuan *Scan QR Code* dari HP pengguna.

Pemikiran ini **PERSIS SAMA** dengan apa yang dilakukan oleh alat IoT pintar di pasaran (seperti bohlam pintar, smart plug, atau CCTV), dan bisa diimplementasikan menggunakan kombinasi **WiFiManager** dan **Library QR Code**.

## Alur Nyatanya (Step-by-Step)

### 1. ESP32 Minta Tolong
Karena ESP32 baru dinyalakan dan belum punya riwayat/password internet rumah, dia akan berubah mode menjadi **Access Point (Pemancar WiFi Darurat)**. Bersamaan dengan itu, dia memunculkan **Gambar QR Code** di layar OLED-nya.

### 2. Kamu Scan pakai HP
Kamu mengambil HP, membuka aplikasi Kamera, lalu nge-*scan* QR Code di layar OLED ESP32 tersebut. Begitu berhasil di-scan, HP-mu akan otomatis konek ke "jaringan darurat" milik ESP32 tersebut (misalnya bernama `VoltEdge_ESP32`), tanpa perlu mencari nama WiFi-nya di menu pengaturan.

### 3. Form Otomatis Muncul (Captive Portal)
Tiba-tiba di layar HP-mu *pop-up* muncul sebuah **Formulir** (Captive Portal). Formulir ini adalah halaman web sederhana yang di-*hosting* langsung dari dalam chip ESP32.

### 4. Kamu Isi Form
Di form itu, HP-mu seakan disuruh memilih: *"Hei, tolong dong ESP32 ini mau nebeng internet yang mana? Tolong isikan nama WiFi rumah dan password-nya di sini"*. 
Kamu pun memilih nama WiFi rumahmu dari daftar, mengetik password-nya, lalu menekan tombol **"Save"**.

### 5. Sukses! ESP32 Menjadi Mandiri
Setelah kamu tekan tombol "Save", ESP32 langsung menyimpan password itu di dalam memori otaknya. Setelah itu, dia akan **mematikan** jaringan daruratnya (meninggalkan HP-mu) dan langsung **konek ke router WiFi internet** rumah tersebut.

### 6. Data Mengalir ke VPS
Setelah ESP32 punya internet sungguhan, dia langsung bertugas membaca sensor (Listrik PZEM & Gas) lalu mengirim datanya ke alamat IP MQTT Broker (baik itu di lokal, maupun di VPS) secara terus-menerus!

---

## Kesimpulan Peran HP

Tugas HP di alur ini **HANYA** sebagai jembatan pembantu sesaat untuk mengisikan *form* WiFi buat ESP32. 

Setelah tahap nomor 5 selesai dan ESP32 nyambung ke internet:
- HP kamu mau dibawa pergi ke luar kota
- HP kamu mau ganti paket data seluler
- HP kamu mau dimatikan sekalipun...

**TIDAK MASALAH!** Karena ESP32 sudah mandiri konek ke router WiFi rumah. Selama router WiFi rumah menyala dan ada internetnya, data dari ESP32 akan terus terkirim ke Server/VPS dengan aman, dan kamu bisa cek *Dashboard* VoltEdge dari mana saja di seluruh dunia.
