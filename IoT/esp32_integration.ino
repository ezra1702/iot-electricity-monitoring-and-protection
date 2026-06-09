#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <PZEM004Tv30.h>

// ===== LIBRARY WIFI & MQTT =====
#include <WiFi.h>
#include <PubSubClient.h>

// ===== CONFIGURATIONS =====
#define WIFI_SSID       "X"
#define WIFI_PASSWORD   "x12345678"
#define DASHBOARD_URL   "localhost:3000"

// ===== FREERTOS =====
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>
#include <esp_task_wdt.h>

// ===== KONFIGURASI MQTT =====
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

String macAddress = "";
String telemetryTopic = "";
String configTopic = "";

// ===== PIN DEFINITION =====
// (Sesuai skematik EasyEDA — ESP32 DEVKITV1)
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64

// PZEM-004T → Socket PZEM (JST-XH2.54 4P)
// ESP32 RX2 ← PZEM TX  (D16)
// ESP32 TX2 → PZEM RX  (D17)
#define RXD2          16
#define TXD2          17

// MQ-2 Gas Sensor → Socket SENSORMQ2 (JST-XH2.54 3P)
// Analog output → D33  (ADC1_CH5 — bebas noise WiFi)
#define MQ2_PIN       33

// Relay (via Logic Shifter + PC817 optocoupler) → D25
#define RELAY_PIN     25

// Buzzer BZ1 → Socket BUZZER → D19
#define BUZZER_PIN    19

// Reset Button KEY1 → D18
#define BUTTON_PIN    18

// OLED SSD1306 → Socket OLED (JST-XH2.54 4P)
// SDA → D21 | SCK → D22
#define OLED_SDA      21
#define OLED_SCL      22

// ===== THRESHOLD & TIMING =====
#define GAS_THRESHOLD           3000
#define GAS_READ_INTERVAL       100UL
#define PZEM_READ_INTERVAL      2000UL
#define GAS_DEBOUNCE_COUNT      3
#define OVERLOAD_DEBOUNCE_COUNT 2

// ===== BUTTON DEBOUNCE =====
#define DEBOUNCE_MS   50UL

// ===== MOVING AVERAGE =====
#define GAS_MA_SIZE   5

// ===== BUZZER LEDC =====
#define BUZZER_RES    8

// ===== WARMUP MQ-2 =====
#define WARMUP_MS     15000UL          // 15 detik warmup
bool warmupDone       = false;
unsigned long warmupStart = 0;
int lastWarmupSec     = -1;            // untuk deteksi perubahan detik

// ===== OBJECTS =====
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
HardwareSerial pzemSerial(2);
PZEM004Tv30 pzem(pzemSerial, RXD2, TXD2);

// ===== FREERTOS MUTEX & TASKS =====
SemaphoreHandle_t i2cMutex;
SemaphoreHandle_t dataMutex;
SemaphoreHandle_t serialMutex;

TaskHandle_t TaskGasHandle;
TaskHandle_t TaskPZEMHandle;
TaskHandle_t TaskMQTTHandle;
TaskHandle_t TaskUIHandle;

// ===== PZEM DATA & OVERLOAD =====
float voltage = 0, current = 0, power = 0;
float energy = 0, pf = 0;
float currentThreshold = 5.0;
int overloadCount = 0;
String alertReason = "";

// ===== TIMING =====
unsigned long relayOnTime      = 0;
unsigned long lastBuzzerToggle = 0;
unsigned long lastMqttReconnectAttempt = 0;

// ===== STATE FLAGS =====
bool relayActive = false;
bool buzzerOn    = false;

// ===== GAS VARIABLES =====
int gasHistory[GAS_MA_SIZE] = {0};
int gasHistIdx   = 0;
int gasAvg       = 0;
int lastGasValue = 0;
int gasHighCount = 0;
int prevGasOled  = -1;

// ===== BUTTON DEBOUNCE VARIABLES =====
bool lastButtonRead    = HIGH;
bool buttonState       = HIGH;
unsigned long lastDebounceTime = 0;

// ===== ELAPSED DISPLAY =====
int lastElapsedSec = -1;

// ===== FORWARD DECLARATIONS =====
void serialLog(String tag, String msg);
void serialDivider(char c = '-', int len = 52);
void activateRelay(String reason, int gasValue = 0);
void drawData();

// ============================================================
//  SERIAL LOG HELPER (DENGAN MUTEX)
// ============================================================
void serialLog(String tag, String msg) {
  if (serialMutex != NULL) xSemaphoreTake(serialMutex, portMAX_DELAY);
  unsigned long t  = millis();
  unsigned long s  = t / 1000;
  unsigned long ms = t % 1000;
  Serial.printf("[%4lu.%03lu] [%-12s] %s\n", s, ms, tag.c_str(), msg.c_str());
  if (serialMutex != NULL) xSemaphoreGive(serialMutex);
}

void serialDivider(char c, int len) {
  if (serialMutex != NULL) xSemaphoreTake(serialMutex, portMAX_DELAY);
  for (int i = 0; i < len; i++) Serial.print(c);
  Serial.println();
  if (serialMutex != NULL) xSemaphoreGive(serialMutex);
}

// ============================================================
//  MQTT RECONNECT
// ============================================================
void reconnectMQTT() {
  if (serialMutex != NULL) xSemaphoreTake(serialMutex, portMAX_DELAY);
  Serial.print("Menghubungkan ke MQTT Broker...");
  if (serialMutex != NULL) xSemaphoreGive(serialMutex);
  
  String clientId = "VoltEdge-ESP32-";
  clientId += String(random(0xffff), HEX);
  if (client.connect(clientId.c_str())) {
    if (serialMutex != NULL) xSemaphoreTake(serialMutex, portMAX_DELAY);
    Serial.println("KONEK MQTT BERHASIL!");
    if (serialMutex != NULL) xSemaphoreGive(serialMutex);
    
    client.subscribe(configTopic.c_str());
    serialLog("MQTT", "Subscribed to : " + configTopic);
  } else {
    if (serialMutex != NULL) xSemaphoreTake(serialMutex, portMAX_DELAY);
    Serial.print("Gagal, rc=");
    Serial.print(client.state());
    Serial.println(" Coba lagi dalam 5 detik");
    if (serialMutex != NULL) xSemaphoreGive(serialMutex);
  }
}

// ============================================================
//  MQTT CALLBACK
// ============================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  serialLog("MQTT", "Pesan Masuk [" + String(topic) + "] : " + message);
  float newThreshold = message.toFloat();
  if (newThreshold > 0.0) {
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    currentThreshold = newThreshold;
    xSemaphoreGive(dataMutex);
    
    serialDivider('*', 56);
    serialLog("CONFIG", "Batas Arus diperbarui: " + String(newThreshold) + " A");
    serialDivider('*', 56);
  }
}

// ============================================================
//  BUZZER HELPERS
// ============================================================
void buzzerTone(int freq) { ledcWriteTone(BUZZER_PIN, freq); }
void buzzerOff()           { ledcWriteTone(BUZZER_PIN, 0);   }

// ============================================================
//  MOVING AVERAGE GAS
// ============================================================
int readGasSmoothed() {
  int raw = analogRead(MQ2_PIN);
  gasHistory[gasHistIdx % GAS_MA_SIZE] = raw;
  gasHistIdx++;
  int sum = 0;
  for (int i = 0; i < GAS_MA_SIZE; i++) sum += gasHistory[i];
  return sum / GAS_MA_SIZE;
}

// ============================================================
//  DRAW WARMUP SCREEN
// ============================================================
void drawWarmup(int secondsLeft) {
  if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
  display.clearDisplay();
  display.setTextColor(WHITE);

  // ── Header kuning (atas)
  display.fillRect(0, 0, 128, 12, WHITE);
  display.setTextColor(BLACK);
  display.setTextSize(1);
  display.setCursor(18, 2);
  display.print("MQ-2  WARMING  UP");
  display.setTextColor(WHITE);

  // ── Ikon jam / tanda tunggu
  display.setTextSize(1);
  display.setCursor(0, 15);
  display.print("Sensor sedang panas");
  display.setCursor(0, 25);
  display.print("Harap tunggu...");

  // ── Countdown besar di tengah
  display.setTextSize(3);
  int xPos = (secondsLeft >= 10) ? 40 : 52;
  display.setCursor(xPos, 33);
  display.print(secondsLeft);
  display.setTextSize(1);
  display.setCursor(90, 42);
  display.print("detik");

  // ── Progress bar bawah
  int totalSec  = (int)(WARMUP_MS / 1000);
  int elapsed   = totalSec - secondsLeft;
  int barW      = map(elapsed, 0, totalSec, 0, 124);
  barW          = constrain(barW, 0, 124);
  display.drawRect(0, 56, 128, 8, WHITE);
  display.fillRect(2, 58, barW, 4, WHITE);

  display.display();
  if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
}

// ============================================================
//  DRAW SYSTEM READY SCREEN
// ============================================================
void drawSystemReady() {
  if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
  display.clearDisplay();
  display.setTextColor(WHITE);

  // ── Header
  display.fillRect(0, 0, 128, 12, WHITE);
  display.setTextColor(BLACK);
  display.setTextSize(1);
  display.setCursor(22, 2);
  display.print("SISTEM  SIAP  !");
  display.setTextColor(WHITE);

  // ── Centang besar
  display.drawLine(30, 38, 42, 50, WHITE);
  display.drawLine(31, 38, 43, 50, WHITE);
  display.drawLine(42, 50, 62, 25, WHITE);
  display.drawLine(43, 50, 63, 25, WHITE);

  // ── Teks info
  display.setTextSize(1);
  display.setCursor(70, 20);
  display.print("Gas OK");
  display.setCursor(70, 32);
  display.print("Relay ON");
  display.setCursor(70, 44);
  display.print("Monitor ON");

  display.display();
  if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
}

// ============================================================
//  DRAW DATA NORMAL
// ============================================================
void drawData() {
  if (dataMutex != NULL) xSemaphoreTake(dataMutex, portMAX_DELAY);
  float v = voltage, c = current, p = power;
  float e = energy, pfv = pf;
  int g = gasAvg;
  xSemaphoreGive(dataMutex);

  if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
  display.clearDisplay();
  display.setTextColor(WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ENERGY MONITOR");

  display.setTextSize(2);
  display.setCursor(0, 10);
  display.print(p, 0);
  display.println(" W");

  display.setTextSize(1);
  display.setCursor(0, 28);
  display.print("V:"); display.print(v, 1); display.print("V");
  display.setCursor(64, 28);
  display.print("I:"); display.print(c, 2); display.print("A");

  display.setCursor(0, 38);
  display.print("PF:"); display.print(pfv, 2);
  display.setCursor(64, 38);
  display.print("Gas:"); display.print(g);

  display.setCursor(0, 48);
  display.print("Energy: "); display.print(e, 4); display.print(" kWh");

  display.setCursor(7, 57);
  display.print(DASHBOARD_URL);

  display.display();
  if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
}

// ============================================================
//  DRAW SCARED FACE
// ============================================================
void drawScaredFace(int cx, int cy, int r) {
  display.drawCircle(cx, cy, r, WHITE);
  display.fillCircle(cx - 7, cy - 5, 4, WHITE);
  display.fillCircle(cx + 7, cy - 5, 4, WHITE);
  display.fillCircle(cx - 8, cy - 6, 2, BLACK);
  display.fillCircle(cx + 6, cy - 6, 2, BLACK);
  display.drawLine(cx - 11, cy - 11, cx - 6,  cy - 13, WHITE);
  display.drawLine(cx + 6,  cy - 13, cx + 11, cy - 11, WHITE);
  display.drawCircle(cx, cy + 8, 4, WHITE);
  display.drawPixel(cx + r - 2, cy - r + 3, WHITE);
  display.drawPixel(cx + r - 2, cy - r + 4, WHITE);
  display.drawPixel(cx + r - 3, cy - r + 5, WHITE);
}

// ============================================================
//  DRAW GAS ALERT
// ============================================================
void drawGasAlert(int gasValue, int elapsedSec) {
  if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
  display.clearDisplay();
  display.setTextColor(WHITE);

  display.fillRect(0, 0, 128, 12, WHITE);
  display.setTextColor(BLACK);
  display.setTextSize(1);
  display.setCursor(8, 2);
  display.print("!!! GAS BERBAHAYA !!!");
  display.setTextColor(WHITE);

  drawScaredFace(22, 30, 16);

  int gasPct = (int)((float)gasValue / GAS_THRESHOLD * 100);
  if (gasPct > 999) gasPct = 999;
  display.setTextSize(1);
  display.setCursor(48, 14);
  display.print("GAS:"); display.print(gasValue);
  display.print("("); display.print(gasPct); display.print("%)");

  display.setTextSize(2);
  display.setCursor(48, 26);
  if (elapsedSec < 10) display.print("0");
  display.print(elapsedSec);
  display.print("s");

  display.setTextSize(1);
  display.setCursor(94, 30);
  display.print("AKTIF");

  display.drawRect(0, 43, 128, 8, WHITE);
  int barW = map(gasValue, 0, (int)(GAS_THRESHOLD * 1.5), 0, 126);
  barW = constrain(barW, 0, 126);
  if (gasValue > GAS_THRESHOLD) {
    display.fillRect(1, 44, barW, 6, WHITE);
  } else {
    for (int x = 1; x <= barW; x += 2) display.drawFastVLine(x, 44, 6, WHITE);
  }

  display.setCursor(110, 36);
  display.print("LEVEL");
  display.setCursor(0, 54);
  display.print("[BTN] RESET SISTEM");
  
  display.display();
  if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
}

// ============================================================
//  AKTIFKAN RELAY + BUZZER
// ============================================================
void activateRelay(String reason, int gasValue) {
  xSemaphoreTake(dataMutex, portMAX_DELAY);
  if (relayActive) {
    xSemaphoreGive(dataMutex);
    return;
  }
  relayActive      = true;
  relayOnTime      = millis();
  lastElapsedSec   = 0;
  prevGasOled      = -1;
  alertReason      = reason;
  buzzerOn         = true;
  lastBuzzerToggle = millis();
  
  float p_v = voltage, p_c = current, p_p = power;
  float p_ct = currentThreshold;
  int g_avg = gasAvg;
  xSemaphoreGive(dataMutex);

  digitalWrite(RELAY_PIN, LOW);
  ledcWriteTone(BUZZER_PIN, 1000);

  serialDivider('=', 56);
  if (reason == "GAS") {
    int gasPct = (int)((float)gasValue / GAS_THRESHOLD * 100);
    serialLog("ALERT", "!!!!!  GAS BERBAHAYA TERDETEKSI  !!!!!");
    serialDivider('=', 56);
    serialLog("GAS",   "Nilai ADC   : " + String(gasValue));
    serialLog("GAS",   "Rata2(MA-5) : " + String(g_avg));
    serialLog("GAS",   "Threshold   : " + String(GAS_THRESHOLD));
    serialLog("GAS",   "Persentase  : " + String(gasPct) + "%");
  } else if (reason == "OVERLOAD") {
    serialLog("ALERT", "!!!!!  OVERLOAD LISTRIK TERDETEKSI  !!!!!");
    serialDivider('=', 56);
    serialLog("PZEM",  "Beban Arus  : " + String(p_c, 2) + " A");
    serialLog("PZEM",  "Threshold   : " + String(p_ct, 2) + " A");
  }
  serialDivider('-', 56);
  serialLog("PZEM",   "Voltage : " + String(p_v,   1) + " V");
  serialLog("PZEM",   "Current : " + String(p_c,   2) + " A");
  serialLog("PZEM",   "Power   : " + String(p_p,   1) + " W");
  serialLog("RELAY",  "STATUS  : AKTIF (LOW) → Daya DIPUTUS | Alasan: " + reason);
  serialLog("BUTTON", "Tekan GPIO" + String(BUTTON_PIN) + " untuk reset sistem");
  serialDivider('=', 56);

  if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(2);
  display.setCursor(15, 15);
  display.print(reason == "GAS" ? "GAS ALERT" : "OVERLOAD!");
  display.setTextSize(1);
  display.setCursor(5, 45);
  display.print("[BTN] RESET SISTEM");
  display.display();
  if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
}

// ============================================================
//  UPDATE ALERT
// ============================================================
void updateAlert(int gasValue) {
  xSemaphoreTake(dataMutex, portMAX_DELAY);
  unsigned long elapsed = millis() - relayOnTime;
  int elapsedSec        = (int)(elapsed / 1000);
  bool gasChanged       = abs(gasValue - prevGasOled) > 3;
  xSemaphoreGive(dataMutex);

  if (elapsedSec != lastElapsedSec || gasChanged) {
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    lastElapsedSec = elapsedSec;
    prevGasOled    = gasValue;
    float v = voltage, c = current, p = power;
    int g = gasAvg;
    xSemaphoreGive(dataMutex);

    drawGasAlert(gasValue, elapsedSec);

    serialDivider('-', 56);
    serialLog("ALERT",   "⏱  Relay aktif " + String(elapsedSec) + " detik — Menunggu tombol...");
    serialLog("GAS",     "Nilai: " + String(gasValue) + " | Rata2: " + String(g));
    serialLog("LISTRIK", "V:" + String(v,1) + "V I:" + String(c,2) + "A P:" + String(p,1) + "W");
    if (gasValue > GAS_THRESHOLD) serialLog("WARNING", "Gas MASIH TINGGI! Ventilasi segera!");
    else                          serialLog("STATUS",  "Gas mulai turun. Tekan tombol jika aman.");
  }

  xSemaphoreTake(dataMutex, portMAX_DELAY);
  unsigned long buzzerElapsed = millis() - lastBuzzerToggle;
  bool b_on = buzzerOn;
  xSemaphoreGive(dataMutex);

  if (b_on && buzzerElapsed > 180) {
    ledcWriteTone(BUZZER_PIN, 0);
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    buzzerOn         = false;
    lastBuzzerToggle = millis();
    xSemaphoreGive(dataMutex);
  } else if (!b_on && buzzerElapsed > 120) {
    int freq = (elapsedSec > 30) ? 1500 : 1100;
    ledcWriteTone(BUZZER_PIN, freq);
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    buzzerOn         = true;
    lastBuzzerToggle = millis();
    xSemaphoreGive(dataMutex);
  }
}

// ============================================================
//  CEK TOMBOL
// ============================================================
void checkButton() {
  xSemaphoreTake(dataMutex, portMAX_DELAY);
  bool localRelayActive = relayActive;
  xSemaphoreGive(dataMutex);

  if (!localRelayActive) return;

  bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonRead) lastDebounceTime = millis();
  lastButtonRead = reading;

  if ((millis() - lastDebounceTime) >= DEBOUNCE_MS) {
    if (reading != buttonState) {
      buttonState = reading;
      if (buttonState == LOW) {
        serialDivider('=', 56);
        serialLog("BUTTON", "Tombol ditekan — Sistem direset oleh operator.");
        serialDivider('=', 56);

        xSemaphoreTake(dataMutex, portMAX_DELAY);
        relayActive    = false;
        alertReason    = "";
        lastElapsedSec = -1;
        prevGasOled    = -1;
        gasHighCount   = 0;
        overloadCount  = 0;
        buzzerOn       = false;
        xSemaphoreGive(dataMutex);

        digitalWrite(RELAY_PIN, HIGH);
        buzzerOff();

        serialLog("RELAY",  "STATUS : NONAKTIF (HIGH) → Daya NORMAL");
        serialLog("BUZZER", "STATUS : OFF");
        serialLog("SYSTEM", "Monitoring kembali normal.");
        serialDivider('=', 56);

        drawData();
      }
    }
  }
}

// ============================================================
//  FREERTOS TASKS
// ============================================================

void TaskGas(void *pvParameters) {
  (void)pvParameters;
  esp_task_wdt_add(NULL);
  for (;;) {
    esp_task_wdt_reset();
    int currentGasAvg = readGasSmoothed();
    int currentRaw = analogRead(MQ2_PIN);

    xSemaphoreTake(dataMutex, portMAX_DELAY);
    gasAvg = currentGasAvg;
    lastGasValue = currentRaw;
    
    if (gasAvg > GAS_THRESHOLD) {
      gasHighCount++;
    } else {
      gasHighCount = 0;
    }
    
    int localGasHighCount = gasHighCount;
    int localGasAvg = gasAvg;
    bool localRelayActive = relayActive;
    int localPrevGasOled = prevGasOled;
    xSemaphoreGive(dataMutex);

    int gasPct  = (int)((float)localGasAvg / GAS_THRESHOLD * 100);
    int barFill = map(localGasAvg, 0, GAS_THRESHOLD, 0, 20);
    barFill = constrain(barFill, 0, 20);
    String bar = "[";
    for (int b = 0; b < 20; b++) bar += (b < barFill) ? "#" : ".";
    bar += "]";
    String status = (localGasAvg > GAS_THRESHOLD)
      ? "!BAHAYA! [" + String(localGasHighCount) + "/" + String(GAS_DEBOUNCE_COUNT) + "]"
      : "AMAN";
    
    if (serialMutex != NULL) xSemaphoreTake(serialMutex, portMAX_DELAY);
    Serial.printf("[GAS] raw=%-4d avg=%-4d %3d%% %s %s\n", currentRaw, localGasAvg, gasPct, bar.c_str(), status.c_str());
    if (serialMutex != NULL) xSemaphoreGive(serialMutex);

    if (localGasHighCount >= GAS_DEBOUNCE_COUNT) {
      activateRelay("GAS", localGasAvg);
    }

    if (!localRelayActive && abs(localGasAvg - localPrevGasOled) >= 3) {
      xSemaphoreTake(dataMutex, portMAX_DELAY);
      prevGasOled = localGasAvg;
      xSemaphoreGive(dataMutex);
      drawData();
    }

    vTaskDelay(pdMS_TO_TICKS(100)); // Interval 100ms
  }
}

void TaskPZEM(void *pvParameters) {
  (void)pvParameters;
  esp_task_wdt_add(NULL);
  for (;;) {
    esp_task_wdt_reset();
    xSemaphoreTake(dataMutex, portMAX_DELAY);
    bool localRelayActive = relayActive;
    xSemaphoreGive(dataMutex);

    if (!localRelayActive) {
      float v = pzem.voltage(), i = pzem.current(), p = pzem.power();
      float e = pzem.energy(),  pfv = pzem.pf();

      xSemaphoreTake(dataMutex, portMAX_DELAY);
      voltage   = (!isnan(v)   && v > 80 && v < 260) ? v   : 0;
      current   = (!isnan(i)   && i >= 0)             ? i   : 0;
      power     = (!isnan(p)   && p >= 0)             ? p   : 0;
      energy    = (!isnan(e)   && e >= 0)             ? e   : 0;
      pf        = (!isnan(pfv) && pfv <= 1)           ? pfv : 0;
      
      if (current > currentThreshold) {
        overloadCount++;
      } else {
        overloadCount = 0;
      }
      int localOverloadCount = overloadCount;
      float localCurrentThreshold = currentThreshold;
      int localGasAvg = gasAvg;
      xSemaphoreGive(dataMutex);

      serialDivider('-', 56);
      serialLog("PZEM", "Voltage  : " + String(v, 1) + " V" + (v == 0 ? " ← MATI" : ""));
      serialLog("PZEM", "Current  : " + String(current, 2) + " A (Batas: " + String(localCurrentThreshold, 1) + " A)");
      serialLog("PZEM", "Power    : " + String(power, 1) + " W");
      serialLog("PZEM", "PF       : " + String(pfv, 2));
      serialLog("GAS",  "Avg      : " + String(localGasAvg));
      serialDivider('-', 56);

      if (localOverloadCount >= OVERLOAD_DEBOUNCE_COUNT) {
        serialLog("WARNING", "Arus berlebih! " + String(localOverloadCount) + "/" + String(OVERLOAD_DEBOUNCE_COUNT));
        activateRelay("OVERLOAD", 0);
      }
    }
    vTaskDelay(pdMS_TO_TICKS(2000)); // Interval 2000ms
  }
}

void TaskMQTT(void *pvParameters) {
  (void)pvParameters;
  unsigned long lastPublish = 0;
  esp_task_wdt_add(NULL);

  for (;;) {
    esp_task_wdt_reset();
    if (!client.connected()) {
      unsigned long now = millis();
      if (now - lastMqttReconnectAttempt > 2000) {
        lastMqttReconnectAttempt = now;
        reconnectMQTT();
      }
    } else {
      client.loop();
    }

    if (millis() - lastPublish > 2000) {
      lastPublish = millis();
      
      xSemaphoreTake(dataMutex, portMAX_DELAY);
      float v = voltage, c = current, p = power, e = energy;
      float pfv = pf;
      int g = gasAvg;
      bool r = relayActive;
      xSemaphoreGive(dataMutex);

      String payload = "{";
      payload += "\"voltage\":"      + String(v, 1) + ",";
      payload += "\"current\":"      + String(c, 2) + ",";
      payload += "\"power\":"        + String(p, 1) + ",";
      payload += "\"energy\":"       + String(e, 4) + ",";
      payload += "\"power_factor\":" + String(pfv, 2) + ",";
      payload += "\"gas\":"          + String(g) + ",";
      payload += "\"relayActive\":"  + String(r ? "true" : "false");
      payload += "}";

      if (client.connected()) {
        client.publish(telemetryTopic.c_str(), payload.c_str());
        serialLog("MQTT", "Published | relay=" + String(r ? "AKTIF" : "normal") + " gas=" + String(g));
      }
      
      if (!r) drawData();
    }
    vTaskDelay(pdMS_TO_TICKS(50)); // Loop cepat untuk client.loop()
  }
}

void TaskUI(void *pvParameters) {
  (void)pvParameters;
  esp_task_wdt_add(NULL);
  for (;;) {
    esp_task_wdt_reset();
    checkButton();

    xSemaphoreTake(dataMutex, portMAX_DELAY);
    bool r = relayActive;
    int g = gasAvg;
    xSemaphoreGive(dataMutex);

    if (r) {
      updateAlert(g);
    }
    vTaskDelay(pdMS_TO_TICKS(50)); // UI check interval
  }
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  // INIT MUTEX PERTAMA KALI
  serialMutex = xSemaphoreCreateMutex();
  i2cMutex    = xSemaphoreCreateMutex();
  dataMutex   = xSemaphoreCreateMutex();

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  Serial.begin(115200);
  delay(500);

  serialDivider('*', 56);
  serialLog("BOOT", "====  ENERGY MONITOR + GAS SAFETY (RTOS) ====");
  serialLog("BOOT", "Firmware : v4.2 — FreeRTOS Tasks & Mutexes");
  serialLog("BOOT", "Chip     : ESP32");
  serialDivider('*', 56);

  pinMode(BUTTON_PIN, INPUT_PULLUP);
  serialLog("INIT", "Button PIN      : GPIO" + String(BUTTON_PIN));

  pinMode(MQ2_PIN, INPUT);
  analogSetAttenuation(ADC_11db);
  for (int i = 0; i < GAS_MA_SIZE; i++) {
    gasHistory[i] = analogRead(MQ2_PIN);
    delay(5);
  }
  serialLog("INIT", "MQ-2  PIN       : GPIO" + String(MQ2_PIN));
  serialLog("INIT", "Gas Threshold   : " + String(GAS_THRESHOLD));
  serialLog("INIT", "Warmup Duration : " + String(WARMUP_MS / 1000) + " detik");

  serialLog("INIT", "Relay PIN       : GPIO" + String(RELAY_PIN));

  ledcAttach(BUZZER_PIN, 1000, BUZZER_RES);
  ledcWriteTone(BUZZER_PIN, 0);
  serialLog("INIT", "Buzzer PIN      : GPIO" + String(BUZZER_PIN));

  pzemSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
  serialLog("INIT", "PZEM-004T       : RX=GPIO" + String(RXD2) + " TX=GPIO" + String(TXD2));

  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    serialLog("ERROR", "OLED GAGAL!");
    while (true) { delay(500); }
  }
  serialLog("INIT", "OLED SSD1306    : OK");

  // ── WiFi Connection
  if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("KONEKSI WIFI");
  display.println();
  display.print("SSID: ");
  display.println(WIFI_SSID);
  display.println("Menghubungkan...");
  display.display();
  if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int wTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wTimeout < 20) {
    delay(500);
    Serial.print(".");
    wTimeout++;
    if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
    display.print(".");
    display.display();
    if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
  }

  if (WiFi.status() == WL_CONNECTED) {
    serialLog("WIFI", "WiFi Terhubung! IP: " + WiFi.localIP().toString());
    if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WIFI TERHUBUNG!");
    display.println();
    display.print("IP: ");
    display.println(WiFi.localIP());
    display.print("MQTT: ");
    display.println(mqtt_server);
    display.display();
    if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
    delay(1500);
  } else {
    serialLog("WIFI", "WiFi Timeout! Menjalankan mode lokal.");
    if (i2cMutex != NULL) xSemaphoreTake(i2cMutex, portMAX_DELAY);
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WIFI TIMEOUT");
    display.println();
    display.println("Menjalankan mode");
    display.println("lokal/tanpa internet");
    display.display();
    if (i2cMutex != NULL) xSemaphoreGive(i2cMutex);
    delay(1500);
  }

  macAddress     = WiFi.macAddress();
  macAddress.replace(":", "");
  telemetryTopic = "voltedge/telemetry/" + macAddress;
  configTopic    = "voltedge/config/"    + macAddress;

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  // ── Catat waktu mulai warmup
  warmupStart = millis();
  serialLog("WARMUP", "MQ-2 warm-up dimulai. Deteksi gas aktif setelah "
            + String(WARMUP_MS / 1000) + " detik.");

  // ============================================================
  //  WARMUP LOOP
  // ============================================================
  serialLog("WARMUP", "Menampilkan countdown OLED...");
  while (!warmupDone) {
    unsigned long elapsed  = millis() - warmupStart;
    int secondsLeft        = (int)((WARMUP_MS - elapsed) / 1000) + 1;
    if (secondsLeft < 0) secondsLeft = 0;

    if (secondsLeft != lastWarmupSec) {
      lastWarmupSec = secondsLeft;
      drawWarmup(secondsLeft);
      serialLog("WARMUP", "Sisa : " + String(secondsLeft) + " detik...");
    }

    if (elapsed >= WARMUP_MS) {
      warmupDone = true;
    }
    delay(50);
  }

  // ── Reset debounce gas setelah warmup bersih
  gasHighCount = 0;
  for (int i = 0; i < GAS_MA_SIZE; i++) {
    gasHistory[i] = analogRead(MQ2_PIN);
    delay(5);
  }

  serialDivider('*', 56);
  serialLog("WARMUP", "Warm-up SELESAI! Sensor MQ-2 siap digunakan.");
  serialDivider('*', 56);

  drawSystemReady();
  delay(2000);

  serialDivider('*', 56);
  serialLog("BOOT", "System READY. Memulai monitoring...");
  serialDivider('*', 56);
  Serial.println();

  // ── Koneksi MQTT awal
  reconnectMQTT();
  lastMqttReconnectAttempt = millis();

  // ── MEMULAI FREERTOS TASKS
  serialLog("RTOS", "Memulai FreeRTOS Tasks...");
  xTaskCreatePinnedToCore(TaskGas,  "TaskGas",  4096, NULL, 2, &TaskGasHandle,  1);
  xTaskCreatePinnedToCore(TaskPZEM, "TaskPZEM", 4096, NULL, 1, &TaskPZEMHandle, 1);
  xTaskCreatePinnedToCore(TaskUI,   "TaskUI",   4096, NULL, 2, &TaskUIHandle,   1);
  xTaskCreatePinnedToCore(TaskMQTT, "TaskMQTT", 8192, NULL, 1, &TaskMQTTHandle, 0); // MQTT jalan di Core 0

  drawData();
}

// ============================================================
//  LOOP (DIHAPUS KARENA SUDAH PAKAI RTOS TASKS)
// ============================================================
void loop() {
  vTaskDelete(NULL); // Hapus default loop() task
}