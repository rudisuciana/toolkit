const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const { isAuthenticated } = require('../middleware/auth.js');
const { generateOTP } = require('../module/function.js');
const { sendOTP, verifOTP, sendResetLinkEmail } = require('../module/gmail.js'); // Atau sendMail.js jika pakai Resend

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.vars.json')));
const saltRounds = 10;

// Helper DB
const dbGet = async (sql, params = []) => { const [rows] = await pool.execute(sql, params); return rows[0]; };
const dbRun = async (sql, params = []) => { const [result] = await pool.execute(sql, params); return result; };

// --- Register ---
router.post('/register', async (req, res) => {
    const { username, phone, email, password } = req.body;
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const apikey = uuidv4();
        const otp = generateOTP();

        await dbRun(`INSERT INTO users (username, phone, email, telegram, password, apikey, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                    [username, phone, email, null, hash, apikey, 0]);
        
        req.session.unverifiedEmail = email;
        req.session.otp = otp;
        req.session.otpExpires = Date.now() + 10 * 60 * 1000;

        await sendOTP(email, otp, config);
        res.redirect('/verify-otp');
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            const existingUser = await dbGet('SELECT is_verified, email FROM users WHERE email = ? OR username = ?', [email, username]);
            if (existingUser && existingUser.is_verified === 0) {
                try {
                    const otp = generateOTP();
                    req.session.unverifiedEmail = existingUser.email;
                    req.session.otp = otp;
                    req.session.otpExpires = Date.now() + 10 * 60 * 1000;
                    await sendOTP(existingUser.email, otp, config);
                    return res.redirect('/verify-otp');
                } catch (sendError) {
                    return res.status(500).send('<script>alert("Gagal mengirim ulang OTP."); window.location.href="/register";</script>');
                }
            } else {
                return res.status(400).send('<script>alert("Username atau email sudah terdaftar dan terverifikasi."); window.location.href="/register";</script>');
            }
        }
        console.error("Register error:", err);
        res.status(500).send('<script>alert("Terjadi kesalahan server."); window.location.href="/register";</script>');
    }
});

// --- Login ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await dbGet(`SELECT * FROM users WHERE username = ?`, [username]);
        if (!user) {
            return res.status(400).send('<script>alert("Username tidak ditemukan!"); window.location.href="/login";</script>');
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).send('<script>alert("Password salah!"); window.location.href="/login";</script>');
        }

        if (user.is_verified === 0) {
            const otp = generateOTP();
            req.session.unverifiedEmail = user.email;
            req.session.otp = otp;
            req.session.otpExpires = Date.now() + 10 * 60 * 1000;
            await sendOTP(user.email, otp, config);
            return res.redirect('/verify-otp');
        }

        req.session.userId = user.id;
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send('<script>alert("Terjadi kesalahan server!"); window.location.href="/login";</script>');
    }
});

// --- Get User Data ---
router.get('/user', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet(`SELECT id, username, phone, email, telegram, balance, apikey, webhook FROM users WHERE id = ?`, [req.session.userId]);
        if (!user) return res.status(404).json({ success: false, message: "User tidak ditemukan." });

        const isAdmin = user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME;
        
        res.json({ ...user, isAdmin: isAdmin });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.' });
    }
});

// --- Verify OTP ---
router.post('/auth/complete-registration', async (req, res) => {
    const { otp } = req.body;
    const email = req.session.unverifiedEmail;
    if (!email) return res.status(400).json({ success: false, message: 'Sesi verifikasi tidak ditemukan. Silakan daftar ulang.' });
    
    const result = verifOTP(otp, req.session);
    if (result.success) {
        try {
            await dbRun('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);
            delete req.session.unverifiedEmail;
            res.json({ success: true, message: 'Verifikasi berhasil! Anda akan diarahkan ke halaman login.' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal memperbarui status verifikasi.' });
        }
    } else {
        res.status(400).json(result);
    }
});

// --- Forgot Password ---
router.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT id FROM users WHERE email = ? FOR UPDATE', [email]);
        const user = rows[0];

        if (!user) {
            await connection.commit();
            return res.json({ success: true, message: 'Jika email terdaftar, link reset password akan dikirim.' });
        }

        const token = uuidv4();
        const expires = new Date(Date.now() + 3600000);
        await connection.execute('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [token, expires, user.id]);
        await sendResetLinkEmail(email, token, config);
        
        await connection.commit();
        res.json({ success: true, message: 'Jika email terdaftar, link reset password akan dikirim.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: 'Gagal mengirim email reset password.' });
    } finally {
        if (connection) connection.release();
    }
});

// --- Reset Password ---
router.post('/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const [rows] = await connection.execute('SELECT id, reset_token_expires FROM users WHERE reset_token = ? FOR UPDATE', [token]);
        const user = rows[0];

        if (!user || Date.now() > new Date(user.reset_token_expires).getTime()) {
            throw new Error('Token tidak valid atau telah kedaluwarsa.');
        }

        const newHash = await bcrypt.hash(newPassword, saltRounds);
        await connection.execute('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [newHash, user.id]);
        
        await connection.commit();
        res.json({ success: true, message: 'Password berhasil diubah! Anda akan diarahkan ke halaman login.' });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(400).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
