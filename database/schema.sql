-- ════════════════════════════════════════════════════════════════════
-- Database Schema untuk VoltEdge IoT Energy Dashboard
-- Menggunakan MySQL / MariaDB (Untuk Kompatibilitas dengan phpMyAdmin)
-- ════════════════════════════════════════════════════════════════════

-- 1. Buat Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    photo LONGTEXT DEFAULT NULL,           -- Foto profil disimpan sebagai Base64 string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Buat Tabel Devices (Alat ESP32)
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    mac_address VARCHAR(17) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(150),
    status ENUM('online', 'offline') DEFAULT 'offline',
    max_current_limit DECIMAL(10,2) DEFAULT 5.00,
    price_per_kwh DECIMAL(10,2) DEFAULT 1444.70,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key Relasi ke tabel users
    CONSTRAINT fk_user
        FOREIGN KEY (user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- 3. Buat Tabel Sensor Data (Data Telemetri Kelistrikan)
CREATE TABLE IF NOT EXISTS sensor_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(36) NOT NULL,
    voltage DECIMAL(10,2) DEFAULT 0.00,
    current DECIMAL(10,3) DEFAULT 0.000,
    power DECIMAL(10,2) DEFAULT 0.00,
    energy DECIMAL(14,4) DEFAULT 0.0000,
    frequency DECIMAL(5,2) DEFAULT 0.00,
    power_factor DECIMAL(3,2) DEFAULT 0.00,
    gas INT DEFAULT 0,                          -- Nilai ADC sensor MQ-2
    relay_active TINYINT(1) DEFAULT 0,          -- Status Relay (0=Normal, 1=Aktif/Diputus)
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key Relasi ke tabel devices
    CONSTRAINT fk_device
        FOREIGN KEY (device_id) 
        REFERENCES devices(id)
        ON DELETE CASCADE
);

-- 4. Buat INDEX untuk optimasi kecepatan query (Best Practice untuk IoT/Time-Series)
-- Index untuk mempercepat query data sensor berdasarkan alat dan waktu
CREATE INDEX idx_sensor_data_device_time ON sensor_data(device_id, timestamp);
-- Index untuk mempercepat pencarian device milik user tertentu
CREATE INDEX idx_devices_user_id ON devices(user_id);

-- ════════════════════════════════════════════════════════════════════
-- MIGRASI (jalankan jika database SUDAH ADA sebelumnya)
-- Tambahkan kolom photo jika belum ada
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo LONGTEXT DEFAULT NULL;

-- ════════════════════════════════════════════════════════════════════
-- MIGRASI: Tambah kolom gas & relay_active ke sensor_data
-- Jalankan jika tabel sensor_data SUDAH ADA sebelumnya
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS gas INT DEFAULT 0;
ALTER TABLE sensor_data ADD COLUMN IF NOT EXISTS relay_active TINYINT(1) DEFAULT 0;

-- ════════════════════════════════════════════════════════════════════
-- SELESAI
-- ════════════════════════════════════════════════════════════════════
