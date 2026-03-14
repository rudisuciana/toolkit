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

const findByTrxIdForUpdate = (connection, trxId) =>
  connection.execute('SELECT ref_id, user_id, price, status, source FROM transactions WHERE trx_id = ? FOR UPDATE', [trxId]);

const findByRefIdForUpdate = (connection, refId) =>
  connection.execute('SELECT * FROM transactions WHERE ref_id = ? FOR UPDATE', [refId]);

const updateStatusByTrxId = (connection, data) => {
  const { status, serialNumber, updatedAt, paymentInfo, message, trxId } = data;
  return connection.execute(
    'UPDATE transactions SET status = ?, serial_number = ?, updated_at = ?, payment_info = ?, message = ? WHERE trx_id = ?',
    [status, serialNumber, updatedAt, paymentInfo, message, trxId]
  );
};

const updateStatusByRefId = (connection, data) => {
  const { status, serialNumber, updatedAt, message, refId } = data;
  return connection.execute(
    'UPDATE transactions SET status = ?, serial_number = ?, updated_at = ?, message = ? WHERE ref_id = ?',
    [status, serialNumber, updatedAt, message, refId]
  );
};

const updateMessageByRefId = (connection, message, refId) =>
  connection.execute('UPDATE transactions SET message = ? WHERE ref_id = ?', [message, refId]);

const createTransaction = (connection, data) => {
  const { ref_id, trx_id, userId, productCode, productName, paymentMethod, source, message, destination, price, status, serialNumber, metaData, paymentInfo, updatedAt } = data;
  return connection.execute(
    'INSERT INTO transactions (ref_id, trx_id, user_id, product_code, product_name, payment_method, source, message, destination, price, status, serial_number, meta_data, payment_info, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [ref_id, trx_id, userId, productCode, productName, paymentMethod, source || 'WEB', message, destination, price, status, serialNumber || '', metaData || null, paymentInfo || null, updatedAt]
  );
};

const getTopupHistory = async (userId, searchTerm, startDate, endDate) => {
  let query = 'SELECT top_up_id, amount, status, updated_at FROM topup_historys WHERE user_id = ?';
  const params = [userId];
  if (searchTerm) {
    query += ' AND (top_up_id LIKE ? OR amount LIKE ? OR status LIKE ?)';
    params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
  }
  if (startDate && endDate) {
    query += ' AND updated_at BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  query += ' ORDER BY id DESC LIMIT 50';
  return dbAll(query, params);
};

const getTransactionHistory = async (userId, searchTerm, startDate, endDate) => {
  let query = 'SELECT ref_id, product_name, destination, status, serial_number, price, updated_at, payment_method, payment_info, message FROM transactions WHERE user_id = ?';
  const params = [userId];
  if (searchTerm) {
    query += ' AND (ref_id LIKE ? OR product_name LIKE ? OR destination LIKE ? OR price LIKE ? OR payment_method LIKE ? OR status LIKE ? OR message LIKE ?)';
    const s = `%${searchTerm}%`;
    params.push(s, s, s, s, s, s, s);
  }
  if (startDate && endDate) {
    query += ' AND updated_at BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  query += ' ORDER BY created_at DESC LIMIT 200';
  return dbAll(query, params);
};

const getTransactionStatus = (refId, userId) =>
  dbGet('SELECT status, payment_method, payment_info, message FROM transactions WHERE ref_id = ? AND user_id = ?', [refId, userId]);

const insertTopupHistory = (connection, data) => {
  const { topUpId, userId, amount, status, updatedAt } = data;
  return connection.execute(
    'INSERT INTO topup_historys (top_up_id, user_id, amount, status, updated_at) VALUES (?, ?, ?, ?, ?)',
    [topUpId, userId, amount, status, updatedAt]
  );
};

const getTopupStatusByTopUpId = (topUpId, userId) =>
  dbGet('SELECT status FROM topup_historys WHERE top_up_id = ? AND user_id = ?', [topUpId, userId]);

module.exports = {
  findByTrxIdForUpdate, findByRefIdForUpdate, updateStatusByTrxId, updateStatusByRefId,
  updateMessageByRefId, createTransaction, getTopupHistory, getTransactionHistory,
  getTransactionStatus, insertTopupHistory, getTopupStatusByTopUpId,
};
