const logger = require('../config/logger');
const transactionRepository = require('../repositories/transactionRepository');

const getTopupHistory = async (req, res) => {
  const { searchTerm, startDate, endDate } = req.body;
  try {
    const topups = await transactionRepository.getTopupHistory(req.session.userId, searchTerm, startDate, endDate);
    res.json({ success: true, data: topups });
  } catch (error) {
    logger.error('getTopupHistory error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat top up.' });
  }
};

const getTransactionHistory = async (req, res) => {
  const { searchTerm, startDate, endDate } = req.body;
  try {
    const transactions = await transactionRepository.getTransactionHistory(req.session.userId, searchTerm, startDate, endDate);
    res.json({ success: true, data: transactions });
  } catch (error) {
    logger.error('getTransactionHistory error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat transaksi.' });
  }
};

const getTransactionStatus = async (req, res) => {
  const { ref_id } = req.params;
  try {
    const transaction = await transactionRepository.getTransactionStatus(ref_id, req.session.userId);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
    res.json({ success: true, ...transaction });
  } catch (error) {
    logger.error('getTransactionStatus error: ' + error.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getTopupHistory, getTransactionHistory, getTransactionStatus };
