const config = require('../config/env');
const userRepository = require('../repositories/userRepository');
const logger = require('../config/logger');

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Sesi tidak valid. Silakan login kembali.' });
};

const isAdmin = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(403).json({ success: false, message: 'Akses ditolak.' });
  }
  try {
    const user = await userRepository.findByIdSelect(req.session.userId, 'email, username');
    if (user && user.email === config.ADMIN.EMAIL && user.username === config.ADMIN.USERNAME) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya untuk admin.' });
  } catch (error) {
    logger.error('isAdmin middleware error: ' + error.message);
    return res.status(500).json({ success: false, message: 'Kesalahan server saat validasi admin.' });
  }
};

module.exports = { isAuthenticated, isAdmin };
