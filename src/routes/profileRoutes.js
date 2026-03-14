const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const profileController = require('../controllers/profileController');
const { validateProfileUpdate, validateWebhookUpdate, validatePasswordUpdate } = require('../schemas/profileSchema');

router.post('/profile/update', isAuthenticated, validateProfileUpdate, profileController.updateProfile);
router.post('/profile/update-webhook', isAuthenticated, validateWebhookUpdate, profileController.updateWebhook);
router.post('/password/update', isAuthenticated, validatePasswordUpdate, profileController.updatePassword);
router.post('/apikey/regenerate', isAuthenticated, profileController.regenerateApiKey);

module.exports = router;
