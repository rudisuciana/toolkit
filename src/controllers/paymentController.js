const pool = require('../config/database');
const config = require('../config/env');
const logger = require('../config/logger');
const depositRepository = require('../repositories/depositRepository');
const transactionRepository = require('../repositories/transactionRepository');
const userRepository = require('../repositories/userRepository');
const { generateDynamicQris } = require('../utils/qris');
const { generateRandomString } = require('../utils/helpers');

const generateQris = async (req, res) => {
  const { baseAmount } = req.body;
  const userId = req.session.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await depositRepository.findPendingByUserId(connection, userId);
    if (rows[0]) throw new Error(`Anda masih memiliki deposit pending dengan ID ${rows[0].top_up_id}.`);

    const uniqueAmount = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
    const finalAmount = parseInt(baseAmount) + uniqueAmount;
    const topUpId = `WZ${generateRandomString(13)}`;
    const finalQrisString = generateDynamicQris(config.DATAQRIS, finalAmount);

    await depositRepository.create(connection, { topUpId, userId, amount: finalAmount });
    await connection.commit();
    res.json({ success: true, qrisString: finalQrisString, finalAmount, topUpId, rekening: config.JAGO });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('generateQris error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal memproses permintaan: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const generateTopup = async (req, res) => {
  const { baseAmount } = req.body;
  const userId = req.session.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await depositRepository.findPendingByUserId(connection, userId);
    if (rows[0]) throw new Error(`Anda masih memiliki deposit pending dengan ID ${rows[0].top_up_id}.`);

    const uniqueAmount = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
    const finalAmount = parseInt(baseAmount) + uniqueAmount;
    const topUpId = `WZ${generateRandomString(13)}`;

    await depositRepository.create(connection, { topUpId, userId, amount: finalAmount });
    await connection.commit();
    res.json({ success: true, norek: config.JAGO, finalAmount, topUpId });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('generateTopup error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal memproses permintaan: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const getPendingDeposits = async (req, res) => {
  try {
    const rows = await depositRepository.getPendingDeposits(req.session.userId);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengambil data.' });
  }
};

const getDepositDetails = async (req, res) => {
  const { topUpId } = req.params;
  try {
    const row = await depositRepository.findPendingByTopUpId(topUpId, req.session.userId);
    if (!row) return res.status(404).json({ success: false, message: 'Deposit tidak ditemukan atau sudah dibayar.' });
    const finalQrisString = generateDynamicQris(config.DATAQRIS, row.amount);
    res.json({ success: true, qrisString: finalQrisString, finalAmount: row.amount, topUpId, rekening: config.JAGO });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat ulang QRIS.' });
  }
};

const getDepositDetailsV2 = async (req, res) => {
  const { topUpId } = req.params;
  try {
    const row = await depositRepository.findPendingByTopUpId(topUpId, req.session.userId);
    if (!row) return res.status(404).json({ success: false, message: 'Deposit tidak ditemukan atau sudah dibayar.' });
    res.json({ success: true, norek: config.JAGO, finalAmount: row.amount, topUpId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat detail deposit.' });
  }
};

const getDepositStatus = async (req, res) => {
  const { topUpId } = req.params;
  try {
    let row = await transactionRepository.getTopupStatusByTopUpId(topUpId, req.session.userId);
    if (row) return res.json({ success: true, status: row.status });
    row = await depositRepository.getStatusByTopUpId(topUpId, req.session.userId);
    if (row) return res.json({ success: true, status: row.status });
    return res.status(404).json({ success: false, message: 'Deposit tidak ditemukan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const cancelDeposit = async (req, res) => {
  const { topUpId } = req.params;
  const userId = req.session.userId;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await depositRepository.findByTopUpIdForCancel(connection, topUpId, userId);
    const deposit = rows[0];
    if (!deposit) throw new Error('Deposit yang menunggu pembayaran tidak ditemukan.');

    await depositRepository.deleteByTopUpId(connection, topUpId);
    const nowISO = new Date().toISOString();
    await transactionRepository.insertTopupHistory(connection, {
      topUpId: deposit.top_up_id, userId: deposit.user_id, amount: deposit.amount, status: 'FAILED', updatedAt: nowISO,
    });

    await connection.commit();
    res.json({ success: true, message: 'Deposit berhasil dibatalkan.' });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ success: false, message: 'Gagal membatalkan deposit: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { generateQris, generateTopup, getPendingDeposits, getDepositDetails, getDepositDetailsV2, getDepositStatus, cancelDeposit };
