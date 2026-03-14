const validateProfileUpdate = (req, res, next) => {
  const { username, phone, email } = req.body;
  if (!username || !phone || !email) {
    return res.status(400).json({ success: false, message: 'Username, phone, dan email wajib diisi.' });
  }
  next();
};

const validateWebhookUpdate = (req, res, next) => {
  const { webhook } = req.body;
  if (webhook && !webhook.startsWith('http')) {
    return res.status(400).json({ success: false, message: 'URL webhook tidak valid. Harus diawali dengan http:// atau https://' });
  }
  next();
};

const validatePasswordUpdate = (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
  }
  next();
};

module.exports = { validateProfileUpdate, validateWebhookUpdate, validatePasswordUpdate };
