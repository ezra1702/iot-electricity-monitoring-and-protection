#include <Wire.h>
#include <U8g2lib.h>
#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <PubSubClient.h>

// WiFi & MQTT Configurations
#define WIFI_SSID       "X"
#define WIFI_PASSWORD   "x12345678"
#define MQTT_SERVER     "broker.hivemq.com"
#define MQTT_PORT       1883
#define DASHBOARD_URL   "localhost:3000"

// OLED Pins (SDA -> D21, SCK -> D22)
#define SDA_PIN       21
#define SCL_PIN       22

// PZEM-004T Pins (RX -> D16, TX -> D17)
#define RXD2          16
#define TXD2          17

// MQ-2 Gas Sensor Pin (Analog -> D33)
#define MQ2_PIN       33

// Relay Pin (D25)
#define RELAY_PIN     25

// Buzzer Pin (D19)
#define BUZZER_PIN    19

// Reset Button Pin (D18) - tekan untuk clear kondisi ALERT
#define RESET_BTN_PIN 18

// Threshold batas gas MQ-2
#define MQ2_THRESHOLD 2000

// Interval durasi tampilan info dan animasi senyum (ms)
#define SMILE_INTERVAL  12000UL   // Tampil info selama 12 detik
#define SMILE_DURATION  5000UL    // Tampil animasi senyum selama 5 detik

// Konstruktor OLED SH1106 menggunakan U8g2
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

HardwareSerial pzemSerial(2);
PZEM004Tv30 pzem(pzemSerial, RXD2, TXD2);

WiFiClient espClient;
PubSubClient client(espClient);

String macAddress = "";
String telemetryTopic = "";
unsigned long lastMqttRetry = 0;
unsigned long lastPublish = 0;

// ── State global ──────────────────────────────────────────────
bool  alertLatched    = false;   // latch gas/MQ-2
bool  overloadLatched = false;   // latch overload arus
bool  lastBtnState    = HIGH;
bool  gasArmed        = true;    // hysteresis: re-arm setelah gas turun ke aman
float maxCurrentLimit = 5.0;     // default, bisa diupdate dari web via MQTT
#define GAS_SAFE_LEVEL 1500      // batas aman untuk re-arm sensor gas

unsigned long startMillis   = 0;
unsigned long lastSmileShow = 0;
bool smileVisible           = false;
bool smileEyeOpen           = true;
unsigned long lastEyeBlink  = 0;

// State tambahan untuk efek OLED
bool     alertHeaderInv    = true;   // untuk blink header alert
unsigned long lastAlertBlink = 0;
uint8_t  sparkleFrame      = 0;      // animasi bintang
unsigned long lastSparkle  = 0;



// ── Gas bar indicator (mode normal) ──────────────────────────
// Menggambar bar visual level gas (x,y = pojok kiri atas bar luar)
void drawGasBar(int rawValue) {
  // Bar lebar 60px, tinggi 5px, di kanan label "GAS:"
  int barX = 38, barY = 24, barW = 60, barH = 5;
  u8g2.drawFrame(barX, barY, barW, barH);
  // Isi bar: clamp rawValue ke 0-1023, peta ke 0-58
  int fill = map(constrain(rawValue, 0, 1023), 0, 1023, 0, barW - 2);
  if (fill > 0) u8g2.drawBox(barX + 1, barY + 1, fill, barH - 2);
}

// ── Double-height digit (untuk alert mode) ────────────────────
// Menggambar 1 karakter angka 2x tinggi menggunakan drawBox
// Setiap segmen = kotak 3x3 atau 3x1
void drawBigDigit(int digit, int x, int y) {
  // Segmen: top, top-left, top-right, mid, bot-left, bot-right, bottom
  // Representasi 7-segment per digit
  // w=9, h=13 per karakter
  const uint8_t segs[10] = {
    0b1110111, // 0: semua kecuali mid
    0b0010010, // 1: top-right, bot-right
    0b1101101, // 2: top, top-right, mid, bot-left, bottom
    0b1111001, // 3: top, top-right, mid, bot-right, bottom  — koreksi: 0b1111001
    0b0011011, // 4: top-left, top-right, mid, bot-right
    0b1011011, // 5: top, top-left, mid, bot-right, bottom  — koreksi: 0b1011011 -> 0b1011011
    0b1011111, // 6
    0b1110010, // 7
    0b1111111, // 8
    0b1111011, // 9
  };
  // Koreksi sederhana: gunakan drawStr dengan font 10x20 jika tersedia,
  // atau gambar manual dengan drawBox segments
  // Implementasi sederhana: 3 kolom pixel 2px lebar, tinggi 2px
  if (digit < 0 || digit > 9) return;
  uint8_t s = segs[digit];
  // Segmen horizontal: top(bit6), mid(bit3), bot(bit0)
  // Segmen vertikal kiri: top-left(bit5), bot-left(bit2)
  // Segmen vertikal kanan: top-right(bit4), bot-right(bit1)
  int sw = 9, sh = 13; // total ukuran
  // Top horiz
  if (s & 0b1000000) u8g2.drawBox(x+1, y,   sw-2, 2);
  // Mid horiz
  if (s & 0b0001000) u8g2.drawBox(x+1, y+5, sw-2, 2);
  // Bot horiz
  if (s & 0b0000001) u8g2.drawBox(x+1, y+sh-2, sw-2, 2);
  // Top-left vert
  if (s & 0b0100000) u8g2.drawBox(x,   y+1, 2, 5);
  // Top-right vert
  if (s & 0b0010000) u8g2.drawBox(x+sw-2, y+1, 2, 5);
  // Bot-left vert
  if (s & 0b0000100) u8g2.drawBox(x,   y+6, 2, 5);
  // Bot-right vert
  if (s & 0b0000010) u8g2.drawBox(x+sw-2, y+6, 2, 5);
}

void drawBigNumber(int value, int x, int y) {
  // Gambar max 4 digit
  char buf[8];
  snprintf(buf, sizeof(buf), "%d", value);
  int cx = x;
  for (int i = 0; buf[i]; i++) {
    if (buf[i] >= '0' && buf[i] <= '9') {
      drawBigDigit(buf[i] - '0', cx, y);
      cx += 11; // lebar digit + spasi
    }
  }
}

// ── Animasi wajah senyum (REVISI) ────────────────────────────
void drawSmileFace(bool eyeOpen, uint8_t sparkle) {
  int cx = 64, cy = 30, r = 26;

  // ── Lingkaran wajah (lebih tebal = gambar 2 radius) ──
  u8g2.drawCircle(cx, cy, r,   U8G2_DRAW_ALL);
  u8g2.drawCircle(cx, cy, r-1, U8G2_DRAW_ALL);

  // ── Alis (melengkung, 4 pixel) ──
  // Alis kiri
  u8g2.drawPixel(48, 18); u8g2.drawPixel(49, 17);
  u8g2.drawPixel(50, 17); u8g2.drawPixel(51, 17);
  u8g2.drawPixel(52, 18);
  // Alis kanan
  u8g2.drawPixel(76, 18); u8g2.drawPixel(77, 17);
  u8g2.drawPixel(78, 17); u8g2.drawPixel(79, 17);
  u8g2.drawPixel(80, 18);

  if (eyeOpen) {
    // ── Mata terbuka: lingkaran terisi ──
    u8g2.drawDisc(52, 25, 4, U8G2_DRAW_ALL);
    u8g2.drawDisc(76, 25, 4, U8G2_DRAW_ALL);
    // Kilauan mata (1 pixel putih di pojok)
    u8g2.setDrawColor(0);
    u8g2.drawPixel(54, 23);
    u8g2.drawPixel(78, 23);
    u8g2.setDrawColor(1);
    // ── Pipi (titik-titik) ──
    u8g2.drawPixel(44, 30); u8g2.drawPixel(45, 31); u8g2.drawPixel(46, 30);
    u8g2.drawPixel(82, 30); u8g2.drawPixel(83, 31); u8g2.drawPixel(84, 30);
  } else {
    // ── Mata tertutup: busur melengkung ke atas (kesan kedip lembut) ──
    // Mata kiri tutup (kurva ~)
    u8g2.drawPixel(48, 26); u8g2.drawPixel(49, 25);
    u8g2.drawPixel(50, 24); u8g2.drawPixel(51, 24);
    u8g2.drawPixel(52, 25); u8g2.drawPixel(53, 26);
    u8g2.drawPixel(54, 27); u8g2.drawPixel(55, 27);
    // Mata kanan tutup
    u8g2.drawPixel(72, 26); u8g2.drawPixel(73, 25);
    u8g2.drawPixel(74, 24); u8g2.drawPixel(75, 24);
    u8g2.drawPixel(76, 25); u8g2.drawPixel(77, 26);
    u8g2.drawPixel(78, 27); u8g2.drawPixel(79, 27);
    // Pipi tetap ada saat kedip
    u8g2.drawPixel(44, 30); u8g2.drawPixel(45, 31); u8g2.drawPixel(46, 30);
    u8g2.drawPixel(82, 30); u8g2.drawPixel(83, 31); u8g2.drawPixel(84, 30);
  }

  // ── Senyum: busur bawah lebih lengkap & simetris ──
  u8g2.drawPixel(48, 39); u8g2.drawPixel(49, 40);
  u8g2.drawPixel(50, 41); u8g2.drawPixel(51, 42);
  u8g2.drawPixel(52, 43);
  u8g2.drawLine(53, 43, 75, 43);   // bibir atas rata
  u8g2.drawLine(53, 44, 75, 44);   // bibir bawah (tebal 2px)
  u8g2.drawPixel(76, 43);
  u8g2.drawPixel(77, 42); u8g2.drawPixel(78, 41);
  u8g2.drawPixel(79, 40); u8g2.drawPixel(80, 39);

  // ── Gigi (hanya saat mata terbuka) ──
  if (eyeOpen) {
    u8g2.setDrawColor(0);
    // Area gigi (hapus background di dalam mulut)
    u8g2.drawBox(55, 44, 18, 4);
    u8g2.setDrawColor(1);
    // Garis pembatas gigi tengah
    u8g2.drawVLine(64, 44, 4);
    // Bingkai gigi
    u8g2.drawHLine(55, 48, 18);
  }

  // ── Bintang / sparkle di 4 sudut (animasi bergantian) ──
  // sparkle 0..3: tiap frame ada bintang berbeda ukuran
  auto drawStar = [&](int sx, int sy, bool big) {
    u8g2.drawPixel(sx, sy);
    u8g2.drawPixel(sx-1, sy); u8g2.drawPixel(sx+1, sy);
    u8g2.drawPixel(sx, sy-1); u8g2.drawPixel(sx, sy+1);
    if (big) {
      u8g2.drawPixel(sx-2, sy); u8g2.drawPixel(sx+2, sy);
      u8g2.drawPixel(sx, sy-2); u8g2.drawPixel(sx, sy+2);
      u8g2.drawPixel(sx-1, sy-1); u8g2.drawPixel(sx+1, sy-1);
      u8g2.drawPixel(sx-1, sy+1); u8g2.drawPixel(sx+1, sy+1);
    }
  };
  bool bigA = (sparkle % 2 == 0);
  bool bigB = (sparkle % 2 == 1);
  drawStar(8,  8,  bigA);
  drawStar(120, 8,  bigB);
  drawStar(8,  55, bigB);
  drawStar(120,55, bigA);

  // ── Label bawah ──
  u8g2.setFont(u8g2_font_5x8_tf);
  u8g2.drawStr(22, 63, "SISTEM AMAN  :)");
  u8g2.setFont(u8g2_font_6x10_tf);  // kembalikan font default
}

// ── I2C Scanner ───────────────────────────────────────────────
void scanI2C() {
  Serial.println("========== I2C SCANNER ==========");
  byte found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte err = Wire.endTransmission();
    if (err == 0) {
      Serial.print("  [OK] Perangkat I2C ditemukan di 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) Serial.println("  [!!] Tidak ada perangkat I2C ditemukan!");
  Serial.println("=================================");
}

// ── MQTT Callback: terima config dari web dashboard ──────────
void mqttCallback(char* topic, byte* payload_bytes, unsigned int length) {
  String topicStr = String(topic);
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload_bytes[i];

  // Jika config update dari web: voltedge/config/<MAC>
  String configTopic = "voltedge/config/" + macAddress;
  if (topicStr == configTopic) {
    float val = msg.toFloat();
    if (val > 0) {
      maxCurrentLimit = val;
      Serial.printf("[MQTT] Config update: maxCurrent = %.2f A\n", maxCurrentLimit);
    }
  }

  // Jika reset command dari web: voltedge/reset/<MAC>
  String resetTopic = "voltedge/reset/" + macAddress;
  if (topicStr == resetTopic) {
    if (msg == "reset") {
      alertLatched    = false;
      overloadLatched = false;
      gasArmed        = false;   // nonaktifkan sensor gas sementara (hysteresis)
      alertHeaderInv  = true;
      Serial.println("[MQTT] Alert di-reset secara remote dari dashboard.");
    }
  }
}

// ── MQTT Reconnection ─────────────────────────────────────────
void reconnectMQTT() {
  if (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT Broker...");
    String clientId = "VoltEdge-ESP32-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("KONEK MQTT BERHASIL!");
      // Subscribe ke config topic untuk terima update batas arus dari web
      String configTopic = "voltedge/config/" + macAddress;
      client.subscribe(configTopic.c_str());
      Serial.printf("[MQTT] Subscribed to: %s\n", configTopic.c_str());

      // Subscribe ke reset topic untuk terima perintah reset dari web
      String resetTopic = "voltedge/reset/" + macAddress;
      client.subscribe(resetTopic.c_str());
      Serial.printf("[MQTT] Subscribed to: %s\n", resetTopic.c_str());
    } else {
      Serial.print("gagal, rc=");
      Serial.print(client.state());
      Serial.println(" coba lagi...");
    }
  }
}

// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== PZEM & MQ2 MONITOR (U8g2 SH1106) ===");

  // 1. Relay (default: OFF = HIGH = terminal terhubung / power ON)
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("[OK] Relay initialized (Default: OFF / Power ON)");

  // 2. Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);
  Serial.println("[OK] Buzzer initialized (Default: HIGH = DIAM)");

  // 3. Reset button
  pinMode(RESET_BTN_PIN, INPUT_PULLUP);
  Serial.println("[OK] Reset button initialized on D18 (INPUT_PULLUP)");

  // 4. Scan I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  scanI2C();

  // 5. OLED — splash screen
  Serial.println("Inisialisasi U8g2...");
  u8g2.begin();
  u8g2.setContrast(255);
  Serial.println("u8g2.begin() selesai.");

  u8g2.clearBuffer();
  // Splash: inverted header + info
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.setDrawColor(1);
  u8g2.drawBox(0, 0, 128, 13);
  u8g2.setDrawColor(0);
  u8g2.drawStr(5, 10, "PZEM & MQ2 MONITOR");
  u8g2.setDrawColor(1);
  u8g2.drawStr(0, 27, "Driver : SH1106 U8g2");
  u8g2.drawStr(0, 39, "Pins   : D16/D17/D33");
  u8g2.drawStr(0, 51, "OLED   : 128x64");
  u8g2.setFont(u8g2_font_5x8_tf);
  u8g2.drawStr(14, 63, "Memulai sensor...");
  u8g2.sendBuffer();
  delay(1500);

  // 6. PZEM
  pzemSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("[OK] PZEM Serial initialized on RXD2/TXD2");

  // 7. MQ-2
  pinMode(MQ2_PIN, INPUT);
  analogSetAttenuation(ADC_11db);
  Serial.println("[OK] MQ-2 Pin initialized");

  // 8. Koneksi WiFi
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.setDrawColor(1);
  u8g2.drawBox(0, 0, 128, 13);
  u8g2.setDrawColor(0);
  u8g2.drawStr(22, 10, "KONEKSI WIFI");
  u8g2.setDrawColor(1);
  u8g2.drawStr(0, 28, "SSID: " WIFI_SSID);
  u8g2.drawStr(0, 42, "Menghubungkan...");
  u8g2.sendBuffer();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int wTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wTimeout < 20) {
    delay(500);
    Serial.print(".");
    wTimeout++;
    u8g2.drawStr(wTimeout * 5, 54, ".");
    u8g2.sendBuffer();
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[OK] WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    u8g2.clearBuffer();
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 13);
    u8g2.setDrawColor(0);
    u8g2.drawStr(16, 10, "WIFI TERHUBUNG");
    u8g2.setDrawColor(1);
    u8g2.drawStr(0, 30, "IP:");
    u8g2.drawStr(24, 30, WiFi.localIP().toString().c_str());
    u8g2.drawStr(0, 45, "MQTT: " MQTT_SERVER);
    u8g2.sendBuffer();
    delay(1500);
  } else {
    Serial.println("\n[!!] WiFi Connection Timeout! Running in local mode.");
    u8g2.clearBuffer();
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 13);
    u8g2.setDrawColor(0);
    u8g2.drawStr(25, 10, "WIFI TIMEOUT");
    u8g2.setDrawColor(1);
    u8g2.drawStr(0, 30, "Menjalankan mode");
    u8g2.drawStr(0, 45, "lokal/tanpa internet");
    u8g2.sendBuffer();
    delay(1500);
  }

  // 9. Inisialisasi MQTT
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);  // pasang callback untuk terima config
  macAddress = WiFi.macAddress();
  macAddress.replace(":", "");
  telemetryTopic = "voltedge/telemetry/" + macAddress;

  startMillis    = millis();
  lastSmileShow  = millis();
  lastAlertBlink = millis();
  lastSparkle    = millis();
}

// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── WiFi & MQTT Latch / Reconnect ──
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      if (now - lastMqttRetry >= 5000UL) {
        lastMqttRetry = now;
        reconnectMQTT();
      }
    } else {
      client.loop();
    }
  }

  // ── 1. Baca Tombol Reset (D18, active LOW karena PULLUP) ──
  bool btnState = digitalRead(RESET_BTN_PIN);
  if (btnState == LOW && lastBtnState == HIGH) {
    delay(50);
    if (digitalRead(RESET_BTN_PIN) == LOW) {
      alertLatched    = false;
      overloadLatched = false;
      gasArmed        = false;   // nonaktifkan sensor gas sementara (hysteresis)
      alertHeaderInv  = true;
      Serial.println("[RESET] Alert di-reset. Sensor gas di-disarm sampai gas turun ke aman.");
    }
  }
  lastBtnState = btnState;

  // ── 2. Baca Sensor ────────────────────────────────────────
  int   mq2Value  = analogRead(MQ2_PIN);
  float voltage   = pzem.voltage();
  float current   = pzem.current();
  float power     = pzem.power();
  float energy    = pzem.energy();
  float pf        = pzem.pf();
  bool  pzemOk    = !isnan(voltage) && !isnan(current) && !isnan(power);

  // ── 2.5 Kirim Data MQTT Telemetry (Setiap 2 Detik) ──
  bool anyAlert = alertLatched || overloadLatched;
  if (client.connected() && (now - lastPublish >= 2000UL)) {
    lastPublish = now;
    char payload[256];
    String alertStr = "none";
    if (alertLatched) alertStr = "gas";
    else if (overloadLatched) alertStr = "overload";

    snprintf(payload, sizeof(payload),
             "{\"voltage\":%.1f,\"current\":%.2f,\"power\":%.1f,\"energy\":%.4f,\"pf\":%.2f,\"gas\":%d,\"relay\":%s,\"alert\":\"%s\"}",
             pzemOk ? voltage : 0.0,
             pzemOk ? current : 0.0,
             pzemOk ? power : 0.0,
             pzemOk ? energy : 0.0,
             pzemOk ? pf : 0.0,
             mq2Value,
             anyAlert ? "false" : "true",  // relay=false jika ada alert apapun
             alertStr.c_str());
    client.publish(telemetryTopic.c_str(), payload);
  }

  // ── 3. Logika LATCH Alert ─────────────────────────────────
  bool gasDanger      = (mq2Value > MQ2_THRESHOLD);
  bool overloadDanger = pzemOk && (current > maxCurrentLimit);

  // Hysteresis: re-arm sensor gas setelah turun ke level aman
  if (!gasArmed && mq2Value < GAS_SAFE_LEVEL) {
    gasArmed = true;
    Serial.println("[GAS] Sensor gas kembali aktif (gas sudah turun ke aman)");
  }

  // Gas: STICKY latch — hanya aktif kalau gasArmed
  if (gasDanger && gasArmed) alertLatched = true;

  // Overload: STICKY latch (harus ditekan tombol reset D18 atau reset dari web)
  if (overloadDanger)  overloadLatched = true;

  if (alertLatched || overloadLatched) {
    digitalWrite(RELAY_PIN, LOW);   // Putus relay
    // Passive Buzzer: 2730/2300 Hz untuk semua alert (gas & overload)
    unsigned long buzzerCycle = millis() % 300;
    tone(BUZZER_PIN, buzzerCycle < 150 ? 2730 : 2300);
  } else {
    digitalWrite(RELAY_PIN, HIGH);  // Relay normal (ON)
    noTone(BUZZER_PIN);
    digitalWrite(BUZZER_PIN, HIGH);
  }

  // ── 4. Serial Monitor ─────────────────────────────────────
  Serial.println("--------------------------------");
  Serial.printf("MQ-2 (Raw)     : %d | Gas: %s | Latch: %s\n",
                mq2Value,
                gasDanger    ? "BAHAYA" : "AMAN",
                alertLatched ? "YA"     : "TIDAK");
  Serial.printf("Relay          : %s\n", alertLatched ? "ON (TERPUTUS)" : "OFF (Normal)");
  Serial.printf("Buzzer         : %s\n", alertLatched ? "ON" : "OFF");
  if (pzemOk) {
    Serial.printf("PZEM V  : %.1f V\n",   voltage);
    Serial.printf("PZEM I  : %.2f A\n",   current);
    Serial.printf("PZEM P  : %.1f W\n",   power);
    Serial.printf("PZEM E  : %.4f kWh\n", energy);
    Serial.printf("PZEM PF : %.2f\n",     pf);
  } else {
    Serial.println("PZEM - ERROR: nan (periksa kabel & sumber AC)");
  }
  Serial.println("--------------------------------");

  // ── 5. Timer animasi senyum ───────────────────────────────
  bool showSmile = false;
  if (!alertLatched && !overloadLatched) {
    if (!smileVisible && (now - lastSmileShow >= SMILE_INTERVAL)) {
      smileVisible  = true;
      lastSmileShow = now;
      smileEyeOpen  = true;
      lastEyeBlink  = now;
    }
    if (smileVisible && (now - lastSmileShow >= SMILE_DURATION)) {
      smileVisible  = false;
      lastSmileShow = now;
    }
    showSmile = smileVisible;
  }

  // ── 6. Update state animasi ───────────────────────────────
  // Blink header alert (setiap 400ms)
  if ((alertLatched || overloadLatched) && (now - lastAlertBlink >= 400UL)) {
    alertHeaderInv = !alertHeaderInv;
    lastAlertBlink = now;
  }
  // Sparkle frame (setiap 300ms)
  if (now - lastSparkle >= 300UL) {
    sparkleFrame = (sparkleFrame + 1) % 4;
    lastSparkle  = now;
  }
  // Kedip mata senyum (setiap 150ms)
  if (showSmile && (now - lastEyeBlink >= 150UL)) {
    smileEyeOpen = !smileEyeOpen;
    lastEyeBlink = now;
    // Kedip cepat: buka kembali setelah 2 frame (300ms)
    // Implementasi: buka mata otomatis jika sudah menutup >300ms — gunakan counter sederhana
  }

  // ── 7. Render OLED ────────────────────────────────────────
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);

  if (showSmile) {
    // ══════════════════════════════════════════════════
    //  MODE SENYUM
    // ══════════════════════════════════════════════════
    drawSmileFace(smileEyeOpen, sparkleFrame);

  } else if (alertLatched || overloadLatched) {
    // ══════════════════════════════════════════════════
    //  MODE ALERT — layout dramatis
    // ══════════════════════════════════════════════════

    String alertTitle = alertLatched ? " GAS ALERT! " : " OVERLOAD ALERT ";

    // ── Header (blink: inverted <-> normal) ──
    if (alertHeaderInv) {
      u8g2.setDrawColor(1);
      u8g2.drawBox(0, 0, 128, 11);
      u8g2.setDrawColor(0);
      // Simbol seru di kiri & kanan
      u8g2.drawStr(2, 9,  "!");
      u8g2.drawStr(121, 9, "!");
      u8g2.drawStr(alertLatched ? 13 : 8, 9, alertTitle.c_str());
      u8g2.setDrawColor(1);
    } else {
      u8g2.drawStr(2, 9,  "!");
      u8g2.drawStr(121, 9, "!");
      u8g2.drawStr(alertLatched ? 13 : 8, 9, alertTitle.c_str());
    }

    // ── Double separator ──
    u8g2.drawHLine(0, 12, 128);
    u8g2.drawHLine(0, 13, 128);

    // ── Alert Content (Gas vs Overload) ──
    if (overloadLatched) {
      char limitBuf[24];
      snprintf(limitBuf, sizeof(limitBuf), "I: %.2f A / %.1f A", current, maxCurrentLimit);
      u8g2.setFont(u8g2_font_6x10_tf);
      u8g2.drawStr(10, 24, limitBuf);
      u8g2.setFont(u8g2_font_5x8_tf);
      u8g2.drawStr(105, 23, "OVER!");
    } else {
      u8g2.setFont(u8g2_font_5x8_tf);
      u8g2.drawStr(0, 23, "MQ-2:");
      u8g2.setFont(u8g2_font_6x10_tf);
      drawBigNumber(mq2Value, 32, 15);  // angka double-height
      u8g2.setFont(u8g2_font_5x8_tf);
      u8g2.drawStr(95, 23, "BAHAYA!");
    }
    u8g2.setFont(u8g2_font_6x10_tf);

    // ── Double separator ──
    u8g2.drawHLine(0, 29, 128);
    u8g2.drawHLine(0, 30, 128);

    // ── PZEM compact 2-kolom ──
    char buf[32];
    u8g2.setFont(u8g2_font_5x8_tf);
    if (pzemOk) {
      snprintf(buf, sizeof(buf), "V:%.1fV", voltage);
      u8g2.drawStr(0, 40, buf);
      snprintf(buf, sizeof(buf), "I:%.2fA", current);
      u8g2.drawStr(65, 40, buf);
      u8g2.drawHLine(0, 42, 128);
      snprintf(buf, sizeof(buf), "P:%.1fW", power);
      u8g2.drawStr(0, 51, buf);
      snprintf(buf, sizeof(buf), "PF:%.2f", pf);
      u8g2.drawStr(65, 51, buf);
      u8g2.drawVLine(62, 32, 28);  // divider vertikal kolom
    } else {
      u8g2.drawStr(0, 40, "PZEM: [COMM ERROR]");
      u8g2.drawStr(0, 51, "Periksa kabel AC!");
    }

    // ── Footer inverted: instruksi reset ──
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 55, 128, 9);
    u8g2.setDrawColor(0);
    u8g2.drawStr(4, 63, "Tekan D18 untuk RESET");
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_6x10_tf);

  } else {
    // ══════════════════════════════════════════════════
    //  MODE NORMAL — layout rapi & informatif
    // ══════════════════════════════════════════════════

    // ── Header inverted ──
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 11);
    u8g2.setDrawColor(0);
    u8g2.drawStr(5, 9, "PZEM & MQ2 MONITOR");
    u8g2.setDrawColor(1);

    // ── Uptime di pojok kanan header ──
    // (sudah cukup dengan judul, skip uptime di header agar tidak terlalu penuh)

    u8g2.drawHLine(0, 12, 128);

    // ── Baris Gas MQ-2 (bar visual) ──
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(0, 22, "GAS:");
    drawGasBar(mq2Value);
    char bufGas[16];
    snprintf(bufGas, sizeof(bufGas), "%d", mq2Value);
    u8g2.drawStr(100, 22, bufGas);
    u8g2.setFont(u8g2_font_6x10_tf);

    u8g2.drawHLine(0, 24, 128);

    // ── Pembagi vertikal tengah (hanya untuk 2 baris teratas) ──
    u8g2.drawVLine(63, 24, 22);  // vertikal dari y=24 sampai y=46

    // ── Grid PZEM ──
    u8g2.setFont(u8g2_font_5x8_tf);
    if (pzemOk) {
      char b1[32], b2[20];

      // Baris 1: Voltage | Current
      snprintf(b1, sizeof(b1), "V %.1fV", voltage);
      snprintf(b2, sizeof(b2), "I %.2fA", current);
      u8g2.drawStr(1, 33, b1);
      u8g2.drawStr(65, 33, b2);
      u8g2.drawHLine(0, 35, 128);

      // Baris 2: Power | Power Factor
      snprintf(b1, sizeof(b1), "P %.1fW", power);
      snprintf(b2, sizeof(b2), "PF %.2f", pf);
      u8g2.drawStr(1, 44, b1);
      u8g2.drawStr(65, 44, b2);
      u8g2.drawHLine(0, 46, 128);

      // Baris 3: Energy (Lebar Penuh, Terpusat)
      snprintf(b1, sizeof(b1), "Energy: %.4f kWh", energy);
      u8g2.drawStr(12, 55, b1);
    } else {
      u8g2.drawStr(1, 36, "PZEM ERROR");
      u8g2.drawStr(1, 46, "nan - cek kabel");
      u8g2.drawStr(1, 56, "& sumber AC");
    }

    // ── Footer (Dashboard Link) ──
    u8g2.drawHLine(0, 57, 128);
    u8g2.drawStr(7, 63, DASHBOARD_URL);
    u8g2.setFont(u8g2_font_6x10_tf);
  }

  u8g2.sendBuffer();
  delay(150);
}