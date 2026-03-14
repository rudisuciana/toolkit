const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/webhook_topup', webhookController.webhookTopup);
router.post('/webhook_kaje', webhookController.webhookKaje);
router.post('/webhook_flaz', webhookController.webhookFlaz);
router.all('/webhook_khfy', webhookController.webhookKhfy);

module.exports = router;
