// ============================================================
//  OLED SH1106 TEST SKETCH — U8g2
//  Upload ini ke ESP32 → buka Serial Monitor 115200 baud
//  Sketch ini: scan I2C + coba kedua alamat OLED
// ============================================================
#include <Wire.h>
#include <U8g2lib.h>

#define SDA_PIN  21
#define SCL_PIN  22

// --- Coba kedua kemungkinan konstruktor ---
// Aktifkan salah satu, compile dan upload, lihat hasilnya
// Jika 0x3C tidak menyala, coba yang 0x3D

// OPSI A — alamat default 0x3C (paling umum)
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

// OPSI B — paksa alamat 0x3D (uncomment kalau Opsi A tidak kerja)
// U8G2_SH1106_128X64_NONAME_F_2ND_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void scanI2C() {
  Serial.println("========== I2C SCANNER ==========");
  byte found = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    byte err = Wire.endTransmission();
    if (err == 0) {
      Serial.print("  [OK] Perangkat ditemukan di 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      found++;
    }
  }
  if (found == 0) {
    Serial.println("  [!!] Tidak ada perangkat I2C ditemukan!");
    Serial.println("       Cek kabel SDA/SCL dan tegangan VCC.");
  }
  Serial.println("=================================");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== OLED SH1106 TEST (U8g2) ===");

  // 1. Scan I2C dulu
  Wire.begin(SDA_PIN, SCL_PIN);
  scanI2C();

  // 2. Init U8g2
  Serial.println("Inisialisasi U8g2...");
  u8g2.begin();
  u8g2.setContrast(255); // kontras maksimum
  Serial.println("u8g2.begin() selesai.");

  // 3. Test 1: Layar full putih
  Serial.println("Test 1: Layar PUTIH penuh...");
  u8g2.clearBuffer();
  u8g2.setDrawColor(1);
  u8g2.drawBox(0, 0, 128, 64); // isi semua piksel
  u8g2.sendBuffer();
  delay(2000);

  // 4. Test 2: Teks "HELLO"
  Serial.println("Test 2: Teks HELLO...");
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_logisoso24_tf);
  u8g2.setCursor(10, 48);
  u8g2.print("HELLO!");
  u8g2.sendBuffer();
  delay(2000);

  // 5. Test 3: Teks kecil + info
  Serial.println("Test 3: Info layar...");
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.setCursor(0, 12);  u8g2.print("SH1106 128x64");
  u8g2.setCursor(0, 26);  u8g2.print("U8g2 Library");
  u8g2.setCursor(0, 40);  u8g2.print("SDA=GPIO21");
  u8g2.setCursor(0, 54);  u8g2.print("SCL=GPIO22");
  u8g2.sendBuffer();
  delay(2000);

  // 6. Test 4: Animasi kotak bergerak
  Serial.println("Test 4: Animasi berjalan...");
  Serial.println("SELESAI. Kalau layar tetap gelap:");
  Serial.println("  1. Cek hasil scan I2C di atas");
  Serial.println("  2. Coba ganti konstruktor ke OPSI B (0x3D)");
  Serial.println("  3. Pastikan VCC OLED = 3.3V");
  Serial.println("  4. Pastikan kabel SDA/SCL tidak terbalik");
}

int boxX = 0;
void loop() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.setCursor(0, 10); 
  u8g2.print("ANIMASI OK!");
  u8g2.drawBox(boxX, 20, 20, 20);
  u8g2.sendBuffer();
  
  boxX += 2;
  if (boxX > 108) boxX = 0;
  delay(20);
}
