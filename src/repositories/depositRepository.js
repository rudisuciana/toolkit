const pool = require('../config/database');

const dbGet = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows[0];
};

const dbAll = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const findPendingByAmount = (connection, amount) =>
  connection.execute("SELECT * FROM deposits WHERE amount = ? AND status = 'PENDING' ORDER BY created_at ASC LIMIT 1 FOR UPDATE", [amount]);

const findPendingByUserId = (connection, userId) =>
  connection.execute("SELECT top_up_id FROM deposits WHERE user_id = ? AND status = 'PENDING' FOR UPDATE", [userId]);

const findPendingByTopUpId = (topUpId, userId) =>
  dbGet("SELECT amount FROM deposits WHERE top_up_id = ? AND user_id = ? AND status = 'PENDING'", [topUpId, userId]);

const findByTopUpIdForCancel = (connection, topUpId, userId) =>
  connection.execute("SELECT * FROM deposits WHERE top_up_id = ? AND user_id = ? AND status = 'PENDING' FOR UPDATE", [topUpId, userId]);

const create = (connection, data) => {
  const { topUpId, userId, amount } = data;
  return connection.execute('INSERT INTO deposits (top_up_id, user_id, amount, status) VALUES (?, ?, ?, ?)', [topUpId, userId, amount, 'PENDING']);
};

const deleteByTopUpId = (connection, topUpId) =>
  connection.execute('DELETE FROM deposits WHERE top_up_id = ?', [topUpId]);

const getPendingDeposits = (userId) =>
  dbAll("SELECT top_up_id, amount, status FROM deposits WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at DESC", [userId]);

const getStatusByTopUpId = (topUpId, userId) =>
  dbGet('SELECT status FROM deposits WHERE top_up_id = ? AND user_id = ?', [topUpId, userId]);

module.exports = {
  findPendingByAmount, findPendingByUserId, findPendingByTopUpId,
  findByTopUpIdForCancel, create, deleteByTopUpId, getPendingDeposits, getStatusByTopUpId,
};
