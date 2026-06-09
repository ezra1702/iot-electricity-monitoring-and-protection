#include <Wire.h>
#include <U8g2lib.h>
#include <PZEM004Tv30.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <esp_task_wdt.h> // ESP32 Task Watchdog Timer (TWDT)
#include <esp_idf_version.h>

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

#define GAS_SAFE_LEVEL 1500      // batas aman untuk re-arm sensor gas

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

// ── FreeRTOS Mutex & Semaphore Handles ──────────────────────────
SemaphoreHandle_t i2cMutex;
SemaphoreHandle_t dataMutex;
SemaphoreHandle_t alertSemaphore;

// ── Finite State Machine (FSM) untuk Modeling ──────────────────
enum SystemState {
  STATE_NORMAL,
  STATE_ALERT_GAS,
  STATE_ALERT_OVERLOAD,
  STATE_DISARMED_HYSTERESIS
};

// ── State global (Dilindungi oleh dataMutex) ───────────────────
SystemState currentState = STATE_NORMAL;

int   mq2Value        = 0;
float voltage         = 0.0;
float current         = 0.0;
float power           = 0.0;
float energy          = 0.0;
float pf              = 0.0;
bool  pzemOk          = false;

bool  lastBtnState    = HIGH;
bool  gasArmed        = true;    // hysteresis: re-arm setelah gas turun ke aman
float maxCurrentLimit = 5.0;     // batas arus dari dashboard
bool  resetTriggered  = false;   // trigger reset dari tombol fisik/MQTT

// State untuk mode testing / simulasi mandiri (Self-Test via MQTT)
bool simGasAlert      = false;
bool simOverloadAlert = false;

// ── State local untuk animasi (Hanya diakses di TaskOLED) ──────
unsigned long lastSmileShow  = 0;
bool smileVisible            = false;
bool smileEyeOpen            = true;
unsigned long lastEyeBlink   = 0;
bool alertHeaderInv          = true;   // untuk blink header alert
unsigned long lastAlertBlink = 0;
uint8_t  sparkleFrame        = 0;      // animasi bintang
unsigned long lastSparkle    = 0;

// ── Gas bar indicator (mode normal) ──────────────────────────
void drawGasBar(int rawValue) {
  int barX = 38, barY = 24, barW = 60, barH = 5;
  u8g2.drawFrame(barX, barY, barW, barH);
  int fill = map(constrain(rawValue, 0, 1023), 0, 1023, 0, barW - 2);
  if (fill > 0) u8g2.drawBox(barX + 1, barY + 1, fill, barH - 2);
}

// ── Double-height digit (untuk alert mode) ────────────────────
void drawBigDigit(int digit, int x, int y) {
  const uint8_t segs[10] = {
    0b1110111, // 0
    0b0010010, // 1
    0b1101101, // 2
    0b1111001, // 3
    0b0011011, // 4
    0b1011011, // 5
    0b1011111, // 6
    0b1110010, // 7
    0b1111111, // 8
    0b1111011, // 9
  };
  if (digit < 0 || digit > 9) return;
  uint8_t s = segs[digit];
  int sw = 9, sh = 13;
  if (s & 0b1000000) u8g2.drawBox(x+1, y,   sw-2, 2);
  if (s & 0b0001000) u8g2.drawBox(x+1, y+5, sw-2, 2);
  if (s & 0b0000001) u8g2.drawBox(x+1, y+sh-2, sw-2, 2);
  if (s & 0b0100000) u8g2.drawBox(x,   y+1, 2, 5);
  if (s & 0b0010000) u8g2.drawBox(x+sw-2, y+1, 2, 5);
  if (s & 0b0000100) u8g2.drawBox(x,   y+6, 2, 5);
  if (s & 0b0000010) u8g2.drawBox(x+sw-2, y+6, 2, 5);
}

void drawBigNumber(int value, int x, int y) {
  char buf[8];
  snprintf(buf, sizeof(buf), "%d", value);
  int cx = x;
  for (int i = 0; buf[i]; i++) {
    if (buf[i] >= '0' && buf[i] <= '9') {
      drawBigDigit(buf[i] - '0', cx, y);
      cx += 11;
    }
  }
}

// ── Animasi wajah senyum ─────────────────────────────────────
void drawSmileFace(bool eyeOpen, uint8_t sparkle) {
  int cx = 64, cy = 30, r = 26;

  u8g2.drawCircle(cx, cy, r,   U8G2_DRAW_ALL);
  u8g2.drawCircle(cx, cy, r-1, U8G2_DRAW_ALL);

  u8g2.drawPixel(48, 18); u8g2.drawPixel(49, 17);
  u8g2.drawPixel(50, 17); u8g2.drawPixel(51, 17);
  u8g2.drawPixel(52, 18);
  u8g2.drawPixel(76, 18); u8g2.drawPixel(77, 17);
  u8g2.drawPixel(78, 17); u8g2.drawPixel(79, 17);
  u8g2.drawPixel(80, 18);

  if (eyeOpen) {
    u8g2.drawDisc(52, 25, 4, U8G2_DRAW_ALL);
    u8g2.drawDisc(76, 25, 4, U8G2_DRAW_ALL);
    u8g2.setDrawColor(0);
    u8g2.drawPixel(54, 23);
    u8g2.drawPixel(78, 23);
    u8g2.setDrawColor(1);
    u8g2.drawPixel(44, 30); u8g2.drawPixel(45, 31); u8g2.drawPixel(46, 30);
    u8g2.drawPixel(82, 30); u8g2.drawPixel(83, 31); u8g2.drawPixel(84, 30);
  } else {
    u8g2.drawPixel(48, 26); u8g2.drawPixel(49, 25);
    u8g2.drawPixel(50, 24); u8g2.drawPixel(51, 24);
    u8g2.drawPixel(52, 25); u8g2.drawPixel(53, 26);
    u8g2.drawPixel(54, 27); u8g2.drawPixel(55, 27);
    u8g2.drawPixel(72, 26); u8g2.drawPixel(73, 25);
    u8g2.drawPixel(74, 24); u8g2.drawPixel(75, 24);
    u8g2.drawPixel(76, 25); u8g2.drawPixel(77, 26);
    u8g2.drawPixel(78, 27); u8g2.drawPixel(79, 27);
    u8g2.drawPixel(44, 30); u8g2.drawPixel(45, 31); u8g2.drawPixel(46, 30);
    u8g2.drawPixel(82, 30); u8g2.drawPixel(83, 31); u8g2.drawPixel(84, 30);
  }

  u8g2.drawPixel(48, 39); u8g2.drawPixel(49, 40);
  u8g2.drawPixel(50, 41); u8g2.drawPixel(51, 42);
  u8g2.drawPixel(52, 43);
  u8g2.drawLine(53, 43, 75, 43);
  u8g2.drawLine(53, 44, 75, 44);
  u8g2.drawPixel(76, 43);
  u8g2.drawPixel(77, 42); u8g2.drawPixel(78, 41);
  u8g2.drawPixel(79, 40); u8g2.drawPixel(80, 39);

  if (eyeOpen) {
    u8g2.setDrawColor(0);
    u8g2.drawBox(55, 44, 18, 4);
    u8g2.setDrawColor(1);
    u8g2.drawVLine(64, 44, 4);
    u8g2.drawHLine(55, 48, 18);
  }

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

  u8g2.setFont(u8g2_font_5x8_tf);
  u8g2.drawStr(22, 63, "SISTEM AMAN  :)");
  u8g2.setFont(u8g2_font_6x10_tf);
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

// ── MQTT Callback: terima config, command reset, dan self-test ──
void mqttCallback(char* topic, byte* payload_bytes, unsigned int length) {
  String topicStr = String(topic);
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload_bytes[i];

  // 1. Config Update (Batas Arus)
  String configTopic = "voltedge/config/" + macAddress;
  if (topicStr == configTopic) {
    float val = msg.toFloat();
    if (val > 0) {
      xSemaphoreTake(dataMutex, portMAX_DELAY);
      maxCurrentLimit = val;
      xSemaphoreGive(dataMutex);
      Serial.printf("[MQTT] Config update: maxCurrent = %.2f A\n", val);
    }
  }

  // 2. Perintah Remote Reset
  String resetTopic = "voltedge/reset/" + macAddress;
  if (topicStr == resetTopic) {
    if (msg == "reset") {
      xSemaphoreTake(dataMutex, portMAX_DELAY);
      resetTriggered = true; 
      simGasAlert      = false; // matikan simulasi saat direset
      simOverloadAlert = false;
      xSemaphoreGive(dataMutex);
      Serial.println("[MQTT] Perintah reset diterima.");
    }
  }

  // 3. Mode Pengujian & Simulasi Mandiri (Self-Test Mode)
  String testTopic = "voltedge/test/" + macAddress;
  if (topicStr == testTopic) {
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    if (msg == "test_gas") {
      simGasAlert = true;
      simOverloadAlert = false;
      Serial.println("[TEST MODE] Memicu Simulasi Bahaya Gas.");
    } else if (msg == "test_overload") {
      simOverloadAlert = true;
      simGasAlert = false;
      Serial.println("[TEST MODE] Memicu Simulasi Overload Arus.");
    } else if (msg == "test_normal" || msg == "reset") {
      simGasAlert = false;
      simOverloadAlert = false;
      Serial.println("[TEST MODE] Menghentikan Simulasi, Kembali Normal.");
    }
    xSemaphoreGive(dataMutex);
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
      String configTopic = "voltedge/config/" + macAddress;
      client.subscribe(configTopic.c_str());
      Serial.printf("[MQTT] Subscribed to: %s\n", configTopic.c_str());

      String resetTopic = "voltedge/reset/" + macAddress;
      client.subscribe(resetTopic.c_str());
      Serial.printf("[MQTT] Subscribed to: %s\n", resetTopic.c_str());

      String testTopic = "voltedge/test/" + macAddress;
      client.subscribe(testTopic.c_str());
      Serial.printf("[MQTT] Subscribed to: %s\n", testTopic.c_str());
    } else {
      Serial.print("gagal, rc=");
      Serial.print(client.state());
      Serial.println(" coba lagi...");
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  TASK 1: BACA SENSOR & PROTEKSI FSM (CORE 0 - HIGH PRIORITY)
// ══════════════════════════════════════════════════════════════
void TaskSensorRead(void *pvParameters) {
  (void) pvParameters;

  // TWDT: Registrasikan task ini agar dipantau
  esp_task_wdt_add(NULL);

  TickType_t xLastWakeTime = xTaskGetTickCount();

  for (;;) {
    // Beri makan TWDT agar tidak reset ESP32
    esp_task_wdt_reset();

    // 1. Baca Tombol Reset D18 (active LOW)
    bool btnState = digitalRead(RESET_BTN_PIN);
    
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    bool currentBtnState = lastBtnState;
    xSemaphoreGive(dataMutex);

    if (btnState == LOW && currentBtnState == HIGH) {
      vTaskDelay(pdMS_TO_TICKS(50)); // debounce
      if (digitalRead(RESET_BTN_PIN) == LOW) {
        xSemaphoreTake(dataMutex, portMAX_DELAY);
        resetTriggered   = true;
        simGasAlert      = false; // reset simulasi
        simOverloadAlert = false;
        xSemaphoreGive(dataMutex);
        Serial.println("[RESET] Tombol fisik ditekan.");
      }
    }

    xSemaphoreTake(dataMutex, portMAX_DELAY);
    lastBtnState = btnState;
    xSemaphoreGive(dataMutex);

    // 2. Baca Sensor PZEM-004T secara fisik
    float v = pzem.voltage();
    float c = pzem.current();
    float p = pzem.power();
    float e = pzem.energy();
    float pf_val = pzem.pf();
    bool ok = !isnan(v) && !isnan(c) && !isnan(p);

    // 3. Baca Sensor MQ-2 secara fisik
    int mq2 = analogRead(MQ2_PIN);

    // 4. Integrasikan data simulasi jika Test Mode aktif (Testing & Validasi)
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    if (simGasAlert) {
      mq2 = 3500; // di atas threshold 2000
    }
    if (simOverloadAlert) {
      c = maxCurrentLimit + 2.0; // di atas maxCurrentLimit
      ok = true;
    }

    voltage  = ok ? v : 0.0;
    current  = ok ? c : 0.0;
    power    = ok ? p : 0.0;
    energy   = ok ? e : 0.0;
    pf       = ok ? pf_val : 0.0;
    pzemOk   = ok;
    mq2Value = mq2;

    // 5. FINITE STATE MACHINE (FSM) TRANSITIONS
    SystemState nextState = currentState;
    bool gasDanger      = (mq2 > MQ2_THRESHOLD);
    bool overloadDanger = ok && (c > maxCurrentLimit);

    // Hysteresis logic
    if (!gasArmed && mq2 < GAS_SAFE_LEVEL) {
      gasArmed = true;
      Serial.println("[FSM] Hysteresis: Sensor gas re-armed (aman).");
    }

    switch (currentState) {
      case STATE_NORMAL:
        if (gasDanger && gasArmed) {
          nextState = STATE_ALERT_GAS;
          Serial.println("[FSM] STATE Transition: NORMAL -> ALERT_GAS");
        } else if (overloadDanger) {
          nextState = STATE_ALERT_OVERLOAD;
          Serial.println("[FSM] STATE Transition: NORMAL -> ALERT_OVERLOAD");
        }
        break;

      case STATE_ALERT_GAS:
        if (resetTriggered) {
          if (gasDanger) {
            nextState = STATE_DISARMED_HYSTERESIS;
            gasArmed = false; // Bypass deteksi gas sementara
            Serial.println("[FSM] STATE Transition: ALERT_GAS -> DISARMED_HYSTERESIS (Gas masih tinggi)");
          } else {
            nextState = STATE_NORMAL;
            Serial.println("[FSM] STATE Transition: ALERT_GAS -> NORMAL");
          }
          resetTriggered = false;
        }
        break;

      case STATE_ALERT_OVERLOAD:
        if (resetTriggered) {
          nextState = STATE_NORMAL;
          Serial.println("[FSM] STATE Transition: ALERT_OVERLOAD -> NORMAL");
          resetTriggered = false;
        }
        break;

      case STATE_DISARMED_HYSTERESIS:
        if (mq2 < GAS_SAFE_LEVEL) {
          nextState = STATE_NORMAL;
          gasArmed = true; // aktifkan lagi
          Serial.println("[FSM] STATE Transition: DISARMED_HYSTERESIS -> NORMAL (Gas aman, re-armed)");
        }
        // Proteksi sekunder: Jika terjadi overload saat gas disarm, tetap trip overload!
        if (overloadDanger) {
          nextState = STATE_ALERT_OVERLOAD;
          Serial.println("[FSM] STATE Transition: DISARMED_HYSTERESIS -> ALERT_OVERLOAD");
        }
        break;
    }

    // Cek jika ada transisi status baru dari aman ke bahaya
    bool isOldAlert = (currentState == STATE_ALERT_GAS || currentState == STATE_ALERT_OVERLOAD);
    bool isNewAlert = (nextState == STATE_ALERT_GAS || nextState == STATE_ALERT_OVERLOAD);
    
    if (isNewAlert && !isOldAlert) {
      xSemaphoreGive(alertSemaphore); // Bangunkan task MQTT untuk publish instan
    }

    currentState = nextState;

    // 6. Jalankan Aksi Aktuator (Relay & Buzzer) sesuai FSM State
    if (currentState == STATE_ALERT_GAS || currentState == STATE_ALERT_OVERLOAD) {
      digitalWrite(RELAY_PIN, LOW); // PUTUS DAYA (LOW)
      
      // Buzzer berbunyi berkedip (2730Hz / 2300Hz)
      xSemaphoreGive(dataMutex); 
      unsigned long buzzerCycle = millis() % 300;
      tone(BUZZER_PIN, buzzerCycle < 150 ? 2730 : 2300);
      xSemaphoreTake(dataMutex, portMAX_DELAY);
    } else {
      digitalWrite(RELAY_PIN, HIGH); // NYALAKAN DAYA (HIGH)
      noTone(BUZZER_PIN);
      digitalWrite(BUZZER_PIN, HIGH);
    }

    // Debug print (Setiap 1 detik)
    static unsigned long lastSerialPrint = 0;
    if (millis() - lastSerialPrint >= 1000UL) {
      lastSerialPrint = millis();
      Serial.println("================================");
      Serial.printf("[FSM] Status Aktif: %s\n", 
                    currentState == STATE_NORMAL ? "NORMAL" :
                    currentState == STATE_ALERT_GAS ? "ALERT_GAS" :
                    currentState == STATE_ALERT_OVERLOAD ? "ALERT_OVERLOAD" : "DISARMED_HYSTERESIS");
      Serial.printf("MQ-2 (Gas)    : %d ppm | Limit: %d ppm\n", mq2, MQ2_THRESHOLD);
      if (ok) {
        Serial.printf("PZEM Arus     : %.2f A | Limit: %.1f A\n", c, maxCurrentLimit);
        Serial.printf("PZEM Daya     : %.1f W\n", p);
        Serial.printf("PZEM Tegangan : %.1f V\n", v);
      } else {
        Serial.println("PZEM Sensor   : ERROR / NAN");
      }
      Serial.println("================================");
    }

    xSemaphoreGive(dataMutex);

    vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(100)); // Cek setiap 100ms
  }
}

// ══════════════════════════════════════════════════════════════
//  TASK 2: RENDER OLED GRAPHICS (CORE 1 - MEDIUM PRIORITY)
// ══════════════════════════════════════════════════════════════
void TaskOLED(void *pvParameters) {
  (void) pvParameters;

  esp_task_wdt_add(NULL);

  TickType_t xLastWakeTime = xTaskGetTickCount();

  for (;;) {
    esp_task_wdt_reset();

    unsigned long now = millis();

    // Dapatkan data visual terproteksi
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    float v = voltage;
    float c = current;
    float p = power;
    float e = energy;
    float pf_val = pf;
    bool ok = pzemOk;
    int mq2 = mq2Value;
    SystemState state = currentState;
    float currentLimit = maxCurrentLimit;
    xSemaphoreGive(dataMutex);

    bool isAlert = (state == STATE_ALERT_GAS || state == STATE_ALERT_OVERLOAD);
    bool isGasAlert = (state == STATE_ALERT_GAS);
    bool isOverloadAlert = (state == STATE_ALERT_OVERLOAD);

    // Animasi senyum
    bool showSmile = false;
    if (!isAlert) {
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

    // Update state animasi
    if (isAlert && (now - lastAlertBlink >= 400UL)) {
      alertHeaderInv = !alertHeaderInv;
      lastAlertBlink = now;
    }
    if (now - lastSparkle >= 300UL) {
      sparkleFrame = (sparkleFrame + 1) % 4;
      lastSparkle  = now;
    }
    if (showSmile && (now - lastEyeBlink >= 150UL)) {
      smileEyeOpen = !smileEyeOpen;
      lastEyeBlink = now;
    }

    // Menggambar OLED (Mutex I2C)
    xSemaphoreTake(i2cMutex, portMAX_DELAY);
    u8g2.clearBuffer();
    u8g2.setFont(u8g2_font_6x10_tf);

    if (showSmile) {
      drawSmileFace(smileEyeOpen, sparkleFrame);
    } else if (isAlert) {
      String alertTitle = isGasAlert ? " GAS ALERT! " : " OVERLOAD ALERT ";
      
      if (alertHeaderInv) {
        u8g2.setDrawColor(1);
        u8g2.drawBox(0, 0, 128, 11);
        u8g2.setDrawColor(0);
        u8g2.drawStr(2, 9,  "!");
        u8g2.drawStr(121, 9, "!");
        u8g2.drawStr(isGasAlert ? 13 : 8, 9, alertTitle.c_str());
        u8g2.setDrawColor(1);
      } else {
        u8g2.drawStr(2, 9,  "!");
        u8g2.drawStr(121, 9, "!");
        u8g2.drawStr(isGasAlert ? 13 : 8, 9, alertTitle.c_str());
      }

      u8g2.drawHLine(0, 12, 128);
      u8g2.drawHLine(0, 13, 128);

      if (isOverloadAlert) {
        char limitBuf[24];
        snprintf(limitBuf, sizeof(limitBuf), "I: %.2f A / %.1f A", c, currentLimit);
        u8g2.setFont(u8g2_font_6x10_tf);
        u8g2.drawStr(10, 24, limitBuf);
        u8g2.setFont(u8g2_font_5x8_tf);
        u8g2.drawStr(105, 23, "OVER!");
      } else {
        u8g2.setFont(u8g2_font_5x8_tf);
        u8g2.drawStr(0, 23, "MQ-2:");
        u8g2.setFont(u8g2_font_6x10_tf);
        drawBigNumber(mq2, 32, 15);
        u8g2.setFont(u8g2_font_5x8_tf);
        u8g2.drawStr(95, 23, "BAHAYA!");
      }
      u8g2.setFont(u8g2_font_6x10_tf);

      u8g2.drawHLine(0, 29, 128);
      u8g2.drawHLine(0, 30, 128);

      char buf[32];
      u8g2.setFont(u8g2_font_5x8_tf);
      if (ok) {
        snprintf(buf, sizeof(buf), "V:%.1fV", v);
        u8g2.drawStr(0, 40, buf);
        snprintf(buf, sizeof(buf), "I:%.2fA", c);
        u8g2.drawStr(65, 40, buf);
        u8g2.drawHLine(0, 42, 128);
        snprintf(buf, sizeof(buf), "P:%.1fW", p);
        u8g2.drawStr(0, 51, buf);
        snprintf(buf, sizeof(buf), "PF:%.2f", pf_val);
        u8g2.drawStr(65, 51, buf);
        u8g2.drawVLine(62, 32, 28);
      } else {
        u8g2.drawStr(0, 40, "PZEM: [COMM ERROR]");
        u8g2.drawStr(0, 51, "Periksa kabel AC!");
      }

      u8g2.setDrawColor(1);
      u8g2.drawBox(0, 55, 128, 9);
      u8g2.setDrawColor(0);
      u8g2.drawStr(4, 63, "Tekan D18 untuk RESET");
      u8g2.setDrawColor(1);
      u8g2.setFont(u8g2_font_6x10_tf);
    } else {
      u8g2.setDrawColor(1);
      u8g2.drawBox(0, 0, 128, 11);
      u8g2.setDrawColor(0);
      u8g2.drawStr(5, 9, "PZEM & MQ2 MONITOR");
      u8g2.setDrawColor(1);

      u8g2.drawHLine(0, 12, 128);

      u8g2.setFont(u8g2_font_5x8_tf);
      u8g2.drawStr(0, 22, "GAS:");
      drawGasBar(mq2);
      char bufGas[16];
      snprintf(bufGas, sizeof(bufGas), "%d", mq2);
      u8g2.drawStr(100, 22, bufGas);
      u8g2.setFont(u8g2_font_6x10_tf);

      u8g2.drawHLine(0, 24, 128);
      u8g2.drawVLine(63, 24, 22);

      u8g2.setFont(u8g2_font_5x8_tf);
      if (ok) {
        char b1[32], b2[20];
        snprintf(b1, sizeof(b1), "V %.1fV", v);
        snprintf(b2, sizeof(b2), "I %.2fA", c);
        u8g2.drawStr(1, 33, b1);
        u8g2.drawStr(65, 33, b2);
        u8g2.drawHLine(0, 35, 128);

        snprintf(b1, sizeof(b1), "P %.1fW", p);
        snprintf(b2, sizeof(b2), "PF %.2f", pf_val);
        u8g2.drawStr(1, 44, b1);
        u8g2.drawStr(65, 44, b2);
        u8g2.drawHLine(0, 46, 128);

        snprintf(b1, sizeof(b1), "Energy: %.4f kWh", e);
        u8g2.drawStr(12, 55, b1);
      } else {
        u8g2.drawStr(1, 36, "PZEM ERROR");
        u8g2.drawStr(1, 46, "nan - cek kabel");
        u8g2.drawStr(1, 56, "& sumber AC");
      }

      u8g2.drawHLine(0, 57, 128);
      u8g2.drawStr(7, 63, DASHBOARD_URL);
      u8g2.setFont(u8g2_font_6x10_tf);
    }

    u8g2.sendBuffer();
    xSemaphoreGive(i2cMutex);

    vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(150)); // Draw screen every 150ms
  }
}

// ══════════════════════════════════════════════════════════════
//  TASK 3: KONEKSI & MQTT TELEMETRY (CORE 1 - LOW PRIORITY)
// ══════════════════════════════════════════════════════════════
void TaskMQTT(void *pvParameters) {
  (void) pvParameters;

  esp_task_wdt_add(NULL);

  for (;;) {
    esp_task_wdt_reset();

    if (WiFi.status() == WL_CONNECTED) {
      if (!client.connected()) {
        unsigned long now = millis();
        if (now - lastMqttRetry >= 5000UL) {
          lastMqttRetry = now;
          reconnectMQTT();
        }
      } else {
        client.loop();
      }
    }

    // Tunggu trigger alert darurat selama 2 detik.
    // Jika tidak ada trigger (timeout), langsung kirim telemetri berkala (periodik).
    bool triggered = (xSemaphoreTake(alertSemaphore, pdMS_TO_TICKS(2000)) == pdTRUE);

    if (client.connected()) {
      char payload[256];
      String alertStr = "none";

      xSemaphoreTake(dataMutex, portMAX_DELAY);
      float v      = voltage;
      float c      = current;
      float p      = power;
      float e      = energy;
      float pf_val = pf;
      bool ok      = pzemOk;
      int mq2      = mq2Value;
      SystemState state = currentState;
      xSemaphoreGive(dataMutex);

      bool isAlert = (state == STATE_ALERT_GAS || state == STATE_ALERT_OVERLOAD);
      if (state == STATE_ALERT_GAS) alertStr = "gas";
      else if (state == STATE_ALERT_OVERLOAD) alertStr = "overload";

      snprintf(payload, sizeof(payload),
               "{\"voltage\":%.1f,\"current\":%.2f,\"power\":%.1f,\"energy\":%.4f,\"pf\":%.2f,\"gas\":%d,\"relay\":%s,\"alert\":\"%s\"}",
               ok ? v : 0.0,
               ok ? c : 0.0,
               ok ? p : 0.0,
               ok ? e : 0.0,
               ok ? pf_val : 0.0,
               mq2,
               isAlert ? "false" : "true",
               alertStr.c_str());

      client.publish(telemetryTopic.c_str(), payload);
      if (triggered) {
        Serial.println("[MQTT] Telemetri ALERT darurat langsung dikirim via Semaphore!");
      }
    }

    vTaskDelay(pdMS_TO_TICKS(50)); // Jeda kecil untuk stabilitas task loop
  }
}

// ──────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== PZEM & MQ2 MONITOR (FreeRTOS) ===");

  // 1. Inisialisasi Pin Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("[OK] Relay initialized (Default: OFF / Power ON)");

  // 2. Inisialisasi Pin Buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);
  Serial.println("[OK] Buzzer initialized (Default: HIGH = SILENT)");

  // 3. Inisialisasi Pin Tombol Reset
  pinMode(RESET_BTN_PIN, INPUT_PULLUP);
  Serial.println("[OK] Reset button initialized on D18 (INPUT_PULLUP)");

  // 4. Inisialisasi Mutex & Semaphore
  i2cMutex = xSemaphoreCreateMutex();
  dataMutex = xSemaphoreCreateMutex();
  alertSemaphore = xSemaphoreCreateBinary();


  // 6. Scan I2C & OLED Splash
  Wire.begin(SDA_PIN, SCL_PIN);
  scanI2C();
  u8g2.begin();
  u8g2.setContrast(255);

  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.setDrawColor(1);
  u8g2.drawBox(0, 0, 128, 13);
  u8g2.setDrawColor(0);
  u8g2.drawStr(5, 10, "PZEM & MQ2 MONITOR");
  u8g2.setDrawColor(1);
  u8g2.drawStr(0, 27, "OS     : FreeRTOS ESP32");
  u8g2.drawStr(0, 39, "SDA/SCL: D21/D22");
  u8g2.drawStr(0, 51, "Status : Multi-tasking");
  u8g2.setFont(u8g2_font_5x8_tf);
  u8g2.drawStr(14, 63, "Memulai system...");
  u8g2.sendBuffer();
  delay(1500);

  // 7. PZEM & MQ-2 Attenuation
  pzemSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
  pinMode(MQ2_PIN, INPUT);
  analogSetAttenuation(ADC_11db);

  // 8. WiFi Connection
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

  // 9. MQTT Setup
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(mqttCallback);
  macAddress = WiFi.macAddress();
  macAddress.replace(":", "");
  telemetryTopic = "voltedge/telemetry/" + macAddress;

  // 5. Inisialisasi Task Watchdog Timer (TWDT) - Timeout 15 Detik (Dipindahkan ke akhir setup agar tidak bootloop saat WiFi connecting)
#if defined(ESP_IDF_VERSION_MAJOR) && ESP_IDF_VERSION_MAJOR >= 5
  esp_task_wdt_config_t wdt_config = {
    .timeout_ms = 15000,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_init(&wdt_config);
#else
  esp_task_wdt_init(15, true);
#endif
  esp_task_wdt_add(NULL); // Daftarkan task utama (setup/loop)

  // 10. Membuat Task-Task FreeRTOS
  // TaskSensorRead: Core 0, Priority 3 (Tinggi)
  xTaskCreatePinnedToCore(
    TaskSensorRead,
    "TaskSensorRead",
    4096,
    NULL,
    3,
    NULL,
    0
  );

  // TaskOLED: Core 1, Priority 2 (Sedang)
  xTaskCreatePinnedToCore(
    TaskOLED,
    "TaskOLED",
    4096,
    NULL,
    2,
    NULL,
    1
  );

  // TaskMQTT: Core 1, Priority 1 (Rendah)
  xTaskCreatePinnedToCore(
    TaskMQTT,
    "TaskMQTT",
    8192,
    NULL,
    1,
    NULL,
    1
  );

  Serial.println("[SYSTEM] FreeRTOS Tasks created successfully!");
}

void loop() {
  esp_task_wdt_reset(); // Feed the main task watchdog
  vTaskDelay(pdMS_TO_TICKS(1000));
}