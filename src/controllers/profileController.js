const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const logger = require('../config/logger');
const userRepository = require('../repositories/userRepository');

const saltRounds = 10;

const updateProfile = async (req, res) => {
  const { username, phone, email, telegram } = req.body;
  try {
    await userRepository.updateProfile(req.session.userId, { username, phone, email, telegram });
    res.json({ success: true, message: 'Profil berhasil diperbarui!' });
  } catch (err) {
    logger.error('updateProfile error: ' + err.message);
    res.status(400).json({ success: false, message: 'Username atau email mungkin sudah digunakan.' });
  }
};

const updateWebhook = async (req, res) => {
  const { webhook } = req.body;
  try {
    await userRepository.updateWebhook(req.session.userId, webhook);
    res.json({ success: true, message: 'URL Webhook berhasil diperbarui!' });
  } catch (err) {
    logger.error('updateWebhook error: ' + err.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui webhook.' });
  }
};

const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute('SELECT password FROM users WHERE id = ? FOR UPDATE', [req.session.userId]);
    const user = rows[0];
    if (!user) throw new Error('Pengguna tidak ditemukan.');
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) throw new Error('Password sebelumnya salah.');

    const newHash = await bcrypt.hash(newPassword, saltRounds);
    await connection.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, req.session.userId]);

    await connection.commit();
    res.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    if (connection) connection.release();
  }
};

const regenerateApiKey = async (req, res) => {
  try {
    const newApiKey = uuidv4();
    await userRepository.updateApiKey(req.session.userId, newApiKey);
    res.json({ success: true, newApiKey });
  } catch (err) {
    logger.error('regenerateApiKey error: ' + err.message);
    res.status(500).json({ success: false, message: 'Gagal membuat API Key baru.' });
  }
};

module.exports = { updateProfile, updateWebhook, updatePassword, regenerateApiKey };
