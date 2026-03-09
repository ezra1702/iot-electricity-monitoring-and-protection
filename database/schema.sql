-- ============================================================
--  IoT Electricity Monitoring & Protection System
--  Database Schema - MySQL / MariaDB
--  Dibuat untuk: Sistem Monitoring dan Proteksi Listrik Berbasis IoT
-- ============================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- ============================================================
-- 1. TABEL USERS
--    Menyimpan data pengguna yang dapat mengakses dashboard web
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `name`          VARCHAR(100)    NOT NULL,
    `email`         VARCHAR(150)    NOT NULL UNIQUE,
    `password_hash` VARCHAR(255)    NOT NULL,                   -- bcrypt / argon2
    `avatar_url`    VARCHAR(500)    NULL,
    `is_active`     TINYINT(1)      NOT NULL DEFAULT 1,
    `last_login_at` DATETIME        NULL,
    `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Akun pengguna dashboard web';


-- ============================================================
-- 2. TABEL DEVICES
--    Menyimpan data perangkat IoT (NodeMCU ESP32) yang terdaftar
-- ============================================================
CREATE TABLE IF NOT EXISTS `devices` (
    `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `device_code`   VARCHAR(50)     NOT NULL UNIQUE,            -- mis. "ESP32-001"
    `name`          VARCHAR(100)    NOT NULL,                   -- mis. "Panel Ruang Server"
    `location`      VARCHAR(200)    NULL,                       -- mis. "Lantai 2, Gedung A"
    `description`   TEXT            NULL,
    `mac_address`   VARCHAR(17)     NULL UNIQUE,                -- format: AA:BB:CC:DD:EE:FF
    `firmware_ver`  VARCHAR(20)     NULL,                       -- mis. "v1.2.0"
    `is_active`     TINYINT(1)      NOT NULL DEFAULT 1,
    `last_seen_at`  DATETIME        NULL,                       -- waktu terakhir data diterima
    `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_devices_code`     (`device_code`),
    INDEX `idx_devices_active`   (`is_active`),
    INDEX `idx_devices_last_seen`(`last_seen_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Perangkat IoT (NodeMCU ESP32) yang terdaftar dalam sistem';


-- ============================================================
-- 3. TABEL DEVICE_SETTINGS
--    Menyimpan konfigurasi per-perangkat yang dapat diatur pengguna
--    melalui dashboard (tarif listrik, batas arus, dsb.)
-- ============================================================
CREATE TABLE IF NOT EXISTS `device_settings` (
    `id`                    INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    `device_id`             INT UNSIGNED    NOT NULL,
    `electricity_rate`      DECIMAL(10,2)   NOT NULL DEFAULT 1444.70,  -- Rp/kWh (tarif PLN)
    `max_current_threshold` DECIMAL(6,2)    NOT NULL DEFAULT 10.00,    -- Ampere (batas overload)
    `smoke_threshold`       INT UNSIGNED    NOT NULL DEFAULT 400,       -- nilai ADC sensor MQ-2
    `auto_cutoff_enabled`   TINYINT(1)      NOT NULL DEFAULT 1,         -- relay auto cut-off aktif
    `buzzer_enabled`        TINYINT(1)      NOT NULL DEFAULT 1,         -- alarm buzzer aktif
    `data_interval_sec`     TINYINT UNSIGNED NOT NULL DEFAULT 5,        -- interval baca sensor (detik)
    `oled_rotate_sec`       TINYINT UNSIGNED NOT NULL DEFAULT 3,        -- interval rotasi layar OLED
    `updated_by`            INT UNSIGNED    NULL,
    `updated_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_device_settings` (`device_id`),
    CONSTRAINT `fk_ds_device` FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_ds_user`   FOREIGN KEY (`updated_by`)
        REFERENCES `users`(`id`)   ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Konfigurasi per-perangkat: tarif listrik, batas arus, threshold asap';


-- ============================================================
-- 4. TABEL SENSOR_READINGS
--    Menyimpan data mentah dari sensor PZEM-004T & MQ-2
--    setiap interval pembacaan (~5 detik)
-- ============================================================
CREATE TABLE IF NOT EXISTS `sensor_readings` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id`     INT UNSIGNED    NOT NULL,

    -- Parameter listrik (PZEM-004T v3.0)
    `voltage`       DECIMAL(6,2)    NOT NULL DEFAULT 0.00,  -- Volt (V)
    `current`       DECIMAL(6,3)    NOT NULL DEFAULT 0.000, -- Ampere (A)
    `power`         DECIMAL(8,2)    NOT NULL DEFAULT 0.00,  -- Watt (W)
    `energy`        DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,-- kWh (akumulatif)
    `power_factor`  DECIMAL(4,3)    NOT NULL DEFAULT 0.000, -- 0.000 – 1.000
    `frequency`     DECIMAL(5,2)    NOT NULL DEFAULT 50.00, -- Hz

    -- Parameter keamanan (Sensor MQ-2)
    `smoke_raw`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,   -- nilai ADC mentah (0–4095)
    `smoke_ppm`     DECIMAL(8,2)    NULL,                   -- estimasi ppm (opsional kalibrasi)
    `smoke_detected`TINYINT(1)      NOT NULL DEFAULT 0,     -- 0=normal, 1=asap terdeteksi

    -- Status sistem saat pembacaan
    `system_status` ENUM('normal','overload','smoke','danger')
                                    NOT NULL DEFAULT 'normal',
    `relay_state`   TINYINT(1)      NOT NULL DEFAULT 1,     -- 1=ON (aliran listrik terhubung)
    `wifi_rssi`     SMALLINT        NULL,                   -- kekuatan sinyal WiFi (dBm)

    -- Timestamp dari RTC DS3231
    `recorded_at`   DATETIME        NOT NULL,               -- waktu dari RTC perangkat
    `received_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP, -- waktu server menerima

    PRIMARY KEY (`id`),
    INDEX `idx_sr_device`      (`device_id`),
    INDEX `idx_sr_recorded`    (`recorded_at`),
    INDEX `idx_sr_device_time` (`device_id`, `recorded_at`),
    INDEX `idx_sr_status`      (`system_status`),
    CONSTRAINT `fk_sr_device`  FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Data mentah sensor PZEM-004T dan MQ-2 setiap 5 detik';


-- ============================================================
-- 5. TABEL ENERGY_DAILY
--    Rekap harian energi listrik dan estimasi biaya
--    Digenerate otomatis dari sensor_readings (batch/cron)
-- ============================================================
CREATE TABLE IF NOT EXISTS `energy_daily` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id`             INT UNSIGNED    NOT NULL,
    `date`                  DATE            NOT NULL,

    -- Data energi harian
    `energy_kwh_start`      DECIMAL(10,4)   NOT NULL DEFAULT 0.0000, -- kWh awal hari
    `energy_kwh_end`        DECIMAL(10,4)   NOT NULL DEFAULT 0.0000, -- kWh akhir hari
    `energy_kwh_used`       DECIMAL(10,4)   NOT NULL DEFAULT 0.0000, -- selisih (pemakaian)
    `avg_voltage`           DECIMAL(6,2)    NULL,   -- rata-rata tegangan (V)
    `avg_current`           DECIMAL(6,3)    NULL,   -- rata-rata arus (A)
    `max_current`           DECIMAL(6,3)    NULL,   -- arus puncak (A)
    `avg_power`             DECIMAL(8,2)    NULL,   -- rata-rata daya (W)
    `max_power`             DECIMAL(8,2)    NULL,   -- daya puncak (W)
    `avg_power_factor`      DECIMAL(4,3)    NULL,   -- rata-rata power factor

    -- Estimasi biaya
    `electricity_rate`      DECIMAL(10,2)   NOT NULL,              -- Rp/kWh saat pencatatan
    `estimated_cost`        DECIMAL(14,2)   NOT NULL DEFAULT 0.00, -- Rp (energy_kwh_used * rate)

    -- Statistik keamanan harian
    `overload_count`        SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- jumlah kejadian overload
    `smoke_alert_count`     SMALLINT UNSIGNED NOT NULL DEFAULT 0,  -- jumlah kejadian deteksi asap
    `reading_count`         INT UNSIGNED    NOT NULL DEFAULT 0,    -- total pembacaan pada hari itu

    `created_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY  `uq_energy_daily` (`device_id`, `date`),
    INDEX `idx_ed_device`  (`device_id`),
    INDEX `idx_ed_date`    (`date`),
    CONSTRAINT `fk_ed_device` FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Rekap harian konsumsi energi dan estimasi biaya per perangkat';


-- ============================================================
-- 6. TABEL ENERGY_MONTHLY
--    Rekap bulanan energi listrik dan estimasi biaya
-- ============================================================
CREATE TABLE IF NOT EXISTS `energy_monthly` (
    `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id`             INT UNSIGNED    NOT NULL,
    `year`                  SMALLINT UNSIGNED NOT NULL,   -- mis. 2025
    `month`                 TINYINT UNSIGNED  NOT NULL,   -- 1–12

    -- Data energi bulanan
    `energy_kwh_total`      DECIMAL(12,4)   NOT NULL DEFAULT 0.0000,
    `avg_voltage`           DECIMAL(6,2)    NULL,
    `avg_current`           DECIMAL(6,3)    NULL,
    `max_current`           DECIMAL(6,3)    NULL,
    `avg_power`             DECIMAL(8,2)    NULL,
    `max_power`             DECIMAL(8,2)    NULL,

    -- Estimasi biaya
    `electricity_rate`      DECIMAL(10,2)   NOT NULL,
    `estimated_cost`        DECIMAL(16,2)   NOT NULL DEFAULT 0.00, -- Rp

    -- Statistik keamanan bulanan
    `overload_count`        INT UNSIGNED    NOT NULL DEFAULT 0,
    `smoke_alert_count`     INT UNSIGNED    NOT NULL DEFAULT 0,
    `active_days`           TINYINT UNSIGNED NOT NULL DEFAULT 0,   -- hari dengan data

    `created_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY  `uq_energy_monthly` (`device_id`, `year`, `month`),
    INDEX `idx_em_device`  (`device_id`),
    INDEX `idx_em_year_month` (`year`, `month`),
    CONSTRAINT `fk_em_device` FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Rekap bulanan konsumsi energi dan estimasi biaya per perangkat';


-- ============================================================
-- 7. TABEL ALERTS
--    Menyimpan riwayat setiap kejadian alarm/notifikasi
--    (overload, deteksi asap, dll.)
-- ============================================================
CREATE TABLE IF NOT EXISTS `alerts` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id`     INT UNSIGNED    NOT NULL,
    `reading_id`    BIGINT UNSIGNED NULL,  -- referensi ke sensor_readings jika ada

    `alert_type`    ENUM(
                        'overload',          -- arus melebihi batas maksimum
                        'smoke_detected',    -- sensor MQ-2 mendeteksi asap
                        'danger',            -- kondisi overload + asap bersamaan
                        'voltage_low',       -- tegangan di bawah normal (<180V)
                        'voltage_high',      -- tegangan di atas normal (>250V)
                        'device_offline',    -- perangkat tidak mengirim data
                        'relay_tripped'      -- relay memutus aliran listrik
                    ) NOT NULL,

    `severity`      ENUM('info','warning','critical') NOT NULL DEFAULT 'warning',

    -- Nilai pemicu alarm
    `trigger_value`         DECIMAL(10,3)   NULL,   -- nilai yang memicu (mis. arus=15.2A)
    `trigger_threshold`     DECIMAL(10,3)   NULL,   -- ambang batas saat itu (mis. 10A)
    `smoke_raw_value`       SMALLINT UNSIGNED NULL, -- nilai ADC MQ-2 saat alarm

    `message`               VARCHAR(500)    NULL,   -- pesan deskriptif alarm
    `auto_cutoff_triggered` TINYINT(1)      NOT NULL DEFAULT 0, -- apakah relay memutus

    -- Status penanganan
    `is_resolved`           TINYINT(1)      NOT NULL DEFAULT 0,
    `resolved_at`           DATETIME        NULL,
    `resolved_by`           INT UNSIGNED    NULL,   -- user_id yang menyelesaikan
    `resolution_note`       TEXT            NULL,

    `triggered_at`          DATETIME        NOT NULL,              -- waktu kejadian (dari RTC)
    `created_at`            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_al_device`      (`device_id`),
    INDEX `idx_al_type`        (`alert_type`),
    INDEX `idx_al_severity`    (`severity`),
    INDEX `idx_al_triggered`   (`triggered_at`),
    INDEX `idx_al_resolved`    (`is_resolved`),
    INDEX `idx_al_device_time` (`device_id`, `triggered_at`),
    CONSTRAINT `fk_al_device`  FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`)  ON DELETE CASCADE,
    CONSTRAINT `fk_al_reading` FOREIGN KEY (`reading_id`)
        REFERENCES `sensor_readings`(`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_al_resolver` FOREIGN KEY (`resolved_by`)
        REFERENCES `users`(`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Riwayat semua kejadian alarm: overload, deteksi asap, tegangan abnormal, dll.';


-- ============================================================
-- 8. TABEL RELAY_LOGS
--    Mencatat setiap perubahan status relay (ON/OFF)
-- ============================================================
CREATE TABLE IF NOT EXISTS `relay_logs` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id`     INT UNSIGNED    NOT NULL,
    `alert_id`      BIGINT UNSIGNED NULL,   -- referensi jika dipicu oleh alert

    `action`        ENUM('on','off')    NOT NULL,   -- 'off' = memutus listrik
    `trigger_source`ENUM(
                        'auto_overload',    -- otomatis karena overload
                        'auto_smoke',       -- otomatis karena deteksi asap
                        'auto_danger',      -- otomatis karena bahaya ganda
                        'manual_dashboard', -- dimatikan manual via dashboard
                        'manual_device',    -- dimatikan via tombol fisik
                        'system_restore'    -- otomatis restore setelah aman
                    ) NOT NULL,

    `current_at_event`  DECIMAL(6,3)    NULL,   -- arus saat relay trip (A)
    `voltage_at_event`  DECIMAL(6,2)    NULL,   -- tegangan saat relay trip (V)
    `smoke_at_event`    SMALLINT UNSIGNED NULL, -- nilai MQ-2 saat relay trip
    `note`              VARCHAR(300)    NULL,
    `triggered_by`      INT UNSIGNED    NULL,   -- user_id jika manual
    `action_at`         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_rl_device`  (`device_id`),
    INDEX `idx_rl_action`  (`action`),
    INDEX `idx_rl_time`    (`action_at`),
    CONSTRAINT `fk_rl_device`  FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`)  ON DELETE CASCADE,
    CONSTRAINT `fk_rl_alert`   FOREIGN KEY (`alert_id`)
        REFERENCES `alerts`(`id`)   ON DELETE SET NULL,
    CONSTRAINT `fk_rl_user`    FOREIGN KEY (`triggered_by`)
        REFERENCES `users`(`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Log perubahan status relay: kapan listrik diputus/disambung dan penyebabnya';


-- ============================================================
-- 9. TABEL DEVICE_CONNECTIVITY_LOGS
--    Mencatat status koneksi WiFi/MQTT perangkat IoT
-- ============================================================
CREATE TABLE IF NOT EXISTS `device_connectivity_logs` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id`     INT UNSIGNED    NOT NULL,
    `event`         ENUM('connected','disconnected','reconnected') NOT NULL,
    `ip_address`    VARCHAR(45)     NULL,    -- IPv4 / IPv6 perangkat
    `wifi_rssi`     SMALLINT        NULL,    -- dBm
    `mqtt_broker`   VARCHAR(200)    NULL,    -- alamat broker yang digunakan
    `reason`        VARCHAR(200)    NULL,    -- alasan disconnect (jika ada)
    `event_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_cl_device`  (`device_id`),
    INDEX `idx_cl_event`   (`event`),
    INDEX `idx_cl_time`    (`event_at`),
    CONSTRAINT `fk_cl_device` FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Log koneksi/diskoneksi WiFi dan MQTT setiap perangkat IoT';


-- ============================================================
-- 10. TABEL OFFLINE_DATA_QUEUE
--     Buffer data sensor yang tersimpan saat WiFi terputus
--     dan belum berhasil dikirim ke server
-- ============================================================
CREATE TABLE IF NOT EXISTS `offline_data_queue` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `device_id`     INT UNSIGNED    NOT NULL,
    `payload`       JSON            NOT NULL,   -- data MQTT yang pending (raw JSON)
    `recorded_at`   DATETIME        NOT NULL,   -- waktu asli pengukuran (RTC)
    `retry_count`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `is_processed`  TINYINT(1)      NOT NULL DEFAULT 0,
    `processed_at`  DATETIME        NULL,
    `queued_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_oq_device`      (`device_id`),
    INDEX `idx_oq_processed`   (`is_processed`),
    INDEX `idx_oq_recorded`    (`recorded_at`),
    CONSTRAINT `fk_oq_device`  FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Antrian data offline yang belum terkirim saat koneksi WiFi/MQTT terputus';


-- ============================================================
-- 11. TABEL AUDIT_LOGS
--     Mencatat semua perubahan konfigurasi oleh pengguna
--     (tarif listrik, batas arus, dsb.)
-- ============================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id`       INT UNSIGNED    NULL,
    `device_id`     INT UNSIGNED    NULL,
    `action`        VARCHAR(100)    NOT NULL,   -- mis. 'update_settings', 'relay_manual_off'
    `target_table`  VARCHAR(50)     NULL,        -- tabel yang diubah
    `target_id`     BIGINT UNSIGNED NULL,        -- ID record yang diubah
    `old_value`     JSON            NULL,        -- nilai sebelum perubahan
    `new_value`     JSON            NULL,        -- nilai sesudah perubahan
    `ip_address`    VARCHAR(45)     NULL,
    `user_agent`    VARCHAR(300)    NULL,
    `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_aul_user`    (`user_id`),
    INDEX `idx_aul_device`  (`device_id`),
    INDEX `idx_aul_action`  (`action`),
    INDEX `idx_aul_time`    (`created_at`),
    CONSTRAINT `fk_aul_user`   FOREIGN KEY (`user_id`)
        REFERENCES `users`(`id`)   ON DELETE SET NULL,
    CONSTRAINT `fk_aul_device` FOREIGN KEY (`device_id`)
        REFERENCES `devices`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Audit trail semua perubahan konfigurasi dan aksi manual oleh pengguna';


-- ============================================================
-- VIEW: v_latest_sensor_per_device
--    Menampilkan pembacaan sensor terbaru untuk setiap perangkat
--    (berguna untuk kartu status real-time di dashboard)
-- ============================================================
CREATE OR REPLACE VIEW `v_latest_sensor_per_device` AS
SELECT
    d.id            AS device_id,
    d.device_code,
    d.name          AS device_name,
    d.location,
    sr.voltage,
    sr.current,
    sr.power,
    sr.energy,
    sr.power_factor,
    sr.frequency,
    sr.smoke_raw,
    sr.smoke_detected,
    sr.system_status,
    sr.relay_state,
    sr.wifi_rssi,
    sr.recorded_at,
    sr.received_at,
    ds.electricity_rate,
    ds.max_current_threshold,
    ds.smoke_threshold
FROM `devices` d
LEFT JOIN `device_settings` ds ON ds.device_id = d.id
LEFT JOIN `sensor_readings`  sr
    ON sr.id = (
        SELECT id FROM `sensor_readings`
        WHERE device_id = d.id
        ORDER BY recorded_at DESC
        LIMIT 1
    )
WHERE d.is_active = 1;


-- ============================================================
-- VIEW: v_daily_cost_summary
--    Ringkasan biaya harian 30 hari terakhir per perangkat
--    (berguna untuk grafik konsumsi energi di dashboard)
-- ============================================================
CREATE OR REPLACE VIEW `v_daily_cost_summary` AS
SELECT
    ed.device_id,
    d.name          AS device_name,
    ed.date,
    ed.energy_kwh_used,
    ed.estimated_cost,
    ed.avg_voltage,
    ed.avg_power,
    ed.max_current,
    ed.overload_count,
    ed.smoke_alert_count
FROM `energy_daily` ed
JOIN `devices` d ON d.id = ed.device_id
WHERE ed.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY ed.device_id, ed.date DESC;


-- ============================================================
-- VIEW: v_monthly_cost_summary
--    Ringkasan biaya bulanan 12 bulan terakhir per perangkat
-- ============================================================
CREATE OR REPLACE VIEW `v_monthly_cost_summary` AS
SELECT
    em.device_id,
    d.name          AS device_name,
    em.year,
    em.month,
    CONCAT(em.year, '-', LPAD(em.month, 2, '0')) AS period,
    em.energy_kwh_total,
    em.estimated_cost,
    em.overload_count,
    em.smoke_alert_count,
    em.active_days
FROM `energy_monthly` em
JOIN `devices` d ON d.id = em.device_id
WHERE (em.year * 100 + em.month) >= (YEAR(CURDATE()) * 100 + MONTH(CURDATE()) - 100)
ORDER BY em.device_id, em.year DESC, em.month DESC;


-- ============================================================
-- VIEW: v_active_alerts
--    Menampilkan semua alert yang belum diselesaikan
--    (untuk panel notifikasi dashboard)
-- ============================================================
CREATE OR REPLACE VIEW `v_active_alerts` AS
SELECT
    a.id,
    a.device_id,
    d.device_code,
    d.name          AS device_name,
    d.location,
    a.alert_type,
    a.severity,
    a.trigger_value,
    a.trigger_threshold,
    a.smoke_raw_value,
    a.message,
    a.auto_cutoff_triggered,
    a.triggered_at
FROM `alerts` a
JOIN `devices` d ON d.id = a.device_id
WHERE a.is_resolved = 0
ORDER BY
    FIELD(a.severity, 'critical', 'warning', 'info'),
    a.triggered_at DESC;


-- ============================================================
-- DATA AWAL (Seed)
-- ============================================================

-- Default admin user (password: Admin@1234 — ganti sebelum production!)
INSERT INTO `users` (`name`, `email`, `password_hash`) VALUES
('Administrator', 'admin@iotmonitor.local',
 '$2y$12$exampleHashChangeThisBeforeProduction1234567890abcdef');

-- Contoh perangkat
INSERT INTO `devices` (`device_code`, `name`, `location`, `description`) VALUES
('ESP32-001', 'Monitor Panel Utama', 'Ruang Panel, Lantai 1',
 'Monitoring panel listrik utama gedung'),
('ESP32-002', 'Monitor Ruang Server', 'Server Room, Lantai 2',
 'Monitoring konsumsi listrik server room');

-- Pengaturan default untuk setiap perangkat
INSERT INTO `device_settings` (`device_id`, `electricity_rate`, `max_current_threshold`,
                               `smoke_threshold`, `auto_cutoff_enabled`, `buzzer_enabled`) VALUES
(1, 1444.70, 10.00, 400, 1, 1),
(2, 1444.70, 16.00, 300, 1, 1);
