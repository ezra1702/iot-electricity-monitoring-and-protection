# Dokumentasi Sistem Tertanam (Embedded Systems) - VoltEdge IoT

Dokumentasi ini menjelaskan implementasi konsep-konsep akademis Sistem Tertanam (*Embedded Systems*) yang diterapkan pada perangkat keras **VoltEdge** (sistem monitoring kelistrikan dan proteksi keselamatan berbasis ESP32, PZEM-004T, MQ-2, OLED SH1106, Relay, dan Buzzer).

---

## 1. Karakteristik Embedded System (Sistem Tertanam)
VoltEdge dirancang khusus sebagai sistem tertanam dengan karakteristik berikut:
* **Resource-Constrained (Keterbatasan Sumber Daya):** Menggunakan mikrokontroler SoC ESP32 (Tensilica Xtensa Dual-Core 32-bit, RAM 520 KB, Flash 4 MB) yang hemat daya dan berbiaya rendah.
* **Tugas Spesifik (Dedicated Function):** Berfokus penuh pada tugas monitoring parameter kelistrikan (tegangan, arus, daya, energi), mendeteksi kebocoran gas/asap, serta mengotomatisasi proteksi pemutusan daya secara real-time.
* **Sistem Real-Time:** Memiliki batasan waktu respons kritis (*hard real-time deadline*) di mana daya listrik harus diputus dalam milidetik apabila terjadi lonjakan arus (overload) atau kebocoran gas beracun demi mencegah kebakaran/ledakan.

---

## 2. Pemodelan & FSM (Finite State Machine) / Statechart
Untuk memodelkan alur logika proteksi perangkat secara terstruktur dan formal, sistem ini mengimplementasikan **Finite State Machine (FSM)** yang diatur di dalam firmware menggunakan `enum SystemState`:

```cpp
enum SystemState {
  STATE_NORMAL,               // Kondisi siaga normal, listrik menyala
  STATE_ALERT_GAS,            // Terjadi bahaya kebocoran gas/asap, listrik diputus
  STATE_ALERT_OVERLOAD,       // Terjadi kelebihan beban arus listrik, listrik diputus
  STATE_DISARMED_HYSTERESIS   // Gas masih tinggi tetapi listrik dinyalakan paksa oleh user
};
```

### Diagram FSM Statechart
Berikut adalah diagram transisi status yang dijalankan di dalam perangkat:

```mermaid
stateDiagram-v2
    [*] --> STATE_NORMAL : Power On / Boot

    state STATE_NORMAL {
        note right of STATE_NORMAL
            Relay: ON (Listrik Menyala)
            Buzzer: OFF (Diam)
            OLED: Normal Grid & Senyum Animasi
        end.
    }

    state STATE_ALERT_GAS {
        note right of STATE_ALERT_GAS
            Relay: OFF (Listrik Diputus!)
            Buzzer: ON (Melodi Peringatan)
            OLED: "GAS ALERT!" (Blink)
        end.
    }

    state STATE_ALERT_OVERLOAD {
        note right of STATE_ALERT_OVERLOAD
            Relay: OFF (Listrik Diputus!)
            Buzzer: ON (Melodi Peringatan)
            OLED: "OVERLOAD ALERT"
        end.
    }

    state STATE_DISARMED_HYSTERESIS {
        note right of STATE_DISARMED_HYSTERESIS
            Relay: ON (Listrik Menyala)
            Buzzer: OFF (Diam)
            OLED: Normal Grid (Deteksi Gas Di-bypass)
        end.
    }

    %% Transisi
    STATE_NORMAL --> STATE_ALERT_GAS : Gas > 2000 ppm
    STATE_NORMAL --> STATE_ALERT_OVERLOAD : Arus > Limit (Ampere)

    STATE_ALERT_GAS --> STATE_NORMAL : Tombol Reset / Remote Reset\n[Kondisi: Gas Aman < 2000 ppm]
    STATE_ALERT_GAS --> STATE_DISARMED_HYSTERESIS : Tombol Reset / Remote Reset\n[Kondisi: Gas Masih Tinggi > 2000 ppm]

    STATE_ALERT_OVERLOAD --> STATE_NORMAL : Tombol Reset / Remote Reset

    STATE_DISARMED_HYSTERESIS --> STATE_NORMAL : Gas turun < 1500 ppm\n[Sensor Gas Aktif / Re-arm]
    STATE_DISARMED_HYSTERESIS --> STATE_ALERT_OVERLOAD : Arus > Limit (Ampere)
```

---

## 3. Interfacing dengan Environment (Antarmuka Lingkungan)
Perangkat berinteraksi langsung dengan lingkungan fisik sekitar melalui pin Input/Output (I/O) mikrokontroler:
1. **Sensor Input:**
   * **Sensor MQ-2 (Gas/Asap):** Menggunakan antarmuka Analog-to-Digital Converter (**ADC**) pada pin GPIO 33 dengan atenuasi `ADC_11db` untuk membaca konsumsi udara sekitar.
   * **Sensor PZEM-004T (Parameter Listrik):** Menggunakan antarmuka serial hardware (**UART/USART**) dengan baudrate 9600 bps pada pin RXD2 (GPIO 16) dan TXD2 (GPIO 17).
   * **Tombol Reset:** Menggunakan GPIO Digital Input dengan konfigurasi pull-up internal (`INPUT_PULLUP`) pada pin GPIO 18 untuk mendeteksi penekanan tombol fisik (Active LOW).
2. **Aktuator Output:**
   * **Relay Proteksi:** Menggunakan GPIO Digital Output pada pin GPIO 25. Nilai `LOW` memutus terminal (daya OFF), dan `HIGH` menyambungkan daya (daya ON).
   * **Buzzer Aktif/Pasif:** Menggunakan modulasi frekuensi suara pada pin GPIO 19 menggunakan fungsi `tone()` dan `noTone()` untuk menghasilkan peringatan suara saat bahaya terdeteksi.
3. **Visual Output:**
   * **Layar OLED SH1106 (128x64):** Menggunakan antarmuka **I2C** pada pin SDA (GPIO 21) dan SCL (GPIO 22) dengan library `U8g2` untuk menampilkan parameter grafik secara real-time.

---

## 4. Real-Time Operating System (RTOS) & Scheduling
VoltEdge memanfaatkan **FreeRTOS** pada ESP32 untuk membagi logika program menjadi tugas-tugas terpisah (*tasks*) yang berjalan secara konkuren. Hal ini menjamin aspek **Hard Real-Time** (proteksi sensor tidak boleh diblokir oleh aktivitas jaringan).

### Pembagian Task & Alokasi Core:
1. **`TaskSensorRead` (Core 0, Priority 3 - High):**
   * Paling kritis. Membaca sensor PZEM-004T & MQ-2, FSM transisi, dan mengendalikan relay/buzzer secara instan setiap 100ms. Ditempatkan di Core 0 agar terpisah dari task jaringan.
2. **`TaskOLED` (Core 1, Priority 2 - Medium):**
   * Mengatur render grafis ke layar OLED (normal grid, animasi kedip wajah senyum, dan layar darurat) setiap 150ms.
3. **`TaskMQTT` (Core 1, Priority 1 - Low):**
   * Mengelola koneksi jaringan WiFi, sinkronisasi penerimaan data via broker MQTT (remote reset/config update), dan menerbitkan payload telemetri periodik setiap 2 detik.

---

## 5. Sinkronisasi & Komunikasi Antar-Task (Task Synchronization)
Multitasking pada dual-core memerlukan sinkronisasi ketat untuk mencegah tabrakan memori (*race condition*) dan crash perangkat:
* **`i2cMutex` (Mutex Semaphore):** Menjamin bahwa jalur I2C layar OLED tidak digunakan oleh Task OLED dan Task MQTT secara bersamaan, sehingga mencegah I2C bus crash.
* **`dataMutex` (Mutex Semaphore):** Mengunci data variabel sensor global saat dibaca/ditulis, memastikan data telemetri yang dikirim via MQTT tidak pecah atau korup di memori.
* **`alertSemaphore` (Binary Semaphore):** Menghubungkan `TaskSensorRead` dengan `TaskMQTT`. Begitu FSM mendeteksi bahaya kelistrikan/gas, task sensor langsung melepas semaphore ini agar task MQTT terbangun seketika dan mengirim status alarm darurat ke dashboard web tanpa menunggu jeda normal 2 detik.

---

## 6. Reliability & Fault Tolerance (Watchdog Timer - WDT)
Untuk menjamin keandalan sistem tertanam agar dapat menyala terus-menerus tanpa henti (*always-on*), sistem ini memanfaatkan **Task Watchdog Timer (TWDT)** bawaan ESP32:
* **Mekanisme:** TWDT dikonfigurasi dengan batas waktu (*timeout*) 15 detik. Ketiga task FreeRTOS wajib melakukan *feeding* (memberi makan) anjing penjaga lewat perintah `esp_task_wdt_reset()` di setiap loop-nya.
* **Fault Tolerance:** Jika terjadi *deadlock*, WiFi menggantung selamanya, atau terjadi kegagalan memori pada salah satu task, TWDT akan memicu *system panic* dan otomatis memaksa ESP32 melakukan reboot/restart mandiri agar perangkat kembali beroperasi normal.
* **WiFi Bootloop Prevention:** Inisialisasi TWDT sengaja ditempatkan di bagian paling akhir dari `setup()` agar proses penyambungan WiFi awal yang lambat tidak disalahartikan sebagai kemacetan sistem oleh Watchdog.

---

## 7. Testing & Validasi (Self-Test Simulation Mode)
Guna mempermudah pengujian kehandalan sistem tanpa perlu memicu kelebihan beban listrik riil atau membakar gas secara fisik, sistem dilengkapi dengan **Self-Test Mode**:
* Perangkat berlangganan (*subscribe*) ke topik MQTT: `voltedge/test/<MAC>`.
* **Simulasi Bahaya Gas:** Menerima pesan `"test_gas"` $\rightarrow$ ESP32 mengabaikan data fisik MQ-2 dan mensimulasikan nilai gas ke 3500 ppm, memaksa FSM masuk ke `STATE_ALERT_GAS`.
* **Simulasi Overload:** Menerima pesan `"test_overload"` $\rightarrow$ ESP32 mensimulasikan arus kelistrikan naik melebihi batas aman, memaksa FSM masuk ke `STATE_ALERT_OVERLOAD`.
* **Simulasi Normal:** Menerima pesan `"test_normal"` atau `"reset"` $\rightarrow$ Menghentikan simulasi dan kembali membaca data fisik sensor.
* **Manfaat Akademik:** Memvalidasi kecepatan respons UI dashboard web, buzzer berdering, pemutusan relay, dan layar OLED dalam hitungan milidetik secara aman di meja pengujian.
