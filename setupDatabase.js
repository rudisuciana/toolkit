require('dotenv').config();
const mysql = require('mysql2/promise');

console.log('Memulai skrip setup database MySQL...');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'wuzzstore',
};

const createTableQueries = [
  `
  CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` INT PRIMARY KEY AUTO_INCREMENT,
    \`username\` VARCHAR(255) UNIQUE NOT NULL,
    \`phone\` VARCHAR(255),
    \`email\` VARCHAR(255) UNIQUE NOT NULL,
    \`telegram\` BIGINT NULL DEFAULT NULL,
    \`password\` TEXT NOT NULL,
    \`balance\` DECIMAL(15, 2) DEFAULT 0,
    \`apikey\` VARCHAR(255),
    \`number_otp\` TEXT,
    \`is_verified\` TINYINT(1) DEFAULT 0,
    \`reset_token\` VARCHAR(255),
    \`reset_token_expires\` DATETIME,
    \`webhook\` TEXT
  ) ENGINE=InnoDB;
  `,
  `
  CREATE TABLE IF NOT EXISTS \`deposits\` (
    \`top_up_id\` VARCHAR(255) PRIMARY KEY,
    \`user_id\` INT NOT NULL,
    \`amount\` DECIMAL(15, 2) NOT NULL,
    \`status\` VARCHAR(255) NOT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  `,
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
  `
  CREATE TABLE IF NOT EXISTS \`transactions\` (
    \`ref_id\` VARCHAR(255) PRIMARY KEY,
    \`trx_id\` VARCHAR(255),
    \`user_id\` INT NOT NULL,
    \`product_code\` VARCHAR(255) NOT NULL,
    \`product_name\` TEXT,
    \`payment_method\` VARCHAR(255),
    \`source\` VARCHAR(255) DEFAULT 'WEB',
    \`message\` TEXT,
    \`destination\` VARCHAR(255) NOT NULL,
    \`price\` DECIMAL(15, 2) NOT NULL,
    \`status\` VARCHAR(255),
    \`serial_number\` TEXT,
    \`meta_data\` TEXT,
    \`payment_info\` TEXT,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` DATETIME,
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB;
  `,
  `
  CREATE TABLE IF NOT EXISTS \`settings\` (
    \`setting_key\` VARCHAR(255) PRIMARY KEY,
    \`setting_value\` TEXT
  ) ENGINE=InnoDB;
  `,
  `
  INSERT IGNORE INTO \`settings\` (\`setting_key\`, \`setting_value\`) VALUES ('announcement', 'Selamat datang di WUZZSTORE! Semua layanan berjalan normal.');
  `,
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
  `,
];

async function setupDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      port: dbConfig.port,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    console.log(`✅ Database '${dbConfig.database}' berhasil dibuat atau sudah ada.`);
    await connection.end();

    const pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    console.log(`✅ Berhasil terhubung ke database '${dbConfig.database}'.`);

    console.log('\nMembuat tabel di MySQL...');
    for (const query of createTableQueries) {
      await conn.query(query);
      const tableNameMatch = query.match(/`(\w+)`/);
      if (tableNameMatch && tableNameMatch[1]) {
        console.log(` -> Tabel '${tableNameMatch[1]}' berhasil disiapkan.`);
      }
    }

    console.log('✅ Semua tabel berhasil disiapkan.');
    conn.release();
    await pool.end();
    console.log('\n✨ Setup database selesai! ✨');
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat setup database:');
    console.error(error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();
