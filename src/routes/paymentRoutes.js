const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const paymentController = require('../controllers/paymentController');
const { validateAmount } = require('../schemas/paymentSchema');

router.post('/payment/generate-qris', isAuthenticated, validateAmount, paymentController.generateQris);
router.post('/payment/generate-topup', isAuthenticated, validateAmount, paymentController.generateTopup);
router.get('/deposits/pending', isAuthenticated, paymentController.getPendingDeposits);
router.get('/deposit/details/:topUpId', isAuthenticated, paymentController.getDepositDetails);
router.get('/deposit/detailsv2/:topUpId', isAuthenticated, paymentController.getDepositDetailsV2);
router.get('/deposit/status/:topUpId', isAuthenticated, paymentController.getDepositStatus);
router.get('/deposit/statusv2/:topUpId', isAuthenticated, paymentController.getDepositStatus);
router.post('/deposit/cancel/:topUpId', isAuthenticated, paymentController.cancelDeposit);
router.post('/deposit/cancelv2/:topUpId', isAuthenticated, paymentController.cancelDeposit);

module.exports = router;
