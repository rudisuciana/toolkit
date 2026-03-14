const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

router.get('/admin/tables', isAuthenticated, isAdmin, adminController.getTables);
router.post('/admin/table-data/:tableName', isAuthenticated, isAdmin, adminController.getTableData);
router.post('/admin/update-row', isAuthenticated, isAdmin, adminController.updateRow);
router.post('/admin/no-otp/add', isAuthenticated, isAdmin, adminController.addNoOtpProduct);
router.post('/admin/delete-row', isAuthenticated, isAdmin, adminController.deleteRow);
router.get('/announcement', isAuthenticated, adminController.getAnnouncement);
router.post('/admin/update-announcement', isAuthenticated, isAdmin, adminController.updateAnnouncement);

module.exports = router;
