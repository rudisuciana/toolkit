const express = require('express');
const router = express.Router();

// Import Sub-Routers
const authRoutes = require('./api-auth');
const profileRoutes = require('./api-profile');
const paymentRoutes = require('./api-payment');
const servicesRoutes = require('./api-services');
const historyRoutes = require('./api-history');
const adminRoutes = require('./api-admin');

// Gunakan Sub-Routers
router.use('/', authRoutes);
router.use('/', profileRoutes);
router.use('/', paymentRoutes);
router.use('/', servicesRoutes);
router.use('/', historyRoutes);
router.use('/', adminRoutes);

module.exports = router;
