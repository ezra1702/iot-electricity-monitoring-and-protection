# Panduan Konfigurasi MQTT (VoltEdge IoT)

Dokumen ini menjelaskan lokasi spesifik di dalam kode tempat pengaturan **Publisher, Subscriber, dan Topic** berada. Pastikan untuk mengubah kedua sisi (Hardware dan Server) secara bersamaan jika Anda ingin mengganti nama topik komunikasi.

---

## 1. Di Sisi Hardware / ESP32 (Sebagai PUBLISHER)
**Lokasi File:** `IoT/esp32_integration.ino`

### A. Pengaturan Topic
Topik di-generate secara dinamis di dalam fungsi `setup()`. Sistem mengambil MAC Address ESP32, menghilangkan karakter titik dua (`:`), dan merangkainya menjadi dua string topik.
```cpp
macAddress = WiFi.macAddress();
macAddress.replace(":", ""); // Contoh: A1:B2:C3 -> A1B2C3

telemetryTopic = "voltedge/telemetry/" + macAddress; // Topik KIRIM data sensor
configTopic    = "voltedge/config/"    + macAddress; // Topik TERIMA konfigurasi dari Web
```

### B. Pengaturan Publisher (Pengirim Data)
Pengiriman data terjadi di dalam fungsi `loop()`. Data tegangan, arus, daya, dll. dibungkus ke dalam format JSON dan dipublikasikan setiap **2 detik**.
```cpp
client.publish(telemetryTopic.c_str(), payload.c_str());
```

### C. Pengaturan Subscriber ESP32 (Penerima Konfigurasi)
ESP32 juga berperan sebagai **Subscriber** untuk menerima instruksi dari Web secara *live* tanpa perlu di-flash ulang. Topic-nya didaftarkan saat koneksi MQTT berhasil:
```cpp
// Di dalam reconnectMQTT():
client.subscribe(configTopic.c_str()); // Berlangganan topik config
client.setCallback(mqttCallback);      // Set fungsi handler penerima
```

Fungsi `mqttCallback` akan dipanggil otomatis setiap kali ada pesan masuk:
```cpp
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parsing pesan menjadi angka Float
  float newThreshold = message.toFloat();
  if (newThreshold > 0.0) {
    currentThreshold = newThreshold; // Update batas Ampere secara live!
  }
}
```

---

## 2. Di Sisi Server / Backend NodeJS (Sebagai SUBSCRIBER)
**Lokasi File:** `backend/server.js`

### A. Pengaturan Subscriber & Topic
Koneksi ke broker dan pendaftaran (subscribe) ke topik dilakukan sesaat setelah server terhubung dengan MQTT.
```javascript
mqttClient.on('connect', () => {
  // Menggunakan wildcard '#' agar server bisa menerima data dari banyak ESP32 sekaligus
  mqttClient.subscribe('voltedge/telemetry/#'); 
});
```

### B. Penerima Data (Listener & Parser)
Proses penangkapan data dan penyimpanan ke *Database MySQL* pada *event listener* `message`.
```javascript
mqttClient.on('message', async (topic, message) => {
  const payload = JSON.parse(message.toString());
  const macAddress = topic.split('/').pop(); // Ambil MAC Address dari ujung topik
  // Simpan ke MySQL atau masukkan ke radar Auto-Discovery
});
```

### C. Publisher Konfigurasi ke ESP32 (Retained Message)
Saat user berhasil melakukan **Pairing** di Web, Backend otomatis mengirim batas Ampere ke ESP32 via MQTT dengan flag `retain: true`:
```javascript
// Di dalam POST /api/devices (saat registrasi berhasil):
const configTopic = `voltedge/config/${clean_mac}`;
mqttClient.publish(configTopic, String(max_current_limit), { retain: true });
```

> **Apa itu `retain: true`?**
> Broker MQTT akan **menyimpan** pesan ini secara permanen. Jika ESP32 mati lalu menyala kembali, broker akan langsung mengirim ulang nilai threshold terakhir ke ESP32 secara otomatis — tanpa perlu user menyentuh apapun di Web!

---

## 3. Alur Konfigurasi Overload Otomatis (End-to-End)

```
User set 10A di Web (Pairing)
          │
          ▼
    NodeJS Backend
    MQTT Publish → "voltedge/config/A1B2C3D4E5"
    payload: "10"  +  retain: true
          │
          ▼
    Mosquitto Broker
    (menyimpan pesan sebagai retained)
          │
          ▼
    ESP32 (Subscriber aktif)
    mqttCallback() terpanggil
    currentThreshold = 10.0  ← UPDATE LANGSUNG!
          │
          ▼
    Jika current > 10A selama 2x berturut-turut:
    activateRelay("OVERLOAD") → Listrik DIPUTUS!
```

| Skenario | Hasil |
|---|---|
| Baru selesai pairing, set 10A | ESP32 **langsung** menerima 10A via MQTT |
| ESP32 mati lampu lalu nyala lagi | Broker kirim **retained message** → ESP32 ingat 10A |
| Ganti batas Ampere via Web/API | Backend publish angka baru → ESP32 **live update** |

---

## 4. Daftar Lengkap Topik MQTT

| Topik | Arah | Fungsi |
|---|---|---|
| `voltedge/telemetry/{MAC}` | ESP32 → Server | Kirim data sensor (V, A, W, dll) setiap 2 detik |
| `voltedge/config/{MAC}` | Server → ESP32 | Kirim batas Ampere (Overload Threshold) |

---

**⚠️ CATATAN PENTING:**
Jika Anda mengubah nama *base-topic* di Arduino IDE, Anda **WAJIB** mengubahnya juga pada file `server.js` agar data tetap sinkron di kedua sisi.
