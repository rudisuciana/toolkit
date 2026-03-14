const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const { isAuthenticated } = require('../middleware/auth.js');

const dbAll = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows; };
const dbGet = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows[0]; };

router.post('/history/topups', isAuthenticated, async (req, res) => {
    const { searchTerm, startDate, endDate } = req.body;
    try {
        let query = `SELECT top_up_id, amount, status, updated_at FROM topup_historys WHERE user_id = ?`;
        const params = [req.session.userId];
        if (searchTerm) {
            query += ` AND (top_up_id LIKE ? OR amount LIKE ? OR status LIKE ?)`;
            params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
        }
        if (startDate && endDate) {
            query += ` AND updated_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }
        query += ` ORDER BY id DESC LIMIT 50`;
        const topups = await dbAll(query, params);
        res.json({ success: true, data: topups });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat top up.' });
    }
});

router.post('/history/transactions', isAuthenticated, async (req, res) => {
    const { searchTerm, startDate, endDate } = req.body;
    try {
        let query = `SELECT ref_id, product_name, destination, status, serial_number, price, updated_at, payment_method, payment_info, message FROM transactions WHERE user_id = ?`;
        const params = [req.session.userId];
        if (searchTerm) {
            query += ` AND (ref_id LIKE ? OR product_name LIKE ? OR destination LIKE ? OR price LIKE ? OR payment_method LIKE ? OR status LIKE ? OR message LIKE ?)`;
            const searchTermLike = `%${searchTerm}%`;
            params.push(searchTermLike, searchTermLike, searchTermLike, searchTermLike, searchTermLike, searchTermLike, searchTermLike);
        }
        if (startDate && endDate) {
            query += ` AND updated_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }
        query += ` ORDER BY created_at DESC LIMIT 200`;
        const transactions = await dbAll(query, params);
        res.json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat transaksi.' });
    }
});

router.get('/transaction/status/:ref_id', isAuthenticated, async (req, res) => {
    const { ref_id } = req.params;
    try {
        const transaction = await dbGet(`SELECT status, payment_method, payment_info, message FROM transactions WHERE ref_id = ? AND user_id = ?`, [ref_id, req.session.userId]);
        if (!transaction) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
        res.json({ success: true, ...transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
