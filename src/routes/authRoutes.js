const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/auth');
const { validateRegister, validateLogin, validateOTP, validateForgotPassword, validateResetPassword } = require('../schemas/authSchema');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/user', isAuthenticated, authController.getUser);
router.post('/verify-otp', validateOTP, authController.verifyOtp);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);
router.get('/logout', authController.logout);

module.exports = router;
