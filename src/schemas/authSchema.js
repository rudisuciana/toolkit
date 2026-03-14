const validateRegister = (req, res, next) => {
  const { username, phone, email, password } = req.body;
  if (!username || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
  }
  next();
};

const validateOTP = (req, res, next) => {
  const { otp } = req.body;
  if (!otp || otp.length !== 6) {
    return res.status(400).json({ success: false, message: 'Kode OTP harus 6 digit.' });
  }
  next();
};

const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email wajib diisi.' });
  }
  next();
};

const validateResetPassword = (req, res, next) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Token dan password baru wajib diisi.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter.' });
  }
  next();
};

module.exports = { validateRegister, validateLogin, validateOTP, validateForgotPassword, validateResetPassword };
