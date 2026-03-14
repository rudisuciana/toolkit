const express = require('express');
const router = express.Router();
const pool = require('../database.js');
const fs = require('fs');
const path = require('path');
const { isAuthenticated } = require('../middleware/auth.js');

// Memuat konfigurasi untuk pengecekan admin
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.vars.json')));

// Helper Database: Ambil satu baris data
const dbGet = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows[0];
};

// --- Fungsi Helper Render ---
// Fungsi ini sangat penting untuk menghindari pengulangan kode.
// Tugasnya:
// 1. Ambil data user terbaru dari DB berdasarkan sesi.
// 2. Cek apakah user tersebut adalah Admin.
// 3. Render file view (HTML/EJS) dengan menyertakan objek 'user'.
const renderWithUserData = async (req, res, view) => {
    try {
        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [req.session.userId]);
        
        // Jika user tidak ditemukan di DB (misal terhapus saat sesi masih aktif), paksa logout
        if (!user) return res.redirect('/login');
        
        // Tentukan status admin
        const isAdmin = user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME;
        
        // Render halaman dengan data user
        res.render(view, { 
            user: { ...user, isAdmin } 
        });
    } catch (error) {
        console.error(`Error rendering page ${view}:`, error);
        res.redirect('/login');
    }
};

// ==========================================================================
// Rute Publik (Tanpa Login)
// ==========================================================================

// Halaman Utama & Login
router.get('/', (req, res) => { req.session.userId ? res.redirect('/dashboard') : res.render('login'); });
router.get('/login', (req, res) => { req.session.userId ? res.redirect('/dashboard') : res.render('login'); });

// Halaman Register
router.get('/register', (req, res) => { req.session.userId ? res.redirect('/dashboard') : res.render('register'); });

// Halaman Verifikasi OTP
router.get('/verify-otp', (req, res) => {
    // Hanya bisa diakses jika ada sesi email yang belum terverifikasi
    if (!req.session.unverifiedEmail) return res.redirect('/register');
    res.render('verify_otp', { email: req.session.unverifiedEmail });
});

// Halaman Lupa Password
router.get('/forgot-password', (req, res) => res.render('forgot_password'));

// Halaman Reset Password (dari link email)
router.get('/reset-password', async (req, res) => {
    const { token } = req.query;
    if (!token) return res.send('Token tidak valid atau tidak ditemukan.');
    try {
        // Validasi token dan waktu kadaluarsa
        const user = await dbGet('SELECT reset_token_expires FROM users WHERE reset_token = ?', [token]);
        if (!user || Date.now() > new Date(user.reset_token_expires).getTime()) {
            return res.send('Token tidak valid atau telah kedaluwarsa.');
        }
        res.render('reset_password', { token });
    } catch (error) {
        res.send('Terjadi kesalahan pada server.');
    }
});

// ==========================================================================
// Rute Terproteksi (Perlu Login)
// ==========================================================================

// Dashboard Utama
router.get('/dashboard', isAuthenticated, (req, res) => renderWithUserData(req, res, 'dashboard'));

// Halaman Profil User
router.get('/profile', isAuthenticated, (req, res) => renderWithUserData(req, res, 'profile'));

// Halaman Deposit / Topup Saldo
router.get('/topup', isAuthenticated, (req, res) => renderWithUserData(req, res, 'topup'));

// Halaman Riwayat Transaksi
router.get('/riwayat', isAuthenticated, (req, res) => renderWithUserData(req, res, 'riwayat'));

// --- Layanan XL/Axis ---
router.get('/xl-auth', isAuthenticated, (req, res) => renderWithUserData(req, res, 'xl_auth'));     // Login XL (OTP)
router.get('/xl-tembak', isAuthenticated, (req, res) => renderWithUserData(req, res, 'xl_tembak')); // Tembak Paket Biasa
router.get('/cek-paket', isAuthenticated, (req, res) => renderWithUserData(req, res, 'cek_paket')); // Cek Kuota/Paket

// --- Layanan XL Akrab ---
router.get('/xl-akrabv1', isAuthenticated, (req, res) => renderWithUserData(req, res, 'xl_akrabv1'));
router.get('/xl-akrabv2', isAuthenticated, (req, res) => renderWithUserData(req, res, 'xl_akrabv2'));
router.get('/xl-akrabv3', isAuthenticated, (req, res) => renderWithUserData(req, res, 'xl_akrabv3'));

// --- Layanan No OTP ---
router.get('/no-otp', isAuthenticated, (req, res) => renderWithUserData(req, res, 'no_otp'));

// --- Halaman Admin ---
router.get('/admin', isAuthenticated, async (req, res) => {
    try {
        const user = await dbGet(`SELECT * FROM users WHERE id = ?`, [req.session.userId]);
        if (!user) return res.redirect('/login');
        
        // Cek manual kredensial admin
        const isAdmin = user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME;
        
        // Jika bukan admin, tendang balik ke dashboard user biasa
        if (!isAdmin) return res.redirect('/dashboard');
        
        res.render('admin', { user: { ...user, isAdmin } });
    } catch (error) {
        res.redirect('/login');
    }
});

// --- Logout ---
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid'); // Hapus cookie sesi
        res.redirect('/login');
    });
});

module.exports = router;
