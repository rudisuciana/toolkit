const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getTransactionInfo: getTransactionInfoKaje } = require('../module/kaje.js');
const { getTransactionInfoFlaz } = require('../module/flaz.js');

// --- Konfigurasi ---
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.vars.json')));

// --- Helper Database ---
const dbGet = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows[0];
};

// --- Helper: Forward Webhook ke User ---
// Jika user (reseller) memiliki sistem sendiri dan memasang URL webhook di profil,
// kita akan meneruskan status transaksi ke mereka.
async function sendWebhookNotification(userId, refId) {
    try {
        const user = await dbGet('SELECT webhook FROM users WHERE id = ?', [userId]);
        if (!user || !user.webhook) return; // Skip jika tidak ada URL

        const webhookUrl = user.webhook;
        const payload = { ref_id: refId };
        
        // Mekanisme Retry: Mencoba kirim 3 kali jika gagal
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`[Webhook] Mengirim ke ${webhookUrl} (Percobaan #${attempt}) untuk ref_id: ${refId}`);
                await axios.post(webhookUrl, payload, { timeout: 5000 });
                console.log(`[Webhook] Berhasil mengirim notifikasi.`);
                return;
            } catch (error) {
                console.warn(`[Webhook] Gagal percobaan #${attempt}: ${error.message}`);
                if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 3000)); // Jeda 3 detik
            }
        }
        console.error(`❌ Gagal total mengirim webhook ke user.`);
    } catch (dbError) {
        console.error(`❌ Error database webhook: ${dbError.message}`);
    }
}


// ==========================================================================
// WEBHOOK ENDPOINTS
// ==========================================================================

// 1. Webhook Topup (Deposit Saldo)
// Menerima notifikasi teks (biasanya dari email parser) berisi nominal transfer
router.post('/webhook_topup', async (req, res) => {
    const webhookText = req.body.text;
    if (!webhookText) return res.status(400).json({ success: false, message: 'Invalid format.' });
    
    // Regex untuk mencari nominal "Rp X.XXX"
    const match = /Rp\s*([\d\.]+)/.exec(webhookText);
    if (!match) return res.status(400).json({ success: false, message: 'Amount not found.' });
    
    // Bersihkan titik pemisah ribuan
    const amountFromWebhook = parseInt(match[1].replace(/\./g, ''), 10);
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cari deposit yang statusnya PENDING dengan nominal unik tersebut
        const [rows] = await connection.execute(`SELECT * FROM deposits WHERE amount = ? AND status = 'PENDING' ORDER BY created_at ASC LIMIT 1 FOR UPDATE`, [amountFromWebhook]);
        const row = rows[0];
        
        if (!row) {
            await connection.commit();
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }
            
        const { top_up_id, user_id, amount } = row;
        
        // Tambah saldo user
        await connection.execute(`UPDATE users SET balance = balance + ? WHERE id = ?`, [amount, user_id]);
        // Hapus dari tabel temporary deposits
        await connection.execute(`DELETE FROM deposits WHERE top_up_id = ?`, [top_up_id]);
        // Masukkan ke history permanen
        const nowISO = new Date().toISOString();
        await connection.execute(`INSERT INTO topup_historys (top_up_id, user_id, amount, status, updated_at) VALUES (?, ?, ?, ?, ?)`, 
                       [top_up_id, user_id, amount, 'SUCCESS', nowISO]);
                        
        await connection.commit();
        res.status(200).json({ success: true, message: 'Webhook processed successfully.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Webhook Topup Error:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// 2. Webhook Kaje (Provider XL/Axis)
router.post('/webhook_kaje', async (req, res) => {
    const { trx_id } = req.body;
    if (!trx_id) return res.status(400).json({ success: false, message: 'trx_id required.' });
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Validasi status ke server Kaje untuk keamanan (Double Check)
        const txInfo = await getTransactionInfoKaje(trx_id, config);
        if (!txInfo.success || !txInfo.data) throw new Error('Provider API error.');

        const { status, serial_number, deeplink, message } = txInfo.data;
        const finalStatus = status ? status.toLowerCase() : 'failed';
        const finalSn = serial_number ? serial_number.split(': ')[1] || 'NONE' : 'NONE';
        const finalMessage = serial_number || message || 'Update dari Provider.';
        const now = new Date();

        // Kunci baris transaksi di DB
        const [rows] = await connection.execute(`SELECT ref_id, user_id, price, status, source FROM transactions WHERE trx_id = ? FOR UPDATE`, [trx_id]);
        const originalTx = rows[0];
        
        if (!originalTx) throw new Error('Transaction not found.');

        const isFailed = finalStatus === 'failed' || finalStatus === 'gagal';
        const isSuccess = finalStatus === 'success' || finalStatus === 'sukses';
        const wasAlreadySettled = ['success', 'sukses', 'failed', 'gagal'].includes(originalTx.status);

        // LOGIKA REFUND: Jika gagal dan belum pernah diproses, kembalikan saldo
        if (isFailed && !wasAlreadySettled && originalTx.price > 0) {
            await connection.execute(`UPDATE users SET balance = balance + ? WHERE id = ?`, [originalTx.price, originalTx.user_id]);
        }
        
        // LOGIKA KURANGI SALDO JIKA STATUS AWAL ADALAH FAILED DAN WEBHOOK MENERIMA SUKSES
        // if (originalTx.status === failed && isSuccess && originalTx.price > 0) {
        //     await connection.execute(`UPDATE users SET balance = balance - ? WHERE id = ?`, [originalTx.price, originalTx.user_id]);
        // }
        
        // Update status transaksi
        await connection.execute(`UPDATE transactions SET status = ?, serial_number = ?, updated_at = ?, payment_info = ?, message = ? WHERE trx_id = ?`, 
            [finalStatus, finalSn, now, deeplink || null, finalMessage, trx_id]);
        
        await connection.commit();
        res.status(200).json({ success: true, message: 'Webhook Kaje received.' });
        
        // Kirim notifikasi ke user jika transaksi via API
        if (originalTx.source === 'API') {
            sendWebhookNotification(originalTx.user_id, originalTx.ref_id);
        }

    } catch(err) {
        if(connection) await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if(connection) connection.release();
    }
});

// 3. Webhook Flaz (Provider Akrab/Umum)
router.post('/webhook_flaz', async (req, res) => {
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

        const [rows] = await connection.execute(`SELECT ref_id, user_id, price, status, source FROM transactions WHERE trx_id = ? FOR UPDATE`, [trx_id]);
        const originalTx = rows[0];
        
        if (!originalTx) throw new Error('Transaction not found.');

        const isFailed = finalStatus === 'failed' || finalStatus === 'gagal';
        const wasAlreadySettled = ['success', 'sukses', 'failed', 'gagal'].includes(originalTx.status);

        // Refund otomatis jika gagal
        if (isFailed && !wasAlreadySettled && originalTx.price > 0) {
            await connection.execute(`UPDATE users SET balance = balance + ? WHERE id = ?`, [originalTx.price, originalTx.user_id]);
        }

        await connection.execute(`UPDATE transactions SET status = ?, serial_number = ?, updated_at = ?, message = ? WHERE trx_id = ?`, 
            [finalStatus, finalSn, now, finalMessage, trx_id]);
        
        await connection.commit();
        res.status(200).json({ success: true, message: 'Webhook Flaz received.' });

        if (originalTx.source === 'API') {
            sendWebhookNotification(originalTx.user_id, originalTx.ref_id);
        }

    } catch(err) {
        if(connection) await connection.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if(connection) connection.release();
    }
});

// 4. Webhook KHFY (Provider Khfy - Akrab V3)
// Menggunakan method GET dan parsing Regex karena format responnya unik
router.get('/webhook_khfy', async (req, res) => {
    let connection;
    try {
        // Ambil pesan dari Query Params atau Body
        const message = (req.query && req.query.message) || (typeof req.body?.message === 'string' ? req.body.message : null);

        if (!message) return res.status(400).json({ ok: false, error: 'message kosong' });
        
        // Regex Kompleks untuk memparsing format pesan KHFY
        // Contoh: RC=WZ123 TrxID=999 AKRAB.0812 status Sukses ...
        const RX = /RC=(?<reffid>[a-zA-Z0-9-]+)\s+TrxID=(?<trxid>\d+)\s+(?<produk>[A-Z0-9]+)\.(?<tujuan>\d+)\s+(?<status_text>[A-Za-z]+)\s*(?<keterangan>.+?)(?:\s+Saldo[\s\S]*?)?(?:\bresult=(?<status_code>\d+))?\s*>?$/i;
        const match = message.match(RX);
        if (!match || !match.groups) return res.status(200).json({ ok: false, error: 'format tidak dikenali' });

        const { trxid, reffid, status_text = '', status_code: statusCodeRaw } = match.groups;
        const keterangan = (match.groups.keterangan || '').trim();

        // Normalisasi Status Code (0 = Sukses, 1 = Gagal)
        let status_code = null;
        if (statusCodeRaw != null) {
          status_code = Number(statusCodeRaw);
        } else {
          if (/sukses/i.test(status_text)) status_code = 0;
          else if (/gagal|batal/i.test(status_text)) status_code = 1;
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(`SELECT * FROM transactions WHERE ref_id = ? FOR UPDATE`, [reffid]);
        const originalTx = rows[0];

        if (!originalTx) throw new Error(`Transaksi ref_id ${reffid} tidak ditemukan.`);

        const wasAlreadySettled = ['success', 'sukses', 'failed', 'gagal'].includes(originalTx.status);
        if (wasAlreadySettled) {
            await connection.commit();
            return res.status(200).json({ ok: true, message: 'Transaksi sudah selesai sebelumnya.' });
        }

        const now = new Date();

        if (Number(status_code) === 0) {
            // SUKSES
            await connection.execute(
                `UPDATE transactions SET status = ?, serial_number = ?, updated_at = ?, message = ? WHERE ref_id = ?`,
                ['success', keterangan, now, 'Transaksi Sukses', reffid]
            );
        } else if (Number(status_code) === 1) {
            // GAGAL -> REFUND
            if (originalTx.price > 0) {
                await connection.execute(`UPDATE users SET balance = balance + ? WHERE id = ?`, [originalTx.price, originalTx.user_id]);
            }
            await connection.execute(
                `UPDATE transactions SET status = ?, serial_number = ?, updated_at = ?, message = ? WHERE ref_id = ?`,
                ['failed', keterangan, now, keterangan, reffid]
            );
        } else {
            // PENDING / UNKNOWN
            await connection.execute(`UPDATE transactions SET message = ? WHERE ref_id = ?`, [keterangan, reffid]);
        }
        
        await connection.commit();

        if (originalTx.source === 'API') {
            sendWebhookNotification(originalTx.user_id, originalTx.ref_id);
        }

        return res.status(200).json({ ok: true });

    } catch (err) {
        if (connection) await connection.rollback();
        return res.status(500).json({ ok: false, error: 'internal_error', detail: err.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
