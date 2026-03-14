const pool = require('../config/database');

const dbGet = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows[0];
};

const dbAll = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const dbRun = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

const findByProvider = (provider) => dbAll('SELECT * FROM no_otp WHERE provider = ?', [provider]);
const findByProductId = (productId) => dbGet('SELECT * FROM no_otp WHERE product_id = ?', [productId]);

const create = (data) => {
  const { product_id, product_name, amount, category, provider, description } = data;
  return dbRun(
    'INSERT INTO no_otp (product_id, product_name, amount, category, provider, description) VALUES (?, ?, ?, ?, ?, ?)',
    [product_id, product_name, amount, category, provider, description]
  );
};

module.exports = { findByProvider, findByProductId, create };
