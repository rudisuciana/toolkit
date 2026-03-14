const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const historyController = require('../controllers/historyController');

router.post('/history/topups', isAuthenticated, historyController.getTopupHistory);
router.post('/history/transactions', isAuthenticated, historyController.getTransactionHistory);
router.get('/transaction/status/:ref_id', isAuthenticated, historyController.getTransactionStatus);

module.exports = router;
