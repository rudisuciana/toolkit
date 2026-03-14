const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const config = require('../config/env');
const logger = require('../config/logger');
const userRepository = require('../repositories/userRepository');
const { generateOTP } = require('../utils/helpers');
const { sendOTP, verifOTP, sendResetLinkEmail } = require('../utils/gmail');

const saltRounds = 10;

const register = async (req, res) => {
  const { username, phone, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    const apikey = uuidv4();
    const otp = generateOTP();

    await userRepository.create({ username, phone, email, password: hash, apikey });

    req.session.unverifiedEmail = email;
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 10 * 60 * 1000;

    await sendOTP(email, otp);
    res.json({ success: true, message: 'Registrasi berhasil. Silakan verifikasi OTP.' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const existingUser = await userRepository.findByEmailOrUsername(email, username);
      if (existingUser && existingUser.is_verified === 0) {
        try {
          const otp = generateOTP();
          req.session.unverifiedEmail = existingUser.email;
          req.session.otp = otp;
          req.session.otpExpires = Date.now() + 10 * 60 * 1000;
          await sendOTP(existingUser.email, otp);
          return res.json({ success: true, message: 'OTP dikirim ulang. Silakan verifikasi.' });
        } catch (sendError) {
          return res.status(500).json({ success: false, message: 'Gagal mengirim ulang OTP.' });
        }
      } else {
        return res.status(400).json({ success: false, message: 'Username atau email sudah terdaftar dan terverifikasi.' });
      }
    }
    logger.error('Register error: ' + err.message);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server.' });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await userRepository.findByUsername(username);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Username tidak ditemukan!' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Password salah!' });
    }
    if (user.is_verified === 0) {
      const otp = generateOTP();
      req.session.unverifiedEmail = user.email;
      req.session.otp = otp;
      req.session.otpExpires = Date.now() + 10 * 60 * 1000;
      await sendOTP(user.email, otp);
      return res.json({ success: true, needVerification: true, message: 'Akun belum diverifikasi. OTP dikirim.' });
    }
    req.session.userId = user.id;
    res.json({ success: true, message: 'Login berhasil.' });
  } catch (err) {
    logger.error('Login error: ' + err.message);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan server!' });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await userRepository.findByIdSelect(req.session.userId, 'id, username, phone, email, telegram, balance, apikey, webhook');
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    const isAdmin = user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME;
    res.json({ success: true, data: { ...user, isAdmin } });
  } catch (err) {
    logger.error('getUser error: ' + err.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna.' });
  }
};

const verifyOtp = async (req, res) => {
  const { otp } = req.body;
  const email = req.session.unverifiedEmail;
  if (!email) return res.status(400).json({ success: false, message: 'Sesi verifikasi tidak ditemukan. Silakan daftar ulang.' });

  const result = verifOTP(otp, req.session);
  if (result.success) {
    try {
      await userRepository.verifyUser(email);
      delete req.session.unverifiedEmail;
      res.json({ success: true, message: 'Verifikasi berhasil! Silakan login.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Gagal memperbarui status verifikasi.' });
    }
  } else {
    res.status(400).json(result);
  }
};

const forgotPassword = async (req, res) => {
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
    await sendResetLinkEmail(email, token);
    await connection.commit();
    res.json({ success: true, message: 'Jika email terdaftar, link reset password akan dikirim.' });
  } catch (error) {
    if (connection) await connection.rollback();
    logger.error('forgotPassword error: ' + error.message);
    res.status(500).json({ success: false, message: 'Gagal mengirim email reset password.' });
  } finally {
    if (connection) connection.release();
  }
};

const resetPassword = async (req, res) => {
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
    res.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    if (connection) connection.release();
  }
};

const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logout berhasil.' });
  });
};

module.exports = { register, login, getUser, verifyOtp, forgotPassword, resetPassword, logout };
