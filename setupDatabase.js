const mysql = require('mysql2/promise'); // Menggunakan driver mysql2 dengan dukungan async/await
const fs = require('fs');                // Modul File System untuk membaca file
const path = require('path');            // Modul Path untuk menangani lokasi file

console.log('Memulai skrip setup database MySQL...');

// 1. Baca Konfigurasi Database dari .vars.json
let config;
try {
    // Menentukan lokasi file .vars.json
    const configPath = path.join(__dirname, '.vars.json');
    
    // Validasi keberadaan file
    if (!fs.existsSync(configPath)) {
        throw new Error('.vars.json tidak ditemukan. Pastikan file tersebut ada di direktori utama.');
    }
    
    // Parsing konten JSON
    config = JSON.parse(fs.readFileSync(configPath));
    
    // Validasi apakah properti MYSQL ada
    if (!config.MYSQL) {
        throw new Error('Konfigurasi MYSQL tidak ditemukan di dalam .vars.json.');
    }
    console.log('✅ Konfigurasi .vars.json berhasil dibaca.');
} catch (error) {
    console.error('❌ Gagal membaca konfigurasi:', error.message);
    process.exit(1); // Hentikan proses jika konfigurasi gagal
}

const dbConfig = config.MYSQL;

// 2. Definisikan semua query SQL untuk membuat tabel
// Array ini berisi perintah SQL DDL (Data Definition Language)
const createTableQueries = [
    // Tabel 'users': Menyimpan data akun pengguna
    `
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`username\` VARCHAR(255) UNIQUE NOT NULL,
      \`phone\` VARCHAR(255),
      \`email\` VARCHAR(255) UNIQUE NOT NULL,
      \`telegram\` BIGINT NULL DEFAULT NULL,
      \`password\` TEXT NOT NULL,
      \`balance\` DECIMAL(15, 2) DEFAULT 0,   -- Saldo pengguna
      \`apikey\` VARCHAR(255),                -- API Key untuk akses programatik
      \`number_otp\` TEXT,                    -- Nomor OTP (jika ada fitur OTP khusus)
      \`is_verified\` TINYINT(1) DEFAULT 0,   -- Status verifikasi akun
      \`reset_token\` VARCHAR(255),           -- Token untuk reset password
      \`reset_token_expires\` DATETIME,       -- Waktu kadaluarsa token reset
      \`webhook\` TEXT                        -- URL Webhook pengguna
    ) ENGINE=InnoDB;
    `,
    // Tabel 'deposits': Menyimpan riwayat permintaan isi saldo (Topup)
    `
    CREATE TABLE IF NOT EXISTS \`deposits\` (
      \`top_up_id\` VARCHAR(255) PRIMARY KEY, -- ID unik topup
      \`user_id\` INT NOT NULL,
      \`amount\` DECIMAL(15, 2) NOT NULL,
      \`status\` VARCHAR(255) NOT NULL,       -- PENDING, SUCCESS, CANCELED
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    `,
    // Tabel 'topup_historys': Riwayat lengkap atau arsip topup
    `
    CREATE TABLE IF NOT EXISTS \`topup_historys\` (
      \`id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`top_up_id\` VARCHAR(255) UNIQUE NOT NULL,
      \`user_id\` INT NOT NULL,
      \`amount\` DECIMAL(15, 2) NOT NULL,
      \`status\` VARCHAR(255) NOT NULL,
      \`updated_at\` TEXT NOT NULL,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    `,
    // Tabel 'transactions': Inti aplikasi, mencatat pembelian produk
    `
    CREATE TABLE IF NOT EXISTS \`transactions\` (
      \`ref_id\` VARCHAR(255) PRIMARY KEY,    -- ID Referensi transaksi lokal
      \`trx_id\` VARCHAR(255),                -- ID Transaksi dari provider (supplier)
      \`user_id\` INT NOT NULL,
      \`product_code\` VARCHAR(255) NOT NULL,
      \`product_name\` TEXT,
      \`payment_method\` VARCHAR(255),        -- Metode pembayaran (Saldo, QRIS, dll)
      \`source\` VARCHAR(255) DEFAULT 'WEB',  -- Sumber transaksi (WEB/API)
      \`message\` TEXT,                       -- Pesan respon (SN atau error)
      \`destination\` VARCHAR(255) NOT NULL,  -- Nomor tujuan pengisian
      \`price\` DECIMAL(15, 2) NOT NULL,      -- Harga modal/jual
      \`status\` VARCHAR(255),                -- PROCESSING, SUKSES, GAGAL
      \`serial_number\` TEXT,                 -- SN / Bukti transaksi
      \`meta_data\` TEXT,                     -- Data tambahan JSON
      \`payment_info\` TEXT,                  -- Info pembayaran gateway
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` DATETIME,
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB;
    `,
    // Tabel 'settings': Menyimpan pengaturan website dinamis (key-value pair)
    `
    CREATE TABLE IF NOT EXISTS \`settings\` (
      \`setting_key\` VARCHAR(255) PRIMARY KEY,
      \`setting_value\` TEXT
    ) ENGINE=InnoDB;
    `,
    // Mengisi data default untuk pengumuman (INSERT IGNORE agar tidak error jika sudah ada)
    `
    INSERT IGNORE INTO \`settings\` (\`setting_key\`, \`setting_value\`) VALUES ('announcement', 'Selamat datang di WUZZSTORE! Semua layanan berjalan normal.');
    `,
    // Tabel 'no_otp': Kemungkinan untuk layanan Virtual Number / OTP
    `
    CREATE TABLE IF NOT EXISTS \`no_otp\` (
      \`id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`product_id\` INT NOT NULL,
      \`product_name\` TEXT NOT NULL,
      \`amount\` DECIMAL(15, 2) NOT NULL,
      \`category\` TEXT NOT NULL,
      \`provider\` TEXT NOT NULL,
      \`description\` TEXT NOT NULL
    ) ENGINE=InnoDB;
    `
];

// 3. Fungsi utama untuk menjalankan setup
async function setupDatabase() {
    let connection;
    try {
        // Langkah A: Buat koneksi awal tanpa memilih database spesifik
        // Tujuannya untuk mengecek atau membuat database jika belum ada
        connection = await mysql.createConnection({
            host: dbConfig.HOST,
            user: dbConfig.USERNAME,
            password: dbConfig.PASSWORD,
            port: dbConfig.PORT
        });

        // Membuat database jika belum eksis
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.DATABASE}\``);
        console.log(`✅ Database '${dbConfig.DATABASE}' berhasil dibuat atau sudah ada.`);
        await connection.end(); // Tutup koneksi awal

        // Langkah B: Buat Pool koneksi baru yang sudah memilih database tersebut
        const pool = mysql.createPool(dbConfig);
        const conn = await pool.getConnection();
        console.log(`✅ Berhasil terhubung ke database '${dbConfig.DATABASE}'.`);

        console.log('\nMembuat tabel di MySQL...');
        // Loop untuk mengeksekusi setiap query CREATE TABLE dalam array
        for (const query of createTableQueries) {
            await conn.query(query);
            
            // Regex sederhana untuk mengambil nama tabel dari query agar log lebih rapi
            const tableNameMatch = query.match(/`(\w+)`/);
            if (tableNameMatch && tableNameMatch[1]) {
                 console.log(` -> Tabel '${tableNameMatch[1]}' berhasil disiapkan.`);
            }
        }
        
        console.log('✅ Semua tabel berhasil disiapkan.');

        // Bersihkan koneksi
        conn.release();
        await pool.end();

        console.log('\n✨ Setup database selesai! ✨');

    } catch (error) {
        console.error('❌ Terjadi kesalahan saat setup database:');
        console.error(error.message);
        // Pastikan koneksi ditutup jika terjadi error
        if (connection) {
            await connection.end();
        }
        process.exit(1);
    }
}

// Jalankan fungsi setup
setupDatabase();
