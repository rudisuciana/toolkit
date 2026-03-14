const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('./logger');

const dbConfig = config.MYSQL;

const pool = mysql.createPool({
  host: dbConfig.HOST,
  user: dbConfig.USERNAME,
  password: dbConfig.PASSWORD,
  database: dbConfig.DATABASE,
  port: dbConfig.PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    logger.info('Koneksi database MySQL berhasil.');
  } catch (error) {
    logger.error('Gagal terhubung ke database MySQL: ' + error.message);
    process.exit(1);
  } finally {
    if (connection) connection.release();
  }
}

testConnection();

module.exports = pool;
