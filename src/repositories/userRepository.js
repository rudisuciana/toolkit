const pool = require('../config/database');

const dbGet = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows[0];
};

const dbRun = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

const findByUsername = (username) => dbGet('SELECT * FROM users WHERE username = ?', [username]);
const findByEmail = (email) => dbGet('SELECT * FROM users WHERE email = ?', [email]);
const findById = (id) => dbGet('SELECT * FROM users WHERE id = ?', [id]);
const findByIdSelect = (id, fields) => dbGet(`SELECT ${fields} FROM users WHERE id = ?`, [id]);
const findByResetToken = (token) => dbGet('SELECT id, reset_token_expires FROM users WHERE reset_token = ?', [token]);
const findByEmailOrUsername = (email, username) => dbGet('SELECT is_verified, email FROM users WHERE email = ? OR username = ?', [email, username]);

const create = (data) => {
  const { username, phone, email, password, apikey } = data;
  return dbRun(
    'INSERT INTO users (username, phone, email, telegram, password, apikey, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [username, phone, email, null, password, apikey, 0]
  );
};

const verifyUser = (email) => dbRun('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);

const setResetToken = (id, token, expires) =>
  dbRun('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, id]);

const updatePassword = (id, hash) =>
  dbRun('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hash, id]);

const updatePasswordOnly = (id, hash) => dbRun('UPDATE users SET password = ? WHERE id = ?', [hash, id]);

const updateProfile = (id, data) => {
  const { username, phone, email, telegram } = data;
  return dbRun('UPDATE users SET username = ?, phone = ?, email = ?, telegram = ? WHERE id = ?', [username, phone, email, telegram || null, id]);
};

const updateWebhook = (id, webhook) => dbRun('UPDATE users SET webhook = ? WHERE id = ?', [webhook, id]);
const updateApiKey = (id, apikey) => dbRun('UPDATE users SET apikey = ? WHERE id = ?', [apikey, id]);
const updateNumberOtp = (id, numberOtp) => dbRun('UPDATE users SET number_otp = ? WHERE id = ?', [numberOtp, id]);
const addBalance = (connection, id, amount) => connection.execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, id]);
const subtractBalance = (connection, id, amount) => connection.execute('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, id]);
const getBalanceForUpdate = (connection, id) => connection.execute('SELECT balance FROM users WHERE id = ? FOR UPDATE', [id]);
const getWebhookById = (id) => dbGet('SELECT webhook FROM users WHERE id = ?', [id]);

module.exports = {
  findByUsername, findByEmail, findById, findByIdSelect, findByResetToken, findByEmailOrUsername,
  create, verifyUser, setResetToken, updatePassword, updatePasswordOnly, updateProfile,
  updateWebhook, updateApiKey, updateNumberOtp, addBalance, subtractBalance,
  getBalanceForUpdate, getWebhookById,
};
