const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { isAuthenticated } = require('../middleware/auth.js');

const saltRounds = 10;
const dbRun = async (sql, params = []) => { const [result] = await pool.execute(sql, params); return result; };

router.post('/profile/update', isAuthenticated, async (req, res) => {
    const { username, phone, email, telegram } = req.body;
    const telegramValue = telegram || null;
    try {
        await dbRun(`UPDATE users SET username = ?, phone = ?, email = ?, telegram = ? WHERE id = ?`, 
            [username, phone, email, telegramValue, req.session.userId]);
        res.json({ success: true, message: 'Profil berhasil diperbarui!' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Username atau email mungkin sudah digunakan.' });
    }
});

router.post('/profile/update-webhook', isAuthenticated, async (req, res) => {
    const { webhook } = req.body;
    if (webhook && !webhook.startsWith('http')) {
        return res.status(400).json({ success: false, message: 'URL webhook tidak valid. Harus diawali dengan http:// atau https://' });
    }
    try {
        await dbRun(`UPDATE users SET webhook = ? WHERE id = ?`, [webhook, req.session.userId]);
        res.json({ success: true, message: 'URL Webhook berhasil diperbarui!' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal memperbarui webhook.' });
    }
});

router.post('/password/update', isAuthenticated, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(`SELECT password FROM users WHERE id = ? FOR UPDATE`, [req.session.userId]);
        const user = rows[0];
        
        if (!user) throw new Error('Pengguna tidak ditemukan.');
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) throw new Error('Password sebelumnya salah.');
        
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        await connection.execute(`UPDATE users SET password = ? WHERE id = ?`, [newHash, req.session.userId]);
        
        await connection.commit();
        res.json({ success: true, message: 'Password berhasil diubah!' });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(400).json({ success: false, message: err.message });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/apikey/regenerate', isAuthenticated, async (req, res) => {
    try {
        const newApiKey = uuidv4();
        await dbRun(`UPDATE users SET apikey = ? WHERE id = ?`, [newApiKey, req.session.userId]);
        res.json({ success: true, newApiKey });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal membuat API Key baru.' });
    }
});

module.exports = router;
