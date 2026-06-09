#include <Wire.h>
#include <U8g2lib.h>
#include <PZEM004Tv30.h>

// OLED Pins (SDA -> D21, SCK -> D22)
#define SDA_PIN       21
#define SCL_PIN       22

// PZEM-004T Pins (RX -> D16, TX -> D17)
#define RXD2          16
#define TXD2          17

// MQ-2 Gas Sensor Pin (Analog -> D33)
#define MQ2_PIN       33

// Relay Pin (D23)
#define RELAY_PIN     23

// Buzzer Pin (D19)
#define BUZZER_PIN    19

// Reset Button Pin (D18) - tekan untuk clear kondisi ALERT
#define RESET_BTN_PIN 18

// Threshold batas gas MQ-2
#define MQ2_THRESHOLD 500

// Interval animasi senyum (ms)
#define SMILE_INTERVAL  5000UL   // muncul setiap 5 detik
#define SMILE_DURATION  1000UL   // tampil selama 1 detik

// Konstruktor OLED SH1106 menggunakan U8g2
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

HardwareSerial pzemSerial(2);
PZEM004Tv30 pzem(pzemSerial, RXD2, TXD2);

// ── State global ──────────────────────────────────────────────
bool alertLatched   = false;   // true = kondisi ALERT terkunci (latch)
bool lastBtnState   = HIGH;    // untuk debounce tombol reset

unsigned long startMillis   = 0; // millis() saat boot, untuk jam software
unsigned long lastSmileShow = 0; // kapan terakhir animasi senyum dimulai
bool smileVisible           = false;
bool smileEyeOpen           = true;
unsigned long lastEyeBlink  = 0;

// ── Utility: jam software (hh:mm:ss sejak boot) ───────────────
void getUptime(char* buf, size_t len) {
  unsigned long sec = millis() / 1000;
  unsigned int  hh  = sec / 3600;
  unsigned int  mm  = (sec % 3600) / 60;
  unsigned int  ss  = sec % 60;
  snprintf(buf, len, "%02u:%02u:%02u", hh, mm, ss);
}

// ── Animasi wajah senyum ──────────────────────────────────────
void drawSmileFace(bool eyeOpen) {
  // Lingkaran wajah (tengah layar)
  // Layar 128x64; wajah di tengah: cx=64, cy=32, r=28
  u8g2.drawCircle(64, 32, 28, U8G2_DRAW_ALL);

  if (eyeOpen) {
    // Mata kiri & kanan (lingkaran kecil)
    u8g2.drawDisc(51, 26, 4, U8G2_DRAW_ALL);
    u8g2.drawDisc(77, 26, 4, U8G2_DRAW_ALL);
  } else {
    // Mata tertutup = garis horizontal
    u8g2.drawHLine(47, 26, 8);
    u8g2.drawHLine(73, 26, 8);
  }

  // Senyum: busur bawah (manual dengan 3 titik garis)
  // Menggunakan drawLine pendek untuk membentuk kurva senyum
  u8g2.drawLine(50, 40, 55, 45);
  u8g2.drawLine(55, 45, 64, 48);
  u8g2.drawLine(64, 48, 73, 45);
  u8g2.drawLine(73, 45, 78, 40);
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

// ─────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n=== PZEM & MQ2 MONITOR (U8g2 SH1106) ===");

  // 1. Relay (default: OFF = HIGH = terminal terhubung / power ON)
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("[OK] Relay initialized (Default: OFF / Power ON)");

  // 2. Buzzer (active-high: HIGH = DIAM, LOW = BUNYI)
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);   // default DIAM
  Serial.println("[OK] Buzzer initialized (Default: HIGH = DIAM)");

  // 3. Reset button dengan pull-up internal
  pinMode(RESET_BTN_PIN, INPUT_PULLUP);
  Serial.println("[OK] Reset button initialized on D18 (INPUT_PULLUP)");

  // 4. Scan I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  scanI2C();

  // 5. OLED
  Serial.println("Inisialisasi U8g2...");
  u8g2.begin();
  u8g2.setContrast(255);
  Serial.println("u8g2.begin() selesai.");

  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 12, "PZEM & MQ2 MONITOR");
  u8g2.drawStr(0, 28, "Driver: SH1106 (U8g2)");
  u8g2.drawStr(0, 44, "Memulai sensor...");
  u8g2.sendBuffer();
  delay(1500);

  // 6. PZEM
  pzemSerial.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("[OK] PZEM Serial initialized on RXD2/TXD2");

  // 7. MQ-2
  pinMode(MQ2_PIN, INPUT);
  analogSetAttenuation(ADC_11db);
  Serial.println("[OK] MQ-2 Pin initialized");

  startMillis  = millis();
  lastSmileShow = millis();
}

// ─────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  // ── 1. Baca Tombol Reset (D18, active LOW karena PULLUP) ──
  bool btnState = digitalRead(RESET_BTN_PIN);
  if (btnState == LOW && lastBtnState == HIGH) {
    // Rising edge (tombol ditekan)
    delay(50); // debounce sederhana
    if (digitalRead(RESET_BTN_PIN) == LOW) {
      alertLatched = false;
      Serial.println("[RESET] Alert di-reset oleh pengguna (D18)");
    }
  }
  lastBtnState = btnState;

  // ── 2. Baca Sensor ────────────────────────────────────────
  int   mq2Value  = analogRead(MQ2_PIN);
  float voltage   = pzem.voltage();
  float current   = pzem.current();
  float power     = pzem.power();
  float energy    = pzem.energy();
  float frequency = pzem.frequency();
  float pf        = pzem.pf();
  bool  pzemOk    = !isnan(voltage) && !isnan(current) && !isnan(power);

  // ── 3. Logika LATCH Alert ─────────────────────────────────
  bool gasDanger = (mq2Value > MQ2_THRESHOLD);
  if (gasDanger) {
    alertLatched = true;  // sekali terdeteksi, latch aktif
  }

  if (alertLatched) {
    digitalWrite(RELAY_PIN, LOW);    // putuskan daya (relay active-low)
    digitalWrite(BUZZER_PIN, LOW);   // bunyikan buzzer (active-high: LOW = bunyi)
  } else {
    digitalWrite(RELAY_PIN, HIGH);   // daya normal
    digitalWrite(BUZZER_PIN, HIGH);  // matikan buzzer (HIGH = diam)
  }

  // ── 4. Serial Monitor ─────────────────────────────────────
  char timeStr[12];
  getUptime(timeStr, sizeof(timeStr));

  Serial.println("--------------------------------");
  Serial.printf("Uptime         : %s\n", timeStr);
  Serial.printf("MQ-2 (Raw)     : %d | Gas: %s | Latch: %s\n",
                mq2Value,
                gasDanger    ? "BAHAYA" : "AMAN",
                alertLatched ? "YA"     : "TIDAK");
  Serial.printf("Relay          : %s\n", alertLatched ? "ON (TERPUTUS)" : "OFF (Normal)");
  Serial.printf("Buzzer         : %s\n", alertLatched ? "ON" : "OFF");
  if (pzemOk) {
    Serial.printf("PZEM V  : %.1f V\n",    voltage);
    Serial.printf("PZEM I  : %.2f A\n",    current);
    Serial.printf("PZEM P  : %.1f W\n",    power);
    Serial.printf("PZEM E  : %.4f kWh\n",  energy);
    Serial.printf("PZEM F  : %.1f Hz\n",   frequency);
    Serial.printf("PZEM PF : %.2f\n",      pf);
  } else {
    Serial.println("PZEM - ERROR: nan (periksa kabel & sumber AC)");
  }
  Serial.println("--------------------------------");

  // ── 5. Cek apakah waktunya tampilkan animasi senyum ───────
  //       Setiap SMILE_INTERVAL ms, tampilkan wajah selama SMILE_DURATION ms
  bool showSmile = false;
  if (!alertLatched) {
    if (!smileVisible && (now - lastSmileShow >= SMILE_INTERVAL)) {
      smileVisible  = true;
      lastSmileShow = now;
      smileEyeOpen  = true;
      lastEyeBlink  = now;
    }
    if (smileVisible && (now - lastSmileShow >= SMILE_DURATION)) {
      smileVisible = false;
      lastSmileShow = now; // reset timer
    }
    showSmile = smileVisible;
  }

  // ── 6. Render OLED ────────────────────────────────────────
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);

  if (showSmile) {
    // ── Mode animasi: wajah senyum + jam ──────────────────
    // Kedipan mata setiap 200ms
    if (now - lastEyeBlink >= 200UL) {
      smileEyeOpen  = !smileEyeOpen;
      lastEyeBlink  = now;
    }
    drawSmileFace(smileEyeOpen);

    // Jam uptime di pojok bawah kiri
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(0, 63, timeStr);

  } else if (alertLatched) {
    // ── Mode ALERT ────────────────────────────────────────
    // Header merah/terbalik
    u8g2.setDrawColor(1);
    u8g2.drawBox(0, 0, 128, 13);
    u8g2.setDrawColor(0);
    u8g2.drawStr(14, 10, "!! GAS ALERT !!");
    u8g2.setDrawColor(1);
    u8g2.drawHLine(0, 14, 128);

    char buffGas[32];
    sprintf(buffGas, "Gas MQ-2: %d (BAHAYA)", mq2Value);
    u8g2.drawStr(0, 25, buffGas);

    if (pzemOk) {
      char buffVI[32], buffPE[32];
      sprintf(buffVI, "V:%.1fV  I:%.2fA", voltage, current);
      sprintf(buffPE, "P:%.1fW  E:%.2fkWh", power, energy);
      u8g2.drawStr(0, 36, buffVI);
      u8g2.drawStr(0, 46, buffPE);
    } else {
      u8g2.drawStr(0, 36, "PZEM: [COMM ERROR]");
    }

    // Instruksi reset (baris bawah)
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(0, 63, "Tekan D18 untuk RESET");

  } else {
    // ── Mode Normal ───────────────────────────────────────
    // Header
    u8g2.drawStr(0, 10, "PZEM & MQ2 MONITOR");
    u8g2.drawHLine(0, 12, 128);

    // MQ-2
    char buffGas[30];
    sprintf(buffGas, "Gas MQ-2: %d (OK)", mq2Value);
    u8g2.drawStr(0, 23, buffGas);

    if (pzemOk) {
      char buffVI[30], buffPE[30];
      sprintf(buffVI, "V:%.1fV  I:%.2fA", voltage, current);
      sprintf(buffPE, "P:%.1fW  E:%.2fkWh", power, energy);
      u8g2.drawStr(0, 34, buffVI);
      u8g2.drawStr(0, 44, buffPE);
    } else {
      u8g2.drawStr(0, 34, "PZEM: [COMM ERROR]");
    }

    // Jam uptime di baris bawah
    u8g2.setFont(u8g2_font_5x8_tf);
    u8g2.drawStr(0, 63, timeStr);
  }

  u8g2.sendBuffer();
  delay(150); // polling cepat agar tombol & animasi responsif
}
