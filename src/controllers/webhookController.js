const pool = require('../config/database');
const config = require('../config/env');
const logger = require('../config/logger');
const axios = require('axios');
const depositRepository = require('../repositories/depositRepository');
const transactionRepository = require('../repositories/transactionRepository');
const userRepository = require('../repositories/userRepository');
const { getTransactionInfo: getTransactionInfoKaje } = require('../utils/providers/kaje');
const { getTransactionInfoFlaz } = require('../utils/providers/flaz');

async function sendWebhookNotification(userId, refId) {
  try {
    const user = await userRepository.getWebhookById(userId);
    if (!user || !user.webhook) return;
    const webhookUrl = user.webhook;
    const payload = { ref_id: refId };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`[Webhook] Mengirim ke ${webhookUrl} (Percobaan #${attempt}) untuk ref_id: ${refId}`);
        await axios.post(webhookUrl, payload, { timeout: 5000 });
        logger.info('[Webhook] Berhasil mengirim notifikasi.');
        return;
      } catch (error) {
        logger.warn(`[Webhook] Gagal percobaan #${attempt}: ${error.message}`);
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    logger.error('Gagal total mengirim webhook ke user.');
  } catch (dbError) {
    logger.error('Error database webhook: ' + dbError.message);
  }
}

const webhookTopup = async (req, res) => {
  const webhookText = req.body.text;
  if (!webhookText) return res.status(400).json({ success: false, message: 'Invalid format.' });

  const match = /Rp\s*([\d.]+)/.exec(webhookText);
  if (!match) return res.status(400).json({ success: false, message: 'Amount not found.' });

  const amountFromWebhook = parseInt(match[1].replace(/\./g, ''), 10);

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await depositRepository.findPendingByAmount(connection, amountFromWebhook);
    const row = rows[0];
    if (!row) {
      await connection.commit();
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    const { top_up_id, user_id, amount } = row;

    await userRepository.addBalance(connection, user_id, amount);
    await depositRepository.deleteByTopUpId(connection, top_up_id);
    const nowISO = new Date().toISOString();
    await transactionRepository.insertTopupHistory(connection, { topUpId: top_up_id, userId: user_id, amount, status: 'SUCCESS', updatedAt: nowISO });

    await connection.commit();
    res.status(200).json({ success: true, message: 'Webhook processed successfully.' });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('Webhook Topup Error: ' + error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const webhookKaje = async (req, res) => {
  const { trx_id } = req.body;
  if (!trx_id) return res.status(400).json({ success: false, message: 'trx_id required.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const txInfo = await getTransactionInfoKaje(trx_id, config);
    if (!txInfo.success || !txInfo.data) throw new Error('Provider API error.');

    const { status, serial_number, deeplink, message } = txInfo.data;
    const finalStatus = status ? status.toLowerCase() : 'failed';
    const finalSn = serial_number ? serial_number.split(': ')[1] || 'NONE' : 'NONE';
    const finalMessage = serial_number || message || 'Update dari Provider.';
    const now = new Date();

    const [rows] = await transactionRepository.findByTrxIdForUpdate(connection, trx_id);
    const originalTx = rows[0];
    if (!originalTx) throw new Error('Transaction not found.');

    const isFailed = finalStatus === 'failed' || finalStatus === 'gagal';
    const wasAlreadySettled = ['success', 'sukses', 'failed', 'gagal'].includes(originalTx.status);

    if (isFailed && !wasAlreadySettled && originalTx.price > 0) {
      await userRepository.addBalance(connection, originalTx.user_id, originalTx.price);
    }

    await transactionRepository.updateStatusByTrxId(connection, {
      status: finalStatus, serialNumber: finalSn, updatedAt: now, paymentInfo: deeplink || null, message: finalMessage, trxId: trx_id,
    });

    await connection.commit();
    res.status(200).json({ success: true, message: 'Webhook Kaje received.' });

    if (originalTx.source === 'API') {
      sendWebhookNotification(originalTx.user_id, originalTx.ref_id);
    }
  } catch (err) {
    if (connection) await connection.rollback();
    logger.error('Webhook Kaje Error: ' + err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) connection.release();
  }
};

const webhookFlaz = async (req, res) => {
  const { trx_id } = req.body;
  if (!trx_id) return res.status(400).json({ success: false, message: 'trx_id required.' });

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const txInfo = await getTransactionInfoFlaz(trx_id, config);
    if (!txInfo.success || !txInfo.data) throw new Error('Provider API error.');

    const { status, serial_number, message } = txInfo.data;
    const finalStatus = status ? status.toLowerCase() : 'failed';
    const finalSn = serial_number ? serial_number.split(': ')[1] || 'NONE' : 'NONE';
    const finalMessage = message || 'Update dari Provider.';
    const now = new Date();

    const [rows] = await transactionRepository.findByTrxIdForUpdate(connection, trx_id);
    const originalTx = rows[0];
    if (!originalTx) throw new Error('Transaction not found.');

    const isFailed = finalStatus === 'failed' || finalStatus === 'gagal';
    const wasAlreadySettled = ['success', 'sukses', 'failed', 'gagal'].includes(originalTx.status);

    if (isFailed && !wasAlreadySettled && originalTx.price > 0) {
      await userRepository.addBalance(connection, originalTx.user_id, originalTx.price);
    }

    await connection.execute(
      'UPDATE transactions SET status = ?, serial_number = ?, updated_at = ?, message = ? WHERE trx_id = ?',
      [finalStatus, finalSn, now, finalMessage, trx_id]
    );

    await connection.commit();
    res.status(200).json({ success: true, message: 'Webhook Flaz received.' });

    if (originalTx.source === 'API') {
      sendWebhookNotification(originalTx.user_id, originalTx.ref_id);
    }
  } catch (err) {
    if (connection) await connection.rollback();
    logger.error('Webhook Flaz Error: ' + err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (connection) connection.release();
  }
};

const webhookKhfy = async (req, res) => {
  let connection;
  try {
    const message = (req.query && req.query.message) || (typeof req.body?.message === 'string' ? req.body.message : null);
    if (!message) return res.status(400).json({ ok: false, error: 'message kosong' });

    const RX =
      /RC=(?<reffid>[a-zA-Z0-9-]+)\s+TrxID=(?<trxid>\d+)\s+(?<produk>[A-Z0-9]+)\.(?<tujuan>\d+)\s+(?<status_text>[A-Za-z]+)\s*(?<keterangan>.+?)(?:\s+Saldo[\s\S]*?)?(?:\bresult=(?<status_code>\d+))?\s*>?$/i;
    const matchResult = message.match(RX);
    if (!matchResult || !matchResult.groups) return res.status(200).json({ ok: false, error: 'format tidak dikenali' });

    const { trxid, reffid, status_text = '', status_code: statusCodeRaw } = matchResult.groups;
    const keterangan = (matchResult.groups.keterangan || '').trim();

    let status_code = null;
    if (statusCodeRaw != null) {
      status_code = Number(statusCodeRaw);
    } else {
      if (/sukses/i.test(status_text)) status_code = 0;
      else if (/gagal|batal/i.test(status_text)) status_code = 1;
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await transactionRepository.findByRefIdForUpdate(connection, reffid);
    const originalTx = rows[0];
    if (!originalTx) throw new Error(`Transaksi ref_id ${reffid} tidak ditemukan.`);

    const wasAlreadySettled = ['success', 'sukses', 'failed', 'gagal'].includes(originalTx.status);
    if (wasAlreadySettled) {
      await connection.commit();
      return res.status(200).json({ ok: true, message: 'Transaksi sudah selesai sebelumnya.' });
    }

    const now = new Date();

    if (Number(status_code) === 0) {
      await transactionRepository.updateStatusByRefId(connection, {
        status: 'success', serialNumber: keterangan, updatedAt: now, message: 'Transaksi Sukses', refId: reffid,
      });
    } else if (Number(status_code) === 1) {
      if (originalTx.price > 0) {
        await userRepository.addBalance(connection, originalTx.user_id, originalTx.price);
      }
      await transactionRepository.updateStatusByRefId(connection, {
        status: 'failed', serialNumber: keterangan, updatedAt: now, message: keterangan, refId: reffid,
      });
    } else {
      await transactionRepository.updateMessageByRefId(connection, keterangan, reffid);
    }

    await connection.commit();

    if (originalTx.source === 'API') {
      sendWebhookNotification(originalTx.user_id, originalTx.ref_id);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    if (connection) await connection.rollback();
    logger.error('Webhook KHFY Error: ' + err.message);
    return res.status(500).json({ ok: false, error: 'internal_error', detail: err.message });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { webhookTopup, webhookKaje, webhookFlaz, webhookKhfy };
